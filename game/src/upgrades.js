// Lantern upgrades: 5 tracks, 5 ranks each. Bought with embers between
// realms (and after a boss, at the shard shrine). Costs rise per rank;
// every rank is a visible, named improvement, never a hidden number.
import { LANTERN } from './config.js';

export const UPGRADES = [
  {
    id: 'beam', name: 'Long Beam', icon: '➶', max: 5,
    desc: '+28 beam range per rank. Reach braziers and bosses from farther away.',
    cost: (lvl) => 40 + lvl * 45,
    apply: (lvl) => ({ beamRange: lvl * 28 }),
  },
  {
    id: 'oil', name: 'Deep Flask', icon: '⚱', max: 5,
    desc: '+25 max oil per rank. Burn longer before the dark closes in.',
    cost: (lvl) => 35 + lvl * 40,
    apply: (lvl) => ({ maxOil: lvl * 25 }),
  },
  {
    id: 'damage', name: 'White Flame', icon: '✦', max: 5,
    desc: '+8 beam damage/sec per rank. Melt shades and bosses faster.',
    cost: (lvl) => 45 + lvl * 50,
    apply: (lvl) => ({ damage: lvl * 8 }),
  },
  {
    id: 'speed', name: 'Swift Wick', icon: '»', max: 5,
    desc: '+6% move speed per rank. Outrun brutes, kite wraiths.',
    cost: (lvl) => 30 + lvl * 35,
    apply: (lvl) => ({ speedMul: 1 + lvl * 0.06 }),
  },
  {
    id: 'regen', name: 'Ember Heart', icon: '♥', max: 5,
    desc: '+0.9 oil/sec regeneration per rank, even while the beam is dark.',
    cost: (lvl) => 40 + lvl * 45,
    apply: (lvl) => ({ regen: lvl * 0.9 }),
  },
];

export function upgradeById(id) { return UPGRADES.find((u) => u.id === id); }

// Effective lantern stats from base + upgrade ranks + relic modifiers.
export function computeStats(upgrades, relicMods) {
  const s = {
    maxHp: LANTERN.baseHp + (relicMods.maxHp || 0),
    maxOil: LANTERN.baseOil + (relicMods.maxOil || 0),
    beamRange: LANTERN.baseBeamRange + (relicMods.beamRange || 0),
    beamWidth: LANTERN.baseBeamWidth + (relicMods.beamWidth || 0),
    damage: LANTERN.baseDamage,
    speed: LANTERN.baseSpeed * (relicMods.speed || 1),
    regen: 0,
  };
  for (const u of UPGRADES) {
    const lvl = upgrades[u.id] || 0;
    if (!lvl) continue;
    const a = u.apply(lvl);
    if (a.beamRange) s.beamRange += a.beamRange;
    if (a.maxOil) s.maxOil += a.maxOil;
    if (a.damage) s.damage += a.damage;
    if (a.speedMul) s.speed *= a.speedMul;
    if (a.regen) s.regen += a.regen;
  }
  return s;
}
