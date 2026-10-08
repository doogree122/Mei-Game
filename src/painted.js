// Painted fighters (look 'painted'): the body is drawn as smooth shaded shapes
// at full screen resolution, one shape per limb with rounded joints so the
// figure reads as one body from any pose. Each shape gets a cylinder-like
// light-to-shadow gradient (darkest at its edges) and the fabric grain from the
// reference picture laid over it. The head and fists, which can't be painted
// well in code, are pieces of the reference picture (src/painted-<id>.js, made
// by tools/make_painted_assets.py) pinned to the neck and wrists.
//
// A character's `paint` block sets its colors (dark, mid, light), limb widths
// (radii in skeleton units at each end) and how big the picture pieces are.

const paintedCache = {};

// The picture pieces and texture tiles, once their images have loaded.
function paintedArt(id) {
  if (typeof PAINTED === 'undefined' || !PAINTED[id]) return null;
  if (!paintedCache[id]) {
    const load = (src) => {
      const img = new Image();
      img.src = src;
      return img;
    };
    const pieces = {};
    for (const [name, p] of Object.entries(PAINTED[id].pieces)) pieces[name] = { ...p, img: load(p.src) };
    const textures = {};
    for (const [name, src] of Object.entries(PAINTED[id].textures)) textures[name] = load(src);
    paintedCache[id] = { pieces, textures, patterns: new WeakMap() };
  }
  const art = paintedCache[id];
  const imgs = [...Object.values(art.pieces).map((p) => p.img), ...Object.values(art.textures)];
  return imgs.every((img) => img.complete && img.naturalWidth) ? art : null;
}

// Canvas patterns belong to the context that made them.
function paintedPattern(ctx, art, name) {
  let set = art.patterns.get(ctx);
  if (!set) {
    set = {};
    art.patterns.set(ctx, set);
  }
  if (!set[name]) set[name] = ctx.createPattern(art.textures[name], 'repeat');
  return set[name];
}

const rgb = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

// Fill the current path as a rounded, lit surface. `from`/`to` span the shape
// from its shadow side to its lit side; k darkens far-side limbs.
function shadeSurface(ctx, art, colors, texture, from, to, k, grain) {
  const [dark, mid, light] = colors;
  const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  g.addColorStop(0, rgb(dark, k));
  g.addColorStop(0.45, rgb(mid, k));
  g.addColorStop(0.78, rgb(light, k));
  g.addColorStop(1, rgb(mid, k * 0.92));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const pattern = paintedPattern(ctx, art, texture);
  pattern.setTransform(new DOMMatrix().scaleSelf(grain, grain));
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = pattern;
  ctx.fill();
  ctx.restore();
}

// Path for a tapered limb from a to b with round ends: radius rA at a, rB at b,
// and optional swells (muscle, calf) on its front or back side, peaking at t.
function limbPath(ctx, a, b, rA, rB, swell = {}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const d = { x: dx / len, y: dy / len };
  const n = { x: d.y, y: -d.x }; // the front side for a limb hanging down
  const bump = (t, s) => (s ? s[0] * Math.exp(-(((t - s[1]) / 0.28) ** 2)) : 0);
  const N = 10;
  const front = [];
  const back = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = rA + (rB - rA) * t;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    const rf = r + bump(t, swell.front);
    const rb = r + bump(t, swell.back);
    front.push({ x: cx + n.x * rf, y: cy + n.y * rf });
    back.push({ x: cx - n.x * rb, y: cy - n.y * rb });
  }
  const an = Math.atan2(n.y, n.x);
  ctx.beginPath();
  ctx.moveTo(front[0].x, front[0].y);
  for (const p of front) ctx.lineTo(p.x, p.y);
  ctx.arc(b.x, b.y, rB, an, an + Math.PI);
  for (let i = N; i >= 0; i--) ctx.lineTo(back[i].x, back[i].y);
  ctx.arc(a.x, a.y, rA, an + Math.PI, an + Math.PI * 2);
  ctx.closePath();
  const r = Math.max(rA, rB) + 1.5;
  return { from: { x: a.x - n.x * r, y: a.y - n.y * r }, to: { x: a.x + n.x * r, y: a.y + n.y * r } };
}

