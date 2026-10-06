// Character roster. Appearance is data-driven: `look` picks the body renderer in
// render.js and `colors` is its palette, so variants are just new color sets.
const CHARACTERS = {
  mei: {
    id: 'mei',
    name: 'MEI',
    look: 'armored', // jetpack bounty hunter
    projectile: 'bolt', // special fires a blaster bolt
    colors: {
      suit: '#3d4f7a',
      suitShade: '#2b3858',
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
  projectile: 'pulse', // special fires a hand-blaster pulse
  colors: {
    skin: '#a8714a',
    skinShade: '#7a4c30',
    hair: '#1a0f0a',
    eyes: '#140c08',
    tunic: '#e8b72a',
    tunicShade: '#b88a16',
    black: '#272a33',
    blackShade: '#1b1d24',
    sash: '#b8bdc6',
    sashShade: '#757b85',
    boot: '#16171c',
    bootShine: '#6a6f7a',
    device: '#5a5f69',
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
