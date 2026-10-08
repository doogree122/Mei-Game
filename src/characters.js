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
  look: 'painted', // painted body and head (src/painted.js), hands from a picture
  fallbackLook: 'warrior', // drawn version, until the picture pieces load
  scale: 2.0, // the taller of the two
  paint: {
    tunic: [[118, 72, 22], [196, 140, 44], [236, 190, 86]], // dark, mid, light
    black: [[6, 6, 8], [30, 28, 30], [78, 72, 70]],
    belt: [[10, 10, 12], [44, 42, 44], [96, 92, 92]],
    sash: [[50, 50, 56], [118, 118, 126], [196, 196, 204]],
    badge: [[150, 110, 40], [246, 214, 130]],
    skin: [[70, 40, 30], [118, 72, 50], [160, 106, 78]],
    shoe: [[6, 6, 8], [34, 34, 40], [150, 150, 160]],
    legStripe: [164, 120, 44],
    widths: { hip: 11, knee: 7.2, ankle: 5.2, shoulder: 6.8, elbow: 5.8, wrist: 4.6, neck: 5 },
    legSwell: { thigh: { front: [0.4, 0.4], back: [0.6, 0.25] }, shin: { back: [0.3, 0.4] } },
    torsoBack: [[-0.12, -11], [0, -14], [0.15, -13.2], [0.34, -11.8], [0.55, -11.8], [0.8, -11.8], [0.94, -9.2], [1.04, -4.8]],
    torsoFront: [[-0.12, 8.5], [0.1, 10.8], [0.34, 11.4], [0.52, 11.8], [0.66, 12.8], [0.8, 11.8], [0.92, 8.2], [1.04, 4.6]],
    torso: ['tunic', 'tunic'],
    torsoLayers: [
      { shape: [[1.1, -12], [1.1, 6], [0.92, 7.5], [0.86, 2], [0.83, -13]], fabric: ['black', 'cloth'] }, // shoulder yoke
      { shape: [[0.82, -15], [0.8, -8.5], [0.6, -7.6], [0.33, -8], [0.3, -15]], fabric: ['black', 'cloth'] }, // side panel
      { shape: [[0.21, -16], [0.21, 16], [-0.4, 16], [-0.4, -16]], fabric: ['black', 'cloth'] }, // trousers
      { shape: [[0.335, -16], [0.335, 16], [0.2, 16], [0.2, -16]], fabric: ['belt', 'cloth'] }, // wide belt
      { shape: [[1.07, -1], [0.34, 15], [0.22, 15], [0.22, 7], [0.95, -11]], fabric: ['sash', 'sash'], grain: 0.24, strength: 1 }, // baldric
    ],
    torsoLines: [{ pts: [[1.07, -1], [0.34, 15]], color: [30, 30, 34], width: 0.45 }, { pts: [[0.95, -11], [0.22, 7]], color: [30, 30, 34], width: 0.45 }],
    torsoBadges: [{ shape: [[0.86, 6.2], [0.74, 9.4], [0.77, 7.6], [0.73, 5.6]], colors: [[150, 110, 40], [246, 214, 130]] }],
    arm: ['tunic', 'tunic'],
    leg: ['black', 'cloth'],
    foot: 'shoe',
    hands: { front: 'fist', back: 'fist', shot: 'phaserHand' },
    // A black stand-up collar with a gold edge.
    collarFabric: ['black', 'cloth'],
    collarTrim: [164, 120, 44],
    collar: [[0.96, -7.6], [1.08, -6.2], [1.15, -2.6], [1.15, 1.6], [1.09, 4.8], [0.95, 6.2], [0.92, 2], [0.94, -2], [0.92, -6]],
    collarTop: [[1.08, -6.2], [1.15, -2.6], [1.15, 1.6], [1.09, 4.8]],
    grain: 0.3,
    pieceScale: 0.2, // hands
    neckLift: 3,
    face: {
      style: 'klingon',
      size: 1.9,
      drop: 4,
      skin: [[70, 40, 30], [118, 72, 50], [160, 106, 78]],
      ridge: [150, 100, 82],
      hair: [[20, 12, 10], [50, 32, 24], [100, 70, 54]],
      beard: [52, 32, 24],
    },
  },
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
  look: 'painted', // painted body with head and fists from a picture (src/painted.js)
  fallbackLook: 'agent', // drawn version, until the picture pieces load
  paint: {
    suit: [[22, 38, 78], [46, 78, 138], [100, 140, 202]], // dark, mid, light
    sleeve: [[86, 90, 102], [138, 142, 152], [192, 196, 204]],
    skin: [[176, 120, 104], [220, 168, 150], [240, 200, 184]], // neck, matching the painted face
    sole: [24, 26, 38],
    // Limb radii at each joint, in skeleton units.
    widths: { hip: 9.4, knee: 5.8, ankle: 3.1, shoulder: 5.0, elbow: 4.0, wrist: 3.0, neck: 3.0 },
    // Torso outline as [t, x]: t from hip (0) to neck (1), x forward (+) or back (-).
    torsoBack: [[-0.12, -9], [0, -13], [0.15, -12], [0.34, -7.6], [0.55, -8], [0.8, -9], [0.94, -6.8], [1.04, -3.6]],
    torsoFront: [[-0.12, 6.8], [0.1, 8.6], [0.34, 6.9], [0.52, 8.8], [0.66, 12.6], [0.78, 10], [0.92, 6.4], [1.04, 3.4]],
    // Fabrics are [color set, texture].
    torso: ['suit', 'suit'],
    torsoLayers: [
      // The gray sleeve fabric wraps over the top of the back and shoulder.
      { shape: [[1.04, -3.6], [0.94, -7], [0.8, -9.1], [0.72, -8.4], [0.7, -3.6], [0.86, 0.6], [0.98, 2.9], [1.04, 3.4]], fabric: ['sleeve', 'sleeve'], smooth: true },
    ],
    torsoLines: [{ pts: [[0.46, -7.7], [0.42, -2.4], [0.36, 3.6], [0.38, 7]], color: [18, 30, 62], width: 0.5 }], // waist seam
    arm: ['sleeve', 'sleeve'],
    leg: ['suit', 'suit'],
    foot: 'heel',
    hands: { front: 'fist', back: 'borgFist' },
    collarFabric: ['sleeve', 'sleeve'],
    collarTrim: [46, 78, 138],
    // The suit's low round neckline: a thin band at the base of the neck, as a
    // closed loop, and its top edge.
    collar: [[0.97, -6.4], [1.03, -4.6], [1.05, -1.4], [1.03, 2], [0.99, 4.6], [0.94, 5.6], [0.97, 2], [0.99, -1.4], [0.97, -4.6]],
    collarTop: [[1.03, -4.6], [1.05, -1.4], [1.03, 2], [0.99, 4.6]],
    grain: 0.3, // texture tile pixels to skeleton units
    pieceScale: 0.19, // fists
    headScale: 0.19,
    neckLift: 3.5, // how far up the neck the head piece sits
    // Painted profile head (src/painted.js paintFace), colors from her photo.
    face: {
      size: 1.72, // skeleton units per head-frame unit
      drop: 4.5, // sits this much lower than the skeleton's head point (a shorter neck)
      skin: [[176, 120, 104], [226, 174, 156], [244, 206, 190]],
      hair: [[112, 84, 50], [186, 152, 100], [232, 204, 146]],
      brow: [150, 116, 80],
      iris: [96, 128, 146],
      lips: [182, 98, 86],
      implant: [[84, 90, 102], [170, 176, 188], [232, 236, 242]],
    },
  },
  scale: 2.0,
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
  return { ...char, colors: { ...char.colors, ...(char.altColors || {}) }, altFilter: char.look === 'cutout' || char.look === 'painted' ? 'hue-rotate(150deg) saturate(1.2)' : '' };
}
