# SkyHub – designdokument

Spelets minne. Allt vi bestämmer står här, med datum och skäl. Läs detta först i varje arbetspass.
Ändra bara efter ett beslut tillsammans med Kimm; markera öppna frågor tydligt.

Arbetsnamn: **SkyHub** (kan bytas).

---

## 1. Vision

Ett tecknat managementspel där du tar över en liten fiktiv regional flygplats och steg för steg
växer in i hela verksamheten, tills du driver en av världens största flygplatser.
Senare: samma motor för en **hamn**, och i lång sikt ett **resecentrum** (tåg, buss, taxi).

Kärnkänsla: du är chef, men du kan när som helst gå ner på golvet och hjälpa till.
Spelet ska kräva strategi hela vägen och inte lösas på en timme och sedan bara rulla med oändligt med pengar.

## 2. Beslut (logg)

| Datum | Beslut | Skäl |
|---|---|---|
| 2026-10-23 | Testas som webbsida via en länk (Claude-artefakt). Mobilappar (iOS/Android) senare. | Enkelt att testa på Mac och Windows. |
| 2026-10-23 | Testning sker via **GitHub Pages**: https://kimmen1993.github.io/skyhub/ (publikt repo Kimmen1993/skyhub). Claude-artefakter används inte längre för test. | Jobbdatorn blockerar claude.ai. TeamViewer-tunneln laggar för mycket. |
| 2026-10-23 | Simuleringen är skild från grafiken (`js/sim.js` har ingen grafik). | Grafiken kan bytas utan att spelet byggs om. Samma kärna för hamn och resecentrum. |
| 2026-10-23 | Grafik: **tecknad, stiliserad 3D** (toon/low-poly). Inte realistisk 3D, inte platta rutor. Referenser: Two Point Hospital, Overcooked, My Perfect Hotel. | Kimm: v0.1-rutorna var oläsliga och 3D-skisserna för realistiska och stela. |
| 2026-10-23 | Två kameralägen: **översikt** (chefsläget, hela området) och **golvläget** (styr chefsfiguren, kamera snett ovanifrån nära golvet, inte förstapersonsvy). | Kimm vill kunna hoppa in och hjälpa till när något strular. |
| 2026-10-23 | Färg: klara färger i **detaljerna** (loggor, skyltar, fasadpartier, flaggor, markmålning), inte pastell överallt. Ska kännas levande men inte som ett barnspel. | Kimm: v1-skissen var för tråkig, men spelet får inte bli barnsligt. |
| 2026-10-23 | **Kollisioner**: man går under vingar men inte genom flygkropp, motorer eller fordon. | Lite mer verklighetstroget. Kostar ingen grafik. |
| 2026-10-23 | Fordon **stannar och tutar** i stället för att köra på chefen. Det sänker ett **säkerhetsbetyg**. | Påkörning skapar irritation. En säkerhetsregel ger spelmekanik i stället. |
| 2026-10-23 | **Kameran kan vridas runt chefen** (Q/E, dra, knappar). Det som skymmer blir genomskinligt. | Kimm: underlättar mycket. Kostnad: allt måste se bra ut från alla håll. |
| 2026-10-23 | **Skala**: flygplan ca 13–15 gånger längre än en människa (verkligheten ca 20, v2-skissen ca 10). Tecknat ihoptryckt men stort nog att kännas mäktigt. | Kimm ifrågasatte proportionerna. |
| 2026-10-23 | **Förflyttning i tre nivåer**: spring (Shift), fordon (Follow me-bil på plattan, senare segway/elbil i terminalen) och hopp via översikten. Fordonen är uppgraderingar som låses upp. Bilen följer trafikregler: för fort nära plan sänker säkerhetsbetyget. | Stora avstånd när flygplatsen växer. Fordonen blir spelmekanik i stället för fusk. |
| 2026-10-23 | **Sparning** i riktiga spelet: autospar, flera platser, exportkod. Molnsparning senare (dela mellan Mac, jobbdator, mobil). | Kimm byter mellan datorer. |
| 2026-10-23 | **Verklighetstroget upplägg på plattan**: uppställning, taxilinje direkt bakom, huvudtaxibana längre ut, banan längst bort. Tvåfilig serviceväg längs terminalen med trafik åt båda hållen, under bryggorna. | Kimm efter v3: taxibanan låg för nära, bilen fick inte plats på vägen. |
| 2026-10-23 | **Ägande = fri ombyggnad.** Det du äger kan du bygga om helt: flytta gates, dra om taxibanor, bygga banor och så vidare. Kap 1 plattan, kap 2 flygfältet (banor, taxibanor), kap 3 terminaler, kap 4 marken utanför. | Kimm: layouten ska vara spelarens beslut och kräva långsiktigt tänkande. |
| 2026-10-23 | **Byggtid och mark**: ombyggnad stänger ytan några speldagar. Mark är begränsad och köps eller förhandlas från kommunen. | Ger långsiktig planering och undviker att man bygger om fritt hela tiden. |
| 2026-10-23 | **Allt som finns på en riktig flygplats ska finnas**, förenklat där det behövs. | Kimm, fråga 5. |
| 2026-10-23 | **Ingen game over.** Det blir tyngre och tyngre men aldrig hopplöst: nödlån, räddningsuppdrag från kommunen, möjlighet att sälja utrustning. | Kimm, fråga 3. Undvika återvändsgränder. |
| 2026-10-23 | **Ton**: humor och glimt i ögat (namn, texter, små situationer), men seriöst i grunden och aldrig barnsligt. | Kimm, fråga 4. |
| 2026-10-23 | **Spelaren är både flygplats och handlingbolag** i kapitel 1. | Kimm, fråga 1. |
| 2026-10-23 | **En speldag ≈ 20 minuter** i normal fart. | Kimm, fråga 2. |
| 2026-10-24 | **Två sätt att spela som påverkar varandra**: *Driftcentralen* (gateplanering på tidslinje, personal, utrustning och service, bränsle och externa firmor, ekonomi) och *golvet* (problem blir korta hands-on-uppgifter på 15–40 s: hämta verktyg och laga, plocka FOD, eskortera vilsen passagerare, starta om brygga, marshalla in plan själv, hjälpa till att lasta). Bra planering ger färre bränder. | Kimm: v0.2 kändes inte interaktivt, "bara lite off". Diagnos: för få beslut, för enkla handlingar, pengar utan användning, tyst och stelt. |
| 2026-10-24 | **Polish är en del av spelet**: ljud (motorer, tut, pling, tornets radio), reaktioner när man löser saker, tydligare UI med nedre menyrad, varningslista och minikarta. | Samma återkoppling: "saknar den sista touchen". |
| 2026-10-26 | **Principer för svårighet och tydlighet:** (1) svårt från början men aldrig orättvist, (2) alltid tydligt vad som krävs, och möjligt att förutse och förebygga, (3) svårigheten varierar: lugna dagar och nästan omöjliga dagar, så att man vill bevisa att det går. Varje problem ska ha en synlig markering, en förklaring av vad som krävs och en snabbknapp. | Kimm efter 7 dagars karriär: missade fåglarna, kunde inte laga en maskin som inte hörde till ett plan. Föreslog en bil till personalen för långa sträckor. |
| 2026-10-26 | **Utbyggnaden före grafiken.** Varje utbyggnad ger ett nytt område och ett nytt sorts jobb, inte bara fler plan. Allt byggs datadrivet (platser, byggnader, fordon som listor) så att grafiksteget bara byter modeller. | Kimm efter fler dagar: repetitivt, ambulans och frakt var "samma sak men mindre", kunde inte bygga mer på högsta nivån. "Kör på det, bara vi inte får för stort jobb sen med grafiken." |
| 2026-10-27 | **Drama före innehåll: spelet ska aldrig bli bekvämt.** Tre lager: (A) en osynlig *regissör* som mäter hur lugnt det är (lediga arbetare, inga problem) och skickar överraskningar när det går för lätt, men skjuter upp kort när spelaren drunknar; (B) *morgongenomgång* med dagens förutsättningar (sjuka, fordon på service, dimma, ombyggnad m.m.) och ett erbjudande att tacka ja eller nej till; (C) *kriser med val* på radion med tidsgräns, där inget svar ger det sämsta valet och följderna hänger kvar till nästa dag. | Kimm: "Jag har hittat mönstret … får nästan alltid 100 % … vi måste göra något spännande som inte blir samma sak hela tiden." Ville ha alla tre idéerna. |
| 2026-10-27 | **Banan: turordning i stället för att landningar alltid går först.** Den som väntat längst (landning med ledig gate eller start vid banänden) får banan; nödfall och ambulans går alltid först. Eget sätt att styra banan diskuteras. | Kimm: avgående plan stod bara och väntade för att det kom för många inkommande. |
| 2026-10-26 | **M3 (variation) före M2 (grafik).** | Upprepning är den största risken. Grafik löser inte det, nytt innehåll gör det. |
| 2026-10-24 | **KÄRNAN ÄR HITTAD: rusningsformatet.** Realtidsstrategi på plattan med enheter man ger order, fasta lag, resurser, väder i nivåer och slumpade händelsekort. Det riktiga spelet byggs runt detta. Chefsläget (v0.3) och karriärläget med handgjorda turnarounds läggs åt sidan som separata spår, men delar av dem (befordran, driftcentralens innehåll, hoppa in själv) återanvänds. | Kimm: "Det känns bra nu … jag blir lite bättre varje gång … grunden finns nog där." Har kört dag 4 tre gånger utan att nå 100 %. |
| 2026-10-24 | **Testar realtidsstrategi** (känsla som Age of Empires): du markerar arbetare och fordon och ger order, resurser tar slut (bränsle, ork), du bygger på byggplatser, trafiken kommer i rusningar och oväntade händelser (åska i prognosen, haveri, nödlandning) kräver förutseende. Prototyp i `rts/`. | Kimm: karriärprototypen var inte heller rätt. Vill ha en hektisk miljö där det hela tiden händer något oväntat, man samlar och gör saker, förutser och blir bättre. Alla tidigare beslut får omprövas. |
| 2026-10-25 | **Testar karriärupplägg**: man börjar som ramparbetare och gör turnarounds med egna händer (marshalla, klossar, brygga, väskor i takt, bagagerunda, pushback med knäckrisk), får stjärnor, pengar och XP, anställer kollegor som tar över jobben och blir befordrad (arbetsledare, plattchef, sedan driftcentralen). Prototyp i `career/`. Om den känns rätt ersätter den början av kapitel 1. | Kimm: v0.3 kändes fortfarande som att vara åskådare. Diagnos: spelet behövde inte spelaren, inga korta mål eller belöningar, ingen synlig utveckling. |
| 2026-10-24 | **Fri kamera**: vrid, luta och zooma oberoende av rörelseriktningen. Följer aldrig automatiskt med bilen. | Kimm. |
| 2026-10-23 | Flygplatsen är **fiktiv**. Spelaren kan döpa den själv (t.ex. efter sin hemstad). | Frihet för spelaren, inga varumärkesproblem. |
| 2026-10-23 | Spelet byggs i **samma ordning som det spelas**. Varje avdelning görs riktigt bra innan nästa påbörjas. | Undvika fem ytliga spel i stället för ett djupt. |
| 2026-10-23 | Avdelningar som inte är upplåsta sköts av en **entreprenör som gör det halvbra**. Spelaren ser bristerna och vill ta över. | Ger naturlig motivation att låsa upp, i stället för en dyr knapp. |
| 2026-10-23 | Pengar är inte enda spärren. Tillstånd, krav, rykte, personal och uppdrag spärrar också. | Undvika att spelet blir "oändligt med pengar". |

