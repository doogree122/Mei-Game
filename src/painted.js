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
  const data = typeof PAINTED !== 'undefined' && PAINTED[id];
  // A character painted entirely in code has no picture pieces to wait for.
  if (!data) return (paintedCache[id] ||= { pieces: {}, textures: {}, patterns: new WeakMap() });
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
  if (!set[name] && art.textures[name]) set[name] = ctx.createPattern(art.textures[name], 'repeat');
  return set[name] || null;
}

const rgb = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

// Fill the current path as a rounded, lit surface. `from`/`to` span the shape
// from its shadow side to its lit side; k darkens far-side limbs.
function shadeSurface(ctx, art, colors, texture, from, to, k, grain, strength = 0.55) {
  const [dark, mid, light] = colors;
  const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  g.addColorStop(0, rgb(dark, k));
  g.addColorStop(0.45, rgb(mid, k));
  g.addColorStop(0.78, rgb(light, k));
  g.addColorStop(1, rgb(mid, k * 0.92));
  ctx.fillStyle = g;
  ctx.fill();
  const pattern = paintedPattern(ctx, art, texture);
  if (!pattern) return;
  ctx.save();
  ctx.clip();
  pattern.setTransform(new DOMMatrix().scaleSelf(grain, grain));
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = strength;
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
  // `swell.flat` squares off an end ('a', 'b' or 'both'), for armor bands.
  const flat = swell.flat || '';
  if (flat === 'b' || flat === 'both') ctx.lineTo(back[N].x, back[N].y);
  else ctx.arc(b.x, b.y, rB, an, an + Math.PI);
  for (let i = N; i >= 0; i--) ctx.lineTo(back[i].x, back[i].y);
  if (!(flat === 'a' || flat === 'both')) ctx.arc(a.x, a.y, rA, an + Math.PI, an + Math.PI * 2);
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

// The torso: the outline filled with its base fabric, then `torsoLayers`
// (panels of other fabric: shoulders, belt, sash...) clipped to it, then
// `torsoLines` (seams). Fabrics name a color set and a texture in the paint block.
function paintTorso(ctx, art, paint, sk, grain) {
  const at = torsoFrame(sk);
  const outline = () => {
    ctx.beginPath();
    curveThrough(ctx, paint.torsoBack.map(([t, x]) => at(t, x)), true);
    curveThrough(ctx, [...paint.torsoFront].reverse().map(([t, x]) => at(t, x)), false);
    ctx.closePath();
  };
  const [colors, texture] = paint.torso;
  outline();
  shadeSurface(ctx, art, paint[colors], texture, at(0.5, -14), at(0.5, 14), 1, grain);
  ctx.save();
  outline();
  ctx.clip();
  for (const layer of paint.torsoLayers || []) {
    ctx.beginPath();
    if (layer.smooth) {
      curveThrough(ctx, layer.shape.map(([t, x]) => at(t, x)), true);
    } else {
      layer.shape.forEach(([t, x], i) => {
        const q = at(t, x);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
    }
    ctx.closePath();
    shadeSurface(ctx, art, paint[layer.fabric[0]], layer.fabric[1], at(0.5, -14), at(0.5, 14), 1, layer.grain || grain, layer.strength);
  }
  // Badges: small flat shapes on the chest (a comm badge).
  for (const badge of paint.torsoBadges || []) {
    ctx.beginPath();
    badge.shape.forEach(([t, x], i) => {
      const q = at(t, x);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    const q0 = at(...badge.shape[0]);
    const q1 = at(...badge.shape[2]);
    const bg = ctx.createLinearGradient(q0.x, q0.y, q1.x, q1.y);
    bg.addColorStop(0, rgb(badge.colors[1]));
    bg.addColorStop(1, rgb(badge.colors[0]));
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = rgb(badge.colors[0], 0.7);
    ctx.lineWidth = 0.2;
    ctx.stroke();
  }
  for (const line of paint.torsoLines || []) {
    ctx.strokeStyle = rgb(line.color);
    ctx.lineWidth = line.width;
    ctx.beginPath();
    curveThrough(ctx, line.pts.map(([t, x]) => at(t, x)), true);
    ctx.stroke();
  }
  ctx.restore();
}

// The suit's neckline: a thin band of fabric at the base of the neck, over the
// bottom edge of the head piece (whose own neck runs down to it).
function paintCollar(ctx, art, paint, sk, grain) {
  const at = torsoFrame(sk);
  const band = paint.collar.map(([t, x]) => at(t, x));
  ctx.beginPath();
  curveThrough(ctx, band, true);
  ctx.closePath();
  const [colors, texture] = paint.collarFabric;
  shadeSurface(ctx, art, paint[colors], texture, at(1, -6), at(1, 6), 1, grain);
  // A thin trim along the neckline's edge.
  ctx.strokeStyle = rgb(paint.collarTrim);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  curveThrough(ctx, paint.collarTop.map(([t, x]) => at(t, x)), true);
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
// ---- Painted Klingon profile head ----

const KLINGON_SKIN = [
  [1.2, 9.8], [3.6, 8.6], [5.2, 6.8], [6.2, 4.8], [6.9, 3.4], [6.4, 2.6], [5.7, 2.1], [6.1, 1.2], [7.3, -0.6],
  [7.6, -1.6], [6.6, -2.3], [6.5, -3.4], [6.6, -4.2], [6.2, -6.0], [4.6, -7.6], [2.8, -7.8], [2.6, -12],
  [-3.8, -12], [-4.0, -5.0], [-6.6, 1.5], [-5.6, 6.8], [-2.6, 9.4],
];
const KLINGON_HAIR = [
  [1.0, 10.3], [-1.6, 11.2], [-5.0, 9.8], [-7.6, 6.0], [-8.4, 0.5], [-8.2, -5.5], [-7.4, -11.5], [-5.8, -15.5],
  // The front edge falls forward from the crest over the ear, past the
  // jaw, and down onto the shoulder.
  [-4.4, -15.0], [-3.5, -10.6], [-2.0, -6.2], [-0.6, -3.0], [0.7, -0.4], [1.5, 1.8], [1.3, 4.2], [0.9, 6.6], [0.9, 8.8],
];
const KLINGON_BEARD = [
  [6.6, -2.4], [7.1, -3.2], [6.8, -4.6], [6.6, -6.0], [5.6, -7.6], [3.6, -8.3], [0.8, -7.0], [-2.0, -4.4],
  [-2.8, -1.2], [-1.8, -1.0], [0.4, -3.6], [2.8, -4.7], [4.9, -4.3], [5.7, -3.4], [5.5, -2.7],
];

function paintKlingonFace(ctx, sk, paint) {
  const F = paint.face;
  const H = headFrame(sk, F.size, F.drop);
  const [sd, sm, sl] = F.skin;

  shapeThrough(ctx, H, KLINGON_SKIN);
  const g = ctx.createLinearGradient(H([-6, 0]).x, H([-6, 0]).y, H([7.5, 0]).x, H([7.5, 0]).y);
  g.addColorStop(0, rgb(sd));
  g.addColorStop(0.55, rgb(sm));
  g.addColorStop(0.86, rgb(sl));
  g.addColorStop(1, rgb(sm));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The forehead crest: ridges that run up from the brow over the top of the
  // head, each lit on top with a shadow beneath.
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x0 = 6.4 - t * 5.0;
    const y0 = 3.7 + t * 5.6;
    const ridge = [[x0 + 0.3, y0 - 0.2], [x0 - 1.1, y0 + 0.5 - t * 0.3], [x0 - 2.6, y0 + 0.2 - t * 0.6]];
    strokeThrough(ctx, H, ridge.map(([x, y]) => [x, y - 0.35]), 'rgba(40,18,10,0.45)', 0.45 * F.size);
    strokeThrough(ctx, H, ridge, rgb(F.ridge), 0.42 * F.size);
  }
  // A central ridge along the crest.
  strokeThrough(ctx, H, [[6.2, 4.4], [5.0, 6.8], [3.4, 8.6], [1.4, 9.7]], rgb(F.ridge), 0.5 * F.size);
  // Heavy brow shadow over the deep-set eye, cheekbone light, shadow under the jaw.
  softSpot(ctx, H([5.2, 1.8]), 1.9 * F.size, 'rgb(40,20,12)', 0.6);
  softSpot(ctx, H([4.2, -0.9]), 2.6 * F.size, rgb(sl), 0.45);
  // Cheek definition: a lit, high cheekbone, the hollow beneath it, the fold
  // from the nostril down to the mouth, and the hair's shadow along the jaw.
  for (const [x, y] of [[2.9, 0.3], [3.8, 0.1], [4.7, -0.3]]) softSpot(ctx, H([x, y]), 1.2 * F.size, rgb(sl), 0.55);
  softSpot(ctx, H([3.6, -2.3]), 1.9 * F.size, 'rgb(45,20,12)', 0.38);
  softSpot(ctx, H([4.9, -2.0]), 0.9 * F.size, 'rgb(45,20,12)', 0.3);
  strokeThrough(ctx, H, [[6.3, -1.7], [5.95, -2.5], [5.6, -3.3]], 'rgba(40,16,10,0.55)', 0.28 * F.size);
  strokeThrough(ctx, H, [[6.15, -1.55], [5.8, -2.4]], 'rgba(235,180,140,0.35)', 0.22 * F.size);
  softSpot(ctx, H([1.8, -0.4]), 2.0 * F.size, 'rgb(30,14,8)', 0.55);
  const jg = ctx.createLinearGradient(H([0, -6]).x, H([0, -6]).y, H([0, -9.5]).x, H([0, -9.5]).y);
  jg.addColorStop(0, 'rgba(30,14,8,0)');
  jg.addColorStop(0.4, 'rgba(30,14,8,0.5)');
  jg.addColorStop(1, 'rgba(30,14,8,0.2)');
  ctx.fillStyle = jg;
  ctx.fill();
  ctx.restore();
  shapeThrough(ctx, H, KLINGON_SKIN);
  ctx.strokeStyle = 'rgba(25,12,8,0.45)';
  ctx.lineWidth = 0.2 * F.size;
  ctx.stroke();

  // Eye: small and dark under the brow.
  shapeThrough(ctx, H, [[4.5, 2.0], [5.2, 2.2], [5.75, 1.95], [5.4, 1.6], [4.9, 1.6]]);
  ctx.fillStyle = 'rgb(205,190,175)';
  ctx.fill();
  const iris = H([5.3, 1.88]);
  ctx.beginPath();
  ctx.arc(iris.x, iris.y, 0.3 * F.size, 0, Math.PI * 2);
  ctx.fillStyle = 'rgb(40,24,16)';
  ctx.fill();
  strokeThrough(ctx, H, [[4.4, 2.1], [5.2, 2.35], [5.85, 2.05]], 'rgb(30,14,10)', 0.3 * F.size);
  // A scowling brow line and a wide nostril.
  strokeThrough(ctx, H, [[4.4, 2.75], [5.6, 3.1], [6.7, 3.2]], 'rgba(30,14,10,0.7)', 0.35 * F.size);
  strokeThrough(ctx, H, [[6.4, -1.6], [6.8, -2.0], [7.2, -1.9]], 'rgba(30,12,8,0.85)', 0.35 * F.size);

  // Beard and mustache, with fine hairs.
  const [hd, hm, hl] = F.hair;
  shapeThrough(ctx, H, KLINGON_BEARD);
  ctx.fillStyle = rgb(F.beard);
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    const x = 6.4 - i * 0.62;
    strokeThrough(ctx, H, [[x, -3.0 + i * 0.12], [x - 0.5, -5.2 + i * 0.25], [x - 0.9, -7.6 + i * 0.35]], i % 2 ? 'rgba(150,110,85,0.35)' : 'rgba(10,6,4,0.4)', 0.16 * F.size);
  }
  ctx.restore();
  strokeThrough(ctx, H, [[5.5, -3.95], [6.6, -3.9]], 'rgb(20,8,6)', 0.22 * F.size); // mouth

  // The long mane, swept back from the crest and down the back.
  shapeThrough(ctx, H, KLINGON_HAIR);
  const hg = ctx.createLinearGradient(H([-8, 0]).x, H([-8, 0]).y, H([0, 8]).x, H([0, 8]).y);
  hg.addColorStop(0, rgb(hd));
  hg.addColorStop(0.6, rgb(hm));
  hg.addColorStop(1, rgb(hl));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 26; i++) {
    const o = i / 25;
    const w = Math.sin(i * 2.3) * 0.4;
    const pts = [[0.6 - o * 1.6, 10.2 - o * 0.8], [-3.4 - o * 1.4 + w, 10.0 - o * 1.4], [-6.6 + o * 1.6, 6 - o * 2], [-7.6 + o * 2.4 + w, -2 - o * 1], [-6.8 + o * 1.8, -12 - o * 2]];
    strokeThrough(ctx, H, pts, i % 3 === 0 ? 'rgba(150,112,88,0.38)' : 'rgba(5,3,2,0.35)', (0.18 + (i % 4) * 0.05) * F.size);
  }
  // The forward lock over the ear: strands running down along its front edge.
  for (let i = 0; i < 10; i++) {
    const o = i * 0.32;
    strokeThrough(ctx, H, [[0.7 - o * 0.6, 9.2], [1.1 - o, 4.4], [1.0 - o, 1.4], [0.2 - o, -1.6], [-1.6 - o * 0.8, -5.4], [-3.2 - o * 0.6, -9.6]],
      i % 3 === 1 ? 'rgba(160,120,92,0.45)' : 'rgba(5,3,2,0.38)', (0.16 + (i % 3) * 0.05) * F.size);
  }
  softSpot(ctx, H([0.4, 2.2]), 1.6 * F.size, rgb(hl), 0.35);
  softSpot(ctx, H([-2.8, 9.2]), 3 * F.size, rgb(hl), 0.45);
  softSpot(ctx, H([-6.6, 1.0]), 2.6 * F.size, rgb(hl), 0.25);
  ctx.restore();
}

// ---- Armored characters ----

// A gloved fist at the wrist, pointing along the forearm (`dir`); with
// `blaster` it grips a pistol pointing forward along the arm.
function paintGlove(ctx, paint, wrist, dir, blaster, flash = -1) {
  const len = Math.hypot(dir.x, dir.y) || 1;
  const k = paint.gloveSize || 1;
  const d = { x: (dir.x / len) * k, y: (dir.y / len) * k };
  const n = { x: d.y, y: -d.x };
  const at = ([u, v]) => ({ x: wrist.x + d.x * u + n.x * v, y: wrist.y + d.y * u + n.y * v });
  const [gd, gm, gl] = paint.glove;
  if (blaster) {
    // Blaster pistol held in the fist: a chunky body over the knuckles, a long
    // barrel with a muzzle, a scope on top, all outlined so it reads at a glance.
    const [md, mm, ml] = paint.gun;
    const shape = (pts, fill) => {
      ctx.beginPath();
      pts.forEach((pt, i) => (i ? ctx.lineTo(at(pt).x, at(pt).y) : ctx.moveTo(at(pt).x, at(pt).y)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = 'rgb(6,6,8)';
      ctx.stroke();
    };
    const shade = (v0, v1) => {
      const g = ctx.createLinearGradient(at([0, v0]).x, at([0, v0]).y, at([0, v1]).x, at([0, v1]).y);
      g.addColorStop(0, rgb(md));
      g.addColorStop(0.55, rgb(mm));
      g.addColorStop(1, rgb(ml));
      return g;
    };
    shape([[-3, 1.0], [10, 1.0], [10, 5.4], [-2.4, 5.4], [-3.6, 3.6]], shade(1.0, 5.4)); // body
    shape([[9.5, 2.0], [22, 2.2], [22, 4.4], [9.5, 4.6]], shade(2.0, 4.6)); // barrel
    shape([[21.5, 1.4], [25, 1.5], [25, 5.0], [21.5, 5.1]], rgb(md)); // muzzle
    shape([[0.5, 5.4], [8, 5.4], [8, 7.4], [0.5, 7.4]], shade(5.4, 7.4)); // scope
    // Lit top edges and a scope lens.
    ctx.strokeStyle = 'rgba(235,238,245,0.85)';
    ctx.lineWidth = 0.6;
    for (const [a, b] of [[[-2.4, 5.0], [9.6, 5.0]], [[10, 4.1], [21.6, 4.0]], [[1, 7.0], [7.6, 7.0]]]) {
      ctx.beginPath();
      ctx.moveTo(at(a).x, at(a).y);
      ctx.lineTo(at(b).x, at(b).y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgb(120,210,255)';
    ctx.beginPath();
    ctx.arc(at([8, 6.4]).x, at([8, 6.4]).y, 0.9 * k, 0, Math.PI * 2);
    ctx.fill();
    if (flash >= 0) drawMuzzleFlash(ctx, at([26, 3.2]), d.x / k, d.y / k, flash, '#ff7a2a');
  }
  ctx.beginPath();
  curveThrough(ctx, [[-0.6, -2.1], [2.6, -2.5], [4.6, -1.6], [5.0, 0.4], [4.4, 2.2], [2.0, 2.4], [-0.6, 2.0], [-0.6, -2.1]].map(at), true);
  ctx.closePath();
  const g = ctx.createLinearGradient(at([2, -2.5]).x, at([2, -2.5]).y, at([2, 2.4]).x, at([2, 2.4]).y);
  g.addColorStop(0, rgb(gd));
  g.addColorStop(0.6, rgb(gm));
  g.addColorStop(1, rgb(gl));
  ctx.fillStyle = g;
  ctx.fill();
  // Knuckles and finger creases.
  ctx.strokeStyle = rgb(gd);
  ctx.lineWidth = 0.3;
  for (const v of [-0.9, 0.3, 1.4]) {
    ctx.beginPath();
    const a = at([3.0, v]);
    const b = at([4.7, v + 0.1]);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

// A long weapon slung across the back: a staff from low behind the hip to
// above the shoulder, ending in a two-pronged fork.
function paintBackWeapon(ctx, paint, sk) {
  const at = torsoFrame(sk);
  const w = paint.backWeapon;
  const a = at(w.from[0], w.from[1]);
  const b = at(w.to[0], w.to[1]);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: dy / len, y: -dx / len };
  const [cd, cm, cl] = paint[w.colors];
  ctx.lineCap = 'round';
  const line = (p0, p1, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  };
  line(a, b, w.width + 0.6, rgb(cd));
  line(a, b, w.width, rgb(cm));
  line({ x: a.x + n.x * 0.4, y: a.y + n.y * 0.4 }, { x: b.x + n.x * 0.4, y: b.y + n.y * 0.4 }, w.width * 0.3, rgb(cl));
  // The fork: two prongs splaying from the tip.
  const tip = { x: b.x + (dx / len) * 6, y: b.y + (dy / len) * 6 };
  for (const s of [-1, 1]) {
    const end = { x: tip.x + (dx / len) * 3 + n.x * s * 3.2, y: tip.y + (dy / len) * 3 + n.y * s * 3.2 };
    line(b, end, w.width * 0.8, rgb(cm));
  }
}

// A rocket pack on the back, in the torso's frame: a rounded steel case with a
// dark center panel, twin thrusters along its back edge with nozzles at the
// bottom, and a dome on top. The nozzles glow while airborne.
function paintJetpack(ctx, paint, sk, f) {
  const at = torsoFrame(sk);
  const J = paint.jetpack;
  const [md, mm, ml] = paint[J.colors];
  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach(([t, x], i) => {
      const q = at(t, x);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
  };
  const metal = (from, to) => {
    const a = at(...from);
    const b = at(...to);
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, rgb(md));
    g.addColorStop(0.55, rgb(mm));
    g.addColorStop(0.85, rgb(ml));
    g.addColorStop(1, rgb(mm));
    return g;
  };
  // Thrusters: two cylinders behind the case, then their nozzles.
  for (const x of [-25, -20]) {
    poly([[1.02, x - 2.4], [1.02, x + 2.4], [0.3, x + 2.4], [0.3, x - 2.4]]);
    ctx.fillStyle = metal([0.6, x - 2.4], [0.6, x + 2.4]);
    ctx.fill();
    poly([[0.31, x - 2.1], [0.31, x + 2.1], [0.19, x + 3.1], [0.19, x - 3.1]]);
    ctx.fillStyle = rgb(md);
    ctx.fill();
    if (!f.grounded) {
      // Exhaust flame while in the air.
      const q = at(0.18, x);
      const flick = (0.8 + Math.sin(f.time * 0.9 + x) * 0.2) * (f.thrusting ? 1.5 : 1);
      // Thrusting: a longer plume.
      const plume = f.thrusting ? [[3, 6], [9, 8], [17, 7], [26, 5]] : [[3, 6], [8, 8], [14, 6]];
      for (const [dy, r] of plume) {
        const g = ctx.createRadialGradient(q.x, q.y + dy, 0, q.x, q.y + dy, r * flick);
        g.addColorStop(0, 'rgba(255,250,220,0.9)');
        g.addColorStop(0.35, 'rgba(255,170,60,0.75)');
        g.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(q.x, q.y + dy, r * flick, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // The case.
  ctx.beginPath();
  curveThrough(ctx, [[1.06, -8.5], [1.1, -14.5], [1.04, -21.6], [0.7, -22.8], [0.36, -21.6], [0.3, -15], [0.36, -8.5], [0.7, -8], [1.06, -8.5]].map(([t, x]) => at(t, x)), true);
  ctx.closePath();
  ctx.fillStyle = metal([0.7, -22.8], [0.7, -8]);
  ctx.fill();
  ctx.strokeStyle = rgb(md);
  ctx.lineWidth = 0.4;
  ctx.stroke();
  // Center panel and rivets.
  poly([[0.96, -11], [0.96, -19.6], [0.46, -19.6], [0.46, -11]]);
  ctx.fillStyle = rgb(md, 0.8);
  ctx.fill();
  for (const [t, x] of [[0.92, -12], [0.92, -18.6], [0.5, -12], [0.5, -18.6]]) {
    const q = at(t, x);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 0.45, 0, Math.PI * 2);
    ctx.fillStyle = rgb(ml);
    ctx.fill();
  }
  // Dome on top.
  const top = at(1.1, -17);
  ctx.beginPath();
  ctx.arc(top.x, top.y, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = metal([1.1, -20.4], [1.1, -13.6]);
  ctx.fill();
  ctx.strokeStyle = rgb(md);
  ctx.stroke();
}

// A T-visor helmet in profile: rounded dome, flat face plate with the slot of
// the visor across the eyes and down the front, a flared jaw, an ear cap, and a
// chrome-like finish (a bright sky reflection over a dark horizon band).
const HELMET = [
  [-6.4, -1], [-6.7, 3], [-5.3, 6.8], [-2, 8.9], [2, 8.7], [5.0, 6.7], [6.4, 3.7], [6.75, 0.8], [6.75, -3.4], [7.4, -5.6],
  [6.6, -6.9], [2, -7.1], [-1.6, -6.5], [-4.9, -5.5], [-6.3, -3.4],
];

function paintHelmet(ctx, sk, paint) {
  const F = paint.face;
  const H = headFrame(sk, F.size, F.drop);
  const [md, mm, ml] = F.metal;
  shapeThrough(ctx, H, HELMET);
  const g = ctx.createLinearGradient(H([0, 9]).x, H([0, 9]).y, H([0, -7]).x, H([0, -7]).y);
  g.addColorStop(0, rgb(ml));
  g.addColorStop(0.3, rgb(mm));
  g.addColorStop(0.47, rgb(md));
  g.addColorStop(0.56, rgb(mm));
  g.addColorStop(0.85, rgb(ml, 0.9));
  g.addColorStop(1, rgb(md));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Front-to-back shading and a hot highlight on the dome.
  const s = ctx.createLinearGradient(H([-7, 0]).x, H([-7, 0]).y, H([7, 0]).x, H([7, 0]).y);
  s.addColorStop(0, 'rgba(10,12,16,0.45)');
  s.addColorStop(0.6, 'rgba(10,12,16,0)');
  s.addColorStop(1, 'rgba(10,12,16,0.15)');
  ctx.fillStyle = s;
  ctx.fill();
  softSpot(ctx, H([1.5, 6.4]), 3.2 * F.size, 'rgb(255,255,255)', 0.7);
  ctx.restore();
  ctx.strokeStyle = rgb(md, 0.6);
  ctx.lineWidth = 0.25 * F.size;
  ctx.stroke();

  // Visor: the slot across the eyes and the strip of it down the front.
  const visor = 'rgb(8,9,12)';
  shapeThrough(ctx, H, [[1.4, 2.4], [6.8, 2.2], [6.8, 0.6], [1.6, 0.8]]);
  ctx.fillStyle = visor;
  ctx.fill();
  shapeThrough(ctx, H, [[5.75, 0.9], [6.8, 0.9], [7.0, -5.1], [6.15, -5.1]]);
  ctx.fill();
  strokeThrough(ctx, H, [[1.8, 1.9], [6.5, 1.8]], 'rgba(110,150,200,0.35)', 0.18 * F.size);
  // Jaw panel line, the ear cap, and the rim along the bottom.
  strokeThrough(ctx, H, [[0.6, -0.6], [2.2, -3.0], [4.4, -4.8], [6.2, -5.4]], rgb(md), 0.22 * F.size);
  const ear = H([-1.4, -0.6]);
  ctx.beginPath();
  ctx.arc(ear.x, ear.y, 1.9 * F.size, 0, Math.PI * 2);
  ctx.fillStyle = rgb(mm, 0.85);
  ctx.fill();
  ctx.strokeStyle = rgb(md);
  ctx.lineWidth = 0.3 * F.size;
  ctx.stroke();
  softSpot(ctx, H([-1.0, 0.2]), 1 * F.size, 'rgb(255,255,255)', 0.6);
  strokeThrough(ctx, H, [[7.3, -5.7], [6.5, -6.8], [2, -7.0], [-1.6, -6.4], [-4.9, -5.4]], rgb(md), 0.35 * F.size);
}

// A flat shoe in the same frame: rounded toe, low heel, glossy.
function paintShoe(ctx, art, paint, knee, foot, k) {
  const len = Math.hypot(foot.x - knee.x, foot.y - knee.y) || 1;
  const d = { x: (foot.x - knee.x) / len, y: (foot.y - knee.y) / len };
  const f = { x: d.y, y: -d.x };
  const at = ([x, y]) => ({ x: foot.x + f.x * x + d.x * y, y: foot.y + f.y * x + d.y * y });
  const [dark, mid, light] = paint.shoe;
  ctx.beginPath();
  curveThrough(ctx, [[-4.4, -2.4], [-5.0, 1.2], [-4.8, 4], [2.4, 4.1], [10.6, 4], [13.2, 2.8], [12.2, 0.6], [7.6, -0.6], [3.6, -1.8], [3.2, -2.6]].map(at), true);
  ctx.closePath();
  const g = ctx.createLinearGradient(at([0, 4]).x, at([0, 4]).y, at([0, -2]).x, at([0, -2]).y);
  g.addColorStop(0, rgb(dark, k));
  g.addColorStop(0.6, rgb(mid, k));
  g.addColorStop(1, rgb(dark, k));
  ctx.fillStyle = g;
  ctx.fill();
  softSpot(ctx, at([8.6, 1.0]), 2.6, rgb(light, k), 0.7);
  ctx.strokeStyle = rgb(dark, k * 0.6);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  curveThrough(ctx, [[-4.8, 4], [2.4, 4.2], [10.6, 4.1]].map(at), true);
  ctx.stroke();
}

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

// Weapons cut from pictures (src/props.js), loaded on first use: the piece,
// or null until its image is ready.
const propCache = {};
function propPiece(name) {
  if (typeof PROPS === 'undefined' || !PROPS[name]) return null;
  if (!propCache[name]) {
    const img = new Image();
    img.src = PROPS[name].src;
    propCache[name] = { ...PROPS[name], img };
  }
  const piece = propCache[name];
  return piece.img.complete && piece.img.naturalWidth ? piece : null;
}

// Worf's bat'leth, gripped in his front hand with the blades pointing out
// along his forearm, about 75 body units from tip to tip.
const BATLETH_SCALE = 0.18;
function paintBatleth(ctx, sk) {
  const piece = propPiece('batleth');
  if (!piece) return;
  drawPiece(ctx, piece, sk.handF, { x: sk.handF.x - sk.elbowF.x, y: sk.handF.y - sk.elbowF.y }, BATLETH_SCALE);
}

// A hand phaser cut from a picture (src/props.js) gripped in the fist: the
// phaser first, its grip `phaser.grip` units ahead of the wrist and `phaser.lift`
// above it (the body rides over the hand), then the fist over the grip.
// Without the phaser picture, just the fist.
function paintHeldPhaser(ctx, art, p, wrist, dir) {
  const piece = propPiece('phaser');
  if (piece) {
    const len = Math.hypot(dir.x, dir.y) || 1;
    const ux = dir.x / len;
    const uy = dir.y / len;
    const { grip: g, lift } = p.phaser;
    const grip = { x: wrist.x + ux * g + uy * lift, y: wrist.y + uy * g - ux * lift };
    drawPiece(ctx, piece, grip, dir, p.phaser.scale);
  }
  drawPiece(ctx, art.pieces.fist, wrist, dir, p.pieceScale);
}

function paintedBody(ctx, sk, f, art) {
  const p = f.char.paint;
  const W = p.widths;
  const grain = p.grain;
  const FAR = 0.68;
  const sub = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
  // Any whole-figure filter (hit flash, mirror-match colors) set by the caller.
  const base = ctx.filter === 'none' ? '' : ctx.filter;

  const [armColors, armTexture] = p.arm;
  const [legColors, legTexture] = p.leg;
  // Armor and boots: bands wrapped over part of a limb (`armor` entries).
  const armor = (limb, a, b, rA, rB, k) => {
    for (const plate of p.armor || []) {
      if (plate.limb !== limb) continue;
      const at = (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      const r = (t) => rA + (rB - rA) * Math.min(1, Math.max(0, t)) + plate.extra;
      paintLimb(ctx, art, p[plate.fabric[0]], plate.fabric[1], at(plate.from), at(plate.to), r(plate.from), r(plate.to), plate.swell || {}, k, grain);
      if (plate.edge) {
        // A darker rim along the plate's lower edge.
        const e = at(plate.to);
        ctx.strokeStyle = rgb(p[plate.fabric[0]][0], k);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r(plate.to), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };
  const arm = (side, k, hand) => {
    const elbow = sk['elbow' + side];
    const wrist = sk['hand' + side];
    paintLimb(ctx, art, p[armColors], armTexture, sk.shoulder, elbow, W.shoulder, W.elbow, { front: [0.5, 0.35] }, k, grain);
    paintLimb(ctx, art, p[armColors], armTexture, elbow, wrist, W.elbow * 0.95, W.wrist, { front: [0.45, 0.3] }, k, grain);
    armor('forearm', elbow, wrist, W.elbow * 0.95, W.wrist, k);
    armor('upperArm', sk.shoulder, elbow, W.shoulder, W.elbow, k);
    if (k < 1) ctx.filter = `${base} brightness(${k})`;
    if (hand === 'phaser') paintHeldPhaser(ctx, art, p, wrist, sub(elbow, wrist));
    else if (art.pieces[hand]) drawPiece(ctx, art.pieces[hand], wrist, sub(elbow, wrist), p.pieceScale);
    else if (hand === 'blaster') paintGlove(ctx, p, wrist, sub(elbow, wrist), true, muzzleAge(f));
    else paintGlove(ctx, p, wrist, sub(elbow, wrist), false);
    ctx.filter = base || 'none';
  };
  // A stripe down the outside of the leg (trouser piping).
  const stripe = (a, b, k) => {
    if (!p.legStripe) return;
    ctx.strokeStyle = rgb(p.legStripe, k);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(a.x + (b.x - a.x) * 0.08, a.y + (b.y - a.y) * 0.08);
    ctx.lineTo(b.x - (b.x - a.x) * 0.04, b.y - (b.y - a.y) * 0.04);
    ctx.stroke();
  };
  const leg = (side, k) => {
    const knee = sk['knee' + side];
    const foot = sk['foot' + side];
    const swell = p.legSwell || { thigh: { front: [1.0, 0.35], back: [1.6, 0.18] }, shin: { back: [1.5, 0.3], front: [0.3, 0.2] } };
    if (p.foot === 'shoe') paintShoe(ctx, art, p, knee, foot, k);
    paintLimb(ctx, art, p[legColors], legTexture, sk.hip, knee, W.hip, W.knee, swell.thigh, k, grain);
    stripe(sk.hip, knee, k);
    armor('thigh', sk.hip, knee, W.hip, W.knee, k);
    paintLimb(ctx, art, p[legColors], legTexture, knee, foot, W.knee * 0.95, W.ankle, swell.shin, k, grain);
    stripe(knee, foot, k);
    armor('shin', knee, foot, W.knee * 0.95, W.ankle, k);
    if (p.foot !== 'shoe') paintBoot(ctx, art, p, knee, foot, k, grain);
  };
  const shooting = !!(f.move && f.move.def.projectile);
  const frontHand = shooting && p.hands.shot ? p.hands.shot : p.hands.front;

  const rifle = f.char.armPose ? rifleMode(f) : null;
  arm('B', FAR, p.hands.back);
  if (rifle === 'rest') drawPhaserRifle(ctx, sk, f, f.char.colors);
  if (p.jetpack) paintJetpack(ctx, p, sk, f);
  if (p.backWeapon) paintBackWeapon(ctx, p, sk);
  leg('B', FAR);
  paintTorso(ctx, art, p, sk, grain);
  leg('F', 1);
  // A painted neck in her skin tones (it shows only if the head tilts away),
  // the head piece with her own neck over it, then the neckline.
  const up = sub(sk.neck, sk.head);
  const ul = Math.hypot(up.x, up.y) || 1;
  const along = (d) => ({ x: sk.neck.x + (up.x / ul) * d, y: sk.neck.y + (up.y / ul) * d });
  paintLimb(ctx, art, p.skin, armTexture, along(-1), along(p.neckLift + 5), W.neck, W.neck * 0.92, {}, 1, grain);
  if (p.face && p.face.style === 'klingon') paintKlingonFace(ctx, sk, p);
  else if (p.face && p.face.style === 'helmet') paintHelmet(ctx, sk, p);
  else if (p.face) paintFace(ctx, sk, p);
  else drawPiece(ctx, art.pieces.head, along(p.neckLift), up, p.headScale);
  if (p.collar) paintCollar(ctx, art, p, sk, grain);
  if (rifle && rifle !== 'rest') drawPhaserRifle(ctx, sk, f, f.char.colors);
  if (f.move && f.move.name === 'batleth') paintBatleth(ctx, sk);
  arm('F', 1, frontHand);
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
    // A jetpack flyer leans into its flight (Fighter.tilt), turning about the hips.
    if (f.tilt) {
      ctx.translate(sk.hip.x, sk.hip.y);
      ctx.rotate(f.tilt);
      ctx.translate(-sk.hip.x, -sk.hip.y);
    }
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const filters = [f.char.altFilter, f.flash > 0 ? 'brightness(2)' : ''].filter(Boolean).join(' ');
  if (filters) ctx.filter = filters;
  paintedBody(ctx, sk, f, art);
  ctx.restore();
}
