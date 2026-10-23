#!/bin/sh
# Testkör simuleringen headless med macOS jsc.
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
$JSC tools/simtest-jsc.js prototyp-v01/js/content.js prototyp-v01/js/sim.js tools/simtest-body.js
