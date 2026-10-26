// SkyHub – simuleringskärna för kapitel 1 (plattan). Ingen grafik och ingen DOM.
// Tid i speltid-minuter. Hela state är ren JSON; nycklar som börjar med _ är cache och sparas inte.
(function () {
  const SH = (window.SH = window.SH || {});
  const D = SH.D, L = D.layout;
  const DAY = 1440;
  // Hastigheter i enheter per spelminut (vid 1× ≈ 1,2 spelminuter per sekund).
  const SPD = { taxi: 12.5, slow: 4, push: 2.6, approach: 48, touch: 44, exitv: 11, veh: 16, takeoff: 62 };

  // ---------- hjälpare ----------
  function rnd(s) {
    let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hm = (str) => { const [h, m] = str.split(':').map(Number); return h * 60 + m; };
  const fmt = (t) => { const m = ((Math.floor(t) % DAY) + DAY) % DAY; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const nid = (s) => ++s.ids;
  const P = (x, z, v, y) => ({ x, z, v, y: y || 0 });
  function radio(s, msg) { log(s, msg, 'radio'); }
  function log(s, msg, kind) {
    s.log.push({ id: nid(s), t: Math.floor(s.t), msg, kind: kind || 'info' });
    if (s.log.length > 100) s.log.splice(0, s.log.length - 100);
  }

  // Rundar hörn i en polyline (för mjuka svängar).
  function smooth(pts, r) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const l1 = Math.hypot(b.x - a.x, b.z - a.z), l2 = Math.hypot(c.x - b.x, c.z - b.z);
      const rr = Math.min(r, l1 * 0.5, l2 * 0.5);
      if (rr < 0.5) { out.push(b); continue; }
      const p1 = { x: b.x + (a.x - b.x) * rr / l1, z: b.z + (a.z - b.z) * rr / l1 };
      const p2 = { x: b.x + (c.x - b.x) * rr / l2, z: b.z + (c.z - b.z) * rr / l2 };
      for (let k = 0; k <= 6; k++) {
        const u = k / 6, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u;
        out.push({ x: w0 * p1.x + w1 * b.x + w2 * p2.x, z: w0 * p1.z + w1 * b.z + w2 * p2.z, v: b.v, y: b.y });
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const pathLen = (pts) => { let d = 0; for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); return d; };
  function pathTime(pts) {
    let t = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); t += d / Math.max(1, ((pts[i - 1].v || 1) + (pts[i].v || 1)) / 2); }
    return t;
  }

  // ---------- geometri ----------
  const standById = (id) => L.stands.find((s) => s.id === id);
  const centerZ = (size) => L.stopZ - D.aircraft[size].nose;
  function arrivalPath(stand, size) {
    const sd = standById(stand), cz = centerZ(size), rz = L.runwayZ, thr = L.threshold;
    const app = [P(thr - 360, rz, SPD.approach, 50), P(thr, rz, SPD.touch, 0)];
    const roll = [P(thr, rz, SPD.touch), P(L.exit.from - 40, rz, 16), P(L.exit.from, rz, SPD.exitv), P(L.exit.to, L.taxiwayZ, SPD.exitv)];
    // anslutning från taxibanan in till plattan: den närmaste som ligger öster om gaten (fler finns när piren är byggd)
    const conns = L.connectors || [L.laneX[1]], cx = conns.find((x) => x >= sd.x + 18) || conns[conns.length - 1];
    const taxi = smooth([P(L.exit.to, L.taxiwayZ, SPD.taxi), P(cx, L.taxiwayZ, SPD.taxi), P(cx, L.taxilaneZ, SPD.taxi), P(sd.x, L.taxilaneZ, SPD.slow * 1.6), P(sd.x, cz, SPD.slow)], 12);
    return { app, roll, taxi };
  }
  function pushPath(stand, size) {
    const sd = standById(stand), cz = centerZ(size);
    return smooth([P(sd.x, cz, SPD.push), P(sd.x, L.taxilaneZ, SPD.push), P(sd.x + 16, L.taxilaneZ, SPD.push)], 12);
  }
  function taxiOutPath(stand) {
    const sd = standById(stand), thr = L.threshold;
    return smooth([P(sd.x + 16, L.taxilaneZ, SPD.taxi), P(L.laneX[0], L.taxilaneZ, SPD.taxi), P(L.laneX[0], L.taxiwayZ, SPD.taxi), P(thr, L.taxiwayZ, SPD.taxi), P(thr, L.runwayZ + 16, SPD.slow)], 12);
  }
  function takeoffPath() {
    const thr = L.threshold, rz = L.runwayZ;
    const lineup = smooth([P(thr, rz + 16, 8), P(thr, rz, 8), P(thr + 12, rz, 10)], 8);
    return lineup.concat([P(thr + 60, rz, 32), P(thr + 230, rz, SPD.takeoff, 0), P(thr + 480, rz, SPD.takeoff + 4, 40), P(thr + 800, rz, SPD.takeoff + 8, 110)]);
  }
  // Arbetsplatser för fordon runt ett plan på en uppställning.
  function workSpot(stand, size, type) {
    const sd = standById(stand), A = D.aircraft[size], cz = centerZ(size), sc = A.scale / 1.15;
    switch (type) {
      case 'belt': return { x: sd.x + 3.6 * sc, z: cz - 7 * sc, h: -Math.PI / 2 };
      case 'train': return { x: sd.x + 8 * sc, z: cz - 11 * sc, h: Math.PI };
      case 'stairs': return { x: sd.x - 4 * sc, z: cz + 7.5 * sc, h: Math.PI / 2 };
      case 'bus': return { x: sd.x - 13, z: cz + 2, h: 0 };
      case 'tug': return { x: sd.x, z: L.stopZ + 3, h: Math.PI };
      case 'fuel': return { x: sd.x + 10 * sc, z: cz - 2, h: 0 };
      case 'catering': return { x: sd.x - 4.6 * sc, z: cz - 8 * sc, h: Math.PI / 2 };
    }
  }
  const staging = (stand) => { const sd = standById(stand); return { x: sd.x + 17, z: -12, h: 0 }; };
  function vehRoute(from, to) {
    const lane = to.x >= from.x ? L.roadZ[0] : L.roadZ[1];
    const pts = [P(from.x, from.z, SPD.veh), P(from.x, lane, SPD.veh), P(to.x, lane, SPD.veh), P(to.x, to.z, SPD.veh * 0.6)];
    if (Math.abs(from.z - lane) < 0.5) pts.splice(1, 1);
    return smooth(pts, 3);
  }

  // ---------- nytt spel ----------
  function create(name, seed) {
    const s = {
      v: 2, seed: seed || (Date.now() & 0x7fffffff), ids: 0, name: name || 'Norrvik',
      t: 5 * 60 + 30, nextTick: 5 * 60 + 31,
      money: D.money, safety: 100, rep: 50,
      happy: Object.fromEntries(Object.keys(D.airlines).map((k) => [k, 70])),
      flights: [], units: [], ext: [], problems: [],
      staff: { busy: 0 }, teams: [], candidates: [], firms: { fuel: false, catering: false, cleaning: false },
      standOcc: {}, rwy: null, lastApproach: -99,
      day: null, history: [], log: [],
    };
    Object.entries(D.equipment).forEach(([type, e]) => {
      for (let i = 0; i < e.count; i++) {
        const d = { x: L.depot.x - 6 + i * 4 + (type === 'bus' ? 10 : 0), z: L.depot.z - 4 - Object.keys(D.equipment).indexOf(type) * 5 };
        s.units.push({ id: nid(s), type, x: d.x, z: d.z, h: 0, state: 'idle', job: null, path: null, pp: 0, broken: false, wear: 15 + Math.round(rnd(s) * 45), owned: false, num: i + 1 });
      }
    });
    D.teams.forEach((tm, i) => {
      const team = { id: nid(s), name: tm.name, color: tm.color, shift: tm.shift.slice(), fatigue: 10, breakUntil: null, trainUntil: null, members: [] };
      for (let k = 0; k < tm.size; k++) team.members.push(newMember(s));
      s.teams.push(team);
    });
    refreshCandidates(s);
    s.day = newDayStats(0);
    scheduleDay(s, 0, s.t);
    log(s, `Välkommen till ${s.name} flygplats! Du är ny chef för plattan.`, 'good');
    log(s, `Tornet sköts av ${D.contractors.atc.name} och terminalen av ${D.contractors.terminal.name}. De gör det … sådär.`, 'info');
    return s;
  }
  function newDayStats(n) { return { n, inc: { landing: 0, handling: 0, parking: 0 }, cost: { staff: 0, lease: 0, fixed: 0, comp: 0, other: 0 }, deps: 0, ontime: 0, delayMin: 0, cause: { ramp: 0, terminal: 0, ext: 0, atc: 0, inbound: 0 }, diverted: 0 }; }

  function scheduleDay(s, dayNo, notBefore) {
    const made = [];
    D.schedule.forEach((r, i) => {
      const A = D.aircraft[r.size];
      const sta = dayNo * DAY + hm(r.arr);
      if (sta < notBefore + 30) return;
      const std = r.nightDep ? (dayNo + 1) * DAY + hm(r.nightDep) : sta + A.turn + 10;
      const lf = clamp(0.62 + s.rep / 300 + (rnd(s) - 0.5) * 0.2, 0.4, 0.98);
      const num = 100 + i * 7 + (r.al === 'FJ' ? 300 : r.al === 'NV' ? 200 : r.al === 'SC' ? 700 : 500);
      const f = {
        id: nid(s), al: r.al, size: r.size, code: r.al + ' ' + num, from: r.from, to: r.to, night: !!r.nightDep,
        sta, std, phase: 'sched', stand: null, mv: null, x: 0, z: 0, y: 0, hd: 0,
        pax: Math.round(A.seats * clamp(lf + (rnd(s) - 0.5) * 0.15, 0.35, 1)), paxOut: Math.round(A.seats * lf),
        holdSince: null, holdMin: 0, onBlock: null, offBlock: null, tasks: null,
        paxAllAt: std - 10 + (rnd(s) < 1 - D.contractors.terminal.quality ? 4 + rnd(s) * 14 : 0),
        bagsAllAt: std - 20 + (rnd(s) < 1 - D.contractors.terminal.quality ? 4 + rnd(s) * 12 : 0),
        cause: { ramp: 0, terminal: 0, ext: 0, atc: 0, inbound: 0 },
      };
      s.flights.push(f); made.push(f);
    });
    assignStands(s, made);
  }

  // Fördela flyg på uppställningar: kontakt först, ingen överlappning.
  function assignStands(s, flights) {
    const busy = {};
    L.stands.forEach((st) => (busy[st.id] = []));
    s.flights.forEach((f) => { if (f.stand && !flights.includes(f)) busy[f.stand].push([f.sta - 10, f.std + 15]); });
    flights.sort((a, b) => a.sta - b.sta).forEach((f) => {
      const order = L.stands.slice().sort((a, b) => (f.size === 'S' ? a.contact - b.contact : b.contact - a.contact));
      const lastEnd = (st) => Math.max(-1e9, ...busy[st.id].filter(([a, b]) => b <= f.sta - 10).map(([a, b]) => b));
      const fits = order.filter((st) => busy[st.id].every(([a, b]) => f.std + 15 <= a || f.sta - 10 >= b));
      const pref = fits.filter((st) => st.contact === fits[0].contact).sort((a, b) => lastEnd(a) - lastEnd(b));
      const free = pref[0];
      const st = free || order.reduce((best, st) => (Math.max(...busy[st.id].map((x) => x[1]), 0) < Math.max(...busy[best.id].map((x) => x[1]), 0) ? st : best), order[0]);
      f.stand = st.id; busy[st.id].push([f.sta - 10, f.std + 15]);
    });
  }

  // ---------- personal ----------
  function newMember(s, q) {
    const name = D.names[Math.floor(rnd(s) * D.names.length)];
    const skill = q ? q[1] : 2 + Math.round(rnd(s) * 2), speed = q ? q[2] : 2 + Math.round(rnd(s) * 2);
    return { id: nid(s), name, skill, speed, wage: 220 + skill * 18 + speed * 8, quote: q ? q[0] : null };
  }
  function refreshCandidates(s) {
    s.candidates = [];
    const used = new Set();
    while (s.candidates.length < 3) { const i = Math.floor(rnd(s) * D.quotes.length); if (used.has(i)) continue; used.add(i); s.candidates.push(newMember(s, D.quotes[i])); }
  }
  const hourOf = (t) => (Math.floor(t) % DAY) / 60;
  const onShift = (tm, t) => { const h = hourOf(t); return h >= tm.shift[0] && h < tm.shift[1]; };
  const teamActive = (tm, t) => onShift(tm, t) && !(tm.breakUntil && t < tm.breakUntil) && !(tm.trainUntil && t < tm.trainUntil);
  function staffAvail(s) { const t = s.t; return s.teams.filter((tm) => teamActive(tm, t)).reduce((a, tm) => a + tm.members.length, 0); }
  function workFactor(s) {
    const act = s.teams.filter((tm) => teamActive(tm, s.t) && tm.members.length);
    if (!act.length) return 1;
    const fat = act.reduce((a, tm) => a + tm.fatigue, 0) / act.length;
    const skill = act.reduce((a, tm) => a + tm.members.reduce((b, m) => b + m.skill + m.speed * 0.5, 0) / tm.members.length, 0) / act.length;
    return clamp(1 + (fat / 100) * 0.6 - (skill - 4.5) * 0.07, 0.7, 1.7);
  }
  function teamTick(s, t) {
    const avail = staffAvail(s), util = avail ? clamp(s.staff.busy / avail, 0, 1) : 0;
    s.teams.forEach((tm) => {
      if (tm.breakUntil && t < tm.breakUntil) tm.fatigue -= 1.5;
      else if (onShift(tm, t) && !(tm.trainUntil && t < tm.trainUntil)) { tm.fatigue += 0.03 + 0.14 * util; spend(s, 'staff', tm.members.reduce((a, m) => a + m.wage, 0) / 60); }
      else tm.fatigue -= 0.35;
      tm.fatigue = clamp(tm.fatigue, 0, 100);
      if (tm.trainUntil && t === tm.trainUntil) { tm.members.forEach((m) => (m.skill = Math.min(5, m.skill + 1))); log(s, `${tm.name} är klara med utbildningen. Lite vassare nu.`, 'good'); }
      if (onShift(tm, t) && tm.fatigue > 85 && (t % 60 === 30)) log(s, `${tm.name} är väldigt trötta. Ge dem en rast innan något går fel.`, 'event');
    });
  }
  function teamBreak(s, id) { const tm = s.teams.find((x) => x.id === id); if (tm && !(tm.breakUntil > s.t)) { tm.breakUntil = Math.floor(s.t) + 20; log(s, `${tm.name} tar 20 minuters rast. Kaffet är slut, som vanligt.`, 'info'); } }
  function teamTrain(s, id) {
    const tm = s.teams.find((x) => x.id === id); if (!tm || tm.trainUntil > s.t || s.money < D.training.cost) return false;
    tm.trainUntil = Math.floor(s.t) + D.training.minutes; spend(s, 'other', D.training.cost);
    log(s, `${tm.name} går på utbildning i två timmar.`, 'info'); return true;
  }
  function hire(s, candId, teamId) {
    const c = s.candidates.find((x) => x.id === candId), tm = s.teams.find((x) => x.id === teamId);
    if (!c || !tm) return; tm.members.push(c); s.candidates = s.candidates.filter((x) => x !== c);
    log(s, `${c.name} börjar i ${tm.name}. Välkommen!`, 'good');
  }
  function fire(s, teamId, memberId) {
    const tm = s.teams.find((x) => x.id === teamId); if (!tm || tm.members.length <= 1) return;
    const m = tm.members.find((x) => x.id === memberId); tm.members = tm.members.filter((x) => x !== m);
    if (m) log(s, `${m.name} har slutat i ${tm.name}.`, 'info');
  }
  function setShift(s, teamId, a, b) { const tm = s.teams.find((x) => x.id === teamId); if (tm) tm.shift = [clamp(a, 0, 23), clamp(b, a + 4, 24)]; }

  // ---------- utrustning ----------
  function buyUnit(s, type) {
    const e = D.equipment[type]; if (s.money < e.price) return false;
    spend(s, 'other', e.price);
    const n = s.units.filter((u) => u.type === type).length + 1;
    s.units.push({ id: nid(s), type, x: L.depot.x, z: L.depot.z, h: 0, state: 'idle', job: null, path: null, pp: 0, broken: false, wear: 0, owned: true, num: n });
    log(s, `Ny ${e.name.toLowerCase()} levererad till depån.`, 'good'); return true;
  }
  function buyOut(s, id) {
    const u = s.units.find((x) => x.id === id); if (!u || u.owned) return false;
    const price = Math.round(D.equipment[u.type].price * 0.75); if (s.money < price) return false;
    spend(s, 'other', price); u.owned = true; log(s, `${D.equipment[u.type].name} #${u.num} är nu din egen. Ingen mer leasing.`, 'good'); return true;
  }
  function serviceUnit(s, id) {
    const u = s.units.find((x) => x.id === id); if (!u || u.state !== 'idle' && u.state !== 'return' || u.serviceUntil) return false;
    u.state = 'service'; u.job = null; u.path = vehRoute(u, { x: L.depot.x + 4, z: L.depot.z - 8, h: 0 }); u.dest = { x: L.depot.x + 4, z: L.depot.z - 8, h: 0 };
    u.serviceUntil = Math.floor(s.t) + D.service.minutes; spend(s, 'other', D.service.cost);
    return true;
  }

  // ---------- externa firmor ----------
  function rushExt(s, fid, task) {
    const f = s.flights.find((x) => x.id === fid); if (!f || !f.tasks) return false;
    const x = f.tasks[task], c = D.firms[x.ext];
    if (!(x.lateUntil && (x.lateUntil === 'pending' || x.lateUntil > s.t))) return false;
    x.lateUntil = Math.floor(s.t) + 2; spend(s, 'other', c.rush);
    log(s, `${D.contractors[x.ext].name}: "Ja ja, vi kommer!" (+${c.rush.toLocaleString('sv-SE')} kr)`, 'radio'); return true;
  }
  function setPremium(s, firm, on) { s.firms[firm] = !!on; log(s, `${D.contractors[firm].name}: ${on ? 'premiumavtal tecknat. De lovar att komma i tid.' : 'tillbaka till standardavtal.'}`, 'info'); }

  // ---------- gateplanering ----------
  function reassign(s, fid, stand) {
    const f = s.flights.find((x) => x.id === fid);
    if (!f || !['sched', 'holding'].includes(f.phase) || !standById(stand)) return false;
    f.stand = stand; f._paths = null; return true;
  }
  function plan(s) {
    const rows = {};
    L.stands.forEach((st) => (rows[st.id] = []));
    s.flights.filter((f) => !['gone', 'diverted', 'takeoff', 'hold', 'taxiOut'].includes(f.phase)).forEach((f) => {
      const a = f.onBlock || f.sta, b = f.phase === 'pushback' || f.offBlock ? (f.offBlock || f.std) : Math.max(f.std, s.t);
      rows[f.stand].push({ f, a, b, locked: !['sched', 'holding'].includes(f.phase) });
    });
    Object.values(rows).forEach((list) => {
      list.sort((x, y) => x.a - y.a);
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        if (list[j].a < list[i].b + 10) { list[i].clash = list[j].clash = true; list[j].clashWith = list[i].f; }
      }
    });
    return rows;
  }
  function autoAssign(s) {
    const fl = s.flights.filter((f) => f.phase === 'sched');
    fl.forEach((f) => (f.stand = null));
    const fixed = s.flights.filter((f) => f.stand);
    const busy = {}; L.stands.forEach((st) => (busy[st.id] = []));
    fixed.forEach((f) => busy[f.stand].push([(f.onBlock || f.sta) - 10, Math.max(f.std, s.t) + 15]));
    fl.sort((a, b) => a.sta - b.sta).forEach((f) => {
      const order = L.stands.slice().sort((a, b) => (f.size === 'S' ? a.contact - b.contact : b.contact - a.contact));
      const free = order.find((st) => busy[st.id].every(([a, b]) => f.std + 15 <= a || f.sta - 10 >= b)) || order.reduce((best, st) => (Math.max(0, ...busy[st.id].map((x) => x[1])) < Math.max(0, ...busy[best.id].map((x) => x[1])) ? st : best), order[0]);
      f.stand = free.id; f._paths = null; busy[free.id].push([f.sta - 10, f.std + 15]);
    });
    log(s, 'Gateplanen är omfördelad automatiskt.', 'info');
  }

  // ---------- turnaround-uppgifter ----------
  const TASKS = ['chocks', 'connect', 'deboard', 'unload', 'fuel', 'clean', 'catering', 'load', 'board', 'close', 'push'];
  const TASK_NAME = { chocks: 'Stoppklossar', connect: 'Brygga/trappa', deboard: 'Avstigning', unload: 'Lossa bagage', fuel: 'Tankning', clean: 'Städning', catering: 'Catering', load: 'Lasta bagage', board: 'Boarding', close: 'Stäng dörrar', push: 'Pushback' };
  function initTasks(s, f) {
    const A = D.aircraft[f.size], remote = !standById(f.stand).contact;
    const bags = Math.round(f.pax * A.bags), bagsOut = Math.round(f.paxOut * A.bags);
    const T = {
      chocks: { after: [], dur: 2, staff: 1 },
      connect: { after: ['chocks'], dur: remote ? 2 : 2, units: remote ? ['stairs'] : [] },
      deboard: { after: ['connect'], dur: Math.ceil(f.pax / (A.deboard * (remote ? 0.7 : 1))), units: remote ? ['bus'] : [] },
      unload: { after: ['chocks'], dur: Math.max(4, Math.ceil(bags / 14)), staff: 2, units: ['belt', 'train'] },
      fuel: { after: ['chocks'], dur: f.size === 'S' ? 8 : 12, ext: 'fuel' },
      clean: { after: ['deboard'], pre: ['deboard'], dur: f.size === 'S' ? 6 : 10, ext: 'cleaning' },
      catering: { after: ['deboard'], pre: ['deboard'], dur: f.size === 'S' ? 5 : 9, ext: 'catering' },
      load: { after: ['unload'], dur: Math.max(4, Math.ceil(bagsOut / 14)), staff: 2, units: ['belt', 'train'], waitBags: true },
      board: { after: ['clean', 'catering'], dur: Math.ceil(f.paxOut / (A.board * (remote ? 0.7 : 1))), units: remote ? ['bus'] : [], waitPax: true },
      close: { after: ['board', 'load', 'fuel'], dur: 3 },
      push: { after: ['close'], pre: ['board'], dur: 0, staff: 1, units: ['tug'], notBefore: 'std' },
    };
    Object.values(T).forEach((x) => Object.assign(x, { st: 'wait', start: null, end: null, held: [], staffHeld: 0, lateUntil: null, paused: false }));
    ['fuel', 'catering', 'clean'].forEach((k) => {
      const c = D.contractors[T[k].ext];
      if (rnd(s) < c.late * (s.firms[T[k].ext] ? 0.35 : 1)) T[k].lateUntil = 'pending';
    });
    f.tasks = T;
  }

  function freeUnit(s, type, near) {
    let best = null, bd = Infinity;
    s.units.forEach((u) => { if (u.type === type && (u.state === 'idle' || u.state === 'return') && !u.broken && !u.serviceUntil) { const d = Math.hypot(u.x - near.x, u.z - near.z); if (d < bd) { bd = d; best = u; } } });
    return best;
  }
  function sendUnit(s, u, spot, job) {
    u.job = job; u.state = 'travel'; u.path = vehRoute(u, spot); u.pp = 0; u.dest = spot;
  }
  function releaseUnit(s, u, stand) {
    u.job = null; u.state = 'return';
    const st = staging(stand), k = s.units.filter((x) => x.state === 'idle' || x.state === 'return').indexOf(u);
    const spot = { x: st.x + (k % 2) * 3.5, z: st.z - Math.floor(k / 2) * 4.5 - 2, h: 0 };
    u.path = vehRoute(u, spot); u.pp = 0; u.dest = spot;
  }

  function taskTick(s, f, t) {
    const T = f.tasks, A = D.aircraft[f.size];
    for (const k of TASKS) {
      const x = T[k];
      if (x.st === 'done') continue;
      const depsDone = x.after.every((a) => T[a].st === 'done');
      const preOk = x.pre ? x.pre.every((a) => T[a].st !== 'wait') : depsDone;
      if (!preOk) continue;
      const runOk = depsDone && (x.notBefore !== 'std' || t >= f.std) && (k !== 'push' || pushClear(s, f));
      if (x.st === 'wait') {
        if (x.ext) {
          if (x.lateUntil === 'pending') { x.lateUntil = t + 5 + Math.round(rnd(s) * 16); }
          if (x.lateUntil && t < x.lateUntil) continue;
          spawnExt(s, f, k); x.st = 'travel'; x.start = t; continue;
        }
        const needStaff = x.staff || 0;
        if (staffAvail(s) - s.staff.busy < needStaff) continue;
        const sd = standById(f.stand), near = { x: sd.x, z: centerZ(f.size) };
        const picks = [];
        for (const type of x.units || []) { const u = freeUnit(s, type, near); if (!u || picks.includes(u)) break; picks.push(u); }
        if (picks.length < (x.units || []).length) continue;
        s.staff.busy += needStaff; x.staffHeld = needStaff;
        picks.forEach((u) => sendUnit(s, u, workSpot(f.stand, f.size, u.type), { f: f.id, task: k }));
        x.held = picks.map((u) => u.id);
        x.st = 'travel'; x.start = t;
      }
      if (x.st === 'travel') {
        if (!runOk) continue;
        if (x.ext) { const e = s.ext.find((v) => v.f === f.id && v.task === k); if (e && e.state === 'work') { x.st = 'run'; x.end = t + x.dur; } continue; }
        const units = x.held.map((id) => s.units.find((u) => u.id === id));
        if (units.every((u) => u.state === 'work')) { x.st = 'run'; x.dur = Math.max(1, Math.round(x.dur * (x.staff ? workFactor(s) : 1))); x.end = t + x.dur; if (k === 'push') beginPush(s, f); }
        continue;
      }
      if (x.st === 'run') {
        const units = x.held.map((id) => s.units.find((u) => u.id === id));
        x.paused = units.some((u) => u.broken) || (k === 'deboard' || k === 'board') && s.problems.some((p) => p.type === 'bridge' && p.stand === f.stand);
        if (x.paused) { x.end += 1; continue; }
        let end = x.end;
        if (x.waitPax) end = Math.max(end, f.paxAllAt);
        if (x.waitBags) end = Math.max(end, f.bagsAllAt);
        if (k === 'push') continue; // avslutas när pushback-rörelsen är klar
        if (t >= end) finishTask(s, f, k);
      }
    }
  }
  function finishTask(s, f, k) {
    const x = f.tasks[k];
    x.st = 'done'; x.end = Math.floor(s.t);
    s.staff.busy -= x.staffHeld; x.staffHeld = 0;
    x.held.forEach((id) => {
      const u = s.units.find((v) => v.id === id);
      if (k === 'connect' && u.type === 'stairs') { u.state = 'work'; u.job = { f: f.id, task: 'stairsWait' }; return; }
      releaseUnit(s, u, f.stand);
    });
    if (k === 'close') {
      s.units.forEach((u) => { if (u.job && u.job.f === f.id && u.job.task === 'stairsWait') releaseUnit(s, u, f.stand); });
    }
    const e = s.ext.find((v) => v.f === f.id && v.task === k);
    if (e) { e.state = 'leave'; e.path = vehRoute(e, { x: e.gate, z: L.roadZ[e.gate > e.x ? 0 : 1] }); e.pp = 0; }
  }

  function spawnExt(s, f, task) {
    const type = task === 'clean' ? 'van' : task;
    const spot = task === 'clean' ? { x: standById(f.stand).x - 9, z: L.stopZ - 4, h: 0 } : workSpot(f.stand, f.size, task);
    const gx = L.gates.reduce((a, b) => (Math.abs(b - spot.x) < Math.abs(a - spot.x) ? b : a));
    const e = { id: nid(s), type, f: f.id, task, x: gx, z: L.roadZ[gx < spot.x ? 0 : 1], h: 0, state: 'travel', path: null, pp: 0, dest: spot, gate: gx };
    e.path = vehRoute(e, spot);
    s.ext.push(e);
  }

  // ---------- rörelse ----------
  function setPath(o, pts) { o.mv = { pts, i: 0, u: 0 }; o.x = pts[0].x; o.z = pts[0].z; o.y = pts[0].y || 0; }
  function stepAlong(o, mv, dist, rev) {
    while (dist > 0 && mv.i < mv.pts.length - 1) {
      const a = mv.pts[mv.i], b = mv.pts[mv.i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6;
      const rem = (1 - mv.u) * len;
      if (dist < rem) { mv.u += dist / len; dist = 0; } else { dist -= rem; mv.i++; mv.u = 0; }
      const A2 = mv.pts[mv.i], B2 = mv.pts[Math.min(mv.i + 1, mv.pts.length - 1)];
      o.x = A2.x + (B2.x - A2.x) * mv.u; o.z = A2.z + (B2.z - A2.z) * mv.u; o.y = (A2.y || 0) + ((B2.y || 0) - (A2.y || 0)) * mv.u;
      if (B2 !== A2 && (Math.abs(B2.x - A2.x) + Math.abs(B2.z - A2.z)) > 1e-3) o.hd = Math.atan2(B2.x - A2.x, B2.z - A2.z) + (rev ? Math.PI : 0);
    }
    return mv.i >= mv.pts.length - 1;
  }
  const curSpeed = (mv) => { const a = mv.pts[mv.i], b = mv.pts[Math.min(mv.i + 1, mv.pts.length - 1)]; return (a.v || 1) + ((b.v || 1) - (a.v || 1)) * mv.u; };

  const GROUND = ['rollout', 'taxiIn', 'pushback', 'taxiOut', 'hold', 'takeoff'];
  function blockedAhead(s, f) {
    if (!['taxiIn', 'taxiOut'].includes(f.phase)) return false;
    const fx = Math.sin(f.hd), fz = Math.cos(f.hd);
    for (const g of s.flights) {
      if (g === f || !(GROUND.includes(g.phase) || g.phase === 'stand')) continue;
      if (g.phase === 'stand') continue;
      const dx = g.x - f.x, dz = g.z - f.z, ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      if (ahead > 0 && ahead < 34 && side < 9) return true;
    }
    for (const p of s.problems) if (p.type === 'fod') {
      const dx = p.x - f.x, dz = p.z - f.z, ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      if (ahead > 0 && ahead < 22 && side < 6) { f.fodWait = true; return true; }
    }
    f.fodWait = false;
    return false;
  }
  function pushClear(s, f) {
    const sd = standById(f.stand);
    return !s.flights.some((g) => g !== f && ['taxiIn', 'taxiOut', 'pushback'].includes(g.phase) && Math.abs(g.z - L.taxilaneZ) < 8 && Math.abs(g.x - sd.x) < 50);
  }

  // Står chefen (eller Follow me-bilen) i vägen? Fordon och plan stannar och tutar.
  function playerAhead(s, o, rev, dist, side) {
    const p = s._player; if (!p) return false;
    const sg = rev ? -1 : 1, fx = Math.sin(o.hd) * sg, fz = Math.cos(o.hd) * sg;
    const dx = p.x - o.x, dz = p.z - o.z, ahead = dx * fx + dz * fz;
    return ahead > 0 && ahead < dist && Math.abs(dx * fz - dz * fx) < side;
  }
  function moveAll(s, dt) {
    for (const f of s.flights) {
      if (!f.mv) continue;
      if (blockedAhead(s, f)) continue;
      if (['taxiIn', 'taxiOut', 'pushback'].includes(f.phase) && playerAhead(s, f, f.phase === 'pushback', f.phase === 'pushback' ? 18 : 30, 8)) {
        if (!f.honk) { f.honk = 1; s.safety = clamp(s.safety - 6, 0, 100); log(s, `Du stod i vägen för ${f.code}! Planet fick stanna.`, 'bad'); }
        continue;
      }
      f.honk = 0;
      const done = stepAlong(f, f.mv, curSpeed(f.mv) * dt, f.phase === 'pushback');
      if (f.phase === 'takeoff' && f.y > 6 && s.rwy === f.id) s.rwy = null;
      if (f.phase === 'rollout' && s.rwy === f.id && f.mv.i >= f.mv.pts.length - 2) s.rwy = null;
      if (f.phase === 'pushback') { const tug = s.units.find((u) => u.job && u.job.f === f.id && u.job.task === 'push'); if (tug) { const nose = D.aircraft[f.size].nose; tug.x = f.x + Math.sin(f.hd) * (nose + 2.5); tug.z = f.z + Math.cos(f.hd) * (nose + 2.5); tug.h = f.hd + Math.PI; } }
      if (done) pathEnd(s, f);
    }
    for (const u of s.units.concat(s.ext)) {
      if (!u.path) continue;
      if (u.hd != null && playerAhead(s, u, false, 4.5, 2.2)) {
        if (!u.honk) { u.honk = 1; s.safety = clamp(s.safety - 3, 0, 100); }
        continue;
      }
      u.honk = 0;
      const mv = u._mv || (u._mv = { pts: u.path, i: 0, u: 0 });
      if (mv.pts !== u.path) { mv.pts = u.path; mv.i = 0; mv.u = 0; }
      const done = stepAlong(u, mv, curSpeed(mv) * dt, false);
      if (done) {
        u.path = null; u._mv = null; if (u.dest && u.dest.h != null) u.h = u.dest.h;
        if (u.state === 'travel') u.state = 'work';
        else if (u.state === 'return') u.state = 'idle';
        else if (u.state === 'leave') u.gone = true;
      }
    }
    s.ext = s.ext.filter((e) => !e.gone);
  }

  function pathEnd(s, f) {
    const t = Math.floor(s.t);
    if (f.phase === 'approach') {
      if (s.rwy && s.rwy !== f.id) { // banan upptagen: dra på och gå runt
        f.phase = 'holding'; f.mv = null; f.holdSince = t; f.goAround = (f.goAround || 0) + 1;
        log(s, `${f.code} fick göra en go-around. Banan var inte fri.`, 'event'); return;
      }
      s.rwy = f.id; f.phase = 'rollout';
      earn(s, 'landing', D.aircraft[f.size].landingFee);
      setPath(f, (f._paths || (f._paths = arrivalPath(f.stand, f.size))).roll);
    } else if (f.phase === 'rollout') {
      if (s.rwy === f.id) s.rwy = null;
      f.phase = 'taxiIn'; setPath(f, (f._paths || (f._paths = arrivalPath(f.stand, f.size))).taxi);
    } else if (f.phase === 'taxiIn') {
      f.phase = 'stand'; f.mv = null; f.onBlock = t; f.hd = 0;
      const late = t - f.sta;
      if (late > 15) log(s, `${f.code} från ${f.from} kom ${late} min sent till ${f.stand}.`, 'info');
      initTasks(s, f);
    } else if (f.phase === 'pushback') {
      f.mv = null;
      finishTask(s, f, 'push');
      delete s.standOcc[f.stand];
      f.phase = 'taxiOut'; setPath(f, taxiOutPath(f.stand));
    } else if (f.phase === 'taxiOut') {
      f.phase = 'hold'; f.mv = null; f.holdSince = t;
    } else if (f.phase === 'takeoff') {
      f.phase = 'gone'; f.mv = null; f.goneAt = t;
      if (s.rwy === f.id) s.rwy = null;
    }
  }

  function beginPush(s, f) {
    f.offBlock = Math.floor(s.t);
    const delay = f.offBlock - f.std;
    const d = s.day; d.deps++; d.delayMin += Math.max(0, delay);
    if (delay <= 15) { d.ontime++; s.happy[f.al] = clamp(s.happy[f.al] + 0.6, 0, 100); }
    else {
      s.happy[f.al] = clamp(s.happy[f.al] - Math.min(6, delay / 15), 0, 100);
      const top = Object.entries(f.cause).sort((a, b) => b[1] - a[1])[0];
      const who = { ramp: 'plattan (du)', terminal: D.contractors.terminal.name, ext: 'externa firmor', atc: D.contractors.atc.name, inbound: 'sen ankomst' }[top[0]];
      log(s, `${f.code} till ${f.to} försenad ${delay} min. Främst: ${who}.`, top[0] === 'ramp' ? 'bad' : 'info');
      if (f.cause.ramp > 0 && delay > 15) spend(s, 'comp', Math.round(Math.min(f.cause.ramp, delay - 15) * D.compensation));
    }
    Object.keys(f.cause).forEach((k) => (d.cause[k] += f.cause[k]));
    earn(s, 'handling', D.aircraft[f.size].handlingFee);
    if (f.night) earn(s, 'parking', 6000);
    f.phase = 'pushback'; setPath(f, pushPath(f.stand, f.size));
  }

  // Vad håller upp ett försenat flyg just nu?
  function delayCause(s, f, t) {
    if (f.phase === 'holding' || f.phase === 'sched' || f.phase === 'approach' || f.phase === 'rollout' || f.phase === 'taxiIn') return f.holdCause || 'inbound';
    if (f.phase !== 'stand' || !f.tasks) return null;
    const T = f.tasks, A = D.aircraft[f.size];
    if (f.onBlock + A.turn > f.std && t < f.onBlock + A.turn) return 'inbound';
    for (const k of TASKS) {
      const x = T[k];
      if (x.st === 'done' || !x.after.every((a) => T[a].st === 'done')) continue;
      if (x.ext && x.lateUntil && t < x.lateUntil) return 'ext';
      if (x.paused) return 'ramp';
      if (x.st === 'run' && x.waitPax && t >= x.end && t < f.paxAllAt) return 'terminal';
      if (x.st === 'run' && x.waitBags && t >= x.end && t < f.bagsAllAt) return 'terminal';
      if (x.st === 'wait' || x.st === 'travel') return x.ext ? 'ext' : 'ramp';
    }
    return 'ramp';
  }

  // ---------- problem ----------
  function spawnProblem(s) {
    const t = Math.floor(s.t);
    if (s.problems.length >= 2) return;
    const opts = [];
    const working = s.units.filter((u) => u.state === 'work' && !u.broken && u.type === 'belt' && u.job);
    if (working.filter((u) => u.type === 'belt').length) opts.push('breakdown');
    const atContact = s.flights.filter((f) => f.phase === 'stand' && standById(f.stand).contact && f.tasks && (f.tasks.deboard.st === 'run' || f.tasks.board.st === 'run'));
    if (atContact.length) opts.push('bridge');
    if (!s.problems.some((p) => p.type === 'fod')) opts.push('fod');
    if (!s.problems.some((p) => p.type === 'lost')) opts.push('lost');
    if (!opts.length) return;
    const type = opts[Math.floor(rnd(s) * opts.length)];
    const p = { id: nid(s), type, since: t, fixAt: null };
    if (type === 'breakdown') {
      const belts = working.filter((u) => u.type === 'belt'); const u = belts[Math.floor(rnd(s) * belts.length)]; u.broken = true;
      const f = s.flights.find((x) => x.id === u.job.f);
      Object.assign(p, { unit: u.id, x: u.x, z: u.z, stand: f ? f.stand : '', what: D.equipment[u.type].name });
    } else if (type === 'bridge') {
      const f = atContact[Math.floor(rnd(s) * atContact.length)], sd = standById(f.stand);
      Object.assign(p, { stand: f.stand, x: sd.x + 6, z: -6 });
    } else if (type === 'fod') {
      Object.assign(p, { x: L.laneX[0] + 30 + rnd(s) * (L.laneX[1] - L.laneX[0] - 60), z: L.taxilaneZ + (rnd(s) - 0.5) * 3 });
    } else {
      Object.assign(p, { x: -120 + rnd(s) * 230, z: -20 - rnd(s) * 20, wander: 0 });
    }
    s.problems.push(p);
    log(s, problemTitle(p), 'event');
  }
  function breakUnit(s, u) {
    u.broken = true;
    const f = s.flights.find((x) => x.id === u.job.f);
    const p = { id: nid(s), type: 'breakdown', since: Math.floor(s.t), fixAt: null, unit: u.id, x: u.x, z: u.z, stand: f ? f.stand : '', what: `${D.equipment[u.type].name} #${u.num}` };
    s.problems.push(p); log(s, problemTitle(p), 'event');
  }
  const problemTitle = (p) => D.problems[p.type].title(p);
  function fixProblem(s, id, how) {
    const p = s.problems.find((x) => x.id === id);
    if (!p) return null;
    if (p.type === 'breakdown') { const u = s.units.find((x) => x.id === p.unit); if (u) u.broken = false; }
    s.problems = s.problems.filter((x) => x !== p);
    if (how === 'manager') { s.rep = clamp(s.rep + 0.3, 0, 100); log(s, D.problems[p.type].fix, 'good'); }
    else if (how === 'auto') { s.safety = clamp(s.safety - 3, 0, 100); log(s, `Till slut löste personalen det själva, men det tog tid: ${problemTitle(p).toLowerCase()}.`, 'bad'); }
    else log(s, `Mekanikern fixade: ${problemTitle(p).toLowerCase()}.`, 'info');
    return p;
  }
  function dispatchMechanic(s, id) {
    const p = s.problems.find((x) => x.id === id);
    if (p && !p.fixAt) { p.fixAt = Math.floor(s.t) + D.problems[p.type].mech; spend(s, 'other', 1200); }
  }
  function safetyHit(s, n, reason) {
    s.safety = clamp(s.safety - n, 0, 100);
    if (reason) log(s, reason, 'bad');
  }

  // ---------- ekonomi ----------
  function earn(s, k, v) { s.money += v; s.day.inc[k] += v; }
  function spend(s, k, v) { s.money -= v; s.day.cost[k] += v; }

  // ---------- per minut ----------
  function minuteTick(s) {
    const t = Math.floor(s.t);
    if (t % DAY === 0) newDay(s, t / DAY);
    // kostnader
    teamTick(s, t);
    spend(s, 'fixed', D.fixedCost / DAY);
    Object.entries(s.firms).forEach(([k, on]) => { if (on) spend(s, 'other', D.firms[k].premium / DAY); });
    spend(s, 'lease', s.units.reduce((a, u) => a + (u.owned ? 0 : D.equipment[u.type].lease), 0) / DAY);
    s.units.forEach((u) => {
      if (u.state === 'work') u.wear = Math.min(100, u.wear + 0.03); else if (u.path) u.wear = Math.min(100, u.wear + 0.008);
      if (u.serviceUntil && t >= u.serviceUntil) { u.serviceUntil = null; u.wear = 8; u.state = 'idle'; log(s, `${D.equipment[u.type].name} #${u.num} är klar från service.`, 'info'); }
      if (u.state === 'work' && u.job && !u.broken && u.wear > 60 && rnd(s) < (u.wear - 60) / 40 * 0.004 && s.problems.length < 3) breakUnit(s, u);
    });
    if (t % 60 === 0) {
      s.safety = clamp(s.safety + 1, 0, 100);
      const active = s.flights.some((f) => f.phase === 'stand');
      if (active && rnd(s) < 0.45) spawnProblem(s);
    }
    // problem: mekaniker, vilsen passagerare sänker säkerheten
    s.problems.slice().forEach((p) => {
      if (p.fixAt && t >= p.fixAt) fixProblem(s, p.id, 'mechanic');
      else if (!p.fixAt && t - p.since >= D.problems[p.type].auto) fixProblem(s, p.id, 'auto');
      if (p.type === 'lost' && (t - p.since) % 10 === 9) s.safety = clamp(s.safety - 1, 0, 100);
    });

    for (const f of s.flights) {
      // ankomster: starta inflygning i tid för att vara vid gate till STA
      if (f.phase === 'sched' || f.phase === 'holding') {
        if (!f._paths) f._paths = arrivalPath(f.stand, f.size);
        const lead = pathTime(f._paths.app) + pathTime(f._paths.roll) + pathTime(f._paths.taxi);
        if (t < f.sta - lead) continue;
        const standFree = !s.standOcc[f.stand] || s.standOcc[f.stand] === f.id;
        const atcOk = t - s.lastApproach >= D.contractors.atc.spacing && !s.flights.some((g) => g.phase === 'takeoff' && s.rwy === g.id);
        if (standFree && atcOk) {
          f.phase = 'approach'; s.lastApproach = t; s.standOcc[f.stand] = f.id;
          radio(s, `${D.callsign[f.al]} ${f.code.split(' ')[1]}, fri att landa bana 09.${f.holdMin > 10 ? ' Tack för ert tålamod.' : rnd(s) < 0.2 ? ' Lite sent, som vanligt.' : ''}`);
          setPath(f, f._paths.app);
        } else {
          if (f.phase === 'sched') { f.phase = 'holding'; f.holdSince = t; }
          f.holdCause = standFree ? 'atc' : 'ramp';
          f.holdMin++;
          if (t - f.holdSince > 50) {
            f.phase = 'diverted'; s.day.diverted++; s.happy[f.al] = clamp(s.happy[f.al] - 10, 0, 100);
            spend(s, 'comp', 25000);
            log(s, `${f.code} från ${f.from} fick landa någon annanstans. ${standFree ? 'Tornet hann inte släppa in den.' : `Gate ${f.stand} var fortfarande upptagen.`}`, 'bad');
          }
        }
      }
      if (f.phase === 'stand' && f.tasks) taskTick(s, f, t);
      if (f.phase === 'hold') {
        const soon = s.flights.some((g) => g.phase === 'approach');
        if (!s.rwy && !soon && t - (s.lastDep || -99) >= 2) { s.rwy = f.id; s.lastDep = t; f.phase = 'takeoff'; setPath(f, takeoffPath()); radio(s, `${D.callsign[f.al]} ${f.code.split(' ')[1]}, fri att starta bana 09. Trevlig resa till ${f.to}.`); }
      }
      // försening: logga orsak varje minut efter avgångstid
      if (t >= f.std && !f.offBlock && !['diverted', 'gone'].includes(f.phase)) {
        const c = delayCause(s, f, t); if (c) f.cause[c]++;
      }
    }
    s.flights = s.flights.filter((f) => !((f.phase === 'gone' && t - f.goneAt > 30) || (f.phase === 'diverted' && t - f.sta > 120)));
  }

  function newDay(s, dayNo) {
    const d = s.day;
    const inc = Object.values(d.inc).reduce((a, b) => a + b, 0), cost = Object.values(d.cost).reduce((a, b) => a + b, 0);
    const otp = d.deps ? Math.round((d.ontime / d.deps) * 100) : 100;
    s.history.push({ n: d.n, inc: Math.round(inc), cost: Math.round(cost), otp, safety: Math.round(s.safety), money: Math.round(s.money), d: JSON.parse(JSON.stringify(d)) });
    if (s.history.length > 30) s.history.shift();
    s.rep = clamp(s.rep + (otp - 75) / 20 + (s.safety - 85) / 30, 0, 100);
    s.report = s.history[s.history.length - 1];
    log(s, `Dag ${d.n + 1} klar. Punktlighet ${otp} %, resultat ${Math.round(inc - cost).toLocaleString('sv-SE')} kr.`, inc >= cost ? 'good' : 'bad');
    s.day = newDayStats(dayNo);
    refreshCandidates(s);
    scheduleDay(s, dayNo, s.t - 31);
  }

  // ---------- tidsstegning ----------
  function advance(s, dtMin) {
    let rem = dtMin;
    while (rem > 1e-9) {
      const d = Math.min(rem, s.nextTick - s.t, 0.25);
      moveAll(s, d);
      s.t += d; rem -= d;
      if (s.t >= s.nextTick - 1e-9) { s.t = s.nextTick; minuteTick(s); s.nextTick += 1; }
    }
  }

  // ---------- spara/ladda ----------
  function serialize(s) { return JSON.stringify(s, (k, v) => (k[0] === '_' ? undefined : v)); }
  function load(json) {
    const s = typeof json === 'string' ? JSON.parse(json) : json;
    if (!s || s.v !== 2) throw new Error('Sparfilen känns inte igen.');
    s.units.concat(s.ext).forEach((u) => { if (u.path && u.dest) u.path = vehRoute(u, u.dest); });
    // uppgradera äldre sparfiler (v0.2 utan lag, slitage och firmor)
    if (!s.teams || !s.teams.length) {
      s.teams = []; s.staff = { busy: s.staff ? s.staff.busy || 0 : 0 };
      D.teams.forEach((tm) => { const team = { id: nid(s), name: tm.name, color: tm.color, shift: tm.shift.slice(), fatigue: 10, breakUntil: null, trainUntil: null, members: [] }; for (let k = 0; k < tm.size; k++) team.members.push(newMember(s)); s.teams.push(team); });
      refreshCandidates(s);
    }
    if (!s.firms) s.firms = { fuel: false, catering: false, cleaning: false };
    const cnt = {};
    s.units.forEach((u) => { if (u.wear == null) u.wear = 30; if (u.owned == null) u.owned = false; cnt[u.type] = (cnt[u.type] || 0) + 1; if (!u.num) u.num = cnt[u.type]; });
    return s;
  }

  // ---------- frågor för UI ----------
  function status(s, f) {
    const t = s.t;
    switch (f.phase) {
      case 'sched': return [t > f.sta - 40 ? 'På väg' : 'Planerad', ''];
      case 'holding': return ['Väntar i luften', 'warn'];
      case 'approach': return ['Inflygning', 'info'];
      case 'rollout': case 'taxiIn': return ['Landat, taxar in', 'info'];
      case 'stand': return t >= f.std ? ['Försenad', 'bad'] : f.tasks && f.tasks.board.st !== 'wait' ? ['Boarding', 'ok'] : ['Vid gate', 'ok'];
      case 'pushback': case 'taxiOut': case 'hold': return ['Lämnat gate', 'muted'];
      case 'takeoff': case 'gone': return ['Avgått', 'muted'];
      case 'diverted': return ['Omdirigerat', 'bad'];
    }
    return ['', ''];
  }
  function taskInfo(s, f) {
    if (!f.tasks) return [];
    const t = s.t;
    return TASKS.map((k) => {
      const x = f.tasks[k];
      let txt = '';
      const ready = x.after.every((a) => f.tasks[a].st === 'done');
      if (x.st === 'done') txt = 'Klart';
      else if (!ready) txt = 'Väntar på tidigare steg';
      else if (x.st === 'wait') {
        if (x.notBefore === 'std' && t < f.std) txt = `Väntar till ${fmt(f.std)}`;
        else if (x.ext && x.lateUntil && t < x.lateUntil) txt = `${D.contractors[x.ext].name} är sena`;
        else if (k === 'push' && !pushClear(s, f)) txt = 'Väntar på fri taxilinje';
        else if ((x.staff || 0) > staffAvail(s) - s.staff.busy) txt = staffAvail(s) ? 'Ingen ledig personal' : 'Inget lag i tjänst';
        else txt = `Ingen ledig ${(x.units || []).map((u) => D.equipment[u].name.toLowerCase()).join(' eller ')}`;
      } else if (x.st === 'travel') txt = x.ext ? `${D.contractors[x.ext].name} på väg` : 'Utrustning på väg';
      else if (x.paused) txt = 'Stoppad av ett problem';
      else if (x.waitPax && t >= x.end && t < f.paxAllAt) txt = `Väntar på sena passagerare (${D.contractors.terminal.name})`;
      else if (x.waitBags && t >= x.end && t < f.bagsAllAt) txt = `Väntar på väskor från ${D.contractors.terminal.name}`;
      else txt = 'Pågår';
      const prog = x.st === 'done' ? 1 : x.st === 'run' && x.dur ? clamp((t - (x.end - x.dur)) / x.dur, 0, 1) : 0;
      return { k, name: TASK_NAME[k], st: x.st, txt, prog, ready };
    });
  }

  SH.Sim = { create, load, serialize, advance, fmt, status, taskInfo, fixProblem, dispatchMechanic, safetyHit, problemTitle, standById, centerZ, workSpot, DAY, SPD, TASK_NAME,
    arrivalPath, pushPath, taxiOutPath, takeoffPath, smooth, pathTime, stepAlong,
    staffAvail, workFactor, onShift, teamActive, teamBreak, teamTrain, hire, fire, setShift, buyUnit, buyOut, serviceUnit, rushExt, setPremium, reassign, plan, autoAssign, delayCause };
})();
