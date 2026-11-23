// Efeitos pooled: poeira/fumaça, estilhaços, marcas de bala, rastros, clarões, cartuchos, clima.
(function () {
  const T = THREE, BC = window.BC;
  const SURF = { snow: 0xf0f5fa, dirt: 0x6b5a44, mud: 0x4a3b2a, sand: 0xcdb078, grass: 0x55703a, concrete: 0xa5a5a2, wood: 0x8a6a44, metal: 0xb0b6bc, rock: 0x808080, water: 0xb8cdd5, flesh: 0x7a1010 };
  BC.SURF = SURF;

  BC.Fx = function (scene) {
    this.scene = scene; this.t = 0;
    const dot = BC.canvasTex(64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, false);
    const hole = BC.canvasTex(32, (g, s) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, s, s); const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.45, 'rgba(10,10,10,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, false);
    this.puffs = []; for (let i = 0; i < 90; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: dot, transparent: true, depthWrite: false, color: 0xffffff }));
      s.visible = false; scene.add(s); this.puffs.push({ s, life: 0, max: 1, v: new T.Vector3(), s0: 1, s1: 1, a: 1, g: 0 });
    }
    this.deb = []; const dg = new T.BoxGeometry(0.05, 0.05, 0.05);
    for (let i = 0; i < 70; i++) {
      const m = new T.Mesh(dg, new T.MeshBasicMaterial({ color: 0x888888 })); m.visible = false; scene.add(m);
      this.deb.push({ m, life: 0, v: new T.Vector3() });
    }
    this.decals = []; this.dIdx = 0; const pg = new T.PlaneGeometry(0.14, 0.14);
    for (let i = 0; i < 56; i++) {
      const m = new T.Mesh(pg, new T.MeshBasicMaterial({ map: hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      m.visible = false; scene.add(m); this.decals.push({ m, life: 0 });
    }
    this.tracers = []; const tg = new T.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 24; i++) {
      const m = new T.Mesh(tg, new T.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); m.visible = false; scene.add(m);
      this.tracers.push({ m, life: 0 });
    }
    this.flashes = []; const fc = BC.canvasTex(64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,200,90,.9)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, false);
    for (let i = 0; i < 14; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: fc, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); s.visible = false; scene.add(s);
      this.flashes.push({ s, life: 0 });
    }
    this.shells = []; const sg = new T.CylinderGeometry(0.0055, 0.0055, 0.03, 6);
    for (let i = 0; i < 24; i++) {
      const m = new T.Mesh(sg, new T.MeshLambertMaterial({ color: 0xc9a23a })); m.visible = false; scene.add(m);
      this.shells.push({ m, life: 0, v: new T.Vector3(), w: new T.Vector3() });
    }
    this.pi = 0; this.di = 0; this.ti = 0; this.fi = 0; this.si = 0;
    // clima (partículas em torno do jogador)
    this.weather = null;
  };
  const F = BC.Fx.prototype;
  F.puff = function (x, y, z, color, n, speed, size, life, up) {
    for (let i = 0; i < n; i++) {
      const p = this.puffs[this.pi++ % this.puffs.length];
      p.s.position.set(x, y, z); p.s.material.color.setHex(color); p.life = p.max = life * (0.6 + Math.random() * 0.6);
      p.v.set((Math.random() - 0.5) * speed, (Math.random() * 0.6 + 0.2) * speed * (up || 1), (Math.random() - 0.5) * speed);
      p.s0 = size * 0.5; p.s1 = size; p.a = 0.75; p.g = 0; p.s.visible = true;
    }
  };
  F.debris = function (x, y, z, color, n, speed, nx, ny, nz) {
    for (let i = 0; i < n; i++) {
      const d = this.deb[this.di++ % this.deb.length];
      d.m.position.set(x, y, z); d.m.material.color.setHex(color); d.m.visible = true; d.life = 0.6 + Math.random() * 0.4;
      d.v.set(nx * speed + (Math.random() - 0.5) * speed, ny * speed + Math.random() * speed * 0.8, nz * speed + (Math.random() - 0.5) * speed);
      const s = 0.4 + Math.random() * 1.2; d.m.scale.set(s, s, s);
    }
  };
  F.impact = function (pt, n, tag, big) {
    const col = SURF[tag] || 0x888888;
    if (tag === 'flesh') { this.puff(pt.x, pt.y, pt.z, 0x6a1010, 3, 1.2, 0.18, 0.35); return; }
    this.puff(pt.x + n.x * 0.05, pt.y + n.y * 0.05, pt.z + n.z * 0.05, col, big ? 5 : 3, big ? 1.6 : 1.0, big ? 0.55 : 0.32, 0.6);
    this.debris(pt.x, pt.y, pt.z, tag === 'metal' ? 0xffd070 : col, big ? 6 : 4, tag === 'metal' ? 4 : 2.2, n.x, n.y, n.z);
    if (tag !== 'water' && tag !== 'snow' && tag !== 'sand' && tag !== 'mud') this.decal(pt, n);
    else if (tag === 'snow' || tag === 'sand' || tag === 'mud') this.decal(pt, n, 0.6);
  };
  F.decal = function (pt, n, alpha) {
    const d = this.decals[this.dIdx++ % this.decals.length];
    d.m.position.set(pt.x + n.x * 0.012, pt.y + n.y * 0.012, pt.z + n.z * 0.012);
    d.m.lookAt(pt.x + n.x, pt.y + n.y, pt.z + n.z); d.m.rotateZ(Math.random() * 6.28);
    d.m.material.opacity = alpha || 1; d.m.visible = true; d.life = 40;
  };
  F.tracer = function (a, b, w) {
    const t = this.tracers[this.ti++ % this.tracers.length], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz);
    t.m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); t.m.scale.set(w || 0.025, w || 0.025, len);
    t.m.lookAt(b.x, b.y, b.z); t.m.visible = true; t.life = 0.07;
  };
  F.flash = function (pos, size) {
    const f = this.flashes[this.fi++ % this.flashes.length]; f.s.position.copy(pos); f.s.scale.set(size || 0.6, size || 0.6, 1);
    f.s.material.rotation = Math.random() * 6.28; f.s.visible = true; f.life = 0.055;
  };
  F.shell = function (pos, vx, vy, vz) {
    const s = this.shells[this.si++ % this.shells.length]; s.m.position.copy(pos); s.v.set(vx, vy, vz); s.w.set(Math.random() * 20, Math.random() * 20, Math.random() * 20);
    s.m.visible = true; s.life = 2.2;
  };
  F.update = function (dt, world) {
    for (const p of this.puffs) {
      if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; }
      const k = 1 - p.life / p.max; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - 2.2 * dt); p.v.y += 0.4 * dt;
      const s = p.s0 + (p.s1 - p.s0) * k; p.s.scale.set(s, s, 1); p.s.material.opacity = p.a * (1 - k);
    }
    for (const d of this.deb) {
      if (d.life <= 0) continue; d.life -= dt; if (d.life <= 0) { d.m.visible = false; continue; }
      d.v.y -= 9 * dt; d.m.position.addScaledVector(d.v, dt);
    }
    for (const d of this.decals) { if (d.life > 0) { d.life -= dt; if (d.life <= 0) d.m.visible = false; } }
    for (const t of this.tracers) { if (t.life > 0) { t.life -= dt; if (t.life <= 0) t.m.visible = false; } }
    for (const f of this.flashes) { if (f.life > 0) { f.life -= dt; if (f.life <= 0) f.s.visible = false; } }
    for (const s of this.shells) {
      if (s.life <= 0) continue; s.life -= dt; if (s.life <= 0) { s.m.visible = false; continue; }
      s.v.y -= 9.8 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += s.w.x * dt; s.m.rotation.z += s.w.z * dt;
      if (world) { const h = world.heightAt(s.m.position.x, s.m.position.z) + 0.01; if (s.m.position.y < h) { s.m.position.y = h; s.v.y *= -0.35; s.v.x *= 0.5; s.v.z *= 0.5; s.w.multiplyScalar(0.4); } }
    }
  };

  // ---- clima: pontos que acompanham o jogador ----
  F.setWeather = function (kind) {
    if (this.weather) { this.scene.remove(this.weather.pts); this.weather = null; }
    if (!kind || kind === 'none') return;
    const n = kind === 'rain' ? 1400 : kind === 'snow' ? 1600 : 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 50; pos[i * 3 + 1] = Math.random() * 22; pos[i * 3 + 2] = (Math.random() - 0.5) * 50; }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const cfg = { snow: { color: 0xffffff, size: 0.16, op: 0.9 }, rain: { color: 0xb8c4cc, size: 0.07, op: 0.55 }, dust: { color: 0xd6c6a0, size: 0.14, op: 0.35 } }[kind];
    const pts = new T.Points(geo, new T.PointsMaterial({ color: cfg.color, size: cfg.size, transparent: true, opacity: cfg.op, depthWrite: false, map: this.puffs[0].s.material.map, sizeAttenuation: true }));
    pts.frustumCulled = false; this.scene.add(pts); this.weather = { pts, kind, n, pos };
  };
  F.updateWeather = function (dt, cam, t) {
    const w = this.weather; if (!w) return;
    const p = w.pos, cx = cam.x, cy = cam.y, cz = cam.z, k = w.kind;
    const fall = k === 'rain' ? 17 : k === 'snow' ? 1.9 : 0.1, wx = k === 'rain' ? 2.5 : k === 'snow' ? 1.2 : 2.5, wz = k === 'snow' ? 0.6 : 0;
    for (let i = 0; i < w.n; i++) {
      const j = i * 3; p[j] += (wx + (k === 'snow' ? Math.sin(t + i) * 0.5 : 0)) * dt; p[j + 1] -= fall * dt * (k === 'dust' ? 0 : 1); p[j + 2] += wz * dt;
      if (k === 'dust') p[j + 1] += Math.sin(t * 0.7 + i) * 0.1 * dt;
      if (p[j + 1] < cy - 6) p[j + 1] += 22; if (p[j + 1] > cy + 16) p[j + 1] -= 22;
      p[j] = cx + ((((p[j] - cx + 25) % 50) + 50) % 50) - 25;
      p[j + 2] = cz + ((((p[j + 2] - cz + 25) % 50) + 50) % 50) - 25;
    }
    w.pts.geometry.attributes.position.needsUpdate = true;
  };
})();

