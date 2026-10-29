// Spelar karriären i åtta dagar: rutiner, händelser och beslut på kontoret.
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
function click(dataset) { (document._l.click || []).forEach(function (f) { f({ shiftKey: false, target: { closest: function () { return { dataset: dataset }; } } }); }); }
var R = SH.Rush, K = SH.Career, log = [];
try {
  K.newCareer('Testvik');
  var DAYS = (typeof DAYS_ARG !== 'undefined') ? DAYS_ARG : 24;
  for (var d = 0; d < DAYS; d++) {
    var C = K.C;
    // kontoret: service, bränsle, ta avtal, anställ, bygg
    C.fleet.forEach(function (v) { if (v.wear > 45) K.action('service:' + v.id); });
    Object.keys(C.belts).forEach(function (g) { if (C.belts[g] > 50) K.action('belt:' + g); });
    if (C.fuel < 8) K.action('fuel');
    if (C.offers.length && C.contracts.reduce(function (a, c) { return a + c.perDay; }, 0) < 3 + C.day) K.action('accept:' + C.offers[0].id);
    if (C.staff.length < 4 + Math.floor(C.day / 3) && C.candidates.length && C.money > 8000) K.action('hire:' + C.candidates[0].id);
    if (C.level >= 1 && !C.built.R1 && C.money > 25000) K.action('build:R1');
    if (!C.fleet.some(function (v) { return v.kind === 'ops'; }) && C.money > 40000) K.action('buy:ops');
    if (C.fleet.filter(function (v) { return v.kind === 'fuel'; }).length < 2 && C.money > 60000) K.action('buy:fuel');
    if (C.level >= 3 && !C.built.pierB && !(C.projects || {}).pierB && C.money > 150000) K.action('project:pierB');
    if (C.day >= 14 && !C.fleet.some(function (v) { return v.kind === 'plow'; }) && C.money > 60000) K.action('buy:plow');
    if (C.day >= 17 && !C.fleet.some(function (v) { return v.kind === 'deice'; }) && C.money > 60000) K.action('buy:deice');
    if (C.day >= 12 && !C.fleet.some(function (v) { return v.kind === 'cater'; }) && C.money > 60000) K.action('buy:cater');
    if (C.day >= 9 && C.day % 2 && !C.fleet.some(function (v) { return v.kind === 'loader'; }) && C.money > 60000) K.action('buy:loader');
    if (C.built.pierB && C.fleet.filter(function (v) { return v.kind === 'train'; }).length < 3 && C.money > 50000) K.action('buy:train');
    C.staff.forEach(function (w) { if (w.morale < 35 && C.money > 3000) K.action('bonus:' + w.id); });
    var dayNo = C.day;
    K.startDay();
    if (!R.S.started) R.beginShift(Math.random() < 0.6);
    var S = R.S;
    // fasta lag när de är upplåsta
    if (!S.cfg.noRoutines) {
      var W = R.units.filter(function (u) { return u.kind === 'worker'; });
      R.select(W.slice(0, 2)); click({ home: 'A1' }); R.select(W.slice(2, 4)); click({ home: 'A2' });
      if (S.built.R1 && W.length >= 6) { R.select(W.slice(4, 6)); click({ home: 'R1' }); }
      if (S.built.pierB && W.length >= 10) { R.select(W.slice(6, 8)); click({ home: 'B1' }); R.select(W.slice(8, 10)); click({ home: 'B2' }); }
      R.select(R.units.filter(function (u) { return u.kind !== 'worker'; })); click({ home: 'auto' });
    }
    for (var i = 0; i < 40000 && !R.S.ended; i++) {
      S = R.S;
      if (S.req) R.answer(Math.random() < 0.6);
      if (S.coach >= 0) { var st = S.coach, f0 = S.flights.find(function (x) { return x.phase === 'stand'; }); var Wk = R.units.filter(function (u) { return u.kind === 'worker'; });
        if (st === 0) R.select(Wk.slice(0, 2)); else if (st === 1 && f0) R.command({ flight: f0 }); else if (st >= 2 && st <= 4 && f0) { R.select([R.units.find(function (u) { return u.kind === ['train', 'fuel', 'tug'][st - 2]; })]); R.command({ flight: f0 }); } }
      if (i % 10 === 0) {
      if (R.incidents) R.incidents().forEach(function (inc) { if (inc.btn && inc.act && Math.random() < 0.5) R.quick(inc.act); });
        if (S.fuel <= 3 && !S.orders.length) R.orderFuel();
        // gateschemat: planera plan som landar inom 40 min, och lös krockar
        if (S.gp) S.flights.forEach(function (f) { if ((f.phase === 'sched' || f.phase === 'holding') && (!f.plan || f.towerPick || R.clash(f, f.plan)) && f.sta - S.t < 40) { var g = R.suggest(f); if (g) R.planGate(f, g); } });
        if (S.tower && i % 400 === 0) { S.rwyMode = ['fair', 'arr', 'dep'][Math.floor(Math.random() * 3)]; }
        if (S.flights.some(function (f) { return f.phase === 'stand' && f.std < S.t - 12; }) && S.temps < 2 && S.money > 2500) click({ act: 'temp' });
        var free = R.units.filter(function (u) { return u.kind === 'worker' && (u.state === 'idle' || u.state === 'standby') && !u.sick; });
        var br = R.units.find(function (u) { return u.broken; });
        if (br && free.length && !R.units.some(function (u) { return u.fixUnit; })) { R.select([free[0]]); R.command({ fixUnit: br }); }
        if (S.birds && free.length > 1 && !R.units.some(function (u) { return u.dest && u.dest.x === -150; })) { R.select([free[1]]); R.command({ place: { x: -150, z: -100 } }); }
        // utan fasta lag: skicka folk och fordon för hand
        S.flights.filter(function (f) { return f.phase === 'stand' && f.tasks; }).forEach(function (f) {
          var on = R.units.filter(function (u) { return u.assign === f.id; });
          var wOn = on.filter(function (u) { return u.kind === 'worker'; }).length;
          if (wOn < 2) { var two = R.units.filter(function (u) { return u.kind === 'worker' && u.state === 'idle' && u.stamina > 25 && !u.sick; }).slice(0, 2 - wOn); if (two.length) { R.select(two); R.command({ flight: f }); } }
          ['train', 'fuel', 'tug'].forEach(function (k) { if (on.some(function (u) { return u.kind === k; })) return; var need = k === 'train' ? !R.done(f, 'load') : k === 'fuel' ? !R.done(f, 'fuel') : R.done(f, 'load') && !R.done(f, 'push'); var u = R.units.find(function (x) { return x.kind === k && x.state === 'idle'; }); if (need && u) { R.select([u]); R.command({ flight: f }); } });
        });
        R.units.forEach(function (u) { if (u.kind === 'worker' && (u.state === 'idle' || u.state === 'standby') && u.stamina < 25) { R.select([u]); R.command({ place: { x: SH.D.layout.rest.x, z: SH.D.layout.rest.z } }); } });
      }
      frame();
    }
    if (!R.S.ended) { var S2 = R.S; log.push('FAST dag ' + dayNo + ' t=' + S2.t.toFixed(0) + ' end=' + S2.end + ' req=' + JSON.stringify(S2.req && S2.req.q) + ' flyg: ' + S2.flights.filter(function (f) { return ['gone', 'diverted'].indexOf(f.phase) < 0; }).map(function (f) { return f.code + ':' + f.phase + '@' + f.stand + (f.tasks ? '[' + Object.keys(f.tasks).filter(function (k) { return f.tasks[k].st !== 'done'; }).map(function (k) { return k + '=' + f.tasks[k].st + (f.tasks[k].need ? '(' + f.tasks[k].need + ')' : ''); }).join(',') + ']' : ''); }).join(' ') + ' | händelser: ' + R.incidents().map(function (i) { return i.title; }).join('; ') + ' | TÅG: ' + JSON.stringify(R.units.filter(function (u) { return u.kind === 'train'; }).map(function (u) { var fa = R.S.flights.find(function (x) { return x.id === u.assign; }); return { id: u.id, st: u.state, job: u.job, as: u.assign, asPhase: fa && fa.phase, asStand: fa && fa.stand, asTasks: fa && fa.tasks && Object.keys(fa.tasks).filter(function (k) { return fa.tasks[k].st !== 'done'; }), load: u.load, x: Math.round(u.x), z: Math.round(u.z), path: !!u.path, home: u.home, dest: u.dest && [Math.round(u.dest.x), Math.round(u.dest.z)] }; })) + ' | FORDON: ' + JSON.stringify(R.units.filter(function (u) { return u.kind !== 'worker'; }).map(function (u) { return u.kind + ':' + u.state + (u.away ? '(away ' + u.away + ')' : '') + (u.broken ? '(BROKEN)' : '') + ':as' + u.assign + ':fuel' + u.fuel + ':home' + u.home; })) + ' depå ' + S2.fuel + ' order ' + JSON.stringify(S2.orders) + ' | pending: ' + JSON.stringify(S2.events.filter(function (e) { return !e.fired; })) + JSON.stringify(S2.requests.filter(function (q) { return !q.fired; }))); }
    C = K.C; var L = C.last;
    if (L && (L.mods.length || L.log.length)) log.push('   kort: ' + L.mods.join(', ') + ' | ' + L.log.map(function (x) { return x.slice(6); }).join('; '));
    log.push('dag ' + dayNo + ': ' + (L ? L.stars + '/' + L.maxStars + ' div ' + L.diverted + ' tjänat ' + L.earned + ' netto ' + (L.earned - L.wages - L.lease - L.fixed - L.repair) : 'INGEN RAPPORT') + ' | kassa ' + Math.round(C.money) + ' rykte ' + Math.round(C.rep) + ' nivå ' + C.level + ' avtal ' + C.contracts.map(function (c) { return c.al + 'x' + c.perDay + '(' + Math.round(c.sat) + ')'; }).join(',') + ' personal ' + C.staff.length + ' fordon ' + C.fleet.map(function (v) { return v.kind[0] + v.wear; }).join(' ') + ' byggt ' + Object.keys(C.built).join(',') + ' typ ' + (L && L.tier) + ' ' + (R.S.season || '') + (C.projects && C.projects.pierB ? ' BYGGER' : '') + ' mål ' + Object.keys(C.goals || {}).join(',') + (L && L.news.length ? ' | ' + L.news.join(' / ') : ''));
  }
  print(log.join('\n')); print('AMB-ESKORTER ' + (typeof __amb !== 'undefined' ? __amb : '?'));
} catch (e) { print('KRASCH: ' + e + '\n' + e.stack); }
