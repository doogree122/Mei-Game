// Phone / tablet controls: a floating joystick on the left, attack buttons on
// the right, and taps on the canvas for menus. Shown on touch screens, or on any
// device with ?touch=1 in the URL.

const TOUCH_ENABLED = window.matchMedia('(pointer: coarse)').matches
  || new URLSearchParams(location.search).has('touch');

// Keep receiving a pointer's events after it slides off the element.
function capturePointer(el, e) {
  try {
    el.setPointerCapture(e.pointerId);
  } catch (err) {
    // Synthetic or already-released pointers can't be captured; harmless.
  }
}

function setupTouchControls(game, canvas) {
  if (!TOUCH_ENABLED) return;
  document.body.classList.add('touch');
  document.getElementById('touch').hidden = false;

  // Unlock audio on the first touch (mobile browsers require a gesture).
  window.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });

  // ---- Joystick: drag anywhere in the left zone; the stick appears under the thumb.
  const zone = document.getElementById('stick-zone');
  const base = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');
  const DIRS = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' };
  const MAX = 46;
  let stickId = null;
  let origin = null;
  const held = new Set();

  function setDirs(dx, dy) {
    const want = new Set();
    if (dx > 16) want.add('right');
    if (dx < -16) want.add('left');
    if (dy < -28) want.add('up');
    if (dy > 20) want.add('down');
    for (const d of Object.keys(DIRS)) {
      if (want.has(d) && !held.has(d)) virtualKeyDown(DIRS[d]);
      if (!want.has(d) && held.has(d)) virtualKeyUp(DIRS[d]);
    }
    held.clear();
    for (const d of want) held.add(d);
  }

  zone.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    capturePointer(zone, e);
    const r = zone.getBoundingClientRect();
    origin = { x: e.clientX, y: e.clientY };
    base.style.left = `${e.clientX - r.left}px`;
    base.style.top = `${e.clientY - r.top}px`;
    base.classList.add('active');
    knob.style.transform = 'translate(-50%, -50%)';
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - origin.x;
    let dy = e.clientY - origin.y;
    setDirs(dx, dy);
    const len = Math.hypot(dx, dy);
    if (len > MAX) {
      dx *= MAX / len;
      dy *= MAX / len;
    }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    setDirs(0, 0);
    base.classList.remove('active');
  };
  zone.addEventListener('pointerup', endStick);
  zone.addEventListener('pointercancel', endStick);

  // ---- Buttons: each holds its key while pressed.
  for (const btn of document.querySelectorAll('#touch [data-key]')) {
    const code = btn.dataset.key;
    const release = () => {
      btn.classList.remove('down');
      virtualKeyUp(code);
    };
    btn.addEventListener('pointerdown', (e) => {
      capturePointer(btn, e);
      btn.classList.add('down');
      virtualKeyDown(code);
      e.preventDefault();
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---- Fullscreen (where the browser supports it; iPhone Safari does not).
  const fs = document.getElementById('fullscreen');
  if (document.documentElement.requestFullscreen) {
    fs.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else {
          await document.documentElement.requestFullscreen();
          await screen.orientation?.lock?.('landscape');
        }
      } catch (err) {
        // Orientation lock is optional; ignore browsers that refuse it.
      }
    });
  } else {
    fs.hidden = true;
  }

  // ---- Taps on the canvas drive menus.
  canvas.addEventListener('pointerdown', (e) => {
    const p = game.screenToArena(e.clientX, e.clientY);
    game.onTap(p.x, p.y);
  });

  // Stop page scrolling / zooming gestures.
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault());
}
