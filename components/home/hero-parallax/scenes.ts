/**
 * Ported from design/hero-parallax/feizm-scroll-hero.html's 5 scene
 * renderers (Scene 1 Fleet → Scene 5 Monitoring). Same math, same timing
 * constants, same easing — the only structural change from the prototype
 * is that `ctx` and the pattern set (`pat`) are passed in explicitly
 * (via `createSceneN(ctx, pat)` factories) instead of read off module-level
 * globals, so a React component can rebind them to its own canvas. Every
 * number below is copied from the prototype, not re-derived.
 */
import {
  H, ORANGE, RED, W, land, landSet, run,
} from "./map-data";
import {
  type Patterns,
  backOut, brackets, clamp, core, dot, dotted, dottedArc, ease, easeIn, easeOutQ,
  fadeLeft, fillPattern, landDots, lerp, mix, oa, pin_, pulse, ra, ring, TRAIL_A,
} from "./canvas-draw";

export type SceneRender = (t: number, now: number) => void;

// ---------- Scene 1 · Fleet ----------
export function createScene1(ctx: CanvasRenderingContext2D, pat: Patterns): SceneRender {
  const V = { x: 748, y: 452 }, P0 = { x: 974, y: 352.8 }, P1 = { x: 738, y: 450 }, S0 = 0.7, S1 = 4.5;
  function vehicle(x: number, y: number, r: number, haloK: number, now: number) {
    dot(ctx, x, y, lerp(44.8, 56, haloK), oa(0.08));
    dot(ctx, x, y, lerp(26.6, 32, haloK), oa(0.16));
    const ph = pulse(now, 1.6);
    ring(ctx, x, y, r + ph * 60, ph, oa, 0.35);
    core(ctx, x, y, r, 3);
  }
  return function (t: number, now: number) {
    if (t < 3.0) {
      const e = ease(clamp((t - 2.0) / 1.0, 0, 1));
      const s = S0 * Math.pow(S1 / S0, e);
      const P = { x: lerp(P0.x, P1.x, e), y: lerp(P0.y, P1.y, e) };
      const ox = P.x - s * V.x, oy = P.y - s * V.y;
      ctx.save();
      ctx.globalAlpha = clamp(t / 0.6, 0, 1);
      fillPattern(ctx, pat.sea126, [s / 9, 0, 0, s / 9, ox, oy]);
      ctx.restore();
      const reveal = (t / 0.9) * 1400, rl = lerp(2.1, 6.5, e), m = rl + 2;
      if (reveal > 1600) landDots(ctx, s, ox, oy, rl, 1);
      else for (let i = 0; i < land.length; i += 2) {
        const nx = land[i], ny = land[i + 1], sx = ox + s * nx, sy = oy + s * ny;
        if (sx < -m || sx > W + m || sy < -m || sy > H + m) continue;
        const a = clamp((reveal - Math.sqrt((nx - V.x) * (nx - V.x) + (ny - V.y) * (ny - V.y))) / 120, 0, 1);
        if (a > 0) dot(ctx, sx, sy, rl, `rgba(251,251,251,${a})`);
      }
      for (let k = 1; k <= 5; k++) {
        const ta = clamp((t - 0.8 - (5 - k) * 0.08) / 0.15, 0, 1);
        if (ta > 0) dot(ctx, ox + s * (V.x - 8 * k), oy + s * V.y, lerp(2.52, 7.5, e), oa(TRAIL_A[k - 1] * ta));
      }
      const pop = clamp((t - 0.5) / 0.35, 0, 1);
      if (pop > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, pop * 2);
        vehicle(P.x, P.y, lerp(11.2, 13, e) * backOut(pop), e, now);
        ctx.restore();
      }
      return;
    }
    const kc = ease(clamp((t - 3.0) / 0.6, 0, 1));
    for (let j = 0; j * 36 + 18 <= H + 20; j++) {
      const y = 18 + 36 * j, x0 = j % 2 === 0 ? 18 : 0, road = y === 414 || y === 450 || y === 486;
      for (let x = x0; x <= W + 20; x += 36) {
        const isL = !!landSet[(V.x + (x - P1.x) / S1) * 10000 + (V.y + (y - P1.y) / S1)];
        dot(ctx, x, y, lerp(isL ? 6.5 : 6.3, road ? 7.5 : 5.5, kc), `rgba(${mix(isL ? [251, 251, 251] : [42, 42, 49], road ? [245, 245, 243] : [42, 42, 49], kc).map((n) => n | 0).join(",")},1)`);
      }
    }
    fadeLeft(ctx, 760, kc);
    const hp = clamp((t - 3.6) / 0.35, 0, 4), n = Math.min(Math.floor(hp), 3), f = hp >= 4 ? 1 : ease(hp - Math.floor(hp));
    const vx = 738 + 36 * (n + f), cell = 738 + 36 * Math.floor(Math.min(hp, 4));
    [212, 286, 360].forEach((cy, i) => {
      const p = ease(clamp((t - 5.1 - 0.15 * i) / 0.2, 0, 1));
      if (p > 0) dotted(ctx, [[882, 450], [lerp(882, 1030, p), lerp(450, cy, p)]], 2.5, 7, ORANGE);
    });
    for (let q = 1; q <= 5; q++) dot(ctx, cell - 36 * q, 450, 7.5, oa(TRAIL_A[q - 1]));
    vehicle(vx, 450, 13, 1, now);
  };
}

