// Tvingar fram varje kris med varje svar, alla morgonkort och alla erbjudanden, och kollar att dagen alltid tar slut.
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
var R = SH.Rush, out = [];
var KINDS = ['leak', 'noshow', 'drone', 'injury', 'medical', 'connect', 'wrongbag'];
function runDay(mods, offer, crisis, choice) {
  var fleet = [{ id: 1, kind: 'fuel' }, { id: 2, kind: 'fuel' }, { id: 3, kind: 'train' }, { id: 4, kind: 'train' }, { id: 5, kind: 'tug' }, { id: 6, kind: 'tug' }, { id: 7, kind: 'bus' }, { id: 8, kind: 'ops' }];
  var staff = []; for (var i = 0; i < 8; i++) staff.push({ id: 100 + i, name: 'W' + i, skill: 3, home: 'auto' });
  fleet.forEach(function (v) { v.wear = 0; v.home = 'auto'; });
  var fl = [], als = ['NV', 'FJ', 'SC', 'BB'];
  for (var j = 0; j < 10; j++) { var m = 6 * 60 + 10 + j * 8; fl.push([als[j % 4], j % 4 === 1 ? 'S' : 'M', ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2), 0, j % 4 + 1, {}]); }
  R.startDay({ id: 'test', career: true, name: 'Dag 9 · Sommar · Test', start: '06:00', end: '09:00', money: 50000, fuel: 30, season: 'sommar', starPay: 1000,
    cards: 2, cardTypes: ['spill', 'belt'], events: [], requests: [], pay: { 1: 7000, 2: 4000, 3: 7000, 4: 7000 }, flights: fl,
    staff: staff, fleet: fleet, built: { R1: true, pierB: true }, belts: {}, mods: mods, offer: offer, director: crisis ? 0 : 3, trialAl: 'AU', stateOk: true });
  var S = R.S, brief = S.brief ? S.brief.mods.map(function (x) { return x.icon; }).join('') + (S.brief.offer ? ' +' + S.brief.offer.id : '') : '';
  if (!S.started) R.beginShift(true);
  var fired = false, tries = 0;
  for (var k = 0; k < 40000 && !R.S.ended; k++) {
    S = R.S;
    if (crisis && !fired && k % 40 === 0 && k > 400) { fired = R.fireCrisis(crisis); tries++; }
    if (S.req) R.answer(S.req.opts ? (choice === 'a' ? true : false) : true);
    if (k % 10 === 0) R.incidents().forEach(function (inc) { if (inc.btn && inc.act) R.quick(inc.act); });
    frame();
  }
  S = R.S;
  out.push((crisis ? crisis + '/' + choice : 'kort ' + mods.join(',') + ' ' + offer) + ': slut=' + S.ended + (crisis ? ' utlöst=' + fired : '') + ' ' + S.stars + '/' + S.maxStars + ' plan ' + S.done + ' ' + brief + ' | ' + S.dlog.map(function (x) { return x.slice(6); }).join('; ').slice(0, 300));
  if (!S.ended) out.push('   FAST: ' + S.flights.filter(function (f) { return ['gone', 'diverted'].indexOf(f.phase) < 0; }).map(function (f) { return f.code + ':' + f.phase + (f.tasks ? '[' + Object.keys(f.tasks).filter(function (t) { return f.tasks[t].st !== 'done'; }).map(function (t) { return t + '=' + f.tasks[t].st; }).join(',') + ']' : ''); }).join(' '));
}
try {
  KINDS.forEach(function (c) { ['a', 'b'].forEach(function (w) { runDay([], null, c, w); }); });
  runDay(['flu', 'service', 'fog', 'heat'], 'team'); runDay(['gate', 'pump', 'tight', 'press'], 'charter'); runDay(['rookies'], 'film'); runDay([], 'trial'); runDay([], 'state');
} catch (e) { out.push('KRASCH: ' + e + '\n' + e.stack); }
print(out.join('\n'));