## 3. Avdelningar (upplåsningsordning)

1. **Airside / plattan** – gates, turnaround, marktjänst, bagagelastning, avisning, uppställning. *Startavdelning.*
2. **Flygledning (ATC)** – tornet, banor, sekvensering av landningar, radar, väder. Kan bli ett eget litet radarspel.
3. **Terminalen** – incheckning, säkerhet, butiker, service, VIP.
4. **Landside** – parkering, tåg, buss, taxi. Fröet till framtida resecentrum.
5. **Eget flygbolag** – flotta, rutter, priser, konkurrens med AI-bolag.

Varje avdelning: egen vy att djupdyka i, egna uppdrag, egen personal och egna uppgraderingar.
Hela flygplatsen behöver ändå din uppmärksamhet. Du kan bara vara på ett ställe i taget, så uppmärksamhet är en resurs.

## 4. Mekaniker mot "för lätt / oändligt med pengar" (idéer, ej spikade)

- Tillstånd och krav: t.ex. långdistans kräver längre bana, bättre instrumentlandning och myndighetsgodkännande via uppdrag.
- Växande komplexitet: driftkostnad per passagerare stiger med storleken. Slitage och haverier.
- Personal: kompetens, trötthet, utbildning, strejker.
- Säsonger: midsommarrusning (charter), vinter (snöröjning, avisning).
- Politik och grannar: buller, miljö, kommunen äger marken.
- Konkurrerande grannflygplats som lockar bolag.
- Ersättningar vid missade flyg, tappade väskor och omdirigeringar (finns i v0.1).

