// The chat page your agent serves at GET / — you don't need to edit this file.
// It talks to your agent by POSTing to /chat and reading the streamed response.

export const CHAT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#1a0a10">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Agente">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon.svg">
<title>Agente</title>
<style>
  :root {
    --bg: #1a0a10;
    --panel: #2a1020;
    --accent: #e8006e;
    --accent2: #ff4fa0;
    --text: #fce4ec;
    --dim: #b06080;
    --border: #5a1a38;
  }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
         height: 100vh; display: flex; flex-direction: column; }
  header { padding: 14px 20px; background: var(--panel); border-bottom: 1px solid var(--border); }
  header h1 { font-size: 15px; font-weight: 500; letter-spacing: .03em; color: var(--accent2); }
  #log { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 78%; padding: 10px 14px; border-radius: 16px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; font-size: 15px; }
  .user { align-self: flex-end; background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
  .agent { align-self: flex-start; background: var(--panel); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
  .tool { align-self: flex-start; font-size: 11px; color: var(--dim); padding: 4px 10px; letter-spacing: .02em; }
  .error { align-self: flex-start; color: #ff6b8a; font-size: 13px; padding: 4px 0; }
  .sys { align-self: center; font-size: 12px; color: var(--dim); }
  form { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--panel); border-top: 1px solid var(--border); }
  input { flex: 1; padding: 11px 14px; border-radius: 24px; border: 1px solid var(--border);
          background: var(--bg); color: var(--text); font-size: 15px; outline: none; }
  input:focus { border-color: var(--accent); }
  input::placeholder { color: var(--dim); }
  #send { width: 40px; height: 40px; padding: 0; border: none; border-radius: 50%;
          background: var(--accent); color: #fff; font-size: 18px; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; }
  #send:disabled { opacity: .35; cursor: default; }
  #mic { width: 40px; height: 40px; padding: 0; border: 1px solid var(--border); border-radius: 50%;
         background: transparent; color: var(--dim); font-size: 16px; cursor: pointer; flex-shrink: 0;
         display: flex; align-items: center; justify-content: center; }
  #mic:disabled { opacity: .35; cursor: default; }
  #mic.listening { color: var(--accent2); border-color: var(--accent); animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

  /* sidebar */
  #sidebar {
    position: fixed; top: 0; left: 0; height: 100%; width: 280px;
    background: #120810; border-right: 1px solid var(--border);
    transform: translateX(-100%); transition: transform .25s ease;
    display: flex; flex-direction: column; z-index: 100;
  }
  #sidebar.open { transform: translateX(0); }
  #overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 99;
  }
  #overlay.show { display: block; }
  #sidebar-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid var(--border);
  }
  #sidebar-header span { font-size: 13px; font-weight: 500; color: var(--accent2); letter-spacing: .04em; }
  #sidebar-close { background: none; border: none; color: var(--dim); cursor: pointer;
                   width: 32px; height: 32px; font-size: 18px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
  #sidebar-close:hover { color: var(--text); }
  #trips-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .trip-card {
    background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
    padding: 12px 14px; font-size: 13px; line-height: 1.5;
  }
  .trip-card .trip-route { font-weight: 500; color: var(--text); margin-bottom: 4px; }
  .trip-card .trip-meta { color: var(--dim); font-size: 11px; }
  .trip-card .trip-summary { color: var(--dim); margin-top: 6px; font-size: 12px; }
  .trips-empty { color: var(--dim); font-size: 13px; text-align: center; padding: 32px 16px; }
  #history-btn {
    width: 36px; height: 36px; padding: 0; border: 1px solid var(--border); border-radius: 50%;
    background: transparent; color: var(--dim); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  #history-btn:hover { color: var(--text); }
</style>
</head>
<body>
<div id="overlay"></div>
<div id="sidebar">
  <div id="sidebar-header">
    <span>Historial de viajes</span>
    <button id="sidebar-close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
  <div id="trips-list"><p class="trips-empty">Sin viajes guardados</p></div>
