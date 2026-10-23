#!/bin/sh
# Kör hela spelet (game/) headless: riktig three.js, fejkad webbläsare. Kräver three.min.js r128 som argument.
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
$JSC tools/smoke/dom-stub.js "$1" tools/smoke/after-three.js game/js/data.js game/js/sim.js game/js/gfx.js game/js/world.js game/js/ui.js game/js/main.js tools/smoke/run.js
