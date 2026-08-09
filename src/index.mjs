import { CHAT_HTML } from "./chat-page.mjs";
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
  <!-- cabeza -->
  <circle cx="126" cy="44" r="16" fill="#e8006e"/>
  <!-- torso inclinado hacia adelante -->
  <line x1="118" y1="58" x2="88" y2="100" stroke="#e8006e" stroke-width="12" stroke-linecap="round"/>
  <!-- brazo trasero (arriba) -->
  <line x1="110" y1="72" x2="136" y2="54" stroke="#ff4fa0" stroke-width="10" stroke-linecap="round"/>
  <!-- brazo delantero (abajo) -->
  <line x1="100" y1="88" x2="70" y2="108" stroke="#ff4fa0" stroke-width="10" stroke-linecap="round"/>
  <!-- pierna delantera (extendida al frente) -->
  <line x1="88" y1="100" x2="58" y2="130" stroke="#e8006e" stroke-width="12" stroke-linecap="round"/>
  <line x1="58" y1="130" x2="44" y2="152" stroke="#e8006e" stroke-width="11" stroke-linecap="round"/>
  <!-- pierna trasera (extendida atrás) -->
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

function serveStatic(responseStream, contentType, body) {
  responseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: { "Content-Type": contentType },
  });
  responseStream.write(body);
  responseStream.end();
}

export const handler = awslambda.streamifyResponse(
  async (event, responseStream) => {
    if (event.httpMethod === "GET") {
      const path = event.path ?? "/";
      if (path.endsWith("/manifest.json")) return serveStatic(responseStream, "application/manifest+json", MANIFEST);
      if (path.endsWith("/sw.js"))         return serveStatic(responseStream, "application/javascript", SW_JS);
      if (path.endsWith("/icon.svg"))      return serveStatic(responseStream, "image/svg+xml", ICON_SVG);
      if (path.endsWith("/trips")) {
        const userId = event.queryStringParameters?.userId ?? "anonymous";
        const trips = await getTrips(userId);
        return serveStatic(responseStream, "application/json", JSON.stringify(trips));
      }
      return serveStatic(responseStream, "text/html; charset=utf-8", CHAT_HTML);
    }

    // POST /chat → stream the agent's answer as NDJSON
    responseStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: { "Content-Type": "application/x-ndjson", "Transfer-Encoding": "chunked" },
    });
    const send = (obj) => responseStream.write(JSON.stringify(obj) + "\n");

    try {
      const { message, sessionId, userId } = JSON.parse(event.body ?? "{}");
      for await (const chunk of answerWith(message ?? "Hello!", sessionId ?? "no-session", userId ?? "anonymous")) {
        send(chunk);
      }
      send({ type: "done" });
    } catch (err) {
      send({ type: "error", text: `${err.name}: ${err.message}` });
    }
    responseStream.end();
  }
);
