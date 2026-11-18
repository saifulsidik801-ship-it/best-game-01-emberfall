// Combat: the beam, the oil economy, enemy AI, boss patterns and pickups.
// The beam is a cone from the player toward the mouse. It drains oil while
// on; kills, braziers and flasks refund oil. Enemies only die to light —
// there is no other weapon, which is the whole point of the game.
import { LANTERN, SCORE, WORLD_W, WORLD_H } from './config.js';
import { clamp, dist, angleTo } from './random.js';
import { collideObstacles, pointBlocked } from './world.js';
import { makeEnemy, makePickup, makeBolt } from './entities.js';
import { bossById } from './boss.js';
import { updateBraziers, allBraziersLit, brazierReward, braziersLitCount } from './puzzle.js';
import { audio } from './audio.js';

function beamHits(px, py, aim, range, width, tx, ty, tr) {
  const dx = tx - px, dy = ty - py;
  const d = Math.hypot(dx, dy);
  if (d > range + tr) return false;
  if (d < 24) return true;
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(ang - aim);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff < Math.atan2(width / 2 + tr, Math.max(30, d));
}

export function addScore(state, n) {
  state.run.score += Math.round(n * (state.diff.scoreMul || 1));
}
export function addEmbers(state, n) {
  const v = Math.round(n * (state.relicMods.emberMul || 1));
  state.run.embers += v;
  if (state.run.embers >= 300) state.run.richFlag = true;
  return v;
}
export function addOil(state, n) {
  const p = state.realm.player;
  p.oil = clamp(p.oil + n, 0, p.maxOil);
  if (p.oil >= p.maxOil) state.run.maxOilReached = true;
}

export function updatePlayer(state, dt) {
  const p = state.realm.player;
  const r = state.realm;
  const ax = state.inputAxis;
  p.moving = !!(ax.x || ax.y);
  p.animT += dt * (p.moving ? 1 : 0.4);
  const sp = p.speed * (r.def.id === 'sunken-choir' ? 0.9 : 1);
  let nx = p.x + ax.x * sp * dt;
  let ny = p.y + ax.y * sp * dt;
  nx = clamp(nx, 40, WORLD_W - 40); ny = clamp(ny, 40, WORLD_H - 40);
  const res = collideObstacles(nx, ny, p.r, r.map.obstacles);
  p.x = res.x; p.y = res.y;
  // Aim at the mouse (world coords).
  p.aim = angleTo(p.x, p.y, state.input.mouse.wx, state.input.mouse.wy);
  // Beam: hold mouse / Space. Drains oil; at 0 oil the lantern dies.
  const wantBeam = state.input.beamHeld() && p.oil > 0;
  p.firing = wantBeam;
  if (wantBeam) {
    p.beamT += dt;
    const drain = LANTERN.oilDrainPerSec * state.diff.oilDrain * (r.def.id === 'ember-peaks' ? 1.2 : 1);
    p.oil = Math.max(0, p.oil - drain * dt);
    if (Math.random() < dt * 22) {
      const bx = p.x + Math.cos(p.aim) * (state.stats.beamRange * (0.4 + Math.random() * 0.5));
      const by = p.y + Math.sin(p.aim) * (state.stats.beamRange * (0.4 + Math.random() * 0.5));
      r.particles.emberTrail(bx, by, r.def.glow);
    }
  } else {
    p.beamT = 0;
  }
  // Passive regen (Ember Heart upgrade) always ticks.
  if (state.stats.regen > 0) addOil(state, state.stats.regen * dt);
  // Shadow pools: HP drain while standing in one with the beam off.
  p.inPool = false;
  for (const pool of r.map.pools) {
    if (dist(p.x, p.y, pool.x, pool.y) < pool.r) {
      p.inPool = true;
      if (!p.firing) damagePlayer(state, LANTERN.darkDrainPerSec * dt, 'dark');
      break;
    }
  }
  if (p.hurtT > 0) p.hurtT -= dt;
  // Pickups: walk over to collect.
  for (const pk of r.pickups) {
    pk.t += dt;
    if (dist(p.x, p.y, pk.x, pk.y) < p.r + pk.r + 6) {
      pk.dead = true;
      if (pk.kind === 'oil') { addOil(state, LANTERN.pickupOil); r.flaskPicked = true; }
      if (pk.kind === 'hp') p.hp = clamp(p.hp + LANTERN.pickupHp, 0, p.maxHp);
      if (pk.kind === 'ember') addEmbers(state, pk.value);
      if (pk.kind === 'shard') collectShard(state);
      audio.sfx('pickup');
      r.particles.burst(pk.x, pk.y, pk.kind === 'hp' ? '#7ee787' : '#ffb347', 10, 70);
    }
  }
  r.pickups = r.pickups.filter((pk) => !pk.dead);
  // Chests: walk close + press E to open.
  for (const c of r.map.chests) {
    if (!c.opened && dist(p.x, p.y, c.x, c.y) < 52 && state.input.wasPressed('KeyE')) {
      c.opened = true;
      const em = 25 + Math.floor(Math.random() * 25);
      addEmbers(state, em); addOil(state, 20); addScore(state, SCORE.chest);
      audio.sfx('pickup');
      r.particles.burst(c.x, c.y, '#ffd166', 16, 100);
      state.toast(`Chest opened: +${em} embers, +20 oil`);
    }
  }
}

