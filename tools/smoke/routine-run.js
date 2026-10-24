// Robot som sätter fasta lag i början och sedan bara hanterar händelser.
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
function click(dataset, shift) { (document._l.click || []).forEach(function (f) { f({ shiftKey: !!shift, target: { closest: function () { return { dataset: dataset }; } } }); }); }
var R = SH.Rush;
try {
 for (var day = 2; day <= 4; day++) {
  R.newGame(day); R.S.started = true; document.getElementById('modal').hidden = true; R.G.modal = false;
  var W = R.units.filter(function (u) { return u.kind === 'worker'; });
  R.select(W.slice(0, 2)); click({ home: 'A1' });
  R.select(W.slice(2, 4)); click({ home: 'A2' });
  R.select(R.units.filter(function (u) { return u.kind !== 'worker'; })); click({ home: 'auto' });
  var seen = {}, fixes = 0;
  for (var i = 0; i < 30000 && !R.S.ended; i++) {
    var S = R.S;
    if (S.req) R.answer(true);
    if (i % 10 === 0) {
      if (!S.built.R1 && S.money >= 28000) { R.build('R1'); }
      if (S.built.R1 && !R.units.some(function (u) { return u.home === 'R1'; })) { var spare = R.units.filter(function (u) { return u.kind === 'worker' && !u.home && !u.sick; }); if (spare.length >= 2) { R.select(spare.slice(0, 2)); click({ home: 'R1' }); } }
      if (S.fuel <= 3 && !S.orders.length && S.money > 6000) R.orderFuel();
      if (S.money > 12000 && R.units.filter(function (u) { return u.kind === 'worker'; }).length < 6) { R.buy('worker'); }
      var free = R.units.filter(function (u) { return u.kind === 'worker' && (u.state === 'idle' || u.state === 'standby') && !u.sick; });
      var br = R.units.find(function (u) { return u.broken; });
      if (br && free.length && !R.units.some(function (u) { return u.fixUnit; })) { R.select([free[0]]); R.command({ fixUnit: br }); fixes++; }
      if (S.birds && free.length > 1 && !R.units.some(function (u) { return u.job === 'birds' || (u.dest && u.dest.x === -150); })) { R.select([free[1]]); R.command({ place: { x: -150, z: -100 } }); }
      Object.keys(S.spill).forEach(function (st) { var on = S.flights.some(function (f) { return f.stand === st && f.phase === 'stand'; }); if (!on && free.length > 3) { R.select(free.slice(2, 4)); R.command({ place: { x: R.S && SH.D.layout.stands.find(function (s) { return s.id === st; }).x - 3, z: -15 } }); } });
      // trötta i fast lag: vila
      R.units.forEach(function (u) { if (u.kind === 'worker' && u.state === 'standby' && u.stamina < 25) { R.select([u]); R.command({ place: { x: SH.D.layout.rest.x, z: SH.D.layout.rest.z } }); } });
    }
    S.deck.forEach(function (c) { if (c.fired && !seen[c.type]) seen[c.type] = Math.round(S.t); });
    frame();
  }
  var S = R.S;
  print('DAG ' + day + ' (fasta lag): stars', S.stars, '/', S.maxStars, 'done', S.done, 'div', S.diverted, 'money', Math.round(S.money), 'cards', JSON.stringify(seen), 'ended', S.ended, 'stuck', S.flights.filter(function (f) { return ['stand', 'pushback', 'holding', 'taxiIn'].indexOf(f.phase) >= 0; }).map(function (f) { return f.code + ':' + f.phase + '@' + f.stand + JSON.stringify(f.tasks && Object.keys(f.tasks).filter(function (k) { return f.tasks[k].st !== 'done'; })); }).join(','));
 }
} catch (e) { print('KRASCH: ' + e + '\n' + e.stack); }
