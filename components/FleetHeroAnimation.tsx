"use client";

import { useEffect, useRef } from "react";

type RouteData = { pts: number[]; trail: number[] };
type AnimationData = { vb: [number, number, number, number]; dots: number[]; routes: RouteData[] };

type PreparedRoute = { pts: number[]; N: number };

export type FleetHeroAnimationProps = {
  className?: string;
  style?: React.CSSProperties;
  /** Playback speed multiplier. Design default: 1. */
  playback?: number;
  /** Accent color for the vehicle markers and lock-on ring. Design default: #F05A2E. */
  accent?: string;
  /** Fade in dots left-to-right instead of showing them all at once. Design default: false. */
  fadeLeft?: boolean;
  /** Dark canvas backdrop (#14100E) vs. transparent, letting the section's own background show through. */
  darkBackdrop?: boolean;
};

/**
 * Animated halftone map of Singapore for the Fleet Management System
 * Hero — vehicles travel along routes, one is located within 3 metres
 * (matching the page's own heading, "Locate every vehicle within 3m
 * accuracy") and arrives at Changi with a checkmark.
 *
 * Ported from a supplied design-tool export
 * ("07 · Illustration animation (live)-html/FMS-Hero-Animation.dc.html"),
 * whose own README explicitly frames it as a reference mockup to
 * "replicate faithfully... in its own components and styling system
 * rather than copy wholesale" — unlike the About Hero's halftone-globe.js
 * (vendored unmodified per ITS OWN README). So this is a clean React port
 * of that file's canvas drawing math (the `draw()`/`tick()` logic, read
 * and reproduced value-for-value: easing curves, timing thresholds, dot
 * radii, colors), not the original file embedded as-is — there's no
 * `<x-dc>` custom-element runtime or DCLogic base class in this project to
 * host it unmodified even if that had been the intent.
 *
 * The underlying geometry (6859 halftone dot coordinates + 11 routes, one
 * per vehicle, each with its own "trail" — which dots along its path have
 * already been passed) is pure data, not logic, and is reused verbatim
 * from the export's assets/*.json into public/fleet/hero-animation-data.json.
 *
 * Canvas is sized 2x the reference's own 1360x820 design resolution
 * (2720x1640) and scaled to fill its container via CSS, same device-pixel
 * sharpening approach as HalftoneGlobeWidget's DESIGN/scale pattern.
 *
 * `prefers-reduced-motion`: freezes at tau=7.6 (just after the lock-on
 * sequence resolves, before the arrival checkmark) and draws once instead
 * of animating — same behavior as the reference export.
 */
