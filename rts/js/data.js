// SkyHub Rusning – prototyp: realtidsstrategi på plattan.
(function () {
  const SH = (window.SH = window.SH || {});
  SH.D = {
    VERSION: 'rusning-0.1',
    GMIN_PER_SEC: 0.25, // en spelminut = 4 sekunder
    SPEED: 0.75,
    aircraft: {
      S: { id: 'S', model: 'ATR 72', seats: 70, scale: 0.8, nose: 9.0, len: 19, span: 22, turn: 30, bags: 6, fuel: 1 },
      M: { id: 'M', model: 'A320', seats: 180, scale: 1.15, nose: 12.95, len: 27.6, span: 31, turn: 32, bags: 10, fuel: 2 },
    },
    airlines: {
      FJ: { name: 'Fjällflyg', color: 0x2bb3a6, accent: 0xffffff },
      NV: { name: 'Nordvind', color: 0x3f6fd8, accent: 0xf2b134 },
      SC: { name: 'Sol Charter', color: 0xe8634a, accent: 0xffffff },
      BB: { name: 'Baltic Blue', color: 0x27a3c9, accent: 0xf2b134 },
      XX: { name: 'Nödlandning', color: 0x8b5cf6, accent: 0xffffff },
    },
    callsign: { FJ: 'Fjällflyg', NV: 'Nordvind', SC: 'Sol Charter', BB: 'Baltic', XX: 'Mayday' },
    // Dagar som låses upp i tur och ordning. Varje dag är en egen bana.
    days: [
      { id: 1, name: 'Dag 1 · Första passet', desc: 'Tre lugna plan och en guide som visar hur allt fungerar.', start: '06:00', end: '07:45', money: 15000, fuel: 6, workers: 3, tutorial: true,
        flights: [['FJ', 'S', '06:10'], ['NV', 'M', '06:36'], ['FJ', 'S', '07:02']], events: [], requests: [] },
      { id: 2, name: 'Dag 2 · Morgonrusning', desc: 'Sju plan, en bandlastare som går sönder och ett erbjudande att ta ställning till.', start: '06:00', end: '08:40', money: 18000, fuel: 5, workers: 4,
        flights: [['FJ', 'S', '06:12'], ['NV', 'M', '06:28'], ['SC', 'M', '06:50'], ['FJ', 'S', '07:08'], ['BB', 'M', '07:24'], ['NV', 'M', '07:44'], ['FJ', 'S', '08:02']],
        events: [{ at: 46, type: 'breakdown' }], requests: [{ at: 34, type: 'extra', al: 'SC', size: 'M', inMin: 26, pay: 12000 }] },
      { id: 3, name: 'Dag 3 · Åskvarning', desc: 'Elva plan, åska, haveri och en nödlandning. Håll ögonen på prognosen.', start: '06:00', end: '09:15', money: 20000, fuel: 6, workers: 4,
        flights: [['FJ', 'S', '06:12'], ['NV', 'M', '06:24'], ['SC', 'M', '06:44'], ['FJ', 'S', '06:58'], ['BB', 'M', '07:10', 1], ['NV', 'M', '07:26'], ['FJ', 'S', '07:40'], ['SC', 'M', '07:52'], ['NV', 'M', '08:06'], ['BB', 'M', '08:20'], ['FJ', 'S', '08:34']],
        events: [{ at: 50, type: 'breakdown' }, { at: 72, type: 'storm', dur: 9 }, { at: 95, type: 'emergency', size: 'M' }, { at: 128, type: 'breakdown' }],
        requests: [{ at: 18, type: 'fuelDeal' }, { at: 58, type: 'priority' }] },
      { id: 4, name: 'Dag 4 · Högtryck', desc: 'Femton plan, mest A320. Två haverier, åska, nödlandning och fler beslut. Lycka till.', start: '06:00', end: '10:00', money: 22000, fuel: 5, workers: 5,
        flights: [['NV', 'M', '06:10'], ['FJ', 'S', '06:20'], ['SC', 'M', '06:34'], ['BB', 'M', '06:46'], ['NV', 'M', '06:58'], ['FJ', 'S', '07:10'], ['SC', 'M', '07:22', 1], ['NV', 'M', '07:36'], ['BB', 'M', '07:48'], ['FJ', 'S', '08:00'], ['NV', 'M', '08:12'], ['SC', 'M', '08:26'], ['BB', 'M', '08:40'], ['NV', 'M', '08:54'], ['FJ', 'S', '09:08']],
        events: [{ at: 36, type: 'breakdown' }, { at: 64, type: 'storm', dur: 10 }, { at: 88, type: 'emergency', size: 'M' }, { at: 112, type: 'breakdown' }, { at: 150, type: 'storm', dur: 7 }],
        requests: [{ at: 20, type: 'fuelDeal' }, { at: 44, type: 'priority' }, { at: 76, type: 'extra', al: 'BB', size: 'M', inMin: 24, pay: 14000 }, { at: 120, type: 'priority' }] },
    ],
    cities: { FJ: ['Östersund', 'Umeå', 'Visby', 'Kiruna', 'Luleå'], NV: ['Oslo', 'Köpenhamn', 'Berlin', 'London', 'Helsingfors'], SC: ['Palma', 'Alicante', 'Antalya', 'Chania', 'Rhodos'], BB: ['Riga', 'Tallinn', 'Vilnius', 'Gdańsk'], XX: ['Trondheim', 'Bergen', 'Åbo'] },
    layout: {
      terminal: { x0: -76, x1: 22 },
      stands: [{ id: 'A1', x: -46, contact: true }, { id: 'A2', x: -10, contact: true }, { id: 'R1', x: 30, contact: false }],
      stopZ: -9, roadZ: [-2.6, -5.4], taxilaneZ: -50, taxiwayZ: -76, runwayZ: -116,
      runwayX: [-250, 250], laneX: [-100, 70], exit: { from: -10, to: 44 }, threshold: -220,
      depot: { x: -86, z: -10 }, busStop: { x: -16, z: -4 }, gates: [-120, 90],
      bounds: { x0: -110, x1: 74, z0: -66, z1: -0.6 },
      hall: { x: -28, z: -4.2 },
      workshop: { x: -86, z: -26 },
      fuel1: { x: -92, z: -44 },
      rest: { x: -66, z: -4.6 },
    },
    contractors: { atc: { name: 'Nordflyg Navigation' } },
    // byggplatser
    sites: [
      { id: 'R1', name: 'Fjärrplats R1', desc: 'En tredje uppställning. Lätt att parkera ett plan som annars hade fått vänta i luften.', cost: 18000, x: 30, z: -24 },
      { id: 'fuel2', name: 'Bränsledepå Öst', desc: 'Tankbilen fyller på mycket närmare gaterna.', cost: 12000, x: 56, z: -10 },
      { id: 'rest', name: 'Personalrum', desc: 'Arbetarna vilar dubbelt så snabbt här.', cost: 7000, x: -64, z: -18 },
    ],
    shop: [
      { id: 'worker', name: 'Anställ arbetare', cost: 5000, max: 8 },
      { id: 'fuel', name: 'Tankbil', cost: 14000, max: 2 },
      { id: 'train', name: 'Bagagetåg', cost: 9000, max: 2 },
      { id: 'tug', name: 'Pushbacktraktor', cost: 16000, max: 2 },
    ],
    fuelOrder: { cost: 6000, units: 8, minutes: 12 },
    startFuel: 6, truckCap: 4,
    pay: { base: 4000, star: 1500 },
    names: ['Anna', 'Lasse', 'Mira', 'Kenta', 'Nora', 'Omar', 'Sanna', 'Jonte', 'Elin', 'Farah'],
  };
})();
