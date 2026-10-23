// SkyHub – syntetiska ljud med Web Audio. Inga ljudfiler behövs.
(function () {
  const SH = (window.SH = window.SH || {});
  let ctx = null, master = null, muted = false, hum = null, humGain = null;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    // motorbrus: brus genom lågpass, styrs av närmaste flygplan
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; }
    hum = ctx.createBufferSource(); hum.buffer = buf; hum.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    humGain = ctx.createGain(); humGain.gain.value = 0;
    hum.connect(lp); lp.connect(humGain); humGain.connect(master); hum.start();
  }
  function tone(freq, t0, dur, type, vol, slide) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + (t0 || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t0, dur, freq, vol, q, sweep) {
    if (!ctx || muted) return;
    const n = ctx.sampleRate * dur, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ctx.createGain(), t = ctx.currentTime + (t0 || 0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }
  SH.Sfx = {
    init,
    toggle() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return !muted; },
    get muted() { return muted; },
    click() { tone(880, 0, 0.05, 'square', 0.08); },
    ding() { tone(988, 0, 0.18, 'sine', 0.25); tone(1319, 0.08, 0.3, 'sine', 0.22); },
    good() { tone(660, 0, 0.1, 'triangle', 0.2); tone(880, 0.07, 0.16, 'triangle', 0.2); },
    bad() { tone(220, 0, 0.18, 'sawtooth', 0.12, 160); },
    thunk() { noise(0, 0.12, 180, 0.5, 2); tone(110, 0, 0.1, 'sine', 0.2, 70); },
    honk() { tone(392, 0, 0.32, 'square', 0.12); tone(330, 0, 0.32, 'square', 0.1); },
    radio() { noise(0, 0.08, 2500, 0.12, 3); tone(1200, 0.06, 0.05, 'square', 0.05); },
    stars(n) { [0, 1, 2].forEach((i) => { if (i < n) tone([784, 988, 1319][i], i * 0.18, 0.35, 'triangle', 0.25); else tone(330, i * 0.18, 0.2, 'sine', 0.08); }); if (n === 3) tone(1568, 0.6, 0.5, 'sine', 0.18); },
    whoosh() { noise(0, 2.2, 300, 0.35, 0.7, 2400); },
    clunk() { noise(0, 0.18, 400, 0.4, 3); tone(140, 0, 0.12, 'square', 0.1, 90); },
    level() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.4, 'triangle', 0.22)); },
    // nära plan → högre motorbrus
    hum(level) { if (humGain && ctx) humGain.gain.setTargetAtTime(muted ? 0 : Math.min(0.5, level), ctx.currentTime, 0.2); },
  };
})();
