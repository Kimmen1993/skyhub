// SkyHub – speldata för kapitel 1. Allt innehåll och alla siffror bor här.
(function () {
  const SH = (window.SH = window.SH || {});

  SH.D = {
    VERSION: '0.2.0',
    MIN_PER_SEC: 1.2, // speldagens längd ≈ 20 min vid 1×

    // Planskala: människa ≈ 1,9 enheter, A320 ≈ 27 enheter.
    aircraft: {
      S: { id: 'S', model: 'ATR 72', seats: 70, scale: 0.8, nose: 9.0, len: 19, span: 22, turn: 40, landingFee: 4500, handlingFee: 9000, deboard: 8, board: 6, bags: 0.8 },
      M: { id: 'M', model: 'A320', seats: 180, scale: 1.15, nose: 12.95, len: 27.6, span: 31, turn: 55, landingFee: 11000, handlingFee: 21000, deboard: 12, board: 9, bags: 1.0 },
    },

    airlines: {
      FJ: { name: 'Fjällflyg', color: 0x2bb3a6, accent: 0xffffff },
      NV: { name: 'Nordvind', color: 0x3f6fd8, accent: 0xf2b134 },
      SC: { name: 'Sol Charter', color: 0xe8634a, accent: 0xffffff },
      BB: { name: 'Baltic Blue', color: 0x27a3c9, accent: 0xf2b134 },
    },

    // Tidtabell: ankomst vid gate (on-block). Avgång räknas ut från turnaround-tiden.
    schedule: [
      { al: 'FJ', size: 'S', arr: '06:40', from: 'Östersund', to: 'Umeå' },
      { al: 'NV', size: 'M', arr: '07:30', from: 'Oslo', to: 'Oslo' },
      { al: 'SC', size: 'M', arr: '08:40', from: 'Palma', to: 'Alicante' },
      { al: 'FJ', size: 'S', arr: '09:20', from: 'Visby', to: 'Kiruna' },
      { al: 'NV', size: 'M', arr: '10:50', from: 'Köpenhamn', to: 'Köpenhamn' },
      { al: 'BB', size: 'M', arr: '11:30', from: 'Riga', to: 'Tallinn' },
      { al: 'FJ', size: 'S', arr: '12:40', from: 'Luleå', to: 'Östersund' },
      { al: 'SC', size: 'M', arr: '13:30', from: 'Antalya', to: 'Chania' },
      { al: 'NV', size: 'M', arr: '14:20', from: 'Helsingfors', to: 'Berlin' },
      { al: 'FJ', size: 'S', arr: '16:00', from: 'Umeå', to: 'Visby' },
      { al: 'BB', size: 'M', arr: '16:40', from: 'Vilnius', to: 'Gdańsk' },
      { al: 'NV', size: 'M', arr: '17:45', from: 'Amsterdam', to: 'London' },
      { al: 'SC', size: 'M', arr: '18:30', from: 'Las Palmas', to: 'Rhodos' },
      { al: 'FJ', size: 'S', arr: '19:30', from: 'Kiruna', to: 'Luleå' },
      { al: 'NV', size: 'M', arr: '21:10', from: 'Berlin', to: 'Oslo' },
      // nattstopp: står över natten och går tidigt nästa morgon
      { al: 'NV', size: 'M', arr: '22:40', from: 'London', to: 'Amsterdam', nightDep: '06:20' },
      { al: 'FJ', size: 'S', arr: '23:10', from: 'Östersund', to: 'Östersund', nightDep: '06:00' },
    ],

    // Plattans layout (enheter ≈ 1,4 m). Terminalen ligger vid z = 0 och plattan växer åt −z.
    layout: {
      terminal: { x0: -100, x1: 44 },
      stands: [
        { id: 'A1', x: -82, contact: true },
        { id: 'A2', x: -46, contact: true },
        { id: 'A3', x: -10, contact: true },
        { id: 'A4', x: 26, contact: true },
        { id: 'R1', x: 84, contact: false },
        { id: 'R2', x: 120, contact: false },
      ],
      stopZ: -9,          // stopplinje (nos)
      roadZ: [-2.6, -5.4],// serviceväg: två filer (östergående, västergående)
      taxilaneZ: -50,
      taxiwayZ: -76,
      runwayZ: -116,
      runwayX: [-270, 270],
      laneX: [-132, 152], // taxilinjens ändar, kopplar till taxibanan
      exit: { from: 30, to: 76 }, // snabbavfart från banan till taxibanan
      threshold: -240,    // landning österut, start österut
      depot: { x: 58, z: -22 },
      gates: [-150, 170],  // grindar där externa firmor kör in
      busStop: { x: 40, z: -4 },
      mechanic: { x: 58, z: -14 },
      bounds: { x0: -136, x1: 156, z0: -66, z1: -0.6 },
    },

    equipment: {
      belt: { name: 'Bandlastare', count: 2, lease: 1400, color: 0xf2b134 },
      train: { name: 'Bagagetåg', count: 2, lease: 900, color: 0xf2b134 },
      tug: { name: 'Pushbacktraktor', count: 1, lease: 2600, color: 0xf2b134 },
      stairs: { name: 'Trappa', count: 2, lease: 700, color: 0xe6eaf0 },
      bus: { name: 'Buss', count: 1, lease: 1800, color: 0x2bb3a6 },
    },
    staff: { ramp: { name: 'Ramppersonal', count: 10, wage: 280 } }, // kr per timme

    contractors: {
      atc: { name: 'Nordflyg Navigation', spacing: 6, note: 'Försiktiga. Lite för stora avstånd mellan landningarna.' },
      terminal: { name: 'TermiCo', slogan: 'Vi köar för dig', quality: 0.72 },
      fuel: { name: 'Petrolia Flygbränsle', late: 0.25 },
      catering: { name: 'Smörgås & Söner', late: 0.3 },
      cleaning: { name: 'Glans Städ AB', late: 0.1 },
    },

    money: 1500000,
    compensation: 900, // kr per försenad minut över 15 min som beror på plattan

    problems: {
      breakdown: { title: (p) => `${p.what} har gått sönder vid ${p.stand}`, fix: 'Du fick igång den igen.', mech: 15, auto: 45 },
      bridge: { title: (p) => `Bryggan vid ${p.stand} har stannat`, fix: 'Du startade om bryggan.', mech: 12, auto: 30 },
      fod: { title: () => 'Skräp på taxilinjen (FOD)', fix: 'Du plockade bort skräpet. Inga motorskador i dag.', mech: 10, auto: 30 },
      lost: { title: () => 'En passagerare har gått vilse på plattan', fix: 'Du följde passageraren tillbaka till terminalen.', mech: 8, auto: 50 },
    },
  };
})();