// ---------- Scene 2 · Assets ----------
export function createScene2(ctx: CanvasRenderingContext2D, pat: Patterns): SceneRender {
  const R: [number, number][] = [];
  run(R, 300, 436, 500); R.push([440, 492], [444, 484], [448, 476], [452, 468]);
  run(R, 460, 596, 468); R.push([600, 460]); run(R, 608, 784, 460);
  R.push([788, 452], [792, 444], [796, 436], [800, 428]); run(R, 808, 976, 428);
  R.push([980, 436], [984, 444], [988, 452], [992, 460], [996, 468]); run(R, 1004, 1164, 468);
  R.push([1168, 476], [1172, 484], [1176, 492], [1180, 500]);
  const I0 = 17, I1 = 40;
  const S_ST = 4.5, P_ST = { x: 882, y: 450 }, S_A = 0.556, T_A = 152.0, S_B = 0.4, L_B = 468.8, T_B = 220.8, L_A = 633.6;
  const V0 = { x: R[I0][0], y: R[I0][1] }, P_A = { x: L_A + S_A * V0.x, y: T_A + S_A * V0.y };
  function camera(t: number) {
    if (t < 1.1) return { s: S_ST, ox: P_ST.x - S_ST * V0.x, oy: P_ST.y - S_ST * V0.y, z: 0, d: 0 };
    if (t < 2.5) {
      const e = ease((t - 1.1) / 1.4), s = S_ST * Math.pow(S_A / S_ST, e);
      const P = { x: lerp(P_ST.x, P_A.x, e), y: lerp(P_ST.y, P_A.y, e) };
      return { s, ox: P.x - s * V0.x, oy: P.y - s * V0.y, z: e, d: 0 };
    }
    const d = ease(clamp((t - 4.4) / 1.0, 0, 1));
    return { s: lerp(S_A, S_B, d), ox: lerp(L_A, L_B, d), oy: lerp(T_A, T_B, d), z: 1, d };
  }
  return function (t: number, now: number) {
    const cam = camera(t), s = cam.s, ox = cam.ox, oy = cam.oy;
    if (t < 1.1) {
      const kc = ease(clamp((t - 0.6) / 0.5, 0, 1));
      const nx0 = Math.floor(-ox / s / 8) * 8 - 8, nx1 = Math.ceil((W - ox) / s / 8) * 8 + 8;
      const ny0 = Math.floor(-oy / s / 8) * 8 - 8, ny1 = Math.ceil((H - oy) / s / 8) * 8 + 8;
      for (let ny = ny0; ny <= ny1; ny += 8) {
        const row = ((ny - 148) / 8) % 2 === 0 ? 4 : 0, road = Math.abs(ny - V0.y) <= 8;
        for (let nx = nx0 - (((nx0 - row) % 8) + 8) % 8; nx <= nx1; nx += 8) {
          const isL = !!landSet[nx * 10000 + ny];
          dot(ctx, ox + s * nx, oy + s * ny, lerp(road ? 7.5 : 5.5, isL ? 6.5 : 1.5 * s, kc), `rgba(${mix(road ? [245, 245, 243] : [42, 42, 49], isL ? [251, 251, 251] : [42, 42, 49], kc).map((v) => v | 0).join(",")},1)`);
        }
      }
      fadeLeft(ctx, 760, 1 - kc);
      for (let q = 1; q <= 5; q++) dot(ctx, 882 - 36 * q, 450, 7.5, oa(TRAIL_A[q - 1] * (1 - kc)));
    } else {
      fillPattern(ctx, pat.sea135, [s / 9, 0, 0, s / 9, ox, oy]);
      landDots(ctx, s, ox, oy, cam.z < 1 ? lerp(6.5, 3 * S_A, cam.z) : 3 * s, 1);
    }
    const rA = clamp((t - 2.4) / 0.4, 0, 1);
    const f0 = clamp((t - 2.9) / 1.4, 0, 1), rp = I0 + (I1 - I0) * ease(f0), vi = Math.floor(rp);
    if (rA > 0) for (let j = 0; j < R.length; j++) {
      const a = j <= vi ? lerp(clamp(1 - Math.max(0, vi - j - 4) / 18, 0.2, 1), 1, cam.d) : lerp(0.2, 0.3, cam.d);
      dot(ctx, ox + s * R[j][0], oy + s * R[j][1], 3.6 * s, oa(a * rA));
    }
    const fi = rp - vi, pa = R[vi], pb = R[Math.min(vi + 1, R.length - 1)];
    const vx = ox + s * lerp(pa[0], pb[0], fi), vy = oy + s * lerp(pa[1], pb[1], fi);
    const vr = t < 1.1 ? 13 : cam.z < 1 ? lerp(13, 12.5, cam.z) : lerp(12.5, 9, cam.d);
    [212, 286, 360].forEach((cy, k) => {
      const p = ease(clamp((t - 5.3 - 0.15 * k) / 0.2, 0, 1));
      if (p > 0) dotted(ctx, [[vx, vy], [lerp(vx, 1030, p), lerp(vy, cy, p)]], 2.5, 7, ORANGE);
    });
    const halo = t < 1.1 ? 0 : cam.z < 1 ? cam.z : 1;
    dot(ctx, vx, vy, lerp(56, 66.7, halo) * (1 - cam.d), oa(0.07 * (1 - cam.d)));
    dot(ctx, vx, vy, lerp(lerp(32, 30.6, halo), 22, cam.d), oa(0.16));
    const ph = pulse(now, 1.6);
    ring(ctx, vx, vy, vr + ph * 50, ph, oa, 0.35);
    core(ctx, vx, vy, vr, 2.5);
    const lk = clamp((t - 2.5) / 0.4, 0, 1);
    if (lk > 0) {
      const half = lerp(34, 24, cam.d) * lerp(1.4, 1, backOut(lk));
      brackets(ctx, vx, vy, half, half * 0.55, Math.min(1, lk * 2));
    }
  };
}

