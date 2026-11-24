// Passos com gravações reais por terreno/piso (BC.STEP_DATA em sounds6.js). Sem gravações, usa a síntese antiga.
(function () {
  const BC = window.BC, A = BC.Audio, _init = A.init, _step = A.step;
  const bufs = {}, lastIdx = {};
  A.init = function () {
    const had = !!A.ctx; _init();
    if (had || !A.ctx || !BC.STEP_DATA) return;
    for (const k in BC.STEP_DATA) {
      bufs[k] = [];
      for (const b64 of BC.STEP_DATA[k]) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); A.ctx.decodeAudioData(u.buffer).then((b) => bufs[k].push(b)).catch(() => { }); }
    }
  };
  A.stepLoaded = () => Object.keys(bufs).map((k) => k + ':' + bufs[k].length).join(' ');
  const ALIAS = { rock: 'gravel', dirt: 'dirt', brick: 'concrete', crate: 'wood', sandbag: 'sand' };
  A.step = function (surf, vol, dist, pan, rate) {
    const key = ALIAS[surf] || surf; let list = bufs[key]; if (!list || !list.length) list = bufs[key === 'mud' ? 'water' : key === 'dirt' ? 'grass' : key === 'gravel' ? 'dirt' : key];
    if (!A.ctx || !list || !list.length) return _step(surf, vol, dist, pan);
    const att = dist ? 1 / (1 + dist * 0.12) : 1; if (att < 0.06) return;
    const C = A.ctx; let i = (Math.random() * list.length) | 0; if (list.length > 1 && i === lastIdx[key]) i = (i + 1) % list.length; lastIdx[key] = i;
    const src = C.createBufferSource(); src.buffer = list[i]; src.playbackRate.value = (rate || 1) * (0.93 + Math.random() * 0.14);
    const g = C.createGain(); g.gain.value = Math.min(1.6, vol * att * 1.15); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(1400, 14000 / (1 + (dist || 0) / 14));
    src.connect(g); g.connect(lp); let last = lp;
    if (C.createStereoPanner) { const sp = C.createStereoPanner(); sp.pan.value = BC.clamp(pan || 0, -1, 1); last.connect(sp); last = sp; }
    last.connect(A.master); src.start();
  };
  // tipo de piso sob um ator: topo de caixa (madeira, concreto, metal…) ou terreno do mapa
  const TAGMAP = { wood: 'wood', metal: 'metal', concrete: 'concrete', sand: 'sand', rock: 'gravel', brick: 'concrete' };
  BC.stepSurf = function (a, inWater) {
    const w = BC.G.world; if (!w) return 'dirt';
    if (inWater) return 'water';
    w.groundAt(a.x, a.z, a.y, 0.6);
    if (w._gBox && w._gTag) return TAGMAP[w._gTag] || 'concrete';
    if (w.heightAt(a.x, a.z) < w.waterY + 0.1) return 'water';
    return w.surf === 'rock' ? 'gravel' : w.surf;
  };
})();
