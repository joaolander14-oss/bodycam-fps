// Atribui as gravações reais novas (sounds8.js) às armas certas: LMG real, CZ-52/TT-33, pólvora negra, .22 Magnum (calibres pequenos de alta velocidade), arma de fogo de ferrolho pesada.
(function () {
  const BC = window.BC; if (!BC.WEAPONS) return;
  const LMG_RATE = { '556': 1.1, '762x51': 0.95, '762x54r': 0.95, '762x39': 1.0, '50bmg': 0.7, '300blk': 1.05 };
  for (const w of BC.WEAPONS) {
    const rate = (k, r) => { w.snd = k; w.sndRate = r; };
    if (w.cls === 'lmg') rate('lmg', LMG_RATE[w.calKey || w.cal] || 1);
    else if (w.cal === '762x25' || w.calKey === '762x25') rate('cz52', 1.0);
    else if (w.cal === '45colt' || w.calKey === '45colt') rate('bpowder', 1.05);
    else if (['57x28', '46x30', '32acp'].includes(w.calKey || w.cal)) rate('p22m', w.calKey === '46x30' ? 0.95 : w.calKey === '32acp' ? 1.15 : 0.9);
    else if (['792', '3006', '338lm'].includes(w.calKey || w.cal)) rate('unk', w.calKey === '338lm' ? 0.82 : 0.9);
  }
  BC.WMAP = {}; BC.WEAPONS.forEach((w) => { BC.WMAP[w.id] = w; });
})();
