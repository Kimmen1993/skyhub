// Tvingar fram alla plantyper med egna behov (privatjet, widebody, frakt, ambulans) på en vinterdag med pir B.
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
var R = SH.Rush, out = [];
function runDay(withOwn) {
  var fleet = [{ id: 1, kind: 'fuel' }, { id: 2, kind: 'fuel' }, { id: 3, kind: 'train' }, { id: 4, kind: 'train' }, { id: 5, kind: 'tug' }, { id: 6, kind: 'tug' }, { id: 7, kind: 'bus' }, { id: 8, kind: 'ops' }];
  if (withOwn) fleet = fleet.concat([{ id: 9, kind: 'cater' }, { id: 10, kind: 'loader' }, { id: 11, kind: 'deice' }, { id: 12, kind: 'plow' }]);
  var staff = []; for (var i = 0; i < 8; i++) staff.push({ id: 100 + i, name: 'W' + i, skill: 3, home: 'auto' });
  fleet.forEach(function (v) { v.wear = 0; v.home = 'auto'; });
  R.startDay({ id: 'test', career: true, name: 'Test · Vinter', start: '06:00', end: '09:00', money: 50000, fuel: 30, season: 'vinter', starPay: 1000,
    cards: 1, cardTypes: ['ambulance'], events: [{ at: 20, type: 'storm', dur: 8 }], requests: [], pay: { 1: 9000, 2: 15000, 3: 8000, 4: 7000 },
    flights: [['VX', 'J', '06:10', 0, 1, { trait: 'picky' }], ['AU', 'L', '06:14', 0, 2, {}], ['CG', 'M', '06:20', 0, 3, { cargo: true }], ['FJ', 'S', '06:26', 0, 4, {}], ['LX', 'M', '06:40', 0, 1, { trait: 'picky' }]],
    staff: staff, fleet: fleet, built: { R1: true, pierB: true }, belts: {} });
  var S = R.S;
  for (var k = 0; k < 40000 && !R.S.ended; k++) {
    if (k % 10 === 0) R.incidents().forEach(function (inc) { if (inc.btn && inc.act) R.quick(inc.act); });
    frame();
  }
  S = R.S;
  out.push((withOwn ? 'EGNA FORDON' : 'ENTREPRENÖRER') + ': slut=' + S.ended + ' stjärnor ' + S.stars + '/' + S.maxStars + ' div ' + S.diverted + ' entreprenör ' + S.coCost + ' kr');
  S.flights.forEach(function (f) { out.push('  ' + f.code + ' ' + f.size + (f.cargo ? ' frakt' : '') + (f.amb ? ' amb' : '') + ' @' + f.stand + ' ' + f.phase + ' ★' + (f.nstars || 0) + (f.tasks ? ' öppna: ' + Object.keys(f.tasks).filter(function (t) { return f.tasks[t].st !== 'done'; }).join(',') : '')); });
}
try { runDay(true); runDay(false); } catch (e) { out.push('KRASCH: ' + e + '\n' + e.stack); }
print(out.join('\n'));
