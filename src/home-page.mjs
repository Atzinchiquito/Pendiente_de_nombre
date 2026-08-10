export const HOME_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f2e8ed">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Agente">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon.svg">
<title>Agente CDMX</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700;900&display=swap');
  :root {
    --bg:     #f2e8ed;
    --panel:  #fdf6f9;
    --accent: #e8006e;
    --accent2:#ff2d87;
    --text:   #111111;
    --dim:    #666666;
    --border: #111111;
    --shadow: 4px 4px 0 #111111;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg); color: var(--text);
    font-family: 'Space Grotesk', -apple-system, sans-serif;
    min-height: 100vh; display: flex; flex-direction: column;
  }

  /* ── LOGIN SCREEN ───────────────────────────────────── */
  #login-screen {
    position: fixed; inset: 0; background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    z-index: 300; padding: 32px 24px;
    transition: opacity .25s ease, transform .25s ease;
  }
  #login-screen.leaving {
    opacity: 0; transform: translateY(-18px); pointer-events: none;
  }
  #login-screen.hidden { display: none; }

  .login-box {
    width: 100%; max-width: 360px;
    display: flex; flex-direction: column; gap: 20px;
  }
  .login-logo {
    width: 56px; height: 56px; background: var(--accent);
    border: 3px solid var(--border); box-shadow: var(--shadow);
    display: flex; align-items: center; justify-content: center; color: #fff;
  }
  .login-box h1 {
    font-size: 32px; font-weight: 900; text-transform: uppercase;
    letter-spacing: .03em; line-height: 1;
  }
  .login-box .subtitle {
    font-size: 13px; color: var(--dim); margin-top: -10px;
  }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label {
    font-size: 10px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: var(--text);
  }
  .field input {
    padding: 12px 14px; border: 2.5px solid var(--border);
    background: var(--panel); color: var(--text);
    font-size: 15px; font-family: inherit; outline: none;
    border-radius: 0; box-shadow: 4px 4px 0 var(--border);
    transition: border-color .15s, box-shadow .15s;
  }
  .field input:focus {
    border-color: var(--accent); box-shadow: 4px 4px 0 var(--accent);
  }
  .field input.invalid {
    border-color: var(--accent); box-shadow: 4px 4px 0 #ff9ab9;
  }
  .field-hint {
    font-size: 11px; color: var(--accent); min-height: 15px;
    font-weight: 700; letter-spacing: .04em;
  }

  .remember-row {
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .04em; cursor: pointer; user-select: none;
  }
  .remember-row input[type=checkbox] { display: none; }
  .check-box {
    width: 20px; height: 20px; border: 2.5px solid var(--border);
    background: var(--panel); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .remember-row input:checked + .check-box { background: var(--accent); border-color: var(--accent); }
  .check-box svg { display: none; }
  .remember-row input:checked + .check-box svg { display: block; }

  #login-btn {
    padding: 14px; border: 2.5px solid var(--border); border-radius: 0;
    background: var(--accent); color: #fff; font-size: 15px; font-weight: 900;
    font-family: inherit; cursor: pointer; letter-spacing: .08em;
    text-transform: uppercase; box-shadow: var(--shadow);
    transition: box-shadow .1s, transform .1s;
  }
  #login-btn:active { box-shadow: none; transform: translate(4px,4px); }
  #login-btn:disabled { opacity: .5; cursor: default; }

  /* ── MAIN APP ───────────────────────────────────────── */
  #app { display: none; flex-direction: column; min-height: 100vh; }
  #app.visible { display: flex; }

  header {
    padding: 14px 16px; background: var(--accent);
    border-bottom: 3px solid var(--border);
    display: flex; align-items: center; gap: 12px;
  }
  header h1 {
    font-size: 15px; font-weight: 900; letter-spacing: .07em;
    text-transform: uppercase; color: #fff; flex: 1;
  }
  .hdr-btn {
    width: 36px; height: 36px; border: 2px solid #fff;
    background: transparent; color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; border-radius: 0;
  }
  .hdr-btn:active { background: rgba(255,255,255,.2); }
  #user-badge {
    font-size: 11px; font-weight: 700; color: #fff;
    cursor: pointer; text-transform: uppercase; letter-spacing: .04em;
    opacity: .85; white-space: nowrap;
  }

  /* nav tabs */
  nav {
    display: flex; border-bottom: 3px solid var(--border);
    background: var(--panel);
  }
  .tab {
    flex: 1; padding: 11px 8px; border: none; background: none;
    font-family: inherit; font-size: 11px; font-weight: 700;
    letter-spacing: .07em; text-transform: uppercase; cursor: pointer;
    color: var(--dim); border-right: 2px solid var(--border);
    transition: background .1s, color .1s;
  }
  .tab:last-child { border-right: none; }
  .tab.active { background: var(--accent); color: #fff; }

  /* views */
  .view { display: none; flex: 1; flex-direction: column; }
  .view.active { display: flex; }

  /* ── MODAL ─────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 24px;
  }
  .modal-overlay.hidden { display: none; }
  .modal-box {
    width: 100%; max-width: 340px; background: var(--panel);
    border: 3px solid var(--border); box-shadow: 6px 6px 0 var(--border);
    padding: 24px 20px; display: flex; flex-direction: column; gap: 16px;
  }
  .modal-title {
    font-size: 18px; font-weight: 900; text-transform: uppercase;
    letter-spacing: .05em;
  }
  .modal-actions {
    display: flex; gap: 10px; margin-top: 4px;
  }
  #cambiar-lista {
    display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto;
  }
  .usuario-item {
    padding: 10px 14px; background: none; border: 2px solid transparent;
    font-family: inherit; font-size: 14px; font-weight: 700;
    color: var(--accent); text-align: left; cursor: pointer;
    text-decoration: underline; text-underline-offset: 3px;
    border-radius: 0; transition: background .1s, border-color .1s;
  }
  .usuario-item:hover { background: var(--bg); }
  .usuario-item.selected {
    background: var(--bg); border-color: var(--accent);
    text-decoration: none; color: var(--text);
  }
  .cambiar-empty {
    font-size: 13px; color: var(--dim); padding: 8px 0;
    font-style: italic;
  }

  /* ── USUARIOS FAB + DROPDOWN ───────────────────────── */
  #fab-usuarios {
    position: fixed; bottom: 24px; right: 20px;
    z-index: 100;
  }
  #btn-usuarios {
    padding: 14px 22px; border-radius: 999px;
    background: var(--accent); color: #fff;
    border: 2.5px solid var(--border);
    box-shadow: 4px 4px 0 var(--border);
    font-family: inherit; font-size: 13px; font-weight: 900;
    letter-spacing: .07em; text-transform: uppercase;
    cursor: pointer; display: block; width: 100%;
    transition: box-shadow .1s, transform .1s;
  }
  #btn-usuarios:active { box-shadow: none; transform: translate(4px,4px); }
  #dropdown-usuarios {
    position: absolute; bottom: calc(100% + 8px); right: 0;
    background: var(--panel); border: 2.5px solid var(--border);
    box-shadow: 4px 4px 0 var(--border);
    display: flex; flex-direction: column; min-width: 160px;
    overflow: hidden;
  }
  #dropdown-usuarios.hidden { display: none; }
  .drop-item {
    padding: 12px 16px; background: none; border: none; border-bottom: 1.5px solid var(--border);
    font-family: inherit; font-size: 12px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    color: var(--text); cursor: pointer; text-align: left;
    transition: background .1s;
  }
  .drop-item:last-child { border-bottom: none; }
  .drop-item:hover { background: var(--bg); }

  /* ── HOME VIEW ──────────────────────────────────────── */
  #view-home {
    padding: 20px 16px; gap: 18px; overflow-y: auto;
    background: var(--bg);
  }

  .section-label {
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--dim); margin-bottom: 10px;
  }

  /* próximo viaje */
  .next-trip-card {
    border: 3px solid var(--border); background: var(--panel);
    box-shadow: var(--shadow); padding: 18px 16px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .trip-header {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  }
  .trip-badge {
    font-size: 9px; font-weight: 900; letter-spacing: .1em;
    text-transform: uppercase; background: var(--accent); color: #fff;
    padding: 3px 8px; border: 1.5px solid var(--border); white-space: nowrap;
    flex-shrink: 0;
  }
  .trip-time {
    font-size: 28px; font-weight: 900; line-height: 1; letter-spacing: -.01em;
  }
  .trip-time span { font-size: 13px; font-weight: 400; color: var(--dim); margin-left: 4px; }
  .trip-route-row {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .trip-origin, .trip-dest {
    font-size: 14px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .03em;
  }
  .route-arrow {
    font-size: 18px; color: var(--accent); flex-shrink: 0;
  }
  .trip-pills {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .pill {
    padding: 3px 10px; border: 2px solid var(--border);
    font-size: 11px; font-weight: 700; letter-spacing: .04em;
    text-transform: uppercase; background: var(--bg);
  }
  .pill.metro   { background: #d4006e; color: #fff; border-color: #d4006e; }
  .pill.metrobus{ background: #e85a00; color: #fff; border-color: #e85a00; }
  .pill.walk    { background: #007a3d; color: #fff; border-color: #007a3d; }
  .trip-cta {
    display: flex; gap: 8px;
  }
  .btn-primary {
    flex: 1; padding: 11px 10px; border: 2.5px solid var(--border); border-radius: 0;
    background: var(--accent); color: #fff; font-size: 12px; font-weight: 900;
    font-family: inherit; cursor: pointer; letter-spacing: .07em;
    text-transform: uppercase; box-shadow: 3px 3px 0 var(--border);
    transition: box-shadow .1s, transform .1s;
  }
  .btn-primary:active { box-shadow: none; transform: translate(3px,3px); }
  .btn-secondary {
    flex: 1; padding: 11px 10px; border: 2.5px solid var(--border); border-radius: 0;
    background: var(--panel); color: var(--text); font-size: 12px; font-weight: 900;
    font-family: inherit; cursor: pointer; letter-spacing: .07em;
    text-transform: uppercase; box-shadow: 3px 3px 0 var(--border);
    transition: box-shadow .1s, transform .1s;
  }
  .btn-secondary:active { box-shadow: none; transform: translate(3px,3px); }

  /* empty state card */
  .empty-card {
    border: 3px dashed #bbb; padding: 28px 20px;
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; text-align: center;
  }
  .empty-icon {
    width: 52px; height: 52px; border: 3px solid var(--border);
    background: var(--panel); box-shadow: var(--shadow);
    display: flex; align-items: center; justify-content: center;
  }
  .empty-card p {
    font-size: 13px; color: var(--dim); line-height: 1.5;
    text-transform: uppercase; letter-spacing: .04em;
  }

  /* quick stats */
  .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stat-card {
    border: 2.5px solid var(--border); background: var(--panel);
    box-shadow: 3px 3px 0 var(--border); padding: 14px 12px;
  }
  .stat-number {
    font-size: 28px; font-weight: 900; line-height: 1;
    color: var(--accent);
  }
  .stat-label {
    font-size: 10px; font-weight: 700; color: var(--dim);
    letter-spacing: .08em; text-transform: uppercase; margin-top: 4px;
  }

  /* ── CHAT VIEW ──────────────────────────────────────── */
  #view-chat { flex: 1; display: none; flex-direction: column; overflow: hidden; }
  #view-chat.active { display: flex; }
  #log {
    flex: 1; overflow-y: auto; padding: 16px 16px 10px;
    display: flex; flex-direction: column; gap: 16px; background: var(--bg);
  }
  .msg {
    max-width: 80%; padding: 10px 14px; border: 2.5px solid var(--border);
    line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;
    font-size: 14px; margin-bottom: 4px;
  }
  .user  { align-self: flex-end; background: var(--accent); color: #fff;
           box-shadow: var(--shadow); font-weight: 700; }
  .agent { align-self: flex-start; background: var(--panel); box-shadow: var(--shadow); }
  .tool  { align-self: flex-start; font-size: 11px; color: var(--dim);
           padding: 3px 8px; border: 1.5px dashed #aaa;
           letter-spacing: .04em; text-transform: uppercase; }
  .error { align-self: flex-start; background: #fff0f4; border: 2px solid var(--accent);
           color: var(--accent); font-size: 13px; padding: 6px 10px; }
  .sys   { align-self: center; font-size: 11px; color: var(--dim);
           text-transform: uppercase; letter-spacing: .08em; }

  form#chat-form {
    display: flex; align-items: center; gap: 8px;
    padding: 14px 14px 12px; background: var(--panel);
    border-top: 3px solid var(--border);
  }
  #box {
    flex: 1; padding: 10px 14px; border: 2.5px solid var(--border);
    background: var(--bg); color: var(--text); font-size: 14px;
    font-family: inherit; outline: none; border-radius: 0;
  }
  #box:focus { border-color: var(--accent); box-shadow: 3px 3px 0 var(--accent); }
  #box::placeholder { color: #aaa; }
  .icon-btn {
    width: 42px; height: 42px; padding: 0; border: 2.5px solid var(--border);
    border-radius: 0; cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 3px 3px 0 var(--border);
    transition: box-shadow .1s, transform .1s;
  }
  .icon-btn:active  { box-shadow: none; transform: translate(3px,3px); }
  .icon-btn:disabled{ opacity: .4; cursor: default; box-shadow: none; }
  #send { background: var(--accent); color: #fff; }
  #mic  { background: var(--panel); color: var(--text); }
  #mic.listening { background: var(--accent); color: #fff; animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }
</style>
</head>
<body>

<!-- ── LOGIN ─────────────────────────────────────────── -->
<div id="login-screen">
  <div class="login-box">
    <div class="login-logo">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </div>
    <div>
      <h1 id="auth-title">Bienvenido</h1>
      <p class="subtitle" id="auth-subtitle">Inicia sesión para continuar</p>
    </div>

    <div class="field">
      <label for="login-name">Usuario</label>
      <input id="login-name" type="text" placeholder="Tu nombre" autocomplete="username" maxlength="40">
      <span class="field-hint" id="hint-name"></span>
    </div>

    <div class="field">
      <label for="login-pass">Contraseña</label>
      <input id="login-pass" type="password" placeholder="••••••••" autocomplete="current-password">
      <span class="field-hint" id="hint-pass"></span>
    </div>

    <div class="field" id="field-confirm" style="display:none">
      <label for="login-confirm">Confirmar contraseña</label>
      <input id="login-confirm" type="password" placeholder="••••••••" autocomplete="new-password">
      <span class="field-hint" id="hint-confirm"></span>
    </div>

    <label class="remember-row">
      <input type="checkbox" id="remember-me">
      <span class="check-box">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1.5 6 4.5 9 10.5 3"/>
        </svg>
      </span>
      Recuérdame
    </label>

    <button id="login-btn">Entrar</button>

    <p style="text-align:center;font-size:12px;color:var(--dim)">
      <span id="toggle-text">¿No tienes cuenta?</span>
      <button id="toggle-btn" style="background:none;border:none;font-family:inherit;font-size:12px;font-weight:700;color:var(--accent);cursor:pointer;text-decoration:underline;padding:0;margin-left:4px;">Regístrate</button>
    </p>
  </div>
</div>

<!-- ── APP ───────────────────────────────────────────── -->
<div id="app">
  <header>
    <h1 id="greeting">Agente CDMX</h1>
    <span id="user-badge"></span>
  </header>

  <nav>
    <button class="tab active" data-view="home">Inicio</button>
    <button class="tab"        data-view="chat">Chat</button>
  </nav>

  <!-- HOME VIEW -->
  <div class="view active" id="view-home">

    <p class="section-label">Próximo viaje</p>

    <!-- placeholder: sin viaje agendado -->
    <div class="empty-card" id="no-trip">
      <div class="empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <p>Sin viajes agendados<br>— próximamente —</p>
      <button class="btn-primary" onclick="switchTab('chat')">Planificar viaje</button>
    </div>

    <!-- placeholder: viaje de ejemplo (oculto por defecto, visible cuando haya datos) -->
    <div class="next-trip-card" id="trip-card" style="display:none">
      <div class="trip-header">
        <div>
          <div class="trip-time">08:15 <span>hrs</span></div>
          <div style="font-size:11px;color:var(--dim);font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-top:2px">Lunes 11 ago</div>
        </div>
        <span class="trip-badge">Próximo</span>
      </div>
      <div class="trip-route-row">
        <span class="trip-origin" id="tc-origin">—</span>
        <span class="route-arrow">→</span>
        <span class="trip-dest"   id="tc-dest">—</span>
      </div>
      <div class="trip-pills" id="tc-pills"></div>
      <div class="trip-cta">
        <button class="btn-primary"  onclick="switchTab('chat')">Ver ruta</button>
        <button class="btn-secondary">Editar</button>
      </div>
    </div>

    <!-- stats -->
    <p class="section-label" style="margin-top:4px">Tu actividad</p>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-number" id="stat-trips">—</div>
        <div class="stat-label">Viajes guardados</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">CDMX</div>
        <div class="stat-label">Ciudad activa</div>
      </div>
    </div>

    <div id="fab-usuarios">
      <div id="dropdown-usuarios" class="hidden">
        <button class="drop-item" id="drop-nuevo-usuario">Nuevo Usuario</button>
        <button class="drop-item" id="drop-cambiar-usuario">Cambiar Usuario</button>
      </div>
      <button id="btn-usuarios">Usuarios</button>
    </div>

  </div><!-- /view-home -->

  <!-- MODAL CAMBIAR USUARIO -->
  <div id="modal-cambiar" class="modal-overlay hidden">
    <div class="modal-box">
      <h2 class="modal-title">Cambiar Usuario</h2>
      <div id="cambiar-lista"></div>
      <div class="modal-actions">
        <button id="cambiar-cancelar" class="btn-secondary">Cancelar</button>
        <button id="cambiar-ok" class="btn-primary">Cambiar</button>
      </div>
    </div>
  </div>

  <!-- MODAL NUEVO PERFIL -->
  <div id="modal-perfil" class="modal-overlay hidden">
    <div class="modal-box">
      <h2 class="modal-title">Nuevo Perfil</h2>

      <div class="field">
        <label for="perfil-nombre">Nombre</label>
        <input id="perfil-nombre" type="text" placeholder="Tu nombre completo" maxlength="60">
      </div>

      <div class="field">
        <label for="perfil-edad">Edad</label>
        <input id="perfil-edad" type="number" placeholder="##" min="1" max="120"
               style="width:72px;text-align:center;">
      </div>

      <div class="field">
        <label for="perfil-sexo">Sexo</label>
        <input id="perfil-sexo" type="text" placeholder="Ej. Masculino / Femenino" maxlength="30">
      </div>

      <div class="field">
        <label for="perfil-direccion">Dirección</label>
        <input id="perfil-direccion" type="text" placeholder="Tu dirección habitual" maxlength="120">
      </div>

      <div class="modal-actions">
        <button id="perfil-cancelar" class="btn-secondary">Cancelar</button>
        <button id="perfil-hecho" class="btn-primary">Hecho</button>
      </div>
    </div>
  </div>

  <!-- CHAT VIEW -->
  <div class="view" id="view-chat">
    <div id="log"><div class="sys">Escribe o habla para comenzar</div></div>
    <form id="chat-form">
      <input id="box" placeholder="Escribe algo…" autocomplete="off">
      <button class="icon-btn" id="mic" type="button" title="Hablar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/>
          <line x1="12" y1="19" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/>
        </svg>
      </button>
      <button class="icon-btn" id="send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </form>
  </div><!-- /view-chat -->

</div><!-- /app -->

<script>
"use strict";
/* ── utils ── */
const $ = id => document.getElementById(id);

function getCookie(n) {
  return document.cookie.split("; ").find(r => r.startsWith(n + "="))?.split("=")[1] ?? null;
}
function setCookie(n, v, days) {
  const e = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = n + "=" + encodeURIComponent(v) + ";expires=" + e + ";path=/;SameSite=Lax";
}
function delCookie(n) {
  document.cookie = n + "=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/";
}
async function hashName(name) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("").slice(0,32);
}

/* ── session state ── */
let userId = null, currentUser = null;
const sessionId = crypto.randomUUID();

/* ── login / register logic ── */
const loginScreen   = $("login-screen");
const loginNameEl   = $("login-name");
const loginPassEl   = $("login-pass");
const loginConfirm  = $("login-confirm");
const hintName      = $("hint-name");
const hintPass      = $("hint-pass");
const hintConfirm   = $("hint-confirm");
const rememberEl    = $("remember-me");
const loginBtn      = $("login-btn");
const toggleBtn     = $("toggle-btn");
const toggleText    = $("toggle-text");
const fieldConfirm  = $("field-confirm");
const authTitle     = $("auth-title");
const authSubtitle  = $("auth-subtitle");
const userBadge     = $("user-badge");
const greeting      = $("greeting");

let isRegister = false;

function setMode(register) {
  isRegister = register;
  authTitle.textContent     = register ? "Crear cuenta" : "Bienvenido";
  authSubtitle.textContent  = register ? "Regístrate para comenzar" : "Inicia sesión para continuar";
  loginBtn.textContent      = register ? "Registrarme" : "Entrar";
  loginPassEl.autocomplete  = register ? "new-password" : "current-password";
  fieldConfirm.style.display = register ? "" : "none";
  toggleText.textContent    = register ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?";
  toggleBtn.textContent     = register ? "Inicia sesión" : "Regístrate";
  [hintName, hintPass, hintConfirm].forEach(h => h.textContent = "");
  [loginNameEl, loginPassEl, loginConfirm].forEach(el => el.classList.remove("invalid"));
  loginNameEl.focus();
}

toggleBtn.addEventListener("click", () => setMode(!isRegister));

function applySession(name, id) {
  currentUser = name;
  userId = id;
  userBadge.textContent = name + " · salir";
  greeting.textContent  = "Hola, " + name.split(" ")[0];
  $("app").classList.add("visible");
  loginScreen.classList.add("leaving");
  setTimeout(() => loginScreen.classList.add("hidden"), 260);
  loadStats();
}

function doLogout() {
  delCookie("userName"); delCookie("userId");
  sessionStorage.removeItem("userName"); sessionStorage.removeItem("userId");
  userId = null; currentUser = null;
  userBadge.textContent = "";
  loginNameEl.value = ""; loginPassEl.value = ""; loginConfirm.value = "";
  rememberEl.checked = false;
  $("app").classList.remove("visible");
  loginScreen.classList.remove("hidden", "leaving");
  setMode(false);
}

async function submitAuth() {
  const name = loginNameEl.value.trim();
  const pass = loginPassEl.value;
  const confirm = loginConfirm.value;
  let ok = true;

  if (!name) {
    hintName.textContent = "Ingresa tu nombre de usuario.";
    loginNameEl.classList.add("invalid"); ok = false;
  }
  if (!pass) {
    hintPass.textContent = "Ingresa tu contraseña.";
    loginPassEl.classList.add("invalid"); ok = false;
  } else if (isRegister && pass.length < 6) {
    hintPass.textContent = "Mínimo 6 caracteres.";
    loginPassEl.classList.add("invalid"); ok = false;
  }
  if (isRegister && pass && confirm !== pass) {
    hintConfirm.textContent = "Las contraseñas no coinciden.";
    loginConfirm.classList.add("invalid"); ok = false;
  }
  if (!ok) return;

  loginBtn.disabled = true;
  loginBtn.textContent = isRegister ? "Registrando…" : "Verificando…";

  try {
    const endpoint = isRegister ? "register" : "login";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password: pass }),
    });
    const data = await res.json();

    if (!res.ok) {
      // show error on the most relevant field
      if (res.status === 409 || data.error?.toLowerCase().includes("usuario")) {
        hintName.textContent = data.error;
        loginNameEl.classList.add("invalid");
      } else {
        hintPass.textContent = data.error ?? "Error al autenticar.";
        loginPassEl.classList.add("invalid");
      }
      return;
    }

    const id = data.userId;
    if (rememberEl.checked) {
      setCookie("userName", name, 30); setCookie("userId", id, 30);
      sessionStorage.removeItem("userName"); sessionStorage.removeItem("userId");
    } else {
      delCookie("userName"); delCookie("userId");
      sessionStorage.setItem("userName", name); sessionStorage.setItem("userId", id);
    }
    applySession(name, id);
  } catch {
    hintPass.textContent = "Error de red, intenta de nuevo.";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = isRegister ? "Registrarme" : "Entrar";
  }
}

