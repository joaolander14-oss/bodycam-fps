// Áudio 100% sintetizado (WebAudio): tiros por calibre, passos, ambiente por mapa.
(function () {
  const BC = window.BC;
  const A = BC.Audio = { ctx: null, master: null, rev: null, revGain: null, noiseBuf: null, vol: 0.8 };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const C = A.ctx = new (window.AudioContext || window.webkitAudioContext)();
    A.master = C.createGain(); A.master.gain.value = A.vol;
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    A.master.connect(comp); comp.connect(C.destination);
    const len = C.sampleRate * 2, nb = C.createBuffer(1, len, C.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = nb;
    // reverb por convolução (ruído com decaimento)
    const rl = C.sampleRate * 1.8, rb = C.createBuffer(2, rl, C.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const rd = rb.getChannelData(ch); for (let i = 0; i < rl; i++) rd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
    A.rev = C.createConvolver(); A.rev.buffer = rb;
    A.revGain = C.createGain(); A.revGain.gain.value = 0.25;
    A.rev.connect(A.revGain); A.revGain.connect(A.master);
  };
  A.setVolume = (v) => { A.vol = v; if (A.master) A.master.gain.value = v; };

  function out(pan, wet) {
    const C = A.ctx, g = C.createGain(); let node = g;
    if (C.createStereoPanner && pan) { const p = C.createStereoPanner(); p.pan.value = BC.clamp(pan, -1, 1); g.connect(p); node = p; }
    node.connect(A.master);
    if (wet) { const w = C.createGain(); w.gain.value = wet; node.connect(w); w.connect(A.rev); }
    return g;
  }
  function noise(t0, dur, freq, q, type, vol, dest, fEnd) {
    const C = A.ctx, s = C.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    const f = C.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); if (fEnd) f.frequency.exponentialRampToValueAtTime(fEnd, t0 + dur); f.Q.value = q;
    const g = C.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  function tone(t0, dur, f0, f1, vol, dest, type) {
    const C = A.ctx, o = C.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = C.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  // perfil de cada disparo: estalo (crack), estrondo (boom), duração e cauda de eco
  const SHOT = {
    ak: { crack: 3200, boom: 95, dur: 0.22, vol: 1.0, wet: 0.5 },
    m4: { crack: 4600, boom: 120, dur: 0.17, vol: 0.9, wet: 0.45 },
    pistol: { crack: 2600, boom: 160, dur: 0.12, vol: 0.7, wet: 0.3 },
    shotgun: { crack: 1800, boom: 70, dur: 0.42, vol: 1.25, wet: 0.6 },
    svd: { crack: 2400, boom: 55, dur: 0.55, vol: 1.3, wet: 0.8 }
  };
  // dist em metros, pan -1..1 ; own = tiro do jogador (sem atenuação)
  A.shot = function (kind, dist, pan, own) {
    if (!A.ctx) return;
    const p = SHOT[kind] || SHOT.ak, C = A.ctx, t = C.currentTime;
    const att = own ? 1 : 1 / (1 + dist * 0.035);
    if (att < 0.04) return;
    const o = out(own ? 0 : pan, p.wet * (own ? 1 : 1.3));
    const lp = own ? 1 : Math.max(0.25, 1 - dist / 220);
    noise(t, p.dur * 0.55, p.crack * lp, 0.8, 'bandpass', 0.9 * p.vol * att, o);
    noise(t, p.dur, 900 * lp + 200, 0.6, 'lowpass', 0.8 * p.vol * att, o, 200);
    tone(t, p.dur * 0.9, p.boom * 2.4, p.boom * 0.45, 0.95 * p.vol * att, o);
  };
  A.click = (v) => { if (!A.ctx) return; const t = A.ctx.currentTime, o = out(0, 0); noise(t, 0.03, 3500, 3, 'bandpass', v || 0.4, o); };
  A.metal = (v, f) => { if (!A.ctx) return; const t = A.ctx.currentTime, o = out(0, 0.1); noise(t, 0.06, f || 2500, 6, 'bandpass', v || 0.5, o); tone(t, 0.08, (f || 2500) * 0.6, (f || 2500) * 0.3, 0.1, o, 'triangle'); };
  A.reload = (phase) => { // 0=remove, 1=insere, 2=ferrolho
    if (!A.ctx) return;
    if (phase === 0) A.metal(0.5, 1800); else if (phase === 1) { A.metal(0.7, 1500); A.click(0.6); } else A.metal(0.9, 2800);
  };
  A.pump = () => { if (!A.ctx) return; A.metal(0.8, 1400); setTimeout(() => A.metal(0.9, 1900), 170); };
  A.shell = () => { if (!A.ctx) return; const t = A.ctx.currentTime, o = out(0, 0.05); tone(t, 0.07, 4200, 2600, 0.12, o, 'triangle'); };
  A.step = function (surf, vol, dist, pan) {
    if (!A.ctx) return;
    const t = A.ctx.currentTime, att = dist ? 1 / (1 + dist * 0.12) : 1;
    if (att < 0.08) return;
    const o = out(pan || 0, 0.05);
    const P = { snow: [600, 0.5], mud: [300, 0.8], water: [900, 0.9], sand: [900, 0.4], concrete: [1800, 0.6], grass: [700, 0.45], dirt: [500, 0.55], wood: [1200, 0.7] }[surf] || [700, 0.5];
    noise(t, 0.09, P[0], 1.2, 'bandpass', vol * P[1] * att * 0.6, o);
  };
  A.hit = (head) => { if (!A.ctx) return; const t = A.ctx.currentTime, o = out(0, 0); tone(t, 0.07, head ? 1900 : 1200, head ? 1500 : 900, head ? 0.35 : 0.25, o, 'square'); };
  A.hurt = () => { if (!A.ctx) return; const t = A.ctx.currentTime, o = out(0, 0.1); noise(t, 0.15, 400, 1, 'lowpass', 0.8, o); tone(t, 0.18, 180, 60, 0.6, o); };
  A.impact = function (dist, pan, kind) { // zunido/ricochete
    if (!A.ctx) return; const t = A.ctx.currentTime, att = 1 / (1 + dist * 0.2); if (att < 0.1) return;
    const o = out(pan, 0.1);
    if (kind === 'metal') { tone(t, 0.25, 3000, 1800, 0.12 * att, o, 'triangle'); noise(t, 0.05, 4000, 4, 'bandpass', 0.2 * att, o); }
    else noise(t, 0.06, 900, 1, 'bandpass', 0.2 * att, o);
  };
  A.crack = function (pan) { // projétil passando perto
    if (!A.ctx) return; const t = A.ctx.currentTime, o = out(pan, 0); noise(t, 0.09, 3500, 2, 'bandpass', 0.35, o, 1200);
  };
  A.beep = (f) => { if (!A.ctx) return; const t = A.ctx.currentTime, o = out(0, 0); tone(t, 0.12, f || 1000, f || 1000, 0.15, o, 'square'); };
  A.death = () => { if (!A.ctx) return; const t = A.ctx.currentTime, o = out(0, 0.3); tone(t, 1.2, 600, 60, 0.4, o, 'sawtooth'); noise(t, 1.2, 2000, 1, 'lowpass', 0.5, o, 80); };

  // ambiente por mapa: ruído filtrado (vento/chuva) + sons ocasionais
  let ambNodes = null, ambTimer = 0;
  A.ambient = function (kind) {
    A.stopAmbient(); if (!A.ctx) return;
    const C = A.ctx, s = C.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    const f = C.createBiquadFilter(); f.type = 'lowpass';
    const prof = { snow: [500, 0.2], forest: [800, 0.09], trench: [700, 0.16], city: [400, 0.07], swamp: [1100, 0.1], desert: [650, 0.16] }[kind] || [600, 0.1];
    f.frequency.value = prof[0]; const g = C.createGain(); g.gain.value = prof[1];
    const lfo = C.createOscillator(); lfo.frequency.value = 0.12; const lg = C.createGain(); lg.gain.value = prof[0] * 0.4;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    s.connect(f); f.connect(g); g.connect(A.master); s.start();
    ambNodes = { s, lfo, g, kind };
  };
  A.stopAmbient = function () { if (ambNodes) { try { ambNodes.s.stop(); ambNodes.lfo.stop(); } catch (e) { } ambNodes = null; } };
  A.ambientTick = function (dt) { // sons pontuais do ambiente
    if (!A.ctx || !ambNodes) return;
    ambTimer -= dt; if (ambTimer > 0) return;
    ambTimer = 2 + Math.random() * 5; const k = ambNodes.kind, t = A.ctx.currentTime, o = out((Math.random() - 0.5) * 1.6, 0.4);
    if (k === 'forest' && Math.random() < 0.7) { for (let i = 0; i < 3; i++) tone(t + i * 0.12, 0.09, 3200 + Math.random() * 800, 2400, 0.06, o); }
    else if (k === 'swamp') { tone(t, 0.14, 180, 120, 0.12, o, 'triangle'); tone(t + 0.18, 0.12, 200, 130, 0.1, o, 'triangle'); }
    else if (k === 'trench' || k === 'city') { tone(t, 1.0, 70, 30, 0.35, o); noise(t, 0.9, 400, 1, 'lowpass', 0.4, o, 60); }
  };
})();

// ======================= Tiros realistas (síntese em camadas) =======================
// Estalo supersônico + sopro da boca do cano + estrondo grave + eco/reverberação + atraso do som pela distância (343 m/s).
(function () {
  const BC = window.BC, A = BC.Audio;
  const _init = A.init;
  A.init = function () {
    const had = !!A.ctx; _init();
    if (had || !A.ctx) return;
    const C = A.ctx;
    // reverb longa (ambiente aberto: cauda grave e escura)
    const len = C.sampleRate * 3.2, ib = C.createBuffer(2, len, C.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ib.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const e = Math.pow(1 - i / len, 3.2); lp += ((Math.random() * 2 - 1) - lp) * (0.35 - 0.3 * (i / len)); d[i] = lp * e * 2.2; } }
    A.rev2 = C.createConvolver(); A.rev2.buffer = ib; A.rev2g = C.createGain(); A.rev2g.gain.value = 1; A.rev2.connect(A.rev2g); A.rev2g.connect(A.master);
    // eco (rebatida em árvores/prédios ao longe)
    A.echoIn = C.createGain(); const dl = C.createDelay(1.5); dl.delayTime.value = 0.31; const fb = C.createGain(); fb.gain.value = 0.32;
    const lpf = C.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 2200;
    A.echoIn.connect(dl); dl.connect(lpf); lpf.connect(fb); fb.connect(dl); lpf.connect(A.master);
    const n = 2048, curve = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n / 2) - 1; curve[i] = Math.tanh(x * 3.2); }
    A.sat = C.createWaveShaper(); A.sat.curve = curve;
  };
  const PROF = {
    ak: { crack: 2600, cd: 0.045, blast: 2400, bd: 0.2, b0: 150, b1: 42, bm: 0.16, gain: 1.0, slap: 0.45, tail: 0.7, ss: true },
    m4: { crack: 4000, cd: 0.038, blast: 2800, bd: 0.14, b0: 175, b1: 55, bm: 0.12, gain: 0.9, slap: 0.4, tail: 0.6, ss: true },
    pistol: { crack: 3300, cd: 0.028, blast: 2000, bd: 0.09, b0: 240, b1: 95, bm: 0.07, gain: 0.6, slap: 0.3, tail: 0.4, ss: false },
    shotgun: { crack: 1500, cd: 0.06, blast: 1500, bd: 0.32, b0: 95, b1: 28, bm: 0.3, gain: 1.35, slap: 0.5, tail: 0.9, ss: false },
    svd: { crack: 2200, cd: 0.07, blast: 1300, bd: 0.4, b0: 85, b1: 30, bm: 0.34, gain: 1.4, slap: 0.65, tail: 1.1, ss: true }
  };
  function nsrc(t0, dur) { const C = A.ctx, s = C.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true; s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05); return s; }
  function env(g, t0, peak, atk, dur) { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + atk); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
  A.shot = function (kind, dist, pan, own) {
    if (!A.ctx || !A.rev2) return;
    const p = PROF[kind] || PROF.ak, C = A.ctx;
    const delay = own ? 0 : Math.min(1.2, dist / 343), t = C.currentTime + delay;
    const att = own ? 1 : 1 / (1 + dist * 0.022); if (att < 0.03) return;
    const air = own ? 18000 : Math.max(900, 16000 / (1 + dist / 45));      // o ar absorve os agudos com a distância
    const out = C.createGain(); out.gain.value = p.gain * att;
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = air; lp.Q.value = 0.4;
    out.connect(lp); let last = lp;
    if (C.createStereoPanner && !own) { const sp = C.createStereoPanner(); sp.pan.value = BC.clamp(pan, -1, 1); lp.connect(sp); last = sp; }
    last.connect(A.master);
    const wr = C.createGain(); wr.gain.value = (own ? 0.5 : 0.9) * p.tail; last.connect(wr); wr.connect(A.rev2);
    const we = C.createGain(); we.gain.value = (own ? 0.45 : 0.7) * p.slap; last.connect(we); we.connect(A.echoIn);
    // 1) estalo seco (explosão dos gases + onda de choque)
    let s = nsrc(t, p.cd), hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; let bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = p.crack; bp.Q.value = 0.6;
    let g = C.createGain(); env(g, t, 1.5, 0.0006, p.cd); s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out);
    // 2) sopro da boca do cano (saturado, filtro descendo)
    s = nsrc(t, p.bd); const lp2 = C.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.setValueAtTime(p.blast, t); lp2.frequency.exponentialRampToValueAtTime(p.blast * 0.12, t + p.bd);
    g = C.createGain(); env(g, t, 1.2, 0.001, p.bd); const sat = C.createWaveShaper(); sat.curve = A.sat.curve; s.connect(lp2); lp2.connect(sat); sat.connect(g); g.connect(out);
    // 3) estrondo grave (soco no peito)
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(p.b0, t); o.frequency.exponentialRampToValueAtTime(p.b1, t + p.bm);
    g = C.createGain(); env(g, t, 1.3, 0.002, p.bm); o.connect(g); g.connect(out); o.start(t); o.stop(t + p.bm + 0.05);
    const o2 = C.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(p.b0 * 2.1, t); o2.frequency.exponentialRampToValueAtTime(p.b1 * 2, t + p.bm * 0.6);
    g = C.createGain(); env(g, t, 0.5, 0.001, p.bm * 0.6); o2.connect(g); g.connect(out); o2.start(t); o2.stop(t + p.bm + 0.05);
    // 4) estalo supersônico atrasado (projétil passando) — só para tiros ouvidos de longe
    if (p.ss && !own && dist > 25) { const tt = t - Math.min(delay * 0.6, 0.25); s = nsrc(tt, 0.03); const b2 = C.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = 3800; g = C.createGain(); env(g, tt, 0.5, 0.0005, 0.025); s.connect(b2); b2.connect(g); g.connect(out); }
    // 5) cápsula caindo no chão (tilintar), só tiros do jogador
    if (own && kind !== 'shotgun') { const tt = t + 0.3 + Math.random() * 0.25; for (let i = 0; i < 2; i++) { const oo = C.createOscillator(); oo.type = 'triangle'; oo.frequency.value = 3600 + Math.random() * 1400; const gg = C.createGain(); env(gg, tt + i * 0.07, 0.07, 0.001, 0.12); oo.connect(gg); gg.connect(A.master); oo.start(tt + i * 0.07); oo.stop(tt + i * 0.07 + 0.15); } }
  };
})();

