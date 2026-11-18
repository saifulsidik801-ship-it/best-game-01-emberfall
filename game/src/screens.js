// All menu screens: title, world map, lantern shop, relic choice, almanac,
// options, pause, beacon, win and lose. Buttons are registered while a
// screen draws; handleClick dispatches by button id. Every screen states
// the goal, the rules and the numbers — no hidden state.
import { VIEW_W, VIEW_H, PAL, DIFFS, DIFF_ORDER } from './config.js';
import { REALMS, BEACON } from './realms.js';
import { UPGRADES } from './upgrades.js';
import { BESTIARY } from './bestiary.js';
import { FEATS } from './feats.js';
import { fmtNum, fmtTime } from './random.js';
import { relicById } from './relics.js';
import { audio } from './audio.js';
import {
  newRun, startRealm, nextRealmFromMap, buyUpgrade, chooseRelic,
  lightBeacon, winRun, restartRun, quitToTitle, continueSaved,
  toggleMute, toggleMusic, rollRelicChoice,
} from './state.js';

let buttons = [];
export function clearButtons() { buttons = []; }

function btn(state, id, x, y, w, h, label, opts = {}) {
  const m = state.input.mouse;
  const hover = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  buttons.push({ id, x, y, w, h });
  const ctx = state.ctx;
  ctx.fillStyle = opts.disabled ? '#241a30' : hover ? '#3a2a52' : (opts.accent ? '#4a2c14' : '#221631');
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = opts.accent ? PAL.gold : hover ? PAL.gold : PAL.line;
  ctx.lineWidth = opts.accent ? 2 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = opts.disabled ? PAL.dim : '#f5e9d0';
  ctx.font = (opts.big ? 'bold 16px' : 'bold 14px') + ' sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);
  ctx.textAlign = 'left';
  return hover;
}

