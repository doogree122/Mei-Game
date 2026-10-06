// Character roster. Appearance is data-driven so a character can be restyled
// (or swapped for sprite art later) without touching game logic.
//
// hairStyle: 'ponytail' | 'buns' | 'short' | 'long'
const CHARACTERS = {
  mei: {
    id: 'mei',
    name: 'MEI',
    hairStyle: 'ponytail',
    colors: {
      skin: '#f2c7a5',
      skinShade: '#d9a582',
      hair: '#1f1420',
      hairShine: '#3d2b44',
      top: '#e0436b',
      topShade: '#b02e52',
      trim: '#ffd34d',
      bottom: '#27305a',
      bottomShade: '#1b2242',
      shoes: '#f5f5f5',
      gloves: '#ffd34d',
      eyes: '#1a1a1a',
      energy: '#7ae7ff',
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
  hair: '#d8d2e8',
  hairShine: '#ffffff',
  top: '#2fa6a0',
  topShade: '#1f7a76',
  trim: '#ff8a3d',
  bottom: '#2b2b2b',
  bottomShade: '#1a1a1a',
  gloves: '#ff8a3d',
  energy: '#ff9de2',
});
