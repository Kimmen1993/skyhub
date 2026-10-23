// SkyHub – speldata. Allt som är "innehåll" (siffror, namn, priser) bor här,
// så att balansering inte kräver ändringar i simuleringen.
(function () {
  const SH = (window.SH = window.SH || {});

  SH.C = {
    VERSION: '0.1.0',
    MAP_W: 40,
    MAP_H: 30,
    START_MONEY: 600000,
    START_TIME: 5 * 60 + 30, // Dag 1, 05:30
    REAL_SEC_PER_MIN: 0.5, // vid hastighet 1×

    aircraft: {
      S: { id: 'S', name: 'Turboprop', model: 'ATR 72', seats: 70, turnaround: 35, landingFee: 4000, biz: 0.04, rate: 10, scale: 0.75 },
      M: { id: 'M', name: 'Smalkropp', model: 'A320', seats: 180, turnaround: 50, landingFee: 9500, biz: 0.08, rate: 15, scale: 0.95 },
      L: { id: 'L', name: 'Widebody', model: 'A350', seats: 320, turnaround: 80, landingFee: 24000, biz: 0.15, rate: 24, scale: 1.3 },
    },

    // Byggverktyg. layer: 'ground' läggs på gräs, 'bldg' ställs på terminalgolv.
    tools: {
      select:     { cat: 'tool', code: 'VÄLJ', name: 'Välj / flytta kartan', cost: 0 },
      runway:     { cat: 'field', code: 'RWY', name: 'Landningsbana', layer: 'ground', paint: true, cost: 12000, upkeep: 300,
                    desc: 'Rak bana, minst 8 rutor lång. Ett plan i taget landar eller lyfter.' },
      taxi:       { cat: 'field', code: 'TWY', name: 'Taxibana', layer: 'ground', paint: true, cost: 2500, upkeep: 60,
                    desc: 'Kopplar ihop banan med uppställningsplatserna.' },
      standS:     { cat: 'field', code: 'S/M', name: 'Uppställning S/M', layer: 'ground', cost: 25000, upkeep: 900, fits: ['S', 'M'],
                    desc: 'För turboprop och smalkropp. Bredvid terminalgolv blir den en kontaktgate med brygga.' },
      standL:     { cat: 'field', code: 'L', name: 'Uppställning L', layer: 'ground', cost: 60000, upkeep: 1800, fits: ['S', 'M', 'L'],
                    desc: 'Tar alla plan, även widebody.' },
      floor:      { cat: 'terminal', code: 'GLV', name: 'Terminalgolv', layer: 'ground', paint: true, cost: 3000, upkeep: 80,
                    desc: 'Byggytan för allt inne i terminalen.' },
      checkin:    { cat: 'terminal', code: 'IN', name: 'Incheckning', layer: 'bldg', cost: 15000, upkeep: 1800, cap: 1.1, h: 14,
                    desc: '≈66 passagerare/timme per disk.' },
      security:   { cat: 'terminal', code: 'SÄK', name: 'Säkerhetskontroll', layer: 'bldg', cost: 40000, upkeep: 4500, cap: 3, h: 18,
                    desc: '≈180 passagerare/timme per fil.' },
      baggage:    { cat: 'terminal', code: 'BAG', name: 'Bagagesortering', layer: 'bldg', cost: 55000, upkeep: 3000, cap: 7, h: 22,
                    desc: '≈420 väskor/timme. Hanterar både avgående och ankommande bagage.' },
      shop:       { cat: 'service', code: 'BUT', name: 'Butik', layer: 'bldg', cost: 20000, upkeep: 800, cap: 40, h: 16,
                    desc: 'Intäkter från väntande passagerare. Rymmer 40.' },
      restaurant: { cat: 'service', code: 'MAT', name: 'Restaurang', layer: 'bldg', cost: 30000, upkeep: 1500, cap: 30, h: 16,
                    desc: 'Bättre intäkt per gäst än butiker. Rymmer 30.' },
      toilet:     { cat: 'service', code: 'WC', name: 'Toaletter', layer: 'bldg', cost: 8000, upkeep: 500, cap: 60, h: 11,
                    desc: 'Billigt och viktigt för nöjdheten. Räcker till 60 i taget.' },
      lounge:     { cat: 'service', code: 'VIP', name: 'VIP-lounge', layer: 'bldg', cost: 90000, upkeep: 5000, cap: 40, h: 20,
                    desc: 'Affärsresenärer betalar för lugnet. Krävs vid VIP-besök.' },
      bulldoze:   { cat: 'tool', code: 'RIV', name: 'Riv', cost: 0, desc: 'Ger tillbaka 40 % av byggkostnaden.' },
    },

    toolOrder: [
      ['Verktyg', ['select', 'bulldoze']],
      ['Flygfält', ['runway', 'taxi', 'standS', 'standL']],
      ['Terminal', ['floor', 'checkin', 'security', 'baggage']],
      ['Service', ['shop', 'restaurant', 'toilet', 'lounge']],
    ],

    airlines: [
      { id: 'FJ', name: 'Fjällflyg', color: '#2fa36b', sizes: ['S'], minRep: 0, cities: ['Östersund', 'Kiruna', 'Umeå', 'Visby', 'Luleå', 'Trondheim'] },
      { id: 'NV', name: 'Nordvind', color: '#2f6fdb', sizes: ['M'], minRep: 0, cities: ['Oslo', 'Köpenhamn', 'Helsingfors', 'Berlin', 'Amsterdam', 'London'] },
      { id: 'SC', name: 'Sol Charter', color: '#f29a2e', sizes: ['M'], minRep: 30, cities: ['Palma', 'Alicante', 'Antalya', 'Chania', 'Las Palmas', 'Rhodos'] },
      { id: 'BB', name: 'Baltic Blue', color: '#27a3c9', sizes: ['S', 'M'], minRep: 25, cities: ['Riga', 'Tallinn', 'Vilnius', 'Gdańsk', 'Åbo'] },
      { id: 'KX', name: 'Kestrel Express', color: '#d2433f', sizes: ['M'], minRep: 45, cities: ['Paris', 'Bryssel', 'Zürich', 'Wien', 'München', 'Dublin'] },
      { id: 'AU', name: 'Aurora Air', color: '#8b5cf6', sizes: ['M', 'L'], minRep: 55, cities: ['Reykjavik', 'Edinburgh', 'Madrid', 'Rom', 'Lissabon'] },
      { id: 'AT', name: 'Atlantica', color: '#1f3b73', sizes: ['L'], minRep: 65, cities: ['New York', 'Toronto', 'Chicago', 'Boston'] },
      { id: 'MR', name: 'Meridian', color: '#c48a1b', sizes: ['L'], minRep: 75, cities: ['Dubai', 'Doha', 'Singapore', 'Bangkok', 'Tokyo'] },
    ],

    events: {
      fog:    { name: 'Dimma', dur: [120, 240], desc: 'Landningar tar längre tid.' },
      storm:  { name: 'Åskväder', dur: [30, 60], desc: 'Inga starter eller landningar.' },
      strike: { name: 'Strejk i säkerheten', dur: [180, 300], desc: 'Säkerhetskontrollen går i halv takt.' },
      vip:    { name: 'VIP-besök', dur: [60, 60], desc: 'En delegation landar. Har du en VIP-lounge?' },
    },
  };
})();
