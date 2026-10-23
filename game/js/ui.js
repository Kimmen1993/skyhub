// SkyHub – DOM-gränssnitt: HUD, tidtabell, problem, turnaround-kort, dialoger.
(function () {
  const SH = (window.SH = window.SH || {});
  const D = SH.D, Sim = SH.Sim;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kr = (v) => Math.round(v).toLocaleString('sv-SE') + ' kr';
  const T = Sim.fmt;
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const CAUSE = { ramp: ['Plattan (du)', '#e8634a'], terminal: [D.contractors.terminal.name, '#8b5cf6'], ext: ['Externa firmor', '#f2b134'], atc: [D.contractors.atc.name, '#3f6fd8'], inbound: ['Sen ankomst', '#9aa3b0'] };

  function UI(G) {
    const last = {};
    const set = (el, html, key) => { if (last[key] !== html) { el.innerHTML = html; last[key] = html; } };

    function hud() {
      const s = G.s, d = s.day, otp = d.deps ? Math.round((d.ontime / d.deps) * 100) : 100;
      const sc = s.safety >= 90 ? 'ok' : s.safety >= 70 ? 'warn' : 'bad', oc = otp >= 85 ? 'ok' : otp >= 70 ? 'warn' : 'bad';
      set($('hud'), `<h1>${esc(s.name)} <small>Dag ${d.n + 1} · <span class="num">${T(s.t)}</span></small></h1>
        <div class="row"><span class="num">${kr(s.money)}</span><span class="pill ${oc}">Punktlighet ${otp} %</span><span class="pill ${sc}">Säkerhet ${Math.round(s.safety)} %</span>${G.mode === 0 && G.speed > 1 ? '<span class="pill muted">Golvet: 1×</span>' : ''}</div>`, 'hud');
      document.querySelectorAll('#speed button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.speed === G.speed)));
      $('modeBtn').textContent = G.mode ? 'Gå ner på golvet' : 'Översikt';
      $('sideBtn').textContent = G.sideOpen ? 'Stäng' : 'Tidtabell';
      $('side').classList.toggle('closed', !G.sideOpen);
      $('sprint').hidden = G.mode === 1 || G.driving;
    }

    function flightRow(f) {
      const s = G.s, al = D.airlines[f.al], [txt, cls] = Sim.status(s, f);
      const dep = f.phase === 'stand' || f.onBlock || ['pushback', 'taxiOut', 'hold', 'takeoff', 'gone'].includes(f.phase);
      const tm = dep ? f.std : f.sta, where = dep ? `→ ${f.to}` : `← ${f.from}`;
      const late = !f.offBlock && s.t > f.std && f.phase === 'stand' ? Math.floor(s.t - f.std) : f.offBlock ? f.offBlock - f.std : 0;
      return `<button type="button" class="frow ${G.selected === f.id ? 'sel' : ''}" data-flight="${f.id}">
        <span class="tm num">${T(tm)}</span>
        <span class="code"><i class="sw" style="background:${hex(al.color)}"></i><span>${esc(f.code)} ${esc(where)}</span></span>
        <span class="pill ${cls || 'muted'}">${esc(txt)}</span>
        <span class="sub">Gate ${f.stand}${late > 0 ? ` · ${late > 15 ? 'försenad' : 'sen'} ${late} min` : ''} · ${D.aircraft[f.size].model}</span>
      </button>`;
    }
    function panel(force) {
      if (!G.sideOpen) return;
      const s = G.s;
      document.querySelectorAll('.tabs button').forEach((b) => {
        b.setAttribute('aria-selected', String(b.dataset.tab === G.tab));
        if (b.dataset.tab === 'problems') b.innerHTML = 'Problem' + (s.problems.length ? `<span class="badge">${s.problems.length}</span>` : '');
      });
      if (force) last.pbody = null;
      let html = '';
      if (G.tab === 'flights') {
        const now = s.flights.filter((f) => ['approach', 'rollout', 'taxiIn', 'stand', 'pushback', 'holding'].includes(f.phase)).sort((a, b) => a.std - b.std);
        const next = s.flights.filter((f) => f.phase === 'sched').sort((a, b) => a.sta - b.sta).slice(0, 8);
        const done = s.flights.filter((f) => ['taxiOut', 'hold', 'takeoff', 'gone', 'diverted'].includes(f.phase)).sort((a, b) => b.std - a.std).slice(0, 4);
        html = `<div class="sec">På plattan nu</div>${now.map(flightRow).join('') || '<div class="empty">Inga plan just nu.</div>'}
          <div class="sec">Kommande</div>${next.map(flightRow).join('') || '<div class="empty">Inga fler i dag.</div>'}
          ${done.length ? `<div class="sec">Nyss avgångna</div>${done.map(flightRow).join('')}` : ''}`;
      } else {
        html = s.problems.map((p) => {
          const busy = p.fixAt ? `<span class="pill warn">Mekaniker på väg, klar ${T(p.fixAt)}</span>` : '';
          return `<div class="pcard"><span class="t">${esc(Sim.problemTitle(p))}</span>${busy}
            <div class="btns"><button type="button" class="btn primary" data-goto="${p.id}">Åk dit själv</button>${p.fixAt ? '' : `<button type="button" class="btn" data-mech="${p.id}">Skicka mekaniker (${D.problems[p.type].mech} min, 1 200 kr)</button>`}</div></div>`;
        }).join('') || '<div class="empty">Allt lugnt just nu. Njut av det.</div>';
      }
      set($('pbody'), html, 'pbody');
    }

    function card() {
      const s = G.s, f = G.selected && s.flights.find((x) => x.id === G.selected), el = $('card');
      if (!f) { el.hidden = true; last.card = null; return; }
      el.hidden = false;
      const al = D.airlines[f.al], [txt, cls] = Sim.status(s, f);
      let body = '';
      if (f.tasks) {
        body = Sim.taskInfo(s, f).map((x) => {
          const blocked = x.ready && x.st !== 'done' && /Ingen|sena|Väntar på sena|Väntar på väskor|Stoppad/.test(x.txt);
          return `<div class="task ${x.st === 'done' ? 'done' : ''} ${blocked ? 'blocked' : ''}"><span>${esc(x.name)}</span><span class="why">${esc(x.txt)}</span><div class="bar"><i style="width:${Math.round(x.prog * 100)}%"></i></div></div>`;
        }).join('');
      } else body = `<p style="margin:0;font-weight:700">${f.phase === 'sched' ? `Landar vid gate ${f.stand} ${T(f.sta)}.` : f.phase === 'holding' ? `Väntar i luften. ${f.holdCause === 'ramp' ? `Gate ${f.stand} är upptagen.` : `${D.contractors.atc.name} släpper in i sin egen takt.`}` : 'På väg.'}</p>`;
      const tot = Object.values(f.cause).reduce((a, b) => a + b, 0);
      const causes = tot ? `<div class="causes">${Object.entries(f.cause).filter(([, v]) => v).map(([k, v]) => `<span class="pill" style="background:${CAUSE[k][1]};color:#fff">${esc(CAUSE[k][0])} ${v} min</span>`).join('')}</div>` : '';
      set(el, `<button type="button" class="x" data-close-card="1" aria-label="Stäng">×</button>
        <h2><i class="sw" style="background:${hex(al.color)}"></i>${esc(f.code)} <span class="pill ${cls || 'muted'}">${esc(txt)}</span></h2>
        <div style="font-weight:700;color:var(--muted)">${esc(al.name)} · ${D.aircraft[f.size].model} · Gate ${f.stand} · ${esc(f.from)} → ${esc(f.to)}<br>Ankomst ${T(f.sta)}${f.onBlock ? ` (kom ${T(f.onBlock)})` : ''} · Avgång ${T(f.std)} · ${f.pax}/${f.paxOut} pax</div>
        ${causes}${body}`, 'card');
    }

    function help(html) { set($('help'), html, 'help'); }

    function toast(entry) {
      const el = document.createElement('div');
      el.className = 'toast panel ' + entry.kind; el.textContent = entry.msg;
      $('toasts').appendChild(el);
      while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
      setTimeout(() => el.remove(), entry.kind === 'bad' ? 6000 : 4200);
    }

    // ---------- dialoger ----------
    function modal(html) { const m = $('modal'); m.innerHTML = `<div class="dialog panel" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; G.modalOpen = true; }
    function close() { $('modal').hidden = true; $('modal').innerHTML = ''; G.modalOpen = false; }

    function intro(fresh) {
      modal(`<h2>Välkommen, ny plattchef!</h2>
        <p>Kommunen har köpt den gamla regionala flygplatsen och anställt dig för att få ordning på <b>plattan</b>: gates, marktjänst, bagage och allt som rullar mellan planen.</p>
        <p>Tornet sköts av <b>${esc(D.contractors.atc.name)}</b>, som är lite väl försiktiga. Terminalen sköts av <b>${esc(D.contractors.terminal.name)}</b>, med slogan "${esc(D.contractors.terminal.slogan)}". De menar det tyvärr.</p>
        ${fresh ? `<h3>Vad heter din flygplats?</h3><input id="nameIn" maxlength="22" value="Norrvik" aria-label="Flygplatsens namn">` : ''}
        <h3>Så spelar du</h3>
        <ul>
          <li><b>Turnaround:</b> klicka på ett plan för att se vad som händer: bagage, tankning, städning och boarding. Allt kräver personal och utrustning.</li>
          <li><b>Problem</b> dyker upp som <b>!</b>. Spring dit och tryck <b>F</b>, eller skicka en mekaniker, som tar längre tid och kostar.</li>
          <li><b>Förseningar</b> visas med orsak. Dina egna kostar ersättning. Entreprenörernas ser du, men kan inte styra … ännu.</li>
          <li><b>Styrning:</b> WASD eller klick för att gå, Shift för att springa, Q/E eller dra för att vrida kameran. Den gula Follow me-bilen står vid depån.</li>
        </ul>
        <div class="btns"><button type="button" class="btn primary" data-act="${fresh ? 'start' : 'close'}">${fresh ? 'Börja första passet' : 'Fortsätt'}</button></div>`);
    }
    function menu() {
      modal(`<h2>Meny</h2>
        <div class="btns"><button type="button" class="btn primary" data-act="close">Fortsätt</button><button type="button" class="btn" data-act="save">Spara nu</button><button type="button" class="btn" data-act="transfer">Flytta sparfil</button><button type="button" class="btn" data-act="help">Hur spelar man?</button><button type="button" class="btn danger" data-act="askNew">Nytt spel</button></div>
        <p id="menuMsg" style="color:var(--muted);font-weight:700">Spelet sparas automatiskt varje speltimme i den här webbläsaren.</p>`);
    }
    function transfer() {
      modal(`<h2>Flytta sparfil</h2>
        <p>Sparningen ligger i webbläsaren. Vill du fortsätta på en annan dator kopierar du koden, skickar den till dig själv och klistrar in den där.</p>
        <textarea id="exportCode" readonly>${esc(G.exportCode())}</textarea>
        <div class="btns"><button type="button" class="btn primary" data-act="copy">Kopiera kod</button></div>
        <h3>Ladda en sparfil</h3>
        <textarea id="importCode" placeholder="Klistra in en sparkod här"></textarea>
        <div class="btns"><button type="button" class="btn" data-act="import">Ladda</button><button type="button" class="btn" data-act="menu">Tillbaka</button></div>
        <p id="transferMsg" style="font-weight:700"></p>`);
    }
    function askNew() {
      modal(`<h2>Nytt spel?</h2><p>Din nuvarande flygplats skrivs över. Kopiera sparkoden först om du vill kunna komma tillbaka.</p>
        <h3>Vad ska den nya flygplatsen heta?</h3><input id="nameIn" maxlength="22" value="${esc(G.s.name)}" aria-label="Flygplatsens namn">
        <div class="btns"><button type="button" class="btn danger" data-act="newGame">Börja om</button><button type="button" class="btn" data-act="menu">Avbryt</button></div>`);
    }
    function report(r) {
      const d = r.d, inc = r.inc, cost = r.cost, tot = Object.values(d.cause).reduce((a, b) => a + b, 0) || 1;
      const bars = Object.entries(d.cause).map(([k, v]) => `<div class="cbar"><span>${esc(CAUSE[k][0])}</span><span><i style="width:${Math.max(2, Math.round(v / tot * 100))}%;background:${CAUSE[k][1]}"></i></span><span class="num">${v} min</span></div>`).join('');
      const verdict = r.otp >= 90 ? 'Ett riktigt bra pass. Flygbolagen märker det.' : r.otp >= 75 ? 'Helt okej. Det finns marginaler att hämta.' : 'Tungt pass. Titta på vad som höll upp planen.';
      modal(`<h2>Dag ${d.n + 1} är slut</h2><p style="font-weight:700">${verdict}</p>
        <div class="kv"><span>Avgångar</span><span class="num">${d.deps}</span><span>Punktlighet (≤15 min)</span><span class="num">${r.otp} %</span><span>Omdirigerade</span><span class="num">${d.diverted}</span><span>Säkerhet</span><span class="num">${r.safety} %</span></div>
        <h3>Vad orsakade förseningarna?</h3>${bars}
        <h3>Ekonomi</h3>
        <div class="kv"><span>Landningsavgifter</span><span class="num">${kr(d.inc.landing)}</span><span>Marktjänst</span><span class="num">${kr(d.inc.handling)}</span><span>Nattparkering</span><span class="num">${kr(d.inc.parking)}</span>
        <span>Löner</span><span class="num">−${kr(d.cost.staff)}</span><span>Leasing av utrustning</span><span class="num">−${kr(d.cost.lease)}</span><span>Ersättningar</span><span class="num">−${kr(d.cost.comp)}</span><span>Övrigt</span><span class="num">−${kr(d.cost.other)}</span>
        <span class="tot">Resultat</span><span class="tot num">${kr(inc - cost)}</span></div>
        <div class="btns"><button type="button" class="btn primary" data-act="close">Nästa dag</button></div>`);
    }

    return { hud, panel, card, help, toast, modal, close, intro, menu, transfer, askNew, report };
  }
  SH.UI = UI;
})();
