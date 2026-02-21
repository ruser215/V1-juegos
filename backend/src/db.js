import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "data.sqlite");

sqlite3.verbose();
export const db = new sqlite3.Database(dbPath);

export function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function onRun(error) {
      if (error) return reject(error);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (error, row) => {
      if (error) return reject(error);
      resolve(row);
    });
  });
}

export function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });
}

export async function initDb() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      fecha_lanzamiento TEXT,
      compania TEXT,
      categoria_ids TEXT NOT NULL,
      plataforma_ids TEXT NOT NULL,
      precio REAL NOT NULL,
      portada TEXT,
      video TEXT,
      owner_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS game_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
      created_at TEXT NOT NULL,
      UNIQUE(game_id, user_id),
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS game_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_comment_id INTEGER,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(parent_comment_id) REFERENCES game_comments(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS game_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(game_id, user_id),
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  const admin = await get("SELECT id FROM users WHERE email = ?", ["admin@demo.com"]);
  if (!admin) {
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash("admin123", 10);
    await run(
      "INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
      ["admin", "admin@demo.com", passwordHash, "admin", new Date().toISOString()]
    );
  }

  const adminUser = await get("SELECT id FROM users WHERE email = ?", ["admin@demo.com"]);
  const gamesCount = await get("SELECT COUNT(*) as total FROM games");

  if ((gamesCount?.total || 0) === 0) {
    const datosPath = path.join(__dirname, "..", "..", "datos.json");

    if (fs.existsSync(datosPath)) {
      const raw = fs.readFileSync(datosPath, "utf8");
      const datos = JSON.parse(raw);
      const juegos = Array.isArray(datos?.juegos) ? datos.juegos : [];
      const companias = Array.isArray(datos?.companias) ? datos.companias : [];

      for (const juego of juegos) {
        const companiaPorId = companias.find((c) => String(c.id) === String(juego.compania_id))?.nombre;

        await run(
          `INSERT INTO games
          (nombre, descripcion, fecha_lanzamiento, compania, categoria_ids, plataforma_ids, precio, portada, video, owner_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            juego.nombre || "Sin nombre",
            juego.descripcion || juego.Descripcion || "",
            juego.fecha_lanzamiento || juego.fechaLanzamiento || null,
            juego.compania || juego.compañia || companiaPorId || null,
            JSON.stringify(Array.isArray(juego.categoria_ids) ? juego.categoria_ids.map(String) : []),
            JSON.stringify(Array.isArray(juego.plataforma_ids) ? juego.plataforma_ids.map(String) : []),
            Number(juego.precio) || 0,
            juego.portada || juego.Portada || null,
            juego.video || juego.url_video || juego.urlVideo || null,
            adminUser.id,
            new Date().toISOString()
          ]
        );
      }
    }
  }
}
