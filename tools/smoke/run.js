// Spelar spelet: startar, döper flygplatsen, kör i översikt på 4× i flera speldagar, går ner på golvet, kör bilen.
function click(dataset) { (document._l.click || []).forEach(function (f) { f({ target: { closest: function () { return { dataset: dataset }; } } }); }); }
function key(type, k) { (__winL[type] || []).forEach(function (f) { f({ key: k, target: { tagName: 'BODY' }, preventDefault: function () {} }); }); }
function frames(n) { for (var i = 0; i < n; i++) { __now += 50; var f = __raf; __raf = null; f(__now); } }
try {
  click({ act: 'start' });
  frames(20);
  key('keydown', 'o'); key('keyup', 'o');   // översikt
  key('keydown', '3'); key('keyup', '3');   // 4×
  var t0 = Date.now();
  for (var day = 0; day < 3; day++) { frames(6000); click({ act: 'close' }); }
  print('ran frames ok, renders', __renders, 'ms', Date.now() - t0);
  key('keydown', 'o'); key('keyup', 'o');   // golvet
  key('keydown', 'w'); frames(200); key('keyup', 'w');
  key('keydown', 'shift'); key('keydown', 'd'); frames(100); key('keyup', 'd'); key('keyup', 'shift');
  key('keydown', 'q'); frames(50); key('keyup', 'q');
  key('keydown', 'f'); key('keyup', 'f');
  click({ tab: 'problems' }); click({ act: 'transfer' }); click({ act: 'close' });
  frames(400);
  var raw = localStorage.getItem('skyhub.game.v2');
  print('saved bytes', raw ? raw.length : 0);
  var s = SH.Sim.load(raw);
  print('day', s.day.n + 1, SH.Sim.fmt(s.t), 'money', Math.round(s.money), 'safety', s.safety, 'flights', s.flights.length, 'units', s.units.length, 'ext', s.ext.length);
  print('history', JSON.stringify(s.history.map(function (h) { return [h.n, h.otp, h.inc - h.cost]; })));
  print('hud:', document.getElementById('hud').innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160));
} catch (e) { print('KRASCH: ' + e + '\n' + e.stack); }
