// SkyHub – uppstart, spelloop, inmatning (mus + touch), sparning.
(function () {
  const SH = window.SH, C = SH.C, Sim = SH.Sim;
  const SAVE_KEY = 'skyhub.save.v1';
  const $ = (id) => document.getElementById(id);

  const store = {
    get() { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(SAVE_KEY, v); return true; } catch (e) { return false; } },
  };

  const G = {
    s: null, speed: 1, tool: 'select', tab: 'board', boardMode: 'dep',
    hover: null, selected: null, confirmCancel: null, modalOpen: false, lastLog: 0,
  };
  const canvas = $('map');
  const R = SH.Renderer(canvas);
  const ui = SH.UI(G);

  function save() { return store.set(Sim.serialize(G.s)); }
  G.exportCode = () => 'SKYHUB1:' + btoa(unescape(encodeURIComponent(Sim.serialize(G.s))));
  function importCode(code) {
    const raw = code.trim().replace(/^SKYHUB1:/, '');
    return Sim.load(decodeURIComponent(escape(atob(raw))));
  }

  function setState(s, fresh) {
    G.s = s; G.selected = null; G.confirmCancel = null;
    G.lastLog = fresh ? 0 : (s.log.length ? s.log[s.log.length - 1].id : 0);
    R.resize(); R.center(s, 16, 9);
    ui.panel(true); ui.top(); ui.syncTools();
  }

  function start(data) {
    ui.buildTools();
    let s = null, fresh = false;
    if (data && data.save) { try { s = Sim.load(data.save); } catch (e) { s = null; } }
    if (!s) { const raw = store.get(); if (raw) { try { s = Sim.load(raw); } catch (e) { s = null; } } }
    if (!s) { s = Sim.create(); fresh = true; }
    if (data && data.ui) Object.assign(G, { speed: data.ui.speed, tool: data.ui.tool, tab: data.ui.tab });
    setState(s, fresh);
    if (data && data.cam) Object.assign(R.cam, data.cam);
    if (fresh) { ui.intro(); }
    requestAnimationFrame(loop);
  }

  // ---------- loop ----------
  let lastT = performance.now(), uiAcc = 0, lastHour = -1;
  function loop(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    const s = G.s;
    if (G.speed > 0 && !G.modalOpen) Sim.advance(s, (dt / C.REAL_SEC_PER_MIN) * G.speed);
    R.draw(s, G);
    uiAcc += dt;
    if (uiAcc > 0.25) {
      uiAcc = 0;
      ui.top(); ui.panel(); ui.inspect();
      s.log.forEach((l) => { if (l.id > G.lastLog) { if (l.kind !== 'info') ui.toast(l); G.lastLog = l.id; } });
      const hour = Math.floor(s.t / 60);
      if (hour !== lastHour) { if (lastHour >= 0) save(); lastHour = hour; }
    }
    requestAnimationFrame(loop);
  }

  // ---------- inmatning ----------
  window.addEventListener('resize', () => R.resize());
  const pointers = new Map();
  let drag = null; // {mode:'pan'|'paint', sx, sy, moved, lastCell}
  let pinch = null;

  const cellAt = (e) => {
    const r = canvas.getBoundingClientRect(), g = R.toGrid(e.clientX - r.left, e.clientY - r.top);
    return { x: Math.floor(g.x), y: Math.floor(g.y) };
  };
  function tryBuild(x, y) {
    const res = Sim.build(G.s, G.tool, x, y);
    return res.ok;
  }
  function paintLine(a, b) {
    let x0 = a.x, y0 = a.y; const x1 = b.x, y1 = b.y;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 200; guard++) {
      tryBuild(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2 };
      drag = null; return;
    }
    const panBtn = e.button === 1 || e.button === 2 || G.tool === 'select';
    drag = { mode: panBtn ? 'pan' : 'paint', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, lastCell: null, single: !C.tools[G.tool].paint };
    if (drag.mode === 'paint') {
      const c = cellAt(e); drag.lastCell = c;
      if (!tryBuild(c.x, c.y)) {
        const why = Sim.canBuild(G.s, G.tool, c.x, c.y).why;
        if (why) ui.toast({ msg: why, kind: 'info' });
      }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y), cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2;
      const r = canvas.getBoundingClientRect();
      R.pan(cx - pinch.cx, cy - pinch.cy);
      R.zoomAt(cx - r.left, cy - r.top, d / pinch.d);
      pinch = { d, cx, cy }; return;
    }
    G.hover = cellAt(e);
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
    if (drag.mode === 'pan') { R.pan(e.clientX - drag.lx, e.clientY - drag.ly); drag.lx = e.clientX; drag.ly = e.clientY; canvas.classList.add('pan'); }
    else if (!drag.single) {
      const c = cellAt(e);
      if (c.x !== drag.lastCell.x || c.y !== drag.lastCell.y) { paintLine(drag.lastCell, c); drag.lastCell = c; }
    }
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && drag.mode === 'pan' && !drag.moved && G.tool === 'select' && e.button === 0) {
      const c = cellAt(e), s = G.s;
      const inside = c.x >= 0 && c.y >= 0 && c.x < s.w && c.y < s.h;
      G.selected = inside && (s.g[c.y * s.w + c.x] !== 'grass' || s.b[c.y * s.w + c.x]) ? c : null;
      ui.inspect();
    }
    drag = null; canvas.classList.remove('pan');
    ui.syncTools();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!drag) G.hover = null; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    R.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  function setTool(t) { G.tool = t; G.selected = t === 'select' ? G.selected : null; ui.syncTools(); ui.inspect(); }
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') { if (G.modalOpen) ui.closeModal(); else setTool('select'); }
    else if (e.key === ' ') { e.preventDefault(); G.speed = G.speed ? 0 : (G.prevSpeed || 1); if (G.speed) G.prevSpeed = G.speed; ui.top(); }
    else if (e.key === '1' || e.key === '2' || e.key === '3') { G.speed = [1, 3, 8][+e.key - 1]; G.prevSpeed = G.speed; ui.top(); }
  });

  // ---------- klick i gränssnittet (delegering) ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset, s = G.s;
    if (d.tool) setTool(G.tool === d.tool && d.tool !== 'select' ? 'select' : d.tool);
    else if (d.speed != null) { G.speed = +d.speed; if (G.speed) G.prevSpeed = G.speed; ui.top(); }
    else if (d.tab) { G.tab = d.tab; ui.panel(true); }
    else if (d.board) { G.boardMode = d.board; ui.panel(true); }
    else if (d.accept) { Sim.acceptOffer(s, +d.accept); ui.panel(true); }
    else if (d.decline) { Sim.declineOffer(s, +d.decline); ui.panel(true); }
    else if (d.askcancel) { G.confirmCancel = +d.askcancel; ui.panel(true); }
    else if (d.keep) { G.confirmCancel = null; ui.panel(true); }
    else if (d.cancel) { Sim.cancelContract(s, +d.cancel); G.confirmCancel = null; ui.panel(true); }
    else if (d.close) { if (b.closest('#inspect')) { G.selected = null; ui.inspect(); } else ui.closeModal(); }
    else if (d.act === 'save') { const ok = save(); const m = $('menuMsg'); if (m) m.textContent = ok ? 'Sparat.' : 'Webbläsaren tillåter inte sparning här. Använd Flytta sparfil i stället.'; }
    else if (d.act === 'transfer') ui.transfer();
    else if (d.act === 'help') ui.intro();
    else if (d.act === 'roadmap') ui.roadmap();
    else if (d.act === 'menu') ui.menu();
    else if (d.act === 'askNew') ui.askNew();
    else if (d.act === 'newGame') { setState(Sim.create(), true); save(); ui.closeModal(); ui.intro(); }
    else if (d.act === 'copy') {
      const ta = $('exportCode'), msg = $('transferMsg');
      const fallback = () => { ta.focus(); ta.select(); msg.textContent = 'Koden är markerad. Tryck Ctrl+C eller Cmd+C för att kopiera.'; };
      try { navigator.clipboard.writeText(ta.value).then(() => (msg.textContent = 'Kopierat. Klistra in koden på den andra datorn.'), fallback); } catch (err) { fallback(); }
    } else if (d.act === 'import') {
      const msg = $('transferMsg');
      try { const ns = importCode($('importCode').value); setState(ns, false); save(); ui.closeModal(); ui.toast({ msg: 'Sparfilen är laddad.', kind: 'good' }); }
      catch (err) { msg.textContent = 'Koden gick inte att läsa. Kontrollera att hela koden kom med, från SKYHUB1: till sista tecknet.'; }
    }
  });
  $('menuBtn').addEventListener('click', () => ui.menu());
  $('panelToggle').addEventListener('click', () => {
    const p = $('panel'); p.classList.toggle('closed');
    $('panelToggle').textContent = p.classList.contains('closed') ? 'Tavla' : 'Stäng';
  });
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') ui.closeModal(); });
  document.addEventListener('input', (e) => {
    const s = G.s;
    if (e.target.id === 'feeLanding') { s.fees.landing = +e.target.value / 100; $('feeLandingV').textContent = e.target.value + ' %'; }
    if (e.target.id === 'feePax') { s.fees.pax = +e.target.value; $('feePaxV').textContent = e.target.value + ' kr'; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.s) save(); });
  window.addEventListener('pagehide', () => { if (G.s) save(); });

  // ---------- start (med bevarat läge vid uppdatering av sidan) ----------
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ save: Sim.serialize(G.s), cam: { ...R.cam }, ui: { speed: G.speed, tool: G.tool, tab: G.tab } }));
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
