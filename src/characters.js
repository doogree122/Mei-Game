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
    muzzle: 34, // from his carbine's barrel
    muzzleY: -7,
    // Dark, weathered colors after the newer live-action armor.
    colors: {
      suit: '#3a3636', // charcoal flight suit
      suitShade: '#262323',
      suitLight: '#5a5452',
      armor: '#4a6646', // weathered olive-green armor
      armorShade: '#2f432d',
      armorLight: '#71896a',
      gauntlet: '#5e2a26', // maroon gauntlets
      gauntletShade: '#3e1b18',
      gauntletLight: '#86493f',
      accent: '#c98a2a', // ochre shoulder and knee pads
      accentShade: '#93611b',
      accentLight: '#e4b25c',
      visor: '#0c0d10',
      visorFrame: '#5e2422', // maroon visor frame and band
      visorFrameLight: '#82403a',
      helmetGold: '#8f7d55', // rangefinder housing
      helmetGoldShade: '#5f5236',
      glove: '#262628', // black gloves
      gloveShade: '#161617',
      boot: '#5c2a1e', // red-brown boots
      belt: '#6e3420',
      beltShade: '#4a2214',
      pack: '#4a6646', // olive jetpack
      packShade: '#2f432d',
      packLight: '#71896a',
      rocket: '#4f6b4a',
      rocketShade: '#2f432d',
      rocketLight: '#8aa080',
      metal: '#1a1b1f',
      metalLight: '#85878c',
      energy: '#ff7a2a',
    },
    // Move strength, 1 (weak) to 3 (strong): damage, knockback and how big the hit looks.
    ratings: { punch: 1, kick: 2, lowKick: 3, uppercut: 1, shot: 2 },
    // Force field: purple, stops shots and punches.
    field: { color: '#b46cff', style: 'bubble', blocks: ['shots', 'punches'] },
    // Jetpack: floaty jumps that hang in the air.
    stats: { walk: 5.0, backWalk: 3.8, jumpV: 14.6, jumpVX: 6.4, gravity: 0.8, power: 1 },
    // Jetpack flight: hold jump in the air to keep climbing to `ceiling`, then
    // hover there, steering left and right, for up to `frames` (3 seconds) per jump.
    flight: { frames: 180, ceiling: 150, climb: 4.5, speed: 5.5 },
  },
};

CHARACTERS.worf = {
  id: 'worf',
  name: 'WORF',
  blurb: 'Heavy hitter · phaser',
  look: 'painted', // painted body and head (src/painted.js), hands from a picture
  fallbackLook: 'warrior', // drawn version, until the picture pieces load
  scale: 2.14, // the tallest of Worf, Seven and Mando
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
    hands: { front: 'fist', back: 'fist', shot: 'phaser' },
    // The TNG hand phaser he fires: picture scale, and how far ahead of the wrist the fist grips it.
    phaser: { scale: 0.12, grip: 6, lift: 3.5 },
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
  projectile: 'pulse', // special fires a hand-phaser pulse
  muzzle: 33, // from the phaser's emitter
  muzzleY: -3,
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
  ratings: { punch: 2, kick: 2, lowKick: 1, uppercut: 3, shot: 1 },
  // Hidden move: back, jump, kick swings his bat'leth over his head.
  secrets: [{ input: ['b', 'u'], button: 'kick', move: 'batleth' }],
  // Force field: blue, stops shots only.
  field: { color: '#4aa8ff', style: 'bubble', blocks: ['shots'] },
  // Heavy and steady on his feet.
  stats: { walk: 4.4, backWalk: 3.2, jumpV: 14.8, jumpVX: 5.6, gravity: 1, power: 1 },
};

