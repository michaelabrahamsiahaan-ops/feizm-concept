/*!
 * FleetNightMap — animated night-time street map on a <canvas>: four
 * vehicles looping closed routes with fading trails, pulsing rings, and
 * timed "alert" notification pills, the road network fading out toward
 * the left (where CTA copy sits) and anchored to the right edge. No
 * dependencies. Vendored from the supplied "FeizM CTA — live fleet map"
 * HTML file, adapted ONLY at the edges to match this project's own
 * widget-mounting convention (public/halftone-globe.js,
 * public/halftone-waves.js) — a `mount(container, options)` factory
 * returning `{canvas, pause, play, destroy}` instead of a bare self-
 * executing script tied to one hardcoded canvas id, with every
 * PREVIEW-ONLY control panel piece (speed slider, copy overlay toggle,
 * play/pause button, time readout) stripped per the supplied file's own
 * "PREVIEW ONLY — delete ... for the website" comments. The actual
 * route/render math inside `createFleetMap` — the part that matters for
 * visual fidelity — is untouched, byte-for-byte, from the supplied file.
 *
 * Usage:
 *   <div id="stage" style="width:100%;max-width:1440px;aspect-ratio:1440/640"></div>
 *   <script src="fleet-night-map.js"></script>
 *   <script>
 *     const h = FleetNightMap.mount(document.getElementById('stage'));
 *     // h.destroy() to stop and remove.
 *   </script>
 */
