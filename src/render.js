// Drawing: fighters, projectiles and HUD.
//
// Game coordinates are a 960x540 arena; the canvas has RES screen pixels per
// game pixel, matched to the display (up to 2x) so everything is drawn sharp.
// The stage and effects are drawn at that full resolution (PIXEL game pixels per
// buffer pixel). Fighters cut from pictures (look 'cutout') are drawn straight
// onto the canvas. Drawn fighters come from skeleton art rendered on a scratch
// canvas with a FIGHTER_PIXEL grid, then given hard edges and a dark 1-pixel
// outline so they read like hand-made sprites.

let RES = 1;
let PIXEL = 1;
let FIGHTER_PIXEL = 1;
// The outline pass touches every pixel around a drawn fighter each frame, so its
// grid stops at this size (1.5 screen pixels at 2x), or 1 on touch screens,
// whose processors are slower.
const MIN_FIGHTER_PIXEL = matchMedia('(pointer: coarse)').matches ? 1 : 0.75;
// Canvases baked once (the room, the starfields) hold this many pixels per game pixel.
const BAKE = 2;
const OUTLINE = [13, 15, 22];
const OUTLINE_PX = (0xff000000 | (OUTLINE[2] << 16) | (OUTLINE[1] << 8) | OUTLINE[0]) >>> 0;

// A canvas for baking art at BAKE resolution, drawn in game coordinates.
function bakedCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * BAKE);
  cv.height = Math.ceil(h * BAKE);
  const ctx = cv.getContext('2d');
  ctx.scale(BAKE, BAKE);
  return { cv, ctx };
}

// Draw a baked canvas at its size in game coordinates.
function drawBaked(ctx, cv, x, y) {
  ctx.drawImage(cv, x, y, cv.width / BAKE, cv.height / BAKE);
}

// Called by Game.layout() when the display resolution changes.
function setResolution(res) {
  RES = res;
  PIXEL = 1 / res;
  FIGHTER_PIXEL = Math.max(MIN_FIGHTER_PIXEL, 1 / res);
  SPR_W = Math.ceil(810 / FIGHTER_PIXEL);
  SPR_H = Math.ceil(495 / FIGHTER_PIXEL);
  SPR_OX = Math.round(405 / FIGHTER_PIXEL);
  SPR_OY = Math.round(450 / FIGHTER_PIXEL);
  spriteCanvas.width = SPR_W;
  spriteCanvas.height = SPR_H;
  spriteMask = new Uint8Array(SPR_W * SPR_H);
  spriteBox.w = spriteBox.h = 0;
}

function drawLimb(ctx, a, b, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function fillPoly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function fillCircle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// A line parallel to a->b, shifted sideways by `offset` (+ = the limb's front
// edge for a limb pointing down). Used for highlights and shading along limbs.
function edgeLine(ctx, a, b, offset, width, color, t0 = 0.1, t1 = 0.9) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (dy / len) * offset;
  const oy = (-dx / len) * offset;
  drawLimb(ctx,
    { x: a.x + dx * t0 + ox, y: a.y + dy * t0 + oy },
    { x: a.x + dx * t1 + ox, y: a.y + dy * t1 + oy }, width, color);
}

