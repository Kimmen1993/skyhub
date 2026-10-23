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
- **Nästa**: Kimm testar karriärprototypen. Känns den rätt bygger vi om kapitel 1 kring den.
  Byggläget (flytta och bygga gates, taxilinjer, depåer) kommer efter det. (v1 och v2 sparade som `mockups/stilskiss-v1.html` och `-v2.html`) för tecknad 3D med golvläge (`mockups/stilskiss.html`,
  https://kimmen1993.github.io/skyhub/mockups/stilskiss.html). Väntar på Kimms omdöme om stil och känsla.
  Skissen är ritad helt i kod. Den riktiga versionen kan använda gratis modellpaket (CC0) för rikare figurer och fordon.

## 9. Att förbättra senare

- Bättre zoom (Kimm: "ok nu, fixa senare").

## 10. Öppna frågor

- Spelets slutliga namn.
- Ska spelaren ha ett ansikte eller namn (anpassningsbar chefsfigur)?
- Gratis med köp i appen eller betalspel? Det påverkar ekonomidesignen. Ska bestämmas före mobilversionen.
