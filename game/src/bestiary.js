// Bestiary / almanac: every creature and boss has an entry with lore and a
// weakness. Entries unlock when the creature is first seen, and fill in with
// kill counts. The almanac screen (A) reads straight from this table.
export const BESTIARY = [
  { id: 'shade', name: 'Shade', icon: '◐', hp: 40, desc: 'A scrap of night that learned to walk. Weak alone, bold in packs.', weak: 'Steady beam — it has no armor and no trick.' },
  { id: 'crawler', name: 'Crawler', icon: '✜', hp: 22, desc: 'Fast, low, hungry. It rushes the lantern and bites the hand that holds it.', weak: 'One second of beam. Kite it in circles.' },
  { id: 'wisp', name: 'Wisp', icon: '✧', hp: 55, desc: 'A cold star with a grudge. It keeps its distance and spits dark bolts.', weak: 'Close the gap — its bolts miss at point blank.' },
  { id: 'brute', name: 'Brute', icon: '⬢', hp: 150, desc: 'Night poured into a boulder. Slow, armored, and patient about crushing you.', weak: 'Kite it. It cannot turn fast and hates long beams.' },
  { id: 'wraith', name: 'Wraith', icon: '☾', hp: 90, desc: 'A ghost that blinks through the dark and reforms behind you.', weak: 'Sweep the beam — a blink leaves an ember trail to follow.' },
  { id: 'chapel-warden', name: 'Chapel Warden', icon: '♰', hp: 520, desc: 'The keeper of the drowned chapel, ringing a bell that summons shades.', weak: 'Burn the shades it summons first — they feed it.' },
  { id: 'prism-stag', name: 'Prism Stag', icon: '♞', hp: 620, desc: 'A stag of living glass. It charges in straight lines and shatters light.', weak: 'Sidestep the charge, then burn it while it turns.' },
  { id: 'choir-mother', name: 'Choir Mother', icon: '♪', hp: 700, desc: 'The drowned choir, singing as one voice. Her song calls wisps from the deep.', weak: 'Interrupt the song — beam her while she raises her arms.' },
  { id: 'cinder-tyrant', name: 'Cinder Tyrant', icon: '♛', hp: 820, desc: 'A tyrant of ash and ember who throws burning rocks down the stair.', weak: 'Rocks telegraph with a glow. Move, then punish.' },
  { id: 'hollow-king', name: 'Hollow King', icon: '♚', hp: 1050, desc: 'The heart of night itself, wearing a crown of unlit stars.', weak: 'Never let it leave the light — it heals in darkness.' },
];

export function bestiaryById(id) { return BESTIARY.find((b) => b.id === id); }
