// Drawing: fighters (skeleton-posed art rendered as pixel sprites), projectiles and HUD.
//
// The world is drawn at half resolution (PIXEL = 2 screen pixels per art pixel)
// and scaled up without smoothing. Fighters additionally get hard alpha edges and
// a dark 1-pixel outline so they read like hand-made sprites.

const PIXEL = 2;
const OUTLINE = [13, 15, 22];

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

// ---- Armored bounty hunter body ----

function drawArmoredLeg(ctx, sk, side, c, back) {
  const knee = sk['knee' + side];
  const foot = sk['foot' + side];
  drawLimb(ctx, sk.hip, knee, 16, back ? c.suitShade : c.suit);
  drawLimb(ctx, knee, foot, 13, back ? c.suitShade : c.suit);
  // Boot shaft and toe.
  drawLimb(ctx, lerpPt(knee, foot, 0.55), foot, 15, c.boot);
  drawLimb(ctx, foot, { x: foot.x + 11, y: foot.y + 1 }, 10, c.boot);
  // Knee armor.
  fillCircle(ctx, knee.x + 2, knee.y, 8, back ? c.accentShade : c.accent);
  if (!back) fillCircle(ctx, knee.x + 4, knee.y - 3, 3, c.accentLight);
}

function drawArmoredArm(ctx, sk, side, c, back, holdingBlaster) {
  const elbow = sk['elbow' + side];
  const hand = sk['hand' + side];
  drawLimb(ctx, sk.shoulder, elbow, 12, back ? c.suitShade : c.suit);
  // Gauntlet.
  drawLimb(ctx, elbow, hand, 12, back ? c.armorShade : c.armor);
  if (!back) drawLimb(ctx, lerpPt(elbow, hand, 0.25), lerpPt(elbow, hand, 0.6), 4, c.armorLight);
  fillCircle(ctx, hand.x, hand.y, 7, c.glove);

  if (holdingBlaster) {
    const dx = hand.x - elbow.x;
    const dy = hand.y - elbow.y;
    const len = Math.hypot(dx, dy) || 1;
    const tip = { x: hand.x + (dx / len) * 20, y: hand.y + (dy / len) * 20 };
    drawLimb(ctx, hand, tip, 7, c.metal);
    drawLimb(ctx, { x: hand.x, y: hand.y }, { x: hand.x - dy / len * 8, y: hand.y + dx / len * 8 }, 5, c.metal);
  }

  // Shoulder pauldron on top of the upper arm.
  const ang = Math.atan2(elbow.y - sk.shoulder.y, elbow.x - sk.shoulder.x);
  ctx.save();
  ctx.translate(sk.shoulder.x + Math.cos(ang) * 5, sk.shoulder.y + Math.sin(ang) * 5);
  ctx.rotate(ang);
  ctx.fillStyle = back ? c.accentShade : c.accent;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!back) {
    ctx.fillStyle = c.accentLight;
    ctx.beginPath();
    ctx.ellipse(-2, -3, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Jetpack and slung rifle, drawn behind the torso in a torso-aligned frame.
function drawJetpack(ctx, sk, f, c) {
  const p = f.pose;
  const mid = lerpPt(sk.hip, sk.neck, 0.62);
  ctx.save();
  ctx.translate(mid.x, mid.y);
  ctx.rotate(p.torso);

  // Rifle across the back, muzzle poking up past the shoulder.
  drawLimb(ctx, { x: -6, y: 26 }, { x: -24, y: -44 }, 5, c.metal);
  drawLimb(ctx, { x: -22, y: -36 }, { x: -25, y: -48 }, 3, c.metal);

  // Pack body.
  ctx.fillStyle = c.pack;
  ctx.beginPath();
  ctx.roundRect(-30, -22, 20, 40, 5);
  ctx.fill();
  ctx.fillStyle = c.packShade;
  ctx.fillRect(-30, -18, 6, 34);
  // Rocket on top.
  fillPoly(ctx, [{ x: -27, y: -22 }, { x: -15, y: -22 }, { x: -21, y: -36 }], c.accent);
  ctx.fillStyle = c.packShade;
  ctx.fillRect(-27, -24, 12, 4);
  // Thruster nozzles.
  ctx.fillStyle = c.metal;
  ctx.fillRect(-28, 18, 7, 6);
  ctx.fillRect(-19, 18, 7, 6);

  // Thruster flame while airborne.
  if (f.y > 0 && f.state !== 'ko' && f.hitstun === 0) {
    const flick = (f.time % 4) * 3;
    for (const nx of [-24.5, -15.5]) {
      fillPoly(ctx, [{ x: nx - 4, y: 24 }, { x: nx + 4, y: 24 }, { x: nx, y: 40 + flick }], '#ff8a2a');
      fillPoly(ctx, [{ x: nx - 2, y: 24 }, { x: nx + 2, y: 24 }, { x: nx, y: 32 + flick / 2 }], '#ffe27a');
    }
  }
  ctx.restore();
}

function drawArmoredTorso(ctx, sk, c) {
  const { hip, neck } = sk;
  const dx = neck.x - hip.x;
  const dy = neck.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const u = { x: dx / len, y: dy / len }; // along the spine
  const n = { x: -u.y, y: u.x }; // forward
  const at = (t, side) => ({ x: hip.x + dx * t + n.x * side, y: hip.y + dy * t + n.y * side });

  // Flight suit.
  fillPoly(ctx, [at(0, 14), at(0.8, 17), at(1.02, 6), at(1.02, -8), at(0.8, -15), at(0, -13)], c.suit);
  // Chest plate with highlight.
  fillPoly(ctx, [at(0.48, 16), at(0.9, 18), at(0.96, -6), at(0.5, -9)], c.armor);
  fillPoly(ctx, [at(0.55, 16), at(0.88, 17.5), at(0.88, 11), at(0.58, 10)], c.armorLight);
  // Ab plate with control buttons.
  fillPoly(ctx, [at(0.18, 14), at(0.42, 15), at(0.42, 2), at(0.18, 1)], c.armorShade);
  for (const [t, col] of [[0.25, c.accent], [0.33, '#ffd34d'], [0.25, '#5fd8ff']]) {
    const pt = at(t, col === '#5fd8ff' ? 6 : 10);
    ctx.fillStyle = col;
    ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
  }
  // Belt with pouches.
  drawLimb(ctx, at(0, 15), at(0, -14), 7, c.boot);
  ctx.fillStyle = c.pack;
  const pouch = at(0.02, 8);
  ctx.fillRect(pouch.x - 4, pouch.y - 3, 8, 7);
  // Neck seal.
  drawLimb(ctx, at(1, 0), lerpPt(neck, sk.head, 0.5), 10, c.suitShade);
}

function drawHelmet(ctx, sk, c) {
  const h = sk.head;
  const r = BODY.head + 1;
  // Dome.
  fillCircle(ctx, h.x, h.y, r, c.armor);
  // Cheek / jaw plates.
  ctx.fillStyle = c.armorShade;
  ctx.beginPath();
  ctx.roundRect(h.x - 13, h.y + 2, 27, 13, 4);
  ctx.fill();
  // Dome highlight.
  ctx.strokeStyle = c.armorLight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(h.x, h.y, r - 4, -2.5, -1.6);
  ctx.stroke();
  // Crest stripe.
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(h.x, h.y, r - 1, -2.2, -1.1);
  ctx.stroke();
  // Visor slit.
  ctx.fillStyle = c.visor;
  ctx.fillRect(h.x - 1, h.y - 4, r + 2, 6);
  ctx.fillStyle = 'rgba(160,220,255,0.8)';
  ctx.fillRect(h.x + 8, h.y - 3, 3, 2);
  // Side comm disc.
  fillCircle(ctx, h.x - 5, h.y + 2, 5, c.armorShade);
  fillCircle(ctx, h.x - 5, h.y + 2, 2, c.accent);
  // Breather grille.
  ctx.fillStyle = c.visor;
  for (let i = 0; i < 3; i++) ctx.fillRect(h.x + 6 + i * 3, h.y + 8, 2, 4);
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
  // Boots with a polished highlight.
  drawLimb(ctx, lerpPt(knee, foot, 0.72), foot, 14, c.boot);
  drawLimb(ctx, foot, { x: foot.x + 12, y: foot.y + 1 }, 10, c.boot);
  if (!back) drawLimb(ctx, { x: foot.x + 3, y: foot.y - 3 }, { x: foot.x + 10, y: foot.y - 2 }, 2, c.bootShine);
}

function drawWarriorArm(ctx, sk, side, c, back, holdingDevice) {
  const elbow = sk['elbow' + side];
  const hand = sk['hand' + side];
  drawLimb(ctx, sk.shoulder, elbow, 13, back ? c.tunicShade : c.tunic);
  drawLimb(ctx, elbow, hand, 11, back ? c.tunicShade : c.tunic);
  fillCircle(ctx, hand.x, hand.y, 6.5, back ? c.skinShade : c.skin);
  // Black shoulder yoke continues over the top of the arm.
  fillCircle(ctx, sk.shoulder.x, sk.shoulder.y, 8, back ? c.blackShade : c.black);

  if (holdingDevice) {
    const dx = hand.x - elbow.x;
    const dy = hand.y - elbow.y;
    const len = Math.hypot(dx, dy) || 1;
    const tip = { x: hand.x + (dx / len) * 13, y: hand.y + (dy / len) * 13 };
    drawLimb(ctx, hand, tip, 8, c.device);
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

  // Gold tunic body.
  fillPoly(ctx, [at(0, 15), at(0.8, 18), at(1.02, 7), at(1.02, -9), at(0.8, -16), at(0, -14)], c.tunic);
  fillPoly(ctx, [at(0.2, -14), at(0.8, -16), at(0.8, -9), at(0.2, -8)], c.tunicShade);
  // Black waistband and shoulder yoke.
  fillPoly(ctx, [at(-0.02, 15), at(0.2, 16), at(0.2, -15), at(-0.02, -14)], c.black);
  fillPoly(ctx, [at(0.76, 18), at(1.02, 7), at(1.02, -9), at(0.76, -16)], c.black);
  // High collar.
  drawLimb(ctx, at(1, 1), lerpPt(neck, sk.head, 0.35), 12, c.black);

  // Chain-mail sash, back shoulder to front hip, with link texture.
  const top = at(0.98, -9);
  const bottom = at(0.1, 15);
  drawLimb(ctx, top, bottom, 14, c.sash);
  ctx.fillStyle = c.sashShade;
  for (let i = 1; i < 9; i++) {
    const pt = lerpPt(top, bottom, i / 9);
    ctx.fillRect(pt.x - 3, pt.y - 1, 2, 2);
    ctx.fillRect(pt.x + 1, pt.y + 1, 2, 2);
  }
  // Two round clasps near the shoulder.
  for (const t of [0.14, 0.26]) {
    const clasp = lerpPt(top, bottom, t);
    fillCircle(ctx, clasp.x, clasp.y, 3.5, c.sashShade);
    fillCircle(ctx, clasp.x - 0.5, clasp.y - 0.5, 1.5, c.sashLight);
  }
}

function drawWarriorHead(ctx, sk, c, time) {
  const h = sk.head;
  const sway = Math.sin(time * 0.1);

  // Straight, shoulder-length hair cut level, hanging behind the face.
  fillPoly(ctx, [
    { x: h.x - 1, y: h.y - 17 },
    { x: h.x - 16, y: h.y - 11 },
    { x: h.x - 19 + sway, y: h.y + 18 },
    { x: h.x - 1 + sway, y: h.y + 20 },
    { x: h.x + 3, y: h.y + 4 },
  ], c.hair);
  fillCircle(ctx, h.x - 3, h.y - 1, 14.5, c.hair);
  drawLimb(ctx, { x: h.x - 11, y: h.y - 8 }, { x: h.x - 13 + sway, y: h.y + 15 }, 2, c.hairLight);
  drawLimb(ctx, { x: h.x - 5, y: h.y - 12 }, { x: h.x - 6 + sway, y: h.y + 16 }, 2, c.hairLight);

  // Face.
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.ellipse(h.x + 4, h.y + 2, 11.5, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Large forehead crest rising from the brow over the hairline.
  ctx.beginPath();
  ctx.ellipse(h.x + 3, h.y - 9, 12, 10, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // Stacked ridges: a shadow line with a lit edge above each one.
  for (let i = 0; i < 4; i++) {
    const y = h.y - 5 - i * 3.6;
    const x0 = h.x + 1 + i * 0.5;
    const x1 = h.x + 14 - i * 2;
    drawLimb(ctx, { x: x0, y }, { x: x1, y: y - 1 }, 2, c.skinShade);
    drawLimb(ctx, { x: x0 + 1, y: y - 1.6 }, { x: x1 - 1, y: y - 2.6 }, 1.2, c.skinLight);
  }
  // Heavy brow.
  drawLimb(ctx, { x: h.x + 5, y: h.y - 2 }, { x: h.x + 16, y: h.y - 2 }, 4.5, c.skinShade);

  // Eye under the brow.
  ctx.fillStyle = '#f2ead8';
  ctx.fillRect(h.x + 8, h.y, 5, 3);
  ctx.fillStyle = c.eyes;
  ctx.fillRect(h.x + 10, h.y, 2.5, 3);
  // Broad nose.
  fillCircle(ctx, h.x + 15, h.y + 4, 3.4, c.skin);
  fillCircle(ctx, h.x + 14, h.y + 6, 1.2, c.skinShade);

  // Full beard along the jaw, plus mustache.
  fillPoly(ctx, [
    { x: h.x - 1, y: h.y + 4 }, { x: h.x + 7, y: h.y + 10 }, { x: h.x + 16, y: h.y + 10 },
    { x: h.x + 14, y: h.y + 20 }, { x: h.x + 5, y: h.y + 21 }, { x: h.x - 1, y: h.y + 13 },
  ], c.beard);
  drawLimb(ctx, { x: h.x + 9, y: h.y + 9 }, { x: h.x + 16, y: h.y + 9 }, 2.5, c.beard);
  drawLimb(ctx, { x: h.x + 10, y: h.y + 12 }, { x: h.x + 14, y: h.y + 12 }, 1.5, c.skinShade);
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

const BODY_STYLES = {
  armored: drawArmoredBody,
  warrior: drawWarriorBody,
};

// ---- Sprite pipeline ----

// Scratch canvas in art pixels. The fighter's ground point sits at (SPR_OX, SPR_OY).
const SPR_W = 170;
const SPR_H = 150;
const SPR_OX = 85;
const SPR_OY = 135;
const spriteCanvas = document.createElement('canvas');
spriteCanvas.width = SPR_W;
spriteCanvas.height = SPR_H;
const spriteCtx = spriteCanvas.getContext('2d', { willReadFrequently: true });
const spriteMask = new Uint8Array(SPR_W * SPR_H);

function isLying(f) {
  return f.state === 'ko' || f.state === 'down' || (f.hitstun > 0 && f.knockedAirborne);
}

function renderSprite(f) {
  const ctx = spriteCtx;
  const sk = skeleton(f.pose);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, SPR_W, SPR_H);
  ctx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, SPR_OX, SPR_OY);
  if (isLying(f)) {
    ctx.translate(0, -12);
    ctx.scale(f.facing, 1);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(0, -sk.base);
    ctx.scale(f.facing, 1);
  }
  (BODY_STYLES[f.char.look] || drawArmoredBody)(ctx, sk, f);

  // Hard alpha edges, optional hit flash, then a 1-pixel dark outline.
  const img = ctx.getImageData(0, 0, SPR_W, SPR_H);
  const d = img.data;
  const flash = f.flash > 0;
  for (let i = 0, p = 0; p < spriteMask.length; i += 4, p++) {
    if (d[i + 3] < 110) {
      d[i + 3] = 0;
      spriteMask[p] = 0;
      continue;
    }
    d[i + 3] = 255;
    spriteMask[p] = 1;
    if (flash) {
      d[i] += (255 - d[i]) * 0.7;
      d[i + 1] += (255 - d[i + 1]) * 0.7;
      d[i + 2] += (255 - d[i + 2]) * 0.7;
    }
  }
  for (let y = 0; y < SPR_H; y++) {
    for (let x = 0; x < SPR_W; x++) {
      const p = y * SPR_W + x;
      if (spriteMask[p]) continue;
      const near = (x > 0 && spriteMask[p - 1]) || (x < SPR_W - 1 && spriteMask[p + 1])
        || (y > 0 && spriteMask[p - SPR_W]) || (y < SPR_H - 1 && spriteMask[p + SPR_W]);
      if (near) {
        const i = p * 4;
        d[i] = OUTLINE[0];
        d[i + 1] = OUTLINE[1];
        d[i + 2] = OUTLINE[2];
        d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return spriteCanvas;
}

function drawFighterShadow(ctx, f) {
  const s = Math.max(0.4, 1 - f.y / 250);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND + 2, 36 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ctx is the half-resolution world buffer; camPix is the camera offset in art pixels.
function drawFighter(ctx, f, showBoxes, camPix) {
  const sprite = renderSprite(f);
  const ax = Math.round(f.x / PIXEL) - camPix;
  const ay = Math.round((GROUND - f.y) / PIXEL);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(sprite, ax - SPR_OX, ay - SPR_OY);
  ctx.restore();

  if (showBoxes) {
    const hb = f.hurtbox();
    ctx.strokeStyle = 'rgba(80,160,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
    if (f.attackActive) {
      const p = f.hitPoint();
      ctx.strokeStyle = 'rgba(255,60,60,0.95)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, f.move.def.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawProjectile(ctx, p, time) {
  const color = p.owner.char.colors.energy;
  if (p.owner.char.projectile === 'bolt') {
    // Blaster bolt: a hot core with a glow, stretched along its travel.
    const dir = Math.sign(p.vx);
    drawLimb(ctx, { x: p.x - dir * 34, y: p.y }, { x: p.x + dir * 6, y: p.y }, 14, color);
    drawLimb(ctx, { x: p.x - dir * 26, y: p.y }, { x: p.x + dir * 4, y: p.y }, 6, '#fff3d0');
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
    fillCircle(ctx, p.x - p.vx * i * 2.2, p.y, FIREBALL.radius * (1 - i * 0.12), color);
  }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, FIREBALL.radius * 1.6 * pulse);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, FIREBALL.radius * 1.6 * pulse, 0, Math.PI * 2);
  ctx.fill();
}

function drawHealthBar(ctx, f, x, y, w, flip) {
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

  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.textAlign = flip ? 'right' : 'left';
  ctx.fillText(f.char.name, flip ? x + w : x, y + h + 8);

  // Round wins.
  for (let i = 0; i < 2; i++) {
    const cx = flip ? x + w - 110 - i * 22 : x + 110 + i * 22;
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
  const [a, b] = game.fighters;
  drawHealthBar(ctx, a, 30, 24, 380, false);
  drawHealthBar(ctx, b, W - 410, 24, 380, true);

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
    ctx.fillText('TRAINING · Esc for menu', W / 2, H - 16);
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