function paintLimb(ctx, art, colors, texture, a, b, rA, rB, swell, k, grain) {
  const span = limbPath(ctx, a, b, rA, rB, swell);
  shadeSurface(ctx, art, colors, texture, span.from, span.to, k, grain);
}

// Smooth curve through points (Catmull-Rom), as a run of lineTo calls.
function curveThrough(ctx, pts, first) {
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = i === 0 && first ? 0 : 1; s <= 6; s++) {
      const t = s / 6;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
}

// The torso, shaped from front and back profiles given as [t, x]: t runs from
// the hip (0) to the neck (1) and x is the distance forward (+) or back (-).
function torsoFrame(sk) {
  const L = Math.hypot(sk.neck.x - sk.hip.x, sk.neck.y - sk.hip.y) || 1;
  const u = { x: (sk.neck.x - sk.hip.x) / L, y: (sk.neck.y - sk.hip.y) / L };
  const fwd = { x: -u.y, y: u.x };
  return (t, x) => ({ x: sk.hip.x + u.x * t * L + fwd.x * x, y: sk.hip.y + u.y * t * L + fwd.y * x });
}

function paintTorso(ctx, art, paint, sk, grain) {
  const at = torsoFrame(sk);
  const back = paint.torsoBack.map(([t, x]) => at(t, x));
  const front = paint.torsoFront.map(([t, x]) => at(t, x));
  ctx.beginPath();
  curveThrough(ctx, back, true);
  curveThrough(ctx, [...front].reverse(), false);
  ctx.closePath();
  shadeSurface(ctx, art, paint.suit, 'suit', at(0.5, -13), at(0.5, 13), 1, grain);

  // The gray sleeve fabric wraps over the top of the back and shoulder.
  ctx.beginPath();
  curveThrough(ctx, paint.raglan.map(([t, x]) => at(t, x)), true);
  ctx.closePath();
  shadeSurface(ctx, art, paint.sleeve, 'sleeve', at(0.9, -9), at(0.9, 7), 1, grain);

  // Seams: the curved waist band and the center line down the front.
  ctx.strokeStyle = rgb(paint.suit[0], 0.8);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  curveThrough(ctx, paint.waistSeam.map(([t, x]) => at(t, x)), true);
  ctx.stroke();
  ctx.strokeStyle = rgb(paint.suit[2], 0.9);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  curveThrough(ctx, paint.waistSeam.map(([t, x]) => at(t - 0.025, x)), true);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// The suit's collar: a band of fabric around the base of the neck, drawn over
// the bottom of the head piece so the join never shows.
function paintCollar(ctx, art, paint, sk, grain) {
  const at = torsoFrame(sk);
  const band = paint.collar.map(([t, x]) => at(t, x));
  ctx.beginPath();
  curveThrough(ctx, band, true);
  ctx.closePath();
  shadeSurface(ctx, art, paint.sleeve, 'sleeve', at(1, -6), at(1, 6), 1, grain);
  // A thin blue trim along the neckline's edge.
  ctx.strokeStyle = rgb(paint.suit[1]);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  curveThrough(ctx, paint.collarTrim.map(([t, x]) => at(t, x)), true);
  ctx.stroke();
}

// A boot in the shin's frame at the ankle: heeled, with a pointed toe that
// reaches the floor (4 units below the ankle joint). BOOT_LENGTH stretches the
// foot front to back.
const BOOT_LENGTH = 1.35;
function paintBoot(ctx, art, paint, knee, foot, k, grain) {
  const len = Math.hypot(foot.x - knee.x, foot.y - knee.y) || 1;
  const d = { x: (foot.x - knee.x) / len, y: (foot.y - knee.y) / len };
  const f = { x: d.y, y: -d.x };
  const at = ([x, y]) => ({ x: foot.x + f.x * x * BOOT_LENGTH + d.x * y, y: foot.y + f.y * x * BOOT_LENGTH + d.y * y });
  const upper = [[-2.6, -3], [-3.1, 0.6], [-2.9, 3], [-1.2, 2.4], [2.5, 2.6], [6, 3.4], [10.6, 4], [8.4, 2.4], [3.6, 0.6], [2.3, -3]];
  ctx.beginPath();
  upper.forEach((p, i) => {
    const q = at(p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  ctx.closePath();
  shadeSurface(ctx, art, paint.suit, 'suit', at([0, -3]), at([0, 4]), k, grain);
  // Heel block and sole.
  ctx.fillStyle = rgb(paint.sole, k);
  ctx.beginPath();
  for (const [i, p] of [[-3, 2.6], [-2.9, 4], [-1.5, 4], [-1.25, 2.4]].entries()) {
    const q = at(p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(paint.sole, k);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (const [i, p] of [[-1.2, 2.5], [2.5, 2.8], [6, 3.6], [10.6, 4.1]].entries()) {
    const q = at(p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();
}

// A picture piece with its pivot at `at`, turned so pivot -> tip points along
// `dir`, `scale` skeleton units per picture pixel.
function drawPiece(ctx, piece, at, dir, scale) {
  const [px, py] = piece.pivot;
  const [tx, ty] = piece.tip;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(Math.atan2(dir.y, dir.x) - Math.atan2(ty - py, tx - px));
  ctx.scale(scale, scale);
  ctx.drawImage(piece.img, -px, -py);
  ctx.restore();
}

function paintedBody(ctx, sk, f, art) {
  const p = f.char.paint;
  const W = p.widths;
  const grain = p.grain;
  const FAR = 0.68;
  const sub = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  // Any whole-figure filter (hit flash, mirror-match colors) set by the caller.
  const base = ctx.filter === 'none' ? '' : ctx.filter;

  const arm = (side, k, fist) => {
    const elbow = sk['elbow' + side];
    const hand = sk['hand' + side];
    paintLimb(ctx, art, p.sleeve, 'sleeve', sk.shoulder, elbow, W.shoulder, W.elbow, { front: [0.5, 0.35] }, k, grain);
    paintLimb(ctx, art, p.sleeve, 'sleeve', elbow, hand, W.elbow * 0.95, W.wrist, { front: [0.45, 0.3] }, k, grain);
    if (k < 1) ctx.filter = `${base} brightness(${k})`;
    drawPiece(ctx, art.pieces[fist], hand, sub(elbow, hand), p.pieceScale);
    ctx.filter = base || 'none';
  };
  const leg = (side, k) => {
    const knee = sk['knee' + side];
    const foot = sk['foot' + side];
    paintLimb(ctx, art, p.suit, 'suit', sk.hip, knee, W.hip, W.knee, { front: [1.0, 0.35], back: [1.6, 0.18] }, k, grain);
    paintLimb(ctx, art, p.suit, 'suit', knee, foot, W.knee * 0.95, W.ankle, { back: [1.5, 0.3], front: [0.3, 0.2] }, k, grain);
    paintBoot(ctx, art, p, knee, foot, k, grain);
  };

  const rifle = f.char.armPose ? rifleMode(f) : null;
  arm('B', FAR, 'borgFist');
  if (rifle === 'rest') drawPhaserRifle(ctx, sk, f, f.char.colors);
  leg('B', FAR);
  paintTorso(ctx, art, p, sk, grain);
  leg('F', 1);
  // Neck, then the head piece over it.
  const up = sub(sk.neck, sk.head);
  const ul = Math.hypot(up.x, up.y) || 1;
  const neckTop = { x: sk.neck.x + (up.x / ul) * 5, y: sk.neck.y + (up.y / ul) * 5 };
  paintLimb(ctx, art, p.skin, 'sleeve', { x: sk.neck.x - (up.x / ul) * 2, y: sk.neck.y - (up.y / ul) * 2 }, neckTop, W.neck, W.neck * 0.9, {}, 1, grain);
  drawPiece(ctx, art.pieces.head, { x: sk.neck.x + (up.x / ul) * 3, y: sk.neck.y + (up.y / ul) * 3 }, up, p.headScale);
  paintCollar(ctx, art, p, sk, grain);
  if (rifle && rifle !== 'rest') drawPhaserRifle(ctx, sk, f, f.char.colors);
  arm('F', 1, 'fist');
}

// Drawn straight onto the screen canvas in world coordinates, with the same
// pose transform as the other fighters.
function drawPaintedFighter(ctx, f, art) {
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
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const filters = [f.char.altFilter, f.flash > 0 ? 'brightness(2)' : ''].filter(Boolean).join(' ');
  if (filters) ctx.filter = filters;
  paintedBody(ctx, sk, f, art);
  ctx.restore();
}
