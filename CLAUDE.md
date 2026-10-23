# SkyHub

**Läs `docs/DESIGN.md` först.** Det är spelets minne med alla beslut. Uppdatera beslutsloggen
och statusen där varje gång vi bestämmer något nytt eller blir klara med något.

Flygplatssimulator (svenska i spelet). Kimm testar via **GitHub Pages**:
https://kimmen1993.github.io/skyhub/ (repo Kimmen1993/skyhub, publikt). Jobbdatorn blockerar claude.ai,
så Pages är huvudkanalen. Efter varje ändring: commit + push, och uppdatera listan i rot-`index.html`.
`gh` finns i `~/.local/bin/gh` (inloggad som Kimmen1993).

Alla HTML-filer är fullständiga dokument (doctype + meta). Ska något publiceras som Claude-artefakt
måste de fyra första raderna (doctype/html/meta) tas bort först.

## Struktur
- `game/` – **det riktiga spelet** (kapitel 1). `js/data.js` innehåll, `js/sim.js` kärna (ingen DOM/grafik),
  `js/gfx.js` tecknade modeller, `js/world.js` statisk värld, `js/ui.js` DOM-paneler, `js/main.js` loop, aktörer, kamera, chefen.
- `index.html` – startsida med länkar till alla testversioner.
- `prototyp-v01/` – första prototypen (rutgrafik). Sim-kärnan där återanvänds.
- `mockups/` – stilskisser.
- `prototyp-v01/js/content.js` – all speldata (plan, verktyg/priser, flygbolag, händelser). Balansera här.
- `prototyp-v01/js/sim.js` – simuleringskärnan. Ingen DOM. State är ren JSON (nycklar med `_` är cache).
  Fast tick = 1 spelminut, rörelse är kontinuerlig. Passagerare/bagage är köade grupper, inte agenter.
- `prototyp-v01/js/render.js` – isometrisk Canvas 2D. Läser bara state.
- `prototyp-v01/js/ui.js` – DOM-paneler. `prototyp-v01/js/main.js` – loop, input, sparning (localStorage + exportkod).

## Testa utan webbläsare
- `./tools/run-gametest.sh` – spelets simulering i två speldagar.
- `./tools/run-smoke.sh <sökväg till three.min.js r128>` – hela spelet med riktig three.js och fejkad webbläsare
  (fångar krascher i grafik/UI-koden). Ladda ner three: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
- Alla sidor behöver `[hidden] { display: none !important; }` i CSS (GitHub Pages har ingen reset).
`./tools/run-simtest.sh` (använder macOS inbyggda jsc; node finns inte installerat).

## Riktning
Kärnan ska senare bära hamn och resecentrum (generisk hub/facility/operator), och
paketeras till iOS/Android (Capacitor). Håll sim.js fri från DOM.