## 5. Story och uppdrag (idéer, ej spikade)

Lätt berättelse med få återkommande figurer: pensionerad flygplatschef (mentor), kommunalråd (markägare),
representanter för flygbolagen. Uppdragskedjor per avdelning plus stora gemensamma händelser
("Klara midsommarrusningen utan omdirigering", "Ta emot statsbesöket").

## 6. Skala

Målet är att kunna bygga en världsstor flygplats. Tekniska principer för det:
- Detaljer ritas bara nära kameran. I översikten förenklas byggnader och passagerare syns som strömmar.
- Simuleringen räknar passagerare i grupper och inte som individer (finns redan).
- Golvläget ritar fullt bara närområdet.

## 7. Kopplingspunkter: lämnas medvetet till senare

Saker som byggs nu men måste hänga ihop med senare delar. Uppdatera när något läggs till.

- **Entreprenörs-AI per avdelning**: varje avdelning behöver ett "halvbra autopilot"-läge med en kvalitetsnivå.
  Spelarens uppgraderingar ersätter den.
- **Gemensam ekonomi och rykte** för alla avdelningar. Varje avdelning bidrar med intäkter, kostnader och nöjdhet.
- **Hub-abstraktion** i simuleringen (nod, anläggning, fordon, operatör) ska fungera för hamn och tåg.
- **Händelsesystem** som kan skapa problem i vilken avdelning som helst, så att de kräver chefens närvaro.
- **Namnge flygplatsen** vid nytt spel.

