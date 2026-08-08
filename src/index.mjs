import { CHAT_HTML } from "./chat-page.mjs";
import { answerWith } from "./agent.mjs";

const MANIFEST = JSON.stringify({
  name: "Pendiente de Nombre",
  short_name: "Agente",
  description: "AI Agent Chat",
  start_url: "./",
  display: "standalone",
  background_color: "#0f1b2a",
  theme_color: "#0f1b2a",
  icons: [
    { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
  ]
});

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#0f1b2a"/>
  <rect x="44" y="52" width="104" height="96" rx="20" fill="#ff9900"/>
  <rect x="64" y="80" width="20" height="20" rx="4" fill="#0f1b2a"/>
  <rect x="108" y="80" width="20" height="20" rx="4" fill="#0f1b2a"/>
  <rect x="64" y="116" width="64" height="14" rx="7" fill="#0f1b2a"/>
  <rect x="88" y="30" width="16" height="26" rx="4" fill="#ff9900"/>
  <circle cx="96" cy="28" r="10" fill="#ff9900"/>
  <circle cx="96" cy="28" r="5" fill="#0f1b2a"/>
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
      return serveStatic(responseStream, "text/html; charset=utf-8", CHAT_HTML);
    }

    // POST /chat → stream the agent's answer as NDJSON
    responseStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: { "Content-Type": "application/x-ndjson", "Transfer-Encoding": "chunked" },
    });
    const send = (obj) => responseStream.write(JSON.stringify(obj) + "\n");

    try {
      const { message, sessionId } = JSON.parse(event.body ?? "{}");
      for await (const chunk of answerWith(message ?? "Hello!", sessionId ?? "no-session")) {
        send(chunk);
      }
      send({ type: "done" });
    } catch (err) {
      send({ type: "error", text: `${err.name}: ${err.message}` });
    }
    responseStream.end();
  }
);
