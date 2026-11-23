// roupa/equipamento ao agachar e deitar; corpo caindo no chão
(function () {
  const BC = window.BC, A = BC.Audio;
  A.cloth = function (v) {
    if (!A.ctx) return; const C = A.ctx, t = C.currentTime, s = C.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true; const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.28); f.Q.value = 0.7;
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35 * (v || 0.5), t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random()); s.stop(t + 0.35);
    const o = C.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(3200, t + 0.12); const g2 = C.createGain(); g2.gain.setValueAtTime(0.03, t + 0.12); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g2); g2.connect(A.master); o.start(t + 0.12); o.stop(t + 0.22);
  };
  A.thud = function (dist, pan) {
    if (!A.ctx || dist > 70) return; const C = A.ctx, t = C.currentTime, att = 1 / (1 + dist * 0.06), g = C.createGain(); g.gain.value = att; let last = g; if (C.createStereoPanner) { const sp = C.createStereoPanner(); sp.pan.value = pan || 0; g.connect(sp); last = sp; } last.connect(A.master);
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); const og = C.createGain(); og.gain.setValueAtTime(0.7, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.25);
    const s = C.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true; const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const ng = C.createGain(); ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); s.connect(f); f.connect(ng); ng.connect(g); s.start(t, Math.random()); s.stop(t + 0.3);
    for (let i = 0; i < 3; i++) setTimeout(() => A.metal && A.metal(0.15, 1800 + Math.random() * 1500), 40 + i * 55);
  };
})();