## 8. Status

- **v0.1 (prototyp, klar)**: simulering av flyg, passagerarflöden, bagage, avtal, ekonomi och händelser, med enkel rutgrafik.
  Simuleringen är testad och behålls. Rutgrafiken ersätts.
- **v0.2 (grunden för kapitel 1, `game/`)**: verklighetstroget plattupplägg, flyg enligt tidtabell (inflygning, landning, taxi,
  turnaround, pushback, start), turnaround med personal och utrustning som kör ut, entreprenörer (torn, terminal, tankning,
  catering, städ), förseningsorsaker, problem (manuellt, mekaniker eller personalen själva efter en stund), dagsrapport,
  översikt och golvläge med Follow me-bil, sparning och export. **Inte än:** byggläge, uppdrag, personalhantering, köp och leasing.
- **v0.3**: nytt gränssnitt efter UI-skissen (status, mätare, varningar med nedräkning, flygkort med tidslinje, tornets radio,
  minikarta, menyrad) och driftcentralen (dragbar gateplanering med krockar, personal i lag med skift, trötthet,
  kompetens, rast, utbildning och anställning, utrustning med slitage, service, köp och utköp, externa firmor med
  skynda på och premiumavtal, ekonomi). Ekonomin är skärpt: fasta kostnader 85 000 kr/dygn, lägre avgifter.
- **Karriärprototypen (`career/`)**: ett skift 06–14:30, gate A1 (A2 vid befordran), handgjorda turnarounds,
  stjärnor, svit, dagens mål, fyra kollegor, tre nivåer, syntetiska ljud. Testad med robotspelare (`tools/run-career-smoke.sh`).
- **Karriärprototypen** kändes inte rätt (Kimm).
- **Rusningsprototypen (`rts/`)**: 06:00–09:15, 11 plan och en nödlandning, 4 arbetare, tankbil, bagagetåg, pushback,
  bränsle i depå som beställs, ork och rast, byggplatser (fjärrplats, bränsledepå, personalrum), köp av fler enheter,
  händelser med prognos, stjärnor och rekord. Testad med robot (`tools/run-rush-smoke.sh`): 28/33 stjärnor.
