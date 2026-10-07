# Mei Fighter

A browser-based, side-view 2D fighting game. Plain HTML5 Canvas + JavaScript, no build step.

**Play it:** https://doogree122.github.io/Mei-Game/ (public website, no account needed).
For online matches against a friend, use the claude.ai artifact version instead (see **Online** below).

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
| Special (blaster shot) | L | / (or Numpad 3) |
| Force field | H | M (or Numpad 4) |
| Block   | hold away from opponent | same |

Crouch + punch is a low jab and crouch + kick is a sweep (knockdown). Kick or punch in the air is a jump kick.
Low attacks must be blocked crouching, and jump attacks must be blocked standing.
The standing kick is a high kick that lands at chest height.
**Ducking:** crouching makes standing punches and kicks whiff over your head. Low attacks (crouch punch, sweep), jump kicks and blaster shots still hit.

**Force field:** press it to raise an energy bubble for about ¾ of a second. Blaster shots that touch it fizzle out with a zap, but punches and kicks go straight through. It hums while it's up.
You can move and jump inside it but can't attack, and it takes about 1½ seconds to recharge. The meter under each health bar shows when it's ready.

Enter starts the game, P pauses (Esc while paused quits to the menu) and F2 shows hitboxes.

### Phones and tablets

On touch screens, on-screen controls appear: drag anywhere on the left side to move (up = jump, down = crouch/low attacks),
**P** punch, **K** kick, **SP** blaster, **FF** force field, plus pause, menu and fullscreen buttons. Tap the menu to choose a mode.
It works in landscape and portrait. In portrait the screen fills with the ship's exterior around the arena: hull plating above, and below it the girders, belly, engines, a moon and Earth.
2 Players is keyboard-only, so phones don't offer it.
To try the touch UI on a desktop, open `index.html?touch=1`.

**Modes:** 1P vs CPU, 2 players on one keyboard, **Training**, and **Online**. Every mode starts on the **character select** screen.
Pick with A/D and J/Enter (player 2: ←/→ and comma), or tap a fighter on a phone. The CPU or training dummy takes a different fighter.
Picking the same fighter as your opponent is allowed: player 2 gets alternate colors. Training gives you a standing dummy.
It has no timer and no KOs, and health refills between combos. Press Esc to leave.

### Online

