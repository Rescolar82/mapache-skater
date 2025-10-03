import { mountGame, destroyGame, mobile, toggleFullscreen, onResize } from './game.js';
const app = document.getElementById('app');
let fsHandler = null;

const views = {
  home: () => `
    <section class="panel twocol slide-enter">
      <div>
        <h2>Bienvenido</h2>
        <p class="muted">Runs rápidas, FURIA, misiones y highlights virales.</p>
        <div class="row" style="margin:8px 0 12px">
          <a class="btn" href="#/run">Jugar</a>
          <a class="btn" href="#/daily">Modo Diario</a>
          <a class="btn" href="#/store">Tienda</a>
          <a class="btn" href="#/board">Clasificación</a>
        </div>
        <div class="grid">
          <div class="card"><img src="assets/background.png"><div class="p"><b>Novedad:</b> FURIA en cámara lenta.</div></div>
          <div class="card"><img src="assets/cat.png"><div class="p"><b>Stomp al gato</b> — Rebota y sube combo.</div></div>
          <div class="card"><img src="assets/nes.png"><div class="p"><b>NES cayendo</b> — 'thud' y partículas.</div></div>
        </div>
      </div>
      <aside>
        <div class="panel"><b>Misiones rápidas</b><ul>
          <li>⬜ Pisa 1 gato — <span class="kv">+200</span></li>
          <li>⬜ Toma 8 ⭐ — <span class="kv">+220</span></li>
          <li>⬜ Alcanza x2.0 — <span class="kv">+200</span></li>
        </ul></div>
        <div class="panel"><b>Evento de hoy</b><p class="muted">Día Dorado — ⭐ x2</p></div>
      </aside>
    </section>
  `,
  run: () => `
    <section class="panel slide-enter">
      <h2>Juego</h2>
      <div class="canvas-wrap">
        <canvas id="game" width="720" height="480"></canvas>
        <div class="hud">
          <div id="hud-left">Puntos: 0</div>
          <div id="hud-mid">x1.0</div>
          <div id="hud-right">❤️❤️❤️</div>
        </div>
        <div class="furia"><b id="furia-bar" style="width:0%"></b></div>

        <!-- Controles táctiles -->
        <div id="mobileControls">
          <div class="ctrl-col">
            <button class="ctrl" id="btnLeft">←</button>
            <button class="ctrl" id="btnRight">→</button>
          </div>
          <div class="ctrl-col">
            <button class="ctrl" id="btnJump">Saltar</button>
            <button class="ctrl" id="btnDash">Dash</button>
          </div>
        </div>
      </div>
      <div class="row" style="margin-top:8px">
        <button id="btnStart" class="btn">Empezar</button>
        <button id="btnPause" class="btn red">Pausar</button>
        <button id="btnFull"  class="btn">Pantalla completa</button>
        <span class="muted">← → mueve, Espacio salta, Shift dash.</span>
      </div>
    </section>
  `,
  daily: () => `
    <section class="panel slide-enter">
      <h2>Modo Diario</h2>
      <div class="row" style="margin-bottom:8px">
        <span class="kv">Evento: Dorado — Muchas ⭐</span>
        <span class="kv">Termina en: 18:23:12</span>
      </div>
      <div class="grid">
        <div class="card"><img src="assets/star.png"><div class="p">
          <b>Reglas del día</b>
          <ul class="muted"><li>⭐ x2 de spawn</li><li>Sin paraguas</li><li>Viento suave</li></ul>
          <a class="btn" href="#/run?daily=1">Jugar Diario</a>
        </div></div>
        <div class="card"><img src="assets/raccoon.png"><div class="p"><b>Tu puesto</b><br><span class="muted">#23 hoy — 12,430 pts</span></div></div>
      </div>
    </section>
  `,
  store: () => `
    <section class="panel slide-enter">
      <h2>Tienda</h2>
      <div class="grid">
        <div class="card"><img src="assets/raccoon.png"><div class="p"><b>Skin: Ninja</b><br><span class="muted">$1.99</span><br><br><button class="btn">Comprar</button></div></div>
        <div class="card"><img src="assets/star.png"><div class="p"><b>FX Estela: Fuego</b><br><span class="muted">$2.99</span><br><br><button class="btn">Comprar</button></div></div>
        <div class="card"><img src="assets/nes.png"><div class="p"><b>Tabla: Neon</b><br><span class="muted">$0.99</span><br><br><button class="btn">Comprar</button></div></div>
        <div class="card"><img src="assets/cat.png"><div class="p"><b>Pack Remove Ads</b><br><span class="muted">$3.99 · +2 skins + 500⭐</span><br><br><button class="btn">Comprar</button></div></div>
      </div>
    </section>
  `,
  board: () => `
    <section class="panel slide-enter">
      <h2>Clasificación</h2>
      <div class="panel">
        <div class="row"><span class="kv">Global</span><span class="kv">Diario</span><span class="kv">Amigos</span></div>
        <ol>
          <li>#1 — <b>23,940</b> — <span class="muted">N3stor</span></li>
          <li>#2 — <b>19,870</b> — <span class="muted">Karla</span></li>
          <li>#3 — <b>18,210</b> — <span class="muted">Ro</span></li>
        </ol>
      </div>
    </section>
  `,
  custom: () => `
    <section class="panel slide-enter">
      <h2>Personalizar</h2>
      <div class="twocol">
        <div class="panel"><b>Preview</b>
          <div class="canvas-wrap" style="max-width:560px"><img src="assets/raccoon.png" alt=""></div>
        </div>
        <div class="panel"><b>Tu inventario</b>
          <div class="grid">
            <div class="card"><img src="assets/raccoon.png"><div class="p"><b>Skin básica</b><br><button class="btn">Equipar</button></div></div>
            <div class="card"><img src="assets/star.png"><div class="p"><b>FX: Confetti</b><br><button class="btn">Equipar</button></div></div>
            <div class="card"><img src="assets/nes.png"><div class="p"><b>Tabla: Rayo</b><br><button class="btn">Equipar</button></div></div>
          </div>
        </div>
      </div>
    </section>
  `,
  settings: () => `
    <section class="panel slide-enter">
      <h2>Ajustes</h2>
      <div class="grid">
        <div class="card"><div class="p"><b>Audio</b><div class="row"><span class="kv">SFX <input type="range"></span><span class="kv">BGM <input type="range"></span></div></div></div>
        <div class="card"><div class="p"><b>Accesibilidad</b><br><label><input type="checkbox"> Reducir movimiento</label><br><label><input type="checkbox"> Alto contraste</label></div></div>
        <div class="card"><div class="p"><b>Controles</b><br><label><input type="checkbox"> Modo zurdo</label><br><label><input type="checkbox"> Vibración</label></div></div>
      </div>
    </section>
  `,
  news: () => `
    <section class="panel slide-enter">
      <h2>Noticias & Eventos</h2>
      <div class="grid">
        <div class="card"><img src="assets/background.png"><div class="p"><b>Semana Explosiva</b><br><span class="muted">Más fosforitos + jefe NES el sábado.</span></div></div>
        <div class="card"><img src="assets/cat.png"><div class="p"><b>Reto comunitario</b><br><span class="muted">Alcanza 100M ⭐ globales para skin gratis.</span></div></div>
      </div>
    </section>
  `
};

