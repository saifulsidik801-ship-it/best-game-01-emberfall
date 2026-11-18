// 12 passive relics. Boss kills offer a choice of 3; each relic changes the
// lantern economy or combat in a readable way. Stacking is allowed and the
// HUD lists every owned relic with its icon.
export const RELICS = [
  { id: 'sunspore', name: 'Sunspore', icon: '☀', desc: '+25% oil refunded by kills.', mods: { oilRefund: 1.25 } },
  { id: 'longwick', name: 'Longwick', icon: '➶', desc: '+30 beam range.', mods: { beamRange: 30 } },
  { id: 'wideflame', name: 'Wideflame', icon: '◉', desc: '+10 beam width — sweep crowds.', mods: { beamWidth: 10 } },
  { id: 'heartcoal', name: 'Heartcoal', icon: '♥', desc: '+30 max HP.', mods: { maxHp: 30 } },
  { id: 'deepflask', name: 'Deepflask', icon: '⚱', desc: '+30 max oil.', mods: { maxOil: 30 } },
  { id: 'swiftsole', name: 'Swiftsole', icon: '»', desc: '+12% move speed.', mods: { speed: 1.12 } },
  { id: 'kindling', name: 'Kindling', icon: '✦', desc: 'Braziers refund +15 oil.', mods: { brazierOil: 15 } },
  { id: 'thorns', name: 'Thornlight', icon: '✷', desc: 'Enemies touching you take 12 dmg/s.', mods: { thorns: 12 } },
  { id: 'secondwind', name: 'Second Wind', icon: '↻', desc: 'Once per realm: survive a fatal hit at 1 HP.', mods: { secondWind: true } },
  { id: 'greedember', name: 'Greedember', icon: '◆', desc: '+50% embers from all sources.', mods: { emberMul: 1.5 } },
  { id: 'frostwick', name: 'Frostwick', icon: '❄', desc: 'Beam slows enemies 35% while lit.', mods: { slow: 0.35 } },
  { id: 'phoenix', name: 'Phoenix Down', icon: '♨', desc: 'Kills heal +3 HP.', mods: { killHeal: 3 } },
];

export function relicById(id) { return RELICS.find((r) => r.id === id); }

// Aggregate owned-relic modifiers into one object the combat code reads.
export function aggregateRelics(ownedIds) {
  const m = { oilRefund: 1, beamRange: 0, beamWidth: 0, maxHp: 0, maxOil: 0, speed: 1, brazierOil: 0, thorns: 0, secondWind: false, emberMul: 1, slow: 0, killHeal: 0 };
  for (const id of ownedIds) {
    const r = relicById(id);
    if (!r) continue;
    if (r.mods.oilRefund) m.oilRefund *= r.mods.oilRefund;
    if (r.mods.beamRange) m.beamRange += r.mods.beamRange;
    if (r.mods.beamWidth) m.beamWidth += r.mods.beamWidth;
    if (r.mods.maxHp) m.maxHp += r.mods.maxHp;
    if (r.mods.maxOil) m.maxOil += r.mods.maxOil;
    if (r.mods.speed) m.speed *= r.mods.speed;
    if (r.mods.brazierOil) m.brazierOil += r.mods.brazierOil;
    if (r.mods.thorns) m.thorns += r.mods.thorns;
    if (r.mods.secondWind) m.secondWind = true;
    if (r.mods.emberMul) m.emberMul *= r.mods.emberMul;
    if (r.mods.slow) m.slow = Math.max(m.slow, r.mods.slow);
    if (r.mods.killHeal) m.killHeal += r.mods.killHeal;
  }
  return m;
}

export function randomRelicChoices(rng, ownedIds, n = 3) {
  const pool = RELICS.filter((r) => !ownedIds.includes(r.id));
  return rng.shuffle(pool).slice(0, Math.min(n, pool.length));
}