export function updateBeamDamage(state, dt) {
  const r = state.realm, p = r.player;
  if (!p.firing) return;
  const stats = state.stats;
  const dmg = stats.damage * dt;
  const slow = state.relicMods.slow || 0;
  const hitAny = (e) => {
    if (e.dead || e.hp <= 0) return;
    if (beamHits(p.x, p.y, p.aim, stats.beamRange, stats.beamWidth, e.x, e.y, e.r)) {
      e.hp -= dmg; e.hitT = 0.12; e.litT = 1.2;
      if (slow) e.slowT = 0.3;
      if (Math.random() < dt * 14) r.particles.emberTrail(e.x, e.y, '#ffd166');
      if (e.hp <= 0) killEnemy(state, e);
    }
  };
  for (const e of r.enemies) hitAny(e);
  if (r.boss && !r.boss.dead) hitAny(r.boss);
  // Braziers catch the beam too.
  const newly = updateBraziers(state, dt);
  for (const b of newly) {
    addOil(state, brazierReward(state));
    addEmbers(state, 15); addScore(state, SCORE.brazier);
    state.run.braziersLitTotal++;
    audio.sfx('brazier');
    r.particles.burst(b.x, b.y, r.def.glow, 26, 130);
    state.toast(`Brazier lit! (${braziersLitCount(r.map)}/3)  +${brazierReward(state)} oil`);
    if (allBraziersLit(r.map)) {
      state.toast('All braziers lit — the boss gate opens!');
      audio.sfx('gate');
      spawnBoss(state);
    }
  }
}

export function killEnemy(state, e) {
  if (e.dead) return;
  e.dead = true;
  const r = state.realm;
  state.run.kills++;
  addScore(state, e.score || SCORE.kill);
  addOil(state, (e.oil || 10) * (state.relicMods.oilRefund || 1));
  addEmbers(state, e.em || e.embers || 0);
  if (state.relicMods.killHeal) {
    r.player.hp = clamp(r.player.hp + state.relicMods.killHeal, 0, r.player.maxHp);
  }
  const id = e.type;
  if (!state.run.bestiary[id]) state.run.bestiary[id] = { seen: 0, kills: 0 };
  state.run.bestiary[id].kills++;
  audio.sfx('kill');
  r.particles.burst(e.x, e.y, e.color || '#ffb347', e.kind === 'boss' ? 60 : 16, e.kind === 'boss' ? 200 : 120);
  // Oil flask / heart drops.
  const roll = Math.random();
  if (e.kind !== 'boss' && roll < 0.16) r.pickups.push(makePickup('oil', e.x, e.y));
  else if (e.kind !== 'boss' && roll < 0.24) r.pickups.push(makePickup('hp', e.x, e.y));
  else if (e.kind !== 'boss') r.pickups.push(makePickup('ember', e.x, e.y, e.embers || 5));
  if (e.kind === 'boss') bossDefeated(state, e);
}

