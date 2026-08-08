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
</style>
</head>
<body>
<header><h1>Agente</h1></header>
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

// A random ID for this conversation, sent with every message. The browser
// holds only this ticket — where the conversation lives is up to your agent.
const sessionId = crypto.randomUUID();

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
      body: JSON.stringify({ message, sessionId }),
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