loginBtn.addEventListener("click", submitAuth);
loginNameEl.addEventListener("input",   () => { hintName.textContent = "";    loginNameEl.classList.remove("invalid"); });
loginPassEl.addEventListener("input",   () => { hintPass.textContent = "";    loginPassEl.classList.remove("invalid"); });
loginConfirm.addEventListener("input",  () => { hintConfirm.textContent = ""; loginConfirm.classList.remove("invalid"); });
loginNameEl.addEventListener("keydown",  e => { if (e.key === "Enter") loginPassEl.focus(); });
loginPassEl.addEventListener("keydown",  e => { if (e.key === "Enter") isRegister ? loginConfirm.focus() : submitAuth(); });
loginConfirm.addEventListener("keydown", e => { if (e.key === "Enter") submitAuth(); });
userBadge.addEventListener("click", doLogout);

/* ── fab usuarios + dropdown ── */
const modalPerfil    = $("modal-perfil");
const dropdown       = $("dropdown-usuarios");

$("btn-usuarios").addEventListener("click", e => {
  e.stopPropagation();
  dropdown.classList.toggle("hidden");
});
document.addEventListener("click", () => dropdown.classList.add("hidden"));

$("drop-nuevo-usuario").addEventListener("click", () => {
  dropdown.classList.add("hidden");
  modalPerfil.classList.remove("hidden");
  $("perfil-nombre").focus();
});
$("drop-cambiar-usuario").addEventListener("click", async () => {
  dropdown.classList.add("hidden");
  const lista = $("cambiar-lista");
  lista.innerHTML = "";
  let selectedId = null;

  let perfiles = [];
  try {
    const res = await fetch("profiles");
    perfiles = await res.json();
  } catch { /* ignorar */ }

  if (!perfiles.length) {
    const p = document.createElement("p");
    p.className = "cambiar-empty";
    p.textContent = "Aún no hay registros.";
    lista.appendChild(p);
  } else {
    perfiles.forEach(({ user_id, nombre }) => {
      const btn = document.createElement("button");
      btn.className = "usuario-item";
      btn.textContent = nombre || user_id;
      btn.addEventListener("click", () => {
        lista.querySelectorAll(".usuario-item").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedId = user_id;
      });
      lista.appendChild(btn);
    });
  }

  $("modal-cambiar").classList.remove("hidden");
});