// ---------- Scene 3 · Video & Cloud ----------
export function createScene3(ctx: CanvasRenderingContext2D, pat: Patterns): SceneRender {
  const R: [number, number][] = [];
  run(R, 300, 436, 500); R.push([440, 492], [444, 484], [448, 476], [452, 468]);
  run(R, 460, 596, 468); R.push([600, 460]); run(R, 608, 784, 460);
  R.push([788, 452], [792, 444], [796, 436], [800, 428]); run(R, 808, 976, 428);
  R.push([980, 436], [984, 444], [988, 452], [992, 460], [996, 468]); run(R, 1004, 1164, 468);
  R.push([1168, 476], [1172, 484], [1176, 492], [1180, 500]);
  const VI = 40, V = { x: 600, y: 460 };
  const S_A = 0.4, P_A = { x: 708.8, y: 404.8 }, S_ST = 4.5, P_ST = { x: 702, y: 450 };
  const CLOUD: { x: number; y: number; d: number }[] = [];
  const STORE: { x: number; y: number; d: number; a: number }[] = [];
  function inC(x: number, y: number, cx: number, cy: number, r: number) {
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
  }
  function inE(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
    const a = (x - cx) / rx, b = (y - cy) / ry;
    return a * a + b * b <= 1;
  }
  function band(x: number, y: number, y0: number) {
    const u = (x - 805) / 75;
    if (Math.abs(u) > 1) return false;
    return Math.abs(y - (y0 + 20 * Math.sqrt(1 - u * u))) < 5;
  }
  for (let m = 0; m < 30; m++) {
    ([[7 + 28 * m, 7], [21 + 28 * m, 0]] as [number, number][]).forEach((r) => {
      const y = r[0];
      for (let x = r[1]; x <= W; x += 14) {
        if (inC(x, y, 720, 320, 65) || inC(x, y, 805, 275, 88) || inC(x, y, 890, 320, 65) || (x >= 720 && x <= 890 && y >= 320 && y <= 385)) {
          CLOUD.push({ x, y, d: Math.hypot(x - 805, y - 310) });
        }
        const top = inE(x, y, 805, 472, 75, 20) && y < 472;
        const body = (x >= 730 && x <= 880 && y >= 472 && y <= 612) || (inE(x, y, 805, 612, 75, 20) && y > 612);
        if ((top || body) && !band(x, y, 518) && !band(x, y, 565)) {
          STORE.push({ x, y, d: Math.hypot(x - 805, y - 542), a: top ? 0.45 : 1 });
        }
      }
    });
  }
  function quad(p0: [number, number], c: [number, number], p1: [number, number], n: number, upTo: number): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i <= n * upTo; i++) {
      const u = i / n;
      out.push([
        (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0],
        (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1],
      ]);
    }
    return out;
  }
  function streetWorld(t: number) {
    const e = ease(clamp(t / 1.2, 0, 1)), s = S_A * Math.pow(S_ST / S_A, e);
    const P = { x: lerp(P_A.x, P_ST.x, e), y: lerp(P_A.y, P_ST.y, e) };
    const ox = P.x - s * V.x, oy = P.y - s * V.y;
    if (t < 1.2) {
      fillPattern(ctx, pat.sea135, [s / 9, 0, 0, s / 9, ox, oy]);
      landDots(ctx, s, ox, oy, lerp(3 * S_A, 6.5, e), 1);
      const rA = 1 - clamp(t / 0.6, 0, 1);
      if (rA > 0) for (let j = 0; j < R.length; j++) dot(ctx, ox + s * R[j][0], oy + s * R[j][1], 3.6 * s, oa((j <= VI ? 1 : 0.3) * rA));
      return;
    }
    const kc = ease(clamp((t - 1.2) / 0.5, 0, 1));
    const nx0 = Math.floor(-ox / s / 8) * 8 - 8, nx1 = Math.ceil((W - ox) / s / 8) * 8 + 8;
    const ny0 = Math.floor((-oy - 400) / s / 8) * 8 - 8, ny1 = Math.ceil((H - oy) / s / 8) * 8 + 8;
    for (let ny = ny0; ny <= ny1; ny += 8) {
      const row = ((ny - 148) / 8) % 2 === 0 ? 4 : 0, road = Math.abs(ny - V.y) <= 8;
      for (let nx = nx0 - (((nx0 - row) % 8) + 8) % 8; nx <= nx1; nx += 8) {
        const isL = !!landSet[nx * 10000 + ny];
        dot(ctx, ox + s * nx, oy + s * ny, lerp(isL ? 6.5 : 6.75, road ? 7.5 : 5.5, kc), `rgba(${mix(isL ? [251, 251, 251] : [42, 42, 49], road ? [245, 245, 243] : [42, 42, 49], kc).map((v) => v | 0).join(",")},1)`);
      }
    }
    fadeLeft(ctx, 680, kc);
    const hop = ease(clamp((t - 1.7) / 0.35, 0, 1)), cell = 702 + (hop >= 1 ? 36 : 0), TA = [0.75, 0.5, 0.3, 0.15];
    for (let q = 1; q <= 4; q++) dot(ctx, cell - 36 * q, 450, 7.5, oa(TA[q - 1] * kc));
    const A0 = (-110 * Math.PI) / 180, A1 = (-20 * Math.PI) / 180, RR = [70, 115, 160], AL = [1, 0.6, 0.3];
    RR.forEach((r, i) => {
      const lt = t - 1.9 - 0.1 * i;
      if (lt < 0) return;
      const cyc = 0.85, n = Math.floor(lt / cyc), u = (lt % cyc) / cyc;
      const grow = n >= 2 ? 1 : easeOutQ(u), al = n >= 2 ? 1 : u < 0.25 ? u / 0.25 : 1 - ((u - 0.25) / 0.75) * 0.6;
      dottedArc(ctx, 738, 450, r * (0.75 + 0.25 * grow), A0, A1, 8, 15, AL[i] * al);
    });
  }
  function vehicleAt(t: number) {
    if (t < 1.7) {
      const e = ease(clamp(t / 1.2, 0, 1));
      return { x: lerp(P_A.x, P_ST.x, e), y: lerp(P_A.y, P_ST.y, e), r: lerp(9, 13, e), h: lerp(22, 32, e) };
    }
    const hop = ease(clamp((t - 1.7) / 0.35, 0, 1)), sx = 702 + 36 * hop, k = ease(clamp((t - 3.6) / 0.6, 0, 1));
    return { x: lerp(sx, 609, k), y: lerp(450, 623, k), r: lerp(13, 9, k), h: lerp(32, 22, k) };
  }
  return function (t: number, now: number) {
    const k = ease(clamp((t - 3.6) / 0.6, 0, 1));
    if (k < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(0, 300 * k);
      streetWorld(t);
      ctx.restore();
    }
    if (k > 0) {
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(0, -220 * (1 - k));
      fillPattern(ctx, pat.l2, [0.25, 0, 0, 0.25, 0, 0]);
      fadeLeft(ctx, 640, 1);
      ctx.restore();
    }
    const cg = clamp((t - 4.2) / 0.7, 0, 1);
    if (cg > 0) CLOUD.forEach((p) => {
      const a = clamp((cg * 175 - p.d) / 18, 0, 1);
      if (a > 0) dot(ctx, p.x, p.y, 3.6 * backOut(a), "rgba(251,251,251,1)");
    });
    const sc = clamp((t - 4.3) / 0.5, 0, 1);
    if (sc > 0) {
      const pts = quad([640, 548], [680, 465], [735, 395], 40, sc);
      if (pts.length > 1) dotted(ctx, pts, 6, 12, oa(0.6));
    }
    const ar = clamp((t - 4.9) / 0.3, 0, 1);
    if (ar > 0) {
      dotted(ctx, [[805, 400], [805, 400 + 48 * ar]], 6, 12, ORANGE);
      if (ar >= 1) {
        ctx.beginPath();
        ctx.moveTo(795, 442);
        ctx.lineTo(805, 454);
        ctx.lineTo(815, 442);
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = ORANGE;
        ctx.stroke();
      }
    }
    const sg = clamp((t - 5.0) / 0.5, 0, 1);
    if (sg > 0) STORE.forEach((p) => {
      const a = clamp((sg * 140 - p.d) / 16, 0, 1);
      if (a > 0) dot(ctx, p.x, p.y, 3.6 * backOut(a), `rgba(251,251,251,${p.a})`);
    });
    [212, 286, 360].forEach((cy, i) => {
      const p = ease(clamp((t - 5.5 - 0.15 * i) / 0.2, 0, 1));
      if (p > 0) dotted(ctx, [[955, 320], [lerp(955, 1030, p), lerp(320, cy, p)]], 2.5, 7, ORANGE);
    });
    const v = vehicleAt(t);
    if (k > 0) ([[40, 1], [65, 0.6], [90, 0.3]] as [number, number][]).forEach((a, i) => {
      const lt = clamp((t - 4.2 - 0.1 * i) / 0.3, 0, 1);
      if (lt > 0) dottedArc(ctx, v.x, v.y, a[0] * (0.8 + 0.2 * lt), (-100 * Math.PI) / 180, (-35 * Math.PI) / 180, 6, 11, a[1] * lt * k);
    });
    dot(ctx, v.x, v.y, v.h, oa(0.16));
    const ph = pulse(now, 1.6);
    ring(ctx, v.x, v.y, v.r + ph * 50, ph, oa, 0.35);
    core(ctx, v.x, v.y, v.r, 2.5);
  };
}