- **Rusning v2** efter Kimms test ("fungerar bättre", men svårt att förstå, låsningar, vill ha stigande svårighet och mer känsla av att styra):
  fyra dagar som låses upp (≥50 % stjärnor), guide steg för steg på dag 1, förfrågningar på radion med ja/nej
  (extra plan, billigt bränsle, lovad tidig avgång), automatisk reparation när arbetare skickas till plan med trasig
  bandlastare, pushback och bagagetåg kan inte längre tas ifrån sitt jobb mitt i. Robot: 100/88/85/76 % stjärnor dag 1–4.
- **Rusning v3** efter Kimms test av alla dagar ("helt ok, vi närmar oss ett bra spel"): enhetslista för att välja
  enskilda enheter, klick i en hög väljer nästa, utspridda väntplatser, plan får landa när gaten håller på att bli ledig,
  väder i nivåer (regn, kraftigt regn, åska med korta blixtlarm) i stället för att allt stannar.
- **Kimms oro (2026-10-24):** risk för upprepning, "klicka gubbe, klicka plan, sen går det automatiskt". Saknar det
  oförutsedda. Proportioner och grafik behöver skärpas. Bygga är bara påbörjat.
- **Beslut 2026-10-24 (Kimm: "låter som en bra plan")**: ordning för variation: 1) fasta lag/rutiner och händelsekort,
  2) olika plantyper med olika behov, 3) hoppa in själv för bonus, sedan grafik/proportioner och bygget.
- **Rusning v4**: fasta lag (gate eller Auto, 20 kr/min per enhet), slumpade händelsekort per körning (trasig
  bandlastare, oljespill, rullstolsassistans, sjuk arbetare, anslutningsflyg att vänta in, fåglar på banan, punktering).
  Dag 2/3/4 får 2/4/6 kort. Robotar: handstyrd 100/92/91 %, bara fasta lag 88/85/78 % (dag 2–4).
- **Kimm har testat v4**: känns bra. Vill nu att det blir ett riktigt spel: grafik, proportioner, karriär, design,
  utbyggnader, service och slitage saknas.
- **Färdplan (Kimm: ja, 2026-10-24)**: M1 karriären, M2 grafik och proportioner, M3 plantyper och innehåll,
  M4 utbyggnad på riktigt, M5 finish/mobil.
- **M1 klar (första versionen)**: `rts/js/career.js`. Huvudmeny (fortsätt, ny karriär med namn, utmaningar), dagar som
  genereras från avtal, kontoret mellan dagarna (rapport, avtal, personal med skicklighet/moral/utbildning/bonus, fordon
  med slitage/service/köp/leasing, bandlastarnas slitage, bränsle, bygge med nivåkrav, spara/exportkod), rykte,
  flygbolagens nöjdhet (missnöjda säger upp), befordran (ramparbetare → flygplatschef) som låser upp fasta lag och byggen,
  slitage som ger haverier under dagen, vikarier under dagen. Ekonomi: avgifter växer med trafiken.
  Robot 8 dagar: nivå 2, 105 000 kr, 36/36 stjärnor dag 8.
- **Kimm har kört 7 dagar**: "helt ok", stressigt, vill köra mer och snabbare, men ibland repetitivt. Lagt till snabbspolning 2×.
- **M3a (klar)**: att göra-lista med förklaringar och snabbknappar, markeringar i världen, laga allt var som helst,
  Follow me-bil (fåglar, hund), plantyper (widebody, frakt, privatjet, ambulansflyg), flygbolag med personlighet
  (lågpris, lyx), dagar med svårighetsgrad och prognos (lugn, normal, tuff, extrem med ×1,5 bonus), nya kort
  (strejk, säkerhetslarm, hund på plattan, inspektion, ambulansflyg).
  Dessutom: listan visar vad varje plan saknar med en knapp "Skicka", väntande arbetare går att omfördela,
  knappar stjäl aldrig fordon från andra plan, manuellt skickade arbetare stannar kvar på jobbet, en vakt
  omdirigerar fastkörda enheter, en lös hund springer iväg efter 12 min. Robot: tre 12-dagarskarriärer utan låsning.
