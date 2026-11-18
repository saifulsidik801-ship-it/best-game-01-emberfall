// Screenshot staging (?shot=start|play|upgrade|win): builds a deterministic,
// truthful game state for each shot so the HUD numbers in the screenshots
// are exactly the live numbers — nothing is faked in the render layer.
// main.js runs a fixed number of ticks after staging, then freezes.
import { Rng } from './random.js';
import { newRun, startRealm, rollRelicChoice } from './state.js';
import { aggregateRelics } from './relics.js';
import { computeStats } from './upgrades.js';
import { makeEnemy } from './entities.js';
import { clamp } from './random.js';

export function applyShot(state, mode) {
  state.shotMode = mode;
  if (mode === 'start') {
    state.screen = 'title';
    state.history = [
      { result: 'WIN', score: 18450, kills: 87, time: '20:45', shards: 5, diff: 'kindled' },
      { result: 'LOST', score: 6230, kills: 41, time: '11:02', shards: 2, diff: 'kindled' },
      { result: 'LOST', score: 2410, kills: 19, time: '06:37', shards: 1, diff: 'ashen' },
    ];
    return;
  }
  if (mode === 'play') {
    newRun(state, 'kindled', false);
    state.seed = 1337;
    state.rng = new Rng(1337);
    state.run.upgrades = { beam: 2, oil: 1, damage: 1, speed: 0, regen: 1 };
    state.run.relics = ['sunspore', 'longwick'];
    state.relicMods = aggregateRelics(state.run.relics);
    state.stats = computeStats(state.run.upgrades, state.relicMods);
    state.run.shards = 1;
    state.run.realmCleared['ashen-moor'] = true;
    startRealm(state, 1); // Glasswood
    const r = state.realm;
    const p = r.player;
    p.x = 760; p.y = 620;
    p.hp = 78; p.oil = 64;
    state.run.embers = 125; state.run.score = 2450; state.run.kills = 12;
    state.run.time = 95; r.realmTime = 95;
    r.introT = 0; // staged shot: skip the intro card so the play is visible
    // One brazier already lit, two to go.
    r.map.braziers[0].lit = true;
    state.run.braziersLitTotal = 1;
    // Enemies staged around the player, in beam range.
    r.enemies = [
      makeEnemy('wisp', 980, 520, 1, 'kindled'),
      makeEnemy('shade', 900, 700, 1, 'kindled'),
      makeEnemy('crawler', 640, 520, 1, 'kindled'),
      makeEnemy('shade', 560, 700, 1, 'kindled'),
    ];
    r.enemies[0].hp = r.enemies[0].maxHp * 0.6; // one visibly damaged
    // Aim the beam at the wisp and hold it.
    state.input.mouse.down = true;
    state.input.mouse.x = 980 - state.cam.x;
    state.input.mouse.y = 520 - state.cam.y;
    return;
  }
  if (mode === 'upgrade') {
    newRun(state, 'kindled', false);
    state.run.shards = 1;
    state.run.realmCleared['ashen-moor'] = true;
    state.run.embers = 260;
    state.run.score = 3120;
    state.run.kills = 23;
    state.run.upgrades = { beam: 1, oil: 1, damage: 0, speed: 0, regen: 0 };
    state.run.relics = ['heartcoal'];
    state.relicMods = aggregateRelics(state.run.relics);
    state.stats = computeStats(state.run.upgrades, state.relicMods);
    state.screen = 'shop';
    state.shopNote = 'Relic claimed: Heartcoal (+30 max HP). Spend embers before the next realm.';
    return;
  }
  if (mode === 'win') {
    newRun(state, 'kindled', false);
    state.run.shards = 5;
    state.winStats = {
      score: 18450, kills: 87, time: 1245, shards: 5,
      embers: 340, relics: 4, difficulty: 'kindled', endless: false,
    };
    state.screen = 'win';
    return;
  }
  state.screen = 'title';
}
