// Game state & flow: title → world map → realm → boss → shard → relic →
// shop → next realm … → beacon → win (or lose). Also owns the camera,
// toasts, feat checks, autosave and the Endless loop after victory.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, DIFFS, LANTERN, SCORE } from './config.js';
import { Rng, hashSeed, clamp, fmtTime } from './random.js';
import { REALMS } from './realms.js';
import { RELICS, aggregateRelics, randomRelicChoices, relicById } from './relics.js';
import { UPGRADES, computeStats, upgradeById } from './upgrades.js';
import { genRealmMap } from './world.js';
import { makePlayer, makeEnemy, makeBoss } from './entities.js';
import { Particles } from './particles.js';
import { audio } from './audio.js';
import { checkFeats } from './feats.js';
import { bestiaryById } from './bestiary.js';
import { loadSaveData, saveRunData, clearSaveData, pushHistory, loadHistory } from './save.js';
import {
  updatePlayer, updateBeamDamage, updateEnemies, updateBoss, updateBolts,
  updateRocks, updateSpawner, addScore, addEmbers, addOil, collectShard,
} from './combat.js';
import { braziersLitCount } from './puzzle.js';

export function createGame() {
  const saved = loadSaveData();
  const g = {
    screen: 'title',
    returnTo: 'title',
    difficulty: 'kindled',
    endless: false,
    seed: (Math.random() * 1e9) | 0,
    rng: new Rng((Math.random() * 1e9) | 0),
    stats: null,
    relicMods: aggregateRelics([]),
    run: null,
    realm: null,
    cam: { x: 0, y: 0 },
    toasts: [],
    toast(msg) { this.toasts.push({ msg, t: 4.5 }); if (this.toasts.length > 4) this.toasts.shift(); },
    relicChoice: [],
    shopNote: '',
    options: { muted: false, music: true, showFps: false },
    inputAxis: { x: 0, y: 0 },
    input: null, // wired by main.js
    titleSel: 0,
    mapSel: 0,
    beaconT: 0,
    winStats: null,
    loseReason: '',
    time: 0,
    fps: 0,
    savedRun: saved,
    history: loadHistory(),
    shotMode: null,
    pausedFrom: 'play',
  };
  // combat.js ends a run through this method (avoids a state<->combat cycle).
  g.lose = (reason) => lose(g, reason);
  return g;
}

export function newRun(state, diffId, endless = false) {
  const diff = DIFFS[diffId] || DIFFS.kindled;
  state.difficulty = diffId;
  state.endless = endless;
  state.diff = diff;
  state.seed = (Math.random() * 1e9) | 0;
  state.rng = new Rng(state.seed);
  state.run = {
    shards: 0, embers: diff.startEmbers, score: 0, kills: 0, time: 0,
    realmIndex: 0, relics: [], upgrades: { beam: 0, oil: 0, damage: 0, speed: 0, regen: 0 },
    featsUnlocked: {}, bestiary: {}, braziersLitTotal: 0,
    bossNoDamage: false, maxOilReached: false, cleanRealm: false, fastRealmClear: false,
    realmCleared: {}, endlessCycle: 0, endlessLevel: 0,
  };
  state.relicMods = aggregateRelics([]);
  state.stats = computeStats(state.run.upgrades, state.relicMods);
  state.toasts = [];
  state.screen = 'map';
  state.mapSel = 0;
  audio.ensure();
  audio.startMusic(0);
  autosave(state);
}

