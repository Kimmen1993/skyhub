// SkyHub – uppstart, spelloop, koppling simulering → 3D, chefen, kamera, inmatning, sparning.
(function () {
  const SH = window.SH, D = SH.D, L = D.layout, Sim = SH.Sim, X = SH.G, T = THREE;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = 'skyhub.game.v2';
  const store = {
    get() { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(SAVE_KEY, v); return true; } catch (e) { return false; } },
  };

  const G = { s: null, speed: 1, mode: 0, fidsOpen: false, opsOpen: false, opsTab: 'gates', selected: null, modalOpen: false, driving: false, lastLog: 0, reportN: -1 };
  const ui = SH.UI(G);

  // ---------- renderer, scen, ljus ----------
  const canvas = $('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  const scene = new T.Scene();
  const skyC = document.createElement('canvas'); skyC.width = 2; skyC.height = 256;
  const skyTex = new T.CanvasTexture(skyC); skyTex.encoding = T.sRGBEncoding; scene.background = skyTex;
  scene.fog = new T.Fog(0xcdeefb, 260, 620);
  const camera = new T.PerspectiveCamera(38, 1, 0.5, 2000);
  const hemi = new T.HemisphereLight(0xe3f4ff, 0x9bc88a, 0.6); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff0d0, 1.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 400 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);
  const mix = (a, b, k) => { const A = new T.Color(a), B = new T.Color(b); return A.lerp(B, k); };
  let lastSkyMin = -99;
  function setSky(t) {
    const h = (t % 1440) / 60;
    const day = h < 4.5 || h > 22 ? 0 : h < 7 ? (h - 4.5) / 2.5 : h > 19.5 ? 1 - (h - 19.5) / 2.5 : 1;
    sun.intensity = 0.15 + 0.9 * day; hemi.intensity = 0.32 + 0.3 * day;
    sun.color.copy(mix(0xffb070, 0xfff0d0, Math.min(1, day * 1.5)));
    if (Math.abs(t - lastSkyMin) < 3) return; lastSkyMin = t;
    const x = skyC.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
    const top = mix(0x0c1633, 0x4fa9e6, day), midc = mix(0x1d2a52, 0xa7dcf6, day), bot = mix(0x34406a, 0xcdeefb, day);
    if (day > 0.05 && day < 0.7) bot.lerp(new T.Color(0xffb38a), 0.5 * (1 - Math.abs(day - 0.35) / 0.35));
    g.addColorStop(0, '#' + top.getHexString()); g.addColorStop(0.65, '#' + midc.getHexString()); g.addColorStop(1, '#' + bot.getHexString());
    x.fillStyle = g; x.fillRect(0, 0, 2, 256); skyTex.needsUpdate = true;
    scene.fog.color.copy(bot);
    W && W.lights.forEach((m) => { if (m.material && m.material.color && m.isMesh && !m.isInstancedMesh) m.material.color.set(day < 0.4 ? 0xfff4c2 : 0x888060); });
  }

  // ---------- värld ----------
  let W = null;

  // ---------- aktörer: plan och fordon ----------
  const VISIBLE = new Set(['approach', 'rollout', 'taxiIn', 'stand', 'pushback', 'taxiOut', 'hold', 'takeoff']);
  const planes = new Map(), vehs = new Map();
  function syncPlanes(dt, now) {
    const s = G.s, seen = new Set();
    for (const f of s.flights) {
      if (!VISIBLE.has(f.phase)) continue;
      seen.add(f.id);
      let a = planes.get(f.id);
      if (!a) {
        const al = D.airlines[f.al];
        const g = X.plane(f.size, al.color, al.accent, f.al); g.scale.setScalar(D.aircraft[f.size].scale); g.userData.fid = f.id;
        scene.add(g); a = { g }; planes.set(f.id, a);
      }
      const A = D.aircraft[f.size];
      a.g.position.set(f.x, a.g.userData.gearY * A.scale + f.y, f.z);
      const pitch = f.phase === 'approach' ? -0.05 : f.phase === 'takeoff' && f.y > 0.3 ? -0.15 : 0;
      a.g.rotation.set(pitch, f.hd, 0, 'YXZ');
      (a.g.userData.props || []).forEach((p) => (p.rotation.z += dt * (f.phase === 'stand' ? (f.tasks && f.tasks.close.st === 'done' ? 18 : 0) : 40)));
    }
    for (const [id, a] of planes) if (!seen.has(id)) { scene.remove(a.g); planes.delete(id); }
  }
  function syncVehicles(dt) {
    const s = G.s, seen = new Set();
    for (const u of s.units.concat(s.ext)) {
      seen.add(u.id);
      let a = vehs.get(u.id);
      if (!a) { const g = X.vehicle(u.type); scene.add(g); a = { g, h: u.path ? u.hd || 0 : u.h }; vehs.set(u.id, a); }
      const target = u.path && u.hd != null ? u.hd : u.h;
      let d = target - a.h; d = Math.atan2(Math.sin(d), Math.cos(d)); a.h += d * Math.min(1, dt * 8);
      a.g.position.set(u.x, 0, u.z); a.g.rotation.y = a.h;
      if (u.honk && !a.honk) honk(V(u.x, 3, u.z));
      a.honk = u.honk;
    }
    for (const f of s.flights) { const a = planes.get(f.id); if (a) { if (f.honk && !a.honk) honk(V(f.x, 9, f.z), 'TUUUT!'); a.honk = f.honk; } }
    for (const [id, a] of vehs) if (!seen.has(id)) { scene.remove(a.g); vehs.delete(id); }
  }

  // ---------- bryggor ----------
  function syncBridges(dt) {
    const s = G.s;
    for (const [stand, b] of Object.entries(W.bridges)) {
      const f = s.flights.find((x) => x.stand === stand && x.phase === 'stand' && x.tasks);
      let tgt;
      const docked = f && ['run', 'done'].includes(f.tasks.connect.st) && f.tasks.close.st !== 'done';
      if (docked) {
        const A = D.aircraft[f.size], sc = A.scale, S = f.size === 'S';
        const door = V(f.x + (S ? 1.55 : 2.1) * sc + 1.0, (S ? 2.7 : 3.85) * sc + (S ? 0.3 : 0.5), f.z + (S ? 4.4 : 6.2) * sc);
        const dx = door.x - b.rx, dy = door.y - b.H, dz = door.z - b.rz, hz = Math.hypot(dx, dz);
        tgt = { yaw: Math.atan2(dx, dz), len: Math.max(2, Math.hypot(hz, dy) - 0.6), pitch: Math.atan2(dy, hz) };
      } else tgt = { yaw: Math.PI, len: 4.5, pitch: 0 };
      const c = b.cur, k = Math.min(1, dt * 1.5);
      let dy = tgt.yaw - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      c.yaw += dy * k; c.len += (tgt.len - c.len) * k; c.pitch += (tgt.pitch - c.pitch) * k;
      b.piv.rotation.set(-c.pitch, c.yaw, 0, 'YXZ');
      b.tube.scale.z = c.len; b.tube.position.z = c.len / 2; b.stripe.scale.z = c.len; b.stripe.position.z = c.len / 2;
      const legH = b.H + Math.sin(-c.pitch) * c.len * 0.72;
      b.leg.position.set(0, -legH / 2, c.len * 0.72); b.leg.scale.set(1, legH, 1); b.leg.rotation.x = c.pitch;
    }
  }

  // ---------- figurer: personal, marshaller, passagerare, vilsen passagerare ----------
  const pools = { crew: [], pax: [], marsh: [] };
  function pooled(kind, i) {
    const pool = pools[kind];
    while (pool.length <= i) {
      const look = kind === 'pax' ? X.paxLook(pool.length) : Object.assign(X.crewLook(pool.length), kind === 'marsh' ? { wands: 1, vest: 0xc6f03c } : {});
      const p = X.person(look); scene.add(p); pool.push(p);
    }
    return pool[i];
  }
  const lostP = X.person(Object.assign(X.paxLook(3), { shirt: 0xf28cb1 })); scene.add(lostP); lostP.visible = false;
  function syncPeople(dt, now) {
    const s = G.s, want = { crew: [], pax: [], marsh: [] };
    for (const f of s.flights) {
      if (f.phase === 'stand' && f.tasks) {
        const Tk = f.tasks, A = D.aircraft[f.size], sc = A.scale;
        if (Tk.chocks.st === 'run') want.crew.push({ x: f.x + 1.2, z: f.z + A.nose * 0.75, h: Math.PI, anim: 'work' });
        for (const k of ['unload', 'load']) if (Tk[k].st === 'run' && !Tk[k].paused) {
          const w = Sim.workSpot(f.stand, f.size, 'belt');
          want.crew.push({ x: w.x + 1.6, z: w.z - 3.6, h: Math.PI, anim: 'work' }, { x: w.x + 3.2, z: w.z - 5, h: -Math.PI / 2, anim: 'work' });
        }
        if (Tk.push.st === 'travel') { const w = Sim.workSpot(f.stand, f.size, 'tug'); want.crew.push({ x: w.x - 2, z: w.z - 3, h: Math.PI, anim: 'idle' }); }
        // passagerare vid fjärrplats: mellan buss och trappa
        if (!Sim.standById(f.stand).contact && (Tk.deboard.st === 'run' || Tk.board.st === 'run')) {
          const st = Sim.workSpot(f.stand, f.size, 'stairs'), bus = Sim.workSpot(f.stand, f.size, 'bus');
          const off = Tk.deboard.st === 'run';
          for (let i = 0; i < 6; i++) {
            const u = ((now / 5200 + i / 6) % 1);
            const a = off ? { x: st.x - 3, z: st.z } : { x: bus.x + 1.8, z: bus.z }, b = off ? { x: bus.x + 1.8, z: bus.z } : { x: st.x - 3, z: st.z };
            want.pax.push({ x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, h: Math.atan2(b.x - a.x, b.z - a.z), anim: 'walk' });
          }
        }
      }
      if (f.phase === 'pushback') { want.crew.push({ x: f.x + Math.sin(f.hd) * (D.aircraft[f.size].nose + 4) + 3, z: f.z + Math.cos(f.hd) * (D.aircraft[f.size].nose + 4), h: f.hd + Math.PI, anim: 'walk' }); }
      if (f.phase === 'taxiIn' && f.mv && f.mv.i > f.mv.pts.length - 16) {
        const st = Sim.standById(f.stand);
        want.marsh.push({ x: st.x, z: L.stopZ - 1.5, h: Math.PI, anim: 'wave' });
      }
    }
    for (const kind of ['crew', 'pax', 'marsh']) {
      const list = want[kind], pool = pools[kind];
      list.forEach((w, i) => {
        const p = pooled(kind, i); p.visible = true;
        p.position.x = w.x; p.position.z = w.z; p.rotation.y = w.h;
        if (w.anim === 'walk') X.animate(p, 4, dt);
        else {
          X.animate(p, 0, dt);
          const u = p.userData;
          if (w.anim === 'work') { u.arms[0].rotation.x = -1.2 + Math.sin(now / 260 + i) * 0.5; u.arms[1].rotation.x = -1.2 + Math.cos(now / 260 + i) * 0.5; }
          if (w.anim === 'wave') { u.arms[0].rotation.z = 2.6 + Math.sin(now / 300) * 0.4; u.arms[1].rotation.z = -2.6 - Math.sin(now / 300) * 0.4; u.arms[0].rotation.x = u.arms[1].rotation.x = 0; }
        }
      });
      for (let i = list.length; i < pool.length; i++) pool[i].visible = false;
    }
    const lp = s.problems.find((p) => p.type === 'lost');
    lostP.visible = !!lp;
    if (lp) { const a = now / 1400; lostP.position.set(lp.x + Math.cos(a) * 2, 0, lp.z + Math.sin(a) * 2); lostP.rotation.y = -a; X.animate(lostP, 2, dt); }
  }
  // skräp (FOD)
  const fodG = new T.Group(); scene.add(fodG); fodG.visible = false;
  [[0, 0, 0xc3cad4], [0.8, 0.5, 0xe8634a], [-0.6, 0.7, 0x3c4a63], [0.3, -0.7, 0xf2b134]].forEach(([x, z, c]) => { const m = X.rbox(0.5, 0.25, 0.4, c, fodG, 0.08); m.position.set(x, 0.13, z); m.rotation.y = x * 3; });

  // ---------- chefen och Follow me-bilen ----------
  const manager = X.person({ shirt: 0x2e3a52, pants: 0x232c40, skin: 0xf3c9a5, hair: 0x3b2a20, tie: 0xe8634a, clip: true, scale: 0.84 });
  scene.add(manager); manager.position.set(L.depot.x - 18, 0, -12);
  const car = X.followMe(); scene.add(car);
  const carS = { x: L.depot.x - 14, z: -16, h: Math.PI, v: 0 };
  let target = null, sprintToggle = false, speedWarnT = 0;
  const me = () => (G.driving ? V(carS.x, 0, carS.z) : manager.position);

  function dynColliders() {
    const s = G.s, list = [];
    for (const f of s.flights) {
      if (!['stand', 'pushback', 'taxiIn', 'taxiOut'].includes(f.phase) || f.z < L.taxilaneZ - 15) continue;
      const A = D.aircraft[f.size], sc = A.scale, S = f.size === 'S';
      const off = (A.nose - (A.len - A.nose)) / 2;
      list.push({ x: f.x + Math.sin(f.hd) * off, z: f.z + Math.cos(f.hd) * off, hw: (S ? 1.6 : 2.1) * sc, hd: A.len / 2, rot: f.hd });
      for (const sx of [1, -1]) { const ex = (S ? 3.6 : 5) * sc * sx, ez = (S ? 1.4 : 1.6) * sc; list.push({ x: f.x + ex * Math.cos(f.hd) + ez * Math.sin(f.hd), z: f.z - ex * Math.sin(f.hd) + ez * Math.cos(f.hd), hw: 1.1, hd: 1.6, rot: f.hd }); }
    }
    const SIZE = { belt: [0.9, 2.4], train: [0.85, 5.2, -3.6], tug: [1.3, 2.1], stairs: [1.0, 3.2], bus: [1.4, 4.4], fuel: [1.2, 4.2], catering: [1.2, 3.2], van: [1.0, 1.9] };
    for (const u of s.units.concat(s.ext)) { const [hw, hd, off] = SIZE[u.type] || [1, 2]; const a = vehs.get(u.id); const h = a ? a.h : u.h; list.push({ x: u.x + Math.sin(h) * (off || 0), z: u.z + Math.cos(h) * (off || 0), hw, hd, rot: h }); }
    return list;
  }
  function collide(p, dyn, R) {
    for (const b of W.colliders.boxes.concat(dyn)) {
      const c = Math.cos(b.rot), s = Math.sin(b.rot), dx = p.x - b.x, dz = p.z - b.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      const cx = Math.max(-b.hw, Math.min(b.hw, lx)), cz = Math.max(-b.hd, Math.min(b.hd, lz));
      const ox = lx - cx, oz = lz - cz, d = Math.hypot(ox, oz);
      if (d >= R) continue;
      let nx, nz, push;
      if (d > 1e-4) { nx = ox / d; nz = oz / d; push = R - d; }
      else { const px = b.hw - Math.abs(lx), pz = b.hd - Math.abs(lz); if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; push = px + R; } else { nx = 0; nz = Math.sign(lz) || 1; push = pz + R; } }
      p.x += (nx * c + nz * s) * push; p.z += (-nx * s + nz * c) * push;
    }
    for (const q of W.colliders.circles) { const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz); if (d < q.r + R && d > 1e-4) { const k = (q.r + R - d) / d; p.x += dx * k; p.z += dz * k; } }
    const B = L.bounds; p.x = Math.max(B.x0, Math.min(B.x1, p.x)); p.z = Math.max(B.z0, Math.min(B.z1, p.z));
  }
  function enterCar() { G.driving = true; manager.visible = false; target = null; ui.toast({ msg: 'Du sitter i Follow me-bilen. Kör lugnt nära planen.', kind: 'info' }); }
  function exitCar() {
    G.driving = false; manager.visible = true; target = null;
    manager.position.set(carS.x - Math.cos(carS.h) * 2.4, 0, carS.z + Math.sin(carS.h) * 2.4); collide(manager.position, [], 0.45);
  }

  // ---------- kamera ----------
  let yaw = 0, yawT = 0, dist = 16, ovDist = 270, pitch = 0.6, ovPitch = 0.7;
  const clampP = (v, a, b) => Math.max(a, Math.min(b, v));
  const oc = V(10, 0, -45);
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0);
  let modeK = 0;
  function setMode(m) { G.mode = m; if (G.opsOpen) ui.closeOps(); ui.hud(); }

  // ---------- problem-bubblor ----------
  const bubbles = new Map();
  const near = (p, r) => Math.hypot(me().x - p.x, me().z - p.z) < (r || (G.driving ? 6 : 4.5));
  const probPos = (p) => { if (p.type === 'breakdown') { const u = G.s.units.find((x) => x.id === p.unit); if (u) return V(u.x, 0, u.z); } if (p.type === 'lost') return lostP.position.clone().setY(0); return V(p.x, 0, p.z); };
  function fixHere() {
    for (const p of G.s.problems) {
      if (near(probPos(p))) {
        if (G.driving && Math.abs(carS.v) > 1.5) { ui.toast({ msg: 'Stanna bilen först.', kind: 'info' }); return true; }
        const pos = probPos(p); Sim.fixProblem(G.s, p.id, 'manager'); burst(pos.setY(2.5)); return true;
      }
    }
    return false;
  }
  function gotoProblem(id) {
    const p = G.s.problems.find((x) => x.id === id); if (!p) return;
    const pos = probPos(p);
    if (G.driving) exitCar();
    manager.position.set(pos.x + 4, 0, pos.z + 3); collide(manager.position, dynColliders(), 0.45);
    setMode(0); burst(V(manager.position.x, 1, manager.position.z));
  }
  function syncBubbles() {
    const s = G.s, seen = new Set();
    for (const p of s.problems) {
      seen.add(p.id);
      let el = bubbles.get(p.id);
      if (!el) {
        el = document.createElement('div'); el.className = 'bubble'; el.innerHTML = `<span class="ic">!</span><span class="txt"></span>`;
        el.addEventListener('click', (e) => { e.stopPropagation(); if (!fixHere()) gotoProblem(p.id); });
        $('bubbles').appendChild(el); bubbles.set(p.id, el);
      }
      el.querySelector('.txt').textContent = Sim.problemTitle(p) + (near(probPos(p)) ? ' · tryck F' : '');
      const pos = probPos(p); place(el, pos.clone().setY(p.type === 'lost' ? 3.4 : 4.4));
      el.classList.toggle('near', near(pos));
    }
    for (const [id, el] of bubbles) if (!seen.has(id)) { el.remove(); bubbles.delete(id); }
    const fod = s.problems.find((p) => p.type === 'fod'); fodG.visible = !!fod; if (fod) fodG.position.set(fod.x, 0, fod.z);
    carBubble.hidden = G.driving || G.mode === 1; if (!carBubble.hidden) { place(carBubble, V(carS.x, 4, carS.z)); carBubble.classList.toggle('near', near(carS, 3.8)); }
  }
  const carBubble = document.createElement('div'); carBubble.className = 'bubble car'; carBubble.innerHTML = '<span class="ic">FM</span><span class="txt">Follow me-bilen · F kliv in</span>';
  carBubble.addEventListener('click', (e) => { e.stopPropagation(); if (near(carS, 3.8)) enterCar(); else { target = V(carS.x, 0, carS.z); setMode(0); } });
  $('bubbles').appendChild(carBubble);
  function place(el, p) { const s = p.project(camera); el.style.left = ((s.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - s.y) / 2 * innerHeight) + 'px'; el.hidden = s.z > 1 || s.z < -1; }
  const honks = [];
  function honk(pos, txt) { const el = document.createElement('div'); el.className = 'honk'; el.textContent = txt || 'TUUT!'; document.body.appendChild(el); honks.push({ el, pos, life: 1.4 }); }
  const stars = [];
  function burst(p) { for (let i = 0; i < 12; i++) { const m = X.sph(0.2, i % 2 ? 0xf2b134 : 0xffffff, scene, false); m.position.copy(p); stars.push({ m, v: V((Math.random() - 0.5) * 8, 6 + Math.random() * 4, (Math.random() - 0.5) * 8), life: 1 }); } }

  // ---------- inmatning ----------
  const keys = new Set();
  function action() {
    if (fixHere()) return;
    if (G.driving) { if (Math.abs(carS.v) > 1.5) { ui.toast({ msg: 'Stanna bilen först.', kind: 'info' }); return; } exitCar(); return; }
    if (near(carS, 3.8)) enterCar();
  }
  addEventListener('keydown', (e) => {
    if (G.modalOpen || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (G.opsOpen && e.key !== 'Escape') return;
    const k = e.key.toLowerCase(); keys.add(k);
    if (k === 'f' || k === ' ') { e.preventDefault(); action(); }
    if (k === 'tab' || k === 'o') { e.preventDefault(); setMode(G.mode ? 0 : 1); }
    if (k === 'p') { G.speed = G.speed ? 0 : 1; ui.hud(); }
    if (k === '1' || k === '2' || k === '3') { G.speed = [1, 2, 4][+k - 1]; ui.hud(); }
    if (k === 'escape') { if (G.opsOpen) ui.closeOps(); else G.selected = null; }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  const ray = new T.Raycaster(), groundPlane = new T.Plane(V(0, 1, 0), 0);
  const ptrs = new Map(); let drag = null, pinch = 0;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, btn: e.button }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) { if (G.mode) ovDist = Math.max(90, Math.min(520, ovDist * pinch / d)); else dist = Math.max(8, Math.min(40, dist * pinch / d)); } pinch = d; drag = null; return; }
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
    if (drag.moved) {
      const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
      if (G.mode === 1 && drag.btn === 0) {
        const k = ovDist / 700, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
        oc.x += -rx * dx * k + fx * dy * k; oc.z += -rz * dx * k + fz * dy * k;
        oc.x = Math.max(-300, Math.min(300, oc.x)); oc.z = Math.max(-160, Math.min(40, oc.z));
      } else {
        yawT -= dx * 0.008; yaw = yawT;
        if (G.mode) ovPitch = clampP(ovPitch + dy * 0.004, 0.3, 1.45); else pitch = clampP(pitch + dy * 0.005, 0.1, 1.4);
      }
    }
    drag.lx = e.clientX; drag.ly = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
    if (!drag || drag.moved || drag.btn !== 0) { drag = null; return; }
    drag = null;
    const ndc = new T.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([...planes.values()].map((a) => a.g), true);
    if (hits.length) { let o = hits[0].object; while (o && o.userData.fid == null) o = o.parent; if (o) { G.selected = o.userData.fid; return; } }
    const p = V(0, 0, 0); if (!ray.ray.intersectPlane(groundPlane, p)) return;
    const B = L.bounds; p.x = Math.max(B.x0, Math.min(B.x1, p.x)); p.z = Math.max(B.z0, Math.min(B.z1, p.z));
    if (G.mode === 1) {
      if (G.driving) exitCar();
      manager.position.set(p.x, 0, p.z); collide(manager.position, dynColliders(), 0.45); target = null; setMode(0); burst(V(p.x, 1, p.z));
    } else if (!G.driving && near(carS, 3.8) && Math.hypot(p.x - carS.x, p.z - carS.z) < 3) enterCar();
    else target = p;
  });
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = 0; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const k = Math.exp(e.deltaY * 0.001); if (G.mode) ovDist = Math.max(90, Math.min(520, ovDist * k)); else dist = Math.max(8, Math.min(40, dist * k)); }, { passive: false });

  // ---------- knappar ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset, s = G.s;
    const pair = (v) => v.split(':');
    if (d.speed != null) { G.speed = +d.speed; ui.hud(); }
    else if (d.dock) { if (d.dock === 'floor') { if (G.opsOpen) ui.closeOps(); } else ui.openOps(d.dock); }
    else if (d.otab) { G.opsTab = d.otab; ui.ops(true); ui.hud(); }
    else if (d.unselect) G.selected = null;
    else if (d.fids) { G.fidsOpen = !G.fidsOpen; ui.tick(me()); }
    else if (d.sel) { G.selected = +d.sel; G.fidsOpen = false; const f = s.flights.find((x) => x.id === G.selected); if (f && G.mode === 1 && VISIBLE.has(f.phase)) { oc.x = f.x; oc.z = f.z; } ui.tick(me()); }
    else if (d.goto) { if (G.opsOpen) ui.closeOps(); gotoProblem(+d.goto); }
    else if (d.mech) Sim.dispatchMechanic(s, +d.mech);
    else if (d.rush) { const [fid, k] = pair(d.rush); Sim.rushExt(s, +fid, k); ui.ops(true); }
    else if (d.break) { Sim.teamBreak(s, +d.break); ui.ops(true); }
    else if (d.train) { Sim.teamTrain(s, +d.train); ui.ops(true); }
    else if (d.hire) { const [c, tm] = pair(d.hire); Sim.hire(s, +c, +tm); ui.ops(true); }
    else if (d.fire) { const [tm, m] = pair(d.fire); Sim.fire(s, +tm, +m); ui.ops(true); }
    else if (d.shift) { const [tm, dir] = pair(d.shift); const team = s.teams.find((x) => x.id === +tm); if (team) { const a = Math.max(0, Math.min(24 - (team.shift[1] - team.shift[0]), team.shift[0] + +dir)); Sim.setShift(s, team.id, a, a + (team.shift[1] - team.shift[0])); } ui.ops(true); }
    else if (d.service) { Sim.serviceUnit(s, +d.service); ui.ops(true); }
    else if (d.buy) { if (Sim.buyUnit(s, d.buy)) ui.toast({ msg: `${D.equipment[d.buy].name} köpt!`, kind: 'good' }); ui.ops(true); }
    else if (d.buyout) { Sim.buyOut(s, +d.buyout); ui.ops(true); }
    else if (d.premium) { const [k, on] = pair(d.premium); Sim.setPremium(s, k, on === '1'); ui.ops(true); }
    else if (d.move) { const [fid, st] = pair(d.move); Sim.reassign(s, +fid, st); ui.ops(true); }
    else if (d.autoassign) { Sim.autoAssign(s); ui.ops(true); }
    else if (d.act === 'close') ui.close();
    else if (d.act === 'start') { const n = ($('nameIn').value || 'Norrvik').trim().slice(0, 22) || 'Norrvik'; newGame(n); ui.close(); }
    else if (d.act === 'save') { const ok = save(); const m = $('menuMsg'); if (m) m.textContent = ok ? 'Sparat.' : 'Webbläsaren tillåter inte sparning här. Använd Flytta sparfil.'; }
    else if (d.act === 'transfer') ui.transfer();
    else if (d.act === 'help') ui.intro(false);
    else if (d.act === 'menu') ui.menu();
    else if (d.act === 'askNew') ui.askNew();
    else if (d.act === 'newGame') { const n = ($('nameIn').value || 'Norrvik').trim().slice(0, 22) || 'Norrvik'; newGame(n); ui.close(); }
    else if (d.act === 'copy') {
      const ta = $('exportCode'), msg = $('transferMsg');
      const fb = () => { ta.focus(); ta.select(); msg.textContent = 'Koden är markerad. Tryck Ctrl+C eller Cmd+C.'; };
      try { navigator.clipboard.writeText(ta.value).then(() => (msg.textContent = 'Kopierat!'), fb); } catch (err) { fb(); }
    } else if (d.act === 'import') {
      try { const ns = Sim.load(decodeURIComponent(escape(atob($('importCode').value.trim().replace(/^SKYHUB2:/, ''))))); setState(ns); save(); ui.close(); ui.toast({ msg: 'Sparfilen är laddad.', kind: 'good' }); }
      catch (err) { $('transferMsg').textContent = 'Koden gick inte att läsa. Kontrollera att hela koden kom med.'; }
    }
  });
  $('modeBtn').addEventListener('click', () => setMode(G.mode ? 0 : 1));
  $('mini').addEventListener('click', (e) => {
    const r = $('mini').getBoundingClientRect(); if (!G.miniToWorld) return;
    const w = G.miniToWorld((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    oc.x = Math.max(-300, Math.min(300, w.x)); oc.z = Math.max(-160, Math.min(40, w.z)); if (G.opsOpen) ui.closeOps(); setMode(1);
  });
  $('menuBtn').addEventListener('click', () => ui.menu());
  $('sprint').addEventListener('click', () => { sprintToggle = !sprintToggle; $('sprint').setAttribute('aria-pressed', String(sprintToggle)); });
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !$('nameIn')) ui.close(); });

  // ---------- spara / ladda ----------
  function save() { return G.s ? store.set(Sim.serialize(G.s)) : false; }
  G.exportCode = () => 'SKYHUB2:' + btoa(unescape(encodeURIComponent(Sim.serialize(G.s))));
  function clearActors() { for (const a of planes.values()) scene.remove(a.g); planes.clear(); for (const a of vehs.values()) scene.remove(a.g); vehs.clear(); }
  function setState(s) {
    clearActors(); G.s = s; G.selected = null; G.reportN = s.report ? s.report.n : -1;
    G.lastLog = s.log.length ? s.log[s.log.length - 1].id : 0;
    if (!W) W = SH.World.build(scene, s.name); else W.setName(s.name);
    lastSkyMin = -99; ui.tick(manager.position);
  }
  function newGame(name) { const s = Sim.create(name); setState(s); G.lastLog = 0; save(); }
  addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('pagehide', save);
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  // ---------- loop ----------
  let last = performance.now(), uiAcc = 0, lastHour = -1;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const s = G.s;
    const eff = G.mode === 0 ? Math.min(G.speed, 1) : G.speed;
    if (!G.modalOpen && !G.opsOpen && eff > 0) Sim.advance(s, dt * D.MIN_PER_SEC * eff);
    setSky(s.t);

    // kamera-vridning
    if (keys.has('q')) yawT += dt * 1.8;
    if (keys.has('e')) yawT -= dt * 1.8;
    if (keys.has('z') || keys.has('pageup')) { if (G.mode) ovPitch = clampP(ovPitch + dt * 0.9, 0.3, 1.45); else pitch = clampP(pitch + dt * 0.9, 0.1, 1.4); }
    if (keys.has('x') || keys.has('pagedown')) { if (G.mode) ovPitch = clampP(ovPitch - dt * 0.9, 0.3, 1.45); else pitch = clampP(pitch - dt * 0.9, 0.1, 1.4); }
    yaw += (yawT - yaw) * Math.min(1, dt * 8);
    const fwd = V(Math.sin(yaw), 0, Math.cos(yaw)), right = V(-Math.cos(yaw), 0, Math.sin(yaw));

    // chefen / bilen
    const dyn = dynColliders();
    const kW = keys.has('w') || keys.has('arrowup'), kS = keys.has('s') || keys.has('arrowdown'), kA = keys.has('a') || keys.has('arrowleft'), kD = keys.has('d') || keys.has('arrowright');
    if (G.mode === 0 && !G.modalOpen && !G.opsOpen) {
      if (G.driving) {
        let thr = 0, steer = 0;
        if (kW || kS || kA || kD) { target = null; thr = (kW ? 1 : 0) - (kS ? 1 : 0); steer = (kA ? 1 : 0) - (kD ? 1 : 0); }
        else if (target) { const dx = target.x - carS.x, dz = target.z - carS.z, d = Math.hypot(dx, dz); if (d < 2.5) target = null; else { let a = Math.atan2(dx, dz) - carS.h; a = Math.atan2(Math.sin(a), Math.cos(a)); steer = Math.max(-1, Math.min(1, a * 2)); thr = d > 8 ? 1 : 0.5; } }
        if (thr > 0) carS.v = Math.min(15, carS.v + 9 * dt * thr); else if (thr < 0) carS.v = Math.max(-5, carS.v - (carS.v > 0 ? 18 : 6) * dt); else carS.v *= Math.pow(0.25, dt);
        if (!target && thr === 0 && Math.abs(carS.v) < 0.2) carS.v = 0;
        carS.h += steer * dt * Math.min(1, Math.abs(carS.v) / 4) * 1.9 * Math.sign(carS.v || 1);
        const p = V(carS.x + Math.sin(carS.h) * carS.v * dt, 0, carS.z + Math.cos(carS.h) * carS.v * dt), before = p.clone();
        collide(p, dyn, 1.5); if (before.distanceTo(p) > 0.02) carS.v *= 0.5;
        carS.x = p.x; carS.z = p.z;
        speedWarnT -= dt;
        if (Math.abs(carS.v) > 7 && speedWarnT <= 0) {
          const close = s.flights.some((f) => ['stand', 'pushback', 'taxiIn', 'taxiOut'].includes(f.phase) && Math.hypot(f.x - carS.x, f.z - carS.z) < D.aircraft[f.size].len * 0.6 + 4);
          if (close) { speedWarnT = 4; Sim.safetyHit(s, 3, 'För fort nära ett flygplan med Follow me-bilen.'); }
        }
      } else {
        let mv = V(0, 0, 0);
        if (kW) mv.add(fwd); if (kS) mv.sub(fwd); if (kA) mv.sub(right); if (kD) mv.add(right);
        if (mv.lengthSq()) { target = null; mv.normalize(); }
        else if (target) { mv = target.clone().sub(manager.position); mv.y = 0; if (mv.length() < 0.4) { target = null; mv.set(0, 0, 0); } else mv.normalize(); }
        const sp = mv.lengthSq() ? (keys.has('shift') || sprintToggle ? 9.5 : 5) : 0;
        if (sp) {
          const before = manager.position.clone();
          manager.position.addScaledVector(mv, sp * dt);
          collide(manager.position, dyn.concat([{ x: carS.x, z: carS.z, hw: 1.05, hd: 2.1, rot: carS.h }]), 0.45);
          if (target && manager.position.distanceTo(before) < sp * dt * 0.15) target = null;
          let d = Math.atan2(mv.x, mv.z) - manager.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); manager.rotation.y += d * Math.min(1, dt * 12);
        } else collide(manager.position, dyn, 0.45);
        X.animate(manager, sp, dt);
      }
    }
    car.position.set(carS.x, 0, carS.z); car.rotation.y = carS.h; car.userData.beacon.visible = G.driving && Math.sin(now / 120) > 0;
    s._player = G.mode === 0 ? { x: me().x, z: me().z } : null;

    syncPlanes(dt, now); syncVehicles(dt); syncBridges(dt); syncPeople(dt, now);
    W.clouds.forEach((c, i) => { c.position.x += dt * (1 + (i % 3) * 0.4); if (c.position.x > 500) c.position.x = -500; });
    W.beacon.visible = Math.sin(now / 250) > 0;

    // kamera
    modeK += ((G.mode ? 1 : 0) - modeK) * Math.min(1, dt * 3);
    const mp = me(), cd = G.driving ? dist * 1.35 : dist;
    const ch = Math.cos(pitch) * cd, cv = Math.sin(pitch) * cd;
    const floorPos = V(mp.x - fwd.x * ch, cv + 1.2, mp.z - fwd.z * ch), floorLook = V(mp.x, 1.5, mp.z);
    const oh = Math.cos(ovPitch) * ovDist, ov = Math.sin(ovPitch) * ovDist;
    const overPos = V(oc.x - fwd.x * oh, ov, oc.z - fwd.z * oh);
    camPos.copy(floorPos).lerp(overPos, modeK); camLook.copy(floorLook).lerp(oc, modeK);
    camera.position.lerp(camPos, Math.min(1, dt * 7)); camera.lookAt(camLook);
    const cdist = camera.position.distanceTo(camLook); scene.fog.near = cdist + 120; scene.fog.far = cdist + 560;
    const fc = camLook.clone(); sun.target.position.copy(fc); sun.position.copy(fc).add(V(-60, 90, -45));
    const sh = G.mode ? Math.min(260, ovDist * 0.7) : 70;
    if (sun.shadow.camera.right !== sh) { Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh }); sun.shadow.camera.updateProjectionMatrix(); }

    // effekter, bubblor
    for (let i = stars.length - 1; i >= 0; i--) { const st = stars[i]; st.v.y -= 18 * dt; st.m.position.addScaledVector(st.v, dt); st.life -= dt; st.m.scale.setScalar(Math.max(0.01, st.life)); if (st.life <= 0) { scene.remove(st.m); stars.splice(i, 1); } }
    syncBubbles();
    let ptxt = null;
    if (G.mode === 0 && !G.opsOpen) {
      const np = G.s.problems.find((p) => near(probPos(p)));
      if (np) ptxt = { breakdown: 'Laga', bridge: 'Starta om bryggan', fod: 'Plocka upp skräpet', lost: 'Ta hand om passageraren' }[np.type];
      else if (G.driving && Math.abs(carS.v) < 1.5) ptxt = 'Kliv ur';
      else if (!G.driving && near(carS, 3.8)) ptxt = 'Kliv in i Follow me-bilen';
    }
    const pe = $('prompt'); pe.hidden = !ptxt;
    if (ptxt) { if (pe.dataset.t !== ptxt) { pe.innerHTML = `<span class="key">F</span>${ptxt}`; pe.dataset.t = ptxt; } place(pe, me().clone().setY(G.driving ? 4.2 : 3.2)); pe.hidden = !ptxt || pe.hidden; }
    for (let i = honks.length - 1; i >= 0; i--) { const h = honks[i]; h.life -= dt; place(h.el, h.pos); if (h.life <= 0) { h.el.remove(); honks.splice(i, 1); } }

    // gränssnitt
    uiAcc += dt;
    if (uiAcc > 0.25) {
      uiAcc = 0; ui.tick(me());
      let help;
      if (G.mode === 1) help = 'Dra: flytta kartan · högerdra: vrid och luta · scrolla: zooma · klicka på marken för att hoppa ner';
      else if (G.driving) help = 'W/S gas och broms · A/D styr · dra: vrid och luta kameran';
      else help = 'WASD eller klick: gå · Shift: spring · dra: vrid och luta · scrolla: zooma · O: översikt';
      $('help').innerHTML = help;
      s.log.forEach((l) => { if (l.id > G.lastLog) { if (l.kind !== 'info') ui.toast(l); G.lastLog = l.id; } });
      if (s.report && s.report.n !== G.reportN) { G.reportN = s.report.n; ui.report(s.report); save(); }
      const hour = Math.floor(s.t / 60); if (hour !== lastHour) { if (lastHour >= 0) save(); lastHour = hour; }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // ---------- start ----------
  function start() {
    let s = null; const raw = store.get();
    if (raw) { try { s = Sim.load(raw); } catch (e) { s = null; } }
    if (s) { setState(s); ui.toast({ msg: `Välkommen tillbaka till ${s.name}!`, kind: 'good' }); }
    else { setState(Sim.create('Norrvik')); ui.intro(true); }
    camera.position.set(manager.position.x, 12, manager.position.z - 18);
    requestAnimationFrame(frame);
  }
  start();
})();
