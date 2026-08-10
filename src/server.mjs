import "dotenv/config";
import express from "express";
import { HOME_HTML } from "./home-page.mjs";
import { answerWith, getTrips } from "./agent.mjs";

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
  res.send(HOME_HTML);
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
