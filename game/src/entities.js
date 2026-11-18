// Entity factories: player, shadow creatures, bosses, pickups.
// Enemy stats scale with realm index and difficulty; bosses scale less
// (they are hand-tuned in boss.js) so fights stay fair.
import { DIFFS } from './config.js';
import { bossById } from './boss.js';
import { bestiaryById } from './bestiary.js';

export const ENEMY_TYPES = {
  shade: { hp: 40, speed: 78, radius: 15, dmg: 8, color: '#8d7fb8', score: 50, oil: 14, embers: 6, ranged: false },
  crawler: { hp: 22, speed: 132, radius: 11, dmg: 6, color: '#a86fd0', score: 50, oil: 10, embers: 4, ranged: false },
  wisp: { hp: 55, speed: 66, radius: 13, dmg: 10, color: '#7fd4ff', score: 70, oil: 16, embers: 9, ranged: true },
  brute: { hp: 150, speed: 46, radius: 24, color: '#c77b4a', score: 120, oil: 22, embers: 14, ranged: false },
  wraith: { hp: 90, speed: 88, radius: 14, color: '#c78bff', score: 150, oil: 18, embers: 12, ranged: false, blink: true },
};

export function makePlayer(stats, x, y) {
  return {
    x, y, r: 16, hp: stats.maxHp, maxHp: stats.maxHp,
    oil: stats.maxOil, maxOil: stats.maxOil,
    aim: -Math.PI / 2, firing: false, beamT: 0,
    speed: stats.speed, hurtT: 0, secondWindUsed: false,
    animT: 0, moving: false, inPool: false,
  };
}

export function makeEnemy(type, x, y, realmIndex, diff) {
  const t = ENEMY_TYPES[type];
  const d = DIFFS[diff];
  const scale = 1 + realmIndex * 0.22; // later realms hit harder
  return {
    kind: 'enemy', type, x, y, r: t.radius,
    hp: t.hp * d.enemyHp * scale, maxHp: t.hp * d.enemyHp * scale,
    speed: t.speed * d.enemySpeed, dmg: t.dmg * d.enemyDmg * (1 + realmIndex * 0.08),
    color: t.color, score: t.score, oil: t.oil, embers: t.embers,
    ranged: t.ranged, blink: !!t.blink,
    litT: 0, // seconds the beam has touched it recently (Hollow regen rule)
    shootT: 2 + Math.random() * 2, blinkT: 3 + Math.random() * 3,
    wob: Math.random() * Math.PI * 2, hitT: 0, dead: false,
  };
}

export function makeBoss(bossId, x, y, realmIndex, diff) {
  const def = bossById(bossId);
  const d = DIFFS[diff];
  return {
    kind: 'boss', type: bossId, def, x, y, r: def.radius,
    hp: def.hp * (1 + realmIndex * 0.06) * (d.enemyHp * 0.9 + 0.1),
    maxHp: def.hp * (1 + realmIndex * 0.06) * (d.enemyHp * 0.9 + 0.1),
    speed: def.speed * d.enemySpeed, dmg: def.dmg * d.enemyDmg,
    color: def.color, score: 1500, oil: 40, embers: 120,
    litT: 0, attackT: 4, state: 'intro', stateT: 2.2, chargeVx: 0, chargeVy: 0,
    songT: 0, hitT: 0, dead: false, summonCount: 0,
  };
}

export function makePickup(kind, x, y, value) {
  return { kind, x, y, value: value || 0, r: 12, t: 0, bob: Math.random() * 6 };
}

export function makeBolt(x, y, vx, vy, dmg, fromBoss) {
  return { x, y, vx, vy, r: 6, dmg, fromBoss: !!fromBoss, t: 0, dead: false };
}