function bossDefeated(state, boss) {
  const r = state.realm;
  addScore(state, SCORE.boss);
  addEmbers(state, boss.embers || 120);
  addOil(state, 40);
  audio.sfx('shard');
  state.toast(`${boss.def.name} defeated! The Ember Shard is yours.`);
  // Shard drops at the pedestal; walking over it collects it.
  r.pickups.push(makePickup('shard', r.map.shardPedestal.x, r.map.shardPedestal.y));
  r.bossActive = false;
  // Boss-no-damage feat check.
  if (r.damageTakenThisRealm <= 0) state.run.bossNoDamage = true;
}

export function collectShard(state) {
  const r = state.realm;
  state.run.shards++;
  addScore(state, SCORE.shard);
  addOil(state, 40);
  if (!r.flaskPicked) state.run.cleanRealm = true;
  if (r.realmTime < 180) state.run.fastRealmClear = true;
  audio.sfx('shard');
  r.particles.burst(r.player.x, r.player.y, '#ffd166', 40, 180);
  state.run.realmCleared = state.run.realmCleared || {};
  state.run.realmCleared[r.def.id] = true;
  if (state.run.shards >= 5 && !state.endless) {
    state.screen = 'beacon';
  } else {
    // Relic choice before returning to the world map.
    state.screen = 'relic';
    state.relicChoice = null; // filled by state.js
  }
}

export function damagePlayer(state, amount, source) {
  const p = state.realm.player;
  if (p.hurtT > 0 && source !== 'dark') return;
  if (source !== 'dark') p.hurtT = 0.5;
  const r = state.realm;
  r.damageTakenThisRealm += amount;
  if (state.relicMods.secondWind && !p.secondWindUsed && p.hp - amount <= 0) {
    p.secondWindUsed = true; p.hp = 1; p.hurtT = 1.2;
    state.toast('Second Wind! The relic holds you at 1 HP.');
    audio.sfx('feat');
    return;
  }
  p.hp -= amount;
  if (source !== 'dark') { audio.sfx('hurt'); r.particles.burst(p.x, p.y, '#ff5d6c', 10, 90); }
  if (p.hp <= 0) { p.hp = 0; state.lose('slain'); }
}

export function spawnBoss(state) {
  const r = state.realm;
  if (r.bossSpawned) return;
  r.bossSpawned = true;
  // The boss entity itself is constructed in state.js (startBoss) the next
  // frame, once this flag is seen — combat stays free of a state import cycle.
  r.bossPending = true;
  r.bossActive = true;
  audio.sfx('boss');
  const def = bossById(r.def.bossId);
  state.toast(`${def.name} awakens!`);
}

export function bossName(state) {
  return state.realm.boss ? state.realm.boss.def.name : 'The Boss';
}

