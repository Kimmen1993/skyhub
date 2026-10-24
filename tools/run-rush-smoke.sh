#!/bin/sh
# Kör rusningsprototypen headless med en robotspelare. Argument: sökväg till three.min.js r128.
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
$JSC tools/smoke/dom-stub.js "$1" tools/smoke/after-three.js rts/js/data.js game/js/sim.js game/js/gfx.js game/js/world.js career/js/sfx.js rts/js/career.js rts/js/rts.js tools/smoke/rush-run.js
# Guiden på dag 1, steg för steg
$JSC tools/smoke/dom-stub.js "$1" tools/smoke/after-three.js rts/js/data.js game/js/sim.js game/js/gfx.js game/js/world.js career/js/sfx.js rts/js/career.js rts/js/rts.js tools/smoke/coach-run.js
# Fasta lag och händelsekort
$JSC tools/smoke/dom-stub.js "$1" tools/smoke/after-three.js rts/js/data.js game/js/sim.js game/js/gfx.js game/js/world.js career/js/sfx.js rts/js/career.js rts/js/rts.js tools/smoke/routine-run.js
