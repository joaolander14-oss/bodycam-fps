// Borrifo de sangue: nuvem de microgotas finas e estrias, que se espalha rápido e some (substitui o puff de fumaça avermelhado).
(function () {
  const T = THREE, BC = window.BC, F = BC.Fx.prototype;
  const tex = BC.canvasTex(64, (g, s) => {
    const r = BC.rng(404); g.clearRect(0, 0, s, s);
    let gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.42); gr.addColorStop(0, 'rgba(120,6,6,.38)'); gr.addColorStop(0.6, 'rgba(100,4,4,.16)'); gr.addColorStop(1, 'rgba(90,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 46; i++) { const a = r() * 6.283, d = Math.pow(r(), 0.7) * s * 0.44, x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d, rad = 0.5 + r() * 1.6; g.fillStyle = 'rgba(' + (96 + (r() * 40) | 0) + ',4,4,' + (0.55 + r() * 0.4) + ')'; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
    for (let i = 0; i < 9; i++) { const a = r() * 6.283, d0 = s * 0.1, d1 = s * (0.26 + r() * 0.2); g.strokeStyle = 'rgba(105,5,5,.5)'; g.lineWidth = 0.8 + r() * 0.8; g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * d0, s / 2 + Math.sin(a) * d0); g.lineTo(s / 2 + Math.cos(a) * d1, s / 2 + Math.sin(a) * d1); g.stroke(); }
  }, false);
  function ensure(fx) {
    if (fx.mist) return; fx.mist = []; fx.mi = 0;
    for (let i = 0; i < 70; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.visible = false; fx.scene.add(s); fx.mist.push({ s, life: 0, max: 1, v: new T.Vector3(), s0: 0.1, s1: 0.3, a: 0.8 }); }
  }
  // mesma assinatura de F.puff (cor ignorada: sempre sangue)
  F.bloodMist = function (x, y, z, color, n, speed, size, life) {
    ensure(this);
    for (let i = 0; i < n; i++) {
      const p = this.mist[this.mi++ % this.mist.length];
      p.s.position.set(x + (Math.random() - 0.5) * 0.06, y + (Math.random() - 0.5) * 0.06, z + (Math.random() - 0.5) * 0.06); p.life = p.max = life * (0.7 + Math.random() * 0.6);
      p.v.set((Math.random() - 0.5) * speed, (Math.random() * 0.5 + 0.1) * speed, (Math.random() - 0.5) * speed);
      p.s0 = size * 0.5; p.s1 = size * (1.4 + Math.random() * 0.8); p.a = 0.55 + Math.random() * 0.3; p.s.material.rotation = Math.random() * 6.28; p.s.visible = true;
    }
  };
  const _u = F.update;
  F.update = function (dt, world) {
    _u.call(this, dt, world); if (!this.mist) return;
    for (const p of this.mist) {
      if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; }
      const k = 1 - p.life / p.max; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - 4.5 * dt); p.v.y -= 1.2 * dt;
      const sc = p.s0 + (p.s1 - p.s0) * Math.sqrt(k); p.s.scale.set(sc, sc, 1); p.s.material.opacity = p.a * (1 - k) * (1 - k);
    }
  };
  const _r = F.reset; F.reset = function () { if (_r) _r.call(this); if (this.mist) for (const p of this.mist) { p.life = 0; p.s.visible = false; } };
})();
