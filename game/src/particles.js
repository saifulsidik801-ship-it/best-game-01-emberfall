// Particle system: embers, sparks, smoke, flame tongues and shard glints.
// Cheap pooled array, no allocations in the hot loop beyond spawn calls.
export class Particles {
  constructor() { this.list = []; }
  spawn(x, y, opt) {
    if (this.list.length > 420) this.list.splice(0, 40);
    const o = opt || {};
    this.list.push({
      x, y, vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.6, maxLife: o.life || 0.6,
      size: o.size || 3, color: o.color || '#ffb347',
      grav: o.grav || 0, drag: o.drag || 0.98, glow: o.glow !== false,
    });
  }
  burst(x, y, color, n, speed) {
    for (let i = 0; i < (n || 12); i++) {
      const a = Math.random() * Math.PI * 2, s = (speed || 90) * (0.3 + Math.random() * 0.7);
      this.spawn(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.5, size: 2 + Math.random() * 3, color });
    }
  }
  emberTrail(x, y, color) {
    this.spawn(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10,
      { vx: (Math.random() - 0.5) * 14, vy: -28 - Math.random() * 30, life: 0.7 + Math.random() * 0.5, size: 2 + Math.random() * 2.5, color: color || '#ffb347', grav: -12 });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += p.grav * dt; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  draw(ctx, cam) {
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  clear() { this.list.length = 0; }
}
