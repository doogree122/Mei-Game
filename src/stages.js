// Levels. 'hood' is the drawn spaceship room (src/stage.js); the others are
// backdrop pictures (assets/stages/, made by tools/prep_stages.py).
//
// A picture is scaled so it is `height` game pixels tall and placed so its row
// `floor` (in picture pixels) lines up with the fighters' feet. As the camera
// crosses the stage the picture pans from its left edge to its right, so it
// scrolls slower than the fighters, like a distant view. `top` and `bottom`
// fill the space above and below the arena on tall phone screens. With `front`,
// assets/stages/<id>-front.png holds the parts in front of the fighters (the
// bridge's front chairs and consoles), drawn over them in the same place.

const STAGES = [
  { id: 'hood', name: 'USS HOOD', top: '#03040c', bottom: '#0a1230' },
  { id: 'desert', name: 'DESERT TOWN', image: true, height: 600, floor: 650, dim: 0.08, top: '#565753', bottom: '#a08065' },
  { id: 'bridge', name: 'THE BRIDGE', image: true, front: true, height: 600, floor: 580, dim: 0.12, top: '#635b51', bottom: '#c2b495' },
  { id: 'corridor', name: 'BATTLE STATION', image: true, height: 600, floor: 690, dim: 0.1, top: '#2f2f31', bottom: '#3e3f3f' },
];

const stageImages = {};

function loadImage(key, src) {
  if (!stageImages[key]) {
    const img = new Image();
    img.src = src;
    stageImages[key] = img;
  }
  const img = stageImages[key];
  return img.complete && img.naturalWidth ? img : null;
}

const stageSrc = (key, ext) => (typeof STAGE_DATA !== 'undefined' ? STAGE_DATA[key] : `assets/stages/${key}.${ext}`);

function stageDef(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

// The backdrop picture, once it has loaded (or null).
function stageImage(def) {
  if (!def.image) return null;
  return loadImage(def.id, stageSrc(def.id, 'jpg'));
}

function stageFrontImage(def) {
  if (!def.front) return null;
  return loadImage(`${def.id}-front`, stageSrc(`${def.id}-front`, 'png'));
}

// Start loading every backdrop now so the select screen can show them.
function preloadStages() {
  for (const def of STAGES) {
    stageImage(def);
    stageFrontImage(def);
  }
}

// Where a level's picture sits on screen for a camera position.
function stagePlacement(def, img, camX) {
  const s = def.height / img.naturalHeight;
  const w = img.naturalWidth * s;
  const pan = Math.max(0, Math.min(1, camX / (WORLD_W - W)));
  return { x: -(w - W) * pan, y: GROUND - def.floor * s, w, h: def.height };
}

// The darkening laid over a level picture: `dim` at the top of the screen,
// a little more toward the bottom.
function stageShade(def, ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(0,0,0,${def.dim})`);
  g.addColorStop(1, `rgba(0,0,0,${def.dim + 0.12})`);
  return g;
}

// The foreground cut-out with exactly the background's darkening baked in
// (the picture never moves vertically, so this is done once).
const bakedFronts = {};
function bakedFront(def, img, front) {
  if (bakedFronts[def.id]) return bakedFronts[def.id];
  const cv = document.createElement('canvas');
  cv.width = front.naturalWidth;
  cv.height = front.naturalHeight;
  const c = cv.getContext('2d');
  c.drawImage(front, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  // Picture rows map to screen rows: screenY = y + row * s.
  const s = def.height / img.naturalHeight;
  const y = GROUND - def.floor * s;
  c.setTransform(1 / s, 0, 0, 1 / s, 0, -y / s);
  c.fillStyle = stageShade(def, c);
  c.fillRect(0, y, cv.width * s, def.height);
  bakedFronts[def.id] = cv;
  return cv;
}

// The parts of a level in front of the fighters, drawn over them.
function drawStageForeground(ctx, id, camX) {
  const def = stageDef(id);
  const img = stageImage(def);
  const front = stageFrontImage(def);
  if (!img || !front) return;
  const at = stagePlacement(def, img, camX);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bakedFront(def, img, front), at.x, at.y, at.w, at.h);
  ctx.restore();
}

// Everything behind the fighters, in screen coordinates (camX = the world x
// at the screen's left edge).
function drawStageBackground(ctx, id, camX, frame) {
  const def = stageDef(id);
  const img = stageImage(def);
  if (!img) {
    // The ship until the picture arrives.
    Stage.drawBackground(ctx, camX, frame);
    return;
  }
  const at = stagePlacement(def, img, camX);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, at.x, at.y, at.w, at.h);
  ctx.restore();
  // A slight dimming so the fighters stand out, a little darker at the bottom.
  ctx.fillStyle = stageShade(def, ctx);
  ctx.fillRect(0, 0, W, H);
}

// A small preview of a level for the select screen, drawn into a w x h box.
function drawStageThumb(ctx, id, x, y, w, h, frame) {
  const def = stageDef(id);
  const img = stageImage(def);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.clip();
  if (img) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const box = [x + (w - img.naturalWidth * s) / 2, y + (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s];
    ctx.drawImage(img, ...box);
    const front = stageFrontImage(def);
    if (front) ctx.drawImage(front, ...box);
  } else {
    // The drawn ship room, shrunk to fit.
    ctx.translate(x, y);
    ctx.scale(w / W, h / H);
    Stage.drawBackground(ctx, 400, frame);
  }
  ctx.restore();
}

// Fill the space around the arena on tall screens with the level's colors.
function drawStageSurround(ctx, id, top, viewH) {
  const def = stageDef(id);
  ctx.fillStyle = def.top;
  ctx.fillRect(0, 0, W, top);
  const g = ctx.createLinearGradient(0, top + H, 0, viewH);
  g.addColorStop(0, def.bottom);
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, top + H, W, viewH - top - H);
}
