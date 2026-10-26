// SkyHub – bygger den statiska världen (mark, markeringar, terminal, bryggor, torn, depå, natur).
(function () {
  const SH = (window.SH = window.SH || {});
  const { T, toon, rbox, cyl, sph, at, tex, textTex, decal, grad } = SH.G;
  const D = SH.D, L = D.layout;

  function build(scene, name) {
    const W = { colliders: { boxes: [], circles: [] }, occluders: [], bridges: {}, lights: [], flat: {} };
    let tgt = scene; // utbyggnader ritas i en egen grupp som kan visas när de är byggda
    const add = (o) => (tgt.add(o), o);
    const base = L.stands.filter((s) => !s.pier);

    // ---------- markband (alla platta linjer samlas per färg till en mesh) ----------
    const batches = {};
    function ribbon(color, pts, w, y) {
      const b = batches[color] || (batches[color] = []);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], c = pts[i], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
        b.push([a[0] + nx, y, a[1] + nz], [a[0] - nx, y, a[1] - nz], [c[0] - nx, y, c[1] - nz], [a[0] + nx, y, a[1] + nz], [c[0] - nx, y, c[1] - nz], [c[0] + nx, y, c[1] + nz]);
      }
    }
    const rect = (color, x0, z0, x1, z1, y) => { const b = batches[color] || (batches[color] = []); b.push([x0, y, z0], [x0, y, z1], [x1, y, z1], [x0, y, z0], [x1, y, z1], [x1, y, z0]); };
    const dashes = (color, x0, x1, z, len, gap, w, y) => { for (let x = x0; x < x1; x += len + gap) rect(color, x, z - w / 2, Math.min(x + len, x1), z + w / 2, y); };
    function flush() {
      Object.entries(batches).forEach(([c, tris]) => {
        const g = new T.BufferGeometry(), arr = new Float32Array(tris.length * 3);
        tris.forEach((p, i) => arr.set(p, i * 3)); delete batches[c];
        g.setAttribute('position', new T.BufferAttribute(arr, 3)); g.computeVertexNormals();
        const m = new T.Mesh(g, new T.MeshToonMaterial({ color: +c, gradientMap: grad, side: T.DoubleSide })); m.receiveShadow = true; add(m);
        if (tgt === scene) W.flat[c] = m;
      });
    }
    const arc = (cx, cz, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });

    // ---------- mark ----------
    const grass = new T.Mesh(new T.PlaneGeometry(1400, 1000), toon(0x86c96a)); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; add(grass);
    for (let x = -700; x < 700; x += 18) rect(0x7cbf61, x, -500, x + 9, 500, 0.004);
    // plattan (betong med fogar)
    const ax0 = L.laneX[0] - 14, ax1 = L.laneX[1] + 14, az0 = L.taxilaneZ - 12, az1 = 0;
    const apronTex = tex((x, w, h) => { x.fillStyle = '#d9dee5'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c7ced8'; x.lineWidth = 2; for (let i = 0; i <= 64; i++) { x.beginPath(); x.moveTo(i * w / 64, 0); x.lineTo(i * w / 64, h); x.stroke(); } for (let i = 0; i <= 14; i++) { x.beginPath(); x.moveTo(0, i * h / 14); x.lineTo(w, i * h / 14); x.stroke(); } }, 2048, 448);
    const apron = new T.Mesh(new T.PlaneGeometry(ax1 - ax0, az1 - az0), new T.MeshToonMaterial({ map: apronTex, gradientMap: grad }));
    apron.rotation.x = -Math.PI / 2; apron.position.set((ax0 + ax1) / 2, 0.01, (az0 + az1) / 2); apron.receiveShadow = true; add(apron);
    // taxibana, anslutningar, bana
    const asph = 0x535b6e, rwyC = 0x474e60;
    rect(asph, L.threshold - 8, L.taxiwayZ - 5, L.laneX[1] + 8, L.taxiwayZ + 5, 0.012);
    for (const x of L.laneX) rect(asph, x - 6, L.taxiwayZ, x + 6, az0 + 1, 0.012);
    rect(asph, L.threshold - 6, L.runwayZ, L.threshold + 6, L.taxiwayZ, 0.012);
    ribbon(asph, [[L.exit.from - 10, L.runwayZ], [L.exit.to, L.taxiwayZ]], 12, 0.013);
    rect(rwyC, L.runwayX[0], L.runwayZ - 9, L.runwayX[1], L.runwayZ + 9, 0.014);
    // bana: kantlinjer, mittlinje, tröskel, siffror, sättningszon
    rect(0xffffff, L.runwayX[0], L.runwayZ - 8.2, L.runwayX[1], L.runwayZ - 7.8, 0.02);
    rect(0xffffff, L.runwayX[0], L.runwayZ + 7.8, L.runwayX[1], L.runwayZ + 8.2, 0.02);
    dashes(0xffffff, L.runwayX[0] + 40, L.runwayX[1] - 40, L.runwayZ, 9, 7, 0.5, 0.02);
    for (const [x0, dir] of [[L.runwayX[0] + 4, 1], [L.runwayX[1] - 4, -1]]) {
      for (let i = 0; i < 8; i++) { const z = L.runwayZ - 7 + i * 1.9 + (i >= 4 ? 0.8 : 0); rect(0xffffff, Math.min(x0, x0 + dir * 12), z, Math.max(x0, x0 + dir * 12), z + 0.9, 0.02); }
      for (const off of [60, 80]) for (const zz of [-4.5, 3]) rect(0xffffff, Math.min(x0 + dir * off, x0 + dir * (off + 8)), L.runwayZ + zz, Math.max(x0 + dir * off, x0 + dir * (off + 8)), L.runwayZ + zz + 1.5, 0.02);
    }
    for (const [txt, x, rot] of [['09', L.runwayX[0] + 26, -Math.PI / 2], ['27', L.runwayX[1] - 26, Math.PI / 2]]) {
      const m = decal(textTex(txt, 256, 192, null, '#ffffff', '700 170px "Fredoka", sans-serif'), 8, 6, null, true);
      m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, 0.03, L.runwayZ); add(m);
    }
    // gula mittlinjer
    const Y = 0xf2b134;
    ribbon(Y, [[L.laneX[0], L.taxilaneZ], [L.laneX[1], L.taxilaneZ]], 0.4, 0.025);
    ribbon(Y, [[L.threshold, L.taxiwayZ], [L.laneX[1], L.taxiwayZ]], 0.4, 0.025);
    for (const x of L.laneX) ribbon(Y, [[x, L.taxilaneZ], [x, L.taxiwayZ]], 0.4, 0.025);
    ribbon(Y, [[L.threshold, L.taxiwayZ], [L.threshold, L.runwayZ]], 0.4, 0.025);
    ribbon(Y, [[L.exit.from, L.runwayZ], [L.exit.to, L.taxiwayZ]], 0.4, 0.025);
    // väntelinje före banan
    for (let i = 0; i < 4; i++) rect(Y, L.threshold - 6, L.runwayZ + 15 + i * 0.6, L.threshold + 6, L.runwayZ + 15.25 + i * 0.6, 0.026);
    // serviceväg (två filer) och huvudlinje
    rect(0x6b7489, ax0, -7, ax1, -1, 0.015);
    dashes(0xffffff, ax0 + 2, ax1 - 2, -4, 2.5, 2, 0.18, 0.025);
    rect(0xffffff, ax0, -1.2, ax1, -1, 0.025); rect(0xffffff, ax0, -7, ax1, -6.8, 0.025);
    rect(0xe8634a, ax0, -7.6, ax1, -7.35, 0.025);
    for (let x = ax0 + 20; x < ax1 - 10; x += 40) {
      ribbon(0xffffff, [[x, L.roadZ[0]], [x + 3, L.roadZ[0]]], 0.25, 0.026); ribbon(0xffffff, [[x + 3, L.roadZ[0]], [x + 2, L.roadZ[0] + 0.6]], 0.25, 0.026); ribbon(0xffffff, [[x + 3, L.roadZ[0]], [x + 2, L.roadZ[0] - 0.6]], 0.25, 0.026);
      ribbon(0xffffff, [[x + 10, L.roadZ[1]], [x + 7, L.roadZ[1]]], 0.25, 0.026); ribbon(0xffffff, [[x + 7, L.roadZ[1]], [x + 8, L.roadZ[1] + 0.6]], 0.25, 0.026); ribbon(0xffffff, [[x + 7, L.roadZ[1]], [x + 8, L.roadZ[1] - 0.6]], 0.25, 0.026);
    }
    // uppställningsplatser
    function standMarks(st) {
      const sx = st.x, r = 12;
      ribbon(Y, [[sx + r + 4, L.taxilaneZ], ...arc(sx + r, L.taxilaneZ + r, r, -Math.PI / 2 - 0.0001, -Math.PI, 10).slice(1), [sx, L.stopZ - 1]], 0.4, 0.026);
      rect(Y, sx - 3, L.stopZ - 0.3, sx + 3, L.stopZ + 0.3, 0.027);
      rect(0x1d2433, sx - 1.5, L.stopZ - 3.4, sx + 1.5, L.stopZ - 2.6, 0.027);
      const half = 17;
      ribbon(0xe8634a, [[sx - half, -8], [sx - half, L.taxilaneZ + 9], [sx + half, L.taxilaneZ + 9], [sx + half, -8]], 0.28, 0.026);
      const n = decal(textTex(st.id, 256, 128, null, '#f2b134', '700 110px "Fredoka", sans-serif'), 4.4, 2.2, null, true);
      n.rotation.x = -Math.PI / 2; n.rotation.z = Math.PI; n.position.set(sx, 0.03, L.taxilaneZ + 12); add(n);
      // utrustningsruta (staging)
      ribbon(0xffffff, [[sx + 14, -9], [sx + 21, -9], [sx + 21, -20], [sx + 14, -20], [sx + 14, -9]], 0.18, 0.026);
    }
    base.forEach(standMarks);
    // depåns yta
    rect(0xc5ccd6, L.depot.x - 10, L.depot.z - 16, L.depot.x + 10, L.depot.z + 10, 0.016);
    flush();

    // ---------- kantljus (instansierade) ----------
    const lightGeo = new T.SphereGeometry(0.28, 8, 6);
    function lightsAlong(color, pts) {
      const m = new T.InstancedMesh(lightGeo, new T.MeshBasicMaterial({ color }), pts.length);
      const o = new T.Object3D(); pts.forEach((p, i) => { o.position.set(p[0], 0.3, p[1]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
      add(m); W.lights.push(m); return m;
    }
    const rl = []; for (let x = L.runwayX[0]; x <= L.runwayX[1]; x += 14) rl.push([x, L.runwayZ - 9.5], [x, L.runwayZ + 9.5]); lightsAlong(0xfff4c2, rl);
    const tl = []; for (let x = L.threshold; x <= L.laneX[1]; x += 10) tl.push([x, L.taxiwayZ - 5.8], [x, L.taxiwayZ + 5.8]); lightsAlong(0x5aa0ff, tl);
    const th = []; for (let z = -8; z <= 8; z += 2) th.push([L.runwayX[0] - 1, L.runwayZ + z]); lightsAlong(0x40ff70, th);

    // ---------- terminal ----------
    const TX = (L.terminal.x0 + L.terminal.x1) / 2, TW = L.terminal.x1 - L.terminal.x0;
    const term = new T.Group(); term.position.set(TX, 0, 10); add(term); W.occluders.push(term);
    at(rbox(TW, 10.5, 20, 0xf4efe6, term, 0.6), 0, 5.25, 0);
    at(rbox(TW - 6, 5.6, 0.7, 0x7fd3f0, term, 0.25), 0, 5.6, -10.1);
    const finCols = [0x2bb3a6, 0xe8634a, 0xf2b134, 0x3f6fd8];
    for (let i = 0, x = -TW / 2 + 3; x <= TW / 2 - 3; x += 4, i++) at(rbox(0.7, 7, 1.3, i % 4 === 1 ? finCols[(i >> 2) % 4] : 0x2e3a52, term, 0.2, i % 4 === 1), x, 5.5, -10.2);
    at(rbox(TW + 2, 0.9, 1.6, 0x2e3a52, term, 0.3), 0, 9.1, -10.3);
    at(rbox(TW + 4, 1.2, 23, 0x2e3a52, term, 0.5), 0, 11.1, 0);
    for (let x = -TW / 2 + 8; x <= TW / 2 - 8; x += 9) { const p = at(rbox(6.5, 0.3, 4, 0x27406e, term, 0.08), x, 12.1, 4); p.rotation.x = -0.25; }
    for (const x of [-TW / 3, 0, TW / 3]) { at(rbox(3, 1.6, 3, 0xc3cad4, term, 0.4), x, 12.5, -4); at(cyl(0.8, 0.8, 0.4, 0x9aa3b0, term, 14), x, 13.4, -4); }
    at(rbox(36, 3.2, 1.2, 0x2e3a52, term, 0.5), 0, 13.7, -8);
    const signMat = new T.MeshBasicMaterial({ map: null });
    const sign = new T.Mesh(new T.PlaneGeometry(34.5, 2.8), signMat); sign.position.set(0, 13.7, -8.65); sign.rotation.y = Math.PI; term.add(sign);
    W.setName = (n) => { signMat.map = textTex((n + ' flygplats').toUpperCase(), 1280, 104, '#2e3a52', '#f2b134', '700 78px "Fredoka", sans-serif'); signMat.needsUpdate = true; };
    W.setName(name);
    const ads = [['NORDVIND', 'Oslo på 59 min', '#3f6fd8'], ['TAX FREE', '−20 % på allt', '#e8634a'], ['FJÄLLFLYG', 'Hem till fjällen', '#2bb3a6'], ['TERMICO', 'Vi köar för dig', '#8b5cf6']];
    const contactXs = base.filter((s) => s.contact).map((s) => s.x + 6);
    ads.forEach(([a, b, bg], i) => {
      const ax = contactXs[i] + 12; if (ax > L.terminal.x1 - 6) return;
      const t = tex((x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '700 70px Fredoka, sans-serif'; x.fillText(a, w / 2, 86); x.font = '600 40px Nunito, sans-serif'; x.fillText(b, w / 2, 150); }, 512, 200);
      at(rbox(9.4, 3.9, 0.4, 0x2e3a52, term, 0.2), ax - TX, 2.3, -10.6);
      const d = decal(t, 9, 3.5, term); d.position.set(ax - TX, 2.3, -10.82); d.rotation.y = Math.PI;
    });
    // bagageport
    at(rbox(5, 3.2, 0.6, 0x3c4a63, term, 0.3), L.busStop.x - 12 - TX, 1.6, -10.1);

    // ---------- bryggor ----------
    function bridgeFor(st, signParent, signX, signZ) {
      const rx = st.x + 6, rz = -9, H = 4.6;
      const g = new T.Group(); add(g); W.occluders.push(g);
      at(rbox(2.6, 2.8, 9, 0xe6eaf0, g, 0.4), rx, H, -4.4);           // fast gång över vägen
      at(cyl(0.35, 0.35, H - 1.4, 0x6b7489, g, 8), rx, (H - 1.4) / 2, -0.5);
      at(cyl(1.8, 1.8, 3.2, 0xe6eaf0, g), rx, H, rz);                 // rotunda
      at(cyl(0.4, 0.4, H, 0x6b7489, g, 10), rx, H / 2, rz);
      const gs = decal(textTex(st.id, 220, 90, '#f2b134', '#1d2433', '700 64px "Fredoka", sans-serif'), 4.2, 1.7, signParent);
      gs.position.set(rx - signX, 9.4, signZ); gs.rotation.y = Math.PI;
      // teleskopdel: pivot i rotundan, roteras och skalas mot planets dörr
      const piv = new T.Group(); piv.position.set(rx, H, rz); g.add(piv);
      const tube = rbox(2.8, 3, 1, 0xe6eaf0, piv, 0.4); tube.position.z = 0.5;
      const stripe = rbox(2.9, 0.5, 0.92, 0x3f6fd8, piv, 0.15, false); stripe.position.set(0, 1, 0.5);
      const leg = new T.Group(); piv.add(leg);
      at(cyl(0.3, 0.3, 1, 0x6b7489, leg, 8), 0, 0, 0);
      W.bridges[st.id] = { piv, tube, stripe, leg, rx, rz, H, cur: { yaw: Math.PI * 0.85, len: 6, pitch: 0 } };
      W.colliders.circles.push({ x: rx, z: rz, r: 2.0 });
    }
    base.filter((s) => s.contact).forEach((st) => bridgeFor(st, term, TX, -11.15));

    // ---------- belysningsmaster ----------
    function mast(st) {
      const x = st.x + 18, z = -8.6;
      const g = new T.Group(); g.position.set(x, 0, z); add(g);
      at(cyl(0.3, 0.45, 20, 0xc3cad4, g, 8), 0, 10, 0);
      const head = at(rbox(3, 0.8, 1.2, 0x3c4a63, g, 0.2), 0, 20, -0.4);
      const lamp = at(rbox(2.6, 0.2, 0.9, 0xfff4c2, g, 0.05, false), 0, 19.55, -0.4); lamp.material = new T.MeshBasicMaterial({ color: 0x888060 });
      W.lights.push(lamp);
      W.colliders.circles.push({ x, z, r: 0.7 });
    }
    base.forEach(mast);

    // ---------- depå ----------
    const dep = new T.Group(); dep.position.set(L.depot.x, 0, L.depot.z - 13); add(dep); W.occluders.push(dep);
    at(rbox(18, 6, 8, 0xc3cad4, dep, 0.5), 0, 3, 0);
    const roof = cyl(9.4, 9.4, 18.6, 0x9aa3b0, dep, 20); roof.rotation.z = Math.PI / 2; roof.scale.set(0.35, 1, 0.45); roof.position.y = 6;
    for (let i = 0; i < 3; i++) at(rbox(4.6, 4.2, 0.3, 0x3c4a63, dep, 0.15), -6 + i * 6, 2.3, -4.1);
    const ds = decal(textTex('MARKTJÄNST', 512, 90, '#2e3a52', '#f2b134', '700 64px "Fredoka", sans-serif'), 9, 1.6, dep); ds.position.set(0, 5.2, -4.2); ds.rotation.y = Math.PI;
    W.colliders.boxes.push({ x: L.depot.x, z: L.depot.z - 13, hw: 9.4, hd: 4.4, rot: 0 });

    // ---------- flygledartorn (landsidan) ----------
    const tw = new T.Group(); tw.position.set(L.terminal.x1 + 22, 0, 20); add(tw);
    at(cyl(3.2, 4, 3, 0xf4efe6, tw), 0, 1.5, 0);
    at(cyl(2, 2.6, 26, 0xf4efe6, tw), 0, 16, 0);
    for (let y = 6; y < 28; y += 4) at(cyl(2.3, 2.3, 0.8, 0x2bb3a6, tw, 18, false), 0, y, 0);
    at(cyl(5, 3, 2, 0x2e3a52, tw, 10), 0, 30, 0);
    at(cyl(5.2, 4.8, 3.2, 0x7fd3f0, tw, 10), 0, 32.6, 0);
    at(cyl(5.8, 5.8, 0.8, 0x2e3a52, tw, 10), 0, 34.6, 0);
    at(sph(1.2, 0xf4efe6, tw), 0, 35.8, 0);
    at(cyl(0.12, 0.12, 4, 0x3c4a63, tw, 6, false), 0, 38, 0);
    W.beacon = at(sph(0.35, 0xe8634a, tw, false), 0, 40, 0);
    const tws = decal(textTex(D.contractors.atc.name.toUpperCase(), 512, 64, '#2e3a52', '#ffffff', '700 40px "Fredoka", sans-serif'), 8, 1, tw); tws.position.set(0, 29.6, -4.4); tws.rotation.y = Math.PI;

    // ---------- landsidan: väg, parkering ----------
    rect(0x535b6e, -260, 26, 260, 33, 0.01);
    const lot = new T.Group(); add(lot);

    // ---------- natur ----------
    const rng = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 160; i++) {
      let x = -380 + rng(i) * 760, z = rng(i + 500) * 1;
      const band = i % 3;
      z = band === 0 ? 40 + rng(i + 9) * 60 : band === 1 ? -150 - rng(i + 3) * 80 : -85 - rng(i + 7) * 15;
      if (band === 2 && (x > L.threshold - 20 && x < L.laneX[1] + 20)) continue;
      const g = new T.Group(); g.position.set(x, 0, z); add(g);
      at(cyl(0.4, 0.55, 2.4, 0x8a5a3c, g, 7), 0, 1.2, 0);
      const s = 1.8 + (i % 4) * 0.5, autumn = i % 9 === 0;
      at(sph(s, autumn ? 0xf2b134 : i % 3 ? 0x4fae5c : 0x3f9a52, g), 0, 3 + s * 0.8, 0);
      at(sph(s * 0.7, autumn ? 0xe8634a : i % 3 ? 0x62c06a : 0x4fae5c, g), s * 0.6, 2.6 + s * 0.6, s * 0.3);
    }
    W.clouds = [];
    for (let i = 0; i < 12; i++) {
      const g = new T.Group(); g.position.set(-400 + i * 70, 70 + (i % 3) * 10, -200 + (i % 4) * 80); add(g);
      for (let k = 0; k < 4; k++) { const s = sph(5 + (k % 2) * 2.5, 0xffffff, g, false); s.position.set(k * 5.5 - 8, (k % 2) * 2.5, (k % 3) * 2); s.castShadow = false; }
      W.clouds.push(g);
    }
    W.grass = grass;

    // ---------- utbyggnad: en ny pir med gates, platta, taxibana och terminalbyggnad ----------
    W.piers = {};
    W.addPier = (P) => {
      if (W.piers[P.id]) return W.piers[P.id];
      const g = new T.Group(); scene.add(g); W.piers[P.id] = g; tgt = g;
      const stands = L.stands.filter((s) => s.pier === P.id);
      // platta, taxibana, anslutning, serviceväg
      const ap = new T.Mesh(new T.PlaneGeometry(P.x1 - P.x0, az1 - az0), new T.MeshToonMaterial({ map: apronTex, gradientMap: grad }));
      ap.rotation.x = -Math.PI / 2; ap.position.set((P.x0 + P.x1) / 2, 0.011, (az0 + az1) / 2); ap.receiveShadow = true; add(ap);
      rect(asph, P.x0 - 8, L.taxiwayZ - 5, P.conn + 8, L.taxiwayZ + 5, 0.012);
      rect(asph, P.conn - 6, L.taxiwayZ, P.conn + 6, az0 + 1, 0.012);
      ribbon(Y, [[L.laneX[1], L.taxilaneZ], [P.conn, L.taxilaneZ]], 0.4, 0.025);
      ribbon(Y, [[L.laneX[1], L.taxiwayZ], [P.conn, L.taxiwayZ]], 0.4, 0.025);
      ribbon(Y, [[P.conn, L.taxilaneZ], [P.conn, L.taxiwayZ]], 0.4, 0.025);
      rect(0x6b7489, P.x0, -7, P.x1, -1, 0.015);
      dashes(0xffffff, P.x0 + 2, P.x1 - 2, -4, 2.5, 2, 0.18, 0.025);
      rect(0xffffff, P.x0, -1.2, P.x1, -1, 0.025); rect(0xffffff, P.x0, -7, P.x1, -6.8, 0.025); rect(0xe8634a, P.x0, -7.6, P.x1, -7.35, 0.025);
      stands.forEach(standMarks);
      flush();
      const tl2 = []; for (let x = L.laneX[1] + 10; x <= P.conn; x += 10) tl2.push([x, L.taxiwayZ - 5.8], [x, L.taxiwayZ + 5.8]); lightsAlong(0x5aa0ff, tl2);
      // pirbyggnaden: lägre och glasigare än huvudterminalen
      const bx = (P.t0 + P.t1) / 2, bw = P.t1 - P.t0;
      const pb = new T.Group(); pb.position.set(bx, 0, 7); add(pb); W.occluders.push(pb);
      at(rbox(bw, 8, 14, 0xf4efe6, pb, 0.6), 0, 4, 0);
      at(rbox(bw - 4, 4.6, 0.7, 0x7fd3f0, pb, 0.25), 0, 4.6, -7.1);
      for (let x = -bw / 2 + 3; x <= bw / 2 - 3; x += 5) at(rbox(0.6, 6, 1.1, 0x2e3a52, pb, 0.2), x, 4.4, -7.2);
      at(rbox(bw + 2, 1, 16, 0x2e3a52, pb, 0.5), 0, 8.4, 0);
      const ps = decal(textTex('PIR ' + P.id, 512, 110, '#2e3a52', '#f2b134', '700 80px "Fredoka", sans-serif'), 10, 2.1, pb); ps.position.set(-bw / 2 + 10, 7.4, -7.7); ps.rotation.y = Math.PI;
      W.colliders.boxes.push({ x: bx, z: 7, hw: bw / 2, hd: 7, rot: 0 });
      stands.filter((s) => s.contact).forEach((st) => bridgeFor(st, pb, bx, -8.2));
      stands.forEach(mast);
      tgt = scene;
      return g;
    };
    return W;
  }

  SH.World = { build };
})();
