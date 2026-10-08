// Levels. 'hood' is the drawn spaceship room (src/stage.js); the others are
// backdrop pictures (assets/stages/, made by tools/prep_stages.py).
//
// A picture is scaled so it is `height` game pixels tall and placed so its row
// `floor` (in picture pixels) lines up with the fighters' feet. As the camera
// crosses the stage the picture pans from its left edge to its right, so it
// scrolls slower than the fighters, like a distant view. `top` and `bottom`
// fill the space above and below the arena on tall phone screens.

const STAGES = [
  { id: 'hood', name: 'USS HOOD', top: '#03040c', bottom: '#0a1230' },
  { id: 'desert', name: 'DESERT TOWN', image: true, height: 600, floor: 650, dim: 0.08, top: '#565753', bottom: '#a08065' },
  { id: 'bridge', name: 'THE BRIDGE', image: true, height: 600, floor: 600, dim: 0.12, top: '#635b51', bottom: '#c2b495' },
  { id: 'corridor', name: 'BATTLE STATION', image: true, height: 600, floor: 690, dim: 0.1, top: '#2f2f31', bottom: '#3e3f3f' },
];

const stageImages = {};

function stageDef(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

// The backdrop picture, once it has loaded (or null).
function stageImage(def) {
  if (!def.image) return null;
  if (!stageImages[def.id]) {
    const img = new Image();
    img.src = typeof STAGE_DATA !== 'undefined' ? STAGE_DATA[def.id] : `assets/stages/${def.id}.jpg`;
    stageImages[def.id] = img;
  }
  const img = stageImages[def.id];
  return img.complete && img.naturalWidth ? img : null;
}

// Start loading every backdrop now so the select screen can show them.
function preloadStages() {
  for (const def of STAGES) stageImage(def);
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
  const s = def.height / img.naturalHeight;
  const w = img.naturalWidth * s;
  const pan = Math.max(0, Math.min(1, camX / (WORLD_W - W)));
  const x = -(w - W) * pan;
  const y = GROUND - def.floor * s;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, def.height);
  ctx.restore();
  // A slight dimming so the fighters stand out, a little darker at the bottom.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(0,0,0,${def.dim})`);
  g.addColorStop(1, `rgba(0,0,0,${def.dim + 0.12})`);
  ctx.fillStyle = g;
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
    ctx.drawImage(img, x + (w - img.naturalWidth * s) / 2, y + (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
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
