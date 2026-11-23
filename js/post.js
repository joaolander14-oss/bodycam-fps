// Pós-processamento estilo bodycam: lente grande-angular (barril), aberração cromática, granulação, vinheta, falhas de sinal.
(function () {
  const T = THREE, BC = window.BC;
  const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
  const FS = `
precision highp float;
uniform sampler2D tDiffuse; uniform float time, k, zoom, glitch, damage, dead, flash; uniform vec2 res; uniform vec3 lg[4];
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 p = (vUv - 0.5) * 2.0; float r2 = dot(p,p);
  vec2 q = p * (1.0 + k * r2) * zoom; vec2 suv = q * 0.5 + 0.5;
  float lm = 0.0;
  for (int i = 0; i < 4; i++) { float a = lg[i].z; if (a > 0.0) { float d = length((vUv - lg[i].xy) * vec2(res.x / res.y, 1.0)); lm += smoothstep(0.24, 0.0, d) * a; } }
  lm = min(lm, 1.5);
  suv.x += lm * (h(vec2(floor(suv.y * 70.0), floor(time * 28.0))) - 0.5) * 0.14; suv.y += lm * (h(vec2(floor(suv.x * 40.0), floor(time * 20.0))) - 0.5) * 0.02;
  float band = floor(suv.y * 36.0 + time * 18.0);
  float g = step(0.992 - glitch * 0.4, h(vec2(band, floor(time * 14.0)))) * glitch;
  suv.x += g * (h(vec2(band, 3.0)) - 0.5) * 0.22;
  vec2 dir = normalize(p + 1e-5) * r2 * (0.006 + glitch * 0.02 + lm * 0.02);
  vec3 col; col.r = texture2D(tDiffuse, suv + dir).r; col.g = texture2D(tDiffuse, suv).g; col.b = texture2D(tDiffuse, suv - dir).b;
  float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.8); col = (col - 0.5) * 1.1 + 0.5; col *= vec3(1.02, 1.03, 0.97);
  col += vec3(flash) * vec3(1.0, 0.85, 0.6);
  col += (h(vUv * res + time * 3.0) - 0.5) * (lm * 0.9 + glitch * 0.3); col = mix(col, vec3(dot(col, vec3(0.33))), min(1.0, lm * 0.4 + glitch * 0.15));
  col *= 0.95 + 0.05 * sin(suv.y * res.y * 1.5);
  col += (h(vUv * res + time) - 0.5) * 0.075;
  float vig = 1.0 - smoothstep(0.55, 1.5, length(p * vec2(1.0, 0.9)));
  col *= 0.22 + 0.78 * vig;
  col = mix(col, col * vec3(1.7, 0.35, 0.35), damage * (1.0 - vig * 0.6));
  float ll = dot(col, vec3(0.3, 0.59, 0.11));
  vec3 st = vec3(h(vUv * res * 0.5 + time * 7.0)) * 0.5;
  col = mix(col, mix(vec3(ll) * 0.6, st, 0.55), dead);
  gl_FragColor = vec4(col * inside, 1.0);
}`;

  BC.Post = function (renderer) {
    this.r = renderer; this.scale = 0.85; this.k = 0.2; this.zoom = 0.87;
    this.quadScene = new T.Scene(); this.quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mat = new T.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: null }, time: { value: 0 }, k: { value: this.k }, zoom: { value: this.zoom }, glitch: { value: 0 }, damage: { value: 0 }, dead: { value: 0 }, flash: { value: 0 }, res: { value: new T.Vector2(1, 1) }, lg: { value: [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()] } }
    });
    this.quadScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), this.mat));
    this.rt = null;
  };
  BC.Post.prototype.resize = function (w, h) {
    this.w = w; this.h = h;
    const rw = Math.max(64, Math.floor(w * this.scale)), rh = Math.max(64, Math.floor(h * this.scale));
    if (this.rt) this.rt.dispose();
    const opts = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat };
    this.rt = (this.r.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget) ? new T.WebGLMultisampleRenderTarget(rw, rh, opts) : new T.WebGLRenderTarget(rw, rh, opts);
    if (this.rt.samples !== undefined && this.r.capabilities.isWebGL2) this.rt.samples = 4;
    this.rt.texture.generateMipmaps = false;
    this.mat.uniforms.res.value.set(rw, rh);
    this.r.setSize(w, h, false);
  };
  BC.Post.prototype.render = function (scene, cam, vmScene, vmCam, st) {
    const r = this.r, u = this.mat.uniforms;
    r.setRenderTarget(this.rt); r.autoClear = false; r.clear(true, true, true);
    r.render(scene, cam);
    if (vmScene) { r.clearDepth(); r.render(vmScene, vmCam); }
    r.setRenderTarget(null); r.clear(true, true, true);
    u.tDiffuse.value = this.rt.texture; u.time.value = st.time; u.glitch.value = st.glitch; u.damage.value = st.damage; u.dead.value = st.dead; u.flash.value = st.flash || 0;
    if (st.lg) for (let i = 0; i < 4; i++) { const e = st.lg[i]; if (e) u.lg.value[i].set(e.x, e.y, e.a); else u.lg.value[i].set(0, 0, 0); }
    u.k.value = this.k; u.zoom.value = st.zoom || this.zoom;
    r.render(this.quadScene, this.quadCam);
  };
})();
