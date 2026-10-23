// Ersätt WebGL-renderaren med en som inte ritar något.
THREE.WebGLRenderer = function () { return { setPixelRatio: function () {}, setSize: function () {}, render: function () { __renders++; }, shadowMap: {}, outputEncoding: 0 }; };
var __renders = 0;
