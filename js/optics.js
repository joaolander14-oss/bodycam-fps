// Miras ópticas de verdade: lunetas mostram a cena ampliada dentro da própria lente (imagem renderizada na direção do cano),
// e red dot / holográfica / reflex projetam o ponto no vidro da mira (colimado: acompanha para onde o cano aponta).
(function () {
  const T = THREE, BC = window.BC;
  const O = BC.Optics = { rt: null, cam: null, active: null };
  const LENS_R = 0.022, LENS_D = 0.11, ALPHA = Math.atan(LENS_R / LENS_D);
  const cvs = (n, f) => { const c = document.createElement('canvas'); c.width = c.height = n; f(c.getContext('2d'), n); const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; return t; };
  const reticleTex = (kind, col) => cvs(256, (g, s) => {
    g.clearRect(0, 0, s, s); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.2; g.lineCap = 'butt'; const c = s / 2, R = s * 0.48;
    const L = (x1, y1, x2, y2, w) => { g.lineWidth = w || 2.2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    if (kind === 'chev') { g.lineWidth = 3; g.beginPath(); g.moveTo(c - 26, c + 42); g.lineTo(c, c + 6); g.lineTo(c + 26, c + 42); g.stroke(); L(c, 0, c, c - 18, 2.4); L(0, c, c - 20, c, 2.4); L(c + 20, c, s, c, 2.4); g.beginPath(); g.arc(c, c + 6, 2, 0, 7); g.fill(); }
    else if (kind === 'mil') { L(c, 0, c, s, 1.6); L(0, c, s, c, 1.6); for (let i = 1; i <= 4; i++) { for (const sg of [-1, 1]) { g.beginPath(); g.arc(c + sg * i * 26, c, 2.2, 0, 7); g.fill(); g.beginPath(); g.arc(c, c + sg * i * 26, 2.2, 0, 7); g.fill(); } } L(c - 6, c, c + 6, c, 3); }
    else if (kind === 'pso') { L(c, 0, c, c - 20, 2.4); L(c, c + 20, c, s, 2.4); L(0, c, c - 20, c, 2.4); L(c + 20, c, s, c, 2.4); g.lineWidth = 2; g.beginPath(); g.moveTo(c - 18, c + 34); g.lineTo(c, c + 18); g.lineTo(c + 18, c + 34); g.stroke(); for (let i = 1; i <= 3; i++) { g.beginPath(); g.moveTo(c - 10, c + 34 + i * 16); g.lineTo(c + 10, c + 34 + i * 16); g.stroke(); } }
    else { L(c, 0, c, c - 14, 1.8); L(c, c + 14, c, s, 1.8); L(0, c, c - 14, c, 1.8); L(c + 14, c, s, c, 1.8); g.beginPath(); g.arc(c, c, 1.8, 0, 7); g.fill(); }
  });
  const dotTex = (col) => cvs(64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, col); gr.addColorStop(0.22, col); gr.addColorStop(0.5, col + '55'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
  const holoTex = (col) => cvs(128, (g, s) => { g.clearRect(0, 0, s, s); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(s / 2, s / 2, s * 0.38, 0, 7); g.stroke(); g.beginPath(); g.arc(s / 2, s / 2, 3.2, 0, 7); g.fill(); for (const a of [0, 1.57, 3.14, 4.71]) { g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * s * 0.38, s / 2 + Math.sin(a) * s * 0.38); g.lineTo(s / 2 + Math.cos(a) * s * 0.46, s / 2 + Math.sin(a) * s * 0.46); g.stroke(); } });
  const LENS_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }';
  const LENS_FS = 'uniform sampler2D map; uniform float mode, time; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }\n' +
    'void main(){ vec3 c = texture2D(map, vUv).rgb; float l = dot(c, vec3(0.299,0.587,0.114)); float d = length(vUv-0.5)*2.0;\n' +
    ' if(mode>0.5 && mode<1.5){ vec3 t = mix(vec3(0.04,0.0,0.14), vec3(1.0,0.45,0.0), smoothstep(0.1,0.7,l)); c = mix(t, vec3(1.0,1.0,0.8), smoothstep(0.72,1.0,l)); }\n' +
    ' else if(mode>1.5){ c = vec3(0.12,1.0,0.25)*pow(clamp(l*1.7,0.0,1.0),0.75) + (h(vUv*300.0+time)-0.5)*0.22; }\n' +
    ' c *= smoothstep(1.0, 0.86, d) * (0.82 + 0.18*(1.0-d)); gl_FragColor = vec4(c, 1.0); }';

  O.init = function (renderer) {
    O.renderer = renderer; O.rt = new T.WebGLRenderTarget(512, 512, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat }); O.cam = new T.PerspectiveCamera(6, 1, 0.1, 700);
  };
  // monta a óptica no modelo da arma (1ª pessoa). m.root = arma; wst = estado da arma
  O.build = function (m, wst, spec) {
    const S = BC.SCOPES[wst.scopeType], kind = wst.scoped ? 'pip' : (S && S.kind === 'dot') ? 'dot' : null; if (!kind) { m.optic = null; return; }
    const ads = spec.ads, grp = new T.Group(); const col = S && S.color || (S && S.kind === 'dot' ? '#ff2a2a' : '#000000');
    if (kind === 'pip') {
      const mode = S && S.thermal ? 1 : S && S.nv ? 2 : 0, ret = (S && S.ret) || 'pso', rcol = mode ? '#b6ff9c' : '#0a0a0a';
      grp.position.set(-ads[0], -ads[1], -LENS_D - ads[2]);
      const ring = new T.Mesh(new T.RingGeometry(LENS_R * 0.99, LENS_R * 1.3, 40), new T.MeshBasicMaterial({ color: 0x030303, transparent: true, opacity: 0.94, depthTest: false, side: T.DoubleSide })); ring.renderOrder = 20;
      const lensMat = new T.ShaderMaterial({ uniforms: { map: { value: O.rt.texture }, mode: { value: mode }, time: { value: 0 } }, vertexShader: LENS_VS, fragmentShader: LENS_FS, depthTest: false, side: T.DoubleSide });
      const lens = new T.Mesh(new T.CircleGeometry(LENS_R, 48), lensMat); lens.renderOrder = 21;
      const rt = new T.Mesh(new T.CircleGeometry(LENS_R * 0.96, 40), new T.MeshBasicMaterial({ map: reticleTex(ret, rcol), transparent: true, depthTest: false, side: T.DoubleSide })); rt.renderOrder = 22; rt.position.z = 0.0003;
      grp.add(ring, lens, rt); m.optic = { kind, grp, lensMat, zoom: wst.zoom, S };
    } else {
      const win = m.scopeMesh && m.scopeMesh.userData.win; if (!win) { m.optic = null; return; }
      const holo = S.ret === 'holo', tex = holo ? holoTex(col) : dotTex(col), sz = holo ? 0.026 : 0.0075;
      const dot = new T.Mesh(new T.PlaneGeometry(sz, sz), new T.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, blending: T.AdditiveBlending, depthWrite: false })); dot.renderOrder = 22;
      grp.add(dot); m.scopeMesh.add(grp); m.optic = { kind, grp: dot, win, S, holo };
    }
    if (kind === 'pip') m.root.add(grp);
  };
  const _q = new T.Quaternion(), _v = new T.Vector3(), _f = new T.Vector3();
  // atualiza a óptica (chamar depois de posicionar a arma). Retorna true se precisa renderizar o PIP.
  O.update = function (m, wst, ads, camera, time) {
    O.active = null; const o = m.optic; if (!o) return;
    if (o.kind === 'pip') {
      const on = ads > 0.5; o.grp.visible = on; if (!on) return;
      const f = 2 * Math.atan(Math.tan(ALPHA) / o.zoom) * 180 / Math.PI; O.cam.fov = f; O.cam.updateProjectionMatrix();
      O.cam.position.copy(camera.position); _q.copy(camera.quaternion).multiply(m.root.quaternion); O.cam.quaternion.copy(_q); O.cam.updateMatrixWorld(true);
      o.lensMat.uniforms.time.value = time; O.active = o;
    } else {
      // ponto colimado: cruzamento do eixo do cano (no infinito) com o plano do vidro, em coordenadas locais da arma
      const win = o.win, q = m.root.quaternion, p = m.root.position;
      _v.set(-p.x, -p.y, -p.z).applyQuaternion(_q.copy(q).invert());       // olho no espaço local
      const dz = (-1000 - _v.z), t = (win.z - _v.z) / dz, x = _v.x + t * (0 - _v.x), y = _v.y + t * (0 - _v.y);
      const inside = Math.abs(x - win.x) < win.w * 0.46 && Math.abs(y - win.y) < win.h * 0.46;
      o.grp.visible = inside && ads > 0.08; o.grp.position.set(x, y, win.z + 0.0004);
      O.dbg = { x, y, inside, win, ex: _v.x, ey: _v.y, ez: _v.z, ads };
    }
  };
  O.render = function (scene) {
    const o = O.active; if (!o) return; const r = O.renderer, sm = r.shadowMap.autoUpdate, tgt = r.getRenderTarget();
    r.shadowMap.autoUpdate = false; r.setRenderTarget(O.rt); r.clear(true, true, true); r.render(scene, O.cam); r.setRenderTarget(tgt); r.shadowMap.autoUpdate = sm;
  };
})();
