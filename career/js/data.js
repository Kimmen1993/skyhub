// SkyHub Karriär – data för prototypen "Från ramparbetare till chef".
// Samma form som spelets data så att modeller, värld och bangeometri kan återanvändas.
(function () {
  const SH = (window.SH = window.SH || {});
  SH.D = {
    VERSION: 'karriär-0.1',
    GMIN_PER_SEC: 0.5, // spelminuter per sekund: en timme ≈ 2 minuter
    SPEED: 0.75,       // bangeometrins hastigheter (enheter/spelminut) → enheter/sekund
    aircraft: {
      S: { id: 'S', model: 'ATR 72', seats: 70, scale: 0.8, nose: 9.0, len: 19, span: 22, turn: 45, bags: 6 },
      M: { id: 'M', model: 'A320', seats: 180, scale: 1.15, nose: 12.95, len: 27.6, span: 31, turn: 55, bags: 10 },
    },
    airlines: {
      FJ: { name: 'Fjällflyg', color: 0x2bb3a6, accent: 0xffffff },
      NV: { name: 'Nordvind', color: 0x3f6fd8, accent: 0xf2b134 },
      SC: { name: 'Sol Charter', color: 0xe8634a, accent: 0xffffff },
      BB: { name: 'Baltic Blue', color: 0x27a3c9, accent: 0xf2b134 },
    },
    callsign: { FJ: 'Fjällflyg', NV: 'Nordvind', SC: 'Sol Charter', BB: 'Baltic' },
    // Skiftets flyg. A2 öppnar först när du blivit befordrad.
    schedule: [
      { al: 'FJ', size: 'S', stand: 'A1', arr: '06:20', from: 'Östersund', to: 'Umeå' },
      { al: 'NV', size: 'M', stand: 'A1', arr: '07:30', from: 'Oslo', to: 'Oslo' },
      { al: 'SC', size: 'M', stand: 'A2', arr: '08:20', from: 'Palma', to: 'Alicante', lvl: 1 },
      { al: 'FJ', size: 'S', stand: 'A1', arr: '08:45', from: 'Visby', to: 'Kiruna' },
      { al: 'BB', size: 'M', stand: 'A2', arr: '09:35', from: 'Riga', to: 'Tallinn', lvl: 1 },
      { al: 'NV', size: 'M', stand: 'A1', arr: '10:00', from: 'Köpenhamn', to: 'Berlin' },
      { al: 'FJ', size: 'S', stand: 'A2', arr: '10:50', from: 'Luleå', to: 'Östersund', lvl: 1 },
      { al: 'SC', size: 'M', stand: 'A1', arr: '11:15', from: 'Antalya', to: 'Chania' },
      { al: 'NV', size: 'M', stand: 'A2', arr: '12:05', from: 'Helsingfors', to: 'London', lvl: 1 },
      { al: 'FJ', size: 'S', stand: 'A1', arr: '12:30', from: 'Umeå', to: 'Visby' },
      { al: 'BB', size: 'M', stand: 'A2', arr: '13:15', from: 'Vilnius', to: 'Gdańsk', lvl: 1 },
    ],
    shift: { start: '06:00', end: '14:30' },
    layout: {
      terminal: { x0: -76, x1: 22 },
      stands: [{ id: 'A1', x: -46, contact: true }, { id: 'A2', x: -10, contact: true }],
      stopZ: -9, roadZ: [-2.6, -5.4], taxilaneZ: -50, taxiwayZ: -76, runwayZ: -116,
      runwayX: [-250, 250], laneX: [-100, 50], exit: { from: -10, to: 34 }, threshold: -220,
      depot: { x: 34, z: -22 }, busStop: { x: -16, z: -4 }, gates: [-120, 80],
      bounds: { x0: -96, x1: 46, z0: -64, z1: -0.6 },
      hall: { x: -28, z: -3.2 }, // bagagehallens port, mellan gaterna
    },
    contractors: { atc: { name: 'Nordflyg Navigation' } },
    pay: { base: 3000, star: 1000, streak: 500 },
    xpStar: 100,
    levels: [
      { title: 'Ramparbetare', xp: 0 },
      { title: 'Arbetsledare', xp: 900, unlock: 'Gate A2 öppnar och du kan anställa fler.' },
      { title: 'Plattchef', xp: 2600, unlock: 'Driftcentralen låses upp. (Här slutar prototypen.)' },
    ],
    // Kollegor som tar över jobb. lvl = nivå som krävs för att kunna anställa.
    helpers: {
      marshal: { name: 'Marshallen Mira', role: 'Leder in planen åt dig.', cost: 4000, wage: 500, lvl: 0, steps: ['marshal'] },
      bags: { name: 'Bagage-Berra', role: 'Lossar, kör bagagerundan och lastar.', cost: 6000, wage: 700, lvl: 0, steps: ['unload', 'bagrun', 'load'] },
      ramp: { name: 'Rampagenten Rut', role: 'Stoppklossar och bryggan.', cost: 5000, wage: 600, lvl: 1, steps: ['chocks', 'bridge', 'bridgeOff', 'chocksOff'] },
      push: { name: 'Pushback-Petra', role: 'Skjuter ut planen.', cost: 8000, wage: 800, lvl: 1, steps: ['push'] },
    },
  };
})();
