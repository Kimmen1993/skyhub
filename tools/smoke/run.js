// Spelar spelet: startar, kör flera speldagar, testar golvet, bilen och alla delar av driftcentralen.
function click(dataset) { (document._l.click || []).forEach(function (f) { f({ target: { closest: function () { return { dataset: dataset }; } } }); }); }
function key(type, k) { (__winL[type] || []).forEach(function (f) { f({ key: k, target: { tagName: 'BODY' }, preventDefault: function () {} }); }); }
function frames(n) { for (var i = 0; i < n; i++) { __now += 50; var f = __raf; __raf = null; f(__now); } }
function txt(id) { return document.getElementById(id).innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function S() { (__winL.pagehide || []).forEach(function (f) { f(); }); return SH.Sim.load(localStorage.getItem('skyhub.game.v2')); }
try {
  click({ act: 'start' });
  frames(20);
  key('keydown', 'o'); key('keyup', 'o'); key('keydown', '3'); key('keyup', '3');
  frames(1500); // fram till ca 08:30
  print('status:', txt('status').slice(0, 90));
  print('alerts:', txt('alerts').slice(0, 160));
  print('flight:', txt('flight').slice(0, 160));
  // driftcentralen: alla flikar
  ['gates', 'staff', 'equip', 'firms', 'money'].forEach(function (t) { click({ dock: t }); frames(3); print('ops ' + t + ':', txt('opsBody').slice(0, 140)); });
  var s = S();
  // handlingar
  click({ autoassign: '1' });
  var sched = s.flights.filter(function (f) { return f.phase === 'sched'; })[0];
  if (sched) click({ move: sched.id + ':R2' });
  click({ buy: 'belt' }); click({ buy: 'tug' });
  var u = s.units.filter(function (x) { return x.state === 'idle'; })[0]; if (u) click({ service: String(u.id) });
  var lease = s.units.filter(function (x) { return !x.owned; })[0]; if (lease) click({ buyout: String(lease.id) });
  click({ hire: s.candidates[0].id + ':' + s.teams[0].id });
  click({ fire: s.teams[1].id + ':' + s.teams[1].members[0].id });
  click({ shift: s.teams[2].id + ':-1' });
  click({ break: String(s.teams[0].id) }); click({ train: String(s.teams[1].id) });
  click({ premium: 'catering:1' });
  click({ dock: 'floor' });
  for (var day = 0; day < 3; day++) { frames(6000); click({ act: 'close' }); }
  print('ran days ok, renders', __renders);
  key('keydown', 'o'); key('keyup', 'o');
  key('keydown', 'w'); frames(200); key('keyup', 'w');
  key('keydown', 'shift'); key('keydown', 'd'); frames(100); key('keyup', 'd'); key('keyup', 'shift');
  key('keydown', 'z'); frames(30); key('keyup', 'z');
  key('keydown', 'f'); key('keyup', 'f');
  click({ act: 'transfer' }); click({ act: 'close' });
  frames(400);
  s = S();
  print('day', s.day.n + 1, SH.Sim.fmt(s.t), 'money', Math.round(s.money), 'safety', s.safety, 'units', s.units.length, 'teams', s.teams.map(function (t) { return t.name + ':' + t.members.length + ':' + t.shift.join('-') + ':' + Math.round(t.fatigue); }).join(' '), 'premium', JSON.stringify(s.firms));
  print('history', JSON.stringify(s.history.map(function (h) { return [h.n, h.otp, h.inc - h.cost]; })));
  print('radio:', txt('radio').slice(0, 120));
} catch (e) { print('KRASCH: ' + e + '\n' + e.stack); }