- **Kimm efter fler dagar (2026-10-26)**: repetitivt, fick aldrig widebody, klick i enhetslistan tappades, skift reagerade inte,
  enheter gömde sig, inget mer att bygga på högsta nivån. Rättat: listan ritas bara om när något ändrats och knappar reagerar
  på nedtryck, skift-klick växlar, nålar över alla enheter (syns genom plan och hus, färg = läge), nya bolag hör av sig först.
- **Utbyggnad 1 (klar)**: Pir B (Driftchef, 140 000 kr, byggs på två dagar med synlig byggarbetsplats, 9 000 kr/dag i drift):
  B1 och B2 med brygga (B2 tar widebody), fjärrplats R2, ny taxibaneanslutning. Passagerarbuss krävs på fjärrplatser (karriären).
  Årstider fem dagar var: vår, sommar (charter utan avtal, midsommarafton dag 3 med sex extra plan), höst (fler stormar,
  flyttfåglar), vinter (snöfall lägger snö på banan som stänger vid 100 % tills den plogas, alla avgångar avisas,
  kylan tröttar, +3 min marginal). Plantyper med egna jobb: widebody och lyxbolag vill ha catering, privatjet VIP-transport
  med Follow me-bilen (annars en arbetare), ambulansflyg: ambulansen väntar vid grinden och måste eskorteras,
  frakt: highloader (en arbetare räcker, 50 % fortare). Saknas eget fordon gör en entreprenör jobbet långsamt och mot betalning
  (avisning 3 000, catering 1 500, plogning 4 000). Nya fordon: buss, avisningsbil, snöplog, cateringbil, highloader.
  Milstolpar med belöning på kontoret (fliken Mål). Robot: 24 dagar utan låsning, riktat plantypstest.
- **Drama (klar, 2026-10-27)**: *Regissören* (karriären från dag 3, nivå 1–4 efter dag och dagtyp): värme byggs när det är lugnt,
  sedan omdirigerade plan från andra flygplatser, tidiga plan, ett händelsekort i förtid eller en kris. Avtalsplan kan vara sena
  (avgången står kvar, +3 000 kr om man hinner ikapp) eller tidiga, meddelas 18 min innan. *Morgongenomgång*: 0–4 kort
  (influensa, fordon på service, morgondimma, värmebölja, ombyggnad av en gate, pumpfel, pressad tidtabell, reporter, praktikant)
  och ett erbjudande (fotbollslandslaget med dubbelt bagage, två extra charter, filminspelning som stänger en gate, provflygning
  som ger avtal, statsbesök). *Kriser* (3,5 spelminuter att svara): bränsleläcka, resenär som inte dyker upp, drönare över banan,
  skadad arbetare, sjuk passagerare, anslutning i fara, fel väskor. Följder till nästa dag: nöjdhet, rykte, sjukskrivning.
  Rapporten visar "Så blev dagen". Skyddsnät: bränsle kan beställas på kredit, och passet tar slut 45 min efter sluttid.
  Robot: 3×24 dagar, riktat test av alla kriser med båda svaren (`tools/run-drama-smoke.sh`).
- **Nästa**: fraktterminal och hangar (tekniska fel), större händelsedagar (statsbesök, snöstormen), sedan grafik och proportioner.
  Byggläget (flytta och bygga gates, taxilinjer, depåer) kommer efter det. (v1 och v2 sparade som `mockups/stilskiss-v1.html` och `-v2.html`) för tecknad 3D med golvläge (`mockups/stilskiss.html`,
  https://kimmen1993.github.io/skyhub/mockups/stilskiss.html). Väntar på Kimms omdöme om stil och känsla.
  Skissen är ritad helt i kod. Den riktiga versionen kan använda gratis modellpaket (CC0) för rikare figurer och fordon.

## 9. Att förbättra senare

- Bättre zoom (Kimm: "ok nu, fixa senare").

## 10. Öppna frågor

- Spelets slutliga namn.
- Ska spelaren ha ett ansikte eller namn (anpassningsbar chefsfigur)?
- Gratis med köp i appen eller betalspel? Det påverkar ekonomidesignen. Ska bestämmas före mobilversionen.
