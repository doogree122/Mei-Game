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

// The suit's neckline: a thin band of fabric at the base of the neck, over the
// bottom edge of the head piece (whose own neck runs down to it).
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

// ---- Painted profile head ----
//
// Drawn in its own frame: x forward, y up, the skull's center at sk.head, in
// units of `paint.face.size` skeleton units. Order: skin (head and upper neck),
// ear, shading, eye, brow, lips, the Borg implant, then the hair on top.

// `drop` lowers the head toward the shoulders (skeleton units) for a shorter neck.
function headFrame(sk, size, drop = 0) {
  const L = Math.hypot(sk.head.x - sk.neck.x, sk.head.y - sk.neck.y) || 1;
  const up = { x: (sk.head.x - sk.neck.x) / L, y: (sk.head.y - sk.neck.y) / L };
  const fwd = { x: -up.y, y: up.x };
  const c = { x: sk.head.x - up.x * drop, y: sk.head.y - up.y * drop };
  return ([x, y]) => ({ x: c.x + (fwd.x * x + up.x * y) * size, y: c.y + (fwd.y * x + up.y * y) * size });
}

function shapeThrough(ctx, H, pts, closed = true) {
  ctx.beginPath();
  curveThrough(ctx, (closed ? [...pts, pts[0], pts[1]] : pts).map(H), true);
  if (closed) ctx.closePath();
}

function strokeThrough(ctx, H, pts, color, width) {
  ctx.beginPath();
  curveThrough(ctx, pts.map(H), true);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// A soft round glow or shadow.
function softSpot(ctx, c, r, color, alpha) {
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `,${alpha})`));
  g.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ',0)'));
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
}

const FACE_SKIN = [
  [5.0, 6.4], [5.7, 4.2], [6.0, 2.8], [5.55, 1.8], [5.85, 1.1], [7.0, -1.2], [7.15, -1.55], [6.2, -2.2], [6.25, -3.2],
  [6.6, -3.75], [6.15, -4.15], [6.35, -4.65], [5.75, -5.3], [5.75, -6.05], [5.1, -6.6], [3.4, -6.9], [2.0, -7.2],
  [1.9, -12], [-2.6, -12], [-2.9, -5.4], [-5.0, -2.4], [-6.2, 2.8], [-3.2, 8.6], [1.4, 9.2],
];
const FACE_HAIR = [
  [4.6, 5.6], [5.7, 6.7], [6.3, 8.5], [5.3, 10.6], [2.4, 11.6], [-1.8, 11.3], [-5.4, 9.4], [-7.1, 5.4], [-6.9, 1.2],
  [-5.4, -2.4], [-4.1, -2.0], [-2.8, 0.6], [-1.1, 2.8], [1.2, 4.0], [3.0, 4.8],
];