CHARACTERS.vader = {
  id: 'vader',
  name: 'VADER',
  blurb: 'Saber · Force lightning',
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
  ratings: { punch: 1, kick: 1, lowKick: 1, uppercut: 3, shot: 3 },
  // Hidden moves: directions (b back, f forward, d down) then a button.
  secrets: [{ input: ['b', 'b', 'd'], button: 'punch', move: 'forceChoke' }],
  // Force field: rippling Force lines that shove the opponent back. It blocks
  // nothing itself: shots go through.
  field: { color: '#8f6bff', style: 'force', blocks: [], repel: true },
  // Slow, heavy strides and a low jump.
  stats: { walk: 3.6, backWalk: 2.8, jumpV: 13.8, jumpVX: 5.0, gravity: 1.05, power: 1 },
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
    special: { sfx: 'phaser' },
  },
  shot: { speed: 9, radius: 22, damage: 13 },
  ratings: { punch: 1, kick: 3, lowKick: 2, uppercut: 3, shot: 2 },
  // Force field: a green Borg honeycomb, stops shots only.
  field: { color: '#56f08a', style: 'hex', blocks: ['shots'] },
  // Quickest on her feet, highest jump.
  stats: { walk: 5.8, backWalk: 4.4, jumpV: 16.2, jumpVX: 7.0, gravity: 1, power: 1 },
};

CHARACTERS.fett.altColors = {
  armor: '#2a4f79', armorShade: '#1a3558', armorLight: '#5b80a7', pack: '#2a4f79', packShade: '#1a3558',
  packLight: '#5b80a7', rocket: '#39608d', rocketShade: '#1a3558', rocketLight: '#849cb8', accent: '#a7a7aa',
  accentShade: '#79797f', accentLight: '#b8b8b8',
};
CHARACTERS.worf.altColors = {
  tunic: '#c0392b', tunicShade: '#8e2a1f', tunicLight: '#e8604f', sash: '#d4af37', sashShade: '#9c7c16',
  sashLight: '#ffe07a', sashDark: '#6b5410',
};