function panel(ctx, x, y, w, h, accent) {
  ctx.fillStyle = 'rgba(11,7,16,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || PAL.line;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function titleBg(ctx, state) {
  // Night sky, rising embers, a distant beacon glow.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#0b0710'); g.addColorStop(0.7, '#1c1024'); g.addColorStop(1, '#2b1710');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const t = state.time;
  for (let i = 0; i < 46; i++) {
    const x = (i * 137.5 + Math.sin(t * 0.3 + i) * 30) % VIEW_W;
    const y = VIEW_H - ((t * (18 + (i % 5) * 7) + i * 91) % (VIEW_H + 40)) + 20;
    ctx.globalAlpha = 0.25 + (i % 4) * 0.15;
    ctx.fillStyle = i % 3 === 0 ? '#ffd166' : '#ff7a2f';
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Beacon glow on the horizon.
  const bg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H - 40, 4, VIEW_W / 2, VIEW_H - 40, 260);
  bg.addColorStop(0, 'rgba(255,190,80,0.35)');
  bg.addColorStop(1, 'rgba(255,190,80,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function header(ctx, title, sub, accent) {
  ctx.fillStyle = accent || PAL.gold;
  ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, 108);
  ctx.fillStyle = PAL.cream; ctx.font = '15px sans-serif';
  ctx.fillText(sub, VIEW_W / 2, 134);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, state) {
  titleBg(ctx, state);
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.gold; ctx.font = 'bold 15px sans-serif';
  ctx.fillText('✦  A LANTERN ADVENTURE  ✦', VIEW_W / 2, 52);
  header(ctx, 'EMBERFALL', 'Relight the Dawn', PAL.gold);
  ctx.fillStyle = PAL.cream; ctx.font = '14px sans-serif';
  ctx.fillText('Your lantern is your weapon AND your fuel — spend light to make light.', VIEW_W / 2, 158);
  ctx.fillText('Gather 5 Ember Shards across 5 realms, then relight the Great Beacon.', VIEW_W / 2, 178);
  ctx.textAlign = 'left';
  // Difficulty selector.
  ctx.fillStyle = PAL.dim; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('DIFFICULTY', 300, 214);
  DIFF_ORDER.forEach((id, i) => {
    const d = DIFFS[id];
    const x = 300 + i * 122, y = 224;
    const sel = state.difficulty === id;
    ctx.fillStyle = sel ? '#4a2c14' : '#221631';
    ctx.fillRect(x, y, 112, 52);
    ctx.strokeStyle = sel ? PAL.gold : PAL.line; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, 111, 51);
    ctx.fillStyle = sel ? '#ffd166' : PAL.cream; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(d.name, x + 56, y + 21);
    ctx.fillStyle = PAL.dim; ctx.font = '11px sans-serif';
    ctx.fillText(d.tag, x + 56, y + 39);
    ctx.textAlign = 'left';
    buttons.push({ id: 'diff:' + id, x, y, w: 112, h: 52 });
  });
  // Main menu.
  const canContinue = !!state.savedRun;
  btn(state, 'new', 300, 292, 360, 44, '▶  NEW RUN', { accent: true, big: true });
  btn(state, 'continue', 300, 344, 360, 44, canContinue ? '↻  CONTINUE SAVED RUN' : '↻  CONTINUE — no saved run', { disabled: !canContinue, big: true });
  btn(state, 'endless', 300, 396, 360, 44, '∞  ENDLESS — cycle the realms, chase score', { big: false });
  btn(state, 'almanac', 300, 448, 174, 40, '📖  ALMANAC');
  btn(state, 'options', 486, 448, 174, 40, '⚙  OPTIONS');
  // Run history panel.
  panel(ctx, 700, 292, 230, 196);
  ctx.fillStyle = PAL.gold; ctx.font = 'bold 13px sans-serif';
  ctx.fillText('RUN HISTORY', 714, 316);
  ctx.fillStyle = PAL.dim; ctx.font = '11px sans-serif';
  if (!state.history.length) {
    ctx.fillText('No finished runs yet.', 714, 340);
    ctx.fillText('Your runs will be listed here.', 714, 358);
  } else {
    state.history.slice(0, 8).forEach((h, i) => {
      ctx.fillStyle = h.result === 'WIN' ? '#7ee787' : PAL.cream;
      ctx.fillText(`${h.result}  ${fmtNum(h.score)} pts  •  ${h.shards}/5 shards  •  ${h.time}`, 714, 340 + i * 17);
    });
  }
  ctx.fillStyle = PAL.dim; ctx.font = '11px sans-serif';
  ctx.fillText('WASD move • Mouse aim • Hold LMB/Space: beam', 300, 520);
  ctx.fillText('Beam drains oil. Kills, braziers and flasks refill it. Oil 0 = the dark wins.', 300, 538);
  ctx.fillText('J: almanac in-game • P: pause • M: mute', 300, 556);
}

