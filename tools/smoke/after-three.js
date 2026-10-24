// Ersätt WebGL-renderaren med en som inte ritar något.
THREE.WebGLRenderer = function () { return { setPixelRatio: function () {}, setSize: function () {}, render: function (sc, cam) { __renders++; sc.updateMatrixWorld(); if (cam.parent === null) cam.updateMatrixWorld(); }, shadowMap: {}, outputEncoding: 0 }; };
var __renders = 0;
