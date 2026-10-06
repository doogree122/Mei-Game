// Game flow: title -> round intro -> fight -> round end -> match end.

const ROUND_TIME = 99;
const WINS_NEEDED = 2;
const STEP = 1000 / 60;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.effects = new Effects();
    this.projectiles = [];
    this.fighters = [
      new Fighter({ char: CHARACTERS.mei, x: 300, facing: 1, side: 0 }),
      new Fighter({ char: CHARACTERS.meiAlt, x: 660, facing: -1, side: 1 }),
    ];
    this.controllers = [new KeyboardController(KEYMAPS.p1), new AIController(0.5)];
    this.mode = 'title';
    this.menuIndex = 0;
    this.showBoxes = false;
    this.frame = 0;
    this.hitstop = 0;
    this.shake = 0;
  }

  // ---- match flow ----

  startMatch(twoPlayer) {
    this.controllers[1] = twoPlayer ? new KeyboardController(KEYMAPS.p2) : new AIController(0.5);
    for (const f of this.fighters) f.wins = 0;
    this.round = 1;
    this.startRound();
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
      if (p.x < -40 || p.x > W + 40) p.dead = true;
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

  updateTitle() {
    if (keyPressed('KeyW') || keyPressed('ArrowUp')) this.menuIndex = 0;
    if (keyPressed('KeyS') || keyPressed('ArrowDown')) this.menuIndex = 1;
    if (keyPressed('Enter') || keyPressed('Space') || keyPressed('KeyJ')) {
      Sfx.unlock();
      this.startMatch(this.menuIndex === 1);
    }
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
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    drawStage(ctx);

    if (this.mode === 'title') {
      ctx.restore();
      return this.drawTitle();
    }

    // Draw the fighter who is attacking on top.
    const order = [...this.fighters].sort((x, y) => (x.move ? 1 : 0) - (y.move ? 1 : 0));
    for (const f of order) drawFighter(ctx, f, this.showBoxes);
    for (const p of this.projectiles) drawProjectile(ctx, p, this.frame);
    this.effects.draw(ctx);
    ctx.restore();

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
    ctx.fillStyle = 'rgba(10,5,20,0.45)';
    ctx.fillRect(0, 0, W, H);

    // Showcase both fighters.
    const [a, b] = this.fighters;
    a.x = 250; b.x = 710; a.facing = 1; b.facing = -1; a.y = b.y = 0;
    drawFighter(ctx, a, false);
    drawFighter(ctx, b, false);

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

    const items = ['1 PLAYER  vs  CPU', '2 PLAYERS'];
    ctx.font = 'bold 26px system-ui, sans-serif';
    items.forEach((label, i) => {
      const y = 270 + i * 48;
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
      ctx.fillText('W/S to choose · ENTER to start', W / 2, 400);
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
