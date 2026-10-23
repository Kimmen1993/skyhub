// SkyHub – DOM-gränssnitt: HUD, varningar, flygkort, radio, minikarta, driftcentralen och dialoger.
(function () {
  const SH = (window.SH = window.SH || {});
  const D = SH.D, L = D.layout, Sim = SH.Sim;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kr = (v) => Math.round(v).toLocaleString('sv-SE') + ' kr';
  const T = Sim.fmt;
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const ico = (n, sz) => `<svg class="ico"${sz ? ` style="width:${sz}px;height:${sz}px"` : ''}><use href="#i-${n}"/></svg>`;
  const WEEKDAYS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];
  const CAUSE = { ramp: ['Plattan (du)', '#e8634a'], terminal: [D.contractors.terminal.name, '#8b5cf6'], ext: ['Externa firmor', '#f2b134'], atc: [D.contractors.atc.name, '#3f6fd8'], inbound: ['Sen ankomst', '#9aa3b0'] };
  const ring = (pct, col) => { const c = 2 * Math.PI * 15, v = Math.max(0, Math.min(1, pct / 100)) * c; return `<svg class="ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="#ece6d8" stroke-width="6"/><circle cx="20" cy="20" r="15" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${v.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 20 20)"/><circle cx="20" cy="20" r="18.5" fill="none" stroke="#1d2433" stroke-width="2"/></svg>`; };
  const lvl = (v, a, b) => (v >= a ? 'var(--mint)' : v >= b ? 'var(--sun)' : 'var(--coral)');
  const stars = (n) => '★'.repeat(Math.round(n)) + '<span style="opacity:.25">' + '★'.repeat(5 - Math.round(n)) + '</span>';
  const initials = (n) => n.slice(0, 2).toUpperCase();

  function UI(G) {
    const last = {};
    const set = (el, html, key) => { if (last[key] !== html) { el.innerHTML = html; last[key] = html; } };
    let lastMoney = null, radioAt = 0, radioId = 0;

    // ---------- HUD ----------
    function hud() {
      const s = G.s, d = s.day, t = s.t, hh = String(Math.floor((t % 1440) / 60)).padStart(2, '0'), mm = String(Math.floor(t % 60)).padStart(2, '0');
      const onDuty = s.teams.filter((tm) => Sim.teamActive(tm, t)).map((tm) => tm.name.replace('Lag ', '')).join(', ') || 'inget lag';
      set($('status'), `<div class="name">${ico('gate')}<span>${esc(s.name)} flygplats</span></div>
        <div class="clock num"><span>${hh}</span>:<span>${mm}</span></div>
        <div class="meta"><span>Dag ${d.n + 1} · ${WEEKDAYS[d.n % 7]}</span><span>I tjänst: ${esc(onDuty)}</span></div>`, 'status');
      set($('money'), `${ico('money')}<span class="num">${kr(s.money)}</span>`, 'money');
      $('money').classList.toggle('neg', s.money < 0);
      if (lastMoney != null) { const dm = s.money - lastMoney; if (Math.abs(dm) >= 1500) pop(dm); }
      lastMoney = s.money;
      const otp = d.deps ? Math.round((d.ontime / d.deps) * 100) : 100;
      const al = Object.keys(D.airlines), happy = Math.round(al.reduce((a, k) => a + s.happy[k], 0) / al.length);
      set($('kpis'), `<div class="kpi">${ring(otp, '#2bb3a6')}<span>Punktlighet<b>${otp} %</b></span></div>
        <div class="kpi">${ring(s.safety, s.safety >= 85 ? '#6fd39b' : s.safety >= 65 ? '#f2b134' : '#e8634a')}<span>Säkerhet<b>${Math.round(s.safety)} %</b></span></div>
        <div class="kpi">${ring(happy, '#3f6fd8')}<span>Flygbolagen<b>${happy} %</b></span></div>`, 'kpis');
      $('paused').hidden = !(G.speed === 0 || G.opsOpen);
      $('paused').textContent = G.opsOpen ? 'Pausat medan driftcentralen är öppen' : 'Pausat';
      document.querySelectorAll('#speed button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.speed === G.speed)));
      $('modeBtn').textContent = G.mode ? 'Gå ner på golvet' : 'Översikt';
      $('sprint').hidden = G.mode === 1 || G.driving;
      document.querySelectorAll('#dock button').forEach((b) => b.setAttribute('aria-pressed', String(G.opsOpen ? b.dataset.dock === G.opsTab : b.dataset.dock === 'floor')));
      const b = badges();
      document.querySelectorAll('[data-badge]').forEach((el) => { const n = b[el.dataset.badge] || 0; el.hidden = !n; el.textContent = n; });
      radio();
    }
    function pop(dm) {
      const r = $('money').getBoundingClientRect(), el = document.createElement('div');
      el.className = 'pop' + (dm < 0 ? ' minus' : ''); el.textContent = (dm > 0 ? '+' : '−') + Math.abs(Math.round(dm)).toLocaleString('sv-SE');
      el.style.left = r.right + 8 + 'px'; el.style.top = r.top + 4 + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1700);
    }
    function radio() {
      const r = G.s.log.filter((l) => l.kind === 'radio').slice(-1)[0], el = $('radio');
      if (!r) { el.hidden = true; return; }
      if (r.id !== radioId) { radioId = r.id; radioAt = performance.now(); }
      el.hidden = false;
      const [who, ...rest] = r.msg.includes(': "') ? [r.msg.split(':')[0], r.msg.slice(r.msg.indexOf(':') + 1)] : ['TORNET', r.msg];
      set(el, `${ico('radio')}<span><em>${esc(who.toUpperCase())}:</em> ${esc(rest.join(':').trim())}</span>`, 'radio');
      el.classList.toggle('fade', performance.now() - radioAt > 12000);
    }

    // ---------- varningar ----------
    function alertList() {
      const s = G.s, t = s.t, out = [];
      for (const p of s.problems) {
        const P = D.problems[p.type], left = Math.max(0, Math.ceil(p.since + P.auto - t));
        const icon = { breakdown: 'wrench', bridge: 'bridge', fod: 'trash', lost: 'person' }[p.type];
        out.push({ pri: 1, cls: p.type === 'fod' ? 'y' : '', icon, t: Sim.problemTitle(p), s: p.fixAt ? `Mekaniker på väg, klar ${T(p.fixAt)}` : `Personalen löser det själva om ${left} min, men säkerheten sjunker`,
          timer: p.fixAt ? null : 1 - left / P.auto,
          btns: `<button type="button" class="btn y" data-goto="${p.id}">Åk dit</button>${p.fixAt ? '' : `<button type="button" class="btn" data-mech="${p.id}">Mekaniker ${P.mech} min · 1 200 kr</button>`}` });
      }
      for (const f of s.flights) {
        if (f.phase !== 'stand' || !f.tasks) continue;
        for (const k of ['fuel', 'catering', 'clean']) {
          const x = f.tasks[k];
          if (x.st === 'wait' && x.lateUntil && x.lateUntil !== 'pending' && t < x.lateUntil && x.after.every((a) => f.tasks[a].st !== 'wait'))
            out.push({ pri: 2, cls: 'v', icon: k === 'fuel' ? 'fuel' : 'food', t: `${D.contractors[x.ext].name} är sena`, s: `${Sim.TASK_NAME[k]} vid ${f.stand} · ${f.code} · +${Math.ceil(x.lateUntil - t)} min`,
              btns: `<button type="button" class="btn" data-rush="${f.id}:${k}">Skynda på · ${D.firms[x.ext].rush.toLocaleString('sv-SE')} kr</button>` });
        }
      }
      const pl = Sim.plan(s);
      const clash = Object.entries(pl).flatMap(([st, l]) => l.filter((b) => b.clash && !b.locked && b.a < t + 240).map((b) => ({ st, b })))[0];
      if (clash) out.push({ pri: 2, cls: 'b', icon: 'gate', t: `Gatekrock vid ${clash.st}`, s: `${clash.b.f.code} kl ${T(clash.b.a)} krockar med ett annat flyg`, btns: `<button type="button" class="btn y" data-dock="gates">Öppna gateplanen</button>` });
      const avail = Sim.staffAvail(s), onStand = s.flights.some((f) => f.phase === 'stand');
      if (!avail && onStand) out.push({ pri: 0, icon: 'staff', t: 'Ingen personal i tjänst!', s: 'Planen står still tills något lag börjar sitt skift', btns: `<button type="button" class="btn y" data-dock="staff">Personal</button>` });
      s.teams.forEach((tm) => { if (Sim.teamActive(tm, t) && tm.fatigue > 78) out.push({ pri: 3, cls: 'y', icon: 'staff', t: `${tm.name} är slitna (${Math.round(tm.fatigue)} %)`, s: 'Trötta lag jobbar långsammare', btns: `<button type="button" class="btn" data-break="${tm.id}">Ge rast 20 min</button>` }); });
      s.units.forEach((u) => { if (u.wear > 85 && !u.broken && !u.serviceUntil) out.push({ pri: 4, cls: 'y', icon: 'gear', t: `${D.equipment[u.type].name} #${u.num} är sliten (${Math.round(u.wear)} %)`, s: 'Risk för haveri', btns: (u.state === 'idle' || u.state === 'return') ? `<button type="button" class="btn" data-service="${u.id}">Service · ${D.service.cost.toLocaleString('sv-SE')} kr</button>` : '<span class="s">Upptagen just nu</span>' }); });
      return out.sort((a, b) => a.pri - b.pri);
    }
    function alerts() {
      const list = alertList(), show = list.slice(0, 4);
      set($('alerts'), show.map((a) => `<div class="panel alert ${a.cls || ''}"><span class="ic">${ico(a.icon)}</span><span class="t">${esc(a.t)}</span><span class="s">${esc(a.s)}</span>${a.timer != null ? `<span class="timer"><i style="width:${Math.round(a.timer * 100)}%"></i></span>` : ''}<span class="row">${a.btns}</span></div>`).join('') + (list.length > 4 ? `<div class="more">+${list.length - 4} till</div>` : ''), 'alerts');
    }
    function badges() {
      const s = G.s, t = s.t, pl = Sim.plan(s);
      return {
        gates: Object.values(pl).flat().filter((b) => b.clash && !b.locked && b.a < t + 240).length,
        staff: s.teams.filter((tm) => Sim.teamActive(tm, t) && tm.fatigue > 78).length + (!Sim.staffAvail(s) && s.flights.some((f) => f.phase === 'stand') ? 1 : 0),
        equip: s.units.filter((u) => u.broken || u.wear > 85).length,
        firms: s.flights.filter((f) => f.phase === 'stand' && f.tasks && ['fuel', 'catering', 'clean'].some((k) => f.tasks[k].lateUntil && f.tasks[k].lateUntil !== 'pending' && t < f.tasks[k].lateUntil)).length,
      };
    }

    // ---------- flygkort ----------
    const LANES = [['Avstigning', ['connect', 'deboard']], ['Bagage', ['unload', 'load']], ['Tankning', ['fuel']], ['Städ/catering', ['clean', 'catering']], ['Boarding', ['board', 'close']], ['Pushback', ['push']]];
    function flightCard() {
      const s = G.s, el = $('flight');
      let f = G.selected && s.flights.find((x) => x.id === G.selected), auto = false;
      if (!f) { f = s.flights.filter((x) => x.phase === 'stand' && x.tasks).sort((a, b) => a.std - b.std)[0]; auto = !!f; }
      if (!f || G.mode === 1 && !G.selected) { el.hidden = true; last.flight = null; return; }
      el.hidden = false;
      const al = D.airlines[f.al], [txt, cls] = Sim.status(s, f), t = s.t;
      let body = '', why = '';
      if (f.tasks) {
        const t0 = f.onBlock, t1 = Math.max(f.std + 20, t + 10), W = t1 - t0, X = (v) => Math.max(0, Math.min(100, ((v - t0) / W) * 100));
        const info = Sim.taskInfo(s, f);
        const blocked = info.find((x) => x.ready && x.st !== 'done' && /Ingen|sena|Väntar på sena|Väntar på väskor|Stoppad|Inget lag|fri taxilinje/.test(x.txt));
        if (blocked) why = `Håller upp: ${blocked.name.toLowerCase()}. ${blocked.txt}.`;
        body = `<div class="lane">${LANES.map(([name, ks]) => {
          const bars = ks.map((k) => {
            const x = f.tasks[k], inf = info.find((i) => i.k === k);
            if (x.st === 'done') return `<i style="left:${X(x.end - x.dur)}%;width:${Math.max(2, X(x.end) - X(x.end - x.dur))}%;background:var(--mint)"></i>`;
            if (x.st === 'run') { const end = Math.max(x.end, t + 1); return `<i style="left:${X(x.end - x.dur)}%;width:${Math.max(2, X(end) - X(x.end - x.dur))}%;background:${x.paused ? 'var(--coral)' : 'var(--teal)'}"></i>`; }
            const bad = inf && inf.ready && /Ingen|sena|Inget lag/.test(inf.txt);
            return `<i style="left:${X(t)}%;width:${Math.max(3, X(t + Math.max(2, x.dur)) - X(t))}%;background:${bad ? 'var(--coral)' : '#d8dde6'}"></i>`;
          }).join('');
          return `<span>${name}</span><span class="track">${bars}<span class="stdl" style="left:${X(f.std)}%"></span><span class="nowl" style="left:${X(t)}%"></span></span>`;
        }).join('')}</div>`;
      } else body = `<span class="sub">${f.phase === 'sched' ? `Landar vid ${f.stand} ${T(f.sta)}.` : f.phase === 'holding' ? `Väntar i luften: ${f.holdCause === 'ramp' ? `gate ${f.stand} är upptagen.` : `${D.contractors.atc.name} släpper in i sin egen takt.`}` : 'Rullar.'}</span>`;
      const tot = Object.values(f.cause).reduce((a, b) => a + b, 0);
      const causes = tot ? `<div style="display:flex;gap:4px;flex-wrap:wrap">${Object.entries(f.cause).filter(([, v]) => v).map(([k, v]) => `<span class="pill" style="background:${CAUSE[k][1]};color:#fff">${esc(CAUSE[k][0])} ${v} min</span>`).join('')}</div>` : '';
      set(el, `${G.selected ? '<button type="button" class="x" data-unselect="1" aria-label="Stäng">×</button>' : ''}
        <h3><i class="sw" style="background:${hex(al.color)}"></i>${esc(f.code)} → ${esc(f.to)} <span class="pill ${cls || 'muted'}">${esc(txt)}</span></h3>
        <span class="sub">${auto ? 'Närmast avgång · ' : ''}Gate ${f.stand} · ${D.aircraft[f.size].model} · avgång ${T(f.std)} · ${f.paxOut} pax</span>
        ${why ? `<span class="why">${esc(why)}</span>` : ''}${causes}${body}`, 'flight');
    }

    // ---------- minikarta ----------
    const MX0 = -150, MX1 = 170, MZ0 = -130, MZ1 = 10;
    function minimap(manager) {
      const c = $('miniC'), x = c.getContext('2d'), W = c.width, H = c.height, k = Math.min(W / (MX1 - MX0), H / (MZ1 - MZ0));
      const ox = (W - (MX1 - MX0) * k) / 2, oy = (H - (MZ1 - MZ0) * k) / 2;
      const P = (wx, wz) => [ox + (wx - MX0) * k, oy + (MZ1 - wz) * k];
      const rect = (x0, z0, x1, z1, col) => { const [a, b] = P(x0, z1), [c2, d] = P(x1, z0); x.fillStyle = col; x.fillRect(a, b, c2 - a, d - b); };
      x.fillStyle = '#86c96a'; x.fillRect(0, 0, W, H);
      rect(MX0, 0, MX1, MZ1, '#f4efe6'); rect(L.terminal.x0, 0, L.terminal.x1, 8, '#2e3a52');
      rect(L.laneX[0] - 14, L.taxilaneZ - 12, L.laneX[1] + 14, 0, '#d9dee5'); rect(L.laneX[0] - 14, -7, L.laneX[1] + 14, -1, '#6b7489');
      rect(L.threshold - 6, L.taxiwayZ - 5, L.laneX[1] + 6, L.taxiwayZ + 5, '#535b6e'); rect(L.runwayX[0], L.runwayZ - 9, L.runwayX[1], L.runwayZ + 9, '#474e60');
      x.strokeStyle = '#f2b134'; x.lineWidth = 2; x.beginPath(); let [a, b] = P(L.laneX[0], L.taxilaneZ); x.moveTo(a, b); [a, b] = P(L.laneX[1], L.taxilaneZ); x.lineTo(a, b); x.stroke();
      x.font = '700 15px Fredoka, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#5d6779';
      L.stands.forEach((st) => { const [sx, sz] = P(st.x, -30); x.fillText(st.id, sx, sz + 5); });
      const s = G.s;
      s.units.concat(s.ext).forEach((u) => { const [ux, uz] = P(u.x, u.z); x.fillStyle = u.broken ? '#e8634a' : '#3c4a63'; x.fillRect(ux - 2, uz - 2, 4, 4); });
      s.flights.forEach((f) => {
        if (!['approach', 'rollout', 'taxiIn', 'stand', 'pushback', 'taxiOut', 'hold', 'takeoff'].includes(f.phase)) return;
        const [fx, fz] = P(f.x, f.z), A = D.aircraft[f.size], len = A.len * k * 0.9;
        x.save(); x.translate(fx, fz); x.rotate(f.hd); x.fillStyle = hex(D.airlines[f.al].color); x.strokeStyle = '#1d2433'; x.lineWidth = 2;
        x.beginPath(); x.rect(-3.5, -len / 2, 7, len); x.fill(); x.stroke(); x.fillRect(-len * 0.45, -len * 0.05, len * 0.9, 4); x.restore();
        if (G.selected === f.id) { x.strokeStyle = '#e8634a'; x.lineWidth = 3; x.beginPath(); x.arc(fx, fz, len * 0.7, 0, 7); x.stroke(); }
      });
      s.problems.forEach((p) => { const [px, pz] = P(p.x, p.z); x.fillStyle = '#e8634a'; x.strokeStyle = '#1d2433'; x.lineWidth = 2; x.beginPath(); x.arc(px, pz, 9, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.fillText('!', px, pz + 5); });
      if (manager) { const [mx, mz] = P(manager.x, manager.z); x.fillStyle = '#f2b134'; x.strokeStyle = '#1d2433'; x.lineWidth = 2.5; x.beginPath(); x.arc(mx, mz, 7, 0, 7); x.fill(); x.stroke(); }
      G.miniToWorld = (u, v) => ({ x: MX0 + (u * W - ox) / k, z: MZ1 - (v * H - oy) / k });
    }

    // ---------- driftcentralen ----------
    function openOps(tab) { G.opsOpen = true; G.opsTab = tab; $('ops').hidden = false; $('opsDim').hidden = false; last.ops = null; ops(true); hud(); }
    function closeOps() { G.opsOpen = false; $('ops').hidden = true; $('opsDim').hidden = true; hud(); }
    let dragging = null;
    function ops(force) {
      if (!G.opsOpen || dragging) return;
      document.querySelectorAll('#otabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.otab === G.opsTab)));
      const html = { gates: opsGates, staff: opsStaff, equip: opsEquip, firms: opsFirms, money: opsMoney }[G.opsTab]();
      if (force) last.ops = null;
      set($('opsBody'), html, 'ops');
    }
    const PXH = 60;
    function ganttWindow(s) { const a = Math.floor((s.t - 90) / 60) * 60; return [a, a + 20 * 60]; }
    function opsGates() {
      const s = G.s, pl = Sim.plan(s), [g0, g1] = ganttWindow(s), X = (v) => ((v - g0) / 60) * PXH, width = X(g1);
      let h = `<div class="gwrap"><div class="gantt" id="gantt" style="width:${width + 72}px"><div class="ghead"><span></span><div class="hrs">${Array.from({ length: 21 }, (_, i) => `<span style="left:${i * PXH}px">${T(g0 + i * 60).slice(0, 2)}</span>`).join('')}</div></div>`;
      L.stands.forEach((st) => {
        h += `<div class="grow" data-row="${st.id}"><span class="lab">${st.id}<small>${st.contact ? 'brygga' : 'buss + trappa'}</small></span><div class="tl">`;
        (pl[st.id] || []).forEach((b) => {
          if (b.b < g0 || b.a > g1) return;
          const f = b.f, l = X(Math.max(b.a, g0)), w = Math.max(44, X(Math.min(b.b, g1)) - l);
          h += `<span class="blk ${b.locked ? 'locked' : ''} ${b.clash ? 'clash' : ''} ${G.selected === f.id ? 'sel' : ''}" data-blk="${f.id}" style="left:${l}px;width:${w}px;background:${hex(D.airlines[f.al].color)}" title="${esc(f.code)} ${T(b.a)}–${T(b.b)}">${esc(f.code)}<small>${T(b.a)}–${T(b.b)}</small></span>`;
        });
        h += `</div></div>`;
      });
      h += `<span class="nowline" style="left:${72 + X(s.t)}px"></span></div></div>`;
      // infobalk
      const sel = G.selected && s.flights.find((f) => f.id === G.selected);
      const clash = Object.entries(pl).flatMap(([st, l]) => l.filter((b) => b.clash && !b.locked).map((b) => ({ st, b })))[0];
      let info;
      if (clash) {
        const f = clash.b.f, alt = L.stands.find((st) => st.id !== f.stand && (pl[st.id] || []).every((b) => f.std + 10 <= b.a || f.sta - 10 >= b.b));
        info = `<div class="infobar"><span class="pill bad">Krock</span><span class="g2">${esc(f.code)} ska stå vid <b>${clash.st}</b> ${T(clash.b.a)}–${T(clash.b.b)}, men gaten är inte ledig i tid.${alt ? ` <b>${alt.id}</b> är ledig.` : ''}</span>${alt ? `<button type="button" class="btn y" data-move="${f.id}:${alt.id}">Flytta till ${alt.id}</button>` : ''}<button type="button" class="btn" data-autoassign="1">Fördela automatiskt</button></div>`;
      } else info = `<div class="infobar okb"><span class="pill ok">Inga krockar</span><span class="g2">Planen håller. Dra ett flyg till en annan gate för att ändra.</span><button type="button" class="btn" data-autoassign="1">Fördela automatiskt</button></div>`;
      const selInfo = sel ? `<div class="infobar" style="background:#fff"><i class="sw" style="background:${hex(D.airlines[sel.al].color)}"></i><span class="g2"><b>${esc(sel.code)}</b> ${esc(sel.from)} → ${esc(sel.to)} · ${D.aircraft[sel.size].model} · gate ${sel.stand} · ankomst ${T(sel.sta)} · avgång ${T(sel.std)} · ${Sim.status(s, sel)[0]}</span></div>` : '';
      return h + info + selInfo + `<p class="note">Dra flygen mellan gates. Streckade block har redan landat och går inte att flytta. Kontaktgates (brygga) ger snabbare av- och påstigning. Fjärrplatser kräver buss och trappbil.</p>`;
    }
    function opsStaff() {
      const s = G.s, t = s.t, avail = Sim.staffAvail(s);
      const cards = s.teams.map((tm) => {
        const act = Sim.teamActive(tm, t), on = Sim.onShift(tm, t);
        const st = tm.trainUntil > t ? `<span class="pill info">Utbildning till ${T(tm.trainUntil)}</span>` : tm.breakUntil > t ? `<span class="pill warn">Rast till ${T(tm.breakUntil)}</span>` : on ? '<span class="pill ok">I tjänst</span>' : '<span class="pill muted">Ledig</span>';
        const skill = tm.members.reduce((a, m) => a + m.skill, 0) / Math.max(1, tm.members.length);
        const cost = tm.members.reduce((a, m) => a + m.wage, 0) * (tm.shift[1] - tm.shift[0]);
        return `<div class="team"><h3><i class="sw" style="background:${tm.color}"></i>${esc(tm.name)} ${st}</h3>
          <div class="shift">Skift ${String(tm.shift[0]).padStart(2, '0')}–${String(tm.shift[1]).padStart(2, '0')}
            <button type="button" class="btn" data-shift="${tm.id}:-1" title="Börja och sluta en timme tidigare">◀ tidigare</button><button type="button" class="btn" data-shift="${tm.id}:1" title="Börja och sluta en timme senare">senare ▶</button></div>
          <div class="faces">${tm.members.map((m) => `<span class="face" title="${esc(m.name)}: kompetens ${m.skill}, fart ${m.speed}, ${m.wage} kr/h">${esc(m.name)} <span class="stars" style="font-size:11px">${'★'.repeat(m.skill)}</span><button type="button" data-fire="${tm.id}:${m.id}" aria-label="Säg upp ${esc(m.name)}" title="Säg upp">×</button></span>`).join('')}</div>
          <div class="bar2"><span>Trötthet</span><span><i style="width:${Math.round(tm.fatigue)}%;background:${tm.fatigue > 75 ? 'var(--coral)' : tm.fatigue > 45 ? 'var(--sun)' : 'var(--mint)'}"></i></span><span class="num">${Math.round(tm.fatigue)} %</span></div>
          <div class="bar2"><span>Kompetens</span><span><i style="width:${Math.round(skill / 5 * 100)}%;background:var(--teal)"></i></span><span class="stars">${'★'.repeat(Math.round(skill))}</span></div>
          <div class="shift"><button type="button" class="btn" data-break="${tm.id}" ${!act ? 'disabled' : ''}>Ge rast 20 min</button><button type="button" class="btn" data-train="${tm.id}" ${tm.trainUntil > t || s.money < D.training.cost ? 'disabled' : ''}>Utbildning 2 h · 15 000 kr</button></div>
          <span class="note">${tm.members.length} personer · ca ${kr(cost)} per skift</span></div>`;
      }).join('');
      const cands = s.candidates.map((c) => `<div class="cand"><b>${esc(c.name)}</b><q>"${esc(c.quote || '')}"</q><span>Kompetens <span class="stars">${stars(c.skill)}</span> · Fart ${'●'.repeat(c.speed)}${'○'.repeat(5 - c.speed)}</span><span>${c.wage} kr/h</span>
        <span class="row">Anställ i: ${s.teams.map((tm) => `<button type="button" class="btn" data-hire="${c.id}:${tm.id}" style="border-color:var(--ink);background:${tm.color};color:#fff">${esc(tm.name.replace('Lag ', ''))}</button>`).join('')}</span></div>`).join('');
      return `<div class="infobar okb"><span class="g2">I tjänst nu: <b>${avail}</b> personer, varav <b>${s.staff.busy}</b> upptagna. Arbetstakt <b>${Math.round(100 / Sim.workFactor(s))} %</b> (trötthet och kompetens).</span></div>
        <div class="cards">${cards}</div>
        <span class="sec">Söker jobb i dag</span><div class="cards">${cands || '<p class="note">Inga fler sökande i dag. Nya kommer i morgon.</p>'}</div>
        <p class="note">Lön betalas bara under skiftet. Trötta lag jobbar långsammare. Se till att något lag är i tjänst när de tidiga och sena flygen kommer.</p>`;
    }
    function unitStatus(u, s) {
      if (u.broken) return '<span class="pill bad">Trasig</span>';
      if (u.serviceUntil) return `<span class="pill info">Service till ${T(u.serviceUntil)}</span>`;
      if (u.job) { const f = s.flights.find((x) => x.id === u.job.f); return `<span class="pill ${u.state === 'travel' ? 'warn' : 'ok'}">${u.state === 'travel' ? 'På väg' : 'I arbete'}${f ? ' · ' + f.stand : ''}</span>`; }
      return '<span class="pill muted">Ledig</span>';
    }
    function opsEquip() {
      const s = G.s;
      const rows = s.units.slice().sort((a, b) => a.type.localeCompare(b.type) || a.num - b.num).map((u) => {
        const E = D.equipment[u.type], col = u.wear > 85 ? 'var(--coral)' : u.wear > 55 ? 'var(--sun)' : 'var(--mint)';
        const canService = (u.state === 'idle' || u.state === 'return') && !u.serviceUntil && u.wear > 15;
        return `<tr><td>${esc(E.name)} #${u.num}</td><td>${unitStatus(u, s)}</td><td><span class="wear"><i style="width:${Math.round(u.wear)}%;background:${col}"></i></span><span class="num">${Math.round(u.wear)} %</span></td>
          <td>${u.owned ? 'Egen' : `Leasad · ${E.lease.toLocaleString('sv-SE')} kr/dag`}</td>
          <td style="white-space:nowrap">${canService ? `<button type="button" class="btn y" data-service="${u.id}">Service · ${D.service.cost.toLocaleString('sv-SE')} kr</button> ` : ''}${u.owned ? '' : `<button type="button" class="btn" data-buyout="${u.id}" ${s.money < E.price * 0.75 ? 'disabled' : ''}>Köp ut · ${kr(E.price * 0.75)}</button>`}</td></tr>`;
      }).join('');
      const shop = Object.entries(D.equipment).map(([k, E]) => `<div class="item"><b>${esc(E.name)}</b><span>${esc(E.desc)}</span><span class="price">${kr(E.price)}</span><span>Du har ${s.units.filter((u) => u.type === k).length} st</span><button type="button" class="btn y" data-buy="${k}" ${s.money < E.price ? 'disabled' : ''}>Köp</button></div>`).join('');
      return `<table class="tbl"><thead><tr><th>Fordon</th><th>Status</th><th>Slitage</th><th>Ägande</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        <span class="sec">Köp nytt</span><div class="shop">${shop}</div>
        <p class="note">Slitna fordon går sönder oftare. Service tar ${D.service.minutes} minuter i depån. Leasing är billigt i dag men dyrt i längden.</p>`;
    }
    function opsFirms() {
      const s = G.s, t = s.t;
      const cards = ['fuel', 'catering', 'cleaning'].map((k) => {
        const C = D.contractors[k], prem = s.firms[k], rel = Math.round((1 - C.late * (prem ? 0.35 : 1)) * 100);
        const late = s.flights.filter((f) => f.phase === 'stand' && f.tasks).flatMap((f) => Object.entries(f.tasks).filter(([tk, x]) => x.ext === k && x.lateUntil && x.lateUntil !== 'pending' && t < x.lateUntil && x.st === 'wait').map(([tk]) => ({ f, tk })));
        return `<div class="team"><h3>${ico(k === 'fuel' ? 'fuel' : k === 'catering' ? 'food' : 'trash')}${esc(C.name)}</h3>
          <div class="bar2"><span>Pålitlighet</span><span><i style="width:${rel}%;background:${lvl(rel, 85, 70)}"></i></span><span class="num">${rel} %</span></div>
          <span class="note">${prem ? `Premiumavtal · ${D.firms[k].premium.toLocaleString('sv-SE')} kr/dag` : 'Standardavtal'}</span>
          ${late.map(({ f, tk }) => `<div class="shift">${esc(f.code)} vid ${f.stand}: +${Math.ceil(f.tasks[tk].lateUntil - t)} min <button type="button" class="btn" data-rush="${f.id}:${tk}">Skynda på · ${D.firms[k].rush.toLocaleString('sv-SE')} kr</button></div>`).join('')}
          <button type="button" class="btn ${prem ? '' : 'y'}" data-premium="${k}:${prem ? 0 : 1}">${prem ? 'Gå tillbaka till standard' : `Teckna premiumavtal · ${D.firms[k].premium.toLocaleString('sv-SE')} kr/dag`}</button></div>`;
      }).join('');
      const d = s.day;
      return `<div class="cards">${cards}</div>
        <span class="sec">Entreprenörerna (tas över i senare kapitel)</span>
        <div class="cards"><div class="team" style="background:var(--paper-2)"><h3>${ico('radio')}${esc(D.contractors.atc.name)} <span class="pill muted">Kapitel 2</span></h3><span class="note">${esc(D.contractors.atc.note)} I dag: ${d.cause.atc} min förseningar.</span></div>
        <div class="team" style="background:var(--paper-2)"><h3>${ico('staff')}${esc(D.contractors.terminal.name)} <span class="pill muted">Kapitel 3</span></h3><span class="note">"${esc(D.contractors.terminal.slogan)}". I dag: ${d.cause.terminal} min förseningar från sena passagerare och väskor.</span></div></div>`;
    }
    function opsMoney() {
      const s = G.s, d = s.day, inc = Object.values(d.inc).reduce((a, b) => a + b, 0), cost = Object.values(d.cost).reduce((a, b) => a + b, 0);
      const hist = s.history.slice(-7), max = Math.max(1, ...hist.map((h) => Math.abs(h.inc - h.cost)));
      const chart = hist.length ? `<div class="chart">${hist.map((h) => { const n = h.inc - h.cost; return `<div title="Dag ${h.n + 1}: ${kr(n)}"><i style="height:${Math.max(3, Math.round(Math.abs(n) / max * 80))}px;background:${n >= 0 ? 'var(--mint)' : 'var(--coral)'}"></i>D${h.n + 1}</div>`; }).join('')}</div>` : '<p class="note">Diagrammet fylls på efter första dagen.</p>';
      const lease = s.units.reduce((a, u) => a + (u.owned ? 0 : D.equipment[u.type].lease), 0);
      const staffDay = s.teams.reduce((a, tm) => a + tm.members.reduce((b, m) => b + m.wage, 0) * (tm.shift[1] - tm.shift[0]), 0);
      return `<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))"><div class="team"><h3>I dag hittills</h3><div class="kv">
          <span>Landningsavgifter</span><span class="num">${kr(d.inc.landing)}</span><span>Marktjänst</span><span class="num">${kr(d.inc.handling)}</span><span>Nattparkering</span><span class="num">${kr(d.inc.parking)}</span>
          <span>Löner</span><span class="num">−${kr(d.cost.staff)}</span><span>Leasing</span><span class="num">−${kr(d.cost.lease)}</span><span>Fasta kostnader</span><span class="num">−${kr(d.cost.fixed || 0)}</span><span>Ersättningar</span><span class="num">−${kr(d.cost.comp)}</span><span>Köp, service och övrigt</span><span class="num">−${kr(d.cost.other)}</span>
          <span class="tot">Resultat</span><span class="tot num">${kr(inc - cost)}</span></div></div>
        <div class="team"><h3>Per dygn</h3><div class="kv"><span>Löner (planerat)</span><span class="num">${kr(staffDay)}</span><span>Leasing</span><span class="num">${kr(lease)}</span><span>Fasta kostnader</span><span class="num">${kr(D.fixedCost)}</span><span>Premiumavtal</span><span class="num">${kr(Object.entries(s.firms).reduce((a, [k, on]) => a + (on ? D.firms[k].premium : 0), 0))}</span></div>
        <span class="sec">Resultat senaste dagarna</span>${chart}</div></div>`;
    }

    // drag i gateplanen
    function bindGantt() {
      $('opsBody').addEventListener('pointerdown', (e) => {
        const blk = e.target.closest('.blk'); if (!blk) return;
        const fid = +blk.dataset.blk;
        if (blk.classList.contains('locked')) { G.selected = fid; last.ops = null; ops(); return; }
        blk.setPointerCapture(e.pointerId);
        dragging = { blk, fid, y0: e.clientY, moved: false, row: null };
      });
      $('opsBody').addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dy = e.clientY - dragging.y0; if (Math.abs(dy) > 5) dragging.moved = true;
        if (!dragging.moved) return;
        dragging.blk.classList.add('dragging'); dragging.blk.style.transform = `translateY(${dy}px)`;
        document.querySelectorAll('.grow').forEach((r) => { const rc = r.getBoundingClientRect(); const on = e.clientY >= rc.top && e.clientY < rc.bottom; r.classList.toggle('drop', on); if (on) dragging.row = r.dataset.row; });
      });
      const end = () => {
        if (!dragging) return;
        const d = dragging; dragging = null;
        document.querySelectorAll('.grow').forEach((r) => r.classList.remove('drop'));
        if (d.moved && d.row) {
          const f = G.s.flights.find((x) => x.id === d.fid);
          if (f && d.row !== f.stand && Sim.reassign(G.s, d.fid, d.row)) toast({ msg: `${f.code} flyttad till ${d.row}.`, kind: 'good' });
        } else G.selected = d.fid;
        last.ops = null; ops();
      };
      $('opsBody').addEventListener('pointerup', end);
      $('opsBody').addEventListener('pointercancel', end);
    }
    bindGantt();

    // ---------- toasts och dialoger ----------
    function toast(entry) {
      const el = document.createElement('div');
      el.className = 'toast panel ' + entry.kind; el.textContent = entry.msg;
      $('toasts').appendChild(el);
      while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
      setTimeout(() => el.remove(), entry.kind === 'bad' ? 6000 : 4200);
    }
    function modal(html) { const m = $('modal'); m.innerHTML = `<div class="dialog panel" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; G.modalOpen = true; }
    function close() { $('modal').hidden = true; $('modal').innerHTML = ''; G.modalOpen = false; }
    function intro(fresh) {
      modal(`<h2>Välkommen, ny plattchef!</h2>
        <p>Kommunen har köpt den gamla regionala flygplatsen och anställt dig för att få ordning på <b>plattan</b>: gates, marktjänst, bagage och allt som rullar mellan planen.</p>
        <p>Tornet sköts av <b>${esc(D.contractors.atc.name)}</b>, som är lite väl försiktiga. Terminalen sköts av <b>${esc(D.contractors.terminal.name)}</b>, med slogan "${esc(D.contractors.terminal.slogan)}". De menar det tyvärr.</p>
        ${fresh ? `<h3>Vad heter din flygplats?</h3><input id="nameIn" maxlength="22" value="Norrvik" aria-label="Flygplatsens namn">` : ''}
        <h3>Så spelar du</h3>
        <ul>
          <li><b>På golvet</b> går du runt som chef. Varningar dyker upp till höger. Spring dit och tryck <b>F</b>, eller skicka en mekaniker.</li>
          <li><b>Menyraden</b> längst ner öppnar driftcentralen: gateplanering, personal, utrustning, externa firmor och ekonomi. Spelet pausar medan den är öppen.</li>
          <li><b>Klicka på ett plan</b> för att följa dess turnaround och se vad som håller upp det.</li>
          <li><b>Styrning:</b> WASD eller klick för att gå, Shift för att springa, dra för att vrida och luta kameran, scrolla för att zooma. Den gula Follow me-bilen står vid depån.</li>
        </ul>
        <div class="btns"><button type="button" class="btn y" data-act="${fresh ? 'start' : 'close'}">${fresh ? 'Börja första passet' : 'Fortsätt'}</button></div>`);
    }
    function menu() {
      modal(`<h2>Meny</h2>
        <div class="btns"><button type="button" class="btn y" data-act="close">Fortsätt</button><button type="button" class="btn" data-act="save">Spara nu</button><button type="button" class="btn" data-act="transfer">Flytta sparfil</button><button type="button" class="btn" data-act="help">Hur spelar man?</button><button type="button" class="btn r" data-act="askNew">Nytt spel</button></div>
        <p id="menuMsg" class="note">Spelet sparas automatiskt varje speltimme i den här webbläsaren.</p>`);
    }
    function transfer() {
      modal(`<h2>Flytta sparfil</h2>
        <p>Sparningen ligger i webbläsaren. Vill du fortsätta på en annan dator kopierar du koden, skickar den till dig själv och klistrar in den där.</p>
        <textarea id="exportCode" readonly>${esc(G.exportCode())}</textarea>
        <div class="btns"><button type="button" class="btn y" data-act="copy">Kopiera kod</button></div>
        <h3>Ladda en sparfil</h3>
        <textarea id="importCode" placeholder="Klistra in en sparkod här"></textarea>
        <div class="btns"><button type="button" class="btn" data-act="import">Ladda</button><button type="button" class="btn" data-act="menu">Tillbaka</button></div>
        <p id="transferMsg" style="font-weight:700"></p>`);
    }
    function askNew() {
      modal(`<h2>Nytt spel?</h2><p>Din nuvarande flygplats skrivs över. Kopiera sparkoden först om du vill kunna komma tillbaka.</p>
        <h3>Vad ska den nya flygplatsen heta?</h3><input id="nameIn" maxlength="22" value="${esc(G.s.name)}" aria-label="Flygplatsens namn">
        <div class="btns"><button type="button" class="btn r" data-act="newGame">Börja om</button><button type="button" class="btn" data-act="menu">Avbryt</button></div>`);
    }
    function report(r) {
      const d = r.d, inc = r.inc, cost = r.cost, tot = Object.values(d.cause).reduce((a, b) => a + b, 0) || 1;
      const bars = Object.entries(d.cause).map(([k, v]) => `<div class="cbar"><span>${esc(CAUSE[k][0])}</span><span><i style="width:${Math.max(2, Math.round(v / tot * 100))}%;background:${CAUSE[k][1]}"></i></span><span class="num">${v} min</span></div>`).join('');
      const verdict = r.otp >= 90 ? 'Ett riktigt bra pass. Flygbolagen märker det.' : r.otp >= 75 ? 'Helt okej. Det finns marginaler att hämta.' : 'Tungt pass. Titta på vad som höll upp planen.';
      modal(`<h2>Dag ${d.n + 1} är slut</h2><p style="font-weight:700">${verdict}</p>
        <div class="kv"><span>Avgångar</span><span class="num">${d.deps}</span><span>Punktlighet (≤15 min)</span><span class="num">${r.otp} %</span><span>Omdirigerade</span><span class="num">${d.diverted}</span><span>Säkerhet</span><span class="num">${r.safety} %</span></div>
        <h3>Vad orsakade förseningarna?</h3>${bars}
        <h3>Ekonomi</h3>
        <div class="kv"><span>Intäkter</span><span class="num">${kr(inc)}</span><span>Kostnader</span><span class="num">−${kr(cost)}</span><span class="tot">Resultat</span><span class="tot num">${kr(inc - cost)}</span></div>
        <div class="btns"><button type="button" class="btn y" data-act="close">Nästa dag</button></div>`);
    }

    function tick(managerPos) { hud(); alerts(); flightCard(); ops(); minimap(managerPos); }
    return { tick, hud, ops, openOps, closeOps, toast, modal, close, intro, menu, transfer, askNew, report };
  }
  SH.UI = UI;
})();
