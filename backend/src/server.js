import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { all, get, initDb, run } from "./db.js";
import { adminRequired, authRequired } from "./middleware/auth.js";
import { normalizePagination } from "./utils/pagination.js";

const app = express();
const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datosPath = path.join(__dirname, "..", "..", "datos.json");

app.use(cors());
app.use(express.json());

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRES_IN || "8h" }
  );
}

function getUserIdFromHeader(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload?.id || null;
  } catch {
    return null;
  }
}

function getGamesOrderBy(sort) {
  if (sort === "popularidad") {
    return "ORDER BY popularidad DESC, g.id DESC";
  }

  return "ORDER BY g.id DESC";
}

function createAssistantInstructions(gamesContext) {
  return `Eres un asistente de videojuegos para esta aplicación.
Reglas obligatorias:
1) SOLO puedes responder sobre videojuegos que aparecen en la base de datos proporcionada.
2) Si la pregunta no trata de esos videojuegos o pide información externa, responde exactamente: "Solo puedo responder sobre videojuegos disponibles en esta base de datos.".
3) No inventes juegos, precios, características ni fechas.
4) Si recomiendas juegos, justifica con datos de la base actual (popularidad, precio, compañía, descripción, plataformas/categorías).
5) Responde en español de forma breve y clara.

Base de datos actual de videojuegos:
${gamesContext}`;
}

function mapNamesByIds(ids, catalogItems) {
  if (!Array.isArray(ids)) return [];

  return ids
    .map((id) => catalogItems.find((item) => String(item.id) === String(id))?.nombre)
    .filter(Boolean);
}

function cleanAssistantAnswer(rawText) {
  const text = String(rawText || "");

  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

function leerCatalogo() {
  if (!fs.existsSync(datosPath)) {
    return { categorias: [], plataformas: [] };
  }

  const raw = fs.readFileSync(datosPath, "utf8");
  const datos = JSON.parse(raw);
  return {
    categorias: Array.isArray(datos.categorias) ? datos.categorias : [],
    plataformas: Array.isArray(datos.plataformas) ? datos.plataformas : []
  };
}

app.get("/api/catalogo/categorias", (_req, res) => {
  const { categorias } = leerCatalogo();
  res.json(categorias);
});

app.get("/api/catalogo/plataformas", (_req, res) => {
  const { plataformas } = leerCatalogo();
  res.json(plataformas);
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email y password son obligatorios" });
    }

    const exists = await get("SELECT id FROM users WHERE email = ? OR username = ?", [email, username]);
    if (exists) {
      return res.status(409).json({ message: "El usuario o email ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await run(
      "INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, 'user', ?)",
      [username, email, passwordHash, new Date().toISOString()]
    );

    const user = await get("SELECT id, username, email, role FROM users WHERE id = ?", [created.id]);
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar", error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email y password son obligatorios" });
    }

    const user = await get("SELECT id, username, email, role, password_hash FROM users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ message: "Credenciales inválidas" });

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al iniciar sesión", error: error.message });
  }
});

