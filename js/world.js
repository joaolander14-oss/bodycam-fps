// Mundo: terreno (heightfield), colisores (caixas/cilindros), raycast para tiros e visão dos bots.
(function () {
  const T = THREE, BC = window.BC;
  const CS = 8; // tamanho da célula do grid espacial

  // ---------- materiais ----------
  const texCache = {};
  // texturas fotográficas (CC0) para materiais de construção; o que não tiver foto usa a textura procedural
  const PHOTO = { concrete: 'concrete', brick: 'brick', plaster: 'plaster', wood: 'wood_planks', log: 'wood_dark', metal: 'container_metal', rust: 'metal_rust', sand: 'sand', adobe: 'plaster', rock: 'rock', sandbag: 'fabric', roof: 'roof_tiles' };
  const photoCache = {};
  BC.photo = function (file) {
    if (photoCache[file]) return photoCache[file];
    const t = new T.TextureLoader().load('tex/' + file + '.jpg'); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; photoCache[file] = t; return t;
  };
  BC.tex = function (name) {
    if (texCache[name]) return texCache[name];
    if (PHOTO[name]) { texCache[name] = BC.photo(PHOTO[name]); return texCache[name]; }
    let t;
    const sp = BC.speckle;
    switch (name) {
      case 'concrete': t = BC.canvasTex(128, (g, s) => { sp(g, s, '#b5b4b0', 70, 900, 1); g.strokeStyle = 'rgba(0,0,0,.12)'; g.strokeRect(0, 0, s, s); }); break;
      case 'brick': t = BC.canvasTex(128, (g, s) => {
        g.fillStyle = '#a2573a'; g.fillRect(0, 0, s, s); const r = BC.rng(3);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const o = (y % 2) * 16; g.fillStyle = `rgb(${150 + r() * 30},${70 + r() * 25},${50 + r() * 20})`; g.fillRect(x * 32 + o + 1, y * 16 + 1, 30, 14); }
      }); break;
      case 'plaster': t = BC.canvasTex(128, (g, s) => sp(g, s, '#c9c2b0', 50, 800, 4)); break;
      case 'wood': t = BC.canvasTex(128, (g, s) => {
        const r = BC.rng(8); for (let i = 0; i < 8; i++) { g.fillStyle = `rgb(${120 + r() * 30},${80 + r() * 20},${45 + r() * 15})`; g.fillRect(0, i * 16, s, 15); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, i * 16 + 15, s, 1); }
        sp(g, s, 'rgba(0,0,0,0)', 40, 300, 9);
      }); break;
      case 'log': t = BC.canvasTex(128, (g, s) => { const r = BC.rng(9); for (let i = 0; i < 8; i++) { g.fillStyle = `rgb(${95 + r() * 25},${62 + r() * 15},${34 + r() * 10})`; g.fillRect(0, i * 16, s, 14); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, i * 16 + 14, s, 2); } }); break;
      case 'metal': t = BC.canvasTex(128, (g, s) => { sp(g, s, '#6c7378', 40, 400, 2); for (let i = 0; i < s; i += 16) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(i, 0, 2, s); } }); break;
      case 'rust': t = BC.canvasTex(128, (g, s) => { sp(g, s, '#8a5a3c', 90, 900, 5); }); break;
      case 'sand': t = BC.canvasTex(128, (g, s) => sp(g, s, '#d9c08f', 40, 600, 6)); break;
      case 'adobe': t = BC.canvasTex(128, (g, s) => sp(g, s, '#bd9a6c', 55, 800, 12)); break;
      case 'rock': t = BC.canvasTex(128, (g, s) => sp(g, s, '#858683', 80, 900, 13)); break;
      case 'sandbag': t = BC.canvasTex(128, (g, s) => {
        const r = BC.rng(14); g.fillStyle = '#8a7c5c'; g.fillRect(0, 0, s, s);
        for (let y = 0; y < 6; y++) for (let x = 0; x < 3; x++) { const o = (y % 2) * 21; g.fillStyle = `rgb(${140 + r() * 25},${125 + r() * 25},${88 + r() * 20})`; g.fillRect(x * 43 + o, y * 21 + 1, 40, 19); }
      }); break;
      case 'windows': t = BC.canvasTex(128, (g, s) => {
        g.fillStyle = '#8f8f8c'; g.fillRect(0, 0, s, s); sp(g, s, 'rgba(0,0,0,0)', 40, 300, 15); const r = BC.rng(16);
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = r() < 0.5 ? '#1f2a33' : '#2b3640'; g.fillRect(x * 64 + 10, y * 64 + 12, 44, 40); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x * 64 + 8, y * 64 + 10, 48, 3); }
      }); break;
      case 'ground': t = BC.canvasTex(128, (g, s) => sp(g, s, '#e6e6e6', 60, 1400, 21)); break;
      case 'crate': t = BC.canvasTex(128, (g, s) => { g.fillStyle = '#5f6b3d'; g.fillRect(0, 0, s, s); g.strokeStyle = '#2f3820'; g.lineWidth = 6; g.strokeRect(5, 5, s - 10, s - 10); g.beginPath(); g.moveTo(5, 5); g.lineTo(s - 5, s - 5); g.stroke(); sp(g, s, 'rgba(0,0,0,0)', 40, 200, 22); }); break;
      case 'water': t = BC.canvasTex(128, (g, s) => sp(g, s, '#3a4a30', 40, 500, 23)); break;
      default: t = BC.canvasTex(64, (g, s) => sp(g, s, '#999', 40, 200, 1));
    }
    texCache[name] = t; return t;
  };
  const matCache = {};
  BC.mat = function (name, color) {
    const k = name + (color || '');
    if (!matCache[k]) matCache[k] = new T.MeshLambertMaterial({ map: BC.tex(name), color: color === undefined ? 0xffffff : color });
    return matCache[k];
  };
  // cor do material -> tag de superfície (para som/efeito de impacto)
  const TAGS = { concrete: 'concrete', brick: 'concrete', plaster: 'concrete', wood: 'wood', log: 'wood', metal: 'metal', rust: 'metal', sand: 'sand', adobe: 'sand', rock: 'rock', sandbag: 'sand', windows: 'concrete', crate: 'wood' };

  // caixa com UV em escala de mundo (textura repete a cada 'u' metros)
  function boxGeo(w, h, d, u) {
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / u, uv.getY(k) * dims[f][1] / u);
    }
    return g;
  }

  BC.World = function (half) {
    this.half = half || 110; this.play = 78;
    this.group = new T.Group();
    this.gw = Math.ceil(2 * this.half / CS) + 1; this.cells = [];
    for (let i = 0; i < this.gw * this.gw; i++) this.cells.push(null);
    this.boxes = []; this.cyls = []; this.stamp = 0; this.waterY = -999;
    this.surf = 'dirt'; this.hmax = 0; this.H = null; this.N = 0; this.crates = [];
    this.statics = []; // malhas estáticas
  };
  const W = BC.World.prototype;

  W.cellOf = function (x, z) { return [Math.floor((x + this.half) / CS), Math.floor((z + this.half) / CS)]; };
  W.insert = function (o, x0, z0, x1, z1) {
    const gw = this.gw, ix0 = BC.clamp(Math.floor((x0 + this.half) / CS), 0, gw - 1), ix1 = BC.clamp(Math.floor((x1 + this.half) / CS), 0, gw - 1);
    const iz0 = BC.clamp(Math.floor((z0 + this.half) / CS), 0, gw - 1), iz1 = BC.clamp(Math.floor((z1 + this.half) / CS), 0, gw - 1);
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) { const k = iz * gw + ix; (this.cells[k] || (this.cells[k] = [])).push(o); }
  };
  W.addBoxCol = function (x0, y0, z0, x1, y1, z1, tag) {
    const o = { k: 'b', x0, y0, z0, x1, y1, z1, tag: tag || 'concrete', stamp: 0 }; this.boxes.push(o); this.insert(o, x0, z0, x1, z1); return o;
  };
  W.addCylCol = function (x, z, r, y0, y1, tag) {
    const o = { k: 'c', x, z, r, y0, y1, tag: tag || 'wood', stamp: 0 }; this.cyls.push(o); this.insert(o, x - r, z - r, x + r, z + r); return o;
  };
  // caixa visível + colisor
  W.box = function (x0, y0, z0, x1, y1, z1, matName, opt) {
    opt = opt || {};
    const yo = this.yoff || 0; y0 += yo; y1 += yo;
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
    const m = new T.Mesh(boxGeo(w, h, d, opt.u || 2.5), opt.material || BC.mat(matName, opt.color));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = opt.shadow !== false; m.receiveShadow = true;
    this.group.add(m);
    if (opt.col !== false) this.addBoxCol(x0, y0, z0, x1, y1, z1, opt.tag || TAGS[matName] || 'concrete');
    return m;
  };
  // cilindro visível + colisor
  W.cyl = function (x, z, r, y0, y1, matName, opt) {
    opt = opt || {};
    const m = new T.Mesh(new T.CylinderGeometry(r, r, y1 - y0, 10), BC.mat(matName, opt.color));
    m.position.set(x, (y0 + y1) / 2, z); m.castShadow = true; m.receiveShadow = true; this.group.add(m);
    if (opt.col !== false) this.addCylCol(x, z, r, y0, y1, opt.tag || TAGS[matName] || 'metal');
    return m;
  };
  // muitas instâncias de uma geometria (árvores, pedras...) — inst: {x,y,z,ry,s,sx,sy,sz,c}
  W.instanced = function (geo, mat, list, shadow) {
    if (!list.length) return null;
    const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color();
    list.forEach((o, i) => {
      e.set(o.rx || 0, o.ry || 0, o.rz || 0); q.setFromEuler(e);
      const s = o.s || 1;
      m4.compose(new T.Vector3(o.x, o.y, o.z), q, new T.Vector3((o.sx || 1) * s, (o.sy || 1) * s, (o.sz || 1) * s));
      im.setMatrixAt(i, m4);
      if (o.c !== undefined) { c.set(o.c); im.setColorAt(i, c); }
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false; im.castShadow = shadow !== false; im.receiveShadow = true;
    this.group.add(im); return im;
  };

  // ---------- terreno ----------
  W.makeTerrain = function (hf, cf, surf) {
    const half = this.half, N = Math.round(2 * half / 1.2); this.N = N; this.cell = 2 * half / N; this.surf = surf || 'dirt';
    const geo = new T.PlaneGeometry(2 * half, 2 * half, N, N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, H = new Float32Array((N + 1) * (N + 1));
    const col = new Float32Array(pos.count * 3);
    let hmax = -1e9;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const k = j * (N + 1) + i, x = -half + i * this.cell, z = -half + j * this.cell;
      const h = hf(x, z); H[k] = h; pos.setY(k, h); if (h > hmax) hmax = h;
    }
    this.H = H; this.hmax = hmax;
    const c = [0, 0, 0];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const k = j * (N + 1) + i, x = -half + i * this.cell, z = -half + j * this.cell;
      const hx = H[j * (N + 1) + Math.min(N, i + 1)] - H[j * (N + 1) + Math.max(0, i - 1)], hz = H[Math.min(N, j + 1) * (N + 1) + i] - H[Math.max(0, j - 1) * (N + 1) + i];
      const slope = Math.sqrt(hx * hx + hz * hz) / (2 * this.cell);
      cf(x, z, H[k], slope, c); col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 70 * (half / 110), uv.getY(i) * 70 * (half / 110));
    geo.computeVertexNormals();
    // textura do terreno: foto principal no plano + foto secundária nas encostas e em manchas
    const TS = { snow: ['snow', 'rock'], grass: ['grass2', 'dirt'], mud: ['mud', 'dirt2'], concrete: ['concrete_rough', 'gravel'], sand: ['sand', 'rock'], rock: ['rock', 'gravel'], dirt: ['dirt', 'rock'] };
    const TM = { forest: ['grass2', 'leaves'], jungle: ['moss', 'dirt'], swamp: ['mud', 'moss'], trench: ['mud', 'dirt2'], village: ['grass_dry', 'dirt'], farm: ['grass2', 'grass_dry'], canyon: ['dirt2', 'rock_red'], volcano: ['ash', 'ash2'], oilfield: ['dirt2', 'gravel'], pit: ['gravel2', 'rock'], harbor: ['asphalt', 'gravel'], castle: ['grass2', 'rock'], ruins: ['moss', 'rock2'], mountain: ['rock', 'snow2'], desert: ['sand', 'rock_red'], coast: ['sand', 'grass2'], airbase: ['concrete_rough', 'grass_dry'], industrial: ['concrete_rough', 'gravel2'], city: ['asphalt', 'concrete_rough'], snow: ['snow', 'snow2'] };
    const pair = TM[this.mapId] || TS[this.surf] || TS.dirt, tA = BC.photo(pair[0]), tB = BC.photo(pair[1]), mixv = new Float32Array(pos.count);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const k = j * (N + 1) + i, x = -half + i * this.cell, z = -half + j * this.cell;
      const hx = H[j * (N + 1) + Math.min(N, i + 1)] - H[j * (N + 1) + Math.max(0, i - 1)], hz = H[Math.min(N, j + 1) * (N + 1) + i] - H[Math.max(0, j - 1) * (N + 1) + i], sl = Math.sqrt(hx * hx + hz * hz) / (2 * this.cell);
      let m = BC.smooth(0.28, 0.62, sl) + 0.55 * (BC.fbm(x * 0.035, z * 0.035, 17) - 0.45) * 1.6; mixv[k] = Math.min(1, Math.max(0, m));
      // a cor por vértice só dá um tom leve por cima da foto
      for (let q = 0; q < 3; q++) col[k * 3 + q] = 1 + (col[k * 3 + q] - 1) * 0.6;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setAttribute('mixv', new T.BufferAttribute(mixv, 1));
    const tmat = new T.MeshLambertMaterial({ vertexColors: true, map: tA });
    tmat.onBeforeCompile = (sh) => {
      sh.uniforms.map2 = { value: tB };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float mixv; varying float vMix;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMix = mixv;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D map2; varying float vMix;').replace('#include <map_fragment>',
        '#ifdef USE_MAP\n vec4 ta = mix(texture2D(map, vUv), texture2D(map, vUv * 0.137 + 0.5), 0.38); vec4 tb = mix(texture2D(map2, vUv * 0.8 + 0.31), texture2D(map2, vUv * 0.113), 0.38); diffuseColor *= mix(ta, tb, vMix);\n#endif');
    };
    const mesh = new T.Mesh(geo, tmat);
    mesh.receiveShadow = true; this.group.add(mesh); this.terrain = mesh;
  };
  W.heightAt = function (x, z) {
    const N = this.N, f = (x + this.half) / this.cell, g = (z + this.half) / this.cell;
    let i = Math.floor(f), j = Math.floor(g);
    if (i < 0) i = 0; else if (i > N - 1) i = N - 1; if (j < 0) j = 0; else if (j > N - 1) j = N - 1;
    let fx = f - i, fz = g - j; fx = fx < 0 ? 0 : fx > 1 ? 1 : fx; fz = fz < 0 ? 0 : fz > 1 ? 1 : fz;
    const H = this.H, k = j * (N + 1) + i;
    const a = H[k], b = H[k + 1], c = H[k + N + 1], d = H[k + N + 2];
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  };
  // altura do chão para um ator em (x,z) com pés em feetY: terreno ou topo de caixa baixa (degrau)
  W.groundAt = function (x, z, feetY, step) {
    let h = this.heightAt(x, z); this._gBox = false; this._gTag = null;
    const c = this.cells[Math.floor((z + this.half) / CS) * this.gw + Math.floor((x + this.half) / CS)];
    if (c) for (const o of c) {
      if (o.k === 'b' && x > o.x0 - 0.05 && x < o.x1 + 0.05 && z > o.z0 - 0.05 && z < o.z1 + 0.05 && o.y1 <= feetY + step && o.y1 > h) { h = o.y1; this._gBox = true; this._gTag = o.tag; }
    }
    return h;
  };
  // o centro do ator está dentro de um colisor sólido (rocha, parede, prédio…)?
  W.embedded = function (a) {
    const c = this.cells[Math.floor((a.z + this.half) / CS) * this.gw + Math.floor((a.x + this.half) / CS)]; if (!c) return false;
    const th = this.heightAt(a.x, a.z), ya = Math.max(a.y, th - 0.5), y0 = ya + 0.25, y1 = ya + (a.h || 1.7) - 0.1;
    for (const o of c) {
      if (o.y1 <= y0 || o.y0 >= y1) continue;
      if (o.k === 'b') { if (a.x > o.x0 + 0.05 && a.x < o.x1 - 0.05 && a.z > o.z0 + 0.05 && a.z < o.z1 - 0.05) return true; }
      else { const dx = a.x - o.x, dz = a.z - o.z; if (dx * dx + dz * dz < o.r * o.r * 0.7) return true; }
    }
    return false;
  };
  // tira um ator que ficou preso dentro de um colisor: leva ao ponto livre mais próximo
  W.unstick = function (a) {
    for (let r = 0.6; r <= 7; r += 0.6) for (let k = 0; k < 20; k++) {
      const ang = k * 0.31416 + r, x = a.x + Math.cos(ang) * r, z = a.z + Math.sin(ang) * r;
      const th = this.heightAt(x, z); if (this.isFree(x, z, a.r + 0.05) && !this.embedded({ x, z, y: th, h: a.h, r: a.r })) { a.x = x; a.z = z; a.y = Math.max(th, this.groundAt(x, z, th + 0.3, 0.6)); a.vx = a.vz = 0; a.vy = 0; a.onGround = true; return true; }
    }
    return false;
  };
  // empurra um círculo (raio r) para fora dos colisores. Retorna true se tocou algo.
  W.pushOut = function (p, r, feetY, hgt, step) {
    let hit = false;
    for (let it = 0; it < 2; it++) {
      const ix0 = BC.clamp(Math.floor((p.x - r + this.half) / CS), 0, this.gw - 1), ix1 = BC.clamp(Math.floor((p.x + r + this.half) / CS), 0, this.gw - 1);
      const iz0 = BC.clamp(Math.floor((p.z - r + this.half) / CS), 0, this.gw - 1), iz1 = BC.clamp(Math.floor((p.z + r + this.half) / CS), 0, this.gw - 1);
      for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
        const cell = this.cells[iz * this.gw + ix]; if (!cell) continue;
        for (const o of cell) {
          if (o.k === 'b') {
            if (o.y1 <= feetY + step || o.y0 >= feetY + hgt) continue;
            const cx = BC.clamp(p.x, o.x0, o.x1), cz = BC.clamp(p.z, o.z0, o.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
            if (d2 < r * r) {
              hit = true;
              if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
              else { // centro dentro da caixa: sai pelo lado mais próximo
                const l = p.x - o.x0, rr = o.x1 - p.x, t = p.z - o.z0, bb = o.z1 - p.z, m = Math.min(l, rr, t, bb);
                if (m === l) p.x = o.x0 - r; else if (m === rr) p.x = o.x1 + r; else if (m === t) p.z = o.z0 - r; else p.z = o.z1 + r;
              }
            }
          } else {
            if (o.y1 <= feetY + 0.12 || o.y0 >= feetY + hgt) continue; // cilindros (pedras, troncos) não são degraus
            const dx = p.x - o.x, dz = p.z - o.z, rr = o.r + r, d2 = dx * dx + dz * dz;
            if (d2 < rr * rr) { hit = true; const d = Math.sqrt(d2) || 1e-4, k = (rr - d) / d; p.x = o.x + dx * k; p.z = o.z + dz * k; }
          }
        }
      }
    }
    return hit;
  };

  // ---------- raycast ----------
  function rayBox(ox, oy, oz, dx, dy, dz, o, maxT, out) {
    let tmin = 0, tmax = maxT, nx = 0, ny = 0, nz = 0;
    // x
    if (Math.abs(dx) < 1e-9) { if (ox < o.x0 || ox > o.x1) return -1; }
    else { let t1 = (o.x0 - ox) / dx, t2 = (o.x1 - ox) / dx, s = -1; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; } if (t1 > tmin) { tmin = t1; nx = s; ny = 0; nz = 0; } if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
    if (Math.abs(dy) < 1e-9) { if (oy < o.y0 || oy > o.y1) return -1; }
    else { let t1 = (o.y0 - oy) / dy, t2 = (o.y1 - oy) / dy, s = -1; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; } if (t1 > tmin) { tmin = t1; nx = 0; ny = s; nz = 0; } if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
    if (Math.abs(dz) < 1e-9) { if (oz < o.z0 || oz > o.z1) return -1; }
    else { let t1 = (o.z0 - oz) / dz, t2 = (o.z1 - oz) / dz, s = -1; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; } if (t1 > tmin) { tmin = t1; nx = 0; ny = 0; nz = s; } if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
    if (tmin <= 0) return -1; // origem dentro da caixa: ignora
    out.nx = nx; out.ny = ny; out.nz = nz; return tmin;
  }
  // cilindro vertical (com tampas): intervalo no círculo ∩ intervalo em y
  BC.rayCyl = function (ox, oy, oz, dx, dy, dz, cx, cz, r, y0, y1, maxT) {
    const a = dx * dx + dz * dz; let ta = 0, tb = maxT;
    const fx = ox - cx, fz = oz - cz;
    if (a < 1e-12) { if (fx * fx + fz * fz > r * r) return -1; }
    else {
      const b = fx * dx + fz * dz, c = fx * fx + fz * fz - r * r, disc = b * b - a * c;
      if (disc < 0) return -1; const s = Math.sqrt(disc); ta = (-b - s) / a; tb = (-b + s) / a;
    }
    let ty0 = -1e9, ty1 = 1e9;
    if (Math.abs(dy) < 1e-9) { if (oy < y0 || oy > y1) return -1; }
    else { ty0 = (y0 - oy) / dy; ty1 = (y1 - oy) / dy; if (ty0 > ty1) { const t = ty0; ty0 = ty1; ty1 = t; } }
    const t0 = Math.max(ta, ty0), t1 = Math.min(tb, ty1, maxT);
    if (t0 > t1 || t1 < 0) return -1;
    return t0 > 0 ? t0 : -1;
  };
  BC.raySphere = function (ox, oy, oz, dx, dy, dz, cx, cy, cz, r, maxT) {
    const fx = ox - cx, fy = oy - cy, fz = oz - cz, b = fx * dx + fy * dy + fz * dz, c = fx * fx + fy * fy + fz * fz - r * r, disc = b * b - c;
    if (disc < 0) return -1; const t = -b - Math.sqrt(disc); return t > 0 && t < maxT ? t : -1;
  };

  const _hit = { t: 0, nx: 0, ny: 1, nz: 0, tag: '', kind: '' }, _o = { nx: 0, ny: 0, nz: 0 };
  // Retorna objeto reutilizado {t,nx,ny,nz,tag,kind} ou null. Nunca acerta quem atira (não há colisor do jogador aqui).
  W.raycast = function (ox, oy, oz, dx, dy, dz, maxT) {
    let best = maxT, found = false;
    const cs = CS, half = this.half, gw = this.gw;
    const x = ox + half, z = oz + half; let ix = Math.floor(x / cs), iz = Math.floor(z / cs);
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tDx = dx !== 0 ? Math.abs(cs / dx) : Infinity, tDz = dz !== 0 ? Math.abs(cs / dz) : Infinity;
    let tMx = dx > 0 ? ((ix + 1) * cs - x) / dx : dx < 0 ? (ix * cs - x) / dx : Infinity;
    let tMz = dz > 0 ? ((iz + 1) * cs - z) / dz : dz < 0 ? (iz * cs - z) / dz : Infinity;
    const stamp = ++this.stamp;
    for (let guard = 0; guard < 80; guard++) {
      if (ix >= 0 && ix < gw && iz >= 0 && iz < gw) {
        const cell = this.cells[iz * gw + ix];
        if (cell) for (const o of cell) {
          if (o.stamp === stamp) continue; o.stamp = stamp;
          let t;
          if (o.k === 'b') t = rayBox(ox, oy, oz, dx, dy, dz, o, best, _o);
          else t = BC.rayCyl(ox, oy, oz, dx, dy, dz, o.x, o.z, o.r, o.y0, o.y1, best);
          if (t > 0 && t < best) {
            best = t; found = true; _hit.tag = o.tag; _hit.kind = o.k;
            if (o.k === 'b') { _hit.nx = _o.nx; _hit.ny = _o.ny; _hit.nz = _o.nz; }
            else { const px = ox + dx * t - o.x, pz = oz + dz * t - o.z, l = Math.hypot(px, pz) || 1; _hit.nx = px / l; _hit.ny = 0; _hit.nz = pz / l; }
          }
        }
      }
      const tn = Math.min(tMx, tMz); if (tn > best) break;
      if (tMx < tMz) { ix += sx; tMx += tDx; } else { iz += sz; tMz += tDz; }
      if (ix < 0 || ix >= gw || iz < 0 || iz >= gw) break;
    }
    // terreno: marcha com passo adaptativo
    if (this.H && !(oy > this.hmax && dy >= 0)) {
      let t = 0, prevT = 0;
      while (t < best) {
        const py = oy + dy * t, px = ox + dx * t, pz = oz + dz * t;
        if (py > this.hmax) { if (dy >= 0) break; t += Math.max(0.3, (py - this.hmax) / -dy); prevT = t; continue; }
        const h = this.heightAt(px, pz);
        if (py < h) {
          let lo = prevT, hi = t;
          for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; if (oy + dy * m < this.heightAt(ox + dx * m, oz + dz * m)) hi = m; else lo = m; }
          if (hi < best && hi > 0) {
            best = hi; found = true; const hx = ox + dx * hi, hz = oz + dz * hi, e = 0.5;
            const gx = this.heightAt(hx - e, hz) - this.heightAt(hx + e, hz), gz = this.heightAt(hx, hz - e) - this.heightAt(hx, hz + e), l = Math.hypot(gx, 2 * e, gz);
            _hit.nx = gx / l; _hit.ny = 2 * e / l; _hit.nz = gz / l; _hit.kind = 't';
            _hit.tag = (oy + dy * hi < this.waterY) ? 'water' : this.surf;
          }
          break;
        }
        prevT = t; t += Math.max(0.35, Math.min(2.0, (py - h) * 0.7));
      }
    }
    if (!found) return null;
    _hit.t = best; return _hit;
  };
  // visão livre entre dois pontos?
  W.los = function (ax, ay, az, bx, by, bz) {
    if (this.smokes && this.smokes.length) {
      const abx = bx - ax, aby = by - ay, abz = bz - az, l2 = abx * abx + aby * aby + abz * abz;
      for (const sm of this.smokes) {
        if (sm.r < 1.2) continue; let t = l2 ? ((sm.x - ax) * abx + (sm.y - ay) * aby + (sm.z - az) * abz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + abx * t - sm.x, py = ay + aby * t - sm.y, pz = az + abz * t - sm.z, rr = sm.r * 0.8; if (px * px + py * py + pz * pz < rr * rr) return false;
      }
    }
    const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz); if (d < 0.01) return true;
    return !this.raycast(ax, ay, az, dx / d, dy / d, dz / d, d - 0.15);
  };
  // lugar livre (sem colisor e sem água) para spawn / waypoint
  W.isFree = function (x, z, r) {
    if (Math.abs(x) > this.play || Math.abs(z) > this.play) return false;
    const h = this.heightAt(x, z); if (h < this.waterY + 0.1) return false;
    const p = { x, z }; const hg = this.groundAt(x, z, h, 0.5);
    const tmp = { x, z }; this.pushOut(tmp, r, h, 1.8, 0.5);
    if (Math.abs(tmp.x - x) > 0.02 || Math.abs(tmp.z - z) > 0.02) return false;
    // inclinação
    return Math.abs(this.heightAt(x + 1.2, z) - h) < 0.9 && Math.abs(this.heightAt(x, z + 1.2) - h) < 0.9;
  };
  W.randomFree = function (rng, x0, x1, z0, z1, r) {
    for (let i = 0; i < 60; i++) { const x = x0 + (x1 - x0) * rng(), z = z0 + (z1 - z0) * rng(); if (this.isFree(x, z, r || 0.6)) return { x, z }; }
    return { x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
  };

  // parede axis-aligned com aberturas: ops = [{a,b,yb,yt}] ao longo do comprimento
  W.wall = function (x0, z0, x1, z1, t, h, ops, matName, opt) {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), s0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
    const base = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
    const seg = (a, b, ya, yb) => {
      if (b - a < 0.02 || yb - ya < 0.02) return;
      if (alongX) this.box(s0 + a, ya, base - t / 2, s0 + b, yb, base + t / 2, matName, opt);
      else this.box(base - t / 2, ya, s0 + a, base + t / 2, yb, s0 + b, matName, opt);
    };
    let cur = 0; ops = (ops || []).slice().sort((p, q) => p.a - q.a);
    for (const o of ops) { seg(cur, o.a, 0, h); if (o.yb > 0) seg(o.a, o.b, 0, o.yb); if (o.yt < h) seg(o.a, o.b, o.yt, h); cur = o.b; }
    seg(cur, L, 0, h);
  };

  // une as caixas estáticas de mesmo material em blocos de 64 m (poucos draw calls, mantém culling)
  W.finalize = function () {
    const groups = new Map(), rm = [];
    for (const m of this.group.children) {
      if (!m.isMesh || m.isInstancedMesh || m === this.terrain || m === this.water || !m.geometry || !m.geometry.attributes.uv || Array.isArray(m.material)) continue;
      m.updateMatrix(); const key = m.material.uuid + (m.castShadow ? 's' : 'n') + Math.floor(m.position.x / 64) + ',' + Math.floor(m.position.z / 64);
      let g = groups.get(key); if (!g) { g = { mat: m.material, shadow: m.castShadow, list: [] }; groups.set(key, g); } g.list.push(m); rm.push(m);
    }
    const v = new T.Vector3(), n = new T.Vector3(), nm = new T.Matrix3();
    for (const g of groups.values()) {
      const pos = [], nor = [], uv = [], idx = []; let off = 0;
      for (const m of g.list) {
        const geo = m.geometry, p = geo.attributes.position, nn = geo.attributes.normal, u = geo.attributes.uv; nm.getNormalMatrix(m.matrix);
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrix); pos.push(v.x, v.y, v.z); n.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize(); nor.push(n.x, n.y, n.z); uv.push(u.getX(i), u.getY(i)); }
        if (geo.index) for (let i = 0; i < geo.index.count; i++) idx.push(geo.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off);
        off += p.count;
      }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeBoundingSphere();
      const mesh = new T.Mesh(geo, g.mat); mesh.castShadow = g.shadow; mesh.receiveShadow = true; this.group.add(mesh);
    }
    for (const m of rm) { this.group.remove(m); m.geometry.dispose(); }
  };
  W.dispose = function () {
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  };
})();
