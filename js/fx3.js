// Sangue v3: jato proporcional ao calibre, sangramento contínuo, jato arterial, manchas no uniforme, poças maiores.
(function () {
  const T = THREE, BC = window.BC, F = BC.Fx.prototype, REDS = [0x7a0b0b, 0x4d0505, 0x9a1313, 0x5e0808];
  const tex = BC.canvasTex(64, (g, s) => {
    const r = BC.rng(91); g.clearRect(0, 0, s, s);
    for (let i = 0; i < 11; i++) { const a = r() * 6.28, d = r() * s * 0.26, rad = 3 + r() * 10, x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(125,6,6,.95)'); gr.addColorStop(0.7, 'rgba(92,4,4,.88)'); gr.addColorStop(1, 'rgba(70,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
    for (let i = 0; i < 4; i++) { const a = r() * 6.28; g.strokeStyle = 'rgba(100,5,5,.85)'; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(s / 2, s / 2); g.lineTo(s / 2 + Math.cos(a) * s * (0.3 + r() * 0.17), s / 2 + Math.sin(a) * s * (0.3 + r() * 0.17)); g.stroke(); }
    for (let i = 0; i < 18; i++) { const a = r() * 6.28, d = s * (0.28 + r() * 0.2); g.fillStyle = 'rgba(105,5,5,.9)'; g.beginPath(); g.arc(s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, 0.8 + r() * 2.4, 0, 7); g.fill(); }
  }, false);
  function ensure(fx) {
    if (fx.bd) return; fx.bd = []; fx.bdi = 0; fx.pools2 = [];
    const dg = new T.BoxGeometry(0.035, 0.035, 0.035); for (let i = 0; i < 160; i++) { const m = new T.Mesh(dg, new T.MeshBasicMaterial({ color: 0x6a0b0b })); m.visible = false; fx.scene.add(m); fx.deb.push({ m, life: 0, v: new T.Vector3() }); }
    fx.pd = []; fx.pdi = 0; const pg = new T.PlaneGeometry(1, 1); for (let i = 0; i < 24; i++) { const m = new T.Mesh(pg, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); m.visible = false; fx.scene.add(m); fx.pd.push({ m, life: 0 }); }
    for (let i = 0; i < 140; i++) { const m = new T.Mesh(pg, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); m.visible = false; fx.scene.add(m); fx.bd.push({ m, life: 0 }); }
  }
  function dec(fx, p, n, size, op) {
    ensure(fx); const d = fx.bd[fx.bdi++ % fx.bd.length];
    d.m.position.set(p.x + n.x * 0.015, p.y + n.y * 0.015, p.z + n.z * 0.015); d.m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z); d.m.rotateZ(Math.random() * 6.28);
    d.m.scale.set(size * (0.75 + Math.random() * 0.5), size * (0.75 + Math.random() * 0.5), 1); d.m.material.opacity = op || 0.9; d.m.visible = true; d.life = 160; return d;
  }
  const drop = (fx, x, y, z, vx, vy, vz, sc) => { const dd = fx.deb[fx.di++ % fx.deb.length]; dd.m.position.set(x, y, z); dd.m.material.color.setHex(REDS[(Math.random() * 4) | 0]); dd.m.visible = true; dd.life = 0.6 + Math.random() * 0.6; dd.v.set(vx, vy, vz); dd.m.scale.set(sc, sc, sc); };

  F.blood = function (pt, d, zone, world, dmg) {
    ensure(this); const amt = BC.clamp((dmg || 50) / 55, 0.5, 3), head = zone === 'head';
    this.puff(pt.x, pt.y, pt.z, 0x7a0c0c, Math.round(3 + 2 * amt), 1.8, head ? 0.45 : 0.3, 0.6);
    const nf = Math.round(14 * amt * (head ? 1.5 : 1));
    for (let i = 0; i < nf; i++) { const sp = (2 + Math.random() * 6) * Math.sqrt(amt); drop(this, pt.x, pt.y, pt.z, d.x * sp + (Math.random() - 0.5) * 3.2, d.y * sp + Math.random() * 2.4, d.z * sp + (Math.random() - 0.5) * 3.2, 0.3 + Math.random() * 0.9); }
    for (let i = 0; i < Math.round(5 * amt); i++) { const sp = 1 + Math.random() * 2.5; drop(this, pt.x, pt.y, pt.z, -d.x * sp + (Math.random() - 0.5) * 2, Math.random() * 1.6, -d.z * sp + (Math.random() - 0.5) * 2, 0.25 + Math.random() * 0.5); }
    if (world) {
      const h = world.raycast(pt.x + d.x * 0.3, pt.y, pt.z + d.z * 0.3, d.x, d.y, d.z, 4.8);
      if (h) { const q = { x: pt.x + d.x * (0.3 + h.t), y: pt.y + d.y * (0.3 + h.t), z: pt.z + d.z * (0.3 + h.t) }, n = { x: h.nx, y: h.ny, z: h.nz }; dec(this, q, n, 0.45 * amt); for (let i = 0; i < 3; i++) dec(this, { x: q.x + (Math.random() - 0.5) * 0.7, y: q.y + (Math.random() - 0.5) * 0.7, z: q.z + (Math.random() - 0.5) * 0.7 }, n, 0.12 + Math.random() * 0.12, 0.8); }
      const g = world.heightAt(pt.x + d.x * 0.7, pt.z + d.z * 0.7); dec(this, { x: pt.x + d.x * 0.7, y: g, z: pt.z + d.z * 0.7 }, { x: 0, y: 1, z: 0 }, 0.4 * amt);
    }
  };
  const woundPos = (a, zone) => { const h = a.h || 1.78, y = (a.stn || 0) > 1.5 ? a.y + 0.22 : a.y + h * (zone === 'head' ? 0.92 : zone === 'legs' ? 0.3 : 0.66); return { x: a.x, y, z: a.z }; };
  function stain(fx, a, zone, dir) {
    const m = a.model; if (!m || (a.stains || 0) >= 5) return; a.stains = (a.stains || 0) + 1;
    const front = dir ? (dir.x * -Math.sin(a.yaw) + dir.z * -Math.cos(a.yaw)) < 0 : true, sz = 0.09 + Math.random() * 0.1;
    const mesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0x8a1818, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mesh.scale.set(sz, sz, 1);
    if (zone === 'legs') { const leg = Math.random() < 0.5 ? m.legL : m.legR; mesh.position.set((Math.random() - 0.5) * 0.06, -0.15 - Math.random() * 0.2, front ? -0.085 : 0.085); mesh.rotation.y = front ? Math.PI : 0; leg.add(mesh); }
    else { mesh.position.set((Math.random() - 0.5) * 0.26, 0.28 + (Math.random() - 0.5) * 0.2, front ? -0.166 : 0.3); mesh.rotation.y = front ? Math.PI : 0; m.up.add(mesh); }
  }
  F.wound = function (a, zone, dir, amount) {
    ensure(this); if (!a.bleed) a.bleed = []; if (a.bleed.length < 4) a.bleed.push({ type: 'wound', zone, t: 3.2 + amount / 16, t0: 3.2 + amount / 16, acc: 0 });
    stain(this, a, zone, dir);
  };
  F.bleedTick = function (a, dt) {
    const w = BC.G.world;
    for (const b of a.bleed) {
      if (b.t <= 0) continue; b.t -= dt; const p = woundPos(a, b.zone);
      if (b.type === 'art') { b.acc += dt; if (b.acc > 0.36) { b.acc = 0; const k = Math.max(0.3, b.t / b.t0), an = Math.random() * 6.28; for (let i = 0; i < Math.round(16 * k); i++) { const s2 = 1 + Math.random() * 1.6; drop(this, p.x, p.y, p.z, Math.cos(an + Math.random() * 0.8) * s2, 3 + Math.random() * 3 * k, Math.sin(an + Math.random() * 0.8) * s2, 0.35 + Math.random() * 0.6); } dec(this, { x: p.x + Math.cos(an) * (0.5 + Math.random()), y: w.heightAt(p.x, p.z), z: p.z + Math.sin(an) * (0.5 + Math.random()) }, { x: 0, y: 1, z: 0 }, 0.16 + Math.random() * 0.22); } }
      else { b.acc += dt * (5 + 9 * b.t / b.t0); while (b.acc > 1) { b.acc -= 1; drop(this, p.x + (Math.random() - 0.5) * 0.1, p.y, p.z + (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.4, -0.3, (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.3); if (Math.random() < 0.3) dec(this, { x: a.x + (Math.random() - 0.5) * 0.35, y: w.heightAt(a.x, a.z), z: a.z + (Math.random() - 0.5) * 0.35 }, { x: 0, y: 1, z: 0 }, 0.06 + Math.random() * 0.1, 0.85); } }
    }
    a.bleed = a.bleed.filter((b) => b.t > 0);
  };
  F.deathBlood = function (a, zone, dir, energy, amount) {
    ensure(this); const p = woundPos(a, zone), d = dir || { x: 0, y: 0, z: -1 };
    this.blood(p, d, zone, BC.G.world, (amount || 60) * 1.4 + energy * 15);
    a.bleed = a.bleed || []; a.bleed.push({ type: 'art', zone, t: 2.8 + energy * 0.4, t0: 3.2, acc: 0 });
    if (BC.G.rng() < 0.5) a.bleed.push({ type: 'wound', zone: 'body', t: 5, t0: 5, acc: 0 });
  };
  F.pool = function (x, y, z, amount) {
    ensure(this); const d = this.pd[this.pdi++ % this.pd.length]; d.m.position.set(x, y + 0.015, z); d.m.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28); d.m.scale.set(0.2, 0.2, 1); d.m.material.opacity = 0.92; d.m.visible = true; this.pools2 = this.pools2.filter((q) => q !== d); d.grow = 0; d.target = 1.1 + Math.min(1.1, (amount || 60) / 110) + Math.random() * 0.3; d.life = 240; this.pools2.push(d);
    for (let i = 0; i < 3; i++) dec(this, { x: x + (Math.random() - 0.5) * 1.6, y, z: z + (Math.random() - 0.5) * 1.6 }, { x: 0, y: 1, z: 0 }, 0.25 + Math.random() * 0.3, 0.85);
  };
  F.reset = function () {
    for (const p of this.puffs) { p.life = 0; p.s.visible = false; } for (const d of this.deb) { d.life = 0; d.m.visible = false; } for (const d of this.decals) { d.life = 0; d.m.visible = false; }
    for (const t of this.tracers) { t.life = 0; t.m.visible = false; } for (const f of this.flashes) { f.life = 0; f.s.visible = false; } for (const s of this.shells) { s.life = 0; s.m.visible = false; }
    if (this.bd) { for (const d of this.bd) { d.life = 0; d.m.visible = false; } for (const d of this.pd) { d.life = 0; d.m.visible = false; } this.pools2 = []; }
  };
  const _u = F.update;
  F.update = function (dt, world) {
    _u.call(this, dt, world); if (!this.bd) return;
    for (const d of this.pd) if (d.life > 0) { d.life -= dt; if (d.life <= 0) d.m.visible = false; }
    for (const d of this.bd) if (d.life > 0) { d.life -= dt; if (d.life <= 0) d.m.visible = false; }
    for (let i = this.pools2.length - 1; i >= 0; i--) { const d = this.pools2[i]; d.grow += dt; const s = Math.min(d.target, 0.2 + d.grow * 0.16); d.m.scale.set(s, s, 1); if (s >= d.target) this.pools2.splice(i, 1); }
  };
})();