app.get("/api/games", async (req, res) => {
  try {
    const { page, limit, offset } = normalizePagination(req.query);
    const userId = getUserIdFromHeader(req);
    const sort = req.query.sort;
    const orderBy = getGamesOrderBy(sort);

    const totalRow = await get("SELECT COUNT(*) as total FROM games");
    const rows = await all(
      `SELECT g.*, u.username as owner_username,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'like' THEN 1 WHEN gv.vote_type = 'dislike' THEN -1 ELSE 0 END), 0) as popularidad,
       MAX(CASE WHEN gv.user_id = ? THEN gv.vote_type ELSE NULL END) as my_vote
       FROM games g
       JOIN users u ON u.id = g.owner_id
       LEFT JOIN game_votes gv ON gv.game_id = g.id
       GROUP BY g.id, u.username
       ${orderBy}
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const games = rows.map((game) => ({
      ...game,
      categoria_ids: JSON.parse(game.categoria_ids || "[]"),
      plataforma_ids: JSON.parse(game.plataforma_ids || "[]")
    }));

    return res.json({
      data: games,
      pagination: {
        page,
        limit,
        total: totalRow.total,
        totalPages: Math.ceil(totalRow.total / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener videojuegos", error: error.message });
  }
});

app.get("/api/games/mine", authRequired, async (req, res) => {
  try {
    const { page, limit, offset } = normalizePagination(req.query);

    const totalRow = await get("SELECT COUNT(*) as total FROM games WHERE owner_id = ?", [req.user.id]);
    const rows = await all(
      `SELECT g.*, u.username as owner_username,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'like' THEN 1 WHEN gv.vote_type = 'dislike' THEN -1 ELSE 0 END), 0) as popularidad,
       MAX(CASE WHEN gv.user_id = ? THEN gv.vote_type ELSE NULL END) as my_vote
       FROM games g
       JOIN users u ON u.id = g.owner_id
       LEFT JOIN game_votes gv ON gv.game_id = g.id
       WHERE g.owner_id = ?
       GROUP BY g.id, u.username
       ORDER BY g.id DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, req.user.id, limit, offset]
    );

    const games = rows.map((game) => ({
      ...game,
      categoria_ids: JSON.parse(game.categoria_ids || "[]"),
      plataforma_ids: JSON.parse(game.plataforma_ids || "[]")
    }));

    return res.json({
      data: games,
      pagination: {
        page,
        limit,
        total: totalRow.total,
        totalPages: Math.ceil(totalRow.total / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener tus videojuegos", error: error.message });
  }
});

app.get("/api/games/:id", async (req, res) => {
  try {
    const userId = getUserIdFromHeader(req);
    const row = await get(
      `SELECT g.*, u.username as owner_username,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'like' THEN 1 WHEN gv.vote_type = 'dislike' THEN -1 ELSE 0 END), 0) as popularidad,
       MAX(CASE WHEN gv.user_id = ? THEN gv.vote_type ELSE NULL END) as my_vote
       FROM games g
       JOIN users u ON u.id = g.owner_id
       LEFT JOIN game_votes gv ON gv.game_id = g.id
       WHERE g.id = ?`,
      [userId, req.params.id]
    );

    if (!row) return res.status(404).json({ message: "Videojuego no encontrado" });

    return res.json({
      ...row,
      categoria_ids: JSON.parse(row.categoria_ids || "[]"),
      plataforma_ids: JSON.parse(row.plataforma_ids || "[]")
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener videojuego", error: error.message });
  }
});

app.post("/api/games", authRequired, async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      fecha_lanzamiento,
      compania,
      categoria_ids = [],
      plataforma_ids = [],
      precio,
      portada,
      video
    } = req.body;

    if (!nombre || !descripcion || precio === undefined) {
      return res.status(400).json({ message: "nombre, descripcion y precio son obligatorios" });
    }

    const created = await run(
      `INSERT INTO games
      (nombre, descripcion, fecha_lanzamiento, compania, categoria_ids, plataforma_ids, precio, portada, video, owner_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        descripcion,
        fecha_lanzamiento || null,
        compania || null,
        JSON.stringify(categoria_ids),
        JSON.stringify(plataforma_ids),
        Number(precio),
        portada || null,
        video || null,
        req.user.id,
        new Date().toISOString()
      ]
    );

    const game = await get(
      `SELECT g.*, u.username as owner_username
       FROM games g
       JOIN users u ON u.id = g.owner_id
       WHERE g.id = ?`,
      [created.id]
    );

    return res.status(201).json({
      ...game,
      categoria_ids: JSON.parse(game.categoria_ids || "[]"),
      plataforma_ids: JSON.parse(game.plataforma_ids || "[]")
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al crear videojuego", error: error.message });
  }
});

app.delete("/api/games/:id", authRequired, async (req, res) => {
  try {
    const game = await get("SELECT id, owner_id FROM games WHERE id = ?", [req.params.id]);
    if (!game) return res.status(404).json({ message: "Videojuego no encontrado" });

    const isOwner = Number(game.owner_id) === Number(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "No tienes permiso para eliminar este videojuego" });
    }

    await run("DELETE FROM games WHERE id = ?", [req.params.id]);
    return res.json({ message: "Videojuego eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar videojuego", error: error.message });
  }
});

app.post("/api/games/:id/vote", authRequired, async (req, res) => {
  try {
    const { voteType } = req.body;
    if (!["like", "dislike"].includes(voteType)) {
      return res.status(400).json({ message: "voteType debe ser like o dislike" });
    }

    const game = await get("SELECT id FROM games WHERE id = ?", [req.params.id]);
    if (!game) return res.status(404).json({ message: "Videojuego no encontrado" });

    const existing = await get(
      "SELECT id FROM game_votes WHERE game_id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (existing) {
      return res.status(409).json({ message: "Ya has votado este videojuego" });
    }

    await run(
      "INSERT INTO game_votes (game_id, user_id, vote_type, created_at) VALUES (?, ?, ?, ?)",
      [req.params.id, req.user.id, voteType, new Date().toISOString()]
    );

    const totals = await get(
      `SELECT
        COALESCE(SUM(CASE WHEN vote_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
        COALESCE(SUM(CASE WHEN vote_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes
       FROM game_votes
       WHERE game_id = ?`,
      [req.params.id]
    );

    return res.status(201).json({
      gameId: Number(req.params.id),
      likes: totals.likes,
      dislikes: totals.dislikes,
      popularidad: Number(totals.likes) - Number(totals.dislikes),
      my_vote: voteType
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar voto", error: error.message });
  }
});

app.get("/api/games/:id/comments", async (req, res) => {
  try {
    const game = await get("SELECT id FROM games WHERE id = ?", [req.params.id]);
    if (!game) return res.status(404).json({ message: "Videojuego no encontrado" });

    const comments = await all(
      `SELECT c.id, c.game_id, c.user_id, c.parent_comment_id, c.content, c.created_at,
       u.username,
       (SELECT COUNT(*) FROM game_comments replies WHERE replies.parent_comment_id = c.id) as replies_count
       FROM game_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.game_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    return res.json(comments);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener comentarios", error: error.message });
  }
});

app.post("/api/games/:id/comments", authRequired, async (req, res) => {
  try {
    const game = await get("SELECT id FROM games WHERE id = ?", [req.params.id]);
    if (!game) return res.status(404).json({ message: "Videojuego no encontrado" });

    const { content, parentCommentId = null } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: "El comentario es obligatorio" });
    }

    if (parentCommentId) {
      const parent = await get(
        "SELECT id, game_id FROM game_comments WHERE id = ?",
        [parentCommentId]
      );

      if (!parent || Number(parent.game_id) !== Number(req.params.id)) {
        return res.status(400).json({ message: "Comentario padre inválido" });
      }
    }

    const created = await run(
      `INSERT INTO game_comments (game_id, user_id, parent_comment_id, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, req.user.id, parentCommentId, String(content).trim(), new Date().toISOString()]
    );

    const comment = await get(
      `SELECT c.id, c.game_id, c.user_id, c.parent_comment_id, c.content, c.created_at,
       u.username,
       0 as replies_count
       FROM game_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [created.id]
    );

    return res.status(201).json(comment);
  } catch (error) {
    return res.status(500).json({ message: "Error al crear comentario", error: error.message });
  }
});

app.delete("/api/comments/:id", authRequired, async (req, res) => {
  try {
    const comment = await get(
      "SELECT id, user_id FROM game_comments WHERE id = ?",
      [req.params.id]
    );

    if (!comment) return res.status(404).json({ message: "Comentario no encontrado" });

    const isOwner = Number(comment.user_id) === Number(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "No tienes permiso para eliminar este comentario" });
    }

    if (isOwner && !isAdmin) {
      const hasReplies = await get(
        "SELECT COUNT(*) as total FROM game_comments WHERE parent_comment_id = ?",
        [req.params.id]
      );

      if ((hasReplies?.total || 0) > 0) {
        return res.status(409).json({
          message: "No puedes eliminar tu comentario porque tiene respuestas"
        });
      }
    }

    await run("DELETE FROM game_comments WHERE id = ?", [req.params.id]);
    return res.json({ message: "Comentario eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar comentario", error: error.message });
  }
});

