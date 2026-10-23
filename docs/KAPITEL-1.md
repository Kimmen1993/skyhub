# Kapitel 1: Plattan (Airside)

**Status: FÖRSLAG.** Inget här är bestämt förrän Kimm har sagt ja. Frågor att svara på finns sist.

---

## Utgångsläget

Kommunen har köpt den gamla regionala flygplatsen och anställt dig som **chef för plattan**. Du döper flygplatsen själv.

Allt fungerar redan när du kommer dit, men inte särskilt bra:

| Del | Vem sköter den i kapitel 1 | Hur det märks för dig |
|---|---|---|
| **Plattan** (gates, marktjänst, bagagelastning) | **Du** | Det är här du spelar. |
| Flygledningen | Entreprenören *Nordflyg Navigation* | Försiktig: lite för stora avstånd mellan landningar. Ibland får plan vänta i luften i onödan. |
| Terminalen | Entreprenören *TermiCo* | Långsam incheckning. Passagerare kommer sent till gaten, och det drabbar dina avgångstider. |
| Tankning och catering | Externa firmor | Kommer ibland sent. Du kan ringa och skynda på, men inte styra dem. |

Poängen är att du hela tiden *ser* var entreprenörerna brister. Det är din motivation att senare ta över tornet (kapitel 2) och terminalen (kapitel 3).

## Vad du gör, minut för minut

### 1. Planera (översikten)
- Dagens **tidtabell** syns som en tidslinje per gate.
- Du **fördelar flygen på gates**, eller låter en automatisk regel göra det.
- Du **planerar personalens skift** och vilken utrustning som behövs var.

### 2. Turnaround (det som händer vid varje plan)
När ett plan står vid gaten ska en rad uppgifter göras, delvis samtidigt:

1. Marshaller leder in planet, och stoppklossar läggs ut
2. Brygga eller trappa kopplas
3. Passagerare går av
4. Bagage lossas
5. Städning, catering och tankning
6. Bagage lastas
7. Boarding
8. Pushback

Varje uppgift kräver **personal och utrustning**. Saknas en bandlastare eller är någon på rast blir planet sent. Hela turnaround syns som en liten **tidslinje över planet**, så du ser direkt vad som håller upp.

### 3. Ingripa (golvläget)
Problem dyker upp, ungefär som i skisserna:
- utrustning som går sönder
- personal som saknas
- skräp på plattan (FOD)
- fåglar
- oljespill
- en passagerare som gått vilse
- en brygga som stannar
- bråttom med en VIP

Du kan **skicka personal**, vilket går långsammare och kanske sämre, eller **åka dit själv**, vilket går snabbare och bättre. Men du kan bara vara på ett ställe i taget. **Din uppmärksamhet är en resurs.**

### 4. Dagens slut
Rapporten visar fyra mätvärden:
- **Punktlighet**: andel avgångar inom 15 minuter.
- **Säkerhetsbetyg**: tutande fordon, fortkörning, skräp och olyckstillbud.
- **Flygbolagens nöjdhet**
- **Ekonomi**

Rapporten visar också hur du ligger till med uppdragen.

## Det du kan bygga och köpa i kapitel 1

- **Uppställningsplatser:** kontakt (bara längs den befintliga terminalfasaden) och fjärr.
- **Plattan:** utbyggd plattyta, taxilinjer och servicevägar.
- **Garage och depåer för utrustning**, där placeringen påverkar körtiderna.
- **Personalrum:** påverkar trötthet och raster.
- **Bagagehall för sortering till och från planen.**
- **Avisningsplatta** inför vintern.
- **Utrustning:** bagagetåg, bandlastare, trappor, bussar, pushbacktraktorer, elverk, avisningsbilar och Follow me-bilen. Utrustning kan **leasas**, som är billigt nu men dyrt i längden, eller **köpas**. Den slits och behöver service.

## Personal

- **Roller:** ramppersonal, marshaller, bryggoperatör, förare och mekaniker.
- **Egenskaper:** **kompetens** (utbildning gör dem snabbare och säkrare), **trötthet** (för långa pass ger misstag), **lön** och **arbetsmiljö**. Missnöjda anställda slutar, och i värsta fall blir det strejk.

## Pengar

- **Intäkter:**
  - landningsavgifter
  - **marktjänstavgift per turnaround** (du är både flygplats och handlingbolag)
  - parkeringsavgift för plan som står över natten
- **Kostnader:**
  - löner
  - leasing och köp av utrustning
  - underhåll
  - ersättning när förseningar beror på dig

Det finns ingen "oändliga pengar"-fälla: lönerna stiger med större personalstyrka, utrustningen slits och större flygbolag ställer hårdare krav.

## Uppdrag (huvudspåret)

1. **Första dagen** – klara fyra turnarounds med det befintliga laget. *(Lär dig grunderna.)*
2. **Egen utrustning** – köp din första bandlastare i stället för att leasa.
3. **Fjärrplatsen** – bygg en fjärrplats och få igång bussen.
4. **Nattparkering** – ta emot tre plan över natten.
5. **Midsommarrusningen** – dubbelt så många charterflyg en helg, minst 80 % punktlighet.
6. **Säkerhetsrevisionen** – myndigheten granskar dig. Håll säkerhetsbetyget över 90 % i en vecka.
7. **Vintern kommer** – bygg en avisningsplatta och klara första snöstormen.
8. **Den krävande kunden** – ett lågprisbolag vill ha 30-minuters turnarounds.
9. **Första widebodyn** – förbered L-plats, utrustning och utbildning för långdistans.
10. **Tornet ringer** – under en storm brister entreprenören i tornet. Du räddar dagen och erbjuds att ta över flygledningen. **Kapitel 2 låses upp.**

Sidouppdrag dyker upp längs vägen, till exempel VIP-besök, en flygbolagsdirektör på inspektion eller en praktikant som ska läras upp.

## Tid och tempo

- En speldag tar ungefär **20 minuter** i normal fart. Det finns paus och snabbspolning.
- I golvläget går tiden alltid i normal fart.

## Det som ska byggas tekniskt (för Claude)

- Spelmotorn i 3D med översikt och golvläge, utifrån skiss v3.
- **Verklighetstroget upplägg:** uppställningsplatser, en taxilinje direkt bakom, huvudtaxibana längre ut och banan ännu längre bort. Tvåfilig serviceväg längs terminalen med trafik åt båda hållen och passage under bryggorna.
- Turnaround-system med uppgifter, personal och utrustning.
- Entreprenörs-AI för torn och terminal (halvbra, med en kvalitetsnivå).
- Byggläge i 3D med rutnät på plattan.
- Uppdragsmotor, händelser och dagsrapport.
- Sparning: autospar, flera platser och exportkod.
- Simuleringskärnan från v0.1 återanvänds och byggs ut.

---

## Frågor till Kimm

1. **Marktjänsten:** ska du vara både flygplats och handlingbolag, alltså sköta lastning och bagage själv? *(Claudes förslag: ja, det blir roligare och enklare att förstå.)*
2. **Speldagens längd:** är cirka 20 minuter per dag lagom?
3. **Game over:** ska man kunna förlora, till exempel att kommunen sparkar dig vid stora förluster? Eller ska det vara mjukare, med lån och krav men aldrig slut? *(Förslag: mjukt i kapitel 1 med en bank och en arg kommunstyrelse, men ingen game over.)*
4. **Tonen:** lite humor och glimt i ögat, som Two Point (roliga namn, små skämt i texterna), eller mer seriöst?
5. **Något som saknas** som du tycker hör till plattan?
