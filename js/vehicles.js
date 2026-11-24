// Carro blindado BTR-80 (APC) por time: dirige sozinho, leva soldados dentro, tem metralhadora pesada; munição comum não fura a blindagem,
// munição antiblindagem (AP) e foguetes HEAT perfuram e seguem em linha reta dentro do casco atingindo quem estiver no caminho.
(function () {
  const T = THREE, BC = window.BC, G = BC.G;
  const mat = (c, r) => new T.MeshLambertMaterial({ color: c });
  const box = (w, h, d, c, x, y, z, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const HALF = [1.5, 1.3, 3.75];
  // raio contra caixa orientada (guinada yaw), centro (cx,cy,cz)
  BC.rayOBB = function (ox, oy, oz, dx, dy, dz, cx, cy, cz, yaw, hx, hy, hz, maxT) {
    const c = Math.cos(yaw), s = Math.sin(yaw), px = ox - cx, pz = oz - cz, py = oy - cy;
    const lx = px * c - pz * s, lz = px * s + pz * c, ldx = dx * c - dz * s, ldz = dx * s + dz * c;
    let t0 = 0, t1 = maxT; const o = [lx, py, lz], d = [ldx, dy, ldz], h = [hx, hy, hz];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < -h[i] || o[i] > h[i]) return -1; continue; }
      let a = (-h[i] - o[i]) / d[i], b = (h[i] - o[i]) / d[i]; if (a > b) { const q = a; a = b; b = q; } if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return -1;
    }
    return t0 > 0.0001 ? t0 : -1;
  };
  const _hit = BC.hitActor;
  BC.hitActor = function (a, ox, oy, oz, dx, dy, dz, maxT) {
    if (a.isVehicle) { const t = BC.rayOBB(ox, oy, oz, dx, dy, dz, a.x, a.y + HALF[1], a.z, a.yaw, HALF[0], HALF[1], HALF[2], maxT); return t > 0 ? { t, zone: 'body' } : null; }
    return _hit.apply(this, arguments);
  };

  const SEATS = [[-0.8, 0.9, 1.6], [0.8, 0.9, 1.6], [-0.8, 0.9, 0.4], [0.8, 0.9, 0.4], [-0.8, 0.9, -0.8], [0.8, 0.9, -0.8]]; // troop seats (local, forward = -z)
  let vspec = null;

  function build(team) {
    const g = new T.Group(), wheels = [], tc = team === 0 ? 0x2f6bd1 : 0xd13b2f, olive = 0x4b5a3a;
    box(2.9, 0.85, 7.3, olive, 0, 0.95, 0, g); box(2.55, 0.9, 5.4, 0x56673f, 0, 1.8, 0.3, g);
    const gl = box(2.5, 0.22, 1.7, olive, 0, 1.5, -3.5, g); gl.rotation.x = -0.45; box(2.6, 0.5, 0.9, 0x3d4a2e, 0, 1.3, -3.95, g);
    box(0.06, 0.06, 5.0, tc, -1.46, 1.55, 0.2, g); box(0.06, 0.06, 5.0, tc, 1.46, 1.55, 0.2, g);
    box(0.5, 0.3, 0.8, 0x2a3320, -1.0, 2.4, 1.5, g); box(0.5, 0.3, 0.8, 0x2a3320, 1.0, 2.4, 1.5, g);
    const tur = new T.Group(); tur.position.set(0, 2.35, -0.8); g.add(tur);
    const tb = new T.Mesh(new T.CylinderGeometry(0.85, 1.0, 0.55, 10), mat(0x4f6040)); tb.castShadow = true; tur.add(tb);
    const gun = new T.Group(); gun.position.set(0, 0.1, -0.5); tur.add(gun);
    const bar = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.4, 8), mat(0x222222)); bar.rotation.x = Math.PI / 2; bar.position.set(0.18, 0.06, -1.2); gun.add(bar);
    const bar2 = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 2.0, 8), mat(0x222222)); bar2.rotation.x = Math.PI / 2; bar2.position.set(-0.12, 0.04, -1.0); gun.add(bar2);
    for (const sx of [-1, 1]) for (const z of [-2.7, -0.9, 0.9, 2.7]) { const w = new T.Mesh(new T.CylinderGeometry(0.58, 0.58, 0.38, 12), mat(0x1c1c1c)); w.rotation.z = Math.PI / 2; w.position.set(sx * 1.5, 0.58, z); w.castShadow = true; g.add(w); wheels.push(w); }
    g.userData = { tur, gun, wheels, olive: [] }; g.traverse((o) => { if (o.isMesh && o.material.color) g.userData.olive.push(o); });
    return g;
  }

  BC.Vehicle = function (team) {
    this.team = team; this.isVehicle = true; this.name = 'BTR-80'; this.alive = false; this.kills = 0; this.deaths = 0; this.r = 1.9; this.h = 2.6; this.hp = 0;
    this.x = this.y = this.z = this.vx = this.vy = this.vz = 0; this.onGround = true; this.yaw = 0; this.riders = []; this.stn = 0; this.model = null; this.respawnT = 0; this.state = 'load'; this.turYaw = 0; this.player = null;
    if (!vspec) vspec = Object.assign({}, BC.WMAP.pkm || BC.WMAP.m60, { id: 'kpvt', name: 'KPVT 14,5 mm', dmg: 110, rpm: 600, headMul: 1.5, ap: false, pellets: 1, sup: false });
  };
  const V = BC.Vehicle.prototype;
  V.spawn = function () {
    const w = G.world, sp = w.spawns[this.team], rng = G.rng; let best = null;
    for (let i = 0; i < 12 && !best; i++) { const s = sp[(rng() * sp.length) | 0]; if (w.isFree(s.x, s.z, 2.4)) best = s; } best = best || sp[0];
    this.x = best.x; this.z = best.z; this.y = w.heightAt(this.x, this.z); this.vx = this.vz = this.vy = 0; this.onGround = true; this.yaw = Math.atan2(this.x, this.z) + (this.team === 0 ? 0 : 0); // de frente para o centro
    this.yaw = Math.atan2(-(0 - this.x), -(0 - this.z)); this.hp = 900; this.alive = true; this.state = 'load'; this.loadT = 7; this.holdT = 0; this.riders = []; this.deadT = 0; this.cd = 1; this.burst = 0; this.target = null; this.stuck = 0;
    if (this.model) G.scene.remove(this.model); this.model = build(this.team); G.scene.add(this.model);
  };
  const seatWorld = (v, s) => { const c = Math.cos(v.yaw), sn = Math.sin(v.yaw); return { x: v.x + s[0] * c + s[2] * sn, y: v.y + s[1], z: v.z - s[0] * sn + s[2] * c }; };
  V.board = function (bot) {
    if (!this.alive || this.state !== 'load' || this.riders.length >= SEATS.length) return false;
    bot.inVeh = this; this.riders.push(bot); bot.target = null; if (bot.model) bot.model.root.visible = false; return true;
  };
  V.boardPlayer = function (P) {
    if (!this.alive || this.player || this.state === 'dead') return false; this.player = P; P.inVeh = this; return true;
  };
  V.dismount = function (list) {
    const w = G.world, out = list || this.riders.slice(); let k = 0;
    for (const b of out) {
      const sp = [(k % 2 ? 1 : -1) * 2.2, 0, 4.4 + (k >> 1) * 0.8], pos = seatWorld(this, sp); k++;
      if (b === this.player) { this.player = null; } else { this.riders = this.riders.filter((q) => q !== b); }
      b.inVeh = null; b.x = pos.x; b.z = pos.z; b.y = w.heightAt(pos.x, pos.z); b.vx = b.vz = 0;
      if (!b.isPlayer && b.model) { b.model.root.visible = true; b.model.root.position.set(b.x, b.y, b.z); b.pickWp && b.pickWp(); }
    }
  };
  V.damage = function (amount, zone, from, wid, dir, kind) {
    if (!this.alive) return false; const spec = BC.WMAP[wid];
    if (wid === 'rocketblast') { this.hp -= amount; }
    else if (spec && spec.ap) { this.hp -= amount * 0.45; if (this._hit) this.interior(this._hit, dir, from, 6, 'ap'); }
    else if (kind === 'blast') this.hp -= amount * 0.5; else this.hp -= amount * 0.015;
    this._hit = null; if (this.hp <= 0) { this.destroy(from); return true; } return false;
  };
  V.rocketHit = function (rk, p, dir, owner) {
    if (!this.alive) return; this.hp -= rk.k === 'heat' ? rk.vdmg : rk.vdmg * 0.45;
    if (rk.k === 'heat') this.interior(p, dir, owner, 7, 'heat');
    if (this.hp <= 0) this.destroy(owner);
  };
  // jato/projétil que atravessou a blindagem: segue reto e mata quem estiver na linha (soldados e jogador)
  V.interior = function (p, dir, owner, len, kind) {
    const occ = this.riders.slice(); if (this.player) occ.push(this.player); const hits = [];
    for (const b of occ) {
      const idx = this.riders.indexOf(b), s = SEATS[idx >= 0 ? idx : 0], q = seatWorld(this, s), vx = q.x - p.x, vy = q.y + 0.2 - p.y, vz = q.z - p.z, al = vx * dir.x + vy * dir.y + vz * dir.z;
      if (al < -0.5 || al > len) continue; const px = vx - dir.x * al, py = vy - dir.y * al, pz = vz - dir.z * al; if (px * px + py * py + pz * pz < 0.5 * 0.5) hits.push(b);
    }
    G.fx.flash({ x: p.x + dir.x * 1.2, y: p.y + dir.y * 1.2, z: p.z + dir.z * 1.2 }, kind === 'heat' ? 4 : 1.2); G.fx.debris(p.x, p.y, p.z, 0x555555, 14, 6, dir.x, dir.y, dir.z);
    for (const b of hits) {
      if (b.isPlayer) { this.player = null; b.inVeh = null; G.hurtPlayer(500, { x: p.x, z: p.z, team: owner ? owner.team : -1, alive: true, name: 'Estilhaços' }, 'body', 'rocket'); }
      else { this.riders = this.riders.filter((q) => q !== b); b.inVeh = null; b.x = this.x; b.z = this.z; b.y = this.y; if (b.model) b.model.root.visible = true; b.damage(999, 'body', owner, kind === 'heat' ? 'rocket' : 'ap', dir, 'blast'); }
    }
  };
  V.destroy = function (from) {
    this.alive = false; this.deaths++; this.respawnT = 110; this.deadT = 0; const p = { x: this.x, y: this.y + 1.3, z: this.z }, fx = G.fx, P = G.player;
    const dP = Math.hypot(P.x - p.x, P.z - p.z); fx.flash(p, 9); fx.puff(p.x, p.y, p.z, 0x2a2622, 16, 7, 4.5, 2); fx.puff(p.x, p.y, p.z, 0xcf7a2a, 10, 5, 1.6, 2.4); fx.debris(p.x, p.y, p.z, 0x444444, 40, 11, 0, 1, 0);
    BC.Audio.boom && BC.Audio.boom(dP, G.panTo(p.x, p.z)); if (dP < 60) G.shake = Math.max(G.shake || 0, 1.5); if (dP < 35) G.glitch = Math.max(G.glitch, 0.9);
    for (const b of this.riders.slice()) { this.riders = this.riders.filter((q) => q !== b); b.inVeh = null; b.x = this.x; b.z = this.z; b.y = this.y; if (b.model) b.model.root.visible = true; b.damage(999, 'body', from, 'rocket', { x: 0, y: 0.5, z: 0 }, 'blast'); }
    if (this.player) { const pl = this.player; this.player = null; pl.inVeh = null; G.hurtPlayer(500, { x: p.x, z: p.z, team: from ? from.team : -1, alive: true, name: 'Explosão' }, 'body', 'rocket'); }
    for (const a of G.actors.slice()) { if (a === this || !a.alive || a.inVeh) continue; const d = Math.hypot(a.x - p.x, a.y + 1 - p.y, a.z - p.z); if (d < 9) { const dmg = 220 * Math.pow(1 - d / 9, 2); if (dmg > 3) { if (a.isPlayer) G.hurtPlayer(dmg, { x: p.x, z: p.z, team: from ? from.team : -1, alive: true, name: 'Explosão' }, 'body', 'rocket'); else if (a.damage) a.damage(dmg, 'body', from, 'rocket', { x: (a.x - p.x) / (d || 1), y: 0.3, z: (a.z - p.z) / (d || 1) }, 'blast'); } } }
    if (this.model) this.model.userData.olive.forEach((o) => o.material.color.multiplyScalar(0.25));
  };
  V.steer = function (dx, dz) {
    const w = G.world, l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const probe = (ax, az) => !w.raycast(this.x, this.y + 0.7, this.z, ax, 0, az, 6) && !w.raycast(this.x, this.y + 1.5, this.z, ax, 0, az, 5);
    if (probe(dx, dz)) return [dx, dz]; const base = Math.atan2(dz, dx);
    for (const a of [0.5, 1.0, 1.6, 2.4]) for (const s of [this.sd || 1, -(this.sd || 1)]) { const q = base + a * s, ax = Math.cos(q), az = Math.sin(q); if (probe(ax, az)) { this.sd = s; return [ax, az]; } }
    return [-dx, -dz];
  };
  V.goal = function () {
    const w = G.world, en = 1 - this.team;
    if (G.points && G.points.length) { const l = G.points.filter((p) => p.owner !== this.team); const p = (l.length ? l : G.points)[0]; let b = p, bd = 1e9; for (const q of (l.length ? l : G.points)) { const d = Math.hypot(q.x - this.x, q.z - this.z); if (d < bd) { bd = d; b = q; } } return { x: b.x, z: b.z, r: b.r + 22 }; }
    let sz = 0; for (const s of w.spawns[en]) sz += s.z; sz /= w.spawns[en].length; return { x: 0, z: sz * 0.45, r: 28 };
  };
  V.update = function (dt) {
    if (!this.alive) { this.deadT += dt; this.respawnT -= dt; if (this.respawnT <= 0 && G.running) this.spawn(); return; }
    const w = G.world, m = this.model, spec = vspec; let drive = false, sp = 0;
    // alvo da metralhadora: inimigo vivo visível mais próximo (fora de veículos)
    this.tT = (this.tT || 0) - dt;
    if (this.tT <= 0) { this.tT = 0.3; let bt = null, bd = 95; for (const e of G.actors) { if (!e.alive || e.isAnimal || e.inVeh || e.team < 0 || e.team === this.team || e === this) continue; const d = Math.hypot(e.x - this.x, e.z - this.z); if (d < bd && w.los(this.x, this.y + 2.5, this.z, e.x, e.y + (e.isVehicle ? 1.3 : 1.1), e.z)) { bd = d; bt = e; } } this.target = bt; }
    if (this.state === 'load') { this.loadT -= dt; if (this.loadT <= 0 || this.riders.length >= SEATS.length) { this.state = 'drive'; } }
    else if (this.state === 'drive') {
      const gl = this.goal(), dx = gl.x - this.x, dz = gl.z - this.z, d = Math.hypot(dx, dz);
      const contact = this.target && Math.hypot(this.target.x - this.x, this.target.z - this.z) < 55;
      if (d < gl.r || contact) { this.state = 'hold'; this.holdT = 30 + G.rng() * 25; this.dismount(this.riders.filter((b) => b !== this.player)); }
      else { const s = this.steer(dx, dz); let dy = Math.atan2(-s[0], -s[1]) - this.yaw; dy = ((dy + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.yaw += BC.clamp(dy, -0.9 * dt, 0.9 * dt); const f = Math.cos(BC.clamp(dy, -1.5, 1.5)); sp = 6.2 * Math.max(0.25, f); drive = true; const pv = Math.hypot(this.vx, this.vz); this.stuck = pv < 0.8 ? this.stuck + dt : 0; if (this.stuck > 2.5) { this.sd = -(this.sd || 1); this.yaw += 1.2 * (this.sd); this.stuck = 0; } }
    } else if (this.state === 'hold') { this.holdT -= dt; if (this.holdT <= 0 && !this.player) this.state = 'drive'; }
    const fx_ = -Math.sin(this.yaw), fz_ = -Math.cos(this.yaw);
    BC.moveActor(this, drive ? fx_ : 0, drive ? fz_ : 0, drive ? sp : 0, dt, w, false);
    // modelo
    const pitchTerr = 0; m.position.set(this.x, this.y, this.z); m.rotation.set(0, this.yaw, 0);
    const spd = Math.hypot(this.vx, this.vz); m.userData.wheels.forEach((q) => { q.rotation.x -= spd * dt / 0.58; });
    // torre
    const tur = m.userData.tur, gun = m.userData.gun; let wantYaw = 0, wantPitch = 0;
    if (this.target) { const t = this.target, c = Math.cos(this.yaw), s = Math.sin(this.yaw); const dx = t.x - this.x, dz = t.z - this.z; wantYaw = Math.atan2(-dx, -dz) - this.yaw; wantYaw = ((wantYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; wantPitch = Math.atan2((t.y + 1.0) - (this.y + 2.6), Math.hypot(dx, dz)); }
    let dy2 = wantYaw - this.turYaw; dy2 = ((dy2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.turYaw += BC.clamp(dy2, -1.6 * dt, 1.6 * dt); tur.rotation.y = this.turYaw; gun.rotation.x = BC.lerp(gun.rotation.x, wantPitch, Math.min(1, 6 * dt));
    // pessoas dentro acompanham o carro
    this.riders.forEach((b, i) => { const q = seatWorld(this, SEATS[i]); b.x = q.x; b.y = q.y - 0.9; b.z = q.z; b.vx = b.vz = 0; });
    if (this.player) { const q = seatWorld(this, [0.7, 2.55, 1.2]); this.player.x = q.x; this.player.y = q.y - 0.95; this.player.z = q.z; this.player.vx = this.player.vz = 0; }
    // fogo
    this.cd -= dt;
    if (this.target && this.cd <= 0 && Math.abs(dy2) < 0.12) {
      const c = Math.cos(this.yaw + this.turYaw), s = Math.sin(this.yaw + this.turYaw); const ty = this.target.y + (this.target.isVehicle ? 1.3 : 1.0), eye = { x: this.x - Math.sin(this.yaw + this.turYaw) * 0.9, y: this.y + 2.6, z: this.z - Math.cos(this.yaw + this.turYaw) * 0.9 };
      let dx = this.target.x - eye.x, dy = ty - eye.y, dz = this.target.z - eye.z; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l; const e = BC.rad(1.4 + l / 60), a = G.rng() * 6.283, r = Math.sqrt(G.rng()) * e;
      const dir = { x: dx + Math.cos(a) * r, y: dy + Math.sin(a) * r, z: dz + Math.sin(a) * r * 0.5 }, dl = Math.hypot(dir.x, dir.y, dir.z); dir.x /= dl; dir.y /= dl; dir.z /= dl;
      const mp = { x: eye.x + dir.x * 2.2, y: eye.y + dir.y * 2.2, z: eye.z + dir.z * 2.2 };
      G.fire(this, eye, dir, spec, 1, mp, true); G.noise(this.x, this.z, this.team, 90); BC.Audio.shot(spec.snd, Math.hypot(G.player.x - this.x, G.player.z - this.z), G.panTo(this.x, this.z), false, 0.8, false);
      this.burst++; if (this.burst >= 8) { this.burst = 0; this.cd = 1.4 + G.rng(); } else this.cd = 60 / spec.rpm;
    }
  };

  // ---------------------------------------------------------- gerenciamento
  const Vs = BC.Vehicles = { list: [] };
  Vs.setup = function () {
    Vs.clear(); if (G.net || G.mode === 'hunt' || G.settings.vehicles === 'off') return;
    for (let t = 0; t < 2; t++) { const v = new BC.Vehicle(t); v.spawn(); Vs.list.push(v); G.actors.push(v); }
  };
  Vs.clear = function () { for (const v of Vs.list) { if (v.model) G.scene.remove(v.model); const i = G.actors.indexOf(v); if (i >= 0) G.actors.splice(i, 1); } Vs.list = []; };
  Vs.update = function (dt) { for (const v of Vs.list) v.update(dt); };
  Vs.tryBoard = function (bot) { const v = Vs.list[bot.team]; if (v && v.alive && v.state === 'load' && G.rng() < 0.6) v.board(bot); };
  Vs.useKey = function () {
    const P = G.player; if (!P.alive || P.faintT > 0) return;
    if (P.inVeh) { P.inVeh.dismount([P]); return; }
    const v = Vs.list[P.team]; if (v && v.alive && Math.hypot(v.x - P.x, v.z - P.z) < 5.5 && Math.abs(v.y - P.y) < 3) { v.boardPlayer(P); if (v.state === 'load') v.loadT = Math.max(v.loadT, 4); }
  };
})();
