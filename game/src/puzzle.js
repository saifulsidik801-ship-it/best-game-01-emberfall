// Light puzzles: 3 braziers per realm. A brazier lights when the beam
// touches it for a short dwell; lighting one refunds oil and embers, and
// lighting all three opens the boss gate. This is the "spend light to make
// light" loop in puzzle form — the beam costs oil, the puzzle pays it back.
import { LANTERN } from './config.js';
import { dist } from './random.js';

export function brazierHitTest(brazier, px, py, aim, range, width) {
  if (brazier.lit) return 0;
  const dx = brazier.x - px, dy = brazier.y - py;
  const d = Math.hypot(dx, dy);
  if (d > range + 26) return 0;
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(ang - aim);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  const spread = Math.atan2(width / 2 + 14, Math.max(30, d));
  return diff < spread ? 1 : 0;
}

// Called while the beam is on: returns braziers newly lit this frame.
export function updateBraziers(state, dt) {
  const litNow = [];
  const p = state.realm.player;
  const stats = state.stats;
  for (const b of state.realm.map.braziers) {
    if (b.lit) continue;
    if (brazierHitTest(b, p.x, p.y, p.aim, stats.beamRange, stats.beamWidth)) {
      b.dwell = (b.dwell || 0) + dt;
      if (b.dwell >= 0.45) {
        b.lit = true;
        litNow.push(b);
      }
    } else {
      b.dwell = 0;
    }
  }
  return litNow;
}

export function braziersLitCount(map) { return map.braziers.filter((b) => b.lit).length; }
export function allBraziersLit(map) { return map.braziers.every((b) => b.lit); }
export function brazierReward(state) {
  return LANTERN.oilPerBrazier + (state.relicMods.brazierOil || 0);
}
