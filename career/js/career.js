// SkyHub Karriär – prototyp: du är ramparbetare och gör turnarounds för hand.
(function () {
  const SH = window.SH, D = SH.D, L = D.layout, Sim = SH.Sim, X = SH.G, T = THREE, Sfx = SH.Sfx;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kr = (v) => Math.round(v).toLocaleString('sv-SE') + ' kr';
  const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const fmt = (t) => String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const standById = (id) => L.stands.find((s) => s.id === id);

  // ---------- framsteg (sparas) ----------
  const SAVE = 'skyhub.career.v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(SAVE)); } catch (e) { return null; } };
  const P = load() || { money: 0, xp: 0, level: 0, hires: {}, day: 1, starsTotal: 0, flights: 0 };
  const saveP = () => { try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch (e) { /* privat läge */ } };

  // ---------- renderer, scen ----------
  const canvas = $('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  const scene = new T.Scene();
  scene.background = X.tex((x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4fa9e6'); g.addColorStop(0.65, '#a7dcf6'); g.addColorStop(1, '#cdeefb'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, 2, 256);
  scene.fog = new T.Fog(0xcdeefb, 200, 560);
  const camera = new T.PerspectiveCamera(40, 1, 0.5, 2000);
  scene.add(new T.HemisphereLight(0xe3f4ff, 0x9bc88a, 0.62));
  const sun = new T.DirectionalLight(0xfff0d0, 1.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);
  const W = SH.World.build(scene, 'Norrvik');

  // ---------- statiska saker per gate: bandlastare, stoppklossar ----------
  const gateObj = {};
  L.stands.forEach((st) => {
    const belt = X.vehicle('belt'); scene.add(belt); belt.visible = false;
    const chocks = new T.Group(); [-0.7, 0.7].forEach((dx) => { const c = X.rbox(0.5, 0.4, 0.7, 0xf2b134, chocks, 0.1); c.position.set(dx, 0.2, 0); }); scene.add(chocks); chocks.visible = false;
    const closed = new T.Group(); scene.add(closed);
    for (let i = -2; i <= 2; i++) { const c = X.cone(0.35, 0.9, 0xff7a2f, closed, 12); c.position.set(st.x + i * 4, 0.45, -14); }
    const sign = X.decal(X.textTex('STÄNGD', 256, 80, '#e8634a', '#ffffff', '700 54px Fredoka, sans-serif'), 5, 1.6, closed); sign.position.set(st.x, 2, -14); sign.rotation.y = Math.PI;
    gateObj[st.id] = { belt, chocks, closed };
  });

  // ---------- fordon spelaren kan köra: bagagetåg och pushbacktraktor ----------
  const trainG = X.vehicle('train'); scene.add(trainG);
  const carts = trainG.userData.carts.map((c) => { scene.attach(c); return c; });
  const train = { x: L.hall.x + 6, z: -12, h: Math.PI, v: 0, crumbs: [], load: 'empty' };
  for (let i = 0; i < 60; i++) train.crumbs.push([train.x - Math.sin(train.h) * i * 0.25, train.z - Math.cos(train.h) * i * 0.25]);
  const tugG = X.vehicle('tug'); scene.add(tugG);
  const tug = { x: -28, z: -14, h: Math.PI, v: 0 };
  const helperTug = X.vehicle('tug'); scene.add(helperTug); helperTug.visible = false;
  const helperTrainG = X.vehicle('train'); scene.add(helperTrainG); helperTrainG.visible = false;
  const pushGhost = new T.Group(); scene.add(pushGhost); pushGhost.visible = false;
  { const m = new T.Mesh(new T.RingGeometry(5, 6.2, 40), new T.MeshBasicMaterial({ color: 0x2bb3a6, transparent: true, opacity: 0.85, side: T.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.06; pushGhost.add(m);
    const a = new T.Mesh(new T.ConeGeometry(1.4, 3.2, 3), new T.MeshBasicMaterial({ color: 0x2bb3a6 })); a.rotation.set(-Math.PI / 2, 0, Math.PI / 2); a.position.set(-8, 0.1, 0); pushGhost.add(a); }
  const hallMark = new T.Mesh(new T.RingGeometry(3.4, 4.2, 32), new T.MeshBasicMaterial({ color: 0xf2b134, side: T.DoubleSide })); hallMark.rotation.x = -Math.PI / 2; hallMark.position.set(L.hall.x, 0.06, L.hall.z - 1.5); scene.add(hallMark);
  const arrow = new T.Group(); scene.add(arrow);
  X.cone(0.9, 1.8, 0xe8634a, arrow, 16).rotation.x = Math.PI;

  // externa fordon (tankbil, catering, städ)
  const extVeh = [];
  function sendExt(type, spot, stay, f) {
    const g = X.vehicle(type === 'clean' ? 'van' : type); scene.add(g);
    const from = { x: L.gates[1], z: L.roadZ[1] }, back = { x: L.gates[1], z: L.roadZ[0] };
    const route = (a, b) => { const lane = b.x >= a.x ? L.roadZ[0] : L.roadZ[1]; return Sim.smooth([{ x: a.x, z: a.z }, { x: a.x, z: lane }, { x: b.x, z: lane }, { x: b.x, z: b.z }].filter((p, i, arr) => i === 0 || Math.hypot(p.x - arr[i - 1].x, p.z - arr[i - 1].z) > 0.5), 3); };
    extVeh.push({ g, f, type, pts: route(from, spot), i: 0, u: 0, x: from.x, z: from.z, h: 0, state: 'in', stay, back: () => route(spot, back), spotH: spot.h });
  }

  // ---------- personer ----------
  const manager = X.person({ shirt: 0xff9a1f, pants: 0x3c4a63, skin: 0xf3c9a5, hair: 0x3b2a20, vest: 0xff9a1f, cap: 0x3c4a63, ear: 1, scale: 0.84 });
  scene.add(manager); manager.position.set(-30, 0, -12); manager.rotation.y = Math.PI;
  const helperFig = {};
  Object.keys(D.helpers).forEach((k, i) => { const p = X.person(Object.assign(X.crewLook(i + 1), k === 'marshal' ? { wands: 1, vest: 0xc6f03c } : {})); p.visible = false; scene.add(p); helperFig[k] = p; });

  // ---------- skift ----------
  let S = null;
  function newShift() {
    const t0 = hm(D.shift.start);
    S = { t: t0, end: hm(D.shift.end), flights: [], drops: [], streak: 0, done: 0, starsShift: 0, earned: 0, ended: false, perfectMarshal: 0, ontime: 0, dropped: 0, radio: [], goalsDone: {} };
    D.schedule.forEach((r, i) => {
      const A = D.aircraft[r.size], sta = hm(r.arr);
      S.flights.push({ id: i + 1, al: r.al, size: r.size, stand: r.stand, from: r.from, to: r.to, lvl: r.lvl || 0, code: r.al + ' ' + (200 + i * 37), sta, std: sta + A.turn,
        phase: 'sched', mv: null, x: 0, z: 0, y: 0, hd: 0, steps: null, bagsIn: A.bags, bagsOut: A.bags, bridgeOn: false, stars: null, safety: true, early: 0 });
    });
    S.goals = [
      { id: 'ontime', text: 'Tre avgångar i tid', need: 3, get: () => S.ontime },
      { id: 'marshal', text: 'Två perfekta inledningar', need: 2, get: () => S.perfectMarshal },
      { id: 'bags', text: 'Inga tappade väskor kvar på marken', need: 1, get: () => (S.done >= 3 && S.dropped === 0 ? 1 : 0) },
    ];
    radio('TORNET', `God morgon ${P.level ? 'arbetsledare' : 'ramparbetare'}! Första planet landar ${fmt(S.flights.find(activeLvl).sta)}.`);
  }
  const activeLvl = (f) => f.lvl <= P.level;
  function radio(who, msg) { S.radio.push({ who, msg, at: performance.now() }); Sfx.radio(); }

  // ---------- steg i en turnaround ----------
  const STEPS = [
    ['marshal', 'Led in planet'], ['chocks', 'Stoppklossar'], ['bridge', 'Koppla bryggan'], ['unload', 'Lossa väskor'], ['bagrun', 'Bagagerundan'],
    ['load', 'Lasta väskor'], ['service', 'Tankning, städ, boarding'], ['bridgeOff', 'Koppla loss bryggan'], ['chocksOff', 'Ta bort klossarna'], ['push', 'Pushback'],
  ];
  const STEPHELP = { marshal: 'marshal', chocks: 'ramp', bridge: 'ramp', unload: 'bags', bagrun: 'bags', load: 'bags', bridgeOff: 'ramp', chocksOff: 'ramp', push: 'push' };
  function initSteps(f) {
    f.steps = {}; STEPS.forEach(([k]) => (f.steps[k] = { st: 'locked', by: null, prog: 0 }));
    f.steps.marshal.st = 'done';
  }
  function deps(f, k) {
    const s = f.steps, d = (x) => s[x].st === 'done';
    switch (k) {
      case 'chocks': return f.phase === 'stand';
      case 'bridge': return d('chocks');
      case 'unload': return d('chocks');
      case 'bagrun': return d('unload');
      case 'load': return d('bagrun');
      case 'bridgeOff': return d('service');
      case 'chocksOff': return d('bridgeOff') && d('load') && f.fuelDone;
      case 'push': return d('chocksOff');
    }
    return false;
  }
  const spotOf = (f, k) => {
    const st = standById(f.stand), A = D.aircraft[f.size], cz = L.stopZ - A.nose;
    switch (k) {
      case 'marshal': return { x: st.x, z: L.stopZ + 5, r: 3 };
      case 'chocks': case 'chocksOff': return { x: st.x + 1.8, z: L.stopZ - 2.6, r: 2.6 };
      case 'bridge': case 'bridgeOff': return { x: st.x + 6, z: -11.6, r: 2.6 };
      case 'unload': case 'load': { const b = Sim.workSpot(f.stand, f.size, 'belt'); return { x: b.x + 2.4, z: b.z - 3.2, r: 2.8 }; }
      case 'bagrun': return { x: train.x, z: train.z, r: 3.2 };
      case 'push': return { x: tug.x, z: tug.z, r: 3.2 };
    }
  };

  // ---------- spelarens läge ----------
  const G = { mode: 'walk', task: null, hold: 0, paused: false, started: false, sel: null };
  // mode: walk | train | tug | rhythm
  let target = null;

  // ---------- rytmspel: väskor ----------
  let rhythm = null;
  function startRhythm(f, kind) {
    const n = kind === 'unload' ? f.bagsIn : f.bagsOut;
    rhythm = { f, kind, n, spawned: 0, hit: 0, miss: 0, bags: [], t: 0, next: 0.4, done: false };
    G.mode = 'rhythm'; $('rhythm').hidden = false; f.steps[kind].st = 'active'; f.steps[kind].by = 'you';
    $('rhTitle').textContent = kind === 'unload' ? `Lossa ${f.code}: ta emot väskorna` : `Lasta ${f.code}: skicka upp väskorna`;
  }
  function rhythmTick(dt) {
    const r = rhythm; r.t += dt;
    if (r.spawned < r.n && r.t >= r.next) { r.bags.push({ x: 0, hit: false, id: r.spawned }); r.spawned++; r.next = r.t + 0.62 + Math.random() * 0.35; }
    const speed = 0.62;
    r.bags.forEach((b) => (b.x += dt * speed));
    r.bags.filter((b) => !b.hit && !b.gone && b.x > 0.97).forEach((b) => { b.gone = true; r.miss++; Sfx.bad(); feedback('Missad!', 'bad'); dropBag(r.f); });
    r.bags = r.bags.filter((b) => !b.gone && !(b.hit && b.x > 1.1));
    const track = $('rhTrack');
    track.innerHTML = `<span class="zone"></span>` + r.bags.map((b) => `<span class="bag ${b.hit ? 'hit' : ''}" style="left:${(b.x * 100).toFixed(1)}%"></span>`).join('');
    $('rhCount').textContent = `${r.hit + r.miss} / ${r.n}`;
    if (r.hit + r.miss >= r.n && !r.bags.some((b) => !b.hit)) endRhythm();
  }
  function rhythmPress() {
    const r = rhythm; const cand = r.bags.filter((b) => !b.hit).sort((a, b) => b.x - a.x)[0];
    if (!cand) return;
    if (cand.x >= 0.76 && cand.x <= 0.95) { cand.hit = true; r.hit++; Sfx.thunk(); feedback(cand.x > 0.82 && cand.x < 0.9 ? 'Perfekt!' : 'Bra!', 'good'); }
    else if (cand.x < 0.76) { feedback('För tidigt', 'meh'); }
  }
  function endRhythm() {
    const r = rhythm; rhythm = null; $('rhythm').hidden = true; G.mode = 'walk';
    r.f.steps[r.kind].st = 'done';
    if (r.kind === 'unload') train.load = 'arrivals';
    if (r.kind === 'load') train.load = 'empty';
    Sfx.good();
  }
  function dropBag(f) {
    const b = Sim.workSpot(f.stand, f.size, 'belt');
    const g = X.rbox(0.6, 0.45, 0.8, [0xe8634a, 0x3f6fd8, 0x8b5cf6, 0x2bb3a6][S.drops.length % 4], scene, 0.12);
    const d = { f: f.id, x: b.x + 2 + Math.random() * 3, z: b.z - 1 - Math.random() * 3, g };
    g.position.set(d.x, 0.25, d.z); g.rotation.y = Math.random() * 3; S.drops.push(d); S.dropped++;
  }
  function feedback(txt, cls) { const el = $('rhFb'); el.textContent = txt; el.className = 'fb ' + cls; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }

  // ---------- planens rörelser ----------
  function setPath(f, pts) { f.mv = { pts, i: 0, u: 0 }; f.x = pts[0].x; f.z = pts[0].z; f.y = pts[0].y || 0; }
  const curV = (mv) => { const a = mv.pts[mv.i], b = mv.pts[Math.min(mv.i + 1, mv.pts.length - 1)]; return ((a.v || 1) + ((b.v || 1) - (a.v || 1)) * mv.u) * D.SPEED; };
  function remaining(mv) { let d = 0; for (let i = mv.i; i < mv.pts.length - 1; i++) { const a = mv.pts[i], b = mv.pts[i + 1], l = Math.hypot(b.x - a.x, b.z - a.z); d += i === mv.i ? l * (1 - mv.u) : l; } return d; }
  const leadMin = (f) => { const p = Sim.arrivalPath(f.stand, f.size); return (Sim.pathTime(p.app) + Sim.pathTime(p.roll) + Sim.pathTime(p.taxi)) / D.SPEED * D.GMIN_PER_SEC / 60 * 60 + 0.6; };
  const occupied = (stand, f) => S.flights.some((g) => g !== f && g.stand === stand && ['taxiIn', 'waitMarshal', 'final', 'stand', 'pushback'].includes(g.phase));
  const runwayBusy = (f) => S.flights.some((g) => g !== f && ['approach', 'rollout', 'takeoff'].includes(g.phase) && !(g.phase === 'takeoff' && g.y > 6));

  function flightTick(f, dt) {
    const tg = S.t;
    if (f.phase === 'sched') {
      if (!activeLvl(f)) return;
      if (tg >= f.sta - leadMin(f) && !occupied(f.stand, f) && !runwayBusy(f)) {
        f.paths = Sim.arrivalPath(f.stand, f.size); f.phase = 'approach'; setPath(f, f.paths.app);
        radio('TORNET', `${D.callsign[f.al]} ${f.code.split(' ')[1]}, fri att landa bana 09.`);
      }
      return;
    }
    if (!f.mv) {
      if (f.phase === 'hold' && !runwayBusy(f)) { f.phase = 'takeoff'; setPath(f, Sim.takeoffPath()); Sfx.whoosh(); radio('TORNET', `${D.callsign[f.al]} ${f.code.split(' ')[1]}, fri att starta. Trevlig resa till ${f.to}!`); }
      return;
    }
    // taxa in: stanna och vänta på marshaller
    if (f.phase === 'taxiIn' && remaining(f.mv) < 30) {
      const hasHelper = P.hires.marshal && !helperBusy('marshal', f);
      if (hasHelper) { f.phase = 'final'; f.mBy = 'helper'; reserveHelper('marshal', f); }
      else if (nearSpot(spotOf(f, 'marshal'))) { f.phase = 'final'; f.mBy = 'you'; Sfx.click(); }
      else { if (f.phase !== 'waitMarshal') { f.phase = 'waitMarshal'; radio(D.callsign[f.al].toUpperCase(), `Vi står vid ${f.stand}. Är det någon som tänker vinka in oss?`); } return; }
    }
    if (f.phase === 'waitMarshal') { if (nearSpot(spotOf(f, 'marshal'))) { f.phase = 'final'; f.mBy = 'you'; } else return; }
    if (playerBlocks(f)) { if (!f.honked) { f.honked = true; f.safety = false; Sfx.honk(); honkFx(V(f.x, 9, f.z)); toast('Du stod i vägen för planet!', 'bad'); } return; }
    f.honked = false;
    let v = curV(f.mv);
    if (f.phase === 'final') v = 3.4;
    const end = Sim.stepAlong(f, f.mv, v * dt, false);
    if (f.phase === 'takeoff' && f.y > 6 && !f.gonePing) f.gonePing = true;
    if (f.phase === 'final') {
      const nose = f.z + D.aircraft[f.size].nose;
      if (f.mBy === 'helper' && nose >= L.stopZ - 0.2) { stopAtStand(f, 'perfect'); return; }
      if (nose > L.stopZ + 1.4) { stopAtStand(f, 'miss'); return; }
    }
    if (end) {
      if (f.phase === 'approach') { f.phase = 'rollout'; setPath(f, f.paths.roll); }
      else if (f.phase === 'rollout') { f.phase = 'taxiIn'; setPath(f, f.paths.taxi); }
      else if (f.phase === 'taxiIn' || f.phase === 'final') stopAtStand(f, f.mBy === 'helper' ? 'perfect' : 'miss');
      else if (f.phase === 'taxiOut') { f.phase = 'hold'; f.mv = null; }
      else if (f.phase === 'takeoff') { f.phase = 'gone'; f.mv = null; }
    }
  }
  function marshalPress(f) {
    const nose = f.z + D.aircraft[f.size].nose, d = L.stopZ - nose;
    if (d > 3.5) { f.early++; feedbackWorld('För tidigt! Fortsätt vinka', 'meh'); Sfx.bad(); if (f.early >= 2) f.safety = false; return; }
    stopAtStand(f, Math.abs(d) <= 1.2 ? 'perfect' : 'ok');
  }
  function stopAtStand(f, result) {
    const st = standById(f.stand), A = D.aircraft[f.size];
    f.phase = 'stand'; f.mv = null; f.x = st.x; f.z = L.stopZ - A.nose; f.hd = 0; f.onBlock = S.t;
    if (f.mBy === 'helper') releaseHelper('marshal', f);
    initSteps(f);
    if (result === 'perfect') { S.perfectMarshal += f.mBy === 'you' ? 1 : 0; if (f.mBy === 'you') { toastWorld('Perfekt stopp!', 'good'); Sfx.ding(); } }
    else if (result === 'ok') { toastWorld('Bra stopp', 'good'); Sfx.good(); }
    else { f.safety = f.mBy === 'helper' ? f.safety : false; toastWorld('Planet fick stanna själv', 'bad'); Sfx.bad(); }
    const g = gateObj[f.stand], b = Sim.workSpot(f.stand, f.size, 'belt');
    g.belt.visible = true; g.belt.position.set(b.x, 0, b.z); g.belt.rotation.y = b.h;
    f.extAt = S.t + 3;
    radio(D.callsign[f.al].toUpperCase(), `Framme vid ${f.stand}. ${f.bagsIn} väskor i lastrummet.`);
  }

  // ---------- service (tankning, städ, boarding) sköts av andra ----------
  function serviceTick(f) {
    const s = f.steps;
    if (s.chocks.st === 'done' && !f.fuelSent && S.t >= f.extAt) { f.fuelSent = true; const w = Sim.workSpot(f.stand, f.size, 'fuel'); sendExt('fuel', w, 9, f); }
    if (s.bridge.st === 'done' && !f.svcStart) { f.svcStart = S.t; const w = Sim.workSpot(f.stand, f.size, 'catering'); sendExt('catering', w, 8, f); }
    if (f.svcStart && s.service.st !== 'done') {
      const need = f.size === 'S' ? 16 : 22; // spelminuter: avstigning, städ och boarding
      s.service.st = 'active'; s.service.by = 'other'; s.service.prog = clamp((S.t - f.svcStart) / need, 0, 1);
      if (s.service.prog >= 1) { s.service.st = 'done'; radio('TERMINALEN', `Boarding klar för ${f.code}. Alla ${D.aircraft[f.size].seats - 12} ombord.`); }
    }
  }

  // ---------- kollegor ----------
  const helperJob = {}; // roll → { f, step, t }
  const helperBusy = (role, f) => helperJob[role] && helperJob[role].f !== f;
  function reserveHelper(role, f, step) { helperJob[role] = { f, step, t: 0 }; }
  function releaseHelper(role, f) { if (helperJob[role] && helperJob[role].f === f) { delete helperJob[role]; P.money -= D.helpers[role].wage / (role === 'bags' ? 3 : role === 'ramp' ? 4 : 1); } }
  const HELPER_DUR = { chocks: 3, bridge: 4, unload: 12, bagrun: 16, load: 12, bridgeOff: 4, chocksOff: 3, push: 16 };
  function helperTick(dt) {
    for (const role of Object.keys(D.helpers)) {
      if (!P.hires[role] || role === 'marshal') continue;
      let job = helperJob[role];
      if (!job) {
        const cands = S.flights.filter((f) => f.phase === 'stand' && f.steps).sort((a, b) => a.std - b.std);
        for (const f of cands) {
          const k = D.helpers[role].steps.find((k) => f.steps[k].st === 'locked' && deps(f, k) || f.steps[k].st === 'ready');
          if (k && f.steps[k].by !== 'you') { job = helperJob[role] = { f, step: k, t: 0 }; f.steps[k].st = 'active'; f.steps[k].by = 'helper'; if (k === 'push') startHelperPush(f); break; }
        }
      }
      if (!job) continue;
      const f = job.f, k = job.step, dur = HELPER_DUR[k];
      if (k === 'push') continue; // styrs av helperPushTick
      job.t += dt; f.steps[k].prog = clamp(job.t / dur, 0, 1);
      if (job.t >= dur) {
        completeStep(f, k, 'helper');
        delete helperJob[role];
        const more = D.helpers[role].steps.some((x) => f.steps[x].st !== 'done' && x !== 'push');
        if (!more) P.money -= D.helpers[role].wage;
      }
    }
  }
  function completeStep(f, k, by) {
    f.steps[k].st = 'done'; f.steps[k].by = by; f.steps[k].prog = 1;
    if (k === 'chocks') gateObj[f.stand].chocks.visible = true;
    if (k === 'chocksOff') gateObj[f.stand].chocks.visible = false;
    if (k === 'bridge') f.bridgeOn = true;
    if (k === 'bridgeOff') f.bridgeOn = false;
    if (by === 'you') Sfx.good();
  }
  // Pushback-Petra skjuter ut längs standardvägen
  let hPush = null;
  function startHelperPush(f) { hPush = { f, pts: Sim.pushPath(f.stand, f.size), i: 0, u: 0 }; f.phase = 'pushback'; f.offBlock = S.t; helperTug.visible = true; }
  function helperPushTick(dt) {
    if (!hPush) return;
    const f = hPush.f, mv = { pts: hPush.pts, i: hPush.i, u: hPush.u };
    const end = Sim.stepAlong(f, mv, 2.6 * dt, true); hPush.i = mv.i; hPush.u = mv.u;
    const nose = D.aircraft[f.size].nose;
    helperTug.position.set(f.x + Math.sin(f.hd) * (nose + 2.2), 0, f.z + Math.cos(f.hd) * (nose + 2.2)); helperTug.rotation.y = f.hd + Math.PI;
    if (end) { helperTug.visible = false; hPush = null; f.steps.push.st = 'done'; f.steps.push.by = 'helper'; delete helperJob.push; P.money -= D.helpers.push.wage; releasePlane(f); }
  }

  // ---------- pushback (spelaren) ----------
  let push = null;
  function startPush(f) {
    const A = D.aircraft[f.size];
    const H = V(f.x, 0, f.z + A.nose + 0.4);
    tug.x = H.x; tug.z = H.z + 2.1; tug.h = Math.PI; tug.v = 0;
    push = { f, Lp: A.nose + 0.4, jack: false, ghost: V(standById(f.stand).x + 16, 0, L.taxilaneZ) };
    f.phase = 'pushback'; f.offBlock = S.t; f.steps.push.st = 'active'; f.steps.push.by = 'you';
    pushGhost.visible = true; pushGhost.position.copy(push.ghost);
    G.mode = 'tug'; Sfx.clunk();
    toast('Kopplat! W = skjut bakåt, A/D = styr. Få planet till den gröna ringen med nosen mot väster.', 'info');
  }
  function pushTick(dt, kW, kS, kA, kD) {
    const f = push.f;
    const thr = (kW ? 1 : 0) - (kS ? 1 : 0), steer = (kA ? 1 : 0) - (kD ? 1 : 0);
    tug.v += (thr * 3.2 - tug.v) * Math.min(1, dt * 2.2);
    tug.h += steer * dt * 0.9 * clamp(Math.abs(tug.v) / 2, 0, 1) * Math.sign(tug.v || 1);
    tug.x += Math.sin(tug.h) * tug.v * dt; tug.z += Math.cos(tug.h) * tug.v * dt;
    const H = V(tug.x + Math.sin(tug.h) * 2.1, 0, tug.z + Math.cos(tug.h) * 2.1), Pp = V(f.x, 0, f.z);
    const d = Pp.sub(H); const len = d.length() || 1; d.multiplyScalar(push.Lp / len);
    f.x = H.x + d.x; f.z = H.z + d.z; f.hd = Math.atan2(H.x - f.x, H.z - f.z);
    const rel = Math.abs(wrap(tug.h - Math.atan2(d.x, d.z)));
    if (rel > 1.15 && !push.jack) { push.jack = true; f.safety = false; Sfx.bad(); toast('Knäckt! Rätta upp och försök igen.', 'bad'); tug.h = Math.atan2(d.x, d.z) + Math.sign(wrap(tug.h - Math.atan2(d.x, d.z))) * 0.9; }
    if (rel < 0.8) push.jack = false;
    const inZone = Math.hypot(f.x - push.ghost.x, f.z - push.ghost.z) < 6 && Math.abs(wrap(f.hd + Math.PI / 2)) < 0.5;
    push.ready = inZone;
    pushGhost.children[0].material.color.set(inZone ? 0x6fd39b : 0x2bb3a6);
  }
  function endPush() {
    const f = push.f; push = null; pushGhost.visible = false; G.mode = 'tug';
    f.steps.push.st = 'done'; Sfx.clunk(); releasePlane(f);
    // traktorn backar undan från nosen när den kopplas loss
    tug.x += 0; tug.z += 7; tug.h = 0; tug.v = 0; f.grace = performance.now() + 2500;
  }
  function releasePlane(f) {
    const out = Sim.taxiOutPath(f.stand); const pts = [{ x: f.x, z: f.z, v: 6 }].concat(out.slice(1));
    f.phase = 'taxiOut'; setPath(f, Sim.smooth(pts, 10));
    score(f);
  }

  // ---------- stjärnor, pengar, nivåer, mål ----------
  function score(f) {
    const onTime = f.offBlock <= f.std + 2;
    const drops = S.drops.filter((d) => d.f === f.id).length;
    const stars = { time: onTime, bags: drops === 0, safety: f.safety };
    const n = Object.values(stars).filter(Boolean).length;
    f.stars = stars;
    S.streak = n === 3 ? S.streak + 1 : 0;
    const pay = D.pay.base + n * D.pay.star + (S.streak > 1 ? Math.min(5, S.streak) * D.pay.streak : 0);
    P.money += pay; S.earned += pay; P.xp += n * D.xpStar; P.starsTotal += n; P.flights++; S.done++; S.starsShift += n; if (onTime) S.ontime++;
    celebrate(f, n, pay, stars);
    checkGoals(); checkLevel(); saveP();
  }
  function checkGoals() {
    S.goals.forEach((g) => { if (!S.goalsDone[g.id] && g.get() >= g.need) { S.goalsDone[g.id] = true; P.money += 2000; P.xp += 150; S.earned += 2000; toast(`Mål klart: ${g.text}! +2 000 kr, +150 XP`, 'good'); Sfx.ding(); } });
  }
  function checkLevel() {
    const next = D.levels[P.level + 1];
    if (next && P.xp >= next.xp) {
      P.level++;
      S.flights.forEach((f) => { if (f.lvl === P.level && f.phase === 'sched' && f.sta < S.t + 25) f.phase = 'skip'; }); Sfx.level(); saveP();
      modal(`<h2>Befordrad: ${esc(next.title)}!</h2><p>${esc(next.unlock)}</p>${P.level === 1 ? '<p>Nya kollegor går att anställa, och flygen till A2 börjar komma.</p>' : '<p>Tack för att du testade prototypen! Det här är där driftcentralen tar vid i det riktiga spelet.</p>'}<div class="btns"><button type="button" class="btn y" data-act="close">Fortsätt</button></div>`);
    }
  }

  // ---------- närhet, kollisioner, blockering ----------
  const me = () => (G.mode === 'train' ? V(train.x, 0, train.z) : G.mode === 'tug' ? V(tug.x, 0, tug.z) : manager.position);
  const nearSpot = (sp) => sp && Math.hypot(manager.position.x - sp.x, manager.position.z - sp.z) < sp.r && G.mode === 'walk';
  function playerBlocks(f) {
    if (!['taxiIn', 'final', 'taxiOut'].includes(f.phase) || (f.grace && performance.now() < f.grace)) return false;
    const m = me(), fx = Math.sin(f.hd), fz = Math.cos(f.hd), dx = m.x - f.x, dz = m.z - f.z, ahead = dx * fx + dz * fz;
    const nose = D.aircraft[f.size].nose;
    return ahead > nose - 1 && ahead < nose + (f.phase === 'final' ? 3 : 12) && Math.abs(dx * fz - dz * fx) < 3.5;
  }
  function colliders() {
    const list = [];
    S.flights.forEach((f) => {
      if (!['stand', 'pushback', 'taxiIn', 'final', 'waitMarshal', 'taxiOut'].includes(f.phase) || f.z < L.taxilaneZ - 15) return;
      const A = D.aircraft[f.size], sc = A.scale, S2 = f.size === 'S', off = (A.nose - (A.len - A.nose)) / 2;
      list.push({ x: f.x + Math.sin(f.hd) * off, z: f.z + Math.cos(f.hd) * off, hw: (S2 ? 1.6 : 2.1) * sc, hd: A.len / 2, rot: f.hd });
      for (const sx of [1, -1]) { const ex = (S2 ? 3.6 : 5) * sc * sx, ez = (S2 ? 1.4 : 1.6) * sc; list.push({ x: f.x + ex * Math.cos(f.hd) + ez * Math.sin(f.hd), z: f.z - ex * Math.sin(f.hd) + ez * Math.cos(f.hd), hw: 1.1, hd: 1.6, rot: f.hd }); }
    });
    Object.values(gateObj).forEach((g) => { if (g.belt.visible) list.push({ x: g.belt.position.x, z: g.belt.position.z, hw: 0.9, hd: 2.4, rot: g.belt.rotation.y }); });
    if (G.mode !== 'train') list.push({ x: train.x, z: train.z, hw: 0.9, hd: 1.2, rot: train.h });
    if (G.mode !== 'tug') list.push({ x: tug.x, z: tug.z, hw: 1.3, hd: 2.1, rot: tug.h });
    return list;
  }
  function collide(p, dyn, R) {
    for (const b of W.colliders.boxes.concat(dyn)) {
      const c = Math.cos(b.rot), s = Math.sin(b.rot), dx = p.x - b.x, dz = p.z - b.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      const cx = clamp(lx, -b.hw, b.hw), cz = clamp(lz, -b.hd, b.hd), ox = lx - cx, oz = lz - cz, d = Math.hypot(ox, oz);
      if (d >= R) continue;
      let nx, nz, pu;
      if (d > 1e-4) { nx = ox / d; nz = oz / d; pu = R - d; } else { const px = b.hw - Math.abs(lx), pz = b.hd - Math.abs(lz); if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; pu = px + R; } else { nx = 0; nz = Math.sign(lz) || 1; pu = pz + R; } }
      p.x += (nx * c + nz * s) * pu; p.z += (-nx * s + nz * c) * pu;
    }
    for (const q of W.colliders.circles) { const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz); if (d < q.r + R && d > 1e-4) { const k = (q.r + R - d) / d; p.x += dx * k; p.z += dz * k; } }
    const B = L.bounds; p.x = clamp(p.x, B.x0, B.x1); p.z = clamp(p.z, B.z0, B.z1);
  }

  // ---------- vad ska spelaren göra nu? ----------
  function available() {
    // lista över steg du kan göra just nu, med plats
    const out = [];
    for (const f of S.flights) {
      if (f.phase === 'waitMarshal' || (f.phase === 'taxiIn' && f.mv && remaining(f.mv) < 70)) { if (!P.hires.marshal) out.push({ f, k: 'marshal', sp: spotOf(f, 'marshal'), urgent: f.phase === 'waitMarshal' }); continue; }
      if (f.phase === 'final' && f.mBy === 'you') { out.push({ f, k: 'marshalStop', sp: spotOf(f, 'marshal'), urgent: true }); continue; }
      if (f.phase !== 'stand' || !f.steps) continue;
      for (const [k] of STEPS) {
        const s = f.steps[k];
        if (k === 'service' || s.st === 'done' || s.by === 'helper' || (s.st === 'active' && s.by !== 'you')) continue;
        if (!deps(f, k)) continue;
        if (k === 'bagrun' && G.mode !== 'train') out.push({ f, k, sp: train.load === 'arrivals' || train.load === 'departures' || train.load === 'empty' ? spotOf(f, 'bagrun') : null });
        else if (k === 'bagrun') out.push({ f, k, sp: { x: L.hall.x, z: L.hall.z - 1.5, r: 4 } });
        else out.push({ f, k, sp: spotOf(f, k) });
      }
    }
    S.drops.forEach((d) => out.push({ drop: d, k: 'pick', sp: { x: d.x, z: d.z, r: 2 } }));
    return out.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || ((a.f ? a.f.std : 9e9) - (b.f ? b.f.std : 9e9)));
  }
  const VERB = { marshal: 'Gå till marshallplatsen', marshalStop: 'STOPP! Tryck när nosen är vid linjen', chocks: 'Lägg stoppklossar', bridge: 'Koppla bryggan (håll)', unload: 'Lossa väskorna', bagrun: 'Kliv in i bagagetåget', load: 'Lasta väskorna', bridgeOff: 'Koppla loss bryggan (håll)', chocksOff: 'Ta bort klossarna', push: 'Kliv in i pushbacktraktorn', pick: 'Plocka upp väskan' };
  const HOLD = { bridge: 1.2, bridgeOff: 1.2, chocks: 0.6, chocksOff: 0.6 };
  function action(fresh) {
    if (G.mode === 'rhythm') { if (fresh) rhythmPress(); return; }
    if (G.mode === 'tug') {
      if (push && push.ready && fresh) { endPush(); return; }
      if (!push && fresh) { G.mode = 'walk'; manager.visible = true; manager.position.set(tug.x + Math.cos(tug.h) * 2.6, 0, tug.z - Math.sin(tug.h) * 2.6); return; }
      return;
    }
    if (G.mode === 'train') {
      if (fresh && Math.abs(train.v) < 1.5) { G.mode = 'walk'; manager.visible = true; manager.position.set(train.x + Math.cos(train.h) * 2.4, 0, train.z - Math.sin(train.h) * 2.4); }
      return;
    }
    // stå vid marshall: tryck för stopp
    const fin = S.flights.find((f) => f.phase === 'final' && f.mBy === 'you');
    if (fin && fresh && nearSpot(spotOf(fin, 'marshal'))) { marshalPress(fin); return; }
    const av = available().filter((a) => a.sp && nearSpot(a.sp));
    const a = av[0]; if (!a) { if (fresh && Math.hypot(manager.position.x - train.x, manager.position.z - train.z) < 3.2) { enterTrain(); } else if (fresh && Math.hypot(manager.position.x - tug.x, manager.position.z - tug.z) < 3.4) { G.mode = 'tug'; manager.visible = false; } return; }
    if (a.k === 'pick') { if (fresh) { scene.remove(a.drop.g); S.drops = S.drops.filter((d) => d !== a.drop); S.dropped = Math.max(0, S.dropped - 1); Sfx.thunk(); toast('Väskan räddad!', 'good'); } return; }
    if (a.k === 'unload' || a.k === 'load') { if (fresh) { if (a.k === 'load' && train.load !== 'departures') { toast('Bagagetåget har inte hämtat avgående väskor än.', 'info'); return; } startRhythm(a.f, a.k); } return; }
    if (a.k === 'bagrun') { if (fresh) enterTrain(a.f); return; }
    if (a.k === 'push') { if (fresh) { manager.visible = false; startPush(a.f); } return; }
    if (HOLD[a.k]) { G.task = a; return; }
  }
  function enterTrain(f) { G.mode = 'train'; manager.visible = false; train.job = f || train.job || S.flights.find((x) => x.phase === 'stand' && x.steps && x.steps.bagrun.st !== 'done' && deps(x, 'bagrun')); if (train.job) { train.job.steps.bagrun.st = 'active'; train.job.steps.bagrun.by = 'you'; } Sfx.clunk(); }
  function trainTick(dt, kW, kS, kA, kD, dyn) {
    const thr = (kW ? 1 : 0) - (kS ? 1 : 0), steer = (kA ? 1 : 0) - (kD ? 1 : 0);
    if (thr > 0) train.v = Math.min(11, train.v + 8 * dt); else if (thr < 0) train.v = Math.max(-4, train.v - (train.v > 0 ? 16 : 5) * dt); else train.v *= Math.pow(0.2, dt);
    if (Math.abs(train.v) < 0.1 && !thr) train.v = 0;
    train.h += steer * dt * 1.8 * clamp(Math.abs(train.v) / 4, 0, 1) * Math.sign(train.v || 1);
    const p = V(train.x + Math.sin(train.h) * train.v * dt, 0, train.z + Math.cos(train.h) * train.v * dt), b = p.clone();
    collide(p, dyn, 1.2); if (b.distanceTo(p) > 0.02) train.v *= 0.5; train.x = p.x; train.z = p.z;
    const job = train.job;
    if (job && Math.abs(train.v) < 1 && Math.hypot(train.x - L.hall.x, train.z - (L.hall.z - 1.5)) < 4.5 && train.load !== 'departures') {
      train.swap = (train.swap || 0) + dt; $('prompt').hidden = false;
      if (train.swap > 2.2) { train.load = 'departures'; train.swap = 0; Sfx.ding(); toast('Bagagehallen: avgående väskor lastade på tåget. Kör tillbaka till planet!', 'good'); }
    } else train.swap = 0;
    if (job && train.load === 'departures' && job.steps.bagrun.st === 'active') {
      const b2 = Sim.workSpot(job.stand, job.size, 'belt');
      if (Math.hypot(train.x - (b2.x + 4), train.z - (b2.z - 5)) < 6 && Math.abs(train.v) < 1.2) { completeStep(job, 'bagrun', 'you'); toast('Tåget är tillbaka. Kliv ur och lasta!', 'good'); }
    }
  }

  // ---------- kamera och inmatning ----------
  let yaw = 0, yawT = 0, dist = 18, pitch = 0.62;
  const keys = new Set();
  let fDown = false;
  addEventListener('keydown', (e) => {
    if (G.modal || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (!keys.has(k) && (k === 'f' || k === ' ')) { e.preventDefault(); fDown = true; action(true); }
    keys.add(k);
    if (k === 'p') G.paused = !G.paused;
  });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); keys.delete(k); if (k === 'f' || k === ' ') { fDown = false; G.task = null; G.hold = 0; } });
  addEventListener('blur', () => { keys.clear(); fDown = false; });
  const actBtn = $('act');
  actBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); Sfx.init(); fDown = true; action(true); });
  addEventListener('pointerup', () => { if (fDown && !keys.has('f') && !keys.has(' ')) { fDown = false; G.task = null; G.hold = 0; } });
  const ray = new T.Raycaster(), ground = new T.Plane(V(0, 1, 0), 0), ptrs = new Map(); let drag = null, pinch = 0;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { Sfx.init(); canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, btn: e.button }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) dist = clamp(dist * pinch / d, 9, 45); pinch = d; drag = null; return; }
    if (!drag) return; if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
    if (drag.moved) { yawT -= (e.clientX - drag.lx) * 0.008; yaw = yawT; pitch = clamp(pitch + (e.clientY - drag.ly) * 0.005, 0.15, 1.35); }
    drag.lx = e.clientX; drag.ly = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
    if (!drag || drag.moved || drag.btn !== 0) { drag = null; return; } drag = null;
    if (G.mode !== 'walk') return;
    ray.setFromCamera(new T.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const p = V(0, 0, 0); if (ray.ray.intersectPlane(ground, p)) target = p;
  });
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = 0; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); dist = clamp(dist * Math.exp(e.deltaY * 0.001), 9, 45); }, { passive: false });

  // ---------- planmodeller och synk ----------
  const planes = new Map();
  function syncPlanes(dt) {
    const seen = new Set();
    for (const f of S.flights) {
      if (!['approach', 'rollout', 'taxiIn', 'waitMarshal', 'final', 'stand', 'pushback', 'taxiOut', 'hold', 'takeoff'].includes(f.phase)) continue;
      seen.add(f.id);
      let a = planes.get(f.id);
      if (!a) { const al = D.airlines[f.al]; const g = X.plane(f.size, al.color, al.accent, f.al); g.scale.setScalar(D.aircraft[f.size].scale); scene.add(g); a = { g }; planes.set(f.id, a); }
      const A = D.aircraft[f.size];
      a.g.position.set(f.x, a.g.userData.gearY * A.scale + f.y, f.z);
      a.g.rotation.set(f.phase === 'approach' ? -0.05 : f.phase === 'takeoff' && f.y > 0.3 ? -0.15 : 0, f.hd, 0, 'YXZ');
      (a.g.userData.props || []).forEach((p) => (p.rotation.z += dt * (f.phase === 'stand' ? 0 : 40)));
    }
    for (const [id, a] of planes) if (!seen.has(id)) { scene.remove(a.g); planes.delete(id); }
  }
  function syncBridges(dt) {
    for (const [stand, b] of Object.entries(W.bridges)) {
      const f = S.flights.find((x) => x.stand === stand && x.phase === 'stand' && x.bridgeOn);
      let tg;
      if (f) {
        const A = D.aircraft[f.size], sc = A.scale, S2 = f.size === 'S';
        const door = V(f.x + (S2 ? 1.55 : 2.1) * sc + 1.0, (S2 ? 2.7 : 3.85) * sc + (S2 ? 0.3 : 0.5), f.z + (S2 ? 4.4 : 6.2) * sc);
        const dx = door.x - b.rx, dy = door.y - b.H, dz = door.z - b.rz, hz = Math.hypot(dx, dz);
        tg = { yaw: Math.atan2(dx, dz), len: Math.max(2, Math.hypot(hz, dy) - 0.6), pitch: Math.atan2(dy, hz) };
      } else tg = { yaw: Math.PI, len: 4.5, pitch: 0 };
      const c = b.cur, k = Math.min(1, dt * 1.8); c.yaw += wrap(tg.yaw - c.yaw) * k; c.len += (tg.len - c.len) * k; c.pitch += (tg.pitch - c.pitch) * k;
      b.piv.rotation.set(-c.pitch, c.yaw, 0, 'YXZ');
      b.tube.scale.z = c.len; b.tube.position.z = c.len / 2; b.stripe.scale.z = c.len; b.stripe.position.z = c.len / 2;
      const legH = b.H + Math.sin(-c.pitch) * c.len * 0.72; b.leg.position.set(0, -legH / 2, c.len * 0.72); b.leg.scale.set(1, legH, 1); b.leg.rotation.x = c.pitch;
    }
  }
  function syncHelpers(dt, now) {
    Object.values(helperFig).forEach((p) => (p.visible = false));
    S.flights.forEach((f) => { if (f.phase === 'final' && f.mBy === 'helper') { const p = helperFig.marshal, sp = spotOf(f, 'marshal'); p.visible = true; p.position.set(sp.x, 0, sp.z); p.rotation.y = Math.PI; const u = p.userData; X.animate(p, 0, dt); u.arms[0].rotation.z = 2.6 + Math.sin(now / 300) * 0.4; u.arms[1].rotation.z = -2.6 - Math.sin(now / 300) * 0.4; } });
    for (const [role, job] of Object.entries(helperJob)) {
      if (role === 'marshal' || role === 'push') continue;
      const p = helperFig[role], f = job.f, k = job.step;
      p.visible = true; const sp = k === 'bagrun' ? null : spotOf(f, k);
      if (k === 'bagrun') { // Berra kör sitt eget tåg fram och tillbaka
        const b = Sim.workSpot(f.stand, f.size, 'belt'), u = clamp(job.t / HELPER_DUR.bagrun, 0, 1), w = u < 0.5 ? u * 2 : 2 - u * 2;
        const x = b.x + 4 + (L.hall.x - b.x - 4) * w, z = (b.z - 5) + ((L.hall.z - 1.5) - (b.z - 5)) * w;
        helperTrainG.visible = true; helperTrainG.position.set(x, 0, z); helperTrainG.rotation.y = Math.atan2(L.hall.x - b.x, L.hall.z - b.z) + (u < 0.5 ? 0 : Math.PI); p.visible = false;
      } else { p.position.set(sp.x + 0.6, 0, sp.z); p.rotation.y = Math.PI; X.animate(p, 0, dt); p.userData.arms[0].rotation.x = -1.2 + Math.sin(now / 250) * 0.5; p.userData.arms[1].rotation.x = -1.2 + Math.cos(now / 250) * 0.5; }
    }
    if (!helperJob.bags || helperJob.bags.step !== 'bagrun') helperTrainG.visible = false;
  }
  function syncExt(dt) {
    for (let i = extVeh.length - 1; i >= 0; i--) {
      const e = extVeh[i];
      if (e.state === 'in' || e.state === 'out') {
        const mv = { pts: e.pts, i: e.i, u: e.u }, done = Sim.stepAlong(e, mv, 12 * dt, false); e.i = mv.i; e.u = mv.u;
        e.g.position.set(e.x, 0, e.z); e.g.rotation.y = e.hd || 0;
        if (done) { if (e.state === 'in') { e.state = 'work'; e.wt = 0; e.g.rotation.y = e.spotH || 0; } else { scene.remove(e.g); extVeh.splice(i, 1); } }
      } else if (e.state === 'work') {
        e.wt += dt * D.GMIN_PER_SEC;
        if (e.wt >= e.stay) { if (e.type === 'fuel' && e.f) e.f.fuelDone = true; e.state = 'out'; e.pts = e.back(); e.i = 0; e.u = 0; }
      }
    }
  }

  // ---------- trådar i UI ----------
  function toast(msg, kind) { const el = document.createElement('div'); el.className = 'toast panel ' + (kind || ''); el.textContent = msg; $('toasts').appendChild(el); while ($('toasts').children.length > 3) $('toasts').firstChild.remove(); setTimeout(() => el.remove(), kind === 'bad' ? 4500 : 3500); }
  function toastWorld(msg, kind) { toast(msg, kind === 'bad' ? 'bad' : 'good'); }
  function feedbackWorld(msg, kind) { toast(msg, kind === 'meh' ? 'event' : kind); }
  function honkFx(pos) { const el = document.createElement('div'); el.className = 'honk'; el.textContent = 'TUUUT!'; document.body.appendChild(el); const p = pos.clone().project(camera); el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - p.y) / 2 * innerHeight) + 'px'; setTimeout(() => el.remove(), 1300); }
  function celebrate(f, n, pay, st) {
    Sfx.stars(n);
    const el = $('celebrate');
    el.innerHTML = `<div class="stars">${[0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}" style="animation-delay:${i * 0.18}s">★</span>`).join('')}</div>
      <b>${esc(f.code)} till ${esc(f.to)}</b><span>${st.time ? 'I tid' : 'Sen'} · ${st.bags ? 'alla väskor med' : 'väskor kvar på marken'} · ${st.safety ? 'säkert' : 'osäkert'}</span>
      <span class="pay">+${pay.toLocaleString('sv-SE')} kr${S.streak > 1 ? ` · svit ×${S.streak}!` : ''}</span>`;
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(celebrate.t); celebrate.t = setTimeout(() => (el.hidden = true), 3800);
  }
  function modal(html) { const m = $('modal'); m.innerHTML = `<div class="dialog panel">${html}</div>`; m.hidden = false; G.modal = true; }
  function closeModal() { $('modal').hidden = true; G.modal = false; }
  function hireMenu() {
    const rows = Object.entries(D.helpers).map(([k, h]) => {
      const locked = P.level < h.lvl, has = P.hires[k];
      return `<div class="hire ${has ? 'has' : ''}"><div><b>${esc(h.name)}</b><span>${esc(h.role)}</span><small>Lön ${h.wage.toLocaleString('sv-SE')} kr per plan</small></div>
        ${has ? '<span class="pill ok">Anställd</span>' : locked ? `<span class="pill muted">Kräver ${esc(D.levels[h.lvl].title.toLowerCase())}</span>` : `<button type="button" class="btn y" data-hire="${k}" ${P.money < h.cost ? 'disabled' : ''}>Anställ · ${h.cost.toLocaleString('sv-SE')} kr</button>`}</div>`;
    }).join('');
    modal(`<h2>Kollegor</h2><p>Varje kollega tar över jobb du gör själv i dag. Du kan fortfarande hoppa in och göra det snabbare själv.</p>${rows}<div class="btns"><button type="button" class="btn y" data-act="close">Stäng</button></div>`);
  }
  function shiftEnd() {
    S.ended = true; Sfx.level();
    modal(`<h2>Skiftet är slut!</h2><p>Bra jobbat. Så här gick det:</p>
      <div class="kv"><span>Plan du fick iväg</span><b>${S.done}</b><span>Stjärnor</span><b>${'★'.repeat(Math.min(30, S.starsShift))} (${S.starsShift})</b><span>I tid</span><b>${S.ontime}</b><span>Intjänat</span><b>${kr(S.earned)}</b><span>Mål klarade</span><b>${Object.keys(S.goalsDone).length} av ${S.goals.length}</b></div>
      <div class="btns"><button type="button" class="btn y" data-act="newshift">Nästa skift</button></div>`);
  }

  // ---------- HUD ----------
  const STEPICON = { marshal: '↓', chocks: '▲', bridge: '⇄', unload: '▼', bagrun: '⟳', load: '▲', service: '☕', bridgeOff: '⇆', chocksOff: '△', push: '◀' };
  let hudT = 0;
  function hud() {
    const lv = D.levels[P.level], nx = D.levels[P.level + 1], p = nx ? clamp((P.xp - lv.xp) / (nx.xp - lv.xp), 0, 1) : 1;
    $('me').innerHTML = `<div class="clock num"><span>${fmt(S.t).slice(0, 2)}</span>:<span>${fmt(S.t).slice(3)}</span></div>
      <div class="who"><b>${esc(lv.title)}</b><span class="xp"><i style="width:${Math.round(p * 100)}%"></i></span><small>${nx ? `${P.xp - lv.xp} / ${nx.xp - lv.xp} XP till ${esc(nx.title.toLowerCase())}` : 'Högsta nivån i prototypen'}</small></div>
      <div class="money num">${kr(P.money)}</div>`;
    const act = S.flights.filter((f) => activeLvl(f) && ['taxiIn', 'waitMarshal', 'final', 'stand', 'pushback', 'approach', 'rollout'].includes(f.phase)).sort((a, b) => a.std - b.std).slice(0, 2);
    const nextF = S.flights.filter((f) => activeLvl(f) && f.phase === 'sched').sort((a, b) => a.sta - b.sta)[0];
    $('cards').innerHTML = act.map((f) => {
      const left = Math.round(f.std - S.t), al = D.airlines[f.al];
      const stp = f.steps ? STEPS.map(([k, n]) => { const s = f.steps[k]; const cls = s.st === 'done' ? 'done' : s.st === 'active' ? 'act' : deps(f, k) ? 'ready' : ''; return `<span class="step ${cls} ${s.by === 'helper' ? 'help' : ''}" title="${n}">${STEPICON[k]}</span>`; }).join('') : `<span class="sub">${f.phase === 'waitMarshal' ? 'Väntar på marshaller!' : 'På väg in'}</span>`;
      return `<div class="fcard panel ${left < 5 ? 'hot' : ''}"><div class="top"><i class="sw" style="background:${hex(al.color)}"></i><b>${esc(f.code)}</b><span>${f.stand} → ${esc(f.to)}</span><span class="cd num ${left < 0 ? 'late' : ''}">${left >= 0 ? `Avgång om ${left} min` : `${-left} min sen`}</span></div><div class="steps">${stp}</div></div>`;
    }).join('') + (nextF && act.length < 2 ? `<div class="fcard panel next"><div class="top"><i class="sw" style="background:${hex(D.airlines[nextF.al].color)}"></i><b>${esc(nextF.code)}</b><span>landar ${fmt(nextF.sta)} vid ${nextF.stand}</span></div></div>` : '');
    $('goals').innerHTML = `<h3>Dagens mål</h3>` + S.goals.map((g) => `<div class="goal ${S.goalsDone[g.id] ? 'done' : ''}"><span>${S.goalsDone[g.id] ? '✓' : `${Math.min(g.get(), g.need)}/${g.need}`}</span>${esc(g.text)}</div>`).join('') + (S.streak > 1 ? `<div class="streak">Svit ×${S.streak} ★★★</div>` : '');
    const r = S.radio[S.radio.length - 1];
    if (r) { $('radio').hidden = false; $('radio').innerHTML = `<em>${esc(r.who)}:</em> ${esc(r.msg)}`; $('radio').classList.toggle('fade', performance.now() - r.at > 9000); }
    $('mute').textContent = Sfx.muted ? 'Ljud av' : 'Ljud på';
    $('paused').hidden = !G.paused;
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const run = G.started && !G.modal && !G.paused && !S.ended;
    if (run) {
      S.t += dt * D.GMIN_PER_SEC;
      // senare flyg låses upp när man befordras
      S.flights.forEach((f) => flightTick(f, dt));
      S.flights.forEach((f) => { if (f.phase === 'stand' && f.steps) { serviceTick(f); STEPS.forEach(([k]) => { const s = f.steps[k]; if (s.st === 'locked' && deps(f, k)) s.st = 'ready'; }); } });
      helperTick(dt); helperPushTick(dt);
      if (S.t >= S.end && !S.flights.some((f) => activeLvl(f) && !['gone', 'sched', 'skip', 'hold', 'takeoff'].includes(f.phase))) shiftEnd();
    }
    if (rhythm && run) rhythmTick(dt);
    // spelaren
    if (keys.has('q')) yawT += dt * 1.8; if (keys.has('e')) yawT -= dt * 1.8;
    if (keys.has('z')) pitch = clamp(pitch + dt, 0.15, 1.35); if (keys.has('x')) pitch = clamp(pitch - dt, 0.15, 1.35);
    yaw += (yawT - yaw) * Math.min(1, dt * 8);
    const fwd = V(Math.sin(yaw), 0, Math.cos(yaw)), right = V(-Math.cos(yaw), 0, Math.sin(yaw));
    const kW = keys.has('w') || keys.has('arrowup'), kS = keys.has('s') || keys.has('arrowdown'), kA = keys.has('a') || keys.has('arrowleft'), kD = keys.has('d') || keys.has('arrowright');
    const dyn = colliders();
    if (run) {
      if (G.mode === 'walk') {
        let mv = V(0, 0, 0); if (kW) mv.add(fwd); if (kS) mv.sub(fwd); if (kA) mv.sub(right); if (kD) mv.add(right);
        if (mv.lengthSq()) { target = null; mv.normalize(); } else if (target) { mv = target.clone().sub(manager.position); mv.y = 0; if (mv.length() < 0.4) { target = null; mv.set(0, 0, 0); } else mv.normalize(); }
        const sp = mv.lengthSq() ? (keys.has('shift') ? 10 : 5.5) : 0;
        if (sp) { manager.position.addScaledVector(mv, sp * dt); let d = Math.atan2(mv.x, mv.z) - manager.rotation.y; manager.rotation.y += wrap(d) * Math.min(1, dt * 12); }
        collide(manager.position, dyn, 0.45); X.animate(manager, sp, dt);
        // håll-uppgifter
        if (G.task && fDown && nearSpot(G.task.sp)) {
          G.hold += dt; const need = HOLD[G.task.k];
          if (G.hold >= need) { const a = G.task; G.task = null; G.hold = 0; completeStep(a.f, a.k, 'you'); }
        } else if (G.task && !fDown) { G.task = null; G.hold = 0; }
      } else if (G.mode === 'train') trainTick(dt, kW, kS, kA, kD, dyn);
      else if (G.mode === 'tug') {
        if (push) pushTick(dt, kW, kS, kA, kD);
        else { const thr = (kW ? 1 : 0) - (kS ? 1 : 0), steer = (kA ? 1 : 0) - (kD ? 1 : 0); tug.v += (thr * 7 - tug.v) * Math.min(1, dt * 2); tug.h += steer * dt * 1.6 * clamp(Math.abs(tug.v) / 3, 0, 1) * Math.sign(tug.v || 1); const p = V(tug.x + Math.sin(tug.h) * tug.v * dt, 0, tug.z + Math.cos(tug.h) * tug.v * dt); collide(p, dyn, 1.4); tug.x = p.x; tug.z = p.z; }
      }
    }
    // tågets vagnar följer spåret
    if (Math.hypot(train.crumbs[0][0] - train.x, train.crumbs[0][1] - train.z) > 0.25) { train.crumbs.unshift([train.x, train.z]); if (train.crumbs.length > 400) train.crumbs.pop(); }
    trainG.position.set(train.x, 0, train.z); trainG.rotation.y = train.h;
    let acc = 0, ci = 0;
    carts.forEach((c, i) => {
      const want = 2.4 * (i + 1);
      while (ci < train.crumbs.length - 1 && acc < want) { const a = train.crumbs[ci], b = train.crumbs[ci + 1]; acc += Math.hypot(a[0] - b[0], a[1] - b[1]); ci++; }
      const p = train.crumbs[Math.min(ci, train.crumbs.length - 1)] || [train.x, train.z - want], q = train.crumbs[Math.max(0, ci - 3)] || [train.x, train.z];
      c.position.set(p[0], 0, p[1]); c.rotation.y = Math.atan2(q[0] - p[0], q[1] - p[1]);
      c.children.slice(1).forEach((bag) => (bag.visible = train.load !== 'empty'));
    });
    tugG.position.set(tug.x, 0, tug.z); tugG.rotation.y = tug.h;
    syncPlanes(dt); syncBridges(dt); syncHelpers(dt, now); syncExt(dt);
    Object.entries(gateObj).forEach(([id, g]) => { g.closed.visible = id === 'A2' && P.level < 1; const busy = S.flights.some((f) => f.stand === id && f.phase === 'stand'); if (!busy) g.belt.visible = false; });

    // pil och uppmaning
    const av = available(), first = av.find((a) => a.sp) || null;
    arrow.visible = !!first && G.mode === 'walk' && !rhythm;
    if (first && arrow.visible) arrow.position.set(first.sp.x, 4.2 + Math.sin(now / 200) * 0.5, first.sp.z);
    if (G.mode === 'train' && train.job && train.load !== 'departures') { arrow.visible = true; arrow.position.set(L.hall.x, 5 + Math.sin(now / 200) * 0.5, L.hall.z - 1.5); }
    if (G.mode === 'train' && train.job && train.load === 'departures' && train.job.steps.bagrun.st === 'active') { const b = Sim.workSpot(train.job.stand, train.job.size, 'belt'); arrow.visible = true; arrow.position.set(b.x + 4, 5 + Math.sin(now / 200) * 0.5, b.z - 5); }
    let ptxt = null;
    if (G.mode === 'walk') {
      const fin = S.flights.find((f) => f.phase === 'final' && f.mBy === 'you');
      const here = av.find((a) => a.sp && nearSpot(a.sp));
      if (fin && nearSpot(spotOf(fin, 'marshal'))) { const nose = fin.z + D.aircraft[fin.size].nose, d = L.stopZ - nose; ptxt = d > 3.5 ? 'Vinka in… vänta…' : d > 1.2 ? 'Snart… tryck F vid linjen!' : 'STOPP! Tryck F!'; }
      else if (here) ptxt = here.k === 'marshal' ? 'Stå kvar här. Planet kommer!' : (HOLD[here.k] ? `Håll F: ${VERB[here.k]}` : `F: ${VERB[here.k]}`) + (G.task && G.task === here ? ` ${Math.round(G.hold / HOLD[here.k] * 100)} %` : '');
      else if (Math.hypot(manager.position.x - train.x, manager.position.z - train.z) < 3.2) ptxt = 'F: Kliv in i bagagetåget';
      else if (Math.hypot(manager.position.x - tug.x, manager.position.z - tug.z) < 3.4) ptxt = 'F: Kliv in i pushbacktraktorn';
      else if (first) ptxt = `Nästa: ${VERB[first.k].replace(' (håll)', '')}${first.f ? ' · ' + first.f.code : ''}`;
    } else if (G.mode === 'train') ptxt = train.swap > 0 ? 'Lastar om väskor…' : train.load === 'departures' && train.job && train.job.steps.bagrun.st === 'active' ? 'Kör tillbaka till planet (pilen)' : train.job && train.load !== 'departures' ? 'Kör till bagagehallen (pilen) och stanna i ringen' : 'F: Kliv ur';
    else if (G.mode === 'tug') ptxt = push ? (push.ready ? 'I ringen! Tryck F för att koppla loss' : 'W skjut · A/D styr · nosen mot väster i ringen') : 'F: Kliv ur traktorn · W/S kör';
    const pe = $('prompt'); pe.hidden = !ptxt || !!rhythm; if (ptxt) pe.textContent = ptxt;

    // ljud: motorbrus från närmaste plan i rörelse
    let humL = 0; S.flights.forEach((f) => { if (['taxiIn', 'final', 'taxiOut', 'rollout', 'takeoff', 'pushback', 'waitMarshal'].includes(f.phase)) humL = Math.max(humL, 0.55 * clamp(1 - Math.hypot(f.x - me().x, f.z - me().z) / 90, 0, 1)); }); Sfx.hum(run ? humL : 0);

    // kamera
    const m = me(), cd = G.mode === 'walk' || G.mode === 'rhythm' ? dist : dist * 1.4;
    const cp = V(m.x - fwd.x * Math.cos(pitch) * cd, Math.sin(pitch) * cd + 1.2, m.z - fwd.z * Math.cos(pitch) * cd);
    camera.position.lerp(cp, Math.min(1, dt * 7)); camera.lookAt(m.x, 1.5, m.z);
    sun.target.position.set(m.x, 0, m.z); sun.position.set(m.x - 60, 90, m.z - 45);
    W.clouds.forEach((c, i) => { c.position.x += dt * (1 + (i % 3) * 0.4); if (c.position.x > 500) c.position.x = -500; });
    W.beacon.visible = Math.sin(now / 250) > 0;
    hudT += dt; if (hudT > 0.2) { hudT = 0; hud(); }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // ---------- knappar ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    Sfx.init();
    if (d.act === 'close') { closeModal(); if (!G.started) { G.started = true; } }
    else if (d.act === 'begin') { closeModal(); G.started = true; Sfx.ding(); }
    else if (d.act === 'newshift') { closeModal(); P.day++; saveP(); [...planes.values()].forEach((a) => scene.remove(a.g)); planes.clear(); S.drops.forEach((x) => scene.remove(x.g)); newShift(); }
    else if (d.hire) { const h = D.helpers[d.hire]; if (P.money >= h.cost && P.level >= h.lvl) { P.money -= h.cost; P.hires[d.hire] = true; saveP(); Sfx.ding(); toast(`${h.name} börjar jobba!`, 'good'); hireMenu(); } }
    else if (b.id === 'hireBtn') hireMenu();
    else if (b.id === 'mute') Sfx.toggle();
    else if (b.id === 'pauseBtn') G.paused = !G.paused;
    else if (d.act === 'reset') { P.money = 0; P.xp = 0; P.level = 0; P.hires = {}; P.day = 1; saveP(); location.reload(); }
  });
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  // testkrok (används av headless-testet)
  SH.Career = { get S() { return S; }, P, G, available, manager, train, tug, spotOf, get rhythm() { return rhythm; }, get push() { return push; }, deps };
  newShift();
  modal(`<h2>Första dagen på jobbet</h2>
    <p>Du är ny <b>ramparbetare</b> på Norrvik flygplats. Just nu finns bara du och gate A1. Allt som händer runt planet gör du själv.</p>
    <ul>
      <li><b>Led in planet:</b> stå på den gula pilen framför gaten och tryck <span class="key">F</span> när nosen är vid stopplinjen.</li>
      <li><b>Klossar och brygga:</b> gå dit och <b>håll</b> <span class="key">F</span>.</li>
      <li><b>Väskor:</b> tryck <span class="key">F</span> i takt när väskan är i den gröna rutan. Missar du hamnar den på marken. Plocka upp den!</li>
      <li><b>Bagagerundan:</b> kör tåget till bagagehallen och tillbaka.</li>
      <li><b>Pushback:</b> skjut ut planet med traktorn till den gröna ringen. Styr försiktigt, annars knäcks det!</li>
    </ul>
    <p>Varje plan ger stjärnor och pengar. Anställ kollegor som tar över jobben, och bli befordrad.</p>
    <p class="small">Styrning: WASD gå/kör · Shift spring · dra för att vrida kameran · scrolla för att zooma · P paus.</p>
    <div class="btns"><button type="button" class="btn y" data-act="begin">Börja skiftet</button>${P.flights ? '<button type="button" class="btn" data-act="reset">Börja om från noll</button>' : ''}</div>`);
  requestAnimationFrame(frame);
})();
