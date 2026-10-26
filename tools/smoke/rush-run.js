// Robotspelare för rusningsläget.
function click(dataset) { (document._l.click || []).forEach(function (f) { f({ target: { closest: function () { return { dataset: dataset }; } } }); }); }
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
var R = SH.Rush, log = [], last = {};
function assign(u, f) { R.select([u]); R.command({ flight: f }); }
try {
 for (var day = 1; day <= 4; day++) {
  R.newGame(day); R.S.started = true; document.getElementById('modal').hidden = true; R.G.modal = false; last = {};
  var sabotaged = 0;
  for (var i = 0; i < 30000; i++) {
    var S = R.S; if (S.ended) { log.push('END dag ' + day + ' ' + S.t.toFixed(0)); break; }
    if (S.req) R.answer(true);
    // sabotage: flytta traktorn mitt i pushback och tåget med väskor till ett annat plan
    if (sabotaged < 3) { var tg = R.units.find(function (u) { return u.kind === 'tug' && u.job === 'pushing'; }); if (tg) { R.select([tg]); R.command({ place: { x: 0, z: -20 } }); sabotaged++; } var tr = R.units.find(function (u) { return u.kind === 'train' && u.load; }); var other = S.flights.find(function (f) { return f.phase === 'stand' && tr && tr.load.indexOf(':' + f.id) < 0; }); if (tr && other) { R.select([tr]); R.command({ flight: other }); sabotaged++; } }
    S.flights.forEach(function (f) { if (last[f.id] !== f.phase) { last[f.id] = f.phase; if (['stand', 'taxiOut', 'diverted', 'holding'].indexOf(f.phase) >= 0) log.push(S.t.toFixed(0) + ' ' + f.code + ' ' + f.phase + '@' + f.stand + (f.stars ? ' ' + JSON.stringify(f.stars) : '')); } });
    if (i % 8 === 0) {
      if (R.incidents) R.incidents().forEach(function (inc) { if (inc.btn && inc.act && Math.random() < 0.5) R.quick(inc.act); });
      var fw = R.units.filter(function (u) { return u.kind === 'worker' && u.state === 'idle' && !u.sick; });
      var br = R.units.find(function (u) { return u.broken; });
      if (br && fw.length && !R.units.some(function (u) { return u.fixUnit; })) { R.select([fw[0]]); R.command({ fixUnit: br }); }
      if (S.birds && fw.length > 1 && !R.units.some(function (u) { return u.dest && u.dest.x === -150; })) { R.select([fw[1]]); R.command({ place: { x: -150, z: -100 } }); }
      if (!S.built.R1 && S.money >= 18000) R.build('R1');
      if (S.fuel <= 3 && !S.orders.length && S.money > 6000) R.orderFuel();
      var W = R.units.filter(function (u) { return u.kind === 'worker'; });
      W.forEach(function (u) { if (u.state === 'idle' && u.stamina < 30) { R.select([u]); R.command({ place: { x: SH.D.layout.rest.x, z: SH.D.layout.rest.z } }); } });
      Object.keys(S.broken).forEach(function (st) {
        var f = S.flights.find(function (x) { return x.stand === st && x.phase === 'stand'; });
        var carrier = W.find(function (u) { return u.carry === 'part'; });
        if (carrier) { if (f && carrier.assign !== f.id) assign(carrier, f); }
        else if (!W.some(function (u) { return u.state === 'fetch'; })) { var w = W.find(function (u) { return u.state === 'idle'; }) || W[0]; R.select([w]); R.command({ place: { x: SH.D.layout.workshop.x, z: SH.D.layout.workshop.z } }); }
      });
      var stand = S.flights.filter(function (f) { return f.phase === 'stand' && f.tasks; }).sort(function (a, b) { return a.std - b.std; });
      stand.forEach(function (f) {
        var on = R.units.filter(function (u) { return u.assign === f.id; });
        var wLeft = ['chocks', 'bridge', 'unload', 'load', 'chocksOff'].some(function (k) { return !R.done(f, k); });
        var wOn = on.filter(function (u) { return u.kind === 'worker'; }).length;
        if (wLeft && wOn < 2) { var two = W.filter(function (u) { return u.state === 'idle' && u.stamina >= 30; }).slice(0, 2 - wOn); if (two.length) { R.select(two); R.command({ flight: f }); } }
        ['train', 'fuel', 'tug'].forEach(function (kind) {
          var need = kind === 'train' ? !R.done(f, 'load') : kind === 'fuel' ? !R.done(f, 'fuel') : !R.done(f, 'push') && R.done(f, 'load');
          if (!need || on.some(function (u) { return u.kind === kind; })) return;
          var u = R.units.find(function (x) { return x.kind === kind && x.state === 'idle'; });
          if (u) assign(u, f);
        });
      });
    }
    frame();
  }
  var S = R.S;
  print('DAG ' + day + ': coach', R.S.coach, 'stars', S.stars, '/', S.maxStars, 'done', S.done, 'ontime', S.ontime, 'div', S.diverted, 'money', Math.round(S.money), 'fuel', S.fuel, 'built', JSON.stringify(S.built), 'stuck', S.flights.filter(function (f) { return ['stand', 'pushback', 'holding', 'taxiIn'].indexOf(f.phase) >= 0; }).map(function (f) { return f.code + ':' + f.phase; }).join(','));
 }
 print(log.filter(function (l) { return /diverted|END/.test(l); }).join('\n'));
} catch (e) { print('KRASCH: ' + e + '\n' + e.stack); }
