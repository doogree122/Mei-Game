// Game flow: title -> round intro -> fight -> round end -> match end.

const ROUND_TIME = 99;
const WINS_NEEDED = 2;
const STEP = 1000 / 60;
const SCREEN_MARGIN = 60; // fighters can't walk past the screen edges
const MENU = [
  { label: '1 PLAYER  vs  CPU', kind: 'cpu' },
  { label: '2 PLAYERS', kind: 'versus', keyboardOnly: true },
  { label: 'TRAINING', kind: 'training' },
  { label: 'ONLINE', kind: 'lobby', needsRoom: true },
];
const MENU_TOP = 250;
const MENU_STEP = 48;
// Character select cards.
const CARD_GAP = 18;
// As wide as fits the roster, up to 200.
const CARD_W = Math.min(200, (W - 40 - (ROSTER.length - 1) * CARD_GAP) / ROSTER.length);
const CARD_TOP = 104;
const CARD_H = 330;
const CARD_X0 = (W - (ROSTER.length * CARD_W + (ROSTER.length - 1) * CARD_GAP)) / 2;
// Level select thumbnails (16:9), in a row.
const STAGE_GAP = 22;
const STAGE_TW = Math.min(240, (W - 60 - (STAGES.length - 1) * STAGE_GAP) / STAGES.length);
const STAGE_TH = Math.round(STAGE_TW * 9 / 16);
const STAGE_TOP = 190;
const STAGE_X0 = (W - (STAGES.length * STAGE_TW + (STAGES.length - 1) * STAGE_GAP)) / 2;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // The stage and effects render into buffers at screen resolution (sized in layout()).
    this.buffer = document.createElement('canvas');
    this.bctx = this.buffer.getContext('2d');
    this.fxBuffer = document.createElement('canvas');
    this.fxctx = this.fxBuffer.getContext('2d');
    this.res = 0;
    this.maxRes = 2; // lowered by watchDrawTime on devices that can't keep up
    this.drawTime = 0;
    this.slowFrames = 0;
    // Tall screens (a phone held upright) show the ship's exterior around the
    // arena; viewH is the canvas height and viewOY the arena's top edge.
    this.viewH = H;
    this.viewOY = 0;
    this.extBuffer = document.createElement('canvas');
    this.extctx = this.extBuffer.getContext('2d');
    this.effects = new Effects();
    this.projectiles = [];
    this.setFighters('fett', 'worf');
    // One idle model per roster entry for the select screen.
    this.previews = ROSTER.map((id) => new Fighter({ char: CHARACTERS[id], x: 0, facing: 1, side: 0 }));
    this.lobbyChar = 'fett'; // the fighter this player brings online
    this.stage = 'hood'; // the level (src/stages.js)
    this.controllers = [new KeyboardController(KEYMAPS.p1), new AIController(0.5)];
    // 'splash' waits for the first tap or key press, which browsers require
    // before any sound can play; it's skipped when the music autoplays.
    this.mode = 'splash';
    this.touch = TOUCH_ENABLED;
    this.online = null; // 'host' | 'guest' during an online match
    this.menuIndex = 0;
    this.refreshMenu();
    this.showBoxes = false;
    this.frame = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.training = false;
    this.camX = (WORLD_W - W) / 2;
  }

  // Build the two fighters. Picking the same character twice gives player 2
  // the alternate colors.
  setFighters(id1, id2) {
    const c1 = CHARACTERS[id1] || CHARACTERS.fett;
    let c2 = CHARACTERS[id2] || CHARACTERS.worf;
    if (c2.id === c1.id) c2 = altVersion(c2);
    this.fighters = [
      new Fighter({ char: c1, x: WORLD_W / 2 - 230, facing: 1, side: 0 }),
      new Fighter({ char: c2, x: WORLD_W / 2 + 230, facing: -1, side: 1 }),
    ];
  }

  // ---- character select ----

  beginSelect(kind) {
    this.mode = 'select';
    this.select = {
      kind,
      twoPlayer: kind === 'versus',
      cursor: [0, 1],
      locked: [false, false],
      timer: 0,
      phase: 'fighters', // then 'stage': choose the level
      stageCursor: Math.max(0, STAGES.findIndex((s) => s.id === this.stage)),
      stageLocked: false,
    };
    for (const p of this.previews) p.won = false;
  }

  updateSelect() {
    const sel = this.select;
    const n = ROSTER.length;
    if (keyPressed('Escape')) {
      this.mode = 'title';
      return;
    }
    if (sel.phase === 'stage') return this.updateStageSelect();
    const move = (i, left, right) => {
      if (sel.locked[i]) return;
      if (left.some(keyPressed)) sel.cursor[i] = (sel.cursor[i] + n - 1) % n;
      if (right.some(keyPressed)) sel.cursor[i] = (sel.cursor[i] + 1) % n;
    };
    const lock = (i) => {
      if (sel.locked[i]) return;
      sel.locked[i] = true;
      this.previews[sel.cursor[i]].won = true;
      Sfx.announce();
    };
    if (sel.twoPlayer) {
      move(0, ['KeyA'], ['KeyD']);
      move(1, ['ArrowLeft'], ['ArrowRight']);
      if (['KeyJ', 'Enter', 'Space'].some(keyPressed)) lock(0);
      if (['Comma', 'Period', 'Numpad1'].some(keyPressed)) lock(1);
    } else {
      move(0, ['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      if (['KeyJ', 'Enter', 'Space'].some(keyPressed)) lock(0);
      // The CPU or training dummy takes a different fighter at random.
      if (sel.locked[0] && !sel.locked[1]) {
        const others = ROSTER.map((_, i) => i).filter((i) => i !== sel.cursor[0]);
        sel.cursor[1] = others[Math.floor(Math.random() * others.length)];
        sel.locked[1] = true;
      }
    }
    for (const p of this.previews) {
      p.time++;
      p.updatePose();
    }
    // Both picked: a short beat, then fight.
    if (sel.locked[0] && sel.locked[1] && ++sel.timer > 45) {
      const [a, b] = sel.cursor.map((i) => ROSTER[i]);
      if (sel.kind === 'lobby') {
        this.lobbyChar = a;
        this.setFighters(a, 'worf');
        this.showLobby();
      } else {
        this.setFighters(a, b);
        sel.phase = 'stage';
        sel.timer = 0;
      }
    }
  }

  // Level select: either player moves the cursor and picks; the background
  // shows the level under the cursor.
  updateStageSelect() {
    const sel = this.select;
    const n = STAGES.length;
    for (const p of this.previews) {
      p.time++;
      p.updatePose();
    }
    if (!sel.stageLocked) {
      if (['KeyA', 'ArrowLeft'].some(keyPressed)) sel.stageCursor = (sel.stageCursor + n - 1) % n;
      if (['KeyD', 'ArrowRight'].some(keyPressed)) sel.stageCursor = (sel.stageCursor + 1) % n;
      this.stage = STAGES[sel.stageCursor].id;
      if (['KeyJ', 'Enter', 'Space', 'Comma', 'Numpad1'].some(keyPressed)) {
        sel.stageLocked = true;
        Sfx.announce();
      }
    } else if (++sel.timer > 30) {
      this.startMatch(sel.kind);
    }
  }

  // Which level thumbnail is under an arena point, or -1.
  stageAt(x, y) {
    if (y < STAGE_TOP || y > STAGE_TOP + STAGE_TH) return -1;
    const i = Math.floor((x - STAGE_X0) / (STAGE_TW + STAGE_GAP));
    const inThumb = x - STAGE_X0 - i * (STAGE_TW + STAGE_GAP) <= STAGE_TW;
    return i >= 0 && i < STAGES.length && inThumb ? i : -1;
  }

  drawStageSelect() {
    const ctx = this.ctx;
    const sel = this.select;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 44px system-ui, sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1a0b22';
    ctx.strokeText('CHOOSE THE ARENA', W / 2, 58);
    ctx.fillStyle = '#ffd34d';
    ctx.fillText('CHOOSE THE ARENA', W / 2, 58);
    STAGES.forEach((def, i) => {
      const x = STAGE_X0 + i * (STAGE_TW + STAGE_GAP);
      const on = sel.stageCursor === i;
      ctx.fillStyle = 'rgba(12,16,32,0.85)';
      ctx.beginPath();
      ctx.roundRect(x - 6, STAGE_TOP - 6, STAGE_TW + 12, STAGE_TH + 46, 14);
      ctx.fill();
      drawStageThumb(ctx, def.id, x, STAGE_TOP, STAGE_TW, STAGE_TH, this.frame);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = on ? '#ffd34d' : '#fff';
      ctx.fillText(def.name, x + STAGE_TW / 2, STAGE_TOP + STAGE_TH + 20);
      if (on) {
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = sel.stageLocked ? 6 : 3;
        ctx.setLineDash(sel.stageLocked ? [] : [10, 6]);
        ctx.beginPath();
        ctx.roundRect(x - 6, STAGE_TOP - 6, STAGE_TW + 12, STAGE_TH + 46, 14);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    if (Math.floor(this.frame / 30) % 2 === 0 || sel.stageLocked) {
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      const hint = sel.stageLocked ? 'GET READY!' : this.touch ? 'Tap an arena' : 'A/D or ←/→ to choose · J or ENTER to pick · Esc back';
      ctx.fillText(hint, W / 2, STAGE_TOP + STAGE_TH + 80);
    }
  }

  // Which select card (index) is under an arena point, or -1.
  cardAt(x, y) {
    if (y < CARD_TOP || y > CARD_TOP + CARD_H + 40) return -1;
    const i = Math.floor((x - CARD_X0) / (CARD_W + CARD_GAP));
    const inCard = x - CARD_X0 - i * (CARD_W + CARD_GAP) <= CARD_W;
    return i >= 0 && i < ROSTER.length && inCard ? i : -1;
  }

  drawSelect() {
    if (this.select.phase === 'stage') return this.drawStageSelect();
    const ctx = this.ctx;
    const sel = this.select;
    ctx.fillStyle = 'rgba(8,10,24,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 44px system-ui, sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1a0b22';
    ctx.strokeText('CHOOSE YOUR FIGHTER', W / 2, 58);
    ctx.fillStyle = '#ffd34d';
    ctx.fillText('CHOOSE YOUR FIGHTER', W / 2, 58);

    ROSTER.forEach((id, i) => {
      const x = CARD_X0 + i * (CARD_W + CARD_GAP);
      const p1 = sel.cursor[0] === i;
      const p2 = sel.twoPlayer ? sel.cursor[1] === i : sel.locked[1] && sel.cursor[1] === i;
      ctx.fillStyle = 'rgba(12,16,32,0.82)';
      ctx.beginPath();
      ctx.roundRect(x, CARD_TOP, CARD_W, CARD_H, 12);
      ctx.fill();
      // Preview model standing in the card.
      const f = this.previews[i];
      const s = 0.82 * (CARD_W / 200);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, CARD_TOP, CARD_W, CARD_H, 12);
      ctx.clip();
      ctx.translate(x + CARD_W / 2, CARD_TOP + CARD_H - 34);
      ctx.scale(s, s);
      ctx.translate(0, -GROUND);
      drawFighter(ctx, f);
      ctx.restore();
      // Name and what they bring.
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(f.char.name, x + CARD_W / 2, CARD_TOP + CARD_H - 30);
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(f.char.blurb, x + CARD_W / 2, CARD_TOP + CARD_H - 10);
      // Player cursors: P1 gold, P2/CPU cyan; solid once locked in.
      const frames = [];
      if (p1) frames.push(['P1', '#ffd34d', sel.locked[0], 0]);
      if (p2) frames.push([sel.twoPlayer ? 'P2' : (sel.kind === 'training' ? 'DUMMY' : 'CPU'), '#5fd8ff', sel.locked[1], 1]);
      frames.forEach(([label, color, locked, k]) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = locked ? 6 : 3;
        ctx.setLineDash(locked ? [] : [10, 6]);
        ctx.beginPath();
        ctx.roundRect(x + k * 6 - 3, CARD_TOP + k * 6 - 3, CARD_W - k * 12 + 6, CARD_H - k * 12 + 6, 14);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(label, x + (k ? CARD_W - 30 : 30), CARD_TOP + 22);
      });
    });

    if (Math.floor(this.frame / 30) % 2 === 0 || sel.locked[0]) {
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      const hint = sel.locked[0] && sel.locked[1] ? 'GET READY!'
        : this.touch ? 'Tap a fighter'
          : sel.twoPlayer ? 'P1: A/D, J to pick  ·  P2: ←/→, comma to pick' : 'A/D to choose · J or ENTER to pick · Esc back';
      ctx.fillText(hint, W / 2, CARD_TOP + CARD_H + 36);
    }
  }

  // Two players need two keyboards' worth of keys, so phones don't offer it;
  // ONLINE appears once the page can reach the room.
  refreshMenu() {
    this.menu = MENU.filter((m) => !(this.touch && m.keyboardOnly) && !(m.needsRoom && !Online.room));
    this.menuIndex = Math.min(this.menuIndex, this.menu.length - 1);
  }

  // ---- match flow ----

  showLobby() {
    this.mode = 'lobby';
    this.online = null;
    renderLobby(this);
  }

  // Guest: the host's snapshots drive everything from here.
  beginGuest() {
    this.online = 'guest';
    this.training = false;
    for (const f of this.fighters) {
      f.wins = 0;
      f.reset();
    }
    this.projectiles = [];
    this.effects = new Effects();
    this.mode = 'intro';
    this.updateCamera(true);
  }

  startMatch(kind) {
    if (kind === 'lobby') return this.showLobby();
    this.training = kind === 'training';
    this.online = kind === 'online' ? 'host' : null;
    // Online matches skip the level select: the host's game picks one.
    if (kind === 'online') this.stage = STAGES[Math.floor(Math.random() * STAGES.length)].id;
    this.controllers[1] = kind === 'versus' ? new KeyboardController(KEYMAPS.p2)
      : kind === 'training' ? new DummyController()
        : kind === 'online' ? new RemoteController()
          : new AIController(0.5);
    for (const f of this.fighters) f.wins = 0;
    this.round = 1;
    this.startRound();
    if (this.training) {
      this.timer = Infinity;
      this.mode = 'fight';
    }
  }

  startRound() {
    Music.newRound();
    for (const f of this.fighters) f.reset();
    this.projectiles = [];
    this.effects = new Effects();
    this.timer = ROUND_TIME;
    this.mode = 'intro';
    this.modeTime = 0;
    this.koFighter = null;
    this.roundResult = '';
    this.updateCamera(true);
    Sfx.announce();
  }

  onKO(fighter) {
    if (this.mode !== 'fight') return;
    this.koFighter = fighter;
    this.endRound(this.fighters.find((f) => f !== fighter), 'K.O.');
    Sfx.ko();
    this.hitstop = 30;
  }

  endRound(winner, label) {
    this.mode = 'roundEnd';
    this.modeTime = 0;
    this.roundLabel = label;
    this.roundWinner = winner;
    if (winner) {
      winner.wins++;
      winner.move = null;
    }
  }

  // ---- projectiles ----

  hasProjectile(owner) {
    return this.projectiles.some((p) => p.owner === owner);
  }

  spawnProjectile(owner) {
    const move = owner.moveDef('special');
    const sk = skeleton(POSES[move.pose]);
    const hand = owner.toWorld(sk[move.spawnLimb || 'handF'], sk);
    const def = owner.shotDef;
    this.projectiles.push({
      owner, def, x: hand.x + owner.facing * 12, y: hand.y, vx: def.speed * owner.facing, dead: false,
    });
    this.effects.spark(hand.x + owner.facing * 12, hand.y, owner.char.colors.energy, 6, 3);
  }

  updateProjectiles() {
    for (const p of this.projectiles) {
      p.x += p.vx;
      if (p.x < this.camX - 40 || p.x > this.camX + W + 40) p.dead = true;
    }
    // Opposing projectiles cancel each other.
    for (const a of this.projectiles) {
      for (const b of this.projectiles) {
        if (a !== b && a.owner !== b.owner && !a.dead && !b.dead
          && Math.abs(a.x - b.x) < a.def.radius + b.def.radius && Math.abs(a.y - b.y) < a.def.radius + b.def.radius) {
          a.dead = b.dead = true;
          this.effects.spark((a.x + b.x) / 2, a.y, '#ffffff', 18, 6);
          Sfx.block();
        }
      }
    }
    for (const p of this.projectiles) {
      if (p.dead) continue;
      const target = this.fighters.find((f) => f !== p.owner);
      // A force field swallows the shot before it reaches the body.
      if (target.shield > 0) {
        const e = target.shieldEllipse();
        const r = p.def.radius;
        if (((p.x - e.cx) / (e.rx + r)) ** 2 + ((p.y - e.cy) / (e.ry + r)) ** 2 <= 1) {
          p.dead = true;
          this.effects.spark(p.x, p.y, SHIELD_COLOR, 16, 6);
          Sfx.shieldHit();
          continue;
        }
      }
      const hb = target.hurtbox();
      if (circleRect(p.x, p.y, p.def.radius, hb)) {
        if (target.takeHit(p.def, p.owner, this, { x: p.x, y: p.y })) p.dead = true;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  // ---- simulation ----

  update() {
    this.frame++;
    // Hide the fight controls on menus so taps reach the menu (in landscape the
    // joystick area would otherwise cover the lower-left of the screen).
    const inMenu = this.mode === 'splash' || this.mode === 'title' || this.mode === 'select' || this.mode === 'lobby';
    if (inMenu !== this.inMenu) {
      this.inMenu = inMenu;
      document.body.classList.toggle('in-menu', inMenu);
      // Menu music on the menus; the fight track from the round intro on.
      Music.setTrack(inMenu ? 'menu' : 'fight');
    }
    Music.setPaused(this.mode === 'paused');
    if (keyPressed('F2')) this.showBoxes = !this.showBoxes;

    if (this.mode === 'splash') {
      if (Keys.pressedThisFrame.size > 0) this.mode = 'title';
      for (const f of this.fighters) {
        f.time++;
        f.updatePose();
      }
      return;
    }
    if (this.mode === 'title') return this.updateTitle();
    if (this.mode === 'select') return this.updateSelect();
    if (this.mode === 'lobby') {
      if (keyPressed('Escape')) lobbyBack(this);
      return;
    }
    if (this.online === 'guest') return this.updateGuest();
    if (this.online === 'host' && keyPressed('Escape')) {
      leaveOnline(this, 'You left the match.');
      return;
    }
    if (this.mode === 'paused') {
      if (keyPressed('KeyP')) this.mode = 'fight';
      else if (keyPressed('Escape')) this.mode = 'title';
      return;
    }
    if (this.mode === 'matchEnd') {
      this.modeTime++;
      this.stepFighters(false);
      if (this.modeTime > 60 && keyPressed('Enter')) {
        if (this.online === 'host') this.startMatch('online');
        else this.mode = 'title';
      }
      return;
    }

    if (this.mode === 'fight' && this.training && keyPressed('Escape')) {
      this.mode = 'title';
      return;
    }
    if (this.mode === 'fight' && !this.online && (keyPressed('KeyP') || keyPressed('Escape'))) {
      this.mode = 'paused';
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }

    this.modeTime++;
    if (this.mode === 'intro') {
      this.stepFighters(false);
      if (this.modeTime === 70) Sfx.announce();
      if (this.modeTime > 110) {
        this.mode = 'fight';
        this.modeTime = 0;
      }
    } else if (this.mode === 'fight') {
      this.stepFighters(true);
      if (this.training) this.refillTrainingHp();
      this.timer -= 1 / 60;
      if (this.timer <= 0) {
        this.timer = 0;
        const [a, b] = this.fighters;
        const winner = a.hp === b.hp ? null : a.hp > b.hp ? a : b;
        this.endRound(winner, 'TIME');
      }
    } else if (this.mode === 'roundEnd') {
      this.stepFighters(false);
      if (this.modeTime === 80) this.playResult();
      if (this.modeTime === 70 && this.roundWinner) {
        this.roundWinner.won = true;
        this.roundWinner.vx = 0;
      }
      if (this.modeTime > 200) {
        const champ = this.fighters.find((f) => f.wins >= WINS_NEEDED);
        if (champ) {
          this.mode = 'matchEnd';
          this.modeTime = 0;
          this.champion = champ;
        } else {
          this.round++;
          this.startRound();
        }
      }
    }

    if (this.shake > 0) this.shake *= 0.85;
    if (this.shake < 0.5) this.shake = 0;
  }

  // Online guest: send controls, show the host's latest snapshot.
  updateGuest() {
    if (keyPressed('Escape')) {
      leaveOnline(this, 'You left the match.');
      return;
    }
    sendGuestInput();
    applySnapshot(this);
    for (const f of this.fighters) {
      f.time++;
      if (f.flash > 0) f.flash--;
      f.displayHp += (f.hp - f.displayHp) * 0.08;
      f.updatePose();
    }
    this.updateCamera(false);
    this.effects.update();
    if (this.shake > 0) this.shake *= 0.85;
    if (this.shake < 0.5) this.shake = 0;
  }

  // Which fighter this screen's player controls: 0 or 1, or null when two
  // people share the keyboard.
  playerIndex() {
    if (this.online === 'guest') return 1;
    if (this.online === 'host') return 0;
    return this.controllers[1] instanceof KeyboardController ? null : 0;
  }

  // Win or lose jingle as the round's winner is announced; the full version
  // when that round decides the match. The music stops until the next round.
  playResult() {
    const w = this.roundWinner;
    if (!w || this.training) return;
    const matchOver = w.wins >= WINS_NEEDED;
    const you = this.playerIndex();
    const won = you === null || this.fighters.indexOf(w) === you;
    if (won) Sfx.win(matchOver);
    else Sfx.lose(matchOver);
    Music.stop();
  }

  // Canvas taps (touch screens): pick menu items, continue, resume.
  onTap(x, y) {
    if (this.mode === 'select' && this.select.phase === 'stage') {
      const i = this.stageAt(x, y);
      if (i >= 0 && !this.select.stageLocked) {
        this.select.stageCursor = i;
        virtualKeyDown('Enter');
        setTimeout(() => virtualKeyUp('Enter'), 50);
      }
    } else if (this.mode === 'select') {
      const i = this.cardAt(x, y);
      if (i >= 0 && !this.select.locked[0]) {
        this.select.cursor[0] = i;
        virtualKeyDown('Enter');
        setTimeout(() => virtualKeyUp('Enter'), 50);
      }
    } else if (this.mode === 'title') {
      const i = Math.round((y - MENU_TOP) / MENU_STEP);
      if (i >= 0 && i < this.menu.length && Math.abs(x - W / 2) < 190) {
        this.menuIndex = i;
        virtualKeyDown('Enter');
        setTimeout(() => virtualKeyUp('Enter'), 50);
      }
    } else if (this.mode === 'matchEnd' || this.mode === 'paused') {
      virtualKeyDown(this.mode === 'paused' ? 'KeyP' : 'Enter');
      setTimeout(() => { virtualKeyUp('Enter'); virtualKeyUp('KeyP'); }, 50);
    }
  }

  // In training nobody can be KO'd; health refills once a combo is over.
  refillTrainingHp() {
    for (const f of this.fighters) {
      if (f.hitstun > 0 || f.blockstun > 0 || f.downTime > 0) f.idleFrames = 0;
      else f.idleFrames = (f.idleFrames || 0) + 1;
      if (f.idleFrames > 60 && f.hp < MAX_HP) f.hp = Math.min(MAX_HP, f.hp + 2);
    }
  }

  updateTitle() {
    const n = this.menu.length;
    if (keyPressed('KeyW') || keyPressed('ArrowUp')) this.menuIndex = (this.menuIndex + n - 1) % n;
    if (keyPressed('KeyS') || keyPressed('ArrowDown')) this.menuIndex = (this.menuIndex + 1) % n;
    if (keyPressed('Enter') || keyPressed('Space') || keyPressed('KeyJ')) {
      Sfx.unlock();
      this.beginSelect(this.menu[this.menuIndex].kind);
      return;
    }
    this.camX = (WORLD_W - W) / 2;
    for (const f of this.fighters) {
      f.time++;
      f.updatePose();
    }
  }

  stepFighters(acceptInput) {
    const [a, b] = this.fighters;
    const inputs = this.controllers.map((c, i) => {
      if (!acceptInput) return emptyInput();
      const self = this.fighters[i];
      return c.read(self, this.fighters[1 - i], this);
    });

    for (const [self, opp] of [[a, b], [b, a]]) {
      self.nearThreat = !!opp.move || this.projectiles.some((p) => p.owner === opp && Math.abs(p.x - self.x) < 220);
    }
    a.update(inputs[0], b, this);
    b.update(inputs[1], a, this);

    this.resolvePush(a, b);
    this.updateCamera(false);
    if (acceptInput) {
      this.resolveHits(a, b);
      this.resolveHits(b, a);
    }
    this.updateProjectiles();
    this.effects.update();
  }

  resolveHits(att, def) {
    if (!att.attackActive) return;
    // Ducking makes standing punches and kicks whiff overhead.
    if (att.move.def.duckable && def.isDucking) return;
    const move = att.move; // takeHit may end the round and clear att.move
    const p = att.hitPoint();
    if (circleRect(p.x, p.y, move.def.radius * att.scale, def.hurtbox())) {
      if (def.takeHit(move.def, att, this, p)) move.hasHit = true;
    }
  }

  // Camera centers on the fighters, clamped to the stage. Fighters are kept
  // on screen, which also limits how far apart they can get.
  updateCamera(snap) {
    const [a, b] = this.fighters;
    const target = Math.max(0, Math.min(WORLD_W - W, (a.x + b.x) / 2 - W / 2));
    const left = target + SCREEN_MARGIN;
    const right = target + W - SCREEN_MARGIN;
    for (const f of this.fighters) f.x = Math.max(left, Math.min(right, f.x));
    this.camX = snap ? target : this.camX + (target - this.camX) * 0.2;
  }

  // Keep fighters from overlapping while on the ground.
  resolvePush(a, b) {
    const minDist = 23 * (a.scale + b.scale);
    const dx = b.x - a.x;
    const overlap = minDist - Math.abs(dx);
    const vertical = Math.abs(a.y - b.y) < 70;
    if (overlap > 0 && vertical && a.state !== 'ko' && b.state !== 'ko') {
      const dir = dx === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(dx);
      a.x -= (overlap / 2) * dir;
      b.x += (overlap / 2) * dir;
      // Push off walls.
      for (const [f, o] of [[a, b], [b, a]]) {
        if (f.x < STAGE_LEFT) { o.x += STAGE_LEFT - f.x; f.x = STAGE_LEFT; }
        if (f.x > STAGE_RIGHT) { o.x -= f.x - STAGE_RIGHT; f.x = STAGE_RIGHT; }
      }
    }
  }

  // ---- drawing ----

  // Size the canvas to the screen. Portrait touch screens get a tall canvas with
  // the arena at the top (below the system buttons) and the exterior around it;
  // everything else keeps the plain 16:9 arena.
  layout() {
    const portrait = this.touch && window.innerHeight > window.innerWidth;
    let viewH = H;
    let viewOY = 0;
    if (portrait) {
      const scale = W / window.innerWidth;
      viewH = Math.round(window.innerHeight * scale);
      viewOY = Math.round((safeAreaTop() + 56) * scale);
    }
    if (viewH !== this.viewH) document.body.classList.toggle('tall', viewH > H);
    // Screen pixels per game pixel: as many as the canvas shows on this display,
    // from 1 up to 2, in quarter steps so small window changes don't churn.
    const shown = (this.canvas.getBoundingClientRect().width || W) * (window.devicePixelRatio || 1);
    const res = Math.min(this.maxRes, Math.max(1, Math.round((shown / W) * 4) / 4));
    if (viewH !== this.viewH || viewOY !== this.viewOY || res !== this.res) {
      this.viewH = viewH;
      this.viewOY = viewOY;
      this.res = res;
      setResolution(res);
      this.canvas.width = Math.round(W * res);
      this.canvas.height = Math.round(viewH * res);
      this.buffer.width = this.fxBuffer.width = Math.round(W / PIXEL);
      this.buffer.height = this.fxBuffer.height = Math.round(H / PIXEL);
      this.extBuffer.width = Math.round(W / PIXEL);
      this.extBuffer.height = Math.ceil(viewH / PIXEL);
    }
  }

  // If drawing keeps taking more than most of a 60 fps frame, step the
  // resolution down a quarter at a time (never below 1).
  watchDrawTime(ms) {
    this.drawTime += (ms - this.drawTime) * 0.05;
    this.slowFrames = this.drawTime > 11 ? this.slowFrames + 1 : 0;
    if (this.slowFrames > 90 && this.res > 1) {
      this.maxRes = this.res - 0.25;
      this.slowFrames = 0;
      this.drawTime = 0;
      this.layout();
    }
  }

  // Convert a pointer position on the canvas to arena coordinates.
  screenToArena(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * W,
      y: ((clientY - r.top) / r.height) * this.viewH - this.viewOY,
    };
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    if (this.viewH > H && stageDef(this.stage).image) {
      // A picture level: its own sky and floor colors above and below.
      drawStageSurround(ctx, this.stage, this.viewOY, this.viewH);
    } else if (this.viewH > H) {
      const camX = Math.round(this.camX / PIXEL) * PIXEL;
      Exterior.draw(this.extctx, camX, this.frame, this.viewOY, this.viewH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.extBuffer, 0, 0, W, this.extBuffer.height * PIXEL);
    }
    ctx.save();
    ctx.translate(0, this.viewOY);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    this.drawArena();
    ctx.restore();
  }

  drawArena() {
    const ctx = this.ctx;
    const b = this.bctx;
    const fx = this.fxctx;
    const camPix = Math.round(this.camX / PIXEL);
    const camX = camPix * PIXEL;
    const title = this.mode === 'title' || this.mode === 'splash' || this.mode === 'select';
    const order = [...this.fighters].sort((x, y) => (x.move ? 1 : 0) - (y.move ? 1 : 0));

    // Screen shake moves everything in whole art pixels.
    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      sx = Math.round((Math.random() - 0.5) * this.shake / PIXEL) * PIXEL;
      sy = Math.round((Math.random() - 0.5) * this.shake / PIXEL) * PIXEL;
    }

    // Layer 1, low-res: stage and shadows.
    b.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
    drawStageBackground(b, this.stage, camX, this.frame);
    if (title) {
      b.fillStyle = 'rgba(10,5,20,0.35)';
      b.fillRect(0, 0, W, H);
      const [f1, f2] = this.fighters;
      f1.x = camX + 165; f2.x = camX + 800;
      f1.facing = 1; f2.facing = -1; f1.y = f2.y = 0;
    }
    b.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, -camPix, 0);
    if (this.mode !== 'select') for (const f of this.fighters) drawFighterShadow(b, f);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.buffer, sx, sy, W, H);

    // Layer 2, full-res: fighters (the attacker on top).
    ctx.save();
    ctx.translate(sx - camX, sy);
    if (this.mode !== 'select') for (const f of order) drawFighter(ctx, f);
    ctx.restore();
    // The level's foreground (the bridge's front chairs) over the fighters.
    if (this.mode !== 'select') {
      ctx.save();
      ctx.translate(sx, sy);
      drawStageForeground(ctx, this.stage, camX);
      ctx.restore();
    }

    // Layer 3, low-res: attack trails, projectiles, particles, debug boxes.
    if (!title) {
      fx.setTransform(1, 0, 0, 1, 0, 0);
      fx.clearRect(0, 0, this.fxBuffer.width, this.fxBuffer.height);
      fx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, -camPix, 0);
      for (const f of order) drawAttackTrail(fx, f);
      for (const f of this.fighters) drawShield(fx, f, this.frame);
      for (const p of this.projectiles) drawProjectile(fx, p, this.frame);
      this.effects.draw(fx);
      if (this.showBoxes) for (const f of this.fighters) drawFighterBoxes(fx, f);
      ctx.drawImage(this.fxBuffer, sx, sy, W, H);
    }

    if (this.mode === 'select') return this.drawSelect();
    if (title) return this.drawTitle();
    drawHUD(ctx, this);

    if (this.mode === 'intro') {
      if (this.modeTime < 70) drawBanner(ctx, `ROUND ${this.round}`, null, Math.min(1, this.modeTime / 10));
      else drawBanner(ctx, 'FIGHT!', null, 1 - Math.max(0, this.modeTime - 100) / 10);
    } else if (this.mode === 'roundEnd') {
      if (this.modeTime < 80) drawBanner(ctx, this.roundLabel);
      else drawBanner(ctx, this.roundWinner ? `${this.roundWinner.char.name} WINS` : 'DRAW');
    } else if (this.mode === 'matchEnd') {
      const cont = this.online === 'guest' ? 'Waiting for the host · Esc to leave'
        : this.online === 'host' ? (this.touch ? 'Tap for a rematch · ☰ to leave' : 'Enter for a rematch · Esc to leave')
          : this.touch ? 'Tap to continue' : 'Press Enter to continue';
      drawBanner(ctx, `${this.champion.char.name} WINS!`, this.modeTime > 60 ? cont : null);
    } else if (this.mode === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      drawBanner(ctx, 'PAUSED', this.touch ? 'Tap to resume · ☰ to quit' : 'P to resume · Esc to quit');
    }
  }

  drawTitle() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 88px system-ui, sans-serif';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1a0b22';
    ctx.strokeText('WARS VS. TREK', W / 2, 130);
    const g = ctx.createLinearGradient(0, 90, 0, 170);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(1, '#ff5d8f');
    ctx.fillStyle = g;
    ctx.fillText('WARS VS. TREK', W / 2, 130);

    if (this.mode === 'splash') {
      ctx.fillStyle = 'rgba(12,16,32,0.78)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 230, 250, 460, 110, 14);
      ctx.fill();
      if (Math.floor(this.frame / 30) % 2 === 0) {
        ctx.font = 'bold 30px system-ui, sans-serif';
        ctx.fillStyle = '#ffd34d';
        ctx.fillText(this.touch ? 'TAP TO START' : 'PRESS ANY KEY', W / 2, 290);
      }
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('♪ with music', W / 2, 330);
      return;
    }

    ctx.fillStyle = 'rgba(12,16,32,0.78)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 190, MENU_TOP - 35, 380, this.menu.length * MENU_STEP + 76, 14);
    ctx.fill();
    ctx.font = 'bold 26px system-ui, sans-serif';
    this.menu.forEach(({ label }, i) => {
      const y = MENU_TOP + i * MENU_STEP;
      const sel = i === this.menuIndex;
      if (sel) {
        ctx.fillStyle = 'rgba(255,211,77,0.18)';
        ctx.fillRect(W / 2 - 160, y - 20, 320, 40);
      }
      ctx.fillStyle = sel ? '#ffd34d' : 'rgba(255,255,255,0.7)';
      ctx.fillText((sel ? '▶ ' : '') + label, W / 2, y);
    });
    if (Math.floor(this.frame / 30) % 2 === 0) {
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      const hint = this.touch ? 'Tap a mode to start' : 'W/S to choose · ENTER to start';
      ctx.fillText(hint, W / 2, MENU_TOP + this.menu.length * MENU_STEP + 14);
    }
  }
}

// The phone's top safe-area inset (notch), in CSS pixels.
function safeAreaTop() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden';
  document.body.append(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return h;
}

function circleRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}

// ---- boot: fixed-timestep loop ----
const game = new Game(document.getElementById('game'));
window.game = game;
let last = performance.now();
let acc = 0;

function loop(now) {
  acc += Math.min(250, now - last);
  last = now;
  while (acc >= STEP) {
    game.update();
    sendSnapshot(game);
    endInputFrame();
    acc -= STEP;
  }
  const t0 = performance.now();
  game.draw();
  game.watchDrawTime(performance.now() - t0);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
game.layout();
window.addEventListener('resize', () => game.layout());
setupTouchControls(game, document.getElementById('game'));
setupLobbyPanel(game);
Music.setup();
// Start the music now if the browser allows it; otherwise the start screen's
// first tap or key press starts it.
Music.tryAutoplay().then((playing) => {
  if (playing && game.mode === 'splash') game.mode = 'title';
});
window.addEventListener('pointerdown', () => {
  if (game.mode === 'splash') game.mode = 'title';
});
preloadStages();
initOnline(game);
document.getElementById('game').focus();
