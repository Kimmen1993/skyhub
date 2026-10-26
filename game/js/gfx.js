// SkyHub – tecknad 3D: material, grundformer och modeller. Läser aldrig spelets state.
(function () {
  const SH = (window.SH = window.SH || {});
  const T = THREE;

  // ---------- material ----------
  const grad = (() => { const d = new Uint8Array([95, 95, 95, 255, 160, 160, 160, 255, 215, 215, 215, 255, 255, 255, 255, 255]); const t = new T.DataTexture(d, 4, 1, T.RGBAFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t; })();
  const mats = {};
  const toon = (c) => mats[c] || (mats[c] = new T.MeshToonMaterial({ color: c, gradientMap: grad }));
  const inkMat = new T.MeshBasicMaterial({ color: 0x1d2433, side: T.BackSide });
  const OL = 0.055;

  // ---------- geometrier (cachade) ----------
  const geos = {};
  function rboxGeo(w, h, d, r) {
    const key = 'b' + [w, h, d, r].map((v) => v.toFixed(3)).join('|'); if (geos[key]) return geos[key];
    r = Math.max(0.002, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
    const b = r * 0.6, rc = Math.max(0.001, r - b), W = w - 2 * b, H = h - 2 * b;
    const s = new T.Shape();
    s.moveTo(-W / 2 + rc, -H / 2); s.lineTo(W / 2 - rc, -H / 2); s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + rc);
    s.lineTo(W / 2, H / 2 - rc); s.quadraticCurveTo(W / 2, H / 2, W / 2 - rc, H / 2); s.lineTo(-W / 2 + rc, H / 2);
    s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - rc); s.lineTo(-W / 2, -H / 2 + rc); s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + rc, -H / 2);
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 3 });
    g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals();
    return (geos[key] = g);
  }
  const cylGeo = (rt, rb, h, seg, open, ts, tl) => { const k = 'c' + [rt, rb, h, seg, open, ts, tl].join('|'); return geos[k] || (geos[k] = new T.CylinderGeometry(rt, rb, h, seg, 1, !!open, ts || 0, tl || Math.PI * 2)); };
  const sphGeo = (r, ws, hs) => { const k = 's' + [r, ws, hs].join('|'); return geos[k] || (geos[k] = new T.SphereGeometry(r, ws, hs)); };
  const coneGeo = (r, h, seg) => { const k = 'k' + [r, h, seg].join('|'); return geos[k] || (geos[k] = new T.ConeGeometry(r, h, seg)); };

  function finish(m, parent, outlineGeo) {
    m.castShadow = true; m.receiveShadow = true;
    if (outlineGeo) m.add(new T.Mesh(outlineGeo, inkMat));
    if (parent) parent.add(m); return m;
  }
  const rr = (w, h, d) => Math.min(w, h, d) * 0.18;
  const rbox = (w, h, d, col, parent, r, ol) => { r = r == null ? rr(w, h, d) : r; return finish(new T.Mesh(rboxGeo(w, h, d, r), toon(col)), parent, ol === false ? null : rboxGeo(w + OL * 2, h + OL * 2, d + OL * 2, r + OL)); };
  const cyl = (rt, rb, h, col, parent, seg, ol) => finish(new T.Mesh(cylGeo(rt, rb, h, seg || 18), toon(col)), parent, ol === false ? null : cylGeo(rt + OL, rb + OL, h + OL * 2, seg || 18));
  const cone = (r, h, col, parent, seg) => finish(new T.Mesh(coneGeo(r, h, seg || 16), toon(col)), parent, coneGeo(r + OL, h + OL * 2, seg || 16));
  const sph = (r, col, parent, ol) => finish(new T.Mesh(sphGeo(r, 18, 12), toon(col)), parent, ol === false ? null : sphGeo(r + OL, 18, 12));
  const at = (m, x, y, z) => (m.position.set(x, y, z), m);
  const wheel = (r, w, parent, x, y, z) => { const m = cyl(r, r, w, 0x2a2f3a, parent, 12); m.rotation.z = Math.PI / 2; m.position.set(x, y, z); return m; };

  // ---------- texturer ----------
  function tex(draw, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  const textTex = (text, w, h, bg, fg, font) => tex((x) => { if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); } x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 4); }, w, h);
  function decal(texture, w, h, parent, transparent) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: texture, transparent: !!transparent }));
    if (parent) parent.add(m); return m;
  }
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const winTex = tex((x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#2e3a52'; for (let i = 0; i < 18; i++) { x.beginPath(); x.ellipse(14 + i * 27.5, h / 2, 7, 11, 0, 0, Math.PI * 2); x.fill(); } }, 512, 32);

  // ---------- flygplan ----------
  const planeCache = {};
  function plane(size, livery, accent, code) {
    const g = new T.Group();
    const S = size === 'S';
    const R = S ? 1.55 : 2.1, LEN = S ? 13 : 16;
    const body = cyl(R, R, LEN, 0xffffff, g, 22); body.rotation.x = Math.PI / 2;
    const nose = sph(R, 0xffffff, g); nose.scale.set(1, 0.95, S ? 1.35 : 1.55); nose.position.z = LEN / 2;
    const tail = cone(R, S ? 5.5 : 7, 0xffffff, g, 22); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0.45, -LEN / 2 - (S ? 2.6 : 3.4)); tail.scale.set(1, 1, 0.7);
    at(rbox(R * 1.2, 0.6, 1.0, 0x2e3a52, g, 0.25), 0, R * 0.48, LEN / 2 + R * 1.05).rotation.x = 0.5;
    const belly = new T.Mesh(cylGeo(R + 0.02, R + 0.02, LEN - 0.4, 22, true, -Math.PI * 0.38, Math.PI * 0.76), new T.MeshToonMaterial({ color: livery, gradientMap: grad, side: T.DoubleSide }));
    belly.rotation.x = Math.PI / 2; g.add(belly);
    for (const sx of [1, -1]) {
      at(rbox(0.3, 0.42, LEN + 1, accent, g, 0.12, false), sx * (R - 0.02), -0.25, 0.2);
      const wd = decal(winTex, LEN * 0.85, 0.55, g, true); wd.position.set(sx * (R + 0.01), R * 0.3, 0.3); wd.rotation.y = sx * Math.PI / 2;
      if (S) {
        // högvinge med propellrar
        const wing = at(rbox(10.5, 0.45, 2.6, 0xeef1f5, g, 0.2), sx * 5.6, R + 0.2, 0.6);
        const nac = cyl(0.6, 0.55, 3.0, livery, g, 14); nac.rotation.x = Math.PI / 2; nac.position.set(sx * 3.6, R - 0.4, 1.4);
        const spin = sph(0.32, 0xffffff, g, false); spin.position.set(sx * 3.6, R - 0.4, 3.0);
        const prop = new T.Group(); prop.position.set(sx * 3.6, R - 0.4, 3.05); g.add(prop);
        for (let b = 0; b < 6; b++) { const bl = rbox(0.18, 1.6, 0.06, 0x3c4a63, prop, 0.05, false); bl.position.y = 0.8; const piv = new T.Group(); piv.rotation.z = b * Math.PI / 3; piv.add(bl); prop.add(piv); }
        g.userData.props = (g.userData.props || []).concat(prop);
        const hs = at(rbox(3.6, 0.3, 1.6, 0xeef1f5, g, 0.12), sx * 1.9, 4.6, -LEN / 2 - 4.6);
        const gear = cyl(0.2, 0.2, 1.0, 0x6b7489, g, 8, false); gear.position.set(sx * 1.5, -R - 0.2, -0.4);
        wheel(0.5, 0.45, g, sx * 1.6, -R - 0.65, -0.4);
      } else {
        const wing = at(rbox(12, 0.55, 4.4, 0xeef1f5, g, 0.25), sx * 7.6, -0.9, -0.4); wing.rotation.y = sx * 0.28;
        at(rbox(0.4, 1.6, 1.4, livery, g, 0.15), sx * 13.4, -0.2, -2.3);
        const eng = cyl(1.15, 1.0, 3.4, livery, g); eng.rotation.x = Math.PI / 2; eng.position.set(sx * 5, -2.1, 1.6);
        const lip = cyl(1.18, 1.18, 0.4, 0xd9dee6, g, 18, false); lip.rotation.x = Math.PI / 2; lip.position.set(sx * 5, -2.1, 3.25);
        const inl = cyl(0.85, 0.85, 0.2, 0x2e3a52, g, 18, false); inl.rotation.x = Math.PI / 2; inl.position.set(sx * 5, -2.1, 3.4);
        const hs = at(rbox(5.4, 0.4, 2.4, 0xeef1f5, g, 0.18), sx * 3.2, 1.2, -12.4); hs.rotation.y = sx * 0.3;
        const gear = cyl(0.25, 0.25, 1.6, 0x6b7489, g, 8, false); gear.position.set(sx * 2.2, -2.6, -0.8);
        wheel(0.7, 0.6, g, sx * 2.2, -3.2, -0.8);
      }
    }
    const fin = at(rbox(0.6, S ? 5.2 : 6.4, S ? 3.8 : 4.6, livery, g, 0.25), 0, S ? 3.2 : 4.2, -LEN / 2 - (S ? 3.4 : 3.6)); fin.rotation.x = -0.4;
    const logo = textTex(code, 256, 256, null, hex(accent), '700 150px Fredoka, sans-serif');
    for (const sx of [1, -1]) { const d = decal(logo, S ? 2.6 : 3.2, S ? 2.6 : 3.2, fin, true); d.position.set(sx * 0.32, 0.3, 0); d.rotation.y = sx * Math.PI / 2; }
    const ng = cyl(0.2, 0.2, 1.4, 0x6b7489, g, 8, false); ng.position.set(0, -R - 0.5, LEN / 2 - 1);
    wheel(S ? 0.4 : 0.55, 0.45, g, 0, -R - (S ? 0.75 : 1.2), LEN / 2 - 1);
    g.traverse((o) => { if (o.isMesh && o.material !== inkMat) o.castShadow = true; });
    // höjd så att hjulen står på marken
    g.userData.gearY = S ? R + 1.15 : 3.85;
    // landningsljus
    const ll = sph(0.25, 0xfff4c2, g, false); ll.position.set(0, -R + 0.2, LEN / 2 + 1.2); ll.material = new T.MeshBasicMaterial({ color: 0xfff4c2 });
    const nav = [[0xff4040, -1], [0x40ff70, 1]];
    if (!S) nav.forEach(([c, sx]) => { const m = sph(0.18, c, g, false); m.material = new T.MeshBasicMaterial({ color: c }); m.position.set(sx * 13.6, -0.2, -1.6); });
    return g;
  }

  // ---------- markfordon ----------
  function vehicle(type, color) {
    const g = new T.Group();
    const cab = (w, col) => { at(rbox(w, 1.0, 1.2, col || 0x7fd3f0, g, 0.25), 0, 1.9, -0.3); };
    switch (type) {
      case 'belt': {
        at(rbox(1.6, 0.7, 3.6, 0xf2b134, g, 0.25), 0, 0.6, 0);
        const belt = at(rbox(1.0, 0.25, 5.6, 0x3c4a63, g, 0.08), 0, 1.7, 1.8); belt.rotation.x = -0.4;
        wheel(0.38, 0.3, g, 0.75, 0.38, 1.2); wheel(0.38, 0.3, g, -0.75, 0.38, 1.2); wheel(0.38, 0.3, g, 0.75, 0.38, -1.2); wheel(0.38, 0.3, g, -0.75, 0.38, -1.2);
        break;
      }
      case 'train': {
        const tug = new T.Group(); g.add(tug);
        at(rbox(1.5, 1.0, 2.0, 0xf2b134, tug, 0.3), 0, 0.75, 0); at(rbox(1.25, 0.85, 0.85, 0x7fd3f0, tug, 0.22), 0, 1.6, -0.35);
        const bagCols = [0xe8634a, 0x3f6fd8, 0x8b5cf6, 0x2bb3a6, 0xf2b134, 0x1d2433];
        g.userData.carts = [];
        for (let i = 0; i < 3; i++) {
          const c = new T.Group(); c.position.z = -2.4 * (i + 1); g.add(c); g.userData.carts.push(c);
          at(rbox(1.5, 0.35, 2.0, 0x6b7489, c, 0.1), 0, 0.5, 0);
          for (let j = 0; j < 4; j++) at(rbox(0.58, 0.46, 0.75, bagCols[(i * 4 + j) % 6], c, 0.12), (j % 2 ? 0.35 : -0.35), 0.92 + (j > 1 ? 0.46 : 0), (j % 2 ? -0.25 : 0.33));
        }
        break;
      }
      case 'tug':
        at(rbox(2.4, 1.0, 4.0, 0xf2b134, g, 0.35), 0, 0.75, 0); at(rbox(1.5, 0.85, 1.2, 0x7fd3f0, g, 0.25), 0, 1.6, -1.0);
        for (const z of [1.3, -1.3]) for (const sx of [1, -1]) wheel(0.45, 0.4, g, sx * 1.1, 0.45, z);
        break;
      case 'stairs': {
        at(rbox(1.8, 0.8, 4.4, 0x3c4a63, g, 0.25), 0, 0.6, 0);
        at(rbox(1.5, 0.9, 1.2, 0x7fd3f0, g, 0.25), 0, 1.4, -1.6);
        const st = at(rbox(1.4, 0.35, 5.6, 0xe6eaf0, g, 0.1), 0, 2.4, 1.2); st.rotation.x = -0.62;
        at(rbox(1.6, 0.25, 1.4, 0xe6eaf0, g, 0.08), 0, 3.95, 3.6);
        for (const z of [1.4, -1.4]) for (const sx of [1, -1]) wheel(0.38, 0.3, g, sx * 0.85, 0.38, z);
        break;
      }
      case 'bus':
        at(rbox(2.6, 2.6, 8.6, 0x2bb3a6, g, 0.7), 0, 1.65, 0);
        at(rbox(2.7, 0.95, 7.8, 0x7fd3f0, g, 0.35, false), 0, 2.2, 0);
        at(rbox(2.72, 0.35, 8.65, 0xf4efe6, g, 0.13, false), 0, 0.95, 0);
        for (const z of [-2.8, 2.8]) for (const sx of [1, -1]) wheel(0.52, 0.45, g, sx * 1.2, 0.52, z);
        break;
      case 'fuel':
        at(rbox(2.2, 2.0, 2.6, 0xe8634a, g, 0.45), 0, 1.4, 2.8);
        at(rbox(2.05, 0.8, 1.9, 0x7fd3f0, g, 0.25, false), 0, 2.05, 3.1);
        at(cyl(1.2, 1.2, 5.2, 0xf4efe6, g), 0, 1.75, -1.1).rotation.x = Math.PI / 2;
        at(cyl(1.22, 1.22, 0.9, 0xe8634a, g, 18, false), 0, 1.75, -1.1).rotation.x = Math.PI / 2;
        for (const z of [2.6, -0.4, -2.6]) for (const sx of [1, -1]) wheel(0.47, 0.4, g, sx * 1.1, 0.47, z);
        break;
      case 'catering':
        at(rbox(2.1, 1.8, 2.1, 0xf4efe6, g, 0.35), 0, 1.15, 2.6);
        at(rbox(2.2, 0.45, 4.8, 0x3c4a63, g, 0.18), 0, 0.6, -0.4);
        for (const s of [1, -1]) { const x = at(rbox(0.14, 3.6, 0.18, 0x9aa3b0, g, 0.05, false), s * 0.8, 2.4, -0.4); x.rotation.x = s * 0.8; }
        at(rbox(2.2, 2.1, 4, 0xf4efe6, g, 0.35), 0, 4.8, -0.4);
        at(rbox(2.25, 0.45, 4.05, 0xe8634a, g, 0.13, false), 0, 4.4, -0.4);
        for (const z of [1.8, -1.8]) for (const sx of [1, -1]) wheel(0.45, 0.4, g, sx * 1.0, 0.45, z);
        break;
      case 'deice': { // avisningsbil: tank, bom och korg
        at(rbox(2.2, 1.9, 2.2, 0x3f6fd8, g, 0.4), 0, 1.35, 2.7); at(rbox(2.05, 0.8, 1.6, 0x7fd3f0, g, 0.25, false), 0, 1.95, 3.0);
        at(rbox(2.3, 1.7, 4.4, 0xf2b134, g, 0.5), 0, 1.45, -0.9);
        const boom = new T.Group(); boom.position.set(0, 2.4, -2.4); g.add(boom); boom.rotation.x = -0.7;
        at(rbox(0.5, 0.5, 6, 0xe6eaf0, boom, 0.15), 0, 0, 3);
        at(rbox(1.4, 1.0, 1.4, 0xe8634a, boom, 0.25), 0, 0.3, 6.2);
        g.userData.boom = boom;
        for (const z of [2.4, -0.6, -2.4]) for (const sx of [1, -1]) wheel(0.47, 0.4, g, sx * 1.1, 0.47, z);
        break;
      }
      case 'plow': { // snöplog: lastbil med stort snett blad
        at(rbox(2.3, 2.0, 2.4, 0xff7a2f, g, 0.45), 0, 1.5, 1.6); at(rbox(2.15, 0.8, 1.8, 0x7fd3f0, g, 0.25, false), 0, 2.1, 1.9);
        at(rbox(2.3, 1.2, 3.6, 0x3c4a63, g, 0.3), 0, 1.0, -1.4);
        const bl = at(rbox(4.6, 1.3, 0.35, 0xf2b134, g, 0.15), 0, 0.8, 3.6); bl.rotation.y = 0.35;
        at(sph(0.22, 0xff9a1f, g, false), 0, 2.75, 1.6);
        for (const z of [1.6, -1.6]) for (const sx of [1, -1]) wheel(0.55, 0.45, g, sx * 1.15, 0.55, z);
        break;
      }
      case 'loader': { // highloader för fraktpallar
        at(rbox(2.6, 0.6, 5.2, 0x3c4a63, g, 0.2), 0, 0.6, 0);
        at(rbox(1.4, 1.3, 1.3, 0x7fd3f0, g, 0.25), -0.5, 1.5, 2.2);
        const deck = at(rbox(2.6, 0.3, 3.4, 0xf2b134, g, 0.1), 0, 2.4, -0.6);
        for (const sx of [1, -1]) { const x = at(rbox(0.14, 2.2, 0.16, 0x9aa3b0, g, 0.04, false), sx * 1.0, 1.5, -0.6); x.rotation.x = sx * 0.7; }
        g.userData.deck = deck;
        for (const z of [1.8, -1.8]) for (const sx of [1, -1]) wheel(0.42, 0.35, g, sx * 1.2, 0.42, z);
        break;
      }
      case 'ambulance':
        at(rbox(2.0, 2.0, 4.2, 0xf4efe6, g, 0.45), 0, 1.3, -0.3); at(rbox(1.95, 1.3, 1.4, 0xf4efe6, g, 0.4), 0, 1.0, 2.3);
        at(rbox(1.97, 0.7, 1.0, 0x7fd3f0, g, 0.22, false), 0, 1.5, 2.2);
        at(rbox(2.04, 0.35, 5.6, 0xe8634a, g, 0.1, false), 0, 1.1, 0.4);
        g.userData.beacon = at(sph(0.22, 0x3f6fd8, g, false), 0, 2.45, 1.4);
        for (const z of [1.7, -1.6]) for (const sx of [1, -1]) wheel(0.42, 0.35, g, sx * 0.95, 0.42, z);
        break;
      case 'van':
      default:
        at(rbox(1.9, 1.8, 3.6, 0xf4efe6, g, 0.45), 0, 1.2, 0); at(rbox(1.95, 0.8, 1.2, 0x7fd3f0, g, 0.25, false), 0, 1.65, 1.2);
        at(rbox(1.95, 0.3, 3.65, color || 0x3f6fd8, g, 0.1, false), 0, 0.82, 0);
        at(rbox(1.0, 0.22, 0.45, 0xf2b134, g, 0.08, false), 0, 2.2, 0);
        for (const z of [1.2, -1.2]) for (const sx of [1, -1]) wheel(0.42, 0.35, g, sx * 0.9, 0.42, z);
        break;
    }
    return g;
  }
  function followMe() {
    const g = new T.Group();
    const checker = tex((x, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#1d2433' : '#ffffff'; x.fillRect(i * w / 8, j * h / 2, w / 8, h / 2); } }, 256, 64);
    at(rbox(2.1, 1.0, 4.2, 0xf2c62e, g, 0.4), 0, 0.85, 0);
    at(rbox(1.9, 0.9, 2.2, 0xf2c62e, g, 0.35), 0, 1.7, -0.3);
    at(rbox(1.95, 0.55, 2.0, 0x7fd3f0, g, 0.2, false), 0, 1.75, -0.2);
    for (const sx of [1, -1]) { const d = decal(checker, 3.8, 0.45, g); d.position.set(sx * 1.07, 0.75, 0); d.rotation.y = sx * Math.PI / 2; }
    at(rbox(1.7, 0.55, 0.5, 0x1d2433, g, 0.12), 0, 2.45, -0.3);
    const fm = textTex('FOLLOW ME', 512, 140, '#1d2433', '#f2c62e', '700 92px Fredoka, sans-serif');
    for (const sz of [1, -1]) { const d = decal(fm, 1.6, 0.44, g); d.position.set(0, 2.45, -0.3 + sz * 0.27); d.rotation.y = sz > 0 ? 0 : Math.PI; }
    g.userData.beacon = at(sph(0.2, 0xff9a1f, g, false), 0, 2.85, -0.3);
    for (const z of [1.3, -1.3]) for (const sx of [1, -1]) wheel(0.42, 0.35, g, sx * 0.98, 0.42, z);
    return g;
  }

  // ---------- människor ----------
  const skins = [0xf3c9a5, 0xe0a983, 0xb97a55, 0x8a5a3c, 0xf7d9c0];
  const hairs = [0x3b2a20, 0x1d2433, 0xd9a441, 0x8a5a3c, 0xb0b6c2];
  function person(o) {
    const g = new T.Group();
    const legs = [], arms = [];
    const pivot = (m, y) => { m.geometry = m.geometry.clone().translate(0, y, 0); m.children.forEach((c) => (c.geometry = c.geometry.clone().translate(0, y, 0))); return m; };
    for (const sx of [1, -1]) { const l = pivot(cyl(0.16, 0.14, 0.9, o.pants, g, 8), -0.45); l.position.set(sx * 0.19, 0.9, 0); legs.push(l); }
    at(rbox(0.8, 1.05, 0.5, o.shirt, g, 0.2), 0, 1.4, 0);
    if (o.vest) { at(rbox(0.86, 0.6, 0.56, o.vest, g, 0.18, false), 0, 1.45, 0); at(rbox(0.88, 0.1, 0.58, 0xe6eaf0, g, 0.03, false), 0, 1.35, 0); }
    if (o.tie) { at(rbox(0.3, 0.6, 0.1, 0xffffff, g, 0.05, false), 0, 1.6, 0.25); at(rbox(0.12, 0.5, 0.1, o.tie, g, 0.04, false), 0, 1.55, 0.29); }
    for (const sx of [1, -1]) { const a = pivot(cyl(0.12, 0.11, 0.85, o.shirt, g, 8), -0.42); a.position.set(sx * 0.52, 1.85, 0); arms.push(a); }
    at(sph(0.36, o.skin, g), 0, 2.28, 0);
    const hair = sph(0.38, o.hair, g, false); hair.position.set(0, 2.36, -0.05); hair.scale.set(1, 0.72, 0.95);
    if (o.cap) { at(cyl(0.39, 0.39, 0.2, o.cap, g, 14), 0, 2.58, 0); at(rbox(0.44, 0.06, 0.36, o.cap, g, 0.03, false), 0, 2.5, 0.36); }
    if (o.ear) for (const sx of [1, -1]) at(sph(0.13, 0xff7a2f, g, false), sx * 0.36, 2.3, 0);
    for (const sx of [1, -1]) at(sph(0.05, 0x1d2433, g, false), sx * 0.12, 2.32, 0.33);
    if (o.bag) { at(rbox(0.5, 0.65, 0.3, o.bag, g, 0.12), 0.72, 0.5, -0.1); }
    if (o.clip) { const c = at(rbox(0.42, 0.56, 0.06, 0x8a5a3c, g, 0.04), 0.46, 1.35, 0.32); c.rotation.x = -0.4; }
    if (o.wands) for (const a of arms) { const w = at(cyl(0.06, 0.06, 0.7, 0xff7a2f, a, 6, false), 0, -0.95, 0); }
    g.userData = { legs, arms, phase: Math.random() * 6 };
    g.traverse((m) => { if (m.isMesh && m.material !== inkMat) m.castShadow = true; });
    g.scale.setScalar(o.scale || 0.78);
    return g;
  }
  function animate(p, speed, dt) {
    const u = p.userData, moving = speed > 0.1; u.phase += dt * (moving ? 7 + speed * 0.9 : 2);
    const sw = moving ? Math.sin(u.phase) * Math.min(0.9, 0.45 + speed * 0.05) : 0;
    u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw; u.arms[0].rotation.x = -sw * 0.8; u.arms[1].rotation.x = sw * 0.8;
    p.position.y = (u.baseY || 0) + (moving ? Math.abs(Math.sin(u.phase)) * 0.08 : 0);
  }
  const crewLook = (i) => ({ shirt: 0x3c4a63, pants: 0x3c4a63, skin: skins[i % 5], hair: hairs[(i + 2) % 5], vest: i % 3 === 2 ? 0xc6f03c : 0xff9a1f, cap: i % 2 ? 0x3c4a63 : null, ear: 1 });
  const paxLook = (i) => ({ shirt: [0xe8634a, 0x8b5cf6, 0x3f6fd8, 0xf2b134, 0x2bb3a6, 0xf28cb1][i % 6], pants: [0x232c40, 0x3c4a63, 0x8a5a3c][i % 3], skin: skins[i % 5], hair: hairs[i % 5], bag: [0xe8634a, 0x3f6fd8, 0x8b5cf6, 0x1d2433][i % 4] });

  SH.G = { T, toon, inkMat, rbox, cyl, cone, sph, at, wheel, tex, textTex, decal, hex, grad, plane, vehicle, followMe, person, animate, crewLook, paxLook };
})();
