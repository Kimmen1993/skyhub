// SkyHub – DOM-gränssnitt: toppfält, verktyg, paneler, inspektor, dialoger.
(function () {
  const SH = (window.SH = window.SH || {});
  const C = SH.C, Sim = SH.Sim;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kr = (v) => Math.round(v).toLocaleString('sv-SE') + ' kr';
  const kShort = (v) => (v >= 1000 ? Math.round(v / 1000) + ' k' : String(v));
  const pct = (v) => Math.round(v) + ' %';
  const T = Sim.fmtTime;

  function UI(G) {
    const last = {};
    const setHTML = (el, html, key) => { if (last[key] !== html) { el.innerHTML = html; last[key] = html; } };

    // ---------- verktyg ----------
    function buildTools() {
      $('tools').innerHTML = C.toolOrder.map(([title, ids]) => `
        <div class="tgroup"><h3>${esc(title)}</h3>
          ${ids.map((id) => {
            const t = C.tools[id];
            return `<button type="button" class="tool" data-tool="${id}" aria-pressed="false" title="${esc(t.desc || t.name)}">
              <span class="code">${esc(t.code)}</span>
              <span class="nm"><span class="full">${esc(t.name)}</span><span class="short">${esc(t.name.split(' ')[0])}</span>${t.cost ? `<span class="cost">${kShort(t.cost)} kr</span>` : ''}</span>
            </button>`;
          }).join('')}
        </div>`).join('');
    }
    function syncTools() {
      document.querySelectorAll('.tool').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.tool === G.tool));
        b.classList.toggle('poor', (C.tools[b.dataset.tool].cost || 0) > G.s.money);
      });
      const t = C.tools[G.tool];
      const hint = $('hint');
      if (G.tool === 'select') { hint.hidden = true; return; }
      hint.hidden = false;
      hint.textContent = `${t.name}${t.cost ? ' · ' + kr(t.cost) : ''} – ${t.desc || ''} ${t.paint ? 'Dra för att bygga flera.' : ''} Esc avbryter.`;
    }

    // ---------- toppfält ----------
    function top() {
      const s = G.s, day = Math.floor(s.t / 1440) + 1;
      const rep = s.rep / 20, full = Math.floor(rep), half = rep - full >= 0.5;
      const stars = '★'.repeat(full) + (half ? '½' : '') + `<span class="off">${'★'.repeat(5 - full - (half ? 1 : 0))}</span>`;
      const ev = s.events.map((e) => `<span class="chip">${esc(C.events[e.type].name)} till ${T(e.until)}</span>`).join('');
      setHTML($('stats'), `
        <div class="stat"><span class="k">Kassa</span><span class="v ${s.money < 0 ? 'neg' : ''}">${kr(s.money)}</span></div>
        <div class="stat"><span class="k">Dag ${day}</span><span class="v">${T(s.t)}</span></div>
        <div class="stat"><span class="k">Nöjdhet</span><span class="v">${pct(s.sat)}</span></div>
        <div class="stat"><span class="k">Rykte</span><span class="v stars" title="${Math.round(s.rep)} / 100">${stars}</span></div>
        ${ev}`, 'stats');
      document.querySelectorAll('#speed button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.speed === G.speed)));
    }

    // ---------- paneler ----------
    function boardRows(s, mode) {
      const list = s.flights.filter((f) => f.st !== 'cancelled' || (mode === 'dep' ? f.dep : f.arr) > s.t - 60);
      if (mode === 'dep') {
        return list.filter((f) => !['taxiOut', 'hold', 'takeoff', 'gone'].includes(f.st) || (f.pushback || 0) > s.t - 25)
          .sort((a, b) => a.dep - b.dep).slice(0, 16).map((f) => {
            const [txt, cls] = Sim.status(s, f);
            const st = f.stand != null && Sim.standInfo(s, f.stand);
            return `<tr><td>${T(f.dep)}</td><td><i class="al" style="background:${Sim.airline(f.al).color}"></i>${esc(f.code)}</td><td class="dest">${esc(f.dest)}</td><td>${st ? st.name : '—'}</td><td class="st-${cls || 'none'}">${esc(txt)}</td></tr>`;
          });
      }
      return list.filter((f) => !f.atStand || f.atStand > s.t - 25 || ['approach', 'landing', 'taxiIn'].includes(f.st))
        .filter((f) => f.st !== 'gone' || f.atStand > s.t - 25)
        .sort((a, b) => a.arr - b.arr).slice(0, 16).map((f) => {
          let txt = 'Planerad', cls = '';
          if (f.st === 'sched') { if (s.t > f.arr) { txt = 'Försenad'; cls = 'warn'; } }
          else if (f.st === 'holding') { txt = 'Väntar i luften'; cls = 'warn'; }
          else if (f.st === 'approach') { txt = 'Inflygning'; cls = 'info'; }
          else if (f.st === 'diverted') { txt = 'Omdirigerat'; cls = 'bad'; }
          else if (f.st === 'cancelled') { txt = 'Inställt'; cls = 'bad'; }
          else { txt = 'Landat ' + (f.atStand ? T(f.atStand) : ''); cls = 'muted'; }
          const st = f.stand != null && Sim.standInfo(s, f.stand);
          return `<tr><td>${T(f.arr)}</td><td><i class="al" style="background:${Sim.airline(f.al).color}"></i>${esc(f.code)}</td><td class="dest">${esc(f.dest)}</td><td>${st ? st.name : '—'}</td><td class="st-${cls || 'none'}">${esc(txt)}</td></tr>`;
        });
    }

    function tabBoard(s) {
      const rows = boardRows(s, G.boardMode);
      return `<div class="sec"><h4><span>${G.boardMode === 'dep' ? 'Avgångar' : 'Ankomster'}</span>
          <span class="seg"><button type="button" data-board="dep" aria-pressed="${G.boardMode === 'dep'}">Avg</button><button type="button" data-board="arr" aria-pressed="${G.boardMode === 'arr'}">Ank</button></span></h4>
        <div class="fids"><table><thead><tr><th>TID</th><th>FLYG</th><th>${G.boardMode === 'dep' ? 'TILL' : 'FRÅN'}</th><th>GATE</th><th>STATUS</th></tr></thead>
        <tbody>${rows.join('') || '<tr><td colspan="5" class="st-muted">Inga flyg i tablån. Ta ett avtal under fliken Avtal.</td></tr>'}</tbody></table></div></div>
        ${capacitySummary(s)}`;
    }

    function meter(label, val, ratio, cls) {
      const col = cls === 'bad' ? 'var(--bad)' : cls === 'warn' ? 'var(--warn)' : 'var(--ok)';
      return `<div class="meter"><span class="lbl">${esc(label)}</span><span class="val">${val}</span><div class="bar"><i style="width:${Math.round(Math.min(1, ratio) * 100)}%;background:${col}"></i></div></div>`;
    }
    const waitCls = (w, cap) => (cap <= 0 ? 'bad' : w > 20 ? 'bad' : w > 10 ? 'warn' : 'ok');

    function capacitySummary(s) {
      const c = Sim.capacity(s), k = Sim.cache(s);
      const used = Object.keys(s.stand).length, unreach = k.stands.filter((x) => !x.reach).length;
      return `<div class="sec"><h4><span>Flöden just nu</span></h4><div style="display:flex;flex-direction:column;gap:9px">
        ${meter('Incheckning', `${c.checkin.q} i kö · ${c.checkin.wait} min · ${Math.round(c.checkin.cap)}/h`, c.checkin.cap ? c.checkin.wait / 30 : 1, waitCls(c.checkin.wait, c.checkin.cap))}
        ${meter('Säkerhetskontroll', `${c.security.q} i kö · ${c.security.wait} min · ${Math.round(c.security.cap)}/h`, c.security.cap ? c.security.wait / 30 : 1, waitCls(c.security.wait, c.security.cap))}
        ${meter('Bagage', `${c.bags.q} väskor · ${Math.round(c.bags.cap)}/h`, c.bags.cap ? c.bags.wait / 30 : 1, waitCls(c.bags.wait, c.bags.cap))}
        ${meter('Butiker & mat', `${c.airside.n} gäster / ${c.airside.cap} platser`, c.airside.cap ? c.airside.n / c.airside.cap : (c.airside.n ? 1 : 0), c.airside.n > c.airside.cap ? 'warn' : 'ok')}
        ${meter('Toaletter', `${c.airside.n} / ${c.airside.wc}`, c.airside.wc ? c.airside.n / c.airside.wc : (c.airside.n ? 1 : 0), c.airside.n > c.airside.wc ? 'warn' : 'ok')}
        ${meter('VIP-lounge', `${c.lounge.n} affärsresenärer / ${c.lounge.cap}`, c.lounge.cap ? c.lounge.n / c.lounge.cap : (c.lounge.n ? 1 : 0), c.lounge.n > c.lounge.cap ? 'warn' : 'ok')}
        ${meter('Gates', `${used} av ${k.stands.length} upptagna${unreach ? ` · ${unreach} saknar väg till bana` : ''}`, k.stands.length ? used / k.stands.length : 1, unreach ? 'bad' : used >= k.stands.length ? 'warn' : 'ok')}
      </div></div>`;
    }

    function tabDeals(s) {
      const offers = s.offers.map((o) => {
        const al = Sim.airline(o.airline), A = C.aircraft[o.size];
        return `<div class="card">
          <div class="row"><span class="title"><span class="swatch" style="background:${al.color}"></span>${esc(al.name)}</span><span class="muted data">går ut ${T(o.expires)}</span></div>
          <div class="row"><span>${A.model} · ${A.seats} platser · storlek ${o.size}</span></div>
          <div class="muted">${o.times.map((t, i) => `${T(t)} ${esc(o.dest[i])}`).join(' · ')}</div>
          <div class="row"><span class="muted">Uppskattat per dag</span><span class="data">≈ ${kr(Sim.offerValue(s, o))}</span></div>
          ${o.size === 'L' && !Sim.cache(s).counts.standL ? '<div class="st-warn">Kräver en uppställning L. Du har ingen.</div>' : ''}
          <div class="btns"><button type="button" class="btn primary" data-accept="${o.id}">Acceptera</button><button type="button" class="btn" data-decline="${o.id}">Avböj</button></div>
        </div>`;
      }).join('');
      const contracts = s.contracts.map((ct) => {
        const al = Sim.airline(ct.airline), h = s.happy[ct.airline];
        const col = h < 30 ? 'var(--bad)' : h < 55 ? 'var(--warn)' : 'var(--ok)';
        const confirm = G.confirmCancel === ct.id;
        return `<div class="card">
          <div class="row"><span class="title"><span class="swatch" style="background:${al.color}"></span>${esc(al.name)}</span><span class="data">${C.aircraft[ct.size].model}</span></div>
          <div class="muted">${ct.times.map((t, i) => `${T(t)} ${esc(ct.dest[i])}`).join(' · ')}</div>
          <div class="row"><span class="muted">Nöjdhet</span><span class="data">${Math.round(h)} %</span></div>
          <div class="bar"><i style="width:${Math.round(h)}%;background:${col}"></i></div>
          <div class="btns">${confirm
            ? `<button type="button" class="btn danger" data-cancel="${ct.id}">Ja, säg upp</button><button type="button" class="btn" data-keep="1">Behåll</button>`
            : `<button type="button" class="btn" data-askcancel="${ct.id}">Säg upp</button>`}</div>
        </div>`;
      }).join('');
      return `<div class="sec"><h4><span>Erbjudanden</span><span>${s.offers.length}</span></h4><div style="display:flex;flex-direction:column;gap:8px">${offers || '<p class="muted">Inga nya erbjudanden just nu. Bättre rykte lockar fler och större bolag.</p>'}</div></div>
        <div class="sec"><h4><span>Dina avtal</span><span>${s.contracts.length}</span></h4><div style="display:flex;flex-direction:column;gap:8px">${contracts || '<p class="muted">Inga avtal.</p>'}</div></div>
        <div class="sec"><div class="card"><div class="title">Eget flygbolag</div><p class="muted" style="margin:0">Starta och driv ett eget bolag med flotta och rutter. Kommer i en senare version.</p></div></div>`;
    }

    function tabOps(s) {
      return `<div class="sec"><h4><span>Avgifter</span></h4>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label class="slider" for="feeLanding"><span>Landningsavgift</span><span class="data" id="feeLandingV">${Math.round(s.fees.landing * 100)} %</span>
              <input type="range" id="feeLanding" min="50" max="200" step="5" value="${Math.round(s.fees.landing * 100)}"></label>
            <label class="slider" for="feePax"><span>Passageraravgift</span><span class="data" id="feePaxV">${s.fees.pax} kr</span>
              <input type="range" id="feePax" min="40" max="250" step="5" value="${s.fees.pax}"></label>
            <p class="muted" style="margin:0;line-height:1.5">Högre avgifter ger mer per flyg, men flygbolagen blir sakta mer missnöjda. Missnöjda bolag säger upp sina avtal.</p>
          </div></div>
        <div id="opsLive"></div>`;
    }
    function opsLive(s) {
      const al = [...new Set(s.contracts.map((c) => c.airline))].map((id) => {
        const h = s.happy[id], a = Sim.airline(id), col = h < 30 ? 'var(--bad)' : h < 55 ? 'var(--warn)' : 'var(--ok)';
        return `<div class="meter"><span class="lbl"><span class="swatch" style="display:inline-block;background:${a.color};margin-right:6px"></span>${esc(a.name)}</span><span class="val">${Math.round(h)} %</span><div class="bar"><i style="width:${h}%;background:${col}"></i></div></div>`;
      }).join('');
      const k = Sim.cache(s);
      return `${capacitySummary(s)}
        <div class="sec"><h4><span>Flygbolagens humör</span></h4><div style="display:flex;flex-direction:column;gap:9px">${al || '<p class="muted">Inga avtal.</p>'}</div></div>
        <div class="sec"><h4><span>Driftkostnad</span></h4><div class="kv"><span>Underhåll och personal</span><span class="data">${kr(k.upkeep)} / dygn</span></div></div>`;
    }

    function tabReport(s) {
      const d = s.day;
      const inc = d.inc, cost = d.cost;
      const ti = Object.values(inc).reduce((a, b) => a + b, 0), tc = Object.values(cost).reduce((a, b) => a + b, 0);
      const y = s.history[s.history.length - 1];
      const hist = s.history.slice(-7);
      const max = Math.max(1, ...hist.map((h) => Math.abs(h.income - h.cost)));
      const bars = hist.map((h) => {
        const net = h.income - h.cost, hgt = Math.max(2, Math.round(Math.abs(net) / max * 46));
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1" title="Dag ${h.day}: ${kr(net)}"><div style="height:48px;display:flex;align-items:flex-end"><i style="display:block;width:16px;height:${hgt}px;border-radius:2px;background:${net >= 0 ? 'var(--ok)' : 'var(--bad)'}"></i></div><span class="muted data" style="font-size:10px">D${h.day}</span></div>`;
      }).join('');
      const logs = s.log.slice(-30).reverse().map((l) => `<div><span class="t">${T(l.t)}</span><span class="${l.kind}">${esc(l.msg)}</span></div>`).join('');
      return `<div class="sec"><h4><span>I dag hittills</span></h4><div class="kv">
          <span>Landningsavgifter</span><span class="data">${kr(inc.landing)}</span>
          <span>Passageraravgifter</span><span class="data">${kr(inc.pax)}</span>
          <span>Butiker</span><span class="data">${kr(inc.shop)}</span>
          <span>Restauranger</span><span class="data">${kr(inc.food)}</span>
          <span>VIP-lounge</span><span class="data">${kr(inc.lounge)}</span>
          ${inc.other ? `<span>Övrigt</span><span class="data">${kr(inc.other)}</span>` : ''}
          <span>Underhåll och personal</span><span class="data">−${kr(cost.upkeep)}</span>
          <span>Bygg (netto)</span><span class="data">−${kr(cost.build)}</span>
          ${cost.comp ? `<span>Ersättningar</span><span class="data st-bad">−${kr(cost.comp)}</span>` : ''}
          <span class="tot">Resultat</span><span class="data tot ${ti - tc < 0 ? 'st-bad' : ''}">${kr(ti - tc)}</span>
        </div></div>
        <div class="sec"><h4><span>Trafik i dag</span></h4><div class="kv">
          <span>Ankomster / avgångar</span><span class="data">${d.arr} / ${d.dep}</span>
          <span>I tid (≤15 min)</span><span class="data">${d.ontime}</span>
          <span>Försenade</span><span class="data">${d.delayed}</span>
          <span>Omdirigerade</span><span class="data">${d.diverted}</span>
          <span>Passagerare</span><span class="data">${d.pax.toLocaleString('sv-SE')}</span>
          <span>Missade sitt flyg</span><span class="data">${d.missed}</span>
          <span>Borttappade väskor</span><span class="data">${d.bagsLost}</span>
        </div></div>
        ${hist.length ? `<div class="sec"><h4><span>Resultat per dag</span>${y ? `<span>Igår ${kr(y.income - y.cost)}</span>` : ''}</h4><div style="display:flex;gap:4px">${bars}</div></div>` : ''}
        <div class="sec"><h4><span>Logg</span></h4><div class="log">${logs}</div></div>`;
    }

    function panel(force) {
      const s = G.s, body = $('pbody');
      document.querySelectorAll('#tabs button').forEach((b) => {
        b.setAttribute('aria-selected', String(b.dataset.tab === G.tab));
        if (b.dataset.tab === 'deals') b.innerHTML = 'Avtal' + (s.offers.length ? `<span class="badge">${s.offers.length}</span>` : '');
      });
      if (force) last.pbody = last.opsLive = null;
      if (G.tab === 'board') setHTML(body, tabBoard(s), 'pbody');
      else if (G.tab === 'deals') setHTML(body, tabDeals(s), 'pbody');
      else if (G.tab === 'report') setHTML(body, tabReport(s), 'pbody');
      else if (G.tab === 'ops') {
        if (force || last.pbodyTab !== 'ops') { body.innerHTML = tabOps(s); last.pbody = null; }
        setHTML($('opsLive'), opsLive(s), 'opsLive');
      }
      last.pbodyTab = G.tab;
    }

    // ---------- inspektor ----------
    function inspect() {
      const el = $('inspect'), sel = G.selected;
      if (!sel) { el.hidden = true; last.inspect = null; return; }
      const s = G.s, i = sel.y * s.w + sel.x, g = s.g[i], b = s.b[i];
      let html = '';
      if (b) {
        const t = C.tools[b], cap = Sim.capacity(s);
        const extra = {
          checkin: `${cap.checkin.q} i kö totalt · längsta väntan ${cap.checkin.wait} min`,
          security: `${cap.security.q} i kö totalt · längsta väntan ${cap.security.wait} min`,
          baggage: `${cap.bags.q} väskor väntar på sortering`,
          shop: `${cap.airside.n} passagerare på flygsidan`, restaurant: `${cap.airside.n} passagerare på flygsidan`,
          toilet: `${cap.airside.n} passagerare på flygsidan`, lounge: `${cap.lounge.n} affärsresenärer väntar`,
        }[b];
        html = `<div class="title" style="font-weight:700">${esc(t.name)}</div><p class="muted" style="margin:0;line-height:1.5">${esc(t.desc)}</p>
          <div class="kv"><span>Drift</span><span class="data">${kr(t.upkeep)} / dygn</span></div><div class="muted">${extra}</div>`;
      } else if (g === 'standS' || g === 'standL') {
        const st = Sim.standInfo(s, i), fid = s.stand[i], f = fid && s.flights.find((x) => x.id === fid);
        html = `<div class="title" style="font-weight:700">Gate ${st.name} · ${esc(C.tools[g].name)}</div>
          <div class="kv"><span>Typ</span><span>${st.contact ? 'Kontaktgate med brygga' : 'Fjärrplats med buss'}</span>
          <span>Tar</span><span class="data">${C.tools[g].fits.join(', ')}</span>
          <span>Status</span><span>${f ? esc(f.code + ' ' + f.dest) : 'Ledig'}</span></div>
          ${!st.reach ? '<div class="st-bad">Ingen taxiväg till en fungerande bana. Koppla ihop med taxibana.</div>' : ''}
          ${!st.contact ? '<div class="muted">Bygg terminalgolv bredvid för att göra den till kontaktgate. Passagerarna blir nöjdare och boardingen går fortare.</div>' : ''}`;
      } else if (g === 'runway') {
        const sp = Sim.cache(s).strips.find((p) => p.tiles.some((t) => t.x === sel.x && t.y === sel.y));
        html = `<div class="title" style="font-weight:700">Landningsbana</div><div class="kv"><span>Längd</span><span class="data">${sp.len} rutor · ${sp.len * 120} m</span>
          <span>Status</span><span>${sp.ok ? (s.rw[sp.key] ? 'Upptagen' : 'Ledig') : 'Ur drift'}</span></div>
          ${!sp.ok ? `<div class="st-bad">${!(sp.horiz || sp.tiles.every((t) => t.x === sp.tiles[0].x)) ? 'Banan måste vara helt rak.' : 'Banan måste vara minst 8 rutor lång.'}</div>` : ''}`;
      } else if (g === 'grass') { G.selected = null; el.hidden = true; return; }
      else html = `<div class="title" style="font-weight:700">${esc(C.tools[g].name)}</div><p class="muted" style="margin:0;line-height:1.5">${esc(C.tools[g].desc || '')}</p>`;
      el.hidden = false;
      setHTML(el, `<button type="button" class="x" data-close="1" aria-label="Stäng">×</button>${html}`, 'inspect');
    }

    // ---------- toasts ----------
    function toast(entry) {
      const el = document.createElement('div');
      el.className = 'toast ' + entry.kind; el.textContent = entry.msg;
      $('toasts').appendChild(el);
      while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
      setTimeout(() => el.remove(), entry.kind === 'bad' ? 6500 : 4500);
    }

    // ---------- dialoger ----------
    function modal(html) { const m = $('modal'); m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; G.modalOpen = true; }
    function closeModal() { $('modal').hidden = true; $('modal').innerHTML = ''; G.modalOpen = false; }

    function intro() {
      modal(`<h2>SKYHUB</h2>
        <p>Du har tagit över en liten regional flygplats med en bana, tre gates och en enkel terminal. Två flygbolag flyger redan hit. Bygg ut, skriv avtal med fler bolag och håll passagerarna nöjda.</p>
        <h3>Så fungerar det</h3>
        <ul>
          <li><b>Flygen</b> landar, taxar till en ledig gate och lyfter igen. Utan ledig gate och fri bana får de vänta i luften, och efter 45 minuter landar de någon annanstans.</li>
          <li><b>Passagerarna</b> går genom incheckning, säkerhetskontroll och vidare till butiker och gate. Långa köer gör dem missnöjda, och den som inte hinner missar sitt flyg.</li>
          <li><b>Bagaget</b> måste sorteras innan planet får gå, både för avgående och ankommande flyg.</li>
          <li><b>Pengar</b> kommer från landningsavgifter, passageraravgifter, butiker, restauranger och VIP-loungen.</li>
          <li><b>Ryktet</b> växer med nöjda passagerare och lockar större flygbolag, till slut ända till New York och Tokyo.</li>
        </ul>
        <h3>Styrning</h3>
        <ul>
          <li>Dra kartan för att flytta den. Scrolla eller nyp för att zooma.</li>
          <li>Välj ett verktyg till vänster och klicka på kartan för att bygga. Banor, taxibanor och golv kan du dra ut.</li>
          <li>Mellanslag pausar. Tangenterna 1, 2 och 3 ändrar hastigheten. Esc avbryter bygget.</li>
        </ul>
        <div class="btns"><button type="button" class="btn primary" data-close="1">Starta</button></div>`);
    }

    function menu() {
      modal(`<h2>MENY</h2>
        <div class="menu">
          <button type="button" class="btn primary" data-close="1">Fortsätt</button>
          <button type="button" class="btn" data-act="save">Spara nu</button>
          <button type="button" class="btn" data-act="transfer">Flytta sparfil</button>
          <button type="button" class="btn" data-act="help">Hur spelar man?</button>
          <button type="button" class="btn" data-act="roadmap">Färdplan</button>
          <button type="button" class="btn danger" data-act="askNew">Nytt spel</button>
        </div>
        <p class="muted" id="menuMsg">Spelet sparas automatiskt varje speltimme i den här webbläsaren.</p>`);
    }

    function transfer() {
      modal(`<h2>FLYTTA SPARFIL</h2>
        <p>Sparningen ligger i webbläsaren. För att fortsätta på en annan dator kopierar du koden nedan, skickar den till dig själv och klistrar in den på den andra datorn.</p>
        <textarea id="exportCode" readonly>${esc(G.exportCode())}</textarea>
        <div class="btns"><button type="button" class="btn primary" data-act="copy">Kopiera kod</button></div>
        <h3>Ladda en sparfil</h3>
        <textarea id="importCode" placeholder="Klistra in en sparkod här"></textarea>
        <div class="btns"><button type="button" class="btn" data-act="import">Ladda</button><button type="button" class="btn" data-close="1">Stäng</button></div>
        <p class="muted" id="transferMsg"></p>`);
    }

    function roadmap() {
      modal(`<h2>FÄRDPLAN</h2>
        <div class="road">
          <div class="now"><b>v0.1</b><span>Flygplatsens kärna: banor, gates, terminal, passagerar- och bagageflöden, avtal, ekonomi och händelser. <i>Du är här.</i></span></div>
          <div><b>v0.2</b><span>Personal och skift, fler terminaltjänster, parkering och kollektivtrafik, tydligare VIP-behandling, kampanjmål.</span></div>
          <div><b>v0.3</b><span>Eget flygbolag: köp plan, öppna rutter, sätt priser och konkurrera med AI-bolagen.</span></div>
          <div><b>v0.4</b><span>Fler banor och större terminaler, väder, natt- och bullerregler, flygbolagsallianser.</span></div>
          <div><b>v1.0</b><span>Flygplatsen färdig. Mobilappar för iOS och Android.</span></div>
          <div><b>Hamn</b><span>Styr en hamn på samma motor: kajer, färjor, kryssning och containrar.</span></div>
          <div><b>Resecentrum</b><span>Tåg, buss och taxi som binder ihop allt.</span></div>
        </div>
        <div class="btns"><button type="button" class="btn" data-close="1">Stäng</button></div>`);
    }

    function askNew() {
      modal(`<h2>NYTT SPEL?</h2><p>Nuvarande flygplats skrivs över. Det går inte att ångra, om du inte först har kopierat sparkoden under Flytta sparfil.</p>
        <div class="btns"><button type="button" class="btn danger" data-act="newGame">Ja, börja om</button><button type="button" class="btn" data-act="menu">Avbryt</button></div>`);
    }

    return { buildTools, syncTools, top, panel, inspect, toast, modal, closeModal, intro, menu, transfer, roadmap, askNew };
  }

  SH.UI = UI;
})();
