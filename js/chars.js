// Bandeiras, camuflagens e soldados (2 skins: cada uma com a bandeira do país na farda).
(function () {
  const T = THREE, BC = window.BC;

  BC.drawFlag = function (code, w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    if (code === 'BR') {
      g.fillStyle = '#009c3b'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffdf00'; g.beginPath();
      g.moveTo(w * 0.5, h * 0.09); g.lineTo(w * 0.93, h * 0.5); g.lineTo(w * 0.5, h * 0.91); g.lineTo(w * 0.07, h * 0.5); g.closePath(); g.fill();
      g.fillStyle = '#002776'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.27, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.arc(w / 2, h / 2, h * 0.27, 0, Math.PI * 2); g.clip();
      g.strokeStyle = '#fff'; g.lineWidth = h * 0.06; g.beginPath(); g.arc(w / 2, h * 0.98, h * 0.5, Math.PI * 1.18, Math.PI * 1.82); g.stroke();
      g.restore();
    } else if (code === 'US') {
      const sh = h / 13;
      for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#b22234'; g.fillRect(0, i * sh, w, sh + 1); }
      g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.42, sh * 7);
      g.fillStyle = '#fff';
      for (let r = 0; r < 5; r++) for (let q = 0; q < 6 - (r % 2); q++) {
        const x = w * 0.42 * ((q + (r % 2 ? 1 : 0.5)) / 6), y = sh * 7 * ((r + 0.5) / 5);
        g.fillRect(x - w * 0.012, y - w * 0.012, w * 0.024, w * 0.024);
      }
    }
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(2, h * 0.05); g.strokeRect(0, 0, w, h);
    return cv;
  };

  function camoCanvas(kind) {
    if (BC.camoCanvasExt) return BC.camoCanvasExt(kind);
    const s = 128, cv = document.createElement('canvas'); cv.width = cv.height = s;
    const g = cv.getContext('2d'), r = BC.rng(kind === 'ocp' ? 11 : 5);
    if (kind === 'pixelgreen') { // pixelado (EB Verde)
      const cols = ['#44552a', '#2b3a1c', '#6a6a3a', '#3a2c1a'];
      g.fillStyle = '#4b5d2c'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 130; i++) {
        g.fillStyle = cols[(r() * cols.length) | 0];
        const w = (1 + ((r() * 3) | 0)) * 8, h = (1 + ((r() * 2) | 0)) * 8;
        g.fillRect(((r() * 16) | 0) * 8, ((r() * 16) | 0) * 8, w, h);
      }
    } else { // OCP / multicam
      const cols = ['#7d8560', '#8c7a5a', '#5b4a35', '#b5a583', '#6a7350'];
      g.fillStyle = '#a89a78'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 70; i++) {
        g.fillStyle = cols[(r() * cols.length) | 0] + 'cc';
        g.beginPath(); g.ellipse(r() * s, r() * s, 5 + r() * 13, 3 + r() * 8, r() * 3, 0, 7); g.fill();
      }
    }
    return cv;
  }

  const teamMats = {};
  BC.teamMats = function (team) {
    if (teamMats[team.id]) return teamMats[team.id];
    const ct = new T.CanvasTexture(camoCanvas(team.camo));
    ct.wrapS = ct.wrapT = T.RepeatWrapping;
    if (team.camo === 'pixelgreen' || team.camo === 'mm14') { ct.magFilter = T.NearestFilter; }
    const ft = new T.CanvasTexture(BC.drawFlag(team.flag, 128, 86)); ft.anisotropy = 4;
    const o = {
      camo: new T.MeshLambertMaterial({ map: ct }),
      gear: new T.MeshLambertMaterial({ vertexColors: true }),
      flag: new T.MeshLambertMaterial({ map: ft, side: T.DoubleSide }),
      flagTex: ft
    };
    teamMats[team.id] = o; return o;
  };

  const PV = 1.0; // pivô do tronco (altura do quadril)
  const flagGeo = new T.PlaneGeometry(1, 0.68);
  BC.CHAR_H = 1.78;
  const _Y = new T.Vector3(0, 1, 0), _q2 = new T.Quaternion(), _e2 = new T.Euler();
  const one = new T.Vector3(1, 1, 1);
  // formas orgânicas (cilindros afilados, elipsoides) em vez de caixas
  const G3 = (geo, x, y, z, c, sx, sy, sz, rx, ry, rz) => ({ geo, c, m: new T.Matrix4().compose(new T.Vector3(x, y, z), _q2.setFromEuler(_e2.set(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx || 1, sy || 1, sz || 1)) });
  const SPH = new T.SphereGeometry(1, 14, 10), HEMI = new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), BOX = new T.BoxGeometry(1, 1, 1);
  const tcache = {};
  const taper = (rt, rb, h) => { const k = rt + '_' + rb + '_' + h; return tcache[k] || (tcache[k] = new T.CylinderGeometry(rt, rb, h, 12, 1)); };
  // membro afilado de A até B (raio ra em A, rb em B)
  const limbC = (ax, ay, az, bx, by, bz, ra, rb, c, sz) => {
    const a = new T.Vector3(ax, ay, az), b = new T.Vector3(bx, by, bz), d = b.clone().sub(a), len = d.length();
    const q = new T.Quaternion().setFromUnitVectors(_Y, d.normalize());
    return { geo: taper(rb, ra, len), c, m: new T.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new T.Vector3(1, 1, sz || 1)) };
  };
  const bx = (w, h, d, x, y, z, c, rx, ry, rz) => G3(BOX, x, y, z, c, w, h, d, rx, ry, rz);
  const eli = (rx, ry, rz, x, y, z, c) => G3(SPH, x, y, z, c, rx, ry, rz);

  const SKINS = [0xc79a76, 0xd5a982, 0xb98562, 0xe0b894, 0x9c6b48, 0x7a5236, 0x5e3b25];
  const faceCache = {};
  // rosto texturizado: tom de pele, óculos, barba, pintura facial ou balaclava
  BC.faceTex = function (skinHex, o) {
    o = o || {}; const key = skinHex + '|' + (o.glasses ? 1 : 0) + (o.beard ? 1 : 0) + (o.paint ? 1 : 0) + (o.mask ? 1 : 0); if (faceCache[key]) return faceCache[key];
    const sk = '#' + new T.Color(skinHex).getHexString();
    const tex = BC.canvasTex(256, (g, s) => {
      const r = BC.rng(skinHex & 0xffff), fx = 192;
      g.fillStyle = o.mask ? '#17181a' : sk; g.fillRect(0, 0, s, s);
      if (o.mask) { g.fillStyle = sk; g.fillRect(fx - 40, 94, 80, 24); g.fillStyle = '#111'; g.fillRect(fx - 40, 94, 80, 4); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * s, r() * s, 2, 2); } g.fillStyle = '#fff'; g.fillRect(fx - 26, 104, 8, 4); g.fillRect(fx + 18, 104, 8, 4); g.fillStyle = '#000'; g.fillRect(fx - 24, 104, 4, 4); g.fillRect(fx + 20, 104, 4, 4); return; }
      g.fillStyle = 'rgba(40,20,10,.35)'; g.fillRect(0, 0, s, 70); g.fillStyle = 'rgba(60,30,15,.18)'; g.fillRect(0, 190, s, 66);
      g.fillStyle = 'rgba(70,35,20,.28)'; g.beginPath(); g.ellipse(fx, 150, 7, 22, 0, 0, 7); g.fill();
      if (o.glasses !== false) { g.fillStyle = '#111'; g.fillRect(fx - 38, 96, 76, 20); g.fillStyle = 'rgba(160,190,210,.55)'; g.fillRect(fx - 34, 98, 20, 5); g.fillRect(fx + 8, 98, 20, 5); g.fillStyle = '#c93'; g.fillRect(fx - 38, 108, 76, 2); }
      else { g.fillStyle = '#fff'; g.fillRect(fx - 28, 104, 14, 6); g.fillRect(fx + 14, 104, 14, 6); g.fillStyle = '#3a2a1a'; g.fillRect(fx - 24, 104, 6, 6); g.fillRect(fx + 18, 104, 6, 6); g.fillStyle = 'rgba(30,18,10,.85)'; g.fillRect(fx - 32, 94, 24, 4); g.fillRect(fx + 8, 94, 24, 4); }
      g.fillStyle = 'rgba(40,15,10,.8)'; g.fillRect(fx - 12, 178, 24, 3);
      if (o.paint) { g.fillStyle = 'rgba(20,40,15,.8)'; for (let i = 0; i < 5; i++) { g.save(); g.translate(fx - 40 + i * 20, 130); g.rotate(0.5 + r() * 0.3); g.fillRect(0, 0, 8, 54); g.restore(); } }
      if (o.beard) { g.fillStyle = 'rgba(28,18,12,.92)'; g.beginPath(); g.ellipse(fx, 190, 36, 30, 0, 0, 3.15); g.fill(); g.fillRect(fx - 30, 150, 60, 24); g.fillStyle = sk; g.fillRect(fx - 14, 176, 28, 4); }
      else for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(20,10,5,${r() * 0.12})`; g.fillRect(fx - 32 + r() * 64, 160 + r() * 55, 1.2, 1.2); }
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,230,200' : '60,30,20'},${r() * 0.08})`; g.fillRect(r() * s, r() * s, 2, 2); }
    }, false);
    return (faceCache[key] = tex);
  };
  const solidCache = {};
  const solid = (hex) => solidCache[hex] || (solidCache[hex] = new T.MeshLambertMaterial({ color: hex }));
  const crossTex = BC.canvasTex(64, (g, s) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, s, s); g.fillStyle = '#c4161c'; g.fillRect(s * 0.4, s * 0.12, s * 0.2, s * 0.76); g.fillRect(s * 0.12, s * 0.4, s * 0.76, s * 0.2); }, false);
  const crossMat = new T.MeshLambertMaterial({ map: crossTex, side: T.DoubleSide });
  const rankTex = BC.canvasTex(64, (g, s) => { g.fillStyle = '#1b1d18'; g.fillRect(0, 0, s, s); g.strokeStyle = '#d9b84a'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(10, 22 + i * 14); g.lineTo(32, 10 + i * 14); g.lineTo(54, 22 + i * 14); g.stroke(); } }, false);
  const rankMat = new T.MeshLambertMaterial({ map: rankTex, side: T.DoubleSide });

  // Soldado: pernas articuladas, colete (4 tipos), mochila (5 tipos), 8 tipos de cobertura de cabeça, rosto e extras por agente
  BC.makeChar = function (team, gunId, agentIdx) {
    const A = BC.AGENTS[(agentIdx || 0) % BC.AGENTS.length], mats = BC.teamMats(team), bg = BC.botGun(gunId), G = bg.G;
    const skinHex = SKINS[A.skin % SKINS.length], fk = [A.glasses, A.beard, A.paint, A.head === 'balaclava'].join();
    mats.faces = mats.faces || {}; if (!mats.faces[skinHex + fk]) mats.faces[skinHex + fk] = new T.MeshLambertMaterial({ map: BC.faceTex(skinHex, { glasses: A.glasses, beard: A.beard, paint: A.paint, mask: A.head === 'balaclava' }) });
    const root = new T.Group();
    const boot = 0x16130f, pad = 0x222222, glove = 0x141414, vest = team.vest, vestD = new T.Color(team.vest).multiplyScalar(0.7).getHex(), gearC = team.gear;
    const mkLeg = (sx) => {
      const thigh = new T.Group(); thigh.position.set(sx * 0.095, 0.94, 0);
      const camoT = [limbC(0, 0.03, 0, 0, -0.44, 0, 0.092, 0.068, 0xffffff, 1.05), bx(0.035, 0.13, 0.11, sx * 0.085, -0.2, 0.01, 0xffffff)];
      const gearT = [G3(SPH, 0, -0.44, -0.04, pad, 0.056, 0.062, 0.03), bx(0.025, 0.08, 0.1, sx * 0.083, -0.2, 0.012, team.gear)];
      thigh.add(new T.Mesh(BC.mergeGeoms(camoT), mats.camo), new T.Mesh(BC.mergeGeoms(gearT), mats.gear));
      const knee = new T.Group(); knee.position.set(0, -0.44, 0); thigh.add(knee);
      const camoS = [limbC(0, 0, 0, 0, -0.38, 0, 0.066, 0.05, 0xffffff, 1.0)];
      const gearS = [limbC(0, -0.27, 0, 0, -0.42, 0, 0.052, 0.058, boot), bx(0.098, 0.075, 0.27, 0, -0.455, -0.05, boot), bx(0.1, 0.02, 0.28, 0, -0.495, -0.05, 0x0c0c0c), G3(SPH, 0, -0.41, -0.04, boot, 0.05, 0.04, 0.06)];
      knee.add(new T.Mesh(BC.mergeGeoms(camoS), mats.camo), new T.Mesh(BC.mergeGeoms(gearS), mats.gear));
      return { thigh, knee };
    };
    const L = mkLeg(-1), R = mkLeg(1), body = new T.Group(); root.add(body); body.add(L.thigh, R.thigh);
    const up = new T.Group(); up.position.set(0, PV, 0); body.add(up);
    const y = (v) => v - PV, gx = 0.075, gy = 1.42, gz = -G.stock + 0.03;
    const camo = [
      G3(taper(0.165, 0.15, 0.2), 0, y(0.99), 0, 0xffffff, 1, 1, 0.68), G3(taper(0.18, 0.15, 0.5), 0, y(1.27), 0, 0xffffff, 1, 1, 0.66),
      eli(0.075, 0.07, 0.07, 0.215, y(1.43), 0, 0xffffff), eli(0.075, 0.07, 0.07, -0.215, y(1.43), 0, 0xffffff), G3(taper(0.052, 0.058, 0.08), 0, y(1.55), 0, 0xffffff)
    ];
    const gear = [bx(0.34, 0.05, 0.2, 0, y(1.03), 0, gearC), bx(0.05, 0.1, 0.06, 0.2, y(1.02), 0.03, 0x111111), G3(taper(0.063, 0.066, 0.06), 0, y(1.545), 0, vestD), eli(0.092, 0.015, 0.1, 0, y(1.635), 0.0, 0x000000)];
    // ---- colete ----
    const V = A.vest; let backZ = 0.125;
    if (V === 'plate' || V === 'heavy') {
      gear.push(G3(taper(0.2, 0.185, 0.24), 0, y(1.19), 0, vest, 1, 1, 0.72), bx(0.3, 0.34, 0.06, 0, y(1.34), -0.125, vest), bx(0.3, 0.34, 0.055, 0, y(1.34), 0.125, vestD),
        bx(0.06, 0.02, 0.26, 0.1, y(1.5), 0, vest), bx(0.06, 0.02, 0.26, -0.1, y(1.5), 0, vest),
        bx(0.078, 0.13, 0.06, -0.105, y(1.1), -0.17, vestD), bx(0.078, 0.13, 0.06, 0.0, y(1.1), -0.17, vestD), bx(0.078, 0.13, 0.06, 0.105, y(1.1), -0.17, vestD),
        bx(0.08, 0.035, 0.065, -0.105, y(1.17), -0.172, gearC), bx(0.08, 0.035, 0.065, 0, y(1.17), -0.172, gearC), bx(0.08, 0.035, 0.065, 0.105, y(1.17), -0.172, gearC),
        bx(0.055, 0.17, 0.11, -0.215, y(1.22), 0.0, vestD), bx(0.1, 0.09, 0.06, 0.1, y(1.34), -0.17, gearC));
      if (V === 'heavy') gear.push(bx(0.34, 0.12, 0.08, 0, y(1.0), -0.13, vest), eli(0.09, 0.05, 0.09, 0.27, y(1.46), 0, vest), eli(0.09, 0.05, 0.09, -0.27, y(1.46), 0, vest), bx(0.06, 0.14, 0.09, 0.2, y(1.18), 0.0, vestD), bx(0.1, 0.1, 0.07, -0.0, y(1.28), -0.19, gearC));
    } else if (V === 'chest') {
      gear.push(bx(0.28, 0.17, 0.07, 0, y(1.3), -0.14, vest), bx(0.07, 0.1, 0.05, -0.09, y(1.3), -0.19, gearC), bx(0.07, 0.1, 0.05, 0.0, y(1.3), -0.19, gearC), bx(0.07, 0.1, 0.05, 0.09, y(1.3), -0.19, gearC), bx(0.05, 0.02, 0.22, 0.1, y(1.5), 0, vestD), bx(0.05, 0.02, 0.22, -0.1, y(1.5), 0, vestD), bx(0.28, 0.14, 0.04, 0, y(1.32), 0.12, vestD)); backZ = 0.14;
    } else { // light
      gear.push(bx(0.05, 0.02, 0.22, 0.1, y(1.5), 0, vestD), bx(0.05, 0.02, 0.22, -0.1, y(1.5), 0, vestD), bx(0.09, 0.1, 0.06, -0.14, y(1.08), -0.12, gearC), bx(0.09, 0.1, 0.06, 0.14, y(1.08), -0.12, gearC), bx(0.07, 0.05, 0.05, 0, y(1.4), -0.14, gearC)); backZ = 0.1;
    }
    if (A.extras.includes('ammo')) { // cartucheira em X + caixa de munição
      gear.push(bx(0.05, 0.4, 0.03, 0.05, y(1.3), -0.19, 0xb39a52, 0, 0, 0.55), bx(0.05, 0.4, 0.03, -0.05, y(1.3), -0.19, 0xb39a52, 0, 0, -0.55), bx(0.12, 0.12, 0.08, -0.17, y(1.05), -0.1, 0x3a4a2a));
    }
    // ---- mochila ----
    let packZ = backZ, packBack = backZ; const P = A.pack, antenna = [];
    if (P === 'assault') { gear.push(bx(0.31, 0.37, 0.15, 0, y(1.3), 0.21, vestD), bx(0.26, 0.1, 0.16, 0, y(1.52), 0.21, vest)); packBack = 0.2885; }
    else if (P === 'ruck') { gear.push(bx(0.34, 0.5, 0.2, 0, y(1.26), 0.24, vestD), bx(0.3, 0.12, 0.2, 0, y(1.55), 0.24, vest), G3(taper(0.07, 0.07, 0.34), 0, y(1.18), 0.36, 0x3a4a2a, 1, 1, 1, 0, 0, Math.PI / 2)); packBack = 0.345; }
    else if (P === 'radio') { gear.push(bx(0.27, 0.3, 0.12, 0, y(1.3), 0.2, vestD), bx(0.1, 0.06, 0.05, 0.08, y(1.42), 0.29, 0x111111)); antenna.push(G3(taper(0.004, 0.006, 0.7), 0.1, y(1.75), 0.26, 0x111111)); packBack = 0.265; }
    else if (P === 'medic') { gear.push(bx(0.31, 0.38, 0.16, 0, y(1.3), 0.21, vest), bx(0.3, 0.1, 0.17, 0, y(1.52), 0.21, vestD)); packBack = 0.295; }
    // ---- braços ----
    const hR = [gx + G.hands.r[0], gy + G.hands.r[1], gz + G.hands.r[2]], hL = [gx + G.hands.l[0], gy + G.hands.l[1], gz + G.hands.l[2]];
    const camoA = [], gearA = [], sy = y(1.4);
    // mão enluvada: palma, 4 dedos de 3 segmentos curvados em volta da empunhadura e polegar de 2 segmentos
    const handParts = (px, py, pz, sx) => {
      const out = [bx(0.078, 0.032, 0.086, px, py, pz, glove), bx(0.07, 0.02, 0.02, px, py - 0.004, pz + 0.05, 0x1c1c1c)], lens = [0.9, 1.0, 0.95, 0.78];
      for (let i = 0; i < 4; i++) {
        const fx = px - 0.027 + i * 0.018, k = lens[i], w = 0.0165 - i * 0.0008;
        out.push(bx(w, 0.015, 0.03 * k, fx, py - 0.012, pz - 0.058 * k, glove, 0.5, 0, 0), bx(w * 0.95, 0.027 * k, 0.015, fx, py - 0.036, pz - 0.066 * k, glove), bx(w * 0.9, 0.015, 0.026 * k, fx, py - 0.052 * k, pz - 0.045 * k, glove, -0.5, 0, 0));
      }
      out.push(bx(0.02, 0.018, 0.04, px + sx * 0.045, py + 0.004, pz - 0.03, glove, 0, sx * 0.5, 0), bx(0.018, 0.016, 0.03, px + sx * 0.05, py - 0.004, pz - 0.062, glove, 0, sx * 0.3, 0));
      return out;
    };
    const arm = (sx, h) => {
      const s = [sx * 0.215, 1.43, 0], e = [(s[0] + h[0]) / 2 + sx * 0.07, (s[1] + h[1]) / 2 - 0.1, (s[2] + h[2]) / 2 + 0.07];
      camoA.push(limbC(s[0], y(s[1]), s[2], e[0], y(e[1]), e[2], 0.058, 0.047, 0xffffff), limbC(e[0], y(e[1]), e[2], h[0], y(h[1]), h[2], 0.046, 0.036, 0xffffff));
      gearA.push(eli(0.052, 0.052, 0.052, e[0], y(e[1]), e[2], pad), ...handParts(h[0], y(h[1]), h[2], sx));
      return { s, e };
    };
    const aR = arm(1, hR), aL = arm(-1, hL);
    up.add(new T.Mesh(BC.mergeGeoms(camo), mats.camo), new T.Mesh(BC.mergeGeoms(gear), mats.gear));
    const armsG = new T.Group(); armsG.position.set(0, sy, 0); up.add(armsG);
    { const gA = BC.mergeGeoms(camoA), gB = BC.mergeGeoms(gearA); gA.translate(0, -sy, 0); gB.translate(0, -sy, 0); armsG.add(new T.Mesh(gA, mats.camo), new T.Mesh(gB, mats.gear)); }
    if (antenna.length) up.add(new T.Mesh(BC.mergeGeoms(antenna), mats.gear));
    // ---- cabeça ----
    const head = new T.Group(); head.position.set(0, y(1.62), 0); up.add(head);
    const H_ = A.head, hm = new T.Mesh(SPH, mats.faces[skinHex + fk]); hm.scale.set(0.088, 0.108, 0.098); head.add(hm);
    const hg = [eli(0.02, 0.03, 0.02, 0.09, 0, 0.0, skinHex), eli(0.02, 0.03, 0.02, -0.09, 0, 0.0, skinHex), eli(0.012, 0.018, 0.01, 0.092, -0.002, -0.012, 0x000000 + new T.Color(skinHex).multiplyScalar(0.8).getHex())];
    if (H_ !== 'balaclava') hg.push(bx(0.022, 0.042, 0.03, 0, -0.012, -0.099, skinHex), bx(0.034, 0.014, 0.02, 0, -0.03, -0.094, skinHex), bx(0.1, 0.011, 0.016, 0, 0.034, -0.088, new T.Color(skinHex).multiplyScalar(0.9).getHex()),
      bx(0.04, 0.009, 0.012, 0, -0.064, -0.089, 0x8a4f4f), bx(0.03, 0.007, 0.01, 0, -0.058, -0.091, 0x9a5a5a), eli(0.03, 0.024, 0.03, 0, -0.097, -0.058, skinHex), eli(0.022, 0.026, 0.02, 0.056, -0.022, -0.074, skinHex), eli(0.022, 0.026, 0.02, -0.056, -0.022, -0.074, skinHex));
    else hg.push(bx(0.02, 0.03, 0.024, 0, -0.012, -0.099, 0x17181a));
    const H = A.head, add = (geo, mat, sc, pos, rot) => { const m = new T.Mesh(geo, mat); m.scale.set(...sc); m.position.set(...pos); if (rot) m.rotation.set(...rot); head.add(m); return m; };
    const cyl = new T.CylinderGeometry(1, 1, 1, 18);
    if (H === 'helmet' || H === 'helmetnvg' || H === 'headset' || H === 'helmetmask') {
      add(HEMI, mats.camo, [0.125, 0.112, 0.15], [0, 0.025, 0.01]); add(cyl, mats.gear, [0.128, 0.012, 0.154], [0, -0.008, 0.01]);
      hg.push(bx(0.14, 0.012, 0.012, 0, -0.07, -0.05, 0x151515), bx(0.012, 0.09, 0.012, 0.075, -0.03, -0.03, 0x151515), bx(0.012, 0.09, 0.012, -0.075, -0.03, -0.03, 0x151515));
      if (H === 'helmetnvg') hg.push(bx(0.05, 0.04, 0.04, 0, 0.115, -0.13, 0x1a1a1a), bx(0.09, 0.045, 0.05, 0, 0.14, -0.16, 0x232323), eli(0.022, 0.022, 0.03, -0.025, 0.14, -0.2, 0x0b1a14), eli(0.022, 0.022, 0.03, 0.025, 0.14, -0.2, 0x0b1a14));
      else hg.push(bx(0.05, 0.04, 0.04, 0, 0.115, -0.13, 0x1a1a1a));
      if (H === 'headset') hg.push(bx(0.035, 0.08, 0.06, 0.112, -0.005, 0.01, 0x222222), bx(0.035, 0.08, 0.06, -0.112, -0.005, 0.01, 0x222222), bx(0.1, 0.01, 0.01, 0.0, 0.0, 0.0, 0x222222), bx(0.01, 0.01, 0.1, 0.1, -0.06, -0.05, 0x222222), eli(0.012, 0.012, 0.012, 0.09, -0.065, -0.1, 0x111111));
    } else if (H === 'boonie') {
      add(HEMI, mats.camo, [0.118, 0.09, 0.13], [0, 0.03, 0.01]); add(cyl, mats.camo, [0.2, 0.008, 0.21], [0, 0.0, 0.0]); hg.push(bx(0.14, 0.012, 0.012, 0, -0.07, -0.05, 0x151515));
    } else if (H === 'beret') {
      add(SPH, solid(A.beret || 0x6a1f22), [0.122, 0.045, 0.14], [0.015, 0.075, 0.0], [0, 0, 0.18]); hg.push(bx(0.03, 0.01, 0.008, -0.07, 0.085, -0.09, 0xd4b24a));
    } else if (H === 'cap') {
      add(HEMI, mats.camo, [0.108, 0.07, 0.122], [0, 0.04, 0.01]); add(BOX, mats.camo, [0.1, 0.01, 0.07], [0, 0.045, -0.115]);
    } else if (H === 'beanie') {
      add(HEMI, solid(0x1c1d20), [0.106, 0.09, 0.118], [0, 0.03, 0.005]);
    } else if (H === 'balaclava') {
      add(HEMI, solid(0x15161a), [0.1, 0.085, 0.112], [0, 0.03, 0.005]); hg.push(bx(0.1, 0.012, 0.012, 0, -0.02, -0.093, 0x111111));
    }
    head.add(new T.Mesh(BC.mergeGeoms(hg), mats.gear));
    const gunMesh = new T.Mesh(bg.geo, BC.gunMat); gunMesh.position.set(gx, y(gy) - sy, gz); armsG.add(gunMesh);
    const muzzle = new T.Object3D(); muzzle.position.set(G.muzzle[0], G.muzzle[1], G.muzzle[2]); gunMesh.add(muzzle);
    // ---- bandeiras e patches ----
    const patch = (w, px, py, pz, ry, rx, parent, mat) => { const m = new T.Mesh(flagGeo, mat || mats.flag); m.scale.set(w, w, 1); m.position.set(px, py, pz); m.rotation.set(rx || 0, ry, 0); (parent || up).add(m); return m; };
    if (V !== 'light' || true) patch(0.1, 0, y(1.4), V === 'light' ? -0.12 : V === 'chest' ? -0.178 : -0.158, Math.PI);
    patch(0.22, 0, y(1.3), packBack, 0, 0, up);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], mR = mid(aR.s, aR.e), mL = mid(aL.s, aL.e);
    patch(0.085, mR[0] + 0.062, y(mR[1]) + 0.02 - sy, mR[2], Math.PI / 2, 0, armsG); patch(0.085, mL[0] - 0.062, y(mL[1]) + 0.02 - sy, mL[2], -Math.PI / 2, 0, armsG);
    if (H === 'helmet' || H === 'helmetnvg' || H === 'headset') patch(0.06, 0, 0.1, -0.157, Math.PI, -0.25, head);
    if (P === 'medic' || A.extras.includes('medic')) { patch(0.12, 0.162, y(1.32), 0.21, Math.PI / 2, 0, up, crossMat); patch(0.12, -0.162, y(1.32), 0.21, -Math.PI / 2, 0, up, crossMat); patch(0.08, 0, y(1.38), -0.19, Math.PI, 0, up, crossMat); }
    if (A.extras.includes('rank')) patch(0.06, -0.1, y(1.42), V === 'chest' ? -0.178 : -0.158, Math.PI, 0, up, rankMat);
    // ---- animação ----
    // stn: 0 em pé, 1 agachado, 2 deitado. Poses intermediárias suavizadas: joelhos dobram, tronco inclina, mãos vão ao chão e o corpo gira para o chão.
    const E = (x) => x * x * (3 - 2 * x), api = { lift: 0, lunge: 0 };
    const pose = (ph, amp, stn, t, aim, crawl) => {
      aim = aim || 0; const c = Math.min(stn, 1), pr = Math.max(0, stn - 1), ce = E(c), pe = E(pr), s = Math.sin(ph), cs = Math.cos(ph), a = amp * 0.85 * (1 - pe), cc = ce * (1 - pe);
      const wk = amp * (1 - pe) * (1 - cc), fl = 0.1 * wk; L.thigh.rotation.x = s * a + 0.08 * wk + 1.15 * cc - 0.1 * pe + Math.sin(ph * 0.8) * 0.28 * pe * (crawl || 0); R.thigh.rotation.x = -s * a + 0.08 * wk + 1.15 * cc - 0.1 * pe - Math.sin(ph * 0.8) * 0.28 * pe * (crawl || 0);
      L.knee.rotation.x = -(Math.max(0, cs) * a * 1.25) - fl * (1 - Math.abs(s)) - Math.max(0, -s) * a * 0.35 - 2.0 * cc - 0.05 * pe - Math.max(0, Math.sin(ph * 0.8)) * 0.5 * pe * (crawl || 0); R.knee.rotation.x = -(Math.max(0, -cs) * a * 1.25) - fl * (1 - Math.abs(s)) - Math.max(0, s) * a * 0.35 - 2.0 * cc - 0.05 * pe - Math.max(0, -Math.sin(ph * 0.8)) * 0.5 * pe * (crawl || 0);
      L.thigh.position.y = R.thigh.position.y = 0.94 - 0.42 * cc; L.thigh.position.z = R.thigh.position.z = -0.04 * cc;
      up.position.y = PV - 0.04 - 0.42 * cc + Math.cos(2 * ph) * 0.016 * amp * (1 - pe) + Math.sin(t * 1.6) * (0.003 + 0.004 * pe); up.position.z = -0.1 * cc; up.position.x = s * 0.018 * wk; up.rotation.z = -s * 0.04 * wk; body.rotation.z = 0;
      up.rotation.x = 0.34 * cc + aim * (1 - pe) - 0.22 * pe; up.rotation.y = -s * 0.06 * amp * (1 - pe) * (1 - cc) + Math.sin(ph * 0.8) * 0.1 * pe * (crawl || 0);
      armsG.rotation.x = (Math.PI / 2) * pe + aim * pe - 0.35 * cc * 0 ; armsG.rotation.z = Math.sin(ph * 0.8) * 0.12 * pe * (crawl || 0);
      head.rotation.z = s * 0.035 * wk; head.rotation.x = 1.3 * pe - aim * 0.35 * (1 - pe) - 0.15 * cc;
      body.rotation.x = -(Math.PI / 2) * pe; body.position.y = 0.17 * pe * 0 ; body.position.z = -0.32 * Math.sin(Math.PI * pr) * (pr < 1 ? 1 : 0);
      api.lift = 0.17 * pe;
    };
    root.scale.set(A.sw || 1, A.sh || 1, A.sw || 1);
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { root, body, up, armsG, legL: L.thigh, legR: R.thigh, kneeL: L.knee, kneeR: R.knee, head, gunMesh, muzzle, team, pose, api, agent: A, bloodMeshes: [] };
  };

  // Braços da 1ª pessoa (filhos do modelo da arma). Luvas + manga camuflada (com a bandeira no braço esquerdo).
  BC.buildArms = function (team, G) {
    const mats = BC.teamMats(team), grp = new T.Group();
    const mk = (hand, end, side) => {
      const g = new T.Group();
      const camo = [BC.plimb(hand[0], hand[1] - 0.01, hand[2] + 0.05, end[0], end[1], end[2], 0.075, 0xffffff, 0.07)];
      const gear = [BC.pbox(0.062, 0.05, 0.085, hand[0], hand[1], hand[2], 0x161616), BC.pbox(0.05, 0.03, 0.05, hand[0], hand[1] + 0.012, hand[2] - 0.05, 0x161616), BC.pbox(0.08, 0.075, 0.035, hand[0], hand[1] - 0.003, hand[2] + 0.06, team.gear)];
      g.add(new T.Mesh(BC.mergeGeoms(camo), mats.camo), new T.Mesh(BC.mergeGeoms(gear), mats.gear));
      if (side < 0) { // patch da bandeira no antebraço esquerdo
        const m = new T.Mesh(flagGeo, mats.flag); m.scale.set(0.1, 0.1, 1);
        const px = hand[0] + (end[0] - hand[0]) * 0.55, py = hand[1] + (end[1] - hand[1]) * 0.55 + 0.055, pz = hand[2] + (end[2] - hand[2]) * 0.55;
        m.position.set(px, py, pz); m.rotation.x = -Math.PI / 2 + 0.25; g.add(m);
      }
      return g;
    };
    const r = G.hands.r, l = G.hands.l;
    const armR = mk(r, [r[0] - 0.05, r[1] - 0.3, r[2] + 0.38], 1), armL = mk(l, [l[0] - 0.2, l[1] - 0.3, l[2] + 0.5], -1);
    grp.add(armR, armL);
    return { grp, armR, armL };
  };
})();
