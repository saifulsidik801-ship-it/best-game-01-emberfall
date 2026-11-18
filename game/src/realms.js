// The five realms. Each has its own palette, ground texture, enemy mix,
// boss, flavor text and a light-puzzle twist — the world map branches
// between them in order, and Endless mode cycles them with rising power.
export const REALMS = [
  {
    id: 'ashen-moor', name: 'Ashen Moor', sub: 'Realm I — The Drowned Fields',
    flavor: 'Grey rain, dead reeds, and shades that walk the fog. The first Shard sleeps in the old chapel.',
    sky: '#1a1420', ground: '#241c26', ground2: '#2e2430', accent: '#ffb347', glow: '#ff9a3d',
    fog: 'rgba(154,143,176,0.10)', deco: 'reed',
    enemies: ['shade', 'shade', 'crawler', 'wisp'],
    bossId: 'chapel-warden', twist: 'Fog is thick — the lantern radius is 15% smaller here.',
    tip: 'Shades melt fast in a steady beam. Do not chase them into the fog.',
  },
  {
    id: 'glasswood', name: 'Glasswood', sub: 'Realm II — The Singing Trees',
    flavor: 'Crystal trees catch your light and throw it back in shards. Wisps nest in the branches.',
    sky: '#0e1a24', ground: '#16262b', ground2: '#1d3238', accent: '#6fc3ff', glow: '#7fd4ff',
    fog: 'rgba(111,195,255,0.08)', deco: 'crystal',
    enemies: ['wisp', 'wisp', 'shade', 'crawler'],
    bossId: 'prism-stag', twist: 'Crystal trees reflect your beam — stray light can light braziers from afar.',
    tip: 'Wisps shoot back. Strafe while you burn them down.',
  },
  {
    id: 'sunken-choir', name: 'Sunken Choir', sub: 'Realm III — The Flooded Nave',
    flavor: 'A drowned cathedral hums below the waterline. The choir never stopped singing — it only went dark.',
    sky: '#0a1a1c', ground: '#12292c', ground2: '#173538', accent: '#7ee7c7', glow: '#5fe8c0',
    fog: 'rgba(126,231,199,0.08)', deco: 'pillar',
    enemies: ['wraith', 'wisp', 'shade', 'brute'],
    bossId: 'choir-mother', twist: 'Water slows you 10%, but kills refund +4 oil here.',
    tip: 'Wraiths blink. Keep the beam sweeping — a blink leaves a trail of embers.',
  },
  {
    id: 'ember-peaks', name: 'Ember Peaks', sub: 'Realm IV — The Burning Stair',
    flavor: 'Volcanic switchbacks above a sea of fire. Brutes guard the stair; the air itself burns oil faster.',
    sky: '#220f08', ground: '#2b1710', ground2: '#3a1e12', accent: '#ff7a2f', glow: '#ff5d2f',
    fog: 'rgba(255,122,47,0.09)', deco: 'rock',
    enemies: ['brute', 'brute', 'crawler', 'wraith'],
    bossId: 'cinder-tyrant', twist: 'Thin mountain air: beam drains +20% oil, but braziers refund +10.',
    tip: 'Brutes are slow. Kite them around the rocks and burn them from range.',
  },
  {
    id: 'the-hollow', name: 'The Hollow', sub: 'Realm V — The Heart of Night',
    flavor: 'The dark has a heart, and it beats. Everything you have learned is tested here, in one room.',
    sky: '#120a18', ground: '#1c1024', ground2: '#251530', accent: '#c78bff', glow: '#b46bff',
    fog: 'rgba(183,107,255,0.10)', deco: 'obelisk',
    enemies: ['wraith', 'brute', 'wisp', 'shade', 'crawler'],
    bossId: 'hollow-king', twist: 'The dark fights back: enemies regenerate slowly while unlit.',
    tip: 'Do not let the King out of the light. An unlit enemy is a healing enemy.',
  },
];

export const BEACON = {
  name: 'The Great Beacon',
  flavor: 'Five Shards, one dawn. Carry them home and light the tower that the night swallowed.',
};
