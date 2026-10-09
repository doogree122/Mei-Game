// What fills a tall (portrait phone) screen above and below a picture level,
// like the USS Hood's hull and Earth (src/exterior.js) for the ship:
//   corridor - the Death Star's hull above, and below, its round underside
//              curving away into space
//   bridge   - space above, and below, the top of the Enterprise's saucer,
//              its round front edge with rows of windows
//   desert   - more sky above, and below, more sand with rocks, tracks and
//              shadows, and adobe buildings at the sides
// Each is painted once per screen size into a canvas a little wider than the
// screen, then slid sideways with the camera (slower than the fighters).

const Surrounds = (() => {
  const PAN = 240; // extra width for the sideways slide
  const cache = {};

  function rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  function stars(c, w, h, rand, count) {
    for (let i = 0; i < count; i++) {
      const big = rand() < 0.12;
      c.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`;
      c.fillRect(rand() * w, rand() * h, big ? 2.2 : 1.2, big ? 2.2 : 1.2);
    }
  }

  function space(c, w, h, rand) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04050c');
    g.addColorStop(1, '#0a0e1e');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const neb = c.createRadialGradient(w * 0.7, h * 0.85, 10, w * 0.7, h * 0.85, w * 0.6);
    neb.addColorStop(0, 'rgba(110,70,190,0.18)');
    neb.addColorStop(1, 'rgba(110,70,190,0)');
    c.fillStyle = neb;
    c.fillRect(0, 0, w, h);
    stars(c, w, h, rand, Math.round((w * h) / 2600));
  }

  // Blend a band of `color` into the arena's edge so the seam is soft.
  function edgeBlend(c, w, y, color, height, down) {
    const g = c.createLinearGradient(0, y, 0, y + (down ? height : -height));
    g.addColorStop(0, color);
    g.addColorStop(1, color.replace(')', ',0)').replace('rgb', 'rgba'));
    c.fillStyle = g;
    c.fillRect(0, down ? y : y - height, w, height);
  }

  const hex = (h) => `rgb(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)})`;

  // ---- The Death Star (corridor) ----
  function deathStar(c, w, top, viewH) {
    const rand = rng(41);
    const bottomTop = top + H;
    const room = viewH - bottomTop;
    space(c, w, viewH, rand);

    // Above: flat hull plating with trenches and lit windows.
    c.fillStyle = '#3b3e46';
    c.fillRect(0, 0, w, top);
    for (let y = 6; y < top; y += 18) {
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(0, y, w, 2);
    }
    for (let i = 0; i < (w * top) / 900; i++) {
      const x = rand() * w;
      const y = rand() * top;
      c.fillStyle = rand() < 0.5 ? 'rgba(90,94,104,0.9)' : 'rgba(40,42,48,0.9)';
      c.fillRect(x, y, 8 + rand() * 30, 4 + rand() * 8);
      if (rand() < 0.4) {
        c.fillStyle = 'rgba(255,248,220,0.85)';
        c.fillRect(x + rand() * 10, y + 2, 2, 1.6);
      }
    }

    // Below: the sphere's underside, curving away to a round bottom edge.
    const R = w * 0.9;
    const bottomEdge = bottomTop + Math.max(120, room * 0.66);
    const cx = w / 2;
    const cy = bottomEdge - R;
    c.save();
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.clip();
    const g = c.createLinearGradient(0, bottomTop, 0, bottomEdge);
    g.addColorStop(0, '#5d616b');
    g.addColorStop(0.6, '#3f434b');
    g.addColorStop(1, '#22252b');
    c.fillStyle = g;
    c.fillRect(0, bottomTop, w, bottomEdge - bottomTop);
    // Side shading: the sphere turns away at the left and right.
    const sg = c.createLinearGradient(0, 0, w, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.45)');
    sg.addColorStop(0.35, 'rgba(0,0,0,0)');
    sg.addColorStop(0.7, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = sg;
    c.fillRect(0, bottomTop, w, bottomEdge - bottomTop);
    // Rings of trenches and panels following the curve.
    for (let k = 1; k < 9; k++) {
      const r = R - k * Math.max(14, (room * 0.6) / 9);
      if (cy + r < bottomTop) break;
      c.strokeStyle = 'rgba(15,16,20,0.55)';
      c.lineWidth = k % 3 === 0 ? 3 : 1.4;
      c.beginPath();
      c.arc(cx, cy, r, 0.15, Math.PI - 0.15);
      c.stroke();
      // Panels and windows along this ring.
      for (let i = 0; i < 46; i++) {
        const a = 0.2 + rand() * (Math.PI - 0.4);
        const rr = r + 3 + rand() * 9;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (y < bottomTop) continue;
        c.fillStyle = rand() < 0.5 ? 'rgba(120,124,134,0.5)' : 'rgba(20,22,26,0.5)';
        c.fillRect(x, y, 6 + rand() * 18, 2 + rand() * 4);
        if (rand() < 0.35) {
          c.fillStyle = 'rgba(255,246,210,0.9)';
          c.fillRect(x + 2, y + 1, 1.8, 1.4);
        }
      }
    }
    c.restore();
    // A thin rim of reflected light along the bottom edge.
    c.strokeStyle = 'rgba(160,170,190,0.55)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, R - 1, 0.2, Math.PI - 0.2);
    c.stroke();
    edgeBlend(c, w, bottomTop, hex('#3e3f3f'), 26, true);
    edgeBlend(c, w, top, hex('#2f2f31'), 18, false);
  }

  // ---- The Enterprise's saucer (bridge) ----
  function saucer(c, w, top, viewH) {
    const rand = rng(1701);
    const bottomTop = top + H;
    const room = viewH - bottomTop;
    space(c, w, viewH, rand);

    // The saucer's top: a wide ellipse centered under the bridge, its front
    // edge curving round below.
    const cx = w / 2;
    const cy = bottomTop - 10;
    const rx = w * 0.95;
    const ry = Math.max(150, Math.min(room * 0.62, 560));
    const rim = Math.max(18, ry * 0.08);
    // Underside and rim first, then the top surface over them.
    c.fillStyle = '#5b6068';
    c.beginPath();
    c.ellipse(cx, cy + rim, rx, ry, 0, 0, Math.PI);
    c.fill();
    const top0 = c.createRadialGradient(cx, cy, 10, cx, cy, rx);
    top0.addColorStop(0, '#e4e6ea');
    top0.addColorStop(0.55, '#c3c7ce');
    top0.addColorStop(1, '#8e939c');
    c.fillStyle = top0;
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
    c.fill();
    c.save();
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
    c.clip();
    // The hull's patchwork of plating: panels between rings and spokes, each a
    // slightly different gray, the way the real model's hull is painted.
    const at = (ring, a) => [cx + Math.cos(a) * rx * ring, cy + Math.sin(a) * ry * ring];
    for (let r0 = 0.1; r0 < 1; ) {
      const r1 = Math.min(1, r0 + 0.05 + rand() * 0.07);
      for (let a0 = 0; a0 < Math.PI; ) {
        const a1 = Math.min(Math.PI, a0 + (0.05 + rand() * 0.14) / Math.max(0.3, r0));
        const tone = rand();
        if (tone < 0.6) {
          c.fillStyle = tone < 0.3 ? 'rgba(255,255,255,0.16)' : 'rgba(60,66,80,0.12)';
          c.beginPath();
          c.moveTo(...at(r0, a0));
          for (let t = 0; t <= 4; t++) c.lineTo(...at(r0, a0 + ((a1 - a0) * t) / 4));
          for (let t = 4; t >= 0; t--) c.lineTo(...at(r1, a0 + ((a1 - a0) * t) / 4));
          c.closePath();
          c.fill();
        }
        a0 = a1;
      }
      c.strokeStyle = 'rgba(80,86,98,0.22)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(cx, cy, rx * r1, ry * r1, 0, 0, Math.PI);
      c.stroke();
      r0 = r1;
    }
    // The phaser strip: a darker ring band out toward the rim.
    c.strokeStyle = 'rgba(60,64,74,0.35)';
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(cx, cy, rx * 0.86, ry * 0.86, 0, 0.05, Math.PI - 0.05);
    c.stroke();
    // Spokes running out from the center.
    for (let a = 0.15; a < Math.PI; a += Math.PI / 9) {
      c.strokeStyle = 'rgba(80,86,98,0.2)';
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * rx * 0.1, cy + Math.sin(a) * ry * 0.1);
      c.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
      c.stroke();
    }
    c.restore();
    // Rim: two rows of lit windows along the front edge.
    for (const [off, n] of [[rim * 0.35, 140], [rim * 0.72, 110]]) {
      for (let i = 0; i < n; i++) {
        const a = 0.08 + (i / n) * (Math.PI - 0.16);
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry + off;
        if (rand() < 0.25) continue;
        c.fillStyle = 'rgba(255,236,170,0.95)';
        c.fillRect(x - 1.2, y - 0.8, 2.6, 1.6);
      }
    }
    c.strokeStyle = 'rgba(30,34,42,0.8)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0.02, Math.PI - 0.02);
    c.stroke();
    // Running lights at the far edges.
    const light = (a, color) => {
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry + rim * 0.5;
      const lg = c.createRadialGradient(x, y, 0, x, y, 16);
      lg.addColorStop(0, color);
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = lg;
      c.fillRect(x - 16, y - 16, 32, 32);
    };
    light(Math.PI * 0.86, 'rgba(255,60,60,0.95)');
    light(Math.PI * 0.14, 'rgba(60,255,120,0.95)');
    edgeBlend(c, w, bottomTop, hex('#c2b495'), 22, true);
    edgeBlend(c, w, top, hex('#635b51'), 18, false);
  }

  // ---- Desert town ----
  function adobeDome(c, x, y, r, rand) {
    // A wide domed hut standing on the sand (its base at y): a low wall with a
    // shallow dome on top, an arched doorway, and its shadow on the ground.
    const wallH = r * 0.55;
    c.fillStyle = 'rgba(60,40,30,0.3)';
    c.beginPath();
    c.ellipse(x + r * 0.35, y + 4, r * 1.25, r * 0.12, 0, 0, Math.PI * 2);
    c.fill();
    const wall = c.createLinearGradient(x - r, 0, x + r, 0);
    wall.addColorStop(0, '#d2a47c');
    wall.addColorStop(0.55, '#b68a65');
    wall.addColorStop(1, '#7f5d44');
    c.fillStyle = wall;
    c.beginPath();
    c.moveTo(x - r, y);
    c.lineTo(x - r * 0.97, y - wallH);
    c.lineTo(x + r * 0.97, y - wallH);
    c.lineTo(x + r, y);
    c.closePath();
    c.fill();
    const dome = c.createRadialGradient(x - r * 0.35, y - wallH - r * 0.45, r * 0.05, x, y - wallH, r * 1.05);
    dome.addColorStop(0, '#e2b892');
    dome.addColorStop(1, '#8a6247');
    c.fillStyle = dome;
    c.beginPath();
    c.ellipse(x, y - wallH, r * 0.97, r * 0.62, 0, Math.PI, 0);
    c.fill();
    // A ridge where the dome meets the wall.
    c.fillStyle = 'rgba(90,62,44,0.55)';
    c.fillRect(x - r * 0.97, y - wallH - 2, r * 1.94, 4);
    // Arched doorway.
    const dw = r * 0.22;
    const dh = wallH * 0.75;
    c.fillStyle = '#3b2a20';
    c.beginPath();
    c.moveTo(x + r * 0.2 - dw, y);
    c.lineTo(x + r * 0.2 - dw, y - dh + dw);
    c.arc(x + r * 0.2, y - dh + dw, dw, Math.PI, 0);
    c.lineTo(x + r * 0.2 + dw, y);
    c.closePath();
    c.fill();
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(70,46,32,${0.08 + rand() * 0.18})`;
      c.fillRect(x - r + rand() * r * 2, y - wallH - r * 0.4 + rand() * (wallH + r * 0.4), 2 + rand() * 8, 1 + rand() * 3);
    }
  }

  // A square adobe block with a round tower on one corner.
  function adobeTower(c, x, y, size, rand) {
    const bw = size;
    const bh = size * 0.8;
    c.fillStyle = 'rgba(60,40,30,0.28)';
    c.fillRect(x - bw * 0.1, y - 3, bw * 1.5, 7);
    const wall = c.createLinearGradient(x, 0, x + bw, 0);
    wall.addColorStop(0, '#caa07a');
    wall.addColorStop(1, '#8c6a50');
    c.fillStyle = wall;
    c.fillRect(x, y - bh, bw, bh);
    c.fillStyle = '#b28866';
    c.fillRect(x + bw * 0.62, y - bh * 1.45, bw * 0.34, bh * 1.45);
    c.fillStyle = '#d4ab86';
    c.beginPath();
    c.ellipse(x + bw * 0.79, y - bh * 1.45, bw * 0.17, bw * 0.08, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = '#8a3b2a'; // red door
    c.fillRect(x + bw * 0.2, y - bh * 0.6, bw * 0.18, bh * 0.6);
    c.fillStyle = '#3b2a20';
    c.fillRect(x + bw * 0.7, y - bh * 1.15, bw * 0.08, bh * 0.14);
    for (let i = 0; i < 24; i++) {
      c.fillStyle = `rgba(70,46,32,${0.08 + rand() * 0.18})`;
      c.fillRect(x + rand() * bw, y - bh + rand() * bh, 2 + rand() * 6, 1 + rand() * 3);
    }
  }

  function vaporator(c, x, y, h) {
    c.fillStyle = '#6f6a63';
    c.fillRect(x - 5, y - h, 10, h);
    c.fillStyle = '#9b958c';
    for (let k = 0.2; k < 1; k += 0.22) c.fillRect(x - 9, y - h * k, 18, 5);
    c.fillStyle = '#4c4843';
    c.fillRect(x - 2, y - h - 20, 4, 20);
  }

  function desert(c, w, top, viewH) {
    const rand = rng(77);
    const bottomTop = top + H;
    // Sky above, the picture's gray-blue deepening upward, with the twin suns'
    // glow low in the sky.
    const sky = c.createLinearGradient(0, 0, 0, top);
    sky.addColorStop(0, '#36404c');
    sky.addColorStop(1, '#565753');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, top + 2);
    for (const [x, r] of [[w * 0.18, 60], [w * 0.27, 40]]) {
      const sg = c.createRadialGradient(x, top * 0.75, 0, x, top * 0.75, r * 2.5);
      sg.addColorStop(0, 'rgba(255,236,190,0.55)');
      sg.addColorStop(1, 'rgba(255,236,190,0)');
      c.fillStyle = sg;
      c.fillRect(0, 0, w, top);
    }
    // Sand below: lighter toward us, with grain, stones, tracks and shadows.
    const sand = c.createLinearGradient(0, bottomTop, 0, viewH);
    sand.addColorStop(0, '#a08065');
    sand.addColorStop(1, '#c8a684');
    c.fillStyle = sand;
    c.fillRect(0, bottomTop, w, viewH - bottomTop);
    const room = viewH - bottomTop;
    for (let i = 0; i < (w * room) / 40; i++) {
      c.fillStyle = rand() < 0.5 ? 'rgba(90,64,44,0.18)' : 'rgba(255,240,210,0.16)';
      c.fillRect(rand() * w, bottomTop + rand() * room, 1 + rand() * 2.5, 1 + rand() * 1.5);
    }
    // Long shadows cast across the street from the left.
    for (let i = 0; i < 4; i++) {
      const y = bottomTop + room * (0.15 + i * 0.22) + rand() * 20;
      c.fillStyle = 'rgba(60,40,30,0.18)';
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w * (0.5 + rand() * 0.4), y - 10 - rand() * 20);
      c.lineTo(w * (0.5 + rand() * 0.4), y + 6);
      c.lineTo(0, y + 22 + rand() * 18);
      c.fill();
    }
    // Wheel tracks.
    c.strokeStyle = 'rgba(100,72,52,0.25)';
    c.lineWidth = 3;
    for (const off of [0, 26]) {
      c.beginPath();
      c.moveTo(w * 0.32 + off, viewH);
      c.quadraticCurveTo(w * 0.42 + off, bottomTop + room * 0.4, w * 0.48 + off * 0.3, bottomTop);
      c.stroke();
    }
    // Stones.
    for (let i = 0; i < 38; i++) {
      const x = rand() * w;
      const y = bottomTop + 20 + rand() * (room - 20);
      const s = (3 + rand() * 7) * (0.6 + (y - bottomTop) / room);
      c.fillStyle = 'rgba(60,42,30,0.35)';
      c.beginPath();
      c.ellipse(x + s * 0.5, y + s * 0.35, s * 1.1, s * 0.35, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = rand() < 0.5 ? '#8c6d55' : '#b39272';
      c.beginPath();
      c.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2);
      c.fill();
    }
    // Buildings along the street, farther ones smaller, and vaporators.
    const s = Math.min(1, room / 700);
    adobeDome(c, w * 0.36, bottomTop + room * 0.12, 48 * s, rand);
    adobeTower(c, w * 0.86, bottomTop + room * 0.16, 70 * s, rand);
    adobeDome(c, w * 0.6, bottomTop + room * 0.2, 70 * s, rand);
    adobeTower(c, w * 0.08, bottomTop + room * 0.3, 90 * s, rand);
    vaporator(c, w * 0.8, bottomTop + room * 0.24, 110 * s);
    vaporator(c, w * 0.22, bottomTop + room * 0.4, 150 * s);
    adobeDome(c, 60, bottomTop + room * 0.62, 210 * s, rand);
    adobeDome(c, w - 70, bottomTop + room * 0.8, 240 * s, rand);
    edgeBlend(c, w, bottomTop, hex('#a08065'), 30, true);
    edgeBlend(c, w, top, hex('#565753'), 12, false);
  }

  const PAINTERS = { corridor: deathStar, bridge: saucer, desert };

  function bake(id, top, viewH) {
    const k = Math.min(2, Math.max(1, typeof RES === 'number' ? RES : 1));
    const w = W + PAN;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * k);
    cv.height = Math.ceil(viewH * k);
    const c = cv.getContext('2d');
    c.scale(k, k);
    PAINTERS[id](c, w, top, viewH);
    return { cv, k };
  }

  return {
    has: (id) => !!PAINTERS[id],
    // Draw the surround for level `id` around the arena (top = arena's top edge).
    draw(ctx, id, camX, top, viewH) {
      const key = `${id}:${top}:${viewH}:${typeof RES === 'number' ? RES : 1}`;
      if (!cache[id] || cache[id].key !== key) cache[id] = { key, ...bake(id, top, viewH) };
      const { cv, k } = cache[id];
      const pan = Math.max(0, Math.min(1, camX / (WORLD_W - W)));
      ctx.drawImage(cv, -PAN * pan, 0, cv.width / k, cv.height / k);
    },
  };
})();
