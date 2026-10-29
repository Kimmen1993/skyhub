// Gateschemat och tornet: planera, neka fel plats, ta bort plan, cirkla, förtur och en hel dag.
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
function click(ds) { (document._l.click || []).forEach(function (f) { f({ shiftKey: false, target: { closest: function () { return { dataset: ds }; } } }); }); }
var R = SH.Rush, out = [];
try {
  var fleet = [{ id: 1, kind: 'fuel' }, { id: 3, kind: 'train' }, { id: 5, kind: 'tug' }, { id: 7, kind: 'bus' }];
  var staff = []; for (var i = 0; i < 6; i++) staff.push({ id: 100 + i, name: 'W' + i, skill: 3, home: 'auto' });
  fleet.forEach(function (v) { v.wear = 0; v.home = 'auto'; });
  var fl = [['LX', 'M', '06:10', 0, 1, { trait: 'picky' }], ['CG', 'M', '06:30', 0, 2, { cargo: true }], ['AU', 'L', '06:40', 0, 3, {}], ['NV', 'M', '06:50', 0, 4, {}], ['LC', 'M', '07:00', 0, 5, { trait: 'fast' }], ['NV', 'M', '07:10', 0, 4, {}]];
  R.startDay({ id: 'gp', career: true, name: 'Dag 9 · Test', start: '06:00', end: '08:40', money: 50000, fuel: 30, cards: 0, events: [], requests: [], pay: { 1: 9000, 2: 7000, 3: 15000, 4: 7000, 5: 5000 }, flights: fl,
    staff: staff, fleet: fleet, built: { R1: true }, belts: {}, gatePlan: true, tower: true, gpTip: true });
  var S = R.S;
  out.push('förplanerade: ' + S.flights.map(function (f) { return f.code + '→' + f.plan; }).join(' '));
  var au = S.flights.find(function (f) { return f.al === 'AU'; }), cg = S.flights.find(function (f) { return f.al === 'CG'; }), lx = S.flights.find(function (f) { return f.al === 'LX'; });
  click({ gpf: String(au.id) }); click({ gps: 'A2' }); out.push('AU på A2 (ska nekas): plan=' + au.plan + ' banner=' + (S.banner && S.banner.txt));
  click({ gpf: String(au.id) }); click({ gps: 'A1' }); out.push('AU på A1: plan=' + au.plan + ' tp=' + au.towerPick);
  click({ gpf: String(cg.id) }); click({ gps: 'R1' }); out.push('CG på R1: plan=' + cg.plan + ' fit=' + JSON.stringify(R.gateFit(cg, SH.D.layout.stands[2])));
  click({ gpf: String(cg.id) }); click({ gpx: String(cg.id) }); out.push('CG avplanerad: ' + cg.plan);
  click({ gpf: String(cg.id) }); click({ gps: 'R1' });
  click({ rwm: 'dep' }); out.push('läge ' + S.rwyMode);
  var html0 = document.getElementById('fc').innerHTML; out.push('panel har gateschema: ' + /Gateschema/.test(html0) + ' tornet: ' + /Tornet/.test(html0) + ' längd ' + html0.length);
  var circled = false, boosted = false;
  for (var w = 0; w < 400; w++) frame();
  var sc = R.S.flights.filter(function (f) { return f.phase === 'sched'; });
  var m0 = R.S.money; click({ rwc: String(sc[0].id) }); out.push('cirkla ' + sc[0].code + ': till ' + sc[0].circle + ' (t ' + R.S.t.toFixed(1) + ') pengar ' + (R.S.money - m0) + ' redo ' + sc[0].rwyReady);
  click({ rwup: String(sc[1].id) }); out.push('förtur ' + sc[1].code + ': ' + sc[1].rwyBoost + ' radio ' + R.S.radio[R.S.radio.length - 1].msg);
  for (var w2 = 0; w2 < 30; w2++) frame(); out.push('efter: ' + sc[0].code + ' ' + sc[0].phase + ' redo ' + sc[0].rwyReady + ' | tornpanel: ' + (/Cirklar/.test(document.getElementById('fc').innerHTML)));
  for (var k = 0; k < 40000 && !R.S.ended; k++) {
    S = R.S;
    if (S.req) R.answer(true);
    if (k % 10 === 0) { R.incidents().forEach(function (inc) { if (inc.btn && inc.act) R.quick(inc.act); });
      S.flights.forEach(function (f) { if ((f.phase === 'sched' || f.phase === 'holding') && (!f.plan || f.towerPick || R.clash(f, f.plan)) && f.sta - S.t < 40) { var g = R.suggest(f); if (g) R.planGate(f, g); } });
      var q = S.rwyQueue || [];
      if (!circled && q.length > 1) { var a = q.find(function (f) { return f.phase === 'sched'; }); if (a) { click({ rwc: String(a.id) }); circled = a.code + ' circle ' + (a.circle != null); } }
      if (!boosted && q.length > 1) { click({ rwup: String(q[q.length - 1].id) }); boosted = q[q.length - 1].code + ' boost ' + q[q.length - 1].rwyBoost; }
    }
    frame();
  }
  S = R.S;
  out.push('slut=' + S.ended + ' stjärnor ' + S.stars + '/' + S.maxStars + ' div ' + S.diverted + ' cirkel: ' + circled + ' förtur: ' + boosted);
  out.push(S.flights.map(function (f) { return f.code + ' ' + f.stand + (f.gateOk ? ' ✓gate' : '') + (f.towerPick ? ' (tornet)' : '') + ' ' + f.phase; }).join(' | '));
} catch (e) { out.push('KRASCH: ' + e + '\n' + e.stack); }
print(out.join('\n'));
