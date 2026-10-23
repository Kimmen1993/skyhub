#!/bin/sh
# Testkör spelets simulering (kapitel 1) headless med macOS jsc.
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
$JSC tools/simtest-jsc.js game/js/data.js game/js/sim.js tools/gametest-body.js