// The beskar-armored bounty hunter, painted entirely in code from a reference picture.
CHARACTERS.mando = {
  id: 'mando',
  name: 'MANDO',
  blurb: 'Beskar armor · blaster',
  look: 'painted',
  fallbackLook: 'armored',
  scale: 2.12, // as tall as Seven (her hair rises above his helmet's top), shorter than Worf
  projectile: 'bolt',
  muzzle: 30, // from his pistol's barrel
  muzzleY: -4,
  shot: { speed: 9, damage: 12 },
  paint: {
    suit: [[30, 22, 18], [64, 50, 42], [106, 86, 72]], // dark brown flight suit
    beskar: [[36, 38, 44], [112, 116, 124], [206, 210, 216]],
    leather: [[46, 28, 18], [98, 64, 42], [150, 106, 74]],
    boot: [[62, 40, 28], [118, 82, 56], [168, 126, 92]],
    shoe: [[40, 26, 18], [96, 66, 46], [170, 130, 100]],
    skin: [[14, 14, 16], [36, 34, 34], [72, 68, 66]], // the dark cowl under the helmet
    glove: [[16, 14, 14], [44, 40, 38], [96, 92, 88]],
    gun: [[14, 14, 16], [52, 52, 58], [120, 120, 128]],
    wood: [[34, 22, 16], [72, 48, 34], [120, 88, 64]],
    widths: { hip: 10.5, knee: 6.8, ankle: 5.0, shoulder: 6.4, elbow: 5.4, wrist: 4.2, neck: 4.8 },
    legSwell: { thigh: { front: [0.6, 0.4], back: [0.9, 0.25] }, shin: { back: [0.6, 0.35] } },
    torsoBack: [[-0.12, -10.5], [0, -13.4], [0.15, -12.6], [0.34, -11], [0.55, -11], [0.8, -11.4], [0.94, -9.2], [1.04, -4.8]],
    torsoFront: [[-0.12, 8.4], [0.1, 10.2], [0.34, 10.6], [0.52, 11.6], [0.66, 12.8], [0.8, 12.2], [0.92, 8.6], [1.04, 4.8]],
    torso: ['suit', null],
    torsoLayers: [
      { shape: [[0.97, -1], [0.97, 14], [0.56, 14], [0.53, 7], [0.6, -2]], fabric: ['beskar', null] }, // chest plate
      { shape: [[0.51, 3], [0.51, 14], [0.4, 14], [0.4, 4.5]], fabric: ['beskar', null] }, // belly plate
      { shape: [[0.385, -16], [0.385, 16], [0.28, 16], [0.28, -16]], fabric: ['leather', null] }, // belt
      { shape: [[1.08, -5], [0.42, 14], [0.35, 14], [1.0, -10]], fabric: ['leather', null] }, // bandolier
    ],
    torsoLines: [{ pts: [[0.6, -2], [0.53, 7], [0.56, 14]], color: [40, 42, 48], width: 0.5 }],
    torsoBadges: [
      { shape: [[0.375, 8.4], [0.375, 11.4], [0.29, 11.4], [0.29, 8.4]], colors: [[90, 92, 98], [220, 222, 228]] }, // buckle
      { shape: [[0.86, 2.0], [0.84, 3.4], [0.81, 3.2], [0.83, 1.8]], colors: [[90, 92, 98], [220, 222, 228]] }, // bandolier cartridges
      { shape: [[0.81, 3.6], [0.79, 5.0], [0.76, 4.8], [0.78, 3.4]], colors: [[90, 92, 98], [220, 222, 228]] },
      { shape: [[0.76, 5.2], [0.74, 6.6], [0.71, 6.4], [0.73, 5.0]], colors: [[90, 92, 98], [220, 222, 228]] },
    ],
    arm: ['suit', null],
    leg: ['suit', null],
    foot: 'shoe',
    hands: { front: 'glove', back: 'glove', shot: 'blaster' },
    // Beskar plates and leather boots wrapped over the limbs: `from`/`to` along
    // the bone, `extra` radius over the limb.
    armor: [
      { limb: 'forearm', from: 0.42, to: 0.95, extra: 0.6, fabric: ['beskar', null], swell: { flat: 'both' } }, // vambrace
      { limb: 'upperArm', from: -0.1, to: 0.36, extra: 1.4, fabric: ['beskar', null], swell: { flat: 'b' } }, // pauldron
      { limb: 'thigh', from: 0.3, to: 0.72, extra: 0.5, fabric: ['beskar', null], swell: { flat: 'both', front: [0.6, 0.5] } }, // thigh plate
      { limb: 'shin', from: 0.45, to: 1.0, extra: 0.8, fabric: ['boot', null], swell: { flat: 'a' } }, // boot
      { limb: 'shin', from: -0.08, to: 0.18, extra: 1.0, fabric: ['beskar', null], swell: { flat: 'both', front: [0.8, 0.4] } }, // knee plate
    ],
    jetpack: { colors: 'beskar' }, // rocket pack on his back
    backWeapon: { from: [-0.15, -13], to: [1.42, -9.5], width: 1.7, colors: 'wood' }, // the forked rifle on his back
    collarFabric: ['skin', null],
    collarTrim: [20, 20, 22],
    collar: [[0.92, -8.4], [1.08, -6.8], [1.16, -3], [1.16, 1.8], [1.1, 5.2], [0.94, 6.6], [0.9, 2], [0.92, -2], [0.9, -6]],
    collarTop: [[1.08, -6.8], [1.16, -3], [1.16, 1.8], [1.1, 5.2]],
    grain: 0.3,
    neckLift: 3,
    gloveSize: 1.3,
    face: { style: 'helmet', size: 1.75, drop: 3.5, metal: [[40, 42, 48], [124, 128, 136], [222, 226, 232]] },
    // Painted parts generated with Nano Banana (src/parts-mando.js), used once loaded;
    // `partFit` tunes how thick each sits on its limb.
    parts: true,
    // Slim build: narrower torso, arms and legs than the shapes they replace;
    // bigger fists (tucked into the sleeve) and boots.
    partFit: { torsoDepth: 22, upperArm: 1.18, forearm: 1.05, thigh: 1.02, shin: 1.12, gloveLength: 12.5, gloveTuck: 2.5 },
  },
  // Drawn fallback (the armored style), until the painted art is ready.
  colors: {
    suit: '#4a3a30', suitShade: '#30241d', suitLight: '#6e5848',
    armor: '#a8aab2', armorShade: '#6c6e76', armorLight: '#e4e6ea',
    accent: '#8a8c94', accentShade: '#5c5e66', accentLight: '#c8cad0',
    visor: '#0a0b0e', visorFrame: '#3a3c42', visorFrameLight: '#6a6c72',
    helmetGold: '#a8aab2', helmetGoldShade: '#6c6e76',
    glove: '#2c2826', gloveShade: '#161412', boot: '#5e3e2a',
    belt: '#62402a', beltShade: '#3e2818',
    pack: '#4a3a30', packShade: '#30241d', packLight: '#6e5848',
    rocket: '#8a8c94', rocketShade: '#5c5e66', rocketLight: '#c8cad0',
    metal: '#24252b', metalLight: '#b9bbc2', energy: '#ff6a2a',
  },
  altColors: {},
  ratings: { punch: 2, kick: 2, lowKick: 1, uppercut: 3, shot: 2 },
  // Force field: brown, stops shots and kicks.
  field: { color: '#a8774a', style: 'plate', blocks: ['shots', 'kicks'] },
  // Jetpack: floaty jumps.
  stats: { walk: 4.8, backWalk: 3.6, jumpV: 14.4, jumpVX: 6.0, gravity: 0.82, power: 1 },
  // Jetpack flight: hold jump in the air to keep climbing to `ceiling`, then
  // hover there, steering left and right, for up to `frames` (3 seconds) per jump.
  flight: { frames: 180, ceiling: 150, climb: 4.5, speed: 5.5 },
};

