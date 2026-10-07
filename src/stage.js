// Spaceship interior stage. The room is WORLD_W wide and scrolls with the camera;
// the view of space through the windows scrolls slower (parallax) for depth.
//
// Layers, back to front:
//   space   - stars, Earth, moon            (parallax SPACE_PARALLAX, cached)
//   room    - walls, windows (cut out), ceiling lights, consoles, rails (cached, world space)
//   lights  - blinking console LEDs and pulsing strips (drawn every frame)
//   floor   - metal deck plates in perspective (drawn every frame)

const SPACE_PARALLAX = 0.15;
const CEILING_H = 64;
const WINDOW_SPACING = 470;
const WINDOW_W = 300;
const WINDOW_TOP = 118;
const WINDOW_H = 150;

const Stage = (() => {
  let spaceCanvas = null;
  let roomCanvas = null;
  const leds = [];
  const lightStrips = [];

  // Deterministic random so the stage looks identical every load.
  function rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function windowXs() {
    const xs = [];
    for (let x = 260; x + WINDOW_W < WORLD_W - 200; x += WINDOW_SPACING) xs.push(x);
    return xs;
  }

  function buildSpace() {
    const width = Math.ceil(W + WORLD_W * SPACE_PARALLAX) + 2;
    const cv = document.createElement('canvas');
    cv.width = width;
    cv.height = GROUND;
    const ctx = cv.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, 0, GROUND);
    bg.addColorStop(0, '#02030a');
    bg.addColorStop(1, '#0a1230');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, GROUND);

    // Faint nebula.
    const neb = ctx.createRadialGradient(width * 0.3, 120, 10, width * 0.3, 120, 260);
    neb.addColorStop(0, 'rgba(120,70,200,0.25)');
    neb.addColorStop(1, 'rgba(120,70,200,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, width, GROUND);

    const rand = rng(42);
    for (let i = 0; i < 260; i++) {
      const size = rand() < 0.9 ? 1 : 2;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.65})`;
      ctx.fillRect(rand() * width, rand() * GROUND, size, size);
    }

    // Earth: a huge planet rising from below the windows.
    const ex = width * 0.55;
    const ey = 560;
    const er = 330;
    const glow = ctx.createRadialGradient(ex, ey, er * 0.95, ex, ey, er * 1.12);
    glow.addColorStop(0, 'rgba(120,190,255,0.7)');
    glow.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ex, ey, er * 1.12, 0, Math.PI * 2);
    ctx.fill();
    const ocean = ctx.createRadialGradient(ex - 80, ey - 200, 20, ex, ey, er);
    ocean.addColorStop(0, '#4fa3e8');
    ocean.addColorStop(0.7, '#1d4f9a');
    ocean.addColorStop(1, '#0c2550');
    ctx.fillStyle = ocean;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    // Continents + clouds, clipped to the planet.
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(70,140,80,0.85)';
    for (const [dx, dy, rx, ry, rot] of [[-120, -230, 90, 40, 0.3], [60, -260, 70, 30, -0.4], [160, -170, 60, 50, 0.2], [-40, -150, 50, 25, 0.8]]) {
      ctx.beginPath();
      ctx.ellipse(ex + dx, ey + dy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      ctx.lineWidth = 3 + rand() * 6;
      const a = -Math.PI / 2 + (rand() - 0.5) * 1.6;
      const d = er * (0.55 + rand() * 0.4);
      const cx = ex + Math.cos(a) * d;
      const cy = ey + Math.sin(a) * d;
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy);
      ctx.quadraticCurveTo(cx, cy - 8, cx + 40, cy + 2);
      ctx.stroke();
    }
    // Night-side shading.
    const shade = ctx.createLinearGradient(ex - er, 0, ex + er, 0);
    shade.addColorStop(0, 'rgba(0,0,20,0)');
    shade.addColorStop(0.6, 'rgba(0,0,20,0.1)');
    shade.addColorStop(1, 'rgba(0,0,20,0.75)');
    ctx.fillStyle = shade;
    ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    ctx.restore();

    // Moon.
    const mx = width * 0.12;
    const moon = ctx.createRadialGradient(mx - 8, 150 - 8, 2, mx, 150, 34);
    moon.addColorStop(0, '#f2f2ee');
    moon.addColorStop(1, '#9a9a96');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(mx, 150, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (const [dx, dy, r] of [[-10, -6, 7], [9, 8, 5], [6, -14, 4]]) {
      ctx.beginPath();
      ctx.arc(mx + dx, 150 + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return cv;
  }

  function buildRoom() {
    const cv = document.createElement('canvas');
    cv.width = WORLD_W;
    cv.height = GROUND;
    const ctx = cv.getContext('2d');
    const rand = rng(7);

    // Wall base.
    const wall = ctx.createLinearGradient(0, CEILING_H, 0, GROUND);
    wall.addColorStop(0, '#dfe4ea');
    wall.addColorStop(0.6, '#c9d0d8');
    wall.addColorStop(1, '#a9b2bd');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, WORLD_W, GROUND);

    // Padded wall panels.
    const panelW = 130;
    for (let x = 0; x < WORLD_W; x += panelW) {
      for (const [y, h] of [[CEILING_H + 12, 190], [CEILING_H + 210, 120], [CEILING_H + 338, GROUND - CEILING_H - 350]]) {
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#eef1f4');
        g.addColorStop(1, '#cdd4dc');
        ctx.fillStyle = g;
        roundRect(ctx, x + 5, y, panelW - 10, h, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,100,115,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Velcro / stitching detail on some panels.
        if (rand() < 0.35 && h > 100) {
          ctx.fillStyle = 'rgba(80,90,105,0.25)';
          ctx.fillRect(x + 30, y + h * 0.4, panelW - 60, 10);
        }
      }
    }

    // Windows: frame, then cut the glass out so the space layer shows through.
    for (const wx of windowXs()) {
      ctx.fillStyle = '#5d6672';
      roundRect(ctx, wx - 18, WINDOW_TOP - 18, WINDOW_W + 36, WINDOW_H + 36, 40);
      ctx.fill();
      ctx.fillStyle = '#8b95a1';
      roundRect(ctx, wx - 9, WINDOW_TOP - 9, WINDOW_W + 18, WINDOW_H + 18, 32);
      ctx.fill();
      // Bolts.
      ctx.fillStyle = '#3c434c';
      for (let i = 0; i < 8; i++) {
        const bx = wx - 10 + (i % 4) * ((WINDOW_W + 20) / 3);
        const by = i < 4 ? WINDOW_TOP - 13 : WINDOW_TOP + WINDOW_H + 13;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      roundRect(ctx, wx, WINDOW_TOP, WINDOW_W, WINDOW_H, 26);
      ctx.fill();
      ctx.restore();

      // Console below each window.
      const cx = wx + 20;
      const cy = WINDOW_TOP + WINDOW_H + 40;
      const cw = WINDOW_W - 40;
      ctx.fillStyle = '#2b3139';
      roundRect(ctx, cx, cy, cw, 70, 8);
      ctx.fill();
      ctx.fillStyle = '#3a424d';
      ctx.fillRect(cx + 6, cy + 6, cw - 12, 4);
      // Two small screens.
      for (const sx of [cx + 14, cx + cw - 94]) {
        ctx.fillStyle = '#071a14';
        roundRect(ctx, sx, cy + 16, 80, 42, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,255,170,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= 76; i += 4) {
          const yy = cy + 37 + Math.sin(i * 0.25 + sx) * 9 * rand();
          if (i === 0) ctx.moveTo(sx + 2 + i, yy);
          else ctx.lineTo(sx + 2 + i, yy);
        }
        ctx.stroke();
      }
      // Button grid; colors registered as blinking LEDs.
      const colors = ['#ff4d4d', '#ffd34d', '#4dff88', '#4dc3ff'];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
          const bx = cx + 112 + c * 9;
          const by = cy + 20 + r * 13;
          ctx.fillStyle = '#151a20';
          ctx.fillRect(bx - 3, by - 3, 7, 7);
          leds.push({
            x: bx + 0.5, y: by + 0.5,
            color: colors[Math.floor(rand() * colors.length)],
            period: 30 + Math.floor(rand() * 120),
            phase: Math.floor(rand() * 200),
          });
        }
      }
    }

    // Handrail running along the wall.
    const railY = GROUND - 128;
    ctx.fillStyle = '#7c8794';
    for (let x = 60; x < WORLD_W; x += 240) ctx.fillRect(x, railY - 2, 8, 22);
    ctx.strokeStyle = '#f2b632';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, railY);
    ctx.lineTo(WORLD_W - 20, railY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, railY - 2);
    ctx.lineTo(WORLD_W - 20, railY - 2);
    ctx.stroke();

    // Hazard stripes at the base of the wall.
    const stripeY = GROUND - 22;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, stripeY, WORLD_W, 22);
    ctx.clip();
    ctx.fillStyle = '#1e2329';
    ctx.fillRect(0, stripeY, WORLD_W, 22);
    ctx.fillStyle = '#f2b632';
    for (let x = -30; x < WORLD_W + 30; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, stripeY + 22);
      ctx.lineTo(x + 14, stripeY + 22);
      ctx.lineTo(x + 36, stripeY);
      ctx.lineTo(x + 22, stripeY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Ceiling with recessed light strips.
    const ceil = ctx.createLinearGradient(0, 0, 0, CEILING_H);
    ceil.addColorStop(0, '#5b636e');
    ceil.addColorStop(1, '#8a939e');
    ctx.fillStyle = ceil;
    ctx.fillRect(0, 0, WORLD_W, CEILING_H);
    ctx.fillStyle = '#3d444d';
    ctx.fillRect(0, CEILING_H - 6, WORLD_W, 6);
    for (let x = 80; x < WORLD_W - 100; x += 260) {
      ctx.fillStyle = '#2d333a';
      roundRect(ctx, x - 4, 22, 168, 22, 6);
      ctx.fill();
      lightStrips.push({ x, y: 26, w: 160, h: 14 });
    }
    // Ducts / cable runs.
    ctx.strokeStyle = '#4a525c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(WORLD_W, 10);
    ctx.stroke();

    // Deck placards in the gaps between windows.
    const xs = windowXs();
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i + 1 < xs.length; i++) {
      const px = (xs[i] + WINDOW_W + xs[i + 1]) / 2;
      ctx.fillStyle = '#1f3b73';
      roundRect(ctx, px - 48, CEILING_H + 60, 96, 46, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('USS HOOD', px, CEILING_H + 74);
      ctx.fillStyle = '#9fc3ff';
      ctx.fillText(`DECK 0${i + 2}`, px, CEILING_H + 93);
    }

    // Sealed bulkhead hatches at both ends of the stage.
    for (const hx of [0, WORLD_W - 70]) {
      ctx.fillStyle = '#6b7581';
      ctx.fillRect(hx, CEILING_H, 70, GROUND - CEILING_H);
      ctx.fillStyle = '#4b535d';
      roundRect(ctx, hx + 10, CEILING_H + 40, 50, GROUND - CEILING_H - 70, 16);
      ctx.fill();
      ctx.fillStyle = '#c33';
      ctx.fillRect(hx + 30, CEILING_H + 60, 10, 10);
      ctx.strokeStyle = '#2f353c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx + 35, GROUND - 200, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ambient shading toward the floor.
    const amb = ctx.createLinearGradient(0, GROUND - 120, 0, GROUND);
    amb.addColorStop(0, 'rgba(10,20,40,0)');
    amb.addColorStop(1, 'rgba(10,20,40,0.25)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = amb;
    ctx.fillRect(0, GROUND - 120, WORLD_W, 120);
    ctx.globalCompositeOperation = 'source-over';
    return cv;
  }

  function drawFloor(ctx, camX) {
    const floor = ctx.createLinearGradient(0, GROUND, 0, H);
    floor.addColorStop(0, '#59626d');
    floor.addColorStop(1, '#22272d');
    ctx.fillStyle = floor;
    ctx.fillRect(0, GROUND, W, H - GROUND);

    // Deck plate seams converging toward the center of the screen.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    const step = 90;
    const first = Math.floor(camX / step) * step;
    for (let wx = first - step * 6; wx < camX + W + step * 6; wx += step) {
      const sx = wx - camX;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND);
      ctx.lineTo((sx - W / 2) * 2.6 + W / 2, H);
      ctx.stroke();
    }
    for (const y of [GROUND + 18, GROUND + 42]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Glowing edge strip where wall meets floor.
    ctx.fillStyle = '#7fd8ff';
    ctx.fillRect(0, GROUND, W, 2);
    ctx.fillStyle = 'rgba(127,216,255,0.15)';
    ctx.fillRect(0, GROUND + 2, W, 8);
  }

  function drawLights(ctx, frame) {
    for (const s of lightStrips) {
      const pulse = 0.85 + Math.sin(frame * 0.03 + s.x) * 0.1;
      ctx.fillStyle = `rgba(230,245,255,${pulse})`;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      const g = ctx.createLinearGradient(0, s.y, 0, s.y + 70);
      g.addColorStop(0, `rgba(200,235,255,${0.22 * pulse})`);
      g.addColorStop(1, 'rgba(200,235,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(s.x - 20, s.y + s.h, s.w + 40, 70);
    }
    for (const l of leds) {
      const on = (frame + l.phase) % l.period < l.period * 0.6;
      ctx.fillStyle = on ? l.color : 'rgba(40,40,40,0.9)';
      ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
    }
  }

  return {
    // Draws everything behind the fighters. camX = world x at the screen's left edge.
    drawBackground(ctx, camX, frame) {
      if (!roomCanvas) {
        spaceCanvas = buildSpace();
        roomCanvas = buildRoom();
      }
      ctx.drawImage(spaceCanvas, -Math.round(camX * SPACE_PARALLAX), 0);
      ctx.save();
      ctx.translate(-Math.round(camX), 0);
      ctx.drawImage(roomCanvas, 0, 0);
      drawLights(ctx, frame);
      ctx.restore();
      drawFloor(ctx, camX);
    },
  };
})();
