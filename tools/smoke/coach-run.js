// Följer guiden på dag 1 steg för steg, som en ny spelare.
function frame() { __now += 50; var f = __raf; __raf = null; f(__now); }
var R = SH.Rush;
try {
  R.newGame(1); R.S.started = true; document.getElementById('modal').hidden = true; R.G.modal = false;
  var seen = [];
  for (var i = 0; i < 12000 && !R.S.ended; i++) {
    var S = R.S, st = S.coach, f = S.flights.find(function (x) { return x.phase === 'stand'; });
    if (seen[seen.length - 1] !== st) seen.push(st);
    var W = R.units.filter(function (u) { return u.kind === 'worker'; });
    var by = function (k) { return R.units.find(function (u) { return u.kind === k && u.state === 'idle'; }); };
    if (st === 0) R.select(W.slice(0, 2));
    else if (st === 1 && f) R.command({ flight: f });
    else if (st === 2 && f) { R.select([by('train') || R.units.find(function (u) { return u.kind === 'train'; })]); R.command({ flight: f }); }
    else if (st === 3 && f) { R.select([R.units.find(function (u) { return u.kind === 'fuel'; })]); R.command({ flight: f }); }
    else if (st === 4 && f) { R.select([R.units.find(function (u) { return u.kind === 'tug'; })]); R.command({ flight: f }); }
    else if (st < 0 && f) { // efter guiden: ge order till varje nytt plan
      var on = R.units.filter(function (u) { return u.assign === f.id; });
      if (!on.length) { R.select(R.units.filter(function (u) { return u.state === 'idle'; })); R.command({ flight: f }); }
    }
    frame();
  }
  print('guide steps seen:', seen.join(' > '), '| done', R.S.done, 'stars', R.S.stars, '/', R.S.maxStars, 'ended', R.S.ended, 'errbox', !!document.getElementById('errbox').innerHTML);
} catch (e) { print('KRASCH: ' + e + '\n' + e.stack); }
