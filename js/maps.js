// 6 mapas gerados proceduralmente: neve, floresta, trincheiras, cidade, pântano, deserto.
(function () {
  const T = THREE, BC = window.BC;
  const P = BC.pbox, C = BC.pcyl, CY = BC.pcyly, CO = BC.pcone, SP = BC.psph, LI = BC.plimb;
  const sm = BC.smooth, fbm = BC.fbm;
  BC.maps = {};
  const S = { H: 78, K: 1, A: 1 }; // tamanho do mapa (metade da área jogável), fator linear e de área

  const vmat = new T.MeshLambertMaterial({ vertexColors: true });
  const geoCache = {};
  function G(name, fn) { return geoCache[name] || (geoCache[name] = BC.mergeGeoms(fn())); }
  const edge = (x, z) => 13 * sm(S.H - 2, S.H + 28, Math.max(Math.abs(x), Math.abs(z)));
  function mix(a, b, t) { return a + (b - a) * t; }
  function setc(o, hex, v) { const c = new T.Color(hex); o[0] = c.r * v; o[1] = c.g * v; o[2] = c.b * v; }
  function mixc(o, h1, h2, t, v) { const a = new T.Color(h1), b = new T.Color(h2); o[0] = mix(a.r, b.r, t) * v; o[1] = mix(a.g, b.g, t) * v; o[2] = mix(a.b, b.b, t) * v; }
  const inLane = (x, z) => Math.abs(z) > S.H - 22; // zonas de spawn
  function flatBlend(x, z, cx, cz, r, h0, h) { const d = Math.hypot(x - cx, z - cz); return mix(h, h0, 1 - sm(r * 0.65, r, d)); }

  // ---------- geometrias de árvores ----------
  const treeG = {
    pine: () => G('pine', () => [CY(0.16, 3.4, 0, 1.7, 0, 0x4a3322), CO(1.7, 2.4, 0, 3.2, 0, 0x214a2a), CO(1.35, 2.2, 0, 4.5, 0, 0x2a5733), CO(0.95, 2.0, 0, 5.7, 0, 0x2f6338)]),
    pineSnow: () => G('pineSnow', () => [CY(0.16, 3.4, 0, 1.7, 0, 0x4a3322), CO(1.7, 2.4, 0, 3.2, 0, 0x6f8c80), CO(1.35, 2.2, 0, 4.5, 0, 0x9fb7b0), CO(0.95, 2.0, 0, 5.7, 0, 0xe3eef0)]),
    oak: () => G('oak', () => [CY(0.28, 4.2, 0, 2.1, 0, 0x4d3a28), SP(2.2, 0, 5.6, 0, 0x3d6b2c, 0.8), SP(1.6, 1.4, 4.7, 0.5, 0x4a7a33, 0.8), SP(1.7, -1.3, 4.9, -0.6, 0x35612a, 0.8)]),
    dead: () => G('dead', () => [CY(0.2, 6, 0, 3, 0, 0x3a3128), LI(0, 3.5, 0, 1.3, 5.2, 0.2, 0.09, 0x3a3128), LI(0, 4.4, 0, -1.1, 5.9, -0.3, 0.08, 0x3a3128), LI(0, 2.6, 0, 0.5, 3.6, -1.0, 0.07, 0x3a3128)]),
    cypress: () => G('cypress', () => [CO(0.8, 1.6, 0, 0.8, 0, 0x4a3d2a), CY(0.3, 5.5, 0, 3, 0, 0x4a3d2a), SP(2.6, 0, 6.0, 0, 0x4d6030, 0.35), SP(1.8, 1.2, 5.4, 0.8, 0x56693a, 0.3), SP(1.5, -1.4, 5.1, -0.5, 0x3f5228, 0.3)]),
    palm: () => G('palm', () => {
      const a = [CY(0.15, 5, 0, 2.5, 0, 0x7a6244)];
      for (let i = 0; i < 7; i++) { const t = i / 7 * 6.283; a.push(LI(0, 5, 0, Math.cos(t) * 1.7, 4.4, Math.sin(t) * 1.7, 0.12, 0x4f7a32, 0.5)); }
      return a;
    }),
    bush: () => G('bush', () => [SP(0.9, 0, 0.5, 0, 0x3b6a2d, 0.7), SP(0.6, 0.7, 0.4, 0.3, 0x4a7a35, 0.7)]),
    wheat: () => G('wheat', () => [CO(0.07, 1.4, 0, 0.7, 0, 0xc9a850), CO(0.06, 1.25, 0.16, 0.62, 0.07, 0xb89a44), CO(0.06, 1.15, -0.14, 0.58, -0.09, 0xd4b45a), CO(0.05, 1.3, 0.05, 0.65, -0.18, 0xc2a24c)]),
    reed: () => G('reed', () => [CO(0.07, 1.6, 0, 0.8, 0, 0x7a8a45), CO(0.06, 1.3, 0.12, 0.65, 0.05, 0x6d7d3e)]),
    rock: () => G('rock', () => [{ geo: new T.DodecahedronGeometry(1, 0), c: 0x8a8b88, m: new T.Matrix4().makeScale(1, 0.75, 0.9) }]),
    mound: () => G('mound', () => [SP(1, 0, 0, 0, 0xffffff, 0.35)])
  };

  function scatter(W, rng, kind, n, o) {
    o = o || {}; const list = [], R = o.R || (W.half - 6), geo = treeG[kind]();
    let guard = 0;
    while (list.length < n && guard++ < n * 20) {
      const x = (rng() * 2 - 1) * R, z = (rng() * 2 - 1) * R;
      const play = Math.abs(x) < S.H && Math.abs(z) < S.H;
      if (play && inLane(x, z) && rng() < (o.laneKeep === undefined ? 0.8 : o.laneKeep)) continue;
      if (o.avoid && o.avoid(x, z)) continue;
      const y = W.heightAt(x, z); if (y < W.waterY + (o.minAbove === undefined ? 0.05 : o.minAbove)) continue;
      const s = (o.smin || 0.8) + rng() * ((o.smax || 1.6) - (o.smin || 0.8)), v = 0.72 + rng() * 0.28;
      const col = o.tint ? new T.Color(o.tint).multiplyScalar(v) : new T.Color(v, v, v);
      list.push({ x, y: y - 0.05, z, ry: rng() * 6.28, s, sy: o.sy ? (0.85 + rng() * 0.4) : 1, c: col.getHex() });
      if (o.col) W.addCylCol(x, z, o.col * s, y, y + (o.colH || 6) * s, o.tag || 'wood');
    }
    return W.instanced(geo, vmat, list, o.shadow !== false);
  }

  // pedras com colisor
  function rocks(W, rng, n, smin, smax, tint) {
    const list = [], geo = treeG.rock();
    for (let i = 0; i < n; i++) {
      const x = (rng() * 2 - 1) * (W.half - 8), z = (rng() * 2 - 1) * (W.half - 8), play = Math.abs(x) < S.H && Math.abs(z) < S.H;
      if (play && inLane(x, z) && rng() < 0.85) continue;
      const y = W.heightAt(x, z); if (y < W.waterY + 0.1) continue;
      const s = smin + rng() * (smax - smin), v = 0.72 + rng() * 0.28;
      const c = new T.Color(tint || 0x8a8b88).multiplyScalar(v);
      list.push({ x, y: y + s * 0.15, z, ry: rng() * 6, s, c: c.getHex() });
      W.addCylCol(x, z, s * 0.95, y - 0.1, y + Math.max(0.95, s * 0.85), 'rock');
    }
    W.instanced(geo, vmat, list);
  }

  function log(W, x, z, len, r, alongX, mat) {
    const y = W.heightAt(x, z);
    const m = new T.Mesh(new T.CylinderGeometry(r, r, len, 8), BC.mat(mat || 'log'));
    m.rotation.z = alongX ? Math.PI / 2 : 0; m.rotation.x = alongX ? 0 : Math.PI / 2;
    m.position.set(x, y + r * 0.8, z); m.castShadow = m.receiveShadow = true; W.group.add(m);
    if (alongX) W.addBoxCol(x - len / 2, y, z - r, x + len / 2, y + r * 1.7, z + r, 'wood'); else W.addBoxCol(x - r, y, z - len / 2, x + r, y + r * 1.7, z + len / 2, 'wood');
  }
  function sandbags(W, x, z, len, alongX, h) {
    const y = W.heightAt(x, z) - 0.15, hh = h || 1.0, t = 0.8;
    if (alongX) W.box(x - len / 2, y, z - t / 2, x + len / 2, y + hh, z + t / 2, 'sandbag', { u: 1.5, tag: 'sand' });
    else W.box(x - t / 2, y, z - len / 2, x + t / 2, y + hh, z + len / 2, 'sandbag', { u: 1.5, tag: 'sand' });
  }
  function crate(W, x, z, s, mat, hgt) {
    const y = W.heightAt(x, z) - (W.yoff || 0); W.box(x - s / 2, y, z - s / 2, x + s / 2, y + (hgt || s), z + s / 2, mat || 'wood', { u: 1.5 });
  }
  function ammoCrate(W, x, z) {
    const y = W.heightAt(x, z);
    W.box(x - 0.6, y, z - 0.4, x + 0.6, y + 0.7, z + 0.4, 'crate', { u: 1.2 }); W.crates.push({ x, z, t: 0 });
  }
  const wheelMat = new T.MeshLambertMaterial({ color: 0x111111 });
  function car(W, x, z, alongX, color) {
    const y = W.heightAt(x, z), L = 2.1, Wd = 0.95;
    const hx = alongX ? L : Wd, hz = alongX ? Wd : L, cx = alongX ? 1.0 : 0.75, cz = alongX ? 0.75 : 1.0;
    W.box(x - hx, y + 0.3, z - hz, x + hx, y + 1.0, z + hz, 'metal', { color, tag: 'metal' });
    W.box(x - cx + (alongX ? 0.2 : 0), y + 1.0, z - cz + (alongX ? 0 : 0.2), x + cx + (alongX ? 0.2 : 0), y + 1.55, z + cz + (alongX ? 0 : 0.2), 'metal', { color: 0x222a30, tag: 'metal' });
    const wy = y + 0.3; const wm = wheelMat;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = new T.Mesh(new T.CylinderGeometry(0.33, 0.33, 0.25, 10), wm); w.rotation.x = alongX ? Math.PI / 2 : 0; w.rotation.z = alongX ? 0 : Math.PI / 2;
      w.position.set(x + sx * (alongX ? 1.35 : 0.9), wy, z + sz * (alongX ? 0.9 : 1.35)); W.group.add(w);
    }
  }
  // parede com janelas e portas
  function wallOps(L, doors, winEvery, rng) {
    const ops = [];
    for (const d of doors) ops.push({ a: d - 0.85, b: d + 0.85, yb: 0, yt: 2.3 });
    for (let s = 2.2; s < L - 2; s += winEvery) {
      if (doors.some((d) => Math.abs(d - s) < 2.0)) continue;
      if (rng() < 0.2) continue;
      ops.push({ a: s - 0.7, b: s + 0.7, yb: 1.0, yt: 2.2 });
    }
    return ops;
  }
  // prédio oco, 1 andar: portas em lados opostos, janelas, teto
  function hollow(W, rng, x0, z0, x1, z1, h, mat, o) {
    o = o || {}; const t = 0.35, lx = x1 - x0, lz = z1 - z0;
    W.yoff = o.y !== undefined ? o.y : W.heightAt((x0 + x1) / 2, (z0 + z1) / 2);
    const doorsN = [lx * (0.25 + rng() * 0.5)], doorsS = [lx * (0.25 + rng() * 0.5)], doorsW = rng() < 0.5 ? [lz * 0.5] : [], doorsE = rng() < 0.5 ? [lz * 0.5] : [];
    const op = { u: o.u || 2.5, color: o.color };
    W.wall(x0, z0 + t / 2, x1, z0 + t / 2, t, h, wallOps(lx, doorsN, 5, rng), mat, op);
    W.wall(x0, z1 - t / 2, x1, z1 - t / 2, t, h, wallOps(lx, doorsS, 5, rng), mat, op);
    W.wall(x0 + t / 2, z0 + t, x0 + t / 2, z1 - t, t, h, wallOps(lz - 2 * t, doorsW, 5, rng), mat, op);
    W.wall(x1 - t / 2, z0 + t, x1 - t / 2, z1 - t, t, h, wallOps(lz - 2 * t, doorsE, 5, rng), mat, op);
    if (o.roof !== false) W.box(x0, h, z0, x1, h + 0.3, z1, o.roofMat || 'concrete', { u: 3 });
    if (lx > 12 && o.partition !== false) { // parede interna com porta
      const px = x0 + lx * 0.5, d = (lz - 2 * t) * (0.3 + rng() * 0.4);
      W.wall(px, z0 + t, px, z1 - t, 0.25, h, [{ a: d - 0.8, b: d + 0.8, yb: 0, yt: 2.3 }], mat, op);
    }
    // mobília / cobertura interna
    const n = 2 + ((rng() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const x = x0 + 1.5 + rng() * (lx - 3), z = z0 + 1.5 + rng() * (lz - 3), s = 0.8 + rng() * 0.7;
      crate(W, x, z, s, rng() < 0.5 ? 'wood' : 'crate', s * (0.8 + rng() * 0.5));
    }
    W.yoff = 0;
  }
  function tall(W, x0, z0, x1, z1, h, col, solid) {
    W.box(x0, 0, z0, x1, h, z1, 'windows', { u: 4, color: col, col: solid !== false });
  }
  // espinhos/arame farpado (visual): postes + fios
  function wire(W, x0, z0, x1, z1) {
    const items = [], n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 3)), col = 0x2a2a2a;
    for (let i = 0; i <= n; i++) {
      const x = mix(x0, x1, i / n), z = mix(z0, z1, i / n), y = W.heightAt(x, z);
      items.push(CY(0.04, 1.3, x, y + 0.65, z, 0x4a3b2a));
      if (i < n) { const xx = mix(x0, x1, (i + 1) / n), zz = mix(z0, z1, (i + 1) / n), y2 = W.heightAt(xx, zz); for (const hh of [0.35, 0.7, 1.05]) items.push(LI(x, y + hh, z, xx, y2 + hh - 0.05, zz, 0.025, col)); }
    }
    const m = new T.Mesh(BC.mergeGeoms(items), vmat); m.castShadow = true; W.group.add(m);
    // colisor leve nos postes (impede passar correndo)
    for (let i = 0; i <= n; i++) { const x = mix(x0, x1, i / n), z = mix(z0, z1, i / n); W.addCylCol(x, z, 0.12, W.heightAt(x, z), W.heightAt(x, z) + 1.3, 'wood'); }
  }
  function placeSpawns(W, rng) {
    const H = S.H; W.spawns = [[], []];
    for (let team = 0; team < 2; team++) {
      const s = team === 0 ? 1 : -1;
      for (let i = 0; i < 40; i++) { const p = W.randomFree(rng, -H * 0.72, H * 0.72, s > 0 ? H - 26 : -(H - 8), s > 0 ? H - 8 : -(H - 26), 0.8); p.y = W.heightAt(p.x, p.z); W.spawns[team].push(p); }
    }
    for (const s of [1, -1]) for (const k of [-0.55, -0.2, 0.2, 0.55]) { const p = W.randomFree(rng, k * H - 6, k * H + 6, s * (H - 48), s * (H - 38), 1.0); ammoCrate(W, p.x, p.z); }
    for (let i = 0; i < 4; i++) { const p = W.randomFree(rng, -H * 0.6, H * 0.6, -H * 0.2, H * 0.2, 1.0); ammoCrate(W, p.x, p.z); }
  }
  function distSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? BC.clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
    return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
  }

  // sítios aleatórios espaçados (cabanas, abrigos...) longe das zonas de spawn
  function sites(rng, n, minD, marginZ) {
    const out = [], H = S.H; let g = 0;
    while (out.length < n && g++ < n * 60) {
      const x = (rng() * 2 - 1) * (H - 22), z = (rng() * 2 - 1) * (H - (marginZ || 34));
      if (out.every((q) => Math.hypot(q[0] - x, q[1] - z) > minD)) out.push([x, z]);
    }
    return out;
  }
  const cnt = (n) => Math.max(1, Math.round(n * S.A));
  // morros e montanhas: gaussianas suaves espalhadas (mais baixas perto das zonas de spawn)
  function hillsFn(rng, n, rmin, rmax, hmin, hmax) {
    const H = S.H, L = [];
    for (let i = 0; i < n; i++) L.push([(rng() * 2 - 1) * (H + 10), (rng() * 2 - 1) * (H - 20), rmin + rng() * (rmax - rmin), hmin + rng() * (hmax - hmin)]);
    return (x, z) => {
      let h = 0; const lane = 1 - sm(H - 46, H - 24, Math.abs(z));
      for (const q of L) { const d2 = ((x - q[0]) * (x - q[0]) + (z - q[1]) * (z - q[1])) / (q[2] * q[2]); if (d2 < 1) { const t = 1 - d2; h += q[3] * t * t; } }
      return h * (0.25 + 0.75 * lane);
    };
  }

  // =================== NEVE ===================
  BC.maps.snow = {
    id: 'snow', name: 'Taiga Nevada', desc: 'Pinheiral coberto de neve, cabanas e nevasca. Visão curta, tiros ecoam.',
    sw: ['#e8f0f7', '#8fa6bb'], ambient: 'snow', weather: 'snow', surf: 'snow',
    sky: { top: 0x9fb4c8, horizon: 0xd2dde7 }, fog: { color: 0xd2dde7, density: 0.014 },
    sun: { color: 0xfff1de, i: 0.85, dir: [-0.5, 0.8, 0.35] }, hemi: { sky: 0xcfe0f5, ground: 0xe2e8ee, i: 0.95 }, seed: 101,
    build(W, rng) {
      const hh = hillsFn(rng, cnt(7) + 3, 34, 70, 8, 22);
      const base = (x, z) => 2.4 * (fbm(x * 0.012, z * 0.012, 3) - 0.45) * 2 + 0.5 * fbm(x * 0.09, z * 0.09, 8) + 0.8 * fbm(x * 0.03, z * 0.03, 12) + edge(x, z) + hh(x, z);
      const st = sites(rng, cnt(4) + 2, 38).map((q) => [q[0], q[1], base(q[0], q[1])]);
      const hf = (x, z) => { let h = base(x, z); for (const q of st) h = flatBlend(x, z, q[0], q[1], 12, q[2], h); return h; };
      W.makeTerrain(hf, (x, z, h, sl, o) => {
        const n = fbm(x * 0.15, z * 0.15, 5); mixc(o, 0xf4f8fb, 0xcfdce8, n, 0.95 + 0.1 * n);
        if (sl > 0.45) mixc(o, 0xd8e0e8, 0x7d807f, Math.min(1, (sl - 0.45) * 2.2), 0.95);
      }, 'snow');
      scatter(W, rng, 'pineSnow', cnt(190), { col: 0.3, smin: 0.85, smax: 1.7, sy: true });
      rocks(W, rng, cnt(34), 0.8, 2.4, 0xa9adb0);
      const mounds = []; for (let i = 0; i < cnt(40); i++) { const x = (rng() * 2 - 1) * (S.H + 12), z = (rng() * 2 - 1) * (S.H + 12); if (Math.abs(z) > S.H - 22) continue; const ms = 1.5 + rng() * 2.5, my = W.heightAt(x, z); mounds.push({ x, y: my, z, s: ms, sx: 1.6, sz: 1.1, ry: rng() * 3, c: 0xf2f6fa }); W.addCylCol(x, z, ms * 1.05, my, my + Math.max(0.9, ms * 0.4), 'snow'); }
      W.instanced(treeG.mound(), vmat, mounds, false);
      for (const [cx, cz, y] of st) { const w = 9 + rng() * 3, d = 6 + rng() * 2; hollow(W, rng, cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 2.9, 'log', { u: 1.6, roofMat: 'wood', partition: false, y }); sandbags(W, cx + 9, cz + 3, 4, rng() < 0.5); }
      for (let i = 0; i < cnt(10); i++) { const p = W.randomFree(rng, -S.H + 15, S.H - 15, -S.H + 30, S.H - 30, 1); sandbags(W, p.x, p.z, 3 + rng() * 3, rng() < 0.5); }
      const cols = [0x55606a, 0x6a5a4a, 0x4a5a4a];
      for (let i = 0; i < cnt(3); i++) { const p = W.randomFree(rng, -S.H + 20, S.H - 20, -S.H + 40, S.H - 40, 3); car(W, p.x, p.z, rng() < 0.5, cols[i % 3]); }
      placeSpawns(W, rng);
    }
  };

  // =================== FLORESTA ===================
  BC.maps.forest = {
    id: 'forest', name: 'Floresta Densa', desc: 'Mata fechada, clareiras, troncos caídos e arbustos. Combate em curta distância.',
    sw: ['#6f9a4f', '#26421f'], ambient: 'forest', weather: 'none', surf: 'grass',
    sky: { top: 0x7fa3c0, horizon: 0xb4c4a0 }, fog: { color: 0xa9ba98, density: 0.016 },
    sun: { color: 0xffe2b0, i: 0.9, dir: [-0.6, 0.55, 0.4] }, hemi: { sky: 0xbcd6a8, ground: 0x5c5a3a, i: 0.85 }, seed: 202,
    build(W, rng) {
      const hh = hillsFn(rng, cnt(8) + 3, 30, 64, 7, 18);
      const base = (x, z) => 4.2 * (fbm(x * 0.014, z * 0.014, 4) - 0.5) * 2 + 0.8 * fbm(x * 0.1, z * 0.1, 9) + 1.2 * fbm(x * 0.04, z * 0.04, 6) + edge(x, z) + hh(x, z);
      const st = sites(rng, cnt(2) + 2, 55).map((q) => [q[0], q[1], base(q[0], q[1])]);
      const hf = (x, z) => { let h = base(x, z); for (const q of st) h = flatBlend(x, z, q[0], q[1], 12, q[2], h); return h; };
      W.makeTerrain(hf, (x, z, h, sl, o) => {
        const n = fbm(x * 0.12, z * 0.12, 6), m = fbm(x * 0.4, z * 0.4, 2);
        mixc(o, 0x3f6a2a, 0x6a7a35, n, 0.85 + 0.25 * m);
        if (n > 0.62) mixc(o, 0x5a4a2c, 0x6a5a38, m, 0.9);
        if (sl > 0.5) mixc(o, 0x4d6a30, 0x6b5f45, Math.min(1, (sl - 0.5) * 2), 0.95);
      }, 'grass');
      const clears = sites(rng, cnt(3) + 2, 70, 44).map((q) => [q[0], q[1], 10 + rng() * 10]);
      const clearing = (x, z) => clears.some((c) => Math.hypot(x - c[0], z - c[1]) < c[2]);
      scatter(W, rng, 'oak', cnt(170), { col: 0.3, avoid: clearing, smin: 0.9, smax: 1.7, tint: 0xffffff, sy: true });
      scatter(W, rng, 'pine', cnt(170), { col: 0.3, avoid: clearing, smin: 0.9, smax: 1.6, sy: true });
      scatter(W, rng, 'bush', cnt(160), { smin: 0.7, smax: 1.5, laneKeep: 0.5, shadow: false });
      rocks(W, rng, cnt(30), 0.8, 2.2, 0x7d8078);
      for (let i = 0; i < cnt(20); i++) { const x = (rng() * 2 - 1) * (S.H - 8), z = (rng() * 2 - 1) * (S.H - 20); log(W, x, z, 4 + rng() * 4, 0.38 + rng() * 0.2, rng() < 0.5); }
      for (const [cx, cz, y] of st) hollow(W, rng, cx - 5, cz - 3.5, cx + 5, cz + 3.5, 2.8, 'log', { u: 1.6, roofMat: 'wood', partition: false, y });
      for (let i = 0; i < cnt(8); i++) { const x = (rng() * 2 - 1) * (S.H - 20), z = (rng() * 2 - 1) * (S.H - 30); W.box(x, W.heightAt(x, z) - 0.2, z, x + 4 + rng() * 4, W.heightAt(x, z) + 1.1, z + 0.6, 'rock', { u: 1.5, tag: 'rock' }); }
      for (const c of clears) { sandbags(W, c[0], c[1], 4, true); sandbags(W, c[0] + 4, c[1] - 6, 4, false); }
      placeSpawns(W, rng);
    }
  };

  // =================== TRINCHEIRAS ===================
  BC.maps.trench = {
    id: 'trench', name: 'Trincheiras', desc: 'Frente de lama com crateras, arame farpado e vários sistemas de trincheiras ligados.',
    sw: ['#8a7a5a', '#3a2f22'], ambient: 'trench', weather: 'rain', surf: 'mud',
    sky: { top: 0x6e7378, horizon: 0x9a9a92 }, fog: { color: 0x908e84, density: 0.018 },
    sun: { color: 0xe6dcc8, i: 0.55, dir: [-0.3, 0.9, 0.2] }, hemi: { sky: 0xa8aaa8, ground: 0x6a5f4a, i: 0.95 }, seed: 303,
    build(W, rng) {
      const hh = hillsFn(rng, cnt(6) + 2, 30, 56, 4, 9);
      const H = S.H, segs = [], front = Math.round(H * 0.4), support = Math.round(H * 0.62), rear = Math.round(H * 0.82);
      const line = (z0, sgn) => { let px = -H, pz = z0; for (let x = -H + 10; x <= H; x += 11) { const z = z0 + sgn * (((Math.round(x / 11)) % 2) ? 3 : -3); segs.push([px, pz, x, z]); px = x; pz = z; } };
      for (const z0 of [front, support, rear]) { line(z0, 1); line(-z0, -1); }
      for (let x = -H + 25; x < H - 15; x += 48) segs.push([x, -front, x, front]);                 // trincheiras de ligação pelo campo de ninguém
      for (let x = -H + 50; x < H - 15; x += 62) { segs.push([x, front, x + 6, support], [x, -front, x + 6, -support], [x + 6, support, x, rear], [x + 6, -support, x, -rear]); }
      const craters = [];
      for (let i = 0; i < cnt(34); i++) { const x = (rng() * 2 - 1) * (H - 8), z = (rng() * 2 - 1) * (front - 6); craters.push([x, z, 3 + rng() * 4.5, 0.8 + rng() * 1.6]); }
      for (let i = 0; i < cnt(14); i++) { const x = (rng() * 2 - 1) * (H - 8), z = (rng() < 0.5 ? -1 : 1) * (front + 4 + rng() * (H - front - 24)); craters.push([x, z, 2.5 + rng() * 3, 0.6 + rng() * 1.1]); }
      const bunk = []; for (let x = -H + 40; x < H - 30; x += 60) { bunk.push([x + rng() * 20, support + 14 + rng() * 6], [x + rng() * 20, -support - 14 - rng() * 6]); }
      const hf = (x, z) => {
        let h = 0.5 * (fbm(x * 0.03, z * 0.03, 4) - 0.5) * 2 + 0.2 * fbm(x * 0.2, z * 0.2, 1) + edge(x, z) + hh(x, z);
        for (const q of bunk) h = flatBlend(x, z, q[0], q[1], 14, 0.2, h);
        for (const c of craters) { const d = Math.hypot(x - c[0], z - c[1]); if (d < c[2] * 1.5) { const q = d / c[2]; h -= c[3] * (q < 1 ? (1 - q * q) : 0) - (q > 0.9 && q < 1.5 ? 0.22 * Math.sin((q - 0.9) / 0.6 * Math.PI) : 0); } }
        let dm = 99; for (const s of segs) { if (Math.abs(z - (s[1] + s[3]) / 2) > 40 && Math.abs(s[1] - s[3]) < 20) continue; const d = distSeg(x, z, s[0], s[1], s[2], s[3]); if (d < dm) dm = d; }
        h -= 2.0 * (1 - sm(1.3, 3.7, dm));
        return h;
      };
      W.makeTerrain(hf, (x, z, h, sl, o) => {
        const n = fbm(x * 0.1, z * 0.1, 6), m = fbm(x * 0.5, z * 0.5, 2);
        mixc(o, 0x5b4a33, 0x76664a, n, 0.8 + 0.3 * m);
        if (h < -0.6) mixc(o, 0x3a3023, 0x4a4030, m, 0.75);
        if (h < -1.7) mixc(o, 0x2f3a3a, 0x3a463f, m, 0.9);
      }, 'mud');
      for (const sgn of [1, -1]) for (const z0 of [front, support]) for (let x = -H + 12; x < H - 8; x += 9) { if (rng() < 0.3) continue; sandbags(W, x, sgn * (z0 - 5.2), 5, true, 0.9); }
      for (const sgn of [1, -1]) for (let x = -H; x < H - 30; x += 54) { wire(W, x, sgn * (front - 20), x + 24, sgn * (front - 18)); wire(W, x + 26, sgn * (front - 24), x + 50, sgn * (front - 24)); }
      scatter(W, rng, 'dead', cnt(30), { col: 0.25, smin: 0.9, smax: 1.4 });
      rocks(W, rng, cnt(14), 0.5, 1.2, 0x6a6458);
      for (let i = 0; i < cnt(2) + 1; i++) {
        const x = (rng() * 2 - 1) * (H - 20), z = (rng() * 2 - 1) * (front - 12), y = W.heightAt(x, z);
        W.box(x - 3.2, y - 0.2, z - 1.7, x + 3.2, y + 1.2, z + 1.7, 'rust', { u: 2, color: 0x6a6a52, tag: 'metal' });
        W.box(x - 1.3, y + 1.2, z - 1.0, x + 1.2, y + 2.0, z + 1.0, 'rust', { u: 2, color: 0x6a6a52, tag: 'metal' });
        W.box(x - 4.4, y + 1.35, z - 0.12, x - 1.3, y + 1.6, z + 0.12, 'rust', { u: 2, color: 0x55554a, tag: 'metal' });
      }
      for (const [x, z] of bunk) hollow(W, rng, x - 4, z - 3, x + 4, z + 3, 2.4, 'concrete', { partition: false, color: 0x8a8a84, y: 0.2 });
      placeSpawns(W, rng);
    }
  };

  // =================== CIDADE ===================
  BC.maps.city = {
    id: 'city', name: 'Cidade em Ruínas', desc: 'Quarteirões urbanos: prédios com interior, ruas bloqueadas por carros e escombros.',
    sw: ['#9a9da0', '#3f464c'], ambient: 'city', weather: 'dust', surf: 'concrete',
    sky: { top: 0x7f9bb3, horizon: 0xc2c4c0 }, fog: { color: 0xb9bbb8, density: 0.011 },
    sun: { color: 0xfff0d8, i: 1.0, dir: [-0.45, 0.85, 0.3] }, hemi: { sky: 0xc6d6e6, ground: 0x6a6a68, i: 0.9 }, seed: 404,
    build(W, rng) {
      const H = S.H, n = Math.floor((H - 8) / 40);
      const near = (v) => { const k = Math.round(v / 40); return Math.abs(k) <= n && Math.abs(v - k * 40) < 6 ? k * 40 : null; };
      W.makeTerrain((x, z) => edge(x, z) * 0.8, (x, z, h, sl, o) => {
        const sx = near(x), sz = near(z), nn = fbm(x * 0.3, z * 0.3, 3);
        if (Math.abs(x) < H + 4 && Math.abs(z) < H + 4 && (sx !== null || sz !== null)) setc(o, 0x3b3d40, 0.85 + 0.2 * nn); else mixc(o, 0x7e7f7a, 0x6a6b66, nn, 0.95);
      }, 'concrete');
      const kinds = ['hollow', 'hollow', 'hollow', 'tall', 'tall', 'ruin', 'ruin', 'lot'];
      for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
        const x0 = i * 40 + 7, x1 = (i + 1) * 40 - 7, z0 = j * 40 + 7, z1 = (j + 1) * 40 - 7, zc = (z0 + z1) / 2, xc = (x0 + x1) / 2;
        if (Math.abs(zc) > H - 34 || Math.abs(xc) > H - 12) continue;     // zonas de spawn ficam abertas
        const kind = kinds[(rng() * kinds.length) | 0];
        if (kind === 'hollow') {
          const split = rng() < 0.5, mat = rng() < 0.5 ? 'brick' : 'plaster', col = [0xffffff, 0xd8c8b0, 0xb8c0c8][(rng() * 3) | 0];
          if (split) { const mx = (x0 + x1) / 2; hollow(W, rng, x0, z0, mx - 1.5, z1, 3.4, mat, { color: col, y: 0 }); hollow(W, rng, mx + 1.5, z0 + 3, x1, z1 - 3, 3.4, 'plaster', { color: 0xc8d0c0, y: 0 }); }
          else hollow(W, rng, x0 + 2, z0 + 3, x1 - 2, z1 - 3, 3.6, mat, { color: col, y: 0 });
        } else if (kind === 'tall') {
          tall(W, x0 + 1, z0 + 2, x1 - 1, z1 - 2, 12 + rng() * 12, [0xffffff, 0xcfc8bc][(rng() * 2) | 0], true); crate(W, x0 - 0.3, zc, 1.2, 'crate');
        } else if (kind === 'ruin') {
          const h = 3.2 + rng() * 2, bx0 = x0 + 1, bx1 = x1 - 1, bz0 = z0 + 2, bz1 = z1 - 2;
          W.wall(bx0, bz0, bx1, bz0, 0.4, h, [{ a: 5, b: 9, yb: 0, yt: 2.4 }, { a: 14, b: 19, yb: 0.9, yt: h }], 'brick', { u: 2.5 });
          W.wall(bx0, bz1, bx1, bz1, 0.4, h * 0.7, [{ a: 8, b: 11, yb: 0, yt: 2.3 }], 'brick', { u: 2.5, color: 0xd8c8b8 });
          W.wall(bx0, bz0, bx0, bz1, 0.4, h * 0.6, [{ a: 6, b: 10, yb: 0, yt: h }], 'plaster', { u: 2.5 });
          for (let q = 0; q < 7; q++) { const x = bx0 + 2 + rng() * (bx1 - bx0 - 4), z = bz0 + 2 + rng() * (bz1 - bz0 - 4), s = 0.6 + rng() * 1.1; crate(W, x, z, s, 'rock', s * (0.5 + rng() * 0.6)); }
        } else { for (let q = 0; q < 6; q++) { const x = x0 + 2 + rng() * (x1 - x0 - 4), z = z0 + 2 + rng() * (z1 - z0 - 4), s = 0.8 + rng() * 1.4; crate(W, x, z, s, rng() < 0.5 ? 'sandbag' : 'concrete', s * (0.6 + rng() * 0.8)); } }
      }
      const cols = [0x6a3030, 0x30486a, 0x6a6a30, 0x808080, 0x2f2f2f, 0x3b5d3b];
      for (let i = 0; i < cnt(16); i++) {
        const onX = rng() < 0.5, line = ((rng() * (2 * n + 1) | 0) - n) * 40 + (rng() * 6 - 3), t = (rng() * 2 - 1) * (H - 14);
        const x = onX ? t : line, z = onX ? line : t; if (Math.abs(x) > H - 6 || Math.abs(z) > H - 6) continue; car(W, x, z, onX, cols[(rng() * cols.length) | 0]);
      }
      for (let i = 0; i < cnt(12); i++) { const x = (rng() * 2 - 1) * (H - 8), z = (rng() * 2 - 1) * (H - 8); if (rng() < 0.5) W.box(x - 1.5, 0, z - 0.4, x + 1.5, 1.0, z + 0.4, 'concrete', { u: 1.5, color: 0xbdbdb5 }); else crate(W, x, z, 1.4, 'sandbag', 1.0); }
      for (let i = 0; i < cnt(6); i++) { const x = (rng() * 2 - 1) * (H - 14), z = (rng() * 2 - 1) * (H - 14); W.box(x - 3, 0, z - 1.2, x + 3, 2.6, z + 1.2, 'metal', { color: [0x7a3b2a, 0x2f4a6a, 0x5a6a30][(rng() * 3) | 0], tag: 'metal' }); }
      for (let i = 0; i < Math.round(30 * S.K); i++) {
        const a = rng() * 6.283, r = H + 14 + rng() * 16, x = Math.cos(a) * r * 1.0, z = Math.sin(a) * r * 1.0, w = 8 + rng() * 10, h = 14 + rng() * 26;
        W.box(x - w / 2, -1, z - w / 2, x + w / 2, h, z + w / 2, 'windows', { u: 4, color: [0xffffff, 0xd8d0c0, 0xb8c0cc][(rng() * 3) | 0], col: false });
      }
      scatter(W, rng, 'dead', cnt(8), { col: 0.25, laneKeep: 0.9 });
      placeSpawns(W, rng);
    }
  };

  // =================== PÂNTANO ===================
  BC.maps.swamp = {
    id: 'swamp', name: 'Pântano', desc: 'Água rasa que atrasa, ilhas de lama, ciprestes e passarelas de madeira. Névoa pesada.',
    sw: ['#6c7a45', '#2c3a22'], ambient: 'swamp', weather: 'rain', surf: 'mud',
    sky: { top: 0x6d7a68, horizon: 0x93a078 }, fog: { color: 0x859060, density: 0.026 },
    sun: { color: 0xe8e0a8, i: 0.55, dir: [-0.4, 0.7, 0.3] }, hemi: { sky: 0x9fae8a, ground: 0x3d4a2a, i: 0.95 }, seed: 505,
    build(W, rng) {
      const hh = hillsFn(rng, cnt(5) + 2, 24, 44, 4, 9);
      const H = S.H, shacks = sites(rng, cnt(4) + 2, 34, 40).sort((a, b) => a[0] - b[0]);
      W.waterY = -0.05;
      const hf = (x, z) => {
        let h = (fbm(x * 0.024, z * 0.024, 7) - 0.46) * 6 + 0.25 * fbm(x * 0.15, z * 0.15, 3) + edge(x, z) * 0.7 + hh(x, z);
        const lane = sm(H - 24, H - 16, Math.abs(z)); h = mix(h, Math.max(h, 0.35), lane);
        for (const s of shacks) h = flatBlend(x, z, s[0], s[1], 10, 0.4, h);
        return h;
      };
      W.makeTerrain(hf, (x, z, h, sl, o) => {
        const n = fbm(x * 0.2, z * 0.2, 6);
        if (h < -0.05) mixc(o, 0x3a4228, 0x2e3822, n, 0.85); else mixc(o, 0x55623a, 0x6a6a40, n, 0.9 + 0.2 * n);
        if (h > -0.3 && h < 0.2) mixc(o, 0x4a4630, 0x3c3c28, n, 0.9);
      }, 'mud');
      const wm = new T.Mesh(new T.PlaneGeometry(2 * W.half + 40, 2 * W.half + 40), new T.MeshLambertMaterial({ color: 0x39472a, map: BC.tex('water'), transparent: true, opacity: 0.82 }));
      wm.material.map = wm.material.map.clone(); wm.material.map.repeat.set(W.half / 3, W.half / 3); wm.material.map.needsUpdate = true;
      wm.rotation.x = -Math.PI / 2; wm.position.y = W.waterY; W.group.add(wm); W.water = wm;
      const nearShack = (x, z) => shacks.some((s) => Math.hypot(x - s[0], z - s[1]) < 8);
      scatter(W, rng, 'cypress', cnt(110), { col: 0.35, smin: 0.9, smax: 1.7, avoid: nearShack, minAbove: -0.5, sy: true });
      scatter(W, rng, 'reed', Math.min(4000, cnt(700)), { smin: 0.7, smax: 1.5, laneKeep: 0.4, minAbove: -0.6, shadow: false });
      scatter(W, rng, 'bush', cnt(60), { smin: 0.6, smax: 1.2, laneKeep: 0.5, shadow: false });
      scatter(W, rng, 'dead', cnt(18), { col: 0.25, minAbove: -0.4 });
      for (const [sx, sz] of shacks) { hollow(W, rng, sx - 4, sz - 3, sx + 4, sz + 3, 2.6, 'wood', { u: 1.6, partition: false, roofMat: 'rust', y: 0.4 }); W.box(sx - 4.4, 0.2, sz - 3.4, sx + 4.4, 0.45, sz + 3.4, 'wood', { u: 1.6, tag: 'wood' }); }
      const links = []; for (let i = 0; i < shacks.length - 1; i++) links.push([shacks[i][0], shacks[i][1], shacks[i + 1][0], shacks[i + 1][1]]);
      for (let i = 0; i < shacks.length - 2; i += 2) links.push([shacks[i][0], shacks[i][1], shacks[i + 2][0], shacks[i + 2][1]]);
      links.push([shacks[0][0], shacks[0][1], -H + 20, shacks[0][1] * 0.5], [shacks[shacks.length - 1][0], shacks[shacks.length - 1][1], H - 20, 0]);
      for (const b of links) {
        const nn = Math.round(Math.hypot(b[2] - b[0], b[3] - b[1]) / 2.4);
        for (let i = 0; i < nn; i++) { const x = mix(b[0], b[2], (i + 0.5) / nn), z = mix(b[1], b[3], (i + 0.5) / nn); W.box(x - 1.3, 0.04, z - 1.3, x + 1.3, 0.2, z + 1.3, 'wood', { u: 1.2, tag: 'wood' }); }
      }
      for (let i = 0; i < cnt(14); i++) { const x = (rng() * 2 - 1) * (H - 8), z = (rng() * 2 - 1) * (H - 24); log(W, x, z, 4 + rng() * 4, 0.35 + rng() * 0.2, rng() < 0.5); }
      for (let i = 0; i < cnt(6); i++) { const x = (rng() * 2 - 1) * (H - 20), z = (rng() * 2 - 1) * (H - 30); sandbags(W, x, z, 3.5, rng() < 0.5, 0.9); }
      rocks(W, rng, cnt(12), 0.6, 1.4, 0x6a6e58);
      placeSpawns(W, rng);
    }
  };

  // =================== DESERTO ===================
  BC.maps.desert = {
    id: 'desert', name: 'Deserto', desc: 'Dunas abertas, vilarejos de adobe em ruínas e oásis. Longas distâncias: bom para o fuzil de precisão.',
    sw: ['#e0c486', '#a47c42'], ambient: 'desert', weather: 'dust', surf: 'sand',
    sky: { top: 0x6fa0d0, horizon: 0xe6d6b0 }, fog: { color: 0xe0cfa6, density: 0.009 },
    sun: { color: 0xfff0cc, i: 1.15, dir: [-0.35, 0.9, 0.25] }, hemi: { sky: 0xd8e4f0, ground: 0xb89a62, i: 0.9 }, seed: 606,
    build(W, rng) {
      const hh = hillsFn(rng, cnt(6) + 3, 36, 76, 9, 20);
      const H = S.H, comps = sites(rng, cnt(6) + 2, 46, 40), oases = sites(rng, Math.max(2, cnt(1)), 90, 60);
      const hf = (x, z) => {
        const r = 1 - Math.abs(2 * fbm(x * 0.013, z * 0.013, 9) - 1);
        let h = 4.6 * (r * r - 0.4) + 0.4 * fbm(x * 0.12, z * 0.12, 4) + edge(x, z) * 0.8 + hh(x, z);
        h = mix(h, h * 0.25, sm(H - 28, H - 18, Math.abs(z)));
        for (const c of comps) h = flatBlend(x, z, c[0], c[1], 17, 0.3, h);
        return h;
      };
      W.makeTerrain(hf, (x, z, h, sl, o) => {
        const n = fbm(x * 0.25, z * 0.25, 2), rip = 0.5 + 0.5 * Math.sin((x * 0.6 + z * 0.4) + fbm(x * 0.1, z * 0.1, 1) * 8);
        mixc(o, 0xe0c486, 0xc8a76a, n, 0.9 + 0.12 * rip);
        if (sl > 0.5) mixc(o, 0xc8a76a, 0x8a7a60, Math.min(1, (sl - 0.5) * 1.6), 0.95);
      }, 'sand');
      for (const [cx, cz] of comps) {
        const w = 12 + rng() * 6, d = 9 + rng() * 5;
        hollow(W, rng, cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 3.1, 'adobe', { u: 2.2, partition: rng() < 0.6, roof: rng() < 0.5, roofMat: 'adobe', y: 0.3 });
        if (rng() < 0.7) { const ox = cx + (rng() < 0.5 ? -1 : 1) * (w / 2 + 4); W.wall(ox - 3, cz - 5, ox + 3, cz - 5, 0.4, 1.9, [{ a: 2.4, b: 3.6, yb: 0, yt: 2.2 }], 'adobe', { u: 2.2 }); }
      }
      scatter(W, rng, 'palm', cnt(26), { col: 0.2, colH: 5, avoid: (x, z) => !oases.some((o) => Math.hypot(x - o[0], z - o[1]) < 20 && Math.hypot(x - o[0], z - o[1]) > 4), smin: 0.9, smax: 1.3, laneKeep: 0 });
      rocks(W, rng, cnt(34), 0.7, 2.2, 0xb59a70);
      for (let i = 0; i < cnt(8); i++) { const x = (rng() * 2 - 1) * (H - 18), z = (rng() * 2 - 1) * (H - 30); sandbags(W, x, z, 3.5, rng() < 0.5, 0.9); }
      for (let i = 0; i < cnt(2) + 1; i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 3); car(W, p.x, p.z, rng() < 0.5, [0x6a5a40, 0x555a4a][i % 2]); }
      for (let i = 0; i < cnt(1) + 1; i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 4), x = p.x, z = p.z, y = W.heightAt(x, z); W.box(x - 3.3, y, z - 1.6, x + 3.3, y + 1.6, z + 1.6, 'rust', { u: 2, color: 0x8a8062, tag: 'metal' }); W.box(x - 1.6, y + 1.6, z - 1.2, x + 1.2, y + 2.3, z + 1.2, 'rust', { u: 2, color: 0x8a8062, tag: 'metal' }); }
      for (let i = 0; i < cnt(20); i++) { const x = (rng() * 2 - 1) * (H - 18), z = (rng() * 2 - 1) * (H - 30); crate(W, x, z, 0.9 + rng(), 'adobe', 0.7 + rng() * 0.8); }
      scatter(W, rng, 'dead', cnt(8), { col: 0.2, smin: 0.7, smax: 1.1 });
      placeSpawns(W, rng);
    }
  };

  // =================== SELVA ===================
  BC.maps.jungle = {
    id: 'jungle', name: 'Selva Tropical', desc: 'Vegetação fechada, chuva, cabanas de palha e trilhas de lama. Visão curtíssima.',
    sw: ['#3f7a35', '#142a12'], ambient: 'swamp', weather: 'rain', surf: 'mud',
    sky: { top: 0x5f7a66, horizon: 0x8aa282 }, fog: { color: 0x7a9072, density: 0.03 },
    sun: { color: 0xdfe8b8, i: 0.6, dir: [-0.3, 0.75, 0.3] }, hemi: { sky: 0x93b58a, ground: 0x2c3a20, i: 0.9 }, seed: 707,
    build(W, rng) {
      const hh = hillsFn(rng, cnt(9) + 3, 28, 60, 8, 20);
      const base = (x, z) => 3.6 * (fbm(x * 0.018, z * 0.018, 14) - 0.5) * 2 + 0.7 * fbm(x * 0.1, z * 0.1, 15) + edge(x, z) + hh(x, z);
      const st = sites(rng, cnt(3) + 2, 55).map((q) => [q[0], q[1], base(q[0], q[1])]);
      const hf = (x, z) => { let h = base(x, z); for (const q of st) h = flatBlend(x, z, q[0], q[1], 12, q[2], h); return h; };
      W.makeTerrain(hf, (x, z, h, sl, o) => { const n = fbm(x * 0.14, z * 0.14, 6), m = fbm(x * 0.5, z * 0.5, 2); mixc(o, 0x2f5a26, 0x4d4a2c, n, 0.75 + 0.3 * m); if (n > 0.6) mixc(o, 0x4a3b28, 0x5a4a30, m, 0.85); }, 'mud');
      const tint = 0x9fc08a;
      scatter(W, rng, 'oak', cnt(230), { col: 0.3, smin: 1.0, smax: 2.0, tint, sy: true });
      scatter(W, rng, 'palm', cnt(200), { col: 0.2, colH: 5, smin: 0.9, smax: 1.5 });
      scatter(W, rng, 'bush', cnt(360), { smin: 0.8, smax: 1.7, laneKeep: 0.5, shadow: false });
      scatter(W, rng, 'reed', cnt(500), { smin: 0.8, smax: 1.6, laneKeep: 0.4, shadow: false });
      rocks(W, rng, cnt(24), 0.8, 2.0, 0x68705c);
      for (let i = 0; i < cnt(20); i++) { const x = (rng() * 2 - 1) * (S.H - 8), z = (rng() * 2 - 1) * (S.H - 20); log(W, x, z, 4 + rng() * 4, 0.4 + rng() * 0.2, rng() < 0.5); }
      for (const [cx, cz, y] of st) { hollow(W, rng, cx - 4.5, cz - 3.5, cx + 4.5, cz + 3.5, 2.6, 'wood', { u: 1.6, roofMat: 'wood', partition: false, y }); sandbags(W, cx + 7, cz, 3.5, false, 0.9); }
      placeSpawns(W, rng);
    }
  };

  // =================== MONTANHA ===================
  BC.maps.mountain = {
    id: 'mountain', name: 'Desfiladeiro de Montanha', desc: 'Cristas rochosas, vales estreitos e neve rala. Terreno alto para atiradores.',
    sw: ['#9aa0a8', '#3d434a'], ambient: 'snow', weather: 'snow', surf: 'rock',
    sky: { top: 0x6f8fb5, horizon: 0xc4ced6 }, fog: { color: 0xbcc6ce, density: 0.011 },
    sun: { color: 0xfff4e4, i: 1.0, dir: [-0.5, 0.75, 0.4] }, hemi: { sky: 0xcfdcea, ground: 0x7a7e84, i: 0.9 }, seed: 808,
    build(W, rng) {
      const H = S.H, st = sites(rng, cnt(3) + 2, 60).map((q) => [q[0], q[1]]);
      const base = (x, z) => { const r = 1 - Math.abs(2 * fbm(x * 0.012, z * 0.012, 21) - 1); let h = 17 * (r * r - 0.35) + 2 * fbm(x * 0.08, z * 0.08, 22); const lane = sm(H - 34, H - 18, Math.abs(z)); h = mix(h, Math.min(h, 2.5), lane); return h + edge(x, z) * 1.4; };
      const sites2 = st.map((q) => [q[0], q[1], Math.min(base(q[0], q[1]), 6)]);
      const hf = (x, z) => { let h = base(x, z); for (const q of sites2) h = flatBlend(x, z, q[0], q[1], 14, q[2], h); return h; };
      W.makeTerrain(hf, (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 5); mixc(o, 0x7d8087, 0x5d6168, n, 0.9); if (sl < 0.5 && h > 3) mixc(o, 0xeef2f5, 0xcdd6de, n, 0.97); if (h < 1.5 && sl < 0.35) mixc(o, 0x5a5a48, 0x6a6a54, n, 0.9); }, 'rock');
      scatter(W, rng, 'pineSnow', cnt(70), { col: 0.3, smin: 0.8, smax: 1.5, sy: true });
      rocks(W, rng, cnt(90), 1.0, 4.0, 0x8a8e94);
      for (const [cx, cz, y] of sites2) { hollow(W, rng, cx - 5, cz - 3.5, cx + 5, cz + 3.5, 2.6, 'concrete', { partition: false, color: 0x8a8d90, y }); sandbags(W, cx + 7, cz + 1, 4, false); sandbags(W, cx - 7, cz - 1, 4, false); }
      for (let i = 0; i < cnt(8); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 1); sandbags(W, p.x, p.z, 3 + rng() * 3, rng() < 0.5); }
      placeSpawns(W, rng);
    }
  };

  // =================== ZONA INDUSTRIAL ===================
  BC.maps.industrial = {
    id: 'industrial', name: 'Zona Industrial', desc: 'Armazéns, pilhas de contêineres, tanques e trilhos. Combate vertical e corredores.',
    sw: ['#7a7468', '#2e2b27'], ambient: 'city', weather: 'dust', surf: 'concrete',
    sky: { top: 0x7691ac, horizon: 0xb8b7b0 }, fog: { color: 0xaeada8, density: 0.012 },
    sun: { color: 0xffeccc, i: 0.95, dir: [-0.4, 0.8, 0.35] }, hemi: { sky: 0xbfcfdf, ground: 0x63605a, i: 0.9 }, seed: 909,
    build(W, rng) {
      const H = S.H;
      W.makeTerrain((x, z) => edge(x, z) * 0.7, (x, z, h, sl, o) => { const n = fbm(x * 0.25, z * 0.25, 3), rail = Math.abs(((x + 400) % 60) - 30) < 1.2 && Math.abs(z) < H; mixc(o, 0x6d6b66, 0x5a5853, n, 0.95); if (rail) setc(o, 0x3a3128, 0.9); }, 'concrete');
      const cols = [0x7a3b2a, 0x2f4a6a, 0x5a6a30, 0x8a7a2a, 0x6a2f2f, 0x3b5d5d];
      for (const [cx, cz] of sites(rng, cnt(7) + 2, 48, 40)) {
        const w = 18 + rng() * 14, d = 12 + rng() * 8; hollow(W, rng, cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, 6.2, 'metal', { u: 3, partition: true, roofMat: 'metal', y: 0, color: [0xb0b4b8, 0x9aa0a4][(rng() * 2) | 0] });
      }
      for (const [cx, cz] of sites(rng, cnt(9) + 3, 30, 36)) {
        const nx = 2 + ((rng() * 3) | 0), nz = 1 + ((rng() * 2) | 0), lv = 1 + ((rng() * 3) | 0);
        for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) for (let l = 0; l < lv; l++) if (l === 0 || rng() < 0.8) W.box(cx + a * 6.4 - 3, l * 2.6, cz + b * 2.6 - 1.2, cx + a * 6.4 + 3, l * 2.6 + 2.6, cz + b * 2.6 + 1.2, 'metal', { color: cols[(rng() * cols.length) | 0], tag: 'metal' });
      }
      for (const [cx, cz] of sites(rng, cnt(3) + 1, 60, 40)) { W.cyl(cx, cz, 6, 0, 12, 'metal', { color: 0xb8bcc0, tag: 'metal' }); }
      for (let i = 0; i < cnt(14); i++) { const x = (rng() * 2 - 1) * (H - 10), z = (rng() * 2 - 1) * (H - 30); W.box(x - 1.5, 0, z - 0.4, x + 1.5, 1.0, z + 0.4, 'concrete', { u: 1.5, color: 0xbdbdb5 }); }
      for (let i = 0; i < cnt(8); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 3); car(W, p.x, p.z, rng() < 0.5, [0x6a6a30, 0x808080, 0x2f2f2f][i % 3]); }
      placeSpawns(W, rng);
    }
  };

  // =================== VILA RURAL ===================
  BC.maps.village = {
    id: 'village', name: 'Vila Rural', desc: 'Casas de alvenaria, celeiros, cercas e campos abertos. Mistura de curta e média distância.',
    sw: ['#a8c26a', '#4a6a2a'], ambient: 'forest', weather: 'none', surf: 'grass',
    sky: { top: 0x6f9fd0, horizon: 0xcfdcc8 }, fog: { color: 0xc4d2bb, density: 0.009 },
    sun: { color: 0xfff1d0, i: 1.05, dir: [-0.45, 0.85, 0.3] }, hemi: { sky: 0xd0e2f0, ground: 0x6a7a3a, i: 0.9 }, seed: 1010,
    build(W, rng) {
      const H = S.H, vill = sites(rng, cnt(3) + 2, 90, 40);
      const hh = hillsFn(rng, cnt(6) + 3, 40, 80, 8, 16);
      const base = (x, z) => 2.6 * (fbm(x * 0.012, z * 0.012, 31) - 0.5) * 2 + 0.4 * fbm(x * 0.08, z * 0.08, 32) + edge(x, z) + hh(x, z);
      const pad = [];
      for (const v of vill) for (let k = 0; k < 7; k++) { const x = v[0] + (rng() * 2 - 1) * 28, z = v[1] + (rng() * 2 - 1) * 28; if (Math.abs(x) < H - 20 && Math.abs(z) < H - 36) pad.push([x, z, base(x, z)]); }
      const hf = (x, z) => { let h = base(x, z); for (const q of pad) h = flatBlend(x, z, q[0], q[1], 10, q[2], h); return h; };
      W.makeTerrain(hf, (x, z, h, sl, o) => { const n = fbm(x * 0.1, z * 0.1, 6), f = Math.floor(x / 20 + 50) + Math.floor(z / 26 + 50); const field = (f % 3 === 0) ? 0xc9b24a : (f % 3 === 1) ? 0x5f8a3a : 0x7a9a40; mixc(o, field, 0x6f7a3a, n * 0.4, 0.9 + 0.15 * fbm(x * 0.5, z * 0.5, 2)); }, 'grass');
      scatter(W, rng, 'oak', cnt(70), { col: 0.3, smin: 1, smax: 1.6, tint: 0xffffff, sy: true });
      scatter(W, rng, 'bush', cnt(90), { smin: 0.7, smax: 1.4, laneKeep: 0.5, shadow: false });
      rocks(W, rng, cnt(16), 0.6, 1.6, 0x888a80);
      pad.forEach((q, i) => { const w = 7 + rng() * 5, d = 6 + rng() * 4, big = i % 7 === 0; if (big) hollow(W, rng, q[0] - 9, q[1] - 6, q[0] + 9, q[1] + 6, 6.0, 'wood', { u: 2, roofMat: 'wood', partition: false, y: q[2], color: 0xb04a3a }); else hollow(W, rng, q[0] - w / 2, q[1] - d / 2, q[0] + w / 2, q[1] + d / 2, 3.0, rng() < 0.5 ? 'plaster' : 'brick', { u: 2.2, roofMat: 'rust', y: q[2], color: [0xffffff, 0xe8dcc4, 0xd8c8a8][(rng() * 3) | 0] }); });
      for (let i = 0; i < cnt(24); i++) { const x = (rng() * 2 - 1) * (H - 12), z = (rng() * 2 - 1) * (H - 30); const y = W.heightAt(x, z); const along = rng() < 0.5, len = 6 + rng() * 8; if (along) W.box(x, y, z, x + len, y + 1.1, z + 0.25, 'wood', { u: 1.5 }); else W.box(x, y, z, x + 0.25, y + 1.1, z + len, 'wood', { u: 1.5 }); }
      for (let i = 0; i < cnt(14); i++) { const x = (rng() * 2 - 1) * (H - 12), z = (rng() * 2 - 1) * (H - 30); W.cyl(x, z, 1.4, W.heightAt(x, z), W.heightAt(x, z) + 2.2, 'sand', { color: 0xd2b45a, tag: 'wood' }); }
      for (let i = 0; i < cnt(5); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 3); car(W, p.x, p.z, rng() < 0.5, [0x2f5a3a, 0x8a3a2a, 0x3a4a6a][i % 3]); }
      for (let i = 0; i < cnt(8); i++) { const x = (rng() * 2 - 1) * (H - 20), z = (rng() * 2 - 1) * (H - 30); sandbags(W, x, z, 3.5, rng() < 0.5, 0.9); }
      placeSpawns(W, rng);
    }
  };

  // =================== BASE AÉREA ===================
  BC.maps.airbase = {
    id: 'airbase', name: 'Base Aérea', desc: 'Pista longa, hangares, torre de controle e aeronaves estacionadas. Muito espaço aberto.',
    sw: ['#9a9a98', '#4a4d52'], ambient: 'desert', weather: 'dust', surf: 'concrete',
    sky: { top: 0x6f9ad0, horizon: 0xcdd6dc }, fog: { color: 0xc6ced4, density: 0.008 },
    sun: { color: 0xfff4dc, i: 1.1, dir: [-0.35, 0.9, 0.3] }, hemi: { sky: 0xd4e2f0, ground: 0x7a7c78, i: 0.9 }, seed: 1111,
    build(W, rng) {
      const H = S.H;
      const hh = hillsFn(rng, cnt(6) + 2, 36, 70, 7, 15);
      W.makeTerrain((x, z) => edge(x, z) * 0.6 + hh(x, z) * sm(34, 62, Math.abs(x)), (x, z, h, sl, o) => {
        const n = fbm(x * 0.2, z * 0.2, 3); mixc(o, 0x7f827c, 0x6c6f69, n, 0.95);
        if (Math.abs(x) < 24 && Math.abs(z) < H + 4) { setc(o, 0x4a4c50, 0.9 + 0.1 * n); if (Math.abs(x) < 0.5 && ((z + 400) % 14) < 7) setc(o, 0xd8d8d0, 0.9); }
      }, 'concrete');
      for (const sx of [-1, 1]) for (let i = 0; i < cnt(2) + 1; i++) { const cx = sx * (46 + rng() * 14), cz = (rng() * 2 - 1) * (H - 50); hollow(W, rng, cx - 12, cz - 9, cx + 12, cz + 9, 9, 'metal', { u: 3, partition: false, roofMat: 'metal', y: 0, color: 0xa8acb0 }); }
      const tx = 70, tz = -H * 0.2; tall(W, tx - 4, tz - 4, tx + 4, tz + 4, 22, 0xd8d8d0, true); W.box(tx - 6, 22, tz - 6, tx + 6, 25, tz + 6, 'windows', { u: 4, color: 0xb0c0cc });
      for (let i = 0; i < cnt(5); i++) { const x = (rng() < 0.5 ? -1 : 1) * (28 + rng() * 12), z = (rng() * 2 - 1) * (H - 40);
        W.box(x - 1.4, 0.8, z - 9, x + 1.4, 3.2, z + 9, 'metal', { color: 0x9aa0a6, tag: 'metal' }); W.box(x - 11, 1.8, z - 1.5, x + 11, 2.5, z + 1.5, 'metal', { color: 0x8a9096, tag: 'metal' }); W.box(x - 0.2, 3.2, z + 6, x + 0.2, 7.5, z + 9, 'metal', { color: 0x8a9096, tag: 'metal' }); }
      for (let i = 0; i < cnt(4); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 6); W.cyl(p.x, p.z, 5, 0, 7, 'metal', { color: 0xc4c8cc, tag: 'metal' }); }
      for (let i = 0; i < cnt(14); i++) { const x = (rng() * 2 - 1) * (H - 10), z = (rng() * 2 - 1) * (H - 30); if (Math.abs(x) < 25) continue; W.box(x - 1.5, 0, z - 0.4, x + 1.5, 1.0, z + 0.4, 'concrete', { u: 1.5, color: 0xbdbdb5 }); }
      for (let i = 0; i < cnt(6); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 3); car(W, p.x, p.z, rng() < 0.5, [0x4a5a3a, 0x6a6a6a][i % 2]); sandbags(W, p.x + 5, p.z, 4, false); }
      placeSpawns(W, rng);
    }
  };

  // =================== ILHA COSTEIRA ===================
  BC.maps.coast = {
    id: 'coast', name: 'Ilha Costeira', desc: 'Praias, falésias com bunkers, píeres de madeira e mar aberto ao redor.',
    sw: ['#4aa0c8', '#c9b27a'], ambient: 'desert', weather: 'none', surf: 'sand',
    sky: { top: 0x5a9ad8, horizon: 0xcfe2ea }, fog: { color: 0xbcd6e0, density: 0.008 },
    sun: { color: 0xfff2d0, i: 1.15, dir: [-0.4, 0.85, 0.3] }, hemi: { sky: 0xd6e8f4, ground: 0xb8a878, i: 0.9 }, seed: 1212,
    build(W, rng) {
      const hh = hillsFn(rng, cnt(5) + 2, 30, 60, 8, 18);
      const H = S.H; W.waterY = -0.05;
      const bk = sites(rng, cnt(3) + 2, 60, 50).map((q) => [q[0], q[1]]);
      const base = (x, z) => { const d = Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(z), 4), 0.25); let h = 6.5 * (1 - sm(H * 0.62, H + 22, d)) - 1.8 + 2.2 * (fbm(x * 0.02, z * 0.02, 41) - 0.4) + hh(x, z) * (1 - sm(H * 0.7, H + 10, d)); const lane = sm(H - 34, H - 22, Math.abs(z)); h = mix(h, Math.max(h, 0.5), lane); return h; };
      const b2 = bk.map((q) => [q[0], q[1], Math.max(1.2, base(q[0], q[1]))]);
      const hf = (x, z) => { let h = base(x, z); for (const q of b2) h = flatBlend(x, z, q[0], q[1], 13, q[2], h); return h; };
      W.makeTerrain(hf, (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 4); if (h < 0.5) mixc(o, 0xcdb98a, 0xb9a577, n, 0.95); else if (h < 3.2) mixc(o, 0x7a8a45, 0x5f7a3a, n, 0.9); else mixc(o, 0x7a7a70, 0x8a8a80, n, 0.92); if (sl > 0.6) mixc(o, 0x8a8478, 0x6a655a, 0.6, 0.95); }, 'sand');
      const wm = new T.Mesh(new T.PlaneGeometry(2 * W.half + 60, 2 * W.half + 60), new T.MeshLambertMaterial({ color: 0x2a6f8f, transparent: true, opacity: 0.88 })); wm.rotation.x = -Math.PI / 2; wm.position.y = W.waterY; W.group.add(wm); W.water = wm;
      scatter(W, rng, 'palm', cnt(70), { col: 0.2, colH: 5, smin: 0.9, smax: 1.4, minAbove: 0.1 });
      scatter(W, rng, 'bush', cnt(70), { smin: 0.7, smax: 1.3, shadow: false, minAbove: 0.6 });
      rocks(W, rng, cnt(40), 0.8, 3.0, 0x8e8a7e);
      for (const [cx, cz, y] of b2) { hollow(W, rng, cx - 5, cz - 3.5, cx + 5, cz + 3.5, 2.5, 'concrete', { partition: false, color: 0x8e8e86, y }); sandbags(W, cx + 7, cz, 4, false); }
      for (let i = 0; i < cnt(3) + 1; i++) { const x = (rng() * 2 - 1) * (H - 30), z = (rng() < 0.5 ? -1 : 1) * (H * 0.5 + rng() * H * 0.4); for (let k = 0; k < 10; k++) W.box(x + k * 2.4 - 12, 0.04, z - 1.3, x + k * 2.4 - 9.6, 0.25, z + 1.3, 'wood', { u: 1.2, tag: 'wood' }); }
      for (let i = 0; i < cnt(8); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 1); sandbags(W, p.x, p.z, 3.5, rng() < 0.5, 0.9); }
      placeSpawns(W, rng);
    }
  };


  // =================== CÂNION DO RIO ===================
  BC.maps.canyon = {
    id: 'canyon', name: 'Cânion do Rio', desc: 'Paredões vermelhos, um rio sinuoso no meio com pontes de madeira e rochas enormes. Quem controla as pontes controla o mapa.',
    sw: ['#c8744a', '#5a3326'], ambient: 'desert', weather: 'dust', surf: 'dirt',
    sky: { top: 0x6a9ad0, horizon: 0xe6c8a4 }, fog: { color: 0xd8b090, density: 0.007 },
    sun: { color: 0xffe4b8, i: 1.15, dir: [-0.5, 0.8, 0.3] }, hemi: { sky: 0xf0d8c0, ground: 0x9a5a3a, i: 0.9 }, seed: 1313,
    build(W, rng) {
      const H = S.H; W.waterY = -0.45; const hh = hillsFn(rng, cnt(3) + 2, 22, 40, 2.5, 6);
      const riverX = (z) => 7 * Math.sin(z * 0.035) + 3 * Math.sin(z * 0.09 + 1);
      W.makeTerrain((x, z) => {
        const lane = sm(H - 46, H - 24, Math.abs(z)), wall = sm(28, 54, Math.abs(x)) * 15 * (0.8 + 0.4 * fbm(x * 0.03, z * 0.03, 7)) * (1 - lane), d = Math.abs(x - riverX(z)), river = -1.7 * (1 - sm(3, 9, d)) * (1 - 0.6 * lane);
        return edge(x, z) * 0.5 + wall + river + hh(x, z) * (1 - sm(26, 42, Math.abs(x)));
      }, (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 4); if (h < -0.2) mixc(o, 0x8a6a4a, 0x6f5a3e, n, 0.9); else if (sl > 0.55) mixc(o, 0xa8553a, 0x80402c, n, 0.95); else mixc(o, 0xc98a5a, 0xb4784a, n, 0.95); }, 'dirt');
      const wm = new T.Mesh(new T.PlaneGeometry(2 * W.half + 60, 2 * W.half + 60), new T.MeshLambertMaterial({ color: 0x2f7a8a, transparent: true, opacity: 0.85 })); wm.rotation.x = -Math.PI / 2; wm.position.y = W.waterY; W.group.add(wm); W.water = wm;
      for (let k = 0; k < 3; k++) { // pontes de madeira com corrimão
        const z = (k - 1) * H * 0.5 + (rng() - 0.5) * 14, rx = riverX(z), x0 = rx - 11, x1 = rx + 11;
        W.box(x0, -0.35, z - 1.7, x1, 0.32, z + 1.7, 'wood', { u: 1.2, tag: 'wood' });
        W.box(x0, 0.32, z - 1.7, x1, 1.2, z - 1.55, 'wood', { u: 1.2, tag: 'wood' }); W.box(x0, 0.32, z + 1.55, x1, 1.2, z + 1.7, 'wood', { u: 1.2, tag: 'wood' });
        for (let i = 0; i <= 4; i++) { const px = mix(x0 + 1, x1 - 1, i / 4); W.box(px - 0.15, -1.6, z - 1.5, px + 0.15, -0.3, z - 1.2, 'wood', { u: 1, tag: 'wood' }); W.box(px - 0.15, -1.6, z + 1.2, px + 0.15, -0.3, z + 1.5, 'wood', { u: 1, tag: 'wood' }); }
      }
      rocks(W, rng, cnt(70), 1.2, 4.2, 0x9a5a3e); rocks(W, rng, cnt(40), 0.6, 1.6, 0xb4784a);
      scatter(W, rng, 'dead', cnt(40), { col: 0.25, smin: 0.9, smax: 1.4, laneKeep: 0.8 }); scatter(W, rng, 'bush', cnt(90), { smin: 0.6, smax: 1.2, shadow: false, laneKeep: 0.6 });
      for (const [sx, sz] of sites(rng, cnt(3) + 1, 60, 70)) { const h = W.heightAt(sx, sz); if (h > -0.2 && h < 1.5 && Math.abs(sx - riverX(sz)) > 14) hollow(W, rng, sx - 5, sz - 4, sx + 5, sz + 4, 2.8, 'wood', { u: 1.6, partition: false, roofMat: 'wood' }); }
      for (let i = 0; i < cnt(10); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 1); sandbags(W, p.x, p.z, 3.5, rng() < 0.5, 0.9); }
      placeSpawns(W, rng);
    }
  };

  // =================== VULCÃO ===================
  BC.maps.volcano = {
    id: 'volcano', name: 'Vulcão em Erupção', desc: 'Cone de cinzas com cratera de lava e poças de lava que bloqueiam passagens. Cinza no ar, pouca visão e muito terreno elevado.',
    sw: ['#d2561a', '#2a1a18'], ambient: 'desert', weather: 'dust', surf: 'rock',
    sky: { top: 0x2a1a18, horizon: 0xb05a30 }, fog: { color: 0x5a3426, density: 0.011 },
    sun: { color: 0xff9a5a, i: 0.8, dir: [-0.3, 0.55, 0.4] }, hemi: { sky: 0x8a5a40, ground: 0x3a2a24, i: 0.75 }, seed: 1414,
    build(W, rng) {
      const H = S.H, pools = sites(rng, cnt(5), 38, 70).filter((q) => Math.hypot(q[0], q[1]) > 40).map((q) => [q[0], q[1], 5 + rng() * 3]);
      const cone = (x, z) => { const r = Math.hypot(x, z); return 20 * (1 - sm(8, 70, r)) - 9 * (1 - sm(0, 13, r)); };
      W.makeTerrain((x, z) => { let h = edge(x, z) * 0.5 + cone(x, z) * (1 - 0.9 * sm(H - 52, H - 30, Math.abs(z))) + 1.2 * (fbm(x * 0.05, z * 0.05, 11) - 0.4); for (const q of pools) { const d = Math.hypot(x - q[0], z - q[1]); h -= 1.2 * (1 - sm(q[2] * 0.8, q[2] * 1.6, d)); } return h; },
        (x, z, h, sl, o) => { const n = fbm(x * 0.25, z * 0.25, 5); mixc(o, 0x4a4440, 0x2a2624, n, 0.95); if (sl > 0.5) mixc(o, 0x3a3230, 0x1c1816, 0.6, 0.95); const r = Math.hypot(x, z); let g = Math.max(0, 1 - Math.abs(r - 9) / 8) * (r < 22 ? 1 : 0); for (const q of pools) g = Math.max(g, Math.max(0, 1 - (Math.hypot(x - q[0], z - q[1]) - q[2]) / 4)); if (g > 0) { o[0] = mix(o[0], 0.9, g * 0.7); o[1] = mix(o[1], 0.25, g * 0.7); o[2] = mix(o[2], 0.05, g * 0.7); } }, 'rock');
      const lava = (x, z, r, y) => { const m = new T.Mesh(new T.CircleGeometry(r, 28), new T.MeshBasicMaterial({ color: 0xff5a14 })), m2 = new T.Mesh(new T.CircleGeometry(r * 0.6, 24), new T.MeshBasicMaterial({ color: 0xffb040 })); for (const q of [m, m2]) { q.rotation.x = -Math.PI / 2; } m.position.set(x, y + 0.1, z); m2.position.set(x, y + 0.14, z); W.group.add(m, m2); W.addCylCol(x, z, r * 0.98, y - 2, y + 2.5, 'rock'); };
      for (const q of pools) lava(q[0], q[1], q[2] * 0.85, W.heightAt(q[0], q[1]));
      lava(0, 0, 8.5, W.heightAt(0, 0));
      rocks(W, rng, cnt(80), 0.8, 3.2, 0x38322e); rocks(W, rng, cnt(40), 0.5, 1.2, 0x4a4440);
      scatter(W, rng, 'dead', cnt(30), { col: 0.25, smin: 0.9, smax: 1.5, laneKeep: 0.7 });
      for (const [sx, sz] of sites(rng, cnt(2) + 1, 70, 70)) { if (Math.hypot(sx, sz) > 30) hollow(W, rng, sx - 5, sz - 4, sx + 5, sz + 4, 2.8, 'concrete', { partition: false, color: 0x5a5450 }); }
      for (let i = 0; i < cnt(10); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 1); sandbags(W, p.x, p.z, 3.5, rng() < 0.5, 0.9); }
      placeSpawns(W, rng);
    }
  };

  // =================== FAZENDA ===================
  BC.maps.farm = {
    id: 'farm', name: 'Fazenda de Trigo', desc: 'Campos de trigo alto onde dá para se esconder, celeiros, silos, moinho e cercas. Visão cortada no chão e vantagem para quem se agacha.',
    sw: ['#d8c060', '#5a7a3a'], ambient: 'forest', weather: 'none', surf: 'grass',
    sky: { top: 0x5a9ad8, horizon: 0xd8e6ee }, fog: { color: 0xcfdde4, density: 0.006 },
    sun: { color: 0xfff0c8, i: 1.15, dir: [-0.4, 0.85, 0.3] }, hemi: { sky: 0xdceaf6, ground: 0x8a9a5a, i: 0.95 }, seed: 1515,
    build(W, rng) {
      const H = S.H; const hh = hillsFn(rng, cnt(5) + 2, 30, 60, 3, 7);
      W.makeTerrain((x, z) => edge(x, z) * 0.6 + hh(x, z) + 0.6 * (fbm(x * 0.03, z * 0.03, 21) - 0.4), (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 4); mixc(o, 0x7a9a45, 0x5f8a3a, n, 0.95); if (sl > 0.5) mixc(o, 0x8a7a55, 0x6a5a40, 0.5, 0.95); }, 'grass');
      const fields = []; for (let i = 0; i < cnt(5) + 1; i++) { const cx = (rng() * 2 - 1) * (H - 50), cz = (rng() * 2 - 1) * (H - 70), w = 30 + rng() * 26, d = 26 + rng() * 22; fields.push([cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2]); }
      const inField = (x, z) => fields.some((f) => x > f[0] && x < f[2] && z > f[1] && z < f[3]);
      scatter(W, rng, 'wheat', Math.min(5000, cnt(2600)), { smin: 0.9, smax: 1.3, shadow: false, avoid: (x, z) => !inField(x, z) });
      for (const [sx, sz] of sites(rng, cnt(2) + 1, 70, 70)) { if (!inField(sx, sz)) { hollow(W, rng, sx - 10, sz - 7, sx + 10, sz + 7, 7, 'wood', { u: 2, partition: false, roofMat: 'wood', color: 0x9a3a2a }); } }
      for (let i = 0; i < cnt(4); i++) { const p = W.randomFree(rng, -H + 30, H - 30, -H + 50, H - 50, 5); W.cyl(p.x, p.z, 3, W.heightAt(p.x, p.z), W.heightAt(p.x, p.z) + 14, 'metal', { color: 0xc8ccd0, tag: 'metal' }); }
      const wm = W.randomFree(rng, -H * 0.5, H * 0.5, -H * 0.3, H * 0.3, 4); { const y = W.heightAt(wm.x, wm.z); W.cyl(wm.x, wm.z, 1.6, y, y + 9, 'wood', { color: 0xd8d0c0, tag: 'wood' }); W.box(wm.x - 5, y + 9, wm.z - 0.3, wm.x + 5, y + 10, wm.z + 0.3, 'wood', { u: 1, tag: 'wood' }); W.box(wm.x - 0.3, y + 4.5, wm.z - 0.3, wm.x + 0.3, y + 14, wm.z + 0.3, 'wood', { u: 1, tag: 'wood' }); }
      for (let i = 0; i < cnt(9); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 2); W.cyl(p.x, p.z, 1.4, W.heightAt(p.x, p.z), W.heightAt(p.x, p.z) + 1.8, 'wood', { color: 0xd4b45a, tag: 'wood' }); }
      for (let i = 0; i < cnt(8); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 5), y = W.heightAt(p.x, p.z), a = rng() < 0.5; for (let k = 0; k < 8; k++) { const q = k * 2.4; if (a) W.box(p.x + q, y, p.z - 0.06, p.x + q + 0.14, y + 1.1, p.z + 0.06, 'wood', { u: 1, tag: 'wood' }); else W.box(p.x - 0.06, y, p.z + q, p.x + 0.06, y + 1.1, p.z + q + 0.14, 'wood', { u: 1, tag: 'wood' }); } }
      for (let i = 0; i < cnt(3); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 4); car(W, p.x, p.z, rng() < 0.5, 0x3a8a3a); }
      scatter(W, rng, 'oak', cnt(40), { col: 0.3, smin: 1, smax: 1.5, tint: 0xffffff, sy: true, avoid: (x, z) => inField(x, z) }); scatter(W, rng, 'bush', cnt(60), { smin: 0.6, smax: 1.1, shadow: false, laneKeep: 0.5 });
      rocks(W, rng, cnt(14), 0.5, 1.3, 0x8a8a80);
      placeSpawns(W, rng);
    }
  };

  // =================== PORTO ===================
  BC.maps.harbor = {
    id: 'harbor', name: 'Porto de Contêineres', desc: 'Pilhas de contêineres formando labirintos, escadas para os telhados, guindastes gigantes e navios atracados. Combate vertical.',
    sw: ['#4a7aa0', '#8a8a8a'], ambient: 'city', weather: 'none', surf: 'concrete',
    sky: { top: 0x5a8ac8, horizon: 0xc6d6e0 }, fog: { color: 0xbccdd8, density: 0.008 },
    sun: { color: 0xfff2d8, i: 1.1, dir: [-0.35, 0.85, 0.3] }, hemi: { sky: 0xd0e0f0, ground: 0x7a7e84, i: 0.9 }, seed: 1616,
    build(W, rng) {
      const H = S.H; W.waterY = -0.3; const shore = H * 0.62;
      W.makeTerrain((x, z) => { const d = Math.abs(x); const land = 0.45 * (1 - sm(shore, shore + 8, d)) - 2.4 * sm(shore, shore + 10, d); return land + 0.0 * edge(x, z); }, (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 4); if (h < 0.1) mixc(o, 0x6a6a5a, 0x4a4a40, n, 0.9); else mixc(o, 0x8a8a86, 0x74746f, n, 0.95); }, 'concrete');
      const wm = new T.Mesh(new T.PlaneGeometry(2 * W.half + 60, 2 * W.half + 60), new T.MeshLambertMaterial({ color: 0x24607a, transparent: true, opacity: 0.9 })); wm.rotation.x = -Math.PI / 2; wm.position.y = W.waterY; W.group.add(wm); W.water = wm;
      const cols = [0xa83a2a, 0x2f5a9a, 0x3a7a3a, 0xc8a02a, 0x6a6a70, 0x8a4a2a, 0x2a7a8a];
      const stairs = (x, z, dir, h) => { const n = Math.round(h / 0.5); for (let i = 0; i < n; i++) { if (dir === 'z') W.box(x - 0.9, 0, z + i * 0.6, x + 0.9, (i + 1) * 0.5, z + i * 0.6 + 0.6, 'metal', { color: 0x4a4e52, tag: 'metal' }); else W.box(x + i * 0.6, 0, z - 0.9, x + i * 0.6 + 0.6, (i + 1) * 0.5, z + 0.9, 'metal', { color: 0x4a4e52, tag: 'metal' }); } };
      const rows = Math.max(3, Math.round(S.H / 28));
      for (let r = 0; r < rows; r++) {
        const z = (r - (rows - 1) / 2) * (H * 1.1 / rows); if (Math.abs(z) > H - 48) continue;
        for (let c = 0; c < 5; c++) {
          const x = (c - 2) * 26 + (rng() - 0.5) * 6; if (Math.abs(x) > shore - 14) continue; const nB = 1 + ((rng() * 3) | 0), alongX = rng() < 0.5;
          for (let b = 0; b < nB; b++) { const L = 6.1, Wd = 2.44, Hh = 2.6, ox = alongX ? b * (L + 0.4) : (rng() < 0.3 ? 0.3 : 0), oz = alongX ? 0 : b * (Wd + 0.4); const lv = rng() < 0.3 ? 2 : 1;
            for (let l = 0; l < lv; l++) { if (alongX) W.box(x + ox, l * Hh, z + oz, x + ox + L, (l + 1) * Hh, z + oz + Wd, 'metal', { color: cols[(rng() * cols.length) | 0], tag: 'metal', u: 3 }); else W.box(x + ox, l * Hh, z + oz, x + ox + Wd, (l + 1) * Hh, z + oz + L, 'metal', { color: cols[(rng() * cols.length) | 0], tag: 'metal', u: 3 }); } }
          if (rng() < 0.45) stairs(x - 3, z - 3, 'z', 2.6);
        }
      }
      for (const sx of [-1, 1]) { for (let i = 0; i < 2; i++) { const cz = (i - 0.5) * H * 0.7, cx = sx * (shore - 6); for (const dz of [-6, 6]) for (const dx of [-3, 3]) W.box(cx + dx - 0.5, 0, cz + dz - 0.5, cx + dx + 0.5, 24, cz + dz + 0.5, 'metal', { color: 0xd8a020, tag: 'metal' }); W.box(cx - 4, 24, cz - 7, cx + 4, 25.2, cz + 7, 'metal', { color: 0xd8a020, tag: 'metal' }); W.box(cx - 0.8 + sx * 6, 22, cz - 0.4, cx + 0.8 + sx * 20, 24, cz + 0.4, 'metal', { color: 0xc89010, tag: 'metal' }); }
        const sz0 = (rng() - 0.5) * H * 0.5; W.box(sx * (shore + 12) - 5, -2.4, sz0 - 32, sx * (shore + 12) + 5, 4.5, sz0 + 32, 'metal', { color: 0x363c44, tag: 'metal', u: 4, col: true }); W.box(sx * (shore + 12) - 3.5, 4.5, sz0 - 6, sx * (shore + 12) + 3.5, 11, sz0 + 6, 'metal', { color: 0xe4e4e0, tag: 'metal', u: 4 }); }
      for (const [sx, sz] of sites(rng, cnt(2) + 1, 70, 70)) { if (Math.abs(sx) < shore - 22) hollow(W, rng, sx - 12, sz - 8, sx + 12, sz + 8, 7, 'metal', { u: 3, partition: false, roofMat: 'metal', color: 0x9aa0a6 }); }
      for (let i = 0; i < cnt(10); i++) { const p = W.randomFree(rng, -shore + 8, shore - 8, -H + 30, H - 30, 1); sandbags(W, p.x, p.z, 3.5, rng() < 0.5, 0.9); }
      for (let i = 0; i < cnt(6); i++) { const p = W.randomFree(rng, -shore + 8, shore - 8, -H + 30, H - 30, 3); car(W, p.x, p.z, rng() < 0.5, [0x4a5a3a, 0x6a6a6a][i % 2]); }
      placeSpawns(W, rng);
    }
  };


  // degraus (subida de 0,5 m por passo) em uma direção: dir 'x+','x-','z+','z-'
  function stairsUp(W, x, z, dir, n, wd, mat, color) {
    const sd = 0.6, sh = 0.5; for (let i = 0; i < n; i++) {
      const o = i * sd; let x0 = x, z0 = z, x1 = x, z1 = z;
      if (dir === 'z+') { x0 = x - wd / 2; x1 = x + wd / 2; z0 = z + o; z1 = z + o + sd; } else if (dir === 'z-') { x0 = x - wd / 2; x1 = x + wd / 2; z0 = z - o - sd; z1 = z - o; }
      else if (dir === 'x+') { z0 = z - wd / 2; z1 = z + wd / 2; x0 = x + o; x1 = x + o + sd; } else { z0 = z - wd / 2; z1 = z + wd / 2; x0 = x - o - sd; x1 = x - o; }
      W.box(x0, 0, z0, x1, (i + 1) * sh, z1, mat || 'concrete', { color, u: 1.5 });
    }
  }

  // =================== TEMPLO EM RUÍNAS ===================
  BC.maps.ruins = {
    id: 'ruins', name: 'Templo em Ruínas', desc: 'Pirâmide escalonada no centro da selva: dá para subir os degraus e dominar o mapa do topo. Pilares, muros caídos e névoa.',
    sw: ['#7a8a4a', '#3a3a30'], ambient: 'forest', weather: 'rain', surf: 'grass',
    sky: { top: 0x6a8a98, horizon: 0xb8c8c0 }, fog: { color: 0x9ab0a4, density: 0.012 },
    sun: { color: 0xf0f0d0, i: 0.9, dir: [-0.3, 0.8, 0.35] }, hemi: { sky: 0xb8d0c0, ground: 0x4a5a3a, i: 0.85 }, seed: 1717,
    build(W, rng) {
      const H = S.H, hh = hillsFn(rng, cnt(4) + 2, 26, 50, 2, 6);
      W.makeTerrain((x, z) => { let h = edge(x, z) * 0.5 + hh(x, z) * 0.7 + 0.5 * (fbm(x * 0.04, z * 0.04, 3) - 0.4); return flatBlend(x, z, 0, 0, 40, 0.3, h); },
        (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 4); mixc(o, 0x4a7a35, 0x3a6a2a, n, 0.92); if (Math.hypot(x, z) < 30) mixc(o, 0x8a8a78, 0x6f6f60, n, 0.95); }, 'grass');
      W.yoff = 0; const T0 = 12, half0 = 21;
      for (let t = 0; t < T0; t++) { const hf = half0 - t * 1.5; W.box(-hf, 0.3, -hf, hf, 0.3 + (t + 1) * 0.5, hf, 'concrete', { u: 3, color: t % 2 ? 0x8a8a78 : 0x7c7c6c, tag: 'rock' }); }
      W.box(-3, 0.3 + T0 * 0.5, -3, 3, 0.3 + T0 * 0.5 + 3.6, 3, 'concrete', { u: 2, color: 0x6a6a5c, tag: 'rock' });
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, px = Math.cos(a) * 29, pz = Math.sin(a) * 29; W.cyl(px, pz, 0.9, 0.3, 6, 'concrete', { color: 0x8a8a78, tag: 'rock' }); }
      for (let i = 0; i < cnt(14); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 2); if (Math.hypot(p.x, p.z) < 28) continue; const y = W.heightAt(p.x, p.z), a = rng() < 0.5, l = 3 + rng() * 6; if (a) W.box(p.x, y, p.z, p.x + l, y + 1 + rng() * 2, p.z + 0.8, 'concrete', { u: 2, color: 0x7a7a68, tag: 'rock' }); else W.box(p.x, y, p.z, p.x + 0.8, y + 1 + rng() * 2, p.z + l, 'concrete', { u: 2, color: 0x7a7a68, tag: 'rock' }); }
      for (const [sx, sz] of sites(rng, cnt(2) + 1, 60, 70)) { if (Math.hypot(sx, sz) > 55) hollow(W, rng, sx - 5, sz - 4, sx + 5, sz + 4, 3, 'concrete', { partition: false, color: 0x7a7a6a, roofMat: 'concrete' }); }
      scatter(W, rng, 'palm', cnt(120), { col: 0.2, colH: 5, smin: 0.9, smax: 1.5, avoid: (x, z) => Math.hypot(x, z) < 32 }); scatter(W, rng, 'oak', cnt(90), { col: 0.3, smin: 1, smax: 1.8, tint: 0xffffff, sy: true, avoid: (x, z) => Math.hypot(x, z) < 32 });
      scatter(W, rng, 'bush', cnt(240), { smin: 0.7, smax: 1.5, shadow: false, laneKeep: 0.5 }); rocks(W, rng, cnt(40), 0.7, 2.4, 0x6f7566);
      for (let i = 0; i < cnt(8); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 1); if (Math.hypot(p.x, p.z) > 30) sandbags(W, p.x, p.z, 3.5, rng() < 0.5, 0.9); }
      placeSpawns(W, rng);
    }
  };

  // =================== CAMPO DE PETRÓLEO ===================
  BC.maps.oilfield = {
    id: 'oilfield', name: 'Campo de Petróleo', desc: 'Bombas de petróleo, torres de perfuração, tanques gigantes e oleodutos baixos para pular. Chamas nas chaminés e poças de óleo.',
    sw: ['#c8a060', '#2a2420'], ambient: 'desert', weather: 'dust', surf: 'dirt',
    sky: { top: 0x7a9ac0, horizon: 0xdac8a0 }, fog: { color: 0xcdb48a, density: 0.009 },
    sun: { color: 0xffe8b8, i: 1.1, dir: [-0.4, 0.8, 0.3] }, hemi: { sky: 0xe6d8bc, ground: 0x8a6a44, i: 0.9 }, seed: 1818,
    build(W, rng) {
      const H = S.H, hh = hillsFn(rng, cnt(4) + 2, 28, 54, 2, 5);
      W.makeTerrain((x, z) => edge(x, z) * 0.5 + hh(x, z) * 0.8 + 0.4 * (fbm(x * 0.04, z * 0.04, 5) - 0.4), (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 4); mixc(o, 0xc8a46a, 0xb08a52, n, 0.95); if (sl > 0.5) mixc(o, 0x8a6a44, 0x6a4f34, 0.5, 0.95); }, 'dirt');
      for (let i = 0; i < cnt(8) + 2; i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 50, H - 50, 4), y = W.heightAt(p.x, p.z); W.box(p.x - 1.4, y, p.z - 0.8, p.x + 1.4, y + 1.0, p.z + 0.8, 'metal', { color: 0x3a6a8a, tag: 'metal' }); W.box(p.x - 2.6, y + 2.2, p.z - 0.25, p.x + 2.2, y + 2.9, p.z + 0.25, 'metal', { color: 0x3a6a8a, tag: 'metal' }); W.box(p.x - 0.2, y + 1.0, p.z - 0.25, p.x + 0.2, y + 2.4, p.z + 0.25, 'metal', { color: 0x2a4a5a, tag: 'metal' }); W.box(p.x - 2.9, y + 1.4, p.z - 0.2, p.x - 2.4, y + 2.8, p.z + 0.2, 'metal', { color: 0x2a4a5a, tag: 'metal' }); }
      for (let i = 0; i < cnt(4); i++) { const p = W.randomFree(rng, -H + 25, H - 25, -H + 50, H - 50, 5), y = W.heightAt(p.x, p.z); for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) W.box(p.x + dx - 0.2, y, p.z + dz - 0.2, p.x + dx + 0.2, y + 20, p.z + dz + 0.2, 'metal', { color: 0x8a5a2a, tag: 'metal' }); for (const lv of [6, 12, 18]) W.box(p.x - 2.2, y + lv, p.z - 2.2, p.x + 2.2, y + lv + 0.25, p.z + 2.2, 'metal', { color: 0x7a4a22, tag: 'metal', u: 2 }); }
      for (let i = 0; i < cnt(4); i++) { const p = W.randomFree(rng, -H + 30, H - 30, -H + 50, H - 50, 8), y = W.heightAt(p.x, p.z); W.cyl(p.x, p.z, 6.5, y, y + 8, 'metal', { color: 0xc8ccd0, tag: 'metal' }); }
      for (let i = 0; i < cnt(5); i++) { const x0 = (rng() * 2 - 1) * (H - 40), z0 = (rng() * 2 - 1) * (H - 70), a = rng() < 0.5, l = 24 + rng() * 40; for (let k = 0; k < l; k += 6) { const x = a ? x0 + k : x0, z = a ? z0 : z0 + k, y = W.heightAt(x, z); if (a) W.box(x, y, z - 0.35, x + 6, y + 0.5, z + 0.35, 'metal', { color: 0x4a4a4e, tag: 'metal', u: 1.5 }); else W.box(x - 0.35, y, z, x + 0.35, y + 0.5, z + 6, 'metal', { color: 0x4a4a4e, tag: 'metal', u: 1.5 }); } }
      for (let i = 0; i < cnt(6); i++) { const p = W.randomFree(rng, -H + 25, H - 25, -H + 50, H - 50, 4), y = W.heightAt(p.x, p.z), r = 3 + rng() * 3; const m = new T.Mesh(new T.CircleGeometry(r, 22), new T.MeshBasicMaterial({ color: 0x0c0a08 })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, y + 0.04, p.z); W.group.add(m); }
      for (let i = 0; i < cnt(2) + 1; i++) { const p = W.randomFree(rng, -H + 25, H - 25, -H + 50, H - 50, 4), y = W.heightAt(p.x, p.z); W.cyl(p.x, p.z, 0.5, y, y + 14, 'metal', { color: 0x55565a, tag: 'metal' }); const f = new T.Mesh(new T.ConeGeometry(0.9, 3, 8), new T.MeshBasicMaterial({ color: 0xff8a1e })); f.position.set(p.x, y + 15.5, p.z); W.group.add(f); const f2 = new T.Mesh(new T.ConeGeometry(0.5, 2, 8), new T.MeshBasicMaterial({ color: 0xffd860 })); f2.position.set(p.x, y + 15.2, p.z); W.group.add(f2); }
      for (const [sx, sz] of sites(rng, cnt(2) + 1, 70, 70)) hollow(W, rng, sx - 6, sz - 4, sx + 6, sz + 4, 3, 'metal', { u: 2, partition: false, roofMat: 'metal', color: 0xa8aab0 });
      for (let i = 0; i < cnt(10); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 1); sandbags(W, p.x, p.z, 3.5, rng() < 0.5, 0.9); }
      for (let i = 0; i < cnt(4); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 3); car(W, p.x, p.z, rng() < 0.5, 0x8a7a4a); }
      rocks(W, rng, cnt(24), 0.6, 1.8, 0xa08a62); scatter(W, rng, 'dead', cnt(14), { col: 0.25, laneKeep: 0.8 });
      placeSpawns(W, rng);
    }
  };

  // =================== MINA A CÉU ABERTO ===================
  BC.maps.pit = {
    id: 'pit', name: 'Mina a Céu Aberto', desc: 'Cratera gigante em terraços, com rampas, correias transportadoras, caminhões e britadores. Quem está no alto domina quem está embaixo.',
    sw: ['#a8a090', '#4a4036'], ambient: 'desert', weather: 'dust', surf: 'rock',
    sky: { top: 0x7a98b8, horizon: 0xd0c8b8 }, fog: { color: 0xc4bcae, density: 0.008 },
    sun: { color: 0xfff0d0, i: 1.05, dir: [-0.35, 0.85, 0.3] }, hemi: { sky: 0xdad4c4, ground: 0x7a7060, i: 0.9 }, seed: 1919,
    build(W, rng) {
      const H = S.H, R = H * 0.62;
      W.makeTerrain((x, z) => { const r = Math.hypot(x, z), lane = sm(H - 46, H - 24, Math.abs(z)), d = (R - r) / 9; let h = 0; if (r < R) { const q = Math.floor(Math.max(0, d)), f = Math.max(0, d) - q; h = -2.3 * (Math.min(q, 6) + sm(0.35, 1, f)) * (r < R - 54 ? 0 : 1) - (r < R - 54 ? 2.3 * 6 : 0); } return h * (1 - lane) + edge(x, z) * 0.5 + 0.2 * (fbm(x * 0.05, z * 0.05, 8) - 0.4); },
        (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 4); mixc(o, 0xb0a898, 0x8a8272, n, 0.95); if (sl > 0.4) mixc(o, 0x7a6a58, 0x5a4a3a, 0.5, 0.95); }, 'rock');
      for (let i = 0; i < cnt(6); i++) { const p = W.randomFree(rng, -R + 6, R - 6, -R + 6, R - 6, 4), y = W.heightAt(p.x, p.z); W.box(p.x - 1, y, p.z - 8, p.x + 1, y + 1.2, p.z + 8, 'metal', { color: 0x4a4e52, tag: 'metal' }); W.box(p.x - 3, y, p.z - 3, p.x + 3, y + 5, p.z + 3, 'metal', { color: 0xd8a020, tag: 'metal' }); }
      for (let i = 0; i < cnt(5); i++) { const p = W.randomFree(rng, -R + 6, R - 6, -R + 6, R - 6, 4), y = W.heightAt(p.x, p.z), a = rng() < 0.5; if (a) { W.box(p.x - 5, y, p.z - 2, p.x + 5, y + 2.4, p.z + 2, 'metal', { color: 0xd8a020, tag: 'metal' }); W.box(p.x - 5, y + 2.4, p.z - 1.8, p.x - 1, y + 4, p.z + 1.8, 'metal', { color: 0x2a2a2a, tag: 'metal' }); } else { W.box(p.x - 2, y, p.z - 5, p.x + 2, y + 2.4, p.z + 5, 'metal', { color: 0xd8a020, tag: 'metal' }); W.box(p.x - 1.8, y + 2.4, p.z - 5, p.x + 1.8, y + 4, p.z - 1, 'metal', { color: 0x2a2a2a, tag: 'metal' }); } }
      for (let i = 0; i < cnt(3) + 1; i++) { const p = W.randomFree(rng, -H + 25, H - 25, -H + 50, H - 50, 6); if (Math.hypot(p.x, p.z) < R + 6) continue; const y = W.heightAt(p.x, p.z); W.box(p.x - 6, y, p.z - 5, p.x + 6, y + 9, p.z + 5, 'metal', { color: 0x6a7a8a, tag: 'metal', u: 3 }); W.box(p.x - 3, y + 9, p.z - 3, p.x + 3, y + 14, p.z + 3, 'metal', { color: 0x7a8a9a, tag: 'metal' }); }
      for (const [sx, sz] of sites(rng, cnt(2) + 1, 70, 70)) { if (Math.hypot(sx, sz) > R + 12) hollow(W, rng, sx - 6, sz - 4, sx + 6, sz + 4, 3, 'metal', { u: 2, partition: false, roofMat: 'metal', color: 0xb0b2b8 }); }
      for (let i = 0; i < cnt(14); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 1); sandbags(W, p.x, p.z, 3.5, rng() < 0.5, 0.9); }
      for (let i = 0; i < cnt(6); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 3); car(W, p.x, p.z, rng() < 0.5, 0xc8981c); }
      rocks(W, rng, cnt(60), 0.8, 3.2, 0x8a8272);
      placeSpawns(W, rng);
    }
  };

  // =================== CASTELO ===================
  BC.maps.castle = {
    id: 'castle', name: 'Castelo Medieval', desc: 'Fortaleza de pedra com fosso de água, ponte levadiça, torres, muralhas com passarela e uma torre de menagem. Cerco e defesa.',
    sw: ['#8a8a78', '#3a5a3a'], ambient: 'forest', weather: 'none', surf: 'grass',
    sky: { top: 0x5a88c0, horizon: 0xc8d8e4 }, fog: { color: 0xbccedc, density: 0.007 },
    sun: { color: 0xfff0d0, i: 1.1, dir: [-0.4, 0.85, 0.3] }, hemi: { sky: 0xd4e4f2, ground: 0x6a8a4a, i: 0.95 }, seed: 2020,
    build(W, rng) {
      const H = S.H, C = 30, M0 = 36, M1 = 46; W.waterY = -0.5; const hh = hillsFn(rng, cnt(4) + 2, 28, 50, 2, 5);
      W.makeTerrain((x, z) => { const m = Math.max(Math.abs(x), Math.abs(z)); let h = edge(x, z) * 0.5 + hh(x, z) * (1 - sm(M0 - 6, M1 + 12, 0) ) * sm(M1 + 6, M1 + 24, m) * 0.8 + 0.3 * (fbm(x * 0.05, z * 0.05, 3) - 0.4); const moat = sm(M0 - 1, M0 + 1.5, m) * (1 - sm(M1 - 1.5, M1 + 0.5, m)); h -= 2.8 * moat; return h; },
        (x, z, h, sl, o) => { const n = fbm(x * 0.2, z * 0.2, 4); const m = Math.max(Math.abs(x), Math.abs(z)); if (m < M0) mixc(o, 0x8a8a78, 0x74746a, n, 0.95); else if (h < -0.4) mixc(o, 0x5a5a40, 0x44442c, n, 0.9); else mixc(o, 0x5a8a3e, 0x4a7a32, n, 0.95); }, 'grass');
      const wm = new T.Mesh(new T.PlaneGeometry(2 * W.half + 60, 2 * W.half + 60), new T.MeshLambertMaterial({ color: 0x3a6a78, transparent: true, opacity: 0.88 })); wm.rotation.x = -Math.PI / 2; wm.position.y = W.waterY; W.group.add(wm); W.water = wm;
      W.yoff = 0; const WH = 8, TK = 3, gap = 4.5;
      const wall = (x0, z0, x1, z1) => { W.box(x0, 0, z0, x1, WH, z1, 'concrete', { u: 3, color: 0x8a8a78, tag: 'rock' }); const horiz = (x1 - x0) > (z1 - z0), len = horiz ? x1 - x0 : z1 - z0; for (let k = 0; k < len; k += 2.4) { if (horiz) W.box(x0 + k, WH, z0, x0 + k + 1.2, WH + 1.1, z0 + 0.9, 'concrete', { u: 1, color: 0x7a7a6a, tag: 'rock' }); else W.box(x0, WH, z0 + k, x0 + 0.9, WH + 1.1, z0 + k + 1.2, 'concrete', { u: 1, color: 0x7a7a6a, tag: 'rock' }); } };
      wall(-C, -C, -gap, -C + TK); wall(gap, -C, C, -C + TK); wall(-C, C - TK, -gap, C); wall(gap, C - TK, C, C);
      wall(-C, -C + TK, -C + TK, C - TK); wall(C - TK, -C + TK, C, C - TK);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { W.cyl(sx * C, sz * C, 5.5, 0, 14, 'concrete', { color: 0x8a8a78, tag: 'rock', u: 2 }); const cone = new T.Mesh(new T.ConeGeometry(6.2, 5, 10), new T.MeshLambertMaterial({ color: 0x8a3a2a })); cone.position.set(sx * C, 16.5, sz * C); W.group.add(cone); }
      for (const sz of [-1, 1]) { W.box(-gap - 1.2, 0, sz * C - TK / 2 - 0.0, -gap, 11, sz * C + TK / 2, 'concrete', { color: 0x7a7a6a, tag: 'rock' }); W.box(gap, 0, sz * C - TK / 2, gap + 1.2, 11, sz * C + TK / 2, 'concrete', { color: 0x7a7a6a, tag: 'rock' }); W.box(-gap - 1.2, 8.2, sz * C - TK / 2, gap + 1.2, 11, sz * C + TK / 2, 'concrete', { color: 0x7a7a6a, tag: 'rock' }); W.box(-gap, -1.2, Math.min(sz * (M0 - 0.5), sz * (M1 + 0.5)), gap, 0.1, Math.max(sz * (M0 - 0.5), sz * (M1 + 0.5)), 'wood', { u: 1.2, tag: 'wood' }); }
      // escadas internas para a passarela das muralhas
      stairsUp(W, -C + TK + 1, -C + TK + 1.2, 'z+', 16, 2, 'concrete', 0x6a6a5a); stairsUp(W, C - TK - 1, C - TK - 1.2, 'z-', 16, 2, 'concrete', 0x6a6a5a);
      W.box(-C + TK, WH - 0.3, -C + TK + 8, -C + TK + 3, WH, -C + TK + 10, 'concrete', { color: 0x6a6a5a, tag: 'rock' }); W.box(C - TK - 3, WH - 0.3, C - TK - 10, C - TK, WH, C - TK - 8, 'concrete', { color: 0x6a6a5a, tag: 'rock' });
      hollow(W, rng, -7, -7, 7, 7, 13, 'concrete', { u: 3, partition: false, roofMat: 'concrete', color: 0x7a7a6a, y: 0 });
      for (const [bx, bz, w, d] of [[-C + 6, 8, 8, 6], [C - 14, -10, 8, 7], [10, 16, 6, 5]]) hollow(W, rng, bx, bz, bx + w, bz + d, 3.4, 'wood', { u: 1.6, partition: false, roofMat: 'wood', color: 0x8a6a44, y: 0 });
      W.cyl(-14, -14, 1.3, 0, 1.3, 'concrete', { color: 0x7a7a6a, tag: 'rock' });
      for (let i = 0; i < cnt(10); i++) { const p = W.randomFree(rng, -H + 20, H - 20, -H + 40, H - 40, 2); if (Math.max(Math.abs(p.x), Math.abs(p.z)) < M1 + 4) continue; sandbags(W, p.x, p.z, 3.5, rng() < 0.5, 0.9); }
      scatter(W, rng, 'oak', cnt(70), { col: 0.3, smin: 1, smax: 1.7, tint: 0xffffff, sy: true, avoid: (x, z) => Math.max(Math.abs(x), Math.abs(z)) < M1 + 5 }); scatter(W, rng, 'bush', cnt(80), { smin: 0.7, smax: 1.3, shadow: false, avoid: (x, z) => Math.max(Math.abs(x), Math.abs(z)) < M1 + 3 });
      rocks(W, rng, cnt(20), 0.6, 1.8, 0x8a8a80);
      placeSpawns(W, rng);
    }
  };

  BC.MAP_ORDER = ['snow', 'forest', 'trench', 'city', 'swamp', 'desert', 'jungle', 'mountain', 'industrial', 'village', 'airbase', 'coast', 'canyon', 'volcano', 'farm', 'harbor', 'ruins', 'oilfield', 'pit', 'castle'];
  // tamanhos (metade da área jogável, em metros): total = 2H
  BC.MAP_SIZES = { pequeno: 110, medio: 160, grande: 220, enorme: 280 };
  BC.buildMap = function (id, size) {
    const H = BC.MAP_SIZES[size] || BC.MAP_SIZES.grande; S.H = H; S.K = H / 78; S.A = S.K * S.K * 0.7;
    const def = BC.maps[id], W = new BC.World(H + 32); W.play = H;
    const rng = BC.rng(def.seed);
    def.build(W, rng); W.finalize(); W.def = def; return W;
  };
})();