// The ship's counselor, painted entirely in code from a reference picture:
// a mauve jumpsuit with a lavender V-neck, a long black curly mane. Her punch
// is empathic: hands to her temples, and the opponent in front of her doubles
// over clutching their head.
CHARACTERS.troi = {
  id: 'troi',
  name: 'TROI',
  blurb: 'Empath · hand phaser',
  look: 'painted',
  fallbackLook: 'agent',
  scale: 1.95,
  projectile: 'pulse', // the same red hand-phaser beam as Worf's
  muzzle: 33,
  muzzleY: -3,
  paint: {
    suit: [[78, 56, 72], [136, 104, 120], [186, 156, 172]], // mauve jumpsuit
    skin: [[132, 86, 64], [192, 142, 112], [222, 182, 152]],
    glove: [[132, 86, 64], [192, 142, 112], [222, 182, 152]], // bare hands
    shoe: [[26, 22, 24], [66, 58, 60], [128, 118, 120]],
    widths: { hip: 9.2, knee: 5.6, ankle: 3.0, shoulder: 4.9, elbow: 3.9, wrist: 2.9, neck: 3.0 },
    torsoBack: [[-0.12, -9], [0, -12.8], [0.15, -11.8], [0.34, -7.6], [0.55, -8], [0.8, -9], [0.94, -6.8], [1.04, -3.6]],
    torsoFront: [[-0.12, 6.8], [0.1, 8.4], [0.34, 6.8], [0.52, 8.8], [0.66, 12.4], [0.78, 10], [0.92, 6.4], [1.04, 3.4]],
    torso: ['suit', null],
    torsoLayers: [
      // The low V-neck: skin from the throat down to a point on the chest.
      { shape: [[1.06, -0.4], [0.96, 2.4], [0.84, 6.4], [0.68, 11.4], [0.74, 13.2], [0.9, 7.8], [1.04, 3.4]], fabric: ['skin', null], smooth: true },
    ],
    torsoLines: [
      { pts: [[1.06, -0.9], [0.96, 2.0], [0.84, 6.0], [0.67, 11.0]], color: [176, 128, 212], width: 2.2 }, // lavender band
      { pts: [[0.62, 9.6], [0.4, 7.2], [0.12, 8.0]], color: [104, 76, 92], width: 0.35 }, // princess seam
    ],
    torsoBadges: [{ shape: [[0.86, 7.0], [0.75, 9.8], [0.78, 8.2], [0.74, 6.4]], colors: [[150, 110, 40], [246, 214, 130]] }], // comm badge
    arm: ['suit', null],
    leg: ['suit', null],
    foot: 'shoe',
    hands: { front: 'glove', back: 'glove', shot: 'phaser' },
    phaser: { scale: 0.11, grip: 5, lift: 3 },
    gloveSize: 0.95,
    grain: 0.3,
    neckLift: 3.5,
    face: {
      size: 1.7,
      drop: 4.5,
      skin: [[132, 86, 64], [194, 144, 114], [222, 184, 156]], // olive-tan
      hair: [[8, 6, 8], [30, 22, 26], [78, 64, 70]],
      brow: [30, 20, 18],
      iris: [52, 34, 26],
      lips: [168, 82, 80],
      mane: true, // long black curls over the ears and down past the shoulders
    },
  },
  // Drawn fallback (the agent style), until the painted art is ready.
  colors: {
    suit: '#88687a', suitShade: '#5c4250', suitLight: '#b89aaa', rimPink: '#c890f0', rimCyan: '#f0b0e0',
    skin: '#d2a486', skinShade: '#a8785c', skinLight: '#ecc6aa', skinDark: '#8a5a44',
    hair: '#1e161a', hairShade: '#0a0608', hairLight: '#4a3a40', implant: '#d2a486', implantDark: '#a8785c',
    eyes: '#3a2418', lips: '#a85250', boot: '#1a1618', bootShine: '#5a5052',
    rifle: '#8c919b', rifleLight: '#c5cad2', rifleDark: '#4b4f58', energy: '#d6a4ff',
  },
  altColors: {},
  moves: {
    // Empathic strike: hands to her temples; the opponent in front of her, up
    // to `range` away, is struck with pain (Game.mindBlast).
    punch: { pose: 'empathy', mind: true, range: 430, startup: 10, active: 1, recovery: 22, damage: 6, hitstun: 30, push: 1, sound: 'light', sfx: 'empathy' },
    special: { sfx: 'phaser' },
  },
  shot: { speed: 9, damage: 11 },
  ratings: { punch: 2, kick: 2, lowKick: 2, uppercut: 2, shot: 1 },
  // Force field: a soft pink bubble, stops shots.
  field: { color: '#ff9ad5', style: 'bubble', blocks: ['shots'] },
  stats: { walk: 5.0, backWalk: 3.8, jumpV: 15.2, jumpVX: 6.2, gravity: 1, power: 1 },
};

