// Modelos 3D reais (CC0, OpenGameArt): AK-47, M4A1, Glock e espingarda pump (Quaternius). A SVD é um modelo feito para o jogo.
// Os modelos são divididos em peças animáveis: carregador, ferrolho, ferrolho da Glock e guarda-mão da pump.
(function () {
  const T = THREE, BC = window.BC;
  BC.REAL = {};

  // L = comprimento real (m); trs = posição da mira traseira (0 = boca do cano, 1 = coronha)
  const CFG = {
    ak74: { file: 'models/ak47.obj', type: 'obj', L: 0.87, trs: 0.45, rot: [], hands: { r: [0, -0.14, 0.24], l: [0, -0.075, -0.12] }, eject: [0.03, -0.035, 0.04], my: -0.05, magPos: null },
    m4a1: { file: 'models/M4A1.fbx', type: 'fbx', L: 0.84, trs: 0.7, rot: [], hands: { r: [0, -0.17, 0.04], l: [0, -0.085, -0.26] }, eject: [0.03, -0.05, 0.02], my: -0.067 },
    glock17: { file: 'models/glock.obj', type: 'obj', L: 0.204, trs: 0.92, rot: [['x', Math.PI / 2], ['y', -Math.PI / 2]], hands: { r: [0.014, -0.09, -0.005], l: [-0.024, -0.095, -0.005] }, eject: [0.015, -0.01, -0.03], my: -0.015, magPos: [0, -0.15, 0.0], magSize: [0.03, 0.09, 0.04] },
    rem870: { file: 'models/Shotgun_2.fbx', type: 'fbxq', L: 1.06, trs: 0.58, rot: [['y', Math.PI / 2]], hands: { r: [0, -0.115, 0.03], l: [0, -0.06, -0.19] }, eject: [0.03, -0.04, 0.02], my: -0.01 },
    svd: { file: 'models/dragunov.glb', type: 'svd' }
  };
  const QCOL = { Metal: 0x6a6e75, Black: 0x24252a, DarkMetal: 0x3a3c41, Wood: 0x96602c, DarkWood: 0x6a3f1c };

  function applyRots(geo, rots) { for (const r of rots) { if (r[0] === 'x') geo.rotateX(r[1]); else geo.rotateY(r[1]); } }
  function hash(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

  // divide uma geometria não-indexada em duas, por triângulo: pred(cx,cy,cz,matIndex) -> true vai para B
  function splitGeo(geo, pred) {
    const attrs = Object.keys(geo.attributes), A = {}, B = {};
    for (const k of attrs) { A[k] = []; B[k] = []; }
    const pos = geo.attributes.position, tris = pos.count / 3, groups = geo.groups || [];
    const matOf = (tri) => { const v = tri * 3; for (const g of groups) if (v >= g.start && v < g.start + g.count) return g.materialIndex; return 0; };
    for (let t = 0; t < tris; t++) {
      const i0 = t * 3, cx = (pos.getX(i0) + pos.getX(i0 + 1) + pos.getX(i0 + 2)) / 3, cy = (pos.getY(i0) + pos.getY(i0 + 1) + pos.getY(i0 + 2)) / 3, cz = (pos.getZ(i0) + pos.getZ(i0 + 1) + pos.getZ(i0 + 2)) / 3;
      const dst = pred(cx, cy, cz, matOf(t)) ? B : A;
      for (const k of attrs) { const at = geo.attributes[k], n = at.itemSize; for (let j = 0; j < 3; j++) for (let c = 0; c < n; c++) dst[k].push(at.array[(i0 + j) * n + c]); }
    }
    const mk = (D) => { const g = new T.BufferGeometry(); for (const k of attrs) g.setAttribute(k, new T.BufferAttribute(new Float32Array(D[k]), geo.attributes[k].itemSize)); g.computeBoundingBox(); return g; };
    return [mk(A), mk(B)];
  }
  function normalize(geos, cfg) {
    const box = new T.Box3(); for (const g of geos) { g.computeBoundingBox(); box.union(g.boundingBox); }
    const size = box.getSize(new T.Vector3()), s = cfg.L / size.z;
    const zRear = box.min.z * s + cfg.trs * cfg.L, cx = (box.min.x + box.max.x) / 2;
    for (const g of geos) { g.translate(-cx, 0, 0); g.scale(s, s, s); g.translate(0, -box.max.y * s, -zRear); g.computeBoundingBox(); }
    return { muzzleZ: box.min.z * s - zRear, buttZ: box.max.z * s - zRear, height: size.y * s };
  }
  function colorAK(geo, info) {
    const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3), c = new T.Color(), L = info.buttZ - info.muzzleZ, h = info.height;
    for (let i = 0; i < n; i++) {
      const t = (p.getZ(i) - info.muzzleZ) / L, d = -p.getY(i) / h;
      let hex = 0x2f3034;
      if (t > 0.8) hex = 0x6b3d1d; else if (t > 0.69 && d > 0.38) hex = 0x6b3d1d; else if (t > 0.1 && t < 0.42 && d > 0.07 && d < 0.5) hex = 0x7a4720; else if (t > 0.4 && t < 0.68 && d > 0.55) hex = 0x2a2724;
      c.setHex(hex); const k = 0.82 + 0.18 * hash(Math.floor(i / 3)); col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
  }
  function colorGlock(geo, info) {
    const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3), c = new T.Color();
    for (let i = 0; i < n; i++) { const d = -p.getY(i) / info.height; c.setHex(d < 0.3 ? 0x1b1c1f : 0x2b2c2f); const k = 0.85 + 0.15 * hash(Math.floor(i / 3)); col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k; }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
  }
  function loadOBJ(url) { return new Promise((res, rej) => new T.OBJLoader().load(url, res, undefined, rej)); }
  function loadFBX(url) { return new Promise((res, rej) => new T.FBXLoader().load(url, res, undefined, rej)); }
  function bake(obj) { const out = []; obj.updateMatrixWorld(true); obj.traverse((m) => { if (m.isMesh) { const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); out.push({ name: m.name, geo: g, mats: Array.isArray(m.material) ? m.material.map((x) => x.name) : [m.material.name] }); } }); return out; }
  const grp = (geo, mat) => { const g = new T.Group(); g.add(new T.Mesh(geo, mat)); return g; };


  // SVD Dragunov (modelo .blend CC0/CC-BY convertido para .glb): luneta PSO-1, guarda-mão de madeira, coronha esqueleto
  async function prepSVD() {
    const gltf = await new Promise((res, rej) => new T.GLTFLoader().load('models/dragunov.glb', res, undefined, rej));
    const PAL = { Cube_1: 0x7a4a22, Cube_2: 0x2c2d30, Cube_3: 0x17181a, Cube_4: 0x232427, Cube_5: 0x502f15 };
    const bodyG = [], magG = [], c = new T.Color();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((m) => {
      if (!m.isMesh) return; let g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); g = g.toNonIndexed(); if (!g.attributes.normal) g.computeVertexNormals();
      const n = g.attributes.position.count, col = new Float32Array(n * 3); c.setHex(PAL[m.name] || 0x2c2d30);
      for (let i = 0; i < n; i++) { const k = 0.88 + 0.12 * hash(Math.floor(i / 3)); col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k; }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      if (m.name === 'Cube_2') { const [rest, mag] = splitGeo(g, (x, y, z) => y < -0.45 && z > 1.7 && z < 2.9); bodyG.push(rest); magG.push(mag); } else bodyG.push(g);
    });
    const all = bodyG.concat(magG), s = 1.225 / 9.98, cx = -4.84;
    for (const g of all) { g.translate(-cx, -0.64, -3.44); g.scale(s * 1.9, s * 1.2, s); g.computeBoundingBox(); }
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 });
    const body = new T.Group(), mag = new T.Group(); bodyG.forEach((g) => body.add(new T.Mesh(g, mat))); magG.forEach((g) => mag.add(new T.Mesh(g, mat)));
    const mb = new T.Box3().setFromObject(mag);
    BC.REAL.svd = { body, mag, G: { stock: 0.19, muzzle: [0, -0.09, -1.035], eject: [0.04, -0.08, 0.0], hands: { r: [0, -0.19, 0.09], l: [0, -0.12, -0.4] }, real: true, magPos: mb.getCenter(new T.Vector3()).toArray(), magSize: null, cantScale: 0.4 } };
  }

  async function prep(id) {
    if (id === 'svd') return prepSVD();
    const cfg = CFG[id], obj = cfg.type === 'obj' ? await loadOBJ(cfg.file) : await loadFBX(cfg.file);
    const parts = bake(obj);
    for (const p of parts) { if (!p.geo.attributes.normal) p.geo.computeVertexNormals(); applyRots(p.geo, cfg.rot); }
    const info = normalize(parts.map((p) => p.geo), cfg), out = {};
    const stdVC = (r, m) => new T.MeshStandardMaterial({ vertexColors: true, roughness: r, metalness: m });
    if (id === 'm4a1') {
      const tl = new T.TextureLoader(), map = tl.load('models/M4A1_Base_Color.png'), nm = tl.load('models/M4A1_Normal.png'); map.anisotropy = 4;
      const mat = new T.MeshStandardMaterial({ map, normalMap: nm, roughness: 0.62, metalness: 0.3 });
      const body = new T.Group(), mag = new T.Group(), charge = new T.Group();
      for (const p of parts) { const m = new T.Mesh(p.geo, mat); if (/magazine/i.test(p.name)) mag.add(m); else if (/charging/i.test(p.name)) charge.add(m); else body.add(m); }
      out.body = body; out.mag = mag; out.charge = charge;
    } else if (id === 'ak74') {
      const geo = parts[0].geo; colorAK(geo, info);
      const L = info.buttZ - info.muzzleZ, h = info.height;
      const [rest, mag] = splitGeo(geo, (x, y, z) => { const t = (z - info.muzzleZ) / L, d = -y / h; return t > 0.4 && t < 0.67 && d > 0.55; });
      const mat = stdVC(0.55, 0.35); out.body = grp(rest, mat); out.mag = grp(mag, mat);
    } else if (id === 'glock17') {
      const geo = parts[0].geo; colorGlock(geo, info);
      const [frame, slide] = splitGeo(geo, (x, y) => -y / info.height < 0.3);
      const mat = stdVC(0.5, 0.35); out.body = grp(frame, mat); out.slide = grp(slide, mat);
    } else if (id === 'rem870') {
      const p = parts[0], geo = p.geo, pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new T.Color();
      const groups = geo.groups; let gi = 0;
      for (let v = 0; v < pos.count; v++) {
        while (gi < groups.length - 1 && v >= groups[gi].start + groups[gi].count) gi++;
        const name = p.mats[groups[gi].materialIndex]; c.setHex(QCOL[name] !== undefined ? QCOL[name] : 0x333333); const k = 0.9 + 0.1 * hash(Math.floor(v / 3)); col[v * 3] = c.r * k; col[v * 3 + 1] = c.g * k; col[v * 3 + 2] = c.b * k;
      }
      geo.setAttribute('color', new T.BufferAttribute(col, 3));
      const darkIdx = p.mats.indexOf('DarkWood');
      const [rest, pump] = splitGeo(geo, (x, y, z, mi) => mi === darkIdx);
      const mat = stdVC(0.5, 0.3); out.body = grp(rest, mat); out.pump = grp(pump, mat);
    }
    // centro do carregador (espaço da arma), usado pela animação
    let magPos = cfg.magPos || null;
    if (out.mag) { const b = new T.Box3().setFromObject(out.mag); magPos = b.getCenter(new T.Vector3()).toArray(); }
    out.G = { stock: info.buttZ, muzzle: [0, cfg.my, info.muzzleZ], eject: cfg.eject, hands: cfg.hands, real: true, magPos, magSize: cfg.magSize || null, cantScale: id === 'rem870' ? 0.7 : 1 };
    BC.REAL[id] = out;
  }

  BC.loadModels = function () {
    return Promise.all(Object.keys(CFG).map((id) => prep(id).catch((e) => { console.warn('modelo falhou', id, e); }))).then(() => { BC.modelStatus = 'ok'; });
  };

  const _build = BC.buildGunModel;
  BC.buildGunModel = function (id) {
    const R = BC.REAL[id]; if (!R) return _build(id);
    const root = new T.Group(), parts = {};
    for (const k of ['body', 'mag', 'slide', 'pump', 'charge']) {
      if (!R[k]) continue; const g = new T.Group(); R[k].children.forEach((m) => g.add(m.clone())); root.add(g); parts[k] = g;
    }
    return { root, parts, G: R.G };
  };
})();