// ---------- Scene 4 · Delivery (route R4/START/FINISH shared with Scene 5) ----------
export const R4: [number, number][] = [];
run(R4, 300, 428, 516); R4.push([432, 508], [436, 500], [440, 492], [444, 484]);
run(R4, 448, 616, 476); R4.push([620, 468]); run(R4, 628, 772, 468);
R4.push([776, 476], [780, 484], [784, 492], [788, 500], [792, 508], [796, 516], [800, 524]);
run(R4, 808, 968, 524); R4.push([972, 532], [976, 540]); run(R4, 984, 1144, 540);
export const START = { x: 300, y: 516 };
export const FINISH = { x: 1152, y: 540 };

export function createScene4(ctx: CanvasRenderingContext2D, pat: Patterns): SceneRender {
  const VI = 43, HUB = { x: 748, y: 452 }, CORE = { x: 805, y: 542 };
  const CLOUD: { x: number; y: number }[] = [];
  const STORE: { x: number; y: number; a: number; w: number }[] = [];
  function inC(x: number, y: number, cx: number, cy: number, r: number) {
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
  }
  function inE(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
    const a = (x - cx) / rx, b = (y - cy) / ry;
    return a * a + b * b <= 1;
  }
  function band(x: number, y: number, y0: number) {
    const u = (x - 805) / 75;
    if (Math.abs(u) > 1) return false;
    return Math.abs(y - (y0 + 20 * Math.sqrt(1 - u * u))) < 5;
  }
  for (let m = 0; m < 30; m++) {
    ([[7 + 28 * m, 7], [21 + 28 * m, 0]] as [number, number][]).forEach((r) => {
      const y = r[0];
      for (let x = r[1]; x <= W; x += 14) {
        if (inC(x, y, 720, 320, 65) || inC(x, y, 805, 275, 88) || inC(x, y, 890, 320, 65) || (x >= 720 && x <= 890 && y >= 320 && y <= 385)) CLOUD.push({ x, y });
        const top = inE(x, y, 805, 472, 75, 20) && y < 472;
        const body = (x >= 730 && x <= 880 && y >= 472 && y <= 612) || (inE(x, y, 805, 612, 75, 20) && y > 612);
        if ((top || body) && !band(x, y, 518) && !band(x, y, 565)) STORE.push({ x, y, a: top ? 0.45 : 1, w: ((x * 7 + y * 13) % 100) / 400 });
      }
    });
  }
  function mapCam(t: number) {
    if (t < 1.5) {
      const e = ease(clamp((t - 0.6) / 0.9, 0, 1)), s = 2.0 * Math.pow(0.7 / 2.0, e);
      const P = { x: lerp(CORE.x, 974, e), y: lerp(CORE.y, 352.8, e) };
      return { s, ox: P.x - s * HUB.x, oy: P.y - s * HUB.y };
    }
    const d = ease(clamp((t - 1.5) / 0.9, 0, 1));
    return { s: lerp(0.7, 0.85, d), ox: lerp(450.4, 391.2, d), oy: lerp(36.4, -5.8, d) };
  }
  return function (t: number, now: number) {
    const c = clamp(t / 0.7, 0, 1), ce = easeIn(c);
    if (t < 0.9) {
      const ga = 1 - clamp((t - 0.3) / 0.5, 0, 1);
      if (ga > 0) {
        ctx.save();
        ctx.globalAlpha = ga;
        fillPattern(ctx, pat.l2, [0.25, 0, 0, 0.25, 0, 0]);
        fadeLeft(ctx, 640, 1);
        ctx.restore();
      }
      const fa = 1 - clamp(t / 0.4, 0, 1);
      if (fa > 0) {
        CLOUD.forEach((p) => dot(ctx, p.x, p.y, 3.6, `rgba(251,251,251,${fa})`));
        dotted(ctx, [[640, 548], [680, 500], [735, 395]], 6, 12, oa(0.6 * fa));
        dotted(ctx, [[805, 400], [805, 448]], 6, 12, oa(fa));
        ([[40, 1], [65, 0.6], [90, 0.3]] as [number, number][]).forEach((a) =>
          dottedArc(ctx, 609, 623, a[0], (-100 * Math.PI) / 180, (-35 * Math.PI) / 180, 6, 11, a[1] * fa),
        );
        dot(ctx, 609, 623, 22, oa(0.16 * fa));
        dot(ctx, 609, 623, 9, oa(fa));
      }
      if (c < 1) STORE.forEach((p) => {
        const k = clamp((ce - p.w) / (1 - p.w), 0, 1);
        dot(ctx, lerp(p.x, CORE.x, k), lerp(p.y, CORE.y, k), lerp(3.6, 2, k), `rgba(${mix([251, 251, 251], [255, 107, 0], k).map((v) => v | 0).join(",")},${lerp(p.a, 1, k)})`);
      });
    }
    const ma = clamp((t - 0.6) / 0.3, 0, 1), cam = mapCam(t), s = cam.s, ox = cam.ox, oy = cam.oy;
    if (ma > 0) {
      ctx.save();
      ctx.globalAlpha = ma;
      fillPattern(ctx, pat.sea126, [s / 9, 0, 0, s / 9, ox, oy]);
      landDots(ctx, s, ox, oy, 3 * s, 1);
      ctx.restore();
    }
    function S(p: { x: number; y: number }) {
      return { x: ox + s * p.x, y: oy + s * p.y };
    }
    if (t >= 0.7 && t < 2.3) {
      const f = ease(clamp((t - 1.5) / 0.7, 0, 1));
      let hp = S({ x: lerp(HUB.x, START.x, f), y: lerp(HUB.y, START.y, f) });
      if (t < 1.5) {
        const e1 = ease(clamp((t - 0.6) / 0.9, 0, 1));
        hp = { x: lerp(CORE.x, 974, e1), y: lerp(CORE.y, 352.8, e1) };
      }
      const grow = backOut(clamp((t - 0.6) / 0.3, 0, 1));
      dot(ctx, hp.x, hp.y, 26.6 * grow, oa(0.16));
      core(ctx, hp.x, hp.y, 11.2 * grow, 3);
    }
    const rp = clamp((t - 2.5) / 1.2, 0, 1), shown = Math.floor(rp * R4.length);
    for (let j = 0; j < shown; j++) {
      const q = S({ x: R4[j][0], y: R4[j][1] });
      dot(ctx, q.x, q.y, 3.6 * s, ORANGE);
    }
    if (rp > 0 && rp < 1) {
      const hd = S({ x: R4[Math.max(0, shown - 1)][0], y: R4[Math.max(0, shown - 1)][1] });
      dot(ctx, hd.x, hd.y, 18 * s, oa(0.18));
      dot(ctx, hd.x, hd.y, 6 * s, ORANGE);
    }
    const sa = clamp((t - 2.2) / 0.25, 0, 1);
    if (sa > 0) {
      const sp = S(START), g1 = backOut(sa);
      if (t < 2.7) dot(ctx, sp.x, sp.y, 30 * s * g1, oa(0.14 * (1 - clamp((t - 2.45) / 0.25, 0, 1))));
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 13 * s * g1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14,14,17,1)";
      ctx.fill();
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = ORANGE;
      ctx.stroke();
      dot(ctx, sp.x, sp.y, 5.5 * s * g1, ORANGE);
    }
    const pa = clamp((t - 2.35) / 0.25, 0, 1);
    if (pa > 0) {
      const fp = S(FINISH), g2 = backOut(pa);
      if (t < 2.85) dot(ctx, fp.x, fp.y, 30 * s * g2, oa(0.14 * (1 - clamp((t - 2.6) / 0.25, 0, 1))));
      pin_(ctx, fp.x, fp.y, s * g2, 1);
    }
    const va = clamp((t - 3.8) / 0.25, 0, 1);
    const vf = ease(clamp((t - 3.9) / 1.1, 0, 1)) * VI, vi = Math.floor(vf), fr = vf - vi;
    const a = R4[vi], b = R4[Math.min(vi + 1, R4.length - 1)], vp = S({ x: lerp(a[0], b[0], fr), y: lerp(a[1], b[1], fr) });
    [212, 286, 360].forEach((cy, i) => {
      const p = ease(clamp((t - 5.0 - 0.15 * i) / 0.2, 0, 1));
      if (p > 0) dotted(ctx, [[vp.x, vp.y], [lerp(vp.x, 1030, p), lerp(vp.y, cy, p)]], 2.5, 7, ORANGE);
    });
    if (va > 0) {
      const g3 = backOut(va);
      dot(ctx, vp.x, vp.y, 22 * g3, oa(0.18));
      const ph = pulse(now, 1.6);
      ring(ctx, vp.x, vp.y, 9 + ph * 40, ph, oa, 0.35);
      core(ctx, vp.x, vp.y, 9 * g3, 2.5);
    }
  };
}

