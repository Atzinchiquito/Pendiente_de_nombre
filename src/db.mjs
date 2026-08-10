import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, "nube.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    messages   TEXT NOT NULL,
    expires_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS profiles (
    user_id    TEXT PRIMARY KEY,
    nombre     TEXT,
    edad       INTEGER,
    sexo       TEXT,
    ubicacion  TEXT,
    updated_at INTEGER
  );
`);

const stmts = {
  getSession: db.prepare("SELECT messages FROM sessions WHERE session_id = ?"),
  putSession: db.prepare(
    "INSERT OR REPLACE INTO sessions (session_id, messages, expires_at) VALUES (?, ?, ?)"
  ),
  getProfile:    db.prepare("SELECT * FROM profiles WHERE user_id = ?"),
  getAllProfiles: db.prepare("SELECT user_id, nombre FROM profiles ORDER BY updated_at DESC"),
  putProfile: db.prepare(
    "INSERT OR REPLACE INTO profiles (user_id, nombre, edad, sexo, ubicacion, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ),
};

export function getSession(sessionId) {
  return stmts.getSession.get(sessionId) ?? null;
}

export function putSession(sessionId, messages, expiresAt) {
  stmts.putSession.run(sessionId, messages, expiresAt ?? null);
}

export function getAllProfiles() {
  return stmts.getAllProfiles.all();
}

export function getProfile(userId) {
  return stmts.getProfile.get(userId) ?? null;
}

export function putProfile(userId, { nombre, edad, sexo, ubicacion }) {
  stmts.putProfile.run(userId, nombre ?? null, edad ?? null, sexo ?? null, ubicacion ?? null, Date.now());
}
