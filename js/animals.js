// Animais para o modo Caça: cada bioma tem os seus; os agressivos perseguem e atacam o jogador.
(function () {
  const T = THREE, BC = window.BC;
  // tipo: quad (4 patas), snake (cobra), croc (jacaré, patas curtas)
  const SP = {
    camel: { n: 'Camelo', hp: 260, sp: 2.6, fl: 6.5, aggr: false, dmg: 0, pts: 5, sz: [0.9, 1.0, 2.0], leg: 1.1, col: 0xb89560, hump: true, neck: true },
    snake: { n: 'Cobra', type: 'snake', hp: 30, sp: 3.4, fl: 4, aggr: true, dmg: 22, pts: 3, sz: [0.12, 0.12, 1.5], leg: 0, col: 0x6b5b2a },
    scorpion: { n: 'Escorpião', hp: 20, sp: 3.2, fl: 4, aggr: true, dmg: 16, pts: 2, sz: [0.25, 0.1, 0.4], leg: 0.06, col: 0x2a2218, tail: true },
    fox: { n: 'Raposa-do-deserto', hp: 40, sp: 3.5, fl: 8, aggr: false, dmg: 0, pts: 2, sz: [0.22, 0.25, 0.55], leg: 0.25, col: 0xd9b27a },
    wolf: { n: 'Lobo', hp: 90, sp: 3.8, fl: 6.5, aggr: true, dmg: 20, pts: 4, sz: [0.42, 0.5, 1.0], leg: 0.5, col: 0x77777a },
    bear: { n: 'Urso', hp: 420, sp: 3.4, fl: 5.2, aggr: true, dmg: 45, pts: 8, sz: [1.1, 1.2, 1.9], leg: 0.55, col: 0x4a3524 },
    polar: { n: 'Urso-polar', hp: 460, sp: 3.4, fl: 5.2, aggr: true, dmg: 50, pts: 9, sz: [1.15, 1.2, 2.0], leg: 0.55, col: 0xeef0f0 },
    deer: { n: 'Cervo', hp: 90, sp: 3.2, fl: 8, aggr: false, dmg: 0, pts: 3, sz: [0.5, 0.6, 1.2], leg: 0.9, col: 0x8a5a3a, neck: true },
    boar: { n: 'Javali', hp: 150, sp: 3.4, fl: 5.6, aggr: true, dmg: 25, pts: 4, sz: [0.7, 0.7, 1.2], leg: 0.38, col: 0x4a3a30 },
    croc: { n: 'Jacaré', type: 'croc', hp: 280, sp: 3.0, fl: 4.6, aggr: true, dmg: 40, pts: 7, sz: [0.8, 0.45, 3.0], leg: 0.2, col: 0x4f5e3a },
    jaguar: { n: 'Onça', hp: 120, sp: 4.4, fl: 7.2, aggr: true, dmg: 28, pts: 6, sz: [0.5, 0.55, 1.3], leg: 0.55, col: 0xc8963c },
    goat: { n: 'Cabra-montesa', hp: 70, sp: 3.0, fl: 6.2, aggr: false, dmg: 0, pts: 2, sz: [0.4, 0.5, 0.9], leg: 0.6, col: 0xe8e2d4 },
    capy: { n: 'Capivara', hp: 80, sp: 2.2, fl: 4.5, aggr: false, dmg: 0, pts: 2, sz: [0.5, 0.5, 1.0], leg: 0.3, col: 0x8a6a45 },
    rabbit: { n: 'Coelho', hp: 15, sp: 2.5, fl: 8, aggr: false, dmg: 0, pts: 1, sz: [0.18, 0.2, 0.35], leg: 0.12, col: 0xb8a98a }
  };
  const BIOME = {
    desert: ['camel', 'camel', 'snake', 'snake', 'scorpion', 'fox'], snow: ['wolf', 'deer', 'polar', 'rabbit', 'wolf'], forest: ['boar', 'deer', 'wolf', 'bear', 'deer'],
    swamp: ['croc', 'snake', 'capy', 'boar', 'croc'], jungle: ['jaguar', 'snake', 'boar', 'capy', 'jaguar'], mountain: ['goat', 'wolf', 'bear', 'deer', 'goat'],
    _: ['deer', 'boar', 'wolf', 'rabbit', 'boar']
  };
  BC.ANIMAL_SPECIES = SP;
  const mats = {}; const mat = (c) => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c }));
  const box = (w, h, d, x, y, z, c, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };

  function build(sp) {
    const g = new T.Group(), [w, h, l] = sp.sz, legs = [];
    if (sp.type === 'snake') {
      const segs = []; for (let i = 0; i < 9; i++) { const s = box(w * (1.3 - i * 0.07), w * 1.2, l / 9, 0, w * 0.6, 0, i === 0 ? 0x8a7a3a : sp.col, g); s.userData.i = i; segs.push(s); } g.userData.segs = segs; g.userData.snake = true; return g;
    }
    const ly = sp.leg, by = ly + h / 2;
    box(w, h, l, 0, by, 0, sp.col, g);
    if (sp.hump) box(w * 0.6, h * 0.5, l * 0.3, 0, by + h * 0.7, -l * 0.05, sp.col, g);
    if (sp.neck) { box(w * 0.3, h * 1.1, w * 0.35, 0, by + h * 0.6, -l * 0.5, sp.col, g); box(w * 0.4, h * 0.45, l * 0.28, 0, by + h * 1.15, -l * 0.62, sp.col, g); }
    else box(w * 0.75, h * 0.8, l * 0.28, 0, by + h * 0.1, -l * 0.5 - l * 0.1, sp.col, g);
    box(w * 0.18, h * (sp.tail ? 0.9 : 0.35), w * 0.18, 0, by + (sp.tail ? h * 0.7 : h * 0.2), l * 0.5, sp.col, g);
    if (sp.leg > 0.05) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = new T.Group(); p.position.set(sx * w * 0.38, ly, sz * l * 0.36); box(w * 0.2, ly, w * 0.2, 0, -ly / 2, 0, sp.col, p); g.add(p); legs.push(p); }
    g.userData.legs = legs; return g;
  }

  BC.Animal = function (G, id, x, z) {
    const sp = SP[id]; this.G = G; this.sp = sp; this.id = id; this.name = sp.n; this.isAnimal = true; this.team = -2; this.alive = true; this.hp = sp.hp; this.kills = 0; this.deaths = 0;
    this.x = x; this.z = z; this.y = G.world.heightAt(x, z); this.vx = this.vz = this.vy = 0; this.onGround = true; this.r = Math.max(0.2, Math.max(sp.sz[0], sp.type === 'snake' ? 0.25 : 0) * 0.55); this.h = sp.type === 'snake' ? 0.35 : sp.leg + sp.sz[1] * 1.1 + (sp.neck ? sp.sz[1] * 0.9 : 0);
    this.yaw = Math.random() * 6.28; this.stn = 0; this.wp = null; this.wt = 0; this.cd = 0; this.angry = 0; this.fleeT = 0; this.ph = 0; this.deadT = 0;
    this.model = build(sp); const sc = id === 'croc' ? 1 : 1; this.model.scale.setScalar(sc); G.scene.add(this.model);
  };
  const A = BC.Animal.prototype;
  A.damage = function (amount, zone, from, wid) {
    if (!this.alive) return false; this.hp -= amount; this.hurtT = 0.2;
    if (this.sp.aggr) this.angry = 10; else this.fleeT = 6;
    if (this.hp <= 0) { this.alive = false; this.deadT = 0; if (BC.Modes) BC.Modes.animalKilled(this, from); return true; }
    return false;
  };
  A.update = function (dt) {
    const G = this.G, w = G.world, P = G.player, sp = this.sp, m = this.model;
    if (!this.alive) {
      this.deadT += dt; const u = Math.min(1, this.deadT / 0.5); m.rotation.set(0, this.yaw, (sp.type === 'snake' ? 0 : 1.5) * u * (this.yaw > 3 ? 1 : -1), 'YXZ'); m.position.set(this.x, this.y + (sp.type === 'snake' ? 0 : 0.2 * u), this.z);
      if (this.deadT > 40) m.visible = false; return;
    }
    this.cd -= dt; this.angry = Math.max(0, this.angry - dt); this.fleeT = Math.max(0, this.fleeT - dt); this.hurtT = Math.max(0, (this.hurtT || 0) - dt);
    const dx = P.x - this.x, dz = P.z - this.z, d = Math.hypot(dx, dz) || 1; let wx = 0, wz = 0, speed = 0;
    if (sp.aggr && P.alive && (d < 30 || this.angry > 0) && (!P.sneak || d < 12 || this.angry > 0)) {
      this.yaw = Math.atan2(-dx, -dz); if (d > 1.5) { wx = dx / d; wz = dz / d; speed = sp.sp * 1.7; }
      else if (this.cd <= 0) { this.cd = 1.2; G.hurtPlayer(sp.dmg, { x: this.x, z: this.z, team: -2, alive: true, name: sp.n, isAnimal: true }, 'body', 'animal'); }
    } else if (!sp.aggr && P.alive && (d < 16 || this.fleeT > 0)) {
      wx = -dx / d; wz = -dz / d; speed = sp.fl; this.yaw = Math.atan2(-wx, -wz);
    } else {
      this.wt -= dt;
      if (!this.wp || this.wt <= 0 || Math.hypot(this.wp.x - this.x, this.wp.z - this.z) < 1.2) { if (Math.random() < 0.45) { this.wt = 2 + Math.random() * 4; this.wp = null; } else { const a = Math.random() * 6.28, r = 6 + Math.random() * 18; this.wp = { x: this.x + Math.cos(a) * r, z: this.z + Math.sin(a) * r }; this.wt = 8; } }
      if (this.wp) { const ex = this.wp.x - this.x, ez = this.wp.z - this.z, l = Math.hypot(ex, ez) || 1; wx = ex / l; wz = ez / l; speed = sp.sp; let dy = Math.atan2(-wx, -wz) - this.yaw; dy = ((dy + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.yaw += BC.clamp(dy, -4 * dt, 4 * dt); }
    }
    if (speed > 0) { // desvia de obstáculos: se travado, escolhe outro destino
      const pv = Math.hypot(this.vx, this.vz); BC.moveActor(this, wx, wz, speed, dt, w, false); if (speed > 1 && pv < 0.2 && this.stuck !== undefined) { this.stuck += dt; if (this.stuck > 0.8) { this.wp = null; this.wt = 0; this.stuck = 0; } } else this.stuck = 0;
    } else BC.moveActor(this, 0, 0, 0, dt, w, false);
    if (sp.aggr === false || speed === 0 || true) { let dy2 = Math.atan2(-this.vx, -this.vz) - this.yaw; if (Math.hypot(this.vx, this.vz) > 0.4) { dy2 = ((dy2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.yaw += BC.clamp(dy2, -6 * dt, 6 * dt); } }
    const sv = Math.hypot(this.vx, this.vz); this.ph += sv * dt * (sp.type === 'snake' ? 3 : 2.4);
    m.position.set(this.x, this.y + (this.inWater && sp.type !== 'croc' ? -0.3 : 0), this.z); m.rotation.set(0, this.yaw, 0);
    if (m.userData.legs) m.userData.legs.forEach((p, i) => { p.rotation.x = Math.sin(this.ph + (i === 1 || i === 2 ? Math.PI : 0)) * Math.min(1, sv / 2) * 0.7; });
    if (m.userData.snake) { const n = m.userData.segs.length, l = sp.sz[2]; m.userData.segs.forEach((s, i) => { s.position.z = (i - n / 2) * (l / n); s.position.x = Math.sin(this.ph * 1.5 - i * 0.9) * 0.12 * Math.min(1, sv / 1 + 0.2); }); }
  };
  A.dispose = function () { if (this.model) this.G.scene.remove(this.model); this.model = null; };

  // hitbox simples (cilindro) para o raio dos tiros
  const _hit = BC.hitActor;
  BC.hitActor = function (a, ox, oy, oz, dx, dy, dz, maxT) {
    if (a.isAnimal) { const t = BC.rayCyl(ox, oy, oz, dx, dy, dz, a.x, a.z, a.r + (a.sp.type === 'croc' ? 0.5 : 0.15), a.y, a.y + a.h, maxT); return t > 0 ? { t, zone: 'body' } : null; }
    return _hit.apply(this, arguments);
  };
  BC.animalList = (mapId) => BIOME[mapId] || BIOME._;
})();
