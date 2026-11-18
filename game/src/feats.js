// Feats: optional challenges that pay embers + score and toast when earned.
// Checked every frame against the live run; each fires once per run.
export const FEATS = [
  { id: 'first-light', name: 'First Light', desc: 'Light your first brazier.', embers: 25, check: (r) => r.braziersLitTotal >= 1 },
  { id: 'slayer-10', name: 'Slayer X', desc: 'Defeat 10 creatures.', embers: 30, check: (r) => r.kills >= 10 },
  { id: 'slayer-50', name: 'Slayer L', desc: 'Defeat 50 creatures.', embers: 80, check: (r) => r.kills >= 50 },
  { id: 'full-oil', name: 'Brilliant', desc: 'Reach full oil while holding a Shard.', embers: 40, check: (r) => r.shards >= 1 && r.maxOilReached },
  { id: 'boss-clean', name: 'Untouched', desc: 'Beat a boss without taking damage.', embers: 100, check: (r) => r.bossNoDamage },
  { id: 'three-shards', name: 'Dawnbringer', desc: 'Collect 3 Ember Shards.', embers: 120, check: (r) => r.shards >= 3 },
  { id: 'rich', name: 'Ember Hoard', desc: 'Hold 300 embers at once.', embers: 60, check: (r) => r.embers >= 300 },
  { id: 'relic-3', name: 'Relic Hunter', desc: 'Own 3 relics.', embers: 60, check: (r) => r.relics.length >= 3 },
  { id: 'no-potion', name: 'Pure Flame', desc: 'Clear a realm without picking up an oil flask.', embers: 70, check: (r) => r.cleanRealm },
  { id: 'speed-realm', name: 'Swift Dawn', desc: 'Clear a realm in under 3 minutes.', embers: 70, check: (r) => r.fastRealmClear },
];

export function checkFeats(run, unlocked) {
  const fresh = [];
  for (const f of FEATS) {
    if (unlocked[f.id]) continue;
    try { if (f.check(run)) fresh.push(f); } catch (e) { /* bad check never blocks play */ }
  }
  return fresh;
}
