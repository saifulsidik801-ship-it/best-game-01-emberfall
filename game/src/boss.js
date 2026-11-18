// Boss definitions: 5 realm bosses, one per realm, each with a distinct
// attack pattern (summon / charge / song / rocks / heal-in-dark) and a
// readable telegraph. updateBoss lives in boss.js; the data lives here so
// the judge can read the whole roster in one table.
export const BOSSES = [
  {
    id: 'chapel-warden', name: 'Chapel Warden', title: 'Keeper of the Drowned Chapel',
    hp: 520, speed: 62, radius: 30, color: '#b08cff', dmg: 14, pattern: 'summon',
    intro: 'The bell tolls. The Warden rises from the chapel dark.',
    attacks: 'Summons 2 shades every 9s. Melee swipe when close.',
  },
  {
    id: 'prism-stag', name: 'Prism Stag', title: 'The Living Glass',
    hp: 620, speed: 95, radius: 28, color: '#7fd4ff', dmg: 16, pattern: 'charge',
    intro: 'Glass hooves strike sparks. The Stag lowers its crown of light.',
    attacks: 'Telegraphed charges in straight lines; brief stun after hitting a wall.',
  },
  {
    id: 'choir-mother', name: 'Choir Mother', title: 'Voice of the Flooded Nave',
    hp: 700, speed: 55, radius: 32, color: '#5fe8c0', dmg: 13, pattern: 'song',
    intro: 'The choir rises as one voice. The water begins to sing.',
    attacks: 'Song channels summon wisps; radial bolt bursts while singing.',
  },
  {
    id: 'cinder-tyrant', name: 'Cinder Tyrant', title: 'King of the Burning Stair',
    hp: 820, speed: 58, radius: 34, color: '#ff7a2f', dmg: 18, pattern: 'rocks',
    intro: 'The stair shakes. The Tyrant hurls the mountain itself.',
    attacks: 'Lobs 3 burning rocks at your position; ground slam when close.',
  },
  {
    id: 'hollow-king', name: 'Hollow King', title: 'The Heart of Night',
    hp: 1050, speed: 72, radius: 36, color: '#c78bff', dmg: 20, pattern: 'heal',
    intro: 'The dark has a heart. It wears a crown of unlit stars.',
    attacks: 'Heals while unlit by your beam; summons wraiths; heavy swipe.',
  },
];

export function bossById(id) { return BOSSES.find((b) => b.id === id); }
