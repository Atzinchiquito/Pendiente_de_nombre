import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });
import express from "express";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { HOME_HTML } from "./home-page.mjs";
import { answerWith, getTrips, getPlan } from "./agent.mjs";
import { getUserByName, createUser, getAllProfiles, countProfiles, deleteProfile, putPlan } from "./db.mjs";
import { loadProfile, saveProfile } from "./userProfile.mjs";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const attempt = scryptSync(password, salt, 64);
  return timingSafeEqual(attempt, Buffer.from(hash, "hex"));
}

function deriveUserId(username) {
  return createHash("sha256").update(username.trim().toLowerCase()).digest("hex").slice(0, 32);
}

const MANIFEST = JSON.stringify({
  name: "Pendiente de Nombre",
  short_name: "Agente",
  description: "AI Agent Chat",
  start_url: "./",
  display: "standalone",
  background_color: "#f2e8ed",
  theme_color: "#e8006e",
  icons: [
    { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
  ]
});

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#1a0a10"/>
  <circle cx="126" cy="44" r="16" fill="#e8006e"/>
  <line x1="118" y1="58" x2="88" y2="100" stroke="#e8006e" stroke-width="12" stroke-linecap="round"/>
  <line x1="110" y1="72" x2="136" y2="54" stroke="#ff4fa0" stroke-width="10" stroke-linecap="round"/>
  <line x1="100" y1="88" x2="70" y2="108" stroke="#ff4fa0" stroke-width="10" stroke-linecap="round"/>
  <line x1="88" y1="100" x2="58" y2="130" stroke="#e8006e" stroke-width="12" stroke-linecap="round"/>
  <line x1="58" y1="130" x2="44" y2="152" stroke="#e8006e" stroke-width="11" stroke-linecap="round"/>
  <line x1="88" y1="100" x2="118" y2="130" stroke="#e8006e" stroke-width="12" stroke-linecap="round"/>
  <line x1="118" y1="130" x2="148" y2="148" stroke="#e8006e" stroke-width="11" stroke-linecap="round"/>
</svg>`;

const SW_JS = `
const CACHE = 'agent-v1';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('./')));
});
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
`;

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const key = process.env.GOOGLE_MAPS_API_KEY ?? "";
  res.send(HOME_HTML.replace("__GMAPS_KEY__", key));
});

app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.send(MANIFEST);
});

app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(SW_JS);
});

app.get("/icon.svg", (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(ICON_SVG);
});

app.post("/register", (req, res) => {
  const { name, password } = req.body ?? {};
  if (!name || !password) {
    return res.status(400).json({ error: "Nombre y contraseña requeridos." });
  }
  if (name.trim().length < 2) {
    return res.status(400).json({ error: "El nombre debe tener al menos 2 caracteres." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }
  if (getUserByName(name.trim())) {
    return res.status(409).json({ error: "Ese nombre de usuario ya está registrado." });
  }
  const userId = deriveUserId(name);
  createUser(userId, name.trim(), hashPassword(password));
  res.json({ userId });
});

app.post("/login", (req, res) => {
  const { name, password } = req.body ?? {};
  if (!name || !password) {
    return res.status(400).json({ error: "Nombre y contraseña requeridos." });
  }
  const user = getUserByName(name.trim());
  if (!user || !verifyPassword(password, user.pass_hash)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }
  res.json({ userId: user.user_id });
});

app.get("/profiles", (req, res) => {
  const loginUserId = req.query.loginUserId ?? "";
  res.json(getAllProfiles(loginUserId));
});

app.get("/profile", (req, res) => {
  const userId = req.query.userId ?? "anonymous";
  const profile = loadProfile(userId);
  res.json({ nombre: profile?.nombre ?? null });
});

app.delete("/profile/:userId", (req, res) => {
  deleteProfile(req.params.userId);
  res.json({ ok: true });
});

app.post("/profile", (req, res) => {
  const { userId, loginUserId, nombre, edad, sexo, ubicacion } = req.body ?? {};
  if (!userId || !loginUserId) return res.status(400).json({ error: "userId y loginUserId requeridos." });
  if (countProfiles(loginUserId) >= 3) {
    return res.status(409).json({ error: "Límite de 3 perfiles alcanzado." });
  }
  saveProfile(userId, loginUserId, { nombre, edad: edad ? Number(edad) : null, sexo, ubicacion });
  res.json({ ok: true });
});

app.get("/plan", (req, res) => {
  const userId = req.query.userId ?? "anonymous";
  const plan = getPlan(userId);
  res.json(plan ?? null);
});

app.delete("/plan", (req, res) => {
  const userId = req.query.userId ?? "anonymous";
  putPlan(userId, null);
  res.json({ ok: true });
});

app.get("/trips", async (req, res) => {
  const userId = req.query.userId ?? "anonymous";
  const trips = await getTrips(userId);
  res.json(trips);
});

app.post("/chat", async (req, res) => {
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");

  const send = (obj) => res.write(JSON.stringify(obj) + "\n");

  try {
    const { message, sessionId, userId } = req.body ?? {};
    for await (const chunk of answerWith(
      message ?? "Hola!",
      sessionId ?? "no-session",
      userId ?? "anonymous"
    )) {
      send(chunk);
    }
    send({ type: "done" });
  } catch (err) {
    send({ type: "error", text: `${err.name}: ${err.message}` });
  }
  res.end();
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Nube agent corriendo en http://localhost:${PORT}`);
});