// A clenched fist at the end of the forearm: finger creases running along the
// fist, a thumb wrapped across them, and a lit knuckle edge.
function drawFist(ctx, elbow, hand, r, color, crease, light) {
  const dx = hand.x - elbow.x;
  const dy = hand.y - elbow.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const at = (along, side) => ({ x: hand.x + ux * along * r - uy * side * r, y: hand.y + uy * along * r + ux * side * r });
  fillCircle(ctx, hand.x, hand.y, r, color);
  // Knuckles: a lit arc along the front of the fist.
  drawLimb(ctx, at(0.75, -0.45), at(0.75, 0.45), 1.6, light);
  // Finger creases between the four curled fingers.
  for (const side of [-0.42, 0, 0.42]) drawLimb(ctx, at(0.05, side), at(0.85, side), 1.5, crease);
  // Thumb folded across the fingers.
  drawLimb(ctx, at(-0.35, 0.8), at(0.3, 0.15), 1.8, crease);
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// ---- Armored bounty hunter body ----

function drawArmoredLeg(ctx, sk, side, c, back) {
  const knee = sk['knee' + side];
  const foot = sk['foot' + side];
  // Flight suit with a lit front edge.
  drawLimb(ctx, sk.hip, knee, 16, back ? c.suitShade : c.suit);
  drawLimb(ctx, knee, foot, 13, back ? c.suitShade : c.suit);
  if (!back) {
    edgeLine(ctx, sk.hip, knee, 4.5, 3, c.suitLight, 0.2, 0.8);
    edgeLine(ctx, knee, foot, -4, 2, c.suitShade, 0.2, 0.8);
    // Thigh pouch.
    const pouch = lerpPt(sk.hip, knee, 0.5);
    fillRoundRect(ctx, pouch.x - 6, pouch.y - 5, 11, 11, 2, c.belt);
    fillRoundRect(ctx, pouch.x - 6, pouch.y - 5, 11, 3, 1, c.beltShade);
    ctx.fillStyle = c.metalLight;
    ctx.fillRect(pouch.x - 1, pouch.y - 2, 2, 2);
  }
  // Shin armor plate.
  drawLimb(ctx, lerpPt(knee, foot, 0.12), lerpPt(knee, foot, 0.62), 10, back ? c.armorShade : c.armor);
  if (!back) edgeLine(ctx, knee, foot, 2.5, 2.5, c.armorLight, 0.15, 0.5);
  // Boot, with an armored toe cap.
  drawLimb(ctx, lerpPt(knee, foot, 0.6), foot, 15, c.boot);
  drawLimb(ctx, foot, { x: foot.x + 11, y: foot.y + 1 }, 10, c.boot);
  drawLimb(ctx, { x: foot.x + 7, y: foot.y }, { x: foot.x + 12, y: foot.y + 1 }, 7, back ? c.armorShade : c.armor);
  // Knee plate: a shaped guard over the knee, aligned with the shin.
  const shinAng = Math.atan2(foot.y - knee.y, foot.x - knee.x) - Math.PI / 2;
  ctx.save();
  ctx.translate(knee.x + 3, knee.y + 2);
  ctx.rotate(shinAng);
  fillRoundRect(ctx, -6, -8, 12, 15, 4, back ? c.accentShade : c.accent);
  if (!back) {
    fillRoundRect(ctx, -6, 3, 12, 4, 2, c.accentShade);
    ctx.fillStyle = c.accentLight;
    ctx.fillRect(1, -6, 3, 5);
  }
  ctx.restore();
}

function drawArmoredArm(ctx, sk, side, c, back, holdingBlaster) {
  const elbow = sk['elbow' + side];
  const hand = sk['hand' + side];
  drawLimb(ctx, sk.shoulder, elbow, 12, back ? c.suitShade : c.suit);
  if (!back) edgeLine(ctx, sk.shoulder, elbow, 3.5, 2.5, c.suitLight, 0.3, 0.9);
  // Gauntlet with a lit ridge and an orange bracer at the wrist.
  drawLimb(ctx, elbow, hand, 12, back ? c.armorShade : c.armor);
  if (!back) edgeLine(ctx, elbow, hand, 3, 3, c.armorLight, 0.15, 0.6);
  drawLimb(ctx, lerpPt(elbow, hand, 0.68), lerpPt(elbow, hand, 0.8), 13, back ? c.accentShade : c.accent);
  if (back) drawFist(ctx, elbow, hand, 7, c.gloveShade, c.metal, c.glove);
  else drawFist(ctx, elbow, hand, 7.5, c.glove, c.suitShade, '#ffffff');

  if (holdingBlaster) {
    const dx = hand.x - elbow.x;
    const dy = hand.y - elbow.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // Carbine: stock behind the hand, body, scope on top, long barrel.
    const at = (along, side) => ({ x: hand.x + ux * along - uy * side, y: hand.y + uy * along + ux * side });
    drawLimb(ctx, at(-14, 1), at(-2, 0), 7, c.metalLight);
    drawLimb(ctx, at(-4, 0), at(16, 0), 9, c.metal);
    drawLimb(ctx, at(16, -1), at(34, -1), 4, c.metal);
    drawLimb(ctx, at(2, -7), at(12, -7), 4, c.metal);
    drawLimb(ctx, at(4, -8), at(10, -8), 1.5, c.metalLight);
    drawLimb(ctx, at(6, 3), at(6, 9), 4, c.metal);
    drawLimb(ctx, at(18, 2), at(30, 2), 1.5, c.metalLight);
    fillCircle(ctx, at(35, -1).x, at(35, -1).y, 2.2, c.energy);
  }

  // Shoulder pauldron: rim, plate, highlight, rivet.
  const ang = Math.atan2(elbow.y - sk.shoulder.y, elbow.x - sk.shoulder.x);
  ctx.save();
  ctx.translate(sk.shoulder.x + Math.cos(ang) * 5, sk.shoulder.y + Math.sin(ang) * 5);
  ctx.rotate(ang);
  ctx.fillStyle = back ? c.accentShade : c.accentShade;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!back) {
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.ellipse(-1, -1, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.accentLight;
    ctx.beginPath();
    ctx.ellipse(-3, -4, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    fillCircle(ctx, 6, 2, 1.6, c.metal);
  }
  ctx.restore();
}

// Jetpack and slung rifle, drawn behind the torso in a torso-aligned frame.
function drawJetpack(ctx, sk, f, c) {
  const mid = lerpPt(sk.hip, sk.neck, 0.62);
  ctx.save();
  ctx.translate(mid.x, mid.y);
  ctx.rotate(f.pose.torso);

  // Rifle across the back: barrel, scope, muzzle.
  drawLimb(ctx, { x: -4, y: 30 }, { x: -27, y: -56 }, 6, c.metal);
  drawLimb(ctx, { x: -3, y: 30 }, { x: -9, y: 10 }, 8, c.packShade);
  drawLimb(ctx, { x: -18, y: -24 }, { x: -22, y: -38 }, 5, c.packShade);
  fillCircle(ctx, -22, -39, 2, c.energy);
  drawLimb(ctx, { x: -27, y: -56 }, { x: -29, y: -62 }, 3, c.metal);

  // Pack body with shading, highlight and panel lines.
  fillRoundRect(ctx, -33, -26, 24, 48, 5, c.pack);
  ctx.fillStyle = c.packShade;
  ctx.fillRect(-33, -22, 7, 40);
  ctx.fillStyle = c.packLight;
  ctx.fillRect(-14, -22, 3, 36);
  ctx.fillStyle = c.packShade;
  ctx.fillRect(-26, -6, 15, 2);
  ctx.fillRect(-26, 8, 15, 2);
  fillCircle(ctx, -20, 1, 2.5, c.accent);

  // Rocket on top: lavender body, nose cone, fins.
  drawLimb(ctx, { x: -21, y: -26 }, { x: -21, y: -48 }, 9, c.rocket);
  drawLimb(ctx, { x: -23, y: -28 }, { x: -23, y: -46 }, 3, c.rocketShade);
  fillPoly(ctx, [{ x: -26, y: -50 }, { x: -16, y: -50 }, { x: -21, y: -60 }], c.rocketLight);
  fillPoly(ctx, [{ x: -26, y: -30 }, { x: -31, y: -24 }, { x: -26, y: -26 }], c.rocketShade);
  fillPoly(ctx, [{ x: -16, y: -30 }, { x: -11, y: -24 }, { x: -16, y: -26 }], c.rocketShade);
  ctx.fillStyle = c.accent;
  ctx.fillRect(-25.5, -42, 9, 3);

  // Thruster nozzles.
  ctx.fillStyle = c.metal;
  ctx.fillRect(-31, 22, 8, 7);
  ctx.fillRect(-20, 22, 8, 7);

  // Thruster flame while airborne.
  if (f.y > 0 && f.state !== 'ko' && f.hitstun === 0) {
    const flick = (f.time % 4) * 3;
    for (const nx of [-27, -16]) {
      fillPoly(ctx, [{ x: nx - 4, y: 29 }, { x: nx + 4, y: 29 }, { x: nx, y: 46 + flick }], '#ff8a2a');
      fillPoly(ctx, [{ x: nx - 2, y: 29 }, { x: nx + 2, y: 29 }, { x: nx, y: 37 + flick / 2 }], '#ffe27a');
    }
  }
  ctx.restore();
}

function drawArmoredTorso(ctx, sk, c) {
  const { hip, neck } = sk;
  const dx = neck.x - hip.x;
  const dy = neck.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: -dy / len, y: dx / len }; // forward
  const at = (t, side) => ({ x: hip.x + dx * t + n.x * side, y: hip.y + dy * t + n.y * side });

  // Flight suit, darker toward the back.
  fillPoly(ctx, [at(0, 14), at(0.8, 17), at(1.02, 6), at(1.02, -8), at(0.8, -15), at(0, -13)], c.suit);
  fillPoly(ctx, [at(0.05, -13), at(0.8, -15), at(0.8, -9), at(0.05, -7)], c.suitShade);
  // Upper chest plate.
  fillPoly(ctx, [at(0.62, 17), at(0.92, 18), at(0.97, -6), at(0.64, -9)], c.armor);
  fillPoly(ctx, [at(0.68, 17), at(0.9, 17.5), at(0.9, 10), at(0.7, 9)], c.armorLight);
  fillPoly(ctx, [at(0.64, -9), at(0.97, -6), at(0.95, -2), at(0.66, -4)], c.armorShade);
  // Lower chest plate.
  fillPoly(ctx, [at(0.4, 16), at(0.58, 17), at(0.6, -6), at(0.42, -7)], c.armor);
  fillPoly(ctx, [at(0.42, 16), at(0.56, 16.5), at(0.56, 11), at(0.44, 10)], c.armorLight);
  // Battle scuffs.
  for (const [t, sd] of [[0.8, 4], [0.5, 2]]) {
    const pt = at(t, sd);
    ctx.fillStyle = c.armorShade;
    ctx.fillRect(pt.x - 1.5, pt.y - 1, 3, 2);
  }
  // Ab plate with control buttons.
  fillPoly(ctx, [at(0.16, 14), at(0.36, 15), at(0.36, 2), at(0.16, 1)], c.armorShade);
  for (const [t, sd, col] of [[0.24, 10, c.accent], [0.3, 10, '#ffd34d'], [0.24, 5, '#5fd8ff'], [0.3, 5, c.accentLight]]) {
    const pt = at(t, sd);
    ctx.fillStyle = col;
    ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
  }
  // Brown ammo belt with dark segments and a buckle.
  drawLimb(ctx, at(0, 15), at(0, -14), 9, c.belt);
  for (let sd = -11; sd <= 12; sd += 4.6) {
    const pt = at(0.01, sd);
    ctx.fillStyle = c.beltShade;
    ctx.fillRect(pt.x - 1.4, pt.y - 3.5, 2.8, 7);
  }
  const buckle = at(0.01, 13);
  fillRoundRect(ctx, buckle.x - 3, buckle.y - 4, 6, 8, 1, c.metalLight);
  // Strap across the chest, back shoulder to front ribs.
  drawLimb(ctx, at(0.95, -10), at(0.5, 17), 5, c.belt);
  drawLimb(ctx, at(0.93, -9), at(0.52, 16), 1.5, c.beltShade);
  // Collar ring.
  drawLimb(ctx, at(1, 0), lerpPt(neck, sk.head, 0.5), 11, c.suitShade);
  drawLimb(ctx, at(0.98, 5), at(0.98, -6), 4, c.armorShade);
}

function drawHelmet(ctx, sk, c) {
  const h = sk.head;
  const r = BODY.head + 1.5;
  const back = h.x - r;
  const front = h.x + r + 1;
  const bottom = h.y + 15;

  // Shell: rounded dome over straight sides and a flat bottom rim, shaded
  // from the back (darker) to the front.
  const shade = ctx.createLinearGradient(back, 0, front, 0);
  shade.addColorStop(0, c.armorShade);
  shade.addColorStop(0.45, c.armor);
  shade.addColorStop(1, c.armor);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(back, bottom);
  ctx.lineTo(back, h.y - 2);
  ctx.arc(h.x + 0.5, h.y - 2, r + 0.5, Math.PI, Math.PI * 2);
  ctx.lineTo(front, bottom);
  ctx.closePath();
  ctx.fill();
  // Dome highlight and dents.
  ctx.strokeStyle = c.armorLight;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(h.x + 2, h.y - 2, r - 4, -2.0, -1.2);
  ctx.stroke();
  ctx.fillStyle = c.suitLight;
  ctx.fillRect(h.x - 2, h.y - 15, 3, 2);
  ctx.fillRect(h.x + 7, h.y - 13, 2, 2);
  ctx.fillRect(h.x - 4, h.y + 10, 2, 2);
  // Bottom rim.
  ctx.fillStyle = c.armorShade;
  ctx.fillRect(back, bottom - 2, front - back, 2);

  // Dark red band straight around the helmet at brow height.
  ctx.fillStyle = c.visorFrame;
  ctx.fillRect(back, h.y - 8.5, front - back, 3.5);
  ctx.fillStyle = c.visorFrameLight;
  ctx.fillRect(back, h.y - 8.5, front - back, 1);

  // T-shaped visor: a dark slit across the face and a slot down the front.
  ctx.fillStyle = c.visor;
  ctx.fillRect(h.x - 1, h.y - 5, front - h.x + 1, 6);
  ctx.fillRect(h.x + 8, h.y + 1, 5.5, 13);
  // Dark red trim framing the cheek: under the slit and down the slot's edge.
  ctx.fillStyle = c.visorFrame;
  ctx.fillRect(h.x - 1, h.y + 1, 9, 2);
  ctx.fillRect(h.x + 5.5, h.y + 1, 2.5, 12);
  ctx.fillRect(h.x - 1, h.y + 1, 2, 11);
  // Cheek plate and the sliver of faceplate in front of the slot.
  ctx.fillStyle = c.armorShade;
  ctx.fillRect(h.x + 1, h.y + 3, 4.5, 9);
  ctx.fillRect(h.x + 13.5, h.y + 1, front - h.x - 13.5, 12);
  // Glints on the visor.
  ctx.fillStyle = 'rgba(160,220,255,0.75)';
  ctx.fillRect(h.x + 11, h.y - 4, 4, 1.5);
  ctx.fillRect(h.x + 10, h.y + 2, 1.5, 3);

  // Gold rangefinder housing on the side, with the antenna rising from it.
  drawLimb(ctx, { x: h.x - 8, y: h.y - 10 }, { x: h.x - 8, y: h.y - 38 }, 2.5, c.suitShade);
  drawLimb(ctx, { x: h.x - 7.4, y: h.y - 12 }, { x: h.x - 7.4, y: h.y - 36 }, 1, c.suitLight);
  fillRoundRect(ctx, h.x - 11, h.y - 11, 6.5, 24, 1.5, c.helmetGold);
  ctx.fillStyle = c.helmetGoldShade;
  ctx.fillRect(h.x - 11, h.y - 11, 1.5, 24);
  ctx.fillStyle = c.visor;
  ctx.fillRect(h.x - 9, h.y - 7, 2.5, 6);
  ctx.fillRect(h.x - 9.5, h.y + 2, 3.5, 1.2);
  ctx.fillRect(h.x - 9.5, h.y + 5, 3.5, 1.2);
}

function drawArmoredBody(ctx, sk, f) {
  const c = f.char.colors;
  const blaster = !!(f.move && f.move.def.projectile);
  drawArmoredArm(ctx, sk, 'B', c, true, false);
  drawArmoredLeg(ctx, sk, 'B', c, true);
  drawJetpack(ctx, sk, f, c);
  drawArmoredTorso(ctx, sk, c);
  drawArmoredLeg(ctx, sk, 'F', c, false);
  drawHelmet(ctx, sk, c);
  drawArmoredArm(ctx, sk, 'F', c, false, blaster);
}

// ---- Ridge-browed warrior body ----

function drawWarriorLeg(ctx, sk, side, c, back) {
  const knee = sk['knee' + side];
  const foot = sk['foot' + side];
  drawLimb(ctx, sk.hip, knee, 16, back ? c.blackShade : c.black);
  drawLimb(ctx, knee, foot, 14, back ? c.blackShade : c.black);
  if (!back) {
    // Trouser crease and a knee fold.
    edgeLine(ctx, sk.hip, knee, 3, 2, c.blackLight, 0.15, 0.85);
    edgeLine(ctx, knee, foot, 3, 2, c.blackLight, 0.1, 0.6);
    drawLimb(ctx, { x: knee.x - 4, y: knee.y - 1 }, { x: knee.x + 3, y: knee.y + 2 }, 1.5, c.blackShade);
  }
  // Polished boots.
  drawLimb(ctx, lerpPt(knee, foot, 0.7), foot, 14, c.boot);
  drawLimb(ctx, foot, { x: foot.x + 12, y: foot.y + 1 }, 10, c.boot);
  if (!back) {
    drawLimb(ctx, { x: foot.x + 3, y: foot.y - 3 }, { x: foot.x + 10, y: foot.y - 2 }, 2, c.bootShine);
    edgeLine(ctx, knee, foot, 4, 1.5, c.bootShine, 0.75, 0.92);
  }
}

function drawWarriorArm(ctx, sk, side, c, back, holdingDevice) {
  const elbow = sk['elbow' + side];
  const hand = sk['hand' + side];
  drawLimb(ctx, sk.shoulder, elbow, 13, back ? c.tunicShade : c.tunic);
  drawLimb(ctx, elbow, hand, 11, back ? c.tunicShade : c.tunic);
  if (!back) {
    // Sleeve light and shade, plus a crease at the elbow.
    edgeLine(ctx, sk.shoulder, elbow, 3.5, 2.5, c.tunicLight, 0.3, 0.85);
    edgeLine(ctx, elbow, hand, -3, 2.5, c.tunicShade, 0.15, 0.85);
    drawLimb(ctx, lerpPt(sk.shoulder, elbow, 0.85), lerpPt(elbow, hand, 0.15), 1.5, c.tunicShade);
  }
  // Cuff and hand with knuckle shading.
  drawLimb(ctx, lerpPt(elbow, hand, 0.88), lerpPt(elbow, hand, 0.95), 12, back ? c.tunicShade : c.tunicShade);
  if (back) drawFist(ctx, elbow, hand, 6.5, c.skinShade, c.skinDark, c.skin);
  else drawFist(ctx, elbow, hand, 7, c.skin, c.skinDark, c.skinLight);
  // Black shoulder yoke continues over the top of the arm.
  fillCircle(ctx, sk.shoulder.x, sk.shoulder.y, 8.5, back ? c.blackShade : c.black);
  if (!back) fillCircle(ctx, sk.shoulder.x + 1, sk.shoulder.y - 3, 3, c.blackLight);

  if (holdingDevice) {
    const dx = hand.x - elbow.x;
    const dy = hand.y - elbow.y;
    const len = Math.hypot(dx, dy) || 1;
    const tip = { x: hand.x + (dx / len) * 14, y: hand.y + (dy / len) * 14 };
    drawLimb(ctx, hand, tip, 9, c.device);
    drawLimb(ctx, hand, lerpPt(hand, tip, 0.8), 3, c.deviceLight);
    fillCircle(ctx, tip.x, tip.y, 2, c.energy);
  }
}

function drawWarriorTorso(ctx, sk, c) {
  const { hip, neck } = sk;
  const dx = neck.x - hip.x;
  const dy = neck.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: -dy / len, y: dx / len }; // forward
  const at = (t, side) => ({ x: hip.x + dx * t + n.x * side, y: hip.y + dy * t + n.y * side });

  // Tunic with a lit front and shaded back.
  fillPoly(ctx, [at(0, 15), at(0.8, 18), at(1.02, 7), at(1.02, -9), at(0.8, -16), at(0, -14)], c.tunic);
  fillPoly(ctx, [at(0.2, -14), at(0.8, -16), at(0.8, -8), at(0.2, -7)], c.tunicShade);
  fillPoly(ctx, [at(0.25, 15), at(0.75, 17.5), at(0.75, 13), at(0.25, 11)], c.tunicLight);
  // Fold creases.
  drawLimb(ctx, at(0.3, 6), at(0.45, 12), 1.5, c.tunicShade);
  drawLimb(ctx, at(0.5, 2), at(0.62, 9), 1.5, c.tunicShade);
  // Black waistband and angled shoulder yoke.
  fillPoly(ctx, [at(-0.02, 15), at(0.2, 16), at(0.2, -15), at(-0.02, -14)], c.black);
  drawLimb(ctx, at(0.19, 15), at(0.19, -14), 1.5, c.blackLight);
  fillPoly(ctx, [at(0.72, 18), at(1.02, 7), at(1.02, -9), at(0.8, -16)], c.black);
  drawLimb(ctx, at(0.74, 16), at(0.8, -14), 1.5, c.blackLight);
  // High collar.
  drawLimb(ctx, at(1, 1), lerpPt(neck, sk.head, 0.35), 12, c.black);

  // Chain-mail sash, back shoulder to front hip.
  const top = at(0.99, -10);
  const bottom = at(0.08, 16);
  drawLimb(ctx, top, bottom, 16, c.sashDark);
  drawLimb(ctx, top, bottom, 12, c.sash);
  // Diamond link pattern.
  const sx = bottom.x - top.x;
  const sy = bottom.y - top.y;
  const sl = Math.hypot(sx, sy) || 1;
  const px = -sy / sl;
  const py = sx / sl;
  for (let i = 1; i < 12; i++) {
    const pt = lerpPt(top, bottom, i / 12);
    for (const off of [-3, 3]) {
      const q = { x: pt.x + px * off, y: pt.y + py * off };
      ctx.fillStyle = (i + (off > 0 ? 1 : 0)) % 2 ? c.sashShade : c.sashLight;
      ctx.fillRect(q.x - 1, q.y - 1, 2, 2);
    }
  }
  // Two ringed clasps near the shoulder.
  for (const t of [0.12, 0.24]) {
    const cl = lerpPt(top, bottom, t);
    fillCircle(ctx, cl.x, cl.y, 4.5, c.sashDark);
    fillCircle(ctx, cl.x, cl.y, 3.2, c.sashLight);
    fillCircle(ctx, cl.x, cl.y, 1.6, c.sashShade);
  }
}

