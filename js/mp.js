// Multijogador online (PeerJS, P2P em estrela). O ANFITRIÃO simula tudo (bots, dano, granadas);
// os CONVIDADOS mandam o próprio movimento/tiros e recebem o estado ~20×/s. Humanos se alternam entre os dois times.
(function () {
  const BC = window.BC, G = BC.G, T = THREE;
  const MP = BC.MP = { role: null, code: null, players: [], myId: 0, ver: 1, status: '', listeners: {} };
  const PREFIX = 'bodycam-';
  const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }, { urls: 'stun:stun.cloudflare.com:3478' },
    // retransmissão (TURN) para redes que bloqueiam a conexão direta (dados móveis, roteadores restritivos)
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turns:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }], iceCandidatePoolSize: 4 };
  const $ = (id) => document.getElementById(id);
  let peer = null, conns = [], toHost = null, remotes = [], acc = 0, endSent = false;
  const nets = new Map(); // convidado: chave -> NetActor
  const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
  const WIDX = {}; const widx = (id) => { if (!(id in WIDX)) WIDX[id] = BC.WEAPONS.findIndex((w) => w.id === id); return WIDX[id]; };
  const emit = (n, a) => { const f = MP.listeners[n]; if (f) f(a); };
  MP.on = (n, f) => { MP.listeners[n] = f; };
  const setStatus = (s) => { MP.status = s; emit('status', s); };
  const code5 = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  const sendTo = (c, m) => { try { if (c && c.open) c.send(m); } catch (e) { } };
  const bcast = (m, except) => { for (const c of conns) if (c !== except) sendTo(c, m); };
  const arr = (v) => [r2(v.x), r2(v.y), r2(v.z)];
  function loadPeer() {
    return new Promise((res, rej) => {
      if (window.Peer) return res();
      const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('Sem internet: não foi possível carregar a biblioteca de rede.'));
      document.head.appendChild(s);
    });
  }

  // ------------------------------------------------------------ atores de rede
  const lerpAng = (a, b, k) => { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * k; };
  class NetActor {
    constructor(team, name) {
      this.isNet = true; this.team = team; this.name = name; this.alive = false; this.model = null; this.r = 0.32; this.h = 1.78;
      this.x = this.y = this.z = 0; this.tx = this.ty = this.tz = 0; this.yaw = this.tyaw = 0; this.pitch = this.tpitch = 0; this.stn = this.tstn = 0; this.crouch = this.prone = 0;
      this.kills = 0; this.deaths = 0; this.walkPh = 0; this.deadT = 0; this.bleed = []; this.stains = 0; this.wi = -1; this.ag = -1; this.init = false; this.wasAlive = false; this.hp = 100;
    }
    damage() { return false; }
    setModel(wi, ag) {
      if (this.model) G.scene.remove(this.model.root);
      const spec = BC.WEAPONS[wi] || BC.WEAPONS[0]; this.wi = wi; this.ag = ag;
      this.model = BC.makeChar(G.teamDefs[this.team], spec.id, ag); G.scene.add(this.model.root); this.spec = spec;
    }
    setTarget(x, y, z, yaw, pitch, stn) {
      this.tx = x; this.ty = y; this.tz = z; this.tyaw = yaw; this.tpitch = pitch; this.tstn = stn;
      if (!this.init || Math.hypot(x - this.x, z - this.z) > 8) { this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.pitch = pitch; this.stn = stn; this.init = true; }
    }
    animate(dt) {
      if (!this.model) return;
      const m = this.model, k = Math.min(1, dt * 12), px = this.x, pz = this.z;
      this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.z += (this.tz - this.z) * k; this.yaw = lerpAng(this.yaw, this.tyaw, k); this.pitch += (this.tpitch - this.pitch) * k; this.stn += (this.tstn - this.stn) * Math.min(1, dt * 8);
      this.crouch = Math.min(this.stn, 1); this.prone = Math.max(0, this.stn - 1); this.h = 1.78 - 0.5 * this.crouch - 0.75 * this.prone;
      if (this.alive) {
        if (!this.wasAlive) { m.root.visible = true; m.root.quaternion.identity(); this.deadT = 0; }
        const sp = Math.hypot(this.x - px, this.z - pz) / Math.max(dt, 1e-3); this.walkPh += sp * dt * 2.0;
        const pd = Math.hypot(G.player.x - this.x, G.player.z - this.z); m.root.visible = pd < 280;
        m.root.position.set(this.x, this.y + m.api.lift, this.z); m.root.rotation.set(0, this.yaw, 0);
        m.pose(this.walkPh, Math.min(1, sp / 3.5) * 0.75, this.stn, G.time, BC.clamp(this.pitch, -0.5, 0.5), sp > 0.3 ? 1 : 0);
        this.stepAcc = (this.stepAcc || 0) + sp * dt; if (this.stepAcc > 1.9) { this.stepAcc = 0; const d = pd; if (d < 24 && sp > 2) BC.Audio.step(G.world.surf, 0.7, d, G.panTo(this.x, this.z)); }
      } else {
        if (this.wasAlive) { this.deadT = 0; G.fx.pool(this.x, this.y, this.z, 60); G.fx.blood({ x: this.x, y: this.y + 1.2, z: this.z }, { x: Math.sin(this.yaw), y: 0, z: Math.cos(this.yaw) }, 'body', G.world, 70); }
        this.deadT += dt; const u = Math.min(1, this.deadT / 0.7), e = u * u * (3 - 2 * u), fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
        m.root.quaternion.setFromAxisAngle(new T.Vector3(fz, 0, -fx), 1.5 * e).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), this.yaw));
        m.root.position.set(this.x, this.y + 0.12 * e, this.z);
        m.legL.rotation.x = 0.5 * e; m.legR.rotation.x = 0.2 * e; m.armsG.rotation.x = -0.8 * e; m.head.rotation.x = -0.4 * e;
        if (this.deadT > 14) m.root.visible = false;
      }
      this.wasAlive = this.alive;
    }
    update(dt) { this.animate(dt); }
    dispose() { if (this.model) G.scene.remove(this.model.root); this.model = null; }
  }

  // jogador humano visto pelo anfitrião: movimento vem do convidado, vida/dano é decidido aqui
  class RemoteP extends NetActor {
    constructor(id, p) {
      super(p.team, p.name); this.id = id; this.isRemote = true; this.conn = p.conn; this.hp = 100; this.respawnT = 0; this.loadout = p.loadout; this.agent = p.agent;
      this.alive = true; this.setModel(Math.max(0, widx(p.loadout[0])), p.agent);
      const sp = G.world.spawns[this.team][0]; this.setTarget(sp.x, G.world.heightAt(sp.x, sp.z), sp.z, 0, 0, 0);
    }
    damage(dmg, zone, from, wid, dir, kind) {
      if (!this.alive) return false;
      if (dmg > 0) G.fx.wound(this, zone, dir, dmg);
      this.hp -= dmg; const dead = this.hp <= 0;
      sendTo(this.conn, { t: 'h', hp: Math.max(0, Math.round(this.hp)), d: Math.round(dmg), x: r2(from ? from.x : this.x), z: r2(from ? from.z : this.z), zn: zone });
      if (dead) { this.hp = 0; this.alive = false; this.deaths++; this.respawnT = 5; G.onKill(from, this, wid, zone === 'head'); }
      return dead;
    }
    update(dt) {
      if (!this.alive) {
        this.respawnT -= dt;
        if (this.respawnT <= 0 && G.running && !G.over) this.respawn();
      }
      this.animate(dt);
    }
    respawn() {
      const sp = G.world.spawns[this.team]; let best = null, bd = -1;
      for (let i = 0; i < 5; i++) { const s = sp[(G.rng() * sp.length) | 0]; let m = 1e9; for (const e of G.actors) if (e !== this && e.alive && e.team !== this.team) m = Math.min(m, Math.hypot(e.x - s.x, e.z - s.z)); if (m > bd) { bd = m; best = s; } }
      this.hp = 100; this.alive = true; this.bleed = []; this.stains = 0; this.init = false; this.setTarget(best.x, G.world.heightAt(best.x, best.z), best.z, 0, 0, 0);
      this.setModel(this.wi, this.ag); sendTo(this.conn, { t: 'r', x: r2(best.x), z: r2(best.z) });
    }
    receive(m) {
      if (!this.alive) return;
      if (m.w !== undefined && m.w !== this.wi && m.w >= 0) this.setModel(m.w, this.ag);
      this.setTarget(m.x, m.y, m.z, m.yaw, m.pitch, m.stn);
    }
  }

  // ------------------------------------------------------------ rede: comum
  MP.leave = function () {
    try { conns.forEach((c) => c.close()); } catch (e) { } try { if (toHost) toHost.close(); } catch (e) { } try { if (peer) peer.destroy(); } catch (e) { }
    peer = null; conns = []; toHost = null; MP.role = null; MP.code = null; MP.players = []; MP.playing = false;
    for (const r of remotes) { r.dispose(); const i = G.actors.indexOf(r); if (i >= 0) G.actors.splice(i, 1); } remotes = [];
    for (const n of nets.values()) { n.dispose(); const i = G.actors.indexOf(n); if (i >= 0) G.actors.splice(i, 1); } nets.clear();
    G.net = null; G.myTeam = 0; emit('lobby', MP.players);
  };
  const lobbyMsg = () => ({ t: 'lobby', players: MP.players.map((p) => ({ name: p.name, team: p.team, host: !!p.host })) });
  function lobbyChanged() { bcast(lobbyMsg()); emit('lobby', MP.players); }

  // ------------------------------------------------------------ anfitrião
  MP.host = function (name, loadout, agent) {
    MP.leave(); setStatus('Criando a sala…');
    return loadPeer().then(() => new Promise((res, rej) => {
      let tries = 0;
      const make = () => {
        MP.code = code5(); peer = new Peer(PREFIX + MP.code, { debug: 0, config: ICE });
        peer.on('open', () => res(MP.code));
        peer.on('error', (e) => { if (e.type === 'unavailable-id' && tries++ < 5) { try { peer.destroy(); } catch (x) { } make(); } else rej(new Error('Não foi possível criar a sala (' + e.type + ').')); });
      };
      make(); setTimeout(() => { if (!MP.role) rej(new Error('Tempo esgotado ao conectar ao servidor de salas.')); }, 12000);
    })).then((code) => {
      MP.role = 'host'; MP.myId = 0; MP.players = [{ name, host: true, team: 0, loadout, agent, conn: null }];
      peer.on('connection', (c) => { c.on('data', (d) => hostRecv(c, d)); c.on('close', () => hostDrop(c)); c.on('error', () => hostDrop(c)); });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
      setStatus('Sala ' + code + ' criada. Passe o código aos amigos.'); lobbyChanged(); return code;
    });
  };
  function hostRecv(c, d) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'hello') {
      if (d.ver !== MP.ver) { sendTo(c, { t: 'rej', why: 'Versão diferente do jogo. Atualize a página (Ctrl+F5).' }); setTimeout(() => { try { c.close(); } catch (e) { } }, 300); return; }
      if (MP.playing) { sendTo(c, { t: 'rej', why: 'A partida já começou. Aguarde o fim.' }); return; }
      if (MP.players.length >= 8) { sendTo(c, { t: 'rej', why: 'Sala cheia (máximo 8 jogadores).' }); return; }
      const id = MP.players.length;
      MP.players.push({ name: String(d.name || 'Soldado').slice(0, 14), host: false, team: id % 2, loadout: (d.loadout || []).slice(0, 2), agent: d.agent | 0, conn: c }); c._id = id; conns.push(c);
      sendTo(c, { t: 'welcome', id }); lobbyChanged(); return;
    }
    const p = MP.players.find((q) => q.conn === c), r = remotes.find((q) => q.conn === c); if (!p) return;
    if (d.t === 'in' && r) r.receive(d);
    else if (d.t === 'f' && r) hostFire(r, d, c);
    else if (d.t === 'g' && r) { const o = { x: d.p[0], y: d.p[1], z: d.p[2] }, v = d.v; if (!BC.GREN[d.ty] || Math.hypot(o.x - r.x, o.z - r.z) > 8) return; _throw.call(BC.Gren, r, d.ty, new T.Vector3(o.x, o.y, o.z), new T.Vector3(v[0], v[1], v[2])); bcast({ t: 'g', ty: d.ty, p: d.p, v: d.v, tm: r.team }, c); }
  }
  function hostDrop(c) {
    const i = MP.players.findIndex((p) => p.conn === c); conns = conns.filter((x) => x !== c); if (i < 0) return;
    const r = remotes.find((q) => q.conn === c);
    if (r) { r.alive = false; r.dispose(); const k = G.actors.indexOf(r); if (k >= 0) G.actors.splice(k, 1); remotes = remotes.filter((q) => q !== r); }
    if (MP.playing) MP.players[i].gone = true; else { MP.players.splice(i, 1); MP.players.forEach((p, k) => { p.team = k % 2; if (p.conn) { p.conn._id = k; sendTo(p.conn, { t: 'welcome', id: k }); } }); }
    lobbyChanged();
  }
  const CFGK = ['map', 'mapSize', 'size', 'skin', 'enemy', 'farda', 'fardaE', 'diff'];
  MP.hostBegin = function () {
    if (MP.role !== 'host') return;
    if (MP.players.length < 2 && !confirm('Ninguém entrou na sala ainda. Iniciar mesmo assim (só com bots)?')) { el('menu').classList.remove('hidden'); return; }
    const S = G.settings, cfg = {}; for (const k of CFGK) cfg[k] = S[k];
    MP.playing = true; G.net = 'host'; G.myTeam = 0; endSent = false; acc = 0;
    MP.players.forEach((p, i) => { if (p.conn) sendTo(p.conn, { t: 'start', cfg, id: i, team: p.team, names: MP.players.map((q) => q.name), teams: MP.players.map((q) => q.team) }); });
    G.start({}); G.net = 'host';
    remotes = [];
    MP.players.forEach((p, i) => { if (!p.conn) return; const r = new RemoteP(i, p); remotes.push(r); G.actors.push(r); });
    G.player.name = MP.players[0].name; G.player.name2 = G.player.name;
  };
  function hostFire(r, d, c) {
    if (!r.alive) return; const spec = BC.WEAPONS[d.w]; if (!spec || !d.o || !d.d) return;
    if (Math.hypot(d.o[0] - r.x, d.o[2] - r.z) > 8) return;
    const o = { x: d.o[0], y: d.o[1], z: d.o[2] }, l = Math.hypot(d.d[0], d.d[1], d.d[2]) || 1, v = { x: d.d[0] / l, y: d.d[1] / l, z: d.d[2] / l };
    _fire.call(G, r, o, v, spec, 1, null, false);
    if (d.s) { const dist = Math.hypot(G.player.x - o.x, G.player.z - o.z); BC.Audio.shot(spec.snd, dist, G.panTo(o.x, o.z), false, spec.sndRate, spec.sup); G.noise(r.x, r.z, r.team, spec.sup ? 14 : 55); G.fx.flash({ x: o.x + v.x * 0.7, y: o.y - 0.1 + v.y * 0.7, z: o.z + v.z * 0.7 }, 0.5); }
    bcast({ t: 'f', o: d.o, d: d.d, w: d.w, s: d.s, m: 0, tm: r.team }, c);
  }
  function snapshot() {
    const P = G.player, pl = [[0, r2(P.x), r2(P.y), r2(P.z), r3(P.yaw), r3(P.pitch), r2(P.stn), P.alive ? 1 : 0, Math.round(P.hp), widx(P.w[P.cur].spec.id), P.kills | 0, P.deaths | 0, P.team, 0]];
    for (const r of remotes) pl.push([r.id, r2(r.x), r2(r.y), r2(r.z), r3(r.yaw), r3(r.pitch), r2(r.stn), r.alive ? 1 : 0, Math.round(r.hp), r.wi, r.kills | 0, r.deaths | 0, r.team, r.ag]);
    const bs = []; G.bots.forEach((b, i) => { if (b.model) bs.push([i, r2(b.x), r2(b.y), r2(b.z), r3(b.yaw), r3(b.pitch), r2(b.stn), b.alive ? 1 : 0, widx(b.wid), b.agentIdx | 0, b.kills | 0, b.deaths | 0, b.team]); });
    bcast({ t: 's', sc: G.score, p: pl, b: bs });
  }

  // ------------------------------------------------------------ convidado
  MP.join = function (code, name, loadout, agent) {
    MP.leave(); code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{5}$/.test(code)) return Promise.reject(new Error('Código inválido (5 letras).'));
    setStatus('Conectando…');
    return loadPeer().then(() => new Promise((res, rej) => {
      peer = new Peer({ debug: 0, config: ICE }); let done = false;
      const fail = (m) => { if (!done) { done = true; rej(new Error(m)); } };
      const tm = setTimeout(() => fail('Não encontrei a sala (ou a conexão direta foi bloqueada pela rede).'), 14000);
      peer.on('error', (e) => { clearTimeout(tm); fail(e.type === 'peer-unavailable' ? 'Sala não encontrada. Confira o código.' : 'Erro de rede: ' + e.type); });
      peer.on('open', () => {
        const c = peer.connect(PREFIX + code, { serialization: 'json', reliable: true }); toHost = c;
        c.on('open', () => sendTo(c, { t: 'hello', ver: MP.ver, name, loadout, agent }));
        c.on('data', (d) => {
          if (!d || typeof d !== 'object') return;
          if (d.t === 'welcome') { MP.myId = d.id; if (!done) { clearTimeout(tm); done = true; MP.role = 'guest'; MP.code = code; setStatus('Conectado à sala ' + code + '. Aguarde o anfitrião iniciar.'); res(code); } }
          else if (d.t === 'rej') { clearTimeout(tm); fail(d.why); }
          else guestRecv(d);
        });
        c.on('close', () => { if (MP.role) { const was = MP.playing; MP.leave(); emit('closed', was); } });
        c.on('error', () => { });
      });
    }));
  };
  function guestRecv(d) {
    if (d.t === 'lobby') { MP.players = d.players; emit('lobby', MP.players); }
    else if (d.t === 'start') emit('start', d);
    else if (d.t === 's') guestSnap(d);
    else if (d.t === 'h') G.netHurt(d.hp, d.d, d.x, d.z, d.zn);
    else if (d.t === 'r') { G.netRespawn(); const P = G.player; P.x = d.x; P.z = d.z; P.y = G.world.heightAt(d.x, d.z); }
    else if (d.t === 'f') guestFx(d);
    else if (d.t === 'g') { const owner = { team: d.tm, alive: true, isNet: true, x: d.p[0], z: d.p[2] }; _throw.call(BC.Gren, owner, d.ty, new T.Vector3(d.p[0], d.p[1], d.p[2]), new T.Vector3(d.v[0], d.v[1], d.v[2])); }
    else if (d.t === 'e') { G.score = d.sc; if (!G.over) { G.over = true; BC.UI.endMatch(G.score[G.player.team] >= G.killLimit); } }
  }
  // chamado pela interface quando chega 'start' (já com bandeiras carregadas)
  MP.guestBegin = function (d) {
    try {
    MP.playing = true; G.net = 'guest'; G.myTeam = d.team; acc = 0; nets.clear();
    MP.names = d.names; MP.teams = d.teams;
    G.start(d.cfg); G.net = 'guest';
    G.player.name = MP.players[MP.myId] ? MP.players[MP.myId].name : G.player.name;
    } catch (e) { console.error(e); alert('Erro ao iniciar a partida online: ' + e.message); MP.leave(); el('menu').classList.remove('hidden'); }
  };
  function guestSnap(d) {
    if (!G.running || G.net !== 'guest') return;
    G.score = d.sc;
    for (const e of d.p) {
      const id = e[0]; if (id === MP.myId) { G.player.kills = e[10]; continue; }
      const key = 'p' + id; let a = nets.get(key); if (!a) { a = new NetActor(e[12], (MP.names && MP.names[id]) || 'Jogador'); a.key = key; nets.set(key, a); G.actors.push(a); }
      applyNet(a, e, 1);
    }
    for (const e of d.b) {
      const key = 'b' + e[0]; let a = nets.get(key); if (!a) { a = new NetActor(e[12], BC.CALLSIGNS[(e[0] * 7 + e[12] * 3) % BC.CALLSIGNS.length]); a.key = key; nets.set(key, a); G.actors.push(a); }
      applyNet(a, e, 0);
    }
  }
  function applyNet(a, e, human) {
    const wi = e[human ? 9 : 8], ag = human ? e[13] : e[9], alive = !!e[7];
    if (!a.model || (alive && !a.wasAlive && (a.wi !== wi || a.ag !== ag)) || (human && a.wi !== wi)) { a.setModel(Math.max(0, wi), ag); a.init = false; }
    a.alive = alive; a.hp = human ? e[8] : 100; a.kills = e[human ? 10 : 10]; a.deaths = e[11]; a.team = e[12];
    a.setTarget(e[1], e[2], e[3], e[4], e[5], e[6]);
  }
  function guestFx(d) {
    const spec = BC.WEAPONS[d.w]; if (!spec) return;
    const o = { x: d.o[0], y: d.o[1], z: d.o[2] }, v = { x: d.d[0], y: d.d[1], z: d.d[2] }, sh = { isPlayer: false, team: d.tm, alive: true, isNet: true, x: o.x, z: o.z };
    const mz = d.m ? { x: d.m[0], y: d.m[1], z: d.m[2] } : { x: o.x + v.x * 0.7, y: o.y - 0.1 + v.y * 0.7, z: o.z + v.z * 0.7 };
    _fire.call(G, sh, o, v, spec, 1, mz, !!d.s);
    if (d.s) BC.Audio.shot(spec.snd, Math.hypot(G.player.x - o.x, G.player.z - o.z), G.panTo(o.x, o.z), false, spec.sndRate, spec.sup);
  }

  // ------------------------------------------------------------ ganchos no jogo
  const _fire = G.fire, _throw = BC.Gren.throwG;
  G.fire = function (sh, o, d, spec, sc, mz, tr) {
    if (G.net === 'guest') {
      if (sh.isPlayer && toHost) { const first = sh._bt !== G.time; sh._bt = G.time; sendTo(toHost, { t: 'f', o: arr(o), d: [r3(d.x), r3(d.y), r3(d.z)], w: widx(spec.id), s: first ? 1 : 0 }); }
      return _fire.apply(G, arguments);
    }
    const r = _fire.apply(G, arguments);
    if (G.net === 'host' && conns.length) { const first = sh._bt !== G.time; sh._bt = G.time; bcast({ t: 'f', o: arr(o), d: [r3(d.x), r3(d.y), r3(d.z)], w: widx(spec.id), s: first ? 1 : 0, m: mz ? arr(mz) : 0, tm: sh.team }); }
    return r;
  };
  BC.Gren.throwG = function (owner, type, pos, vel) {
    const g = _throw.apply(this, arguments);
    if (G.net === 'guest' && owner && owner.isPlayer && toHost) sendTo(toHost, { t: 'g', ty: type, p: arr(pos), v: arr(vel) });
    else if (G.net === 'host' && conns.length) bcast({ t: 'g', ty: type, p: arr(pos), v: arr(vel), tm: owner ? owner.team : 0 });
    return g;
  };

  MP.tick = function (dt) {
    acc += dt;
    if (G.net === 'host') {
      for (const r of remotes) r.update(dt);
      if (acc >= 0.05) { acc = 0; snapshot(); }
      if (G.over && !endSent) { endSent = true; bcast({ t: 'e', sc: G.score }); }
    } else if (G.net === 'guest') {
      for (const n of nets.values()) n.update(dt);
      if (acc >= 0.05) { acc = 0; const P = G.player; if (P.alive && toHost) sendTo(toHost, { t: 'in', x: r2(P.x), y: r2(P.y), z: r2(P.z), yaw: r3(P.yaw), pitch: r3(P.pitch), stn: r2(P.stn), w: widx(P.w[P.cur].spec.id) }); }
    }
  };

  // ------------------------------------------------------------ interface (menu)
  const el = (id) => $(id) || document.createElement('div');
  function draw() {
    const box = el('mpList'), isH = MP.role === 'host';
    box.innerHTML = MP.players.map((p) => `<div>${p.host ? '★ ' : '• '}${p.name} <span style="opacity:.6">— time ${p.team === 0 ? 'A' : 'B'}</span></div>`).join('');
    el('mpStart').style.display = isH ? '' : 'none'; el('mpLeave').style.display = MP.role ? '' : 'none';
    el('mpHost').disabled = el('mpJoin').disabled = !!MP.role;
  }
  MP.on('lobby', draw);
  MP.on('status', (s) => { el('mpInfo').textContent = s; });
  const me = () => { const S = G.settings; return { name: (el('mpName').value || 'Soldado').slice(0, 14), loadout: (S.loadout || []).slice(0, 2), agent: S.agent || 0 }; };
  el('mpHost').onclick = () => { const m = me(); MP.host(m.name, m.loadout, m.agent).then((c) => { el('mpInfo').textContent = 'Sala criada — CÓDIGO: ' + c + ' (passe aos amigos; eles entram por "Entrar")'; }).catch((e) => { el('mpInfo').textContent = e.message; }); };
  el('mpJoin').onclick = () => { const m = me(); MP.join(el('mpCode').value, m.name, m.loadout, m.agent).catch((e) => { el('mpInfo').textContent = e.message; MP.leave(); draw(); }); };
  el('mpLeave').onclick = () => { MP.leave(); el('mpInfo').textContent = ''; draw(); };
  el('mpStart').onclick = () => {
    if (MP.role !== 'host') return; BC.UI.collect(); const S = G.settings;
    Promise.all([BC.loadFlag(BC.TEAMS[S.skin].flag), BC.loadFlag(BC.TEAMS[S.enemy].flag)]).then(() => { el('menu').classList.add('hidden'); MP.hostBegin(); G.paused = false; G.lock(); });
  };
  MP.on('start', (d) => {
    const S = G.settings; Object.assign(S, d.cfg);
    Promise.all([BC.loadFlag(BC.TEAMS[S.skin].flag), BC.loadFlag(BC.TEAMS[S.enemy].flag)]).then(() => { el('menu').classList.add('hidden'); MP.guestBegin(d); G.paused = false; G.lock(); });
  });
  MP.on('closed', (was) => { if (was) { alert('A sala foi encerrada pelo anfitrião.'); el('tomenu').onclick(); } else { el('mpInfo').textContent = 'Desconectado da sala.'; } draw(); });
})();