$("cambiar-cancelar").addEventListener("click", () => $("modal-cambiar").classList.add("hidden"));
$("cambiar-ok").addEventListener("click", () => $("modal-cambiar").classList.add("hidden"));
$("modal-cambiar").addEventListener("click", e => { if (e.target === $("modal-cambiar")) $("modal-cambiar").classList.add("hidden"); });

$("perfil-cancelar").addEventListener("click", () => modalPerfil.classList.add("hidden"));
$("perfil-hecho").addEventListener("click", () => modalPerfil.classList.add("hidden"));
modalPerfil.addEventListener("click", e => { if (e.target === modalPerfil) modalPerfil.classList.add("hidden"); });

// restore session
const savedName = decodeURIComponent(getCookie("userName") ?? "") || sessionStorage.getItem("userName");
const savedId   = decodeURIComponent(getCookie("userId")   ?? "") || sessionStorage.getItem("userId");
if (savedName && savedId) {
  if (getCookie("userName")) rememberEl.checked = true;
  applySession(savedName, savedId);
}

/* ── chat ── */
const logEl = $("log"), boxEl = $("box"), sendEl = $("send");

function addMsg(cls, text) {
  const d = document.createElement("div");
  d.className = "msg " + cls;
  d.textContent = text;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
  return d;
}

