// +46 armas: modelos novos (pasta models/pool2) e versões reais com supressor, luneta ou outro calibre (mesma plataforma).
(function () {
  const BC = window.BC;
  BC.EXTRA_ROWS = function (T) {
    const by = {}; T.forEach((r) => { by[r[0]] = r; });
    const rows = [
      // ---- modelos novos ----
      ['m16a1', 'Colt M16A1', 'rifle', '556', 'EUA', 700, 1, 20, 3.2, 975, 0.986, 'idx:35', 'm4:1.0'],
      ['vz58', 'Vz. 58', 'rifle', '762x39', 'Tchecoslováquia', 800, 1, 30, 3.1, 710, 0.84, 'idx:64', 'ak:0.98'],
      ['lightning', 'Colt Lightning Carbine', 'rifle', '4440', 'EUA', 55, 0, 15, 3.4, 400, 0.95, 'idx:18', 'lever'],
      ['ruger22', 'Ruger Mark III', 'pistol', '22lr', 'EUA', 300, 0, 10, 0.99, 330, 0.28, 'idx:34', 'p22'],
      ['bersa380', 'Bersa Thunder .380', 'pistol', '380acp', 'Argentina', 360, 0, 8, 0.66, 300, 0.165, 'idx:32', 'p380'],
      ['delta10', 'Colt Delta Elite', 'pistol', '10mm', 'EUA', 320, 0, 8, 1.1, 420, 0.216, 'idx:44', 'p45:1.0'],
      ['p229', 'SIG P229', 'pistol', '357sig', 'Suíça', 380, 0, 12, 0.9, 430, 0.19, 'idx:49', 'p9:0.93'],
      ['tt33', 'Tokarev TT-33', 'pistol', '762x25', 'URSS', 330, 0, 8, 0.85, 420, 0.195, 'idx:77', 'ppsh:1.12'],
      ['sw686', 'S&W Model 686', 'revolver', '357', 'EUA', 140, 0, 6, 1.4, 440, 0.26, 'idx:55', 'rev:0.9'],
      ['vector', 'KRISS Vector', 'smg', '45acp', 'EUA', 1200, 1, 25, 2.7, 280, 0.6, 'idx:66', 'ppsh:0.95'],
      ['sten', 'Sten Mk II', 'smg', '9x19', 'Reino Unido', 550, 1, 32, 3.0, 365, 0.76, 'idx:75', 'smg:0.96'],
      ['vss', 'VSS Vintorez', 'rifle', '9x39', 'Rússia', 900, 1, 20, 2.6, 290, 0.89, 'idx:74', 'smg:0.9', { zoom: 3.6, sup: true }],
      ['l96', 'AI L96A1', 'sniper', '762x51', 'Reino Unido', 38, 0, 10, 6.5, 840, 1.18, 'idx:68', 'bolt:0.98', { zoom: 5 }],
      ['m60', 'M60', 'lmg', '762x51', 'EUA', 550, 1, 100, 10.4, 853, 1.1, 'idx:36', 'ak:0.9']
    ];
    // versões: [id, nome, base, {sobrescritas}, modificação]
    const V = (id, name, base, o, mod) => {
      const b = by[base] || rows.find((r) => r[0] === base); const r = b.slice(0, 13); r[0] = id; r[1] = name;
      const set = (k, i) => { if (o[k] !== undefined) r[i] = o[k]; };
      set('origin', 4); set('rpm', 5); set('auto', 6); set('mag', 7); set('mass', 8); set('v0', 9); set('len', 10); if (o.cal) r[3] = o.cal; if (o.snd) r[12] = o.snd;
      r[11] = 'var:' + base; r.push(Object.assign({}, b[13] || {}, { var: base, mod }, mod === 'sup' ? { sup: true } : {}, o.zoom !== undefined ? { zoom: o.zoom } : {}));
      return r;
    };
    const sd = (id, name, base, o) => V(id, name, base, Object.assign({ mass: (by[base] || rows.find((r) => r[0] === base))[8] + 0.45 }, o || {}), 'sup');
    const sc = (id, name, base, zoom, o) => V(id, name, base, Object.assign({ zoom }, o || {}), 'scope:' + (zoom >= 5 ? 'mid' : 'acog'));
    rows.push(
      sd('m4a1sd', 'M4A1 Suprimida', 'm4a1'), sd('hk416sd', 'H&K HK416 Suprimida', 'hk416'), sd('scarsd', 'FN SCAR-L SD', 'scarl'), sd('mcxsd', 'SIG MCX SD (subsônico)', 'mcx', { v0: 310 }),
      sd('ak74msd', 'AK-74M com PBS-1', 'ak74m', { v0: 300 }), sd('aks74usd', 'AKS-74UB', 'aks74u', { v0: 300 }), sd('akmsd', 'AKM com PBS', 'akm', { v0: 300 }),
      sd('mp5sd', 'H&K MP5SD', 'mp5', { v0: 285 }), sd('ump45sd', 'H&K UMP45 SD', 'ump45', { v0: 270 }), sd('uzisd', 'IMI Uzi Suprimida', 'uzi', { v0: 290 }), sd('mp7sd', 'H&K MP7 SD', 'mp7', { v0: 480 }), sd('mac10sd', 'Ingram MAC-10 Suprimida', 'mac10', { v0: 270 }),
      sd('glock17sd', 'Glock 17 Suprimida', 'glock17', { v0: 300 }), sd('beretta92sd', 'Beretta 92FS Suprimida', 'beretta92', { v0: 300 }), sd('usp40sd', 'H&K USP Tactical SD', 'usp40', { v0: 290 }),
      sd('m1911sd', 'Colt M1911 Suprimida', 'm1911', { v0: 250 }), sd('ruger22sd', 'Ruger Mark III Suprimida', 'ruger22', { v0: 300 }), sd('makarovsd', 'PB (Makarov Suprimida)', 'makarov', { v0: 290 }),
      sc('mk12', 'Mk 12 SPR', 'm16a4', 4, { rpm: 300, mass: 4.9 }), sc('m110', 'M110 SASS', 'scarl', 4, { cal: '762x51', mag: 20, mass: 6.9, v0: 790, rpm: 260 }),
      sc('hk417', 'H&K HK417', 'hk416', 4, { cal: '762x51', mag: 20, mass: 4.2, v0: 800, rpm: 600 }), sc('scarh', 'FN SCAR-H', 'scarl', 3, { cal: '762x51', mag: 20, mass: 3.5, v0: 800, rpm: 600 }),
      sc('psg1', 'H&K PSG1', 'g3a3', 6, { rpm: 200, mass: 8.1, auto: 0 }), sc('g3sg1', 'H&K G3SG1', 'g3a3', 4, { rpm: 350, mass: 5.5 }), sc('ak103', 'AK-103 com 1P29', 'akm', 4, { rpm: 600 }),
      sc('m14ebr', 'M14 EBR', 'fal', 4, { rpm: 300, mass: 5.1, v0: 850 }), sc('acr68', 'Remington ACR 6.8 SPC', 'scarl', 3, { cal: '68spc', v0: 760 }),
      V('deagle357', 'IMI Desert Eagle .357', 'deagle', { cal: '357', v0: 440, mag: 9, mass: 1.7 }, ''), V('deagle44', 'IMI Desert Eagle .44 Magnum', 'deagle', { cal: '44mag', v0: 430, mag: 8, mass: 1.9 }, ''),
      V('benelli_m4', 'Benelli M4 Super 90', 'benelli', { mag: 7, mass: 3.8, rpm: 190 }, ''), V('rem870mcs', 'Remington 870 MCS', 'rem870t', { mag: 6, mass: 3.0 }, ''), V('spas12', 'Franchi SPAS-12', 'moss500', { mag: 8, mass: 4.4, rpm: 150, origin: 'Itália' }, '')
    );
    rows.push(
      // ---- +50 (150 no total): mais versões reais, calibres e supressores ----
      sd('m16a4sd', 'Colt M16A4 Suprimida', 'm16a4', { v0: 300 }), sd('tavorsd', 'IWI Tavor SD', 'tavor', { v0: 310 }), sd('augsd', 'Steyr AUG SD', 'aug', { v0: 320 }), sd('famassd', 'FAMAS SD', 'famas', { v0: 310 }), sd('l85sd', 'L85A2 Suprimida', 'l85', { v0: 310 }),
      sd('m45sd', 'Carl Gustaf M/45 Suprimida', 'm45', { v0: 280 }), sd('skorpionsd', 'Škorpion vz. 61 Suprimida', 'skorpion', { v0: 270 }), sd('hipowersd', 'FN Hi-Power Suprimida', 'hipower', { v0: 290 }), sd('five7sd', 'FN Five-seveN Suprimida', 'five7', { v0: 480 }),
      sd('mp5nsd', 'H&K MP5N SD', 'mp5n', { v0: 285 }), sd('g3a3sd', 'H&K G3 Suprimida', 'g3a3', { v0: 330 }), sd('falsd', 'FN FAL Suprimida', 'fal', { v0: 330 }),
      V('m4_300', 'Colt M4 .300 Blackout', 'm4a1', { cal: '300blk', v0: 600, mass: 3.2 }, ''), V('ak12', 'Kalashnikov AK-12', 'ak74m', { rpm: 700, origin: 'Rússia', mass: 3.3 }, ''), V('ak308', 'Kalashnikov AK-308', 'akm', { cal: '762x51', v0: 840, mass: 4.2, origin: 'Rússia' }, ''),
      V('ar10', 'ArmaLite AR-10', 'm16a4', { cal: '762x51', v0: 840, mass: 4.1, rpm: 650 }, ''), V('galil', 'IMI Galil ARM', 'akm', { cal: '556', v0: 950, origin: 'Israel', mass: 4.3 }, ''), 
      V('sks', 'SKS-45', 'akm', { auto: 0, rpm: 400, mag: 10, mass: 3.85, v0: 735, len: 1.02 }, ''), V('g36', 'H&K G36', 'm4a1', { origin: 'Alemanha', v0: 920, mass: 3.6, rpm: 750 }, ''), 
      V('mp5k', 'H&K MP5K', 'mp5', { mass: 2.1, len: 0.325, rpm: 900 }, ''), V('uzipro', 'IMI Uzi Pro', 'uzi', { mass: 2.4, rpm: 1100 }, ''), V('miniuzi', 'Mini Uzi', 'uzi', { mass: 2.0, rpm: 950, len: 0.36 }, ''),
      V('ump9', 'H&K UMP9', 'ump45', { cal: '9x19', v0: 400, mag: 30, mass: 2.3 }, ''), V('mac10_9', 'Ingram MAC-10 9 mm', 'mac10', { cal: '9x19', v0: 365, rpm: 1100 }, ''),
      V('p90', 'FN P90', 'mp7', { cal: '57x28', origin: 'Bélgica', mag: 50, v0: 715, rpm: 900, mass: 2.6 }, ''), V('bizon', 'PP-19 Bizon', 'skorpion', { cal: '9x18', origin: 'Rússia', mag: 64, rpm: 700, mass: 2.9, v0: 330 }, ''),
      V('ppsh41', 'PPSh-41', 'sten', { cal: '762x25', origin: 'URSS', mag: 71, rpm: 900, mass: 3.6, v0: 500 }, ''), V('mp40', 'MP 40', 'sten', { cal: '9x19', origin: 'Alemanha', rpm: 500, mass: 4.0, v0: 380 }, ''), V('thompson', 'Thompson M1A1', 'm45', { cal: '45acp', origin: 'EUA', rpm: 700, mag: 30, mass: 4.7, v0: 280 }, ''),
      V('glock22', 'Glock 22', 'glock17', { cal: '40sw', mag: 15, v0: 335 }, ''), V('glock21', 'Glock 21', 'glock17', { cal: '45acp', mag: 13, v0: 260 }, ''), V('glock18', 'Glock 18C', 'glock17', { auto: 1, rpm: 1200, mag: 33 }, ''),
      V('px4', 'Beretta Px4 Storm', 'beretta92', { cal: '40sw', mag: 14, v0: 330 }, ''), V('cz75', 'CZ 75', 'hipower', { origin: 'Tchecoslováquia', mag: 16 }, ''), V('p226', 'SIG P226', 'usp40', { cal: '9x19', origin: 'Suíça', mag: 15, v0: 365 }, ''), V('hk45', 'H&K HK45', 'usp40', { cal: '45acp', mag: 10, v0: 275 }, ''),
      V('python6', 'Colt Python 6"', 'python', { mass: 1.2, len: 0.28 }, ''), V('sw629', 'S&W Model 629', 'm29', { mass: 1.5 }, ''), V('blackhawk', 'Ruger Blackhawk', 'saa', { mass: 1.2, v0: 260 }, ''), V('nagant', 'Nagant M1895', 'detective', { origin: 'Rússia', mag: 7, v0: 330 }, ''),
      V('mossberg590', 'Mossberg 590A1', 'moss500', { mag: 9 }, ''), V('ksg', 'Kel-Tec KSG', 'benelli', { mag: 14, mass: 3.0, rpm: 120 }, ''), V('sawedoff', 'Espingarda de cano serrado', 'coach', { mass: 2.2, len: 0.6 }, ''),
      V('m107', 'Barrett M107', 'm82', { mass: 12.9 }, ''), V('pgm', 'PGM Hécate II', 'm82', { origin: 'França', mass: 13.8 }, ''), V('trg42', 'Sako TRG-42', 'awm', { origin: 'Finlândia', mass: 5.9 }, ''), 
      V('pkm', 'PKM', 'm60', { cal: '762x54r', origin: 'URSS', mag: 100, rpm: 650, mass: 8.4, v0: 825 }, ''), V('m249', 'M249 SAW', 'm60', { cal: '556', mag: 200, rpm: 850, mass: 7.5, v0: 915 }, ''), V('rpk74', 'RPK-74', 'm60', { cal: '545', origin: 'URSS', mag: 45, rpm: 600, mass: 4.7, v0: 960 }, ''), V('mg3', 'Rheinmetall MG3', 'm60', { cal: '792', origin: 'Alemanha', mag: 120, rpm: 1100, mass: 11.5, v0: 820 }, '')
    );
    rows.push(
      // ---- +50 (200 no total): lançadores antitanque, antimaterial e novos calibres ----
      ['rpg7', 'RPG-7 (PG-7VL, HEAT)', 'launcher', 'pg7', 'URSS', 20, 0, 1, 6.3, 115, 0.95, 'proc:rpg7', 'sg:0.5', { rocket: { k: 'heat', rad: 4, v: 115, vdmg: 620 } }],
      ['rpg7he', 'RPG-7 (OG-7V, alto-explosivo)', 'launcher', 'og7', 'URSS', 20, 0, 1, 6.3, 115, 0.95, 'proc:rpg7', 'sg:0.5', { rocket: { k: 'he', rad: 10, v: 115, vdmg: 300 } }],
      ['rpg29', 'RPG-29 Vampir', 'launcher', 'rpg29', 'Rússia', 18, 0, 1, 12.1, 280, 1.2, 'proc:tube', 'sg:0.45', { rocket: { k: 'heat', rad: 4.5, v: 280, vdmg: 800 } }],
      ['at4', 'Saab AT4', 'launcher', 'at84', 'Suécia', 18, 0, 1, 6.7, 285, 1.0, 'proc:tube', 'sg:0.5', { rocket: { k: 'heat', rad: 4, v: 285, vdmg: 650 } }],
      ['m72', 'M72 LAW', 'launcher', 'law66', 'EUA', 18, 0, 1, 2.5, 145, 0.89, 'proc:tube', 'sg:0.6', { rocket: { k: 'heat', rad: 3.5, v: 145, vdmg: 480 } }],
      ['pzf3', 'Panzerfaust 3', 'launcher', 'pf110', 'Alemanha', 18, 0, 1, 12.9, 240, 1.2, 'proc:tube', 'sg:0.42', { rocket: { k: 'heat', rad: 4.5, v: 240, vdmg: 760 } }],
      ['carlg', 'Carl Gustaf M3 (HE)', 'launcher', 'gust84', 'Suécia', 20, 0, 1, 10.0, 255, 1.07, 'proc:tube', 'sg:0.45', { rocket: { k: 'he', rad: 11, v: 255, vdmg: 320 } }],
      ['smaw', 'Mk 153 SMAW (HE)', 'launcher', 'smaw', 'EUA', 20, 0, 1, 7.3, 220, 0.83, 'proc:tube', 'sg:0.48', { rocket: { k: 'he', rad: 12, v: 220, vdmg: 360 } }],
      V('ar15_458', 'Colt AR-15 .458 SOCOM', 'm4a1', { cal: '458socom', v0: 580, mass: 3.4 }, ''), V('grendel', 'Mk18 6,5 Grendel', 'm4a1', { cal: '65grendel', v0: 820 }, ''), V('sig716', 'SIG 716', 'scarl', { cal: '762x51', v0: 810, mass: 3.8, rpm: 700 }, ''),
      V('sr25', 'Knight SR-25', 'hk416', { cal: '762x51', v0: 840, mass: 4.5, rpm: 600 }, ''), V('m1a', 'Springfield M1A', 'fal', { auto: 0, rpm: 300, mass: 4.5, v0: 850 }, ''), V('aug300', 'Steyr AUG .300 BLK', 'aug', { cal: '300blk', v0: 640 }, ''), V('carbine30', 'M1 Carbine', 'm4a1', { cal: '30carbine', auto: 0, rpm: 300, mag: 15, mass: 2.4, v0: 600, origin: 'EUA' }, ''),
      V('bar1918', 'Browning BAR M1918', 'm60', { cal: '3006', mag: 20, rpm: 550, mass: 8.8, v0: 860 }, ''), V('mg34', 'MG 34', 'm60', { cal: '792', origin: 'Alemanha', mag: 75, rpm: 900, mass: 12.1, v0: 755 }, ''), V('mg42', 'MG 42', 'm60', { cal: '792', origin: 'Alemanha', mag: 50, rpm: 1200, mass: 11.6, v0: 755 }, ''),
      V('dp28', 'DP-28', 'm60', { cal: '762x54r', origin: 'URSS', mag: 47, rpm: 550, mass: 9.1, v0: 840 }, ''), V('bren', 'Bren Mk II', 'm60', { cal: '762x51', origin: 'Reino Unido', mag: 30, rpm: 500, mass: 10.2, v0: 744 }, ''), V('negev', 'IWI Negev', 'm60', { cal: '556', origin: 'Israel', mag: 150, rpm: 1000, mass: 7.2, v0: 910 }, ''), V('mk48', 'Mk 48 Mod 0', 'm60', { cal: '762x51', mag: 100, rpm: 730, mass: 8.4, v0: 850 }, ''),
      V('cheytac', 'CheyTac M200 Intervention', 'awm', { cal: '408ct', mass: 11.7, v0: 900, origin: 'EUA' }, ''), V('tac50', 'McMillan TAC-50', 'm82', { mass: 26, origin: 'EUA' }, ''), V('cz550', 'CZ 550 Safari Magnum', 'rem700', { cal: '300wm', origin: 'Tchecoslováquia', mass: 3.9, v0: 900 }, ''),
      V('win70', 'Winchester Model 70', 'rem700', { cal: '3006', mass: 3.4, v0: 850 }, ''), V('orsis', 'ORSIS T-5000', 'awm', { origin: 'Rússia', mass: 6.0 }, ''),
      V('ptrd', 'PTRD-41 (antitanque)', 'm82', { cal: '145x114', mag: 1, rpm: 20, mass: 17.3, v0: 1000, origin: 'URSS', len: 2.0 }, ''), V('ptrs41', 'PTRS-41 (antitanque)', 'm82', { cal: '145x114', mag: 5, rpm: 40, mass: 20, v0: 1012, origin: 'URSS', len: 2.1 }, ''), V('ntw20', 'Denel NTW-20', 'm82', { cal: '20x110', mag: 3, rpm: 30, mass: 26, v0: 720, origin: 'África do Sul', len: 1.8 }, ''),
      V('m3grease', 'M3 Grease Gun', 'sten', { cal: '45acp', origin: 'EUA', rpm: 450, mass: 3.7, v0: 280 }, ''), V('owen', 'Owen Gun', 'sten', { origin: 'Austrália', rpm: 700, mass: 4.2 }, ''), V('pm63', 'PM-63 RAK', 'skorpion', { cal: '9x18', origin: 'Polônia', rpm: 650, mag: 25, v0: 320 }, ''), V('mp18', 'Bergmann MP 18', 'm45', { cal: '9x19', origin: 'Alemanha', rpm: 500, mag: 32, v0: 380 }, ''),
      V('pp2000', 'PP-2000', 'mp5', { origin: 'Rússia', rpm: 600, mag: 20, mass: 1.4 }, ''), V('tec9', 'Intratec TEC-9', 'mac10', { cal: '9x19', v0: 360, rpm: 800, mag: 32 }, ''), V('czevo', 'CZ Scorpion EVO 3', 'mp7', { cal: '9x19', origin: 'Tchecoslováquia', rpm: 1100, mag: 30, v0: 360, mass: 2.5 }, ''),
      V('p320', 'SIG Sauer P320', 'usp40', { cal: '9x19', origin: 'Suíça', mag: 17, v0: 370 }, ''), V('fnx45', 'FN FNX-45', 'usp40', { cal: '45acp', origin: 'Bélgica', mag: 15, v0: 260 }, ''), V('luger', 'Luger P08', 'hipower', { origin: 'Alemanha', mag: 8, v0: 350 }, ''),
      V('c96', 'Mauser C96', 'tt33', { origin: 'Alemanha', mag: 10, v0: 425 }, ''), V('ppk', 'Walther PPK', 'bersa380', { origin: 'Alemanha', mag: 7, v0: 280 }, ''), V('derringer', 'Remington Derringer .25', 'ruger22', { cal: '25acp', mag: 2, mass: 0.25, v0: 230, origin: 'EUA' }, ''),
      V('sp101', 'Ruger SP101', 'detective', { cal: '357', mag: 5, mass: 0.7, v0: 420, origin: 'EUA' }, ''), V('raging', 'Taurus Raging Bull', 'm29', { cal: '454casull', origin: 'Brasil', mass: 1.9, v0: 590 }, ''), V('anaconda', 'Colt Anaconda', 'python', { cal: '44mag', origin: 'EUA', mass: 1.5, v0: 430 }, ''), V('webley', 'Webley Mk VI', 'detective', { cal: '45colt', origin: 'Reino Unido', mag: 6, v0: 190 }, ''),
      V('saiga12', 'Saiga-12', 'benelli', { origin: 'Rússia', mag: 8, mass: 3.6, rpm: 180 }, ''), V('spas15', 'Franchi SPAS-15', 'moss500', { origin: 'Itália', mag: 6, mass: 3.9, rpm: 150 }, ''), V('stoeger', 'Stoeger Coach Gun', 'coach', { origin: 'Turquia', mass: 3.0 }, '')
    );
    // modelos 3D mais realistas (CC0) no lugar dos genéricos
    const OV = { makarov: 'pool:makarov_cc0:glb', kar98k: 'pool:kar98k_obj:obj', c96: 'pool:mauser_c96:obj', ak47: 'pool:ak47_tex:glb', m4a1: 'pool:m4a1_tex:glb' };
    T.forEach((r) => { if (OV[r[0]]) r[11] = OV[r[0]]; }); rows.forEach((r) => { if (OV[r[0]]) r[11] = OV[r[0]]; });
    return rows;
  };
})();
