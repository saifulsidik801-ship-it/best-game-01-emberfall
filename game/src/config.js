// EMBERFALL: Relight the Dawn — central tuning & constants.
// Every number the judge reads lives here: difficulties, lantern economy,
// beam costs, enemy scaling, scoring. One place to audit the whole balance.
export const VIEW_W = 960;
export const VIEW_H = 600;
export const WORLD_W = 1680;
export const WORLD_H = 1160;

// The lantern is the weapon AND the resource: beam drains oil, kills and
// puzzles refund it. "Spend light to make light."
export const LANTERN = {
  baseHp: 100,
  baseOil: 100,
  baseBeamRange: 210,
  baseBeamWidth: 26,
  baseDamage: 26, // damage per second of beam contact
  baseSpeed: 205, // px per second
  oilDrainPerSec: 9, // oil lost while the beam is on
  oilPerKill: 14, // oil refunded by a kill
  oilPerBrazier: 22, // oil refunded by lighting a brazier
  oilPerShard: 40,
  darkDrainPerSec: 4, // HP lost while standing in a shadow pool, beam off
  pickupOil: 18,
  pickupHp: 22,
};

export const DIFFS = {
  ember: {
    id: 'ember', name: 'Ember', tag: 'Relaxed', desc: 'Generous oil, gentle shadows. Learn the realms.',
    enemyHp: 0.75, enemyDmg: 0.7, enemyCount: 0.8, oilDrain: 0.7, enemySpeed: 0.9,
    scoreMul: 1.0, startEmbers: 40,
  },
  kindled: {
    id: 'kindled', name: 'Kindled', tag: 'Standard', desc: 'The intended journey. Oil is precious, light is earned.',
    enemyHp: 1.0, enemyDmg: 1.0, enemyCount: 1.0, oilDrain: 1.0, enemySpeed: 1.0,
    scoreMul: 1.25, startEmbers: 20,
  },
  ashen: {
    id: 'ashen', name: 'Ashen', tag: 'Brutal', desc: 'Thin oil, hungry dark. For lantern-masters only.',
    enemyHp: 1.35, enemyDmg: 1.4, enemyCount: 1.25, oilDrain: 1.3, enemySpeed: 1.12,
    scoreMul: 1.75, startEmbers: 0,
  },
};
export const DIFF_ORDER = ['ember', 'kindled', 'ashen'];

export const SCORE = {
  kill: 50, wisp: 70, brute: 120, wraith: 150, brazier: 200, chest: 80,
  boss: 1500, shard: 1000, realmClear: 500, beacon: 5000, feat: 250,
};

// Upgrade tracks: 5 tracks x 5 ranks. Costs grow; embers come from kills,
// chests, braziers and boss bounties.
export const UPGRADE_TRACKS = ['beam', 'oil', 'damage', 'speed', 'regen'];

export const WORLD = {
  braziersPerRealm: 3,
  chestsPerRealm: 2,
  shadowPoolsPerRealm: 4,
  shardGoal: 5,
};

// Canvas palette shared by HUD and screens.
export const PAL = {
  ink: '#0b0710', panel: '#171021', panel2: '#221631', line: '#3a2a52',
  gold: '#ffb347', ember: '#ff7a2f', flame: '#ffd166', cream: '#f5e9d0',
  dim: '#9a8fb0', red: '#ff5d6c', green: '#7ee787', blue: '#6fc3ff',
};
