# Wars vs. Trek

A browser-based, side-view 2D fighting game. Plain HTML5 Canvas + JavaScript, no build step.

**Play it:** on Firebase Hosting, with online play (see **Firebase** below), or at https://doogree122.github.io/Mei-Game/ (no online play there).
No account is needed on either site.

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
**Uppercut:** crouch, then press punch just as you stand back up (within about ⅙ of a second of letting go of crouch). It hits crouching opponents too and launches them into a knockdown. Vader's is a rising saber slash.
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

On the Firebase site, or when the game runs as a claude.ai artifact, an **ONLINE** option appears on the menu.
Two people open the same page at the same time, and each picks a fighter. One picks **Host a game**;
the other sees that game in the list (with the host's fighter) and joins. Several matches can run at once.
The host's browser runs the fight, and the other player's controls and the fight travel about 30 times a second:
through the Firebase Realtime Database on the Firebase site (`src/firebase-room.js`), or through the artifact's live room on claude.ai (both people need access to the artifact; use its Share menu).
Expect a little input delay for the joining player. Esc (or ☰ on phones) leaves the match.
Opened from disk, GitHub Pages or another website, the game has no ONLINE option.

### Firebase

`firebase.json` publishes the game folder to Firebase Hosting, and `database.rules.json` holds the database rules
(each signed-in player can write only their own entries). Players sign in anonymously in the background.
The page reads the project's settings from Firebase Hosting itself (`/__/firebase/init.json`), so no keys are in the code.

One-time setup in the [Firebase console](https://console.firebase.google.com/):

1. Create a project.
2. **Build → Realtime Database → Create database**, location **United States (us-central1)**, start in locked mode (the deploy installs the real rules).
3. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**.
4. **Project settings → Service accounts → Generate new private key** (downloads a JSON file).
5. In this GitHub repository, **Settings → Secrets and variables → Actions**: add the secret `FIREBASE_SERVICE_ACCOUNT` (paste the whole JSON file) and, under **Variables**, `FIREBASE_PROJECT_ID` (the project ID).

After that, every push to `claude/fighting-game-prototype` deploys automatically (`.github/workflows/firebase-deploy.yml`), and the site is at `https://<project-id>.web.app`.
To deploy by hand instead: `npx firebase-tools login` then `npx firebase-tools deploy --project <project-id>`.

### Updating the public website

The website is served by GitHub Pages from the `gh-pages` branch, a copy of the game plus an empty `.nojekyll` file.
To publish changes, merge the latest code into `gh-pages` and push:

```sh
git checkout gh-pages && git merge claude/fighting-game-prototype && git push && git checkout -
```

## Music

Three tracks, all made with Suno, in `assets/music/` (MP3, 64 kbps stereo at 32 kHz to keep downloads small; about 1.3 MB each):

- **"Hyperspace Jump"** loops on the start screen, title, character select and online lobby.
- **"Arcade March"** and **"Arcade March 2"** play during fights, taking turns. Each new round starts the other song from the top, and a round that outlasts one song rolls on into the other.

Going back to the menus resumes "Hyperspace Jump" where it left off.

The game tries to start the music as soon as the page loads. Most browsers block sound until you interact, so in that case a **start screen** ("PRESS ANY KEY" / "TAP TO START") appears first, and that first press starts the music and opens the menu.
The music gets quieter while the game is paused and stops while the tab is hidden. Turn it on or off with the **♪ Music** button under the game, or **♪** on phones; the choice is remembered in that browser.

**Win and lose jingles:** when a round's winner is announced you hear a bright rising arpeggio if you won and a falling minor phrase if you lost.
The round that decides the match gets the full versions instead: a fanfare for the winner, a sad trombone for the loser. The music stops while they play: the next round starts a fresh fight song, and after the match it stays quiet until you return to the menu.
"You" is player 1 against the CPU and your own fighter online. With 2 players on one keyboard, the winner's fanfare plays.

## Levels

After character select, **CHOOSE THE ARENA** picks the level (A/D or ←/→ and J/Enter, or tap); the background previews the one under the cursor. Online matches get a random level from the host's game, and the joining player sees the same one.

- **USS HOOD**: the drawn spaceship room described below.
- **DESERT TOWN**, **THE BRIDGE** and **BATTLE STATION**: backdrop pictures in `assets/stages/` (prepared by `tools/prep_stages.py`, which crops, resizes and samples each picture's edge colors). `src/stages.js` lists the levels: each picture is scaled to a set height, lined up so its floor row sits under the fighters' feet, and pans from its left edge to its right as the camera crosses the stage, slower than the fighters. On tall phone screens the space around the arena takes the picture's sky and floor colors.

## The USS Hood

The fight takes place inside a spaceship. The room is about two screens wide (`WORLD_W`), and the camera follows the fighters,
who can't walk off screen. The view of space through the windows scrolls slower than the room, which gives a sense of depth.

## Project layout

| File | Purpose |
|------|---------|
| `src/characters.js` | Character roster: body style (`look`), palette, projectile type, movement stats. **Edit this to restyle the fighters.** |
| `src/fighter.js` | Move data (frame timings, damage), poses, state machine, physics, hit/block logic |
| `src/render.js` | Drawing: skeleton-based character art turned into pixel sprites, projectiles, HUD |
| `src/stage.js` | Spaceship interior: space view, walls, windows, consoles, floor |
| `src/stages.js` | The level list, backdrop pictures, the arena thumbnails |
| `src/exterior.js` | Ship exterior shown above and below the arena on tall (portrait) screens |
| `src/ai.js` | CPU opponent |
| `src/game.js` | Rounds, timer, collisions, projectiles, main loop |
| `src/touch.js` | Phone controls: joystick, buttons, menu taps, fullscreen |
| `src/online.js` | Online play: lobby, host/guest roles, controls and fight snapshots over the room |
| `src/firebase-room.js` | The room on Firebase Hosting, backed by the Realtime Database |
| `src/music.js` | Music: menu track, alternating fight tracks, start on first input, pause ducking, on/off |
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

The game is laid out on a 960×540 arena, but the canvas renders at the display's real resolution (`RES`, up to 2 screen pixels per game pixel), so text, the stage and effects are sharp on high-density screens.
The room and starfields are baked once at 2× (`BAKE`).

Drawn fighters (B. FETT, WORF, VADER) are rendered from their skeleton on a scratch canvas, then given hard edges and a 1-pixel dark outline so they look like pixel-art sprites.
Their grid follows the display but stops at 0.75 game pixels (`MIN_FIGHTER_PIXEL`) to keep that per-pixel pass quick on phones.

**Painted fighters** (WORF, SEVEN and MANDO, `look: 'painted'`, `src/painted.js`) are drawn at full resolution as smooth shaded shapes, one per limb with rounded joints so the body reads as one figure in any pose.
Each shape gets a light-to-shadow gradient and the real fabric grain from a reference picture (the suit's scales, the sleeve knit) laid over it; the torso has the gray raglan shoulders and the waist seam, a thin neckline sits at the base of the neck, and the boots are heeled.
Her head is painted in profile too (`paintFace`): skin shaded from the front with a jaw shadow and cheek light, an ear, an eye with lashes, brow and lips, the silver Borg implant curling around the eye, and swept-back blonde hair with fine strands; its colors come from a front-on photo of her (`paint.face`).
The fists come from a reference picture (`tools/make_painted_assets.py` cuts them with soft edges into `src/painted-<id>.js`, along with a photo head used when a character has no `face` block) and are pinned to the wrists. The character's `paint` block sets the colors, limb widths, torso outline and sizes; `armor` wraps plates or boots over part of a limb, `backWeapon` slings a staff across the back, and a character with no picture file is painted entirely in code (gloved fists, a helmet).

**Cut-out fighters** (`look: 'cutout'`, not used by anyone right now) are built from a picture. `tools/make_cutout.py` removes the background and cuts the figure into head, torso, upper arm, forearm, thigh and shin.
Each part's outline is shaved of any backdrop fringe and lightly softened, and its edge at its joint (neck, shoulder, elbow, hip, knee) is feathered so it blends into the part beneath; edges that another part covers stay solid, so bending joints don't open see-through gaps.
The game pins each part to its bone every frame (the near arm and leg serve for both sides, the far ones drawn darker) and draws them straight onto the canvas at full resolution.
The best pictures are a side view facing right, full body on a plain background, with the arms and legs clear of the body.
`src/cutout-<id>.js` holds the parts; `fallbackLook` is the drawn style used until they load.

## Characters

| | Look | Special | Stats |
|---|---|---|---|
| **B. FETT** | Armored jetpack bounty hunter. Green helmet with a flat face, a T-shaped dark visor with dark-red trim, dark-green cheek plates, gray dents, an ear cap and a gray antenna. Green chest plates, gauntlets and shin plates. Yellow shoulder pad, wrist bands and shaped knee plates. Gray flight suit, light-gray gloves and black boots. Brown ammo belt, chest strap and thigh pouch. Green jetpack with a slim rocket, a rifle on the back, and a black carbine for the special | Blaster bolt | 1.9× size, baseline stats |
| **WORF** | Painted in code from a reference picture: a Klingon profile head with the ridged forehead crest, deep-set eyes, a beard and a long dark mane; a mustard tunic with black shoulders and side panels, a gold comm badge, a wide black belt and a chain-mail sash; black trousers with a gold stripe and glossy shoes. His hands come from the picture, and he holds the picture's phaser to fire. Crosses his arms when he wins | Hand-blaster pulse | 2.0× size (the taller), hits 10% harder, a little slower |
| **VADER** | Black armor, flared helmet with a triangular grille and dark lenses, ribbed collar, chest control box, belt boxes, and a flowing cape. Holds a red lightsaber | Force lightning from his free hand. His punch is a long-reach saber swing | 2.05× size, hits 15% harder, slow |
| **SEVEN** | Painted in code from reference pictures: blue scaled catsuit with gray raglan sleeves and a waist seam, heeled boots, a painted profile head with swept-back blonde hair and the silver Borg implant around her eye, and a Borg fist on her far arm. A gray phaser rifle rests across her shoulders behind her neck and comes down to fire | Big red laser blast. Her kick goes up to head height | 2.0× size, quickest on her feet |

| **MANDO** | Painted entirely in code from a reference picture: a dark brown flight suit, polished steel (beskar) shoulder plates, vambraces, chest and belly plates, thigh and knee plates, a T-visor helmet with an ear cap, a leather belt and bandolier with cartridges, brown boots, black gloves, a steel rocket pack with twin thrusters (they fire while he's in the air), and a forked rifle slung across his back. He draws a blaster pistol to fire | Blaster bolt | 1.95× size, hits 5% harder |

Each character picks a body renderer with `look` (`armored`, `warrior`, `sith`, `agent`), a projectile style with `projectile` (`bolt`, `pulse`, `lightning`, `laser`), and a size with `scale`.
`moves` overrides individual moves (Vader's saber punch, Seven's high kick), `shot` tunes the projectile's speed, size and damage, and `altColors` is the mirror-match palette. `ROSTER` sets the select-screen order.
Scale grows the drawing along with reach, hit areas, blaster height and knockback, so a taller fighter also reaches further. Walk and jump speeds are in `stats`.
