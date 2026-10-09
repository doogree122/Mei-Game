// Front-facing head-and-shoulders portraits for the character select screen,
// painted in code. Each is drawn once into its own canvas (in a 200x240 unit
// box, at PORTRAIT_RES pixels per unit) and then scaled into the card.

const PORTRAIT_RES = 3;

const Portraits = (() => {
  const cache = {};

  // ---- drawing helpers ----

  // A closed (or open) smooth curve through points, using quadratic curves
  // between their midpoints.
  function smooth(ctx, pts, closed = true) {
    ctx.beginPath();
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) {
      const m0 = mid(pts[n - 1], pts[0]);
      ctx.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const m = mid(pts[i], pts[(i + 1) % n]);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const m = mid(pts[i], pts[i + 1]);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
      }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }

  function poly(ctx, pts) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }

  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function linear(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [t, c, a] of stops) g.addColorStop(t, rgba(c, a === undefined ? 1 : a));
    return g;
  }

  function radial(ctx, x, y, r, stops, fx = x, fy = y) {
    const g = ctx.createRadialGradient(fx, fy, 0, x, y, r);
    for (const [t, c, a] of stops) g.addColorStop(t, rgba(c, a === undefined ? 1 : a));
    return g;
  }

  // A soft round glow or shadow.
  function soft(ctx, x, y, r, c, a, sy = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy);
    ctx.fillStyle = radial(ctx, 0, 0, r, [[0, c, a], [1, c, 0]]);
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  function stroke(ctx, pts, c, w, a = 1, closed = false) {
    smooth(ctx, pts, closed);
    ctx.strokeStyle = rgba(c, a);
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Mirror a set of points across the face's center line (x = 100).
  const mirror = (pts) => pts.map(([x, y]) => [200 - x, y]);
  const both = (fn) => {
    fn(1);
    fn(-1);
  };

  // ---- shared human parts ----

  // Shoulders and chest (in `top` colors) with the neck above them.
  function bust(ctx, o) {
    const [nd, nm] = o.skin;
    // Neck, shaded under the jaw.
    smooth(ctx, [[84, 132], [116, 132], [118, 176], [100, 184], [82, 176]]);
    ctx.fillStyle = linear(ctx, 82, 0, 118, 0, [[0, nd], [0.5, nm], [1, nd]]);
    ctx.fill();
    soft(ctx, 100, 148, 22, [40, 20, 14], 0.45, 0.6);
    // Shoulders.
    const [d, m, l] = o.top;
    smooth(ctx, [[-10, 244], [-6, 214], [10, 192], [44, 178], [80, 170], [100, 172], [120, 170], [156, 178], [190, 192], [206, 214], [210, 244]]);
    ctx.fillStyle = linear(ctx, 0, 170, 0, 244, [[0, l], [0.35, m], [1, d]]);
    ctx.fill();
    soft(ctx, 40, 196, 40, l, 0.25, 0.6);
    soft(ctx, 160, 196, 40, d, 0.3, 0.6);
  }

  // The face itself: head shape, ears, eyes, brows, nose, mouth.
  function face(ctx, o) {
    const [sd, sm, sl] = o.skin;
    const head = o.head || [[100, 36], [130, 46], [140, 72], [140, 98], [135, 120], [125, 138], [112, 150], [100, 153], [88, 150], [75, 138], [65, 120], [60, 98], [60, 72], [70, 46]];
    // Ears.
    if (o.ears !== false) {
      both((s) => {
        const x = s > 0 ? 60 : 140;
        smooth(ctx, [[x, 92], [x - s * 6, 88], [x - s * 8, 100], [x - s * 6, 114], [x, 118]]);
        ctx.fillStyle = rgba(sm);
        ctx.fill();
        stroke(ctx, [[x - s * 2, 95], [x - s * 5, 100], [x - s * 3, 110]], sd, 1.2, 0.6);
      });
    }
    smooth(ctx, head);
    ctx.fillStyle = radial(ctx, 100, 96, 70, [[0, sl], [0.55, sm], [1, sd]], 94, 88);
    ctx.fill();
    ctx.save();
    smooth(ctx, head);
    ctx.clip();
    // Form: temples and cheeks fall into shadow, cheekbones and nose catch light.
    soft(ctx, 62, 108, 20, sd, 0.55, 1.4);
    soft(ctx, 138, 108, 20, sd, 0.55, 1.4);
    soft(ctx, 80, 112, 12, sl, 0.35);
    soft(ctx, 120, 112, 12, sl, 0.3);
    soft(ctx, 100, 150, 26, sd, 0.4, 0.5); // under the jaw line
    if (o.blush) {
      soft(ctx, 80, 118, 10, o.blush, 0.22);
      soft(ctx, 120, 118, 10, o.blush, 0.22);
    }
    // Eye sockets.
    soft(ctx, 84, 96, 13, sd, 0.4, 0.8);
    soft(ctx, 116, 96, 13, sd, 0.4, 0.8);
    ctx.restore();

    // Eyes.
    both((s) => {
      const cx = s > 0 ? 84 : 116;
      const ey = 98;
      const almond = [[cx - 11 * s, ey + 0.5], [cx - 4 * s, ey - 5.5], [cx + 5 * s, ey - 5], [cx + 10 * s, ey], [cx + 3 * s, ey + 4], [cx - 5 * s, ey + 3.5]];
      smooth(ctx, almond);
      ctx.fillStyle = 'rgb(236,230,226)';
      ctx.fill();
      ctx.save();
      smooth(ctx, almond);
      ctx.clip();
      ctx.fillStyle = radial(ctx, cx, ey - 0.5, 5, [[0, o.iris.map((v) => Math.min(255, v + 40))], [0.7, o.iris], [1, o.iris.map((v) => v * 0.5)]]);
      ctx.beginPath();
      ctx.arc(cx, ey - 0.5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgb(14,12,12)';
      ctx.beginPath();
      ctx.arc(cx, ey - 0.5, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx - 1.6, ey - 2.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      // The upper lid's shadow on the eyeball.
      ctx.fillStyle = 'rgba(60,30,20,0.25)';
      ctx.fillRect(cx - 12, ey - 7, 24, 4);
      ctx.restore();
      // Lash line (heavier, with a flick, for her), crease, lower lid.
      stroke(ctx, [[cx - 11 * s, ey + 0.5], [cx - 4 * s, ey - 5.6], [cx + 5 * s, ey - 5.1], [cx + 10.5 * s, ey - 0.3]], [30, 18, 14], o.lashes ? 2.2 : 1.5);
      if (o.lashes) stroke(ctx, [[cx - 10 * s, ey - 0.4], [cx - 13 * s, ey - 3]], [30, 18, 14], 1.4);
      stroke(ctx, [[cx - 10 * s, ey - 4], [cx - 3 * s, ey - 9], [cx + 6 * s, ey - 8.5], [cx + 10 * s, ey - 4]], sd, 1, 0.6);
      stroke(ctx, [[cx - 9 * s, ey + 2], [cx - 2 * s, ey + 4.6], [cx + 7 * s, ey + 2.5]], sd, 0.8, 0.45);
    });

    // Brows.
    both((s) => {
      const cx = s > 0 ? 84 : 116;
      const by = o.browY || 86;
      const w = o.browWidth || 2.6;
      smooth(ctx, [[cx + 10 * s, by + 1], [cx + 2 * s, by - w], [cx - 8 * s, by - w * 0.6], [cx - 13 * s, by + 2], [cx - 8 * s, by + 0.6], [cx + 2 * s, by + 0.2]]);
      ctx.fillStyle = rgba(o.brow);
      ctx.fill();
    });

    // Nose: the bridge's shaded side, a lit tip, the wings and nostrils.
    stroke(ctx, [[95, 96], [93.5, 108], [92, 117]], sd, 2.4, 0.35);
    soft(ctx, 101, 116, 6, sl, 0.55);
    stroke(ctx, [[91, 116], [89.5, 121], [94, 124]], sd, 1.4, 0.7);
    stroke(ctx, [[109, 116], [110.5, 121], [106, 124]], sd, 1.4, 0.55);
    for (const x of [95.5, 104.5]) {
      ctx.fillStyle = rgba([40, 18, 14], 0.75);
      ctx.beginPath();
      ctx.ellipse(x, 123, 2.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth: upper lip with a cupid's bow, fuller lower lip, the line between.
    const my = o.mouthY || 135;
    const lw = o.lipWidth || 11;
    smooth(ctx, [[100 - lw, my], [100 - lw * 0.45, my - 3.4], [100, my - 2.2], [100 + lw * 0.45, my - 3.4], [100 + lw, my], [100, my + 0.8]]);
    ctx.fillStyle = rgba(o.lips.map((v) => v * 0.82));
    ctx.fill();
    smooth(ctx, [[100 - lw * 0.9, my + 0.4], [100, my + 0.9], [100 + lw * 0.9, my + 0.4], [100 + lw * 0.5, my + 4.6], [100, my + 5.4], [100 - lw * 0.5, my + 4.6]]);
    ctx.fillStyle = linear(ctx, 0, my, 0, my + 6, [[0, o.lips], [1, o.lips.map((v) => v * 0.8)]]);
    ctx.fill();
    soft(ctx, 100, my + 2.8, 4, [255, 230, 220], 0.35);
    stroke(ctx, [[100 - lw - 1, my - 0.2], [100 - lw * 0.4, my + 0.7], [100 + lw * 0.4, my + 0.7], [100 + lw + 1, my - 0.2]], [60, 26, 22], 1.1, 0.85);
    soft(ctx, 100, my + 10, 9, sd, 0.25, 0.5); // shadow under the lower lip
  }

  // A small gold Starfleet comm badge.
  function commBadge(ctx, x, y, k = 1) {
    poly(ctx, [[x, y - 9 * k], [x + 5 * k, y + 6 * k], [x, y + 3 * k], [x - 5 * k, y + 6 * k]]);
    ctx.fillStyle = linear(ctx, x - 5, y - 9, x + 5, y + 6, [[0, [255, 236, 160]], [0.5, [214, 170, 70]], [1, [140, 100, 30]]]);
    ctx.fill();
    smooth(ctx, [[x - 8 * k, y + 1 * k], [x, y - 5 * k], [x + 8 * k, y + 1 * k], [x, y + 8 * k]]);
    ctx.strokeStyle = 'rgba(214,170,70,0.9)';
    ctx.lineWidth = 1.2 * k;
    ctx.stroke();
  }

  // ---- the fighters ----

  function worf(ctx) {
    const skin = [[96, 52, 34], [150, 90, 62], [190, 128, 94]];
    const hair = [[22, 12, 8], [56, 34, 22], [104, 70, 50]];
    // Long mane behind, down onto the shoulders.
    smooth(ctx, [[56, 60], [70, 26], [100, 18], [130, 26], [146, 60], [152, 120], [162, 196], [140, 214], [118, 176], [82, 176], [60, 214], [38, 196], [48, 120]]);
    ctx.fillStyle = linear(ctx, 40, 0, 160, 0, [[0, hair[0]], [0.5, hair[1]], [1, hair[0]]]);
    ctx.fill();
    bust(ctx, { skin, top: [[120, 84, 14], [196, 150, 40], [232, 196, 92]] });
    // Black shoulders and the high collar of the tunic.
    smooth(ctx, [[-10, 214], [10, 190], [44, 176], [70, 172], [64, 190], [30, 206], [-10, 236]]);
    ctx.fillStyle = 'rgb(22,20,22)';
    ctx.fill();
    smooth(ctx, mirror([[-10, 214], [10, 190], [44, 176], [70, 172], [64, 190], [30, 206], [-10, 236]]));
    ctx.fill();
    smooth(ctx, [[82, 168], [118, 168], [120, 182], [100, 186], [80, 182]]);
    ctx.fill();
    // The chain-mail sash from his right shoulder across the chest.
    poly(ctx, [[34, 182], [60, 172], [176, 244], [140, 244]]);
    ctx.fillStyle = linear(ctx, 40, 170, 160, 244, [[0, [190, 192, 196]], [0.5, [120, 122, 128]], [1, [80, 82, 88]]]);
    ctx.fill();
    ctx.save();
    poly(ctx, [[34, 182], [60, 172], [176, 244], [140, 244]]);
    ctx.clip();
    ctx.strokeStyle = 'rgba(40,40,46,0.55)';
    ctx.lineWidth = 1;
    for (let i = -10; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(30 + i * 7, 170 + i * 4.2, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    commBadge(ctx, 136, 198);
    // Face: wide jaw, heavy brow, under the Klingon crest.
    face(ctx, {
      skin, iris: [52, 30, 18], brow: [40, 22, 14], lips: [130, 72, 56], browY: 85, browWidth: 3.6, ears: false, lipWidth: 12,
      head: [[100, 30], [132, 40], [142, 70], [143, 98], [140, 122], [132, 140], [116, 154], [100, 157], [84, 154], [68, 140], [60, 122], [57, 98], [58, 70], [68, 40]],
    });
    // The forehead crest: a central ridge and ridges arching out from it,
    // each lit on top with a shadow beneath.
    for (let i = 0; i < 6; i++) {
      const y = 44 + i * 7;
      const w = 22 - Math.abs(i - 2) * 2;
      stroke(ctx, [[100 - w, y + 5], [100 - w * 0.5, y], [100, y + 2], [100 + w * 0.5, y], [100 + w, y + 5]], [60, 30, 18], 3.2, 0.55);
      stroke(ctx, [[100 - w, y + 4], [100 - w * 0.5, y - 1], [100, y + 1], [100 + w * 0.5, y - 1], [100 + w, y + 4]], [206, 146, 110], 1.6, 0.7);
    }
    stroke(ctx, [[100, 36], [100, 80]], [204, 144, 108], 3, 0.5);
    soft(ctx, 100, 86, 26, [40, 18, 10], 0.35, 0.35); // the heavy brow's shadow
    // Hair framing the face, over the ears and down the front of the shoulders.
    both((s) => {
      const x = s > 0 ? 0 : 200;
      const f = (p) => p.map(([px, py]) => [s > 0 ? px : 200 - px, py]);
      smooth(ctx, f([[64, 44], [56, 80], [55, 120], [58, 150], [50, 190], [36, 210], [44, 160], [46, 110], [52, 60]]));
      ctx.fillStyle = linear(ctx, x + s * 40, 0, x + s * 62, 0, [[0, hair[0]], [1, hair[1]]]);
      ctx.fill();
      for (let i = 0; i < 6; i++) stroke(ctx, f([[60 - i, 50], [54 - i, 100], [52 - i * 1.5, 150], [44 - i * 1.5, 196]]), hair[2], 0.8, 0.4);
    });
    // Goatee and mustache.
    smooth(ctx, [[86, 129], [92, 126], [100, 128], [108, 126], [114, 129], [113, 133], [108, 131], [100, 132], [92, 131], [87, 133]]);
    ctx.fillStyle = rgba(hair[0]);
    ctx.fill();
    smooth(ctx, [[88, 141], [100, 142], [112, 141], [114, 150], [106, 160], [100, 162], [94, 160], [86, 150]]);
    ctx.fill();
    for (let i = 0; i < 8; i++) stroke(ctx, [[90 + i * 3, 143], [91 + i * 2.6, 152], [94 + i * 1.6, 160]], hair[2], 0.6, 0.35);
  }

  function seven(ctx) {
    const skin = [[180, 128, 110], [226, 178, 160], [246, 212, 196]];
    const hair = [[150, 112, 60], [206, 168, 104], [242, 218, 160]];
    // Hair gathered behind the head (seen as volume at the back).
    smooth(ctx, [[60, 70], [66, 34], [100, 22], [134, 34], [142, 70], [140, 120], [126, 112], [74, 112], [60, 120]]);
    ctx.fillStyle = rgba(hair[0]);
    ctx.fill();
    bust(ctx, { skin, top: [[22, 38, 78], [46, 78, 138], [100, 140, 202]] });
    // Gray raglan shoulders and the round neckline.
    both((s) => {
      const f = (p) => p.map(([px, py]) => [s > 0 ? px : 200 - px, py]);
      smooth(ctx, f([[-10, 212], [8, 192], [44, 178], [82, 170], [88, 178], [60, 192], [24, 214], [-10, 240]]));
      ctx.fillStyle = linear(ctx, 0, 170, 0, 230, [[0, [192, 196, 204]], [1, [110, 114, 124]]]);
      ctx.fill();
    });
    smooth(ctx, [[80, 172], [100, 180], [120, 172], [118, 168], [100, 174], [82, 168]]);
    ctx.fillStyle = 'rgb(46,78,138)';
    ctx.fill();
    face(ctx, { skin, iris: [96, 132, 156], brow: [168, 128, 84], lips: [190, 104, 92], lashes: true, blush: [230, 120, 110], lipWidth: 10 });
    // Hair swept up and back from the forehead, with a side part.
    const cap = [[60, 96], [58, 62], [70, 36], [96, 26], [124, 30], [140, 52], [142, 96], [138, 78], [128, 62], [110, 57], [90, 59], [74, 67], [64, 88]];
    smooth(ctx, cap);
    ctx.fillStyle = linear(ctx, 60, 30, 140, 70, [[0, hair[1]], [0.5, hair[2]], [1, hair[1]]]);
    ctx.fill();
    ctx.save();
    smooth(ctx, cap);
    ctx.clip();
    for (let i = 0; i < 16; i++) stroke(ctx, [[62 + i * 5, 86 - i * 1.2], [74 + i * 4.2, 50], [100 + i * 2.2, 30]], i % 3 ? hair[0] : [255, 244, 210], 0.8, 0.45);
    soft(ctx, 92, 40, 20, [255, 244, 210], 0.35, 0.6);
    ctx.restore();
    // The Borg implant: silver, arcing over her left brow and around the eye.
    const path = [[106, 82], [116, 78], [126, 82], [131, 92], [130, 104], [126, 112]];
    stroke(ctx, path, [70, 74, 84], 5);
    stroke(ctx, path, [196, 202, 212], 3);
    stroke(ctx, [[110, 80], [118, 77.5], [126, 81]], [255, 255, 255], 1, 0.7);
    for (const [x, y] of [[112, 79], [122, 79], [129, 87], [131, 97], [128, 107]]) {
      ctx.fillStyle = 'rgb(240,242,246)';
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    stroke(ctx, [[131, 92], [138, 90], [142, 94]], [150, 156, 166], 1.6); // a filament toward the ear
    commBadge(ctx, 140, 200, 0.9);
  }

  function troi(ctx) {
    const skin = [[136, 88, 66], [196, 146, 116], [226, 188, 160]];
    const hair = [[6, 4, 6], [26, 20, 24], [78, 64, 72]];
    // A full head of long black curls behind, falling past the shoulders.
    const mane = [[50, 90], [48, 50], [70, 20], [100, 12], [130, 20], [152, 50], [150, 90], [158, 140], [168, 200], [150, 226], [124, 196], [76, 196], [50, 226], [32, 200], [42, 140]];
    smooth(ctx, mane);
    ctx.fillStyle = rgba(hair[1]);
    ctx.fill();
    bust(ctx, { skin, top: [[78, 56, 72], [136, 104, 120], [186, 156, 172]] });
    // The V-neck with its lavender band.
    poly(ctx, [[78, 170], [100, 214], [122, 170]]);
    ctx.fillStyle = linear(ctx, 0, 170, 0, 214, [[0, skin[1]], [1, skin[0]]]);
    ctx.fill();
    smooth(ctx, [[74, 168], [100, 216], [126, 168], [121, 168], [100, 207], [79, 168]], false);
    ctx.strokeStyle = 'rgb(176,128,212)';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    poly(ctx, [[76, 169], [100, 213], [124, 169]]);
    ctx.stroke();
    commBadge(ctx, 136, 200, 0.9);
    face(ctx, { skin, iris: [58, 36, 26], brow: [30, 20, 18], lips: [170, 84, 82], lashes: true, blush: [210, 110, 100], ears: false, lipWidth: 11, browWidth: 3 });
    // Curls framing the face and covering the ears, then loops all over.
    both((s) => {
      const f = (p) => p.map(([px, py]) => [s > 0 ? px : 200 - px, py]);
      smooth(ctx, f([[100, 30], [80, 34], [64, 50], [58, 84], [60, 120], [56, 160], [44, 196], [36, 170], [42, 120], [44, 70], [60, 34], [84, 20], [100, 18]]));
      ctx.fillStyle = rgba(hair[1]);
      ctx.fill();
    });
    ctx.save();
    smooth(ctx, mane);
    ctx.clip();
    for (let y = 16; y < 230; y += 9) {
      for (let x = 40; x < 165; x += 9) {
        const j = Math.sin(x * 12.9 + y * 7.3) * 2.5;
        const cx = x + j + ((y / 9) % 2) * 4.5;
        const cy = y + Math.cos(x * 5.1 + y) * 2;
        // Leave the face and chest clear.
        if (cx > 64 && cx < 136 && cy > 52 && cy < 160) continue;
        if (cx > 58 && cx < 142 && cy > 160) continue;
        const r = 3.4 + Math.abs(Math.sin(x * 3.1 + y * 2.3)) * 1.8;
        const a0 = x * 1.7 + y;
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a0 + 4.6);
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = rgba(hair[2], 0.6);
        ctx.beginPath();
        ctx.arc(cx, cy - 0.5, r * 0.9, a0 + 3.9, a0 + 5.9);
        ctx.stroke();
      }
    }
    soft(ctx, 100, 30, 34, [120, 104, 112], 0.3, 0.6);
    ctx.restore();
    // A full crown of curls over the forehead, parted a little off center.
    const crown = [[57, 96], [56, 58], [72, 30], [100, 20], [128, 28], [144, 56], [143, 96], [136, 70], [122, 54], [106, 50], [92, 56], [78, 54], [64, 68]];
    smooth(ctx, crown);
    ctx.fillStyle = linear(ctx, 0, 20, 0, 90, [[0, hair[2]], [0.3, hair[1]], [1, hair[0]]]);
    ctx.fill();
    ctx.save();
    smooth(ctx, crown);
    ctx.clip();
    for (let y = 18; y < 100; y += 8) {
      for (let x = 54; x < 148; x += 8) {
        const cx = x + Math.sin(x * 9.1 + y * 3.7) * 2 + ((y / 8) % 2) * 4;
        const cy = y + Math.cos(x * 4.3 + y) * 1.5;
        const r = 3 + Math.abs(Math.sin(x * 2.1 + y * 1.3)) * 1.5;
        const a0 = x * 2.3 + y;
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a0 + 4.6);
        ctx.stroke();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = rgba(hair[2], 0.6);
        ctx.beginPath();
        ctx.arc(cx, cy - 0.5, r * 0.9, a0 + 3.9, a0 + 5.9);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function vader(ctx) {
    // Cape and shoulder armor.
    smooth(ctx, [[-10, 244], [-6, 206], [20, 184], [60, 172], [100, 170], [140, 172], [180, 184], [206, 206], [210, 244]]);
    ctx.fillStyle = linear(ctx, 0, 170, 0, 244, [[0, [44, 44, 50]], [1, [8, 8, 10]]]);
    ctx.fill();
    soft(ctx, 46, 190, 30, [120, 120, 136], 0.25, 0.5);
    // Chest control box with its lights.
    ctx.fillStyle = 'rgb(30,30,34)';
    ctx.fillRect(78, 196, 44, 30);
    ctx.strokeStyle = 'rgb(120,122,130)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(78, 196, 44, 30);
    for (const [x, y, c] of [[86, 204, [255, 60, 50]], [94, 204, [60, 220, 90]], [102, 204, [80, 140, 255]], [86, 214, [190, 190, 200]], [94, 214, [255, 60, 50]], [110, 214, [190, 190, 200]]]) {
      ctx.fillStyle = rgba(c);
      ctx.fillRect(x, y, 6, 5);
    }
    // Neck seal.
    smooth(ctx, [[80, 150], [120, 150], [124, 176], [100, 182], [76, 176]]);
    ctx.fillStyle = 'rgb(20,20,24)';
    ctx.fill();
    // The helmet dome, flaring out into a wide skirt at the bottom.
    const dome = [[100, 18], [138, 28], [152, 64], [154, 104], [166, 150], [176, 168], [140, 166], [124, 160], [100, 164], [76, 160], [60, 166], [24, 168], [34, 150], [46, 104], [48, 64], [62, 28]];
    smooth(ctx, dome);
    ctx.fillStyle = radial(ctx, 100, 70, 110, [[0, [70, 70, 80]], [0.4, [26, 26, 30]], [1, [6, 6, 8]]], 84, 44);
    ctx.fill();
    soft(ctx, 82, 42, 20, [200, 200, 220], 0.35, 0.7); // the dome's shine
    soft(ctx, 150, 120, 16, [180, 40, 40], 0.18); // a red reflection
    // The face mask: brow ridge, lenses, cheeks, nose ridge and mouth grille.
    smooth(ctx, [[66, 76], [100, 70], [134, 76], [132, 120], [120, 150], [100, 160], [80, 150], [68, 120]]);
    ctx.fillStyle = linear(ctx, 66, 70, 134, 160, [[0, [56, 56, 62]], [0.5, [28, 28, 32]], [1, [14, 14, 16]]]);
    ctx.fill();
    stroke(ctx, [[64, 78], [100, 70], [136, 78]], [110, 110, 120], 2.4, 0.8);
    both((s) => {
      const f = (p) => p.map(([px, py]) => [s > 0 ? px : 200 - px, py]);
      poly(ctx, f([[70, 84], [94, 86], [96, 100], [84, 104], [72, 98]]));
      ctx.fillStyle = radial(ctx, s > 0 ? 82 : 118, 92, 14, [[0, [120, 30, 36]], [0.6, [40, 6, 10]], [1, [8, 2, 4]]], s > 0 ? 78 : 114, 88);
      ctx.fill();
      ctx.strokeStyle = 'rgb(90,90,100)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      soft(ctx, s > 0 ? 78 : 114, 89, 3, [255, 200, 200], 0.8);
      // The cheek "tusks" down the sides of the mask.
      stroke(ctx, f([[76, 112], [80, 132], [88, 148]]), [120, 120, 130], 2, 0.7);
    });
    stroke(ctx, [[100, 86], [100, 116]], [120, 120, 130], 3, 0.8);
    // Triangular grille with vertical slits.
    poly(ctx, [[86, 120], [114, 120], [108, 150], [92, 150]]);
    ctx.fillStyle = 'rgb(70,72,80)';
    ctx.fill();
    ctx.strokeStyle = 'rgb(16,16,18)';
    ctx.lineWidth = 1.6;
    for (let x = 90; x <= 110; x += 3.4) {
      ctx.beginPath();
      ctx.moveTo(x, 123);
      ctx.lineTo(100 + (x - 100) * 0.62, 148);
      ctx.stroke();
    }
    stroke(ctx, [[84, 152], [100, 158], [116, 152]], [140, 140, 150], 1.6, 0.8);
  }

  // A T-visored helmet (Fett, Mando): dome, visor, cheek plates and ear caps.
  function tHelmet(ctx, o) {
    const [d, m, l] = o.metal;
    const shell = [[100, 22], [136, 30], [150, 62], [150, 110], [146, 146], [126, 160], [100, 164], [74, 160], [54, 146], [50, 110], [50, 62], [64, 30]];
    smooth(ctx, shell);
    ctx.fillStyle = radial(ctx, 100, 80, 96, [[0, l], [0.5, m], [1, d]], 86, 52);
    ctx.fill();
    ctx.save();
    smooth(ctx, shell);
    ctx.clip();
    soft(ctx, 84, 46, 22, [255, 255, 255], o.shine || 0.35, 0.7);
    soft(ctx, 150, 120, 30, d, 0.5);
    soft(ctx, 50, 120, 30, d, 0.5);
    if (o.paint) o.paint(ctx);
    ctx.restore();
    // Ear caps.
    both((s) => {
      const x = s > 0 ? 50 : 150;
      ctx.beginPath();
      ctx.ellipse(x, 108, 7, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(d);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - s * 1, 106, 4, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(m);
      ctx.fill();
    });
    // The T visor: a bar across the eyes and a slot down the middle.
    poly(ctx, [[64, 84], [136, 84], [136, 100], [110, 100], [108, 148], [92, 148], [90, 100], [64, 100]]);
    ctx.fillStyle = 'rgb(8,8,10)';
    ctx.fill();
    if (o.frame) {
      ctx.strokeStyle = rgba(o.frame);
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    soft(ctx, 80, 90, 8, [120, 140, 170], 0.35, 0.5); // glint in the visor
    // Cheek plate edges and the chin.
    both((s) => {
      const f = (p) => p.map(([px, py]) => [s > 0 ? px : 200 - px, py]);
      stroke(ctx, f([[64, 104], [72, 124], [88, 150]]), d, 1.4, 0.8);
      stroke(ctx, f([[66, 104], [74, 123], [89, 148]]), l, 0.8, 0.5);
    });
  }

  function mando(ctx) {
    // Brown flight suit and cowl, beskar pauldrons, bandolier.
    bust(ctx, { skin: [[20, 18, 18], [44, 40, 40]], top: [[38, 28, 22], [74, 58, 48], [116, 96, 80]] });
    both((s) => {
      const f = (p) => p.map(([px, py]) => [s > 0 ? px : 200 - px, py]);
      smooth(ctx, f([[-6, 206], [6, 186], [34, 174], [62, 172], [58, 196], [30, 210], [-6, 226]]));
      ctx.fillStyle = linear(ctx, 0, 172, 0, 226, [[0, [222, 226, 232]], [0.5, [130, 134, 142]], [1, [60, 62, 70]]]);
      ctx.fill();
    });
    poly(ctx, [[48, 176], [62, 170], [160, 244], [140, 244]]);
    ctx.fillStyle = 'rgb(100,66,44)';
    ctx.fill();
    // Beskar chest plates either side of the center line.
    both((s) => {
      const f = (p) => p.map(([px, py]) => [s > 0 ? px : 200 - px, py]);
      poly(ctx, f([[66, 194], [97, 188], [97, 236], [70, 244], [62, 220]]));
      ctx.fillStyle = linear(ctx, s > 0 ? 62 : 138, 188, 100, 244, [[0, [226, 230, 236]], [0.5, [140, 144, 152]], [1, [70, 72, 80]]]);
      ctx.fill();
      ctx.strokeStyle = 'rgb(40,42,48)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
    tHelmet(ctx, { metal: [[50, 52, 60], [132, 136, 144], [226, 230, 236]], shine: 0.5 });
  }

  function fett(ctx) {
    // Charcoal suit, olive chest plates, ochre shoulder pads.
    bust(ctx, { skin: [[20, 18, 18], [40, 36, 36]], top: [[30, 28, 28], [58, 54, 52], [90, 84, 82]] });
    // The olive chest plates, with the seam between them and a lit edge.
    poly(ctx, [[58, 190], [84, 182], [116, 182], [142, 190], [148, 244], [52, 244]]);
    ctx.fillStyle = linear(ctx, 52, 182, 148, 244, [[0, [130, 154, 120]], [0.5, [80, 104, 74]], [1, [42, 60, 40]]]);
    ctx.fill();
    stroke(ctx, [[58, 190], [84, 182], [116, 182], [142, 190]], [170, 190, 156], 1.4, 0.7);
    stroke(ctx, [[100, 184], [98, 204], [84, 216], [80, 244]], [30, 40, 28], 1.6, 0.8);
    stroke(ctx, [[98, 204], [116, 214], [120, 244]], [30, 40, 28], 1.6, 0.8);
    both((s) => {
      const f = (p) => p.map(([px, py]) => [s > 0 ? px : 200 - px, py]);
      smooth(ctx, f([[-6, 204], [4, 184], [30, 172], [56, 174], [50, 196], [24, 206], [-6, 222]]));
      ctx.fillStyle = linear(ctx, 0, 172, 0, 222, [[0, [228, 178, 92]], [0.5, [201, 138, 42]], [1, [140, 94, 26]]]);
      ctx.fill();
    });
    tHelmet(ctx, {
      metal: [[40, 58, 38], [74, 102, 70], [130, 154, 120]],
      frame: [94, 36, 34],
      shine: 0.25,
      paint(c) {
        // Battle scars and chipped paint.
        for (const [x, y, r] of [[78, 52, 3], [120, 46, 2.4], [132, 70, 2], [70, 128, 2.6], [128, 134, 2], [112, 62, 1.6]]) {
          c.fillStyle = 'rgba(190,196,180,0.6)';
          c.beginPath();
          c.ellipse(x, y, r, r * 0.6, 0.6, 0, Math.PI * 2);
          c.fill();
        }
        stroke(c, [[86, 40], [92, 58]], [30, 40, 28], 1.2, 0.6); // the dent
      },
    });
    // The rangefinder stalk on his left side.
    ctx.fillStyle = 'rgb(140,124,84)';
    ctx.fillRect(150, 70, 8, 34);
    ctx.fillStyle = 'rgb(40,40,40)';
    ctx.fillRect(151, 74, 6, 4);
    ctx.fillStyle = 'rgb(120,120,126)';
    ctx.fillRect(153, 28, 2.5, 44);
  }

  const painters = { fett, worf, vader, seven, mando, troi };

  function render(id) {
    const cv = document.createElement('canvas');
    cv.width = 200 * PORTRAIT_RES;
    cv.height = 240 * PORTRAIT_RES;
    const ctx = cv.getContext('2d');
    ctx.scale(PORTRAIT_RES, PORTRAIT_RES);
    (painters[id] || seven)(ctx);
    return cv;
  }

  return {
    // Draw a fighter's portrait to fill a w x h box (cropped to keep its shape).
    draw(ctx, id, x, y, w, h) {
      const img = cache[id] || (cache[id] = render(id));
      const s = Math.max(w / 200, h / 240);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x + (w - 200 * s) / 2, y + h - 240 * s, 200 * s, 240 * s);
      ctx.restore();
    },
  };
})();