function setActive(tabId){
  document.querySelectorAll('.tab').forEach(a=>a.classList.toggle('active', a.dataset.to===tabId));
}

function bindMobileControls(){
  const L = document.getElementById('btnLeft');
  const R = document.getElementById('btnRight');
  const J = document.getElementById('btnJump');
  const D = document.getElementById('btnDash');
  function press(el, down, up){
    if(!el) return;
    const d = (e)=>{ e.preventDefault(); down(); };
    const u = (e)=>{ e.preventDefault(); up();   };
    el.addEventListener('pointerdown', d);
    el.addEventListener('pointerup', u);
    el.addEventListener('pointerleave', u);
    el.addEventListener('pointercancel', u);
  }
  press(L, ()=>mobile.left(true),  ()=>mobile.left(false));
  press(R, ()=>mobile.right(true), ()=>mobile.right(false));
  press(J, ()=>mobile.jump(),      ()=>{});
  press(D, ()=>mobile.dash(true),  ()=>mobile.dash(false));

  const mc = document.getElementById('mobileControls');
  const cvs = document.getElementById('game');
  if (mc) mc.style.touchAction = 'none';
  if (cvs) cvs.style.touchAction = 'none';
}

function render(){
  const hash = location.hash.replace('#/','') || 'home';
  setActive(hash);
  const html = (views[hash] || views.home)();
  app.innerHTML = html;

  if (hash === 'run'){
    const canvas = document.getElementById('game');
    const hud = {
      left: document.getElementById('hud-left'),
      mid:  document.getElementById('hud-mid'),
      right:document.getElementById('hud-right'),
      furia:document.getElementById('furia-bar'),
      btnStart: document.getElementById('btnStart'),
      btnPause: document.getElementById('btnPause'),
    };
    mountGame(canvas, hud);
    bindMobileControls();

    document.body.classList.add('playing');

    // Fullscreen + auto-resize
    const wrap = document.querySelector('.canvas-wrap');
    const btnFull = document.getElementById('btnFull');
    btnFull?.addEventListener('click', ()=> toggleFullscreen(wrap));
    const doResize = ()=> onResize(wrap);
    window.addEventListener('resize', doResize, { passive:true });

    fsHandler = ()=> {
      const inFS = !!document.fullscreenElement;
      document.body.classList.toggle('immersive', inFS);
      doResize();
    };
    document.addEventListener('fullscreenchange', fsHandler);

  } else {
    destroyGame();
    document.body.classList.remove('playing','immersive');
    if (fsHandler){ document.removeEventListener('fullscreenchange', fsHandler); fsHandler=null; }
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('load', render);

// PWA install prompt
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; });
document.addEventListener('click', async (e)=>{
  if (e.target && e.target.id==='btnInstall' && deferredPrompt){
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
  }
});
