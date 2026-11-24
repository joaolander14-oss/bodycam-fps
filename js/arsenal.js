// Arsenal: 54 armas com calibres reais. O dano vem do calibre (tabela CAL) e da classe da arma.
(function () {
  const BC = window.BC;
  // dmg = dano no corpo (vida 100). full/max = alcance (m) de dano cheio / mínimo; min = fração mínima; rec = recuo vertical base (graus/tiro)
  const CAL = {
    '22lr': { n: '.22 LR', dmg: 34, rec: 0.35 }, '32acp': { n: '.32 ACP (7,65×17 mm)', dmg: 38, rec: 0.7 }, '9x18': { n: '9×18 mm Makarov', dmg: 46, rec: 1.1 },
    '9x19': { n: '9×19 mm Parabellum', dmg: 50, rec: 1.2 }, '38sp': { n: '.38 Special', dmg: 48, rec: 1.3 }, '357': { n: '.357 Magnum', dmg: 66, rec: 3.0 },
    '40sw': { n: '.40 S&W', dmg: 54, rec: 1.5 }, '45acp': { n: '.45 ACP', dmg: 58, rec: 1.6 }, '45colt': { n: '.45 Colt', dmg: 62, rec: 2.2 },
    '57x28': { n: '5,7×28 mm FN', dmg: 44, rec: 0.8 }, '46x30': { n: '4,6×30 mm HK', dmg: 42, rec: 0.7 }, '44mag': { n: '.44 Magnum', dmg: 80, rec: 4.5 },
    '500sw': { n: '.500 S&W Magnum', dmg: 100, rec: 7 }, '50ae': { n: '.50 Action Express', dmg: 90, rec: 5.5 },
    '545': { n: '5,45×39 mm', dmg: 55, rec: 0.85 }, '556': { n: '5,56×45 mm NATO', dmg: 52, rec: 0.75 }, '300blk': { n: '.300 AAC Blackout', dmg: 58, rec: 0.9 },
    '762x39': { n: '7,62×39 mm', dmg: 58, rec: 1.05 }, '762x51': { n: '7,62×51 mm NATO (.308 Win)', dmg: 72, rec: 1.6 }, '762x54r': { n: '7,62×54 mmR', dmg: 78, rec: 2.2 },
    '3006': { n: '.30-06 Springfield', dmg: 78, rec: 2.4 }, '792': { n: '7,92×57 mm Mauser', dmg: 80, rec: 2.8 }, '338lm': { n: '.338 Lapua Magnum', dmg: 100, rec: 3.5 },
    '50bmg': { n: '.50 BMG (12,7×99 mm)', dmg: 130, rec: 6, ap: true },
    '380acp': { n: '.380 ACP (9×17 mm)', dmg: 42, rec: 0.95 }, '10mm': { n: '10mm Auto', dmg: 56, rec: 1.7 }, '357sig': { n: '.357 SIG', dmg: 58, rec: 1.6 }, '4440': { n: '.44-40 Winchester', dmg: 62, rec: 2.4 },
    '9x39': { n: '9×39 mm (subsônico)', dmg: 58, rec: 1.2 }, '762x25': { n: '7,62×25 mm Tokarev', dmg: 52, rec: 1.1 }, '68spc': { n: '6,8×43 mm SPC', dmg: 58, rec: 1.0 }, '65cm': { n: '6,5 mm Creedmoor', dmg: 74, rec: 1.7 }, '300win': { n: '.300 Winchester Magnum', dmg: 92, rec: 3.0 },
    '12ga': { n: 'Calibre 12 (12/70) — chumbo 00', dmg: 13, rec: 4.2 },
    '458socom': { n: '.458 SOCOM', dmg: 68, rec: 1.9 }, '65grendel': { n: '6,5×39 mm Grendel', dmg: 60, rec: 0.95 }, '300wm': { n: '.300 Winchester Magnum', dmg: 94, rec: 3.2 }, '408ct': { n: '.408 CheyTac', dmg: 112, rec: 4.5 },
    '145x114': { n: '14,5×114 mm (antitanque)', dmg: 175, rec: 9, ap: true }, '20x110': { n: '20×110 mm Hispano (antimaterial)', dmg: 240, rec: 12, ap: true }, '30carbine': { n: '.30 Carbine', dmg: 52, rec: 1.0 },
    '454casull': { n: '.454 Casull', dmg: 92, rec: 5.5 }, '25acp': { n: '.25 ACP (6,35 mm)', dmg: 34, rec: 0.5 },
    'pg7': { n: 'PG-7VL 93 mm (carga oca HEAT)', dmg: 300, rec: 6, ap: true }, 'og7': { n: 'OG-7V 40 mm (alto-explosivo)', dmg: 300, rec: 5 }, 'at84': { n: '84 mm HEAT (AT4)', dmg: 300, rec: 5, ap: true }, 'law66': { n: '66 mm HEAT (M72)', dmg: 300, rec: 4, ap: true },
    'pf110': { n: '110 mm HEAT (Panzerfaust 3)', dmg: 300, rec: 6, ap: true }, 'gust84': { n: '84 mm HE (Carl Gustaf)', dmg: 300, rec: 5 }, 'rpg29': { n: '105 mm HEAT tandem (RPG-29)', dmg: 300, rec: 7, ap: true }, 'smaw': { n: '83 mm HE (SMAW)', dmg: 300, rec: 5 }
  };
  BC.CAL = CAL;
  const CLS = { lmg: 'Metralhadora', rifle: 'Fuzil', smg: 'Submetralhadora', pistol: 'Pistola', revolver: 'Revólver', shotgun: 'Espingarda', sniper: 'Fuzil de precisão', launcher: 'Lançador antitanque' };
  BC.CLASSES = CLS;

  function pat(n, up, yawAmp, freq, drift) { const a = []; for (let i = 0; i < n; i++) a.push([up * (1.15 - 0.45 * (1 - Math.exp(-i / 7))), yawAmp * Math.sin(i * freq) + (drift || 0) * Math.min(i, 12) * 0.08]); return a; }

  // [id, nome, classe, calibre, origem, rpm, auto(1/0), carregador, massa kg, v0 m/s, comprimento m, modelo, som(+tom), opções]
  // modelo: 'real:<id>' (modelos já preparados em models.js) ou 'pool:<arquivo>:<tipo>[:flip]'
  const T = [
    // ---- fuzis ----
    ['ak47', 'AK-47', 'rifle', '762x39', 'URSS', 600, 1, 30, 4.3, 715, 0.87, 'real:ak74', 'ak'],
    ['m4a1', 'M4A1', 'rifle', '556', 'EUA', 800, 1, 30, 3.1, 880, 0.84, 'real:m4a1', 'm4'],
    ['m16a4', 'M16A4', 'rifle', '556', 'EUA', 800, 0, 30, 3.9, 940, 1.0, 'pool:AssaultRifle2_1:fbx', 'm4'],
    ['hk416', 'H&K HK416', 'rifle', '556', 'Alemanha', 850, 1, 30, 3.5, 788, 0.83, 'pool:AssaultRifle2_2:fbx', 'm4'],
    ['scarl', 'FN SCAR-L', 'rifle', '556', 'Bélgica', 650, 1, 30, 3.5, 870, 0.87, 'pool:AssaultRifle2_3:fbx', 'm4:1.02'],
    ['mcx', 'SIG MCX', 'rifle', '300blk', 'EUA', 800, 1, 30, 3.0, 670, 0.8, 'pool:AssaultRifle2_4:fbx', 'm4:0.97'],
    ['aks74u', 'AKS-74U', 'rifle', '545', 'URSS', 700, 1, 30, 2.7, 735, 0.73, 'pool:AssaultRifle_1:fbx', 'ak:1.06'],
    ['ak74m', 'AK-74M', 'rifle', '545', 'Rússia', 650, 1, 30, 3.4, 900, 0.94, 'pool:AssaultRifle_3:fbx', 'ak:1.03'],
    ['akm', 'AKM', 'rifle', '762x39', 'URSS', 600, 1, 30, 3.1, 715, 0.88, 'pool:AssaultRifle_2:fbx', 'ak'],
    ['fal', 'FN FAL', 'rifle', '762x51', 'Bélgica', 650, 1, 20, 4.3, 840, 1.1, 'pool:AssaultRifle_4:fbx', 'm4:0.9'],
    ['aug', 'Steyr AUG A3', 'rifle', '556', 'Áustria', 680, 1, 30, 3.6, 970, 0.79, 'pool:Bullpup_1:fbx', 'm4:1.04'],
    ['famas', 'FAMAS F1', 'rifle', '556', 'França', 1000, 1, 25, 3.6, 925, 0.757, 'pool:Bullpup_2:fbx', 'm4:1.06'],
    ['tavor', 'IWI Tavor TAR-21', 'rifle', '556', 'Israel', 750, 1, 30, 3.3, 910, 0.72, 'pool:Bullpup_3:fbx', 'm4:1.02'],
    ['g3a3', 'H&K G3A3', 'rifle', '762x51', 'Alemanha', 500, 1, 20, 4.4, 800, 1.02, 'pool:g3a3:glb', 'm4:0.9'],
    ['l85', 'L85A2', 'rifle', '556', 'Reino Unido', 700, 1, 30, 3.8, 940, 0.785, 'pool:l85:glb', 'm4:0.98'],
    // ---- submetralhadoras ----
    ['skorpion', 'Škorpion vz. 61', 'smg', '32acp', 'Tchecoslováquia', 850, 1, 20, 1.3, 320, 0.27, 'pool:SubmachineGun_1:fbx', 'ppsh:1.25'],
    ['mac10', 'Ingram MAC-10', 'smg', '45acp', 'EUA', 1100, 1, 30, 2.8, 280, 0.3, 'pool:SubmachineGun_4:fbx', 'ppsh:1.0'],
    ['ump45', 'H&K UMP45', 'smg', '45acp', 'Alemanha', 600, 1, 25, 2.5, 285, 0.69, 'pool:SubmachineGun_2:fbx', 'p45:0.95'],
    ['mp7', 'H&K MP7', 'smg', '46x30', 'Alemanha', 950, 1, 40, 1.9, 735, 0.54, 'pool:SubmachineGun_3:fbx', 'smg:1.1'],
    ['m45', 'Carl Gustaf m/45', 'smg', '9x19', 'Suécia', 600, 1, 36, 3.4, 410, 0.81, 'pool:SubmachineGun_5:fbx', 'smg'],
    ['mp5', 'H&K MP5A3', 'smg', '9x19', 'Alemanha', 800, 1, 30, 2.5, 400, 0.68, 'pool:smg-mp5:glb', 'smg:1.02'],
    ['mp5n', 'H&K MP5N', 'smg', '9x19', 'Alemanha', 800, 1, 30, 2.5, 400, 0.68, 'pool:smg-mp5x:glb', 'smg:1.04'],
    ['uzi', 'IMI Uzi', 'smg', '9x19', 'Israel', 600, 1, 32, 3.5, 400, 0.65, 'pool:uzi:glb', 'smg:0.97'],
    // ---- pistolas ----
    ['glock17', 'Glock 17', 'pistol', '9x19', 'Áustria', 400, 0, 17, 0.63, 375, 0.204, 'real:glock17', 'p9'],
    ['beretta92', 'Beretta 92FS', 'pistol', '9x19', 'Itália', 400, 0, 15, 0.95, 380, 0.217, 'pool:Pistol_1:fbx', 'p9:0.97'],
    ['hipower', 'Browning Hi-Power', 'pistol', '9x19', 'Bélgica', 380, 0, 13, 0.9, 350, 0.2, 'pool:Pistol_2:fbx', 'p9:0.95'],
    ['usp40', 'H&K USP .40', 'pistol', '40sw', 'Alemanha', 380, 0, 12, 0.85, 300, 0.194, 'pool:Pistol_3:fbx', 'p9:0.9'],
    ['makarov', 'Makarov PM', 'pistol', '9x18', 'URSS', 350, 0, 8, 0.73, 315, 0.161, 'pool:Pistol_4:fbx', 'p9:1.05'],
    ['five7', 'FN Five-seveN', 'pistol', '57x28', 'Bélgica', 450, 0, 20, 0.62, 650, 0.208, 'pool:Pistol_5:fbx', 'p9:1.12'],
    ['deagle', 'IMI Desert Eagle', 'pistol', '50ae', 'Israel', 250, 0, 7, 2.0, 460, 0.27, 'pool:Pistol_6:fbx', 'p45:0.8'],
    ['m1911', 'Colt M1911A1', 'pistol', '45acp', 'EUA', 330, 0, 7, 1.1, 253, 0.216, 'pool:m1911:glb', 'p45'],
    ['coonan', 'Coonan .357 Magnum', 'pistol', '357', 'EUA', 300, 0, 7, 1.4, 450, 0.21, 'pool:pistol-coonan:glb', 'p45:0.85'],
    // ---- revólveres ----
    ['python', 'Colt Python', 'revolver', '357', 'EUA', 150, 0, 6, 1.2, 440, 0.24, 'pool:revolver-python:glb', 'rev:0.9'],
    ['m29', 'S&W Model 29', 'revolver', '44mag', 'EUA', 130, 0, 6, 1.3, 440, 0.3, 'pool:Revolver_1:fbx', 'rev:0.8'],
    ['gp100', 'Ruger GP100', 'revolver', '357', 'EUA', 150, 0, 6, 1.1, 430, 0.24, 'pool:Revolver_2:fbx', 'rev:0.92'],
    ['m500', 'S&W Model 500', 'revolver', '500sw', 'EUA', 100, 0, 5, 2.0, 580, 0.38, 'pool:Revolver_3:fbx', 'rev:0.65'],
    ['detective', 'Colt Detective Special', 'revolver', '38sp', 'EUA', 160, 0, 6, 0.6, 230, 0.17, 'pool:Revolver_4:fbx', 'rev'],
    ['saa', 'Colt Single Action Army', 'revolver', '45colt', 'EUA', 100, 0, 6, 1.1, 250, 0.28, 'pool:Revolver_5:fbx', 'rev:0.85'],
    // ---- espingardas (calibre 12) ----
    ['rem870', 'Remington 870', 'shotgun', '12ga', 'EUA', 70, 0, 7, 3.6, 400, 1.06, 'real:rem870', 'sg'],
    ['moss500', 'Mossberg 500', 'shotgun', '12ga', 'EUA', 70, 0, 6, 3.3, 400, 0.98, 'pool:Shotgun_1:fbx', 'sg:1.03'],
    ['ithaca37', 'Ithaca 37', 'shotgun', '12ga', 'EUA', 65, 0, 5, 3.0, 400, 1.0, 'pool:Shotgun_3:fbx', 'sg:0.97'],
    ['benelli', 'Benelli M2', 'shotgun', '12ga', 'Itália', 170, 0, 5, 3.3, 400, 1.0, 'pool:Shotgun_4:fbx', 'sg:1.0'],
    ['coach', 'Cano Serrado (Coach Gun)', 'shotgun', '12ga', 'EUA', 120, 0, 2, 2.4, 380, 0.62, 'pool:Shotgun_SawedOff:fbx', 'sg:0.92'],
    ['rem870t', 'Remington 870 Tactical', 'shotgun', '12ga', 'EUA', 75, 0, 6, 3.1, 400, 0.88, 'pool:Shotgun_ShortStock:fbx', 'sg:1.05'],
    ['win1300', 'Winchester 1300', 'shotgun', '12ga', 'EUA', 70, 0, 7, 3.2, 400, 0.98, 'pool:shotgun:glb', 'sg:1.0'],
    // ---- fuzis de precisão ----
    ['svd', 'SVD Dragunov', 'sniper', '762x54r', 'URSS / Rússia', 180, 0, 10, 4.3, 830, 1.225, 'real:svd', 'svd', { zoom: 3.6 }],
    ['rem700', 'Remington 700', 'sniper', '762x51', 'EUA', 42, 0, 5, 4.0, 850, 1.1, 'pool:SniperRifle_1:fbx', 'bolt', { zoom: 4 }],
    ['m24', 'M24 SWS', 'sniper', '762x51', 'EUA', 40, 0, 5, 5.5, 850, 1.1, 'pool:SniperRifle_2:fbx', 'bolt:0.97', { zoom: 5 }],
    ['awm', 'AI AWM', 'sniper', '338lm', 'Reino Unido', 35, 0, 5, 6.9, 936, 1.2, 'pool:SniperRifle_3:fbx', 'bolt:0.82', { zoom: 6 }],
    ['ssg69', 'Steyr SSG 69', 'sniper', '762x51', 'Áustria', 42, 0, 5, 4.6, 860, 1.14, 'pool:SniperRifle_4:fbx', 'bolt:1.02', { zoom: 4 }],
    ['m82', 'Barrett M82A1', 'sniper', '50bmg', 'EUA', 24, 0, 10, 14.7, 853, 1.45, 'pool:SniperRifle_5:fbx', 'bolt:0.7', { zoom: 6 }],
    ['kar98k', 'Mauser Karabiner 98k', 'sniper', '792', 'Alemanha', 36, 0, 5, 4.0, 760, 1.11, 'pool:SniperRifle_6:fbx', 'bolt:0.9', { zoom: 4 }],
    ['mosin', 'Mosin-Nagant 91/30', 'sniper', '762x54r', 'URSS', 34, 0, 5, 4.0, 810, 1.23, 'pool:mosin9130:glb', 'svd:1.04', { zoom: 3.5 }],
    ['m1903', 'Springfield M1903A4', 'sniper', '3006', 'EUA', 34, 0, 5, 4.1, 850, 1.1, 'pool:sniper:glb', 'bolt:0.88', { zoom: 4 }]
  ];

  const REL = { launcher: [3.8, 3.8], lmg: [5.5, 6.5], rifle: [2.4, 3.0], smg: [2.0, 2.5], pistol: [1.5, 1.9], revolver: [3.4, 3.4], sniper: [3.0, 3.4], shotgun: [0.62, 0.62] };
  const HIP = { launcher: [0.13, -0.16, -0.5], lmg: [0.12, -0.16, -0.55], rifle: [0.11, -0.15, -0.5], smg: [0.1, -0.14, -0.42], pistol: [0.07, -0.07, -0.32], revolver: [0.07, -0.07, -0.34], shotgun: [0.12, -0.15, -0.55], sniper: [0.12, -0.15, -0.5] };
  if (BC.EXTRA_ROWS) T.push(...BC.EXTRA_ROWS(T));
  BC.WEAPONS = T.map((r) => {
    const [id, name, cls, cal, origin, rpm, auto, mag, mass, v0, len, model, snd, opt] = r, C = CAL[cal], o = opt || {};
    const sp = String(snd).split(':'), shell = cls === 'shotgun';
    // dano: calibre × classe (SMG com cano curto perde um pouco); alcance por classe/calibre
    let dmg = C.dmg * (cls === 'smg' ? 0.96 : 1), full, max, minM;
    if (cls === 'pistol' || cls === 'revolver') { full = ['357', '44mag', '500sw', '50ae'].includes(cal) ? 34 : 20; max = full * 3; minM = 0.86; }
    else if (cls === 'smg') { full = 28; max = 90; minM = 0.86; }
    else if (cls === 'shotgun') { full = 9; max = 50; minM = 0.15; }
    else if (cls === 'sniper') { full = 150; max = 450; minM = 0.95; }
    else if (cls === 'launcher') { full = 60; max = 200; minM = 1; }
    else if (cls === 'lmg') { full = 50; max = 160; minM = 0.93; }
    else { full = ['762x51', '762x39', '762x54r'].includes(cal) ? 46 : 40; max = full * 3; minM = 0.92; }
    const rec = C.rec * Math.pow(3.4 / Math.max(0.5, mass), 0.38) * (cls === 'smg' ? 0.62 : 1) * (auto ? 1 : 1);
    const spreadHip = { launcher: 1.0, lmg: 1.8, rifle: 1.5, smg: 1.2, pistol: 1.0, revolver: 0.9, shotgun: 2.4, sniper: 2.2 }[cls], spreadAds = { launcher: 0.15, lmg: 0.15, rifle: 0.1, smg: 0.12, pistol: 0.1, revolver: 0.08, shotgun: 1.9, sniper: 0.02 }[cls];
    const w = {
      id, name, cls, type: CLS[cls], origin, cal: C.n, calKey: cal, v0, mass, rpm, auto: !!auto, mag, reserve: shell ? mag * 4 : cls === 'sniper' ? mag * 6 : mag * 5,
      reload: REL[cls][0], reloadEmpty: REL[cls][1], shellReload: shell, pellets: shell ? 9 : 1, pelletCone: shell ? (id === 'coach' ? 2.6 : 1.9) : undefined,
      dmg, headMul: (cls === 'pistol' || cls === 'revolver') ? 2.5 : shell ? 2 : 3, legMul: cls === 'shotgun' ? 0.8 : 0.6, fullRange: full, maxRange: max, minMul: minM,
      spreadHip: shell ? (id === 'coach' ? 2.6 : 2.4) : spreadHip, spreadAds: shell ? 1.9 : spreadAds, spreadShot: shell ? 0 : cls === 'sniper' ? 0.2 : auto ? 0.06 : 0.16, spreadMax: shell ? 2.4 : 1.5, scopeDefault: o.scope, spreadMove: cls === 'sniper' ? 1.6 : cls === 'shotgun' ? 0.6 : 0.8,
      recoil: pat(auto ? 40 : 10, rec, 0.25 + rec * 0.05, 0.6 + (id.length % 5) * 0.12, (id.charCodeAt(0) % 3 - 1) * 0.4), recoilKick: Math.min(0.13, 0.025 + rec * 0.012),
      adsZoom: o.zoom || (cls === 'pistol' || cls === 'revolver' ? 1.15 : 1.25), scope: !!o.zoom, snd: sp[0], sndRate: sp[1] ? +sp[1] : 1, model, sup: !!o.sup, rocket: o.rocket, ap: !!(o.ap || C.ap), variantOf: o.var, mod: o.mod,
      hip: HIP[cls], ads: o.zoom ? [0, 0, -0.21] : cls === 'pistol' || cls === 'revolver' ? [0, -0.007, -0.3] : [0, -0.01, -0.34]
    };
    if (cls === 'revolver') w.len = len * 1.3; else w.len = len; w.pumpAction = ['rem870', 'moss500', 'ithaca37', 'rem870t', 'win1300'].includes(id);
    return w;
  });
  BC.WMAP = {}; BC.WEAPONS.forEach((w) => { BC.WMAP[w.id] = w; });
  BC.DEFAULT_LOADOUT = ['ak47', 'glock17'];
})();
