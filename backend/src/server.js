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
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/`{2,3}\s*json/gi, "")
    .replace(/`{2,3}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.toLowerCase().includes("<think>")) {
    cleaned = cleaned.replace(/<think>/gi, "").trim();

    const normalized = cleaned.toLowerCase();
    const markers = ["respuesta final:", "final answer:", "respuesta:", "recomendacion:", "recomendación:"];
    let extracted = "";

    for (const marker of markers) {
      const index = normalized.lastIndexOf(marker);
      if (index !== -1) {
        extracted = cleaned.slice(index + marker.length).trim();
        break;
      }
    }

    if (!extracted) {
      const blocks = cleaned.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
      extracted = blocks.at(-1) || cleaned;
    }

    cleaned = extracted;
  }

  const lower = cleaned.toLowerCase();
  const looksLikeReasoning =
    cleaned.length > 260 &&
    (lower.startsWith("first,") || lower.startsWith("okay") || lower.includes("i need to") || lower.includes("let's"));

  if (looksLikeReasoning) {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentences.length > 0) {
      const tail = sentences.slice(-2).join(" ");
      cleaned = tail || sentences.at(-1) || cleaned;
    }
  }

  return cleaned;
}

function isInvalidAssistantAnswer(answer) {
  const trimmed = String(answer || "").trim();
  if (!trimmed) return true;

  const lowered = trimmed.toLowerCase();
  if (["...", "…", "ok", "vale"].includes(lowered)) return true;
  if (trimmed.length < 8) return true;

  return false;
}

function answerMentionsKnownGame(answer, gameNames) {
  const normalizedAnswer = normalizeText(answer);
  return gameNames.some((name) => normalizedAnswer.includes(normalizeText(name)));
}

function extractKnownGames(answer, gameNames) {
  const normalizedAnswer = normalizeText(answer);
  return gameNames.filter((name) => normalizedAnswer.includes(normalizeText(name)));
}

function buildCleanRecommendationFromAnswer(answer, gameNames) {
  const matches = extractKnownGames(answer, gameNames);
  if (matches.length === 0) return answer;

  const normalized = normalizeText(answer);
  const hasContext = ["porque", "destaca", "recomiendo", "mejor", "popular", "precio"].some((token) =>
    normalized.includes(token)
  );

  if (hasContext) return answer;
  return `Dentro de los juegos disponibles, te recomiendo ${matches[0]}.`;
}

function detectIntent(message) {
  const normalized = normalizeText(message);

  if (normalized.includes("mas caro") || normalized.includes("más caro") || normalized.includes("caro")) {
    return "expensive";
  }

  if (normalized.includes("mas barato") || normalized.includes("más barato") || normalized.includes("barato")) {
    return "cheap";
  }

  if (normalized.includes("peor") || normalized.includes("menos popular")) {
    return "worst";
  }

  if (normalized.includes("mejor") || normalized.includes("recomiend") || normalized.includes("top")) {
    return "best";
  }

  return "generic";
}

function isHybridQuickIntent(message) {
  const normalized = normalizeText(message);
  return [
    "recomiend",
    "suger",
    "mejor",
    "peor",
    "mas caro",
    "más caro",
    "mas barato",
    "más barato",
    "caro",
    "barato",
    "popular"
  ].some((token) => normalized.includes(token));
}

function getHybridScope(message, games) {
  const intentTerms = new Set([
    "mejor", "peor", "barato", "economico", "caro", "popular", "recomiend", "suger", "top", "mas", "más"
  ]);

  const terms = expandKeywords(getKeywords(message)).filter((term) => !intentTerms.has(term));
  if (terms.length === 0) {
    return { pool: games, hasTopicalTerms: false, noMatches: false };
  }

  const filtered = games.filter((game) => {
    const haystack = normalizeText(
      `${game.nombre || ""} ${game.descripcion || ""} ${game.compania || ""} ${game.categoriasTexto || ""} ${game.plataformasTexto || ""}`
    );
    return terms.some((term) => haystack.includes(term));
  });

  if (filtered.length === 0) {
    return { pool: [], hasTopicalTerms: true, noMatches: true };
  }

  return { pool: filtered, hasTopicalTerms: true, noMatches: false };
}

