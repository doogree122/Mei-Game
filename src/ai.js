// Simple CPU opponent. Re-plans every few frames with a reaction delay so it
// feels beatable; difficulty scales reaction time and aggression.
class AIController {
  constructor(difficulty = 0.5) {
    this.difficulty = difficulty;
    this.plan = { left: false, right: false, up: false, down: false };
    this.planTimer = 0;
    this.queued = null; // button to press on the next frame
  }

  read(self, opp, game) {
    const out = emptyInput();
    if (--this.planTimer <= 0) this.replan(self, opp, game);

    Object.assign(out, this.plan);
    if (this.queued) {
      out.pressed[this.queued] = true;
      this.queued = null;
    }
    return out;
  }

  replan(self, opp, game) {
    const d = this.difficulty;
    // Ranges below are tuned for a 1x fighter; reach grows with scale.
    const dist = Math.abs(opp.x - self.x) / self.scale;
    const toward = opp.x > self.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';
    const plan = { left: false, right: false, up: false, down: false };
    const r = Math.random();

    // Airborne: drift and kick near the top of the jump.
    if (!self.grounded) {
      if (this.queuedAfterJump && self.vy < 3) {
        this.queued = 'kick';
        this.queuedAfterJump = false;
      }
      this.plan = plan;
      this.planTimer = 2;
      return;
    }

    const incoming = game.projectiles.find((p) => p.owner !== self
      && Math.sign(self.x - p.x) === Math.sign(p.vx) && Math.abs(self.x - p.x) < 260);

    this.planTimer = Math.round(14 - d * 8 + Math.random() * 8);

    if (incoming && self.shield === 0 && self.shieldCooldown === 0 && Math.abs(self.x - incoming.x) < 220
      && r < 0.35 + d * 0.3) {
      this.queued = 'shield';
      this.planTimer = 6;
    } else if (incoming && r < 0.4 + d * 0.5) {
      if (Math.random() < 0.5) {
        plan.up = true;
        plan[toward] = true;
        this.planTimer = 3;
      } else {
        plan[away] = true;
      }
    } else if (opp.move && dist < 150 && r < 0.3 + d * 0.55) {
      // Duck under standing punches and kicks about half the time; otherwise block.
      if (opp.move.def.duckable && Math.random() < 0.5) {
        plan.down = true;
      } else {
        plan[away] = true;
        plan.down = opp.move.def.height === 'low';
      }
      this.planTimer = 16;
    } else if (dist > 300) {
      if (r < 0.25 + d * 0.15 && !game.hasProjectile(self)) this.queued = 'special';
      else plan[toward] = true;
    } else if (dist > 95) {
      if (r < 0.12) {
        plan.up = true;
        plan[toward] = true;
        this.queuedAfterJump = true;
        this.planTimer = 3;
      } else if (r < 0.2 && !game.hasProjectile(self)) {
        this.queued = 'special';
      } else if (r < 0.3) {
        plan[away] = true;
      } else {
        plan[toward] = true;
        this.planTimer = 10;
      }
    } else {
      const roll = Math.random();
      if (roll < 0.25 + d * 0.3) this.queued = 'punch';
      else if (roll < 0.5 + d * 0.15) this.queued = 'kick';
      else if (roll < 0.62) { plan.down = true; this.queued = 'punch'; }
      else if (roll < 0.72) { plan.down = true; this.queued = 'kick'; }
      else if (roll < 0.86) plan[away] = true;
      else plan.down = true;
      this.planTimer = 8 + Math.round(Math.random() * 8);
    }

    this.plan = plan;
  }
}

// Training dummy: stands still and never presses anything.
class DummyController {
  read() {
    return emptyInput();
  }
}