</div>
<header style="display:flex;align-items:center;gap:12px;">
  <button id="history-btn" title="Historial">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  </button>
  <h1>Agente</h1>
</header>
<div id="log"><div class="sys">Escribe o habla para comenzar</div></div>
<form id="f">
  <input id="box" placeholder="Escribe algo…" autocomplete="off" autofocus>
  <button id="mic" type="button" title="Hablar">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/>
    </svg>
  </button>
  <button id="send">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  </button>
</form>
<script>
"use strict";
const log = document.getElementById("log"), box = document.getElementById("box"),
      send = document.getElementById("send");

const sessionId = crypto.randomUUID();

// userId persists across sessions so trip history accumulates
let userId = localStorage.getItem("userId");
if (!userId) { userId = crypto.randomUUID(); localStorage.setItem("userId", userId); }

function add(cls, text) {
  const d = document.createElement("div");
  d.className = "msg " + cls;
  d.textContent = text;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}

async function ask(message) {
  send.disabled = true;
  let current = null;
  try {
    const res = await fetch("chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId, userId }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const m = JSON.parse(line);
        if (m.type === "token") {
          if (!current) current = add("agent", "");
          current.textContent += m.text;
          log.scrollTop = log.scrollHeight;
        } else if (m.type === "tool") {
          current = null;
          add("tool", "🔧 using tool: " + m.name);
        } else if (m.type === "error") {
          current = null;
          add("error", "⚠ " + m.text);
        }
      }
    }
  } catch (err) {
    add("error", "⚠ Request failed: " + err.message);
  }
  send.disabled = false;
  box.focus();
}

document.getElementById("f").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = box.value.trim();
  if (!text || send.disabled) return;
  add("user", text);
  box.value = "";
  ask(text);
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

// --- Sidebar ---
const sidebar  = document.getElementById("sidebar");
const overlay  = document.getElementById("overlay");
const tripsList = document.getElementById("trips-list");

function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
  loadTrips();
}
function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

document.getElementById("history-btn").addEventListener("click", openSidebar);
document.getElementById("sidebar-close").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

async function loadTrips() {
  tripsList.innerHTML = '<p class="trips-empty">Cargando…</p>';
  try {
    const res = await fetch("trips?userId=" + encodeURIComponent(userId));
    const trips = await res.json();
    if (!trips.length) {
      tripsList.innerHTML = '<p class="trips-empty">Sin viajes guardados</p>';
      return;
    }
    tripsList.innerHTML = trips.map(t => \`
      <div class="trip-card">
        <div class="trip-route">\${t.origin} → \${t.destination}</div>
        <div class="trip-meta">\${formatDate(t.date)}\${t.duration ? " · " + t.duration : ""}</div>
        \${t.summary ? \`<div class="trip-summary">\${t.summary}</div>\` : ""}
      </div>
    \`).join("");
  } catch {
    tripsList.innerHTML = '<p class="trips-empty">Error al cargar historial</p>';
  }
}

const mic = document.getElementById("mic");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  mic.style.display = "none";
} else {
  const rec = new SpeechRecognition();
  rec.lang = "es-MX";
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = "";

  rec.onstart = () => { mic.classList.add("listening"); finalText = ""; };
  rec.onend   = () => {
    mic.classList.remove("listening");
    if (finalText.trim()) {
      box.value = finalText.trim();
      box.dispatchEvent(new Event("input"));
    }
  };
  rec.onresult = (e) => {
    let interim = "";
    for (const r of e.results) {
      if (r.isFinal) finalText += r[0].transcript;
      else interim = r[0].transcript;
    }
    box.value = finalText + interim;
  };
  rec.onerror = (e) => { if (e.error !== "aborted") add("error", "⚠ Micrófono: " + e.error); };

  mic.addEventListener("click", () => {
    if (mic.classList.contains("listening")) { rec.stop(); return; }
    rec.start();
  });
}
</script>
</body>
</html>`;
