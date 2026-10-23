// SkyHub – isometrisk Canvas-rendering. Läser state, ändrar aldrig något.
(function () {
  const SH = (window.SH = window.SH || {});
  const C = SH.C;
  const TW = 64, TH = 32;

  const COL = {
    grassA: '#5b7a4c', grassB: '#567448', grassEdge: '#4b6640',
    runway: '#2d3138', runwayMark: '#eef1f4',
    taxi: '#40464f', taxiLine: '#e9c33b',
    stand: '#8d939b', standLine: '#f2d04a',
    floorTop: '#d7dbe1', floorL: '#a9afb8', floorR: '#bcc2ca',
    ok: 'rgba(95,211,141,0.55)', bad: 'rgba(255,93,93,0.55)', hover: 'rgba(255,255,255,0.85)',
  };
  const BLD = {
    checkin:    { top: '#4f8fd6', l: '#2f6aac', r: '#3a7ac0' },
    security:   { top: '#e0a33a', l: '#a8741c', r: '#c28a2a' },
    baggage:    { top: '#7c8794', l: '#56606b', r: '#68727e' },
    shop:       { top: '#d6608d', l: '#a03e66', r: '#b94f78' },
    restaurant: { top: '#e2793f', l: '#a8522a', r: '#c66634' },
    toilet:     { top: '#6cc3c9', l: '#3e8f95', r: '#55a9af' },
    lounge:     { top: '#2b2f3a', l: '#14171e', r: '#1d212a', glyph: '#e9c33b' },
  };

  function Renderer(canvas) {
    const ctx = canvas.getContext('2d');
    const cam = { ox: 0, oy: 0, z: 1 };
    let W = 0, H = 0, dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function center(s, gx, gy) {
      cam.ox = W / 2 - (gx - gy) * TW / 2 * cam.z;
      cam.oy = H / 2 - (gx + gy) * TH / 2 * cam.z;
    }
    const toScreen = (gx, gy, h) => ({ x: (gx - gy) * TW / 2 * cam.z + cam.ox, y: ((gx + gy) * TH / 2 - (h || 0)) * cam.z + cam.oy });
    function toGrid(sx, sy) {
      const X = (sx - cam.ox) / cam.z, Y = (sy - cam.oy) / cam.z;
      return { x: (X / (TW / 2) + Y / (TH / 2)) / 2, y: (Y / (TH / 2) - X / (TW / 2)) / 2 };
    }
    function zoomAt(sx, sy, f) {
      const nz = Math.max(0.35, Math.min(2.6, cam.z * f));
      const g = toGrid(sx, sy);
      cam.z = nz;
      const p = toScreen(g.x, g.y);
      cam.ox += sx - p.x; cam.oy += sy - p.y;
    }
    function pan(dx, dy) { cam.ox += dx; cam.oy += dy; }

    // --- primitiver ---
    function diamond(gx, gy, h, fill, stroke) {
      const a = toScreen(gx, gy, h), b = toScreen(gx + 1, gy, h), c = toScreen(gx + 1, gy + 1, h), d = toScreen(gx, gy + 1, h);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    }
    function box(gx, gy, inset, h0, h1, top, l, r) {
      const x0 = gx + inset, y0 = gy + inset, x1 = gx + 1 - inset, y1 = gy + 1 - inset;
      const P = (x, y, h) => toScreen(x, y, h);
      // vänster sida (längs y1), höger sida (längs x1)
      let a = P(x0, y1, h0), b = P(x1, y1, h0), c = P(x1, y1, h1), d = P(x0, y1, h1);
      ctx.fillStyle = l; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
      a = P(x1, y0, h0); b = P(x1, y1, h0); c = P(x1, y1, h1); d = P(x1, y0, h1);
      ctx.fillStyle = r; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
      a = P(x0, y0, h1); b = P(x1, y0, h1); c = P(x1, y1, h1); d = P(x0, y1, h1);
      ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
    }
    const at = (s, x, y) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? null : s.g[y * s.w + x]);
    const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

    // Linje i rutkoordinater (för markeringar på marken)
    function gline(x0, y0, x1, y1, h) {
      const a = toScreen(x0, y0, h), b = toScreen(x1, y1, h);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    function drawGround(s) {
      const strips = SH.Sim.cache(s).strips;
      const stripOf = {};
      strips.forEach((sp) => sp.tiles.forEach((t, k) => (stripOf[t.y * s.w + t.x] = { sp, k })));
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const g = s.g[y * s.w + x];
        if (g === 'grass') {
          const v = hash(x, y);
          diamond(x, y, 0, v < 0.5 ? COL.grassA : COL.grassB);
          if (v > 0.93) { const p = toScreen(x + 0.3 + v * 0.3, y + 0.5); ctx.fillStyle = '#4a6a3d'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4 * cam.z, 2 * cam.z, 0, 0, 7); ctx.fill(); }
        } else if (g === 'runway') {
          diamond(x, y, 0, COL.runway);
          const so = stripOf[y * s.w + x];
          ctx.lineWidth = Math.max(1, 1.6 * cam.z); ctx.strokeStyle = so && so.sp.ok ? COL.runwayMark : '#ff7a6b';
          if (so && so.sp.horiz) {
            gline(x + 0.15, y + 0.5, x + 0.55, y + 0.5);
            ctx.globalAlpha = 0.5; gline(x, y + 0.08, x + 1, y + 0.08); gline(x, y + 0.92, x + 1, y + 0.92); ctx.globalAlpha = 1;
            if (so.sp.ok && (so.k === 0 || so.k === so.sp.len - 1)) for (let i = 0; i < 5; i++) gline(x + 0.25, y + 0.2 + i * 0.15, x + 0.75, y + 0.2 + i * 0.15);
          } else if (so) {
            gline(x + 0.5, y + 0.15, x + 0.5, y + 0.55);
            ctx.globalAlpha = 0.5; gline(x + 0.08, y, x + 0.08, y + 1); gline(x + 0.92, y, x + 0.92, y + 1); ctx.globalAlpha = 1;
            if (so.sp.ok && (so.k === 0 || so.k === so.sp.len - 1)) for (let i = 0; i < 5; i++) gline(x + 0.2 + i * 0.15, y + 0.25, x + 0.2 + i * 0.15, y + 0.75);
          }
        } else if (g === 'taxi') {
          diamond(x, y, 0, COL.taxi);
          ctx.strokeStyle = COL.taxiLine; ctx.lineWidth = Math.max(1, 1.2 * cam.z);
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const n = at(s, x + dx, y + dy);
            if (n === 'taxi' || n === 'runway' || n === 'standS' || n === 'standL') gline(x + 0.5, y + 0.5, x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5);
          });
        } else if (g === 'standS' || g === 'standL') {
          diamond(x, y, 0, COL.stand);
          ctx.strokeStyle = COL.standLine; ctx.lineWidth = Math.max(1, 1.2 * cam.z);
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const n = at(s, x + dx, y + dy);
            if (n === 'taxi') gline(x + 0.5, y + 0.5, x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5);
          });
          ctx.globalAlpha = 0.35; diamond(x + 0.0, y + 0.0, 0, null, '#ffffff'); ctx.globalAlpha = 1;
        } else if (g === 'floor') {
          box(x, y, 0, 0, 5, COL.floorTop, COL.floorL, COL.floorR);
          if (hash(x, y) > 0.5) { ctx.globalAlpha = 0.06; diamond(x, y, 5, '#000'); ctx.globalAlpha = 1; }
        }
      }
    }

    function drawPlane(f, al) {
      const A = C.aircraft[f.size], sc = A.scale;
      const p = toScreen(f.x, f.y, 0);
      const lift = f.alt * 70;
      const tf = (h) => ctx.setTransform(dpr * cam.z * TW / 2, dpr * cam.z * TH / 2, -dpr * cam.z * TW / 2, dpr * cam.z * TH / 2, dpr * p.x, dpr * (p.y - h * cam.z));
      const shape = () => {
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.48, 0.065, 0, 0, Math.PI * 2);
        ctx.moveTo(0.08, 0); ctx.lineTo(-0.1, 0.46); ctx.lineTo(-0.2, 0.46); ctx.lineTo(-0.1, 0); ctx.lineTo(-0.2, -0.46); ctx.lineTo(-0.1, -0.46); ctx.closePath();
        ctx.moveTo(-0.34, 0); ctx.lineTo(-0.44, 0.17); ctx.lineTo(-0.49, 0.17); ctx.lineTo(-0.45, 0); ctx.lineTo(-0.49, -0.17); ctx.lineTo(-0.44, -0.17); ctx.closePath();
      };
      // skugga
      tf(0); ctx.rotate(f.hd); ctx.scale(sc, sc);
      ctx.translate(lift * 0.012, lift * 0.012);
      ctx.fillStyle = 'rgba(10,15,20,' + (0.3 - Math.min(0.2, f.alt * 0.12)) + ')'; shape(); ctx.fill();
      // plan
      tf(lift + 3); ctx.rotate(f.hd); ctx.scale(sc, sc);
      ctx.fillStyle = '#f4f6f8'; shape(); ctx.fill();
      ctx.lineWidth = 0.02; ctx.strokeStyle = '#7d8590'; ctx.stroke();
      ctx.fillStyle = al.color;
      ctx.beginPath(); ctx.moveTo(-0.34, 0); ctx.lineTo(-0.44, 0.17); ctx.lineTo(-0.49, 0.17); ctx.lineTo(-0.45, 0); ctx.lineTo(-0.49, -0.17); ctx.lineTo(-0.44, -0.17); ctx.closePath(); ctx.fill();
      ctx.fillRect(-0.3, -0.03, 0.62, 0.06);
      if (f.size === 'S') { ctx.fillStyle = '#39404a'; ctx.fillRect(-0.03, 0.18, 0.08, 0.04); ctx.fillRect(-0.03, -0.22, 0.08, 0.04); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawBuilding(s, x, y, b, crowd) {
      const B = BLD[b], T = C.tools[b], h = 5 + T.h;
      box(x, y, 0.14, 5, h, B.top, B.l, B.r);
      const p = toScreen(x + 0.5, y + 0.5, h);
      if (cam.z > 0.55) {
        ctx.fillStyle = B.glyph || 'rgba(255,255,255,0.92)';
        ctx.font = `700 ${Math.round(9 * cam.z)}px "B612 Mono", ui-monospace, monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(T.code, p.x, p.y);
      }
      // Kö framför disken
      if (crowd > 0) {
        const n = Math.min(14, Math.ceil(crowd));
        for (let i = 0; i < n; i++) {
          const q = toScreen(x + 0.12 + (i % 7) * 0.12, y + 0.95 + Math.floor(i / 7) * 0.12, 5);
          ctx.fillStyle = i % 3 === 0 ? '#2f3a4a' : i % 3 === 1 ? '#7a4b8f' : '#2f6fdb';
          ctx.beginPath(); ctx.arc(q.x, q.y - 3 * cam.z, 2.3 * cam.z, 0, 7); ctx.fill();
        }
      }
    }

    function drawAirsidePax(s, total) {
      if (total <= 0) return;
      const floors = [];
      for (let i = 0; i < s.g.length; i++) if (s.g[i] === 'floor' && !s.b[i]) floors.push(i);
      if (!floors.length) return;
      const n = Math.min(160, Math.ceil(total / 4));
      for (let k = 0; k < n; k++) {
        const i = floors[Math.floor(hash(k, 7) * floors.length)], x = i % s.w, y = (i / s.w) | 0;
        const p = toScreen(x + 0.15 + hash(k, 3) * 0.7, y + 0.15 + hash(3, k) * 0.7, 5);
        ctx.fillStyle = ['#2f3a4a', '#c4475b', '#2f6fdb', '#d9a03a', '#4a7d5c'][k % 5];
        ctx.beginPath(); ctx.arc(p.x, p.y - 3 * cam.z, 2.2 * cam.z, 0, 7); ctx.fill();
      }
    }

    function nightLevel(t) {
      const h = (t % 1440) / 60;
      if (h >= 7 && h <= 19) return 0;
      if (h > 19 && h < 21.5) return (h - 19) / 2.5;
      if (h > 4.5 && h < 7) return 1 - (h - 4.5) / 2.5;
      return 1;
    }

    function draw(s, ui) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#41583a'; ctx.fillRect(0, 0, W, H);
      drawGround(s);

      // Objekt i djupordning
      const cap = SH.Sim.capacity(s), c = SH.Sim.cache(s);
      const items = [];
      for (let i = 0; i < s.b.length; i++) if (s.b[i]) {
        const b = s.b[i], x = i % s.w, y = (i / s.w) | 0;
        let crowd = 0;
        if (b === 'checkin') crowd = cap.checkin.q / Math.max(1, c.counts.checkin) / 3;
        if (b === 'security') crowd = cap.security.q / Math.max(1, c.counts.security) / 4;
        items.push({ d: x + y + 0.5, f: () => drawBuilding(s, x, y, b, crowd) });
      }
      const air = [];
      s.flights.forEach((f) => {
        if (!f.path && !['stand', 'hold'].includes(f.st)) return;
        if (['gone', 'diverted', 'cancelled', 'sched', 'holding'].includes(f.st)) return;
        const al = SH.Sim.airline(f.al);
        if (f.alt > 0.02) air.push(() => drawPlane(f, al));
        else items.push({ d: f.x + f.y, f: () => drawPlane(f, al) });
      });
      items.sort((a, b) => a.d - b.d).forEach((it) => it.f());
      drawAirsidePax(s, cap.airside.n);

      // Gatenamn
      if (cam.z > 0.5) {
        ctx.font = `700 ${Math.round(9 * cam.z)}px "B612 Mono", ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        c.stands.forEach((st) => {
          const p = toScreen(st.x + 0.5, st.y + 0.85);
          ctx.fillStyle = st.reach ? 'rgba(20,24,30,0.75)' : 'rgba(200,40,40,0.9)';
          const label = st.reach ? st.name : st.name + ' !';
          const w = ctx.measureText(label).width + 6 * cam.z;
          ctx.fillRect(p.x - w / 2, p.y - 6 * cam.z, w, 12 * cam.z);
          ctx.fillStyle = '#f2d04a'; ctx.fillText(label, p.x, p.y);
        });
      }

      // Natt
      const nl = nightLevel(s.t);
      if (nl > 0) {
        ctx.fillStyle = `rgba(8,14,40,${0.5 * nl})`; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(255,214,120,${0.9 * nl})`;
        c.strips.forEach((sp) => sp.ok && sp.tiles.forEach((t) => {
          [[0.5, 0.06], [0.5, 0.94]].forEach(([a, b]) => {
            const p = sp.horiz ? toScreen(t.x + a, t.y + b) : toScreen(t.x + b, t.y + a);
            ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * cam.z, 0, 7); ctx.fill();
          });
        }));
        ctx.fillStyle = `rgba(110,200,255,${0.8 * nl})`;
        for (let i = 0; i < s.g.length; i++) if (s.g[i] === 'taxi' && (i % 2 === 0)) {
          const p = toScreen((i % s.w) + 0.5, ((i / s.w) | 0) + 0.5);
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 * cam.z, 0, 7); ctx.fill();
        }
      }
      air.forEach((fn) => fn());

      // Hovring och byggförhandsvisning
      if (ui.hover) {
        const { x, y } = ui.hover;
        if (x >= 0 && y >= 0 && x < s.w && y < s.h) {
          if (ui.tool && ui.tool !== 'select') {
            const ok = SH.Sim.canBuild(s, ui.tool, x, y).ok;
            diamond(x, y, s.g[y * s.w + x] === 'floor' ? 5 : 0, ok ? COL.ok : COL.bad);
          }
          ctx.lineWidth = 1.5; diamond(x, y, s.g[y * s.w + x] === 'floor' ? 5 : 0, null, COL.hover);
        }
      }
      if (ui.selected) {
        ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        diamond(ui.selected.x, ui.selected.y, 5, null, '#ffb627'); ctx.setLineDash([]);
      }
    }

    return { resize, draw, toGrid, toScreen, zoomAt, pan, center, cam };
  }

  SH.Renderer = Renderer;
})();
