// Movimento compartilhado (jogador + bots) e IA dos soldados.
(function () {
  const T = THREE, BC = window.BC;
  const STEP = 0.55;

  // a: {x,y,z,vx,vy,vz,onGround,r,h}
  BC.moveActor = function (a, wx, wz, speed, dt, world, jump) {
    const acc = a.onGround ? 40 : 7, tx = wx * speed, tz = wz * speed;
    const dvx = tx - a.vx, dvz = tz - a.vz, dl = Math.hypot(dvx, dvz), md = acc * dt;
    if (dl > md) { a.vx += dvx / dl * md; a.vz += dvz / dl * md; } else { a.vx = tx; a.vz = tz; }
    const nx = a.x + a.vx * dt, nz = a.z + a.vz * dt;
    const ok = (px, pz) => {
      const g = world.groundAt(px, pz, a.y, STEP), run = Math.hypot(px - a.x, pz - a.z), lim = world._gBox ? STEP + 0.01 : run * 1.35 + 0.05;
      return !a.onGround || (g - a.y) <= lim;
    };
    if (ok(nx, nz)) { a.x = nx; a.z = nz; } else if (ok(nx, a.z)) { a.x = nx; a.vz = 0; } else if (ok(a.x, nz)) { a.z = nz; a.vx = 0; } else { a.vx = 0; a.vz = 0; }
    const p = { x: a.x, z: a.z }; world.pushOut(p, a.r, a.y, a.h, STEP); a.x = p.x; a.z = p.z;
    if (world.embedded && world.embedded(a)) world.unstick(a);
    const L = world.play; a.x = BC.clamp(a.x, -L, L); a.z = BC.clamp(a.z, -L, L);
    const g = world.groundAt(a.x, a.z, a.y, STEP); a.landed = 0;
    if (a.onGround) {
      if (g < a.y - 0.4) { a.onGround = false; a.vy = 0; } else a.y = g;
      if (jump && a.onGround) { a.vy = 6.4; a.onGround = false; }
    }
    if (!a.onGround) {
      a.vy -= 22 * dt; a.y += a.vy * dt;
      if (a.y <= g) { a.landed = -a.vy; a.y = g; a.vy = 0; a.onGround = true; }
    }
    a.inWater = world.heightAt(a.x, a.z) < world.waterY - 0.15 && a.y < world.waterY + 0.2;
  };

  // hitbox: retorna {t,zone} do mesmo raio contra um ator (cabeça esfera, tronco e pernas cilindros)
  BC.hitActor = function (a, ox, oy, oz, dx, dy, dz, maxT) {
    if ((a.stn || 0) > 1.5) { // deitado: esferas ao longo do corpo
      const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw), x = a.x, y = a.y, z = a.z;
      let t = BC.raySphere(ox, oy, oz, dx, dy, dz, x + fx * 0.62, y + 0.2, z + fz * 0.62, 0.15, maxT); if (t > 0) return { t, zone: 'head' };
      const tb = BC.raySphere(ox, oy, oz, dx, dy, dz, x + fx * 0.15, y + 0.2, z + fz * 0.15, 0.27, maxT), tl = BC.raySphere(ox, oy, oz, dx, dy, dz, x - fx * 0.45, y + 0.15, z - fz * 0.45, 0.2, maxT), tl2 = BC.raySphere(ox, oy, oz, dx, dy, dz, x - fx * 0.9, y + 0.13, z - fz * 0.9, 0.17, maxT);
      const ts = [[tb, 'body'], [tl, 'legs'], [tl2, 'legs']].filter((q) => q[0] > 0).sort((p, q) => p[0] - q[0]); return ts.length ? { t: ts[0][0], zone: ts[0][1] } : null;
    }
    const k = (a.h || 1.78) / 1.78, x = a.x, y = a.y, z = a.z;
    let t = BC.raySphere(ox, oy, oz, dx, dy, dz, x, y + 1.62 * k, z, 0.16, maxT);
    if (t > 0) return { t, zone: 'head' };
    let tb = BC.rayCyl(ox, oy, oz, dx, dy, dz, x, z, 0.27, y + 0.82 * k, y + 1.47 * k, maxT);
    let tl = BC.rayCyl(ox, oy, oz, dx, dy, dz, x, z, 0.2, y, y + 0.82 * k, maxT);
    if (tb > 0 && (tl < 0 || tb <= tl)) return { t: tb, zone: 'body' };
    if (tl > 0) return { t: tl, zone: 'legs' };
    return null;
  };

  const CLSW = [['lmg', 4], ['rifle', 50], ['smg', 18], ['shotgun', 9], ['sniper', 8], ['pistol', 4], ['revolver', 2]];
  function pickWeapon(rng) { let r = rng() * 95, c = 'rifle'; for (const [k, w] of CLSW) { if (r < w) { c = k; break; } r -= w; } const l = BC.WEAPONS.filter((x) => x.cls === c); return l[(rng() * l.length) | 0].id; }
  const PREF = { lmg: 30, rifle: 24, smg: 16, pistol: 11, revolver: 12, shotgun: 6, sniper: 48 };

  const E_ = (x) => x * x * (3 - 2 * x);
  BC.Bot = function (G, team, idx) {
    this.G = G; this.team = team; this.idx = idx; this.isBot = true;
    this.name = BC.CALLSIGNS[(idx * 7 + team * 3) % BC.CALLSIGNS.length];
    this.alive = false; this.model = null; this.r = 0.32; this.h = 1.78;
    this.x = this.y = this.z = 0; this.vx = this.vy = this.vz = 0; this.onGround = true;
    this.respawnT = 1 + idx * 0.8; this.kills = 0; this.deaths = 0; this.walkPh = 0;
  };
  const B = BC.Bot.prototype;

  B.spawn = function () {
    const G = this.G, w = G.world, sp = w.spawns[this.team], rng = G.rng;
    let best = null, bd = -1;
    for (let i = 0; i < 4; i++) { // escolhe o ponto livre mais longe dos inimigos
      const s = sp[(rng() * sp.length) | 0]; let m = 1e9;
      for (const e of G.actors) if (e.alive && e.team !== this.team) m = Math.min(m, Math.hypot(e.x - s.x, e.z - s.z));
      if (m > bd) { bd = m; best = s; }
    }
    this.x = best.x + (rng() - 0.5) * 2; this.z = best.z + (rng() - 0.5) * 2; this.y = w.heightAt(this.x, this.z);
    this.vx = this.vy = this.vz = 0; this.onGround = true;
    this.wid = pickWeapon(rng); this.spec = BC.WMAP[this.wid];
    this.hp = 100; this.alive = true; this.deadT = 0; this.mag = this.spec.mag; this.reloadT = 0; this.fireT = 0.5; this.burst = 0;
    this.yaw = this.team === 0 ? 0 : Math.PI; this.pitch = 0; this.target = null; this.engT = 0; this.reactT = 0; this.lostT = 99; this.lastSeen = null;
    this.wp = null; this.wpT = 0; this.stuckT = 0; this.sx = this.x; this.sz = this.z; this.strafe = 1; this.strafeT = 1; this.percT = rng() * 0.3; this.pause = 0; this.alertT = 0;
    this.avoidDir = 0; this.avoidT = 0; this.sprint = false; this.crouch = 0; this.prone = 0; this.stn = 0; this.wantStn = 0; this.gren = (rng() < 0.7) ? (rng() < 0.6 ? 'frag' : rng() < 0.6 ? 'flash' : 'smoke') : null; this.grenT = 6 + rng() * 22; this.blindT = 0; this.flee = null; this.bleed = []; this.stains = 0; this.death = null; this.bld = 0; this.faintT = 0; this.lastFrom = null; this.inVeh = null; this.atSpec = null; this.atAmmo = 0; this.cover = null; this.coverT = 0; this.phT = 0; this.phase = 'patrol';
    if (this.model) { G.scene.remove(this.model.root); }
    this.agentIdx = (rng() * BC.AGENTS.length) | 0; this.model = BC.makeChar(G.teamDefs[this.team], this.wid, this.agentIdx);
    G.scene.add(this.model.root); this.model.root.rotation.set(0, this.yaw, 0);
    if (rng() < 0.12) { const L = BC.WEAPONS.filter((x) => x.cls === 'launcher'); if (L.length) { this.atSpec = L[(rng() * L.length) | 0]; this.atAmmo = 2; } }
    this.model.api.kneel = this.idx & 1;
    if (BC.Vehicles) BC.Vehicles.tryBoard(this);
  };

  B.throwGren = function (tx, tz, ty) {
    const G = this.G, rng = G.rng, p = new T.Vector3(this.x - Math.sin(this.yaw) * 0.5, this.y + 1.5 - this.crouch * 0.4, this.z - Math.cos(this.yaw) * 0.5);
    const v = BC.Gren.solve(p, tx + (rng() - 0.5) * 5, tz + (rng() - 0.5) * 5, ty || 0); v.multiplyScalar(0.96 + rng() * 0.08);
    BC.Gren.throwG(this, this.gren, p, v); this.gren = null; this.grenT = 999; BC.Audio.gren('throw', Math.hypot(G.player.x - this.x, G.player.z - this.z), G.panTo(this.x, this.z), 0.7);
  };
  B.eyeH = function () { return 1.5 - 0.5 * this.crouch - 1.15 * this.prone; };
  B.hear = function (x, z, strong) {
    if (!this.alive || this.target) return;
    const d = Math.hypot(x - this.x, z - this.z);
    if (d < (strong ? 60 : 38)) { this.wp = { x: x + (this.G.rng() - 0.5) * 8, z: z + (this.G.rng() - 0.5) * 8 }; this.wpT = 14; this.sprint = !!strong; this.pause = 0; if (d < 22) this.alertT = 1.2; }
  };

  B.damage = function (amount, zone, from, wid, dir, kind) {
    if (!this.alive) return false; this.lastHit = { zone, dir: dir || null, wid, kind, amount };
    if (amount > 0) this.G.fx.wound(this, zone, dir, amount);
    this.hp -= amount; this.hitFlash = 0.15; this.coverT = 0; this.cover = null;
    if (!this.target && from && from.alive && from.team !== this.team) { this.target = from; this.engT = 0; this.reactT = this.G.diff.react * 0.6; this.lostT = 0; this.lastSeen = { x: from.x, z: from.z }; }
    const RG = this._reg; this._reg = null;
    if (RG && this.hp > 0) { this.bld = (this.bld || 0) + RG.bleed * (RG.pw || 1); this.lastFrom = from; this.lastWid = wid; if (RG.faint && !(this.faintT > 0) && Math.random() < RG.faint) { this.die(from, wid, false, zone, dir, kind, amount, RG.fmin + Math.random() * (RG.fmax - RG.fmin)); return false; } }
    if (this.hp <= 0) { this.die(from, wid, zone === 'head', zone, dir, kind, amount); return true; }
    return false;
  };
  B.die = function (from, wid, head, zone, dir, kind, amount, faintOnly) {
    const G = this.G, rng = G.rng, spec = BC.WMAP[wid];
    if (this.faintT > 0 && !faintOnly) { // já estava desmaiado: só morre (sem cair de novo)
      this.faintT = 0; this.alive = false; this.deadT = 0; this.deaths++; this.respawnT = 6 + rng() * 2; G.fx.pool(this.x, this.y, this.z, amount); G.onKill(from, this, wid, head); return;
    }
    if (faintOnly) { this.faintT = faintOnly; this.target = null; this.cover = null; this.deadT = 0; }
    else { this.alive = false; this.deadT = 0; this.deaths++; this.respawnT = 6 + rng() * 2; G.fx.pool(this.x, this.y, this.z, amount); }
    let dx = dir ? dir.x : -Math.sin(this.yaw) * -1, dz = dir ? dir.z : -Math.cos(this.yaw) * -1; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const dist = from ? Math.hypot(from.x - this.x, from.z - this.z) : 30;
    // força do impacto: depende do calibre (energia ≈ dano × √velocidade) e, nas espingardas, da distância
    let F = spec ? BC.clamp(spec.dmg * Math.sqrt((spec.v0 || 700) / 800) / 62, 0.3, 3.6) : 1.2; if (spec && spec.cls === 'shotgun') F = dist < 9 ? 2.6 : dist < 20 ? 1.6 : 0.9; if (kind === 'blast') F = 4; if (kind === 'rocket') F = 4;
    const energy = kind === 'blast' ? 4 : kind === 'bleed' ? 0 : F >= 1.9 ? 3 : F >= 1.1 ? 2 : 1;
    const side = rng() < 0.5 ? -1 : 1, px = -dz * side, pz = dx * side;
    let type;
    if (this.stn > 1.5) type = 'prone'; else if (kind === 'blast') type = 'blast'; else if (zone === 'head') type = energy >= 3 ? 'headblast' : 'headdrop'; else if (zone === 'legs') type = 'legs';
    else type = energy >= 3 ? 'knock' : energy === 2 ? 'back' : (rng() < 0.5 ? 'crumple' : 'slump');
    if (kind === 'bleed') type = 'slump'; // sangramento: cai suave, como se tivesse parado de funcionar
    let P = { knock: [1.1, 4.2, 1.45], back: [1.3, 1.8, 1.35], crumple: [1.45, 0.2, 1.25], slump: [1.35, 0.3, 1.3], headdrop: [0.8, 0.1, 1.3], headblast: [0.85, 2.6, 1.45], legs: [1.0, 0.5, 1.4], blast: [1.2, 7.5, 1.9], prone: [0.5, 0, 0] }[type];
    if (kind === 'bleed') P = [2.6, 0.02, 1.35]; else if (type !== 'prone') { P = P.slice(); P[1] *= 0.4 + F * 0.6; if (F > 2.6) P[0] *= 0.85; }
    let fx = dx, fz = dz;
    if (type === 'crumple' || type === 'headdrop') { fx = -dx * 0.8 + px * 0.3; fz = -dz * 0.8 + pz * 0.3; } else if (type === 'slump' || type === 'legs') { fx = px; fz = pz; }
    const fl = Math.hypot(fx, fz) || 1;
    this.death = { type, t: 0, dur: P[0], kn: P[1], theta: P[2], fx: fx / fl, fz: fz / fl, dx, dz, side, lx: this.x, lz: this.z, energy, flail: rng() * 6 * (kind === 'bleed' ? 0.15 : 1), legSide: side, lift: kind === 'bleed' ? 0 : F > 2.0 ? Math.min(1.1, (F - 2.0) * 0.7) : 0, F };
    if (!faintOnly) { G.onKill(from, this, wid, head); if (G.fx.deathBlood) G.fx.deathBlood(this, zone, dir, energy, amount); }
    if (BC.Audio.thud) setTimeout(() => BC.Audio.thud(Math.hypot(G.player.x - this.x, G.player.z - this.z), G.panTo(this.x, this.z)), 450 + this.death.dur * 300);
  };

  B.pickWp = function () {
    const G = this.G, w = G.world, rng = G.rng, side = this.team === 0 ? -1 : 1, H = w.play;
    if (G.hunt) { // caça: vai atrás dos animais mais próximos
      const al = G.actors.filter((a) => a.isAnimal && a.alive); if (al.length) { al.sort((p, q) => Math.hypot(p.x - this.x, p.z - this.z) - Math.hypot(q.x - this.x, q.z - this.z)); const t = al[(rng() * Math.min(3, al.length)) | 0]; this.wp = { x: t.x + (rng() - 0.5) * 12, z: t.z + (rng() - 0.5) * 12 }; this.wpT = 20; this.sprint = rng() < 0.2; return; }
    }
    if (G.points && G.points.length && rng() < 0.85) { // modos de objetivo: vai para um ponto (prefere os que o time ainda não domina)
      const mine = this.team, list = G.points.filter((q) => q.owner !== mine), pool = list.length && rng() < 0.75 ? list : G.points, q = pool[(rng() * pool.length) | 0], a = rng() * 6.28, r = Math.sqrt(rng()) * q.r * 0.8;
      this.wp = { x: q.x + Math.cos(a) * r, z: q.z + Math.sin(a) * r }; this.wpT = 25; this.sprint = rng() < 0.3; return;
    }
    let p;
    if (rng() < 0.7) p = w.randomFree(rng, -H * 0.85, H * 0.85, side > 0 ? H * 0.05 : -H * 0.8, side > 0 ? H * 0.8 : -H * 0.05, 0.7);
    else p = w.randomFree(rng, -H * 0.9, H * 0.9, -H * 0.85, H * 0.85, 0.7);
    this.wp = p; this.wpT = 30; this.sprint = rng() < 0.08;
  };

  B.visible = function (e) {
    const w = this.G.world, ex = e.x, ez = e.z, ey = e.y + (e.isPlayer ? 1.0 * (e.h / 1.78) : e.isAnimal ? e.h * 0.5 : e.isVehicle ? 1.4 : 1.1);
    return w.los(this.x, this.y + this.eyeH(), this.z, ex, ey, ez);
  };

  B.perceive = function () {
    const G = this.G; let best = null, bd = 1e9;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    for (const e of G.actors) {
      if (!e.alive || e.team === this.team || e.inVeh || (e.isVehicle && !this.atSpec) || (G.hunt && !e.isAnimal)) continue;
      const dx = e.x - this.x, dz = e.z - this.z, d = Math.hypot(dx, dz);
      const maxD = this.spec.cls === 'sniper' ? 110 : 85; if (d > maxD || d > bd) continue;
      const cosA = (dx * fx + dz * fz) / (d || 1);
      if (cosA < 0.45 && d > 9 && this.alertT <= 0 && this.target !== e) continue; // fora do campo de visão (~126°)
      if (e.isPlayer && e.sneak && d > 25) continue;
      if (!this.visible(e)) continue;
      best = e; bd = d;
    }
    if (best) {
      if (this.target !== best) { this.target = best; this.engT = 0; this.reactT = G.diff.react * (0.8 + G.rng() * 0.5); }
      this.lostT = 0; this.lastSeen = { x: best.x, z: best.z }; this.seen = true;
    } else this.seen = false;
  };

  // direção livre (evita obstáculos com raios à frente)
  B.steer = function (dx, dz) {
    const w = this.G.world, l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const probe = (ax, az) => !w.raycast(this.x, this.y + 0.55, this.z, ax, 0, az, 1.5) && !w.raycast(this.x, this.y + 1.2, this.z, ax, 0, az, 1.2);
    if (probe(dx, dz)) { this.avoidT -= 0.016; if (this.avoidT <= 0) this.avoidDir = 0; return [dx, dz]; }
    const base = Math.atan2(dz, dx), order = this.avoidDir ? [this.avoidDir, -this.avoidDir] : [1, -1];
    for (const ang of [0.7, 1.4, 2.2]) for (const s of order) {
      const a = base + ang * s, ax = Math.cos(a), az = Math.sin(a);
      if (probe(ax, az)) { this.avoidDir = s; this.avoidT = 0.8; return [ax, az]; }
    }
    return [-dx, -dz];
  };

  B.coverBad = function (e) { const c = this.cover, w = this.G.world; return w.los(e.x, e.y + 1.0, e.z, c.x, w.heightAt(c.x, c.z) + 0.95, c.z); };
  B.findCover = function (tx, tz, e) {
    const w = this.G.world, rng = this.G.rng, ty = e.y + 1.0, te = e.y + 1.6; let best = null, bd = 1e9;
    for (let i = 0; i < 14; i++) {
      const r = 3 + rng() * 11, a = rng() * 6.283, cx = this.x + Math.cos(a) * r, cz = this.z + Math.sin(a) * r;
      if (!w.isFree(cx, cz, 0.5)) continue;
      const cy = w.heightAt(cx, cz), dT = Math.hypot(tx - cx, tz - cz); if (dT < 6) continue;
      if (w.los(tx, ty, tz, cx, cy + 0.95, cz)) continue; // exposto ao inimigo
      const ux = (tx - cx) / dT, uz = (tz - cz) / dT;
      for (const s of [1, -1]) {
        const px = cx - uz * 1.4 * s, pz = cz + ux * 1.4 * s; if (!w.isFree(px, pz, 0.4)) continue;
        if (w.los(tx, te, tz, px, w.heightAt(px, pz) + 1.5, pz)) { const sc = dT + r * 0.5; if (sc < bd) { bd = sc; best = { x: cx, z: cz, px, pz }; } break; }
      }
    }
    return best;
  };

  B.update = function (dt) {
    if (this.inVeh) return;
    const G = this.G, w = G.world;
    if (!this.alive || this.faintT > 0) {
      if (this.alive) { // desmaiado: continua sangrando, leva dano e pode acordar
        this.faintT -= dt;
        if (this.bld > 0.01) { this.hp -= this.bld * dt; this.bld *= Math.exp(-0.08 * dt); if (this.hp <= 0) { this.die(this.lastFrom, this.lastWid, false, 'body', null, 'bleed', 20); return; } }
        if (this.faintT <= 0) { this.faintT = 0; this.death = null; this.hp = Math.max(this.hp, 10); this.model.root.quaternion.identity(); this.model.root.rotation.set(0, this.yaw, 0); this.stn = 1.2; this.wantStn = 1; this.bld *= 0.5; this.alertT = 2; return; }
      }
      this.deadT += dt; const m = this.model, d = this.death;
      if (this.bleed && this.bleed.length && this.deadT < 5) G.fx.bleedTick(this, dt);
      if (m && d) {
        d.t += dt; const u = Math.min(1, d.t / d.dur), e = u * u * (3 - 2 * u), TT = new T.Quaternion(), YY = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), this.yaw);
        const delay = (d.type === 'crumple' || d.type === 'slump' || d.type === 'headdrop' || d.type === 'legs') ? 0.28 : d.type === 'back' ? 0.18 : 0, uf = Math.max(0, Math.min(1, (d.t - delay) / Math.max(0.2, d.dur - delay))), ef = Math.pow(uf, 1.6) * (3 - 2 * uf);
        // empurrão do impacto (desacelera) e salto da explosão
        const kv = d.kn * Math.exp(-3.2 * d.t); const nx = this.x + d.fx * 0.0 + d.dx * kv * dt * (d.type === 'crumple' || d.type === 'slump' || d.type === 'headdrop' ? 0.2 : 1), nz = this.z + d.dz * kv * dt * (d.type === 'crumple' || d.type === 'slump' || d.type === 'headdrop' ? 0.2 : 1);
        if (Math.abs(nx) < w.play && Math.abs(nz) < w.play) { this.x = nx; this.z = nz; } this.y = w.groundAt(this.x, this.z, this.y + 0.3, 0.5);
        const lift = d.type === 'blast' ? Math.max(0, 1.1 * Math.sin(Math.PI * Math.min(1, d.t / 0.7))) : d.lift ? d.lift * Math.max(0, Math.sin(Math.PI * Math.min(1, d.t / 0.65))) : 0;
        let theta = d.theta * ef; if (d.type === 'blast') theta = d.theta * Math.min(1, d.t / d.dur) * 1.15;
        TT.setFromAxisAngle(new T.Vector3(d.fz, 0, -d.fx), Math.min(theta, 1.57 + (d.type === 'blast' ? 0.3 : 0)));
        m.root.quaternion.copy(TT).multiply(YY); const clampT = Math.min(1, theta / 1.5);
        m.root.position.set(this.x, this.y + lift + 0.14 * Math.sin(Math.min(1.5, theta)) * 1.0, this.z);
        m.body.rotation.set(0, 0, 0); m.body.position.set(0, 0, 0);
        // membros: joelhos dobram, braços caem, cabeça pende
        const bu = Math.min(1, d.t / 0.45), buck = (d.type === 'crumple' || d.type === 'slump' || d.type === 'headdrop') ? E_(bu) : (d.type === 'legs' ? E_(Math.min(1, d.t / 0.25)) : 0);
        const fl = Math.sin(d.t * 9 + d.flail) * (1 - u) * (d.type === 'knock' || d.type === 'blast' ? 0.9 : 0.35);
        m.legL.rotation.x = 1.0 * buck + fl * 0.6 + (d.type === 'legs' && d.legSide > 0 ? 0.2 : 0.7 * clampT * (d.type === 'legs' ? 0 : 1)); m.legR.rotation.x = 1.0 * buck - fl * 0.6 + (d.type === 'legs' && d.legSide < 0 ? 0.2 : 0.4 * clampT * (d.type === 'legs' ? 0 : 1));
        m.kneeL.rotation.x = -1.7 * buck - 0.3 * clampT + (d.type === 'legs' && d.legSide > 0 ? -1.8 * E_(Math.min(1, d.t / 0.3)) : 0); m.kneeR.rotation.x = -1.7 * buck - 0.5 * clampT + (d.type === 'legs' && d.legSide < 0 ? -1.8 * E_(Math.min(1, d.t / 0.3)) : 0);
        m.armsG.rotation.x = -0.9 * clampT + fl * 0.5; m.armsG.rotation.z = fl * 0.4; m.up.rotation.x = 0.25 * buck + (d.type === 'headblast' ? -0.3 : 0); m.up.rotation.z = fl * 0.1;
        m.head.rotation.x = (d.type === 'headblast' ? -0.9 : d.type === 'headdrop' ? 0.5 : (d.dx * d.fx + d.dz * d.fz) > 0 ? -0.5 : 0.5) * Math.min(1, d.t / 0.3); m.head.rotation.z = 0.25 * d.side * clampT;
        if (d.t > 0.6 && !d.landed && theta > 1.3) { d.landed = true; G.fx.puff(this.x, this.y + 0.1, this.z, BC.SURF[w.surf] || 0x777777, 4, 1.2, 0.5, 0.5); }
        if (!this.alive && this.deadT > 14) m.root.visible = false;
      }
      if (!this.alive) { this.respawnT -= dt; if (this.respawnT <= 0 && G.running) this.spawn(); }
      return;
    }
    const diff = G.diff;
    this.percT -= dt; this.alertT -= dt; this.hitFlash = Math.max(0, (this.hitFlash || 0) - dt);
    if (this.blindT > 0) { this.blindT -= dt; this.seen = false; this.target = null; this.pause = 0.4; this.percT = 0.2; }
    if (this.percT <= 0) {
      this.percT = 0.22 + G.rng() * 0.1; this.perceive();
      if (BC.Gren && BC.Gren.list.length && !this.flee) for (const g of BC.Gren.list) { const gd = Math.hypot(g.p.x - this.x, g.p.z - this.z); if (gd < 9 && g.type !== 'smoke' && g.t > 0.4) { const l = gd || 1; this.flee = { dx: (this.x - g.p.x) / l, dz: (this.z - g.p.z) / l, t: 2.4 }; break; } }
    }
    if (this.bleed.length) G.fx.bleedTick(this, dt);
    if (this.bld > 0.01) { this.hp -= this.bld * dt; this.bld *= Math.exp(-0.08 * dt); if (this.hp <= 0) { this.die(this.lastFrom, this.lastWid, false, 'body', null, 'bleed', 20); return; } }
    if (this.target && (!this.target.alive)) { this.target = null; this.lostT = 99; }
    if (!this.seen) this.lostT += dt;
    if (this.target && this.lostT > 4) { this.target = null; }

    let wx = 0, wz = 0, speed = 2.6 * diff.speed, wantYaw = this.yaw, wantPitch = 0, moving = false, want = 0;
    const spec = this.spec;
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.mag = spec.mag; }

    if (this.target) {
      const e = this.target, tx = this.seen ? e.x : this.lastSeen.x, tz = this.seen ? e.z : this.lastSeen.z;
      const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
      wantYaw = Math.atan2(-dx, -dz); this.engT += dt;
      this.grenT -= dt;
      if (this.gren && this.grenT <= 0 && ((!this.seen && this.lostT > 0.4 && d > 10 && d < 38) || (this.seen && d > 14 && d < 32 && this.phase === 'hide' && G.rng() < 0.02))) this.throwGren(tx, tz, e.y);
      const eyeY = this.y + this.eyeH(), ty = e.y + (e.isPlayer ? 1.0 * (e.h / 1.78) : e.isAnimal ? e.h * 0.5 : e.isVehicle ? 1.4 : 1.15);
      wantPitch = BC.clamp(Math.atan2(ty - eyeY, d), -0.6, 0.6);
      const pref = PREF[spec.cls], fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      this.coverT -= dt; this.phT -= dt;
      const threatened = this.seen || this.lostT < 3;
      if (threatened && this.coverT <= 0) {
        this.coverT = 0.8;
        if (!this.cover || this.coverBad(e)) { this.cover = this.findCover(tx, tz, e); this.phase = this.cover ? 'go' : 'hold'; this.phT = 0; }
      }
      if (!this.seen && this.lostT > 1.5) this.cover = null; // perdeu o alvo: avança com cautela
      if (this.cover) {
        const c = this.cover;
        if (this.phase === 'go') { wx = c.x - this.x; wz = c.z - this.z; speed = 4.8; if (Math.hypot(wx, wz) < 0.7) { this.phase = 'hide'; this.phT = 0.4 + G.rng() * 0.9; this.proneHide = G.rng() < 0.22; } }
        else if (this.phase === 'hide') {
          want = this.proneHide ? 2 : 1;
          if (this.phT <= 0) {
            if (this.mag < spec.mag * 0.45 && this.reloadT <= 0) { this.reloadT = spec.cls === 'shotgun' ? 3 : 2.6; this.phT = this.reloadT + 0.2; }
            else { this.phase = 'peek'; this.phT = 1.6 + G.rng() * 1.6; }
          }
        } else if (this.phase === 'peek') {
          wx = c.px - this.x; wz = c.pz - this.z; speed = 2.0; if (Math.hypot(wx, wz) < 0.25) { wx = wz = 0; }
          if (this.phT <= 0) { this.phase = 'hide'; this.phT = 0.7 + G.rng() * 1.3; }
        }
      } else if (this.seen) { // sem abrigo: para e atira (ajoelhado de longe); avança em lances curtos
        want = d > 28 ? 1 : 0; if (spec.cls === 'sniper' && d > 45) want = 2;
        if (d > pref + 14) { if (this.phT <= 0 && this.phase !== 'adv') { this.phase = 'adv'; this.phT = 1.0 + G.rng(); } }
        if (this.phase === 'adv' && this.phT > 0) { wx = fx; wz = fz; speed = 2.8; want = 0; } else if (this.phase === 'adv') { this.phase = 'hold'; this.phT = 1 + G.rng() * 1.5; }
        if (d < pref - 8) { wx = -fx; wz = -fz; speed = 1.8; want = 0; }
      } else if (d > 3) { wx = fx; wz = fz; speed = 2.8; } else this.target = null;
      // dispara (só parado ou quase)
      this.fireT -= dt;
      const dyaw = Math.abs(((wantYaw - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (this.seen && !this.flee && this.engT >= this.reactT && dyaw < 0.12 && this.reloadT <= 0 && this.fireT <= 0 && this.phase !== 'go') {
        const maxR = e.isVehicle ? 140 : spec.cls === 'shotgun' ? 28 : (spec.cls === 'pistol' || spec.cls === 'revolver') ? 40 : spec.cls === 'smg' ? 65 : 100;
        if (d < maxR) this.shoot(e, d);
      }
    } else {
      // patrulha cautelosa: anda, para e observa
      this.phase = 'patrol'; this.cover = null;
      if (this.pause > 0) { this.pause -= dt; wantYaw = this.yaw + Math.sin(G.time * 0.8 + this.idx) * 0.7; }
      else {
        if (!this.wp || (Math.hypot(this.wp.x - this.x, this.wp.z - this.z) < 2.2)) { if (this.wp && G.rng() < 0.55) this.pause = 1.2 + G.rng() * 3; this.pickWp(); }
        this.wpT -= dt; if (this.wpT <= 0) this.pickWp();
        const dx = this.wp.x - this.x, dz = this.wp.z - this.z; wantYaw = Math.atan2(-dx, -dz);
        wx = dx; wz = dz; speed = (this.sprint ? 4.6 : 2.5) * diff.speed;
      }
      this.stuckT += dt;
      if (this.stuckT > 1.8) { if (Math.hypot(this.x - this.sx, this.z - this.sz) < 0.5 && this.pause <= 0) { this.pickWp(); this.avoidDir = G.rng() < 0.5 ? 1 : -1; this.avoidT = 1.2; } this.sx = this.x; this.sz = this.z; this.stuckT = 0; }
    }
    if (this.flee && this.flee.t > 0) { this.flee.t -= dt; wx = this.flee.dx; wz = this.flee.dz; speed = 5.4; want = 0; this.cover = null; } else this.flee = null;
    if (this.blindT > 0) want = Math.max(want, 1);
    this.wantStn = want; this.stn += BC.clamp(want - this.stn, -2.4 * dt, 2.4 * dt);
    this.crouch = Math.min(this.stn, 1); this.prone = Math.max(0, this.stn - 1); this.h = 1.78 - 0.5 * this.crouch - 0.75 * this.prone;
    speed *= 1 - 0.42 * this.crouch - 0.38 * this.prone;

    // giro suave
    let dy = wantYaw - this.yaw; dy = ((dy + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const turn = (this.target ? 7.5 : 4.5) * dt; this.yaw += BC.clamp(dy, -turn, turn);
    this.pitch += (wantPitch - this.pitch) * Math.min(1, 8 * dt);
    if (wx || wz) {
      const s = this.steer(wx, wz); wx = s[0]; wz = s[1]; moving = true;
      if (this.inWater) speed *= 0.62;
    }
    BC.moveActor(this, moving ? wx : 0, moving ? wz : 0, moving ? speed : 0, dt, w, false);

    // animação
    const sp = Math.hypot(this.vx, this.vz), m = this.model;
    this.walkPh += sp * dt * 2.0;
    const amp = Math.min(1, sp / 3.5) * 0.75;
    const pd = Math.hypot(G.player.x - this.x, G.player.z - this.z);
    m.root.visible = pd < 280; const far = pd > 70;
    if (m._far !== far) { m._far = far; m.root.traverse((o) => { if (o.isMesh) o.castShadow = !far; }); }
    m.root.position.set(this.x, this.y + (this.inWater ? -0.25 : 0) + m.api.lift, this.z); m.root.rotation.set(0, this.yaw, 0);
    if (pd < 150 || ((G.frame || 0) + this.idx) % 3 === 0) m.pose(this.walkPh, amp, this.stn, G.time + this.idx, BC.clamp(this.pitch, -0.5, 0.5), sp > 0.3 ? 1 : 0);
    // passos audíveis
    this.stepAcc = (this.stepAcc || 0) + sp * dt;
    if (this.stepAcc > 1.9) {
      this.stepAcc = 0; const P = G.player, d = Math.hypot(P.x - this.x, P.z - this.z);
      if (d < 24 && sp > 2) BC.Audio.step(BC.stepSurf(this, this.inWater), this.crouch > 0.5 ? 0.35 : 0.7, d, G.panTo(this.x, this.z));
    }
  };

  B.shoot = function (e, d) {
    const G = this.G, spec = this.spec, diff = G.diff, rng = G.rng;
    if (e.isVehicle) { // soldado antitanque: dispara foguete no blindado
      if (!this.atSpec || this.atAmmo <= 0) { this.fireT = 3; return; }
      const eye = { x: this.x, y: this.y + this.eyeH(), z: this.z }, tx = e.x, ty = e.y + 1.4, tz = e.z; let dx = tx - eye.x, dy = ty - eye.y, dz = tz - eye.z; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      const er = BC.rad(2 + l / 70), a = rng() * 6.283, r = Math.sqrt(rng()) * er; dy += Math.sin(a) * r + 0.012 * l / 20; dx += Math.cos(a) * r * (-dz); dz += Math.cos(a) * r * dx * 0.2;
      const il = Math.hypot(dx, dy, dz); BC.Rockets.launch(this, { x: eye.x + dx * 1.2, y: eye.y + dy * 1.2 - 0.1, z: eye.z + dz * 1.2 }, { x: dx / il, y: dy / il, z: dz / il }, this.atSpec);
      this.atAmmo--; this.fireT = 5 + rng() * 3; if (this.atAmmo <= 0) { this.reloadT = 0; } return;
    }
    const interval = 60 / spec.rpm;
    const sem = !spec.auto;
    const eye = { x: this.x, y: this.y + this.eyeH(), z: this.z };
    const ty = e.y + (e.isPlayer ? 1.0 * (e.h / 1.78) : e.isAnimal ? e.h * 0.5 : e.isVehicle ? 1.4 : 1.12) + (!e.isAnimal && rng() < 0.08 ? 0.45 : 0);
    let dx = e.x - eye.x, dy = ty - eye.y, dz = e.z - eye.z; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    // erro de pontaria: maior no início do engajamento, com distância e em movimento
    const moving = Math.hypot(this.vx, this.vz) > 1;
    const errDeg = diff.err * (1 + d / 45) * (1 + Math.max(0, 1.1 - this.engT) * 1.4) * (moving ? 1.8 : 1) * (1 - 0.25 * this.crouch) * (spec.cls === 'sniper' ? 0.7 : 1) * ((spec.cls === 'pistol' || spec.cls === 'revolver') ? 1.2 : 1);
    const m = this.model; m.root.updateMatrixWorld(true);
    const mp = new T.Vector3(); m.muzzle.getWorldPosition(mp);
    const pel = spec.pellets;
    for (let p = 0; p < pel; p++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * BC.rad(errDeg + (pel > 1 ? spec.pelletCone : 0));
      // base ortonormal
      let ux = -dz, uz = dx, ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; // direita
      const ox = dx + (ux * Math.cos(a)) * r, oz = dz + (uz * Math.cos(a)) * r, oy = dy + Math.sin(a) * r;
      const ol = Math.hypot(ox, oy, oz);
      G.fire(this, eye, { x: ox / ol, y: oy / ol, z: oz / ol }, spec, diff.dmg, mp, p === 0);
    }
    G.noise(this.x, this.z, this.team, spec.sup ? 14 : spec.cls === 'sniper' ? 75 : 55);
    BC.Audio.shot(spec.snd, Math.hypot(G.player.x - this.x, G.player.z - this.z), G.panTo(this.x, this.z), false, spec.sndRate, spec.sup);
    this.mag--;
    // cadência: rajadas
    if (spec.cls === 'shotgun') this.fireT = 0.9 + rng() * 0.5;
    else if (spec.cls === 'sniper') this.fireT = (spec.rpm < 100 ? 1.5 : 1.1) + rng() * 0.7;
    else if (sem) this.fireT = 0.3 + rng() * 0.3;
    else { this.burst++; const n = 2 + ((rng() * 3) | 0); if (this.burst >= n) { this.burst = 0; this.fireT = 0.5 + rng() * 0.7; } else this.fireT = interval; }
    if (this.mag <= 0) { this.reloadT = spec.cls === 'shotgun' ? 3 : 2.6; this.fireT = 0.2; }
  };
})();
