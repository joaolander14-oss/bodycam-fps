// Modos de jogo: combate por equipes, rei da colina, captura de 3 pontos e caça aos animais.
(function () {
  const T = THREE, BC = window.BC, G = BC.G;
  const M = BC.Modes = { list: [['tdm', 'Combate por equipes (abates)'], ['hill', 'Rei da Colina (segure a colina)'], ['dom', 'Captura de 3 pontos'], ['hunt', 'Caça aos animais']] };
  let huntK = [0, 0], objs = [], animals = [], huntT = 0, huntTotal = 0, huntPts = 0, huntKills = 0;
  const COL = [0x4a90e8, 0xe8584a, 0xdddddd];

  M.clear = function () {
    if (BC.Rockets) BC.Rockets.clear(); if (BC.Vehicles) BC.Vehicles.clear(); if (BC.Drones) BC.Drones.clear();
    for (const o of objs) G.scene.remove(o.group); objs = []; for (const a of animals) a.dispose(); animals = []; G.points = null; G.hunt = null;
  };
  M.setup = function () {
    M.clear(); const S = G.settings, mode = G.mode = S.mode || 'tdm', w = G.world, H = G.world.play;
    const rng = BC.rng((G.mapDef.seed | 0) + 77);
    if (mode === 'hill' || mode === 'dom') {
      const z0 = avg(w.spawns[0], 'z') * 0.5, z1 = avg(w.spawns[1], 'z') * 0.5, pts = [];
      if (mode === 'hill') { const p = w.randomFree(rng, -H * 0.25, H * 0.25, -H * 0.2, H * 0.2, 6); pts.push({ x: p.x, z: p.z, r: 10, name: 'COLINA' }); G.killLimit = 120; }
      else { const a = w.randomFree(rng, -H * 0.5, H * 0.5, z0 - 12, z0 + 12, 6), b = w.randomFree(rng, -H * 0.4, H * 0.4, -10, 10, 6), c = w.randomFree(rng, -H * 0.5, H * 0.5, z1 - 12, z1 + 12, 6); pts.push({ x: a.x, z: a.z, r: 8, name: 'A' }, { x: b.x, z: b.z, r: 8, name: 'B' }, { x: c.x, z: c.z, r: 8, name: 'C' }); G.killLimit = 200; }
      for (const p of pts) {
        p.c = 0; p.owner = -1; p.y = w.heightAt(p.x, p.z); const g = new T.Group();
        const cyl = new T.Mesh(new T.CylinderGeometry(p.r, p.r, 22, 28, 1, true), new T.MeshBasicMaterial({ color: COL[2], transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false }));
        cyl.position.y = 11; const ring = new T.Mesh(new T.RingGeometry(p.r - 0.5, p.r, 40), new T.MeshBasicMaterial({ color: COL[2], transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.35;
        const pole = new T.Mesh(new T.BoxGeometry(0.15, 5, 0.15), new T.MeshLambertMaterial({ color: 0xcccccc })); pole.position.y = 2.5; const flag = new T.Mesh(new T.BoxGeometry(1.6, 0.9, 0.05), new T.MeshBasicMaterial({ color: COL[2], side: T.DoubleSide })); flag.position.set(0.85, 4.5, 0);
        g.add(cyl, ring, pole, flag); g.position.set(p.x, p.y, p.z); G.scene.add(g); objs.push({ group: g, cyl, ring, flag, p });
      }
      G.points = pts; G.score = [0, 0];
    } else if (mode === 'hunt') {
      const ids = BC.animalList(G.settings.map), n = 28 + Math.round(H / 10); huntT = 480; huntPts = huntKills = 0; huntTotal = 0; huntK = [0, 0];
      for (let i = 0; i < n; i++) {
        const id = ids[i % ids.length], p = w.randomFree(Math.random, -H * 0.9, H * 0.9, -H * 0.8, H * 0.8, 1.2); if (!p) continue;
        if (Math.hypot(p.x - G.player.x, p.z - G.player.z) < 25 || (w.heightAt(p.x, p.z) < w.waterY + 0.1 && id !== 'croc')) continue;
        const a = new BC.Animal(G, id, p.x, p.z); animals.push(a); G.actors.push(a); huntTotal++;
      }
      G.hunt = { total: huntTotal, k: huntK }; G.score = [0, 0]; G.killLimit = 9999;
    }
    if (BC.Vehicles) BC.Vehicles.setup();
  };
  function avg(l, k) { let s = 0; for (const e of l) s += e[k]; return l.length ? s / l.length : 0; }

  M.animalKilled = function (a, killer) {
    if (!killer || killer.team === undefined || killer.team < 0 || !G.hunt) return; huntKills++; huntPts += a.sp.pts; huntK[killer.team]++; G.score[killer.team] += a.sp.pts;
    if (killer.isPlayer) BC.UI.msg('+' + a.sp.pts + '  ' + a.sp.n.toUpperCase(), 1.4);
  };
  M.update = function (dt) {
    if (BC.Vehicles) BC.Vehicles.update(dt); if (BC.Drones) BC.Drones.update(dt);
    if (G.points) {
      const host = G.net !== 'guest';
      for (let i = 0; i < G.points.length; i++) {
        const p = G.points[i];
        if (host) {
          let n0 = 0, n1 = 0; for (const e of G.actors) { if (!e.alive || e.isAnimal || e.isDrone || e.team < 0 || e.inVeh) continue; if (Math.hypot(e.x - p.x, e.z - p.z) < p.r) { if (e.team === 0) n0++; else n1++; } }
          if (n0 && !n1) p.c = Math.min(1, p.c + dt * 0.13 * Math.min(3, n0)); else if (n1 && !n0) p.c = Math.max(-1, p.c - dt * 0.13 * Math.min(3, n1));
          else if (!n0 && !n1 && p.owner < 0) p.c *= 1 - 0.1 * dt;
          if (p.c > 0.6) p.owner = 0; else if (p.c < -0.6) p.owner = 1; else if (Math.abs(p.c) < 0.2) p.owner = -1;
          if (p.owner >= 0) G.score[p.owner] += dt;
        }
        const o = objs[i], col = COL[p.owner < 0 ? 2 : p.owner], k = Math.abs(p.c);
        o.cyl.material.color.setHex(col); o.ring.material.color.setHex(col); o.flag.material.color.setHex(p.c > 0.05 ? COL[0] : p.c < -0.05 ? COL[1] : COL[2]); o.flag.position.y = 1.2 + 3.3 * k;
      }
      if (host && !G.over && (G.score[0] >= G.killLimit || G.score[1] >= G.killLimit)) G.endMatch();
    }
    if (G.hunt) {
      huntT -= dt; for (const a of animals) a.update(dt);
      G.hunt.left = Math.max(0, huntT); G.hunt.kills = huntKills; G.hunt.pts = huntPts;
      if (!G.over && (huntT <= 0 || huntKills >= huntTotal)) { G.over = true; BC.UI.endHunt(G.score[G.player.team] > G.score[1 - G.player.team], G.score, huntK); }
    }
  };
  M.hudText = function () {
    if (G.points) {
      const P = G.player; return G.points.map((p) => { const c = p.owner < 0 ? '#ddd' : p.owner === 0 ? '#6fb0ff' : '#ff7a6a', d = Math.round(Math.hypot(p.x - P.x, p.z - P.z)); return `<span style="color:${c}">■ ${p.name}</span> <small>${d} m${Math.abs(p.c) > 0.05 && p.owner !== (p.c > 0 ? 0 : 1) ? ' ' + Math.round(Math.abs(p.c) * 100) + '%' : ''}</small>`; }).join('&nbsp;&nbsp;&nbsp;');
    }
    if (G.hunt) { const l = Math.ceil(G.hunt.left || 0); return `CAÇA · ANIMAIS ${G.hunt.kills || 0}/${G.hunt.total} · ${Math.floor(l / 60)}:${String(l % 60).padStart(2, '0')}`; }
    return '';
  };
})();
