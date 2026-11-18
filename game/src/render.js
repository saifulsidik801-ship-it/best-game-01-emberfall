// Renderer: draws the realm, the lantern light (darkness with holes punched
// for the player, braziers and the shard), the beam cone, creatures, boss,
// particles and the vignette. All art is procedural canvas — no image files.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H } from './config.js';
import { clamp, dist } from './random.js';
import { braziersLitCount } from './puzzle.js';

let lightCanvas = null;

function getLightCanvas() {
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = VIEW_W; lightCanvas.height = VIEW_H;
  }
  return lightCanvas;
}

export function drawGame(ctx, state) {
  const r = state.realm;
  const cam = state.cam;
  const def = r.def;
  // Sky / ground.
  ctx.fillStyle = def.ground;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Ground texture: alternating tiles + speckles, in world space.
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  const tile = 120;
  for (let ty = 0; ty < WORLD_H / tile; ty++) {
    for (let tx = 0; tx < WORLD_W / tile; tx++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = def.ground2;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
        ctx.globalAlpha = 1;
      }
    }
  }
  // Decorative scatter (reeds / crystals / embers).
  for (const s of r.map.scatter) {
    ctx.fillStyle = def.accent;
    ctx.globalAlpha = 0.16 + (s.k % 3) * 0.05;
    if (def.deco === 'crystal') {
      ctx.beginPath(); ctx.moveTo(s.x, s.y - s.s * 3); ctx.lineTo(s.x + s.s, s.y); ctx.lineTo(s.x - s.s, s.y); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(s.x, s.y, 2, s.s * 3);
    }
  }
  ctx.globalAlpha = 1;
  // Shadow pools: dark swirls that drain HP in the dark.
  for (const pool of r.map.pools) {
    const g = ctx.createRadialGradient(pool.x, pool.y, 4, pool.x, pool.y, pool.r);
    g.addColorStop(0, 'rgba(5,2,10,0.85)');
    g.addColorStop(0.8, 'rgba(20,8,32,0.55)');
    g.addColorStop(1, 'rgba(20,8,32,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(183,107,255,0.35)';
    ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.r * 0.7, 0, Math.PI * 2); ctx.stroke();
  }
  // Boss gate (north arena) + shard pedestal.
  const gate = r.map.bossGate;
  ctx.strokeStyle = r.bossSpawned ? def.accent : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(gate.x, gate.y, gate.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = def.ground2;
  ctx.beginPath(); ctx.arc(gate.x, gate.y, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = def.accent;
  ctx.beginPath(); ctx.arc(gate.x, gate.y, 26, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = def.accent;
  ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('◆', gate.x, gate.y + 7);
  // Obstacles.
  for (const o of r.map.obstacles) {
    if (o.wall) continue;
    ctx.fillStyle = '#2c2138';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = def.accent; ctx.globalAlpha = 0.4; ctx.lineWidth = 2;
    ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
    ctx.globalAlpha = 1;
    if (def.deco === 'crystal') {
      ctx.fillStyle = def.accent; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, o.y + 6); ctx.lineTo(o.x + o.w / 2 + 8, o.y + o.h / 2); ctx.lineTo(o.x + o.w / 2 - 8, o.y + o.h / 2); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // Braziers.
  for (const b of r.map.braziers) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(b.x - 10, b.y - 4, 20, 14);
    ctx.fillStyle = '#241608';
    ctx.beginPath(); ctx.arc(b.x, b.y - 6, 12, 0, Math.PI * 2); ctx.fill();
    if (b.lit) {
      const fl = 1 + Math.sin(state.time * 6 + b.id * 2) * 0.15;
      ctx.fillStyle = def.glow;
      ctx.beginPath(); ctx.arc(b.x, b.y - 14, 9 * fl, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(b.x, b.y - 14, 4.5 * fl, 0, Math.PI * 2); ctx.fill();
      if (Math.random() < 0.3) r.particles.emberTrail(b.x, b.y - 16, def.glow);
    } else {
      const dw = (b.dwell || 0) / 0.45;
      if (dw > 0) {
        ctx.strokeStyle = def.glow; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y - 8, 18, -Math.PI / 2, -Math.PI / 2 + dw * Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '11px sans-serif';
      ctx.fillText('unlit', b.x, b.y + 30);
    }
  }
  // Chests.
  for (const c of r.map.chests) {
    if (c.opened) {
      ctx.fillStyle = '#4a3418'; ctx.fillRect(c.x - 14, c.y - 8, 28, 14);
    } else {
      ctx.fillStyle = '#8a6a2a'; ctx.fillRect(c.x - 14, c.y - 10, 28, 18);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(c.x - 2, c.y - 10, 4, 18);
      ctx.fillStyle = '#fff3c4'; ctx.font = '10px sans-serif';
      ctx.fillText('E', c.x, c.y - 16);
    }
  }
  // Pickups.
  for (const pk of r.pickups) {
    const bob = Math.sin(pk.t * 3 + pk.bob) * 3;
    if (pk.kind === 'shard') {
      const pulse = 1 + Math.sin(state.time * 4) * 0.2;
      ctx.fillStyle = '#ffd166';
      ctx.save(); ctx.translate(pk.x, pk.y + bob); ctx.rotate(Math.sin(state.time * 2) * 0.2); ctx.scale(pulse, pulse);
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(10, 0); ctx.lineTo(0, 18); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(5, 0); ctx.lineTo(0, 9); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (pk.kind === 'oil') {
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a3c00'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('O', pk.x, pk.y + bob + 4);
    } else if (pk.kind === 'hp') {
      ctx.fillStyle = '#ff5d6c';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('+', pk.x, pk.y + bob + 4);
    } else {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.moveTo(pk.x, pk.y + bob - 7); ctx.lineTo(pk.x + 6, pk.y + bob); ctx.lineTo(pk.x, pk.y + bob + 7); ctx.lineTo(pk.x - 6, pk.y + bob); ctx.closePath(); ctx.fill();
    }
  }
  // Enemies.
  for (const e of r.enemies) drawCreature(ctx, e, state.time);
  // Boss.
  if (r.boss && !r.boss.dead) drawBoss(ctx, r.boss, state.time);
  // Telegraph rocks.
  if (r.rocks) {
    for (const rock of r.rocks) {
      if (rock.hit) continue;
      ctx.strokeStyle = '#ff7a2f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(rock.x, rock.y, rock.r * (1 - rock.t / 0.9 * 0.4), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,122,47,0.25)';
      ctx.beginPath(); ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Bolts.
  for (const b of r.bolts) {
    ctx.fillStyle = b.fromBoss ? '#ff8fd0' : '#b46bff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Beam (additive cone) — drawn before the player so the lantern sits on top.
  const p = r.player;
  if (p.firing && p.oil > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const range = state.stats.beamRange;
    const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, range);
    grad.addColorStop(0, 'rgba(255,220,130,0.55)');
    grad.addColorStop(0.6, 'rgba(255,170,60,0.22)');
    grad.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    const half = Math.atan2(state.stats.beamWidth / 2, range);
    ctx.arc(p.x, p.y, range, p.aim - half, p.aim + half);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Player: hooded lantern-bearer with a flickering flame.
  drawPlayer(ctx, p, state.time, def);
  // Particles (world space).
  r.particles.draw(ctx, cam);
  ctx.restore();

  // ---- Darkness / lighting overlay ----
  const lc = getLightCanvas();
  const lctx = lc.getContext('2d');
  lctx.clearRect(0, 0, VIEW_W, VIEW_H);
  lctx.globalCompositeOperation = 'source-over';
  lctx.fillStyle = 'rgba(4,2,10,0.86)';
  lctx.fillRect(0, 0, VIEW_W, VIEW_H);
  lctx.globalCompositeOperation = 'destination-out';
  const lightRadius = 95 + state.stats.beamRange * 0.55;
  punchLight(lctx, p.x - cam.x, p.y - cam.y, lightRadius * (r.def.id === 'ashen-moor' ? 0.85 : 1));
  for (const b of r.map.braziers) {
    if (b.lit) punchLight(lctx, b.x - cam.x, b.y - cam.y, 120);
  }
  for (const pk of r.pickups) {
    if (pk.kind === 'shard') punchLight(lctx, pk.x - cam.x, pk.y - cam.y, 150);
  }
  if (r.boss && !r.boss.dead) punchLight(lctx, r.boss.x - cam.x, r.boss.y - cam.y, 110);
  ctx.drawImage(lc, 0, 0);
  // Fog tint on top, very light.
  ctx.fillStyle = def.fog;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Vignette.
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function punchLight(lctx, x, y, r) {
  const g = lctx.createRadialGradient(x, y, 4, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  lctx.fillStyle = g;
  lctx.beginPath(); lctx.arc(x, y, r, 0, Math.PI * 2); lctx.fill();
}

function drawCreature(ctx, e, t) {
  const wob = Math.sin(t * 5 + e.wob) * 2;
  ctx.save();
  ctx.translate(e.x, e.y + wob * 0.3);
  if (e.hitT > 0) ctx.globalAlpha = 0.6;
  // Body.
  ctx.fillStyle = e.color;
  ctx.beginPath();
  if (e.type === 'wisp') {
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
  } else if (e.type === 'brute') {
    ctx.moveTo(-e.r, e.r * 0.7); ctx.lineTo(-e.r, -e.r * 0.5); ctx.lineTo(0, -e.r); ctx.lineTo(e.r, -e.r * 0.5); ctx.lineTo(e.r, e.r * 0.7); ctx.closePath();
  } else {
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
  }
  ctx.fill();
  // Eyes — glowing, always watching.
  ctx.fillStyle = '#ffe9a8';
  const eyeY = -3;
  ctx.beginPath(); ctx.arc(-5, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a0b2e';
  ctx.beginPath(); ctx.arc(-5, eyeY, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, eyeY, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // HP bar when damaged.
  if (e.hp < e.maxHp) {
    const w = e.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
    ctx.fillStyle = '#ff5d6c';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * clamp(e.hp / e.maxHp, 0, 1), 4);
  }
}

function drawBoss(ctx, b, t) {
  const pulse = 1 + Math.sin(t * 3) * 0.05;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(pulse, pulse);
  if (b.hitT > 0) ctx.globalAlpha = 0.55;
  // Aura ring.
  ctx.strokeStyle = b.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, b.r + 10 + Math.sin(t * 2) * 3, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = b.color;
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
  // Crown / horns.
  ctx.fillStyle = '#ffd166';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(i * 12 - 5, -b.r + 6); ctx.lineTo(i * 12, -b.r - 14); ctx.lineTo(i * 12 + 5, -b.r + 6); ctx.closePath(); ctx.fill();
  }
  // Eyes.
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(-10, -4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a0b2e';
  ctx.beginPath(); ctx.arc(-10, -4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -4, 2, 0, Math.PI * 2); ctx.fill();
  // Charging telegraph.
  if (b.state === 'charge') {
    ctx.strokeStyle = '#ff5d6c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(b.chargeVx * 0.25, b.chargeVy * 0.25); ctx.stroke();
  }
  if (b.state === 'stun') {
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('STUNNED', 0, -b.r - 22);
  }
  ctx.restore();
}

function drawPlayer(ctx, p, t, def) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.hurtT > 0.2 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  // Cloak.
  ctx.fillStyle = '#3d2b52';
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(12, 12); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill();
  // Hood + face.
  ctx.fillStyle = '#5a4178';
  ctx.beginPath(); ctx.arc(0, -6, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.beginPath(); ctx.arc(2, -6, 4, 0, Math.PI * 2); ctx.fill();
  // Lantern: swung toward the aim, flame flickers.
  const lx = Math.cos(p.aim) * 20, ly = Math.sin(p.aim) * 20;
  ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(lx, ly); ctx.stroke();
  const fl = 1 + Math.sin(t * 11) * 0.2 + (p.firing ? 0.35 : 0);
  ctx.fillStyle = def.glow;
  ctx.beginPath(); ctx.arc(lx, ly, 6 * fl, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(lx, ly, 3 * fl, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Low-oil warning ring.
  if (p.oil < 20) {
    ctx.strokeStyle = Math.floor(t * 3) % 2 ? '#ff5d6c' : 'rgba(255,93,108,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, Math.PI * 2); ctx.stroke();
  }
}
