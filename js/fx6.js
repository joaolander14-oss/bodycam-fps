// Gotas de sangue: esferas alongadas na direção do movimento, com gravidade, que mancham o chão ao cair.
(function () {
  const T = THREE, BC = window.BC, F = BC.Fx.prototype;
  const REDS = [0x8a0d0d, 0x6e0808, 0xa01414, 0x560606], _z = new T.Vector3(0, 0, 1), _n = new T.Vector3();
  const N = 260;
  function ensure(fx) {
    if (fx.bdr) return; fx.bdr = []; fx.bdi2 = 0;
    const g = new T.SphereGeometry(1, 6, 5), mats = REDS.map((c) => new T.MeshBasicMaterial({ color: c }));
    for (let i = 0; i < N; i++) { const m = new T.Mesh(g, mats[i % 4]); m.visible = false; fx.scene.add(m); fx.bdr.push({ m, life: 0, v: new T.Vector3(), r: 0.01 }); }
  }
  // sc ~0.3..1.2 (tamanho relativo da gota)
  F.bdrop = function (x, y, z, vx, vy, vz, sc) {
    ensure(this); const d = this.bdr[this.bdi2++ % N]; d.m.position.set(x, y, z); d.v.set(vx, vy, vz); d.r = 0.006 + 0.016 * Math.min(1.3, sc || 0.5); d.life = 2.5; d.m.visible = true; d.m.scale.set(d.r, d.r, d.r);
  };
  const _u = F.update;
  F.update = function (dt, world) {
    _u.call(this, dt, world); if (!this.bdr) return;
    for (const d of this.bdr) {
      if (d.life <= 0) continue; d.life -= dt; if (d.life <= 0) { d.m.visible = false; continue; }
      d.v.y -= 9.8 * dt; d.v.x *= 1 - 0.35 * dt; d.v.z *= 1 - 0.35 * dt; const p = d.m.position; p.addScaledVector(d.v, dt);
      const sp = d.v.length(); if (sp > 0.3) { _n.copy(d.v).multiplyScalar(1 / sp); d.m.quaternion.setFromUnitVectors(_z, _n); d.m.scale.set(d.r, d.r, d.r * (1 + Math.min(4.5, sp * 0.55))); }
      if (world) {
        const h = world.heightAt(p.x, p.z);
        if (p.y < h + 0.01) { // caiu no chão: mancha proporcional à gota e à velocidade
          d.life = 0; d.m.visible = false;
          if (this._dec && Math.random() < 0.5) this._dec(this, { x: p.x, y: h, z: p.z }, { x: 0, y: 1, z: 0 }, Math.min(0.11, d.r * (4 + sp * 0.5)), 0.9);
        }
      }
    }
  };
  const _r = F.reset; F.reset = function () { if (_r) _r.call(this); if (this.bdr) for (const d of this.bdr) { d.life = 0; d.m.visible = false; } };
})();
