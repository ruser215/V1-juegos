import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { all, get, initDb, run } from "./db.js";
import { authRequired } from "./middleware/auth.js";
import { normalizePagination } from "./utils/pagination.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRES_IN || "8h" }
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
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

    const totalRow = await get("SELECT COUNT(*) as total FROM games");
    const rows = await all(
      `SELECT g.*, u.username as owner_username
       FROM games g
       JOIN users u ON u.id = g.owner_id
       ORDER BY g.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
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
      `SELECT g.*, u.username as owner_username
       FROM games g
       JOIN users u ON u.id = g.owner_id
       WHERE g.owner_id = ?
       ORDER BY g.id DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
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
    const row = await get(
      `SELECT g.*, u.username as owner_username
       FROM games g
       JOIN users u ON u.id = g.owner_id
       WHERE g.id = ?`,
      [req.params.id]
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
