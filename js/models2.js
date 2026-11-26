// Modelos 3D do arsenal: orienta/escala automaticamente (cano para -z, mira em y=0), estima mãos/boca do cano/carregador,
// suporta modelos com textura, versões (supressor / luneta) e as miras selecionáveis (red dot, holográfica, ACOG, lunetas).
(function () {
  const T = THREE, BC = window.BC;
  BC.MODELS = {};
  const PAL = { metal: 0x82868d, black: 0x383a40, darkmetal: 0x4e5056, grey: 0x6a6c72, gray: 0x6a6c72, wood: 0x96602c, darkwood: 0x6a3f1c, glass: 0x0b1014, orange: 0x8a4a1a, green: 0x3c4a2c, tan: 0x7a6a4a };
  const FALLPAL = [0x4a4d54, 0x6a4a2a, 0x2c2e33, 0x8a8d94, 0x556b3a];
  const TRS = { rifle: 0.55, smg: 0.55, pistol: 0.9, revolver: 0.88, shotgun: 0.58, sniper: 0.62, lmg: 0.5 };
  const hash = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  BC.fallbackId = function (id) {
    const w = BC.WMAP[id]; if (!w) return 'm4a1';
    if (w.cls === 'rifle' || w.cls === 'lmg') return /ak|sks|vz58/.test(w.id) ? 'ak74' : 'm4a1'; if (w.cls === 'smg') return 'm4a1';
    if (w.cls === 'pistol' || w.cls === 'revolver') return 'glock17'; if (w.cls === 'shotgun') return 'rem870'; return 'svd';
  };

  function colorFor(name, mat, k) {
    const nm = (name || '').toLowerCase().replace(/[^a-z]/g, '');
    for (const p in PAL) if (nm.includes(p)) return PAL[p];
    const c = mat && mat.color ? mat.color.clone() : new T.Color(0x333333);
    if (c.r > 0.9 && c.g > 0.9 && c.b > 0.9) return FALLPAL[k % FALLPAL.length];
    if (c.r + c.g + c.b < 0.5) c.multiplyScalar(2.2); else c.multiplyScalar(0.85);
    return c.getHex();
  }

  function gather(obj) {
    const P = [], N = [], C = [], meshes = [], c = new T.Color(); let textured = false, kk = 0; obj.updateMatrixWorld(true);
    obj.traverse((m) => {
      if (!m.isMesh) return; let g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); if (g.index) g = g.toNonIndexed(); if (!g.attributes.normal) g.computeVertexNormals();
      const mats = Array.isArray(m.material) ? m.material : [m.material], pos = g.attributes.position, nor = g.attributes.normal, groups = g.groups && g.groups.length ? g.groups : [{ start: 0, count: pos.count, materialIndex: 0 }];
      if (mats.some((x) => x.map)) textured = true;
      meshes.push({ geo: g, mats });
      for (const gr of groups) {
        const mat = mats[gr.materialIndex] || mats[0]; c.setHex(colorFor(mat.name, mat, kk++));
        for (let v = gr.start; v < gr.start + gr.count && v < pos.count; v++) { const k = 0.86 + 0.14 * hash(Math.floor(v / 3)); P.push(pos.getX(v), pos.getY(v), pos.getZ(v)); N.push(nor.getX(v), nor.getY(v), nor.getZ(v)); C.push(c.r * k, c.g * k, c.b * k); }
      }
    });
    return { P: new Float32Array(P), N: new Float32Array(N), C: new Float32Array(C), meshes, textured };
  }

  function orient(d, forceAxis, flip) {
    const P = d.P, n = P.length / 3, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { const v = P[i * 3 + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
    const ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    let lenAx = [0, 1, 2].sort((a, b) => ext[b] - ext[a])[0]; if (forceAxis !== undefined) lenAx = forceAxis;
    const oth = [0, 1, 2].filter((a) => a !== lenAx); const upAx = ext[oth[0]] >= ext[oth[1]] ? oth[0] : oth[1];
    const vals = []; for (let i = 0; i < n; i += 4) vals.push(P[i * 3 + upAx]); vals.sort((a, b) => a - b); const med = vals[vals.length >> 1];
    const upSign = (med - mn[upAx]) >= (mx[upAx] - med) ? 1 : -1;
    const L0 = mn[lenAx], Ld = ext[lenAx], lo = [1e9, -1e9], hi = [1e9, -1e9];
    for (let i = 0; i < n; i++) { const t = (P[i * 3 + lenAx] - L0) / Ld, u = P[i * 3 + upAx]; if (t < 0.12) { if (u < lo[0]) lo[0] = u; if (u > lo[1]) lo[1] = u; } else if (t > 0.88) { if (u < hi[0]) hi[0] = u; if (u > hi[1]) hi[1] = u; } }
    let muzzleSign = (lo[1] - lo[0]) <= (hi[1] - hi[0]) ? -1 : 1; if (flip) muzzleSign = -muzzleSign;
    const e = (a, s) => { const v = [0, 0, 0]; v[a] = s; return new T.Vector3(...v); };
    const f = e(lenAx, muzzleSign), u = e(upAx, upSign), zg = f.clone().negate(), yg = u.clone(), xg = new T.Vector3().crossVectors(yg, zg);
    return { xg, yg, zg };
  }
  const applyBasis = (arr, B, out) => { const v = new T.Vector3(); for (let i = 0; i < arr.length; i += 3) { v.set(arr[i], arr[i + 1], arr[i + 2]); out[i] = v.dot(B.xg); out[i + 1] = v.dot(B.yg); out[i + 2] = v.dot(B.zg); } return out; };

  function build(w, d, forceAxis) {
    const B = orient(d, forceAxis), P = applyBasis(d.P, B, new Float32Array(d.P.length)), n = P.length / 3;
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { const v = P[i * 3 + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
    const s = w.len / (mx[2] - mn[2]), cx = (mn[0] + mx[0]) / 2, z0 = mn[2] + TRS[w.cls] * (mx[2] - mn[2]), top = mx[1];
    const xf = (v, isPos) => { for (let i = 0; i < v.length; i += 3) { if (isPos) { v[i] = (v[i] - cx) * s; v[i + 1] = (v[i + 1] - top) * s; v[i + 2] = (v[i + 2] - z0) * s; } } };
    xf(P, true);
    const zmin = (mn[2] - z0) * s, zmax = (mx[2] - z0) * s, height = (mx[1] - mn[1]) * s, L = zmax - zmin, ymin = -height;
    let my = 0, mc = 0; for (let i = 0; i < n; i++) if (P[i * 3 + 2] < zmin + 0.03 * L) { my += P[i * 3 + 1]; mc++; } my = mc ? my / mc : -0.04;
    let ry = 0, rz = 0, rc = 0; for (let i = 0; i < n; i++) { const t = (P[i * 3 + 2] - zmin) / L, y = P[i * 3 + 1]; if (t > 0.6 && t < 0.93 && y < -height * 0.5) { ry += y; rz += P[i * 3 + 2]; rc++; } }
    const hr = rc ? [0, Math.min(-0.05, ry / rc + 0.035), rz / rc] : [0, -height * 0.7, zmax * 0.4];
    const tl = w.cls === 'shotgun' ? 0.33 : w.cls === 'sniper' ? 0.3 : (w.cls === 'smg' || w.cls === 'lmg') ? 0.3 : 0.27; let lmin = 0; for (let i = 0; i < n; i++) { const t = (P[i * 3 + 2] - zmin) / L; if (t > tl - 0.05 && t < tl + 0.07) lmin = Math.min(lmin, P[i * 3 + 1]); }
    const hl = (w.cls === 'pistol' || w.cls === 'revolver') ? [-0.025, hr[1] + 0.005, hr[2] - 0.005] : [0, Math.min(-0.045, lmin + 0.02), zmin + tl * L];
    if (w.cls === 'pistol' || w.cls === 'revolver') hr[0] = 0.012;
    const magSize = { rifle: [0.03, 0.12, 0.055], lmg: [0.06, 0.12, 0.1], smg: [0.03, 0.12, 0.045], pistol: [0.03, 0.09, 0.04], revolver: [0.045, 0.045, 0.045], sniper: [0.03, 0.08, 0.05], shotgun: null }[w.cls];
    const magPos = w.cls === 'shotgun' ? null : w.cls === 'revolver' ? [0, -0.045, hr[2] - 0.06] : w.cls === 'pistol' ? [0, hr[1] - 0.04, hr[2]] : [0, Math.max(ymin + 0.05, hr[1] - 0.04), hr[2] - 0.1];
    const body = new T.Group(); let flat = null;
    if (d.textured) { // mantém materiais/texturas originais
      for (const m of d.meshes) {
        const g = m.geo.clone(); const p = g.attributes.position.array, nn = g.attributes.normal.array;
        const np = applyBasis(p, B, new Float32Array(p.length)), nnn = applyBasis(nn, B, new Float32Array(nn.length)); xf(np, true);
        g.setAttribute('position', new T.BufferAttribute(np, 3)); g.setAttribute('normal', new T.BufferAttribute(nnn, 3));
        const mats = m.mats.map((x) => { const c = x.clone(); if (c.metalness !== undefined) c.metalness = Math.min(c.metalness, 0.35); c.roughness = Math.max(c.roughness || 0.5, 0.45); return c; });
        body.add(new T.Mesh(g, mats.length > 1 ? mats : mats[0]));
      }
    } else {
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(applyBasis(d.N, B, new Float32Array(d.N.length)), 3)); geo.setAttribute('color', new T.BufferAttribute(d.C, 3));
      body.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.3 }))); flat = n < 12000 * 3 ? geo : null;
    }
    const G = { stock: zmax, muzzle: [0, my, zmin], eject: [0.03, -0.04, hr[2] - 0.12], hands: { r: hr, l: hl }, real: true, magPos, magSize, cantScale: w.len > 1.0 ? 0.5 : 1 };
    return { body, G, flat };
  }

  // ---------- acessórios ----------
  let scopeBase = null; // modelo realista de luneta (rifle-scope)
  const dark = (hex) => new T.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.4 });
  const gm = (items) => BC.mergeGeoms(items);
  BC.makeSupp = function (G, cls) {
    const len = cls === 'pistol' ? 0.15 : 0.22, r = cls === 'pistol' ? 0.021 : 0.024, z = G.muzzle[2] - len / 2 + 0.012, y = G.muzzle[1];
    const items = [BC.pcyl(r, len, 0, y, z, 0x1b1c1f), BC.pcyl(r * 1.06, 0.012, 0, y, z + len * 0.3, 0x2b2c30), BC.pcyl(r * 1.06, 0.012, 0, y, z, 0x2b2c30), BC.pcyl(r * 1.06, 0.012, 0, y, z - len * 0.3, 0x2b2c30), BC.pcyl(r * 0.75, 0.01, 0, y, z - len / 2 - 0.002, 0x050505)];
    const m = new T.Mesh(gm(items), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.5 })); return { mesh: m, len };
  };
  // mira montada no topo da arma. type: reddot | holo | acog | mid | long
  BC.SCOPES = {
    iron: { name: 'Miras de ferro', zoom: 0 }, reddot: { name: 'Red Dot (1×)', zoom: 1.15, h: 0.04, ret: 'dot', kind: 'dot' }, holo: { name: 'Holográfica EOTech (1×)', zoom: 1.2, h: 0.042, ret: 'holo', kind: 'dot', color: '#ff3a3a' },
    micro: { name: 'Micro Red Dot (1×)', zoom: 1.1, h: 0.034, ret: 'dot', kind: 'dot' }, reflex: { name: 'Reflex verde (1×)', zoom: 1.1, h: 0.04, ret: 'dot', kind: 'dot', color: '#3dff6a' },
    prism: { name: 'Prismática 3×', zoom: 3, h: 0.05, ret: 'chev', len: 0.13 }, lpvo: { name: 'LPVO 4×', zoom: 4, h: 0.055, ret: 'cross', len: 0.2 }, dmr: { name: 'Luneta DMR 8×', zoom: 8, h: 0.058, ret: 'mil', len: 0.33 },
    thermal: { name: 'Térmica 4×', zoom: 4, h: 0.058, ret: 'cross', len: 0.26, thermal: true }, nv: { name: 'Visão noturna 5×', zoom: 5, h: 0.058, ret: 'cross', len: 0.26, nv: true },
    acog: { name: 'ACOG 4×', zoom: 4, h: 0.05, ret: 'chev', len: 0.15 }, mid: { name: 'Luneta 6×', zoom: 6, h: 0.055, ret: 'cross', len: 0.27 }, long: { name: 'Luneta 10×', zoom: 10, h: 0.06, ret: 'mil', len: 0.38 }
  };
  BC.makeScope = function (type, G, cls) {
    const S = BC.SCOPES[type]; if (!S || type === 'iron') return null; const grp = new T.Group(); const zc = (cls === 'sniper' ? -0.06 : -0.03);
    if (S.kind === 'dot') {
      const hgt = S.h, parts = [BC.pbox(0.04, 0.014, 0.07, 0, 0.007, zc, 0x1b1c1f), BC.pbox(0.006, hgt - 0.01, 0.06, 0.018, hgt / 2 + 0.004, zc, 0x232427), BC.pbox(0.006, hgt - 0.01, 0.06, -0.018, hgt / 2 + 0.004, zc, 0x232427), BC.pbox(0.04, 0.008, 0.07, 0, hgt + 0.004, zc, 0x232427)];
      grp.add(new T.Mesh(gm(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.35 })));
      const glass = new T.Mesh(new T.PlaneGeometry(0.032, hgt - 0.014), new T.MeshBasicMaterial({ color: 0x7aa0ff, transparent: true, opacity: 0.18, side: T.DoubleSide })); glass.position.set(0, hgt / 2 + 0.006, zc - 0.03); grp.add(glass); grp.userData.win = { x: 0, y: hgt / 2 + 0.006, z: zc - 0.03, w: 0.032, h: hgt - 0.014 };
    } else {
      const L = S.len, d = S.h * 0.9 / 2;
      if (scopeBase) { const g = scopeBase.clone(true), sx = L / scopeBase.userData.len; g.scale.set(sx, sx, sx); g.position.set(0, d + 0.012, zc); grp.add(g); }
      else { const parts = [BC.pcyl(d, L, 0, d + 0.012, zc, 0x1b1c1f), BC.pcyl(d * 1.35, L * 0.22, 0, d + 0.012, zc - L * 0.42, 0x111214), BC.pcyl(d * 1.15, L * 0.12, 0, d + 0.012, zc + L * 0.45, 0x111214), BC.pbox(0.02, 0.02, 0.1, 0, 0.006, zc, 0x232427)]; grp.add(new T.Mesh(gm(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }))); }
      grp.add(new T.Mesh(gm([BC.pbox(0.03, 0.014, 0.05, 0, 0.007, zc + 0.02, 0x232427), BC.pbox(0.03, 0.014, 0.05, 0, 0.007, zc - 0.05, 0x232427)]), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4 })));
    }
    grp.userData.type = type; return grp;
  };

  const loaders = {
    fbx: (u) => new Promise((res, rej) => new T.FBXLoader().load(u, res, undefined, rej)),
    glb: (u) => new Promise((res, rej) => new T.GLTFLoader().load(u, (g) => res(g.scene), undefined, rej)),
    obj: (u) => new Promise((res, rej) => new T.OBJLoader().load(u, res, undefined, rej))
  };
  const FORCE = {};

  BC.loadArsenal = async function () {
    const man = await (await fetch('models/pool2/manifest.json')).json();
    try { BC.MOUNTS = await (await fetch('models/sightmount.json')).json(); } catch (e) { BC.MOUNTS = {}; }
    // luneta realista (pool2 #60)
    try {
      const obj = await loaders.glb('models/pool2/' + man[60]), d = gather(obj), B = orient(d, undefined, true), P = applyBasis(d.P, B, new Float32Array(d.P.length)); let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) { if (P[i + a] < mn[a]) mn[a] = P[i + a]; if (P[i + a] > mx[a]) mx[a] = P[i + a]; }
      const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2; for (let i = 0; i < P.length; i += 3) { P[i] -= cx; P[i + 1] -= cy; P[i + 2] -= cz; }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(applyBasis(d.N, B, new Float32Array(d.N.length)), 3)); const col = new Float32Array(P.length).fill(0.12); geo.setAttribute('color', new T.BufferAttribute(col, 3));
      scopeBase = new T.Group(); scopeBase.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }))); scopeBase.userData.len = mx[2] - mn[2]; scopeBase.userData.rad = (mx[1] - mn[1]) / 2;
    } catch (e) { console.warn('luneta', e); }
    await Promise.all(BC.WEAPONS.map(async (w) => {
      let [kind, a, b] = w.model.split(':');
      if (kind === 'real') { const R = BC.REAL[a]; if (R) BC.MODELS[w.id] = R; return; }
      if (kind === 'var') return;
      if (kind === 'proc') { BC.MODELS[w.id] = BC.procLauncher(a); return; }
      try {
        let obj; if (kind === 'idx') obj = await loaders.glb('models/pool2/' + man[+a]); else obj = await loaders[b]('models/pool/' + a + '.' + b);
        BC.MODELS[w.id] = build(w, gather(obj), FORCE[w.id]);
      } catch (e) { console.warn('arma sem modelo', w.id, e); }
    }));
    // versões (supressor / luneta embutida)
    for (const w of BC.WEAPONS) {
      if (!w.model.startsWith('var:')) continue; const base = BC.MODELS[w.model.slice(4)]; if (!base) continue;
      const body = new T.Group(); base.body.children.forEach((m) => body.add(m.clone())); const G = JSON.parse(JSON.stringify(base.G)); G.real = true; const R = { body, G, flat: base.flat };
      if (w.mod === 'sup') { const sp = BC.makeSupp(G, w.cls); body.add(sp.mesh); G.muzzle[2] -= sp.len; }
      else if (w.mod && w.mod.startsWith('scope:')) { const t = w.mod.slice(6), sc = BC.makeScope(t, G, w.cls, w.id); if (sc) { body.add(sc); G.scopeType = t; } }
      BC.MODELS[w.id] = R;
    }
  };

  const _b = BC.buildGunModel;
  BC.buildGunModel = function (id) {
    const R = BC.MODELS[id];
    if (!R) return _b(BC.fallbackId(id));
    const root = new T.Group(), parts = {};
    for (const k of ['body', 'mag', 'slide', 'pump', 'charge']) { if (!R[k]) continue; const g = new T.Group(); R[k].children.forEach((m) => g.add(m.clone())); root.add(g); parts[k] = g; }
    return { root, parts, G: R.G };
  };
  BC.botGun = function (id) {
    const R = BC.MODELS[id];
    if (R && R.flat) return { geo: R.flat, G: R.G };
    const fb = BC.fallbackId(id); BC._flat = BC._flat || {}; return { geo: BC._flat[fb] || (BC._flat[fb] = BC.gunFlatGeometry(fb)), G: BC.GUNS[fb] };
  };
})();