export function updateEnemies(state, dt) {
  const r = state.realm, p = r.player;
  for (const e of r.enemies) {
    if (e.dead) continue;
    e.wob += dt * 3;
    if (e.hitT > 0) e.hitT -= dt;
    if (e.litT > 0) e.litT -= dt;
    const slowMul = (e.slowT > 0 ? 1 - (state.relicMods.slow || 0) : 1);
    if (e.slowT > 0) e.slowT -= dt;
    // The Hollow: unlit enemies regenerate.
    if (r.def.id === 'the-hollow' && e.litT <= 0) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
    const d = dist(e.x, e.y, p.x, p.y);
    const ang = angleTo(e.x, e.y, p.x, p.y);
    let mx = 0, my = 0;
    if (e.type === 'wisp') {
      // Keep ~260px distance, strafe, shoot dark bolts.
      const want = 260;
      const dir = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
      mx = Math.cos(ang) * dir + Math.cos(ang + Math.PI / 2) * Math.sin(e.wob) * 0.6;
      my = Math.sin(ang) * dir + Math.sin(ang + Math.PI / 2) * Math.sin(e.wob) * 0.6;
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 520) {
        e.shootT = 2.4;
        r.bolts.push(makeBolt(e.x, e.y, Math.cos(ang) * 190, Math.sin(ang) * 190, e.dmg, false));
      }
    } else if (e.blink) {
      e.blinkT -= dt;
      if (e.blinkT <= 0 && d > 120) {
        e.blinkT = 3.5 + Math.random() * 2;
        const tx = p.x - Math.cos(ang) * 90 + (Math.random() - 0.5) * 60;
        const ty = p.y - Math.sin(ang) * 90 + (Math.random() - 0.5) * 60;
        r.particles.burst(e.x, e.y, '#c78bff', 10, 80);
        e.x = clamp(tx, 50, WORLD_W - 50); e.y = clamp(ty, 50, WORLD_H - 50);
        r.particles.burst(e.x, e.y, '#c78bff', 10, 80);
      }
      mx = Math.cos(ang); my = Math.sin(ang);
    } else {
      mx = Math.cos(ang) + Math.cos(e.wob) * 0.15;
      my = Math.sin(ang) + Math.sin(e.wob) * 0.15;
    }
    const len = Math.hypot(mx, my) || 1;
    let nx = e.x + (mx / len) * e.speed * slowMul * dt;
    let ny = e.y + (my / len) * e.speed * slowMul * dt;
    const res = collideObstacles(nx, ny, e.r, r.map.obstacles);
    e.x = res.x; e.y = res.y;
    // Contact damage.
    if (dist(e.x, e.y, p.x, p.y) < e.r + p.r - 2) {
      damagePlayer(state, e.dmg * dt * 2.2, 'touch');
      // Thornlight relic: touching enemies burn.
      if (state.relicMods.thorns) {
        e.hp -= state.relicMods.thorns * dt;
        if (e.hp <= 0) killEnemy(state, e);
      }
    }
  }
  r.enemies = r.enemies.filter((e) => !e.dead);
}

export function updateBolts(state, dt) {
  const r = state.realm, p = r.player;
  for (const b of r.bolts) {
    b.t += dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.t > 6 || pointBlocked(b.x, b.y, r.map.obstacles)) { b.dead = true; continue; }
    if (dist(b.x, b.y, p.x, p.y) < b.r + p.r) {
      b.dead = true;
      damagePlayer(state, b.dmg, 'bolt');
    }
  }
  r.bolts = r.bolts.filter((b) => !b.dead);
}