function deterministicHybridAnswer(message, games) {
  const intent = detectIntent(message);
  const { pool, noMatches } = getHybridScope(message, games);

  if (noMatches) {
    return "No encuentro videojuegos de ese tipo en la base de datos actual.";
  }

  if (pool.length === 0) {
    return "Solo puedo responder sobre videojuegos disponibles en esta base de datos.";
  }

  const byPopularity = pool
    .slice()
    .sort((a, b) => (Number(b.popularidad) - Number(a.popularidad)) || (Number(a.precio) - Number(b.precio)));
  const byWorst = pool
    .slice()
    .sort((a, b) => (Number(a.popularidad) - Number(b.popularidad)) || (Number(b.precio) - Number(a.precio)));
  const byCheap = pool
    .slice()
    .sort((a, b) => (Number(a.precio) - Number(b.precio)) || (Number(b.popularidad) - Number(a.popularidad)));
  const byExpensive = pool
    .slice()
    .sort((a, b) => (Number(b.precio) - Number(a.precio)) || (Number(b.popularidad) - Number(a.popularidad)));

  if (intent === "expensive") return formatGameAnswer("expensive", byExpensive[0]);
  if (intent === "cheap") return formatGameAnswer("cheap", byCheap[0]);
  if (intent === "worst") return formatGameAnswer("worst", byWorst[0]);

  return formatGameAnswer("best", byPopularity[0]);
}

function pickGameFromAnswer(answer, relevantGames) {
  const gameNames = relevantGames.map((game) => game.nombre);
  const matches = extractKnownGames(answer, gameNames);
  if (matches.length === 0) return null;

  const selectedName = matches[0];
  return relevantGames.find((game) => normalizeText(game.nombre) === normalizeText(selectedName)) || null;
}

function formatGameAnswer(intent, game) {
  if (!game) return "Solo puedo responder sobre videojuegos disponibles en esta base de datos.";

  if (intent === "expensive") {
    return `${game.nombre} es de los más caros del catálogo actual (precio: €${game.precio}).`;
  }

  if (intent === "cheap") {
    return `${game.nombre} es de los más baratos del catálogo actual (precio: €${game.precio}).`;
  }

  if (intent === "worst") {
    return `Dentro de los juegos disponibles, uno de los peor valorados es ${game.nombre} (popularidad: ${game.popularidad}).`;
  }

  return `Dentro de los juegos disponibles, te recomiendo ${game.nombre}.`;
}

function normalizeAssistantOutput(answer, message, relevantGames) {
  const gameNames = relevantGames.map((game) => game.nombre);
  const cleaned = finalizeAssistantAnswer(answer, gameNames);
  const lowered = normalizeText(cleaned);
  const intent = detectIntent(message);

  const englishMetaSignals = [
    "the user", "so the answer should", "need to", "first sentence", "second sentence", "wait", "however"
  ];
  const hasMeta = englishMetaSignals.some((signal) => lowered.includes(signal));

  const picked = pickGameFromAnswer(cleaned, relevantGames) || relevantGames[0] || null;

  if (["expensive", "cheap", "worst"].includes(intent) && picked) {
    return formatGameAnswer(intent, picked);
  }

  if (hasMeta || isInvalidAssistantAnswer(cleaned)) {
    return formatGameAnswer(intent, picked);
  }

  return cleaned;
}

function parseIndexChoice(text, max) {
  const match = String(text || "").match(/\b([1-9][0-9]?)\b/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 1 || value > max) return null;
  return value;
}

function answerIsInScopeWithoutGame(answer) {
  const normalized = normalizeText(answer);
  return [
    "no hay",
    "no encuentro",
    "no dispongo",
    "no tengo videojuegos",
    "solo puedo responder sobre videojuegos disponibles en esta base de datos"
  ].some((token) => normalized.includes(token));
}

function finalizeAssistantAnswer(answer, gameNames) {
  const cleaned = cleanAssistantAnswer(answer);
  const lowered = normalizeText(cleaned);
  const metaSignals = ["the user", "response should", "wait", "i should", "let me", "i need to"];
  const looksMeta = metaSignals.some((signal) => lowered.includes(signal));

  if (!looksMeta) return cleaned;

  const matches = extractKnownGames(cleaned, gameNames);
  if (matches.length === 0) return cleaned;

  return `Dentro de los juegos disponibles, te recomiendo ${matches[0]}.`;
}

