// Robotspelare för karriärläget: gör allt själv, anställer när det går.
function click(dataset, id) { (document._l.click || []).forEach(function (f) { f({ target: { closest: function () { return { dataset: dataset, id: id || '' }; } } }); }); }
function key(type, k) { (__winL[type] || []).forEach(function (f) { f({ key: k, target: { tagName: 'BODY' }, preventDefault: function () {} }); }); }
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
var C = SH.Career, holdLeft = 0, log = [], lastPhase = {};
try {
  click({ act: 'begin' });
  for (var i = 0; i < 26000; i++) {
    var S = C.S;
    if (S.ended) { log.push('SHIFT END'); break; }
    if (document.getElementById('modal').hidden === false) click({ act: 'close' });
    S.flights.forEach(function (f) { if (lastPhase[f.id] !== f.phase) { lastPhase[f.id] = f.phase; if (['stand', 'taxiOut', 'gone', 'waitMarshal'].indexOf(f.phase) >= 0) log.push(SH.Career.S.t.toFixed(0) + ' ' + f.code + ' ' + f.phase + (f.stars ? ' stars=' + JSON.stringify(f.stars) : '')); } });
    var G = C.G;
    if (holdLeft > 0) { holdLeft--; if (holdLeft === 0) key('keyup', 'f'); frame(); continue; }
    if (G.mode === 'rhythm') { var r = C.rhythm; if (r && r.bags.some(function (b) { return !b.hit && b.x > 0.84 && b.x < 0.9; })) { key('keydown', 'f'); key('keyup', 'f'); } frame(); continue; }
    if (G.mode === 'train') {
      var tr = C.train, job = tr.job;
      if (tr.load !== 'departures') { tr.x = -28; tr.z = -4.7; tr.v = 0; }
      else if (job && job.steps.bagrun.st === 'active') { var b = SH.Sim.workSpot(job.stand, job.size, 'belt'); tr.x = b.x + 4; tr.z = b.z - 5; tr.v = 0; }
      else { key('keydown', 'f'); key('keyup', 'f'); }
      frame(); continue;
    }
    if (G.mode === 'tug') {
      var pu = C.push;
      if (pu) { var f = pu.f, Lp = pu.Lp; f.x = pu.ghost.x; f.z = pu.ghost.z; f.hd = -Math.PI / 2; C.tug.x = f.x - Lp - 2.1; C.tug.z = f.z; C.tug.h = Math.PI / 2; frame(); if (pu.ready) { key('keydown', 'f'); key('keyup', 'f'); } frame(); }
      else { key('keydown', 'f'); key('keyup', 'f'); frame(); }
      continue;
    }
    // anställ när det går
    if (C.P.money > 9000) { ['bags', 'marshal', 'ramp', 'push'].forEach(function (k) { if (!C.P.hires[k] && C.P.money >= SH.D.helpers[k].cost + 3000 && C.P.level >= SH.D.helpers[k].lvl) click({ hire: k }); }); click({ act: 'close' }); }
    var fin = S.flights.find(function (f) { return f.phase === 'final' && f.mBy === 'you'; });
    if (fin) { var nose = fin.z + SH.D.aircraft[fin.size].nose; if (SH.D.layout.stopZ - nose < 0.8) { key('keydown', 'f'); key('keyup', 'f'); } frame(); continue; }
    var av = C.available().filter(function (a) { return a.sp; });
    if (av.length) {
      var a = av[0]; C.manager.position.set(a.sp.x, 0, a.sp.z);
      if (a.k !== 'marshal') { key('keydown', 'f'); holdLeft = 40; }
    } else C.manager.position.set(-28, 0, -6);
    frame();
  }
  print(log.join('\n'));
  print('P', JSON.stringify(C.P));
  print(C.S.flights.map(function (f) { return f.code + ':' + f.phase + '@' + f.stand + (f.steps ? '[' + Object.keys(f.steps).map(function (k) { return k + '=' + f.steps[k].st + (f.steps[k].by ? '/' + f.steps[k].by : ''); }).join(',') + ']' : ''); }).join('\n'));
  print('helperJob/train', JSON.stringify(C.train.load), C.G.mode);
  print('shift: done', C.S.done, 'stars', C.S.starsShift, 'ontime', C.S.ontime, 'earned', C.S.earned, 't', C.S.t.toFixed(0));
} catch (e) { print('KRASCH: ' + e + '\n' + e.stack); }