// What the shot meter calls each fighter's ranged attack.
Object.assign(CHARACTERS.fett, { shotName: 'BLASTER' });
Object.assign(CHARACTERS.mando, { shotName: 'BLASTER' });
Object.assign(CHARACTERS.worf, { shotName: 'PHASER' });
Object.assign(CHARACTERS.troi, { shotName: 'PHASER' });
Object.assign(CHARACTERS.seven, { shotName: 'PHASER RIFLE' });
Object.assign(CHARACTERS.vader, { shotName: 'LIGHTNING' });

// Which franchise's lettering their name is shown in (src/render.js NAME_FONTS).
for (const id of ['fett', 'mando', 'vader']) CHARACTERS[id].franchise = 'wars';
for (const id of ['worf', 'seven', 'troi']) CHARACTERS[id].franchise = 'trek';

// Shot sounds: the blaster-carrying bounty hunters fire a "pew"; the
// Starfleet officers fire a whining phaser beam.
for (const [id, sfx] of [['fett', 'blaster'], ['mando', 'blaster'], ['worf', 'phaser'], ['seven', 'phaser'], ['troi', 'phaser']]) {
  const c = CHARACTERS[id];
  c.moves = { ...(c.moves || {}), special: { ...((c.moves || {}).special || {}), sfx } };
}

// Order on the character select screen.
const ROSTER = ['fett', 'worf', 'vader', 'seven', 'mando', 'troi'];

// The character as player 2 sees it in a mirror match: same fighter, alternate colors.
function altVersion(char) {
  return { ...char, colors: { ...char.colors, ...(char.altColors || {}) }, altFilter: char.look === 'cutout' || char.look === 'painted' ? 'hue-rotate(150deg) saturate(1.2)' : '' };
}