/* ── stats ── */
async function loadStats() {
  if (!userId) return;
  try {
    const res = await fetch("trips?userId=" + encodeURIComponent(userId));
    const trips = await res.json();
    $("stat-trips").textContent = trips.length || "0";
  } catch { /* ignore */ }
}

/* ── tabs ── */
let chatGreeted = false;

async function showChatGreeting() {
  if (chatGreeted) return;
  chatGreeted = true;
  logEl.innerHTML = "";
  let nombre = "N/A";
  try {
    const res = await fetch("profile?userId=" + encodeURIComponent(userId ?? ""));
    const data = await res.json();
    if (data.nombre) nombre = data.nombre;
  } catch { /* sin perfil */ }
  addMsg("agent", "Usuario: " + nombre + "\\n¿A dónde iremos hoy?");
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach(t =>
    t.classList.toggle("active", t.dataset.view === name));
  document.querySelectorAll(".view").forEach(v =>
    v.classList.toggle("active", v.id === "view-" + name));
  if (name === "chat") { showChatGreeting(); $("box").focus(); }
}
document.querySelectorAll(".tab").forEach(t =>
  t.addEventListener("click", () => switchTab(t.dataset.view)));

async function ask(message) {
  sendEl.disabled = true;
  let current = null;
  try {
    const res = await fetch("chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId, userId }),
    });
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\\n"); buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const m = JSON.parse(line);
        if (m.type === "token") {
          if (!current) current = addMsg("agent", "");
          current.textContent += m.text;
          logEl.scrollTop = logEl.scrollHeight;
        } else if (m.type === "tool") {
          current = null; addMsg("tool", "🔧 " + m.name);
        } else if (m.type === "error") {
          current = null; addMsg("error", "⚠ " + m.text);
        }
      }
    }
  } catch (err) { addMsg("error", "⚠ " + err.message); }
  sendEl.disabled = false; boxEl.focus();
}

$("chat-form").addEventListener("submit", e => {
  e.preventDefault();
  const text = boxEl.value.trim();
  if (!text || sendEl.disabled) return;
  addMsg("user", text); boxEl.value = "";
  ask(text);
});

/* ── mic ── */
const micEl = $("mic");
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  micEl.style.display = "none";
} else {
  const rec = new SR();
  rec.lang = "es-MX"; rec.interimResults = true; rec.continuous = false;
  let final = "";
  rec.onstart  = () => { micEl.classList.add("listening"); final = ""; };
  rec.onend    = () => {
    micEl.classList.remove("listening");
    if (final.trim()) { boxEl.value = final.trim(); boxEl.dispatchEvent(new Event("input")); }
  };
  rec.onresult = e => {
    let interim = "";
    for (const r of e.results) { if (r.isFinal) final += r[0].transcript; else interim = r[0].transcript; }
    boxEl.value = final + interim;
  };
  rec.onerror = e => { if (e.error !== "aborted") addMsg("error", "⚠ Micrófono: " + e.error); };
  micEl.addEventListener("click", () => { mic.classList.contains("listening") ? rec.stop() : rec.start(); });
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
</script>
</body>
</html>`;
