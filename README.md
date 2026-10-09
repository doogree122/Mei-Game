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

**Force field:** press it to raise your fighter's field for about ¾ of a second. It hums while it's up; you can move and jump inside it but can't attack, and it takes about 1½ seconds to recharge. The meter under each health bar, in the field's color, shows when it's ready. Each fighter's field is different (see **Fighters compared**).

**Uppercut hits** launch the opponent up and back: they fly across the floor, land and skid along it.

### Jetpack flight

**B. FETT** and **MANDO** fly: keep jump held after taking off and the jetpack roars, the flames grow long, and they climb to a hover high enough to pass over the opponent. Forward and back steer: they lean the whole body into the flight, tipped forward as the jetpack propels them ahead (and a little on any forward jump), upright or leaning back when braking or backing off. They turn to face the opponent as they cross over. Flight lasts as long as jump is held, up to 3 seconds per jump; let go (or run out) and they fall. The tank refills on the ground once jump is released. They can still jump-kick in the air. Tuning is `flight` in `src/characters.js` (`frames`, `ceiling`, `climb`, `speed`).

### Hidden moves

Entered as a quick sequence (within about ¾ of a second), where *back* means away from your opponent:

- **VADER, Force choke:** back, back, down, punch. Vader reaches out and holds his hand there while the opponent, anywhere in front of him, is lifted into the air clutching their throat for 3 seconds and loses 4 health; then they drop and he lowers his hand. If it misses, he lowers it right away. It can't be blocked and goes through force fields, but it misses someone who is already down or flying. A punch or kick on the choked fighter breaks the grip.

- **WORF, Bat'leth swing:** back, jump, kick (press kick in the air). Worf leaps toward the opponent, raises his bat'leth over his head and brings it down in a wide arc in front of him for 4 damage, with a heavy whoosh and a ring of steel. It finishes even if he lands during the swing. Stand-block it. The bat'leth (like Worf's hand phaser) is cut from a reference picture by `tools/make_prop.py` into `src/props.js`.

Characters list their hidden moves in `secrets` in `src/characters.js` (directions `b`, `f`, `d`, `u` for jump, then a button). A sequence with a jump in it ends in an air move (`air: true`).

### Fighters compared

**Shot sounds and guns:** B. Fett and Mando fire a classic blaster "pew"; Worf and Seven fire the recorded TNG phaser (`assets/sfx/phaser.mp3`, embedded in the single-file build); Vader's Force lightning crackles and buzzes; his lightsaber swings with a humming swoosh that bends in pitch as the blade passes. Each shot sounds the moment it leaves the gun. Fett's carbine and Mando's blaster pistol are drawn large and outlined, with a muzzle flash, and the bolt leaves from the end of the barrel.

**Health:** each fighter has 120 health, so every hit takes a sixth less of the bar than at the old 100 and matches last about 20% longer. Hidden moves still do their 4 damage.

Every move has a strength from 1 (weak) to 3 (strong). Strength sets damage (×0.75, ×1, ×1.35), knockback and hitstun, and how the hit looks and sounds: weak moves leave a thin, short swish; strong ones a wide glowing arc with an echo, a bigger burst, a longer hit-freeze and more screen shake. Shots are drawn smaller or bigger to match.

| | Punch | Kick | Low kick | Uppercut | Shot | Force field | Movement |
|---|---|---|---|---|---|---|---|
| **WORF** | 2 | 2 | 1 | 3 | Phaser 1 | Blue bubble: stops shots only | Heavy and steady |
| **SEVEN** | 1 | 3 | 2 | 3 | Phaser 2 | Green Borg honeycomb: stops shots only | Fastest, highest jump |
| **VADER** | 1 | 1 | 1 | 3 | Lightning 3 | Force lines: a Force push that throws anyone who comes in close or attacks across the screen; not a hit: no damage, no knockdown, they land on their feet; shots go through | Slowest, low jump |
| **B. FETT** | 1 | 2 | 3 | 1 | Blaster 2 | Purple bubble: stops shots and punches | Jetpack flight (hold jump, up to 3 s) |
| **MANDO** | 2 | 2 | 1 | 3 | Blaster 2 | Brown armor plates: stop shots and kicks | Jetpack flight (hold jump, up to 3 s) |

Punches are the punch, low punch and uppercut; kicks are the kick, sweep (low kick) and jump kick. The CPU raises its field when it would help: against shots, or against a close attack its field stops (Vader against any close attack).

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
On GitHub Pages or any other website, ONLINE uses **room codes** instead (`src/p2p-room.js`): one player picks **Host a game** and gets a four-letter code and a **Copy invite link** button; the other types the code and presses **Join**, or just opens the invite link (`?join=CODE`), picks ONLINE and a fighter, and joins automatically. No account is needed. The two browsers connect directly (WebRTC through PeerJS, loaded from jsDelivr); PeerJS's free public server only introduces them, so it occasionally may be down, and some strict networks (certain school or office Wi-Fi, some mobile carriers) can't make the direct connection.
Opened from disk, the game has no ONLINE option.

### Firebase

`firebase.json` publishes the game folder to Firebase Hosting, and `database.rules.json` holds the database rules
(each signed-in player can write only their own entries). Players sign in anonymously in the background.
The page reads the project's settings from Firebase Hosting itself (`/__/firebase/init.json`), so no keys are in the code.

The project is `wars-v-trek`. One-time setup:

