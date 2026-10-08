// Character roster. Appearance is data-driven: `look` picks the body renderer in
// render.js and `colors` is its palette, so variants are just new color sets.
const CHARACTERS = {
  fett: {
    id: 'fett',
    name: 'B. FETT',
    blurb: 'Jetpack · blaster bolt',
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
  blurb: 'Heavy hitter · pulse blaster',
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

CHARACTERS.vader = {
  id: 'vader',
  name: 'VADER',
  blurb: 'Lightsaber · force lightning',
  look: 'sith', // black-armored, caped saber wielder
  scale: 2.05,
  projectile: 'lightning', // special shoots lightning from his free hand
  colors: {
    black: '#16161c',
    blackShade: '#0b0b10',
    blackLight: '#3c3f4a',
    armorGray: '#7c818c',
    armorGrayLight: '#c0c5ce',
    cape: '#101015',
    capeLight: '#2a2a34',
    helmetLight: '#565a66',
    lens: '#3a1414',
    grille: '#a2a8b2',
    chestBox: '#55585f',
    saber: '#ff2a2a',
    saberCore: '#ffe4e4',
    hilt: '#c9ccd2',
    energy: '#a8dcff',
  },
  altColors: {
    black: '#3a181d', blackShade: '#22100f', blackLight: '#6a3a40', cape: '#2a0d10', capeLight: '#4a1c22',
    saber: '#3a8bff', saberCore: '#e4f0ff', energy: '#ff9de2',
  },
  // Punch swings the lightsaber: long reach, a little slower.
  moves: {
    punch: { pose: 'saberSwing', limb: 'saberTip', radius: 18, damage: 8, startup: 6, active: 4, recovery: 13, sound: 'heavy', sfx: 'saber' },
    special: { pose: 'forceLightning', spawnLimb: 'handB', sfx: 'lightning' },
    uppercut: { radius: 22, sfx: 'saber' }, // a rising saber slash
  },
  shot: { speed: 10, radius: 20, damage: 11, hitstun: 22 },
  // Slow and heavy.
  stats: {
    walk: 4.0,
    backWalk: 3.0,
    jumpV: 14.5,
    jumpVX: 5.4,
    power: 1.15,
  },
};

CHARACTERS.seven = {
  id: 'seven',
  name: 'SEVEN',
  blurb: 'High kick · laser rifle',
  look: 'cutout', // body parts cut from a picture (src/cutout-seven.js)
  fallbackLook: 'agent', // drawn version: catsuited officer with an eye implant
  scale: 1.85,
  projectile: 'laser', // special fires a big red laser blast from her rifle
  colors: {
    suit: '#2b2f86',
    suitShade: '#1c1f5c',
    suitLight: '#4b52c4',
    rimPink: '#e04fd6',
    rimCyan: '#4fe0f0',
    skin: '#f2cdb0',
    skinShade: '#d6a487',
    skinLight: '#fbe3cf',
    skinDark: '#a8735a',
    hair: '#d99a4e',
    hairShade: '#a8622f',
    hairLight: '#f4c27c',
    implant: '#bfc5ce',
    implantDark: '#5d636d',
    eyes: '#3a6ea8',
    lips: '#c26a6a',
    boot: '#15162e',
    bootShine: '#5a5f8a',
    rifle: '#8c919b', // gray phaser rifle
    rifleLight: '#c5cad2',
    rifleDark: '#4b4f58',
    energy: '#ff3a3a',
  },
  altColors: {
    suit: '#5a1f6e', suitShade: '#3b1349', suitLight: '#8a3fa8', rimPink: '#ffb347', rimCyan: '#7dffb0',
    hair: '#3a2a22', hairShade: '#22160f', hairLight: '#5a4030', energy: '#ffd23a',
  },
  // Phaser rifle: resting over her shoulder (hand by the shoulder, free hand
  // up in guard), brought down two-handed to aim when she fires.
  armPose: { uaF: 0.35, faF: 2.95, uaB: 0.45, faB: 2.35 },
  aimPose: { uaF: 0.55, faF: 1.75, uaB: 1.05, faB: 1.85 },
  // Her kick goes above head height (short reach, wide hit zone).
  moves: {
    kick: { pose: 'highKick', radius: 30, damage: 11, startup: 8, active: 4, recovery: 16, lunge: 3.5 },
    special: { sfx: 'laser' },
  },
  shot: { speed: 9, radius: 22, damage: 13 },
  // Quick on her feet.
  stats: {
    walk: 5.4,
    backWalk: 4.0,
    jumpV: 16,
    jumpVX: 6.6,
    power: 1,
  },
};

CHARACTERS.fett.altColors = {
  armor: '#3a6ea8', armorShade: '#24497a', armorLight: '#7fb2e8', pack: '#3a6ea8', packShade: '#24497a',
  packLight: '#7fb2e8', rocket: '#4f86c4', rocketShade: '#24497a', rocketLight: '#b8d8ff', accent: '#e8e8ec',
  accentShade: '#a8a8b0', accentLight: '#ffffff',
};
CHARACTERS.worf.altColors = {
  tunic: '#c0392b', tunicShade: '#8e2a1f', tunicLight: '#e8604f', sash: '#d4af37', sashShade: '#9c7c16',
  sashLight: '#ffe07a', sashDark: '#6b5410',
};

// Order on the character select screen.
const ROSTER = ['fett', 'worf', 'vader', 'seven'];

// The character as player 2 sees it in a mirror match: same fighter, alternate colors.
function altVersion(char) {
  return { ...char, colors: { ...char.colors, ...(char.altColors || {}) }, altFilter: char.look === 'cutout' ? 'hue-rotate(150deg) saturate(1.2)' : '' };
}
