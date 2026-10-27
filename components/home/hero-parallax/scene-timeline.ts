/**
 * Ported from the prototype's "Story timeline: scroll -> scene + local
 * time" section. Same t0/t1/hold/cues numbers, same `off`/`len`/`TOTAL`
 * accumulation and the same `locate()` function — the prototype toggled
 * DOM classes directly in `overlays()`; here that becomes plain data the
 * React hook reads each tick instead (see use-hero-parallax.ts).
 */
import { clamp } from "./canvas-draw";
import { createScene1, createScene2, createScene3, createScene4, createScene5, type SceneRender } from "./scenes";
import type { Patterns } from "./canvas-draw";

export interface SceneDef {
  key: string;
  label: string;
  t0: number;
  t1: number;
  hold: number;
  /** Local-time cues (within [t0,t1]) at which each of this scene's 3 feature cards cues in. */
  cues: [number, number, number];
  off: number;
  len: number;
  /** Global progress (g) at which this scene's cards start — used for the card-layer parallax lift. */
  cardStart: number;
}

const RAW: Omit<SceneDef, "off" | "len" | "cardStart">[] = [
  { key: "fleet", label: "Fleet Management", t0: 1.2, t1: 5.8, hold: 1.2, cues: [5.25, 5.4, 5.55] },
  { key: "assets", label: "Assets", t0: 0, t1: 5.9, hold: 1.2, cues: [5.45, 5.6, 5.75] },
  { key: "video-cloud", label: "Video & Cloud", t0: 0, t1: 6.1, hold: 1.2, cues: [5.65, 5.8, 5.95] },
  { key: "delivery", label: "Delivery", t0: 0, t1: 5.7, hold: 1.2, cues: [5.15, 5.3, 5.45] },
  { key: "monitoring", label: "Monitoring", t0: 0, t1: 6.7, hold: 1.6, cues: [6.05, 6.2, 6.35] },
];

export const SCENES: SceneDef[] = (() => {
  let total = 0;
  return RAW.map((sc) => {
    const off = total;
    const len = sc.t1 - sc.t0 + sc.hold;
    total += len;
    return { ...sc, off, len, cardStart: off + (sc.cues[0] - sc.t0) };
  });
})();

export const TOTAL = SCENES.reduce((sum, sc) => sum + sc.len, 0);

/** Scene 5's "harsh braking" alert cues in at this global progress value (t=5.45 within scene 5, i===4). */
export const ALERT_SCENE_INDEX = 4;
export const ALERT_CUE_T = 5.45;

export function locate(g: number): { i: number; t: number } {
  let i = 0;
  for (; i < SCENES.length - 1; i++) if (g < SCENES[i].off + SCENES[i].len) break;
  const sc = SCENES[i];
  return { i, t: sc.t0 + clamp(g - sc.off, 0, sc.t1 - sc.t0) };
}

export function createRenderers(ctx: CanvasRenderingContext2D, pat: Patterns): SceneRender[] {
  return [
    createScene1(ctx, pat),
    createScene2(ctx, pat),
    createScene3(ctx, pat),
    createScene4(ctx, pat),
    createScene5(ctx, pat),
  ];
}