// ---------- Scene 5 · Monitoring ----------
export function createScene5(ctx: CanvasRenderingContext2D, pat: Patterns): SceneRender {
  const V0 = 43, VF = 69, FOCUS = { x: 800, y: 524 }, M = { s: 0.85, ox: 391.2, oy: -5.8 };
  const SR: [number, number][] = [
    [558, 450], [594, 450], [630, 450], [648, 414], [684, 414], [720, 414], [738, 378], [774, 378], [810, 378],
    [828, 414], [846, 450], [882, 450], [918, 450], [954, 450], [972, 486], [1008, 486], [1044, 486], [1062, 450],
    [1098, 450], [1134, 450], [1170, 450], [1206, 450], [1242, 450], [1278, 450], [1314, 450], [1350, 450], [1386, 450], [1422, 450],
  ];
  const SV0 = 6, SV1 = 12, SRED = 15, P_ST = { x: 738, y: 378 }, S_ST = 4.5;
  function camera(t: number) {
    const e = ease(clamp((t - 1.5) / 1.0, 0, 1));
    if (e === 0) return { s: M.s, ox: M.ox, oy: M.oy, e: 0 };
    const s = M.s * Math.pow(S_ST / M.s, e);
    const P = { x: lerp(M.ox + M.s * FOCUS.x, P_ST.x, e), y: lerp(M.oy + M.s * FOCUS.y, P_ST.y, e) };
    return { s, ox: P.x - s * FOCUS.x, oy: P.y - s * FOCUS.y, e };
  }
  return function (t: number, now: number) {
    const cam = camera(t), s = cam.s, ox = cam.ox, oy = cam.oy, e = cam.e;
    const dim = ease(clamp((t - 1.0) / 0.4, 0, 1)), kc = ease(clamp((t - 2.5) / 0.4, 0, 1));
    if (t < 2.5) {
      fillPattern(ctx, pat.sea126, [s / 9, 0, 0, s / 9, ox, oy]);
      landDots(ctx, s, ox, oy, lerp(3 * M.s, 6.5, e), lerp(1, 0.7, dim));
    } else {
      const nx0 = Math.floor(-ox / s / 8) * 8 - 8, nx1 = Math.ceil((W - ox) / s / 8) * 8 + 8;
      const ny0 = Math.floor(-oy / s / 8) * 8 - 8, ny1 = Math.ceil((H - oy) / s / 8) * 8 + 8;
      for (let ny = ny0; ny <= ny1; ny += 8) {
        const row = ((ny - 148) / 8) % 2 === 0 ? 4 : 0;
        for (let nx = nx0 - (((nx0 - row) % 8) + 8) % 8; nx <= nx1; nx += 8) {
          const isL = !!landSet[nx * 10000 + ny];
          dot(ctx, ox + s * nx, oy + s * ny, lerp(isL ? 6.5 : 6.75, 5.5, kc), `rgba(${mix(isL ? [251, 251, 251] : [42, 42, 49], [42, 42, 49], kc).map((v) => v | 0).join(",")},${lerp(isL ? 0.7 : 1, 1, kc)})`);
        }
      }
      fadeLeft(ctx, 620, kc);
    }
    const vm = ease(clamp((t - 0.3) / 0.7, 0, 1)) * (VF - V0) + V0;
    const routeA = 1 - clamp((t - 2.5) / 0.4, 0, 1);
    if (routeA > 0) {
      const rr = lerp(3.6 * M.s, 7.5, e);
      for (let j = 0; j < R4.length; j++) dot(ctx, ox + s * R4[j][0], oy + s * R4[j][1], rr, oa(lerp(1, 0.5, dim) * routeA));
      const mk = (1 - e) * lerp(1, 0.5, dim);
      if (mk > 0.01) {
        const sp = { x: ox + s * START.x, y: oy + s * START.y };
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 13 * s, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(14,14,17,1)";
        ctx.fill();
        ctx.lineWidth = 4 * s;
        ctx.strokeStyle = oa(mk);
        ctx.stroke();
        pin_(ctx, ox + s * FINISH.x, oy + s * FINISH.y, s, mk);
      }
    }
    const sa = clamp((t - 2.6) / 0.4, 0, 1);
    const sv = SV0 + clamp((t - 4.4) / 1.2, 0, 1) * (SV1 - SV0), svi = Math.floor(sv);
    const redA = clamp((t - 3.7) / 0.3, 0, 1);
    if (sa > 0) for (let q = 0; q < SR.length; q++) {
      if (q === SRED && redA > 0) continue;
      const a = q <= svi ? (q < 3 ? [0.35, 0.55, 0.75][q] : 1) : q >= SR.length - 3 ? [0.25, 0.15, 0.08][q - (SR.length - 3)] : 0.35;
      dot(ctx, SR[q][0], SR[q][1], 7.5, oa(a * sa));
    }
    if (redA > 0) {
      const rx = SR[SRED][0], ry = SR[SRED][1], gr = backOut(redA);
      dot(ctx, rx, ry, 48 * gr, ra(0.1));
      dot(ctx, rx, ry, 28 * gr, ra(0.2));
      const rph = pulse(now, 1.2);
      ring(ctx, rx, ry, 14 + rph * 46, rph, ra, 0.45);
      ctx.beginPath();
      ctx.arc(rx, ry, 14 * gr, 0, Math.PI * 2);
      ctx.fillStyle = RED;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(14,14,17,1)";
      ctx.stroke();
      ctx.save();
      ctx.translate(rx, ry);
      ctx.scale(gr, gr);
      ctx.beginPath();
      ctx.moveTo(0, -6.7);
      ctx.lineTo(6, 4.3);
      ctx.lineTo(-6, 4.3);
      ctx.closePath();
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.restore();
      const lc = clamp((t - 5.35) / 0.15, 0, 1);
      if (lc > 0) dotted(ctx, [[rx, 506], [rx, lerp(506, 538, lc)]], 2.5, 7, RED);
    }
    let vx: number, vy: number, vr: number, vh: number, vo: number;
    if (t < 2.6) {
      const vi = Math.floor(vm), fr = vm - vi, pa = R4[vi], pb = R4[Math.min(vi + 1, R4.length - 1)];
      vx = ox + s * lerp(pa[0], pb[0], fr);
      vy = oy + s * lerp(pa[1], pb[1], fr);
      vr = lerp(9, 13, e);
      vh = lerp(22, 32, e);
      vo = e;
    } else {
      const hi = Math.min(Math.floor(sv), SR.length - 2), hf = ease(sv - hi);
      vx = lerp(SR[hi][0], SR[hi + 1][0], hf);
      vy = lerp(SR[hi][1], SR[hi + 1][1], hf);
      if (sv >= SV1) {
        vx = SR[SV1][0];
        vy = SR[SV1][1];
      }
      vr = 13;
      vh = 32;
      vo = sv >= SV1 ? 0 : 1;
    }
    [212, 286, 360].forEach((cy, k) => {
      const p = ease(clamp((t - 5.9 - 0.15 * k) / 0.2, 0, 1));
      if (p > 0) dotted(ctx, [[vx, vy], [lerp(vx, 1030, p), lerp(vy, cy, p)]], 2.5, 7, ORANGE);
    });
    if (vo > 0) dot(ctx, vx, vy, 56, oa(0.08 * vo));
    dot(ctx, vx, vy, vh, oa(0.16));
    const ph = pulse(now, 1.6);
    ring(ctx, vx, vy, vr + ph * 50, ph, oa, 0.35);
    core(ctx, vx, vy, vr, 2.5);
    const lk = clamp((t - 1.0) / 0.4, 0, 1), rel = 1 - e;
    if (lk > 0 && rel > 0) brackets(ctx, vx, vy, 30 * lerp(1.4, 1, backOut(lk)) * (1 + 2 * e), 16 * (1 + 2 * e), Math.min(1, lk * 2) * rel);
  };
}
