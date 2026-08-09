// The chat page your agent serves at GET / — you don't need to edit this file.
// It talks to your agent by POSTing to /chat and reading the streamed response.

export const CHAT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f2e8ed">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Agente">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon.svg">
<title>Agente</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700;900&display=swap');
  :root {
    --bg: #f2e8ed;
    --panel: #fdf6f9;
    --accent: #e8006e;
    --accent2: #ff2d87;
    --text: #111111;
    --dim: #666666;
    --border: #111111;
    --shadow: 4px 4px 0 #111111;
  }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--bg); color: var(--text);
         font-family: 'Space Grotesk', -apple-system, sans-serif;
         height: 100vh; display: flex; flex-direction: column; }

  /* header */
  header { padding: 12px 16px; background: var(--accent); border-bottom: 3px solid var(--border);
           display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 16px; font-weight: 900; letter-spacing: .06em;
              text-transform: uppercase; color: #fff; flex: 1; }

  /* chat log */
  #log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
         background: var(--bg); }
  .msg { max-width: 80%; padding: 10px 14px; border: 2.5px solid var(--border);
         line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; font-size: 14px; }
  .user { align-self: flex-end; background: var(--accent); color: #fff;
          box-shadow: var(--shadow); font-weight: 700; }
  .agent { align-self: flex-start; background: var(--panel);
           box-shadow: var(--shadow); }
  .tool { align-self: flex-start; font-size: 11px; color: var(--dim);
          padding: 3px 8px; border: 1.5px dashed #aaa; letter-spacing: .04em;
          text-transform: uppercase; }
  .error { align-self: flex-start; background: #fff0f4; border: 2px solid var(--accent);
           color: var(--accent); font-size: 13px; padding: 6px 10px; }
  .sys { align-self: center; font-size: 11px; color: var(--dim);
         text-transform: uppercase; letter-spacing: .08em; }

  /* input bar */
  form { display: flex; align-items: center; gap: 8px; padding: 12px 14px;
         background: var(--panel); border-top: 3px solid var(--border); }
  input { flex: 1; padding: 10px 14px; border: 2.5px solid var(--border);
          background: var(--bg); color: var(--text); font-size: 14px;
          font-family: inherit; outline: none; border-radius: 0; }
  input:focus { border-color: var(--accent); box-shadow: 3px 3px 0 var(--accent); }
  input::placeholder { color: #aaa; }
  #send { width: 42px; height: 42px; padding: 0; border: 2.5px solid var(--border);
          border-radius: 0; background: var(--accent); color: #fff; cursor: pointer;
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          box-shadow: 3px 3px 0 var(--border); }
  #send:active { box-shadow: none; transform: translate(3px,3px); }
  #send:disabled { opacity: .4; cursor: default; box-shadow: none; }
  #mic { width: 42px; height: 42px; padding: 0; border: 2.5px solid var(--border);
         border-radius: 0; background: var(--panel); color: var(--text); cursor: pointer;
         flex-shrink: 0; display: flex; align-items: center; justify-content: center;
         box-shadow: 3px 3px 0 var(--border); }
  #mic:active { box-shadow: none; transform: translate(3px,3px); }
  #mic:disabled { opacity: .4; cursor: default; box-shadow: none; }
  #mic.listening { background: var(--accent); color: #fff; animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

  /* sidebar */
  #sidebar {
    position: fixed; top: 0; left: 0; height: 100%; width: 290px;
    background: var(--panel); border-right: 3px solid var(--border);
    transform: translateX(-100%); transition: transform .2s ease;
    display: flex; flex-direction: column; z-index: 100;
  }
  #sidebar.open { transform: translateX(0); }
  #overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 99; }
  #overlay.show { display: block; }
  #sidebar-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; background: var(--accent); border-bottom: 3px solid var(--border);
  }
  #sidebar-header span { font-size: 12px; font-weight: 900; color: #fff;
                         letter-spacing: .08em; text-transform: uppercase; }
  #sidebar-close { background: none; border: 2px solid #fff; color: #fff; cursor: pointer;
                   width: 28px; height: 28px; display: flex; align-items: center;
                   justify-content: center; border-radius: 0; flex-shrink: 0; }
  #trips-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .trip-card {
    background: var(--bg); border: 2.5px solid var(--border);
    box-shadow: 3px 3px 0 var(--border);
    padding: 12px 14px; font-size: 13px; line-height: 1.5;
  }
  .trip-card .trip-route { font-weight: 700; color: var(--text); margin-bottom: 4px;
                           text-transform: uppercase; font-size: 12px; letter-spacing: .04em; }
  .trip-card .trip-meta { color: var(--dim); font-size: 11px; }
  .trip-card .trip-summary { color: var(--dim); margin-top: 6px; font-size: 12px; }
  .trips-empty { color: var(--dim); font-size: 12px; text-align: center; padding: 32px 16px;
                 text-transform: uppercase; letter-spacing: .06em; }
  #history-btn {
    width: 36px; height: 36px; padding: 0; border: 2.5px solid #fff;
    border-radius: 0; background: transparent; color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  #history-btn:active { background: rgba(255,255,255,.2); }

  /* login */
  #login-screen {
    position: fixed; inset: 0; background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 24px;
  }
  #login-screen.hidden { display: none; }
  .login-box {
    width: 100%; max-width: 340px;
    display: flex; flex-direction: column; gap: 18px;
  }
  .login-box .login-icon {
    width: 52px; height: 52px; background: var(--accent);
    border: 3px solid var(--border); box-shadow: var(--shadow);
    display: flex; align-items: center; justify-content: center;
    color: #fff;
  }
  .login-box h2 { font-size: 28px; font-weight: 900; text-transform: uppercase;
                  letter-spacing: .04em; color: var(--text); line-height: 1; }
  .login-box p { font-size: 13px; color: var(--dim); margin-top: -10px; }
  .login-field { display: flex; flex-direction: column; gap: 6px; }
  .login-field label { font-size: 11px; font-weight: 700; color: var(--text);
                       letter-spacing: .08em; text-transform: uppercase; }
  .login-field input {
    padding: 12px 14px; border: 2.5px solid var(--border);
    background: var(--panel); color: var(--text); font-size: 15px;
    font-family: inherit; outline: none; width: 100%; border-radius: 0;
  }
  .login-field input:focus { border-color: var(--accent); box-shadow: 3px 3px 0 var(--accent); }
  .login-remember {
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: var(--text); cursor: pointer; user-select: none;
    font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  }
  .login-remember input[type=checkbox] { display: none; }
  .login-remember .check-box {
    width: 20px; height: 20px; border: 2.5px solid var(--border); border-radius: 0;
    background: var(--panel); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background .1s;
  }
  .login-remember input:checked + .check-box { background: var(--accent); border-color: var(--accent); }
  .login-remember .check-box svg { display: none; }
  .login-remember input:checked + .check-box svg { display: block; }
  #login-btn {
    width: 100%; padding: 14px; border: 2.5px solid var(--border); border-radius: 0;
    background: var(--accent); color: #fff; font-size: 15px; font-weight: 900;
    font-family: inherit; cursor: pointer; letter-spacing: .08em; text-transform: uppercase;
    box-shadow: var(--shadow);
  }
  #login-btn:active { box-shadow: none; transform: translate(4px,4px); }
  #login-error { font-size: 12px; color: var(--accent); min-height: 16px;
                 font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
