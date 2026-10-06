# Mei Fighter

A browser-based, side-view 2D fighting game. Plain HTML5 Canvas + JavaScript, no build step.

## Run it

Open `index.html` in a browser, or serve the folder:

```sh
npx serve .
```

## Controls

| Action  | Player 1 | Player 2 |
|---------|----------|----------|
| Move    | A / D    | ← / →    |
| Jump    | W        | ↑        |
| Crouch  | S        | ↓        |
| Punch   | J        | , (or Numpad 1) |
| Kick    | K        | . (or Numpad 2) |
| Special (energy ball) | L | / (or Numpad 3) |
| Block   | hold away from opponent | same |

Crouch + punch is a low jab and crouch + kick is a sweep (knockdown). Kick or punch in the air is a jump kick.
Low attacks must be blocked crouching, and jump attacks must be blocked standing.

Enter starts the game, P pauses and F2 shows hitboxes.

**Modes:** 1P vs CPU, 2 players on one keyboard, and **Training**. Training puts Mei on the stage with a standing dummy.
It has no timer and no KOs, and health refills between combos. Press Esc to leave.

## Stage

The fight takes place inside a spaceship. The room is about two screens wide (`WORLD_W`), and the camera follows the fighters,
who can't walk off screen. The view of space through the windows scrolls slower than the room, which gives a sense of depth.

## Project layout

| File | Purpose |
|------|---------|
| `src/characters.js` | Character roster: colors, hair style, movement stats. **Edit this to restyle Mei.** |
| `src/fighter.js` | Move data (frame timings, damage), poses, state machine, physics, hit/block logic |
| `src/render.js` | Drawing: skeleton-based character art, HUD |
| `src/stage.js` | Spaceship interior: space view, walls, windows, consoles, floor |
| `src/ai.js` | CPU opponent |
| `src/game.js` | Rounds, timer, collisions, projectiles, main loop |
| `src/input.js`, `src/audio.js`, `src/effects.js` | Keyboard, synthesized SFX, particles |

Characters are drawn from a pose skeleton (limb angles), and hitboxes come from the actual limb positions.
That makes new moves cheap to add: you add a pose plus an entry in `MOVES`.
To use hand-drawn sprite sheets later, replace `drawFighter` in `render.js` and keep the rest.