export function drawMap(ctx, state) {
  titleBg(ctx, state);
  header(ctx, 'THE WORLD MAP', 'Five realms stand between the night and the dawn.', PAL.gold);
  const run = state.run;
  ctx.fillStyle = PAL.cream; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`Shards ${run.shards}/5   •   ◆ ${fmtNum(run.embers)} embers   •   Score ${fmtNum(run.score)}   •   ${run.kills} kills   •   ${fmtTime(run.time)}`, VIEW_W / 2, 158);
  ctx.textAlign = 'left';
  // Winding path of realm nodes.
  const nodes = [
    { x: 130, y: 300 }, { x: 300, y: 220 }, { x: 480, y: 300 },
    { x: 650, y: 220 }, { x: 800, y: 300 },
  ];
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 3;
  ctx.beginPath();
  nodes.forEach((n, i) => { if (i === 0) ctx.moveTo(n.x, n.y); else ctx.lineTo(n.x, n.y); });
  ctx.lineTo(880, 420); ctx.stroke();
  REALMS.forEach((realm, i) => {
    const n = nodes[i];
    const cleared = !!run.realmCleared[realm.id];
    const current = run.shards === i;
    const locked = run.shards < i;
    ctx.fillStyle = cleared ? '#2b4a2b' : current ? '#4a2c14' : '#1c1426';
    ctx.beginPath(); ctx.arc(n.x, n.y, 44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cleared ? '#7ee787' : current ? PAL.gold : PAL.line;
    ctx.lineWidth = current ? 3 : 2;
    ctx.beginPath(); ctx.arc(n.x, n.y, 44, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = cleared ? '#7ee787' : current ? '#ffd166' : PAL.dim;
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(cleared ? '✓ SHARD' : locked ? 'LOCKED' : `REALM ${['I', 'II', 'III', 'IV', 'V'][i]}`, n.x, n.y - 52);
    ctx.fillStyle = PAL.cream; ctx.font = 'bold 14px sans-serif';
    ctx.fillText(realm.name, n.x, n.y + 62);
    ctx.fillStyle = PAL.dim; ctx.font = '11px sans-serif';
    ctx.fillText(realm.sub, n.x, n.y + 78);
    ctx.textAlign = 'left';
    if (current) buttons.push({ id: 'enter-realm', x: n.x - 44, y: n.y - 44, w: 88, h: 88 });
  });
  // Beacon node.
  ctx.fillStyle = run.shards >= 5 ? '#4a2c14' : '#1c1426';
  ctx.beginPath(); ctx.arc(880, 420, 40, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = run.shards >= 5 ? PAL.gold : PAL.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(880, 420, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = PAL.gold; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('BEACON', 880, 366);
  ctx.fillText(run.shards >= 5 ? 'READY ◆' : `${run.shards}/5`, 880, 470);
  ctx.textAlign = 'left';
  if (run.shards >= 5) buttons.push({ id: 'beacon', x: 840, y: 380, w: 80, h: 80 });
  // Current realm flavor.
  const cur = REALMS[Math.min(run.shards, 4)];
  panel(ctx, 130, 470, 700, 70, cur.accent);
  ctx.fillStyle = cur.accent; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`Next: ${cur.name} — ${cur.sub}`, 146, 494);
  ctx.fillStyle = PAL.cream; ctx.font = '12px sans-serif';
  ctx.fillText(cur.flavor, 146, 514);
  ctx.fillStyle = PAL.dim;
  ctx.fillText(`Twist: ${cur.twist}`, 146, 530);
  btn(state, 'enter-realm', 300, 548, 180, 40, run.shards >= 5 ? '◆ GO TO BEACON' : `▶ ENTER ${cur.name.toUpperCase()}`, { accent: true });
  btn(state, 'shop', 492, 548, 180, 40, '⚱ UPGRADE LANTERN');
  btn(state, 'title', 684, 548, 120, 40, 'TITLE');
}

export function drawShop(ctx, state) {
  titleBg(ctx, state);
  header(ctx, 'LANTERN WORKSHOP', 'Spend embers. A brighter lantern is a longer life.', PAL.gold);
  const run = state.run;
  ctx.fillStyle = PAL.cream; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`◆ ${fmtNum(run.embers)} embers   •   Shards ${run.shards}/5   •   Score ${fmtNum(run.score)}`, VIEW_W / 2, 152);
  ctx.textAlign = 'left';
  UPGRADES.forEach((u, i) => {
    const y = 176 + i * 62;
    const lvl = run.upgrades[u.id] || 0;
    const maxed = lvl >= u.max;
    const cost = maxed ? 0 : u.cost(lvl);
    panel(ctx, 130, y, 700, 52, lvl > 0 ? PAL.gold : PAL.line);
    ctx.fillStyle = '#ffd166'; ctx.font = '20px sans-serif';
    ctx.fillText(u.icon, 146, y + 34);
    ctx.fillStyle = PAL.cream; ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${u.name}`, 178, y + 22);
    ctx.fillStyle = PAL.dim; ctx.font = '12px sans-serif';
    ctx.fillText(u.desc, 178, y + 40);
    // Rank pips.
    for (let p = 0; p < u.max; p++) {
      ctx.fillStyle = p < lvl ? '#ffd166' : 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(640 + p * 20, y + 26, 6, 0, Math.PI * 2); ctx.fill();
    }
    btn(state, 'buy:' + u.id, 736, y + 8, 82, 36, maxed ? 'MAX' : `◆ ${cost}`, { disabled: maxed || run.embers < cost });
  });
  // Owned relics strip.
  ctx.fillStyle = PAL.dim; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('RELICS OWNED', 130, 512);
  ctx.fillStyle = PAL.cream; ctx.font = '13px sans-serif';
  const names = run.relics.map((id) => {
    const r = relicById(id);
    return r ? r.name : id;
  });
  ctx.fillText(run.relics.length ? names.join('  •  ') : 'None yet — defeat a boss to choose one.', 130, 532);
  if (state.shopNote) {
    ctx.fillStyle = '#ffd166'; ctx.font = '13px sans-serif';
    ctx.fillText(state.shopNote, 130, 556);
  }
  btn(state, 'enter-realm', 300, 560, 180, 40, run.shards >= 5 ? '◆ GO TO BEACON' : '▶ ENTER NEXT REALM', { accent: true });
  btn(state, 'map', 492, 560, 180, 40, 'WORLD MAP');
}

export function drawRelic(ctx, state) {
  titleBg(ctx, state);
  header(ctx, 'THE SHARD CHOOSES', 'A boss has fallen. Take one relic — its light is yours now.', PAL.gold);
  if (!state.relicChoice || !state.relicChoice.length) rollRelicChoice(state);
  state.relicChoice.forEach((r, i) => {
    const x = 130 + i * 240, y = 190;
    panel(ctx, x, y, 220, 260, PAL.gold);
    ctx.fillStyle = '#ffd166'; ctx.font = '44px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(r.icon, x + 110, y + 70);
    ctx.fillStyle = PAL.cream; ctx.font = 'bold 18px sans-serif';
    ctx.fillText(r.name, x + 110, y + 110);
    ctx.fillStyle = PAL.dim; ctx.font = '13px sans-serif';
    wrapText(ctx, r.desc, x + 110, y + 140, 190, 18);
    ctx.textAlign = 'left';
    btn(state, 'relic:' + i, x + 20, y + 200, 180, 40, 'TAKE THIS RELIC', { accent: true });
  });
  ctx.fillStyle = PAL.dim; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Relics are permanent for this run. Choose wisely — the next realm is darker.', VIEW_W / 2, 480);
  ctx.textAlign = 'left';
}

export function drawAlmanac(ctx, state) {
  titleBg(ctx, state);
  header(ctx, 'ALMANAC', 'Everything the light has shown you — creatures, bosses, feats.', PAL.gold);
  const run = state.run || { bestiary: {}, featsUnlocked: {}, kills: 0 };
  BESTIARY.forEach((b, i) => {
    const col = i % 5, row = Math.floor(i / 5);
    const x = 80 + col * 168, y = 170 + row * 150;
    const seen = run.bestiary[b.id];
    panel(ctx, x, y, 156, 138, seen ? b.id.includes('-') ? '#c78bff' : PAL.gold : PAL.line);
    ctx.fillStyle = seen ? '#ffd166' : PAL.dim;
    ctx.font = '30px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(seen ? b.icon : '?', x + 78, y + 44);
    ctx.fillStyle = PAL.cream; ctx.font = 'bold 13px sans-serif';
    ctx.fillText(seen ? b.name : '???', x + 78, y + 70);
    ctx.fillStyle = PAL.dim; ctx.font = '11px sans-serif';
    if (seen) {
      wrapText(ctx, b.desc, x + 78, y + 90, 140, 14);
      ctx.fillStyle = PAL.cream;
      ctx.fillText(`Seen ${seen.seen} • Slain ${seen.kills}`, x + 78, y + 128);
    } else {
      ctx.fillText('Not yet encountered.', x + 78, y + 96);
    }
    ctx.textAlign = 'left';
  });
  // Feats row.
  ctx.fillStyle = PAL.gold; ctx.font = 'bold 13px sans-serif';
  ctx.fillText('FEATS', 80, 490);
  FEATS.forEach((f, i) => {
    const got = !!run.featsUnlocked[f.id];
    ctx.fillStyle = got ? '#7ee787' : PAL.dim;
    ctx.font = '12px sans-serif';
    ctx.fillText(`${got ? '✓' : '○'} ${f.name} — ${f.desc} (+${f.embers}◆)`, 80 + (i % 2) * 420, 512 + Math.floor(i / 2) * 18);
  });
  btn(state, 'back', 390, 552, 180, 36, '← BACK');
}

export function drawOptions(ctx, state) {
  titleBg(ctx, state);
  header(ctx, 'OPTIONS', '', PAL.gold);
  panel(ctx, 300, 180, 360, 200);
  ctx.fillStyle = PAL.cream; ctx.font = '14px sans-serif';
  ctx.fillText(`Sound: ${state.options.muted ? 'MUTED (M)' : 'ON (M)'}`, 330, 220);
  ctx.fillText(`Music: ${state.options.music ? 'ON' : 'OFF'}`, 330, 250);
  ctx.fillText('Music is procedural — a different', 330, 290);
  ctx.fillText('scale for every realm. No audio files.', 330, 310);
  ctx.fillStyle = PAL.dim; ctx.font = '12px sans-serif';
  ctx.fillText('Progress autosaves after every realm.', 330, 344);
  btn(state, 'mute', 330, 380, 140, 36, state.options.muted ? 'UNMUTE' : 'MUTE');
  btn(state, 'music', 490, 380, 140, 36, state.options.music ? 'MUSIC OFF' : 'MUSIC ON');
  btn(state, 'back', 390, 500, 180, 40, '← BACK', { accent: true });
}

export function drawPause(ctx, state) {
  // main.js draws the frozen game underneath before calling this.
  ctx.fillStyle = 'rgba(5,2,10,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  header(ctx, 'PAUSED', 'The lantern waits. The dark does not.', PAL.gold);
  const run = state.run;
  ctx.fillStyle = PAL.cream; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${state.realm ? state.realm.def.name : ''}  •  Shards ${run.shards}/5  •  Score ${fmtNum(run.score)}  •  ${fmtTime(run.time)}`, VIEW_W / 2, 152);
  ctx.textAlign = 'left';
  btn(state, 'resume', 390, 190, 180, 42, '▶ RESUME', { accent: true, big: true });
  btn(state, 'restart', 390, 242, 180, 42, '↻ RESTART RUN');
  btn(state, 'options', 390, 294, 180, 42, '⚙ OPTIONS');
  btn(state, 'almanac', 390, 346, 180, 42, '📖 ALMANAC');
  btn(state, 'quit', 390, 398, 180, 42, '✕ QUIT TO TITLE');
}

export function drawBeacon(ctx, state) {
  titleBg(ctx, state);
  header(ctx, 'THE GREAT BEACON', BEACON.flavor, PAL.gold);
  // The tower.
  ctx.fillStyle = '#2c2138';
  ctx.fillRect(VIEW_W / 2 - 60, 220, 120, 240);
  ctx.fillStyle = '#3a2a52';
  ctx.fillRect(VIEW_W / 2 - 80, 200, 160, 24);
  ctx.fillStyle = state.run.shards >= 5 ? '#ffd166' : PAL.dim;
  ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(state.run.shards >= 5 ? 'ALL 5 SHARDS BURN BRIGHT' : `${state.run.shards}/5 SHARDS`, VIEW_W / 2, 190);
  // Five shard slots.
  for (let i = 0; i < 5; i++) {
    const x = VIEW_W / 2 - 100 + i * 50, y = 260;
    ctx.fillStyle = i < state.run.shards ? '#ffd166' : 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 10, y); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = PAL.cream; ctx.font = '14px sans-serif';
  ctx.fillText('Five Shards, one dawn. Light the tower the night swallowed.', VIEW_W / 2, 500);
  ctx.textAlign = 'left';
  btn(state, 'light-beacon', 360, 520, 240, 46, '◆ LIGHT THE BEACON', { accent: true, big: true });
}

export function drawBeaconLit(ctx, state) {
  titleBg(ctx, state);
  const t = state.beaconT;
  const g = ctx.createRadialGradient(VIEW_W / 2, 240, 4, VIEW_W / 2, 240, 60 + t * 220);
  g.addColorStop(0, `rgba(255,220,130,${Math.min(1, 0.4 + t * 0.3)})`);
  g.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('THE DAWN RETURNS', VIEW_W / 2, 250);
  ctx.fillStyle = PAL.cream; ctx.font = '16px sans-serif';
  ctx.fillText('Light climbs the tower. The five realms wake, one by one.', VIEW_W / 2, 290);
  ctx.textAlign = 'left';
}

function statsBlock(ctx, state, y0) {
  const w = state.winStats;
  const rows = [
    ['Final score', fmtNum(w.score)],
    ['Creatures slain', String(w.kills)],
    ['Time', fmtTime(w.time)],
    ['Ember Shards', `${w.shards}/5`],
    ['Relics claimed', String(w.relics)],
    ['Embers held', fmtNum(w.embers)],
    ['Difficulty', w.difficulty.toUpperCase() + (w.endless ? ' • ENDLESS' : '')],
  ];
  ctx.font = '15px sans-serif';
  rows.forEach(([k, v], i) => {
    const y = y0 + i * 26;
    ctx.fillStyle = PAL.dim; ctx.textAlign = 'right';
    ctx.fillText(k, VIEW_W / 2 - 10, y);
    ctx.fillStyle = PAL.cream; ctx.textAlign = 'left';
    ctx.fillText(v, VIEW_W / 2 + 10, y);
  });
  ctx.textAlign = 'left';
}

export function drawWin(ctx, state) {
  titleBg(ctx, state);
  header(ctx, '☀ DAWN RESTORED ☀', 'The Great Beacon burns again. The night is over — this time.', '#ffd166');
  statsBlock(ctx, state, 190);
  btn(state, 'endless', 300, 380, 360, 42, '∞  KEEP GOING — ENDLESS MODE', { accent: true, big: true });
  btn(state, 'new', 300, 432, 360, 42, '▶  NEW RUN');
  btn(state, 'title', 300, 484, 360, 42, 'TITLE SCREEN');
}

export function drawLose(ctx, state) {
  titleBg(ctx, state);
  header(ctx, 'THE LIGHT GOES OUT', state.loseReason || 'Slain by the shadows.', '#ff5d6c');
  if (state.winStats) statsBlock(ctx, state, 190);
  else {
    const run = state.run;
    ctx.fillStyle = PAL.cream; ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`Shards ${run.shards}/5  •  Score ${fmtNum(run.score)}  •  ${run.kills} kills  •  ${fmtTime(run.time)}`, VIEW_W / 2, 190);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = PAL.dim; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Tip: kills refund oil. Never let the beam run dry in the open dark.', VIEW_W / 2, 230);
  ctx.textAlign = 'left';
  btn(state, 'restart', 300, 280, 360, 42, '↻  TRY AGAIN', { accent: true, big: true });
  btn(state, 'title', 300, 332, 360, 42, 'TITLE SCREEN');
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  ctx.textAlign = 'center';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, cx, yy); line = w; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, cx, yy);
  ctx.textAlign = 'left';
}

