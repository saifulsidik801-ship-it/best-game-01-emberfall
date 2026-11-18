// EMBERFALL: Relight the Dawn — bootstrap + main loop.
// Canvas 960x600, fixed timestep-ish loop, screen dispatch, keyboard
// shortcuts, click routing, and the ?shot= staging hook for screenshots.
import { VIEW_W, VIEW_H } from './config.js';
import { input } from './input.js';
import { createGame, tick, newRun, nextRealmFromMap, lightBeacon, restartRun, quitToTitle } from './state.js';
import { drawGame } from './render.js';
import { drawHUD } from './hud.js';
import {
  drawTitle, drawMap, drawShop, drawRelic, drawAlmanac, drawOptions,
  drawPause, drawBeacon, drawBeaconLit, drawWin, drawLose,
  handleClick, clearButtons,
} from './screens.js';
import { applyShot } from './shots.js';
import { audio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = createGame();
game.input = input;
game.ctx = ctx;
window.__emberfall = game;
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));

input.attach(canvas);

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');
let shotStaged = false;
let shotFrames = 0;
let shotReady = false;

if (shotMode) {
  try { applyShot(game, shotMode); } catch (e) { window.__errors.push('shot: ' + String(e.message)); }
  shotStaged = true;
}

const statusEl = document.getElementById('status');
function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

// Keyboard shortcuts per screen.
function keyRouter() {
  const s = game.screen;
  if (s === 'title' && input.wasPressed('Enter')) { newRun(game, game.difficulty, false); return; }
  if (s === 'map' && input.wasPressed('Enter')) { nextRealmFromMap(game); return; }
  if (s === 'shop' && input.wasPressed('Enter')) { nextRealmFromMap(game); return; }
  if (s === 'beacon' && input.wasPressed('Enter')) { lightBeacon(game); return; }
  if ((s === 'win' || s === 'lose') && input.wasPressed('Enter')) { restartRun(game); return; }
  if (s === 'pause' && (input.wasPressed('Escape') || input.wasPressed('KeyP'))) { game.screen = 'play'; return; }
  if (s === 'play' && (input.wasPressed('Escape') || input.wasPressed('KeyP'))) { game.pausedFrom = 'play'; game.screen = 'pause'; audio.sfx('click'); return; }
  if ((s === 'almanac' || s === 'options') && input.wasPressed('Escape')) { game.screen = game.returnTo || 'title'; return; }
  if (s === 'title' && input.wasPressed('KeyJ')) { game.returnTo = 'title'; game.screen = 'almanac'; return; }
  if (input.wasPressed('KeyM') && s !== 'play') {
    game.options.muted = !game.options.muted;
    audio.setMuted(game.options.muted);
  }
}

function render() {
  clearButtons();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const s = game.screen;
  if (s === 'play') {
    drawGame(ctx, game);
    drawHUD(ctx, game);
    setStatus(`Playing ${game.realm.def.name}. Shards ${game.run.shards}/5. HP ${Math.ceil(game.realm.player.hp)}, oil ${Math.floor(game.realm.player.oil)}.`);
  } else if (s === 'pause') {
    drawGame(ctx, game);
    drawHUD(ctx, game);
    drawPause(ctx, game);
  } else if (s === 'title') drawTitle(ctx, game);
  else if (s === 'map') drawMap(ctx, game);
  else if (s === 'shop') drawShop(ctx, game);
  else if (s === 'relic') drawRelic(ctx, game);
  else if (s === 'almanac') drawAlmanac(ctx, game);
  else if (s === 'options') drawOptions(ctx, game);
  else if (s === 'beacon') drawBeacon(ctx, game);
  else if (s === 'beacon-lit') drawBeaconLit(ctx, game);
  else if (s === 'win') drawWin(ctx, game);
  else if (s === 'lose') drawLose(ctx, game);
  else drawTitle(ctx, game);
}

let last = performance.now();
let fpsAcc = 0, fpsN = 0, fpsT = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) dt = 0.001;
  fpsAcc += 1 / dt; fpsN++; fpsT += dt;
  if (fpsT >= 0.5) { game.fps = Math.round(fpsAcc / fpsN); fpsAcc = 0; fpsN = 0; fpsT = 0; }

  // Menu clicks (play screen uses the mouse for the beam, not buttons).
  if (input.mouse.clicked && game.screen !== 'play') {
    handleClick(game, input.mouse.x, input.mouse.y);
  }
  keyRouter();

  if (shotMode) {
    // Deterministic staging: run a fixed number of ticks, then freeze so
    // the screenshot is stable and its HUD numbers stay exactly as staged.
    if (shotFrames < 40) {
      tick(game, 1 / 60);
      shotFrames++;
    }
    render();
    if (shotFrames >= 40 && !shotReady) {
      shotReady = true;
      window.__shotReady = true;
    }
  } else {
    // The relic screen rolls its 3 choices lazily in drawRelic.
    tick(game, dt);
    render();
  }
  input.beginFrame();
}

requestAnimationFrame(frame);