function paintFace(ctx, sk, paint) {
  const F = paint.face;
  const H = headFrame(sk, F.size, F.drop);
  const [sd, sm, sl] = F.skin;

  // Skin: lit from the front, darker toward the back of the head and under the jaw.
  shapeThrough(ctx, H, FACE_SKIN);
  const g = ctx.createLinearGradient(H([-6, 0]).x, H([-6, 0]).y, H([7, 0]).x, H([7, 0]).y);
  g.addColorStop(0, rgb(sd));
  g.addColorStop(0.55, rgb(sm));
  g.addColorStop(0.85, rgb(sl));
  g.addColorStop(1, rgb(sm));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Under the jaw and down the neck.
  const jg = ctx.createLinearGradient(H([0, -6]).x, H([0, -6]).y, H([0, -9.5]).x, H([0, -9.5]).y);
  jg.addColorStop(0, 'rgba(90,50,40,0)');
  jg.addColorStop(0.35, 'rgba(90,50,40,0.45)');
  jg.addColorStop(1, 'rgba(90,50,40,0.15)');
  ctx.fillStyle = jg;
  ctx.fill();
  // The shadow the jaw casts on the neck.
  shapeThrough(ctx, H, [[5.2, -6.7], [3.4, -7.0], [0.6, -6.5], [-2.0, -4.4], [-2.8, -6.6], [-0.2, -8.6], [2.2, -8.8], [4.4, -7.6]]);
  ctx.fillStyle = 'rgba(110,58,48,0.32)';
  ctx.fill();
  // Jawline, cheekbone light, blush, eye socket.
  strokeThrough(ctx, H, [[-2.4, -3.2], [0.8, -5.2], [3.4, -6.4], [5.0, -6.5]], 'rgba(120,70,58,0.1)', 1.2 * F.size);
  softSpot(ctx, H([3.4, -0.6]), 3.2 * F.size, rgb(sl), 0.55);
  softSpot(ctx, H([3.6, -2.2]), 2.2 * F.size, 'rgb(225,120,110)', 0.22);
  softSpot(ctx, H([4.6, 1.5]), 1.6 * F.size, 'rgb(120,70,60)', 0.35);
  ctx.restore();
  // A faint edge so the profile reads against any background.
  shapeThrough(ctx, H, FACE_SKIN);
  ctx.strokeStyle = 'rgba(70,35,30,0.35)';
  ctx.lineWidth = 0.18 * F.size;
  ctx.stroke();

  // Ear.
  shapeThrough(ctx, H, [[-1.0, 1.7], [-0.2, 0.6], [-0.4, -1.6], [-1.3, -2.4], [-2.4, -1.3], [-2.5, 0.8]]);
  ctx.fillStyle = rgb(sm, 0.93);
  ctx.fill();
  strokeThrough(ctx, H, [[-1.2, 1.1], [-0.8, 0.0], [-1.0, -1.4], [-1.7, -1.6]], rgb(sd, 0.85), 0.28 * F.size);

  // Eye: lid, white, iris, lashes.
  shapeThrough(ctx, H, [[3.75, 1.55], [4.6, 1.85], [5.2, 1.55], [4.85, 1.05], [4.2, 1.1]]);
  ctx.fillStyle = 'rgb(236,230,226)';
  ctx.fill();
  ctx.save();
  ctx.clip();
  const iris = H([4.75, 1.4]);
  ctx.beginPath();
  ctx.arc(iris.x, iris.y, 0.5 * F.size, 0, Math.PI * 2);
  ctx.fillStyle = rgb(F.iris);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(iris.x, iris.y, 0.22 * F.size, 0, Math.PI * 2);
  ctx.fillStyle = 'rgb(20,20,24)';
  ctx.fill();
  ctx.restore();
  strokeThrough(ctx, H, [[3.6, 1.6], [4.5, 1.98], [5.3, 1.62]], 'rgb(70,45,35)', 0.32 * F.size);
  // Lashes.
  for (const [x, y, dx, dy] of [[4.7, 1.95, 0.25, 0.4], [5.0, 1.85, 0.35, 0.35], [5.25, 1.68, 0.45, 0.25]]) {
    strokeThrough(ctx, H, [[x, y], [x + dx, y + dy]], 'rgb(50,32,26)', 0.13 * F.size);
  }
  strokeThrough(ctx, H, [[4.2, 1.05], [4.9, 1.0]], 'rgba(120,70,60,0.6)', 0.16 * F.size);

  // Brow.
  strokeThrough(ctx, H, [[3.0, 2.55], [4.3, 2.95], [5.5, 2.8]], rgb(F.brow), 0.5 * F.size);

  // Nostril and lips.
  strokeThrough(ctx, H, [[6.15, -1.75], [6.55, -2.05]], 'rgba(110,60,50,0.8)', 0.3 * F.size);
  shapeThrough(ctx, H, [[5.7, -3.7], [6.25, -3.35], [6.65, -3.85], [6.2, -4.15], [6.45, -4.65], [6.05, -5.0], [5.6, -4.5]]);
  ctx.fillStyle = rgb(F.lips);
  ctx.fill();
  strokeThrough(ctx, H, [[5.6, -4.1], [6.3, -4.05]], 'rgba(90,40,35,0.7)', 0.18 * F.size);
  softSpot(ctx, H([6.05, -4.5]), 0.45 * F.size, 'rgb(255,220,210)', 0.5);

  // The Borg implant: a silver piece curling over the brow, around the
  // outside of the eye and down the cheekbone.
  const [md, mm, ml] = F.implant;
  const path = [[5.1, 3.35], [4.1, 3.55], [3.3, 3.0], [3.0, 1.8], [3.15, 0.6], [3.55, -0.3]];
  const ig = ctx.createLinearGradient(H([2, 3.6]).x, H([2, 3.6]).y, H([3.4, 0]).x, H([3.4, 0]).y);
  ig.addColorStop(0, rgb(ml));
  ig.addColorStop(0.5, rgb(mm));
  ig.addColorStop(1, rgb(md));
  strokeThrough(ctx, H, path, rgb(md), 0.85 * F.size);
  strokeThrough(ctx, H, path, ig, 0.6 * F.size);
  strokeThrough(ctx, H, [[4.8, 3.42], [3.95, 3.5], [3.35, 2.95], [3.1, 1.8]], rgb(md), 0.12 * F.size);
  for (const [x, y] of [[4.5, 3.5], [3.6, 3.3], [3.12, 2.4], [3.05, 1.2], [3.25, 0.2]]) {
    const q = H([x, y]);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 0.14 * F.size, 0, Math.PI * 2);
    ctx.fillStyle = rgb(ml);
    ctx.fill();
  }

  // Hair: swept up and back from the forehead, short at the nape.
  const [hd, hm, hl] = F.hair;
  shapeThrough(ctx, H, FACE_HAIR);
  const hg = ctx.createLinearGradient(H([-6, 4]).x, H([-6, 4]).y, H([4, 10]).x, H([4, 10]).y);
  hg.addColorStop(0, rgb(hd));
  hg.addColorStop(0.5, rgb(hm));
  hg.addColorStop(0.85, rgb(hl));
  hg.addColorStop(1, rgb(hm));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Fine strands following the sweep, light and dark, slightly irregular.
  const dark = `rgba(${hd.join(',')},0.3)`;
  for (let i = 0; i < 24; i++) {
    const o = i / 23;
    const w = Math.sin(i * 2.7) * 0.35;
    const pts = [[5.6 - o * 2.6 + w, 6.2 + o * 0.5], [4.6 - o * 1.8, 10.5 - o * 2.3 + w], [-0.4 - o * 1.6, 11.1 - o * 3.2],
      [-4.6 + o * 0.4 + w, 9.2 - o * 4.4], [-6.4 + o * 1.0, 5.0 - o * 6.0]];
    strokeThrough(ctx, H, pts, i % 3 === 0 ? dark : 'rgba(255,240,200,0.22)', (0.16 + (i % 4) * 0.04) * F.size);
  }
  softSpot(ctx, H([3.4, 9.8]), 3.4 * F.size, rgb(hl), 0.5);
  softSpot(ctx, H([-5.2, 2.0]), 3.6 * F.size, rgb(hd), 0.4);
  ctx.restore();
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
  // A painted neck in her skin tones (it shows only if the head tilts away),
  // the head piece with her own neck over it, then the neckline.
  const up = sub(sk.neck, sk.head);
  const ul = Math.hypot(up.x, up.y) || 1;
  const along = (d) => ({ x: sk.neck.x + (up.x / ul) * d, y: sk.neck.y + (up.y / ul) * d });
  paintLimb(ctx, art, p.skin, 'sleeve', along(-1), along(p.neckLift + 5), W.neck, W.neck * 0.92, {}, 1, grain);
  if (p.face) paintFace(ctx, sk, p);
  else drawPiece(ctx, art.pieces.head, along(p.neckLift), up, p.headScale);
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
