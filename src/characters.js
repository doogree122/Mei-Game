// Character roster. Appearance is data-driven: `look` picks the body renderer in
// render.js and `colors` is its palette, so variants are just new color sets.
const CHARACTERS = {
  fett: {
    id: 'fett',
    name: 'B. FETT',
    look: 'armored', // jetpack bounty hunter
    scale: 1.9,
    projectile: 'bolt', // special fires a blaster bolt
    colors: {
      suit: '#a2a4ac', // gray flight suit
      suitShade: '#74767f',
      suitLight: '#d4d6dc',
      armor: '#2f9e48', // green armor
      armorShade: '#1d6c31',
      armorLight: '#72d27e',
      accent: '#f2cf1d', // yellow pads
      accentShade: '#c0980c',
      accentLight: '#fff28c',
      visor: '#101216',
      visorFrame: '#8e1b14', // dark red visor frame and band
      visorFrameLight: '#c4382c',
      helmetGold: '#cdb877', // rangefinder housing
      helmetGoldShade: '#8f7b45',
      glove: '#d2d3d8',
      gloveShade: '#9a9ca3',
      boot: '#34353b',
      belt: '#5c3b1e',
      beltShade: '#3a2410',
      pack: '#2f9e48', // green jetpack
      packShade: '#1d6c31',
      packLight: '#72d27e',
      rocket: '#3fae5a',
      rocketShade: '#1d6c31',
      rocketLight: '#a3e8ad',
      metal: '#24252b',
      metalLight: '#b9bbc2',
      energy: '#ff7a2a',
    },
    stats: {
      walk: 5.0,
      backWalk: 3.7,
      jumpV: 15.5,
      jumpVX: 6.2,
      power: 1,
    },
  },
};

CHARACTERS.worf = {
  id: 'worf',
  name: 'WORF',
  look: 'warrior', // ridge-browed alien officer
  scale: 2.0, // the taller of the two
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
    walk: 4.5,
    backWalk: 3.3,
    jumpV: 15,
    jumpVX: 5.8,
    power: 1.1,
  },
};
