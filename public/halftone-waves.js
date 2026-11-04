/*!
 * HalftoneWaves — animated halftone-dot wave field on a <canvas>, no
 * dependencies. Vendored from the supplied "FeizM CTA — halftone waves
 * (website embed)" HTML (public/../.. not kept; only this script's logic
 * survives) and adapted ONLY at the edges to match this project's own
 * HalftoneGlobe widget convention (public/halftone-globe.js) — a
 * `mount(container, options)` factory returning `{canvas, pause, play,
 * destroy}` instead of a bare self-executing script tied to one hardcoded
 * canvas id. The actual dot/wave math inside `createHalftoneWaves` — the
 * part that actually matters for visual fidelity — is untouched, byte-for-
 * byte, from the supplied file.
 *
 * Usage:
 *   <div id="stage" style="width:100%;max-width:1440px;aspect-ratio:1440/800"></div>
 *   <script src="halftone-waves.js"></script>
 *   <script>
 *     const h = HalftoneWaves.mount(document.getElementById('stage'), {
 *       dotColor: '#F25A29'
 *     });
 *     // h.destroy() to stop and remove.
 *   </script>
 */
(function (root) {
  'use strict';

  var DEFAULTS = {
    dotColor: '#F25A29',       // FeizM orange
    background: null,          // transparent: only the dots are drawn
    gridSpacing: 14,           // px between dots on the flat surface (CSS px)
    maxDotSize: 0.34,          // max dot radius, as a fraction of gridSpacing
    waveSpeed: 1,              // 1 = one full wave cycle per loopDuration
    waveAmplitude: 52,         // px of surface height at a 1440x800 stage (scales with size)
    fadeStart: 0.78,           // field fully faded ABOVE this height on the left (0 = top, 1 = bottom)...
    fadeStartRight: 0.57,      // ...rising to this height on the right (never above 0.55)
    fadeEnd: 0.30,             // fade depth: dots reach full size this far below the boundary (fraction of height)
    loopDuration: 16,          // s; render(t) === render(t + loopDuration)
    respectReducedMotion: true
  };

  function createHalftoneWaves(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var bg = opts.background;
    var DOT_COLOR = opts.dotColor;
    var GRID_SPACING = opts.gridSpacing;
    var MAX_DOT_SIZE = opts.maxDotSize;
    var WAVE_SPEED = opts.waveSpeed;
    var WAVE_AMPLITUDE = opts.waveAmplitude;
    var FADE_START = opts.fadeStart;
    var FADE_START_RIGHT = opts.fadeStartRight;
    var FADE_END = opts.fadeEnd;
    var LOOP_DURATION = opts.loopDuration;
    var W = 1440, H = 800, dpr = 1, S = 1;

    function resize(w, h) {
      W = Math.max(1, Math.round(w)); H = Math.max(1, Math.round(h));
      dpr = Math.min(opts.dpr || window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      S = Math.sqrt((W * H) / (1440 * 800));
    }

    var TAU = Math.PI * 2;
    var SQ = 0.6;                       // vertical squash of the ground plane (perspective)
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function smooth(a, b, x) { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); }

    // Surface height h(u, v, t) and its derivatives. Every time term uses an integer
    // multiple of 2π/LOOP_DURATION, so the loop closes exactly.
    function waves(t) {
      var w = TAU / LOOP_DURATION * WAVE_SPEED;
      var L = 1 / S;
      return [
        // [amp, kx, ky, omega, phase]   wavelengths in px (scaled by stage size)
        [1.00, TAU / 760 * L * 0.80, TAU / 760 * L * 0.60, w, 0.0],
        [0.55, TAU / 520 * L * -0.45, TAU / 520 * L * 0.89, -w, 1.7],
        [0.30, TAU / 330 * L * 0.95, TAU / 330 * L * -0.31, w, 4.1]
      ].map(function (c, i) {
        // slow swell: the whole surface gently rises and settles once per loop
        var swell = 1 + 0.22 * Math.sin(w * t + i * 2.1);
        return [c[0] * WAVE_AMPLITUDE * S * swell, c[1], c[2], c[3] * t + c[4]];
      });
    }

    function render(t) {
      t = +t || 0;
      var Wv = waves(t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }

      var g = GRID_SPACING, rMax = MAX_DOT_SIZE * g;
      var breathe = 0.022 * Math.sin(TAU * t / LOOP_DURATION * WAVE_SPEED + 0.6);
      var yTop = 0.5 * H;                              // nothing is drawn above this line
      var vMin = (yTop - 2 * WAVE_AMPLITUDE * S) / SQ, vMax = (H + 2 * WAVE_AMPLITUDE * S) / SQ;
      var uMin = -3 * g, uMax = W + 3 * g;
      ctx.fillStyle = DOT_COLOR;
      ctx.beginPath();
      var row = 0;
      for (var v = Math.floor(vMin / g) * g; v <= vMax; v += g, row++) {
        var off = (row & 1) ? g / 2 : 0;
        for (var u = uMin + off; u <= uMax; u += g) {
          // height + gradient of the surface
          var h = 0, hu = 0, hv = 0;
          for (var k = 0; k < 3; k++) {
            var c = Wv[k], ph = c[1] * u + c[2] * v - c[3];
            var s = Math.sin(ph), co = Math.cos(ph);
            h += c[0] * s; hu += c[0] * c[1] * co; hv += c[0] * c[2] * co;
          }
          // project: ground plane squashed by SQ, surface height lifts the dot and shears it a little
          var x = u + 0.35 * h, y = v * SQ - h;
          if (y < yTop - 4 || y > H + 12 || x < -12 || x > W + 12) continue;

          // halftone gradient: wavy diagonal boundary, rising to the right, breathing with the swell
          var fx = u / W;
          var ramp = fx * fx * (3 - 2 * fx);
          var boundary = (FADE_START + (FADE_START_RIGHT - FADE_START) * ramp
            + 0.045 * Math.sin(fx * 5.2 + 0.8) + 0.02 * Math.sin(fx * 11.3 + 2.1) + breathe) * H;
          boundary = Math.max(boundary, 0.56 * H);
          var depth = FADE_END * H * (0.75 + 0.5 * ramp);          // longer tail on the right
          var f = smooth(boundary, boundary + depth, v * SQ);
          f *= smooth(0.55 * H, 0.63 * H, y);                       // hard guarantee: top 55% stays empty
          if (f <= 0.004) continue;
          var r = rMax * f;

          // ellipse = image of a small circle under the surface Jacobian (perspective squash + folds)
          var a = 1 + 0.35 * hu, b = 0.35 * hv, cc = -hu, d = SQ - hv;
          var E = (a + d) / 2, F = (a - d) / 2, G = (cc + b) / 2, Hh = (cc - b) / 2;
          var Q = Math.sqrt(E * E + Hh * Hh), R = Math.sqrt(F * F + G * G);
          var sx = (Q + R) * r, sy = Math.abs(Q - R) * r;
          if (sy < 0.18) sy = 0.18;
          var ang = (Math.atan2(G, F) + Math.atan2(Hh, E)) / 2;
          ctx.moveTo(x + sx * Math.cos(ang), y + sx * Math.sin(ang));
          ctx.ellipse(x, y, sx, sy, ang, 0, TAU);
        }
      }
      ctx.fill();
    }

    resize(opts.width || canvas.clientWidth || 1440, opts.height || canvas.clientHeight || 800);
    return { render: render, resize: resize, get size() { return [W, H]; } };
  }

  function mount(container, options) {
    var o = {};
    for (var key in DEFAULTS) o[key] = DEFAULTS[key];
    for (key in options || {}) o[key] = options[key];

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(canvas);

    var hw = createHalftoneWaves(canvas, o);
    var reduced = o.respectReducedMotion && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t = 0, last = 0, speed = 1, raf = 0, userPaused = false, onScreen = true, alive = true;

    function fit() {
      var r = canvas.getBoundingClientRect();
      hw.resize(r.width || 1440, r.height || 800);
      hw.render(t);
    }

    var ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(canvas); else window.addEventListener('resize', fit);
    fit();

    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      t = (t + dt * speed) % o.loopDuration;
      hw.render(t);
      schedule();
    }
    function shouldRun() { return alive && !reduced && !userPaused && onScreen && !document.hidden; }
    function schedule() { if (shouldRun() && !raf) raf = requestAnimationFrame(frame); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }

    var io = window.IntersectionObserver ? new IntersectionObserver(function (e) {
      onScreen = e[0].isIntersecting; if (onScreen) schedule(); else stop();
    }) : null;
    if (io) io.observe(canvas);

    function onVisibility() { if (document.hidden) stop(); else schedule(); }
    document.addEventListener('visibilitychange', onVisibility);

    if (reduced) { t = 0; hw.render(0); } else schedule();

    return {
      canvas: canvas,
      pause: function () { userPaused = true; stop(); },
      play: function () { userPaused = false; schedule(); },
      destroy: function () {
        alive = false; stop();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', fit);
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.remove();
      }
    };
  }

  var api = { mount: mount, defaults: DEFAULTS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HalftoneWaves = api;
})(typeof window !== 'undefined' ? window : this);
