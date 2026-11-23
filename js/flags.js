// 18 bandeiras desenhadas por código + camuflagens + lista de times/uniformes.
(function () {
  const BC = window.BC;
  const hs = (g, w, h, cols, wt) => { const t = (wt || cols.map(() => 1)).reduce((a, b) => a + b, 0); let y = 0; cols.forEach((c, i) => { const hh = h * (wt ? wt[i] : 1) / t; g.fillStyle = c; g.fillRect(0, y, w, hh + 1); y += hh; }); };
  const vs = (g, w, h, cols, wt) => { const t = (wt || cols.map(() => 1)).reduce((a, b) => a + b, 0); let x = 0; cols.forEach((c, i) => { const ww = w * (wt ? wt[i] : 1) / t; g.fillStyle = c; g.fillRect(x, 0, ww + 1, h); x += ww; }); };
  const circ = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const star = (g, cx, cy, r, c, rot) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (rot || -Math.PI / 2) + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); };

  const FL = {
    BR(g, w, h) {
      g.fillStyle = '#009c3b'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(w * 0.5, h * 0.09); g.lineTo(w * 0.93, h * 0.5); g.lineTo(w * 0.5, h * 0.91); g.lineTo(w * 0.07, h * 0.5); g.closePath(); g.fill();
      circ(g, w / 2, h / 2, h * 0.27, '#002776'); g.save(); g.beginPath(); g.arc(w / 2, h / 2, h * 0.27, 0, 7); g.clip(); g.strokeStyle = '#fff'; g.lineWidth = h * 0.06; g.beginPath(); g.arc(w / 2, h * 0.98, h * 0.5, Math.PI * 1.18, Math.PI * 1.82); g.stroke(); g.restore();
    },
    US(g, w, h) {
      const sh = h / 13; for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#fff' : '#b22234'; g.fillRect(0, i * sh, w, sh + 1); }
      g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.42, sh * 7); g.fillStyle = '#fff';
      for (let r = 0; r < 5; r++) for (let q = 0; q < 6 - (r % 2); q++) { const x = w * 0.42 * ((q + (r % 2 ? 1 : 0.5)) / 6), y = sh * 7 * ((r + 0.5) / 5); g.fillRect(x - w * 0.012, y - w * 0.012, w * 0.024, w * 0.024); }
    },
    RU(g, w, h) { hs(g, w, h, ['#fff', '#0039a6', '#d52b1e']); },
    UA(g, w, h) { hs(g, w, h, ['#0057b7', '#ffd700']); },
    DE(g, w, h) { hs(g, w, h, ['#000', '#dd0000', '#ffce00']); },
    FR(g, w, h) { vs(g, w, h, ['#0055a4', '#fff', '#ef4135']); },
    IT(g, w, h) { vs(g, w, h, ['#009246', '#fff', '#ce2b37']); },
    PL(g, w, h) { hs(g, w, h, ['#fff', '#dc143c']); },
    ES(g, w, h) { hs(g, w, h, ['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]); },
    PT(g, w, h) { vs(g, w, h, ['#006600', '#ff0000'], [2, 3]); circ(g, w * 0.4, h / 2, h * 0.2, '#ffcc00'); circ(g, w * 0.4, h / 2, h * 0.12, '#ff0000'); },
    CA(g, w, h) { vs(g, w, h, ['#d52b1e', '#fff', '#d52b1e'], [1, 2, 1]); star(g, w / 2, h / 2, h * 0.3, '#d52b1e'); },
    JP(g, w, h) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); circ(g, w / 2, h / 2, h * 0.3, '#bc002d'); },
    CN(g, w, h) { g.fillStyle = '#de2910'; g.fillRect(0, 0, w, h); star(g, w * 0.17, h * 0.27, h * 0.2, '#ffde00'); [[0.34, 0.1], [0.4, 0.2], [0.4, 0.34], [0.34, 0.44]].forEach((p) => star(g, w * p[0], h * p[1], h * 0.06, '#ffde00')); },
    AR(g, w, h) { hs(g, w, h, ['#74acdf', '#fff', '#74acdf']); circ(g, w / 2, h / 2, h * 0.1, '#f6b40e'); },
    MX(g, w, h) { vs(g, w, h, ['#006847', '#fff', '#ce1126']); circ(g, w / 2, h / 2, h * 0.14, '#8a5a2a'); },
    TR(g, w, h) { g.fillStyle = '#e30a17'; g.fillRect(0, 0, w, h); circ(g, w * 0.38, h / 2, h * 0.26, '#fff'); circ(g, w * 0.44, h / 2, h * 0.21, '#e30a17'); star(g, w * 0.58, h / 2, h * 0.13, '#fff', 0); },
    IL(g, w, h) {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#0038b8'; g.fillRect(0, h * 0.1, w, h * 0.13); g.fillRect(0, h * 0.77, w, h * 0.13);
      g.strokeStyle = '#0038b8'; g.lineWidth = h * 0.035; const r = h * 0.2, cx = w / 2, cy = h / 2;
      for (const s of [-1, 1]) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 * s + i * 2.0944; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.stroke(); }
    },
    GB(g, w, h) {
      g.fillStyle = '#012169'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#fff'; g.lineWidth = h * 0.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
      g.strokeStyle = '#c8102e'; g.lineWidth = h * 0.07; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(w * 0.4, 0, w * 0.2, h); g.fillRect(0, h * 0.35, w, h * 0.3);
      g.fillStyle = '#c8102e'; g.fillRect(w * 0.44, 0, w * 0.12, h); g.fillRect(0, h * 0.4, w, h * 0.2);
    }
  };
  // camuflagens
  const CAMO = {
    pixelgreen: { base: '#4b5d2c', cols: ['#44552a', '#2b3a1c', '#6a6a3a', '#3a2c1a'], pix: true },
    mm14: { base: '#7a7a4a', cols: ['#5b6b3a', '#9a8a5a', '#3e4a2e', '#6a5a3a'], pix: true },
    ocp: { base: '#a89a78', cols: ['#7d8560', '#8c7a5a', '#5b4a35', '#b5a583', '#6a7350'] },
    woodland: { base: '#4a5a2e', cols: ['#2d3a1c', '#6a5a35', '#1c1c14', '#5d6b35'] },
    desert: { base: '#c2a878', cols: ['#a98d5e', '#d8c394', '#8b7348'] },
    olive: { base: '#4c5236', cols: ['#434a30', '#565d3e', '#3a402a'], speck: true },
    snow: { base: '#dfe3e6', cols: ['#b9c1c8', '#f4f6f8', '#9aa4ad', '#c9d0d6'] },
    urban: { base: '#6d7074', cols: ['#4a4d52', '#8a8d92', '#34363a', '#5b5e63'], pix: true },
    black: { base: '#1b1c1e', cols: ['#2a2b2e', '#111213', '#33343a'], speck: true }
  };
  BC.camoCanvasExt = function (kind) {
    const k = CAMO[kind] || CAMO.olive, s = 128, cv = document.createElement('canvas'); cv.width = cv.height = s;
    const g = cv.getContext('2d'), r = BC.rng(kind.length * 13 + 5);
    g.fillStyle = k.base; g.fillRect(0, 0, s, s);
    if (k.pix) for (let i = 0; i < 140; i++) { g.fillStyle = k.cols[(r() * k.cols.length) | 0]; g.fillRect(((r() * 16) | 0) * 8, ((r() * 16) | 0) * 8, (1 + ((r() * 3) | 0)) * 8, (1 + ((r() * 2) | 0)) * 8); }
    else if (k.speck) for (let i = 0; i < 500; i++) { g.fillStyle = k.cols[(r() * 3) | 0]; g.fillRect(r() * s, r() * s, 1 + r() * 3, 1 + r() * 3); }
    else for (let i = 0; i < 75; i++) { g.fillStyle = k.cols[(r() * k.cols.length) | 0] + 'cc'; g.beginPath(); g.ellipse(r() * s, r() * s, 5 + r() * 13, 3 + r() * 8, r() * 3, 0, 7); g.fill(); }
    return cv;
  };


  FL.SU = (g, w, h) => {
    g.fillStyle = '#cc0000'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd700'; g.strokeStyle = '#ffd700';
    star(g, w * 0.17, h * 0.2, h * 0.11, '#ffd700');
    g.lineWidth = h * 0.045; g.beginPath(); g.arc(w * 0.19, h * 0.5, h * 0.17, Math.PI * 0.55, Math.PI * 1.95); g.stroke();          // foice
    g.save(); g.translate(w * 0.17, h * 0.46); g.rotate(-0.8); g.fillRect(-h * 0.04, -h * 0.24, h * 0.08, h * 0.5); g.fillRect(-h * 0.14, -h * 0.26, h * 0.26, h * 0.1); g.restore(); // martelo
  };
  FL.NATO = (g, w, h) => {
    g.fillStyle = '#004990'; g.fillRect(0, 0, w, h); const cx = w / 2, cy = h / 2, R = h * 0.4;
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = h * 0.03; g.beginPath(); g.arc(cx, cy, R * 0.45, 0, 7); g.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a + 0.2) * R * 0.12, cy + Math.sin(a + 0.2) * R * 0.12); g.lineTo(cx + Math.cos(a - 0.2) * R * 0.12, cy + Math.sin(a - 0.2) * R * 0.12); g.closePath(); g.fill(); }
    g.lineWidth = h * 0.012; for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.45); g.lineTo(cx + Math.cos(a) * R * 0.75, cy + Math.sin(a) * R * 0.75); g.stroke(); }
  };
  const FILES = new Set(["ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bl", "bm", "bn", "bo", "bq", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "eh", "er", "es", "et", "eu", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb-eng", "gb-nir", "gb-sct", "gb-wls", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mf", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om", "pa", "pc", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "sv", "sx", "sy", "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tr", "tt", "tv", "tw", "tz", "ua", "ug", "um", "un", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi", "vn", "vu", "wf", "ws", "xk", "ye", "yt", "za", "zm", "zw"]);
  BC.flagCache = {};
  const finish = (cv) => { const g = cv.getContext('2d'); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(2, cv.height * 0.05); g.strokeRect(0, 0, cv.width, cv.height); return cv; };
  // desenha (usa o SVG real já carregado, ou o desenho procedural)
  BC.drawFlag = function (code, w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), k = code.toLowerCase();
    if (BC.flagCache[k]) g.drawImage(BC.flagCache[k], 0, 0, w, h); else (FL[code.toUpperCase()] || FL.BR)(g, w, h);
    return finish(cv);
  };
  BC.loadFlag = function (code) {
    const k = code.toLowerCase();
    return new Promise((res) => {
      if (BC.flagCache[k] || !FILES.has(k)) return res();
      const img = new Image(); img.onload = () => { BC.flagCache[k] = img; res(); }; img.onerror = () => res(); img.src = 'flags/' + k + '.svg';
    });
  };

  // camuflagens por país (clima/uso aproximado)
  const DESERT = new Set('sa ae qa kw bh om ye iq sy jo eg ly dz tn ma sd so ml ne td mr eh ir af pk'.split(' '));
  const KIND = ['woodland', 'olive', 'mm14', 'pixelgreen', 'ocp', 'olive'];
  const FIXED = { br: 'pixelgreen', us: 'ocp', ru: 'mm14', ua: 'mm14', de: 'woodland', gb: 'ocp', fr: 'woodland', it: 'woodland', es: 'desert', pt: 'woodland', pl: 'woodland', ca: 'pixelgreen', jp: 'pixelgreen', cn: 'pixelgreen', ar: 'olive', mx: 'woodland', tr: 'woodland', il: 'olive', su: 'woodland', nato: 'ocp', eu: 'woodland', un: 'olive' };
  const DEF = { pixelgreen: [0x394a2c, 0x2f3e25, 0x232a1c], ocp: [0x7d6c4b, 0x8b7a58, 0x3b3328], woodland: [0x3d4a2b, 0x35452a, 0x2a2f1f], mm14: [0x5a5a3a, 0x4b5636, 0x2e2e22], desert: [0x9a8560, 0x8f7b55, 0x4a3f2a], olive: [0x4a4f33, 0x3e4730, 0x2b2f20], snow: [0xcfd5da, 0xdfe3e6, 0x6a6f74], urban: [0x4a4d52, 0x55585d, 0x2b2d30], black: [0x1e1f22, 0x232427, 0x111213] };
  BC.CAMO_DEF = DEF;
  const SKINS = [0xc79a76, 0xd5a982, 0xb98562, 0xe0b894, 0x9c6b48, 0x7a5236, 0x5e3b25];
  const NAMES = { 'gb-eng': 'Inglaterra', 'gb-sct': 'Escócia', 'gb-wls': 'País de Gales', 'gb-nir': 'Irlanda do Norte', eu: 'União Europeia', un: 'ONU (Nações Unidas)', xk: 'Kosovo', su: 'União Soviética', nato: 'OTAN' };
  const UNITS = { br: 'Exército Brasileiro', us: 'US Army', ru: 'Forças Armadas', gb: 'British Army', fr: 'Armée de Terre', de: 'Bundeswehr', it: 'Esercito Italiano', es: 'Ejército de Tierra', pt: 'Exército Português', pl: 'Wojska Lądowe', ca: 'Canadian Army', jp: 'Força de Autodefesa', cn: 'Exército Popular', ar: 'Ejército Argentino', mx: 'Ejército Mexicano', tr: 'Kara Kuvvetleri', il: 'IDF', ua: 'Forças Armadas', su: 'Exército Vermelho', nato: 'Força Aliada', un: 'Capacetes Azuis' };
  let dn = null; try { dn = new Intl.DisplayNames(['pt-BR'], { type: 'region' }); } catch (e) { }
  const hashCode = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const ALL = ["ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bl", "bm", "bn", "bo", "bq", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "eh", "er", "es", "et", "eu", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb-eng", "gb-nir", "gb-sct", "gb-wls", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mf", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om", "pa", "pc", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "sv", "sx", "sy", "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tr", "tt", "tv", "tw", "tz", "ua", "ug", "um", "un", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi", "vn", "vu", "wf", "ws", "xk", "ye", "yt", "za", "zm", "zw"].concat(['su', 'nato']);
  const mk = (k, i) => {
    const name = NAMES[k] || (dn ? (function () { try { return dn.of(k.toUpperCase()); } catch (e) { return k.toUpperCase(); } })() : k.toUpperCase());
    const camo = FIXED[k] || (DESERT.has(k) ? 'desert' : KIND[hashCode(k) % KIND.length]);
    return { id: k.toUpperCase(), name, unit: UNITS[k] || 'Forças Armadas', flag: k.toUpperCase(), camo, vest: DEF[camo][0], helmet: DEF[camo][1], gear: DEF[camo][2], skin: SKINS[hashCode(k) % SKINS.length] };
  };
  const first = ['br', 'us', 'ru', 'ua', 'de', 'gb', 'fr', 'it', 'es', 'pt', 'pl', 'ca', 'jp', 'cn', 'ar', 'mx', 'tr', 'il'], extras = ['su', 'nato', 'eu', 'un'];
  const rest = ALL.filter((k) => !first.includes(k) && !extras.includes(k)).map((k) => mk(k)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  BC.TEAMS = [...extras.map((k) => mk(k)), ...first.map((k) => mk(k)), ...rest];
  BC.TEAMS.forEach((t, i) => { t.idx = i; });
})();
