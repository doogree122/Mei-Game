// Drawing: stage, fighters (procedural skeleton art), projectiles and HUD.

function drawLimb(ctx, a, b, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawLeg(ctx, sk, side, c, shade) {
  const knee = sk['knee' + side];
  const foot = sk['foot' + side];
  drawLimb(ctx, sk.hip, knee, 15, shade ? c.bottomShade : c.bottom);
  drawLimb(ctx, knee, foot, 12, shade ? c.bottomShade : c.bottom);
  // Shoe: a short capsule pointing forward from the ankle.
  drawLimb(ctx, foot, { x: foot.x + 9, y: foot.y + 1 }, 9, c.shoes);
}

function drawArm(ctx, sk, side, c, shade) {
  const elbow = sk['elbow' + side];
  const hand = sk['hand' + side];
  drawLimb(ctx, sk.shoulder, elbow, 11, shade ? c.topShade : c.top);
  drawLimb(ctx, elbow, hand, 9, shade ? c.skinShade : c.skin);
  ctx.fillStyle = c.gloves;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawTorso(ctx, sk, c) {
  const { hip, neck } = sk;
  const dx = neck.x - hip.x;
  const dy = neck.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const hipW = 13;
  const chestW = 16;
  const chest = { x: hip.x + dx * 0.8, y: hip.y + dy * 0.8 };
  ctx.fillStyle = c.top;
  ctx.beginPath();
  ctx.moveTo(hip.x + nx * hipW, hip.y + ny * hipW);
  ctx.lineTo(chest.x + nx * chestW, chest.y + ny * chestW);
  ctx.quadraticCurveTo(neck.x, neck.y - 4, chest.x - nx * chestW, chest.y - ny * chestW);
  ctx.lineTo(hip.x - nx * hipW, hip.y - ny * hipW);
  ctx.closePath();
  ctx.fill();
  // Belt / sash.
  drawLimb(ctx, { x: hip.x + nx * hipW, y: hip.y + ny * hipW }, { x: hip.x - nx * hipW, y: hip.y - ny * hipW }, 6, c.trim);
  // Collar trim.
  drawLimb(ctx, { x: chest.x + dx * 0.05, y: chest.y + dy * 0.05 }, { x: neck.x + 3, y: neck.y + 6 }, 3, c.trim);
  // Neck.
  drawLimb(ctx, { x: neck.x, y: neck.y + 2 }, { x: (neck.x + sk.head.x) / 2, y: (neck.y + sk.head.y) / 2 }, 8, c.skinShade);
}

function drawHead(ctx, sk, c, style, time) {
  const h = sk.head;
  const r = BODY.head;
  const sway = Math.sin(time * 0.12) * 3;

  ctx.fillStyle = c.hair;
  if (style === 'ponytail') {
    ctx.beginPath();
    ctx.moveTo(h.x - 8, h.y - 12);
    ctx.quadraticCurveTo(h.x - 30, h.y - 14 + sway, h.x - 30, h.y + 18 + sway);
    ctx.quadraticCurveTo(h.x - 20, h.y + 2, h.x - 12, h.y - 2);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'long') {
    ctx.beginPath();
    ctx.moveTo(h.x - 12, h.y - 8);
    ctx.quadraticCurveTo(h.x - 24, h.y + 18 + sway, h.x - 14, h.y + 34);
    ctx.lineTo(h.x + 2, h.y + 14);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'buns') {
    for (const bx of [-9, 7]) {
      ctx.beginPath();
      ctx.arc(h.x + bx, h.y - r - 2, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Back of head / hair cap.
  ctx.beginPath();
  ctx.arc(h.x - 1.5, h.y - 1.5, r + 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Face.
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.ellipse(h.x + 3.5, h.y + 2.5, r - 3, r - 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bangs.
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.moveTo(h.x - 6, h.y - r);
  ctx.quadraticCurveTo(h.x + 14, h.y - r - 2, h.x + 15, h.y - 3);
  ctx.quadraticCurveTo(h.x + 6, h.y - 8, h.x - 4, h.y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c.hairShine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(h.x - 2, h.y - 3, r - 4, -2.4, -1.5);
  ctx.stroke();
  // Eye + brow.
  ctx.fillStyle = c.eyes;
  ctx.beginPath();
  ctx.ellipse(h.x + 9, h.y + 1, 1.8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLimb(ctx, { x: h.x + 6, y: h.y - 4 }, { x: h.x + 12, y: h.y - 3 }, 1.5, c.hair);
  // Headband.
  if (style !== 'buns') drawLimb(ctx, { x: h.x - 13, y: h.y - 8 }, { x: h.x + 8, y: h.y - 12 }, 3, c.trim);
}

function drawFighter(ctx, f, showBoxes) {
  const c = f.char.colors;
  const sk = skeleton(f.pose);
  const lying = f.pose === POSES.lying || f.state === 'ko' || f.state === 'down'
    || (f.hitstun > 0 && f.knockedAirborne);

  // Shadow.
  const shadowScale = Math.max(0.4, 1 - f.y / 250);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND + 2, 34 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  if (f.flash > 0) ctx.filter = 'brightness(2.2)';
  if (lying) {
    ctx.translate(f.x, GROUND - f.y - 12);
    ctx.scale(f.facing, 1);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(f.x, GROUND - f.y - sk.base);
    ctx.scale(f.facing, 1);
  }

  drawArm(ctx, sk, 'B', c, true);
  drawLeg(ctx, sk, 'B', c, true);
  drawTorso(ctx, sk, c);
  drawLeg(ctx, sk, 'F', c, false);
  drawHead(ctx, sk, c, f.char.hairStyle, f.time);
  drawArm(ctx, sk, 'F', c, false);
  ctx.restore();

  if (showBoxes) {
    const hb = f.hurtbox();
    ctx.strokeStyle = 'rgba(80,160,255,0.9)';
    ctx.lineWidth = 1;
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
  const pulse = 1 + Math.sin(time * 0.5) * 0.12;
  // Trail.
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = 0.18 * (5 - i) / 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x - p.vx * i * 2.2, p.y, FIREBALL.radius * (1 - i * 0.12), 0, Math.PI * 2);
    ctx.fill();
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

// Static stage art is painted once to an offscreen canvas.
let stageCache = null;

function buildStage() {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#1a1036');
  sky.addColorStop(0.55, '#5a2a5e');
  sky.addColorStop(1, '#f08a5d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND);

  // Sun.
  const sun = ctx.createRadialGradient(W * 0.68, 300, 10, W * 0.68, 300, 140);
  sun.addColorStop(0, 'rgba(255,220,150,0.95)');
  sun.addColorStop(0.3, 'rgba(255,170,110,0.6)');
  sun.addColorStop(1, 'rgba(255,140,100,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, GROUND);

  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) ctx.fillRect(rand() * W, rand() * 180, 1.5, 1.5);

  // Mountain layers.
  const layer = (color, baseY, amp, step, phase) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += step) {
      const y = baseY - Math.abs(Math.sin(x * 0.006 + phase)) * amp - Math.sin(x * 0.02 + phase) * amp * 0.2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, GROUND);
    ctx.closePath();
    ctx.fill();
  };
  layer('#6b3a6b', 360, 90, 8, 1.3);
  layer('#4a2550', 400, 70, 8, 2.7);

  // Pagoda-style silhouettes.
  ctx.fillStyle = '#2c1636';
  for (const [px, s] of [[130, 1], [820, 1.2]]) {
    for (let i = 0; i < 3; i++) {
      const w = (70 - i * 16) * s;
      const y = GROUND - 30 - i * 34 * s;
      ctx.fillRect(px - w * 0.35, y - 24 * s, w * 0.7, 26 * s);
      ctx.beginPath();
      ctx.moveTo(px - w / 2 - 10, y - 20 * s);
      ctx.lineTo(px + w / 2 + 10, y - 20 * s);
      ctx.lineTo(px + w / 4, y - 34 * s);
      ctx.lineTo(px - w / 4, y - 34 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
  layer('#2c1636', 440, 30, 10, 0.5);

  // Floor.
  const floor = ctx.createLinearGradient(0, GROUND, 0, H);
  floor.addColorStop(0, '#8a5a44');
  floor.addColorStop(1, '#3d241b');
  ctx.fillStyle = floor;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 40, GROUND);
    ctx.lineTo(W / 2 + i * 120, H);
    ctx.stroke();
  }
  for (const y of [GROUND + 20, GROUND + 46]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,220,180,0.35)';
  ctx.fillRect(0, GROUND, W, 2);
  return cv;
}

function drawStage(ctx) {
  if (!stageCache) stageCache = buildStage();
  ctx.drawImage(stageCache, 0, 0);
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
  ctx.fillText(String(Math.ceil(game.timer)).padStart(2, '0'), W / 2, 40);
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
