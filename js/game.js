// Núcleo do jogo: cena, jogador, tiro, viewmodel, laço principal, partida (TDM).
(function () {
  const T = THREE, BC = window.BC;
  const G = BC.G = {
    running: false, paused: false, time: 0, rng: BC.rng((Date.now() & 0xffffff) + 1), world: null, actors: [], bots: [], score: [0, 0],
    killLimit: 30, teamDefs: [], player: null, scene: null, camera: null, settings: { sens: 1, fov: 92, quality: 'media', dot: true, vol: 0.8, diff: 'soldado', size: 8, map: 'snow', skin: 0, mapSize: 'grande', loadout: ['ak47', 'glock17'], farda: 'pais', fardaE: 'pais', agent: 0 }
  };
  try { Object.assign(G.settings, JSON.parse(localStorage.getItem('bodycam_cfg') || '{}')); } catch (e) { }
  G.saveCfg = () => { try { localStorage.setItem('bodycam_cfg', JSON.stringify(G.settings)); } catch (e) { } };

  const WALK = 3.5, SPRINT = 5.8, CROUCH = 1.8;
  const keys = {}; let mouseL = false, mouseR = false, edgeBuf = 0, edgeClick = false, locked = false;
  const _e = new T.Euler(0, 0, 0, 'YXZ'), _q = new T.Quaternion(), _v = new T.Vector3();
  let aimTog = false;
  let renderer, scene, camera, vmScene, vmCam, vmGroup, sun, hemi, sky, post, fx, muzzleLight, vm = [], clockT = 0;
  let sunDir = new T.Vector3(-0.4, 0.8, 0.3).normalize();

  BC.hFovToV = (hDeg, aspect) => BC.deg(2 * Math.atan(Math.tan(BC.rad(hDeg) / 2) / aspect));
  BC.adsSensRatio = (hipV, adsV) => Math.tan(BC.rad(adsV) / 2) / Math.tan(BC.rad(hipV) / 2);

  // ------------------------------------------------------------ setup
  G.init = function () {
    const host = document.getElementById('game');
    renderer = G.renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setPixelRatio(1); host.appendChild(renderer.domElement);
    scene = G.scene = new T.Scene(); camera = G.camera = new T.PerspectiveCamera(70, 1.78, 0.03, 700); scene.add(camera);
    vmScene = new T.Scene(); vmCam = new T.PerspectiveCamera(58, 1.78, 0.01, 10); vmScene.add(vmCam);
    vmGroup = new T.Group(); vmCam.add(vmGroup);
    const vh = new T.HemisphereLight(0xffffff, 0x777788, 0.9); const vd = new T.DirectionalLight(0xffffff, 0.8); vd.position.set(0.5, 1, 0.8);
    vmScene.add(vh, vd);
    hemi = new T.HemisphereLight(0xffffff, 0x888888, 0.9); scene.add(hemi);
    sun = new T.DirectionalLight(0xffffff, 0.9); sun.castShadow = true; scene.add(sun, sun.target);
    muzzleLight = new T.PointLight(0xffc070, 0, 16); scene.add(muzzleLight);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -42; sc.right = sc.top = 42; sc.near = 1; sc.far = 220; sun.shadow.bias = -0.0006;
    // céu
    sky = new T.Mesh(new T.SphereGeometry(450, 24, 14), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(0x88aacc) }, hor: { value: new T.Color(0xcccccc) }, sunDir: { value: sunDir }, sunCol: { value: new T.Color(0xffffff) } },
      vertexShader: 'varying vec3 vp; void main(){ vp=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top,hor,sunCol,sunDir; varying vec3 vp; void main(){ float h=clamp(vp.y,0.0,1.0); vec3 c=mix(hor,top,pow(h,0.55)); float s=max(dot(normalize(vp),normalize(sunDir)),0.0); c+=sunCol*(pow(s,600.0)*1.6+pow(s,8.0)*0.12); gl_FragColor=vec4(c,1.0); }'
    }));
    sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
    post = G.post = new BC.Post(renderer); fx = G.fx = new BC.Fx(scene); BC.Gren.init(scene);
    // tudo que dá clarão (tiros inimigos, granadas, explosões) causa um pequeno chiado onde aparece na tela
    const _fl = fx.flash.bind(fx);
    fx.flash = function (p, sz) {
      _fl(p, sz);
      try {
        const dx = p.x - camera.position.x, dy = p.y - camera.position.y, dz = p.z - camera.position.z, dist = Math.hypot(dx, dy, dz), v = new T.Vector3(p.x, p.y, p.z).project(camera);
        if (v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15) { const a = Math.min(0.3, 0.07 + (sz || 1) * 0.04) / (1 + dist / 70); if (a > 0.03) G.addLocalGlitch(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5, a); }
      } catch (e) { }
    };

    // modelos de arma (1ª pessoa) — criados uma vez por skin ao iniciar
    G.resize(); window.addEventListener('resize', G.resize);
    bindInput();
    G.setQuality();
  };
  G.setQuality = function () {
    const q = G.settings.quality, sc = { baixa: 0.6, media: 0.8, alta: 1.0 }[q] || 0.8;
    post.scale = sc; renderer.shadowMap.enabled = q !== 'baixa'; if (sun) { sun.castShadow = q !== 'baixa'; const sz = q === 'alta' ? 2048 : 1024; if (sun.shadow.mapSize.x !== sz) { sun.shadow.mapSize.set(sz, sz); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
    G.resize();
  };
  G.resize = function () {
    const w = window.innerWidth, h = window.innerHeight; if (!renderer) return;
    post.resize(w, h); camera.aspect = w / h; vmCam.aspect = w / h; vmCam.updateProjectionMatrix(); G.aspect = w / h;
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
  };

  G.panTo = function (x, z) {
    const P = G.player, dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz) || 1;
    return BC.clamp((dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d, -1, 1);
  };
  G.noise = function (x, z, team, range) { for (const b of G.bots) if (b.team !== team) b.hear(x, z, range > 60); };

  // ------------------------------------------------------------ partida
  G.start = function (opts) {
    Object.assign(G.settings, opts || {}); G.saveCfg();
    const S = G.settings;
    // limpa partida anterior
    if (G.world) { scene.remove(G.world.group); G.world.dispose(); }
    if (fx.reset) fx.reset();
    for (const b of G.bots) if (b.model) scene.remove(b.model.root);
    for (const v of vm) vmGroup.remove(v.root); vm = [];
    G.diff = BC.DIFF[S.diff] || BC.DIFF.soldado;
    if (S.enemy === undefined || S.enemy === S.skin) S.enemy = (S.skin + 1) % BC.TEAMS.length;
    const fard = (t, k) => { if (!k || k === 'pais' || !BC.CAMO_DEF[k]) return t; const d = BC.CAMO_DEF[k]; return Object.assign({}, t, { camo: k, vest: d[0], helmet: d[1], gear: d[2], id: t.id + '_' + k }); };
    G.teamDefs = [fard(BC.TEAMS[S.skin], S.farda), fard(BC.TEAMS[S.enemy], S.fardaE)];
    const def = BC.maps[S.map]; G.mapDef = def;
    const world = G.world = BC.buildMap(S.map, S.mapSize); scene.add(world.group);
    scene.fog = new T.FogExp2(def.fog.color, def.fog.density); scene.background = new T.Color(def.fog.color);
    hemi.color.setHex(def.hemi.sky); hemi.groundColor.setHex(def.hemi.ground); hemi.intensity = def.hemi.i;
    sun.color.setHex(def.sun.color); sun.intensity = def.sun.i; sunDir.set(def.sun.dir[0], def.sun.dir[1], def.sun.dir[2]).normalize();
    sky.material.uniforms.top.value.setHex(def.sky.top); sky.material.uniforms.hor.value.setHex(def.sky.horizon); sky.material.uniforms.sunCol.value.setHex(def.sun.color);
    fx.setWeather(def.weather);
    // jogador
    if (!G.vmGren) { G.vmGren = {}; for (const k in BC.GREN) { const gm = BC.grenMesh(k); gm.visible = false; vmGroup.add(gm); G.vmGren[k] = gm; } }
    const P = G.player = {
      isPlayer: true, team: G.myTeam || 0, name: 'VOCÊ · ' + BC.AGENTS[(S.agent || 0) % BC.AGENTS.length].name, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, r: 0.35, h: 1.78, alive: true, hp: 100, yaw: 0, pitch: 0,
      rc: { p: 0, y: 0 }, crouch: 0, cur: 0, kills: 0, deaths: 0, lastHurt: -99, deadT: 0, bob: 0, stepAcc: 0, adsT: 0, sprintT: 0, swapT: 0, rl: null, sway: { x: 0, y: 0 }, kick: 0, kickR: 0, pumpT: 0,
      tension: 15, morale: 70, trY: 0, trP: 0, eyeY: 1.4, lastShot: -9, shotIdx: 0, flashT: 0, bloomIdx: 0, hitFlash: 0, sneak: false, inWater: false
    };
    const lo = (S.loadout && S.loadout.length ? S.loadout : BC.DEFAULT_LOADOUT).slice(0, 2).map((id) => BC.WMAP[id]).filter(Boolean); if (!lo.length) lo.push(BC.WMAP.ak47); G.loadout = lo;
    P.w = lo.map((s) => {
      const mg = BC.MODELS[s.id] && BC.MODELS[s.id].G, builtIn = !!(s.scope || (mg && mg.scopeType)), sel = (S.scopes && S.scopes[s.id]) || 'iron';
      let type = builtIn ? ((mg && mg.scopeType) || 'builtin') : sel, zoom = s.adsZoom;
      if (type !== 'builtin' && BC.SCOPES[type] && type !== 'iron') zoom = BC.SCOPES[type].zoom; else if (builtIn && sel !== 'iron' && BC.SCOPES[sel]) { zoom = BC.SCOPES[sel].zoom; type = sel; }
      return { spec: s, mag: s.mag, reserve: s.reserve, mode: s.auto ? 'auto' : 'semi', clock: new BC.FireClock(s.rpm), scopeType: type, zoom, scoped: zoom >= 2.9, dot: type === 'reddot' || type === 'holo', extra: !builtIn && type !== 'iron' };
    });
    for (const w of P.w) w.clock.next = -9;
    // modelos 1ª pessoa
    lo.forEach((s) => {
      const m = BC.buildGunModel(s.id), arms = BC.buildArms(G.teamDefs[P.team], m.G); m.root.add(arms.grp);
      const fl = new T.Sprite(new T.SpriteMaterial({ map: fx.flashes[0].s.material.map, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      fl.position.set(m.G.muzzle[0], m.G.muzzle[1], m.G.muzzle[2] - 0.03); fl.scale.set(0.3, 0.3, 1); fl.visible = false; m.root.add(fl);
      vmGroup.add(m.root); m.root.visible = false; m.arms = arms; m.flash = fl; BC.VMA.setup(m);
      const wst = P.w[vm.length]; m.wst = wst;
      if (wst.extra) { m.scopeMesh = BC.makeScope(wst.scopeType, m.G, s.cls); if (m.scopeMesh) { m.root.add(m.scopeMesh); wst.scopeH = BC.SCOPES[wst.scopeType].h || 0.05; } }
      else if (m.G.scopeType && BC.SCOPES[m.G.scopeType]) wst.scopeH = BC.SCOPES[m.G.scopeType].h; m.root.traverse((o) => { o.castShadow = false; });
      vm.push(m);
    });
    // atores
    G.actors = [P]; G.bots = [];
    const n = S.size, rng = G.rng;
    if (G.net !== 'guest') for (let team = 0; team < 2; team++) for (let i = 0; i < (team === 0 ? n - 1 : n); i++) { const b = new BC.Bot(G, team, i + team * 20); G.bots.push(b); G.actors.push(b); }
    aimTog = false; G.killLimit = Math.max(30, S.size * 5); G.score = [0, 0]; G.time = 0; G.over = false; G.running = true; G.matchT = 0;
    spawnPlayer(true);
    for (const b of G.bots) { b.respawnT = 0.1 + rng() * 1.5; }
    BC.Modes.setup();
    BC.Gren.clear(); G.blind = 0; G.shake = 0; BC.Audio.init(); BC.Audio.ambient(def.ambient); BC.Audio.setVolume(S.vol); BC.Audio.beep(1200);
    G.feedClear();
    document.getElementById('cam').classList.remove('hidden');
    BC.UI && BC.UI.onStart();
    G.setQuality();
    window.focus();
  };

  function spawnPlayer(first) {
    const P = G.player, w = G.world, sp = w.spawns[P.team]; let best = null, bd = -1;
    for (let i = 0; i < 5; i++) {
      const s = sp[(G.rng() * sp.length) | 0]; let m = 1e9;
      for (const e of G.actors) if (e !== P && e.alive && e.team !== P.team) m = Math.min(m, Math.hypot(e.x - s.x, e.z - s.z));
      if (m > bd) { bd = m; best = s; }
    }
    P.x = best.x; P.z = best.z; P.y = w.heightAt(P.x, P.z); P.vx = P.vy = P.vz = 0; P.onGround = true;
    P.hp = 100; P.alive = true; P.deadT = 0; P.yaw = 0; P.pitch = 0; P.rc.p = P.rc.y = 0; P.rl = null; P.swapT = 0; P.adsT = 0; P.crouch = 0; P.prone = 0; P.stn = 0; P.proneTog = false; P.eyeY = 1.4; P.fall = 0; P.thr = null; P.bld = 0; P.faintT = 0; P.kit = { band: 1, med: 1 }; P.heal = null; P.inVeh = null; P.gren = { frag: 2, flash: 1, smoke: 1 }; P.grSel = 'frag'; G.blind = 0;
    for (const wp of P.w) { wp.mag = wp.spec.mag; wp.reserve = wp.spec.reserve; }
    selectWeapon(0, false); P.tension = 15; P.morale = 60; if (!first) { G.glitch = 1.6; G.flashScreen = 0.1; }
    for (const t of w.crates) t.t = 0;
  }
  function selectWeapon(i, instant) {
    const P = G.player; P.cur = i; P.rl = null;
    vm.forEach((m, k) => { m.root.visible = k === i; });
    if (!instant) { P.swapT = 0.5; P.swapping = false; } else P.swapT = 0;
    for (const k of ['mag', 'slide', 'pump']) { const m = vm[i]; if (m.parts[k]) { m.parts[k].visible = true; m.parts[k].position.set(0, 0, 0); } }
    vm[i].arms.armL.position.set(0, 0, 0);
    BC.UI && BC.UI.weaponChanged();
  }
  G.selectWeapon = function (i) { const P = G.player; if (!P.alive || P.thr || i === P.cur || i < 0 || i >= P.w.length) return; P.swapTo = i; P.swapT = 0.7; P.rl = null; P.swapping = true; BC.Audio.click(0.25); BC.VMA.reset(vm[P.cur]); };

  // ------------------------------------------------------------ tiros (jogador e bots)
  function fireCore(shooter, o, d, spec, scale, muzzle, tracerOk, depth) {
    const w = G.world, maxT = Math.min(450, spec.maxRange * 1.4 + 50);
    const h = w.raycast(o.x, o.y, o.z, d.x, d.y, d.z, maxT);
    let tW = maxT, hp = null;
    if (h) { tW = h.t; hp = { nx: h.nx, ny: h.ny, nz: h.nz, tag: h.tag }; }
    let best = null, bz = null, bt = tW;
    for (const e of G.actors) {
      if (e === shooter || !e.alive || e.inVeh || e === shooter.inVeh || (G.hunt && !e.isAnimal)) continue; // fogo amigo ligado
      const r = BC.hitActor(e, o.x, o.y, o.z, d.x, d.y, d.z, bt); if (r && r.t < bt) { bt = r.t; best = e; bz = r.zone; }
    }
    const px = o.x + d.x * bt, py = o.y + d.y * bt, pz = o.z + d.z * bt;
    if (best) {
      const mul = bz === 'head' ? spec.headMul : bz === 'legs' ? spec.legMul : 1;
      let dmg = spec.dmg * mul * BC.falloff(spec, bt) * scale;
      const reg = (best.isAnimal || best.isVehicle) ? null : BC.Anatomy.hit(best, px, py, pz, bz, spec);
      if (reg) { dmg = spec.dmg * reg.mul * BC.falloff(spec, bt) * scale; if (reg.kill) dmg = Math.max(dmg, 999); reg.pw = BC.clamp(spec.dmg * scale / 55, 0.5, 2.4); if (shooter.isPlayer) G.lastRegion = reg.n; }
      if (best.isVehicle) fx.impact({ x: px, y: py, z: pz }, { nx: -d.x, ny: -d.y, nz: -d.z, tag: 'metal' }, 'metal', false); else fx.blood({ x: px, y: py, z: pz }, d, bz, w, Math.min(dmg, 160));
      let killed = false;
      if (!best.isPlayer && !best.isVehicle && shooter.isPlayer && bt < 3.2) BC.UI.lensBlood(1 + Math.round(dmg / 45));
      if (best.isPlayer) { G._reg = reg; killed = G.hurtPlayer(dmg, shooter, bz, spec.id); }
      else { best._reg = reg; best._hit = { x: px, y: py, z: pz }; killed = best.damage(dmg, bz, shooter, spec.id, d, null); }
      
    } else if (hp) {
      fx.impact({ x: px, y: py, z: pz }, hp, hp.tag, spec.pellets > 1 ? false : spec.dmg > 60);
      const P = G.player;
      if (!shooter.isPlayer) { const dd = Math.hypot(px - P.x, pz - P.z); if (dd < 25) BC.Audio.impact(dd, G.panTo(px, pz), hp.tag === 'metal' ? 'metal' : 'x'); }
      // penetração: o calibre decide se atravessa o material (e perde dano ao atravessar)
      if (depth < 2 && Math.abs(hp.ny) < 0.75) { const k = BC.penetrate(spec, hp.tag); if (k > 0) fireCore(shooter, { x: px + d.x * 0.45, y: py + d.y * 0.45, z: pz + d.z * 0.45 }, d, spec, scale * Math.max(0.25, 0.8 - k * 0.45), null, false, depth + 1); }
    }
    if (tracerOk && !shooter.isPlayer && muzzle && G.rng() < 0.4) fx.tracer(muzzle, { x: px, y: py, z: pz });
    if (muzzle && !shooter.isPlayer && !spec.sup) { fx.flash(muzzle, 0.5); }
    // estalo de projétil passando perto do jogador
    if (!shooter.isPlayer && G.player.alive) {
      const P = G.player, cx = P.x - o.x, cy = P.y + 1.3 - o.y, cz = P.z - o.z, tp = cx * d.x + cy * d.y + cz * d.z;
      if (tp > 3 && tp < bt) { const qx = cx - d.x * tp, qy = cy - d.y * tp, qz = cz - d.z * tp; if (qx * qx + qy * qy + qz * qz < 4 && !best) BC.Audio.crack(G.panTo(o.x + d.x * tp, o.z + d.z * tp)); }
    }
  }
  G.fire = function (shooter, o, d, spec, scale, muzzle, tracerOk) { return fireCore(shooter, o, d, spec, scale, muzzle, tracerOk, 0); };

  // jogo online: o anfitrião decide o dano; o convidado só mostra o efeito
  G.netHurt = function (hp, dmg, fx_, fz_, zone) {
    const P = G.player; if (!P.alive) return;
    P.hp = hp; P.lastHurt = G.time; G.stress(dmg); BC.Audio.hurt(); G.glitch = Math.min(1, G.glitch + 0.35 + dmg / 80); P.hitFlash = 1;
    BC.UI.indicator(Math.atan2(fx_ - P.x, fz_ - P.z)); BC.UI.lensBlood(Math.min(6, 2 + Math.round(dmg / 25)));
    if (hp <= 0) { P.hp = 0; aimTog = false; P.alive = false; P.deadT = 0; P.deaths++; P.fall = 0; G.glitch = 1.6; BC.Audio.death(); fx.pool(P.x, P.y, P.z, dmg); }
  };
  G.stress = function (dmg) { const P = G.player; P.tension = Math.min(100, (P.tension || 0) + 12 + dmg * 0.22); P.morale = Math.max(0, (P.morale || 0) - 8 - dmg * 0.1); };
  G.lg = [];
  G.addLocalGlitch = function (x, y, a) { G.lg.push({ x, y, a }); if (G.lg.length > 4) G.lg.shift(); };
  function updateTension(dt) {
    const P = G.player; let near = 1e9;
    for (const e of G.actors) { if (e === P || !e.alive || e.team === P.team) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < near) near = d; }
    const sh = G.time - P.lastHurt, ss = G.time - P.lastShot, calm = near > 50 && sh > 4 && ss > 3;
    let rise = 0; if (near < 35) rise += (35 - near) / 35 * 6; if (ss < 1) rise += 4; if (sh < 2.5) rise += 7; if (P.hp < 35) rise += 3; if (G.blind > 0.2) rise += 6;
    rise *= 1.25 - 0.5 * (P.morale || 0) / 100;
    P.tension = BC.clamp((P.tension || 0) + (rise > 0.5 ? rise : -(calm ? 7 : near > 35 ? 2.5 : 0.6) * (0.6 + 0.8 * (P.morale || 0) / 100)) * dt, 0, 100);
    P.morale = BC.clamp((P.morale || 0) + (calm ? 5 : near > 40 && sh > 3 ? 1.2 : -rise * 0.35) * dt, 0, 100);
  }
  G.netRespawn = function () { if (G.player && !G.player.alive) spawnPlayer(false); };
  G.hurtPlayer = function (dmg, from, zone, wid) {
    const P = G.player; if (!P.alive || G.net === 'guest') return false;
    P.hp -= dmg; P.lastHurt = G.time; G.stress(dmg);
    const RG = G._reg; G._reg = null;
    if (RG && P.hp > 0) { P.bld = (P.bld || 0) + RG.bleed * (RG.pw || 1); P.lastFrom = from; if (RG.faint && Math.random() < RG.faint && !(P.faintT > 0)) { P.faintT = RG.fmin + Math.random() * (RG.fmax - RG.fmin); P.fall = 0; aimTog = false; mouseL = false; } } BC.Audio.hurt(); G.glitch = Math.min(1, G.glitch + 0.35 + dmg / 80); P.hitFlash = 1;
    BC.UI.indicator(Math.atan2(from.x - P.x, from.z - P.z)); BC.UI.lensBlood(Math.min(6, 2 + Math.round(dmg / 25)));
    if (P.hp <= 0) { P.hp = 0; aimTog = false; P.alive = false; P.deadT = 0; P.deaths++; P.fall = 0; G.glitch = 1.6; BC.Audio.death(); fx.pool(P.x, P.y, P.z, dmg); G.onKill(from, P, wid, zone === 'head'); return true; }
    return false;
  };
  G.onKill = function (killer, victim, wid, head) {
    if ((!G.mode || G.mode === 'tdm') && killer && killer !== victim && killer.team >= 0 && killer.team !== victim.team) { G.score[killer.team]++; killer.kills = (killer.kills || 0) + 1; }
    BC.UI.killfeed(killer, victim, wid, head);
    if (killer && killer.isPlayer) BC.UI.msg('+1  ' + victim.name.toUpperCase() + (head ? '  (cabeça)' : ''), 1.2);
    if (!G.over && (G.score[0] >= G.killLimit || G.score[1] >= G.killLimit)) endMatch();
  };
  G.endMatch = () => endMatch();
  function endMatch() { G.over = true; if (BC.MP && BC.MP.sendEnd) BC.MP.sendEnd(); BC.UI.endMatch(G.score[G.player.team] >= G.killLimit); }
  G.feedClear = () => BC.UI && BC.UI.feedClear && BC.UI.feedClear();

  // ------------------------------------------------------------ jogador: tiro
  function camBasis() {
    const P = G.player; _e.set(P.pitch + P.rc.p + (P.aimP || 0) + (P.trP || 0), P.yaw + P.rc.y + (P.aimY || 0) + (P.trY || 0), 0, 'YXZ'); _q.setFromEuler(_e);
    return { f: new T.Vector3(0, 0, -1).applyQuaternion(_q), r: new T.Vector3(1, 0, 0).applyQuaternion(_q), u: new T.Vector3(0, 1, 0).applyQuaternion(_q) };
  }
  function eyePos() { const P = G.player; return { x: P.x, y: P.y + P.eyeY, z: P.z }; }
  function spreadDeg(w) {
    const P = G.player, s = w.spec, mv = Math.min(1.6, Math.hypot(P.vx, P.vz) / WALK), ads = P.adsT;
    let sp = BC.lerp(s.spreadHip, s.spreadAds, ads) * (P.crouch > 0.5 ? 0.75 : 1) * (P.prone > 0.5 ? 0.8 : 1);
    sp += Math.min(s.spreadMax, s.spreadShot * P.bloomIdx) * (1 - 0.5 * ads) + s.spreadMove * mv * (1 - 0.7 * ads);
    if (!P.onGround) sp += 3;
    return sp;
  }
  function shoot(w) {
    const P = G.player, s = w.spec, b = camBasis(), o = eyePos();
    if (s.rocket) { // lançador antitanque: dispara um foguete
      BC.Rockets.launch(P, { x: o.x + b.f.x * 0.9 + b.r.x * 0.12, y: o.y + b.f.y * 0.9 - 0.12, z: o.z + b.f.z * 0.9 + b.r.z * 0.12 }, b.f, s);
      P.kick = Math.min(1.6, P.kick + 1.6); P.kickR += 0.12; P.rc.p += BC.rad(2.2); P.lastShot = G.time; P.shotIdx = 0; G.addLocalGlitch(0.5, 0.46, 0.25); G.shake = Math.max(G.shake || 0, 0.5); P.tension = Math.min(100, P.tension + 3); return;
    }
    const sp = BC.rad(spreadDeg(w));
    for (let p = 0; p < s.pellets; p++) {
      const a = G.rng() * 6.283283, r = Math.sqrt(G.rng()) * (s.pellets > 1 ? BC.rad(s.pelletCone) : 0) + (s.pellets > 1 ? 0 : 0);
      const rs = Math.sqrt(G.rng()) * sp, ang = G.rng() * 6.283;
      const dx = b.f.x + b.r.x * (Math.cos(a) * r + Math.cos(ang) * rs) + b.u.x * (Math.sin(a) * r + Math.sin(ang) * rs);
      const dy = b.f.y + b.r.y * (Math.cos(a) * r + Math.cos(ang) * rs) + b.u.y * (Math.sin(a) * r + Math.sin(ang) * rs);
      const dz = b.f.z + b.r.z * (Math.cos(a) * r + Math.cos(ang) * rs) + b.u.z * (Math.sin(a) * r + Math.sin(ang) * rs);
      const l = Math.hypot(dx, dy, dz);
      G.fire(P, o, { x: dx / l, y: dy / l, z: dz / l }, s, 1, null, false);
    }
    // recuo (padrão fixo) — vira deslocamento que decai
    const pat = s.recoil[Math.min(P.shotIdx, s.recoil.length - 1)], k = 1 - 0.35 * P.adsT;
    P.rc.p += BC.rad(pat[0] * k * (0.92 + G.rng() * 0.16)); P.rc.y += BC.rad(pat[1] * k + (G.rng() - 0.5) * 0.1);
    P.shotIdx++; P.bloomIdx++; P.lastShot = G.time; P.tension = Math.min(100, P.tension + 0.9); G.addLocalGlitch(0.5 + (G.rng() - 0.5) * 0.08, 0.46, 0.2);
    P.kick = Math.min(1.6, P.kick + 1); P.kickR += s.recoilKick * (1 - 0.4 * P.adsT);
    P.flashT = 0.05; if (s.sup) muzzleLight.intensity = 0; muzzleLight.position.set(o.x + b.f.x * 1.2, o.y + b.f.y * 1.2 - 0.1, o.z + b.f.z * 1.2); muzzleLight.intensity = s.sup ? 0 : 1.4;
    G.flashScreen = 0.03;
    vm[P.cur].flash.visible = !s.sup; vm[P.cur].flash.material.rotation = G.rng() * 6.28; const fs = s.cls === 'shotgun' ? 0.55 : (s.cls === 'pistol' || s.cls === 'revolver') ? 0.25 : s.cls === 'sniper' ? 0.5 : 0.36; vm[P.cur].flash.scale.set(fs, fs, 1);
    if (vm[P.cur].parts.slide) P.slideK = 1;
    // cartucho ejetado pela direita
    const ew = new T.Vector3(o.x + b.r.x * 0.15 + b.f.x * 0.4 - b.u.x * 0.1, o.y + b.r.y * 0.15 + b.f.y * 0.4 - b.u.y * 0.1, o.z + b.r.z * 0.15 + b.f.z * 0.4 - b.u.z * 0.1);
    if (s.cls !== 'shotgun' && s.cls !== 'revolver') fx.shell(ew, b.r.x * 2.2 + (G.rng() - 0.5) * 0.6 + b.u.x, b.r.y * 2.2 + 1.6 + G.rng(), b.r.z * 2.2 + b.u.z + (G.rng() - 0.5) * 0.6);
    BC.Audio.shot(s.snd, 0, 0, true, s.sndRate, s.sup); G.noise(P.x, P.z, 0, s.sup ? 14 : s.cls === 'sniper' ? 75 : 55);
    if (s.pumpAction) { P.pumpT = 0.55; setTimeout(() => BC.Audio.pump(), 280); }
    else if (s.cls === 'sniper' && !s.auto && s.rpm < 100) setTimeout(() => BC.Audio.pump(), 520);
  }

  function startReload() {
    const P = G.player, w = P.w[P.cur], s = w.spec;
    if (P.rl || P.swapT > 0 || P.thr || w.mag >= s.mag + 0 || w.reserve <= 0) return;
    if (s.shellReload) P.rl = { t: 0, dur: 1, shell: 0, first: true, p: 0, inShell: false }; else P.rl = { t: 0, dur: w.mag === 0 ? s.reloadEmpty : s.reload, snd: 0, p: 0, empty: w.mag === 0 };
    P.adsWant = false;
  }
  function updateReload(dt) {
    const P = G.player, r = P.rl; if (!r) return;
    const w = P.w[P.cur], s = w.spec;
    // moral baixa: recarga mais lenta e com pausas imprevisíveis (mãos que tremem / erram)
    const low = 1 - (P.morale === undefined ? 70 : P.morale) / 100;
    if (r.pause > 0) { r.pause -= dt; dt = 0; } else if (Math.random() < (low * low * 0.9 + 0.02 * low) * dt) { r.pause = 0.15 + Math.random() * 0.55 * (0.5 + low); dt = 0; }
    r.t += dt / (1 + low * 0.9 + (P.tension || 0) / 100 * 0.25);
    if (s.shellReload) {
      // um cartucho a cada 0.55 s (0.4 s de preparo no início)
      const lead = r.first ? 0.4 : 0, per = 0.55, k = (r.t - lead) / per;
      r.p = BC.clamp(k - Math.floor(k), 0, 1); r.inShell = r.t >= lead;
      if (r.t >= lead && Math.floor(k) > r.shell) {
        r.shell = Math.floor(k); w.mag++; w.reserve--; BC.Audio.shell(); BC.Audio.click(0.5);
        if (w.mag >= s.mag || w.reserve <= 0) { P.rl = null; BC.Audio.pump(); }
      }
    } else {
      const p = r.t / r.dur; r.p = p;
      if (p > 0.13 && r.snd < 1) { r.snd = 1; BC.Audio.reload(0); }
      if (p > 0.7 && r.snd < 2) { r.snd = 2; BC.Audio.reload(1); }
      if (p > 0.86 && r.snd < 3 && r.empty) { r.snd = 3; BC.Audio.reload(2); }
      if (p >= 1) { const need = s.mag - w.mag, take = Math.min(need, w.reserve); w.mag += take; w.reserve -= take; P.rl = null; P.shotIdx = 0; }
    }
  }

  // ------------------------------------------------------------ jogador: atualização
  function updatePlayer(dt) {
    const P = G.player, w = G.world;
    if (!P.alive) {
      P.deadT += dt; P.fall = Math.min(1, P.fall + dt * 2.2);
      if (P.deadT > 4.2 && G.running && !G.over && G.net !== 'guest') spawnPlayer(false);
      return;
    }
    if (P.fall > 0 && !(P.faintT > 0)) P.fall = Math.max(0, P.fall - dt * 1.4);
    if (P.bld > 0.01) { P.bld *= Math.exp(-0.08 * dt); P.hp -= P.bld * dt; if (P.hp <= 0.5) { P.hp = 1; G.hurtPlayer(5, P.lastFrom || { x: P.x, z: P.z, team: -1, alive: true, name: 'Hemorragia' }, 'body', 'bleed'); return; } }
    if (P.faintT > 0) { P.faintT -= dt; P.fall = Math.min(1, P.fall + dt * 2.2); P.vx *= 0.9; P.vz *= 0.9; P.adsT *= 0.8; if (P.faintT <= 0) P.hp = Math.max(P.hp, 12); return; }
    if (P.heal) { P.heal.t += dt; if (P.heal.t >= P.heal.dur) { if (P.heal.type === 'band') { P.bld = 0; P.hp = Math.min(100, P.hp + 8); } else { P.bld = 0; P.hp = Math.min(100, P.hp + 65); P.tension = Math.max(0, P.tension - 30); } if (G.net === 'guest' && BC.MP) BC.MP.sendHeal(P.hp); P.heal = null; } }
    const wp = P.w[P.cur], spec = wp.spec;
    // entrada de movimento
    let fx_ = 0, fz_ = 0;
    if (keys.KeyW || keys.ArrowUp) fz_ -= 1; if (keys.KeyS || keys.ArrowDown) fz_ += 1; if (keys.KeyA || keys.ArrowLeft) fx_ -= 1; if (keys.KeyD || keys.ArrowRight) fx_ += 1;
    const ml = Math.hypot(fx_, fz_) || 1; fx_ /= ml; fz_ /= ml;
    const wantCrouch = keys.KeyC || keys.ControlLeft;
    if (wantCrouch && P.proneTog && !P.stnLock) { /* agachar enquanto deitado = continua deitado */ }
    const wantStn = P.proneTog ? 2 : wantCrouch ? 1 : 0, prevStn = P.stn;
    P.stn += BC.clamp(wantStn - P.stn, -(wantStn > P.stn ? 2.3 : 3.0) * dt, (wantStn > P.stn ? 2.3 : 3.0) * dt); P.stnVel = (P.stn - prevStn) / Math.max(dt, 1e-4);
    P.crouch = Math.min(P.stn, 1); P.prone = Math.max(0, P.stn - 1);
    if (Math.floor(prevStn * 2) !== Math.floor(P.stn * 2) && BC.Audio.cloth) BC.Audio.cloth(P.stnVel > 0 ? 0.6 : 0.4);
    const moving = (fx_ || fz_) ? true : false;
    const aiming = mouseR || aimTog;
    const wantSprint = keys.ShiftLeft && fz_ < 0 && P.stn < 0.1 && !aiming && P.onGround && !P.thr;
    P.sprintT += ((wantSprint ? 1 : 0) - P.sprintT) * Math.min(1, 8 * dt);
    const sprinting = P.sprintT > 0.5;
    let speed = sprinting ? SPRINT : BC.lerp(WALK, CROUCH, P.crouch) * (1 - 0.5 * P.prone);
    speed *= 1 - 0.4 * P.adsT; if (P.heal) speed *= 0.5;
    if (P.inWater) speed *= 0.6;
    const wxw = fx_ * Math.cos(P.yaw) + fz_ * Math.sin(P.yaw), wzw = -fx_ * Math.sin(P.yaw) + fz_ * Math.cos(P.yaw);
    if (keys.Space && P.stn > 0.3) { P.proneTog = false; keys.Space = false; }
    const jump = keys.Space && P.onGround && P.stn < 0.3;
    if (P.inVeh) { P.vx = P.vz = 0; P.onGround = true; } else BC.moveActor(P, wxw, wzw, moving ? speed : 0, dt, w, jump);
    if (jump) keys.Space = false;
    if (P.landed > 4) { P.kick += 0.5; BC.Audio.step(w.surf, 1.2, 0, 0); }
    P.h = 1.78 - 0.53 * P.crouch - 0.75 * P.prone; P.sneak = P.stn > 0.6 && Math.hypot(P.vx, P.vz) < 2;
    const hs = Math.hypot(P.vx, P.vz);
    // altura da câmera (peito) suavizada
    const E3 = (x) => x * x * (3 - 2 * x); P.eyeY = 1.4 - 0.45 * E3(P.crouch) - 0.67 * E3(P.prone);
    // balanço da câmera de peito
    P.bob += hs * dt * (sprinting ? 1.5 : 1.7);
    P.stepAcc += hs * dt;
    if (P.onGround && P.stepAcc > (sprinting ? 2.1 : 1.6) && hs > 0.6) { P.stepAcc = 0; BC.Audio.step(P.inWater ? 'water' : w.surf, P.crouch > 0.5 ? 0.35 : sprinting ? 1.0 : 0.7, 0, 0); }
    // vida regenera devagar
    
    P.hitFlash = Math.max(0, P.hitFlash - dt * 2.5);
    // mirar (ADS)
    if (P.thr) {
      const th = P.thr; th.t += dt; if (!th.pin && th.t > 0.12) { th.pin = 1; BC.Audio.metal(0.5, 2400); }
      if (!th.rel && th.t > 0.5) {
        th.rel = 1; const b = camBasis(), o = eyePos(), hh = G.world.raycast(o.x, o.y, o.z, b.f.x, b.f.y, b.f.z, 0.7), dd = hh ? Math.max(0.05, hh.t - 0.12) : 0.55, v = new T.Vector3(b.f.x * 17 + P.vx * 0.8, b.f.y * 17 + 4.2 + (b.f.y > 0 ? 0 : 0), b.f.z * 17 + P.vz * 0.8);
        BC.Gren.throwG(P, th.type, new T.Vector3(o.x + b.f.x * dd - b.u.x * 0.1 + b.r.x * 0.12, o.y + b.f.y * dd - b.u.y * 0.1, o.z + b.f.z * dd - b.u.z * 0.1 + b.r.z * 0.12), v); P.gren[th.type]--; if (P.gren[P.grSel] <= 0) { const nx = Object.keys(P.gren).find((k) => P.gren[k] > 0); if (nx) P.grSel = nx; }
      }
      if (th.t > 0.95) P.thr = null;
    }
    const wantAds = aiming && !sprinting && !P.rl && P.swapT <= 0 && !P.thr;
    const adsRate = spec.scope ? 6 : 10;
    P.adsT += ((wantAds ? 1 : 0) - P.adsT) * Math.min(1, adsRate * dt);
    // recuo decai
    const since = G.time - P.lastShot;
    if (since > 0.09) { const k = Math.exp(-(since > 0.25 ? 8 : 4) * dt); P.rc.p *= k; P.rc.y *= k; } else { P.rc.p *= Math.exp(-1.2 * dt); P.rc.y *= Math.exp(-1.2 * dt); }
    if (since > 0.32) { P.shotIdx = 0; P.bloomIdx = Math.max(0, P.bloomIdx - 14 * dt); }
    P.kick *= Math.exp(-14 * dt); P.kickR *= Math.exp(-13 * dt); P.pumpT = Math.max(0, P.pumpT - dt); P.slideK = (P.slideK || 0) * Math.exp(-16 * dt);
    P.flashT -= dt; if (P.flashT <= 0) { muzzleLight.intensity = 0; vm.forEach((m) => { m.flash.visible = false; }); }
    // troca de arma
    if (P.swapT > 0) {
      const before = P.swapT; P.swapT -= dt;
      if (P.swapping && before > 0.5 && P.swapT <= 0.5) { selectWeaponRaw(P.swapTo); BC.Audio.metal(0.25, 1600); }
      if (P.swapT <= 0) { P.swapT = 0; P.swapping = false; }
    }
    // recarga
    updateReload(dt);
    // disparo
    edgeBuf = Math.max(0, edgeBuf - dt);
    if (edgeClick) { edgeBuf = 0.15; edgeClick = false; if (wp.mag <= 0 && !P.rl && P.swapT <= 0) { BC.Audio.click(0.5); startReload(); } }
    const auto = spec.auto && wp.mode === 'auto', blocked = sprinting || P.heal || P.thr || P.swapT > 0 || (P.rl && !(spec.shellReload && wp.mag > 0)) || !P.alive;
    if (P.rl && spec.shellReload && wp.mag > 0 && (auto ? mouseL : edgeBuf > 0)) P.rl = null; // interrompe recarga da espingarda
    const held = auto ? mouseL : edgeBuf > 0;
    wp.clock.step(G.time, held && !blocked, () => wp.mag > 0 && (auto || edgeBuf > 0) && !(P.rl) && P.swapT <= 0, () => { wp.mag--; if (!auto) edgeBuf = 0; shoot(wp); });
    if (auto && mouseL && wp.mag <= 0 && !P.rl && P.swapT <= 0 && !blocked) { startReload(); }
    // pega munição nas caixas
    for (const c of w.crates) {
      c.t = Math.max(0, c.t - dt);
      if (c.t <= 0 && Math.hypot(P.x - c.x, P.z - c.z) < 2.2) {
        let any = false; for (const x of P.w) { if (x.reserve < x.spec.reserve) { x.reserve = x.spec.reserve; any = true; } }
        if (any) { c.t = 25; BC.UI.msg('MUNIÇÃO REPOSTA', 1.4); BC.Audio.metal(0.8, 1700); }
      }
    }
  }
  function selectWeaponRaw(i) {
    const P = G.player; P.cur = i; vm.forEach((m, k) => { m.root.visible = k === i; });
    for (const k of ['mag', 'slide', 'pump']) { const m = vm[i]; if (m.parts[k]) { m.parts[k].visible = true; m.parts[k].position.set(0, 0, 0); } }
    vm[i].arms.armL.position.set(0, 0, 0); BC.UI.weaponChanged();
  }

  // ------------------------------------------------------------ câmera + viewmodel
  const vmState = { sx: 0, sy: 0 };
  function updateCamera(dt) {
    const P = G.player, s = G.settings;
    const wst = P.w[P.cur], spec = wst.spec, hipV = BC.hFovToV(s.fov, G.aspect);
    const adsV = BC.deg(2 * Math.atan(Math.tan(BC.rad(hipV) / 2) / wst.zoom));
    const fov = BC.lerp(hipV, adsV, P.adsT); G.curFov = fov; G.hipV = hipV;
    camera.fov = fov; camera.updateProjectionMatrix();
    const hs = Math.hypot(P.vx, P.vz), mv = Math.min(1.5, hs / WALK), ads = P.adsT, sprint = P.sprintT;
    const tn = Math.pow((P.tension || 0) / 100, 1.15), tt = G.time;
    P.trY = (Math.sin(tt * 7.3) * 0.55 + Math.sin(tt * 13.1 + 1) * 0.3 + Math.sin(tt * 23.7 + 2) * 0.15) * 0.013 * tn; P.trP = (Math.sin(tt * 6.1 + 0.5) * 0.5 + Math.sin(tt * 11.9 + 3) * 0.35 + Math.sin(tt * 19.3) * 0.15) * 0.011 * tn;
    const bobA = (0.035 + 0.04 * sprint) * mv * (1 - 0.85 * ads) * (1 + tn * 1.1), ph = P.bob;
    let ex = P.x + Math.cos(P.yaw) * Math.sin(ph) * bobA * 0.8, ez = P.z - Math.sin(P.yaw) * Math.sin(ph) * bobA * 0.8;
    let ey = P.y + P.eyeY + (0.5 - 0.5 * Math.cos(2 * ph)) * bobA * 1.3 - Math.pow(Math.max(0, Math.cos(2 * ph)), 6) * bobA * 0.35 - (P.fall * (P.eyeY - 0.25)) + (G.time * 0.0);
    ey += Math.sin(G.time * 1.3) * 0.004 * (1 - ads); // respiração
    if (G.shake > 0.01) { ex += (Math.random() - 0.5) * G.shake * 0.12; ey += (Math.random() - 0.5) * G.shake * 0.12; ez += (Math.random() - 0.5) * G.shake * 0.12; }
    const sk = tn * 0.012; ex += (Math.sin(tt * 17.1) + Math.sin(tt * 9.3)) * sk; ey += (Math.sin(tt * 14.7 + 1) + Math.sin(tt * 8.1)) * sk; ez += (Math.sin(tt * 15.3 + 2) + Math.sin(tt * 10.7)) * sk;
    camera.position.set(ex, ey, ez);
    let pitch = P.pitch + Math.cos(2 * ph) * 0.007 * mv * (1 - ads) + P.rc.p - BC.clamp((P.stnVel || 0) * 0.06, -0.12, 0.12), yaw = P.yaw + P.rc.y, roll = Math.sin(ph) * 0.012 * mv * (1 - ads) + Math.sin(tt * 2.3) * 0.03 * tn + Math.sin(tt * 11) * 0.006 * tn + P.fall * 0.9 + Math.sin(ph * 0.5) * 0.03 * P.prone * mv + (P.stnVel || 0) * 0.015;
    pitch += P.fall * 0.5;
    _e.set(BC.clamp(pitch, -1.5, 1.5), yaw, roll, 'YXZ'); camera.quaternion.setFromEuler(_e);
    // nascer/pôr do sol, sol segue o jogador (sombras)
    sun.position.set(P.x + sunDir.x * 90, P.y + sunDir.y * 90, P.z + sunDir.z * 90); sun.target.position.set(P.x, P.y, P.z); sun.target.updateMatrixWorld();
    sky.position.copy(camera.position);
    fx.updateWeather(dt, camera.position, G.time);
    // viewmodel
    const m = vm[P.cur]; if (!m) return;
    const scoped = wst.scoped && ads > 0.92;
    vmGroup.visible = P.alive && !(P.fall > 0.3) && !scoped; BC.UI.setScope(scoped && P.alive, wst.scopeType); BC.UI.setDot(wst.dot && ads > 0.8 && P.alive, wst.scopeType);
    if (m.scopeMesh) m.scopeMesh.visible = !(wst.dot && ads > 0.5);
    const hip = spec.hip, adp = [spec.ads[0], spec.ads[1] - (wst.scopeH && !wst.scoped ? wst.scopeH * 0.9 : 0), spec.ads[2]];
    let px = BC.lerp(hip[0], adp[0], ads), py = BC.lerp(hip[1], adp[1], ads), pz = BC.lerp(hip[2], adp[2], ads);
    let rx = 0, ry = 0, rz = 0;
    // sprint: arma baixa e inclinada
    px += 0.07 * sprint; py += -0.09 * sprint; pz += 0.02 * sprint; rx += 0.55 * sprint; ry += 0.55 * sprint; rz += -0.2 * sprint;
    // balanço ao andar
    const b2 = mv * (1 - 0.75 * ads) * (1 + sprint * 0.8);
    px += Math.sin(ph) * 0.012 * b2; py += (0.5 + 0.5 * Math.cos(2 * ph)) * 0.014 * b2 - 0.006 * b2; rz += Math.sin(ph) * 0.02 * b2;
    // inércia do corpo: a arma atrasa ao andar de lado/frente e balança na respiração
    const lat = P.vx * Math.cos(P.yaw) - P.vz * Math.sin(P.yaw), fwd = -(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw));
    vmState.lat = (vmState.lat || 0) + (lat - (vmState.lat || 0)) * Math.min(1, 6 * dt); vmState.fwd = (vmState.fwd || 0) + (fwd - (vmState.fwd || 0)) * Math.min(1, 6 * dt);
    const ik = 1 - 0.7 * ads; px += -vmState.lat * 0.006 * ik; rz += -vmState.lat * 0.008 * ik; pz += vmState.fwd * 0.004 * ik; rx += (0.5 - 0.5 * Math.cos(2 * ph)) * -0.015 * b2 + Math.cos(2 * ph) * 0.01 * b2; ry += Math.cos(ph) * 0.012 * b2;
    px += Math.sin(G.time * 0.9) * 0.0015 * (1 - ads); py += Math.sin(G.time * 1.3 + 1) * 0.0018 * (1 - ads); rx += Math.sin(G.time * 1.3) * 0.002 * (1 - ads);
    // atraso do mouse (sway)
    vmState.sx += (-vmState.sx) * Math.min(1, 7 * dt); vmState.sy += (-vmState.sy) * Math.min(1, 7 * dt);
    px += vmState.sx * 0.5 * (1 - ads * 0.7); py += vmState.sy * 0.5 * (1 - ads * 0.7); ry += vmState.sx * 1.2; rx += vmState.sy * 1.2;
    // a mira acompanha a arma: o tiro sai pela linha de visada (alça-massa / ponto / luneta), que balança com o corpo
    {
      const aw = ads * ads * ads, tw = (1 + 0.6 * mv) * aw, t = G.time;
      rx += Math.sin(t * 1.1) * 0.012 * tw + Math.sin(t * 2.3 + 2) * 0.004 * tw; ry += Math.sin(t * 0.8 + 1) * 0.016 * tw + Math.sin(t * 1.9) * 0.004 * tw;
      const D = 40; P.aimY = aw * (ry - (px - adp[0]) / D); P.aimP = aw * (rx + (py - adp[1]) / D);
      const pxs = (window.innerHeight / 2) / Math.tan(BC.rad(fov) / 2), ox = -Math.tan(P.aimY) * pxs, oy = -Math.tan(P.aimP) * pxs;
      BC.UI.setAim(P.alive ? ox : 0, P.alive ? oy : 0);
    }
    rx += P.trP * 2.2; ry += P.trY * 2.2; px += Math.sin(tt * 12.3) * 0.004 * tn; py += Math.sin(tt * 10.1) * 0.004 * tn;
    // coice
    pz += P.kick * 0.03 * (1 - 0.5 * ads); py += P.kick * 0.006; rx += P.kickR * 1.6 * (1 - 0.3 * ads);
    // sacar / trocar de arma: abaixa rápido e levanta com leve excesso (mão esquerda atrasa)
    const hand = m.arms.armL; let handY = 0, handZ = 0, handX = 0;
    if (P.swapT > 0) {
      let u; if (P.swapping && P.swapT > 0.5) u = 1 - BC.smooth(0.7, 0.5, P.swapT); else u = BC.VMA.easeOutBack(1 - P.swapT / 0.5);
      const low = 1 - u; py += -0.34 * low; rx += 0.95 * low; rz += 0.55 * low; ry += -0.45 * low; px += 0.1 * low; handY += -0.07 * low; handZ += 0.05 * low;
    }
    // arremesso de granada: arma abaixa, granada na mão direita faz o movimento de lançar
    for (const k in G.vmGren) G.vmGren[k].visible = false;
    if (P.thr) {
      const th = P.thr.t, lowv = th < 0.2 ? BC.smooth(0, 0.2, th) : th < 0.7 ? 1 : 1 - BC.smooth(0.7, 0.95, th);
      py += -0.32 * lowv; rx += 0.9 * lowv; rz += 0.5 * lowv; px -= 0.06 * lowv;
      const gm = G.vmGren[P.thr.type]; if (th < 0.62) {
        gm.visible = true; const wind = BC.smooth(0.12, 0.4, th), thr_ = BC.smooth(0.4, 0.5, th);
        gm.position.set(0.17 - 0.05 * wind + 0.02 * thr_, -0.25 + 0.14 * wind - 0.06 * thr_, -0.34 + 0.22 * wind - 0.5 * thr_); gm.rotation.set(th * 4, th * 2, th * 3);
      }
    }
    if (P.stn > 0.05) { const sc = P.crouch * 0.01 + P.prone * 0.03; py += -sc - Math.abs(P.stnVel || 0) * 0.012; pz += P.prone * 0.04; }
    // recarga em fases
    const out = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, hx: 0, hy: 0, hz: 0 };
    BC.VMA.reload(m, spec, P.rl, out);
    px += out.px; py += out.py; pz += out.pz; rx += out.rx; ry += out.ry; rz += out.rz; handX += out.hx; handY += out.hy; handZ += out.hz;
    if (m.parts.pump) { const pk = P.pumpT > 0 ? Math.sin((1 - P.pumpT / 0.55) * Math.PI) : 0; m.parts.pump.position.z = pk * 0.1; handZ += pk * 0.1; }
    if (m.parts.slide && !P.rl) { const empty = P.w[P.cur].mag <= 0; m.parts.slide.position.z = (P.slideK || 0) * 0.035 + (empty ? 0.03 : 0); }
    hand.position.set(handX, handY, handZ);
    m.root.position.set(px, py, pz); m.root.rotation.set(rx, ry, rz);
    // pós
    const scope = wst.scoped ? ads : 0;
    post.k = BC.lerp(0.2, 0.05, ads * 0.7 + scope * 0.3); post.zoom = BC.lerp(0.87, 0.97, ads * 0.7 + scope * 0.3);
  }

  // ------------------------------------------------------------ entrada
  function bindInput() {
    const cv = renderer.domElement;
    window.addEventListener('keydown', (e) => {
      if (!G.running || G.over) return;
      if (e.code === 'Tab') { e.preventDefault(); BC.UI.scoreboard(true); }
      if (e.repeat) return; keys[e.code] = true;
      const P = G.player;
      if (e.code === 'KeyR' && P.alive) startReload();
      if (e.code === 'KeyB' && P.alive) { const w = P.w[P.cur]; if (w.spec.auto) { w.mode = w.mode === 'auto' ? 'semi' : 'auto'; BC.Audio.click(0.4); BC.UI.weaponChanged(); } }
      if (e.code === 'Digit1' || e.code === 'Digit2') G.selectWeapon(+e.code.slice(5) - 1);
      if (e.code === 'KeyQ' && P.alive) G.selectWeapon((P.cur + 1) % P.w.length);
      if (e.code === 'KeyF' && P.alive) aimTog = !aimTog;
      if (e.code === 'KeyZ' && P.alive) P.proneTog = !P.proneTog;
      if (e.code === 'KeyE' && P.alive && BC.Vehicles) BC.Vehicles.useKey();
      if (e.code === 'KeyV' && P.alive && !(P.faintT > 0) && !P.heal && P.kit && P.kit.band > 0 && (P.bld > 0.01 || P.hp < 100)) { P.kit.band--; P.heal = { type: 'band', t: 0, dur: 2.4 }; BC.Audio.cloth && BC.Audio.cloth(0.8); }
      if (e.code === 'KeyX' && P.alive && !(P.faintT > 0) && !P.heal && P.kit && P.kit.med > 0 && (P.bld > 0.01 || P.hp < 100)) { P.kit.med--; P.heal = { type: 'med', t: 0, dur: 5 }; BC.Audio.cloth && BC.Audio.cloth(0.8); }
      if (e.code === 'KeyG' && P.alive && !P.thr && P.swapT <= 0 && P.gren[P.grSel] > 0) { P.thr = { t: 0, type: P.grSel }; P.rl = null; aimTog = false; BC.Audio.click(0.3); }
      if (e.code === 'KeyH' && P.alive) { const ks = Object.keys(P.gren).filter((k) => P.gren[k] > 0); if (ks.length) { P.grSel = ks[(ks.indexOf(P.grSel) + 1) % ks.length]; BC.Audio.click(0.2); } }
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Tab') BC.UI.scoreboard(false); });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
    cv.addEventListener('mousedown', (e) => {
      if (!G.running) return;
      if (!locked) { G.lock(); return; }
      if (e.button === 0) { mouseL = true; edgeClick = true; } if (e.button === 2) mouseR = true;
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; });
    window.addEventListener('contextmenu', (e) => { if (G.running) e.preventDefault(); });
    window.addEventListener('wheel', (e) => { if (!G.running || !locked) return; const P = G.player; G.selectWeapon((P.cur + (e.deltaY > 0 ? 1 : -1) + P.w.length) % P.w.length); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      locked = document.pointerLockElement === cv; BC.UI.lockChanged(locked);
      if (!locked) { mouseL = mouseR = false; }
    });
    document.addEventListener('mousemove', (e) => {
      if (!locked || !G.running) return; const P = G.player; if (!P.alive || P.faintT > 0) return;
      const hipT = Math.tan(BC.rad(G.hipV || 60) / 2), curT = Math.tan(BC.rad(G.curFov || 60) / 2), ratio = curT / hipT;
      const sens = 0.0022 * G.settings.sens * ratio;
      P.yaw -= e.movementX * sens; P.pitch = BC.clamp(P.pitch - e.movementY * sens, -1.553, 1.553);
      vmState.sx = BC.clamp(vmState.sx - e.movementX * 0.0004, -0.05, 0.05); vmState.sy = BC.clamp(vmState.sy + e.movementY * 0.0004, -0.05, 0.05);
    });
  }
  G.lock = function () { const cv = renderer.domElement; if (cv.requestPointerLock) { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } BC.Audio.init(); };
  G.isLocked = () => locked;
  G.input = { keys, setMouse: (l, r) => { mouseL = l; mouseR = r; }, click: () => { edgeClick = true; } };

  // ------------------------------------------------------------ laço
  let last = performance.now(), glitchDecay = 0;
  G.glitch = 0; G.flashScreen = 0;
  G.step = function (dt) {
    G.frame = (G.frame || 0) + 1; // avanço de simulação (usado pelo laço e pelos testes)
    G.time += dt; G.matchT += dt;
    if (G.running) {
      updatePlayer(dt); if (G.player.alive) updateTension(dt); for (let i = G.lg.length - 1; i >= 0; i--) { G.lg[i].a -= dt * 3.2; if (G.lg[i].a <= 0) G.lg.splice(i, 1); } if (G.net && BC.MP) BC.MP.tick(dt);
      for (const b of G.bots) b.update(dt);
      BC.Rockets.update(dt); BC.Modes.update(dt);
      BC.Gren.update(dt); G.shake = Math.max(0, (G.shake || 0) * Math.exp(-4.5 * dt)); G.blind = Math.max(0, (G.blind || 0) - dt);
      fx.update(dt, G.world);
      BC.Audio.ambientTick(dt);
    }
    G.glitch = Math.max(0, G.glitch - dt * 2.2); G.flashScreen = Math.max(0, G.flashScreen - dt);
  };
  G.renderFrame = function (dt) {
    if (!G.player) return;
    updateCamera(dt || 0.016);
    post.render(scene, camera, vm.length ? vmScene : null, vmCam, { time: G.time, glitch: G.glitch + (G.player.alive ? 0 : 0.15) + Math.min(1.1, (G.blind || 0) * 0.4), damage: G.player.hitFlash * 0.5 + (G.player.hp < 30 ? (30 - G.player.hp) / 80 : 0), dead: BC.smooth(0, 1, G.player.fall) * 0.85, lg: G.lg, flash: G.flashScreen * 1.5 + Math.min(1.6, (G.blind || 0) * 0.55) });
    BC.UI.frame(dt || 0.016);
  };
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (G.running && !G.paused && !G.over) { G.step(dt); }
    if (G.running) G.renderFrame(dt);
  }
  G.go = function () { G.init(); requestAnimationFrame(loop); };
})();