1. In the [Firebase console](https://console.firebase.google.com/): **Build → Realtime Database → Create database** (United States, locked mode; the deploy installs the real rules) and **Build → Authentication → Sign-in method → Anonymous → Enable**.
2. Keyless deploys from GitHub (Workload Identity Federation), run once in Cloud Shell: a pool `github` with an OIDC provider `mei-game` limited to this repository, the Firebase service account granted `roles/iam.workloadIdentityUser` for it, plus `roles/firebase.admin` and `roles/serviceusage.serviceUsageConsumer`.
3. `.github/workflows/firebase-deploy.yml` holds the project, service account and provider (`projects/<project number>/locations/global/workloadIdentityPools/github/providers/mei-game`).

After that, every push to `claude/fighting-game-prototype` deploys automatically, and the site is at `https://wars-v-trek.web.app`.
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
- **DESERT TOWN**, **THE BRIDGE** and **BATTLE STATION**: backdrop pictures in `assets/stages/` (prepared by `tools/prep_stages.py`, which crops, resizes and samples each picture's edge colors). `src/stages.js` lists the levels: each picture is scaled so its doors and chairs match the fighters' size (it fills more than the screen), lined up so the fighters stand on the near part of its floor, and pans from its left edge to its right as the camera crosses the stage, slower than the fighters. On tall phone screens (held upright) the space around the arena is painted to match each level (`src/surrounds.js`), like the USS Hood's hull: the Death Star's hull above BATTLE STATION and its round underside curving away into space below; space above THE BRIDGE and the top of the Enterprise's saucer below, with its round, lit rim; more sky above DESERT TOWN and more of the street below, with domed huts, adobe towers, vaporators, rocks and wheel tracks. On THE BRIDGE the two front chairs and the consoles at the bottom corners are cut out by their color (`assets/stages/bridge-front.png`), painted out of the background picture so nothing of them is left behind, and drawn over the fighters with the same shading as the background, so they walk behind them, and the fighters can go all the way to the doors at either wall.

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
| `src/surrounds.js` | Scenery around the picture levels on tall phone screens |
| `src/exterior.js` | Ship exterior shown above and below the arena on tall (portrait) screens |
| `src/ai.js` | CPU opponent |
| `src/game.js` | Rounds, timer, collisions, projectiles, main loop |
| `src/touch.js` | Phone controls: joystick, buttons, menu taps, fullscreen |
| `src/online.js` | Online play: lobby, host/guest roles, controls and fight snapshots over the room |
| `src/firebase-room.js` | The room on Firebase Hosting, backed by the Realtime Database |
| `src/p2p-room.js` | The room anywhere else: a direct browser-to-browser link found by a room code (PeerJS) |
| `src/music.js` | Music: menu track, alternating fight tracks, start on first input, pause ducking, on/off |
| `src/input.js`, `src/audio.js`, `src/effects.js` | Keyboard, synthesized SFX (plus recorded ones from `assets/sfx/`), particles |
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
| **B. FETT** | Armored jetpack bounty hunter in dark, weathered colors after the live-action armor: olive-green helmet, chest plates and jetpack, a maroon visor frame and gauntlets, ochre shoulder and knee pads, a charcoal flight suit, black gloves and red-brown boots, with a gray antenna and rangefinder. A rifle rides on his back, and for the special he grips a compact olive carbine (scope, muzzle flash) in his fist | Blaster bolt | 1.9× size, baseline stats |
| **WORF** | Painted in code from a reference picture: a Klingon profile head with the ridged forehead crest, deep-set eyes, a beard and a long dark mane; a mustard tunic with black shoulders and side panels, a gold comm badge, a wide black belt and a chain-mail sash; black trousers with a gold stripe and glossy shoes. His hands come from the picture, and to fire he grips a TNG hand phaser cut from a reference picture. Crosses his arms when he wins | Hand-blaster pulse | 2.14× size (taller than Seven and Mando), hits 10% harder, a little slower |
| **VADER** | Black armor, flared helmet with a triangular grille and dark lenses, ribbed collar, chest control box, belt boxes, and a flowing cape. Holds a red lightsaber | Force lightning from his free hand. His punch is a long-reach saber swing | 2.05× size, hits 15% harder, slow |
| **SEVEN** | Painted in code from reference pictures: blue scaled catsuit with gray raglan sleeves and a waist seam, heeled boots, a painted profile head with swept-back blonde hair and the silver Borg implant around her eye, and a Borg fist on her far arm. A gray phaser rifle rests across her shoulders behind her neck and comes down to fire | Big red laser blast. Her kick goes up to head height | 2.0× size, quickest on her feet |

| **MANDO** | Painted entirely in code from a reference picture: a dark brown flight suit, polished steel (beskar) shoulder plates, vambraces, chest and belly plates, thigh and knee plates, a T-visor helmet with an ear cap, a leather belt and bandolier with cartridges, brown boots, black gloves, a steel rocket pack with twin thrusters (they fire while he's in the air), and a forked rifle slung across his back. He draws a large blaster pistol (scope, long barrel, muzzle flash) to fire | Blaster bolt | 2.12× size (as tall as Seven, shorter than Worf), hits 5% harder |

Each character picks a body renderer with `look` (`armored`, `warrior`, `sith`, `agent`), a projectile style with `projectile` (`bolt`, `pulse`, `lightning`, `laser`), and a size with `scale`.
`moves` overrides individual moves (Vader's saber punch, Seven's high kick), `shot` tunes the projectile's speed, size and damage, and `altColors` is the mirror-match palette. `ROSTER` sets the select-screen order.
Scale grows the drawing along with reach, hit areas, blaster height and knockback, so a taller fighter also reaches further. Walk and jump speeds are in `stats`.
