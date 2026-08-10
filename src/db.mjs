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
    user_id      TEXT PRIMARY KEY,
    login_user_id TEXT,
    nombre       TEXT,
    edad         INTEGER,
    sexo         TEXT,
    ubicacion    TEXT,
    updated_at   INTEGER
  );
  CREATE TABLE IF NOT EXISTS users (
    user_id    TEXT PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL COLLATE NOCASE,
    pass_hash  TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plans (
    user_id    TEXT PRIMARY KEY,
    plan       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

const stmts = {
  getSession: db.prepare("SELECT messages FROM sessions WHERE session_id = ?"),
  putSession: db.prepare(
    "INSERT OR REPLACE INTO sessions (session_id, messages, expires_at) VALUES (?, ?, ?)"
  ),
  getProfile:         db.prepare("SELECT * FROM profiles WHERE user_id = ?"),
  getAllProfiles:      db.prepare("SELECT user_id, nombre FROM profiles WHERE login_user_id = ? ORDER BY updated_at DESC"),
  countProfiles:      db.prepare("SELECT COUNT(*) as n FROM profiles WHERE login_user_id = ?"),
  deleteProfile:      db.prepare("DELETE FROM profiles WHERE user_id = ?"),
  putProfile: db.prepare(
    "INSERT OR REPLACE INTO profiles (user_id, login_user_id, nombre, edad, sexo, ubicacion, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ),
  getUserByName: db.prepare("SELECT * FROM users WHERE username = ?"),
  createUser: db.prepare(
    "INSERT INTO users (user_id, username, pass_hash, created_at) VALUES (?, ?, ?, ?)"
  ),
  getPlan: db.prepare("SELECT plan FROM plans WHERE user_id = ?"),
  putPlan: db.prepare(
    "INSERT OR REPLACE INTO plans (user_id, plan, created_at) VALUES (?, ?, ?)"
  ),
};

export function getSession(sessionId) {
  return stmts.getSession.get(sessionId) ?? null;
}

export function putSession(sessionId, messages, expiresAt) {
  stmts.putSession.run(sessionId, messages, expiresAt ?? null);
}

export function getAllProfiles(loginUserId) {
  return stmts.getAllProfiles.all(loginUserId);
}

export function countProfiles(loginUserId) {
  return stmts.countProfiles.get(loginUserId).n;
}

export function deleteProfile(userId) {
  stmts.deleteProfile.run(userId);
}

export function getProfile(userId) {
  return stmts.getProfile.get(userId) ?? null;
}

export function putProfile(userId, loginUserId, { nombre, edad, sexo, ubicacion }) {
  stmts.putProfile.run(userId, loginUserId, nombre ?? null, edad ?? null, sexo ?? null, ubicacion ?? null, Date.now());
}

export function getUserByName(username) {
  return stmts.getUserByName.get(username) ?? null;
}

export function createUser(userId, username, passHash) {
  stmts.createUser.run(userId, username, passHash, Date.now());
}

export function getPlan(userId) {
  const row = stmts.getPlan.get(userId);
  return row ? JSON.parse(row.plan) : null;
}

export function putPlan(userId, plan) {
  if (plan === null) {
    db.prepare("DELETE FROM plans WHERE user_id = ?").run(userId);
  } else {
    stmts.putPlan.run(userId, JSON.stringify(plan), Date.now());
  }
}