function drawWarriorHead(ctx, sk, c, time) {
  const h = sk.head;
  const sway = Math.sin(time * 0.1);

  // Straight, shoulder-length hair hanging behind and below the head.
  fillPoly(ctx, [
    { x: h.x - 1, y: h.y - 18 },
    { x: h.x - 17, y: h.y - 11 },
    { x: h.x - 20 + sway, y: h.y + 19 },
    { x: h.x - 2 + sway, y: h.y + 21 },
    { x: h.x + 2, y: h.y + 5 },
  ], c.hair);
  fillCircle(ctx, h.x - 3, h.y - 2, 15, c.hair);
  for (const [x0, x1, col] of [[-13, -15, c.hairLight], [-8, -9, c.hairShade], [-4, -4, c.hairLight]]) {
    drawLimb(ctx, { x: h.x + x0, y: h.y - 9 }, { x: h.x + x1 + sway, y: h.y + 18 }, 1.6, col);
  }

  // Face with cheekbone shading.
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.ellipse(h.x + 4, h.y + 2, 11.5, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  fillCircle(ctx, h.x + 6, h.y + 6, 3.5, c.skinShade);
  fillCircle(ctx, h.x + 7, h.y + 5, 2.5, c.skin);

  // Forehead crest: a dome rising over the hairline...
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.ellipse(h.x + 3, h.y - 10, 12, 11, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // ...with a central ridge running up from the brow...
  drawLimb(ctx, { x: h.x + 13, y: h.y - 4 }, { x: h.x + 4, y: h.y - 20 }, 3, c.skinShade);
  drawLimb(ctx, { x: h.x + 12, y: h.y - 6 }, { x: h.x + 4, y: h.y - 19 }, 1.4, c.skinLight);
  // ...and chevron ridges spreading back from it.
  for (let i = 0; i < 4; i++) {
    const cx = h.x + 11 - i * 2.4;
    const cy = h.y - 6 - i * 3.6;
    drawLimb(ctx, { x: cx, y: cy }, { x: cx - 7, y: cy + 1.5 }, 2, c.skinShade);
    drawLimb(ctx, { x: cx - 0.5, y: cy - 1.4 }, { x: cx - 6.5, y: cy }, 1.1, c.skinLight);
  }
  // Heavy brow and deep-set eye.
  drawLimb(ctx, { x: h.x + 5, y: h.y - 2 }, { x: h.x + 16, y: h.y - 2 }, 4.5, c.skinShade);
  ctx.fillStyle = c.skinDark;
  ctx.fillRect(h.x + 7, h.y - 1, 7, 4);
  ctx.fillStyle = '#efe4cf';
  ctx.fillRect(h.x + 8, h.y, 5, 2.5);
  ctx.fillStyle = c.eyes;
  ctx.fillRect(h.x + 10, h.y, 2.5, 2.5);
  // Broad nose with nostril shading.
  fillCircle(ctx, h.x + 15, h.y + 4, 3.6, c.skin);
  fillCircle(ctx, h.x + 16, h.y + 3, 1.2, c.skinLight);
  fillCircle(ctx, h.x + 14, h.y + 6.5, 1.3, c.skinDark);

  // Full beard with goatee and mustache, textured.
  fillPoly(ctx, [
    { x: h.x - 1, y: h.y + 4 }, { x: h.x + 7, y: h.y + 10 }, { x: h.x + 16, y: h.y + 10 },
    { x: h.x + 14, y: h.y + 21 }, { x: h.x + 5, y: h.y + 22 }, { x: h.x - 1, y: h.y + 13 },
  ], c.beard);
  drawLimb(ctx, { x: h.x + 9, y: h.y + 9 }, { x: h.x + 16, y: h.y + 9 }, 2.5, c.beard);
  drawLimb(ctx, { x: h.x + 10, y: h.y + 12 }, { x: h.x + 14, y: h.y + 12 }, 1.6, c.lips);
  ctx.fillStyle = c.beardLight;
  for (const [bx, by] of [[3, 12], [8, 16], [11, 19], [6, 20], [12, 15]]) ctx.fillRect(h.x + bx, h.y + by, 1.5, 1.5);
}

function drawWarriorBody(ctx, sk, f) {
  const c = f.char.colors;
  const device = !!(f.move && f.move.def.projectile);
  drawWarriorArm(ctx, sk, 'B', c, true, false);
  drawWarriorLeg(ctx, sk, 'B', c, true);
  drawWarriorTorso(ctx, sk, c);
  drawWarriorLeg(ctx, sk, 'F', c, false);
  drawWarriorHead(ctx, sk, c, f.time);
  drawWarriorArm(ctx, sk, 'F', c, false, device);
}

// ---- Caped saber wielder ----

function drawSithCape(ctx, sk, f, c) {
  const sway = Math.sin(f.time * 0.08) * 3 - Math.max(-8, Math.min(8, f.vx * f.facing)) * 1.2;
  const sh = sk.shoulder;
  const ground = sk.base - 3;
  fillPoly(ctx, [
    { x: sk.neck.x - 3, y: sk.neck.y + 4 },
    { x: sh.x - 20, y: sh.y + 2 },
    { x: sk.hip.x - 38 - sway, y: ground },
    { x: sk.hip.x + 14 - sway * 0.4, y: ground },
    { x: sk.hip.x + 6, y: sk.hip.y - 6 },
    { x: sh.x + 6, y: sh.y + 4 },
  ], c.cape);
  // Fold lines.
  for (const t of [0.3, 0.55, 0.8]) {
    drawLimb(ctx, { x: sh.x - 18 * t, y: sh.y + 10 }, { x: sk.hip.x - 38 * t - sway, y: ground - 4 }, 2, c.capeLight);
  }
}

function drawSithLimbs(ctx, sk, side, c, back) {
  const knee = sk['knee' + side];
  const foot = sk['foot' + side];
  drawLimb(ctx, sk.hip, knee, 16, back ? c.blackShade : c.black);
  drawLimb(ctx, knee, foot, 14, back ? c.blackShade : c.black);
  drawLimb(ctx, lerpPt(knee, foot, 0.55), foot, 16, back ? c.blackShade : c.black);
  drawLimb(ctx, foot, { x: foot.x + 12, y: foot.y + 1 }, 11, c.blackShade);
  if (!back) {
    edgeLine(ctx, sk.hip, knee, 4, 2, c.blackLight, 0.2, 0.8);
    edgeLine(ctx, knee, foot, 4, 2, c.blackLight, 0.55, 0.92);
  }
}

function drawSithArm(ctx, sk, side, c, back) {
  const elbow = sk['elbow' + side];
  const hand = sk['hand' + side];
  drawLimb(ctx, sk.shoulder, elbow, 13, back ? c.blackShade : c.black);
  drawLimb(ctx, elbow, hand, 12, back ? c.blackShade : c.black);
  if (!back) edgeLine(ctx, sk.shoulder, elbow, 4, 2, c.blackLight, 0.3, 0.9);
  drawFist(ctx, elbow, hand, 7, back ? c.blackShade : c.black, c.blackLight, c.helmetLight);
  // Shoulder armor.
  fillCircle(ctx, sk.shoulder.x, sk.shoulder.y + 2, 9, back ? c.blackShade : c.black);
  if (!back) fillCircle(ctx, sk.shoulder.x + 1, sk.shoulder.y - 1, 3.5, c.blackLight);
}

function drawSaber(ctx, sk, c) {
  const a = saberAngle(sk);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const h = sk.handF;
  const at = (d) => ({ x: h.x + ux * d, y: h.y + uy * d });
  // Blade: wide glow, then the hot core.
  drawLimb(ctx, at(6), at(SABER_LENGTH), 7, c.saber);
  drawLimb(ctx, at(7), at(SABER_LENGTH - 2), 2.5, c.saberCore);
  // Hilt through the fist.
  drawLimb(ctx, at(-7), at(7), 5, c.hilt);
  drawLimb(ctx, at(-2), at(2), 6, c.blackLight);
}

function drawSithTorso(ctx, sk, c) {
  const { hip, neck } = sk;
  const dx = neck.x - hip.x;
  const dy = neck.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: -dy / len, y: dx / len };
  const at = (t, side) => ({ x: hip.x + dx * t + n.x * side, y: hip.y + dy * t + n.y * side });
  fillPoly(ctx, [at(-0.05, 16), at(0.8, 19), at(1.03, 8), at(1.03, -10), at(0.8, -17), at(-0.05, -15)], c.black);
  // Shoulder mantle edge and ribbed collar.
  drawLimb(ctx, at(0.78, 18), at(0.84, -16), 2, c.blackLight);
  for (const sd of [-4, 1, 6, 11]) {
    const p0 = at(0.86, sd);
    ctx.fillStyle = c.armorGray;
    ctx.fillRect(p0.x - 1.5, p0.y - 3, 3, 6);
  }
  // Chest control box with lights.
  const box = at(0.6, 9);
  fillRoundRect(ctx, box.x - 5, box.y - 5, 11, 10, 1.5, c.chestBox);
  for (const [ox, oy, col] of [[-3, -3, '#ff4d4d'], [1, -3, '#4dff88'], [-3, 1, '#4dc3ff'], [1, 1, c.armorGrayLight]]) {
    ctx.fillStyle = col;
    ctx.fillRect(box.x + ox, box.y + oy, 2.5, 2.5);
  }
  // Belt with silver boxes.
  drawLimb(ctx, at(0.04, 16), at(0.04, -15), 8, c.blackShade);
  for (const sd of [5, 12]) {
    const b = at(0.04, sd);
    fillRoundRect(ctx, b.x - 3, b.y - 3.5, 6, 7, 1, c.armorGray);
    ctx.fillStyle = c.armorGrayLight;
    ctx.fillRect(b.x - 2, b.y - 2.5, 2, 2);
  }
  // Collar under the helmet.
  drawLimb(ctx, at(1, 0), lerpPt(neck, sk.head, 0.4), 13, c.black);
}

function drawSithHelmet(ctx, sk, c) {
  const h = sk.head;
  // Flared skirt sweeping down at the back.
  fillPoly(ctx, [
    { x: h.x - 15, y: h.y - 4 }, { x: h.x - 22, y: h.y + 17 },
    { x: h.x + 2, y: h.y + 19 }, { x: h.x + 6, y: h.y + 6 },
  ], c.black);
  drawLimb(ctx, { x: h.x - 21, y: h.y + 16 }, { x: h.x + 1, y: h.y + 18 }, 2, c.blackLight);
  // Dome.
  fillCircle(ctx, h.x, h.y - 2, 16, c.black);
  ctx.strokeStyle = c.helmetLight;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(h.x + 1, h.y - 2, 12, -2.3, -1.4);
  ctx.stroke();
  // Angled faceplate.
  fillPoly(ctx, [
    { x: h.x + 4, y: h.y - 7 }, { x: h.x + 17, y: h.y - 3 },
    { x: h.x + 16, y: h.y + 10 }, { x: h.x + 8, y: h.y + 17 }, { x: h.x + 3, y: h.y + 6 },
  ], c.blackShade);
  drawLimb(ctx, { x: h.x + 5, y: h.y - 7 }, { x: h.x + 17, y: h.y - 3 }, 2, c.helmetLight);
  // Eye lens with a pale rim.
  ctx.fillStyle = c.helmetLight;
  ctx.beginPath();
  ctx.ellipse(h.x + 11, h.y - 0.5, 4.5, 3.2, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.lens;
  ctx.beginPath();
  ctx.ellipse(h.x + 11, h.y - 0.5, 3.2, 2.2, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Nose ridge and triangular mouth grille.
  drawLimb(ctx, { x: h.x + 15, y: h.y + 1 }, { x: h.x + 14, y: h.y + 6 }, 2, c.helmetLight);
  fillPoly(ctx, [{ x: h.x + 9, y: h.y + 7 }, { x: h.x + 16, y: h.y + 7 }, { x: h.x + 13, y: h.y + 15 }], c.grille);
  ctx.fillStyle = c.blackShade;
  for (let i = 0; i < 3; i++) ctx.fillRect(h.x + 10.5 + i * 1.8, h.y + 8, 0.9, 4.5 - i);
}

function drawSithBody(ctx, sk, f) {
  const c = f.char.colors;
  drawSithCape(ctx, sk, f, c);
  drawSithArm(ctx, sk, 'B', c, true);
  drawSithLimbs(ctx, sk, 'B', c, true);
  drawSithTorso(ctx, sk, c);
  drawSithLimbs(ctx, sk, 'F', c, false);
  drawSithHelmet(ctx, sk, c);
  drawSithArm(ctx, sk, 'F', c, false);
  drawSaber(ctx, sk, c);
}

// ---- Catsuited officer ----

function drawAgentLeg(ctx, sk, side, c, back) {
  const knee = sk['knee' + side];
  const foot = sk['foot' + side];
  drawLimb(ctx, sk.hip, knee, 13, back ? c.suitShade : c.suit);
  drawLimb(ctx, knee, foot, 11, back ? c.suitShade : c.suit);
  if (!back) {
    edgeLine(ctx, sk.hip, knee, 4.5, 2, c.rimCyan, 0.1, 0.9);
    edgeLine(ctx, sk.hip, knee, -4.5, 2, c.rimPink, 0.1, 0.9);
    edgeLine(ctx, knee, foot, 3.5, 2, c.rimCyan, 0.05, 0.85);
    edgeLine(ctx, knee, foot, -3.5, 2, c.rimPink, 0.05, 0.85);
  }
  // Heeled ankle boot.
  drawLimb(ctx, lerpPt(knee, foot, 0.8), foot, 11, c.boot);
  drawLimb(ctx, foot, { x: foot.x + 11, y: foot.y + 2 }, 7, c.boot);
  drawLimb(ctx, { x: foot.x - 2, y: foot.y + 1 }, { x: foot.x - 2, y: foot.y + 6 }, 3, c.boot);
  if (!back) drawLimb(ctx, { x: foot.x + 3, y: foot.y - 1 }, { x: foot.x + 9, y: foot.y }, 1.5, c.bootShine);
}

function drawAgentArm(ctx, sk, side, c, back) {
  const elbow = sk['elbow' + side];
  const hand = sk['hand' + side];
  drawLimb(ctx, sk.shoulder, elbow, 10, back ? c.suitShade : c.suit);
  drawLimb(ctx, elbow, hand, 9, back ? c.suitShade : c.suit);
  if (!back) {
    edgeLine(ctx, sk.shoulder, elbow, 3.5, 1.8, c.rimCyan, 0.2, 0.95);
    edgeLine(ctx, elbow, hand, -3, 1.8, c.rimPink, 0.05, 0.9);
  }
  if (back) drawFist(ctx, elbow, hand, 5.5, c.skinShade, c.skinDark, c.skin);
  else drawFist(ctx, elbow, hand, 6, c.skin, c.skinDark, c.skinLight);
}

// Phaser rifle, gripped in the front hand: resting over the shoulder (barrel
// angled up behind the head), level when aiming, thrust along the forearm
// during a punch.
function rifleMode(f) {
  if (f.move && /punch|uppercut/i.test(f.move.name)) return 'thrust';
  if (f.move && f.move.def.projectile) return 'aim';
  return 'rest';
}

function drawPhaserRifle(ctx, sk, f, c) {
  const h = sk.handF;
  const mode = rifleMode(f);
  const a = mode === 'thrust' ? Math.atan2(h.y - sk.elbowF.y, h.x - sk.elbowF.x)
    : mode === 'aim' ? -0.12 : -2.6;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const k = 1.15;
  // Resting, the hand holds it low near the stock so the body lies on the
  // shoulder and the barrel points up behind the head.
  const shift = mode === 'rest' ? 14 : 0;
  // along = distance down the barrel from the grip, side = + below, - above.
  const at = (along, side) => {
    const d = along + shift;
    return { x: h.x + (ux * d - uy * side) * k, y: h.y + (uy * d + ux * side) * k };
  };
  // Shoulder stock.
  fillPoly(ctx, [at(-30, -6), at(-12, -6), at(-12, 5), at(-30, 9)], c.rifleDark);
  drawLimb(ctx, at(-29, -5), at(-14, -5), 1.5, c.rifle);
  // Main body with a pale side panel and vents.
  fillPoly(ctx, [at(-13, -8), at(26, -8), at(28, -2), at(26, 5), at(-13, 5)], c.rifle);
  fillPoly(ctx, [at(-4, -5), at(18, -5), at(18, 1), at(-4, 1)], c.rifleLight);
  ctx.fillStyle = c.rifleDark;
  for (let i = 0; i < 4; i++) {
    const v = at(1 + i * 4, -2);
    ctx.fillRect(v.x - 0.8, v.y - 1.5, 1.6, 3);
  }
  drawLimb(ctx, at(-13, 5), at(26, 5), 1.5, c.rifleDark);
  // Top carry handle.
  drawLimb(ctx, at(-2, -9), at(-2, -15), 3, c.rifleDark);
  drawLimb(ctx, at(12, -9), at(12, -15), 3, c.rifleDark);
  drawLimb(ctx, at(-2, -15), at(12, -15), 3.5, c.rifle);
  // Front grip and trigger guard.
  drawLimb(ctx, at(22, 5), at(22, 12), 4.5, c.rifleDark);
  drawLimb(ctx, at(-2, 5), at(4, 9), 2, c.rifleDark);
  // Barrel and glowing emitter.
  drawLimb(ctx, at(27, -2), at(44, -2), 6, c.rifle);
  drawLimb(ctx, at(44, -2), at(49, -2), 8, c.rifleDark);
  fillCircle(ctx, at(50, -2).x, at(50, -2).y, 3, c.energy);
}

function drawAgentTorso(ctx, sk, c) {
  const { hip, neck } = sk;
  const dx = neck.x - hip.x;
  const dy = neck.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: -dy / len, y: dx / len };
  const at = (t, side) => ({ x: hip.x + dx * t + n.x * side, y: hip.y + dy * t + n.y * side });
  fillPoly(ctx, [at(-0.05, 12), at(0.45, 10), at(0.78, 14), at(1.02, 5), at(1.02, -6), at(0.78, -12), at(0.45, -9), at(-0.05, -12)], c.suit);
  // Rim lights: cyan on the front, magenta on the back.
  drawLimb(ctx, at(0.05, 12), at(0.45, 10), 2, c.rimCyan);
  drawLimb(ctx, at(0.45, 10), at(0.78, 14), 2, c.rimCyan);
  drawLimb(ctx, at(0.05, -12), at(0.75, -12), 2, c.rimPink);
  drawLimb(ctx, at(0.55, 5), at(0.7, 9), 1.5, c.suitLight);
  // Neck.
  drawLimb(ctx, at(1, 0), lerpPt(neck, sk.head, 0.5), 7, c.skinShade);
}

function drawAgentHead(ctx, sk, c) {
  const h = sk.head;
  // Short hair: a full cap, swept up and back into volume on top.
  fillCircle(ctx, h.x - 2, h.y - 3, 14.5, c.hair);
  fillPoly(ctx, [
    { x: h.x - 12, y: h.y - 10 }, { x: h.x - 3, y: h.y - 21 }, { x: h.x + 9, y: h.y - 19 },
    { x: h.x + 14, y: h.y - 10 }, { x: h.x + 3, y: h.y - 9 },
  ], c.hair);
  fillPoly(ctx, [{ x: h.x - 15, y: h.y - 4 }, { x: h.x - 15, y: h.y + 7 }, { x: h.x - 8, y: h.y + 9 }, { x: h.x - 7, y: h.y }], c.hairShade);
  for (const [x0, y0, x1, y1] of [[-8, -16, 6, -18], [-11, -9, 2, -14], [-13, -2, -6, -12]]) {
    drawLimb(ctx, { x: h.x + x0, y: h.y + y0 }, { x: h.x + x1, y: h.y + y1 }, 1.6, c.hairLight);
  }
  // Face and ear.
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.ellipse(h.x + 4.5, h.y + 3, 9.5, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  fillCircle(ctx, h.x - 2, h.y + 3, 2.6, c.skinShade);
  // Brow and eye.
  drawLimb(ctx, { x: h.x + 8, y: h.y - 3 }, { x: h.x + 13, y: h.y - 3 }, 1.4, c.hairShade);
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(h.x + 8.5, h.y - 1, 4, 2.5);
  ctx.fillStyle = c.eyes;
  ctx.fillRect(h.x + 10.5, h.y - 1, 2, 2.5);
  // Silver implant curving round the outer brow to the temple.
  ctx.strokeStyle = c.implant;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(h.x + 10, h.y + 0.5, 6, Math.PI * 0.95, Math.PI * 1.5);
  ctx.stroke();
  drawLimb(ctx, { x: h.x + 4.5, y: h.y + 1 }, { x: h.x + 3, y: h.y + 5 }, 1.4, c.implant);
  ctx.fillStyle = c.implantDark;
  ctx.fillRect(h.x + 5, h.y - 3, 1.5, 1.5);
  // Nose, lips and jaw shading.
  fillCircle(ctx, h.x + 14, h.y + 4, 1.8, c.skinShade);
  drawLimb(ctx, { x: h.x + 10, y: h.y + 9.5 }, { x: h.x + 13, y: h.y + 9.5 }, 2, c.lips);
  drawLimb(ctx, { x: h.x - 0.5, y: h.y + 8 }, { x: h.x + 6, y: h.y + 14 }, 1.4, c.skinShade);
}

function drawAgentBody(ctx, sk, f) {
  const c = f.char.colors;
  // Resting, the rifle lies across the back of her shoulders, behind her
  // neck and head; only her gripping hand is in front of it.
  const mode = rifleMode(f);
  drawAgentArm(ctx, sk, 'B', c, true);
  if (mode === 'rest') drawPhaserRifle(ctx, sk, f, c);
  drawAgentLeg(ctx, sk, 'B', c, true);
  drawAgentTorso(ctx, sk, c);
  drawAgentLeg(ctx, sk, 'F', c, false);
  drawAgentHead(ctx, sk, c);
  if (mode !== 'rest') {
    drawPhaserRifle(ctx, sk, f, c);
    // Aiming two-handed: the supporting hand sits on the front grip.
    if (mode === 'aim') drawFist(ctx, sk.elbowB, sk.handB, 5.5, c.skin, c.skinDark, c.skinLight);
  }
  drawAgentArm(ctx, sk, 'F', c, false);
}

// ---- Cut-out art (tools/make_cutout.py) ----

// Each character's file (src/cutout-<id>.js) sets CUTOUTS[id] to
// { width, head, parts }: `width` is skeleton units per pixel of the picture
// across each part, and `head` how much bigger than the picture to draw the head.
const cutoutImages = {};

function cutoutParts(id) {
  if (typeof CUTOUTS === 'undefined' || !CUTOUTS[id]) return null;
  if (!cutoutImages[id]) {
    const { width, head, parts } = CUTOUTS[id];
    const loaded = { width, head, parts: {} };
    for (const [name, part] of Object.entries(parts)) {
      const img = new Image();
      img.src = part.src;
      loaded.parts[name] = { ...part, img };
    }
    cutoutImages[id] = loaded;
  }
  const art = cutoutImages[id];
  return Object.values(art.parts).every((p) => p.img.complete && p.img.naturalWidth) ? art : null;
}

// Draw a part so its pivot sits on joint a and its tip points at joint b,
// stretched along the bone to fit and `width` across it. With lengthScale the
// part keeps the picture's proportions instead of stretching to the bone.
function drawCutoutPart(ctx, part, a, b, width, filter, lengthScale) {
  const [px, py] = part.pivot;
  const [tx, ty] = part.tip;
  const srcLen = Math.hypot(tx - px, ty - py);
  const len = lengthScale ? srcLen * width * lengthScale : Math.hypot(b.x - a.x, b.y - a.y);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
  ctx.scale(len / srcLen, width);
  ctx.rotate(-Math.atan2(ty - py, tx - px));
  ctx.translate(-px, -py);
  if (filter) ctx.filter = filter;
  ctx.drawImage(part.img, 0, 0);
  ctx.restore();
}

function drawCutoutBody(ctx, sk, f) {
  const art = cutoutParts(f.char.id);
  if (!art) return (BODY_STYLES[f.char.fallbackLook] || drawArmoredBody)(ctx, sk, f);
  const { parts, width } = art;
  // Far-side limbs are darker; player 2's copy in a mirror match is recolored.
  const alt = f.char.altFilter ? f.char.altFilter + ' ' : '';
  const near = alt || null;
  const far = alt + 'brightness(0.62)';
  const arm = (side, back) => {
    drawCutoutPart(ctx, parts.upperArm, sk.shoulder, sk['elbow' + side], width, back ? far : near);
    drawCutoutPart(ctx, parts.forearm, sk['elbow' + side], sk['hand' + side], width, back ? far : near);
  };
  const leg = (side, back) => {
    drawCutoutPart(ctx, parts.thigh, sk.hip, sk['knee' + side], width, back ? far : near);
    drawCutoutPart(ctx, parts.shin, sk['knee' + side], sk['foot' + side], width, back ? far : near);
  };
  // Seven's rifle rests behind her shoulders and comes forward to fire.
  const rifle = f.char.armPose ? rifleMode(f) : null;
  arm('B', true);
  if (rifle === 'rest') drawPhaserRifle(ctx, sk, f, f.char.colors);
  leg('B', true);
  drawCutoutPart(ctx, parts.torso, sk.hip, sk.neck, width, near);
  leg('F', false);
  // The head keeps its own proportions; it only turns with the neck.
  ctx.save();
  ctx.translate(sk.neck.x, sk.neck.y + 4);
  ctx.scale(art.head, art.head);
  drawCutoutPart(ctx, parts.head, { x: 0, y: 0 }, { x: sk.head.x - sk.neck.x, y: sk.head.y - sk.neck.y }, width, near, 1);
  ctx.restore();
  if (rifle && rifle !== 'rest') drawPhaserRifle(ctx, sk, f, f.char.colors);
  arm('F', false);
}

const BODY_STYLES = {
  cutout: drawCutoutBody,
  armored: drawArmoredBody,
  warrior: drawWarriorBody,
  sith: drawSithBody,
  agent: drawAgentBody,
};

// ---- Procedural sprite pipeline ----

// Scratch canvas in fighter art pixels (sized by setResolution). The fighter's
// ground point sits at (SPR_OX, SPR_OY).
let SPR_W = 0;
let SPR_H = 0;
let SPR_OX = 0;
let SPR_OY = 0;
const spriteCanvas = document.createElement('canvas');
const spriteCtx = spriteCanvas.getContext('2d', { willReadFrequently: true });
let spriteMask = null;

function isLying(f) {
  return f.state === 'ko' || f.state === 'down' || (f.hitstun > 0 && f.knockedAirborne);
}

// ---- Character art sprites ----

const spriteImages = {};

// Returns { img, data } once the character's art has loaded, else null.
function spriteFor(char) {
  const data = typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA[char.id];
  if (!data) return null;
  let entry = spriteImages[char.id];
  if (!entry) {
    const img = new Image();
    img.src = data.src;
    entry = spriteImages[char.id] = { img, data };
  }
  return entry.img.complete && entry.img.naturalWidth ? entry : null;
}

// How far each move leans (radians, + = toward the opponent) and lunges (px).
const MOVE_MOTION = {
  punch: { rot: 0.12, dx: 16 },
  kick: { rot: -0.22, dx: 20 },
  lowPunch: { rot: 0.1, dx: 14 },
  sweep: { rot: -0.12, dx: 18 },
  uppercut: { rot: -0.1, dx: 12 },
  airKick: { rot: 0.5, dx: 8 },
  special: { rot: -0.08, dx: -8 },
};

// Target transform for the sprite in the fighter's current state.
function spriteMotion(f) {
  const t = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 };
  if (f.won) {
    t.dy = -Math.abs(Math.sin(f.time * 0.12)) * 10;
    return t;
  }
  if (f.hitstun > 0) {
    t.rot = -0.22;
    t.dx = -8;
    return t;
  }
  const blocking = f.blockstun > 0 || (f.isFree && f.grounded && f.holdBack && f.nearThreat);
  const crouched = f.state === 'crouch' || (f.move && f.move.def.crouching) || (blocking && f.holdDown);
  if (crouched) {
    t.sy = 0.74;
    t.sx = 1.08;
    t.rot = 0.06;
  }
  if (blocking) {
    t.rot -= 0.1;
    t.dx = -4;
    return t;
  }
  if (f.move) {
    const { def, frame, name } = f.move;
    const m = MOVE_MOTION[name];
    let k;
    if (frame < def.startup) k = -0.35 * (frame / def.startup); // wind up: lean away
    else if (frame < def.startup + def.active) k = 1;
    else k = 1 - (frame - def.startup - def.active) / def.recovery;
    t.rot += m.rot * k;
    t.dx += m.dx * k;
    return t;
  }
  if (!f.grounded) {
    t.rot = f.vy > 0 ? -0.06 : 0.08;
    t.sy = 1.04;
    t.sx = 0.97;
  } else if (f.state === 'walk') {
    t.dy = -Math.abs(Math.sin(f.walkPhase)) * 3;
    t.rot = Math.sin(f.walkPhase) * 0.035;
  } else if (!crouched) {
    const b = Math.sin(f.time * 0.08);
    t.sy = 1 + b * 0.012;
    t.sx = 1 - b * 0.006;
  }
  return t;
}

// White copy of a sprite, drawn over it for the hit flash.
const flashCache = {};
function flashSilhouette(id, img) {
  if (!flashCache[id]) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    flashCache[id] = c;
  }
  return flashCache[id];
}

// Draws character art in world coordinates at full screen resolution, so
// leaning and rotation don't scramble the art pixels.
function drawArtSprite(ctx, f, entry) {
  const target = spriteMotion(f);
  const v = f.vis || (f.vis = { ...target });
  const k = f.move ? 0.55 : 0.35;
  for (const key of Object.keys(target)) v[key] += (target[key] - v[key]) * k;

  const { img, data } = entry;
  const w = data.w * PIXEL;
  const h = data.h * PIXEL;
  const ax = data.anchorX * PIXEL;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(f.x, GROUND - f.y);
  ctx.scale(f.facing, 1);
  if (isLying(f)) {
    // Fallen backward: rotate about the feet and rest the body on the floor.
    ctx.translate(0, -ax);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(v.dx, v.dy);
    ctx.rotate(v.rot);
    ctx.scale(v.sx, v.sy);
  }
  ctx.drawImage(img, -ax, -h, w, h);
  if (f.flash > 0) {
    ctx.globalAlpha = Math.min(1, f.flash / 5) * 0.75;
    ctx.drawImage(flashSilhouette(f.char.id, img), -ax, -h, w, h);
  }
  ctx.restore();
}

// Procedural fallback: skeleton art rendered at art resolution, then given
// hard edges, the hit flash and a 1-pixel dark outline.
// The area of the scratch canvas the last renderSprite drew: only it is cleared
// and copied to the screen.
const spriteBox = { x: 0, y: 0, w: 0, h: 0 };

function renderSprite(f) {
  const ctx = spriteCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(spriteBox.x, spriteBox.y, spriteBox.w, spriteBox.h);
  ctx.setTransform(1 / FIGHTER_PIXEL, 0, 0, 1 / FIGHTER_PIXEL, SPR_OX, SPR_OY);
  ctx.scale(f.scale, f.scale);
  const sk = skeleton(f.pose);
  if (isLying(f)) {
    ctx.translate(0, -12);
    ctx.scale(f.facing, 1);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(0, -sk.base);
    ctx.scale(f.facing, 1);
  }

  // Only post-process the area around the body: joint bounds plus room for
  // gear (jetpack, rifle, hair) and the outline.
  const m = ctx.getTransform();
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const pt of Object.values(sk)) {
    if (typeof pt !== 'object') continue;
    const q = m.transformPoint(pt);
    x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y);
    x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
  }
  const pad = Math.ceil((48 * f.scale) / FIGHTER_PIXEL);
  x0 = Math.max(0, Math.floor(x0) - pad);
  y0 = Math.max(0, Math.floor(y0) - pad);
  x1 = Math.min(SPR_W, Math.ceil(x1) + pad);
  y1 = Math.min(SPR_H, Math.ceil(y1) + pad);
  const bw = x1 - x0;
  const bh = y1 - y0;

  (BODY_STYLES[f.char.look] || BODY_STYLES[f.char.fallbackLook] || drawArmoredBody)(ctx, sk, f);
  if (bw <= 0 || bh <= 0) return spriteCanvas;

  spriteBox.x = x0;
  spriteBox.y = y0;
  spriteBox.w = bw;
  spriteBox.h = bh;

  // Hard alpha edges, optional hit flash, then a 1-pixel dark outline. Pixels
  // are read as 32-bit words (alpha in the top byte on little-endian machines).
  const img = ctx.getImageData(x0, y0, bw, bh);
  const d = img.data;
  const px = new Uint32Array(d.buffer);
  const flash = f.flash > 0;
  const n = bw * bh;
  for (let p = 0; p < n; p++) {
    const v = px[p];
    if (v >>> 24 < 110) {
      px[p] = 0;
      spriteMask[p] = 0;
      continue;
    }
    px[p] = v | 0xff000000;
    spriteMask[p] = 1;
    if (flash) {
      const i = p * 4;
      d[i] += (255 - d[i]) * 0.7;
      d[i + 1] += (255 - d[i + 1]) * 0.7;
      d[i + 2] += (255 - d[i + 2]) * 0.7;
    }
  }
  for (let y = 0; y < bh; y++) {
    const row = y * bw;
    for (let x = 0; x < bw; x++) {
      const p = row + x;
      if (spriteMask[p]) continue;
      if ((x > 0 && spriteMask[p - 1]) || (x < bw - 1 && spriteMask[p + 1])
        || (y > 0 && spriteMask[p - bw]) || (y < bh - 1 && spriteMask[p + bw])) px[p] = OUTLINE_PX;
    }
  }
  ctx.putImageData(img, x0, y0);
  return spriteCanvas;
}

