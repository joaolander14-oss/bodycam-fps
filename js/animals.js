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
    const proto = BC.animalProto && BC.animalProto[id];
    if (proto) { this.model = proto.make(); this.r = Math.max(0.2, proto.w * 0.45); this.h = Math.max(0.3, proto.h); } else this.model = build(sp);
    G.scene.add(this.model);
  };
  const A = BC.Animal.prototype;
  const sv0 = (a) => Math.hypot(a.vx, a.vz);
  A.damage = function (amount, zone, from, wid) {
    if (!this.alive) return false; this.hp -= amount; this.hurtT = 0.2;
    this.lastAtk = from; if (this.sp.aggr) this.angry = 10; else this.fleeT = 6;
    if (this.hp <= 0) { this.alive = false; this.deadT = 0; if (BC.Modes) BC.Modes.animalKilled(this, from); return true; }
    return false;
  };
  A.update = function (dt) {
    const G = this.G, w = G.world, P = G.player, sp = this.sp, m = this.model;
    if (!this.alive) {
      this.deadT += dt; const u = Math.min(1, this.deadT / 0.5);
      if (m.userData.mixer) { if (!this.deathPlayed) { this.deathPlayed = true; const dn = m.userData.acts.Death; if (dn) { m.userData.cur && m.userData.cur.fadeOut(0.1); dn.reset().setLoop(T.LoopOnce, 1); dn.clampWhenFinished = true; dn.fadeIn(0.1).play(); m.userData.hasDeath = true; } } m.userData.mixer.update(dt); if (m.userData.hasDeath) { m.rotation.set(0, this.yaw, 0); m.position.set(this.x, this.y, this.z); if (this.deadT > 40) m.visible = false; return; } }
      m.rotation.set(0, this.yaw, (sp.type === 'snake' ? 0 : 1.5) * u * (this.yaw > 3 ? 1 : -1), 'YXZ'); m.position.set(this.x, this.y + (sp.type === 'snake' ? 0 : 0.2 * u), this.z);
      if (this.deadT > 40) m.visible = false; return;
    }
    this.cd -= dt; this.angry = Math.max(0, this.angry - dt); this.fleeT = Math.max(0, this.fleeT - dt); this.hurtT = Math.max(0, (this.hurtT || 0) - dt);
    // alvo: o ator vivo mais próximo que o animal realmente enxerga (sem paredes) e alcança (sem estar muito acima/abaixo)
    this.tT = (this.tT || 0) - dt; let near = null, nd = 1e9;
    if (this.tT <= 0) {
      this.tT = 0.25; let tg = null, td = 1e9;
      for (const e of G.actors) {
        if (!e.alive || e.isAnimal || e.team < 0) continue; const dd = Math.hypot(e.x - this.x, e.z - this.z); if (dd > 34 || dd > td) continue;
        if (Math.abs(e.y - this.y) > 2.2 || !w.los(this.x, this.y + 0.5, this.z, e.x, e.y + 1.0, e.z)) continue; td = dd; tg = e;
      }
      if (!tg && this.angry > 0 && this.lastAtk && this.lastAtk.alive && !this.lastAtk.isAnimal && Math.abs(this.lastAtk.y - this.y) < 2.2 && w.los(this.x, this.y + 0.5, this.z, this.lastAtk.x, this.lastAtk.y + 1.0, this.lastAtk.z)) tg = this.lastAtk;
      this.tgt = tg;
    }
    const tgt = this.tgt && this.tgt.alive ? this.tgt : null;
    for (const e of G.actors) { if (!e.alive || e.isAnimal || e.team < 0) continue; const dd = Math.hypot(e.x - this.x, e.z - this.z); if (dd < nd) { nd = dd; near = e; } }
    let wx = 0, wz = 0, speed = 0;
    if (sp.aggr && tgt) {
      const dx = tgt.x - this.x, dz = tgt.z - this.z, d = Math.hypot(dx, dz) || 1; this.yaw = Math.atan2(-dx, -dz);
      if (d > 1.5) { wx = dx / d; wz = dz / d; speed = sp.sp * 1.7; }
      else if (this.cd <= 0 && Math.abs(tgt.y - this.y) < 1.6) { this.cd = 1.2; if (tgt.isPlayer) G.hurtPlayer(sp.dmg, { x: this.x, z: this.z, team: -2, alive: true, name: sp.n, isAnimal: true }, 'body', 'animal'); else tgt.damage(sp.dmg, 'body', this, 'animal', { x: dx / d, y: 0, z: dz / d }, null); }
    } else if (!sp.aggr && near && (nd < 16 || this.fleeT > 0)) {
      const dx = near.x - this.x, dz = near.z - this.z, d = Math.hypot(dx, dz) || 1; wx = -dx / d; wz = -dz / d; speed = sp.fl; this.yaw = Math.atan2(-wx, -wz);
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
    const ud = m.userData;
    if (ud.mixer) {
      const want = sv0(this) > 4.2 && ud.acts.Gallop ? 'Gallop' : sv0(this) > 0.5 && ud.acts.Walk ? 'Walk' : ud.acts.Idle ? 'Idle' : null, cur = ud.curName;
      if (want && want !== cur) { const n = ud.acts[want]; n.reset().fadeIn(0.2).play(); if (ud.cur) ud.cur.fadeOut(0.2); ud.cur = n; ud.curName = want; }
      if (ud.cur) ud.cur.timeScale = want === 'Walk' ? Math.max(0.6, sv0(this) / 1.6) : 1;
      ud.mixer.update(dt);
    } else if (ud.wrap) { const k = Math.min(1, sv0(this) / 1.5); ud.wrap.rotation.z = Math.sin(this.ph) * 0.06 * k; ud.wrap.position.y = (ud.base || 0) + Math.abs(Math.sin(this.ph * 2)) * 0.05 * k; if (sp.type === 'snake') ud.wrap.rotation.y = (ud.rot || 0) + Math.sin(this.ph * 1.5) * 0.25 * k; }
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
  // ---- modelos 3D (Quaternius CC0 e Poly by Google CC-BY) ----
  const FILES = { camel: ['camel_a', 2.6], snake: ['cobra_b', 1.5], scorpion: ['scorpion', 0.55], fox: ['Fox', 0.95], wolf: ['Wolf', 1.35], bear: ['bear_b', 1.9], polar: ['bear_b', 2.1, 0xf2f4f4], deer: ['Deer', 1.8], boar: ['boar', 1.3], croc: ['alligator', 3.2], jaguar: ['jaguar', 1.6], goat: ['ibex', 1.25], capy: ['capybara', 1.05], rabbit: ['rabbit_b', 0.42] };
  const FLIP = { rabbit: true }; // espécies cujo modelo olha para o lado oposto ao padrão
  BC.animalProto = {};
  function measure(obj, mat) {
    obj.updateMatrixWorld(true); const box = new T.Box3(), v = new T.Vector3();
    obj.traverse((o) => {
      if (!o.isMesh) return; const pos = o.geometry.attributes.position;
      if (o.isSkinnedMesh) o.skeleton.update();
      for (let i = 0; i < pos.count; i += (pos.count > 6000 ? 3 : 1)) { v.fromBufferAttribute(pos, i); if (o.isSkinnedMesh) o.boneTransform(i, v); v.applyMatrix4(o.matrixWorld).applyMatrix4(mat); box.expandByPoint(v); }
    });
    return box;
  }
  function prep(id, scene, clips) {
    const [, len, tint] = FILES[id]; const base = SkeletonUtilsClone(scene);
    // eixo mais longo vira o eixo Z (frente = -Z)
    const raw = measure(scene, new T.Matrix4()), sz = raw.getSize(new T.Vector3()), longX = sz.x > sz.z;
    let rot = longX ? -Math.PI / 2 : Math.PI; if (FLIP[id]) rot += Math.PI;
    const R = new T.Matrix4().makeRotationY(rot), b1 = measure(scene, R), s = len / Math.max(0.001, b1.getSize(new T.Vector3()).z);
    const M = new T.Matrix4().makeScale(s, s, s).multiply(R), b2 = measure(scene, M), c = b2.getCenter(new T.Vector3()), size = b2.getSize(new T.Vector3());
    const off = new T.Vector3(-c.x, -b2.min.y, -c.z);
    BC.animalProto[id] = {
      w: size.x, h: size.y,
      make() {
        const g = new T.Group(), wrap = new T.Group(), inst = SkeletonUtilsClone(scene); wrap.add(inst); wrap.rotation.y = rot; wrap.scale.setScalar(s); wrap.position.copy(off); g.add(wrap);
        inst.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); if (o.material.metalness !== undefined) { o.material.metalness = 0; o.material.roughness = 1; } if (o.material.color && !o.material.map && !o.material.vertexColors) { const c = o.material.color, lum = c.r + c.g + c.b; if (lum < 0.2 && lum > 0.004) c.lerp(new T.Color(0x9a9080), Math.min(0.75, (0.2 - lum) / 0.2 * 0.8)); else if (lum <= 0.004) c.lerp(new T.Color(0x8a8272), 0.55); }
        if (o.material.emissive) { o.material.emissive.copy(o.material.color || new T.Color(0x222222)).multiplyScalar(0.18); } if (tint) { o.material.color.setHex(tint); o.material.emissive.setHex(0x303030); } } });
        g.userData.wrap = wrap; g.userData.base = off.y; g.userData.rot = rot;
        if (clips && clips.length) {
          const mixer = new T.AnimationMixer(inst), acts = {}; for (const cl of clips) { const nm = cl.name.split('|').pop(); acts[nm] = mixer.clipAction(cl); }
          if (!acts.Walk) { const k = Object.keys(acts).find((n) => /run|walk/i.test(n)); if (k) acts.Walk = acts[k]; }
          g.userData.mixer = mixer; g.userData.acts = acts; mixer.update(Math.random() * 2);
        }
        return g;
      }
    };
  }
  function SkeletonUtilsClone(o) { return (T.SkeletonUtils && T.SkeletonUtils.clone) ? T.SkeletonUtils.clone(o) : o.clone(true); }
  BC.loadAnimals = function () {
    const ids = Object.keys(FILES), loader = new T.GLTFLoader();
    return Promise.all(ids.map((id) => new Promise((res) => loader.load('models/animals/' + FILES[id][0] + '.glb', (g) => { try { prep(id, g.scene, g.animations); } catch (e) { console.warn('animal', id, e); } res(); }, undefined, () => res()))));
  };
  BC.animalList = (mapId) => BIOME[mapId] || BIOME._;
})();