app.post("/api/games/:id/report", authRequired, async (req, res) => {
  try {
    const game = await get("SELECT id FROM games WHERE id = ?", [req.params.id]);
    if (!game) return res.status(404).json({ message: "Videojuego no encontrado" });

    const { reason = "" } = req.body;
    const existing = await get(
      "SELECT id FROM game_reports WHERE game_id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (existing) {
      return res.status(409).json({ message: "Ya has reportado este videojuego" });
    }

    await run(
      "INSERT INTO game_reports (game_id, user_id, reason, created_at) VALUES (?, ?, ?, ?)",
      [req.params.id, req.user.id, String(reason).trim() || null, new Date().toISOString()]
    );

    return res.status(201).json({ message: "Videojuego reportado correctamente" });
  } catch (error) {
    return res.status(500).json({ message: "Error al reportar videojuego", error: error.message });
  }
});

app.get("/api/reports/games", authRequired, adminRequired, async (_req, res) => {
  try {
    const rows = await all(
      `SELECT g.id, g.nombre, g.portada,
       COUNT(r.id) as total_reports,
       MIN(r.created_at) as first_report_at,
       MAX(r.created_at) as last_report_at
       FROM game_reports r
       JOIN games g ON g.id = r.game_id
       GROUP BY g.id, g.nombre, g.portada
       ORDER BY total_reports DESC, last_report_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener reportes", error: error.message });
  }
});

app.post("/api/assistant/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "El mensaje es obligatorio" });
    }

    const { categorias, plataformas } = leerCatalogo();
    const games = await all(
      `SELECT g.id, g.nombre, g.descripcion, g.fecha_lanzamiento, g.compania, g.categoria_ids,
       g.plataforma_ids, g.precio,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes,
       COALESCE(SUM(CASE WHEN gv.vote_type = 'like' THEN 1 WHEN gv.vote_type = 'dislike' THEN -1 ELSE 0 END), 0) as popularidad
       FROM games g
       LEFT JOIN game_votes gv ON gv.game_id = g.id
       GROUP BY g.id
      ORDER BY popularidad DESC, g.id ASC
      LIMIT 25`
    );

    if (games.length === 0) {
      return res.json({ answer: "No hay videojuegos cargados en la base de datos para recomendar." });
    }

    const gamesContext = games
      .map((game) => {
        const categoriaIds = JSON.parse(game.categoria_ids || "[]");
        const plataformaIds = JSON.parse(game.plataforma_ids || "[]");
        const categoriaNombres = mapNamesByIds(categoriaIds, categorias);
        const plataformaNombres = mapNamesByIds(plataformaIds, plataformas);

        return [
          `ID: ${game.id}`,
          `Nombre: ${game.nombre}`,
          `Descripción: ${(game.descripcion || "No disponible").slice(0, 70)}`,
          `Compañía: ${game.compania || "No disponible"}`,
          `Fecha lanzamiento: ${game.fecha_lanzamiento || "No disponible"}`,
          `Precio: ${game.precio}`,
          `Categorías: ${categoriaNombres.join(", ") || "No disponible"}`,
          `Plataformas: ${plataformaNombres.join(", ") || "No disponible"}`,
          `Likes: ${game.likes} | Dislikes: ${game.dislikes} | Popularidad: ${game.popularidad}`
        ].join(" | ");
      })
      .join("\n");

    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const ollamaModel = process.env.OLLAMA_MODEL || "lfm2.5-thinking:1.2b";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        think: false,
        options: {
          num_predict: 220,
          temperature: 0.3
        },
        messages: [
          { role: "system", content: createAssistantInstructions(gamesContext) },
          { role: "user", content: String(message).trim() }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!ollamaResponse.ok) {
      const raw = await ollamaResponse.text();
      return res.status(502).json({
        message: "Error al consultar Ollama",
        detail: raw || "Sin detalle"
      });
    }

    const data = await ollamaResponse.json();
    const answer = cleanAssistantAnswer(data?.message?.content || "");

    return res.json({ answer: answer || "No pude generar respuesta en este momento." });
  } catch (error) {
    const isAbort = error?.name === "AbortError";
    return res.status(500).json({
      message: isAbort ? "Timeout consultando el asistente IA" : "Error del asistente IA",
      error: error.message
    });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend V2 escuchando en puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error al iniciar base de datos", error);
    process.exit(1);
  });
