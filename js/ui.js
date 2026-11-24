// Menu, HUD da bodycam, placar.
(function () {
  const BC = window.BC, G = BC.G, DUMMY = document.createElement('div'), $ = (id) => document.getElementById(id) || DUMMY;
  const UI = BC.UI = {};
  let recStart = 0, msgT = 0, lastAmmo = '', hmT = 0;

  UI.boot = function () {
    G.go();
    const S = G.settings;
    // mapas
    const mapsEl = $('maps');
    for (const id of BC.MAP_ORDER) {
      const m = BC.maps[id], d = document.createElement('div'); d.className = 'card' + (S.map === id ? ' sel' : ''); d.dataset.id = id;
      d.innerHTML = `<div class="sw" style="background:linear-gradient(160deg,${m.sw[0]},${m.sw[1]})"></div><div class="t">${m.name}</div><div class="d">${m.desc}</div>`;
      d.onclick = () => { S.map = id; [...mapsEl.children].forEach((c) => c.classList.toggle('sel', c === d)); };
      mapsEl.appendChild(d);
    }
    // seu uniforme / bandeira: busca + grade de todas as bandeiras
    const skEl = $('skins'), search = $('skSearch'), cardOf = {};
    const flagSrc = (t) => (t.flag === 'SU' || t.flag === 'NATO') ? null : 'flags/' + t.flag.toLowerCase() + '.svg';
    BC.TEAMS.forEach((t, i) => {
      const d = document.createElement('div'); d.className = 'card' + (S.skin === i ? ' sel' : ''); d.dataset.n = t.name.toLowerCase();
      const src = flagSrc(t); let im;
      if (src) { im = document.createElement('img'); im.loading = 'lazy'; im.src = src; im.style.cssText = 'display:block;width:100%;height:56px;object-fit:contain;background:#0b120c;padding:5px'; }
      else im = BC.drawFlag(t.flag, 120, 80);
      d.appendChild(im);
      const tt = document.createElement('div'); tt.className = 't'; tt.textContent = t.name; d.appendChild(tt);
      d.onclick = () => { S.skin = i; for (const k in cardOf) cardOf[k].classList.toggle('sel', +k === i); };
      skEl.appendChild(d); cardOf[i] = d;
    });
    search.addEventListener('input', () => { const q = search.value.trim().toLowerCase(); for (const k in cardOf) cardOf[k].style.display = !q || cardOf[k].dataset.n.includes(q) ? '' : 'none'; });
    // opções
    BC.TEAMS.forEach((t, i) => { const o = document.createElement('option'); o.value = i; o.textContent = t.name; $('oEnemy').appendChild(o); });
    if (S.skin >= BC.TEAMS.length) S.skin = 4;
    if (S.enemy === undefined || S.enemy === S.skin) S.enemy = S.skin === 1 ? 0 : 1; $('oEnemy').value = S.enemy;
    for (const [k, n] of BC.Modes.list) { const o = document.createElement('option'); o.value = k; o.textContent = n; $('oMode').appendChild(o); } $('oMode').value = S.mode || 'tdm'; $('oVeh').value = S.vehicles || 'on';
    for (const k in BC.DIFF) { const o = document.createElement('option'); o.value = k; o.textContent = BC.DIFF[k].name; $('oDiff').appendChild(o); }
    $('oDiff').value = S.diff; $('oSize').value = S.size; $('oMapSize').value = S.mapSize || 'grande'; $('oQual').value = S.quality;
    $('oFov').value = S.fov; $('oSens').value = Math.round(S.sens * 100); $('oVol').value = Math.round(S.vol * 100); $('oDot').checked = S.dot;
    const sync = () => { $('vFov').textContent = $('oFov').value; $('vSens').textContent = ($('oSens').value / 100).toFixed(2); $('vVol').textContent = $('oVol').value; };
    sync();
    ['oFov', 'oSens', 'oVol'].forEach((id) => $(id).addEventListener('input', sync));
    const collect = UI.collect = () => {
      S.mode = $('oMode').value; S.vehicles = $('oVeh').value; S.diff = $('oDiff').value; S.farda = $('oFarda').value; S.fardaE = $('oFardaE').value; S.size = +$('oSize').value; S.mapSize = $('oMapSize').value; S.quality = $('oQual').value; S.fov = +$('oFov').value; S.sens = $('oSens').value / 100; S.vol = $('oVol').value / 100; S.enemy = +$('oEnemy').value; if (S.enemy === S.skin) S.enemy = (S.skin + 1) % BC.TEAMS.length;
    };
    $('play').onclick = () => {
      if (BC.MP) BC.MP.leave(); collect();
      $('play').disabled = true; $('mstat').textContent = 'carregando bandeiras…';
      Promise.all([BC.loadFlag(BC.TEAMS[S.skin].flag), BC.loadFlag(BC.TEAMS[S.enemy].flag)]).then(() => { $('play').disabled = false; $('menu').classList.add('hidden'); G.start({}); G.paused = false; G.lock(); });
    };
    $('resume').onclick = () => G.lock();
    $('tomenu').onclick = () => { if (BC.MP && G.net) BC.MP.leave(); G.running = false; $('pause').classList.add('hidden'); $('cam').classList.add('hidden'); $('menu').classList.remove('hidden'); BC.Audio.stopAmbient(); if (document.exitPointerLock) document.exitPointerLock(); };
    $('endmenu').onclick = () => { $('end').classList.add('hidden'); $('tomenu').onclick(); };
    $('again').onclick = () => { if (G.net) { $('tomenu').onclick(); $('end').classList.add('hidden'); return; } $('end').classList.add('hidden'); G.start({}); G.paused = false; G.lock(); };
    // fardas e agentes
    const FARDAS = [['pais', 'Padrão do país'], ['woodland', 'Floresta (Woodland)'], ['desert', 'Deserto'], ['snow', 'Inverno (neve)'], ['urban', 'Urbano (cinza)'], ['black', 'Operações Especiais (preto)']];
    for (const id of ['oFarda', 'oFardaE']) { for (const [k, n] of FARDAS) { const o = document.createElement('option'); o.value = k; o.textContent = n; $(id).appendChild(o); } }
    $('oFarda').value = S.farda || 'pais'; $('oFardaE').value = S.fardaE || 'pais';
    const agEl = $('agents'), agCards = [];
    BC.AGENTS.forEach((a, i) => { const d = document.createElement('div'); d.className = 'card' + ((S.agent || 0) === i ? ' sel' : ''); d.innerHTML = `<div class="t">${a.name}</div><div class="d" style="display:block;padding:0 8px 8px;font-size:11px">${a.role}</div>`; d.onclick = () => { S.agent = i; agCards.forEach((c, k) => c.classList.toggle('sel', k === i)); }; agEl.appendChild(d); agCards.push(d); });
    // arsenal: escolha até 2 armas
    const ars = $('arsenal'), filt = $('wfilters'); let cls = 'all'; const cards = {};
    if (!Array.isArray(S.loadout) || !S.loadout.length) S.loadout = BC.DEFAULT_LOADOUT.slice();
    S.loadout = S.loadout.filter((id) => BC.WMAP[id]).slice(0, 2); if (!S.loadout.length) S.loadout = BC.DEFAULT_LOADOUT.slice();
    S.scopes = S.scopes || {};
    const OPT = { launcher: ['iron'], pistol: ['iron', 'reddot', 'micro'], revolver: ['iron'], smg: ['iron', 'reddot', 'micro', 'reflex', 'holo'], rifle: ['iron', 'reddot', 'micro', 'reflex', 'holo', 'prism', 'acog', 'lpvo', 'thermal', 'nv', 'mid'], lmg: ['iron', 'reddot', 'holo', 'prism', 'acog'], shotgun: ['iron', 'reddot', 'micro', 'reflex', 'holo'], sniper: ['iron', 'acog', 'lpvo', 'mid', 'dmr', 'thermal', 'nv', 'long'] };
    const refreshSel = () => {
      for (const id in cards) cards[id].classList.toggle('sel', S.loadout.includes(id)); $('wsel').textContent = S.loadout.map((id) => BC.WMAP[id].name).join('  +  ');
      const box = $('wscopes'); box.innerHTML = '';
      for (const id of S.loadout) {
        const w = BC.WMAP[id], lab = document.createElement('label'), sel = document.createElement('select'); lab.textContent = 'Mira · ' + w.name + ' '; lab.appendChild(sel);
        for (const k of OPT[w.cls]) { const o = document.createElement('option'); o.value = k; o.textContent = (k === 'iron' && w.scope) ? 'Padrão da arma' : BC.SCOPES[k].name; sel.appendChild(o); }
        sel.value = S.scopes[id] || 'iron'; sel.onchange = () => { S.scopes[id] = sel.value; }; box.appendChild(lab);
      }
    };
    const chip = (k, t) => { const b = document.createElement('button'); b.textContent = t; b.className = 'chip'; b.onclick = () => { cls = k; for (const c of filt.children) c.classList.toggle('on', c === b); for (const id in cards) cards[id].style.display = (k === 'all' || BC.WMAP[id].cls === k) ? '' : 'none'; }; filt.appendChild(b); return b; };
    chip('all', 'Todas (' + BC.WEAPONS.length + ')').classList.add('on'); for (const k in BC.CLASSES) chip(k, BC.CLASSES[k] + ' (' + BC.WEAPONS.filter((w) => w.cls === k).length + ')');
    for (const w of BC.WEAPONS) {
      const hits = Math.ceil(100 / (w.dmg * (w.pellets > 1 ? 6 : 1))), d = document.createElement('div'); d.className = 'w';
      d.innerHTML = `<b>${w.name}</b> <span class="k">· ${w.type} · ${w.origin}</span><br><span class="k">Calibre:</span> ${w.cal}<br><span class="k">Dano:</span> ${w.pellets > 1 ? w.pellets + '×' : ''}${Math.round(w.dmg)} (${hits} tiro${hits > 1 ? 's' : ''} no corpo) · cabeça ×${w.headMul}<br><span class="k">Cadência:</span> ${w.auto ? 'auto' : 'semi'} ${w.rpm} · <span class="k">Pente:</span> ${w.mag} · <span class="k">v0:</span> ${w.v0} m/s · ${w.mass} kg`;
      d.onclick = () => { const i = S.loadout.indexOf(w.id); if (i >= 0) { if (S.loadout.length > 1) S.loadout.splice(i, 1); } else { S.loadout.push(w.id); if (S.loadout.length > 2) S.loadout.shift(); } refreshSel(); };
      ars.appendChild(d); cards[w.id] = d;
    }
    refreshSel();
    $('play').disabled = true; $('mstat').textContent = 'carregando modelos 3D…';
    BC.loadModels().then(() => BC.loadArsenal()).then(() => BC.loadGrenades()).then(() => { if (BC.loadAnimals) BC.loadAnimals(); return BC.loadSights && BC.loadSights(); }).catch((e) => console.warn('carga', e)).then(() => { $('play').disabled = false; $('mstat').textContent = BC.WEAPONS.length + ' armas · ' + Object.keys(BC.MODELS).length + ' com modelo 3D · ' + (BC.SOUND_DATA ? Object.values(BC.SOUND_DATA).reduce((a, b) => a + b.length, 0) + ' gravações de tiro' : 'sons sintéticos'); });
    // relógio
    setInterval(() => { const n = new Date(), p = (v) => String(v).padStart(2, '0'); $('clock').textContent = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`; }, 500);
  };

  UI.onStart = function () {
    recStart = performance.now(); const T = G.teamDefs[0];
    $('camId').textContent = 'TACCAM X2 · ' + T.id + '-' + String(Math.floor(Math.random() * 9000) + 1000);
    $('feed').innerHTML = ''; $('score').classList.add('hidden'); $('end').classList.add('hidden'); $('pause').classList.add('hidden'); $('dead').classList.add('hidden');
    $('timeL').textContent = '/' + G.killLimit;
    const wl = $('wlist'); wl.innerHTML = ''; G.loadout.forEach((w, i) => { const s = document.createElement('span'); s.textContent = (i + 1) + ' ' + w.name; wl.appendChild(s); });
    $('dot').style.display = G.settings.dot ? '' : 'none';
    UI.weaponChanged();
  };
  UI.weaponChanged = function () {
    const P = G.player; if (!P) return; const w = P.w[P.cur], s = w.spec;
    $('wname').textContent = s.name; $('wcal').textContent = s.cal;
    $('wmode').textContent = s.shellReload ? 'PUMP' : s.auto ? (w.mode === 'auto' ? 'AUTO' : 'SEMI') : 'SEMI';
    [...$('wlist').children].forEach((c, i) => c.classList.toggle('on', i === P.cur));
    $('dot').style.display = G.settings.dot ? '' : 'none'; lastAmmo = '';
  };
  UI.hitmarker = function (head, kill) {
    return;
    const h = $('hitm'); h.className = kill ? 'kill' : head ? 'head' : ''; h.style.opacity = 1; clearTimeout(hmT); hmT = setTimeout(() => { h.style.opacity = 0; }, 130);
  };
  UI.indicator = function (angWorld) { // ângulo mundo→relativo ao olhar
    const P = G.player, rel = Math.atan2(Math.sin(Math.PI + P.yaw - angWorld), Math.cos(Math.PI + P.yaw - angWorld));
    G.addLocalGlitch(0.5 + Math.sin(rel) * 0.33, 0.5 + Math.cos(rel) * 0.3, 0.7);
    const el = document.createElement('i'); el.style.transform = `rotate(${rel}rad)`; $('indic').appendChild(el); setTimeout(() => el.remove(), 1100);
  };
  UI.killfeed = function (k, v, wid, head) {
    return;
    const f = $('feed'), d = document.createElement('div'), w = BC.WMAP[wid];
    const mine = (k && k.isPlayer) || v.isPlayer;
    d.className = (k && k.team === 0 ? 'a' : 'b') + (mine ? ' me' : '');
    d.textContent = (k ? k.name : '?') + '  [' + (w ? w.name : '—') + (head ? ' ◉' : '') + ']  ' + v.name;
    f.appendChild(d); while (f.children.length > 5) f.removeChild(f.firstChild); setTimeout(() => d.remove(), 7000);
  };
  UI.lensBlood = function (n) {
    const box = $('lens'); if (!box.appendChild) return;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i'), sz = 28 + Math.random() * 90, cx = 8 + Math.random() * 84, cy = 8 + Math.random() * 84;
      d.style.cssText = `position:absolute;left:${cx}%;top:${cy}%;width:${sz}px;height:${sz * (0.8 + Math.random() * 0.5)}px;margin:${-sz / 2}px;border-radius:${40 + Math.random() * 20}% ${40 + Math.random() * 20}% ${50 + Math.random() * 20}% ${40 + Math.random() * 20}%;background:radial-gradient(circle at 40% 35%,rgba(150,10,10,.85),rgba(90,4,4,.8) 60%,rgba(60,0,0,.0) 100%);filter:blur(1.2px);opacity:.95;transition:opacity 4.5s ease-in,transform 4.5s ease-in;`;
      box.appendChild(d); requestAnimationFrame(() => { d.style.opacity = 0; d.style.transform = `translateY(${30 + Math.random() * 60}px)`; }); setTimeout(() => d.remove(), 4700);
    }
  };
  UI.feedClear = () => { $('feed').innerHTML = ''; };
  UI.msg = function (t, sec) {
    return; const m = $('msg'); m.textContent = t; m.style.opacity = 1; msgT = sec || 1.5; };
  const RET = {
    pso: '<line x1="50" y1="0" x2="50" y2="44" /><line x1="50" y1="56" x2="50" y2="100"/><line x1="0" y1="50" x2="44" y2="50"/><line x1="56" y1="50" x2="100" y2="50"/><path d="M44 62 L50 56 L56 62" />',
    chev: '<path d="M50 48 L40 64 M50 48 L60 64" stroke-width="1.4"/><line x1="50" y1="0" x2="50" y2="44"/><line x1="0" y1="50" x2="44" y2="50"/><line x1="56" y1="50" x2="100" y2="50"/><circle cx="50" cy="48" r="0.8" fill="#f33" stroke="#f33"/>',
    cross: '<line x1="50" y1="0" x2="50" y2="100"/><line x1="0" y1="50" x2="100" y2="50"/><circle cx="50" cy="50" r="2.5" fill="none"/>',
    mil: '<line x1="50" y1="0" x2="50" y2="100"/><line x1="0" y1="50" x2="100" y2="50"/><circle cx="35" cy="50" r="1"/><circle cx="42" cy="50" r="1"/><circle cx="58" cy="50" r="1"/><circle cx="65" cy="50" r="1"/><circle cx="50" cy="35" r="1"/><circle cx="50" cy="42" r="1"/><circle cx="50" cy="58" r="1"/><circle cx="50" cy="65" r="1"/>'
  };
  UI.setScope = (on, type) => { const el = $('scope'); el.classList.toggle('hidden', !on); if (on) { const k = (BC.SCOPES[type] && BC.SCOPES[type].ret) || 'pso'; if (el.dataset.k !== k) { el.dataset.k = k; el.querySelector('.ret').innerHTML = '<svg viewBox="0 0 100 100" width="100%" height="100%" stroke="#000" stroke-width="0.6" fill="none">' + RET[k] + '</svg>'; } } };
  UI.setAim = (x, y) => { const st = document.documentElement.style; st.setProperty('--ax', x.toFixed(1) + 'px'); st.setProperty('--ay', y.toFixed(1) + 'px'); };
  UI.setDot = (on, type) => { const el = $('rdot'); el.style.display = on ? 'block' : 'none'; if (on) el.className = type === 'holo' ? 'holo' : 'dot'; };
  UI.scoreboard = function (on) {
    const el = $('score'); if (!on) { el.classList.add('hidden'); return; }
    const row = (a) => `<tr><td>${a.isPlayer ? '▶ ' : ''}${String(a.name).replace(/[<>&"]/g, '')}</td><td>${a.kills || 0}</td><td>${a.deaths || 0}</td></tr>`;
    let h = '';
    for (let t = 0; t < 2; t++) {
      const list = G.actors.filter((a) => a.team === t).sort((a, b) => (b.kills || 0) - (a.kills || 0));
      h += `<div class="tt">${G.teamDefs[t].name.toUpperCase()} — ${G.score[t]}</div><table><tr><th>Soldado</th><th>Abates</th><th>Mortes</th></tr>${list.map(row).join('')}</table>`;
    }
    el.innerHTML = h; el.classList.remove('hidden');
  };
  UI.lockChanged = function (locked) {
    if (!G.running || G.over) return;
    $('pause').classList.toggle('hidden', locked); G.paused = !locked && !G.net;
  };
  UI.endHunt = function (win, sc, k) {
    $('endT').textContent = win ? 'VITÓRIA NA CAÇA' : sc[0] === sc[1] ? 'EMPATE NA CAÇA' : 'DERROTA NA CAÇA'; $('endT').style.color = win ? '#9fe6a3' : '#ff8a7a';
    $('endS').textContent = G.teamDefs[0].name + ' ' + Math.floor(sc[0]) + ' pts (' + k[0] + ' animais) × ' + Math.floor(sc[1]) + ' pts (' + k[1] + ' animais) ' + G.teamDefs[1].name; $('end').classList.remove('hidden'); if (document.exitPointerLock) document.exitPointerLock();
  };
  UI.endMatch = function (win) {
    $('endT').textContent = win ? 'VITÓRIA' : 'DERROTA'; $('endT').style.color = win ? '#9fe6a3' : '#ff8a7a';
    $('endS').textContent = G.teamDefs[0].name + ' ' + G.score[0] + ' × ' + G.score[1] + ' ' + G.teamDefs[1].name + ' · seus abates: ' + G.player.kills + ' · mortes: ' + G.player.deaths;
    $('end').classList.remove('hidden'); if (document.exitPointerLock) document.exitPointerLock();
  };
  UI.frame = function (dt) {
    const P = G.player; if (!P) return;
    const t = Math.floor((performance.now() - recStart) / 1000), p = (v) => String(v).padStart(2, '0');
    $('recT').textContent = `${p(Math.floor(t / 3600))}:${p(Math.floor(t / 60) % 60)}:${p(t % 60)}`;
    const P2 = G.player; if (P2 && P2.gren) { const g = BC.GREN[P2.grSel]; $('gren').textContent = P2.gren[P2.grSel] > 0 ? g.short + ' ×' + P2.gren[P2.grSel] + '  [G] lançar · [H] trocar   ' + Object.keys(P2.gren).map((k) => BC.GREN[k].short + ':' + P2.gren[k]).join(' ') : 'sem granadas'; $('stance').textContent = P2.prone > 0.5 ? 'DEITADO' : P2.crouch > 0.5 ? 'AGACHADO' : ''; $('gren').textContent += '   V bandagem ×' + (P2.kit ? P2.kit.band : 0) + '  X kit médico ×' + (P2.kit ? P2.kit.med : 0) + '  E veículo' + (P2.heal ? '   · CURANDO…' : '') + (P2.inVeh ? '   · NO BLINDADO' : ''); }
    $('tefill').style.width = (P.tension || 0).toFixed(0) + '%'; $('tefill').style.background = P.tension > 70 ? '#ff5a4a' : P.tension > 40 ? '#e8a84a' : '#d8d86a'; $('mofill').style.width = (P.morale || 0).toFixed(0) + '%';
    $('hpfill').style.width = P.hp + '%'; $('hpfill').style.background = P.hp < 30 ? '#ff5a4a' : P.hp < 60 ? '#e8c86a' : '#9ad79a'; $('hpn').textContent = Math.ceil(P.hp);
    const w = P.w[P.cur], a = w.mag + '|' + w.reserve + '|' + (P.rl ? 1 : 0); if (a !== lastAmmo) { lastAmmo = a; $('am').textContent = w.mag; $('ar').textContent = '/ ' + w.reserve; $('am').style.color = w.mag <= Math.ceil(w.spec.mag * 0.25) ? '#ff8a6a' : ''; }
    if (false) { }
    else { $('scoreA').textContent = Math.floor(G.score[0]); $('scoreB').textContent = Math.floor(G.score[1]); $('timeL').textContent = G.hunt ? '' : '/' + G.killLimit; }
    if ((G.frame || 0) % 6 === 0) $('pts').innerHTML = BC.Modes.hudText();
    const hd = ((-P.yaw * 180 / Math.PI) % 360 + 360) % 360, dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
    $('compass').textContent = dirs[Math.round(hd / 45) % 8] + ' ' + String(Math.round(hd) % 360).padStart(3, '0') + '°';
    $('gps').textContent = `${(23.5505 + P.z * 9e-6).toFixed(5)}°S ${(46.6333 + P.x * 9e-6).toFixed(5)}°O · ALT ${(P.y + 12).toFixed(0)}m`;
    $('dead').classList.toggle('hidden', P.alive);
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) $('msg').style.opacity = 0; }
  };
})();
