const { Sim } = SH;
const s = Sim.create('Test', 4242);
const t0 = Date.now();
let maxP = 0, probs = 0;
for (let i = 0; i < 1440 * 2 * 4; i++) {
  Sim.advance(s, 0.25);
  // låt "chefen" lösa problem efter 20 min, som en spelare
  s.problems.forEach((p) => { if (s.t - p.since > 20) { Sim.fixProblem(s, p.id, 'manager'); probs++; } });
}
console.log('ms', Date.now() - t0, 'money', Math.round(s.money), 'safety', s.safety, 'rep', Math.round(s.rep), 'probs fixed', probs);
s.history.forEach((h) => console.log(JSON.stringify({ n: h.n, inc: h.inc, cost: h.cost, otp: h.otp, deps: h.d.deps, delay: h.d.delayMin, cause: h.d.cause, div: h.d.diverted })));
console.log(s.log.slice(-25).map((l) => Sim.fmt(l.t) + ' ' + l.msg).join('\n'));
console.log('phases', s.flights.map((f) => f.code + ':' + f.phase + '@' + f.stand).join(' '));
console.log('units', s.units.map((u) => u.type + ':' + u.state).join(' '));
const s2 = Sim.load(Sim.serialize(s)); Sim.advance(s2, 120); console.log('reload ok', s2.flights.length);