function parseAssistantContent(rawContent) {
  const raw = String(rawContent || "").trim();
  if (!raw) return "";

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const normalizedRaw = fencedMatch ? fencedMatch[1].trim() : raw;

  try {
    const parsed = JSON.parse(normalizedRaw);
    if (typeof parsed?.answer === "string") {
      return cleanAssistantAnswer(parsed.answer);
    }
  } catch {
    const answerMatch = normalizedRaw.match(/"answer"\s*:\s*"([\s\S]*?)"\s*[},]/i);
    if (answerMatch?.[1]) {
      const unescaped = answerMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"');
      return cleanAssistantAnswer(unescaped);
    }

    return cleanAssistantAnswer(normalizedRaw);
  }

  return cleanAssistantAnswer(normalizedRaw);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getKeywords(message) {
  const stopWords = new Set([
    "que", "qué", "de", "la", "el", "los", "las", "un", "una", "y", "o", "en", "por", "para",
    "me", "mi", "tu", "te", "es", "del", "al", "con", "como", "cómo", "juego", "juegos",
    "cual", "cuál", "cuales", "cuáles", "seria", "sería"
  ]);

  return normalizeText(message)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function expandKeywords(keywords) {
  const synonyms = {
    nintendo: ["switch"],
    switch: ["nintendo"],
    sony: ["playstation", "ps", "ps4", "ps5"],
    playstation: ["sony", "ps", "ps4", "ps5"],
    xbox: ["microsoft"],
    microsoft: ["xbox"],
    ordenador: ["pc"],
    computadora: ["pc"],
    computador: ["pc"]
  };

  const expanded = new Set(keywords);

  for (const keyword of keywords) {
    const related = synonyms[keyword] || [];
    for (const item of related) {
      expanded.add(item);
    }
  }

  return Array.from(expanded);
}

function chooseRelevantGames(games, message, limit = 8) {
  const keywords = expandKeywords(getKeywords(message));
  const intent = detectIntent(message);
  const intentOnlyTerms = new Set([
    "mejor", "peor", "barato", "economico", "caro", "popular", "recomiend", "top", "mas", "más"
  ]);
  const topicalKeywords = keywords.filter((kw) => !intentOnlyTerms.has(kw));

  if (keywords.length === 0 || topicalKeywords.length === 0) {
    if (intent === "expensive") {
      return games
        .slice()
        .sort((a, b) => (Number(b.precio) - Number(a.precio)) || (Number(b.popularidad) - Number(a.popularidad)))
        .slice(0, limit);
    }

    if (intent === "cheap") {
      return games
        .slice()
        .sort((a, b) => (Number(a.precio) - Number(b.precio)) || (Number(b.popularidad) - Number(a.popularidad)))
        .slice(0, limit);
    }

    if (intent === "worst") {
      return games
        .slice()
        .sort((a, b) => (Number(a.popularidad) - Number(b.popularidad)) || (Number(b.precio) - Number(a.precio)))
        .slice(0, limit);
    }

    return games
      .slice()
      .sort((a, b) => (Number(b.popularidad) - Number(a.popularidad)) || (Number(a.precio) - Number(b.precio)))
      .slice(0, limit);
  }

  const scored = games.map((game) => {
    const haystack = normalizeText(
      `${game.nombre} ${game.descripcion || ""} ${game.compania || ""} ${game.categoriasTexto || ""} ${game.plataformasTexto || ""}`
    );

    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) score += 3;
      if (normalizeText(game.nombre).includes(kw)) score += 3;
    }

    score += Number(game.popularidad || 0) * 0.5;

    return { game, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.game);
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

    const gamesPrepared = games.map((game) => {
      const categoriaIds = JSON.parse(game.categoria_ids || "[]");
      const plataformaIds = JSON.parse(game.plataforma_ids || "[]");
      const categoriaNombres = mapNamesByIds(categoriaIds, categorias);
      const plataformaNombres = mapNamesByIds(plataformaIds, plataformas);

      return {
        ...game,
        categoriasTexto: categoriaNombres.join(", "),
        plataformasTexto: plataformaNombres.join(", ")
      };
    });

    const relevantGames = chooseRelevantGames(gamesPrepared, String(message).trim(), 8);
    if (isHybridQuickIntent(message)) {
      return res.json({
        answer: deterministicHybridAnswer(String(message).trim(), gamesPrepared)
      });
    }
    const relevantNames = relevantGames.map((game) => game.nombre);

    const gamesContext = relevantGames
      .map((game) => {
        return [
          `ID: ${game.id}`,
          `Nombre: ${game.nombre}`,
          `Descripción: ${(game.descripcion || "No disponible").slice(0, 45)}`,
          `Compañía: ${game.compania || "No disponible"}`,
          `Fecha lanzamiento: ${game.fecha_lanzamiento || "No disponible"}`,
          `Precio: ${game.precio}`,
          `Categorías: ${game.categoriasTexto || "No disponible"}`,
          `Plataformas: ${game.plataformasTexto || "No disponible"}`,
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
        keep_alive: "15m",
        think: false,
        options: {
          num_predict: 120,
          num_ctx: 1024,
          temperature: 0.3
        },
        messages: [
          { role: "system", content: createAssistantInstructions(gamesContext) },
          {
            role: "user",
            content: `${String(message).trim()}\n\nResponde en español, en texto plano, sin markdown, sin bloques de código y sin JSON.`
          }
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
    const answer = normalizeAssistantOutput(parseAssistantContent(data?.message?.content || ""), message, relevantGames);

    const validScope =
      answerMentionsKnownGame(answer, relevantNames) ||
      answerIsInScopeWithoutGame(answer);

    if (!isInvalidAssistantAnswer(answer) && validScope) {
      return res.json({ answer });
    }

    const retryController = new AbortController();
    const retryTimeout = setTimeout(() => retryController.abort(), 45000);

    const retryResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        keep_alive: "15m",
        think: false,
        options: {
          num_predict: 260,
          num_ctx: 1024,
          temperature: 0.15
        },
        messages: [
          { role: "system", content: createAssistantInstructions(gamesContext) },
          {
            role: "user",
            content: `${String(message).trim()}\n\nResponde en máximo 2 frases, texto plano, sin markdown, sin JSON y sin mostrar razonamiento interno.`
          }
        ]
      }),
      signal: retryController.signal
    });

    clearTimeout(retryTimeout);

    if (!retryResponse.ok) {
      return res.json({ answer: "No pude generar respuesta en este momento." });
    }

    const retryData = await retryResponse.json();
    const retryAnswer = normalizeAssistantOutput(parseAssistantContent(retryData?.message?.content || ""), message, relevantGames);

    const retryScope =
      answerMentionsKnownGame(retryAnswer, relevantNames) ||
      answerIsInScopeWithoutGame(retryAnswer);

    if (isInvalidAssistantAnswer(retryAnswer) || !retryScope) {
      const rescueController = new AbortController();
      const rescueTimeout = setTimeout(() => rescueController.abort(), 30000);

      const optionsText = relevantNames.slice(0, 8).join(", ");

      try {
        const rescueResponse = await fetch(`${ollamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ollamaModel,
            stream: false,
            keep_alive: "15m",
            think: false,
            options: {
              num_predict: 80,
              temperature: 0.1
            },
            messages: [
              {
                role: "system",
                content:
                  "Debes responder solo con videojuegos permitidos y en texto plano. No uses markdown, no uses JSON."
              },
              {
                role: "user",
                content: `Pregunta: ${String(message).trim()}\n\nVideojuegos permitidos: ${optionsText}\n\nElige SOLO un nombre exacto de la lista y responde en una frase corta mencionando ese nombre.`
              }
            ]
          }),
          signal: rescueController.signal
        });

        clearTimeout(rescueTimeout);

        if (rescueResponse.ok) {
          const rescueData = await rescueResponse.json();
          const rescueAnswerRaw = normalizeAssistantOutput(parseAssistantContent(rescueData?.message?.content || ""), message, relevantGames);
          const rescueAnswer = buildCleanRecommendationFromAnswer(rescueAnswerRaw, relevantNames);
          const rescueScope = answerMentionsKnownGame(rescueAnswer, relevantNames);

          if (!isInvalidAssistantAnswer(rescueAnswer) && rescueScope) {
            return res.json({ answer: rescueAnswer });
          }

          const shortlist = relevantNames.slice(0, 5);
          if (shortlist.length > 0) {
            const numbered = shortlist.map((name, index) => `${index + 1}. ${name}`).join("\n");

            const choiceResponse = await fetch(`${ollamaUrl}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: ollamaModel,
                stream: false,
                keep_alive: "15m",
                think: false,
                options: {
                  num_predict: 8,
                  temperature: 0
                },
                messages: [
                  {
                    role: "system",
                    content:
                      "Debes elegir solo una opción válida y responder únicamente con el número de opción."
                  },
                  {
                    role: "user",
                    content: `Pregunta: ${String(message).trim()}\n\nOpciones:\n${numbered}\n\nResponde solo con el número.`
                  }
                ]
              })
            });

            if (choiceResponse.ok) {
              const choiceData = await choiceResponse.json();
              const choiceRaw = parseAssistantContent(choiceData?.message?.content || "");
              const selectedIndex = parseIndexChoice(choiceRaw, shortlist.length);

              if (selectedIndex) {
                const selectedGame = shortlist[selectedIndex - 1];
                return res.json({
                  answer: `Dentro de los juegos disponibles, te recomiendo ${selectedGame}.`
                });
              }
            }
          }
        }
      } catch {
      }

      if (relevantNames.length > 0) {
        return res.json({
          answer: `Dentro de los juegos disponibles, te recomiendo ${relevantNames[0]}.`
        });
      }

      return res.json({
        answer: "Solo puedo responder sobre videojuegos disponibles en esta base de datos."
      });
    }

    return res.json({ answer: retryAnswer });
  } catch (error) {
    const isAbort = error?.name === "AbortError";
    if (isAbort) {
      return res.status(504).json({ message: "Timeout consultando el asistente IA" });
    }

    return res.status(500).json({
      message: "Error del asistente IA",
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