// Boss patterns: summon / charge / song / rocks / heal. One update, five
// readable branches; each telegraphs before it strikes.
export function updateBoss(state, dt) {
  const r = state.realm, b = r.boss, p = r.player;
  if (!b || b.dead) return;
  if (b.hitT > 0) b.hitT -= dt;
  if (b.litT > 0) b.litT -= dt;
  if (b.state === 'intro') {
    b.stateT -= dt;
    if (b.stateT <= 0) { b.state = 'fight'; b.attackT = 3; }
    return;
  }
  const d = dist(b.x, b.y, p.x, p.y);
  const ang = angleTo(b.x, b.y, p.x, p.y);
  b.attackT -= dt;
  const pat = b.def.pattern;
  if (b.state === 'song') {
    b.songT -= dt;
    if (b.songT <= 0) { b.state = 'fight'; b.attackT = 2.5; }
  }
  if (pat === 'heal' && b.litT <= 0) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.015 * dt);
  if (b.state === 'charge') {
    b.x += b.chargeVx * dt; b.y += b.chargeVy * dt;
    const res = collideObstacles(b.x, b.y, b.r, r.map.obstacles);
    if (res.hit || b.x < 60 || b.x > WORLD_W - 60 || b.y < 60 || b.y > WORLD_H - 60) {
      b.state = 'stun'; b.stateT = 1.6;
      r.particles.burst(b.x, b.y, '#7fd4ff', 24, 160);
      audio.sfx('hit');
    }
    if (dist(b.x, b.y, p.x, p.y) < b.r + p.r) damagePlayer(state, b.dmg, 'boss');
    return;
  }
  if (b.state === 'stun') {
    b.stateT -= dt;
    if (b.stateT <= 0) { b.state = 'fight'; b.attackT = 2.5; }
    return;
  }
  // Drift toward the player, slowly.
  const sp = b.speed * (b.state === 'song' ? 0.4 : 1);
  let nx = b.x + Math.cos(ang) * sp * dt;
  let ny = b.y + Math.sin(ang) * sp * dt;
  const res = collideObstacles(nx, ny, b.r, r.map.obstacles);
  b.x = res.x; b.y = res.y;
  if (d < b.r + p.r + 2) damagePlayer(state, b.dmg * dt * 1.6, 'boss');
  if (b.attackT > 0) return;
  if (pat === 'summon') {
    b.attackT = 9; b.summonCount++;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = makeEnemy('shade', b.x + Math.cos(a) * 70, b.y + Math.sin(a) * 70, r.defIndex, state.difficulty);
      r.enemies.push(s);
      r.particles.burst(s.x, s.y, '#8d7fb8', 10, 80);
    }
    state.toast('The Warden rings the bell — shades answer!');
  } else if (pat === 'charge') {
    b.attackT = 5.5;
    b.state = 'charge'; b.stateT = 1.1;
    b.chargeVx = Math.cos(ang) * 420; b.chargeVy = Math.sin(ang) * 420;
    state.toast('The Stag lowers its crown — dodge the charge!');
    audio.sfx('boss');
  } else if (pat === 'song') {
    b.attackT = 8; b.state = 'song'; b.songT = 2.4;
    const w = makeEnemy('wisp', b.x + 60, b.y - 40, r.defIndex, state.difficulty);
    r.enemies.push(w);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      r.bolts.push(makeBolt(b.x, b.y, Math.cos(a) * 150, Math.sin(a) * 150, b.dmg * 0.6, true));
    }
    state.toast('The Choir sings — bolts fly in every direction!');
  } else if (pat === 'rocks') {
    b.attackT = 6;
    for (let i = 0; i < 3; i++) {
      const tx = p.x + (Math.random() - 0.5) * 120, ty = p.y + (Math.random() - 0.5) * 120;
      r.rocks = r.rocks || [];
      r.rocks.push({ x: tx, y: ty, t: 0.9, r: 34, dmg: b.dmg });
      r.particles.burst(tx, ty, '#ff7a2f', 6, 50);
    }
    state.toast('Burning rocks incoming — move!');
    audio.sfx('boss');
  } else if (pat === 'heal') {
    b.attackT = 10;
    const w = makeEnemy('wraith', b.x + 80, b.y + 30, r.defIndex, state.difficulty);
    r.enemies.push(w);
    state.toast('The King calls a wraith from the dark!');
  }
}

export function updateRocks(state, dt) {
  const r = state.realm, p = r.player;
  if (!r.rocks) return;
  for (const rock of r.rocks) {
    rock.t -= dt;
    if (rock.t <= 0 && !rock.hit) {
      rock.hit = true;
      r.particles.burst(rock.x, rock.y, '#ff7a2f', 22, 150);
      if (dist(p.x, p.y, rock.x, rock.y) < rock.r + p.r) damagePlayer(state, rock.dmg, 'rock');
      audio.sfx('hit');
    }
  }
  r.rocks = r.rocks.filter((rk) => !rk.hit);
}

// Ambient spawner: trickle new shades so a realm never runs dry of oil.
export function updateSpawner(state, dt) {
  const r = state.realm;
  if (r.bossSpawned && r.boss && !r.boss.dead) return; // boss fight: no adds except summons
  r.spawnT -= dt;
  const cap = Math.round(7 * (state.diff.enemyCount || 1));
  if (r.spawnT <= 0 && r.enemies.length < cap) {
    r.spawnT = 3.5;
    const type = r.def.enemies[Math.floor(Math.random() * r.def.enemies.length)];
    const a = Math.random() * Math.PI * 2;
    const x = clamp(r.player.x + Math.cos(a) * 520, 60, WORLD_W - 60);
    const y = clamp(r.player.y + Math.sin(a) * 520, 60, WORLD_H - 60);
    if (pointBlocked(x, y, r.map.obstacles)) return;
    r.enemies.push(makeEnemy(type, x, y, r.defIndex, state.difficulty));
  }
}