// ======================= Tiros reais embutidos (sounds.js) + processamento de "pegada" =======================
(function () {
  const BC = window.BC, A = BC.Audio, synthShot = A.shot, _init = A.init;
  const real = {}; let count = 0, last = {};
  const ALIAS = { p9: 'pistol', sg: 'shotgun' };
  const CFG = { p22: { g: 0.7, dur: 1.1, r: 1 }, ppsh: { g: 0.85, dur: 1.3, r: 1 }, lever: { g: 1.0, dur: 1.5, r: 1 }, p380: { g: 0.7, dur: 1.1, r: 1 }, p45: { g: 0.8, dur: 1.3, r: 1 }, rev: { g: 0.85, dur: 1.3, r: 1 }, smg: { g: 0.8, dur: 1.3, r: 1 }, bolt: { g: 1.2, dur: 1.6, r: 1 }, ak: { g: 0.95, dur: 1.45, r: 0.99 }, m4: { g: 0.8, dur: 1.35, r: 1.05 }, pistol: { g: 0.62, dur: 1.2, r: 1.0 }, shotgun: { g: 1.35, dur: 1.5, r: 0.96 }, svd: { g: 1.45, dur: 1.55, r: 0.93 } };
  function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  A.init = function () {
    const had = !!A.ctx; _init();
    if (had || !A.ctx || !BC.SOUND_DATA) return;
    const C = A.ctx;
    // barramento dos tiros: reforça graves e presença, depois compressão rápida (soco)
    const ls = C.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 160; ls.gain.value = 5;
    const pk = C.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 2800; pk.Q.value = 0.8; pk.gain.value = 2.5;
    const cp = C.createDynamicsCompressor(); cp.threshold.value = -14; cp.knee.value = 8; cp.ratio.value = 4; cp.attack.value = 0.001; cp.release.value = 0.14;
    ls.connect(pk); pk.connect(cp); cp.connect(A.master); A.gunBus = ls;
    for (const k in BC.SOUND_DATA) { real[k] = []; BC.SOUND_DATA[k].forEach((s) => C.decodeAudioData(b64(s)).then((d) => { real[k].push(d); count++; }).catch(() => { })); }
  };
  A.soundCount = () => count;
  A.realLoaded = () => Object.keys(real).map((k) => k + ':' + real[k].length).join(' ');
  A.shot = function (kind, dist, pan, own, rate, sup) {
    kind = ALIAS[kind] || kind; const list = real[kind];
    if (!A.ctx || !A.gunBus || !list || !list.length) return sup ? undefined : synthShot(kind, dist, pan, own);
    const C = A.ctx, cf = CFG[kind] || CFG.ak, delay = own ? 0 : Math.min(1.2, dist / 343), t = C.currentTime + delay;
    const att = (own ? 1 : 1 / (1 + dist * 0.025)) * (sup ? 0.3 : 1); if (att < 0.03) return;
    let i = (Math.random() * list.length) | 0; if (list.length > 1 && i === last[kind]) i = (i + 1) % list.length; last[kind] = i;
    const src = C.createBufferSource(); src.buffer = list[i]; src.playbackRate.value = cf.r * (rate || 1) * (0.985 + Math.random() * 0.03);
    const g = C.createGain(); g.gain.setValueAtTime(cf.g * att, t); g.gain.setValueAtTime(cf.g * att, t + cf.dur * 0.55); g.gain.linearRampToValueAtTime(0, t + cf.dur);
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = sup ? 2600 : own ? 20000 : Math.max(1400, 18000 / (1 + dist / 40)); lp.Q.value = 0.3;
    src.connect(g); g.connect(lp); let last2 = lp;
    if (C.createStereoPanner && !own) { const sp = C.createStereoPanner(); sp.pan.value = BC.clamp(pan, -1, 1); lp.connect(sp); last2 = sp; }
    last2.connect(A.gunBus);
    if (A.rev2 && !own) { const w = C.createGain(); w.gain.value = Math.min(0.6, dist / 150); last2.connect(w); w.connect(A.rev2); }
    src.start(t); src.stop(t + cf.dur + 0.05);
  };
})();


