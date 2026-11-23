// Utilidades gerais + fusão de geometrias (peças de arma / personagem)
(function () {
  const T = THREE;
  const BC = window.BC = window.BC || {};
  BC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  BC.lerp = (a, b, t) => a + (b - a) * t;
  BC.smooth = (a, b, x) => { const t = BC.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  BC.rad = (d) => d * Math.PI / 180;
  BC.deg = (r) => r * 180 / Math.PI;
  BC.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return ((s >>> 8) & 0xffffff) / 16777216; };
  };
  function hash(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  BC.vnoise = function (x, y, s) {
    s = s || 0;
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  BC.fbm = function (x, y, s, oct) {
    oct = oct || 4; let a = 0.5, f = 1, t = 0, n = 0;
    for (let i = 0; i < oct; i++) { t += a * BC.vnoise(x * f, y * f, (s || 0) + i * 17); n += a; a *= 0.5; f *= 2; }
    return t / n;
  };

  // ---------- fusão de geometrias com cor por vértice ----------
  const UB = new T.BoxGeometry(1, 1, 1), UC = new T.CylinderGeometry(1, 1, 1, 14, 1),
    UK = new T.ConeGeometry(1, 1, 8, 1), US = new T.SphereGeometry(1, 8, 6);
  const RX90 = new T.Matrix4().makeRotationX(Math.PI / 2);
  const _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3(), _one = new T.Vector3(1, 1, 1);
  function quatFrom(rot) { if (rot) { _e.set(rot[0], rot[1], rot[2], 'XYZ'); _q.setFromEuler(_e); } else _q.identity(); return _q; }
  BC.pbox = (w, h, d, x, y, z, c, rot) => ({ geo: UB, c, m: new T.Matrix4().compose(_p.set(x, y, z), quatFrom(rot), _s.set(w, h, d)) });
  BC.pcyl = (r, len, x, y, z, c, rot) => ({
    geo: UC, c,
    m: new T.Matrix4().compose(_p.set(x, y, z), quatFrom(rot), _one).multiply(RX90).multiply(new T.Matrix4().makeScale(r, len, r))
  });
  BC.pcyly = (r, h, x, y, z, c, r2) => ({ geo: UC, c, m: new T.Matrix4().compose(_p.set(x, y, z), _q.identity(), _s.set(r, h, r)) });
  BC.pcone = (r, h, x, y, z, c) => ({ geo: UK, c, m: new T.Matrix4().compose(_p.set(x, y, z), _q.identity(), _s.set(r, h, r)) });
  BC.psph = (r, x, y, z, c, sy) => ({ geo: US, c, m: new T.Matrix4().compose(_p.set(x, y, z), _q.identity(), _s.set(r, r * (sy || 1), r)) });
  const _a = new T.Vector3(), _b = new T.Vector3(), _z = new T.Vector3(0, 0, 1);
  BC.plimb = (ax, ay, az, bx, by, bz, w, c, w2) => {
    _a.set(ax, ay, az); _b.set(bx, by, bz);
    const dir = _b.clone().sub(_a), len = dir.length(); dir.normalize();
    const q = new T.Quaternion().setFromUnitVectors(_z, dir);
    return { geo: UB, c, m: new T.Matrix4().compose(_a.clone().add(_b).multiplyScalar(0.5), q, new T.Vector3(w, w2 || w, len)) };
  };
  BC.mergeGeoms = function (items) {
    const pos = [], nor = [], uv = [], col = [], idx = [];
    let off = 0; const nm = new T.Matrix3(), v = new T.Vector3(), n = new T.Vector3(), color = new T.Color();
    for (const it of items) {
      const g = it.geo, p = g.attributes.position, nn = g.attributes.normal, u = g.attributes.uv;
      nm.getNormalMatrix(it.m); color.set(it.c);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(it.m); pos.push(v.x, v.y, v.z);
        n.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize(); nor.push(n.x, n.y, n.z);
        uv.push(u.getX(i), u.getY(i)); col.push(color.r, color.g, color.b);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
      else for (let i = 0; i < p.count; i++) idx.push(i + off);
      off += p.count;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  };

  // ---------- texturas procedurais ----------
  BC.canvasTex = function (size, draw, repeat) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new T.CanvasTexture(c);
    if (repeat !== false) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    t.anisotropy = 4;
    return t;
  };
  BC.speckle = function (g, s, base, amt, n, seed) {
    const r = BC.rng(seed || 7);
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) {
      const v = Math.floor((r() - 0.5) * amt);
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`;
      g.fillRect(r() * s, r() * s, 1 + r() * 4, 1 + r() * 4);
    }
  };
})();
