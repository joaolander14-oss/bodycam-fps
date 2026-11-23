// Explosões e granadas com gravações reais (CC0, sounds5.js) em camadas com a síntese: estrondo próximo/distante, flashbang e estouro da fumaça.
(function () {
  const BC = window.BC, A = BC.Audio, _init = A.init, _boom = A.boom, _bang = A.bang, _pop = A.pop;
  const bufs = { near: [], far: [], flash: [] };
  A.init = function () {
    const had = !!A.ctx; _init();
    if (had || !A.ctx || !BC.BOOM_DATA) return;
    for (const d of BC.BOOM_DATA) { const bin = atob(d.b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); A.ctx.decodeAudioData(u.buffer).then((b) => bufs[d.k].push(b)).catch(() => { }); }
  };
  A.boomLoaded = () => bufs.near.length + ':' + bufs.far.length + ':' + bufs.flash.length;
  function play(list, dist, pan, rate, gain, hp) {
    if (!A.ctx || !list.length) return; const C = A.ctx, t = C.currentTime + Math.min(1.4, dist / 343), src = C.createBufferSource(); src.buffer = list[(Math.random() * list.length) | 0]; src.playbackRate.value = rate * (0.96 + Math.random() * 0.08);
    const g = C.createGain(); g.gain.value = gain / (1 + dist * 0.012); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(1200, 16000 / (1 + dist / 45)); src.connect(g);
    let last = g; if (hp) { const h = C.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; last.connect(h); last = h; } last.connect(lp); last = lp;
    if (C.createStereoPanner) { const sp = C.createStereoPanner(); sp.pan.value = BC.clamp(pan || 0, -1, 1); last.connect(sp); last = sp; } last.connect(A.master);
    if (A.rev2) { const w = C.createGain(); w.gain.value = Math.min(0.8, 0.25 + dist / 120); last.connect(w); w.connect(A.rev2); }
    src.start(t);
  }
  A.boom = function (dist, pan) { _boom(dist, pan); if (dist < 55) play(bufs.near, dist, pan, 0.95, 1.5); if (dist > 22) play(bufs.far, dist, pan, 1, 1.0); };
  A.bang = function (dist, pan) { _bang(dist, pan); play(bufs.flash, dist, pan, 1.2, 1.4, 600); };
  A.pop = function (dist, pan) { _pop(dist, pan); play(bufs.flash, dist, pan, 1.7, 0.45, 1500); };
})();