// A fighter cut from a picture, drawn at full resolution with the same pose
// transform as renderSprite; the hit flash brightens the whole figure.
function drawCutoutFighter(ctx, f) {
  const sk = skeleton(f.pose);
  ctx.save();
  ctx.translate(f.x, GROUND - f.y);
  ctx.scale(f.scale, f.scale);
  if (isLying(f)) {
    ctx.translate(0, -12);
    ctx.scale(f.facing, 1);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(0, -sk.base);
    ctx.scale(f.facing, 1);
  }
  if (f.flash > 0) ctx.filter = 'brightness(2.2)';
  // Smooth scaling keeps the picture's soft, feathered edges (the drawn
  // fighters are scaled without it to stay crisp).
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawCutoutBody(ctx, sk, f);
  ctx.restore();
}

function drawFighterShadow(ctx, f) {
  const s = Math.max(0.4, 1 - f.y / 250);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND + 2, 36 * s * f.scale, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ctx is the full-resolution canvas, already translated into world coordinates.
function drawFighter(ctx, f) {
  const art = spriteFor(f.char);
  if (art) return drawArtSprite(ctx, f, art);
  if (f.char.look === 'cutout' && cutoutParts(f.char.id)) return drawCutoutFighter(ctx, f);
  if (f.char.look === 'painted') {
    const painted = paintedArt(f.char.id);
    if (painted) return drawPaintedFighter(ctx, f, painted);
  }
  const sprite = renderSprite(f);
  const P = FIGHTER_PIXEL;
  const ax = Math.round(f.x / P) * P;
  const ay = Math.round((GROUND - f.y) / P) * P;
  ctx.imageSmoothingEnabled = false;
  const b = spriteBox;
  if (b.w > 0 && b.h > 0) ctx.drawImage(sprite, b.x, b.y, b.w, b.h, ax + (b.x - SPR_OX) * P, ay + (b.y - SPR_OY) * P, b.w * P, b.h * P);
}

function drawFighterBoxes(ctx, f) {
  const hb = f.hurtbox();
  ctx.strokeStyle = 'rgba(80,160,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
  if (f.attackActive) {
    const p = f.hitPoint();
    ctx.strokeStyle = 'rgba(255,60,60,0.95)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, f.hitRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

const SHIELD_COLOR = '#6fd8ff';

// Force field bubble: a translucent shell with a bright rim and hex shimmer;
// it flickers in its last moments.
function drawShield(ctx, f, frame) {
  if (f.shield <= 0) return;
  if (f.shield < 12 && f.shield % 4 < 2) return;
  const e = f.shieldEllipse();
  const field = f.field;
  const color = field.color;
  ctx.save();
  ctx.translate(e.cx, e.cy);
  const shell = (alpha, width) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, e.rx, e.ry, 0, 0, Math.PI * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  if (field.style === 'hex') {
    // Borg honeycomb: a faint green shell covered in hexagon cells.
    shell(0.14, 3);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, e.rx, e.ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    const r = 11;
    const drift = (frame * 0.4) % (r * Math.sqrt(3));
    for (let row = -Math.ceil(e.ry / (r * 1.5)) - 1; row <= Math.ceil(e.ry / (r * 1.5)) + 1; row++) {
      for (let col = -Math.ceil(e.rx / (r * 1.73)) - 1; col <= Math.ceil(e.rx / (r * 1.73)) + 1; col++) {
        const cx = col * r * Math.sqrt(3) + (row % 2 ? (r * Math.sqrt(3)) / 2 : 0);
        const cy = row * r * 1.5 - drift;
        const lit = (Math.sin(frame * 0.15 + row * 1.7 + col * 2.3) + 1) / 2;
        ctx.globalAlpha = 0.2 + lit * 0.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          const x = cx + Math.cos(a) * r * 0.92;
          const y = cy + Math.sin(a) * r * 0.92;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  } else if (field.style === 'force') {
    // The Force: rippling lines pushing outward, no shell.
    ctx.lineCap = 'round';
    // Each line is drawn twice, dark then bright, so it reads on any background.
    for (let i = 0; i < 4; i++) {
      const t = ((frame * 0.035 + i / 4) % 1);
      for (const [stroke, w, a] of [['#1a0f3a', 7 - t * 4, 0.45], [color, 4.5 - t * 3, 0.95], ['#ffffff', 1.4, 0.6]]) {
        ctx.globalAlpha = a * (1 - t);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.ellipse(0, 0, e.rx * (0.55 + t * 0.6), e.ry * (0.6 + t * 0.5), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Streaks radiating out.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.sin(frame * 0.07 + i) * 0.2;
      const t = ((frame * 0.05 + i * 0.37) % 1);
      const r0 = 0.5 + t * 0.55;
      for (const [stroke, w] of [['#1a0f3a', 5], [color, 3]]) {
        ctx.globalAlpha = 0.8 * (1 - t);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.rx * r0, Math.sin(a) * e.ry * r0);
        ctx.lineTo(Math.cos(a) * e.rx * (r0 + 0.2), Math.sin(a) * e.ry * (r0 + 0.2));
        ctx.stroke();
      }
    }
  } else if (field.style === 'plate') {
    // Overlapping curved plates of brown energy in front, like armor.
    shell(0.12, 2);
    const dir = f.facing;
    for (let i = -2; i <= 2; i++) {
      const a0 = i * 0.38 - 0.17;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#f2d6b4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.rx, e.ry, 0, (dir > 0 ? 0 : Math.PI) + a0, (dir > 0 ? 0 : Math.PI) + a0 + 0.34);
      ctx.ellipse(0, 0, e.rx * 0.82, e.ry * 0.86, 0, (dir > 0 ? 0 : Math.PI) + a0 + 0.34, (dir > 0 ? 0 : Math.PI) + a0, true);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.stroke();
    }
  } else {
    // A plain bubble with a highlight and bands drifting up it.
    const pulse = 1 + Math.sin(frame * 0.3) * 0.03;
    ctx.scale(pulse, pulse);
    shell(0.22, 5);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.rx - 6, e.ry - 6, 0, -2.4, -1.2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = color;
    for (let i = 0; i < 6; i++) {
      const t = ((frame * 0.02 + i / 6) % 1) * 2 - 1;
      const y = t * e.ry * 0.85;
      const half = e.rx * Math.sqrt(Math.max(0, 1 - (y / e.ry) ** 2)) * 0.8;
      ctx.beginPath();
      ctx.moveTo(-half, y);
      ctx.lineTo(half, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// The Force choke's grip: a dark ring tightening around the victim's neck,
// with a faint pulse.
function drawChokeGrip(ctx, f, frame) {
  if (!(f.choked > 0) || f.hitstun <= 0) return;
  const sk = skeleton(f.pose);
  const neck = f.toWorld({ x: (sk.neck.x + sk.head.x) / 2, y: (sk.neck.y + sk.head.y) / 2 }, sk);
  const r = (9 + Math.sin(frame * 0.5) * 1.5) * f.scale;
  ctx.save();
  for (const [color, w, a] of [['#1a0f3a', 6, 0.55], ['#8f6bff', 3, 0.9], ['#ffffff', 1, 0.5]]) {
    ctx.globalAlpha = a;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.ellipse(neck.x, neck.y, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Swoosh arc at the striking limb while an attack is out.
function drawAttackTrail(ctx, f) {
  if (!f.move || f.move.def.projectile || f.move.def.choke) return;
  const { def, frame } = f.move;
  const since = frame - def.startup;
  if (since < 0 || since > def.active + 3) return;
  const p = f.hitPoint();
  // A weak move (rating 1) leaves a thin, short swish; a strong one (3) a
  // wide, thick arc with a glow and an echo behind it.
  const rating = def.rating || 2;
  const r = f.hitRadius * [1.25, 1.5, 1.85][rating - 1];
  const spread = [0.6, 0.9, 1.25][rating - 1];
  const mid = f.facing > 0 ? 0 : Math.PI;
  const cx = p.x - f.facing * r * 0.6;
  ctx.save();
  const fade = since < def.active ? 1 : 1 - (since - def.active) / 4;
  ctx.lineCap = 'round';
  const layers = [
    [[f.char.colors.energy, 5, 0.7], ['#ffffff', 2, 0.6]],
    [[f.char.colors.energy, 8, 0.9], ['#ffffff', 3, 0.9]],
    [[f.char.colors.energy, 22, 0.3], [f.char.colors.energy, 12, 0.95], ['#ffffff', 4, 1]],
  ][rating - 1];
  for (const [color, width, alpha] of layers) {
    ctx.globalAlpha = alpha * fade;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, p.y, r, mid - spread, mid + spread);
    ctx.stroke();
  }
  if (rating === 3) {
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = f.char.colors.energy;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx - f.facing * 14, p.y, r * 0.8, mid - spread * 0.8, mid + spread * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

// Shots are drawn bigger or smaller with their rating.
function drawProjectile(ctx, p, time) {
  const k = [0.8, 1, 1.3][(p.def.rating || 2) - 1];
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(k, k);
  ctx.translate(-p.x, -p.y);
  drawProjectileShape(ctx, p, time);
  ctx.restore();
}

function drawProjectileShape(ctx, p, time) {
  const color = p.owner.char.colors.energy;
  if (p.owner.char.projectile === 'bolt') {
    // Blaster bolt: a hot core with a glow, stretched along its travel.
    const dir = Math.sign(p.vx);
    drawLimb(ctx, { x: p.x - dir * 34, y: p.y }, { x: p.x + dir * 6, y: p.y }, 14, color);
    drawLimb(ctx, { x: p.x - dir * 26, y: p.y }, { x: p.x + dir * 4, y: p.y }, 6, '#fff3d0');
    return;
  }
  if (p.owner.char.projectile === 'lightning') {
    // Crackling bolt: a jagged streak trailing back toward the hand, redrawn
    // with new kinks every frame, around a white-hot head.
    const dir = Math.sign(p.vx);
    for (const [stroke, width, spread] of [[color, 7, 14], ['#ffffff', 2.5, 10]]) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (let i = 1; i <= 6; i++) ctx.lineTo(p.x - dir * i * 16, p.y + (Math.random() - 0.5) * spread);
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + dir * (6 + Math.random() * 12), p.y + (Math.random() - 0.5) * 30);
      ctx.stroke();
    }
    fillCircle(ctx, p.x, p.y, p.def.radius * 0.6, color);
    fillCircle(ctx, p.x, p.y, p.def.radius * 0.3, '#ffffff');
    return;
  }
  if (p.owner.char.projectile === 'laser') {
    // Big red laser blast: a long glowing slug with a white core.
    const dir = Math.sign(p.vx);
    drawLimb(ctx, { x: p.x - dir * 110, y: p.y }, { x: p.x + dir * 12, y: p.y }, 44, 'rgba(255,58,58,0.3)');
    drawLimb(ctx, { x: p.x - dir * 100, y: p.y }, { x: p.x + dir * 10, y: p.y }, 28, color);
    drawLimb(ctx, { x: p.x - dir * 88, y: p.y }, { x: p.x + dir * 6, y: p.y }, 11, '#fff0f0');
    fillCircle(ctx, p.x + dir * 6, p.y, 17, 'rgba(255,200,200,0.55)');
    return;
  }
  if (p.owner.char.projectile === 'pulse') {
    // Hand-blaster pulse: a short oval of energy with a white-hot core.
    const dir = Math.sign(p.vx);
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(p.x - dir * i * 10, p.y, 10, 7 - i, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.ellipse(p.x + dir * 2, p.y, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const pulse = 1 + Math.sin(time * 0.5) * 0.12;
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = 0.18 * (5 - i) / 4;
    fillCircle(ctx, p.x - p.vx * i * 2.2, p.y, p.def.radius * (1 - i * 0.12), color);
  }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.def.radius * 1.6 * pulse);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.def.radius * 1.6 * pulse, 0, Math.PI * 2);
  ctx.fill();
}

function drawHealthBar(ctx, f, x, y, w, flip, you) {
  const h = 20;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#3a0d14';
  ctx.fillRect(x, y, w, h);
  const trail = (f.displayHp / MAX_HP) * w;
  const cur = (f.hp / MAX_HP) * w;
  ctx.fillStyle = '#e63946';
  ctx.fillRect(flip ? x + w - trail : x, y, trail, h);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ffe066');
  g.addColorStop(1, '#f4a300');
  ctx.fillStyle = f.hp < 25 ? (Math.floor(f.time / 8) % 2 ? '#ff7b54' : '#ffd166') : g;
  ctx.fillRect(flip ? x + w - cur : x, y, cur, h);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.font = 'italic 900 32px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = flip ? 'right' : 'left';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(f.char.name, flip ? x + w : x, y + h + 7);
  ctx.fillStyle = '#fff';
  ctx.fillText(f.char.name, flip ? x + w : x, y + h + 7);
  if (you) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffd34d';
    ctx.fillText('YOU', flip ? x + w : x, y + h + 44);
  }

  // Force field meter: full and bright when ready or active, refilling while it recharges.
  const mw = 130;
  const mx = flip ? x : x + w - mw;
  const my = y + h + 10;
  const field = f.field;
  const ready = f.shield > 0 ? f.shield / field.frames : f.shieldCooldown > 0 ? 1 - f.shieldCooldown / field.cooldown : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(mx, my, mw, 8);
  ctx.fillStyle = field.color;
  ctx.globalAlpha = f.shieldCooldown > 0 ? 0.45 : 1;
  ctx.fillRect(flip ? mx + mw * (1 - ready) : mx, my, mw * ready, 8);
  ctx.globalAlpha = 1;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillStyle = field.color;
  ctx.textAlign = flip ? 'left' : 'right';
  ctx.fillText('FORCE FIELD', flip ? mx : mx + mw, my + 11);

  // Round wins.
  for (let i = 0; i < 2; i++) {
    const cx = flip ? x + w - 175 - i * 22 : x + 175 + i * 22;
    ctx.beginPath();
    ctx.arc(cx, y + h + 17, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < f.wins ? '#ffd34d' : 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawHUD(ctx, game) {
  // No health bars or timer behind the online lobby: no match is running.
  if (game.mode === 'lobby') return;
  const [a, b] = game.fighters;
  // In an online match, mark which fighter is this player's.
  const you = game.online === 'host' ? 0 : game.online === 'guest' ? 1 : -1;
  drawHealthBar(ctx, a, 30, 24, 380, false, you === 0);
  drawHealthBar(ctx, b, W - 410, 24, 380, true, you === 1);

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(W / 2 - 34, 14, 68, 50);
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = game.timer <= 10 ? '#ff6b6b' : '#fff';
  ctx.fillText(game.training ? '∞' : String(Math.ceil(game.timer)).padStart(2, '0'), W / 2, 40);
  if (game.training) {
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(game.touch ? 'TRAINING · ☰ for menu' : 'TRAINING · Esc for menu', W / 2, H - 16);
  }
}

function drawBanner(ctx, text, sub, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic 900 72px system-ui, sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#1a0b22';
  ctx.strokeText(text, W / 2, H / 2 - 40);
  const g = ctx.createLinearGradient(0, H / 2 - 80, 0, H / 2);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = g;
  ctx.fillText(text, W / 2, H / 2 - 40);
  if (sub) {
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeText(sub, W / 2, H / 2 + 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(sub, W / 2, H / 2 + 20);
  }
  ctx.restore();
}
