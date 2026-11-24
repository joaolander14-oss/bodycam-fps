// Modelos 3D detalhados das miras (red dot em tubo, holográfica, reflex, micro, lunetas, ACOG, térmica, visão noturna).
(function () {
  const T = THREE, BC = window.BC;
  const MC = {}; const mat = (c, m, r) => { const k = c + '|' + m + '|' + r; return MC[k] || (MC[k] = new T.MeshStandardMaterial({ color: c, metalness: m === undefined ? 0.55 : m, roughness: r === undefined ? 0.4 : r })); };
  const glassMat = (c) => new T.MeshStandardMaterial({ color: c || 0x203a6a, metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.55 });
  // cilindro com eixo em Z (rb = raio traseiro (+z), rf = raio da frente (-z))
  const cz = (rb, rf, len, c, x, y, z, parent, open, m, r) => { const g = new T.CylinderGeometry(rb, rf, len, 28, 1, !!open); const q = new T.Mesh(g, open ? new T.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.4, side: T.DoubleSide }) : mat(c, m, r)); q.rotation.x = Math.PI / 2; q.position.set(x, y, z); parent.add(q); return q; };
  const cy = (r, h, c, x, y, z, parent) => { const q = new T.Mesh(new T.CylinderGeometry(r, r, h, 16), mat(c)); q.position.set(x, y, z); parent.add(q); return q; };
  const cx = (r, h, c, x, y, z, parent) => { const q = new T.Mesh(new T.CylinderGeometry(r, r, h, 16), mat(c)); q.rotation.z = Math.PI / 2; q.position.set(x, y, z); parent.add(q); return q; };
  const bx = (w, h, d, c, x, y, z, parent, rx) => { const q = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); q.position.set(x, y, z); if (rx) q.rotation.x = rx; parent.add(q); return q; };
  const mount = (g, zc, len, y0) => { // trilho picatinny, garras e parafusos
    bx(0.034, 0.008, len, 0x202226, 0, y0 + 0.004, zc, g); bx(0.038, 0.004, len * 0.6, 0x15161a, 0, y0 + 0.001, zc, g);
    for (const dz of [-len * 0.3, len * 0.3]) { bx(0.006, 0.012, 0.012, 0x2c2e32, 0.019, y0 + 0.006, zc + dz, g); cx(0.004, 0.008, 0x55585e, 0.024, y0 + 0.006, zc + dz, g); }
  };
  const BLK = 0x16171a, DK = 0x24262a;
  BC.makeScope = function (type, G, cls) {
    const S = BC.SCOPES[type]; if (!S || type === 'iron') return null; const g = new T.Group(), zc = (cls === 'sniper' ? -0.06 : -0.03);
    if (S.kind === 'dot') {
      if (type === 'reddot') { // tubo estilo Aimpoint: tubo oco, sino objetivo, ocular, torres de ajuste, tampa da bateria
        mount(g, zc, 0.055, 0); bx(0.022, 0.012, 0.03, DK, 0, 0.014, zc, g); const yc = 0.034;
        cz(0.0165, 0.0165, 0.06, BLK, 0, yc, zc, g, true); cz(0.0172, 0.0172, 0.058, 0x0c0c0e, 0, yc, zc, g, true);
        cz(0.0195, 0.0172, 0.014, DK, 0, yc, zc - 0.036, g, true); cz(0.0172, 0.0182, 0.012, DK, 0, yc, zc + 0.034, g, true);
        cz(0.0178, 0.0178, 0.004, 0x8a1212, 0, yc, zc - 0.018, g, true); cy(0.0058, 0.007, DK, 0, yc + 0.0185, zc + 0.006, g); cx(0.0058, 0.007, DK, 0.0185, yc, zc + 0.006, g); cy(0.0075, 0.005, 0x303236, 0, yc + 0.0185, zc - 0.014, g);
        for (const dz of [-0.03, 0.03]) cz(0.0185, 0.0185, 0.004, 0x2a2c30, 0, yc, zc + dz, g, true);
        const gl = new T.Mesh(new T.CircleGeometry(0.0155, 28), glassMat(0x2a5aa0)); gl.position.set(0, yc, zc - 0.026); gl.material.opacity = 0.18; g.add(gl);
        g.userData.win = { x: 0, y: yc, z: zc - 0.02, w: 0.027, h: 0.027 };
      } else if (type === 'holo') { // holográfica EOTech: caixa com janelas retangulares, capuz, alavanca QD, bateria lateral
        mount(g, zc, 0.075, 0); bx(0.044, 0.012, 0.09, DK, 0, 0.014, zc, g); bx(0.007, 0.032, 0.085, BLK, 0.0215, 0.036, zc, g); bx(0.007, 0.032, 0.085, BLK, -0.0215, 0.036, zc, g); bx(0.05, 0.009, 0.098, BLK, 0, 0.0555, zc - 0.002, g);
        for (const dz of [-0.044, 0.044]) { bx(0.05, 0.006, 0.006, DK, 0, 0.0185, zc + dz, g); bx(0.05, 0.006, 0.006, DK, 0, 0.0515, zc + dz, g); bx(0.007, 0.042, 0.006, DK, 0.0215, 0.034, zc + dz, g); bx(0.007, 0.042, 0.006, DK, -0.0215, 0.034, zc + dz, g); }
        bx(0.016, 0.014, 0.03, 0x2c2e32, 0.0285, 0.036, zc + 0.012, g); cx(0.006, 0.01, 0x4a4c52, 0.0365, 0.036, zc + 0.012, g); bx(0.01, 0.012, 0.03, 0x303236, -0.0285, 0.045, zc - 0.012, g, 0.15);
        const gl = new T.Mesh(new T.PlaneGeometry(0.034, 0.03), glassMat(0x3a5a9a)); gl.position.set(0, 0.034, zc - 0.042); gl.material.opacity = 0.12; g.add(gl);
        g.userData.win = { x: 0, y: 0.034, z: zc - 0.02, w: 0.034, h: 0.03 };
      } else if (type === 'reflex') { // reflex aberto: base, dois pilares e vidro inclinado
        mount(g, zc, 0.05, 0); bx(0.032, 0.01, 0.05, DK, 0, 0.013, zc, g); bx(0.024, 0.008, 0.018, 0x101114, 0, 0.022, zc - 0.012, g); bx(0.005, 0.03, 0.01, BLK, 0.0145, 0.03, zc + 0.014, g); bx(0.005, 0.03, 0.01, BLK, -0.0145, 0.03, zc + 0.014, g); bx(0.034, 0.006, 0.012, BLK, 0, 0.047, zc + 0.014, g);
        const gl = new T.Mesh(new T.PlaneGeometry(0.0235, 0.024), glassMat(0x4aa0ff)); gl.position.set(0, 0.033, zc + 0.014); gl.material.opacity = 0.16; gl.rotation.x = -0.18; g.add(gl);
        g.userData.win = { x: 0, y: 0.033, z: zc + 0.0135, w: 0.022, h: 0.022 };
      } else { // micro (T-1): corpo compacto com janela
        mount(g, zc, 0.04, 0); bx(0.024, 0.01, 0.036, DK, 0, 0.013, zc, g); bx(0.004, 0.02, 0.034, BLK, 0.0105, 0.028, zc, g); bx(0.004, 0.02, 0.034, BLK, -0.0105, 0.028, zc, g); bx(0.024, 0.005, 0.036, BLK, 0, 0.04, zc, g); bx(0.021, 0.005, 0.005, DK, 0, 0.0185, zc + 0.016, g); cy(0.004, 0.004, 0x303236, 0, 0.0445, zc + 0.006, g);
        const gl = new T.Mesh(new T.PlaneGeometry(0.017, 0.0155), glassMat(0x2a5aa0)); gl.position.set(0, 0.028, zc - 0.012); gl.material.opacity = 0.15; g.add(gl);
        g.userData.win = { x: 0, y: 0.028, z: zc - 0.012, w: 0.017, h: 0.0155 };
      }
    } else { // lunetas: tubo principal, sino objetivo, ocular, torres, anéis de montagem, extras por tipo
      const L = S.len, r = 0.0145 + (L > 0.25 ? 0.003 : 0) + (S.thermal || S.nv ? 0.004 : 0), yc = r + 0.026; mount(g, zc, Math.max(0.07, L * 0.55), 0);
      const dark = S.thermal ? 0x2a2e26 : S.nv ? 0x1c2a1c : BLK;
      if (type === 'acog' || type === 'prism') { // corpo curto e forte, tubo de fibra óptica no topo
        cz(r * 1.35, r * 1.25, L, dark, 0, yc, zc, g, false, 0.5, 0.45); cz(r * 1.5, r * 1.35, L * 0.12, DK, 0, yc, zc + L * 0.5, g); cz(r * 1.55, r * 1.35, L * 0.14, DK, 0, yc, zc - L * 0.5, g);
        cz(0.0042, 0.0042, L * 0.9, 0xff6a10, 0, yc + r * 1.5, zc, g, false, 0.1, 0.2); bx(0.016, 0.01, L * 0.35, dark, 0, yc + r * 1.25, zc, g); bx(0.012, 0.012, 0.012, 0xffd040, 0, yc + r * 1.5 + 0.006, zc - L * 0.45, g);
      } else if (S.thermal || S.nv) { // aparelhos de imagem: corpo largo + tampas
        bx(r * 3.2, r * 2.8, L * 0.8, dark, 0, yc, zc, g); cz(r * 1.5, r * 1.5, L * 0.2, 0x101410, 0, yc, zc - L * 0.46, g); cz(r * 1.25, r * 1.25, L * 0.12, DK, 0, yc, zc + L * 0.46, g); bx(r * 1.2, r * 0.8, L * 0.25, 0x2c2e30, 0, yc + r * 1.7, zc + L * 0.1, g);
      } else { // luneta clássica
        cz(r, r, L * 0.62, dark, 0, yc, zc, g, false, 0.55, 0.4); cz(r * 1.55, r, L * 0.2, dark, 0, yc, zc - L * 0.41, g, false, 0.5, 0.4); cz(r, r * 1.35, L * 0.16, dark, 0, yc, zc + L * 0.39, g, false, 0.5, 0.4); cz(r * 1.6, r * 1.55, L * 0.03, DK, 0, yc, zc - L * 0.5, g); cz(r * 1.45, r * 1.45, L * 0.03, DK, 0, yc, zc + L * 0.47, g);
      }
      cy(r * 0.62, r * 1.2, DK, 0, yc + r * 0.95, zc - L * 0.02, g); cy(r * 0.5, r * 0.7, 0x36383c, 0, yc + r * 1.5, zc - L * 0.02, g); cx(r * 0.62, r * 1.2, DK, r * 0.95, yc, zc - L * 0.02, g); cx(r * 0.5, r * 0.7, 0x36383c, r * 1.5, yc, zc - L * 0.02, g);
      for (const dz of [-L * 0.22, L * 0.22]) { cz(r * 1.12, r * 1.12, 0.012, 0x22252a, 0, yc, zc + dz, g, false, 0.6, 0.3); bx(0.02, yc - r, 0.014, 0x1c1e22, 0, (yc - r) / 2 + 0.004, zc + dz, g); cx(0.0045, 0.008, 0x606368, r * 1.15, yc - r * 0.4, zc + dz, g); }
      const fg = new T.Mesh(new T.CircleGeometry(r * 0.86, 28), glassMat(S.nv ? 0x205a20 : S.thermal ? 0x3a2a1a : 0x2a1a5a)); fg.position.set(0, yc, zc - L * 0.51); fg.rotation.y = Math.PI; g.add(fg);
    }
    g.userData.type = type; return g;
  };

  // ---------------------------------------------------------- modelos prontos (Pichuliru, CC0) para as miras principais
  const FILES = { reddot: ['reddot', 1], micro: ['micro', 0.9], reflex: ['reflex', 1], holo: ['holo', 1], acog: ['acog', 1.25], prism: ['prism', 1.1], lpvo: ['lpvo', 0.8], mid: ['mid', 0.85], dmr: ['mid', 1.0], long: ['mid', 1.08] };
  const FRONT_FLIP = { reddot: false, micro: false, reflex: false, holo: false };
  BC.SIGHT_PROTO = {}; const loaded = {};
  function prepSight(file, scene) {
    scene.updateMatrixWorld(true); const box = new T.Box3().setFromObject(scene), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
    // extremos em z: o mais "gordo" é a objetiva (frente = -z)
    let big = { lo: 0, hi: 0 }; const ext = (lo) => { const b = new T.Box3(), v = new T.Vector3(); scene.traverse((o) => { if (!o.isMesh) return; const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); const t = (v.z - box.min.z) / size.z; if (lo ? t < 0.2 : t > 0.8) b.expandByPoint(v); } }); const s2 = b.getSize(new T.Vector3()); return s2.x * s2.y; };
    big.lo = ext(true); big.hi = ext(false);
    return { scene, size, c, min: box.min.clone(), frontAtPlusZ: big.hi > big.lo * 1.08 };
  }
  BC.loadSights = function () {
    const loader = new T.GLTFLoader(), files = [...new Set(Object.values(FILES).map((f) => f[0]))];
    return Promise.all(files.map((f) => new Promise((res) => loader.load('models/sights/' + f + '.glb', (g) => { try { loaded[f] = prepSight(f, g.scene); } catch (e) { console.warn('mira', f, e); } res(); }, undefined, () => res()))));
  };
  const procScope = BC.makeScope;
  BC.makeScope = function (type, G, cls) {
    const F = FILES[type], pr = F && loaded[F[0]]; if (!pr) return procScope(type, G, cls);
    const S = BC.SCOPES[type], zc = (cls === 'sniper' ? -0.06 : -0.03), g = new T.Group(), wrap = new T.Group(), inner = pr.scene.clone(true), k = F[1];
    inner.position.set(-pr.c.x, -pr.min.y, -pr.c.z); wrap.add(inner);
    const flip = pr.frontAtPlusZ || FRONT_FLIP[type]; wrap.rotation.y = flip ? Math.PI : 0; wrap.scale.setScalar(k); wrap.position.set(0, 0, zc); g.add(wrap);
    inner.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.material = o.material.clone(); if (o.material.metalness !== undefined) { o.material.metalness = Math.min(o.material.metalness, 0.3); o.material.roughness = Math.max(o.material.roughness, 0.55); } } });
    const H = pr.size.y * k, W = pr.size.x * k;
    if (S.kind === 'dot') g.userData.win = { x: 0, y: H * 0.62, z: zc, w: W * 0.55, h: H * 0.42 };
    g.userData.type = type; g.userData.model = true; return g;
  };
})();
