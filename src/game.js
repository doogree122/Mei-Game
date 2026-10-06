// Game flow: title -> round intro -> fight -> round end -> match end.

const ROUND_TIME = 99;
const WINS_NEEDED = 2;
const STEP = 1000 / 60;
const SCREEN_MARGIN = 30; // fighters can't walk past the screen edges
const MENU = [
  { label: '1 PLAYER  vs  CPU', kind: 'cpu' },
  { label: '2 PLAYERS', kind: 'versus' },
  { label: 'TRAINING', kind: 'training' },
];

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // The world renders into a half-resolution buffer that is scaled up crisply.
    this.buffer = document.createElement('canvas');
    this.buffer.width = W / PIXEL;
    this.buffer.height = H / PIXEL;
    this.bctx = this.buffer.getContext('2d');
    this.effects = new Effects();
    this.projectiles = [];
    this.fighters = [
      new Fighter({ char: CHARACTERS.mei, x: WORLD_W / 2 - 180, facing: 1, side: 0 }),
      new Fighter({ char: CHARACTERS.korr, x: WORLD_W / 2 + 180, facing: -1, side: 1 }),
    ];
    this.controllers = [new KeyboardController(KEYMAPS.p1), new AIController(0.5)];
    this.mode = 'title';
    this.menuIndex = 0;
    this.showBoxes = false;
    this.frame = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.training = false;
    this.camX = (WORLD_W - W) / 2;
  }

  // ---- match flow ----

  startMatch(kind) {
    this.training = kind === 'training';
    this.controllers[1] = kind === 'versus' ? new KeyboardController(KEYMAPS.p2)
      : kind === 'training' ? new DummyController()
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
    const sk = skeleton(POSES.special);
    const hand = owner.toWorld(sk.handF, sk);
    this.projectiles.push({
      owner, x: hand.x + owner.facing * 12, y: hand.y, vx: FIREBALL.speed * owner.facing, dead: false,
    });
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
          && Math.abs(a.x - b.x) < FIREBALL.radius * 2 && Math.abs(a.y - b.y) < FIREBALL.radius * 2) {
          a.dead = b.dead = true;
          this.effects.spark((a.x + b.x) / 2, a.y, '#ffffff', 18, 6);
          Sfx.block();
        }
      }
    }
    for (const p of this.projectiles) {
      if (p.dead) continue;
      const target = this.fighters.find((f) => f !== p.owner);
      const hb = target.hurtbox();
      if (circleRect(p.x, p.y, FIREBALL.radius, hb)) {
        if (target.takeHit(FIREBALL, p.owner, this, { x: p.x, y: p.y })) p.dead = true;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  // ---- simulation ----

  update() {
    this.frame++;
    if (keyPressed('F2')) this.showBoxes = !this.showBoxes;

    if (this.mode === 'title') return this.updateTitle();
    if (this.mode === 'paused') {
      if (keyPressed('KeyP') || keyPressed('Escape')) this.mode = 'fight';
      return;
    }
    if (this.mode === 'matchEnd') {
      this.modeTime++;
      this.stepFighters(false);
      if (this.modeTime > 60 && keyPressed('Enter')) this.mode = 'title';
      return;
    }

    if (this.mode === 'fight' && this.training && keyPressed('Escape')) {
      this.mode = 'title';
      return;
    }
    if (this.mode === 'fight' && (keyPressed('KeyP') || keyPressed('Escape'))) {
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

  // In training nobody can be KO'd; health refills once a combo is over.
  refillTrainingHp() {
    for (const f of this.fighters) {
      if (f.hitstun > 0 || f.blockstun > 0 || f.downTime > 0) f.idleFrames = 0;
      else f.idleFrames = (f.idleFrames || 0) + 1;
      if (f.idleFrames > 60 && f.hp < MAX_HP) f.hp = Math.min(MAX_HP, f.hp + 2);
    }
  }

  updateTitle() {
    const n = MENU.length;
    if (keyPressed('KeyW') || keyPressed('ArrowUp')) this.menuIndex = (this.menuIndex + n - 1) % n;
    if (keyPressed('KeyS') || keyPressed('ArrowDown')) this.menuIndex = (this.menuIndex + 1) % n;
    if (keyPressed('Enter') || keyPressed('Space') || keyPressed('KeyJ')) {
      Sfx.unlock();
      this.startMatch(MENU[this.menuIndex].kind);
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
    const move = att.move; // takeHit may end the round and clear att.move
    const p = att.hitPoint();
    if (circleRect(p.x, p.y, move.def.radius, def.hurtbox())) {
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
    const minDist = 46;
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

  draw() {
    const ctx = this.ctx;
    const b = this.bctx;
    const camPix = Math.round(this.camX / PIXEL);
    const title = this.mode === 'title';

    // World layer at half resolution.
    b.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
    Stage.drawBackground(b, camPix * PIXEL, this.frame);
    if (title) {
      b.fillStyle = 'rgba(10,5,20,0.35)';
      b.fillRect(0, 0, W, H);
      const [f1, f2] = this.fighters;
      f1.x = camPix * PIXEL + 250; f2.x = camPix * PIXEL + 710;
      f1.facing = 1; f2.facing = -1; f1.y = f2.y = 0;
    }
    b.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, -camPix, 0);
    for (const f of this.fighters) drawFighterShadow(b, f);
    // The attacking fighter draws on top.
    const order = [...this.fighters].sort((x, y) => (x.move ? 1 : 0) - (y.move ? 1 : 0));
    for (const f of order) drawFighter(b, f, this.showBoxes && !title, camPix);
    if (!title) {
      for (const p of this.projectiles) drawProjectile(b, p, this.frame);
      this.effects.draw(b);
    }

    // Scale up with crisp pixels; screen shake moves in whole art pixels.
    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      sx = Math.round((Math.random() - 0.5) * this.shake / PIXEL) * PIXEL;
      sy = Math.round((Math.random() - 0.5) * this.shake / PIXEL) * PIXEL;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.buffer, sx, sy, W, H);

    if (title) return this.drawTitle();
    drawHUD(ctx, this);

    if (this.mode === 'intro') {
      if (this.modeTime < 70) drawBanner(ctx, `ROUND ${this.round}`, null, Math.min(1, this.modeTime / 10));
      else drawBanner(ctx, 'FIGHT!', null, 1 - Math.max(0, this.modeTime - 100) / 10);
    } else if (this.mode === 'roundEnd') {
      if (this.modeTime < 80) drawBanner(ctx, this.roundLabel);
      else drawBanner(ctx, this.roundWinner ? `${this.roundWinner.char.name} WINS` : 'DRAW');
    } else if (this.mode === 'matchEnd') {
      drawBanner(ctx, `${this.champion.char.name} WINS!`, this.modeTime > 60 ? 'Press Enter to continue' : null);
    } else if (this.mode === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      drawBanner(ctx, 'PAUSED', 'Press P to resume');
    }
  }

  drawTitle() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 88px system-ui, sans-serif';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1a0b22';
    ctx.strokeText('MEI FIGHTER', W / 2, 130);
    const g = ctx.createLinearGradient(0, 90, 0, 170);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(1, '#ff5d8f');
    ctx.fillStyle = g;
    ctx.fillText('MEI FIGHTER', W / 2, 130);

    ctx.fillStyle = 'rgba(12,16,32,0.78)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 190, 215, 380, 220, 14);
    ctx.fill();
    ctx.font = 'bold 26px system-ui, sans-serif';
    MENU.forEach(({ label }, i) => {
      const y = 250 + i * 48;
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
      ctx.fillText('W/S to choose · ENTER to start', W / 2, 410);
    }
  }
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
    endInputFrame();
    acc -= STEP;
  }
  game.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.getElementById('game').focus();