</style>
</head>
<body>
<div id="login-screen">
  <div class="login-box">
    <div class="login-icon">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </div>
    <div>
      <h2>Bienvenido</h2>
      <p>Ingresa tu nombre para comenzar</p>
    </div>
    <div class="login-field">
      <label>NOMBRE</label>
      <input id="login-name" type="text" placeholder="Tu nombre" autocomplete="name" maxlength="40">
    </div>
    <label class="login-remember">
      <input type="checkbox" id="remember-me">
      <span class="check-box">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1.5 6 4.5 9 10.5 3"/>
        </svg>
      </span>
      Recuérdame
    </label>
    <div id="login-error"></div>
    <button id="login-btn">Entrar</button>
  </div>
</div>

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
  <h1 style="flex:1">Agente</h1>
  <span id="user-badge" style="font-size:11px;font-weight:700;color:#fff;cursor:pointer;text-transform:uppercase;letter-spacing:.04em;opacity:.85;" title="Cerrar sesión"></span>
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

// --- Login ---
const loginScreen   = document.getElementById("login-screen");
const loginNameInput = document.getElementById("login-name");
const loginBtn      = document.getElementById("login-btn");
const loginError    = document.getElementById("login-error");
const rememberMe    = document.getElementById("remember-me");
const userBadge     = document.getElementById("user-badge");

function getCookie(name) {
  return document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1] ?? null;
}
function setCookie(name, value, days) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = \`\${name}=\${encodeURIComponent(value)};expires=\${exp};path=/;SameSite=Lax\`;
}
function deleteCookie(name) {
  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
}

async function userIdFromName(name) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("").slice(0, 32);
}

let userId = null;
let currentUser = null;

function applySession(name, id) {
  currentUser = name;
  userId = id;
  userBadge.textContent = name + " · salir";
  document.querySelector("#sidebar-header span").textContent = \`Viajes de \${name}\`;
  loginScreen.classList.add("hidden");
}

async function doLogin(name, remember) {
  const id = await userIdFromName(name);
  if (remember) {
    setCookie("userName", name, 30);
    setCookie("userId", id, 30);
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userId");
  } else {
    deleteCookie("userName"); deleteCookie("userId");
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userId", id);
  }
  applySession(name, id);
  box.focus();
}

function doLogout() {
  deleteCookie("userName"); deleteCookie("userId");
  sessionStorage.removeItem("userName"); sessionStorage.removeItem("userId");
  userId = null; currentUser = null;
  userBadge.textContent = "";
  loginNameInput.value = "";
  rememberMe.checked = false;
  loginScreen.classList.remove("hidden");
}

// Restore saved session
const savedName = decodeURIComponent(getCookie("userName") ?? "") || sessionStorage.getItem("userName");
const savedId   = decodeURIComponent(getCookie("userId")   ?? "") || sessionStorage.getItem("userId");
if (savedName && savedId) {
  if (getCookie("userName")) rememberMe.checked = true;
  applySession(savedName, savedId);
}

loginBtn.addEventListener("click", async () => {
  const name = loginNameInput.value.trim();
  if (!name) { loginError.textContent = "Ingresa tu nombre para continuar."; return; }
  loginError.textContent = "";
  await doLogin(name, rememberMe.checked);
});
loginNameInput.addEventListener("keydown", e => { if (e.key === "Enter") loginBtn.click(); });
userBadge.addEventListener("click", doLogout);

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
