// Marcas de tiro: o furo depende da superfície (concreto/pedra, madeira, metal, terra) e do calibre; ricochete deixa risco; saída do tiro que atravessa deixa furo maior.
(function () {
  const T = THREE, BC = window.BC, F = BC.Fx.prototype, _imp = F.impact;
  const cvs = (n, f) => { const c = document.createElement('canvas'); c.width = c.height = n; f(c.getContext('2d'), n, BC.rng(n * 7 + 3)); const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; return t; };
  const line = (g, x1, y1, x2, y2, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  // cada textura: furo escuro no centro + material arrancado em volta (o furo ocupa ~1/3 da imagem)
  const KINDS = {
    concrete: (big) => cvs(128, (g, s, r) => {
      const c = s / 2; let gr = g.createRadialGradient(c, c, 0, c, c, c * 0.95); gr.addColorStop(0, 'rgba(235,232,222,.0)'); gr.addColorStop(0.35, 'rgba(225,222,212,.55)'); gr.addColorStop(1, 'rgba(210,208,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
      for (let i = 0; i < (big ? 16 : 8); i++) { const a = r() * 6.283, d = 14 + r() * 26; g.fillStyle = 'rgba(200,196,186,.65)'; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 1.5 + r() * 3.5, 0, 7); g.fill(); }
      if (big) for (let i = 0; i < 7; i++) { const a = r() * 6.283; let x = c, y = c; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += Math.cos(a + (r() - 0.5) * 0.8) * (8 + r() * 9); y += Math.sin(a + (r() - 0.5) * 0.8) * (8 + r() * 9); g.lineTo(x, y); } g.strokeStyle = 'rgba(40,40,40,.55)'; g.lineWidth = 1; g.stroke(); }
      gr = g.createRadialGradient(c, c, 0, c, c, big ? 15 : 9); gr.addColorStop(0, 'rgba(12,12,12,.95)'); gr.addColorStop(0.7, 'rgba(30,28,26,.85)'); gr.addColorStop(1, 'rgba(40,36,32,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, big ? 15 : 9, 0, 7); g.fill();
    }),
    wood: (big) => cvs(128, (g, s, r) => {
      const c = s / 2; for (let i = 0; i < (big ? 22 : 12); i++) { const a = r() * 6.283, l = 14 + r() * (big ? 40 : 26); line(g, c + Math.cos(a) * 6, c + Math.sin(a) * 6, c + Math.cos(a) * l, c + Math.sin(a) * l, 1 + r() * 1.8, r() < 0.5 ? 'rgba(214,170,110,.8)' : 'rgba(150,100,55,.75)'); }
      const gr = g.createRadialGradient(c, c, 0, c, c, big ? 14 : 8); gr.addColorStop(0, 'rgba(10,6,3,.97)'); gr.addColorStop(0.75, 'rgba(40,24,12,.85)'); gr.addColorStop(1, 'rgba(60,36,18,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, big ? 14 : 8, 0, 7); g.fill();
    }),
    metal: (big) => cvs(128, (g, s, r) => {
      const c = s / 2; let gr = g.createRadialGradient(c, c, 4, c, c, big ? 30 : 20); gr.addColorStop(0, 'rgba(255,255,255,.0)'); gr.addColorStop(0.55, 'rgba(235,238,242,.75)'); gr.addColorStop(1, 'rgba(200,205,210,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, big ? 30 : 20, 0, 7); g.fill();
      for (let i = 0; i < (big ? 10 : 5); i++) { const a = r() * 6.283; line(g, c + Math.cos(a) * 10, c + Math.sin(a) * 10, c + Math.cos(a) * (18 + r() * 22), c + Math.sin(a) * (18 + r() * 22), 0.9, 'rgba(240,244,250,.65)'); }
      gr = g.createRadialGradient(c, c, 0, c, c, big ? 13 : 8); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.8, 'rgba(25,25,28,.8)'); gr.addColorStop(1, 'rgba(25,25,28,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, big ? 13 : 8, 0, 7); g.fill();
    }),
    earth: (big) => cvs(128, (g, s, r) => {
      const c = s / 2; let gr = g.createRadialGradient(c, c, 0, c, c, c * 0.9); gr.addColorStop(0, 'rgba(20,14,8,.9)'); gr.addColorStop(0.3, 'rgba(48,36,24,.65)'); gr.addColorStop(0.7, 'rgba(90,76,58,.25)'); gr.addColorStop(1, 'rgba(90,76,58,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
      for (let i = 0; i < (big ? 18 : 8); i++) { const a = r() * 6.283, d = 14 + r() * 30; g.fillStyle = 'rgba(60,48,34,.5)'; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 1 + r() * 2.4, 0, 7); g.fill(); }
    }),
    streak: () => cvs(128, (g, s, r) => { const c = s / 2; const gr = g.createLinearGradient(0, 0, s, 0); gr.addColorStop(0, 'rgba(40,40,40,0)'); gr.addColorStop(0.15, 'rgba(30,30,30,.85)'); gr.addColorStop(0.7, 'rgba(60,60,60,.6)'); gr.addColorStop(1, 'rgba(60,60,60,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(c, c, c * 0.95, 5, 0, 0, 7); g.fill(); for (let i = 0; i < 5; i++) line(g, 10 + r() * 30, c + (r() - 0.5) * 8, 60 + r() * 60, c + (r() - 0.5) * 8, 0.8, 'rgba(235,238,242,.6)'); })
  };
  const texCache = {}; const getTex = (kind, big) => { const k = kind + (big ? 'B' : 'S'); return texCache[k] || (texCache[k] = KINDS[kind](big)); };
  const matCache = {}; const getMat = (kind, big) => { const k = kind + (big ? 'B' : 'S'); return matCache[k] || (matCache[k] = new T.MeshBasicMaterial({ map: getTex(kind, big), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 })); };
  const KIND = { concrete: 'concrete', rock: 'concrete', brick: 'concrete', wood: 'wood', metal: 'metal', sand: 'earth', snow: 'earth', mud: 'earth', dirt: 'earth', grass: 'earth' };
  const _m = new T.Matrix4(), _x = new T.Vector3(), _y = new T.Vector3(), _z = new T.Vector3(), _q = new T.Quaternion();
  function pool(fx) { if (fx.holes) return; fx.holes = []; fx.hi = 0; const pg = new T.PlaneGeometry(1, 1); for (let i = 0; i < 520; i++) { const m = new T.Mesh(pg, getMat('concrete', false)); m.visible = false; fx.scene.add(m); fx.holes.push({ m, life: 0 }); } }
  // pt = ponto; n = normal; size = diâmetro do furo (m); dirv = direção do tiro (para risco de ricochete); o = {exit, streak}
  F.hole = function (pt, n, tag, size, dirv, o) {
    pool(this); o = o || {}; const kind = o.streak ? 'streak' : (KIND[tag] || 'concrete'), big = !!o.big, d = this.holes[this.hi++ % this.holes.length], m = d.m;
    m.material = getMat(kind, big); m.position.set(pt.x + n.x * 0.012, pt.y + n.y * 0.012, pt.z + n.z * 0.012);
    _z.set(n.x, n.y, n.z).normalize(); let ang = Math.random() * 6.283;
    if (o.streak && dirv) { _x.set(dirv.x, dirv.y, dirv.z); _x.addScaledVector(_z, -_x.dot(_z)); if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0); _x.normalize(); } else { _x.set(Math.abs(_z.y) > 0.9 ? 1 : 0, Math.abs(_z.y) > 0.9 ? 0 : 1, 0).cross(_z).normalize(); _y.crossVectors(_z, _x); _x.multiplyScalar(Math.cos(ang)).addScaledVector(_y, Math.sin(ang)).normalize(); }
    _y.crossVectors(_z, _x).normalize(); _m.makeBasis(_x, _y, _z); m.quaternion.setFromRotationMatrix(_m);
    const sc = size * (kind === 'streak' ? 6 : 3.2); m.scale.set(sc, kind === 'streak' ? sc * 0.5 : sc, 1); m.visible = true; d.life = 120;
  };
  const upd = F.update; F.update = function (dt, world) { upd.call(this, dt, world); if (this.holes) for (const d of this.holes) if (d.life > 0) { d.life -= dt; if (d.life <= 0) d.m.visible = false; } };
  const _rs = F.reset; F.reset = function () { if (_rs) _rs.call(this); if (this.holes) for (const d of this.holes) { d.life = 0; d.m.visible = false; } };
  // impacto: partículas por calibre + furo conforme a superfície e a direção
  F.impact = function (pt, n, tag, big, spec, dirv) {
    if (tag === 'flesh' || tag === 'water' || !spec) return _imp.call(this, pt, n, tag, big);
    if (n.nx !== undefined) n = { x: n.nx, y: n.ny, z: n.nz }; // fireCore passa a normal como {nx,ny,nz}
    const dmg = spec.dmg || 40, pel = spec.pellets > 1, k = BC.clamp(dmg / 130, 0.1, 1), col = (BC.SURF && BC.SURF[tag]) || 0x888888, up = n.y > 0.7;
    const size = pel ? 0.035 : 0.04 + 0.12 * k, hard = tag === 'metal' || tag === 'concrete' || tag === 'rock' || tag === 'brick';
    this.puff(pt.x + n.x * 0.05, pt.y + n.y * 0.05, pt.z + n.z * 0.05, col, pel ? 2 : 2 + Math.round(5 * k), 0.8 + 1.4 * k, 0.28 + 0.4 * k, 0.6);
    this.debris(pt.x, pt.y, pt.z, tag === 'metal' ? 0xffd070 : col, pel ? 2 : 3 + Math.round(8 * k), (tag === 'metal' ? 4 : 2.2) * (0.7 + k), n.x, n.y, n.z);
    // ricochete: ângulo raso em material duro deixa risco e faísca
    const ca = dirv ? Math.abs(dirv.x * n.x + dirv.y * n.y + dirv.z * n.z) : 1;
    if (hard && ca < 0.3 && dirv) { this.hole(pt, n, tag, size * 1.4, dirv, { streak: true }); if (tag === 'metal') this.debris(pt.x, pt.y, pt.z, 0xffe090, 5, 6, n.x + dirv.x * 0.6, n.y + dirv.y * 0.6, n.z + dirv.z * 0.6); return; }
    if (tag === 'snow' || tag === 'sand' || tag === 'mud') { this.hole(pt, n, tag, size * (up ? 1.2 : 1), dirv, { big: k > 0.6 }); return; }
    this.hole(pt, n, tag, size, dirv, { big: k > 0.62 && !pel });
  };
})();
