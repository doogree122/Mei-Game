// Hit sparks, dust and other short-lived particles.
class Effects {
  constructor() {
    this.particles = [];
  }

  spark(x, y, color, count = 12, speed = 6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random());
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 18 + Math.random() * 10, max: 28, size: 2 + Math.random() * 3,
        color, gravity: 0.15, kind: 'spark',
      });
    }
    this.particles.push({ x, y, vx: 0, vy: 0, life: 8, max: 8, size: 28, color, gravity: 0, kind: 'ring' });
  }

  dust(x, y, dir = 0) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20, y,
        vx: dir * Math.random() * 2 + (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5,
        life: 20 + Math.random() * 10, max: 30, size: 4 + Math.random() * 4,
        color: 'rgba(220,210,190,0.6)', gravity: -0.02, kind: 'dust',
      });
    }
  }

  update() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.92;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.particles) {
      const t = p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.4 - t), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === 'dust' ? 2 - t : t + 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
