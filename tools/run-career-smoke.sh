#!/bin/sh
# Kör karriärprototypen headless med en robotspelare. Argument: sökväg till three.min.js r128.
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
$JSC tools/smoke/dom-stub.js "$1" tools/smoke/after-three.js career/js/data.js game/js/sim.js game/js/gfx.js game/js/world.js career/js/sfx.js career/js/career.js tools/smoke/career-run.js
