// Autotestes (rodar no console: BC.selfTest()). Verifica TTK, cadência por FPS, raycast e escala de ADS.
(function () {
  const BC = window.BC;

  BC.ttkTable = function () {
    const rows = [];
    for (const w of BC.WEAPONS) for (const hp of [100, 150]) for (const [zone, mul] of [['cabeça', w.headMul], ['corpo', 1], ['pernas', w.legMul]]) {
      const dmg = w.dmg * mul * w.pellets * (w.pellets > 1 ? 0.78 : 1); // espingarda: ~7 de 9 chumbos acertam a 10 m
      const shots = Math.ceil(hp / dmg), ttk = (shots - 1) / (w.rpm / 60);
      rows.push({ arma: w.name, hp, zona: zone, tiros: shots, ttk: +ttk.toFixed(3) });
    }
    return rows;
  };

  // simula 'sec' segundos de fogo automático a 'fps' quadros/s usando o mesmo FireClock do jogo
  BC.simFire = function (rpm, fps, sec) {
    const clk = new BC.FireClock(rpm); clk.next = -9; let n = 0, t = 0; const dt = 1 / fps;
    for (let i = 0; i < fps * sec; i++) { t += dt; clk.step(t, true, () => true, () => { n++; }); }
    return n;
  };

  BC.selfTest = function () {
    const out = { ok: true, checks: [] };
    const chk = (name, pass, info) => { out.checks.push({ name, pass, info }); if (!pass) out.ok = false; };
    // 1) cadência estável em 30/60/144 FPS
    for (const w of BC.WEAPONS) {
      const exp = w.rpm / 60 * 10, r = [30, 60, 144].map((f) => BC.simFire(w.rpm, f, 10));
      chk('cadência ' + w.name, r.every((n) => Math.abs(n - exp) <= 1.01), { esperado: +exp.toFixed(1), fps30_60_144: r });
    }
    // 2) raycast: atirador "dentro" de um volume de jogador, parede a 1 m
    const W = new BC.World(110); W.N = 0; W.H = null;
    W.addBoxCol(0.9, 0, -2, 1.1, 3, 2, 'concrete'); // parede a ~1 m
    let h = W.raycast(0, 1.4, 0, 1, 0, 0, 100);
    chk('tiro a 1 m acerta a parede', !!h && Math.abs(h.t - 0.9) < 0.01, h && { t: h.t });
    // 3) gatilho/zona de pickup não bloqueia: alvo (parede) atrás da zona
    const W2 = new BC.World(110); W2.crates.push({ x: 3, z: 0, t: 0 }); W2.addBoxCol(8, 0, -2, 9, 3, 2, 'concrete');
    h = W2.raycast(0, 1.4, 0, 1, 0, 0, 100);
    chk('tiro atravessa zona de pickup e acerta alvo atrás', !!h && Math.abs(h.t - 8) < 0.01, h && { t: h.t });
    // 4) ADS: sensibilidade escala por tan(fov/2)
    const hipV = BC.hFovToV(92, 16 / 9), adsV = BC.deg(2 * Math.atan(Math.tan(BC.rad(hipV) / 2) / 3.6)), ratio = BC.adsSensRatio(hipV, adsV);
    const X = 100 * 0.0022 * 1, Xads = 100 * 0.0022 * ratio;
    chk('ADS escala sensibilidade (SVD 3,6x)', Math.abs(Xads / X - 1 / 3.6) < 1e-9, { hipV: +hipV.toFixed(2), adsV: +adsV.toFixed(2), ratio: +ratio.toFixed(4) });
    // 5) TTK: faixa tática (corpo, 100 HP) para armas de fogo contínuo
    const tt = BC.ttkTable().filter((r) => r.hp === 100 && r.zona === 'corpo');
    out.ttk = tt;
    for (const r of tt) { const w = BC.WEAPONS.find((x) => x.name === r.arma); if (w && (w.rpm < 100 || w.cls === 'shotgun')) continue; chk('TTK corpo ' + r.arma, r.ttk <= 0.9, r); }
    // 6) cabeça mata com 1 tiro nos fuzis (100 HP)
    for (const id of ['ak47', 'm4a1', 'svd']) { const w = BC.WMAP[id]; chk('1 tiro na cabeça ' + w.name, w.dmg * w.headMul >= 100, { dano: w.dmg * w.headMul }); }
    // 7) dano com queda por distância
    const ak = BC.WMAP.ak47, mid = (ak.fullRange + ak.maxRange) / 2; chk('falloff AK', BC.falloff(ak, 10) === 1 && Math.abs(BC.falloff(ak, ak.maxRange) - ak.minMul) < 1e-9 && BC.falloff(ak, mid) < 1 && BC.falloff(ak, mid) > ak.minMul, [BC.falloff(ak, 10), BC.falloff(ak, mid), BC.falloff(ak, ak.maxRange)]);
    console.table(out.checks.map((c) => ({ teste: c.name, ok: c.pass ? 'OK' : 'FALHOU', info: JSON.stringify(c.info) })));
    console.table(BC.ttkTable());
    return out;
  };

  // testa a geração dos 6 mapas (spawns livres, raycast sem NaN)
  BC.mapTest = function () {
    const res = [];
    for (const id of BC.MAP_ORDER) {
      const t0 = performance.now(), W = BC.buildMap(id), dt = performance.now() - t0;
      let free = [0, 0].map((t) => W.spawns[t].filter((s) => W.isFree(s.x, s.z, 0.5)).length);
      let nan = 0; for (let i = 0; i < 300; i++) { const a = Math.random() * 6.283, h = W.raycast((Math.random() - 0.5) * 100, 1.5, (Math.random() - 0.5) * 100, Math.cos(a), (Math.random() - 0.5) * 0.3, Math.sin(a), 200); if (h && (h.t !== h.t)) nan++; }
      res.push({ mapa: id, ms: Math.round(dt), colisores: W.boxes.length + W.cyls.length, malhas: W.group.children.length, spawnsLivres: free.join('/'), caixas: W.crates.length, nan });
      W.dispose();
    }
    console.table(res); return res;
  };
})();
