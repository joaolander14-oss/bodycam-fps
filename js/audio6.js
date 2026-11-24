// Granadas com gravações reais (BC.GREN_DATA em sounds7.js): pino, alavanca, arremesso, quique, fumaça, fragmentação e flashbang.
(function () {
  const BC = window.BC, A = BC.Audio, _init = A.init, _boom = A.boom, _bang = A.bang, _pop = A.pop;
  const bufs = {};
  A.init = function () {
    const had = !!A.ctx; _init();
    if (had || !A.ctx || !BC.GREN_DATA) return;
    for (const k in BC.GREN_DATA) { bufs[k] = []; for (const b64 of BC.GREN_DATA[k]) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); A.ctx.decodeAudioData(u.buffer).then((b) => bufs[k].push(b)).catch(() => { }); } }
  };
  A.grenLoaded = () => Object.keys(bufs).map((k) => k + ':' + bufs[k].length).join(' ');
  function play(kind, dist, pan, gain, rate, idx) {
    const list = bufs[kind]; if (!A.ctx || !list || !list.length) return false; const C = A.ctx, d = dist || 0;
    const src = C.createBufferSource(); src.buffer = list[idx !== undefined ? idx % list.length : (Math.random() * list.length) | 0]; src.playbackRate.value = (rate || 1) * (0.96 + Math.random() * 0.08);
    const g = C.createGain(); g.gain.value = (gain || 1) / (1 + d * 0.03); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(1500, 16000 / (1 + d / 40)); src.connect(g); g.connect(lp); let last = lp;
    if (C.createStereoPanner) { const sp = C.createStereoPanner(); sp.pan.value = BC.clamp(pan || 0, -1, 1); last.connect(sp); last = sp; } last.connect(A.master);
    src.start(C.currentTime + Math.min(1.4, d / 343)); return true;
  }
  A.gren = function (kind, dist, pan, gain, rate, idx) { if (!play(kind, dist, pan, gain, rate, idx) && A.metal) A.metal(0.4, kind === 'throw' ? 900 : 2200); };
  A.boom = function (dist, pan) { _boom(dist, pan); if (dist < 70) play('frag', dist, pan, 1.5, 1, dist > 25 ? 1 : 0); if (dist > 30) play('frag', dist, pan, 1.0, 0.8, 3); };
  A.bang = function (dist, pan) { _bang(dist, pan); play('flash', dist, pan, 1.5, 1, 0); if (dist < 12) play('flash', dist, pan, 0.6, 1, 1); };
  A.pop = function (dist, pan) { _pop(dist, pan); play('smoke', dist, pan, 0.9, 1); };
})();