(function (root) {
  'use strict';

  var BG_COLOR        = '#000000';
  var ROAD_CREAM      = '#F7E6D9';      // road colour toward the left (fading side)
  var ROAD_ORANGE     = '#F25A29';      // road colour at the right edge
  var BLOCK_FILL      = '#111111';      // building blocks (very low contrast)
  var VEHICLE_COLOR   = '#F25A29';
  var PILL_FILL       = '#1A1A1A';
  var PILL_BORDER     = '#3A3A3A';
  var PILL_TEXT       = '#FFFFFF';
  var DOT_ORANGE      = '#F25A29';
  var DOT_CREAM       = '#F7E6D9';

  var FADE_START      = 0.38;           // map fully hidden left of this (fraction of width)...
  var FADE_END        = 0.52;           // ...and fully visible right of this
  var ROAD_WIDTH      = 2;              // px at a 640px-tall stage (main roads; side streets are thinner)
  var VEHICLE_SIZE    = 11;             // dot diameter, px at a 640px-tall stage
  var TRAIL_LENGTH    = 70;             // px at a 640px-tall stage
  var PULSE_PERIOD    = 2;              // s, ring expands and fades (real time)

  var LOOP_DURATION   = 24;             // s; render(t) === render(t + LOOP_DURATION)
  // One closed route per vehicle (map units: 900x640 block anchored to the right edge) and laps per loop.
  // Laps are whole numbers, so every vehicle is back at its start after LOOP_DURATION.
  var VEHICLES = [
    { route: [[330, 330], [470, 330], [470, 520], [330, 520]], laps: 2, phase: 0.10 },
    { route: [[600, 150], [720, 150], [720, 330], [600, 330]], laps: 2, phase: 0.55 },
    { route: [[720, 420], [860, 420], [860, 520], [720, 520]], laps: 3, phase: 0.30 },
    { route: [[790, 150], [860, 150], [860, 330], [790, 330]], laps: 3, phase: 0.80 }
  ];

  var ALERT_INTERVAL  = 2;              // s between notifications (12 per loop)
  var ALERT_DURATION  = 2.5;            // s on screen (so at most 2 are visible at once)
  var ALERT_IN        = 0.25;           // s fade/scale in
  var ALERT_OUT       = 0.2;            // s fade out
  var ALERT_MESSAGES  = [
    { text: 'Speeding · 72 km/h',  dot: 'orange' },
    { text: 'Harsh braking',       dot: 'orange' },
    { text: 'Arrived at drop-off', dot: 'cream'  },
    { text: 'Left geofence',       dot: 'orange' },
    { text: 'Idle 5 min',          dot: 'cream'  }
  ];
  // Which vehicle gets each notification slot: never the same vehicle twice in a row (including the wrap).
  var ALERT_ORDER     = [0, 2, 1, 3, 0, 3, 2, 1, 3, 0, 1, 2];

  function createFleetMap(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var W = 1440, H = 640, dpr = 1, s = 1, ox = 0, oy = 0;
    var MAPW = 900, MAPH = 640;
    var layer = document.createElement('canvas'), lctx = layer.getContext('2d');
    var TAU = Math.PI * 2;
    var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var eo = function (x) { x = cl(x); return 1 - Math.pow(1 - x, 3); };
    var ss = function (x) { x = cl(x); return x * x * (3 - 2 * x); };

    // ---------- road network (map units) ----------
    var MAIN = [
      [[-40, 150], [960, 150]], [[-40, 330], [960, 330]], [[-40, 520], [960, 520]],
      [[180, -40], [180, 680]], [[470, -40], [470, 680]], [[720, 150], [720, 680]], [[860, -40], [860, 680]]
    ];
    var SIDE = [
      [[330, 330], [330, 520]], [[470, 420], [860, 420]], [[600, 150], [600, 330]],
      [[180, 240], [470, 240]], [[790, 150], [790, 330]], [[180, 600], [470, 600]], [[470, 60], [720, 60]]
    ];
    var CURVE = [[720, 150], [720, 70], [790, 30], [960, 24]];     // cubic, top-right corner
    var XS = [-60, 180, 330, 470, 600, 720, 790, 860, 980], YS = [-60, 60, 150, 240, 330, 420, 520, 600, 700];

    // ---------- vehicle routes: closed loops with rounded corners, sampled by arc length ----------
    function buildRoute(pts, rad) {
      var n = pts.length, poly = [];
      for (var i = 0; i < n; i++) {
        var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
        var d0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        var a = [p1[0] + (p0[0] - p1[0]) / d0 * rad, p1[1] + (p0[1] - p1[1]) / d0 * rad];
        var b = [p1[0] + (p2[0] - p1[0]) / d1 * rad, p1[1] + (p2[1] - p1[1]) / d1 * rad];
        for (var k = 0; k <= 8; k++) {            // quadratic corner through p1
          var u = k / 8, m = 1 - u;
          poly.push([m * m * a[0] + 2 * m * u * p1[0] + u * u * b[0], m * m * a[1] + 2 * m * u * p1[1] + u * u * b[1]]);
        }
      }
      poly.push(poly[0]);
      var cum = [0];
      for (i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
      return { poly: poly, cum: cum, L: cum[cum.length - 1] };
    }
    var routes = VEHICLES.map(function (v) { return buildRoute(v.route, 16); });
    function at(R, d) {
      d = ((d % R.L) + R.L) % R.L;
      var lo = 0, hi = R.cum.length - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (R.cum[mid] <= d) lo = mid; else hi = mid; }
      var f = (d - R.cum[lo]) / ((R.cum[hi] - R.cum[lo]) || 1);
      return [R.poly[lo][0] + (R.poly[hi][0] - R.poly[lo][0]) * f, R.poly[lo][1] + (R.poly[hi][1] - R.poly[lo][1]) * f];
    }
    function dist(i, t) {                           // distance travelled along route i at time t
      var R = routes[i], V = VEHICLES[i];
      return (V.phase + V.laps * (t / LOOP_DURATION)) * R.L;
    }
    var X = function (mx) { return ox + mx * s; }, Y = function (my) { return oy + my * s; };

    // ---------- static layer: blocks, roads, left fade ----------
    function buildLayer() {
      layer.width = canvas.width; layer.height = canvas.height;
      var c = lctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      c.fillStyle = BLOCK_FILL;
      var inset = 13;
      for (var i = 0; i < XS.length - 1; i++) for (var j = 0; j < YS.length - 1; j++) {
        var x0 = X(XS[i] + inset), x1 = X(XS[i + 1] - inset), y0 = Y(YS[j] + inset), y1 = Y(YS[j + 1] - inset);
        if (x1 - x0 < 6 || y1 - y0 < 6) continue;
        roundRect(c, x0, y0, x1 - x0, y1 - y0, 4 * s); c.fill();
      }
      var grad = c.createLinearGradient(X(0), 0, X(MAPW), 0);
      grad.addColorStop(0, ROAD_CREAM); grad.addColorStop(0.35, ROAD_CREAM); grad.addColorStop(1, ROAD_ORANGE);
      c.strokeStyle = grad; c.lineCap = 'round'; c.lineJoin = 'round';
      c.shadowColor = 'rgba(242,90,41,0.35)'; c.shadowBlur = 4 * s;
      c.lineWidth = ROAD_WIDTH * s;
      c.beginPath();
      MAIN.forEach(function (r) { c.moveTo(X(r[0][0]), Y(r[0][1])); c.lineTo(X(r[1][0]), Y(r[1][1])); });
      c.moveTo(X(CURVE[0][0]), Y(CURVE[0][1]));
      c.bezierCurveTo(X(CURVE[1][0]), Y(CURVE[1][1]), X(CURVE[2][0]), Y(CURVE[2][1]), X(CURVE[3][0]), Y(CURVE[3][1]));
      c.stroke();
      c.lineWidth = ROAD_WIDTH * 0.6 * s; c.globalAlpha = 0.75;
      c.beginPath();
      SIDE.forEach(function (r) { c.moveTo(X(r[0][0]), Y(r[0][1])); c.lineTo(X(r[1][0]), Y(r[1][1])); });
      c.stroke();
      c.globalAlpha = 1; c.shadowBlur = 0;
      // fade the map out toward the copy zone
      c.globalCompositeOperation = 'destination-out';
      var fg = c.createLinearGradient(FADE_START * W, 0, FADE_END * W, 0);
      fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = fg; c.fillRect(0, 0, FADE_END * W, H);
      c.globalCompositeOperation = 'source-over';
    }
    function roundRect(c, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    function resize(w, h) {
      W = Math.max(1, Math.round(w)); H = Math.max(1, Math.round(h));
      dpr = Math.min(opts.dpr || window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      s = H / MAPH;                               // scale by height: no distortion
      ox = W - MAPW * s; oy = 0;                  // anchored to the right edge
      buildLayer();
    }

    // ---------- notifications ----------
    var SLOTS = Math.round(LOOP_DURATION / ALERT_INTERVAL);
    function alertsAt(t) {
      var out = [];
      for (var k = 0; k < SLOTS; k++) {
        var t0 = 0.5 + k * ALERT_INTERVAL;
        var lt = ((t - t0) % LOOP_DURATION + LOOP_DURATION) % LOOP_DURATION;
        if (lt < ALERT_DURATION) out.push({ k: k, lt: lt, veh: ALERT_ORDER[k % ALERT_ORDER.length], msg: ALERT_MESSAGES[k % ALERT_MESSAGES.length] });
      }
      return out;
    }

    function render(t, pulseTime) {
      t = ((+t || 0) % LOOP_DURATION + LOOP_DURATION) % LOOP_DURATION;
      var pt = pulseTime === undefined ? t : pulseTime;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = BG_COLOR; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(layer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var pos = [];
      var vr = VEHICLE_SIZE / 2 * s, trail = TRAIL_LENGTH * s;
      for (var i = 0; i < VEHICLES.length; i++) {
        var d = dist(i, t), R = routes[i];
        // trail: fading segments behind the vehicle
        var steps = 14, seg = (TRAIL_LENGTH) / steps;
        ctx.lineCap = 'round'; ctx.strokeStyle = VEHICLE_COLOR;
        for (var q = 0; q < steps; q++) {
          var a = at(R, d - (q + 1) * seg), b = at(R, d - q * seg);
          ctx.globalAlpha = 0.7 * (1 - q / steps);
          ctx.lineWidth = (3.2 - 2 * q / steps) * s;
          ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke();
        }
        var p = at(R, d), px = X(p[0]), py = Y(p[1]);
        pos.push([px, py]);
        // pulse ring (each vehicle offset so they don't pulse in unison)
        var ph = (((pt / PULSE_PERIOD) + i * 0.27) % 1 + 1) % 1;
        ctx.globalAlpha = 0.55 * (1 - ph);
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath(); ctx.arc(px, py, vr + ph * 16 * s, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.18; ctx.fillStyle = VEHICLE_COLOR;
        ctx.beginPath(); ctx.arc(px, py, vr * 1.9, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(px, py, vr, 0, TAU); ctx.fill();
      }

      // notifications
      var fontPx = Math.max(11, Math.round(12.5 * s));
      ctx.font = '500 ' + fontPx + 'px "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      alertsAt(t).forEach(function (al) {
        var aIn = eo(al.lt / ALERT_IN), aOut = 1 - ss((al.lt - (ALERT_DURATION - ALERT_OUT)) / ALERT_OUT);
        var alpha = Math.min(aIn, aOut);
        if (alpha <= 0.003) return;
        var sc = 0.9 + 0.1 * aIn;
        var vx = pos[al.veh][0], vy = pos[al.veh][1];
        var tw = ctx.measureText(al.msg.text).width;
        var ph2 = 9 * s, dotR = 3.5 * s, gap = 8 * s;
        var pw = ph2 * 2 + dotR * 2 + gap + tw, phh = fontPx + 14 * s;
        var dx = 22 * s, dy = -30 * s;
        var left = vx + dx, top = vy + dy - phh / 2;
        if (left + pw > W - 10 * s) left = vx - dx - pw;              // flip to the left near the right edge
        if (left < FADE_END * W) left = Math.max(FADE_END * W, vx + dx);// never into the copy zone
        if (top < 8 * s) top = vy - dy - phh / 2;                     // flip below near the top edge
        if (top + phh > H - 8 * s) top = H - 8 * s - phh;
        var cx = left + pw / 2, cy = top + phh / 2;
        // connector line (draws in with the capsule)
        var ex = left > vx ? left : left + pw, ey = cy;
        ctx.globalAlpha = 0.8 * alpha; ctx.strokeStyle = '#6A6A6A'; ctx.lineWidth = 1 * s;
        ctx.beginPath(); ctx.moveTo(vx, vy);
        ctx.lineTo(vx + (ex - vx) * aIn, vy + (ey - vy) * aIn); ctx.stroke();
        // capsule
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14 * s; ctx.shadowOffsetY = 4 * s;
        roundRect(ctx, left, top, pw, phh, phh / 2); ctx.fillStyle = PILL_FILL; ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1; ctx.strokeStyle = PILL_BORDER; ctx.stroke();
        ctx.fillStyle = al.msg.dot === 'cream' ? DOT_CREAM : DOT_ORANGE;
        ctx.beginPath(); ctx.arc(left + ph2 + dotR, cy, dotR, 0, TAU); ctx.fill();
        ctx.fillStyle = PILL_TEXT;
        ctx.fillText(al.msg.text, left + ph2 + dotR * 2 + gap, cy + 0.5);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    resize(opts.width || canvas.clientWidth || 1440, opts.height || canvas.clientHeight || 640);
    return { render: render, resize: resize };
  }

  function mount(container, options) {
    var o = options || {};
    var canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      o.ariaLabel || 'Night-time street map with four vehicles driving and short alert notifications appearing next to them'
    );
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(canvas);

    var fm = createFleetMap(canvas, o);
    var reduced = (o.respectReducedMotion !== false) && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var STATIC_T = 1.5;                                          // vehicles spread out, one notification fully visible
    var t = reduced ? STATIC_T : 0, real = 0, last = 0, speed = 1, raf = 0, userPaused = false, onScreen = true, alive = true;

    function fit() {
      var r = canvas.getBoundingClientRect();
      fm.resize(r.width || 1440, r.height || 640);
      fm.render(t, real);
    }
    var ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(canvas); else window.addEventListener('resize', fit);
    fit();

    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      t = (t + dt * speed) % LOOP_DURATION;
      real += dt;
      fm.render(t, real);
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

    if (reduced) fm.render(STATIC_T, 0.6); else schedule();

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

  var api = { mount: mount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FleetNightMap = api;
})(typeof window !== 'undefined' ? window : this);