// ---- click dispatch ---------------------------------------------------
export function handleClick(state, x, y) {
  const hit = buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  if (!hit) return false;
  const id = hit.id;
  audio.ensure();
  audio.sfx('click');
  if (id.startsWith('diff:')) { state.difficulty = id.slice(5); return true; }
  if (id.startsWith('buy:')) { buyUpgrade(state, id.slice(4)); return true; }
  if (id.startsWith('relic:')) { chooseRelic(state, Number(id.slice(6))); return true; }
  switch (id) {
    case 'new': newRun(state, state.difficulty, false); return true;
    case 'continue': continueSaved(state); return true;
    case 'endless': newRun(state, state.difficulty, true); return true;
    case 'almanac': state.returnTo = state.screen; state.screen = 'almanac'; return true;
    case 'options': state.returnTo = state.screen; state.screen = 'options'; return true;
    case 'enter-realm': nextRealmFromMap(state); return true;
    case 'beacon': state.screen = 'beacon'; return true;
    case 'shop': state.screen = 'shop'; state.shopNote = ''; return true;
    case 'map': state.screen = 'map'; return true;
    case 'title': quitToTitle(state); return true;
    case 'resume': state.screen = 'play'; return true;
    case 'restart': restartRun(state); return true;
    case 'quit': quitToTitle(state); return true;
    case 'mute': toggleMute(state); return true;
    case 'music': toggleMusic(state); return true;
    case 'light-beacon': lightBeacon(state); return true;
    case 'back': state.screen = state.returnTo || 'title'; return true;
    default: return false;
  }
}