// ======================= Sangue: jato, gotas, manchas na parede/chão e poça sob o corpo =======================
(function () {
  const T = THREE, BC = window.BC, F = BC.Fx.prototype;
  function init(fx) {
    if (fx.bl) return; const bl = fx.bl = { decals: [], i: 0, pools: [] };
    const tex = BC.canvasTex(64, (g, s) => {
      const r = BC.rng(77); g.clearRect(0, 0, s, s);
      for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = r() * s * 0.28, rad = 3 + r() * 9; const x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(120,6,6,.95)'); gr.addColorStop(0.7, 'rgba(90,4,4,.85)'); gr.addColorStop(1, 'rgba(70,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
      for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = s * (0.3 + r() * 0.18); g.fillStyle = 'rgba(100,5,5,.9)'; g.beginPath(); g.arc(s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, 1 + r() * 2.2, 0, 7); g.fill(); }
    }, false);
    const geo = new T.PlaneGeometry(1, 1);
    for (let i = 0; i < 70; i++) {
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.visible = false; fx.scene.add(m); bl.decals.push({ m, life: 0 });
    }
  }
  function splat(fx, p, n, size) {
    init(fx); const bl = fx.bl, d = bl.decals[bl.i++ % bl.decals.length];
    d.m.position.set(p.x + n.x * 0.015, p.y + n.y * 0.015, p.z + n.z * 0.015); d.m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z); d.m.rotateZ(Math.random() * 6.28);
    const s = size * (0.7 + Math.random() * 0.6); d.m.scale.set(s, s, 1); d.m.material.opacity = 0.9; d.m.visible = true; d.life = 120; return d;
  }
  // d = direção da bala. zone: head/body/legs
  F.blood = function (pt, d, zone, world, dmg) {
    init(this);
    const head = zone === 'head', amt = head ? 1.5 : 1;
    // névoa vermelha + gotas em leque (sai pelo lado oposto e um pouco para trás)
    this.puff(pt.x, pt.y, pt.z, 0x7a0c0c, head ? 6 : 4, 1.6, head ? 0.4 : 0.28, 0.55);
    for (let i = 0; i < Math.round(12 * amt); i++) {
      const dd = this.deb[this.di++ % this.deb.length], sp = 2 + Math.random() * 5;
      dd.m.position.set(pt.x, pt.y, pt.z); dd.m.material.color.setHex(Math.random() < 0.5 ? 0x7a0b0b : 0x4d0505); dd.m.visible = true; dd.life = 0.7 + Math.random() * 0.5;
      dd.v.set(d.x * sp + (Math.random() - 0.5) * 3, d.y * sp + Math.random() * 2.2, d.z * sp + (Math.random() - 0.5) * 3); const s = 0.3 + Math.random() * 0.7; dd.m.scale.set(s, s, s);
    }
    if (world) {
      // mancha na superfície atrás (saída do projétil)
      const h = world.raycast(pt.x + d.x * 0.3, pt.y, pt.z + d.z * 0.3, d.x, d.y, d.z, 3.8);
      if (h) { splat(this, { x: pt.x + d.x * (0.3 + h.t), y: pt.y + d.y * (0.3 + h.t), z: pt.z + d.z * (0.3 + h.t) }, { x: h.nx, y: h.ny, z: h.nz }, 0.45 * amt); }
      // respingo no chão sob o alvo
      const g = world.heightAt(pt.x + d.x * 0.6, pt.z + d.z * 0.6); splat(this, { x: pt.x + d.x * 0.6, y: g, z: pt.z + d.z * 0.6 }, { x: 0, y: 1, z: 0 }, 0.35 * amt);
    }
  };
  // poça que cresce sob o corpo caído
  F.pool = function (x, y, z) {
    init(this); const d = splat(this, { x, y, z }, { x: 0, y: 1, z: 0 }, 0.2); d.grow = 0; d.target = 1.3 + Math.random() * 0.4; d.life = 200; this.bl.pools.push(d);
  };
  const _upd = F.update;
  F.update = function (dt, world) {
    _upd.call(this, dt, world);
    if (!this.bl) return;
    for (const d of this.bl.decals) { if (d.life > 0) { d.life -= dt; if (d.life <= 0) d.m.visible = false; } }
    for (let i = this.bl.pools.length - 1; i >= 0; i--) { const d = this.bl.pools[i]; d.grow += dt; const s = Math.min(d.target, 0.2 + d.grow * 0.22); d.m.scale.set(s, s, 1); if (s >= d.target || d.life <= 0) this.bl.pools.splice(i, 1); }
  };
})();
