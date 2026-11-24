// Drones: reconhecimento (câmera que marca inimigos), bombardeiro (solta granadas) e kamikaze FPV; trocar para o drone usa a transição de chiado da morte.
// Também há drones kamikaze da IA que caçam soldados.
(function () {
  const T = THREE, BC = window.BC, G = BC.G;
  const TYPES = {
    recon: { n: 'DRONE DE RECONHECIMENTO', hp: 20, v: 10, bat: 130, size: 1 },
    bomber: { n: 'DRONE BOMBARDEIRO', hp: 28, v: 8, bat: 90, size: 1.25, bombs: 3 },
    kamikaze: { n: 'DRONE KAMIKAZE FPV', hp: 14, v: 26, bat: 55, size: 0.8 }
  };
  const D = BC.Drones = { list: [], proto: {}, TYPES };
  const mats = {}; const mat = (c) => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c, flatShading: true }));
  const box = (w, h, d, c, x, y, z, p) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const cyl = (r, h, c, x, y, z, p, seg) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 10), mat(c)); m.position.set(x, y, z); p.add(m); return m; };
  // modelo procedural (usado se o modelo 3D baixado não existir)
  function buildProc(type) {
    const g = new T.Group(), props = [], s = TYPES[type].size;
    const arm = type === 'kamikaze' ? 0.13 : 0.2 * s, bodyC = type === 'kamikaze' ? 0x1f2326 : 0x2f3338;
    box(0.16 * s, 0.05 * s, 0.2 * s, bodyC, 0, 0, 0, g); box(0.1 * s, 0.03 * s, 0.12 * s, 0x15171a, 0, 0.04 * s, 0.01, g);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const a = box(0.025 * s, 0.015, arm * 1.45, 0x202326, sx * arm * 0.5, 0.005, sz * arm * 0.5, g); a.rotation.y = -sx * sz * 0.785;
      cyl(0.022 * s, 0.03, 0x111214, sx * arm, 0.02, sz * arm, g);
      const prop = new T.Mesh(new T.CylinderGeometry(arm * 0.78, arm * 0.78, 0.004, 14), new T.MeshBasicMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0.28, depthWrite: false })); prop.position.set(sx * arm, 0.04, sz * arm); g.add(prop); props.push(prop);
      box(arm * 1.3, 0.004, 0.02, 0x555a60, sx * arm, 0.042, sz * arm, g);
    }
    if (type === 'recon') { const gb = new T.Mesh(new T.SphereGeometry(0.04 * s, 10, 8), mat(0x111214)); gb.position.set(0, -0.045 * s, -0.08 * s); g.add(gb); cyl(0.015 * s, 0.02, 0x20406a, 0, -0.045 * s, -0.12 * s, g).rotation.x = Math.PI / 2; box(0.04, 0.02, 0.05, 0x44484e, 0, 0.065 * s, 0.07 * s, g); }
    else if (type === 'bomber') { for (const sx of [-1, 1]) { const b = cyl(0.025, 0.085, 0x4b5a3a, sx * 0.05, -0.065, 0.0, g, 10); b.rotation.x = Math.PI / 2; cyl(0.026, 0.012, 0x222, sx * 0.05, -0.065, -0.05, g).rotation.x = Math.PI / 2; box(0.01, 0.04, 0.01, 0x222, sx * 0.05, -0.03, 0, g); } }
    else { cyl(0.03, 0.09, 0xb03a2a, 0, -0.005, -0.12, g, 10).rotation.x = Math.PI / 2; box(0.05, 0.03, 0.07, 0x2a2d30, 0, 0.055, 0.04, g); box(0.012, 0.012, 0.012, 0x4aff6a, 0, 0.085, 0.07, g); }
    g.userData.props = props; return g;
  }
  function build(type) {
    const pr = D.proto[type]; if (!pr) return buildProc(type);
    const g = pr.make(); return g;
  }

  // ---------------------------------------------------------- modelos 3D (Poly Pizza, CC BY 3.0) com hélices que giram
  const MODELS = { recon: ['recon', 0.62, true], bomber: ['bomber', 0.9, true], kamikaze: ['kamikaze', 0.34, true] };
  D.loadModels = function () {
    const loader = new T.GLTFLoader();
    return Promise.all(Object.keys(MODELS).map((type) => new Promise((res) => loader.load('models/drones/' + MODELS[type][0] + '.glb', (g) => { try { prep(type, g.scene); } catch (e) { console.warn('drone', type, e); } res(); }, undefined, () => res()))));
  };
  function prep(type, scene) {
    scene.updateMatrixWorld(true);
    // hélices: recentra o pivô de cada nó "Rotor/Prop" no centro da sua geometria para poder girar
    const props = [];
    scene.traverse((o) => { if (o.isMesh && /rotor|prop|blade/i.test(o.name)) props.push(o); });
    for (const o of props) { o.geometry = o.geometry.clone(); o.geometry.computeBoundingBox(); const c = o.geometry.boundingBox.getCenter(new T.Vector3()); o.geometry.translate(-c.x, -c.y, -c.z); o.position.add(c.clone().applyQuaternion(o.quaternion).multiply(o.scale)); }
    scene.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(scene), size = bb.getSize(new T.Vector3()), ctr = bb.getCenter(new T.Vector3()), k = MODELS[type][1] / Math.max(size.x, size.z);
    D.proto[type] = {
      make() {
        const g = new T.Group(), wrap = new T.Group(), inner = scene.clone(true); inner.position.set(-ctr.x, -ctr.y, -ctr.z); wrap.add(inner); wrap.scale.setScalar(k); wrap.rotation.y = MODELS[type][2] ? Math.PI : 0; g.add(wrap);
        const pr = []; inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.material && o.material.metalness !== undefined) { o.material = o.material.clone(); o.material.metalness = Math.min(0.3, o.material.metalness); } if (/rotor|prop|blade/i.test(o.name)) pr.push(o); } });
        if (type === 'bomber') for (const sx of [-1, 1]) { const b = cyl(0.025, 0.085, 0x4b5a3a, sx * 0.06, -0.12, 0.0, g, 10); b.rotation.x = Math.PI / 2; box(0.012, 0.05, 0.012, 0x222222, sx * 0.06, -0.08, 0, g); }
        if (type === 'kamikaze') { const w = cyl(0.035, 0.1, 0xb03a2a, 0, -0.01, -0.14, g, 10); w.rotation.x = Math.PI / 2; box(0.01, 0.01, 0.01, 0x4aff6a, 0, 0.05, 0.05, g); }
        g.userData.props = pr; return g;
      }
    };
  }

  BC.Drone = function (type, owner, team, x, y, z, yaw, ai) {
    const t = TYPES[type]; this.type = type; this.t = t; this.owner = owner; this.team = team; this.isDrone = true; this.alive = true; this.name = t.n; this.kills = 0; this.deaths = 0;
    this.x = x; this.y = y; this.z = z; this.vx = this.vy = this.vz = 0; this.yaw = yaw || 0; this.pitch = 0; this.roll = 0; this.hp = t.hp; this.bat = 100; this.bombs = t.bombs || 0; this.ai = !!ai; this.r = 0.3; this.h = 0.01; this.stn = 0;
    this.model = build(type); this.model.position.set(x, y, z); G.scene.add(this.model); this.spin = 0; this.sprint = 0;
  };
  const DP = BC.Drone.prototype;
  DP.damage = function (amount, zone, from) { if (!this.alive) return false; this.hp -= amount * 0.6 + 4; if (this.hp <= 0) { D.kill(this, from); return true; } return false; };
  // hitbox esférica
  const _hit = BC.hitActor;
  BC.hitActor = function (a, ox, oy, oz, dx, dy, dz, maxT) {
    if (a.isDrone) { const t = BC.raySphere(ox, oy, oz, dx, dy, dz, a.x, a.y, a.z, 0.32, maxT); return t > 0 ? { t, zone: 'body' } : null; }
    return _hit.apply(this, arguments);
  };

  D.kill = function (d, from, boom) {
    if (!d.alive) return; d.alive = false; d.deaths++; const fx = G.fx;
    fx.puff(d.x, d.y, d.z, 0x3a3631, 5, 1.2, 1.2, 0.8); fx.flash({ x: d.x, y: d.y, z: d.z }, 1.5); fx.debris(d.x, d.y, d.z, 0x333333, 10, 4, 0, 1, 0);
    if (G.drone === d) D.release(false);
    d.fall = 0; d.model.visible = false; setTimeout(() => D.remove(d), 50);
    if (boom) BC.Rockets.blast(d.owner || { team: d.team, isDrone: true, name: 'Drone' }, { x: d.x, y: d.y, z: d.z }, { rad: d.type === 'kamikaze' ? 7 : 5, vdmg: 200 });
  };
  D.remove = function (d) { G.scene.remove(d.model); const i = D.list.indexOf(d); if (i >= 0) D.list.splice(i, 1); const k = G.actors.indexOf(d); if (k >= 0) G.actors.splice(k, 1); };
  D.clear = function () { for (const d of D.list.slice()) D.remove(d); D.list = []; G.drone = null; D.aiT = [40 + Math.random() * 30, 55 + Math.random() * 30]; const sp = document.getElementById('spots'); if (sp) sp.innerHTML = ''; const dr = document.getElementById('dr'); if (dr) dr.classList.add('hidden'); };
  D.spawn = function (type, owner, team, x, y, z, yaw, ai) { const d = new BC.Drone(type, owner, team, x, y, z, yaw, ai); D.list.push(d); G.actors.push(d); return d; };

  // transição: o mesmo chiado da morte, mas indo para o drone
  D.transition = function () { G.glitch = Math.max(G.glitch, 1.6); G.trans = 1; G.flashScreen = Math.max(G.flashScreen, 0.08); };
  D.launch = function (type) {
    const P = G.player; if (!P.alive || P.faintT > 0 || G.drone || P.inVeh || !P.drones || !(P.drones[type] > 0)) return;
    P.drones[type]--; const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    const d = D.spawn(type, P, P.team, P.x + fx * 0.8, P.y + 1.7, P.z + fz * 0.8, P.yaw, false); d.pitch = 0; G.drone = d; d.fromBody = { x: P.x, z: P.z }; D.transition(); BC.Audio.cloth && BC.Audio.cloth(0.6);
  };
  D.release = function (recall) {
    const d = G.drone; if (!d) return; G.drone = null; D.transition(); const P = G.player;
    if (d.alive && recall) { P.drones[d.type] = (P.drones[d.type] || 0) + 1; D.remove(d); }
    else if (d.alive) { /* piloto morreu: o drone fica caído */ }
  };

  const keys = () => G.input.keys;
  // controle pelo jogador (chamado em updatePlayer enquanto houver drone ativo)
  D.control = function (dt) {
    const d = G.drone, P = G.player, k = keys(), w = G.world; if (!d || !d.alive) { G.drone = null; return; }
    const t = d.t, kam = d.type === 'kamikaze'; let fx = 0, fz = 0, up = 0;
    if (k.KeyW || k.ArrowUp) fz -= 1; if (k.KeyS || k.ArrowDown) fz += 1; if (k.KeyA || k.ArrowLeft) fx -= 1; if (k.KeyD || k.ArrowRight) fx += 1;
    if (k.Space) up += 1; if (k.KeyC || k.ControlLeft) up -= 1; const boost = k.ShiftLeft ? 1.5 : 1;
    const cy = Math.cos(d.yaw), sy = Math.sin(d.yaw);
    let tx, ty, tz, rate = 3.2;
    if (kam) { // FPV: W acelera para onde a câmera aponta
      const cp = Math.cos(d.pitch), fdx = -sy * cp, fdy = Math.sin(d.pitch), fdz = -cy * cp, thr = -fz; tx = (fdx * thr + cy * fx * 0.5) * t.v * boost; ty = (fdy * thr + up * 0.5) * t.v * boost; tz = (fdz * thr - sy * fx * 0.5) * t.v * boost; rate = 1.8;
      if (thr === 0 && fx === 0 && up === 0) { tx = d.vx * 0.9; ty = d.vy * 0.9; tz = d.vz * 0.9; }
    } else { tx = (fx * cy + fz * sy) * t.v * boost; tz = (-fx * sy + fz * cy) * t.v * boost; ty = up * t.v * 0.6; }
    d.vx += (tx - d.vx) * Math.min(1, rate * dt); d.vy += (ty - d.vy) * Math.min(1, rate * dt); d.vz += (tz - d.vz) * Math.min(1, rate * dt);
    D.move(d, dt);
    d.roll += (-(fx) * 0.35 - d.roll) * Math.min(1, 5 * dt);
    d.bat -= dt * 100 / t.bat; if (d.bat <= 0) { d.hp = 0; D.kill(d, null, false); return; }
    // ação: bombardeiro solta granada; kamikaze detona; reconhecimento marca
    if (G.input.take()) {
      if (d.type === 'bomber' && d.bombs > 0) { d.bombs--; BC.Gren.throwG(P, 'frag', new T.Vector3(d.x, d.y - 0.2, d.z), new T.Vector3(d.vx * 0.8, Math.min(0, d.vy), d.vz * 0.8)); BC.Audio.gren && BC.Audio.gren('throw', 0, 0, 0.6); }
      else if (kam) { D.kill(d, P, true); return; }
      else if (d.type === 'recon') D.scan(d, 120, 9);
    }
    d.scanT = (d.scanT || 0) - dt; if (d.type === 'recon' && d.scanT <= 0) { d.scanT = 0.6; D.scan(d, 75, 5); }
    if (Math.hypot(d.x - P.x, d.z - P.z) > 400) { d.hp = 0; D.kill(d, null, false); }
  };
  D.scan = function (d, range, secs) {
    const w = G.world; for (const e of G.actors) { if (!e.alive || e.team === d.team || e.team < 0 || e.isAnimal || e.isDrone || e.inVeh) continue; const dist = Math.hypot(e.x - d.x, e.z - d.z); if (dist > range) continue; if (w.los(d.x, d.y, d.z, e.x, e.y + 1.2, e.z)) e.spotT = G.time + secs; }
  };
  // movimento com colisão
  D.move = function (d, dt) {
    const w = G.world, sp = Math.hypot(d.vx, d.vy, d.vz);
    if (sp > 0.05) {
      const step = sp * dt, h = w.raycast(d.x, d.y, d.z, d.vx / sp, d.vy / sp, d.vz / sp, step + 0.3);
      if (h && h.t < step + 0.28) {
        if (d.type === 'kamikaze' && sp > 4 && !d.ai) { D.kill(d, d.owner, true); return; } if (d.type === 'kamikaze' && d.ai) { D.kill(d, d.owner, true); return; }
        const vn = d.vx * h.nx + d.vy * h.ny + d.vz * h.nz; d.vx -= vn * h.nx * 1.4; d.vy -= vn * h.ny * 1.4; d.vz -= vn * h.nz * 1.4; if (sp > 7) { d.hp -= (sp - 7) * 1.5; if (d.hp <= 0) { D.kill(d, null, false); return; } }
      } else { d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; }
    }
    const L = w.play + 20; d.x = BC.clamp(d.x, -L, L); d.z = BC.clamp(d.z, -L, L); const gh = w.heightAt(d.x, d.z) + 0.3;
    if (d.y < gh) { d.y = gh; if (d.vy < 0) d.vy = 0; if (d.type === 'kamikaze' && Math.hypot(d.vx, d.vz) > 5) { D.kill(d, d.owner, true); } }
    if (d.y > w.heightAt(d.x, d.z) + 120) d.y = w.heightAt(d.x, d.z) + 120;
  };

  // IA: drones kamikaze caçam soldados (só offline)
  function aiUpdate(d, dt) {
    const w = G.world; let tg = d.tg; if (!tg || !tg.alive || tg.inVeh) { tg = null; let bd = 220; for (const e of G.actors) { if (!e.alive || e.team === d.team || e.team < 0 || e.isDrone || e.isAnimal || e.inVeh || e.isVehicle) continue; const dd = Math.hypot(e.x - d.x, e.z - d.z); if (dd < bd) { bd = dd; tg = e; } } d.tg = tg; }
    if (!tg) { d.bat -= dt * 8; d.vy += (0 - d.vy) * 0.05; if (d.bat <= 0) D.kill(d, null, false); D.move(d, dt); return; }
    const dx = tg.x - d.x, dz = tg.z - d.z, dist = Math.hypot(dx, dz), want = dist > 30 ? Math.max(w.heightAt(d.x, d.z) + 5, tg.y + 12) : tg.y + 1.2;
    let vy = BC.clamp((want - d.y) * 1.4, -12, 12); const sp = 16, k = dist > 0.1 ? sp / dist : 0;
    d.vx += (dx * k - d.vx) * Math.min(1, 2 * dt); d.vz += (dz * k - d.vz) * Math.min(1, 2 * dt); d.vy += (vy - d.vy) * Math.min(1, 3 * dt); d.yaw = Math.atan2(-d.vx, -d.vz); d.model.userData.noRoll = true;
    D.move(d, dt); if (!d.alive) return;
    if (Math.hypot(dx, dz, tg.y + 1.2 - d.y) < 2.2) { D.kill(d, d, true); return; }
    d.bat -= dt * 100 / 70; if (d.bat <= 0) D.kill(d, null, false);
  }
  D.update = function (dt) {
    for (const d of D.list.slice()) {
      if (!d.alive) continue;
      if (d.ai) aiUpdate(d, dt);
      d.spin += dt * 60; const m = d.model; m.position.set(d.x, d.y, d.z); m.rotation.set(d.type === 'kamikaze' ? d.pitch * 0.4 : 0.1 * (d.vz > 0 ? 1 : -1) * Math.min(1, Math.hypot(d.vx, d.vz) / 8), d.yaw + (d.ai ? 0 : 0), d.ai ? 0 : d.roll, 'YXZ');
      if (m.userData.props) m.userData.props.forEach((p, i) => { p.rotation.y = d.spin * 1.6 * (i % 2 ? 1 : -1); });
    }
    // reaparecimento de drones kamikaze inimigos
    if (!G.net && G.running && !G.over && !G.hunt && G.world && D.aiT) {
      for (let t = 0; t < 2; t++) {
        D.aiT[t] -= dt; if (D.aiT[t] > 0) continue; D.aiT[t] = 70 + Math.random() * 60;
        const sp = G.world.spawns[t]; if (!sp || !sp.length) continue; const s = sp[(Math.random() * sp.length) | 0];
        D.spawn('kamikaze', { team: t, isDrone: true, name: 'Drone' }, t, s.x, G.world.heightAt(s.x, s.z) + 18, s.z, 0, true);
      }
    }
    D.hud();
  };
  // marcadores de inimigos vistos pelo reconhecimento + texto do drone
  D.hud = function () {
    const sp = document.getElementById('spots'), dr = document.getElementById('dr'), P = G.player; if (!sp || !P) return;
    const cam = G.camera, W = window.innerWidth, H = window.innerHeight; let html = ''; const v = new T.Vector3();
    for (const e of G.actors) {
      if (!e.alive || !(e.spotT > G.time) || e.team === P.team) continue; v.set(e.x, e.y + (e.isVehicle ? 3.2 : 2.2), e.z).project(cam); if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      html += '<i style="left:' + ((v.x * 0.5 + 0.5) * W).toFixed(0) + 'px;top:' + ((1 - (v.y * 0.5 + 0.5)) * H).toFixed(0) + 'px"></i><b style="left:' + ((v.x * 0.5 + 0.5) * W).toFixed(0) + 'px;top:' + ((1 - (v.y * 0.5 + 0.5)) * H).toFixed(0) + 'px">' + Math.round(Math.hypot(e.x - cam.position.x, e.z - cam.position.z)) + ' m</b>';
    }
    if (sp._h !== html) { sp.innerHTML = html; sp._h = html; }
    const d = G.drone;
    if (d) { dr.classList.remove('hidden'); const alt = Math.round(d.y - G.world.heightAt(d.x, d.z)), spd = Math.round(Math.hypot(d.vx, d.vy, d.vz)); dr.textContent = d.name + '   BAT ' + Math.max(0, Math.round(d.bat)) + '%   ALT ' + alt + ' m   VEL ' + spd + ' m/s\n' + (d.type === 'bomber' ? 'CLIQUE: soltar granada (' + d.bombs + ')   ' : d.type === 'kamikaze' ? 'CLIQUE: detonar   W: acelerar para onde olha   ' : 'CLIQUE: marcar inimigos   ') + 'T: voltar ao corpo'; }
    else dr.classList.add('hidden');
  };
})();
