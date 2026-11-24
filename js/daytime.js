// Horário do dia: a posição do sol/lua, cores do céu, neblina e luzes seguem a hora (0-24). 'map' mantém o visual original do mapa.
(function () {
  const T = THREE, BC = window.BC;
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mix = (hexA, hexB, k) => new T.Color(hexA).lerp(new T.Color(hexB), k);
  BC.hourName = (h) => { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = h - hh >= 0.5 ? '30' : '00'; return (hh < 10 ? '0' : '') + hh + ':' + mm; };
  // env = {scene, hemi, sun, sky, sunDir, vmL:[luz1,luz2]}; def = definição do mapa; hour = número 0..24 ou 'map'
  BC.applyTime = function (env, def, hour) {
    const k = BC.DAY = { night: 0, hour: hour };
    if (hour === undefined || hour === 'map' || isNaN(+hour)) { if (env.sky.material.uniforms.night) env.sky.material.uniforms.night.value = 0; (env.vmL || []).forEach((l, i) => { l.intensity = i ? 0.8 : 0.9; }); return; }
    const h = +hour, e = Math.sin(Math.PI * (h - 6) / 12), az = Math.PI * (h - 6) / 12;
    const night = 1 - sm(-0.28, 0.08, e), warm = (1 - sm(0.08, 0.5, e)) * (1 - night);
    k.night = night;
    // direção: sol de dia, lua à noite (oposta)
    let dx, dy, dz;
    if (e > -0.05) { const el = Math.max(0.1, e); dx = -Math.cos(az) * Math.sqrt(1 - el * el) * 1.0; dy = el; dz = 0.35 + 0.2 * Math.sin(az); }
    else { const el = BC.clamp(-e * 0.9, 0.3, 0.9); dx = Math.cos(az) * Math.sqrt(1 - el * el); dy = el; dz = -0.3; }
    env.sunDir.set(dx, dy, dz).normalize();
    const lerpC = (base, wc, wk, nc) => mix(mix(base, wc, wk), nc, night);
    env.sun.color.copy(lerpC(def.sun.color, 0xff8a3a, warm * 0.85, 0x9bb0e0));
    env.sun.intensity = def.sun.i * (0.45 + 0.55 * sm(0, 0.6, e)) * (1 - night) + 0.42 * night;
    env.hemi.color.copy(lerpC(def.hemi.sky, 0xd8a078, warm * 0.5, 0x2a3d66)); env.hemi.groundColor.copy(lerpC(def.hemi.ground, 0x6a4a3a, warm * 0.4, 0x0b0f18));
    env.hemi.intensity = def.hemi.i * (0.7 + 0.3 * sm(0, 0.5, e)) * (1 - night) + 0.85 * night;
    const fog = lerpC(def.fog.color, 0xb07a5a, warm * 0.55, 0x090e1a); env.scene.fog.color.copy(fog); env.scene.background = fog.clone();
    env.scene.fog.density = def.fog.density * (1 + 0.5 * night);
    const u = env.sky.material.uniforms;
    u.top.value.copy(lerpC(def.sky.top, 0x4a5a90, warm * 0.5, 0x03060f)); u.hor.value.copy(lerpC(def.sky.horizon, 0xf09050, warm * 0.8, 0x141d36)); u.sunCol.value.copy(env.sun.color);
    if (u.night) u.night.value = night;
    (env.vmL || []).forEach((l, i) => { l.intensity = (i ? 0.8 : 0.9) * (1 - 0.5 * night); });
  };
})();