export function FleetHeroAnimation({
  className,
  style,
  playback = 1,
  accent = "#F05A2E",
  fadeLeft = false,
  darkBackdrop = true,
}: FleetHeroAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let tau = 0;
    let last = 0;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let n = 0;
    let dx = new Float32Array(0);
    let dy = new Float32Array(0);
    let delay = new Float32Array(0);
    let fk = new Float32Array(0);
    let owner = new Int8Array(0);
    let tf = new Float32Array(0);
    let routes: PreparedRoute[] = [];
    const spd = [1, 0.92, 1.04, 0.88, 1, 0.95, 0.9, 1.06, 0.97, 0.93, 1.02];

    const prep = (d: AnimationData) => {
      const count = d.dots.length / 2;
      n = count;
      dx = new Float32Array(count);
      dy = new Float32Array(count);
      delay = new Float32Array(count);
      fk = new Float32Array(count);
      owner = new Int8Array(count);
      tf = new Float32Array(count);
      let xmin = 1e9;
      let xmax = -1e9;
      for (let i = 0; i < count; i++) {
        dx[i] = d.dots[2 * i];
        dy[i] = d.dots[2 * i + 1];
        if (dx[i] < xmin) xmin = dx[i];
        if (dx[i] > xmax) xmax = dx[i];
        owner[i] = -1;
      }
      for (let i = 0; i < count; i++) {
        const x = dx[i];
        delay[i] = ((x - xmin) / (xmax - xmin)) * 0.8;
        fk[i] = x > 760 ? 1 : Math.max(0, (x - 160) / 600);
      }
      routes = d.routes.map((r) => ({ pts: r.pts, N: r.pts.length / 2 - 1 }));
      for (let r = 0; r < d.routes.length; r++) {
        const t = d.routes[r].trail;
        for (let k = 0; k < t.length; k += 2) {
          if (owner[t[k]] < 0) {
            owner[t[k]] = r;
            tf[t[k]] = t[k + 1];
          }
        }
      }
    };

    const pt = (r: number, u: number, out: [number, number]) => {
      const R = routes[r];
      const f = Math.max(0, Math.min(1, u)) * R.N;
      const i = Math.min(R.N - 1, Math.floor(f));
      const a = f - i;
      const p = R.pts;
      out[0] = p[2 * i] + (p[2 * i + 2] - p[2 * i]) * a;
      out[1] = p[2 * i + 1] + (p[2 * i + 3] - p[2 * i + 1]) * a;
      return out;
    };

    const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const io = (x: number) => {
      x = cl(x);
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };
    const eo = (x: number) => {
      x = cl(x);
      return 1 - Math.pow(1 - x, 3);
    };
    const back = (x: number) => {
      x = cl(x);
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };
    const hex = (h: string): [number, number, number] => [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];

    const draw = () => {
      const c = canvasRef.current;
      if (!c || !n) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const T = tau;
      const PI2 = Math.PI * 2;
      const A = hex(accent);
      const P = hex("#F9B79C");
      const mix = (f: number) =>
        "rgb(" +
        Math.round(P[0] + (A[0] - P[0]) * f) +
        "," +
        Math.round(P[1] + (A[1] - P[1]) * f) +
        "," +
        Math.round(P[2] + (A[2] - P[2]) * f) +
        ")";

      const u: number[] = [];
      let hu: number;
      if (T < 1.9) hu = 0.02;
      else if (T < 6) hu = 0.02 + 0.58 * io((T - 1.9) / 4.1);
      else if (T < 8) hu = 0.6 + (0.06 * (T - 6)) / 2;
      else hu = 0.66 + 0.34 * io((T - 8) / 0.7);
      u[0] = hu;
      for (let r = 1; r < routes.length; r++) u[r] = 0.04 + 0.91 * io((T - 1.9) / (7.1 * spd[r]));

      const O = 1 - io((T - 9.5) / 0.5);
      const Dm = io((T - 6) / 0.4) * O;
      const TA = io((T - 3.5) / 0.4) * O;
      const mapA = 1 - 0.45 * Dm;

      const s = c.width / 1360;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.setTransform(s, 0, 0, s, -90 * s, -110 * s);

      // map dots
      ctx.globalAlpha = mapA;
      ctx.fillStyle = "#FBFBFB";
      ctx.beginPath();
      let i: number, x: number, y: number, rv: number;
      for (i = 0; i < n; i++) {
        rv = T < 1.5 ? eo((T - delay[i]) / 0.4) : 1;
        rv *= 3 * (fadeLeft ? fk[i] : 1);
        if (rv < 0.15) continue;
        x = dx[i];
        y = dy[i];
        ctx.moveTo(x + rv, y);
        ctx.arc(x, y, rv, 0, PI2);
      }
      ctx.fill();

      // trails: dots on passed paths turn orange
      if (TA > 0.001) {
        for (let r = 0; r < routes.length; r++) {
          ctx.globalAlpha = TA * (r === 0 ? 1 : 1 - 0.72 * Dm);
          for (let b = 0; b < 6; b++) {
            ctx.fillStyle = mix((b + 0.5) / 6);
            ctx.beginPath();
            let any = false;
            for (i = 0; i < n; i++) {
              if (owner[i] !== r || tf[i] > u[r]) continue;
              const fb = Math.min(5, Math.floor((tf[i] / Math.max(u[r], 0.001)) * 6));
              if (fb !== b) continue;
              rv = 3.4 * (fadeLeft ? fk[i] : 1);
              if (rv < 0.15) continue;
              x = dx[i];
              y = dy[i];
              ctx.moveTo(x + rv, y);
              ctx.arc(x, y, rv, 0, PI2);
              any = true;
            }
            if (any) ctx.fill();
          }
        }
      }

      // vehicles
      const q: [number, number] = [0, 0];
      for (let r = routes.length - 1; r >= 0; r--) {
        if (T < 1.5) continue;
        if (r === 0 && T >= 8.7) continue;
        const pop = back((T - (1.5 + r * 0.09)) / 0.35);
        if (pop <= 0) continue;
        pt(r, u[r], q);
        const rr = (r === 0 ? 8 : 7) * pop;
        const va = O * (r === 0 ? 1 : 1 - 0.65 * Dm);
        ctx.globalAlpha = 0.22 * va * (r === 0 ? 1 : 1 - Dm);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(q[0], q[1], rr * 2.1, 0, PI2);
        ctx.fill();
        ctx.globalAlpha = va;
        ctx.fillStyle = "#14100E";
        ctx.beginPath();
        ctx.arc(q[0], q[1], rr + 3, 0, PI2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(q[0], q[1], rr, 0, PI2);
        ctx.fill();
      }

      // lock-on rings and +/-3m label
      if (T >= 6 && T < 8.3) {
        pt(0, u[0], q);
        const hx = q[0];
        const hy = q[1];
        const k = io((T - 6) / 1.2);
        const out = 1 - io((T - 8) / 0.3);
        const starts = [150, 110, 70];
        const widths = [1.5, 2, 2.5];
        ctx.globalAlpha = 0.18 * k * out;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(hx, hy, 34, 0, PI2);
        ctx.fill();
        ctx.strokeStyle = "#F9B79C";
        for (let j = 0; j < 3; j++) {
          ctx.globalAlpha = (0.3 + 0.6 * k) * out * (j === 2 ? 1 : 1 - 0.5 * k);
          ctx.lineWidth = widths[j];
          ctx.beginPath();
          ctx.arc(hx, hy, starts[j] + (34 - starts[j]) * k, 0, PI2);
          ctx.stroke();
        }
        const pl = eo((T - 7.2) / 0.3) * out;
        if (pl > 0) {
          const px = hx + 44;
          const py = hy - 78 + 8 * (1 - pl);
          ctx.globalAlpha = pl;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(hx + 24, hy - 24);
          ctx.lineTo(px + 6, py + 34);
          ctx.stroke();
          ctx.fillStyle = accent;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(px, py, 86, 38, 19);
          else ctx.rect(px, py, 86, 38);
          ctx.fill();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = '600 20px "Hanken Grotesk", system-ui, sans-serif';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("±3m", px + 43, py + 20);
        }
      }

      // arrival at Changi
      if (T >= 8.7) {
        pt(0, 1, q);
        const ax = q[0];
        const ay = q[1];
        const starts2 = [8.7, 9.0];
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        for (let m = 0; m < 2; m++) {
          const pp = (T - starts2[m]) / 0.9;
          if (pp <= 0 || pp >= 1) continue;
          ctx.globalAlpha = 0.35 * (1 - pp) * O;
          ctx.beginPath();
          ctx.arc(ax, ay, 26 * (1 + 1.6 * eo(pp)), 0, PI2);
          ctx.stroke();
        }
        const ap = eo((T - 8.7) / 0.3);
        ctx.globalAlpha = O;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(ax, ay, 26 * ap, 0, PI2);
        ctx.fill();
        const ck = cl((T - 8.8) / 0.3);
        if (ck > 0) {
          const l1 = 9.9;
          const l2 = 21.2;
          const L = (l1 + l2) * ck;
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(ax - 11, ay);
          if (L <= l1) {
            ctx.lineTo(ax - 11 + (7 * L) / l1, ay + (7 * L) / l1);
          } else {
            ctx.lineTo(ax - 4, ay + 7);
            const f2 = (L - l1) / l2;
            ctx.lineTo(ax - 4 + 15 * f2, ay + 7 - 15 * f2);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      if (!alive) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      tau += dt * playback;
      if (tau >= 10) tau = 1.5 + (tau - 10);
      draw();
      raf = requestAnimationFrame(tick);
    };

    fetch("/fleet/hero-animation-data.json")
      .then((r) => r.json())
      .then((d: AnimationData) => {
        if (!alive) return;
        prep(d);
        if (reduced) {
          tau = 7.6;
          draw();
        } else {
          raf = requestAnimationFrame(tick);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [playback, accent, fadeLeft]);

  return (
    <canvas
      ref={canvasRef}
      width={2720}
      height={1640}
      role="img"
      aria-label="Animated halftone map of Singapore: vehicles move along routes, one is located within 3 metres and arrives on time"
      className={className}
      style={{
        display: "block",
        backgroundColor: darkBackdrop ? "#14100E" : "transparent",
        ...style,
      }}
    />
  );
}
