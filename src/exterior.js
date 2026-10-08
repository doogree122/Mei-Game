// The ship's exterior, shown above and below the fighting area when the screen
// is taller than 16:9 (a phone held upright). The arena stays a 960x540 slice
// of the ship; around it the upper hull, the belly with its engines, and open
// space with Earth fill the rest. Hull parts scroll with the camera like the
// deck; stars and Earth scroll slower for depth.
//
// Coordinates are screen pixels of the tall canvas: the arena occupies
// [top, top + H). Everything is drawn into a low-res buffer for the pixel look.

const Exterior = (() => {
  let starTile = null;

  function buildStars() {
    const size = 512;
    const { cv, ctx: c } = bakedCanvas(size, size);
    let seed = 99;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) {
      const s = rand() < 0.85 ? 3 : 5;
      c.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.65})`;
      c.fillRect(rand() * size, rand() * size, s, s);
    }
    return cv;
  }

  function drawSpace(ctx, camX, viewH) {
    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    sky.addColorStop(0, '#03040c');
    sky.addColorStop(1, '#0a1230');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, viewH);
    if (!starTile) starTile = buildStars();
    const off = -((camX * 0.15) % 512);
    for (let x = off - 512; x < W; x += 512) {
      for (let y = 0; y < viewH; y += 512) drawBaked(ctx, starTile, x, y);
    }
  }

  // A huge Earth rising from the bottom of the screen.
  function drawEarth(ctx, camX, viewH) {
    const r = 760;
    const ex = W * 0.55 - camX * 0.06;
    const ey = viewH + r * 0.3;
    const glow = ctx.createRadialGradient(ex, ey, r * 0.96, ex, ey, r * 1.1);
    glow.addColorStop(0, 'rgba(120,190,255,0.6)');
    glow.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ex, ey, r * 1.1, 0, Math.PI * 2);
    ctx.fill();
    const ocean = ctx.createRadialGradient(ex - 150, ey - r * 0.7, 30, ex, ey, r);
    ocean.addColorStop(0, '#4fa3e8');
    ocean.addColorStop(0.7, '#1d4f9a');
    ocean.addColorStop(1, '#0c2550');
    ctx.fillStyle = ocean;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(70,140,80,0.85)';
    for (const [dx, dy, rx, ry, rot] of [[-260, -560, 170, 70, 0.3], [140, -620, 130, 55, -0.4], [330, -470, 110, 80, 0.2], [-60, -430, 90, 40, 0.8]]) {
      ctx.beginPath();
      ctx.ellipse(ex + dx, ey + dy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    for (const [dx, dy] of [[-380, -520], [-120, -650], [220, -560], [420, -380], [-300, -380]]) {
      ctx.beginPath();
      ctx.moveTo(ex + dx - 60, ey + dy);
      ctx.quadraticCurveTo(ex + dx, ey + dy - 16, ex + dx + 80, ey + dy + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // A distant cratered moon in the open space below the ship.
  function drawMoon(ctx, camX, base, viewH) {
    const room = viewH - base;
    if (room < 700) return;
    const r = 70;
    const mx = W * 0.22 - camX * 0.1 + Math.floor((camX * 0.1 + W * 0.22 + r) / (W + 2 * r)) * (W + 2 * r);
    const my = base + room * 0.45;
    const g = ctx.createRadialGradient(mx - 20, my - 20, 8, mx, my, r);
    g.addColorStop(0, '#f0efe8');
    g.addColorStop(1, '#8f8e88');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    for (const [dx, dy, cr] of [[-22, -14, 15], [24, 18, 11], [14, -30, 8], [-30, 26, 9]]) {
      ctx.beginPath();
      ctx.arc(mx + dx, my + dy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // World x positions of repeating hull features that are on screen.
  function each(camX, spacing, phase, fn) {
    const first = Math.floor((camX - phase) / spacing) - 1;
    for (let k = first; k * spacing + phase < camX + W + spacing; k++) fn(k * spacing + phase - camX, k);
  }

  // Upper hull: armored plating over the deck, with antenna masts on top.
  function drawUpperHull(ctx, camX, top, frame) {
    const h = Math.min(top, 120);
    const y0 = top - h;
    const plate = ctx.createLinearGradient(0, y0, 0, top);
    plate.addColorStop(0, '#8a94a3');
    plate.addColorStop(1, '#4a525e');
    ctx.fillStyle = plate;
    ctx.fillRect(0, y0, W, h);
    ctx.fillStyle = '#c9d0da';
    ctx.fillRect(0, y0, W, 4);
    ctx.fillStyle = '#2c323b';
    ctx.fillRect(0, top - 10, W, 10);
    each(camX, 180, 0, (x) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y0 + 4, 3, h - 14);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 24 + i * 38, top - 24, 5, 5);
    });
    // Antenna masts with blinking navigation lights.
    if (y0 > 40) {
      each(camX, 560, 140, (x, k) => {
        const mh = Math.min(90, y0 - 10);
        ctx.fillStyle = '#6b7482';
        ctx.fillRect(x, y0 - mh, 6, mh);
        ctx.fillRect(x - 16, y0 - mh * 0.6, 38, 4);
        const on = (frame + k * 37) % 90 < 45;
        ctx.fillStyle = on ? (k % 2 ? '#ff4d4d' : '#4dff88') : '#333a44';
        ctx.fillRect(x - 3, y0 - mh - 10, 12, 10);
      });
    }
  }

  // Lower hull: deck girders, belly plating, and engine pods with exhaust.
  function drawLowerHull(ctx, camX, base, frame, viewH) {
    const room = viewH - base;
    if (room <= 0) return;
    // Substructure under the deck plates: dark trusses and pipes.
    const subH = Math.min(70, room);
    ctx.fillStyle = '#20252d';
    ctx.fillRect(0, base, W, subH);
    ctx.strokeStyle = '#3a414c';
    ctx.lineWidth = 6;
    each(camX, 120, 0, (x) => {
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x + 60, base + subH);
      ctx.moveTo(x + 60, base);
      ctx.lineTo(x, base + subH);
      ctx.stroke();
    });
    ctx.fillStyle = '#5a6472';
    ctx.fillRect(0, base + 18, W, 8);
    ctx.fillStyle = '#7a3a2a';
    ctx.fillRect(0, base + 44, W, 8);
    each(camX, 240, 60, (x, k) => {
      ctx.fillStyle = (frame + k * 23) % 80 < 40 ? '#ffb43a' : '#4a3a20';
      ctx.fillRect(x, base + 30, 8, 8);
    });
    if (room <= subH) return;

    // Belly plating with seams, rivets, vents and the ship's name.
    const py = base + subH;
    const ph = Math.min(150, room - subH);
    const plate = ctx.createLinearGradient(0, py, 0, py + ph);
    plate.addColorStop(0, '#7b8594');
    plate.addColorStop(1, '#3d444f');
    ctx.fillStyle = plate;
    ctx.fillRect(0, py, W, ph);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, py, W, 12);
    ctx.clip();
    ctx.fillStyle = '#1e2329';
    ctx.fillRect(0, py, W, 12);
    ctx.fillStyle = '#f2b632';
    each(camX, 32, 0, (x) => {
      ctx.beginPath();
      ctx.moveTo(x, py + 12);
      ctx.lineTo(x + 16, py + 12);
      ctx.lineTo(x + 28, py);
      ctx.lineTo(x + 12, py);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
    each(camX, 200, 40, (x) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, py + 12, 3, ph - 12);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 20 + i * 44, py + 26, 5, 5);
    });
    if (ph > 90) {
      each(camX, 600, 300, (x) => {
        ctx.fillStyle = '#1c2026';
        for (let i = 0; i < 5; i++) ctx.fillRect(x + i * 16, py + 50, 9, 40);
      });
      ctx.font = 'italic 900 52px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      each(camX, 900, 520, (x) => {
        ctx.fillStyle = 'rgba(20,30,60,0.75)';
        ctx.fillText('USS HOOD', x, py + 75);
      });
    }
    if (room <= subH + ph) return;

    // Hull edge, then engine pods hanging below with blue exhaust trailing left.
    const ey = py + ph;
    ctx.fillStyle = '#2c323b';
    ctx.fillRect(0, ey, W, 10);
    each(camX, 900, 120, (x) => {
      const pw = 300;
      const top = ey + 10;
      ctx.fillStyle = '#4a525e';
      ctx.fillRect(x + 120, top, 40, 26);
      const pod = ctx.createLinearGradient(0, top + 26, 0, top + 106);
      pod.addColorStop(0, '#9aa3b1');
      pod.addColorStop(1, '#424a56');
      ctx.fillStyle = pod;
      ctx.beginPath();
      ctx.roundRect(x, top + 26, pw, 80, 36);
      ctx.fill();
      ctx.fillStyle = '#2a2f37';
      ctx.fillRect(x - 18, top + 40, 26, 52);
      ctx.fillStyle = '#f2b632';
      ctx.fillRect(x + pw - 70, top + 30, 10, 72);
      // Exhaust plume.
      const len = 260 + (frame % 6) * 12;
      const plume = ctx.createLinearGradient(x - 18, 0, x - 18 - len, 0);
      plume.addColorStop(0, 'rgba(180,235,255,0.95)');
      plume.addColorStop(0.25, 'rgba(90,170,255,0.7)');
      plume.addColorStop(1, 'rgba(60,120,255,0)');
      ctx.fillStyle = plume;
      ctx.beginPath();
      ctx.moveTo(x - 18, top + 42);
      ctx.lineTo(x - 18 - len, top + 66);
      ctx.lineTo(x - 18, top + 90);
      ctx.closePath();
      ctx.fill();
    });
  }

  return {
    // ctx: low-res buffer covering the whole tall canvas; top: arena's top edge.
    draw(ctx, camX, frame, top, viewH) {
      ctx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
      drawSpace(ctx, camX, viewH);
      drawEarth(ctx, camX, viewH);
      drawMoon(ctx, camX, top + H, viewH);
      drawUpperHull(ctx, camX, top, frame);
      drawLowerHull(ctx, camX, top + H, frame, viewH);
    },
  };
})();
