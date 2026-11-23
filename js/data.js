// Dados: armas (calibres reais), times/uniformes, dificuldade.
(function () {
  const BC = window.BC;

  // Padrão de recuo (graus): sobe e deriva de lado — aprendível, não aleatório.
  function pat(n, up, yawAmp, freq, drift) {
    const a = [];
    for (let i = 0; i < n; i++) {
      const p = up * (1.15 - 0.45 * (1 - Math.exp(-i / 7)));
      const y = yawAmp * Math.sin(i * freq) + (drift || 0) * Math.min(i, 12) * 0.08;
      a.push([p, y]);
    }
    return a;
  }

  // dmg = dano por projétil no corpo (vida = 100). Cabeça x3, pernas x0.75.
  BC.WEAPONS = [
    {
      id: 'ak74', name: 'AK-47', type: 'Fuzil de assalto', origin: 'URSS / Rússia',
      cal: '7,62×39 mm', v0: 715, mass: 4.3, // m/s e kg
      rpm: 600, auto: true, mag: 30, reserve: 150, reload: 2.7, reloadEmpty: 3.3,
      pellets: 1, dmg: 58, headMul: 3, legMul: 0.6, fullRange: 40, maxRange: 120, minMul: 0.92,
      spreadHip: 1.5, spreadAds: 0.12, spreadShot: 0.07, spreadMax: 1.6, spreadMove: 0.9,
      recoil: pat(40, 1.05, 0.38, 0.55, 0.5), recoilKick: 0.045, adsZoom: 1.25, snd: 'ak', ads: [0, -0.01, -0.34],
      hip: [0.11, -0.15, -0.58]
    },
    {
      id: 'm4a1', name: 'M4A1', type: 'Carabina de assalto', origin: 'EUA',
      cal: '5,56×45 mm NATO', v0: 880, mass: 3.1,
      rpm: 800, auto: true, mag: 30, reserve: 150, reload: 2.3, reloadEmpty: 2.9,
      pellets: 1, dmg: 52, headMul: 3, legMul: 0.6, fullRange: 42, maxRange: 130, minMul: 0.92,
      spreadHip: 1.3, spreadAds: 0.08, spreadShot: 0.05, spreadMax: 1.2, spreadMove: 0.8,
      recoil: pat(40, 0.68, 0.22, 0.7, -0.3), recoilKick: 0.032, adsZoom: 1.25, snd: 'm4', ads: [0, -0.01, -0.34],
      hip: [0.11, -0.15, -0.42]
    },
    {
      id: 'glock17', name: 'Glock 17', type: 'Pistola', origin: 'Áustria',
      cal: '9×19 mm Parabellum', v0: 375, mass: 0.63,
      rpm: 400, auto: false, mag: 17, reserve: 68, reload: 1.6, reloadEmpty: 2.0,
      pellets: 1, dmg: 50, headMul: 3, legMul: 0.6, fullRange: 20, maxRange: 60, minMul: 0.86,
      spreadHip: 1.0, spreadAds: 0.1, spreadShot: 0.18, spreadMax: 1.2, spreadMove: 0.7,
      recoil: pat(20, 1.5, 0.3, 1.1, 0), recoilKick: 0.05, adsZoom: 1.15, snd: 'pistol', ads: [0, -0.007, -0.3],
      hip: [0.07, -0.07, -0.32]
    },
    {
      id: 'rem870', name: 'Remington 870', type: 'Espingarda pump', origin: 'EUA',
      cal: 'Calibre 12 (12/70)', v0: 400, mass: 3.6,
      rpm: 70, auto: false, mag: 7, reserve: 28, reload: 0.62, reloadEmpty: 0.62, shellReload: true,
      pellets: 9, note: 'chumbo grosso 00 (9 esferas de 8,4 mm)', dmg: 13, headMul: 2, legMul: 0.8, fullRange: 9, maxRange: 50, minMul: 0.15,
      spreadHip: 2.4, spreadAds: 1.9, spreadShot: 0, spreadMax: 2.4, spreadMove: 0.6, pelletCone: 1.9,
      recoil: pat(8, 4.2, 0.6, 1.3, 0), recoilKick: 0.11, adsZoom: 1.15, snd: 'shotgun', ads: [0, -0.012, -0.32],
      hip: [0.11, -0.15, -0.42]
    },
    {
      id: 'svd', name: 'SVD Dragunov', type: 'Fuzil de precisão', origin: 'URSS / Rússia',
      cal: '7,62×54 mmR', v0: 830, mass: 4.3,
      rpm: 180, auto: false, mag: 10, reserve: 60, reload: 3.0, reloadEmpty: 3.6,
      pellets: 1, dmg: 100, headMul: 3, legMul: 0.7, fullRange: 150, maxRange: 400, minMul: 0.95,
      spreadHip: 2.2, spreadAds: 0.02, spreadShot: 0.2, spreadMax: 1.4, spreadMove: 1.6,
      recoil: pat(10, 3.0, 0.35, 0.9, 0), recoilKick: 0.085, adsZoom: 3.6, scope: true, snd: 'svd', ads: [0, 0, -0.1],
      hip: [0.12, -0.15, -0.5]
    }
  ];
  BC.WMAP = {}; BC.WEAPONS.forEach((w) => { BC.WMAP[w.id] = w; });

  // Dano por distância: cheio até fullRange, cai linear até minMul em maxRange.
  BC.falloff = function (w, dist) {
    if (dist <= w.fullRange) return 1;
    if (dist >= w.maxRange) return w.minMul;
    return 1 - (1 - w.minMul) * (dist - w.fullRange) / (w.maxRange - w.fullRange);
  };

  // Escalonador de disparos: nunca joga fora o resto do tempo (estável em qualquer FPS).
  BC.FireClock = function (rpm) { this.interval = 60 / rpm; this.next = 0; this.shots = 0; };
  BC.FireClock.prototype.step = function (now, held, canFire, onShot) {
    if (!held || !canFire()) return;
    if (this.next < now - this.interval) this.next = now; // não acumula tiros ociosos
    while (this.next <= now && canFire()) { onShot(); this.shots++; this.next += this.interval; }
  };

  BC.TEAMS = [
    {
      id: 'BR', name: 'Brasil', unit: 'Exército Brasileiro', flag: 'BR',
      camo: 'pixelgreen', vest: 0x394a2c, helmet: 0x2f3e25, gear: 0x232a1c, skin: 0xc79a76, accent: '#009c3b'
    },
    {
      id: 'US', name: 'Estados Unidos', unit: 'US Army', flag: 'US',
      camo: 'ocp', vest: 0x7d6c4b, helmet: 0x8b7a58, gear: 0x3b3328, skin: 0xd5a982, accent: '#3c3b6e'
    }
  ];

  BC.DIFF = {
    recruta: { name: 'Recruta', react: 0.85, err: 5.0, dmg: 1, speed: 0.9 },
    soldado: { name: 'Soldado', react: 0.55, err: 3.0, dmg: 1, speed: 1.0 },
    veterano: { name: 'Veterano', react: 0.38, err: 1.8, dmg: 1, speed: 1.05 }
  };

  BC.CALLSIGNS = ['Falcão', 'Raio', 'Tigre', 'Lobo', 'Sombra', 'Viper', 'Ghost', 'Bravo', 'Cobra', 'Nômade', 'Titã', 'Delta', 'Hawk', 'Reaper', 'Mamba', 'Onça', 'Echo', 'Rook', 'Atlas', 'Zulu'];
})();
