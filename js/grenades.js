// Granadas: fragmentação M67, luz e som M84 (flashbang) e fumaça M18. Física com quique, estouro, cegueira, fumaça que bloqueia a visão.
(function () {
  const T = THREE, BC = window.BC;
  BC.GREN = {
    frag: { name: 'Granada de fragmentação M67', short: 'M67', fuse: 3.5, h: 0.095 },
    flash: { name: 'Granada de luz e som M84', short: 'M84', fuse: 2.0, h: 0.13 },
    smoke: { name: 'Granada de fumaça M18', short: 'M18', fuse: 1.8, h: 0.145 }
  };
  BC.GREN_MODEL = {};
  const STEEL = 0x9aa0a6, COL = { frag: 0x4b5232, flash: 0x303338, smoke: 0x5a6650 };

  // monta os 3 modelos a partir do pacote (pool2 #15), agrupando as peças por posição em X
  BC.loadGrenades = async function () {
    try {
      const man = await (await fetch('models/pool2/manifest.json')).json();
      const gltf = await new Promise((res, rej) => new T.GLTFLoader().load('models/pool2/' + man[15], res, undefined, rej));
      gltf.scene.updateMatrixWorld(true); const groups = { flash: [], frag: [], smoke: [] };
      gltf.scene.traverse((m) => {
        if (!m.isMesh || /Plane/.test(m.name)) return; const b = new T.Box3().setFromObject(m), cx = b.getCenter(new T.Vector3()).x, sz = b.getSize(new T.Vector3());
        let g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); if (g.index) g = g.toNonIndexed();
        const big = m.geometry.attributes.position.count > 1000 || sz.y > 1.8;
        groups[cx < -1.2 ? 'flash' : cx > 1.2 ? 'smoke' : 'frag'].push({ geo: g, big });
      });
      for (const k in groups) {
        const list = groups[k], box = new T.Box3(); list.forEach((e) => { e.geo.computeBoundingBox(); box.union(e.geo.boundingBox); });
        const c = box.getCenter(new T.Vector3()), s = BC.GREN[k].h / (box.max.y - box.min.y), grp = new T.Group();
        for (const e of list) {
          const g = e.geo; g.translate(-c.x, -c.y, -c.z); g.scale(s, s, s); if (!g.attributes.normal) g.computeVertexNormals();
          const col = new Float32Array(g.attributes.position.count * 3), cc = new T.Color(e.big ? COL[k] : STEEL); for (let i = 0; i < col.length; i += 3) { col[i] = cc.r; col[i + 1] = cc.g; col[i + 2] = cc.b; }
          g.setAttribute('color', new T.BufferAttribute(col, 3)); grp.add(new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: e.big ? 0.15 : 0.7 })));
        }
        BC.GREN_MODEL[k] = grp;
      }
    } catch (e) { console.warn('granadas (fallback procedural)', e); }
    for (const k in BC.GREN) if (!BC.GREN_MODEL[k]) { // procedural
      const g = new T.Group(), h = BC.GREN[k].h; g.add(new T.Mesh(k === 'frag' ? new T.SphereGeometry(0.032, 14, 10) : new T.CylinderGeometry(0.03, 0.03, h, 14), new T.MeshStandardMaterial({ color: COL[k], roughness: 0.6 }))); BC.GREN_MODEL[k] = g;
    }
  };
  BC.grenMesh = (type) => BC.GREN_MODEL[type].clone(true);

  const G3 = () => BC.G;
  // ---- estado ----
  const gl = BC.Gren = { list: [], boomLight: null, smokeSprites: [], smokeTex: null };
  gl.init = function (scene) {
    gl.scene = scene;
    gl.boomLight = new T.PointLight(0xffb060, 0, 60); scene.add(gl.boomLight);
    gl.smokeTex = BC.canvasTex(64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, false);
    gl.smokeSprites = []; for (let i = 0; i < 520; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: gl.smokeTex, transparent: true, depthWrite: false, color: 0xdddddd, opacity: 0 })); sp.visible = false; scene.add(sp); gl.smokeSprites.push({ s: sp, life: 0, max: 1, v: new T.Vector3(), size: 1 }); }
    gl.si = 0; gl.list = []; gl.smokes = []; gl.boomT = 0;
  };
  gl.clear = function () { for (const g of gl.list) if (g.mesh) gl.scene.remove(g.mesh); gl.list = []; gl.smokes = []; for (const p of gl.smokeSprites) { p.life = 0; p.s.visible = false; } };

  // lança uma granada de 'owner' (ator) em pos com velocidade vel
  gl.throwG = function (owner, type, pos, vel) {
    const g = { type, owner, p: pos.clone(), v: vel.clone(), t: 0, fuse: BC.GREN[type].fuse, mesh: BC.grenMesh(type), rest: false, spin: new T.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12) };
    g.mesh.position.copy(g.p); gl.scene.add(g.mesh); gl.list.push(g); return g;
  };

  gl.update = function (dt) {
    const G = G3(), w = G.world; if (!w) return;
    for (let i = gl.list.length - 1; i >= 0; i--) {
      const g = gl.list[i]; g.t += dt;
      if (!g.rest) {
        g.v.y -= 9.8 * dt; g.v.multiplyScalar(1 - 0.12 * dt);
        const sp = g.v.length(), dist = sp * dt;
        if (dist > 1e-5) {
          const dx = g.v.x / sp, dy = g.v.y / sp, dz = g.v.z / sp, h = w.raycast(g.p.x, g.p.y, g.p.z, dx, dy, dz, dist + 0.04);
          if (h && h.t <= dist + 0.04) {
            g.p.x += dx * Math.max(0, h.t - 0.035); g.p.y += dy * Math.max(0, h.t - 0.035); g.p.z += dz * Math.max(0, h.t - 0.035);
            const nx = h.nx, ny = h.ny, nz = h.nz, vn = g.v.x * nx + g.v.y * ny + g.v.z * nz; const e = 0.4;
            g.v.x -= (1 + e) * vn * nx; g.v.y -= (1 + e) * vn * ny; g.v.z -= (1 + e) * vn * nz; const f = ny > 0.5 ? 0.72 : 0.9; g.v.x *= f; g.v.z *= f;
            if (Math.abs(vn) > 2.5) BC.Audio.metal(0.35, 900 + Math.random() * 500);
            if (ny > 0.6 && g.v.length() < 1.6) { g.rest = true; g.v.set(0, 0, 0); }
            if (h.tag === 'water') { g.rest = true; g.v.set(0, 0, 0); }
          } else { g.p.x += g.v.x * dt; g.p.y += g.v.y * dt; g.p.z += g.v.z * dt; }
        }
        g.mesh.rotation.x += g.spin.x * dt * Math.min(1, g.v.length() / 6); g.mesh.rotation.y += g.spin.y * dt * Math.min(1, g.v.length() / 6); g.mesh.rotation.z += g.spin.z * dt * Math.min(1, g.v.length() / 6);
      }
      g.mesh.position.copy(g.p);
      if (g.t >= g.fuse) { gl.explode(g); gl.scene.remove(g.mesh); gl.list.splice(i, 1); }
    }
    for (const sm of gl.smokes) { sm.t += dt; sm.r = Math.min(sm.rmax, sm.r + dt * 3.2); if (sm.t > sm.life - 4) sm.r *= Math.pow(0.5, dt); if (sm.t < 6 && ((sm.acc = (sm.acc || 0) + dt) > 0.05)) { sm.acc = 0; for (let k = 0; k < 3; k++) gl.puffSmoke(sm); } }
    gl.smokes = gl.smokes.filter((s) => s.t < s.life); G.world.smokes = gl.smokes;
    for (const p of gl.smokeSprites) { if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; } const k = 1 - p.life / p.max; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - 0.35 * dt); const sc = p.size * (0.5 + k * 0.9); p.s.scale.set(sc, sc, 1); p.s.material.opacity = 0.78 * Math.min(1, p.life / 3) * Math.min(1, k * 5 + 0.2); }
    if (gl.boomT > 0) { gl.boomT -= dt; gl.boomLight.intensity = Math.max(0, gl.boomT * 40); }
  };
  gl.puffSmoke = function (sm) {
    const p = gl.smokeSprites[gl.si++ % gl.smokeSprites.length], a = Math.random() * 6.28, r = Math.random() * sm.r * 0.7;
    p.s.position.set(sm.x + Math.cos(a) * r, sm.y + Math.random() * sm.r * 0.6, sm.z + Math.sin(a) * r); p.v.set((Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.7, (Math.random() - 0.5) * 1.2);
    p.size = 5 + Math.random() * 5; p.max = p.life = 16 + Math.random() * 6; p.s.material.color.setHex(Math.random() < 0.5 ? 0xe6e6e6 : 0xcfcfcf); p.s.visible = true;
  };

  gl.explode = function (g) {
    const G = G3(), w = G.world, p = g.p, P = G.player, fx = G.fx;
    const dP = Math.hypot(P.x - p.x, P.y + 1.2 - p.y, P.z - p.z), pan = G.panTo(p.x, p.z);
    if (g.type === 'smoke') {
      gl.smokes.push({ x: p.x, y: p.y + 0.4, z: p.z, r: 0.5, rmax: 6.8, t: 0, life: 26 });
      BC.Audio.pop && BC.Audio.pop(dP, pan); fx.puff(p.x, p.y + 0.3, p.z, 0xdddddd, 6, 3, 1.4, 1.2); return;
    }
    if (g.type === 'flash') {
      gl.boomT = 0.25; gl.boomLight.position.copy(p); gl.boomLight.intensity = 14; fx.flash(p, 7);
      BC.Audio.bang && BC.Audio.bang(dP, pan);
      for (const a of G.actors) {
        if (!a.alive || a.inVeh) continue; const cy = a.y + 1.3, d = Math.hypot(a.x - p.x, cy - p.y, a.z - p.z); if (d > 26) continue;
        const los = w.los(p.x, p.y + 0.2, p.z, a.x, cy, a.z); if (!los && d > 4) continue;
        let face = 0.35; const fx_ = -Math.sin(a.yaw), fz_ = -Math.cos(a.yaw), dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz) || 1; face = Math.max(0.3, (fx_ * dx + fz_ * dz) / l * 0.5 + 0.5);
        const amount = (1 - d / 26) * 6.5 * face * (los ? 1 : 0.4);
        if (a.isPlayer) { G.glitch = Math.max(G.glitch, Math.min(1.5, amount * 0.35)); G.blind = Math.max(G.blind || 0, amount); G.blindMax = G.blind; BC.Audio.ring && BC.Audio.ring(amount * 0.8); } else { a.blindT = Math.max(a.blindT || 0, amount); a.target = null; }
      }
      return;
    }
    // fragmentação
    gl.boomT = 0.3; gl.boomLight.position.copy(p); gl.boomLight.intensity = 12;
    fx.flash(p, 5.5); fx.flash({ x: p.x, y: p.y + 0.4, z: p.z }, 3.5);
    fx.puff(p.x, p.y + 0.4, p.z, 0x3a3631, 10, 5, 3.4, 1.6, 1.4); fx.puff(p.x, p.y + 0.2, p.z, 0x8a8070, 14, 7, 2.6, 1.3);
    const col = (BC.SURF[w.surf] || 0x666666); fx.debris(p.x, p.y + 0.1, p.z, col, 32, 9, 0, 1, 0);
    BC.Audio.boom && BC.Audio.boom(dP, pan);
    if (dP < 40) G.shake = Math.max(G.shake || 0, Math.min(1.4, 14 / (dP + 3)));
    if (dP < 10 && P.alive) BC.Audio.ring && BC.Audio.ring((1 - dP / 10) * 4);
    const R = 15;
    for (const a of G.actors) {
      if (!a.alive || (a.inVeh && !a.isVehicle)) continue; const cy = a.y + (a.isPlayer ? a.eyeY * 0.8 : 1.0), d = Math.hypot(a.x - p.x, cy - p.y, a.z - p.z); if (d > R) continue;
      let k = Math.pow(1 - d / R, 2); const los = w.los(p.x, p.y + 0.25, p.z, a.x, cy, a.z); if (!los) { if (d > 5) continue; k *= 0.3; }
      const dmg = 230 * k; if (dmg < 3) continue; const dx = a.x - p.x, dz = a.z - p.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, y: 0.3, z: dz / l };
      if (a.isPlayer) G.hurtPlayer(dmg, { x: p.x, z: p.z, team: g.owner ? g.owner.team : -1, alive: true, name: 'Granada', isGrenade: true }, 'body', 'frag'); else a.damage(dmg, 'body', g.owner, 'frag', dir, 'blast');
    }
  };

  // alvo balístico: velocidade para cair em (tx,tz) partindo de p
  gl.solve = function (p, tx, tz, ty) {
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), ang = 0.72, g = 9.8, dy = (ty || 0) - p.y;
    const v2 = (g * d * d) / (2 * Math.cos(ang) * Math.cos(ang) * (d * Math.tan(ang) - dy)); const v = Math.sqrt(Math.max(v2, 25));
    return new T.Vector3(dx / d * v * Math.cos(ang), v * Math.sin(ang), dz / d * v * Math.cos(ang));
  };
})();
