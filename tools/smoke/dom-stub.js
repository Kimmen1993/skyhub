// Fejkad webbläsare för att köra spelet headless i macOS jsc (riktig three.js, fejkad DOM/WebGL).
var window = this, self = this, globalThis = this;
var console = { log: function () { print(Array.prototype.join.call(arguments, ' ')); }, warn: function () { print('WARN ' + Array.prototype.join.call(arguments, ' ')); }, error: function () { print('ERROR ' + Array.prototype.join.call(arguments, ' ')); } };
var innerWidth = 1280, innerHeight = 800, devicePixelRatio = 1;
var __now = 0; var performance = { now: function () { return __now; } };
var __raf = null; function requestAnimationFrame(f) { __raf = f; return 1; }
function setTimeout(f) { return 0; } function clearTimeout() {}
var __winL = {}; function addEventListener(t, f) { (__winL[t] = __winL[t] || []).push(f); } function removeEventListener() {}
var localStorage = (function () { var m = {}; return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } }; })();
var navigator = { clipboard: { writeText: function () { return { then: function (a) { a && a(); } }; } } };
var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function btoa(s) { var o = '', i = 0; while (i < s.length) { var a = s.charCodeAt(i++), b = s.charCodeAt(i++), c = s.charCodeAt(i++); var n = (a << 16) | ((b || 0) << 8) | (c || 0); o += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (isNaN(b) ? '=' : B64[(n >> 6) & 63]) + (isNaN(c) ? '=' : B64[n & 63]); } return o; }
function atob(s) { s = s.replace(/=+$/, ''); var o = '', bits = 0, val = 0; for (var i = 0; i < s.length; i++) { val = (val << 6) | B64.indexOf(s[i]); bits += 6; if (bits >= 8) { bits -= 8; o += String.fromCharCode((val >> bits) & 255); } } return o; }
function ctx2d() { var noop = function () {}; return { fillRect: noop, clearRect: noop, fillText: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, stroke: noop, fill: noop, ellipse: noop, arc: noop, closePath: noop, save: noop, restore: noop, translate: noop, rotate: noop, scale: noop, rect: noop, setTransform: noop, measureText: function () { return { width: 10 }; }, createLinearGradient: function () { return { addColorStop: noop }; }, getImageData: function () { return { data: [] }; } }; }
function El(tag, id) {
  var e = { tagName: (tag || 'div').toUpperCase(), id: id || '', style: {}, dataset: {}, children: [], hidden: false, value: '', innerHTML: '', textContent: '', width: 300, height: 150, clientWidth: 1280, clientHeight: 800, _l: {},
    classList: { _s: {}, add: function (c) { this._s[c] = 1; }, remove: function (c) { delete this._s[c]; }, toggle: function (c, v) { if (v === undefined) v = !this._s[c]; if (v) this._s[c] = 1; else delete this._s[c]; return v; }, contains: function (c) { return !!this._s[c]; } },
    setAttribute: function (k, v) { this['attr_' + k] = v; }, getAttribute: function (k) { return this['attr_' + k]; },
    addEventListener: function (t, f) { (this._l[t] = this._l[t] || []).push(f); }, removeEventListener: function () {},
    appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; }, remove: function () { if (this.parentNode) { var a = this.parentNode.children; var i = a.indexOf(this); if (i >= 0) a.splice(i, 1); } },
    querySelector: function () { return El('span'); }, querySelectorAll: function () { return []; }, closest: function () { return null; },
    getContext: function (k) { return k === '2d' ? ctx2d() : null; }, getBoundingClientRect: function () { return { left: 0, top: 0, width: 1280, height: 800 }; },
    setPointerCapture: function () {}, focus: function () {}, select: function () {} };
  Object.defineProperty(e, 'firstChild', { get: function () { return e.children[0]; } });
  return e;
}
var __els = {};
var document = { _l: {}, hidden: false,
  getElementById: function (id) { return __els[id] || (__els[id] = El('div', id)); },
  createElement: function (t) { return El(t); },
  querySelectorAll: function () { return []; }, querySelector: function () { return El('div'); },
  addEventListener: function (t, f) { (this._l[t] = this._l[t] || []).push(f); },
  body: El('body') };
var HTMLCanvasElement = function () {}, HTMLImageElement = function () {}, ImageBitmap = function () {}, OffscreenCanvas = undefined;
