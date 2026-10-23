// SkyHub – simuleringskärna. Ingen DOM, ingen grafik: bara state in, state ut.
// Hela state är vanlig JSON (nycklar som börjar med _ är cache och sparas inte),
// så samma kärna kan köras i webbläsare, Web Worker, mobilapp eller Node-test.
(function () {
  const SH = (window.SH = window.SH || {});
  const C = SH.C;
  const DAY = 1440;
  const COMP = { missed: 250, bag: 400, divert: 10000 }; // ersättningar flygplatsen betalar
  const FLOW = { onlineShare: 0.35, bagsPerPax: 1.0, arrBagsPerPax: 0.9 };

  // ---------- hjälpare ----------
  function rnd(s) {
    let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rint = (s, a, b) => a + Math.floor(rnd(s) * (b - a + 1));
  const pick = (s, arr) => arr[Math.floor(rnd(s) * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nid = (s) => ++s.ids;
  const airline = (id) => C.airlines.find((a) => a.id === id);
  const idx = (s, x, y) => y * s.w + x;
  const inMap = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
  const fmtTime = (t) => {
    const m = ((Math.floor(t) % DAY) + DAY) % DAY;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };

  function log(s, msg, kind) {
    s.log.push({ id: nid(s), t: Math.floor(s.t), msg, kind: kind || 'info' });
    if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
  }

  function newDayStats() {
    return {
      inc: { landing: 0, pax: 0, shop: 0, food: 0, lounge: 0, other: 0 },
      cost: { upkeep: 0, build: 0, comp: 0 },
      arr: 0, dep: 0, ontime: 0, delayed: 0, diverted: 0,
      pax: 0, missed: 0, bagsLost: 0, delaySum: 0, satSum: 0, satN: 0,
    };
  }
  function earn(s, cat, v) { s.money += v; s.day.inc[cat] += v; }
  function spend(s, cat, v) { s.money -= v; s.day.cost[cat] += v; }

  // ---------- nytt spel ----------
  function create(seed) {
    const s = {
      v: 1, seed: seed || (Date.now() & 0x7fffffff), ids: 0,
      w: C.MAP_W, h: C.MAP_H,
      g: new Array(C.MAP_W * C.MAP_H).fill('grass'),
      b: new Array(C.MAP_W * C.MAP_H).fill(null),
      t: C.START_TIME, nextTick: C.START_TIME + 1,
      money: C.START_MONEY,
      fees: { landing: 1.0, pax: 95 },
      sat: 72, rep: 40,
      happy: {},
      contracts: [], offers: [], flights: [],
      q: { checkin: [], security: [], bags: [] }, carry: { checkin: 0, security: 0, bags: 0 },
      stand: {}, rw: {},
      events: [],
      day: newDayStats(), history: [],
      log: [],
    };
    C.airlines.forEach((a) => (s.happy[a.id] = 65));
    buildStarter(s);
    derive(s);
    addContract(s, { airline: 'FJ', size: 'S', times: [7 * 60 + 10, 12 * 60 + 40, 18 * 60 + 5], dest: ['Östersund', 'Visby', 'Umeå'] });
    addContract(s, { airline: 'NV', size: 'M', times: [8 * 60 + 25, 16 * 60 + 50], dest: ['Oslo', 'Köpenhamn'] });
    for (let i = 0; i < 2; i++) makeOffer(s);
    log(s, 'Välkommen till SkyHub! Två flygbolag har redan skrivit avtal med dig.', 'good');
    return s;
  }

  function buildStarter(s) {
    const set = (x, y, g, b) => { s.g[idx(s, x, y)] = g; if (b) s.b[idx(s, x, y)] = b; };
    for (let x = 5; x <= 32; x++) set(x, 5, 'runway');
    for (let x = 7; x <= 30; x++) set(x, 7, 'taxi');
    set(7, 6, 'taxi'); set(30, 6, 'taxi');
    [12, 14, 16].forEach((x) => set(x, 8, 'standS'));
    for (let y = 9; y <= 11; y++) for (let x = 10; x <= 19; x++) set(x, y, 'floor');
    set(11, 11, 'floor', 'checkin'); set(12, 11, 'floor', 'checkin');
    set(14, 11, 'floor', 'security');
    set(17, 11, 'floor', 'baggage');
    set(13, 9, 'floor', 'shop'); set(18, 9, 'floor', 'toilet');
  }

  // ---------- härledd cache (räknas om när kartan ändras) ----------
  function derive(s) {
    const c = { strips: [], stands: [], counts: {}, upkeep: 0, bfs: {} };
    Object.keys(C.tools).forEach((k) => (c.counts[k] = 0));
    for (let i = 0; i < s.g.length; i++) {
      const g = s.g[i], b = s.b[i];
      if (g !== 'grass') { c.counts[g]++; c.upkeep += C.tools[g].upkeep || 0; }
      if (b) { c.counts[b]++; c.upkeep += C.tools[b].upkeep || 0; }
    }
    // Banor: sammanhängande raka linjer av runway-rutor.
    const seen = new Set();
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const i = idx(s, x, y);
      if (s.g[i] !== 'runway' || seen.has(i)) continue;
      const comp = []; const st = [i]; seen.add(i);
      while (st.length) {
        const j = st.pop(); comp.push(j);
        const jx = j % s.w, jy = (j / s.w) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = jx + dx, ny = jy + dy;
          if (!inMap(s, nx, ny)) return;
          const k = idx(s, nx, ny);
          if (s.g[k] === 'runway' && !seen.has(k)) { seen.add(k); st.push(k); }
        });
      }
      const xs = comp.map((j) => j % s.w), ys = comp.map((j) => (j / s.w) | 0);
      const horiz = ys.every((v) => v === ys[0]), vert = xs.every((v) => v === xs[0]);
      const tiles = comp.slice().sort((a, b) => a - b).map((j) => ({ x: j % s.w, y: (j / s.w) | 0 }));
      const ok = (horiz || vert) && tiles.length >= 8;
      c.strips.push({ key: tiles[0].x + ',' + tiles[0].y, tiles, ok, horiz, len: tiles.length });
    }
    // Uppställningsplatser med gatenummer.
    const stands = [];
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const g = s.g[idx(s, x, y)];
      if (g !== 'standS' && g !== 'standL') continue;
      const contact = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inMap(s, x + dx, y + dy) && s.g[idx(s, x + dx, y + dy)] === 'floor');
      stands.push({ i: idx(s, x, y), x, y, type: g, contact });
    }
    let a = 0, r = 0;
    stands.forEach((st) => (st.name = st.contact ? 'A' + ++a : 'R' + ++r));
    c.stands = stands;
    s._c = c;
    // Nåbarhet till en fungerande bana.
    stands.forEach((st) => (st.reach = c.strips.some((sp) => sp.ok && sp.tiles.some((t) => isFinite(bfs(s, st.i).dist[idx(s, t.x, t.y)])))));
    return c;
  }
  const cache = (s) => s._c || derive(s);

  // BFS från en uppställningsplats över taxibanor och banor.
  function bfs(s, from) {
    const c = s._c;
    if (c.bfs[from]) return c.bfs[from];
    const n = s.w * s.h, dist = new Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
    dist[from] = 0; const q = [from];
    for (let h = 0; h < q.length; h++) {
      const j = q[h], jx = j % s.w, jy = (j / s.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = jx + dx, ny = jy + dy;
        if (!inMap(s, nx, ny)) continue;
        const k = idx(s, nx, ny), g = s.g[k];
        if ((g === 'taxi' || g === 'runway') && dist[k] === Infinity) { dist[k] = dist[j] + 1; prev[k] = j; q.push(k); }
      }
    }
    return (c.bfs[from] = { dist, prev });
  }
  // Väg från ruta k till uppställningen (följ prev mot roten).
  function pathTo(s, from, k) {
    const { prev } = bfs(s, from), out = [];
    let j = k;
    while (j !== -1) { out.push({ x: (j % s.w) + 0.5, y: ((j / s.w) | 0) + 0.5 }); if (j === from) break; j = prev[j]; }
    return out;
  }

  // ---------- bygga ----------
  function canBuild(s, tool, x, y) {
    if (!inMap(s, x, y)) return { ok: false, why: 'Utanför kartan' };
    const T = C.tools[tool], i = idx(s, x, y);
    if (tool === 'select') return { ok: false };
    if (tool === 'bulldoze') {
      if (s.g[i] === 'grass' && !s.b[i]) return { ok: false, why: 'Inget att riva' };
      if (s.stand[i]) return { ok: false, why: 'Ett plan använder platsen' };
      if (s.g[i] === 'runway') {
        const sp = cache(s).strips.find((p) => p.tiles.some((t) => t.x === x && t.y === y));
        if (sp && s.rw[sp.key]) return { ok: false, why: 'Banan används just nu' };
      }
      if (s.g[i] === 'taxi' && s.flights.some((f) => f.path && ['taxiIn', 'taxiOut', 'landing'].includes(f.st))) return { ok: false, why: 'Vänta tills inget plan taxar' };
      return { ok: true };
    }
    if (s.money < T.cost) return { ok: false, why: 'Inte tillräckligt med pengar' };
    if (T.layer === 'ground') return s.g[i] === 'grass' ? { ok: true } : { ok: false, why: 'Rutan är upptagen' };
    if (s.g[i] !== 'floor') return { ok: false, why: 'Måste stå på terminalgolv' };
    if (s.b[i]) return { ok: false, why: 'Det står redan något här' };
    return { ok: true };
  }

  function build(s, tool, x, y) {
    const r = canBuild(s, tool, x, y);
    if (!r.ok) return r;
    const i = idx(s, x, y), T = C.tools[tool];
    if (tool === 'bulldoze') {
      const what = s.b[i] || s.g[i];
      const refund = Math.round(C.tools[what].cost * 0.4);
      if (s.b[i]) s.b[i] = null; else s.g[i] = 'grass';
      s.money += refund; s.day.cost.build -= refund;
    } else {
      if (T.layer === 'ground') s.g[i] = tool; else s.b[i] = tool;
      spend(s, 'build', T.cost);
    }
    derive(s);
    return { ok: true };
  }

  // ---------- avtal och erbjudanden ----------
  function addContract(s, o) {
    const ct = { id: nid(s), airline: o.airline, size: o.size, times: o.times.slice().sort((a, b) => a - b), dest: o.dest, since: Math.floor(s.t) };
    ct.num = 100 + (s.contracts.filter((c) => c.airline === o.airline).length * 20) + rint(s, 0, 9) * 2;
    s.contracts.push(ct);
    scheduleDay(s, Math.floor(s.t / DAY), ct, s.t + 20);
    return ct;
  }

  function makeOffer(s) {
    const pool = C.airlines.filter((a) => a.minRep <= s.rep && s.happy[a.id] > 30);
    if (!pool.length) return;
    const al = pick(s, pool), size = pick(s, al.sizes);
    const n = rint(s, 1, s.rep > 60 ? 4 : s.rep > 35 ? 3 : 2);
    const times = [];
    let guard = 0;
    while (times.length < n && guard++ < 50) {
      const t = rint(s, 6, 21) * 60 + rint(s, 0, 3) * 15 + 5;
      if (times.every((u) => Math.abs(u - t) >= 120)) times.push(t);
    }
    times.sort((a, b) => a - b);
    s.offers.push({ id: nid(s), airline: al.id, size, times, dest: times.map(() => pick(s, al.cities)), expires: Math.floor(s.t) + 18 * 60 });
  }

  function offerValue(s, o) {
    const A = C.aircraft[o.size];
    return o.times.length * (A.landingFee * s.fees.landing + A.seats * 0.75 * s.fees.pax + A.seats * 0.75 * 55);
  }

  function acceptOffer(s, id) {
    const o = s.offers.find((x) => x.id === id);
    if (!o) return;
    s.offers = s.offers.filter((x) => x !== o);
    addContract(s, o);
    s.happy[o.airline] = clamp(s.happy[o.airline] + 3, 0, 100);
    log(s, `Avtal med ${airline(o.airline).name}: ${o.times.length} rotationer per dag.`, 'good');
  }
  function declineOffer(s, id) { s.offers = s.offers.filter((x) => x.id !== id); }
  function cancelContract(s, id, byAirline) {
    const ct = s.contracts.find((c) => c.id === id);
    if (!ct) return;
    s.contracts = s.contracts.filter((c) => c !== ct);
    s.flights.forEach((f) => { if (f.ct === id && f.st === 'sched') { f.st = 'cancelled'; f.arrDone = true; } });
    if (!byAirline) s.happy[ct.airline] = clamp(s.happy[ct.airline] - 15, 0, 100);
    log(s, byAirline ? `${airline(ct.airline).name} sa upp ett avtal. De är missnöjda.` : `Du sa upp avtalet med ${airline(ct.airline).name}.`, 'bad');
  }

  // ---------- flygningar ----------
  function scheduleDay(s, dayNo, ct, notBefore) {
    const A = C.aircraft[ct.size];
    ct.times.forEach((tm, k) => {
      const arr = dayNo * DAY + tm;
      if (arr < notBefore) return;
      const lf = clamp(0.55 + s.rep / 250 + (rnd(s) - 0.5) * 0.2, 0.35, 0.98);
      const paxOut = Math.round(A.seats * lf);
      const paxIn = Math.round(A.seats * clamp(lf + (rnd(s) - 0.5) * 0.15, 0.3, 1));
      s.flights.push({
        id: nid(s), ct: ct.id, al: ct.airline, size: ct.size,
        code: ct.airline + ' ' + (ct.num + k * 2), dest: ct.dest[k] || ct.dest[0],
        arr, dep: arr + A.turnaround + 15,
        st: 'sched', stand: null, strip: null, path: null, pp: 0, spd: 0, alt: 0,
        x: 0, y: 0, hd: 0,
        paxIn, inLeft: paxIn, deboardEnd: null, arrBagsNeed: 0, arrBagsDone: 0, arrDone: paxIn === 0,
        paxOut, spawned: 0, qC: 0, qS: 0, air: 0, boarded: 0, missed: 0,
        bagsQ: 0, wSum: 0, wN: 0, crowd: 0, crowdN: 0, bizU: 0, bizN: 0,
        atStand: null, pushback: null, holdSince: null,
      });
    });
  }

  function freeStand(s, A) {
    const fits = (st) => C.tools[st.type].fits.includes(A.id);
    const cands = cache(s).stands.filter((st) => st.reach && fits(st) && !s.stand[st.i]);
    cands.sort((a, b) => (b.contact - a.contact) || ((a.type === 'standS') ? -1 : 1));
    return cands[0] || null;
  }
  const event = (s, type) => s.events.find((e) => e.type === type);

  function setPath(f, pts, spd) {
    f.path = pts; f.pp = 0; f.spd = spd;
    f.x = pts[0].x; f.y = pts[0].y;
  }

  function tryApproach(s, f) {
    if (event(s, 'storm')) return false;
    const A = C.aircraft[f.size];
    const st = freeStand(s, A);
    if (!st) return false;
    const { dist } = bfs(s, st.i);
    let best = null;
    cache(s).strips.forEach((sp) => {
      if (!sp.ok || s.rw[sp.key]) return;
      for (let k = Math.min(5, sp.len - 1); k < sp.len; k++) {
        const t = sp.tiles[k], d = dist[idx(s, t.x, t.y)];
        if (isFinite(d) && (!best || d + k * 0.2 < best.score)) best = { sp, k, score: d + k * 0.2 };
      }
    });
    if (!best) return false;
    const { sp, k } = best;
    s.stand[st.i] = f.id; s.rw[sp.key] = f.id;
    f.stand = st.i; f.strip = sp.key; f.st = 'approach';
    const t0 = sp.tiles[0], t1 = sp.tiles[1];
    const dx = t1.x - t0.x, dy = t1.y - t0.y;
    const thr = { x: t0.x + 0.5, y: t0.y + 0.5 };
    setPath(f, [{ x: thr.x - dx * 14, y: thr.y - dy * 14 }, thr], 14 / 3);
    f._exit = { k, tiles: sp.tiles.slice(0, k + 1).map((t) => ({ x: t.x + 0.5, y: t.y + 0.5 })), exitI: idx(s, sp.tiles[k].x, sp.tiles[k].y) };
    f.alt = 1;
    return true;
  }

  function tryTakeoff(s, f) {
    if (event(s, 'storm')) return false;
    const sp = cache(s).strips.find((p) => p.key === f.strip);
    if (!sp || !sp.ok) { f.strip = null; return false; }
    if (s.rw[sp.key] && s.rw[sp.key] !== f.id) return false;
    s.rw[sp.key] = f.id;
    const ex = Math.floor(f.x), ey = Math.floor(f.y);
    let k = sp.tiles.findIndex((t) => t.x === ex && t.y === ey);
    if (k < 0) k = 0;
    const dir = k < sp.len / 2 ? 1 : -1;
    const end = dir > 0 ? sp.tiles[sp.len - 1] : sp.tiles[0];
    const dx = sp.horiz ? dir : 0, dy = sp.horiz ? 0 : dir;
    const start = { x: f.x, y: f.y }, fin = { x: end.x + 0.5 + dx * 16, y: end.y + 0.5 + dy * 16 };
    setPath(f, [start, fin], 10);
    f._lift = Math.max(3, (Math.abs(end.x - ex) + Math.abs(end.y - ey)) * 0.7);
    f.st = 'takeoff';
    return true;
  }

  function pickDepartureStrip(s, f) {
    const { dist } = bfs(s, f.stand);
    let best = null;
    cache(s).strips.forEach((sp) => {
      if (!sp.ok) return;
      [0, sp.len - 1].forEach((k) => {
        const t = sp.tiles[k], d = dist[idx(s, t.x, t.y)];
        if (isFinite(d) && (!best || d < best.d)) best = { sp, i: idx(s, t.x, t.y), d };
      });
      sp.tiles.forEach((t) => {
        const d = dist[idx(s, t.x, t.y)];
        if (isFinite(d) && (!best || d + 3 < best.d)) best = { sp, i: idx(s, t.x, t.y), d: d + 3 };
      });
    });
    return best;
  }

  // Rörelse längs path, kontinuerligt i tid.
  function movePlanes(s, dt) {
    for (const f of s.flights) {
      if (!f.path || f.spd <= 0) continue;
      let left = f.spd * dt * (f.st === 'landing' && event(s, 'fog') ? 0.5 : 1);
      while (left > 0 && f.path) {
        const segI = Math.floor(f.pp), a = f.path[segI], b = f.path[segI + 1];
        if (!b) { arrive(s, f); break; }
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
        const done = (f.pp - segI) * len, rem = len - done;
        if (left < rem) { f.pp += left / len; left = 0; } else { f.pp = segI + 1; left -= rem; }
        const p = Math.floor(f.pp), q = f.pp - p, A = f.path[p], B = f.path[p + 1] || A;
        f.x = A.x + (B.x - A.x) * q; f.y = A.y + (B.y - A.y) * q;
        if (B !== A) f.hd = Math.atan2(B.y - A.y, B.x - A.x);
        if (f.st === 'approach') f.alt = 1 - f.pp;
      }
      if (f.st === 'takeoff' && f.path) {
        const total = Math.hypot(f.path[1].x - f.path[0].x, f.path[1].y - f.path[0].y);
        const d = f.pp * total;
        f.alt = d > f._lift ? clamp((d - f._lift) / 14, 0, 1.4) : 0;
        if (f.alt > 0.25 && s.rw[f.strip] === f.id) delete s.rw[f.strip];
      }
      if (f.path && f.pp >= f.path.length - 1) arrive(s, f);
    }
  }

  function arrive(s, f) {
    const st = f.st;
    f.path = null; f.spd = 0;
    if (st === 'approach') {
      f.alt = 0; f.st = 'landing';
      earn(s, 'landing', Math.round(C.aircraft[f.size].landingFee * s.fees.landing));
      s.day.arr++;
      setPath(f, f._exit.tiles.length > 1 ? f._exit.tiles : [f._exit.tiles[0], f._exit.tiles[0]], 7);
    } else if (st === 'landing') {
      delete s.rw[f.strip];
      const pts = pathTo(s, f.stand, f._exit.exitI);
      f.st = 'taxiIn'; f._exit = null;
      setPath(f, pts.length > 1 ? pts : [pts[0], pts[0]], 3);
    } else if (st === 'taxiIn') {
      f.st = 'stand'; f.atStand = Math.floor(s.t);
      const sx = f.stand % s.w, sy = (f.stand / s.w) | 0;
      f.x = sx + 0.5; f.y = sy + 0.5;
    } else if (st === 'taxiOut') {
      f.st = 'hold'; f.holdSince = Math.floor(s.t);
    } else if (st === 'takeoff') {
      f.st = 'gone';
      if (s.rw[f.strip] === f.id) delete s.rw[f.strip];
    }
  }

  // ---------- per-minut-logik ----------
  function satAdd(s, val, n) {
    if (n <= 0) return;
    s.day.satSum += val * n; s.day.satN += n;
    s.sat += (val - s.sat) * Math.min(1, n / 500);
  }
  const standInfo = (s, i) => cache(s).stands.find((st) => st.i === i);

  function processQueue(s, name, cap, onOut) {
    const q = s.q[name];
    let budget = cap + s.carry[name];
    while (budget >= 1 && q.length) {
      const c = q[0], take = Math.min(c.n, Math.floor(budget));
      onOut(c, take, Math.floor(s.t) - c.s);
      c.n -= take; budget -= take;
      if (c.n <= 0) q.shift();
    }
    s.carry[name] = q.length ? Math.min(budget, 1) : 0;
  }

  function minuteTick(s) {
    const t = Math.floor(s.t), mod = t % DAY;
    if (mod === 0) newDay(s);
    if (t % 60 === 0) hourly(s);
    s.events = s.events.filter((e) => {
      if (t < e.until) return true;
      if (e.type === 'vip') vipResult(s);
      else log(s, `${C.events[e.type].name} är över.`, 'info');
      return false;
    });

    const c = cache(s);
    spend(s, 'upkeep', c.upkeep / DAY);
    const byId = {};
    s.flights.forEach((f) => (byId[f.id] = f));

    for (const f of s.flights) {
      const A = C.aircraft[f.size];
      if (f.st === 'sched' && t >= f.arr - 9) {
        if (!tryApproach(s, f)) { f.st = 'holding'; f.holdSince = t; }
      } else if (f.st === 'holding') {
        if (!tryApproach(s, f) && t - f.arr > 45) divert(s, f);
      }
      // Avgående passagerare dyker upp 150–45 min före avgång.
      if (!['gone', 'diverted', 'cancelled', 'taxiOut', 'hold', 'takeoff'].includes(f.st) && f.spawned < f.paxOut) {
        const a = f.dep - 150, b = f.dep - 45;
        if (t >= a) {
          const want = Math.min(f.paxOut, Math.round(f.paxOut * clamp((t - a) / (b - a), 0, 1)));
          const n = want - f.spawned;
          if (n > 0) {
            f.spawned += n;
            const online = Math.round(n * FLOW.onlineShare), desk = n - online;
            if (online) { s.q.security.push({ f: f.id, n: online, s: t }); f.qS += online; }
            if (desk) { s.q.checkin.push({ f: f.id, n: desk, s: t }); f.qC += desk; }
          }
        }
      }
      if (f.st === 'stand') standTick(s, f, A, t);
      if (f.st === 'hold') { if (!f.strip || !tryTakeoff(s, f)) { /* väntar */ } }
    }

    // Köer
    const strike = event(s, 'strike') ? 0.5 : 1;
    processQueue(s, 'checkin', c.counts.checkin * C.tools.checkin.cap, (co, n, w) => {
      const f = byId[co.f]; if (!f) return;
      f.qC -= n; f.qS += n; f.wSum += w * n; f.wN += n;
      s.q.security.push({ f: f.id, n, s: Math.floor(s.t) });
      const bags = Math.round(n * FLOW.bagsPerPax);
      if (bags) { s.q.bags.push({ f: f.id, n: bags, s: Math.floor(s.t), dep: 1 }); f.bagsQ += bags; }
    });
    processQueue(s, 'security', c.counts.security * C.tools.security.cap * strike, (co, n, w) => {
      const f = byId[co.f]; if (!f) return;
      f.qS -= n; f.air += n; f.wSum += w * n; f.wN += n;
    });
    processQueue(s, 'bags', c.counts.baggage * C.tools.baggage.cap, (co, n) => {
      const f = byId[co.f]; if (!f) return;
      if (co.dep) f.bagsQ -= n; else f.arrBagsDone += n;
    });

    // Ankommande passagerare lämnar när deras väskor är klara.
    for (const f of s.flights) {
      if (f.arrDone || f.deboardEnd == null || f.inLeft > 0) continue;
      const wait = t - f.deboardEnd;
      if (f.arrBagsDone >= f.arrBagsNeed || wait > 75) {
        const remote = standInfo(s, f.stand) && !standInfo(s, f.stand).contact;
        let v = 100 - 2 * Math.max(0, wait - 12) - (remote ? 8 : 0);
        if (f.arrBagsDone < f.arrBagsNeed) {
          const lost = f.arrBagsNeed - f.arrBagsDone;
          s.day.bagsLost += lost; v = 15;
          spend(s, 'comp', lost * COMP.bag);
          s.q.bags = s.q.bags.filter((co) => !(co.f === f.id && !co.dep));
          log(s, `${f.code}: ${lost} väskor kom aldrig fram till bagagebandet.`, 'bad');
        }
        satAdd(s, clamp(v, 0, 100), f.paxIn);
        s.day.pax += f.paxIn;
        f.arrDone = true;
      }
    }

    airside(s, c);
    s.flights = s.flights.filter((f) => !((f.st === 'gone' || f.st === 'diverted' || f.st === 'cancelled') && f.arrDone && t - (f.pushback || f.arr) > 90));
  }

  function standTick(s, f, A, t) {
    const si = standInfo(s, f.stand), remote = si && !si.contact;
    const rate = A.rate * (remote ? 0.6 : 1);
    if (f.inLeft > 0) {
      const n = Math.min(f.inLeft, Math.ceil(rate));
      f.inLeft -= n;
      const bags = Math.round(n * FLOW.arrBagsPerPax);
      if (bags) { s.q.bags.push({ f: f.id, n: bags, s: t, dep: 0 }); f.arrBagsNeed += bags; }
      if (f.inLeft === 0) f.deboardEnd = t;
      return;
    }
    if (f.deboardEnd == null) f.deboardEnd = t;
    if (t >= f.dep - 30 && f.air > 0) {
      const n = Math.min(f.air, Math.ceil(rate));
      f.air -= n; f.boarded += n;
      const wait = f.wN ? f.wSum / f.wN : 0;
      const crowd = f.crowdN ? f.crowd / f.crowdN : 0;
      const biz = f.bizN ? (f.bizU / f.bizN) * 25 * A.biz * 5 : 0;
      satAdd(s, clamp(100 - 2.2 * Math.max(0, wait - 8) - crowd - (remote ? 8 : 0) - biz, 0, 100), n);
    }
    const allIn = f.spawned >= f.paxOut && f.qC === 0 && f.qS === 0 && f.air === 0;
    const turnOk = t >= f.atStand + A.turnaround;
    const paxOk = allIn || t >= f.dep + 20;
    const bagsOk = f.bagsQ <= 0 || t >= f.dep + 30;
    if (t >= f.dep && turnOk && paxOk && bagsOk) pushback(s, f, t);
  }

  function pushback(s, f, t) {
    const missed = f.qC + f.qS + f.air + (f.paxOut - f.spawned);
    if (missed > 0) {
      s.q.checkin = s.q.checkin.filter((c) => c.f !== f.id);
      s.q.security = s.q.security.filter((c) => c.f !== f.id);
      f.missed = missed; s.day.missed += missed;
      spend(s, 'comp', missed * COMP.missed);
      satAdd(s, 10, missed);
      log(s, `${f.code} till ${f.dest} lämnade ${missed} passagerare kvar i terminalen.`, 'bad');
    }
    if (f.bagsQ > 0) {
      s.q.bags = s.q.bags.filter((c) => !(c.f === f.id && c.dep));
      s.day.bagsLost += f.bagsQ;
      spend(s, 'comp', f.bagsQ * COMP.bag);
      log(s, `${f.code}: ${f.bagsQ} väskor hann inte med planet.`, 'bad');
      s.happy[f.al] -= 2;
      f.bagsQ = 0;
    }
    f.qC = f.qS = f.air = 0;
    const delay = t - f.dep;
    s.day.dep++; s.day.pax += f.boarded; s.day.delaySum += delay;
    if (delay <= 15) { s.day.ontime++; s.happy[f.al] += 0.5; } else { s.day.delayed++; s.happy[f.al] -= Math.min(6, delay / 20); }
    s.happy[f.al] = clamp(s.happy[f.al], 0, 100);
    earn(s, 'pax', Math.round(f.boarded * s.fees.pax));
    f.pushback = t;
    delete s.stand[f.stand];
    const best = pickDepartureStrip(s, f);
    if (!best) { f.st = 'gone'; return; }
    f.strip = best.sp.key;
    const pts = pathTo(s, f.stand, best.i).reverse();
    f.st = 'taxiOut';
    setPath(f, pts.length > 1 ? pts : [pts[0], pts[0]], 3);
  }

  function divert(s, f) {
    f.st = 'diverted'; f.arrDone = true;
    s.day.diverted++;
    spend(s, 'comp', COMP.divert);
    s.happy[f.al] = clamp(s.happy[f.al] - 8, 0, 100);
    const stranded = f.qC + f.qS + f.air + f.paxIn;
    s.q.checkin = s.q.checkin.filter((c) => c.f !== f.id);
    s.q.security = s.q.security.filter((c) => c.f !== f.id);
    satAdd(s, 5, stranded);
    f.spawned = f.paxOut; f.qC = f.qS = f.air = 0;
    const why = event(s, 'storm') ? 'Åskvädret höll i sig för länge' : 'Ingen ledig gate eller bana';
    log(s, `${f.code} från ${f.dest} fick leda om till en annan flygplats. ${why}.`, 'bad');
  }

  function airside(s, c) {
    let A = 0, B = 0;
    s.flights.forEach((f) => { A += f.air; B += f.air * C.aircraft[f.size].biz; });
    if (A <= 0) return;
    const shopCap = c.counts.shop * C.tools.shop.cap, foodCap = c.counts.restaurant * C.tools.restaurant.cap;
    const wcCap = c.counts.toilet * C.tools.toilet.cap, lounge = c.counts.lounge * C.tools.lounge.cap;
    earn(s, 'shop', Math.min(A, shopCap) * 1.1);
    earn(s, 'food', Math.min(A, foodCap) * 1.5);
    const served = Math.min(B, lounge);
    earn(s, 'lounge', served * 5);
    const crowd = clamp((A - shopCap - foodCap) / A, 0, 1) * 12 + clamp((A - wcCap) / A, 0, 1) * 12;
    const bizMiss = B > 0 ? 1 - served / B : 0;
    s.flights.forEach((f) => {
      if (!f.air) return;
      f.crowd += crowd * f.air; f.crowdN += f.air;
      f.bizU += bizMiss * f.air; f.bizN += f.air;
    });
  }

  function hourly(s) {
    s.offers = s.offers.filter((o) => o.expires > s.t);
    if (s.offers.length < 3 && rnd(s) < 0.12 + s.rep / 400) makeOffer(s);
    if (!s.events.length && s.t > C.START_TIME + 12 * 60 && rnd(s) < 0.07) {
      const type = pick(s, ['fog', 'fog', 'storm', 'strike', 'vip']);
      const E = C.events[type];
      s.events.push({ type, until: Math.floor(s.t) + rint(s, E.dur[0], E.dur[1]) });
      log(s, `${E.name}: ${E.desc}`, 'event');
    }
  }

  function vipResult(s) {
    if (cache(s).counts.lounge > 0) {
      earn(s, 'other', 40000); s.rep = clamp(s.rep + 2, 0, 100);
      log(s, 'VIP-delegationen var mycket nöjd med loungen. +40 000 kr och bättre rykte.', 'good');
    } else {
      s.rep = clamp(s.rep - 3, 0, 100);
      log(s, 'VIP-delegationen fick vänta bland alla andra. Ryktet tog skada.', 'bad');
    }
  }

  function newDay(s) {
    const d = s.day, dayNo = Math.floor(s.t / DAY);
    const satDay = d.satN ? d.satSum / d.satN : s.sat;
    const happyAvg = s.contracts.length ? s.contracts.reduce((a, c) => a + s.happy[c.airline], 0) / s.contracts.length : 60;
    s.rep = clamp(s.rep + (satDay - s.rep) * 0.2 + (happyAvg - 60) / 15, 0, 100);
    // Avgifter påverkar flygbolagens humör.
    const target = 75 - (s.fees.landing - 1) * 45 - (s.fees.pax - 95) / 3;
    C.airlines.forEach((a) => (s.happy[a.id] = clamp(s.happy[a.id] + (target - s.happy[a.id]) * 0.1, 0, 100)));
    const income = Object.values(d.inc).reduce((a, b) => a + b, 0), cost = Object.values(d.cost).reduce((a, b) => a + b, 0);
    s.history.push({ day: dayNo, income: Math.round(income), cost: Math.round(cost), sat: Math.round(satDay), rep: Math.round(s.rep), money: Math.round(s.money), d: JSON.parse(JSON.stringify(d)) });
    if (s.history.length > 30) s.history.shift();
    log(s, `Dag ${dayNo} klar. Resultat ${income - cost >= 0 ? '+' : ''}${Math.round(income - cost).toLocaleString('sv-SE')} kr, nöjdhet ${Math.round(satDay)} %.`, income >= cost ? 'good' : 'bad');
    // Missnöjda bolag säger upp.
    const angryAl = new Set(s.contracts.filter((c) => s.happy[c.airline] < 20).map((c) => c.airline));
    angryAl.forEach((al) => { const cs = s.contracts.filter((c) => c.airline === al); cancelContract(s, cs[cs.length - 1].id, true); });
    s.day = newDayStats();
    s.contracts.forEach((ct) => scheduleDay(s, dayNo, ct, s.t));
  }

  // ---------- tidsstegning ----------
  function advance(s, dtMin) {
    let rem = dtMin;
    while (rem > 1e-9) {
      const d = Math.min(rem, s.nextTick - s.t);
      movePlanes(s, d);
      s.t += d; rem -= d;
      if (s.t >= s.nextTick - 1e-9) { s.t = s.nextTick; minuteTick(s); s.nextTick += 1; }
    }
  }

  // ---------- spara/ladda ----------
  function serialize(s) { return JSON.stringify(s, (k, v) => (k[0] === '_' && k !== '_exit' && k !== '_lift' ? undefined : v)); }
  function load(json) {
    const s = typeof json === 'string' ? JSON.parse(json) : json;
    if (!s || s.v !== 1 || !Array.isArray(s.g)) throw new Error('Sparfilen känns inte igen.');
    derive(s);
    return s;
  }

  // ---------- frågor som UI:t använder ----------
  function status(s, f) {
    const t = s.t;
    switch (f.st) {
      case 'sched': return f.dep - t < 150 && f.dep - t > 45 ? ['Incheckning', 'ok'] : ['Planerad', ''];
      case 'holding': return ['Väntar i luften', 'warn'];
      case 'approach': return ['Inflygning', 'info'];
      case 'landing': case 'taxiIn': return ['Landat', 'info'];
      case 'stand':
        if (t >= f.dep) return ['Försenad', 'bad'];
        if (t >= f.dep - 30) return ['Boarding', 'ok'];
        return f.spawned < f.paxOut ? ['Incheckning', 'ok'] : ['Vid gate', ''];
      case 'taxiOut': case 'hold': case 'takeoff': return ['Avgått', 'muted'];
      case 'gone': return ['Avgått', 'muted'];
      case 'diverted': return ['Omdirigerat', 'bad'];
      case 'cancelled': return ['Inställt', 'bad'];
    }
    return ['', ''];
  }

  function capacity(s) {
    const c = cache(s);
    const sum = (k) => s.q[k].reduce((a, x) => a + x.n, 0);
    const oldest = (k) => (s.q[k].length ? Math.floor(s.t) - s.q[k][0].s : 0);
    let air = 0, biz = 0;
    s.flights.forEach((f) => { air += f.air; biz += f.air * C.aircraft[f.size].biz; });
    return {
      checkin: { cap: c.counts.checkin * C.tools.checkin.cap * 60, q: sum('checkin'), wait: oldest('checkin') },
      security: { cap: c.counts.security * C.tools.security.cap * 60 * (event(s, 'strike') ? 0.5 : 1), q: sum('security'), wait: oldest('security') },
      bags: { cap: c.counts.baggage * C.tools.baggage.cap * 60, q: sum('bags'), wait: oldest('bags') },
      airside: { n: Math.round(air), cap: c.counts.shop * C.tools.shop.cap + c.counts.restaurant * C.tools.restaurant.cap, wc: c.counts.toilet * C.tools.toilet.cap },
      lounge: { n: Math.round(biz), cap: c.counts.lounge * C.tools.lounge.cap },
    };
  }

  SH.Sim = {
    create, load, serialize, advance, build, canBuild, derive, cache,
    acceptOffer, declineOffer, cancelContract, offerValue, status, capacity, standInfo,
    fmtTime, airline, DAY,
  };
})();
