// SkyHub Rusning – prototyp: realtidsstrategi på plattan.
// Du markerar enheter och ger order. Enheterna jobbar vidare vid "sitt" plan tills inget återstår.
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
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const standById = (id) => L.stands.find((s) => s.id === id);

  // ---------- felruta: visar fel i stället för att spelet bara stannar ----------
  const errs = [];
  function showError(msg, stack) {
    const line = String(msg) + (stack ? '\n' + String(stack).split('\n').slice(0, 4).join('\n') : '');
    if (errs.includes(line)) return; errs.push(line);
    let el = document.getElementById('errbox');
    if (!el) { el = document.createElement('div'); el.id = 'errbox'; el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99;max-width:min(560px,calc(100% - 24px));background:#ffe3dc;border:3px solid #1d2433;border-radius:14px;padding:10px 12px;font:700 13px Nunito,system-ui,sans-serif;color:#1d2433;box-shadow:0 4px 0 #1d2433;user-select:text;-webkit-user-select:text'; document.body.appendChild(el); }
    el.innerHTML = '<b>Något gick fel. Spelet försöker fortsätta.</b><pre style="white-space:pre-wrap;font:11px ui-monospace,Menlo,monospace;margin:6px 0;max-height:160px;overflow:auto"></pre><button type="button" style="font:700 13px Fredoka,sans-serif;padding:5px 10px;border:2px solid #1d2433;border-radius:9px;background:#f2b134;cursor:pointer">Kopiera felet</button> <span></span>';
    el.querySelector('pre').textContent = errs.join('\n\n') + '\n\n' + navigator.userAgent;
    el.querySelector('button').onclick = () => { const t = el.querySelector('pre').textContent; try { navigator.clipboard.writeText(t).then(() => (el.querySelector('span').textContent = 'Kopierat!')); } catch (e) { el.querySelector('span').textContent = 'Markera texten och kopiera'; } };
  }
  addEventListener('error', (e) => showError(e.message, e.error && e.error.stack));
  addEventListener('unhandledrejection', (e) => showError('Promise: ' + (e.reason && e.reason.message || e.reason), e.reason && e.reason.stack));

  // ---------- renderer ----------
  const canvas = $('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  const scene = new T.Scene();
  const skyDay = X.tex((x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4fa9e6'); g.addColorStop(0.65, '#a7dcf6'); g.addColorStop(1, '#cdeefb'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, 2, 256);
  const skyStorm = X.tex((x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2c3546'); g.addColorStop(1, '#6d7a8c'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, 2, 256);
  scene.background = skyDay;
  scene.fog = new T.Fog(0xcdeefb, 260, 700);
  const camera = new T.PerspectiveCamera(40, 1, 0.5, 2500);
  const hemi = new T.HemisphereLight(0xe3f4ff, 0x9bc88a, 0.62); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff0d0, 1.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 1, far: 500 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04; scene.add(sun); scene.add(sun.target);
  const W = SH.World.build(scene, 'Norrvik');

  // byggnader och markörer
  const flat = (r1, r2, col, x, z) => { const m = new T.Mesh(new T.RingGeometry(r1, r2, 36), new T.MeshBasicMaterial({ color: col, side: T.DoubleSide, transparent: true, opacity: 0.9 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.07, z); scene.add(m); return m; };
  const label = (txt, x, y, z, bg) => { const d = X.decal(X.textTex(txt, 512, 96, bg || '#2e3a52', '#ffffff', '700 54px Fredoka, sans-serif'), 7.5, 1.4, scene); d.position.set(x, y, z); d.rotation.y = Math.PI; return d; };
  // verkstad
  { const g = new T.Group(); g.position.set(L.workshop.x, 0, L.workshop.z); scene.add(g); X.rbox(10, 5, 7, 0xc3cad4, g, 0.5).position.y = 2.5; X.rbox(6, 3.6, 0.3, 0x3c4a63, g, 0.15).position.set(0, 1.8, -3.6); label('VERKSTAD', L.workshop.x, 5.8, L.workshop.z - 3.7, '#3c4a63'); W.colliders.boxes.push({ x: L.workshop.x, z: L.workshop.z, hw: 5, hd: 3.5, rot: 0 }); }
  // bränsledepå
  function fuelDepot(p, name) {
    const g = new T.Group(); g.position.set(p.x, 0, p.z); scene.add(g);
    for (const dx of [-2.6, 2.6]) { X.cyl(2.2, 2.2, 5, 0xf4efe6, g, 18).position.set(dx, 2.5, 1); X.cyl(2.25, 2.25, 0.8, 0xe8634a, g, 18, false).position.set(dx, 3.6, 1); }
    label(name, p.x, 6.4, p.z - 1.6, '#e8634a');
    return g;
  }
  fuelDepot(L.fuel1, 'BRÄNSLE');
  const restMark = flat(2.4, 3, 0x6fd39b, L.rest.x, L.rest.z); label('RAST', L.rest.x, 3.2, L.rest.z + 1.2, '#2bb3a6');
  const hallMark = flat(3.4, 4.2, 0xf2b134, L.hall.x, L.hall.z - 1.2);

  // byggplatser
  const siteObj = {};
  D.sites.forEach((st) => {
    const g = new T.Group(); scene.add(g);
    const ring = flat(3.2, 4, 0xffffff, st.x, st.z); g.add(ring);
    const plus = X.decal(X.textTex('+', 128, 128, null, '#ffffff', '700 120px Fredoka, sans-serif'), 3, 3, g, true); plus.rotation.x = -Math.PI / 2; plus.position.set(st.x, 0.1, st.z);
    siteObj[st.id] = { g, built: null };
  });
  const r1Cones = new T.Group(); scene.add(r1Cones);
  for (let i = -2; i <= 2; i++) X.cone(0.35, 0.9, 0xff7a2f, r1Cones, 12).position.set(30 + i * 5, 0.45, -14);

  // ---------- state ----------
  let S = null;
  const units = [];
  const planes = new Map();
  function makeUnit(kind, x, z, name) {
    const g = kind === 'worker' ? X.person(Object.assign(X.crewLook(units.length + 1), { scale: 0.95 })) : X.vehicle(kind === 'fuel' ? 'fuel' : kind);
    scene.add(g);
    const ring = new T.Mesh(new T.RingGeometry(kind === 'worker' ? 1.1 : 2.6, kind === 'worker' ? 1.5 : 3.1, 28), new T.MeshBasicMaterial({ color: 0x6fd39b, side: T.DoubleSide, transparent: true, opacity: 0.95 }));
    ring.rotation.x = -Math.PI / 2; scene.add(ring);
    const u = { id: units.length + 1, kind, name: name || ({ fuel: 'Tankbil', train: 'Bagagetåg', tug: 'Pushback' })[kind], x, z, h: Math.PI, g, ring, sel: false, assign: null, job: null, path: null, state: 'idle', stamina: 100, fuel: kind === 'fuel' ? D.truckCap : 0, load: null, carry: null, idleT: 0 };
    if (kind === 'train') { g.userData.carts.forEach((c) => (c.visible = true)); }
    units.push(u); return u;
  }
  const city = (al, i) => { const l = D.cities[al] || D.cities.XX; return l[i % l.length]; };
  function newGame(dayId) {
    const day = D.days.find((d) => d.id === dayId) || D.days[0];
    units.forEach((u) => { scene.remove(u.g); scene.remove(u.ring); }); units.length = 0;
    for (const [, a] of planes) scene.remove(a.g); planes.clear();
    S = { day, t: hm(day.start), end: hm(day.end), money: day.money, fuel: day.fuel, orders: [], built: {}, flights: [], events: day.events.map((e) => Object.assign({}, e, { fired: false })), storm: null,
      requests: day.requests.map((q) => Object.assign({}, q, { fired: false })), req: null, coach: day.tutorial ? 0 : -1, coachDoneAt: null,
      stars: 0, maxStars: 0, done: 0, ontime: 0, diverted: 0, earned: 0, ended: false, broken: {}, radio: [], banner: null, started: false, nid: 100 };
    day.flights.forEach(([al, size, arr, vip], i) => addFlight({ al, size, from: city(al, i), to: city(al, i + 2), vip: !!vip }, hm(arr), false));
    D.names.slice(0, day.workers).forEach((n, i) => makeUnit('worker', -40 + i * 2.5, -5.5, n));
    scene.background = skyDay; renderReq(); coachRender();
    makeUnit('fuel', -80, -40); makeUnit('train', L.hall.x + 7, -12); makeUnit('tug', -2, -5.5);
    Object.values(siteObj).forEach((o) => { if (o.built) { scene.remove(o.built); o.built = null; } o.g.visible = true; });
    r1Cones.visible = true;
  }
  function addFlight(r, sta, emergency) {
    const A = D.aircraft[r.size];
    const f = { id: ++S.nid, al: emergency ? 'XX' : r.al, size: r.size, from: r.from, to: r.to, vip: !!r.vip, emergency, code: (emergency ? 'MAY' : r.al) + ' ' + (100 + (S.nid * 37) % 800),
      sta, std: sta + A.turn, phase: 'sched', stand: null, mv: null, x: 0, z: 0, y: 0, hd: 0, tasks: null, onBlock: null, offBlock: null, holdMin: 0, holdSince: null, stars: null };
    S.flights.push(f); return f;
  }
  const radio = (who, msg) => { S.radio.push({ who, msg, at: performance.now() }); Sfx.radio(); };
  function banner(txt, kind) { S.banner = { txt, kind, at: performance.now() }; (kind === 'bad' ? Sfx.bad : kind === 'info' ? Sfx.click : Sfx.ding)(); }

  // ---------- stands ----------
  const standsAvail = () => L.stands.filter((s) => s.id !== 'R1' || S.built.R1);
  const standFree = (id) => !S.flights.some((f) => f.stand === id && ['approach', 'rollout', 'taxiIn', 'stand', 'pushback'].includes(f.phase));
  const leadMin = (f, stand) => { const p = Sim.arrivalPath(stand, f.size); return (Sim.pathTime(p.app) + Sim.pathTime(p.roll) + Sim.pathTime(p.taxi)) / D.SPEED * D.GMIN_PER_SEC; };
  const runwayBusy = (f) => S.flights.some((g) => g !== f && (['approach', 'rollout'].includes(g.phase) || (g.phase === 'takeoff' && g.y < 6)));
  const storming = () => S.storm && S.t >= S.storm.from && S.t < S.storm.to;

  // ---------- uppgifter vid planet ----------
  const TASKS = [
    ['chocks', 'Klossar', 'worker'], ['bridge', 'Brygga', 'worker'], ['unload', 'Lossa', 'worker2'], ['fuel', 'Bränsle', 'fuel'], ['bagrun', 'Bagagerunda', 'train'],
    ['service', 'Städ & boarding', 'auto'], ['load', 'Lasta', 'worker2'], ['chocksOff', 'Klossar bort', 'worker'], ['push', 'Pushback', 'tug'],
  ];
  function initTasks(f) {
    const A = D.aircraft[f.size];
    f.tasks = {};
    TASKS.forEach(([k]) => (f.tasks[k] = { st: 'wait', prog: 0 }));
    f.tasks.bridge.label = standById(f.stand).contact ? 'Brygga' : 'Trappa';
    f.bagsIn = A.bags; f.bagsOut = A.bags;
  }
  const done = (f, k) => f.tasks[k].st === 'done';
  function ready(f, k) {
    switch (k) {
      case 'chocks': return true;
      case 'bridge': return done(f, 'chocks');
      case 'unload': return done(f, 'chocks');
      case 'fuel': return done(f, 'chocks');
      case 'bagrun': return done(f, 'unload');
      case 'service': return done(f, 'bridge');
      case 'load': return done(f, 'bagrun');
      case 'chocksOff': return done(f, 'load') && done(f, 'fuel') && done(f, 'service');
      case 'push': return done(f, 'chocksOff');
    }
  }
  const DUR = { chocks: 3.5, bridge: 3.5, chocksOff: 3, fuel: 9 }; // sekunder
  function spot(f, k, u) {
    const st = standById(f.stand), A = D.aircraft[f.size], cz = L.stopZ - A.nose, sc = A.scale / 1.15;
    switch (k) {
      case 'chocks': case 'chocksOff': return { x: st.x + 1.6 + (u ? (u.id % 2) * 1.2 : 0), z: L.stopZ - 2.4 };
      case 'bridge': return st.contact ? { x: st.x + 6, z: -11.8 } : { x: st.x - 4 * sc - 1.5, z: cz + 7.5 * sc };
      case 'unload': case 'load': { const b = Sim.workSpot(f.stand, f.size, 'belt'); return { x: b.x + 2.2 + (u ? (u.id % 2) * 1.6 : 0), z: b.z - 3.4 - (u ? (u.id % 2) : 0) }; }
      case 'trainAt': { const b = Sim.workSpot(f.stand, f.size, 'belt'); return { x: b.x + 4.5, z: b.z - 6, h: Math.PI }; }
      case 'fuel': return Object.assign({}, Sim.workSpot(f.stand, f.size, 'fuel'));
      case 'tug': return { x: st.x, z: L.stopZ + 3.2, h: Math.PI };
      case 'wait': return { x: st.x + 12 + (u ? (u.id % 3) * 1.2 : 0), z: -12 - (u ? (u.id % 2) * 1.5 : 0) };
    }
  }

  // ---------- rörelse ----------
  function routeTo(u, p) {
    const veh = u.kind !== 'worker';
    let pts = [{ x: u.x, z: u.z, v: 1 }];
    if (veh && Math.abs(p.x - u.x) > 18) { const lane = p.x > u.x ? L.roadZ[0] : L.roadZ[1]; pts.push({ x: u.x, z: lane }, { x: p.x, z: lane }); }
    pts.push({ x: p.x, z: p.z });
    pts = pts.filter((q, i) => i === 0 || Math.hypot(q.x - pts[i - 1].x, q.z - pts[i - 1].z) > 0.4);
    u.path = { pts: veh ? Sim.smooth(pts, 3) : pts, i: 0, u: 0 }; u.dest = p;
  }
  function moveUnit(u, dt) {
    if (!u.path) return true;
    const sp = (u.kind === 'worker' ? 6 * (u.stamina < 25 ? 0.7 : 1) : u.kind === 'tug' ? 9 : 11);
    const o = { x: u.x, z: u.z, hd: u.h }, end = Sim.stepAlong(o, u.path, sp * dt, false);
    u.x = o.x; u.z = o.z; if (o.hd != null && !isNaN(o.hd)) u.h = o.hd;
    if (end || u.path.pts.length < 2) { u.path = null; if (u.dest && u.dest.h != null) u.h = u.dest.h; return true; }
    return false;
  }
  const at = (u, p, r) => dist2(u, p) < (r || 1.2) && !u.path;
  function goTo(u, p) { if (!u.dest || dist2(u.dest, p) > 0.5 || (!u.path && dist2(u, p) > 1.2)) routeTo(u, p); }

  // ---------- enheternas logik ----------
  function unitTick(u, dt) {
    moveUnit(u, dt);
    if (u.kind === 'worker' && u.state !== 'rest') u.stamina = clamp(u.stamina - (u.state === 'work' ? 1.4 : 0.15) * dt, 0, 100);
    if (u.state === 'rest') { const room = S.built.rest && dist2(u, siteById('rest')) < 4; if (!u.path) u.stamina = clamp(u.stamina + (room ? 9 : 4.5) * dt, 0, 100); if (u.stamina >= 100) { u.state = 'idle'; } return; }
    if (u.state === 'refuel') { if (!u.path) { u.rt = (u.rt || 0) + dt; if (u.rt > 3) { const take = Math.min(D.truckCap - u.fuel, S.fuel); S.fuel -= take; u.fuel += take; u.rt = 0; u.state = u.assign ? 'busy' : 'idle'; if (!take) { banner('Bränsledepån är tom! Beställ en tankleverans.', 'bad'); u.state = 'idle'; u.assign = null; } } } return; }
    if (u.state === 'fetch') { if (!u.path) { u.carry = 'part'; u.state = u.assign ? 'busy' : 'idle'; Sfx.clunk(); } return; }
    const f = u.assign && S.flights.find((x) => x.id === u.assign);
    if (!f || !['stand', 'pushback'].includes(f.phase) && !(u.kind === 'tug' && u.job === 'pushing')) {
      if (f && f.stand && ['approach', 'rollout', 'taxiIn'].includes(f.phase)) { goTo(u, spot(f, 'wait', u)); u.state = 'busy'; return; }
      if (u.assign && !f) u.assign = null;
      if (f && !['stand', 'pushback', 'approach', 'rollout', 'taxiIn'].includes(f.phase)) u.assign = null;
      u.state = u.path ? 'move' : 'idle'; u.job = null; return;
    }
    u.state = 'busy';
    if (storming() && u.job !== 'pushing') { u.job = 'storm'; return; }
    if (u.kind === 'worker') return workerAI(u, f, dt);
    if (u.kind === 'fuel') return fuelAI(u, f, dt);
    if (u.kind === 'train') { if (u.load) { const o = S.flights.find((x) => x.id === +u.load.split(':')[1]); if (!o || o.phase !== 'stand') u.load = null; } return trainAI(u, f, dt); }
    if (u.kind === 'tug') return tugAI(u, f, dt);
  }
  function workerAI(u, f, dt) {
    // reparation går först om bandlastaren är trasig och du bär en reservdel
    if (S.broken[f.stand] && u.carry === 'part') { const b = Sim.workSpot(f.stand, f.size, 'belt'); goTo(u, { x: b.x + 1.5, z: b.z - 1 }); u.job = 'repair'; if (!u.path) { u.rep = (u.rep || 0) + dt; u.state = 'work'; if (u.rep > 4) { delete S.broken[f.stand]; u.carry = null; u.rep = 0; Sfx.good(); banner(`Bandlastaren vid ${f.stand} är lagad!`, 'good'); } } return; }
    if (S.broken[f.stand] && !units.some((w) => w !== u && w.assign === f.id && (w.carry === 'part' || w.job === 'fetchPart'))) {
      u.job = 'fetchPart'; goTo(u, { x: L.workshop.x, z: L.workshop.z - 5 });
      if (!u.path) { u.carry = 'part'; Sfx.clunk(); radio(u.name.toUpperCase(), `Har reservdelen! På väg till ${f.stand}.`); }
      return;
    }
    const order = ['chocks', 'bridge', 'unload', 'load', 'chocksOff'];
    let k = order.find((k) => !done(f, k) && ready(f, k) && (k !== 'unload' && k !== 'load' || !S.broken[f.stand]));
    if (!k) {
      const left = order.some((k) => !done(f, k));
      if (!left) { u.assign = null; u.state = 'idle'; u.job = null; return; }
      goTo(u, spot(f, 'wait', u)); u.job = 'wait'; return;
    }
    const sp = spot(f, k, u); goTo(u, sp); u.job = k;
    if (u.path) return;
    u.h = Math.PI; u.state = 'work';
    const tk = f.tasks[k];
    const eff = u.stamina < 25 ? 0.55 : 1;
    if (k === 'unload' || k === 'load') {
      const crew = units.filter((w) => w.kind === 'worker' && w.assign === f.id && w.job === k && !w.path).length;
      const tr = units.find((t) => t.kind === 'train' && t.assign === f.id && !t.path && at(t, spot(f, 'trainAt'), 1.5) && (k === 'unload' ? !t.load : t.load === 'dep:' + f.id));
      if (crew < 2 || !tr) { tk.st = 'need'; tk.need = crew < 2 ? '2 arbetare' : 'bagagetåg'; return; }
      tk.st = 'run'; tk.prog += dt * eff / (crew * 0.5) / ((k === 'unload' ? f.bagsIn : f.bagsOut) * 0.8) * 0.5 * crew;
      if (tk.prog >= 1) { tk.st = 'done'; tk.prog = 1; tr.load = k === 'unload' ? 'arr:' + f.id : null; Sfx.thunk(); }
      return;
    }
    tk.st = 'run'; tk.prog += dt * eff / DUR[k];
    if (tk.prog >= 1) { tk.st = 'done'; tk.prog = 1; Sfx.good(); }
  }
  function fuelAI(u, f, dt) {
    const tk = f.tasks.fuel;
    if (done(f, 'fuel')) { u.assign = null; if (u.fuel < 2) sendRefuel(u); return; }
    const need = D.aircraft[f.size].fuel;
    if (u.fuel < need) { if (S.fuel <= 0) { tk.st = 'need'; tk.need = 'bränsle i depån'; return; } sendRefuel(u); return; }
    if (!ready(f, 'fuel')) { goTo(u, spot(f, 'wait', u)); return; }
    goTo(u, spot(f, 'fuel')); if (u.path) return;
    u.state = 'work'; tk.st = 'run'; tk.prog += dt / DUR.fuel;
    if (tk.prog >= 1) { tk.st = 'done'; tk.prog = 1; u.fuel -= need; Sfx.good(); }
  }
  function sendRefuel(u) {
    const depots = [L.fuel1].concat(S.built.fuel2 ? [siteById('fuel2')] : []);
    const d = depots.sort((a, b) => dist2(u, a) - dist2(u, b))[0];
    routeTo(u, { x: d.x + 4, z: d.z + 2 }); u.state = 'refuel';
  }
  function trainAI(u, f, dt) {
    const tk = f.tasks.bagrun;
    if (u.load && u.load.startsWith('arr:') && u.load !== 'arr:' + f.id) { u.assign = null; return; }
    if (!done(f, 'unload') && !u.load) { goTo(u, spot(f, 'trainAt')); return; }
    if (u.load === 'arr:' + f.id) {
      tk.st = 'run'; goTo(u, { x: L.hall.x, z: L.hall.z - 1.2, h: Math.PI });
      if (!u.path) { u.sw = (u.sw || 0) + dt; tk.prog = clamp(0.5 + u.sw / 8, 0, 0.75); if (u.sw > 3.5) { u.sw = 0; u.load = 'dep:' + f.id; } } else tk.prog = clamp(tk.prog + dt * 0.04, 0, 0.5);
      return;
    }
    if (u.load === 'dep:' + f.id) {
      goTo(u, spot(f, 'trainAt'));
      if (!u.path && tk.st !== 'done') { tk.st = 'done'; tk.prog = 1; Sfx.good(); }
      if (done(f, 'load')) { u.load = null; u.assign = null; }
      return;
    }
    if (done(f, 'load')) u.assign = null;
  }
  function tugAI(u, f, dt) {
    const tk = f.tasks.push;
    if (u.job === 'pushing') {
      const end = Sim.stepAlong(f, f.pushMv, 2.8 * dt, true);
      const nose = D.aircraft[f.size].nose; u.x = f.x + Math.sin(f.hd) * (nose + 2.2); u.z = f.z + Math.cos(f.hd) * (nose + 2.2); u.h = f.hd + Math.PI;
      tk.prog = clamp(f.pushMv.i / (f.pushMv.pts.length - 1), 0, 1);
      if (end) { u.job = null; u.assign = null; u.z -= 0; tk.st = 'done'; release(f); u.x += 0; u.z += 7; u.h = 0; }
      return;
    }
    goTo(u, spot(f, 'tug'));
    if (u.path) return;
    if (!ready(f, 'push')) { tk.st = 'wait'; return; }
    u.job = 'pushing'; tk.st = 'run'; f.phase = 'pushback'; f.offBlock = S.t; f.pushMv = { pts: Sim.pushPath(f.stand, f.size), i: 0, u: 0 }; Sfx.clunk();
  }

  // ---------- planens liv ----------
  function setPath(f, pts) { f.mv = { pts, i: 0, u: 0 }; f.x = pts[0].x; f.z = pts[0].z; f.y = pts[0].y || 0; }
  const curV = (mv) => { const a = mv.pts[mv.i], b = mv.pts[Math.min(mv.i + 1, mv.pts.length - 1)]; return ((a.v || 1) + ((b.v || 1) - (a.v || 1)) * mv.u) * D.SPEED; };
  function flightTick(f, dt) {
    const t = S.t;
    if (f.phase === 'sched' || f.phase === 'holding') {
      const cand = standsAvail().slice().sort((a, b) => (f.size === 'S' ? a.contact - b.contact : b.contact - a.contact)).find((s) => standFree(s.id));
      const lead = leadMin(f, cand ? cand.id : 'A1');
      if (t < f.sta - lead) return;
      if (cand && !runwayBusy(f) && !storming()) {
        f.stand = cand.id; f.paths = Sim.arrivalPath(f.stand, f.size); f.phase = 'approach'; setPath(f, f.paths.app);
        radio('TORNET', `${D.callsign[f.al]} ${f.code.split(' ')[1]}, fri att landa. Ni får gate ${f.stand}.`);
      } else {
        if (f.phase === 'sched') { f.phase = 'holding'; f.holdSince = t; if (!cand) banner(`${f.code} väntar i luften. Ingen ledig gate!`, 'bad'); }
        f.holdMin = t - f.holdSince;
        if (f.holdMin > (f.emergency ? 11 : 18)) { f.phase = 'diverted'; S.diverted++; S.money -= 15000; banner(`${f.code} fick leda om till en annan flygplats. −15 000 kr`, 'bad'); }
      }
      return;
    }
    if (f.phase === 'stand' && f.tasks) {
      const x = f.tasks.service;
      if (!done(f, 'service') && ready(f, 'service')) { x.st = 'run'; x.prog += dt / (f.size === 'S' ? 14 : 20); if (x.prog >= 1) { x.st = 'done'; x.prog = 1; } }
      return;
    }
    if (!f.mv) {
      if (f.phase === 'hold' && !runwayBusy(f) && !storming()) { f.phase = 'takeoff'; setPath(f, Sim.takeoffPath()); Sfx.whoosh(); }
      return;
    }
    if (f.phase === 'pushback') return; // styrs av traktorn
    if ((f.phase === 'taxiIn' || f.phase === 'taxiOut') && blockedAhead(f)) return;
    const end = Sim.stepAlong(f, f.mv, curV(f.mv) * dt, false);
    if (end) {
      if (f.phase === 'approach') { f.phase = 'rollout'; setPath(f, f.paths.roll); }
      else if (f.phase === 'rollout') { f.phase = 'taxiIn'; setPath(f, f.paths.taxi); }
      else if (f.phase === 'taxiIn') { f.phase = 'stand'; f.mv = null; f.hd = 0; f.onBlock = t; initTasks(f); Sfx.clunk(); }
      else if (f.phase === 'taxiOut') { f.phase = 'hold'; f.mv = null; }
      else if (f.phase === 'takeoff') { f.phase = 'gone'; f.mv = null; }
    }
  }
  function blockedAhead(f) {
    const fx = Math.sin(f.hd), fz = Math.cos(f.hd);
    for (const g of S.flights) { if (g === f || !['taxiIn', 'taxiOut', 'pushback', 'hold'].includes(g.phase)) continue; const dx = g.x - f.x, dz = g.z - f.z, a = dx * fx + dz * fz; if (a > 0 && a < 34 && Math.abs(dx * fz - dz * fx) < 9) return true; }
    return false;
  }
  function release(f) {
    const out = Sim.taxiOutPath(f.stand); f.phase = 'taxiOut'; setPath(f, Sim.smooth([{ x: f.x, z: f.z, v: 6 }].concat(out.slice(1)), 10)); f.mv = f.mv;
    const A = D.aircraft[f.size];
    const stars = { time: f.offBlock <= f.std + 1, air: f.holdMin < 1, fast: f.offBlock - f.onBlock <= A.turn * 0.85 };
    const n = Object.values(stars).filter(Boolean).length;
    f.stars = stars; S.stars += n; S.maxStars += 3; S.done++; if (stars.time) S.ontime++;
    let pay = D.pay.base + n * D.pay.star; if (f.vip && stars.fast) pay += 6000; if (f.emergency) pay += 8000; if (f.bonus) pay += f.bonus;
    if (f.prio) { if (f.offBlock <= f.prioTarget) { pay += 6000; setTimeout(() => banner(`${f.code} kom iväg som du lovade! +6 000 kr`, 'good'), 1600); } else { pay -= 3000; setTimeout(() => banner(`Du lovade för mycket: ${f.code} var inte klar i tid. −3 000 kr`, 'bad'), 1600); } }
    S.money += pay; S.earned += pay;
    celebrate(f, n, pay, stars);
  }

  // ---------- händelser ----------
  function eventTick() {
    const el = S.t - hm(S.day.start);
    S.events.forEach((e) => {
      if (e.type === 'storm' && (!S.storm || S.storm.to < S.t) && el >= e.at - 20 && !e.warned) { e.warned = true; S.storm = { from: hm(S.day.start) + e.at, to: hm(S.day.start) + e.at + e.dur }; radio('VÄDER', `Åskfront på väg in. Väntas ${fmt(S.storm.from)}–${fmt(S.storm.to)}. Allt arbete ute stoppas då.`); }
      if (e.fired || el < e.at) return;
      e.fired = true;
      if (e.type === 'breakdown') {
        const f = S.flights.filter((x) => x.phase === 'stand' && x.tasks && !done(x, 'load')).sort((a, b) => a.std - b.std)[0];
        const stand = f ? f.stand : 'A2';
        S.broken[stand] = true; banner(`Bandlastaren vid ${stand} gick sönder! Hämta en reservdel i verkstaden.`, 'bad');
      } else if (e.type === 'storm') { banner('Åskan är här! Allt arbete ute stoppas.', 'bad'); scene.background = skyStorm; }
      else if (e.type === 'emergency') { const c = city('XX', S.nid); const f = addFlight({ al: 'XX', size: e.size, from: c, to: c }, S.t + 12, true); banner(`NÖDLANDNING om 12 min! ${f.code} behöver en ledig gate.`, 'bad'); radio('TORNET', `Mayday-flyg på väg in från ${c}. Gör plats!`); }
    });
    if (S.storm && S.t >= S.storm.to && scene.background === skyStorm) { scene.background = skyDay; banner('Åskan har dragit förbi. Fortsätt jobba!', 'good'); }
    S.orders = S.orders.filter((o) => { if (S.t >= o.at) { S.fuel += o.units; radio('BRÄNSLE', `Tankleverans klar: +${o.units} enheter.`); return false; } return true; });
    S.requests.forEach((q) => { if (!q.fired && el >= q.at) { q.fired = true; showRequest(q); } });
    if (S.req && S.t > S.req.expires) { radio('RADIO', 'Ingen svarade. Erbjudandet gick förlorat.'); S.req = null; renderReq(); }
  }
  const siteById = (id) => D.sites.find((s) => s.id === id);
  function showRequest(q) {
    let text = '', who = '';
    if (q.type === 'extra') { who = D.airlines[q.al].name; text = `Kan ni ta emot ett extra plan om ${q.inMin} min? Vi betalar ${q.pay.toLocaleString('sv-SE')} kr extra.`; }
    else if (q.type === 'fuelDeal') { who = 'Petrolia Flygbränsle'; text = 'Vi har en tankbil över. 10 enheter för 4 000 kr, levererat om 6 min. Men bara om ni bestämmer er nu.'; }
    else if (q.type === 'priority') {
      const f = S.flights.filter((x) => ['sched', 'holding', 'approach', 'rollout', 'taxiIn', 'stand'].includes(x.phase) && !x.emergency && !x.prio && x.std - S.t > 22).sort((a, b) => a.std - b.std)[0];
      if (!f) return; q.fid = f.id; who = D.airlines[f.al].name;
      text = `${f.code} har många anslutande resenärer. Kan ni få iväg den 5 min före tidtabell (${fmt(f.std - 5)})? Bonus 6 000 kr, men vi blir sura om ni lovar och inte klarar det.`;
    }
    S.req = { q, who, text, expires: S.t + 6 }; Sfx.radio(); Sfx.ding(); renderReq();
  }
  function answer(yes) {
    const q = S.req && S.req.q; if (!q) return; S.req = null; renderReq();
    if (!yes) { radio('RADIO', 'Uppfattat, vi frågar någon annan.'); return; }
    if (q.type === 'extra') { const c = city(q.al, S.nid); const f = addFlight({ al: q.al, size: q.size, from: c, to: c }, S.t + q.inMin, false); f.bonus = q.pay; banner(`Extra plan ${f.code} landar ${fmt(f.sta)}. Gör plats!`, 'good'); }
    else if (q.type === 'fuelDeal') { if (S.money < 4000) { banner('Inte tillräckligt med pengar.', 'bad'); return; } S.money -= 4000; S.orders.push({ at: S.t + 6, units: 10 }); banner('Billigt bränsle på väg!', 'good'); }
    else if (q.type === 'priority') { const f = S.flights.find((x) => x.id === q.fid); if (f) { f.prio = true; f.prioTarget = f.std - 5; banner(`Du lovade att ${f.code} går ${fmt(f.prioTarget)}. Prioritera den!`, 'good'); } }
  }
  function renderReq() {
    const el = $('req'); if (!el) return;
    if (!S || !S.req) { el.hidden = true; return; }
    el.hidden = false;
    const left = Math.max(0, Math.ceil(S.req.expires - S.t));
    el.innerHTML = `<b>${esc(S.req.who)} på radion</b><p>${esc(S.req.text)}</p><div class="rb"><button type="button" class="btn y" data-req="yes">Ja</button><button type="button" class="btn" data-req="no">Nej</button><span class="note">${left} min att bestämma</span></div>`;
  }

  // ---------- guide (dag 1) ----------
  const COACH = [
    { text: 'Ett plan landar snart. Markera <b>två arbetare</b>: dra en ruta runt dem med musen, eller klicka på en och håll Shift när du klickar på nästa.', ok: () => units.filter((u) => u.sel && u.kind === 'worker').length >= 2 },
    { text: 'Bra! Vänta tills planet står vid gaten. Ikonerna syns ovanför det. <b>Högerklicka på planet</b> så börjar arbetarna jobba där.', ok: () => units.some((u) => u.kind === 'worker' && u.assign && S.flights.some((f) => f.id === u.assign && f.phase === 'stand')) },
    { text: 'De lägger klossar och kopplar bryggan. Väskorna behöver <b>bagagetåget</b>: klicka på tåget och högerklicka på planet.', ok: () => units.some((u) => u.kind === 'train' && u.assign) },
    { text: 'Planet behöver bränsle. Klicka på <b>tankbilen</b> och högerklicka på planet.', ok: () => units.some((u) => u.kind === 'fuel' && u.assign) },
    { text: 'Ikonerna ovanför planet visar läget: <b>gul</b> = kan göras nu, <b>röd</b> = något saknas (håll musen över), <b>grön</b> = klart. Till sist behövs <b>pushbacktraktorn</b>: klicka på den och högerklicka på planet.', ok: () => units.some((u) => u.kind === 'tug' && u.assign) },
    { text: 'Nu sköter de det. När planet lyfter får du stjärnor. Gör likadant med nästa plan! Tips: mellanslag pausar, och du kan ge order i pausen.', ok: () => S.done >= 1 },
  ];
  function coachTick() {
    if (!S || S.coach < 0) return;
    if (S.coach < COACH.length && COACH[S.coach].ok()) { S.coach++; Sfx.good(); coachRender(); }
    if (S.coach >= COACH.length) { S.coach = -1; coachRender(); banner('Guiden är klar. Nu kör du själv!', 'good'); }
  }
  function coachRender() {
    const el = $('coach'); if (!el) return;
    if (!S || S.coach < 0) { el.hidden = true; return; }
    el.hidden = false; el.innerHTML = `<span class="st">Steg ${S.coach + 1} av ${COACH.length}</span><p>${COACH[S.coach].text}</p>`;
  }

  // ---------- markering och order ----------
  const sel = () => units.filter((u) => u.sel);
  function select(list, add) { if (!add) units.forEach((u) => (u.sel = false)); list.forEach((u) => (u.sel = true)); if (list.length) Sfx.click(); }
  function command(target) {
    const us = sel(); if (!us.length) return;
    const locked = (u, fid) => {
      if (u.job === 'pushing') { banner('Traktorn är mitt i en pushback. Den blir ledig när planet är ute.', 'info'); return true; }
      if (u.kind === 'train' && u.load) { const id = +u.load.split(':')[1], o = S.flights.find((x) => x.id === id); if (o && o.phase === 'stand' && id !== fid) { banner(`Bagagetåget har väskor till ${o.code}. Det kör klart först.`, 'info'); return true; } }
      return false;
    };
    if (target.flight) {
      const f = target.flight;
      us.forEach((u) => { if (locked(u, f.id)) return; u.assign = f.id; u.job = null; if (u.state === 'rest' || u.state === 'idle' || u.state === 'move') u.state = 'busy'; });
      Sfx.good(); ping(V(f.x, 0, f.z), 0x6fd39b);
    } else if (target.place) {
      const p = target.place;
      const near = (q, r) => Math.hypot(p.x - q.x, p.z - q.z) < r;
      us.forEach((u, i) => {
        if (locked(u, -1)) return;
        u.assign = null; u.job = null;
        if (u.kind === 'worker' && near(L.workshop, 8)) { routeTo(u, { x: L.workshop.x, z: L.workshop.z - 5 }); u.state = 'fetch'; return; }
        if (u.kind === 'worker' && (near(L.rest, 5) || (S.built.rest && near(siteById('rest'), 6)))) { const r = S.built.rest && near(siteById('rest'), 6) ? siteById('rest') : L.rest; routeTo(u, { x: r.x + (i % 3) * 1.2 - 1.2, z: r.z + Math.floor(i / 3) * 1.2 }); u.state = 'rest'; return; }
        if (u.kind === 'fuel' && (near(L.fuel1, 10) || (S.built.fuel2 && near(siteById('fuel2'), 10)))) { sendRefuel(u); return; }
        routeTo(u, { x: p.x + (i % 3) * 2 - 2, z: p.z + Math.floor(i / 3) * 2 }); u.state = 'move';
      });
      ping(V(p.x, 0, p.z), 0xf2b134); Sfx.click();
    }
  }
  const pings = [];
  function ping(p, col) { const m = flat(0.5, 1.2, col, p.x, p.z); pings.push({ m, life: 0.6 }); }

  // ---------- bygga och köpa ----------
  function build(id) {
    const st = siteById(id); if (S.built[id] || S.money < st.cost) return;
    S.money -= st.cost; S.built[id] = true; Sfx.level();
    const o = siteObj[id]; o.g.visible = false;
    if (id === 'R1') { r1Cones.visible = false; banner('Fjärrplats R1 är klar! Fler plan får plats.', 'good'); }
    else if (id === 'fuel2') { o.built = fuelDepot(st, 'BRÄNSLE ÖST'); banner('Bränsledepå Öst är klar!', 'good'); }
    else if (id === 'rest') { const g = new T.Group(); g.position.set(st.x, 0, st.z); scene.add(g); X.rbox(8, 4, 6, 0x6fd39b, g, 0.6).position.y = 2; X.rbox(2, 2.6, 0.3, 0x3c4a63, g, 0.1).position.set(0, 1.3, -3.1); o.built = g; label('PERSONALRUM', st.x, 4.8, st.z - 3.2, '#2bb3a6'); banner('Personalrummet är klart. Vila går dubbelt så fort!', 'good'); }
    panel();
  }
  function buy(id) {
    const it = D.shop.find((x) => x.id === id), kind = id;
    const have = units.filter((u) => u.kind === kind).length;
    if (S.money < it.cost || have >= it.max) return;
    S.money -= it.cost; Sfx.ding();
    const u = kind === 'worker' ? makeUnit('worker', -30 + have, -5.5, D.names[(have + 4) % D.names.length]) : makeUnit(kind, kind === 'fuel' ? -80 : kind === 'train' ? L.hall.x + 11 : 6, kind === 'fuel' ? -36 : -12);
    select([u]); panel();
  }
  function orderFuel() { if (S.money < D.fuelOrder.cost || S.orders.length) return; S.money -= D.fuelOrder.cost; S.orders.push({ at: S.t + D.fuelOrder.minutes, units: D.fuelOrder.units }); Sfx.click(); radio('BRÄNSLE', `Tankleveransen är beställd. Framme ${fmt(S.t + D.fuelOrder.minutes)}.`); }

  // ---------- kamera ----------
  const cam = { x: -10, z: -26, yaw: 0, pitch: 0.95, dist: 105 };
  function placeCam(dt) {
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    const p = V(cam.x - fx * Math.cos(cam.pitch) * cam.dist, Math.sin(cam.pitch) * cam.dist, cam.z - fz * Math.cos(cam.pitch) * cam.dist);
    camera.position.lerp(p, Math.min(1, dt * 10)); camera.lookAt(cam.x, 0, cam.z);
    sun.target.position.set(cam.x, 0, cam.z); sun.position.set(cam.x - 70, 110, cam.z - 55);
  }

  // ---------- inmatning ----------
  const keys = new Set();
  const ray = new T.Raycaster(), ground = new T.Plane(V(0, 1, 0), 0);
  const ndc = (e) => new T.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  function pickAt(e) {
    ray.setFromCamera(ndc(e), camera);
    const uh = ray.intersectObjects(units.map((u) => u.g), true);
    if (uh.length) { let o = uh[0].object; const u = units.find((x) => { let p = o; while (p) { if (p === x.g) return true; p = p.parent; } return false; }); if (u) return { unit: u }; }
    const ph = ray.intersectObjects([...planes.values()].map((a) => a.g), true);
    if (ph.length) { let o = ph[0].object; while (o && o.userData.fid == null) o = o.parent; if (o) { const f = S.flights.find((x) => x.id === o.userData.fid); if (f && f.phase === 'stand') return { flight: f }; } }
    const p = V(0, 0, 0); if (!ray.ray.intersectPlane(ground, p)) return null;
    // klick nära ett plan vid gate räknas som planet
    const f = S.flights.find((x) => x.phase === 'stand' && Math.hypot(x.x - p.x, x.z - p.z) < D.aircraft[x.size].len * 0.55);
    if (f) return { flight: f, place: p };
    const site = D.sites.find((s) => !S.built[s.id] && Math.hypot(s.x - p.x, s.z - p.z) < 4.5);
    if (site) return { site, place: p };
    return { place: p };
  }
  addEventListener('keydown', (e) => {
    if (G.modal) return;
    const k = e.key.toLowerCase(); keys.add(k);
    if (k === ' ') { e.preventDefault(); G.paused = !G.paused; }
    if (k === '.' || k === 'i') selectIdle();
    if (k === 'escape') select([]);
    if (k === 'b') G.panel = !G.panel, panel();
    if (/^[1-9]$/.test(k)) { const u = units[+k - 1]; if (u) { select([u]); cam.x = u.x; cam.z = u.z; } }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  const ptrs = new Map(); let drag = null, pinch = 0;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { Sfx.init(); canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, btn: e.button, touch: e.pointerType === 'touch', shift: e.shiftKey }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) cam.dist = clamp(cam.dist * pinch / d, 30, 220); pinch = d; drag = null; $('box').hidden = true; return; }
    if (!drag) return; if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) drag.moved = true;
    if (!drag.moved) return;
    const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
    if (drag.touch || drag.btn === 1) { const k = cam.dist / 600, fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -Math.cos(cam.yaw), rz = Math.sin(cam.yaw); cam.x += -rx * dx * k + fx * dy * k; cam.z += -rz * dx * k + fz * dy * k; }
    else if (drag.btn === 2) { cam.yaw -= dx * 0.008; cam.pitch = clamp(cam.pitch + dy * 0.004, 0.35, 1.45); }
    else if (drag.btn === 0) { const b = $('box'); b.hidden = false; const x0 = Math.min(drag.x, e.clientX), y0 = Math.min(drag.y, e.clientY); Object.assign(b.style, { left: x0 + 'px', top: y0 + 'px', width: Math.abs(e.clientX - drag.x) + 'px', height: Math.abs(e.clientY - drag.y) + 'px' }); }
    drag.lx = e.clientX; drag.ly = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
    const d = drag; drag = null; $('box').hidden = true;
    if (!d || G.modal) return;
    if (d.moved && d.btn === 0 && !d.touch) {
      const x0 = Math.min(d.x, e.clientX), x1 = Math.max(d.x, e.clientX), y0 = Math.min(d.y, e.clientY), y1 = Math.max(d.y, e.clientY);
      const list = units.filter((u) => { const p = V(u.x, 1, u.z).project(camera), sx = (p.x + 1) / 2 * innerWidth, sy = (1 - p.y) / 2 * innerHeight; return sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1; });
      select(list, d.shift); panel(); return;
    }
    if (d.moved) return;
    const hit = pickAt(e); if (!hit) return;
    const commandClick = d.btn === 2 || (d.touch && sel().length && !hit.unit);
    if (commandClick) { if (hit.flight) command({ flight: hit.flight }); else if (hit.place) command({ place: hit.place }); panel(); return; }
    if (hit.unit) { select([hit.unit], d.shift); }
    else if (hit.site) { G.panel = true; panel(hit.site.id); }
    else if (!d.shift) select([]);
    panel();
  });
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = 0; $('box').hidden = true; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.001), 30, 220); }, { passive: false });
  function selectIdle() { const idle = units.filter((u) => u.state === 'idle'); if (!idle.length) return; const u = idle[(G.idleIdx = ((G.idleIdx || 0) + 1) % idle.length)]; select([u]); cam.x = u.x; cam.z = u.z; panel(); }

  // ---------- HUD ----------
  const G = { paused: false, modal: false, panel: false, idleIdx: 0 };
  const KIND = { worker: 'Arbetare', fuel: 'Tankbil', train: 'Bagagetåg', tug: 'Pushback' };
  const STATE = { idle: 'Sysslolös', move: 'På väg', busy: 'Jobbar', work: 'Jobbar', rest: 'Vilar', refuel: 'Tankar i depån', fetch: 'Hämtar reservdel' };
  function hudTick() {
    const idle = units.filter((u) => u.state === 'idle').length;
    $('top').innerHTML = `<div class="res"><b>${esc(S.day.name.split(' · ')[0])}</b><small>${esc(S.day.name.split(' · ')[1] || '')}</small></div><div class="clock num"><span>${fmt(S.t).slice(0, 2)}</span>:<span>${fmt(S.t).slice(3)}</span></div>
      <div class="res"><b class="num">${kr(S.money)}</b><small>Kassa</small></div>
      <div class="res fuel ${S.fuel <= 2 ? 'low' : ''}"><b class="num">⛽ ${S.fuel}</b><small>Bränsle i depå</small></div>
      <button type="button" class="btn ${S.fuel <= 3 && !S.orders.length ? 'y' : ''}" data-act="order" ${S.orders.length || S.money < D.fuelOrder.cost ? 'disabled' : ''}>${S.orders.length ? `Leverans ${fmt(S.orders[0].at)}` : `Beställ bränsle +${D.fuelOrder.units} · 6 000 kr`}</button>
      <button type="button" class="btn ${idle ? 'r' : ''}" data-act="idle">Sysslolösa: ${idle}</button>
      <div class="res"><b class="num">${'★'.repeat(Math.min(5, Math.round(S.maxStars ? S.stars / S.maxStars * 5 : 0)))}<span style="opacity:.25">${'★'.repeat(5 - Math.min(5, Math.round(S.maxStars ? S.stars / S.maxStars * 5 : 0)))}</span></b><small>${S.stars} / ${S.maxStars} stjärnor</small></div>`;
    // prognos
    const t = S.t, inbound = S.flights.filter((f) => ['sched', 'holding', 'approach', 'rollout', 'taxiIn'].includes(f.phase)).sort((a, b) => a.sta - b.sta).slice(0, 6);
    const W0 = t, W1 = t + 45, X2 = (v) => clamp((v - W0) / (W1 - W0) * 100, 0, 100);
    const storm = S.storm && S.storm.to > t ? `<i class="storm" style="left:${X2(S.storm.from)}%;width:${Math.max(2, X2(S.storm.to) - X2(S.storm.from))}%"></i>` : '';
    $('fc').innerHTML = `<h3>Inkommande</h3>${inbound.map((f) => {
      const eta = Math.round(f.sta - t), al = D.airlines[f.al];
      const st = f.phase === 'holding' ? '<span class="pill bad">Väntar i luften</span>' : f.phase === 'sched' ? `<span class="pill">${eta > 0 ? eta + ' min' : 'nu'}</span>` : `<span class="pill ok">${f.stand}</span>`;
      return `<div class="in"><i class="sw" style="background:${hex(al.color)}"></i><b>${esc(f.code)}</b><span>${f.size === 'M' ? 'A320' : 'ATR'}${f.vip ? ' · <em>VIP</em>' : ''}${f.emergency ? ' · <em>NÖD</em>' : ''}</span>${st}</div>`;
    }).join('') || '<span class="note">Inga fler i dag.</span>'}
      <h3>Väder 45 min</h3><div class="wx">${storm}<span class="lbl" style="left:0">${fmt(W0)}</span><span class="lbl" style="right:0">${fmt(W1)}</span></div>`;
    // markerade
    const us = sel();
    $('selp').hidden = !us.length;
    if (us.length) $('selp').innerHTML = us.slice(0, 8).map((u) => {
      const f = u.assign && S.flights.find((x) => x.id === u.assign);
      return `<div class="u"><b>${esc(u.kind === 'worker' ? u.name : KIND[u.kind])}</b><small>${STATE[u.state] || u.state}${f ? ' · ' + esc(f.code) : ''}${u.carry ? ' · bär reservdel' : ''}</small>${u.kind === 'worker' ? `<span class="bar"><i style="width:${Math.round(u.stamina)}%;background:${u.stamina < 25 ? 'var(--coral)' : u.stamina < 55 ? 'var(--sun)' : 'var(--mint)'}"></i></span>` : u.kind === 'fuel' ? `<span class="bar"><i style="width:${u.fuel / D.truckCap * 100}%;background:#e8634a"></i></span>` : ''}</div>`;
    }).join('') + `<div class="hint">${us.some((u) => u.kind === 'worker') ? 'Högerklicka ett plan: jobba där · Rast-ringen: vila · Verkstaden: hämta reservdel' : us.some((u) => u.kind === 'fuel') ? 'Högerklicka ett plan: tanka det · bränsledepån: fyll på' : 'Högerklicka ett plan för att jobba där'}</div>`;
    const r = S.radio[S.radio.length - 1];
    if (r) { $('radio').hidden = false; $('radio').innerHTML = `<em>${esc(r.who)}:</em> ${esc(r.msg)}`; $('radio').classList.toggle('fade', performance.now() - r.at > 9000); }
    const b = S.banner; $('banner').hidden = !b || performance.now() - b.at > 4500; if (b) { $('banner').textContent = b.txt; $('banner').className = 'fx panel ' + b.kind; }
    $('paused').hidden = !G.paused;
  }
  function panel(focus) {
    const el = $('buildp'); el.hidden = !G.panel; if (!G.panel) return;
    el.innerHTML = `<h3>Bygg och köp <button type="button" class="btn" data-act="closep">×</button></h3>
      ${D.sites.map((s) => `<div class="it ${focus === s.id ? 'focus' : ''}"><div><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></div>${S.built[s.id] ? '<span class="pill ok">Byggd</span>' : `<button type="button" class="btn y" data-build="${s.id}" ${S.money < s.cost ? 'disabled' : ''}>${kr(s.cost)}</button>`}</div>`).join('')}
      ${D.shop.map((s) => { const have = units.filter((u) => u.kind === s.id).length; return `<div class="it"><div><b>${esc(s.name)}</b><small>Du har ${have} av max ${s.max}</small></div><button type="button" class="btn" data-buy="${s.id}" ${S.money < s.cost || have >= s.max ? 'disabled' : ''}>${kr(s.cost)}</button></div>`; }).join('')}`;
  }
  // etiketter över planen
  const tags = new Map();
  const TICON = { chocks: '▲', bridge: '⇄', unload: '▼', fuel: '⛽', bagrun: '⟳', service: '☕', load: '▲', chocksOff: '△', push: '◀' };
  function tagsTick() {
    const seen = new Set();
    for (const f of S.flights) {
      const show = ['stand', 'pushback', 'taxiIn', 'holding'].includes(f.phase) || (f.phase === 'approach');
      if (!show || f.phase === 'holding') continue;
      seen.add(f.id);
      let el = tags.get(f.id); if (!el) { el = document.createElement('div'); el.className = 'tag panel'; $('tags').appendChild(el); tags.set(f.id, el); }
      const left = Math.round(f.std - S.t), al = D.airlines[f.al];
      let chips = '';
      if (f.tasks) chips = TASKS.map(([k, n, who]) => { const x = f.tasks[k], rd = ready(f, k), cls = x.st === 'done' ? 'd' : x.st === 'run' ? 'r' : x.st === 'need' && rd ? 'n' : rd ? 'w' : ''; const lbl = k === 'bridge' ? (x.label || n) : n; return `<span class="c ${cls}" title="${esc(lbl)}${x.st === 'need' ? ': behöver ' + esc(x.need) : ''}">${TICON[k]}${x.st === 'run' ? `<i style="width:${Math.round(x.prog * 100)}%"></i>` : ''}</span>`; }).join('');
      const crew = units.filter((u) => u.assign === f.id).map((u) => ({ worker: 'A', fuel: 'T', train: 'B', tug: 'P' })[u.kind]).join('');
      const html = `<div class="h"><i class="sw" style="background:${hex(al.color)}"></i><b>${esc(f.code)}</b>${f.vip ? '<em>VIP</em>' : ''}${f.emergency ? '<em>NÖD</em>' : ''}<span class="cd ${left < 0 ? 'late' : left < 6 ? 'hot' : ''}">${f.phase === 'stand' ? (left >= 0 ? left + ' min' : -left + ' min sen') : f.phase === 'pushback' ? 'Pushback' : 'Landar'}</span></div>${chips ? `<div class="cs">${chips}</div>` : ''}${crew ? `<div class="crew">${crew}</div>` : ''}${S.broken[f.stand] && f.phase === 'stand' ? `<div class="warn">${units.some((w) => w.assign === f.id && (w.carry === 'part' || w.job === 'fetchPart')) ? 'Trasig bandlastare: en arbetare hämtar reservdel' : 'Trasig bandlastare: skicka arbetare hit'}</div>` : ''}${f.prio ? `<div class="warn" style="background:#8b5cf6">Lovad avgång ${fmt(f.prioTarget)}</div>` : ''}`;
      if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
      const p = V(f.x, (f.size === 'M' ? 12 : 9) + f.y, f.z).project(camera);
      el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - p.y) / 2 * innerHeight) + 'px'; el.hidden = p.z > 1;
    }
    for (const [id, el] of tags) if (!seen.has(id)) { el.remove(); tags.delete(id); }
  }
  function celebrate(f, n, pay, st) {
    Sfx.stars(n);
    const el = $('cel');
    el.innerHTML = `<div class="stars">${[0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}" style="animation-delay:${i * 0.15}s">★</span>`).join('')}</div><b>${esc(f.code)} → ${esc(f.to)}</b><span>${st.time ? 'I tid' : 'Sen'} · ${st.air ? 'ingen väntan i luften' : 'fick vänta i luften'} · ${st.fast ? 'snabb turnaround' : 'långsam turnaround'}</span><span class="pay">+${pay.toLocaleString('sv-SE')} kr</span>`;
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(celebrate.t); celebrate.t = setTimeout(() => (el.hidden = true), 3000);
  }
  function modal(html) { const m = $('modal'); m.innerHTML = `<div class="dialog panel">${html}</div>`; m.hidden = false; G.modal = true; }
  function closeModal() { $('modal').hidden = true; G.modal = false; }
  const PROG = 'skyhub.rush.progress';
  const loadProg = () => { try { return JSON.parse(localStorage.getItem(PROG)) || { unlocked: 1, best: {} }; } catch (e) { return { unlocked: 1, best: {} }; } };
  const saveProg = (p) => { try { localStorage.setItem(PROG, JSON.stringify(p)); } catch (e) { /* privat läge */ } };
  function endScreen() {
    S.ended = true; Sfx.level();
    const pct = S.maxStars ? Math.round(S.stars / S.maxStars * 100) : 0, id = S.day.id, prog = loadProg();
    const prevBest = prog.best[id] || 0; prog.best[id] = Math.max(prevBest, pct);
    const unlockedNow = pct >= 50 && prog.unlocked < id + 1 && D.days.some((d) => d.id === id + 1);
    if (unlockedNow) prog.unlocked = id + 1;
    saveProg(prog);
    const next = D.days.find((d) => d.id === id + 1);
    modal(`<h2>${esc(S.day.name)}: klart!</h2>
      <div class="kv"><span>Plan som kom iväg</span><b>${S.done}</b><span>I tid</span><b>${S.ontime}</b><span>Omdirigerade</span><b>${S.diverted}</b><span>Stjärnor</span><b>${S.stars} av ${S.maxStars} (${pct} %)</b><span>Intjänat</span><b>${kr(S.earned)}</b><span>Ditt rekord</span><b>${Math.max(prevBest, pct)} %${pct > prevBest ? ' (nytt!)' : ''}</b></div>
      <p>${unlockedNow ? `<b>${esc(next.name)}</b> är upplåst!` : pct < 50 && next && prog.unlocked <= id ? 'Minst 50 % av stjärnorna behövs för att låsa upp nästa dag.' : pct >= 80 ? 'Imponerande. Tornet pratar om dig.' : 'Bra jobbat! Med lite mer planering blir det ännu bättre.'}</p>
      <div class="btns">${next && prog.unlocked >= next.id ? `<button type="button" class="btn y" data-day="${next.id}">Nästa: ${esc(next.name)}</button>` : ''}<button type="button" class="btn ${next && prog.unlocked >= next.id ? '' : 'y'}" data-day="${id}">Kör igen</button><button type="button" class="btn" data-act="days">Välj dag</button></div>`);
  }
  function dayMenu() {
    const prog = loadProg();
    modal(`<h2>Rusning</h2>
      <p>Du styr plattan. Markera arbetare och fordon, högerklicka på planen, håll bränslet uppe och klara dig igenom dagens trafik och kriser. Varje dag blir svårare.</p>
      <div class="days">${D.days.map((d) => { const lock = d.id > prog.unlocked, best = prog.best[d.id]; return `<button type="button" class="day ${lock ? 'lock' : ''}" data-day="${d.id}" ${lock ? 'disabled' : ''}><b>${esc(d.name)}</b><span>${esc(d.desc)}</span><small>${lock ? 'Låst: klara föregående dag med minst 50 %' : best != null ? `Rekord ${best} %` : 'Inte spelad än'}</small></button>`; }).join('')}</div>
      <p class="small">Kamera: WASD eller pilar flyttar, Q/E vrider, högerdra lutar, scrolla zoomar. Mellanslag pausar (order går att ge i pausen). I eller punkt: nästa sysslolösa. B: bygg och köp. Pekskärm: dra för att flytta, tryck enhet och sedan mål.</p>`);
  }

  // ---------- loop ----------
  let last = performance.now(), hudT = 0;
  function frame(now) {
    try { frameBody(now); } catch (e) { showError(e.message, e.stack); }
    requestAnimationFrame(frame);
  }
  function frameBody(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const run = S.started && !G.paused && !G.modal && !S.ended;
    if (run) {
      S.t += dt * D.GMIN_PER_SEC;
      eventTick(); coachTick();
      S.flights.forEach((f) => flightTick(f, dt));
      units.forEach((u) => unitTick(u, dt));
      if (S.t >= S.end && !S.flights.some((f) => ['sched', 'holding', 'approach', 'rollout', 'taxiIn', 'stand', 'pushback'].includes(f.phase))) endScreen();
    }
    // kamera-panorering med tangenter
    const pan = cam.dist * 0.9 * dt, fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -Math.cos(cam.yaw), rz = Math.sin(cam.yaw);
    if (keys.has('w') || keys.has('arrowup')) { cam.x += fx * pan; cam.z += fz * pan; }
    if (keys.has('s') || keys.has('arrowdown')) { cam.x -= fx * pan; cam.z -= fz * pan; }
    if (keys.has('a') || keys.has('arrowleft')) { cam.x -= rx * pan; cam.z -= rz * pan; }
    if (keys.has('d') || keys.has('arrowright')) { cam.x += rx * pan; cam.z += rz * pan; }
    if (keys.has('q')) cam.yaw += dt * 1.6; if (keys.has('e')) cam.yaw -= dt * 1.6;
    cam.x = clamp(cam.x, -160, 140); cam.z = clamp(cam.z, -140, 20);
    // synka modeller
    const seen = new Set();
    for (const f of S.flights) {
      if (!['approach', 'rollout', 'taxiIn', 'stand', 'pushback', 'taxiOut', 'hold', 'takeoff'].includes(f.phase)) continue;
      seen.add(f.id);
      let a = planes.get(f.id);
      if (!a) { const al = D.airlines[f.al]; const g = X.plane(f.size, al.color, al.accent, f.emergency ? '!' : f.al); g.scale.setScalar(D.aircraft[f.size].scale); g.userData.fid = f.id; scene.add(g); a = { g }; planes.set(f.id, a); }
      const A = D.aircraft[f.size];
      a.g.position.set(f.x, a.g.userData.gearY * A.scale + f.y, f.z);
      a.g.rotation.set(f.phase === 'approach' ? -0.05 : f.phase === 'takeoff' && f.y > 0.3 ? -0.15 : 0, f.hd, 0, 'YXZ');
      (a.g.userData.props || []).forEach((p) => (p.rotation.z += dt * (f.phase === 'stand' ? 0 : 40)));
    }
    for (const [id, a] of planes) if (!seen.has(id)) { scene.remove(a.g); planes.delete(id); }
    for (const [stand, b] of Object.entries(W.bridges)) {
      const f = S.flights.find((x) => x.stand === stand && x.phase === 'stand' && x.tasks && done(x, 'bridge') && !done(x, 'chocksOff'));
      let tg = { yaw: Math.PI, len: 4.5, pitch: 0 };
      if (f) { const A = D.aircraft[f.size], sc = A.scale, S2 = f.size === 'S'; const door = V(f.x + (S2 ? 1.55 : 2.1) * sc + 1.0, (S2 ? 2.7 : 3.85) * sc + (S2 ? 0.3 : 0.5), f.z + (S2 ? 4.4 : 6.2) * sc); const dx = door.x - b.rx, dy = door.y - b.H, dz = door.z - b.rz, hz = Math.hypot(dx, dz); tg = { yaw: Math.atan2(dx, dz), len: Math.max(2, Math.hypot(hz, dy) - 0.6), pitch: Math.atan2(dy, hz) }; }
      const c = b.cur, k = Math.min(1, dt * 1.8); c.yaw += wrap(tg.yaw - c.yaw) * k; c.len += (tg.len - c.len) * k; c.pitch += (tg.pitch - c.pitch) * k;
      b.piv.rotation.set(-c.pitch, c.yaw, 0, 'YXZ'); b.tube.scale.z = c.len; b.tube.position.z = c.len / 2; b.stripe.scale.z = c.len; b.stripe.position.z = c.len / 2;
      const legH = b.H + Math.sin(-c.pitch) * c.len * 0.72; b.leg.position.set(0, -legH / 2, c.len * 0.72); b.leg.scale.set(1, legH, 1); b.leg.rotation.x = c.pitch;
    }
    units.forEach((u) => {
      u.g.position.set(u.x, 0, u.z); u.g.rotation.y = u.h;
      if (u.kind === 'worker') { const moving = !!u.path; X.animate(u.g, moving ? 5 : 0, dt); if (u.state === 'work' && !moving) { u.g.userData.arms[0].rotation.x = -1.2 + Math.sin(now / 240 + u.id) * 0.5; u.g.userData.arms[1].rotation.x = -1.2 + Math.cos(now / 240 + u.id) * 0.5; } if (u.state === 'rest' && !moving) u.g.position.y = -0.4; }
      if (u.kind === 'train') u.g.userData.carts.forEach((c) => c.children.slice(1).forEach((b) => (b.visible = !!u.load)));
      u.ring.position.set(u.x, 0.08, u.z);
      const idle = u.state === 'idle';
      u.ring.visible = u.sel || idle;
      u.ring.material.color.set(u.sel ? 0x6fd39b : 0xf2b134);
      u.ring.material.opacity = u.sel ? 0.95 : 0.45 + Math.sin(now / 180) * 0.35;
    });
    for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i]; p.life -= dt; p.m.scale.setScalar(1 + (0.6 - p.life) * 5); p.m.material.opacity = Math.max(0, p.life / 0.6); if (p.life <= 0) { scene.remove(p.m); pings.splice(i, 1); } }
    restMark.material.color.set(units.some((u) => u.sel && u.kind === 'worker') ? 0x6fd39b : 0x9bd8b5);
    hallMark.visible = true;
    W.clouds.forEach((c, i) => { c.position.x += dt * (1 + (i % 3) * 0.4); if (c.position.x > 500) c.position.x = -500; });
    if (storming() && Math.random() < dt * 0.4) { hemi.intensity = 2.2; Sfx.thunk(); } else hemi.intensity += ((storming() ? 0.35 : 0.62) - hemi.intensity) * Math.min(1, dt * 6);
    sun.intensity = storming() ? 0.35 : 1.0;
    let humL = 0; S.flights.forEach((f) => { if (['taxiIn', 'taxiOut', 'rollout', 'takeoff', 'pushback'].includes(f.phase)) humL = Math.max(humL, 0.4 * clamp(1 - Math.hypot(f.x - cam.x, f.z - cam.z) / 140, 0, 1)); }); Sfx.hum(run ? humL : 0);
    placeCam(dt);
    tagsTick();
    hudT += dt; if (hudT > 0.2) { hudT = 0; hudTick(); renderReq(); }
    renderer.render(scene, camera);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset; Sfx.init();
    if (d.day) { closeModal(); newGame(+d.day); S.started = true; Sfx.ding(); radio('TORNET', `God morgon! ${S.day.name.split('· ')[1]} börjar. Första planet är på väg.`); }
    else if (d.act === 'days') dayMenu();
    else if (d.req) answer(d.req === 'yes');
    else if (d.act === 'order') orderFuel();
    else if (d.act === 'idle') selectIdle();
    else if (d.act === 'closep') { G.panel = false; panel(); }
    else if (d.act === 'panel') { G.panel = !G.panel; panel(); }
    else if (d.act === 'pause') G.paused = !G.paused;
    else if (d.act === 'mute') { Sfx.toggle(); b.textContent = Sfx.muted ? 'Ljud av' : 'Ljud på'; }
    else if (d.build) build(d.build);
    else if (d.buy) buy(d.buy);
  });
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  SH.Rush = { _cam: camera, get S() { return S; }, units, G, command, select, build, buy, orderFuel, ready, done, newGame, answer };
  newGame(1);
  dayMenu();
  requestAnimationFrame(frame);
})();
