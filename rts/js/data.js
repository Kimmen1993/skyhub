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
    rush: { start: '06:00', end: '09:15' },
    schedule: [
      { al: 'FJ', size: 'S', arr: '06:12', from: 'Östersund', to: 'Umeå' },
      { al: 'NV', size: 'M', arr: '06:24', from: 'Oslo', to: 'Oslo' },
      { al: 'SC', size: 'M', arr: '06:44', from: 'Palma', to: 'Alicante' },
      { al: 'FJ', size: 'S', arr: '06:58', from: 'Visby', to: 'Kiruna' },
      { al: 'BB', size: 'M', arr: '07:10', from: 'Riga', to: 'Tallinn', vip: true },
      { al: 'NV', size: 'M', arr: '07:26', from: 'Köpenhamn', to: 'Berlin' },
      { al: 'FJ', size: 'S', arr: '07:40', from: 'Luleå', to: 'Östersund' },
      { al: 'SC', size: 'M', arr: '07:52', from: 'Antalya', to: 'Chania' },
      { al: 'NV', size: 'M', arr: '08:06', from: 'Helsingfors', to: 'London' },
      { al: 'BB', size: 'M', arr: '08:20', from: 'Vilnius', to: 'Gdańsk' },
      { al: 'FJ', size: 'S', arr: '08:34', from: 'Umeå', to: 'Visby' },
    ],
    // oväntade händelser (spelminut från start). Åskan syns i prognosen 20 min innan.
    events: [
      { at: 50, type: 'breakdown' },
      { at: 72, type: 'storm', dur: 9 },
      { at: 95, type: 'emergency', size: 'M', from: 'Trondheim', to: 'Trondheim' },
      { at: 128, type: 'breakdown' },
    ],
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
