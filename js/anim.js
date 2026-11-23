// Animações da arma em 1ª pessoa: puxar/sacar a arma e recarga em fases (mão esquerda, carregador novo, ferrolho).
(function () {
  const T = THREE, BC = window.BC;
  const V = {};
  const sm = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  V.easeOutBack = (x) => { x = BC.clamp(x, 0, 1); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  // chaves: [t, x, y, z, cant]; interpolação suave entre chaves
  function interp(keys, p) {
    if (p <= keys[0][0]) return keys[0].slice(1);
    for (let i = 1; i < keys.length; i++) {
      if (p <= keys[i][0]) { const a = keys[i - 1], b = keys[i], u = sm((p - a[0]) / (b[0] - a[0])); return [1, 2, 3, 4].map((k) => a[k] + (b[k] - a[k]) * u); }
    }
    return keys[keys.length - 1].slice(1);
  }

  // prepara props (carregador novo / cartucho na mão) e dados de posição
  V.setup = function (m) {
    const G = m.G, hl = G.hands.l, armL = m.arms.armL;
    let magC = G.magPos ? new T.Vector3(...G.magPos) : null;
    if (!magC && m.parts.mag) magC = new T.Box3().setFromObject(m.parts.mag).getCenter(new T.Vector3());
    m.magC = magC; m.hl = new T.Vector3(...hl);
    m.fresh = null; m.shellProp = null;
    if (m.parts.mag) {
      const g = new T.Group(); m.parts.mag.children.forEach((c) => g.add(c.clone()));
      g.position.copy(m.hl).sub(magC); g.visible = false; armL.add(g); m.fresh = g;
    } else if (magC && G.magSize) {
      const s = G.magSize, mesh = new T.Mesh(new T.BoxGeometry(s[0], s[1], s[2]), new T.MeshStandardMaterial({ color: 0x111113, roughness: 0.6, metalness: 0.3 }));
      const g = new T.Group(); g.add(mesh); g.position.copy(m.hl); g.visible = false; armL.add(g); m.fresh = g;
    }
    if (G.real && !m.parts.mag && !G.magSize) { /* espingarda */ }
    const shell = new T.Group();
    shell.add(new T.Mesh(new T.CylinderGeometry(0.0095, 0.0095, 0.05, 10), new T.MeshStandardMaterial({ color: 0xa31818, roughness: 0.5 })));
    const base = new T.Mesh(new T.CylinderGeometry(0.0098, 0.0098, 0.014, 10), new T.MeshStandardMaterial({ color: 0xc9a23a, roughness: 0.35, metalness: 0.8 })); base.position.y = -0.03; shell.add(base);
    shell.rotation.x = Math.PI / 2; const sh = new T.Group(); sh.add(shell); sh.position.copy(m.hl).add(new T.Vector3(0.0, 0.0, -0.01)); sh.visible = false; armL.add(sh); m.shellProp = sh;
  };

  // estado neutro das peças
  function rest(m) {
    if (m.parts.mag) { m.parts.mag.position.set(0, 0, 0); m.parts.mag.rotation.set(0, 0, 0); m.parts.mag.visible = true; }
    if (m.parts.charge) m.parts.charge.position.z = 0;
    if (m.fresh) m.fresh.visible = false; if (m.shellProp) m.shellProp.visible = false;
  }

  // out: { px,py,pz,rx,ry,rz, hx,hy,hz }  (deslocamentos somados à pose base)
  V.reload = function (m, spec, r, out) {
    if (!r) { rest(m); out.hx = out.hy = out.hz = 0; return; }
    out.hx = out.hy = out.hz = 0;
    if (spec.shellReload) {
      const lead = r.first ? BC.clamp(r.t / 0.4, 0, 1) : 1, p = r.inShell ? r.p : 0;
      const pouch = [-0.07, -0.14, 0.1], gate = [0.0, -0.045, 0.24];
      const k = interp([[0, 0, 0, 0, 0], [0.22, pouch[0], pouch[1], pouch[2], 0], [0.52, gate[0], gate[1], gate[2], 0], [0.64, gate[0], gate[1] + 0.005, gate[2] + 0.035, 0], [0.84, 0, 0, 0, 0], [1, 0, 0, 0, 0]], p);
      const cant = sm(lead);
      const cs2 = m.G.cantScale || 1; out.rz += 0.6 * cant * cs2; out.rx += -0.25 * cant * cs2; out.py += 0.07 * cant; out.px -= 0.06 * cant;
      out.hx = k[0]; out.hy = k[1]; out.hz = k[2];
      if (m.shellProp) m.shellProp.visible = r.inShell && p > 0.1 && p < 0.64;
      return;
    }
    const p = BC.clamp(r.p, 0, 1), empty = !!r.empty, mc = m.magC || new T.Vector3(0, -0.15, 0.0), hl = m.hl;
    const ins = mc.clone().sub(hl), well = ins.clone().multiplyScalar(0.85), below = ins.clone().add(new T.Vector3(0, -0.11, 0.02)), pouch = new T.Vector3(-0.13, -0.26, 0.28);
    const keys = [[0, 0, 0, 0, 0], [0.13, well.x, well.y, well.z, 1], [0.3, pouch.x, pouch.y, pouch.z, 1], [0.5, pouch.x * 0.95, pouch.y * 0.95, pouch.z * 0.95, 1], [0.64, below.x, below.y, below.z, 1], [0.72, ins.x, ins.y, ins.z, 1], [0.76, ins.x, ins.y + 0.012, ins.z, 1]];
    let rack = 0;
    if (empty && spec.cls !== 'pistol' && spec.cls !== 'revolver') {
      keys.push([0.82, 0.01, 0.05, 0.12, 0.5], [0.9, 0.01, 0.05, 0.19, 0.25], [0.95, 0.01, 0.05, 0.12, 0.1], [1, 0, 0, 0, 0]);
      rack = p < 0.82 ? 0 : p < 0.9 ? sm((p - 0.82) / 0.08) : p < 0.95 ? 1 - sm((p - 0.9) / 0.05) : 0;
    } else keys.push([0.9, 0, 0, 0, 0.3], [1, 0, 0, 0, 0]);
    const k = interp(keys, p);
    out.hx = k[0]; out.hy = k[1]; out.hz = k[2];
    const cant = k[3], cs = m.G.cantScale || 1; out.rz += 0.5 * cant * cs; out.rx += -0.1 * cant * cs; out.py += 0.17 * cant; out.px -= 0.06 * cant; out.pz += 0.03 * cant;
    if (m.parts.charge) m.parts.charge.position.z = rack * 0.065;
    // carregador antigo cai; novo entra
    if (m.parts.mag) {
      const pm = m.parts.mag;
      if (p < 0.13) { pm.visible = true; pm.position.set(0, 0, 0); pm.rotation.set(0, 0, 0); }
      else if (p < 0.72) { const tau = (p - 0.13) * r.dur; pm.visible = tau < 0.5; pm.position.set(0.04 * tau, -2.6 * tau * tau, 0.25 * tau); pm.rotation.set(tau * 5, 0, tau * 3); }
      else { pm.visible = true; pm.position.set(0, 0, 0); pm.rotation.set(0, 0, 0); }
    }
    if (m.fresh) m.fresh.visible = p > 0.42 && p < 0.73;
    // ferrolho da pistola: travado aberto quando vazia, solta ao final
    if (spec.cls === 'pistol' && m.parts.slide) { m.parts.slide.position.z = empty ? (p < 0.88 ? 0.03 : 0.03 * (1 - sm((p - 0.88) / 0.04))) : 0; }
  };
  V.reset = rest;
  BC.VMA = V;
})();
