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

// Builds a recolored copy of a character, used for mirror matches.
function paletteSwap(base, name, colorOverrides) {
  return {
    ...base,
    name,
    colors: { ...base.colors, ...colorOverrides },
    stats: { ...base.stats },
  };
}

CHARACTERS.meiAlt = paletteSwap(CHARACTERS.mei, 'MEI (ALT)', {
  suit: '#3a3a42',
  suitShade: '#26262c',
  armor: '#9a2f2f',
  armorShade: '#661d1d',
  armorLight: '#d45a5a',
  accent: '#d9b02a',
  accentShade: '#9c7c16',
  accentLight: '#ffe07a',
  pack: '#6f7480',
  packShade: '#4a4e57',
  energy: '#5fd8ff',
});