// ======================= Granadas: explosão, estampido do flashbang, estouro da fumaça e zumbido nos ouvidos =======================
(function () {
  const BC = window.BC, A = BC.Audio;
  function nz(t0, dur, f0, f1, q, type, vol, dest) { const C = A.ctx, s = C.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true; const f = C.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); f.Q.value = q; const g = C.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05); }
  function bus(dist, pan, wet) { const C = A.ctx, g = C.createGain(); g.gain.value = 1 / (1 + dist * 0.015); const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(1500, 16000 / (1 + dist / 50)); g.connect(lp); let last = lp; if (C.createStereoPanner) { const sp = C.createStereoPanner(); sp.pan.value = pan || 0; lp.connect(sp); last = sp; } last.connect(A.master); if (A.rev2) { const w = C.createGain(); w.gain.value = wet; last.connect(w); w.connect(A.rev2); } if (A.echoIn) { const e = C.createGain(); e.gain.value = wet * 0.6; last.connect(e); e.connect(A.echoIn); } return g; }
  A.boom = function (dist, pan) {
    if (!A.ctx) return; const C = A.ctx, t = C.currentTime + Math.min(1.4, dist / 343), o = bus(dist, pan, 1.2);
    nz(t, 1.3, 3200, 50, 0.7, 'lowpass', 2.2, o); nz(t, 0.25, 6000, 900, 0.8, 'highpass', 1.2, o);
    const os = C.createOscillator(); os.type = 'sine'; os.frequency.setValueAtTime(75, t); os.frequency.exponentialRampToValueAtTime(22, t + 1.1); const g = C.createGain(); g.gain.setValueAtTime(2.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2); os.connect(g); g.connect(o); os.start(t); os.stop(t + 1.3);
    for (let i = 0; i < 6; i++) nz(t + 0.05 + Math.random() * 0.5, 0.05, 2500, 700, 1, 'bandpass', 0.5, o); // estilhaços
    A.shot && A.shot('svd', dist, pan, false, 0.42);
  };
  A.bang = function (dist, pan) { if (!A.ctx) return; const C = A.ctx, t = C.currentTime + Math.min(1.4, dist / 343), o = bus(dist, pan, 0.8); nz(t, 0.28, 8000, 1200, 0.6, 'highpass', 2.2, o); nz(t, 0.5, 3000, 200, 0.7, 'lowpass', 1.6, o); A.shot && A.shot('shotgun', dist, pan, false, 1.5); };
  A.pop = function (dist, pan) { if (!A.ctx) return; const C = A.ctx, t = C.currentTime + Math.min(1.4, dist / 343), o = bus(dist, pan, 0.4); nz(t, 0.12, 2500, 500, 1, 'bandpass', 1.0, o); nz(t + 0.05, 5, 1800, 900, 0.4, 'bandpass', 0.35, o); };
  A.ring = function (sec) {
    if (!A.ctx) return; const C = A.ctx, t = C.currentTime, o = C.createOscillator(); o.type = 'sine'; o.frequency.value = 3900; const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + sec * 1.2 + 0.4); o.connect(g); g.connect(C.destination); o.start(t); o.stop(t + sec * 1.2 + 0.5);
    if (A.master) { A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(A.master.gain.value, t); A.master.gain.linearRampToValueAtTime(A.vol * 0.22, t + 0.05); A.master.gain.linearRampToValueAtTime(A.vol, t + 0.6 + sec * 0.9); }
  };
})();
