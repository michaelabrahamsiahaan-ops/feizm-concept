/**
 * Ported from design/hero-parallax/feizm-scroll-hero.html's shared drawing
 * helpers (math/easing + canvas primitives). The prototype reads a single
 * module-level `ctx`; here every function takes `ctx` as its first
 * argument instead (so a React component can rebind it to whichever
 * CanvasRenderingContext2D is live) — everything else (names, math,
 * drawing order) is unchanged.
 */
import { BG, GRID, H, LAND, W, land, landSet } from "./map-data";

export function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
export function easeIn(t: number) {
  return t * t * t;
}
export function easeOutQ(u: number) {
  return 1 - (1 - u) * (1 - u);
}
export function backOut(t: number) {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
export function rgb(c: [number, number, number], a: number) {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}
export function mix(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
export function oa(a: number) {
  return "rgba(255,107,0," + a + ")";
}
export function ra(a: number) {
  return "rgba(217,45,32," + a + ")";
}
export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fs: string) {
  if (!(r > 0)) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fs;
  ctx.fill();
}
/** Ambient, real-time pulse — independent of scroll, driven by rAF's `now`. */
export function pulse(now: number, period: number) {
  return ((now / 1000) % period) / period;
}

export type Pattern = CanvasPattern | null;

export function makePattern(ctx: CanvasRenderingContext2D, w: number, h: number, pts: [number, number][], r: number): Pattern {
  const t = document.createElement("canvas");
  t.width = w;
  t.height = h;
  const c = t.getContext("2d")!;
  c.fillStyle = rgb(GRID, 1);
  pts.forEach((p) => {
    c.beginPath();
    c.arc(p[0], p[1], r, 0, Math.PI * 2);
    c.fill();
  });
  return ctx.createPattern(t, "repeat");
}

export interface Patterns {
  sea126: Pattern;
  sea135: Pattern;
  l2: Pattern;
}

export function makePatterns(ctx: CanvasRenderingContext2D): Patterns {
  return {
    sea126: makePattern(ctx, 72, 144, [[36, 36], [0, 108], [72, 108]], 12.6),
    sea135: makePattern(ctx, 72, 144, [[36, 36], [0, 108], [72, 108]], 13.5),
    l2: makePattern(ctx, 56, 112, [[28, 28], [0, 84], [56, 84]], 8.8),
  };
}

export function fillPattern(ctx: CanvasRenderingContext2D, p: Pattern, m: number[]) {
  if (!p) return;
  p.setTransform(new DOMMatrix(m));
  ctx.fillStyle = p;
  ctx.fillRect(0, -400, W, H + 800);
}

export function fadeLeft(ctx: CanvasRenderingContext2D, width: number, a: number) {
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 0, width, 0);
  g.addColorStop(0, rgb(BG, a));
  g.addColorStop(0.6, rgb(BG, 0.85 * a));
  g.addColorStop(1, rgb(BG, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, -400, width, H + 800);
}

export function landDots(ctx: CanvasRenderingContext2D, s: number, ox: number, oy: number, rl: number, alpha: number) {
  const m = rl + 2;
  ctx.fillStyle = rgb(LAND, alpha);
  ctx.beginPath();
  for (let i = 0; i < land.length; i += 2) {
    const lx = ox + s * land[i];
    const ly = oy + s * land[i + 1];
    if (lx < -m || lx > W + m || ly < -m || ly > H + m) continue;
    ctx.moveTo(lx + rl, ly);
    ctx.arc(lx, ly, rl, 0, Math.PI * 2);
  }
  ctx.fill();
}

export function dotted(ctx: CanvasRenderingContext2D, pts: [number, number][], w: number, gap: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.setLineDash([0, gap]);
  ctx.lineCap = "round";
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
}

export function dottedArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  w: number,
  gap: number,
  alpha: number,
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.setLineDash([0, gap]);
  ctx.lineCap = "round";
  ctx.lineWidth = w;
  ctx.strokeStyle = oa(alpha);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function ring(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  ph: number,
  color: (a: number) => string,
  a: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color(a * (1 - ph));
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function core(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sw: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#FF6B00";
  ctx.fill();
  ctx.lineWidth = sw;
  ctx.strokeStyle = rgb(BG, 1);
  ctx.stroke();
}

export function brackets(ctx: CanvasRenderingContext2D, x: number, y: number, half: number, arm: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#FF6B00";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).forEach((c) => {
    const cx = x + c[0] * half;
    const cy = y + c[1] * half;
    ctx.beginPath();
    ctx.moveTo(cx, cy - c[1] * arm);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - c[0] * arm, cy);
    ctx.stroke();
  });
  ctx.restore();
}

export function pin_(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-7, -11, -13, -18, -13, -25);
  ctx.arc(0, -25, 13, Math.PI, 0);
  ctx.bezierCurveTo(13, -18, 7, -11, 0, 0);
  ctx.closePath();
  ctx.fillStyle = "#FF6B00";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = rgb(BG, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -25, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = rgb(BG, 1);
  ctx.fill();
  ctx.restore();
}

export const TRAIL_A = [0.9, 0.7, 0.5, 0.3, 0.15];

export function isLandAt(x: number, y: number) {
  return !!landSet[x * 10000 + y];
}
