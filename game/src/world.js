// Realm map generation: one open arena per realm with scattered obstacles
// (rocks / crystals / pillars / obelisks by realm deco), 3 braziers, 2
// chests, shadow pools that punish standing in the dark, and a gated boss
// arena in the north. All positions are seeded so a seed replays the map.
import { WORLD_W, WORLD_H, WORLD } from './config.js';
import { Rng } from './random.js';

export function genRealmMap(rng, realmDef, realmIndex) {
  const obstacles = [];
  const deco = realmDef.deco;
  // Border walls as obstacles so the player stays inside the arena.
  const W = WORLD_W, H = WORLD_H;
  obstacles.push({ x: 0, y: 0, w: W, h: 26, wall: true });
  obstacles.push({ x: 0, y: H - 26, w: W, h: 26, wall: true });
  obstacles.push({ x: 0, y: 0, w: 26, h: H, wall: true });
  obstacles.push({ x: W - 26, y: 0, w: 26, h: H, wall: true });
  // Scatter 10-14 interior obstacles, kept clear of the spawn and the boss gate.
  const nOb = 10 + rng.int(0, 4);
  let guard = 0;
  while (obstacles.length < nOb + 4 && guard++ < 200) {
    const w = rng.range(50, 130), h = rng.range(50, 110);
    const x = rng.range(90, W - 90 - w), y = rng.range(220, H - 120 - h);
    if (Math.hypot(x + w / 2 - W / 2, y + h / 2 - (H - 90)) < 190) continue; // spawn clear
    if (Math.hypot(x + w / 2 - W / 2, y + h / 2 - 130) < 220) continue; // boss gate clear
    let overlap = false;
    for (const o of obstacles) {
      if (x < o.x + o.w + 60 && x + w + 60 > o.x && y < o.y + o.h + 60 && y + h + 60 > o.y) { overlap = true; break; }
    }
    if (!overlap) obstacles.push({ x, y, w, h, deco });
  }
  // 3 braziers in a loose triangle, far apart so the player must explore.
  const braziers = [
    { x: rng.range(160, 520), y: rng.range(300, 620), lit: false, id: 0 },
    { x: rng.range(W - 520, W - 160), y: rng.range(300, 620), lit: false, id: 1 },
    { x: rng.range(W / 2 - 260, W / 2 + 260), y: rng.range(520, 880), lit: false, id: 2 },
  ];
  // 2 chests with embers / oil.
  const chests = [];
  for (let i = 0; i < WORLD.chestsPerRealm; i++) {
    chests.push({ x: rng.range(140, W - 140), y: rng.range(260, H - 140), opened: false, id: i });
  }
  // Shadow pools: standing in one with the beam off drains HP.
  const pools = [];
  for (let i = 0; i < WORLD.shadowPoolsPerRealm; i++) {
    pools.push({ x: rng.range(160, W - 160), y: rng.range(300, H - 160), r: rng.range(55, 85), id: i });
  }
  // Decorative scatter (reeds / crystals / embers) for visual richness.
  const scatter = [];
  for (let i = 0; i < 90; i++) {
    scatter.push({ x: rng.range(40, W - 40), y: rng.range(40, H - 40), k: rng.int(0, 2), s: rng.range(2, 5) });
  }
  return {
    w: W, h: H, obstacles, braziers, chests, pools, scatter,
    spawn: { x: W / 2, y: H - 110 },
    bossGate: { x: W / 2, y: 120, r: 90 }, // boss arena circle in the north
    shardPedestal: { x: W / 2, y: 120 },
    realmIndex,
  };
}

// Circle-vs-rect obstacle resolution: push the circle out, return true if hit.
export function collideObstacles(x, y, r, obstacles) {
  let hit = false;
  for (const o of obstacles) {
    const cx = Math.max(o.x, Math.min(x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(y, o.y + o.h));
    const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = (r - d) / d;
      x += dx * push; y += dy * push;
    }
  }
  return { x, y, hit };
}

export function pointBlocked(x, y, obstacles) {
  for (const o of obstacles) {
    if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return true;
  }
  return false;
}