export function startRealm(state, realmIndex) {
  const idx = realmIndex % REALMS.length;
  const def = REALMS[idx];
  const cycle = Math.floor(realmIndex / REALMS.length);
  const rng = new Rng(hashSeed(state.seed + ':' + realmIndex));
  const map = genRealmMap(rng, def, idx);
  state.stats = computeStats(state.run.upgrades, state.relicMods);
  const player = makePlayer(state.stats, map.spawn.x, map.spawn.y);
  // Refill lantern on entering a realm — each realm starts lit.
  player.oil = player.maxOil;
  const realm = {
    def, defIndex: idx, cycle, map, player,
    enemies: [], boss: null, bolts: [], pickups: [], rocks: [],
    particles: new Particles(),
    spawnT: 2, bossSpawned: false, bossPending: false, bossActive: false,
    realmTime: 0, damageTakenThisRealm: 0, flaskPicked: false,
    introT: 2.6, introShown: false,
  };
  // Opening pack: a few creatures near the middle of the map.
  const openCount = Math.round(5 * (state.diff.enemyCount || 1));
  for (let i = 0; i < openCount; i++) {
    const type = def.enemies[Math.floor(rng.next() * def.enemies.length)];
    const x = clamp(map.spawn.x + rng.range(-420, 420), 70, WORLD_W - 70);
    const y = clamp(map.spawn.y + rng.range(-520, -140), 70, WORLD_H - 70);
    realm.enemies.push(makeEnemy(type, x, y, idx + cycle, state.difficulty));
    markSeen(state, type);
  }
  state.realm = realm;
  state.run.realmIndex = realmIndex;
  state.screen = 'play';
  state.cam.x = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  state.cam.y = clamp(player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  audio.startMusic(idx);
  toast(state, `${def.name} — ${def.sub}`);
  toast(state, def.tip);
  autosave(state);
}

function markSeen(state, type) {
  if (!state.run.bestiary[type]) state.run.bestiary[type] = { seen: 0, kills: 0 };
  state.run.bestiary[type].seen++;
}

export function startBossIfPending(state) {
  const r = state.realm;
  if (!r || !r.bossPending || r.boss) return;
  r.bossPending = false;
  const boss = makeBoss(r.def.bossId, r.map.bossGate.x, r.map.bossGate.y, r.defIndex + r.cycle, state.difficulty);
  r.boss = boss;
  markSeen(state, boss.type);
  r.particles.burst(boss.x, boss.y, boss.color, 40, 180);
}

export function toast(state, msg) {
  state.toasts.push({ msg, t: 4.5 });
  if (state.toasts.length > 4) state.toasts.shift();
}

export function buyUpgrade(state, id) {
  const u = upgradeById(id);
  if (!u) return;
  const lvl = state.run.upgrades[id] || 0;
  if (lvl >= u.max) { state.shopNote = `${u.name} is already maxed (rank ${u.max}).`; return; }
  const cost = u.cost(lvl);
  if (state.run.embers < cost) { state.shopNote = `Not enough embers: ${u.name} rank ${lvl + 1} costs ${cost}.`; return; }
  state.run.embers -= cost;
  state.run.upgrades[id] = lvl + 1;
  state.stats = computeStats(state.run.upgrades, state.relicMods);
  state.shopNote = `${u.name} → rank ${lvl + 1}!`;
  audio.sfx('pickup');
  autosave(state);
}

export function rollRelicChoice(state) {
  state.relicChoice = randomRelicChoices(state.rng, state.run.relics, 3);
  return state.relicChoice;
}

export function chooseRelic(state, idx) {
  const r = state.relicChoice[idx];
  if (!r) return;
  state.run.relics.push(r.id);
  state.relicMods = aggregateRelics(state.run.relics);
  state.stats = computeStats(state.run.upgrades, state.relicMods);
  // Heal a little on taking a relic — the Shard's blessing.
  audio.sfx('relic');
  state.toast(`Relic claimed: ${r.name} — ${r.desc}`);
  addScore(state, 100);
  state.screen = 'shop';
  state.shopNote = `Relic claimed: ${r.name}. Spend embers before the next realm.`;
  autosave(state);
}

export function nextRealmFromMap(state) {
  const next = state.run.shards; // shards collected = realms cleared, in order
  if (next >= REALMS.length) { state.screen = 'beacon'; return; }
  startRealm(state, next);
}

export function lightBeacon(state) {
  state.beaconT = 0;
  state.screen = 'beacon-lit';
  audio.sfx('win');
  addScore(state, SCORE.beacon);
}

export function winRun(state) {
  const run = state.run;
  state.winStats = {
    score: run.score, kills: run.kills, time: run.time,
    shards: run.shards, embers: run.embers, relics: run.relics.length,
    difficulty: state.difficulty, endless: state.endless,
  };
  pushHistory({ result: 'WIN', score: run.score, kills: run.kills, time: fmtTime(run.time), shards: run.shards, diff: state.difficulty });
  clearSaveData();
  state.savedRun = null;
  state.history = loadHistory();
  state.screen = 'win';
  audio.stopMusic();
}

export function lose(state, reason) {
  if (state.screen === 'lose' || state.screen === 'win') return;
  const run = state.run;
  state.loseReason = reason === 'dark' ? 'The dark swallowed your light.' : 'Slain by the shadows.';
  pushHistory({ result: 'LOST', score: run.score, kills: run.kills, time: fmtTime(run.time), shards: run.shards, diff: state.difficulty });
  clearSaveData();
  state.savedRun = null;
  state.history = loadHistory();
  state.screen = 'lose';
  audio.sfx('lose');
  audio.stopMusic();
}

export function restartRun(state) {
  newRun(state, state.difficulty, false);
}

export function quitToTitle(state) {
  state.screen = 'title';
  state.savedRun = loadSaveData();
  audio.stopMusic();
}

export function continueSaved(state) {
  const s = state.savedRun || loadSaveData();
  if (!s) return false;
  state.difficulty = s.difficulty;
  state.diff = DIFFS[s.difficulty] || DIFFS.kindled;
  state.seed = s.seed;
  state.rng = new Rng(s.seed);
  state.run = s.run;
  state.relicMods = aggregateRelics(state.run.relics || []);
  state.stats = computeStats(state.run.upgrades || {}, state.relicMods);
  state.endless = !!s.endless;
  state.screen = 'map';
  state.mapSel = 0;
  audio.ensure();
  audio.startMusic(0);
  return true;
}

export function autosave(state) {
  if (!state.run || state.screen === 'win' || state.screen === 'lose') return;
  saveRunData({
    difficulty: state.difficulty, endless: state.endless, seed: state.seed,
    run: state.run, savedAt: Date.now(),
  });
}

// ---- per-frame update -------------------------------------------------
export function tick(state, dt) {
  state.time += dt;
  // Toast timers.
  for (const t of state.toasts) t.t -= dt;
  state.toasts = state.toasts.filter((t) => t.t > 0);

  if (state.screen === 'play') {
    const r = state.realm;
    if (!r) return;
    r.realmTime += dt;
    state.run.time += dt;
    if (r.introT > 0) r.introT -= dt;
    state.inputAxis = state.input.moveAxis();
    state.input.mouse.wx = state.input.mouse.x + state.cam.x;
    state.input.mouse.wy = state.input.mouse.y + state.cam.y;
    startBossIfPending(state);
    updatePlayer(state, dt);
    updateBeamDamage(state, dt);
    updateEnemies(state, dt);
    updateBoss(state, dt);
    updateBolts(state, dt);
    updateRocks(state, dt);
    updateSpawner(state, dt);
    r.particles.update(dt);
    // Camera follows the player.
    const p = r.player;
    state.cam.x = clamp(p.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    state.cam.y = clamp(p.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
    // Oil-out in the dark is not instant death: HP drains via pools and
    // the beam dies, but a flask or brazier can still save the run.
    if (p.hp <= 0) { /* lose() is called by damagePlayer */ }
    // Feat checks.
    const fresh = checkFeats(state.run, state.run.featsUnlocked);
    for (const f of fresh) {
      state.run.featsUnlocked[f.id] = true;
      addEmbers(state, f.embers);
      addScore(state, SCORE.feat);
      toast(state, `Feat: ${f.name} (+${f.embers} embers)`);
      audio.sfx('feat');
    }
    // Pause keys are handled once per frame by main.js keyRouter (before
    // this tick runs); handling them here too would re-pause on resume,
    // because the same keypress edge is still set when tick runs.
    if (state.input.wasPressed('KeyM')) toggleMute(state);
    if (state.input.wasPressed('KeyJ')) { state.returnTo = 'play'; state.screen = 'almanac'; }
  } else if (state.screen === 'beacon-lit') {
    state.beaconT += dt;
    if (state.beaconT > 3.2) winRun(state);
  }
}

export function toggleMute(state) {
  state.options.muted = !state.options.muted;
  audio.setMuted(state.options.muted);
  toast(state, state.options.muted ? 'Sound muted (M).' : 'Sound on (M).');
}
export function toggleMusic(state) {
  state.options.music = !state.options.music;
  audio.setMusic(state.options.music);
}
