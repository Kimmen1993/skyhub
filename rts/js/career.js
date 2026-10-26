// SkyHub – karriären: din flygplats lever vidare mellan dagarna.
// Håller koll på pengar, personal, fordon, slitage, byggen, avtal, rykte och befordran,
// skapar varje ny dag åt spelet och visar kontoret mellan dagarna.
(function () {
  const SH = window.SH, D = SH.D;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kr = (v) => Math.round(v).toLocaleString('sv-SE') + ' kr';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const pad = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const KEY = 'skyhub.career2';

  const LEVELS = [
    { t: 'Ramparbetare', xp: 0 },
    { t: 'Arbetsledare', xp: 160, unlock: 'Fasta lag är upplåsta, och du får bygga fjärrplats R1.' },
    { t: 'Plattchef', xp: 480, unlock: 'Du får bygga bränsledepå Öst och personalrum. Större flygbolag hör av sig.' },
    { t: 'Driftchef', xp: 1000, unlock: 'Fler avtal och bättre villkor. Flygbolagen litar på dig.' },
    { t: 'Flygplatschef', xp: 1800, unlock: 'Tornet väntar (kapitel 2). Tack för att du testar!' },
  ];
  const AIRLINES = {
    FJ: { size: 'S', base: 4200, rep: 0, lvl: 0 }, NV: { size: 'M', base: 7200, rep: 0, lvl: 0 },
    LC: { size: 'M', base: 5600, rep: 20, lvl: 0, trait: 'fast' },
    SC: { size: 'M', base: 6900, rep: 35, lvl: 1 }, CG: { size: 'M', base: 7600, rep: 30, lvl: 1, cargo: true },
    BB: { size: 'M', base: 7000, rep: 50, lvl: 2 }, LX: { size: 'M', base: 9800, rep: 55, lvl: 2, trait: 'picky' },
    VX: { size: 'J', base: 8500, rep: 50, lvl: 2, trait: 'picky' }, AU: { size: 'L', base: 15500, rep: 60, lvl: 3 },
  };
  const TRAIT = { fast: 'Lågpris: kräver turnaround på högst 22 min, annars sjunker nöjdheten snabbt.', picky: 'Lyx: betalar bra, men allt under tre stjärnor irriterar.' };
  const TIERS = {
    lugn: { name: 'Lugn dag', cards: -2, storm: 0, emerg: 0, star: 900, req: 0, desc: 'Inget oväder väntas. Bra dag att lära sig något nytt.' },
    normal: { name: 'Normal dag', cards: 0, storm: 0.4, emerg: 0.25, star: 1000, req: 0, desc: 'Lite av varje.' },
    tuff: { name: 'Tuff dag', cards: 2, storm: 0.85, emerg: 0.5, star: 1250, req: 1, desc: 'Oväder troligt och fler problem. Högre stjärnbonus.' },
    extrem: { name: 'Extrem dag', cards: 4, storm: 1, emerg: 1, star: 1500, req: 1, desc: 'Allt på en gång. Nästan omöjligt att få 100 %, men ×1,5 stjärnbonus.' },
  };
  const SITE_LVL = { R1: 1, fuel2: 2, rest: 2 };
  const FLEET = { fuel: { name: 'Tankbil', price: 28000, lease: 900 }, train: { name: 'Bagagetåg', price: 18000, lease: 600 }, tug: { name: 'Pushbacktraktor', price: 32000, lease: 1100 }, ops: { name: 'Follow me-bil', price: 24000, lease: 800, desc: 'Snabb bil som skrämmer fåglar och fångar lösa hundar.' } };
  const FIXED = 3000, PER_FLIGHT = 2500, STAR_PAY = 1000, SERVICE = 2500, BELT_SERVICE = 1500, SIGN = 2000;
  const QUOTES = [
    'Har lastat väskor sedan 1994. Har aldrig tappat en enda.', 'Snabb som en pushbacktraktor nedför. Vet inte vad en bandlastare är.',
    'Före detta skärgårdskapten. Säger "babord" om allt.', 'Har en egen reflexväst. I tre färger.', 'Pratar med flygplanen. De verkar lyssna.',
    'Lugn som en filbunke. Ingenting stressar. Inte ens försenade plan.', 'Nyss klar med utbildningen. Mycket entusiastisk. Kanske för entusiastisk.',
    'Har jobbat på färja. Sjösjuk, så det blev flyg i stället.', 'Kör truck, buss och "det mesta", enligt egen utsago.',
  ];

  let C = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(C)); return true; } catch (e) { return false; } };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  const nid = () => ++C.nid;
  const level = () => LEVELS[C.level];
  function worker(q) {
    const skill = q ? q.skill : Math.round(rnd(2, 3.4));
    return { id: nid(), name: pick(D.names.concat(['Rut', 'Hampus', 'Siv', 'Ahmed', 'Tove', 'Bosse', 'Greta', 'Juha', 'Maja', 'Viktor', 'Noor', 'Stig', 'Linnea', 'Dragan', 'Ebba'])), skill, wage: 600 + skill * 160, morale: 70, home: null, quote: q ? q.quote : null };
  }
  function candidates() {
    const qs = QUOTES.slice().sort(() => Math.random() - 0.5);
    C.candidates = [0, 1, 2].map((i) => worker({ skill: Math.round(rnd(1.6, 4.4)), quote: qs[i] }));
  }
  function newCareer(name) {
    C = { v: 1, nid: 0, name, day: 1, money: 15000, rep: 35, xp: 0, level: 0, fuel: 6, staff: [], fleet: [], belts: { A1: 15, A2: 20, R1: 5 }, built: {}, contracts: [], offers: [], candidates: [], history: [], last: null, news: [] };
    C.staff = [worker(), worker(), worker()];
    C.fleet = ['fuel', 'train', 'tug'].map((k) => ({ id: nid(), kind: k, wear: Math.round(rnd(15, 40)), owned: false, home: null }));
    C.contracts = [{ id: nid(), al: 'FJ', size: 'S', perDay: 2, pay: 4200, sat: 70 }, { id: nid(), al: 'NV', size: 'M', perDay: 1, pay: 7200, sat: 70 }];
    candidates(); C.next = rollTier(); save();
  }
  function rollTier() {
    if (C.day <= 1) return 'lugn';
    const x = Math.random();
    if (C.day >= 4 && x < 0.1) return 'extrem';
    return x < 0.3 ? 'lugn' : x < 0.75 ? 'normal' : 'tuff';
  }

  // ---------- en ny dag ----------
  function dayConfig() {
    const tier = TIERS[C.next || 'normal'];
    const list = [];
    C.contracts.forEach((c) => { for (let i = 0; i < c.perDay; i++) list.push(c); });
    list.sort(() => Math.random() - 0.5);
    const n = list.length, window = 30 + n * 14, start = 360;
    const flights = list.map((c, i) => {
      const t = start + 10 + Math.round(i * window / Math.max(1, n) + rnd(-3, 3));
      return [c.al, c.size, pad(Math.max(start + 8, t)), c.size === 'M' && C.rep > 45 && Math.random() < 0.12, c.id, { cargo: !!c.cargo, trait: c.trait || null }];
    }).sort((a, b) => a[2].localeCompare(b[2]));
    const lastArr = flights.length ? flights[flights.length - 1][2].split(':').reduce((h, m) => +h * 60 + +m) : start + 30;
    const events = [];
    if (C.day >= 2 && Math.random() < tier.storm) events.push({ at: Math.round(rnd(30, Math.max(40, window - 20))), type: 'storm', dur: Math.round(rnd(6, 11)) });
    if (C.day >= 3 && Math.random() < tier.emerg) events.push({ at: Math.round(rnd(40, Math.max(50, window))), type: 'emergency', size: 'M' });
    C.planned = { storm: events.some((e) => e.type === 'storm'), emerg: events.some((e) => e.type === 'emergency') };
    const requests = [];
    if (C.day >= 2) {
      const types = ['fuelDeal', 'priority', 'extra'].sort(() => Math.random() - 0.5).slice(0, Math.min(3, (C.day >= 4 ? 2 : 1) + tier.req));
      types.forEach((t) => { const q = { at: Math.round(rnd(15, Math.max(20, window - 25))), type: t }; if (t === 'extra') { const c = pick(C.contracts); Object.assign(q, { al: c.al, size: c.size, inMin: 24, pay: Math.round(c.pay * 1.3) }); } requests.push(q); });
    }
    const pay = {}; C.contracts.forEach((c) => (pay[c.id] = c.pay));
    return {
      id: 'k' + C.day, career: true, name: `Dag ${C.day} · ${tier.name}`, tier: C.next, start: '06:00', end: pad(lastArr + 70), money: C.money, fuel: C.fuel,
      tutorial: C.day === 1, starPay: tier.star, cards: C.day === 1 ? 0 : clamp(1 + Math.floor(C.day / 2) + tier.cards, 0, 8), events, requests, flights, pay,
      cardTypes: ['belt', 'spill', 'prm', 'sick', 'connect', 'birds', 'flat'].concat(C.day >= 3 ? ['strike', 'dog', 'security'] : []).concat(C.day >= 5 ? ['inspection', 'ambulance'] : []),
      staff: C.staff.map((w) => ({ id: w.id, name: w.name, skill: w.skill, home: w.home })),
      fleet: C.fleet.map((v) => ({ id: v.id, kind: v.kind, wear: v.wear, home: v.home })),
      belts: Object.assign({}, C.belts), built: Object.assign({}, C.built), noRoutines: C.level < 1,
    };
  }
  function startDay() { SH.Rush.startDay(dayConfig()); hideOffice(); }

  // ---------- efter dagen ----------
  function dayEnd(r) {
    const rep0 = C.rep, lvl0 = C.level, R = { tier: C.next, day: C.day, stars: r.stars, maxStars: r.maxStars, done: r.done, ontime: r.ontime, diverted: r.diverted, earned: r.earned, news: [] };
    C.money = r.money; C.fuel = r.fuel; C.belts = Object.assign({}, r.belts); C.built = Object.assign({}, r.built);
    // kostnader
    R.wages = C.staff.reduce((a, w) => a + w.wage, 0); R.lease = C.fleet.reduce((a, v) => a + (v.owned ? 0 : FLEET[v.kind].lease), 0); R.fixed = FIXED + PER_FLIGHT * r.flights.filter((f) => f.cid != null).length;
    R.repair = 0;
    r.units.forEach((u) => {
      if (u.kind === 'worker') { const w = C.staff.find((x) => x.id === u.rid); if (w) { w.home = u.home; w.morale = clamp(w.morale + (u.exhausted ? -18 : 6), 0, 100); w.skill = Math.min(5, +(w.skill + 0.12).toFixed(2)); if (u.exhausted) R.news.push(`${w.name} jobbade tills hen var helt slut. Moralen sjönk.`); } }
      else { const v = C.fleet.find((x) => x.id === u.rid); if (v) { v.wear = Math.round(u.wear); v.home = u.home; if (u.broken) { R.repair += 3000; v.wear = Math.max(v.wear, 70); } } }
    });
    C.money -= R.wages + R.lease + R.fixed + R.repair;
    // folk som slutar
    C.staff = C.staff.filter((w) => { if (w.morale < 15 && C.staff.length > 1) { R.news.push(`${w.name} har sagt upp sig. "Jag orkar inte mer."`); return false; } return true; });
    // rykte och flygbolag
    const pct = r.maxStars ? r.stars / r.maxStars * 100 : 100;
    C.rep = clamp(C.rep + (pct - 70) / 5 - r.diverted * 3, 0, 100); R.rep = C.rep - rep0;
    C.contracts.forEach((c) => {
      const fl = r.flights.filter((f) => f.cid === c.id);
      if (!fl.length) return;
      const avg = fl.reduce((a, f) => a + f.stars, 0) / fl.length, div = fl.filter((f) => f.diverted).length;
      let d = (avg - 2) * 10 - div * 15;
      if (c.trait === 'fast') { const slow = fl.filter((f) => f.turn != null && f.turn > 22).length; d -= slow * 12; if (slow) R.news.push(`${D.airlines[c.al].name} klagar: ${slow} av deras plan stod för länge vid gate.`); }
      if (c.trait === 'picky') { const bad = fl.filter((f) => f.stars < 3).length; d += bad ? -bad * 10 : 4; if (bad) R.news.push(`${D.airlines[c.al].name} är missnöjda: ${bad} av deras plan fick inte tre stjärnor.`); }
      c.sat = clamp(c.sat + d, 0, 100);
    });
    if (r.inspection != null) { C.rep = clamp(C.rep + (r.inspection ? 5 : -4), 0, 100); R.news.push(r.inspection ? 'Inspektionen blev godkänd. Ryktet steg.' : 'Inspektionen blev underkänd. Ryktet sjönk.'); }
    C.contracts = C.contracts.filter((c) => { if (c.sat < 20) { R.news.push(`${D.airlines[c.al].name} är så missnöjda att de sagt upp avtalet.`); return false; } return true; });
    // erfarenhet och befordran
    const xp = r.stars * 5 + r.ontime * 2; C.xp += xp; R.xp = xp;
    while (LEVELS[C.level + 1] && C.xp >= LEVELS[C.level + 1].xp) C.level++;
    if (C.level > lvl0) R.promoted = C.level;
    // nya erbjudanden
    C.offers = C.offers.filter((o) => o.until > C.day);
    const nOff = Math.min(3 - C.offers.length, 1 + (C.rep > 50 ? 1 : 0) + (C.level >= 2 ? 1 : 0));
    for (let i = 0; i < nOff; i++) {
      const pool = Object.entries(AIRLINES).filter(([k, a]) => C.rep >= a.rep && C.level >= a.lvl);
      const [al, a] = pick(pool);
      C.offers.push({ id: nid(), al, size: a.size, cargo: !!a.cargo, trait: a.trait || null, perDay: Math.random() < 0.3 + C.level * 0.1 ? 2 : 1, pay: Math.round(a.base * rnd(0.9, 1.15) / 100) * 100, until: C.day + 3 });
    }
    candidates();
    C.history.push({ day: C.day, pct: Math.round(pct), money: Math.round(C.money), rep: Math.round(C.rep) });
    C.last = R; C.day++; C.next = rollTier();
    save();
    office('report');
  }

  // ---------- kontoret ----------
  let tab = 'report', confirm = null;
  function hideOffice() { $('office').hidden = true; }
  function office(t) {
    if (t) tab = t;
    SH.Rush.closeModal();
    const el = $('office'); el.hidden = false;
    const L = level(), N = LEVELS[C.level + 1], xpP = N ? clamp((C.xp - L.xp) / (N.xp - L.xp), 0, 1) : 1;
    const tabs = [['report', 'Rapport'], ['deals', 'Avtal'], ['staff', 'Personal'], ['fleet', 'Fordon'], ['build', 'Bygg'], ['save', 'Spara']];
    el.innerHTML = `<header><div><h2>Kontoret · ${esc(C.name)}</h2><span class="note">${esc(L.t)} · rykte ${Math.round(C.rep)} / 100</span></div>
      <div class="xpb"><span>${N ? `${C.xp - L.xp} / ${N.xp - L.xp} XP till ${esc(N.t.toLowerCase())}` : 'Högsta nivån'}</span><i><s style="width:${Math.round(xpP * 100)}%"></s></i></div>
      <div class="cash ${C.money < 0 ? 'neg' : ''}">${kr(C.money)}</div></header>
      <nav>${tabs.map(([k, n]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-otab="${k}">${n}</button>`).join('')}</nav>
      <div class="obody">${({ report, deals, staff, fleet, build, saveTab })[tab === 'save' ? 'saveTab' : tab]()}</div>
      <footer><span class="note">I morgon: <b class="tier ${C.next}">${esc(TIERS[C.next || 'normal'].name)}</b> · ${esc(TIERS[C.next || 'normal'].desc)} · ${C.contracts.reduce((a, c) => a + c.perDay, 0)} plan · ${C.staff.length} arbetare · bränsle ${C.fuel}</span>
      <button type="button" class="btn" data-act="menu">Huvudmeny</button><button type="button" class="btn y big" data-c="start" ${C.staff.length ? '' : 'disabled'}>Starta dag ${C.day}</button></footer>`;
  }
  function report() {
    const R = C.last;
    if (!R) return `<h3>Välkommen till ${esc(C.name)}!</h3><p>Du börjar som ramparbetare med tre kollegor, en tankbil, ett bagagetåg och en pushbacktraktor. Två flygbolag flyger hit: Fjällflyg och Nordvind.</p><p>Varje dag skapas av dina <b>avtal</b>. Gör ett bra jobb, så stiger ryktet, fler bolag vill flyga hit och du blir befordrad. Mellan dagarna sitter du här på kontoret och planerar: personal, fordon, service och bygge.</p><p>Första dagen har en guide. Lycka till!</p>`;
    const pct = R.maxStars ? Math.round(R.stars / R.maxStars * 100) : 100, net = R.earned - R.wages - R.lease - R.fixed - R.repair;
    return `<div class="grid2"><div class="card"><h3>Dag ${R.day}${R.tier ? ' · ' + esc(TIERS[R.tier].name) : ''}</h3><div class="kv">
        <span>Plan som kom iväg</span><b>${R.done}</b><span>I tid</span><b>${R.ontime}</b><span>Omdirigerade</span><b>${R.diverted}</b>
        <span>Stjärnor</span><b>${R.stars} / ${R.maxStars} (${pct} %)</b><span>Rykte</span><b>${R.rep >= 0 ? '+' : ''}${R.rep.toFixed(1)}</b><span>Erfarenhet</span><b>+${R.xp} XP</b></div>
        ${R.promoted ? `<div class="promo">Befordrad till <b>${esc(LEVELS[R.promoted].t)}</b>! ${esc(LEVELS[R.promoted].unlock)}</div>` : ''}</div>
      <div class="card"><h3>Ekonomi</h3><div class="kv"><span>Intjänat under dagen</span><b>${kr(R.earned)}</b><span>Löner</span><b>−${kr(R.wages)}</b><span>Leasing</span><b>−${kr(R.lease)}</b><span>Hyra, el och avgifter</span><b>−${kr(R.fixed)}</b>${R.repair ? `<span>Akutreparationer</span><b>−${kr(R.repair)}</b>` : ''}<span class="tot">Dagens resultat</span><b class="tot">${kr(net)}</b></div></div></div>
      ${R.news.length ? `<div class="card"><h3>Nyheter</h3><ul>${R.news.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
      ${C.history.length > 1 ? `<div class="card"><h3>Senaste dagarna</h3><div class="hist">${C.history.slice(-10).map((h) => `<div title="Dag ${h.day}: ${h.pct} %"><i style="height:${Math.max(4, h.pct * 0.8)}px;background:${h.pct >= 80 ? 'var(--mint)' : h.pct >= 55 ? 'var(--sun)' : 'var(--coral)'}"></i><small>${h.day}</small></div>`).join('')}</div></div>` : ''}`;
  }
  function deals() {
    const gates = 2 + (C.built.R1 ? 1 : 0), per = C.contracts.reduce((a, c) => a + c.perDay, 0);
    return `<p class="note">${per} plan per dag på ${gates} gates. Fler avtal ger mer pengar, men dagarna blir tätare, och avgifterna växer med trafiken (${kr(PER_FLIGHT)} per plan och dag).</p>
      <div class="grid2"><div><h3>Erbjudanden</h3>${C.offers.map((o) => `<div class="row"><i class="sw" style="background:${hex(D.airlines[o.al].color)}"></i><div><b>${esc(D.airlines[o.al].name)}</b><small>${C.contracts.some((c) => c.al === o.al && c.size === o.size) ? 'Utökning: ' : ''}${o.perDay} plan per dag · ${D.aircraft[o.size].model}${o.cargo ? ' (frakt)' : ''} · ${kr(o.pay)} per plan + upp till ${kr(STAR_PAY * 3)} i stjärnbonus · gäller till dag ${o.until}</small>${o.trait ? `<small style="color:#b8432f">${esc(TRAIT[o.trait])}</small>` : ''}${o.size === 'L' ? '<small style="color:#3f6fd8">Widebody: tar bara gate A1 eller R1, lång turnaround, 4 bränsle.</small>' : ''}</div><button type="button" class="btn y" data-c="accept:${o.id}">Ta avtalet</button><button type="button" class="btn" data-c="decline:${o.id}">Nej</button></div>`).join('') || '<p class="note">Inga erbjudanden just nu. Bättre rykte lockar fler bolag.</p>'}</div>
      <div><h3>Dina avtal</h3>${C.contracts.map((c) => `<div class="row"><i class="sw" style="background:${hex(D.airlines[c.al].color)}"></i><div><b>${esc(D.airlines[c.al].name)}</b><small>${c.perDay} plan per dag · ${D.aircraft[c.size].model}${c.cargo ? ' (frakt)' : ''} · ${kr(c.pay)} per plan${c.trait ? ' · ' + (c.trait === 'fast' ? 'lågpris' : 'lyx') : ''}</small><span class="bar"><s style="width:${c.sat}%;background:${c.sat > 55 ? 'var(--mint)' : c.sat > 30 ? 'var(--sun)' : 'var(--coral)'}"></s></span><small>Nöjdhet ${Math.round(c.sat)} %</small></div>${confirm === 'cancel' + c.id ? `<button type="button" class="btn r" data-c="cancel:${c.id}">Säg upp</button><button type="button" class="btn" data-c="keep">Behåll</button>` : `<button type="button" class="btn" data-c="askcancel:${c.id}">Säg upp</button>`}</div>`).join('')}</div></div>`;
  }
  const stars = (n) => '★'.repeat(Math.round(n)) + '<span style="opacity:.25">' + '★'.repeat(5 - Math.round(n)) + '</span>';
  function staff() {
    return `<div class="grid2"><div><h3>Ditt lag</h3>${C.staff.map((w) => {
      const cost = 4000 * Math.ceil(w.skill);
      return `<div class="row"><div><b>${esc(w.name)}</b><small>Skicklighet <span class="st">${stars(w.skill)}</span> · lön ${kr(w.wage)}/dag${w.home ? ' · fast på ' + w.home : ''}</small><span class="bar"><s style="width:${w.morale}%;background:${w.morale > 55 ? 'var(--mint)' : w.morale > 25 ? 'var(--sun)' : 'var(--coral)'}"></s></span><small>Moral ${Math.round(w.morale)} %${w.morale < 30 ? ' – riskerar att sluta' : ''}</small></div>
        <button type="button" class="btn" data-c="train:${w.id}" ${w.skill >= 5 || w.trained === C.day || C.money < cost ? 'disabled' : ''}>Utbilda ${kr(cost)}</button>
        <button type="button" class="btn" data-c="bonus:${w.id}" ${C.money < 1500 || w.bonusDay === C.day ? 'disabled' : ''}>Bonus 1 500 kr</button>
        ${confirm === 'fire' + w.id ? `<button type="button" class="btn r" data-c="fire:${w.id}">Säg upp</button>` : `<button type="button" class="btn" data-c="askfire:${w.id}" ${C.staff.length <= 1 ? 'disabled' : ''}>×</button>`}</div>`;
    }).join('')}<p class="note">Trötta arbetare (helt slut under dagen) tappar moral. Under 15 % slutar de. En bonus höjer moralen.</p></div>
      <div><h3>Söker jobb</h3>${C.candidates.map((w) => `<div class="row cand"><div><b>${esc(w.name)}</b><q>"${esc(w.quote)}"</q><small>Skicklighet <span class="st">${stars(w.skill)}</span> · lön ${kr(w.wage)}/dag</small></div><button type="button" class="btn y" data-c="hire:${w.id}" ${C.money < SIGN ? 'disabled' : ''}>Anställ (${kr(SIGN)})</button></div>`).join('') || '<p class="note">Nya sökande kommer i morgon.</p>'}</div></div>`;
  }
  function fleet() {
    const rows = C.fleet.map((v) => {
      const F = FLEET[v.kind], col = v.wear > 70 ? 'var(--coral)' : v.wear > 45 ? 'var(--sun)' : 'var(--mint)';
      return `<div class="row"><div><b>${esc(F.name)}</b><small>${v.owned ? 'Egen' : `Leasad · ${kr(F.lease)}/dag`}${v.home ? ' · ' + (v.home === 'auto' ? 'auto' : 'fast på ' + v.home) : ''}</small><span class="bar"><s style="width:${v.wear}%;background:${col}"></s></span><small>Slitage ${v.wear} %${v.wear > 60 ? ' – risk för haveri' : ''}</small></div>
        <button type="button" class="btn ${v.wear > 50 ? 'y' : ''}" data-c="service:${v.id}" ${v.wear <= 6 || C.money < SERVICE ? 'disabled' : ''}>Service ${kr(SERVICE)}</button>
        ${v.owned ? `<button type="button" class="btn" data-c="sell:${v.id}">Sälj (${kr(F.price * 0.35)})</button>` : `<button type="button" class="btn" data-c="buyout:${v.id}" ${C.money < F.price * 0.7 ? 'disabled' : ''}>Köp ut ${kr(F.price * 0.7)}</button><button type="button" class="btn" data-c="return:${v.id}" ${C.fleet.filter((x) => x.kind === v.kind).length <= 1 ? 'disabled' : ''}>Lämna tillbaka</button>`}</div>`;
    }).join('');
    const belts = Object.entries(C.belts).filter(([g]) => g !== 'R1' || C.built.R1).map(([g, w]) => `<div class="row"><div><b>Bandlastare vid ${g}</b><span class="bar"><s style="width:${w}%;background:${w > 70 ? 'var(--coral)' : w > 45 ? 'var(--sun)' : 'var(--mint)'}"></s></span><small>Slitage ${Math.round(w)} %</small></div><button type="button" class="btn ${w > 50 ? 'y' : ''}" data-c="belt:${g}" ${w <= 6 || C.money < BELT_SERVICE ? 'disabled' : ''}>Service ${kr(BELT_SERVICE)}</button></div>`).join('');
    const shop = Object.entries(FLEET).map(([k, F]) => `<div class="row"><div><b>${esc(F.name)}</b><small>Du har ${C.fleet.filter((v) => v.kind === k).length}${F.desc ? ' · ' + esc(F.desc) : ''}</small></div><button type="button" class="btn y" data-c="buy:${k}" ${C.money < F.price ? 'disabled' : ''}>Köp ${kr(F.price)}</button><button type="button" class="btn" data-c="lease:${k}">Leasa ${kr(F.lease)}/dag</button></div>`).join('');
    return `<div class="grid2"><div><h3>Fordon</h3>${rows}<h3>Bandlastare</h3>${belts}</div><div><h3>Skaffa fler</h3>${shop}
      <h3>Bränsle</h3><div class="row"><div><b>Bränsle i depån: ${C.fuel}</b><small>Ett A320 tar 2, en ATR tar 1.</small></div><button type="button" class="btn y" data-c="fuel" ${C.money < 5000 ? 'disabled' : ''}>+8 för ${kr(5000)}</button></div>
      <p class="note">Slitna fordon går sönder mitt i jobbet. Service mellan dagarna är billigare än ett haveri i rusningen.</p></div></div>`;
  }
  function build() {
    return D.sites.map((s) => {
      const need = SITE_LVL[s.id] || 0, lock = C.level < need;
      return `<div class="row"><div><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></div>${C.built[s.id] ? '<span class="pill ok">Byggd</span>' : lock ? `<span class="pill">Kräver ${esc(LEVELS[need].t.toLowerCase())}</span>` : `<button type="button" class="btn y" data-c="build:${s.id}" ${C.money < s.cost ? 'disabled' : ''}>Bygg ${kr(s.cost)}</button>`}</div>`;
    }).join('') + '<p class="note">Fler byggnader och fritt bygge kommer i ett senare steg (utbyggnad).</p>';
  }
  function saveTab() {
    let code = ''; try { code = 'SKYHUB3:' + btoa(unescape(encodeURIComponent(JSON.stringify(C)))); } catch (e) { code = ''; }
    return `<p>Spelet sparas automatiskt efter varje dag i den här webbläsaren. För att flytta till en annan dator: kopiera koden och klistra in den där.</p>
      <textarea id="cexport" readonly>${esc(code)}</textarea><div class="btns"><button type="button" class="btn y" data-c="copy">Kopiera</button></div>
      <h3>Ladda en sparkod</h3><textarea id="cimport" placeholder="Klistra in en sparkod"></textarea><div class="btns"><button type="button" class="btn" data-c="import">Ladda</button></div><p id="cmsg" class="note"></p>`;
  }
  function action(a) {
    const [cmd, arg] = a.split(':');
    const S = SH.Sfx; let ok = true;
    const w = C.staff.find((x) => String(x.id) === arg), v = C.fleet.find((x) => String(x.id) === arg);
    confirm = null;
    switch (cmd) {
      case 'start': startDay(); return;
      case 'accept': { const o = C.offers.find((x) => String(x.id) === arg); if (o) { const ex = C.contracts.find((c) => c.al === o.al && c.size === o.size); if (ex) { ex.pay = Math.round((ex.pay * ex.perDay + o.pay * o.perDay) / (ex.perDay + o.perDay) / 100) * 100; ex.perDay += o.perDay; } else C.contracts.push({ id: o.id, al: o.al, size: o.size, cargo: o.cargo, trait: o.trait, perDay: o.perDay, pay: o.pay, sat: 65 }); C.offers = C.offers.filter((x) => x !== o); } break; }
      case 'decline': C.offers = C.offers.filter((x) => String(x.id) !== arg); break;
      case 'askcancel': confirm = 'cancel' + arg; break;
      case 'cancel': C.contracts = C.contracts.filter((x) => String(x.id) !== arg); C.rep = clamp(C.rep - 3, 0, 100); break;
      case 'keep': break;
      case 'hire': { const c = C.candidates.find((x) => String(x.id) === arg); if (c && C.money >= SIGN) { C.money -= SIGN; C.staff.push(c); C.candidates = C.candidates.filter((x) => x !== c); } break; }
      case 'askfire': confirm = 'fire' + arg; break;
      case 'fire': C.staff = C.staff.filter((x) => String(x.id) !== arg); break;
      case 'train': if (w) { const cost = 4000 * Math.ceil(w.skill); if (C.money >= cost) { C.money -= cost; w.skill = Math.min(5, Math.floor(w.skill) + 1); w.wage += 120; w.trained = C.day; } } break;
      case 'bonus': if (w && C.money >= 1500) { C.money -= 1500; w.morale = clamp(w.morale + 25, 0, 100); w.bonusDay = C.day; } break;
      case 'service': if (v && C.money >= SERVICE) { C.money -= SERVICE; v.wear = 5; } break;
      case 'belt': if (C.money >= BELT_SERVICE) { C.money -= BELT_SERVICE; C.belts[arg] = 5; } break;
      case 'sell': if (v) { C.money += FLEET[v.kind].price * 0.35; C.fleet = C.fleet.filter((x) => x !== v); } break;
      case 'buyout': if (v && C.money >= FLEET[v.kind].price * 0.7) { C.money -= FLEET[v.kind].price * 0.7; v.owned = true; } break;
      case 'return': if (v) C.fleet = C.fleet.filter((x) => x !== v); break;
      case 'buy': if (C.money >= FLEET[arg].price) { C.money -= FLEET[arg].price; C.fleet.push({ id: nid(), kind: arg, wear: 0, owned: true, home: null }); } break;
      case 'lease': C.fleet.push({ id: nid(), kind: arg, wear: 10, owned: false, home: null }); break;
      case 'fuel': if (C.money >= 5000) { C.money -= 5000; C.fuel += 8; } break;
      case 'build': { const s = D.sites.find((x) => x.id === arg); if (s && C.money >= s.cost && C.level >= (SITE_LVL[arg] || 0)) { C.money -= s.cost; C.built[arg] = true; } break; }
      case 'copy': { const t = $('cexport'); try { navigator.clipboard.writeText(t.value).then(() => ($('cmsg').textContent = 'Kopierat!')); } catch (e) { t.select(); } return; }
      case 'import': { try { const raw = $('cimport').value.trim().replace(/^SKYHUB3:/, ''); const n = JSON.parse(decodeURIComponent(escape(atob(raw)))); if (!n || n.v !== 1) throw 0; C = n; save(); tab = 'report'; } catch (e) { $('cmsg').textContent = 'Koden gick inte att läsa.'; return; } break; }
      default: ok = false;
    }
    if (ok && S) S.click();
    save(); office();
  }

  // ---------- huvudmeny ----------
  function mainMenu() {
    hideOffice();
    const s = load();
    SH.Rush.modal(`<h2>SkyHub</h2><p>Styr plattan på en växande flygplats. Ge order, håll bränslet uppe, hantera det oväntade och bygg ut.</p>
      <div class="days">${s ? `<button type="button" class="day" data-c="continue"><b>Fortsätt karriären</b><span>${esc(s.name)} · dag ${s.day} · ${esc(LEVELS[s.level].t)} · ${kr(s.money)}</span></button>` : ''}
      <div class="day newc"><b>${s ? 'Ny karriär' : 'Starta karriären'}</b><span>Döp din flygplats:</span><input id="cname" maxlength="20" value="Norrvik" aria-label="Flygplatsens namn"><button type="button" class="btn y" data-c="new">${s ? 'Börja om från början' : 'Starta'}</button>${s ? '<small>Din nuvarande karriär skrivs över.</small>' : ''}</div>
      <button type="button" class="day" data-act="days"><b>Utmaningar</b><span>De fyra fristående dagarna med rekord.</span></button></div>
      <p class="small">Kamera: WASD flyttar, Q/E vrider, högerdra lutar, scrolla zoomar. Mellanslag pausar. I: nästa sysslolösa.</p>`);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !b.dataset.c && !b.dataset.otab) return;
    if (b.dataset.otab) { tab = b.dataset.otab; confirm = null; office(); return; }
    const c = b.dataset.c;
    if (c === 'continue') { C = load(); office(C.last ? 'report' : 'report'); return; }
    if (c === 'new') { const n = (($('cname') || {}).value || 'Norrvik').trim().slice(0, 20) || 'Norrvik'; newCareer(n); office('report'); return; }
    if (C) action(c);
  });

  SH.Career = { mainMenu, dayEnd, office, get C() { return C; }, newCareer, startDay, dayConfig, action };
})();