When the game runs as a claude.ai artifact, an **ONLINE** option appears on the menu.
Two people open the same page at the same time, and each picks a fighter. One picks **Host a game**;
the other sees that game in the list (with the host's fighter) and joins. Both people need access to the artifact (use its Share menu).
The host's browser runs the fight, and the other player's controls and the fight travel through the artifact's live room about 30 times a second.
Expect a little input delay for the joining player. Esc (or ☰ on phones) leaves the match.
Opened from disk or another website, the game has no ONLINE option.

### Updating the public website

The website is served by GitHub Pages from the `gh-pages` branch, a copy of the game plus an empty `.nojekyll` file.
To publish changes, merge the latest code into `gh-pages` and push:

```sh
git checkout gh-pages && git merge claude/fighting-game-prototype && git push && git checkout -
```

## Music

"Hyperspace Jump" (`assets/music/hyperspace_jump.mp3`, made with Suno) loops in the background. The game tries to start it as soon as the page loads. Most browsers block sound until you interact, so in that case a **start screen** ("PRESS ANY KEY" / "TAP TO START") appears first, and that first press starts the music and opens the menu.
It gets quieter while the game is paused and stops while the tab is hidden. Turn it on or off with the **♪ Music** button under the game, or **♪** on phones; the choice is remembered in that browser.

**Win and lose jingles:** when a round's winner is announced you hear a bright rising arpeggio if you won and a falling minor phrase if you lost.
The round that decides the match gets the full versions instead: a fanfare for the winner, a sad trombone for the loser. The music dips while they play.
"You" is player 1 against the CPU and your own fighter online. With 2 players on one keyboard, the winner's fanfare plays.

## Stage

The fight takes place inside a spaceship. The room is about two screens wide (`WORLD_W`), and the camera follows the fighters,
who can't walk off screen. The view of space through the windows scrolls slower than the room, which gives a sense of depth.

## Project layout

| File | Purpose |
|------|---------|
| `src/characters.js` | Character roster: body style (`look`), palette, projectile type, movement stats. **Edit this to restyle the fighters.** |
| `src/fighter.js` | Move data (frame timings, damage), poses, state machine, physics, hit/block logic |
| `src/render.js` | Drawing: skeleton-based character art turned into pixel sprites, projectiles, HUD |
| `src/stage.js` | Spaceship interior: space view, walls, windows, consoles, floor |
| `src/exterior.js` | Ship exterior shown above and below the arena on tall (portrait) screens |
| `src/ai.js` | CPU opponent |
| `src/game.js` | Rounds, timer, collisions, projectiles, main loop |
| `src/touch.js` | Phone controls: joystick, buttons, menu taps, fullscreen |
| `src/online.js` | Online play: lobby, host/guest roles, controls and fight snapshots over the artifact room |
| `src/music.js` | Background music: start on first input, loop, pause ducking, on/off |
| `src/input.js`, `src/audio.js`, `src/effects.js` | Keyboard, synthesized SFX, particles |
| `tools/build_single.py` | Bundles everything (music included) into one HTML page for the claude.ai artifact |

## Adding sprite art (optional)

Both fighters are original designs drawn in code (see **Art style**). The game can also use hand-made sprite art instead.
A character with an entry in `src/sprites.js` is drawn from that image. Moves are animated by moving the whole sprite: leaning and lunging into attacks, squashing to crouch, recoiling, and falling flat when knocked down.

`tools/prep_sprites.py` prepares the art. It cuts each image out of its background, trims it, turns it to face right, and resamples it to the game's art-pixel grid.
It then writes `src/sprites.js`, with the images embedded so the game still works when opened from disk:

```sh
python3 tools/prep_sprites.py <character1.png> <character2.jpg> .
```

Then add `<script src="src/sprites.js"></script>` to `index.html` before `src/touch.js`. Only use art you have the rights to.

## Art style

The stage and effects are drawn at low resolution and scaled up without smoothing, so one art pixel is 2.5×2.5 screen pixels.
Fighters use a finer grid (1 art pixel = 1.5 screen pixels, `FIGHTER_PIXEL`) so their detail survives.
Each frame they're drawn from their skeleton, then given hard edges and a 1-pixel dark outline so they look like pixel-art sprites.

## Characters

| | Look | Special | Stats |
|---|---|---|---|
| **B. FETT** | Armored jetpack bounty hunter. Green helmet with a flat face, a T-shaped dark visor with dark-red trim, dark-green cheek plates, gray dents, an ear cap and a gray antenna. Green chest plates, gauntlets and shin plates. Yellow shoulder pad, wrist bands and shaped knee plates. Gray flight suit, light-gray gloves and black boots. Brown ammo belt, chest strap and thigh pouch. Green jetpack with a slim rocket, a rifle on the back, and a black carbine for the special | Blaster bolt | 1.9× size, baseline stats |
| **WORF** | Alien warrior. Ridged forehead crest with a central ridge, deep-set eyes, shoulder-length brown hair, a full textured beard. Mustard tunic with black yoke and waistband, a chain-mail sash with diamond links and two ringed clasps, black trousers and polished boots. Crosses his arms when he wins | Hand-blaster pulse | 2.0× size (the taller), hits 10% harder, a little slower |
| **VADER** | Black armor, flared helmet with a triangular grille and dark lenses, ribbed collar, chest control box, belt boxes, and a flowing cape. Holds a red lightsaber | Force lightning from his free hand. His punch is a long-reach saber swing | 2.05× size, hits 15% harder, slow |
| **SEVEN** | Blue catsuit with magenta and cyan edge lighting, short swept-back hair, a silver implant at the brow, heeled boots, and a gray phaser rifle resting on her shoulder, brought down two-handed to fire | Big red laser blast. Her kick goes up to head height | 1.85× size, quickest on her feet |

Each character picks a body renderer with `look` (`armored`, `warrior`, `sith`, `agent`), a projectile style with `projectile` (`bolt`, `pulse`, `lightning`, `laser`), and a size with `scale`.
`moves` overrides individual moves (Vader's saber punch, Seven's high kick), `shot` tunes the projectile's speed, size and damage, and `altColors` is the mirror-match palette. `ROSTER` sets the select-screen order.
Scale grows the drawing along with reach, hit areas, blaster height and knockback, so a taller fighter also reaches further. Walk and jump speeds are in `stats`.
