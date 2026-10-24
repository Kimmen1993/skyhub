// Robotspelare för rusningsläget.
function click(dataset) { (document._l.click || []).forEach(function (f) { f({ target: { closest: function () { return { dataset: dataset }; } } }); }); }
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
var R = SH.Rush, log = [], last = {};
function assign(u, f) { R.select([u]); R.command({ flight: f }); }
try {
  click({ act: 'begin' });
  for (var i = 0; i < 20000; i++) {
    var S = R.S; if (S.ended) { log.push('END ' + S.t.toFixed(0)); break; }
    S.flights.forEach(function (f) { if (last[f.id] !== f.phase) { last[f.id] = f.phase; if (['stand', 'taxiOut', 'diverted', 'holding'].indexOf(f.phase) >= 0) log.push(S.t.toFixed(0) + ' ' + f.code + ' ' + f.phase + '@' + f.stand + (f.stars ? ' ' + JSON.stringify(f.stars) : '')); } });
    if (i % 8 === 0) {
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
        if (wLeft && wOn < 2) { W.filter(function (u) { return u.state === 'idle' && u.stamina >= 30; }).slice(0, 2 - wOn).forEach(function (u) { assign(u, f); }); }
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
  print(log.join('\n'));
  var S = R.S;
  print('stars', S.stars, '/', S.maxStars, 'done', S.done, 'ontime', S.ontime, 'div', S.diverted, 'money', Math.round(S.money), 'fuel', S.fuel, 'built', JSON.stringify(S.built));
} catch (e) { print('KRASCH: ' + e + '\n' + e.stack); }
