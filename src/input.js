// Keyboard handling plus controllers that produce a uniform per-frame input
// shape for fighters: { left, right, up, down, pressed: { up, punch, kick, special } }.

const Keys = {
  down: new Set(),
  pressedThisFrame: new Set(),
};

const BLOCKED_DEFAULTS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Slash', 'Quote', 'F2',
]);

window.addEventListener('keydown', (e) => {
  if (BLOCKED_DEFAULTS.has(e.code)) e.preventDefault();
  if (!Keys.down.has(e.code)) Keys.pressedThisFrame.add(e.code);
  Keys.down.add(e.code);
});
window.addEventListener('keyup', (e) => Keys.down.delete(e.code));
window.addEventListener('blur', () => Keys.down.clear());

// On-screen controls press keys through these, so everything downstream
// (menus, fighters) treats touch exactly like the keyboard.
function virtualKeyDown(code) {
  if (!Keys.down.has(code)) Keys.pressedThisFrame.add(code);
  Keys.down.add(code);
}

function virtualKeyUp(code) {
  Keys.down.delete(code);
}

// Call once at the end of every simulation frame.
function endInputFrame() {
  Keys.pressedThisFrame.clear();
}

function keyPressed(code) {
  return Keys.pressedThisFrame.has(code);
}

const KEYMAPS = {
  p1: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    punch: ['KeyJ'], kick: ['KeyK'], special: ['KeyL'],
  },
  p2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    punch: ['Comma', 'Numpad1'], kick: ['Period', 'Numpad2'], special: ['Slash', 'Numpad3'],
  },
};

class KeyboardController {
  constructor(map) {
    this.map = map;
  }

  read() {
    const held = (name) => this.map[name].some((c) => Keys.down.has(c));
    const pressed = (name) => this.map[name].some((c) => Keys.pressedThisFrame.has(c));
    return {
      left: held('left'),
      right: held('right'),
      up: held('up'),
      down: held('down'),
      pressed: {
        up: pressed('up'),
        punch: pressed('punch'),
        kick: pressed('kick'),
        special: pressed('special'),
      },
    };
  }
}

function emptyInput() {
  return {
    left: false, right: false, up: false, down: false,
    pressed: { up: false, punch: false, kick: false, special: false },
  };
}
