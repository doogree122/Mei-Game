// Character roster. Appearance is data-driven: `look` picks the body renderer in
// render.js and `colors` is its palette, so variants are just new color sets.
const CHARACTERS = {
  mei: {
    id: 'mei',
    name: 'MEI',
    look: 'armored', // jetpack bounty hunter
    scale: 1.25,
    projectile: 'bolt', // special fires a blaster bolt
    colors: {
      suit: '#3d4f7a',
      suitShade: '#2b3858',
      suitLight: '#8a93d6',
      armor: '#4e8a3e',
      armorShade: '#33612a',
      armorLight: '#8cc65a',
      accent: '#e0522a',
      accentShade: '#a33a1c',
      accentLight: '#ff9a4d',
      visor: '#12151c',
      glove: '#2a2d36',
      boot: '#2a2f3d',
      pack: '#8d929c',
      packShade: '#5c616b',
      packLight: '#c3c8d2',
      rocket: '#b4b0e6',
      rocketShade: '#7c77b8',
      rocketLight: '#e6e4ff',
      metal: '#3a3e47',
      energy: '#ff7a2a',
    },
    stats: {
      walk: 3.4,
      backWalk: 2.5,
      jumpV: 13.5,
      jumpVX: 4.4,
      power: 1,
    },
  },
};

CHARACTERS.korr = {
  id: 'korr',
  name: 'KORR',
  look: 'warrior', // ridge-browed alien officer
  scale: 1.32, // the taller of the two
  projectile: 'pulse', // special fires a hand-blaster pulse
  victoryPose: 'armsCrossed',
  colors: {
    skin: '#9a5f45',
    skinShade: '#6e3f2c',
    skinLight: '#c08462',
    skinDark: '#4a2a1c',
    lips: '#6a3a2a',
    hair: '#5a3820',
    hairLight: '#80562f',
    hairShade: '#3b2414',
    beard: '#3a2416',
    beardLight: '#5a3a24',
    eyes: '#140c08',
    tunic: '#d9a21e',
    tunicShade: '#a87914',
    tunicLight: '#f2c54a',
    black: '#272a33',
    blackShade: '#1b1d24',
    blackLight: '#454a58',
    sash: '#b8bdc6',
    sashShade: '#757b85',
    sashLight: '#e4e8ee',
    sashDark: '#4e535c',
    boot: '#16171c',
    bootShine: '#6a6f7a',
    device: '#5a5f69',
    deviceLight: '#9aa0ab',
    energy: '#ffb43a',
  },
  // Heavier hitter, a little slower on his feet.
  stats: {
    walk: 3.0,
    backWalk: 2.2,
    jumpV: 13,
    jumpVX: 4.2,
    power: 1.1,
  },
};
