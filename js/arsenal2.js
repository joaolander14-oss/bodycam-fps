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
      r[11] = 'var:' + base; r.push(Object.assign({}, b[13] || {}, { var: base, mod, sup: mod === 'sup' || undefined, zoom: o.zoom }));
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
    return rows;
  };
})();
