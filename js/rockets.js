// Lançadores antitanque: modelos procedurais, foguetes HE (explosão grande) e HEAT (explosão pequena, perfura blindagem).
(function () {
  const T = THREE, BC = window.BC, G = BC.G;
  const mat = (c, m) => new T.MeshStandardMaterial({ color: c, roughness: 0.65, metalness: m === undefined ? 0.25 : m });
  const cyl = (r, l, c, x, y, z, parent, r2) => { const m = new T.Mesh(new T.CylinderGeometry(r2 === undefined ? r : r2, r, l, 14), mat(c)); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, c, x, y, z, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); parent.add(m); return m; };
  // origem = mira traseira (z=0), -z = boca; y=0 = linha de visada
  BC.procLauncher = function (kind) {
    const g = new T.Group(), rpg = kind === 'rpg7', L = rpg ? 0.95 : 1.1, r = rpg ? 0.026 : 0.05, z0 = 0.28;
    cyl(r, L, rpg ? 0x4a4a42 : 0x55593f, 0, -0.07, z0 - L / 2, g);                                      // tubo
    if (rpg) { cyl(0.04, 0.32, 0x3a3a34, 0, -0.07, z0 - L - 0.06, g); box(0.06, 0.1, 0.34, 0x7a5a30, 0, -0.098, 0.12, g); cyl(0.065, 0.2, 0x4a5a30, 0, -0.07, -0.78, g, 0.01); cyl(0.032, 0.08, 0x2a2a28, 0, -0.07, z0 + 0.04, g, 0.05); }
    else { cyl(r + 0.012, 0.1, 0x2c2e2a, 0, -0.07, z0 - 0.02, g); cyl(r + 0.012, 0.08, 0x2c2e2a, 0, -0.07, z0 - L + 0.04, g); box(0.05, 0.12, 0.05, 0x2a2a2a, 0, -0.14, 0.02, g); box(0.04, 0.1, 0.05, 0x2a2a2a, 0, -0.14, -0.28, g); box(0.07, 0.02, 0.24, 0x2c2e2a, 0, -0.07 + r + 0.012, -0.05, g); }
    box(0.02, 0.04, 0.03, 0x111111, 0, 0.005 - 0.02, 0.0, g); box(0.012, 0.045, 0.012, 0x111111, 0, -0.01, -0.55, g); // alça e massa de mira
    box(0.012, 0.045, 0.012, 0x111111, 0, -0.01, 0.1, g);
    const muzzle = z0 - L - (rpg ? 0.3 : 0.0);
    return { body: g, G: { stock: z0 + 0.04, muzzle: [0, -0.07, muzzle], eject: [0.03, -0.05, 0.1], hands: { r: [0, -0.15, 0.02], l: [0, -0.115, -0.3] }, real: true } };
  };

  // ---------------------------------------------------------- foguetes em voo
  const list = []; let scene = null;
  const R = BC.Rockets = { list };
  const mesh = () => { const g = new T.Group(); cyl(0.04, 0.55, 0x3d4a30, 0, 0, 0, g); cyl(0.05, 0.16, 0x8a8a80, 0, 0, -0.34, g, 0.005); cyl(0.045, 0.1, 0x222222, 0, 0, 0.3, g, 0.02); return g; };
  R.launch = function (owner, o, d, spec) {
    scene = G.scene; const rk = spec.rocket, m = mesh(); m.position.set(o.x, o.y, o.z); m.lookAt(o.x + d.x, o.y + d.y, o.z + d.z); scene.add(m);
    list.push({ owner, p: new T.Vector3(o.x, o.y, o.z), v: new T.Vector3(d.x * rk.v, d.y * rk.v, d.z * rk.v), spec, rk, t: 0, mesh: m, dist: 0 });
    G.noise && owner && G.noise(o.x, o.z, owner.team, 80);
    BC.Audio.shot && BC.Audio.shot('sg', owner && owner.isPlayer ? 0 : Math.hypot(G.player.x - o.x, G.player.z - o.z), G.panTo(o.x, o.z), !!(owner && owner.isPlayer), 0.5, false);
    G.fx.puff(o.x - d.x, o.y - d.y, o.z - d.z, 0xdddddd, 8, 1.2, 0.8, 1.0);
  };
  R.clear = function () { for (const r of list) if (r.mesh) G.scene.remove(r.mesh); list.length = 0; };
  R.update = function (dt) {
    const w = G.world; if (!w) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i]; r.t += dt; r.v.y -= (r.rk.v < 150 ? 2.2 : 0.6) * dt; if (r.rk.v < 150 && r.t < 0.4) r.v.multiplyScalar(1 + dt * 1.5); // o RPG-7 acelera depois de sair
      const sp = r.v.length(), step = sp * dt, dx = r.v.x / sp, dy = r.v.y / sp, dz = r.v.z / sp;
      let tHit = step + 1, hitA = null, hitW = null;
      const h = w.raycast(r.p.x, r.p.y, r.p.z, dx, dy, dz, step + 0.1); if (h) { tHit = h.t; hitW = h; }
      for (const a of G.actors) {
        if (!a.alive || a === r.owner || a.inVeh || (r.owner && r.owner.inVeh === a)) continue;
        const q = BC.hitActor(a, r.p.x, r.p.y, r.p.z, dx, dy, dz, Math.min(tHit, step + 0.1)); if (q && q.t < tHit) { tHit = q.t; hitA = a; hitW = null; }
      }
      if (tHit <= step + 0.05 && (r.dist > 1.5 || hitA)) { const p = { x: r.p.x + dx * tHit, y: r.p.y + dy * tHit, z: r.p.z + dz * tHit }; explode(r, p, { x: dx, y: dy, z: dz }, hitA, hitW); G.scene.remove(r.mesh); list.splice(i, 1); continue; }
      r.p.x += dx * step; r.p.y += dy * step; r.p.z += dz * step; r.dist += step;
      r.mesh.position.copy(r.p); r.mesh.lookAt(r.p.x + dx, r.p.y + dy, r.p.z + dz);
      if (((r.tc = (r.tc || 0) + dt) > 0.025)) { r.tc = 0; G.fx.puff(r.p.x - dx * 0.4, r.p.y - dy * 0.4, r.p.z - dz * 0.4, 0xd0d0d0, 1, 0.55, 1.1, 0.2); }
      if (r.dist > 700 || r.p.y < -50) { G.scene.remove(r.mesh); list.splice(i, 1); }
    }
  };
  function explode(r, p, dir, hitA, hitW) {
    const rk = r.rk, he = rk.k === 'he', rad = hitW && !he ? Math.min(rk.rad, 3) : rk.rad, w = G.world, fx = G.fx, P = G.player;
    const dP = Math.hypot(P.x - p.x, P.y + 1.2 - p.y, P.z - p.z);
    fx.flash(p, he ? 9 : 6); fx.flash({ x: p.x, y: p.y + 0.4, z: p.z }, 4);
    fx.puff(p.x, p.y + 0.4, p.z, 0x3a3631, he ? 14 : 9, he ? 6 : 4, 3.4, 1.6); fx.puff(p.x, p.y + 0.2, p.z, 0x8a8070, 14, he ? 8 : 5, 2.6, 1.3); fx.debris(p.x, p.y + 0.1, p.z, BC.SURF[w.surf] || 0x666666, 36, 10, 0, 1, 0);
    BC.Audio.boom && BC.Audio.boom(dP, G.panTo(p.x, p.z)); if (dP < 50) G.shake = Math.max(G.shake || 0, Math.min(1.8, 18 / (dP + 3)));
    if (dP < 28) { G.glitch = Math.max(G.glitch, Math.min(1.1, 14 / (dP + 6))); if (dP < 10 && BC.Audio.ring) BC.Audio.ring((1 - dP / 10) * 4); }
    if (BC.Gren && BC.Gren.boomLight) { BC.Gren.boomT = 0.3; BC.Gren.boomLight.position.set(p.x, p.y, p.z); BC.Gren.boomLight.intensity = 14; }
    const from = { x: p.x, z: p.z, team: r.owner ? r.owner.team : -1, alive: true, name: 'Foguete', isGrenade: true };
    for (const a of G.actors.slice()) {
      if (!a.alive || a.inVeh && !a.isVehicle) continue;
      if (a.isVehicle) {
        if (a === hitA) a.rocketHit(rk, p, dir, r.owner); else { const d = Math.hypot(a.x - p.x, a.y + 1.2 - p.y, a.z - p.z); if (d < rad + 3) a.damage((he ? 260 : 80) * Math.pow(1 - d / (rad + 3), 2), 'body', r.owner, 'rocketblast', dir, 'blast'); }
        continue;
      }
      const cy = a.y + (a.isPlayer ? a.eyeY * 0.8 : 1.0), d = Math.hypot(a.x - p.x, cy - p.y, a.z - p.z); if (d > rad && a !== hitA) continue;
      let k = Math.pow(Math.max(0, 1 - d / rad), 2); const los = w.los(p.x, p.y + 0.25, p.z, a.x, cy, a.z); if (!los) { if (d > 4) continue; k *= 0.3; }
      let dmg = 300 * k + (a === hitA ? 400 : 0); if (dmg < 3) continue; const dx = a.x - p.x, dz = a.z - p.z, l = Math.hypot(dx, dz) || 1, dd = { x: dx / l, y: 0.3, z: dz / l };
      if (a.isPlayer) G.hurtPlayer(dmg, from, 'body', 'rocket'); else a.damage(dmg, 'body', r.owner || from, 'rocket', dd, 'blast');
    }
  }
})();
