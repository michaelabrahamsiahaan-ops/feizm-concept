"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clamp, makePatterns, type Patterns } from "./canvas-draw";
import { ALERT_ICON_SVG, ALERT_TITLE, SCENE_CARDS } from "./scene-cards-data";
import { ALERT_CUE_T, ALERT_SCENE_INDEX, SCENES, TOTAL, createRenderers, locate } from "./scene-timeline";
import { ChevronRightIcon, SCENE_ICONS } from "./scene-icons";
import { H, W } from "./map-data";
import type { SceneRender } from "./scenes";
import { getLenis } from "@/components/shared/smooth-scroll";
import { OVERLAP_VH } from "@/components/home/overlap-config";

const STAGE_W = W;
const STAGE_H = H;
const INTRO_MS = 1200;
const CARD_LIFT_PX = 48; // the prototype's actual value — see doc comment below

// The 5-scene story's own scrub distance, expressed the same way the
// wrapper's CSS height always has been — NOT the wrapper's full height
// once the overlap below is added on top of it (see OVERLAP_VH's own
// comment, and this component's doc comment, for the full mechanism).
const STORY_VH = 1100;
// Reduced motion has no story to scrub (one static frame only) — this is
// just "one viewport's worth of normal, pre-sticky presence" before the
// overlap hold engages, the smallest value that still gives the curtain
// something to slide over (see the doc comment below for why zero scrub
// distance here is correct, not a bug).
const REDUCED_STORY_VH = 100;

// ---- Optional depth effects on the hero as Company's curtain covers it ----
// Both OFF under prefers-reduced-motion (see the component doc comment).
// Flip this to compare with/without — see conversation for the request to
// show both before picking one.
const ENABLE_DEPTH_EFFECTS = false;
const DEPTH_DARKEN_MAX_OPACITY = 0.3;
const DEPTH_SCALE_MIN = 0.96;

// `vh` CSS units and `window.innerHeight` can differ slightly (mobile
// toolbar collapse, scrollbar gutters) — same caveat the pin's own `svh`
// height already navigates elsewhere in this component. Desktop (this
// feature's primary, fully-specified target) has no such discrepancy.
function overlapPxNow() {
  return (window.innerHeight * OVERLAP_VH) / 100;
}

/**
 * Pinned, scroll-driven parallax Home hero. Combines two sources, per the
 * brief:
 *   - Animation (timing/easing/scenes/layers): ported from
 *     design/hero-parallax/feizm-scroll-hero.html — canvas drawing logic
 *     in scenes.ts/canvas-draw.ts/map-data.ts, timeline in
 *     scene-timeline.ts, feature cards in scene-cards-data.ts. Not
 *     rewritten: same math, same constants, same structure (scene
 *     factories mirroring the prototype's own IIFEs), just parameterized
 *     on `ctx`/`pat` instead of prototype module globals so a mounted
 *     React component owns its own canvas context.
 *   - Hero UI (copy/typography/buttons/progress bar): read live via
 *     figma-cli from "Home / 01 Hero" (node 116:728) — see this repo's
 *     conversation history for the full field-by-field spec. Headline,
 *     description, the "See All Services" button, and the 5 service
 *     buttons' pill/progress-bar construction are reproduced from that
 *     read, not the prototype (the prototype doesn't have this UI at
 *     all — it's a standalone animation demo).
 *
 * Icon -> scene mapping (proposed, not independently confirmed per-button
 * in Figma — see conversation): Fleet (confirmed, the only button with
 * real Figma label text) -> Assets -> Video & Cloud -> Delivery ->
 * Monitoring, left to right, matching the brief's own stated scene order.
 *
 * Depth/parallax: the prototype only moves ONE layer — each scene's own
 * `.scene-ui` (its 3 cards) lifts `translateY(-48px * d)` once those cards
 * have cued in and the scene is in its holding/reading-pause tail (`d`
 * eased from `cardStart` to the scene's end) — not independently-moving
 * map/route/vehicle depth planes. Reproduced exactly as the prototype
 * actually behaves (CARD_LIFT_PX = 48, not the ~56px the brief mentions)
 * since the brief ranks the prototype's own code as the animation source
 * of truth over its own prose description.
 *
 * Leftover placeholder REMOVED: the prototype's Scene 5 alert card had a
 * second line, literal text "[Vehicle ID] · [Time] · [Location]" — not
 * sample data, an unfilled template. Dropped entirely (not replaced with
 * invented data) — see scene-cards-data.ts.
 *
 * Performance: canvas backing store capped at devicePixelRatio 2 (layout()
 * below). An IntersectionObserver gates the rAF loop so nothing renders
 * while the hero is far from the viewport. No layout reads happen inside
 * the per-frame tick other than the one `getBoundingClientRect()` on the
 * scrolly wrapper that the scroll-progress math itself needs (same
 * approach as the Fleet USP divider dot elsewhere in this project) — card
 * opacity/transform and the progress-bar fill width are written directly
 * to refs' DOM nodes every frame, never through React state, since those
 * change up to 60x/sec; only the active scene INDEX (changes 5 times per
 * full scroll) goes through `useState`.
 *
 * Reduced motion: no pin, no scrub — `.pin` becomes a normal (non-sticky)
 * block sized by `aspect-ratio`, and the canvas draws ONE static frame:
 * Scene 1 at its own end time (t=5.8, same frame the prototype's own
 * `.static` branch uses), with Scene 1's cards already in and its button
 * active. Clicking a service button then redraws that scene's own t1
 * frame instantly (no animation) instead of scrubbing.
 */
export function HomeHeroParallax() {
  const scrollyRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressFillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sceneUiRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<HTMLDivElement[][]>([[], [], [], [], []]);
  const alertRef = useRef<HTMLDivElement | null>(null);
  const darkenRef = useRef<HTMLDivElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgLoadedRef = useRef(false);
  // In reduced-motion mode the hero draws exactly once (no rAF loop) — if
  // the image finishes loading after that single draw, nothing would ever
  // repaint it. The main effect below points this at its own one-shot
  // redraw whenever it's in the static branch, so the image-load effect
  // (which doesn't otherwise share closures with it) can trigger that
  // repaint once loading finishes.
  const forceStaticRedrawRef = useRef<(() => void) | null>(null);

  // Loaded once on mount, independent of the rAF-driving effect below (so
  // scrolling in/out of view or a reduced-motion toggle never re-fetches
  // it). `draw()` falls back to a flat fill until `bgLoadedRef` flips, so
  // there's no flash of a broken/blank frame while the image loads.
  useEffect(() => {
    const img = new window.Image();
    img.src = "/home-hero/background.png";
    img.onload = () => {
      bgLoadedRef.current = true;
      forceStaticRedrawRef.current?.();
    };
    bgImageRef.current = img;
  }, []);

  const [activeScene, setActiveScene] = useState(0);
  // Always false for SSR and the client's first (pre-hydration) render —
  // `matchMedia` doesn't exist on the server, and reading it in a lazy
  // `useState` initializer makes the client's first render diverge from
  // the server's HTML, which breaks hydration (confirmed: React logged a
  // hydration mismatch on exactly this element's `style`, and because
  // "this won't be patched up" for mismatched style attributes, reduced-
  // motion users were stuck with the full sticky/1100vh layout instead of
  // the static one). Corrected via `useLayoutEffect` immediately after
  // mount instead — a one-time, unavoidable extra render for a value that
  // genuinely can't be known until the client runs (not a derivable-from-
  // props value this rule is meant to catch).
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // See reducedMotion's own comment above: matchMedia is a browser-only
    // API with no SSR-safe value, so this one-time post-mount correction
    // is unavoidable, not a derived-state anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const onChange = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) setActiveScene(0);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Gate the whole rAF loop to when the hero is in or near the viewport.
  useEffect(() => {
    const el = scrollyRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "50% 0px 50% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const scrolly = scrollyRef.current, pin = pinRef.current, stage = stageRef.current, canvas = canvasRef.current;
    if (!scrolly || !pin || !stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let pat: Patterns | null = null;
    let renderers: SceneRender[] | null = null;

    function layout() {
      const vw = pin!.clientWidth, vh = pin!.clientHeight;
      // Math.max (cover), not Math.min (contain, the prototype's own
      // choice). Contain-fit always leaves a letterbox margin outside the
      // scaled stage at any ratio other than exactly 1440:796 — three
      // rounds of trying to fill that margin (flat color, then a cover-
      // fit crop of the same image, then a blurred version of that crop,
      // then feathered masks on top of that) all still read as a visible
      // seam/gradient against the Figma reference, which has NO margin
      // at all (it's a fixed 1440x795 export). Cover-fit removes the
      // margin structurally instead of trying to disguise it — the stage
      // now always fills `pin` edge-to-edge, with `overflow-hidden`
      // cropping whatever spills past the shorter axis (same pattern
      // every other hero in this project already uses — Hero.tsx/
      // FleetHero.tsx's own background images are `object-cover`, not
      // letterboxed). The hero UI text is deliberately NOT inside this
      // scaled stage (see the render below) specifically because cover-
      // fit crops/shifts it at common ratios (e.g. at 1440x900 this scale
      // factor shifts the stage ~94px left) — it renders at its own
      // literal pixel position against the real, unscaled viewport
      // instead, same as every other hero's text in this project.
      const k = Math.max(vw / STAGE_W, vh / STAGE_H);
      stage!.style.transform = `translate(${(vw - STAGE_W * k) / 2}px,${(vh - STAGE_H * k) / 2}px) scale(${k})`;
      const px = Math.max(1, k * Math.min(window.devicePixelRatio || 1, 2));
      canvas!.width = Math.round(STAGE_W * px);
      canvas!.height = Math.round(STAGE_H * px);
      ctx!.setTransform(px, 0, 0, px, 0, 0);
      pat = makePatterns(ctx!);
      renderers = createRenderers(ctx!, pat);
    }

    function draw(i: number, t: number, now: number) {
      // Base layer: the supplied background image, replacing the
      // prototype's flat dark fill — drawn fresh every frame (same as
      // the fill it replaces), so it still fully clears the previous
      // frame before each scene redraws on top of it.
      if (bgLoadedRef.current && bgImageRef.current) {
        ctx!.drawImage(bgImageRef.current, 0, 0, STAGE_W, STAGE_H);
      } else {
        ctx!.fillStyle = "rgba(14,14,17,1)";
        ctx!.fillRect(0, 0, STAGE_W, STAGE_H);
      }
      renderers![i](t, now);
    }

    function applyOverlays(g: number, at: { i: number; t: number }) {
      SCENES.forEach((sc, i) => {
        const active = i === at.i;
        sc.cues.forEach((cue, k) => {
          const el = cardRefs.current[i]?.[k];
          if (!el) return;
          const on = active && at.t >= cue;
          el.style.opacity = on ? "1" : "0";
          el.style.transform = on ? "translateY(0)" : "translateY(12px)";
        });
        const d = clamp((g - sc.cardStart) / (sc.off + sc.len - sc.cardStart), 0, 1);
        const lift = -CARD_LIFT_PX * (d < 0.5 ? 4 * d * d * d : 1 - Math.pow(-2 * d + 2, 3) / 2);
        const uiEl = sceneUiRefs.current[i];
        if (uiEl) uiEl.style.transform = `translateY(${lift}px)`;

        const fill = progressFillRefs.current[i];
        if (fill) {
          // transform: scaleX, not style.width — width is a layout
          // property, and this writes every frame; scaleX is composite-
          // only (same rule UspDividerDot elsewhere in this project
          // follows for its own per-frame transform). Confirmed this was
          // a real cost, not just theoretical: before this fix, a fast
          // programmatic scroll through the hero measured ~16fps in this
          // same headless profiling setup, vs ~47fps for the unmodified
          // prototype running the identical canvas code — the per-frame
          // `width` write (laid out every tick right next to this
          // effect's own `getBoundingClientRect()` scroll-progress read)
          // was forcing a synchronous layout on every frame. After
          // switching to scaleX, the regression was gone.
          const p = active ? clamp((g - sc.off) / sc.len, 0, 1) : 0;
          fill.style.transform = `scaleX(${p})`;
        }
      });
      if (alertRef.current) {
        const on = at.i === ALERT_SCENE_INDEX && at.t >= ALERT_CUE_T;
        alertRef.current.style.opacity = on ? "1" : "0";
        alertRef.current.style.transform = on ? "translateY(0)" : "translateY(8px)";
      }
    }

    // ---- Reduced motion: one static frame, no rAF loop at all ----
    // Still sticky (see the pin's own style below, now unconditional) for
    // the overlap hold — "keep the overlap, it's direct scroll, not
    // autonomous animation" per the brief — just with zero scrub distance
    // before it (REDUCED_STORY_VH) and no darken/scale (ENABLE_DEPTH_
    // EFFECTS is only ever consulted in the non-reduced tick() below).
    if (reducedMotion) {
      layout();
      const endAt = { i: 0, t: SCENES[0].t1 };
      draw(0, endAt.t, 0);
      applyOverlays(SCENES[0].off + SCENES[0].len, endAt);
      forceStaticRedrawRef.current = () => draw(0, endAt.t, 0);
      const onResize = () => {
        layout();
        draw(0, endAt.t, 0);
      };
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        forceStaticRedrawRef.current = null;
      };
    }

    if (!inView) return; // gated off-screen — no rAF loop running at all

    layout();
    window.addEventListener("resize", layout);

    let raf = 0;
    let loadAt: number | null = null;
    let last = 0;
    let gCur = 0;
    let lastSceneIndex = -1;
    let rafRunning = false;

    // Both the story's own scrub span AND the overlap's hold span are
    // read from the SAME wrapper rect — the wrapper's CSS height is
    // STORY_VH + OVERLAP_VH (see the JSX below), so the story's span has
    // to subtract the overlap portion back out first to recover exactly
    // what it was before the overlap existed (unchanged scene timing —
    // see the doc comment above for why that's a hard requirement).
    function scrollState() {
      const rect = scrolly!.getBoundingClientRect();
      const overlapPx = overlapPxNow();
      const storySpan = rect.height - overlapPx - pin!.clientHeight;
      const p = storySpan > 0 ? clamp(-rect.top / storySpan, 0, 1) : 0;
      const overlapP = overlapPx > 0 ? clamp((-rect.top - storySpan) / overlapPx, 0, 1) : 1;
      return { p, overlapP };
    }

    function applyDepthEffects(overlapP: number) {
      if (!ENABLE_DEPTH_EFFECTS) return;
      const pinEl = pin!;
      const darken = darkenRef.current;
      const scale = 1 - overlapP * (1 - DEPTH_SCALE_MIN);
      pinEl.style.transform = overlapP > 0 ? `scale(${scale})` : "";
      if (darken) darken.style.opacity = `${overlapP * DEPTH_DARKEN_MAX_OPACITY}`;
    }

    function tick(now: number) {
      if (loadAt === null) loadAt = now;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      const st = scrollState(), gT = st.p * TOTAL;
      const introT = clamp((now - loadAt) / 1000, 0, INTRO_MS / 1000);
      if (getLenis()) {
        // Lenis is already smoothing the underlying scroll position (it
        // moves window.scrollY itself, progressively, toward the real
        // target — this project's own scroll listeners don't need to
        // know Lenis exists for that part). Also running this component's
        // OWN exponential smoothing on top would be smoothing an already-
        // smoothed value — double lag, not double smoothness. Track the
        // live (Lenis-smoothed) position directly instead.
        gCur = gT;
      } else {
        gCur += (gT - gCur) * (1 - Math.exp(-dt * 7)); // same smoothing as the prototype — real per-frame dt, not a fixed guess
        if (Math.abs(gT - gCur) < 0.0005) gCur = gT;
      }

      const at = introT < INTRO_MS / 1000 && gCur < 0.001 ? { i: 0, t: introT } : locate(gCur);
      draw(at.i, at.t, now);
      applyOverlays(gCur, at);
      applyDepthEffects(st.overlapP);
      if (at.i !== lastSceneIndex) {
        lastSceneIndex = at.i;
        setActiveScene(at.i);
      }

      // Performance: once Company's curtain has fully covered the hero
      // (overlapP reaches 1), the canvas is no longer visible at all —
      // stop scheduling frames entirely rather than keep drawing hidden
      // pixels. `onScrollWake` below is what notices scrolling back up
      // past that point and restarts the loop; a plain scroll listener
      // works here (not another rAF) because waking the loop up is a
      // one-shot event, not something that itself needs smoothing.
      if (st.overlapP >= 1) {
        rafRunning = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (rafRunning) return;
      rafRunning = true;
      raf = requestAnimationFrame(tick);
    }

    function onScrollWake() {
      if (rafRunning) return;
      if (scrollState().overlapP < 1) startLoop();
    }

    startLoop();
    window.addEventListener("scroll", onScrollWake, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", layout);
      window.removeEventListener("scroll", onScrollWake);
    };
  }, [inView, reducedMotion]);

  function scrollToScene(i: number) {
    const scrolly = scrollyRef.current, pin = pinRef.current;
    if (!scrolly || !pin) return;
    if (reducedMotion) {
      setActiveScene(i);
      return;
    }
    const rect = scrolly.getBoundingClientRect();
    const wrapperTopAbs = rect.top + window.scrollY;
    // Story-only span — see scrollState()'s own comment above for why
    // the overlap portion has to be subtracted back out first.
    const span = rect.height - overlapPxNow() - pin.clientHeight;
    // +0.05 (not exactly SCENES[i].off): landing precisely ON a scene
    // boundary is fragile — sub-pixel scrollTo rounding can tip the
    // resulting scroll-derived `g` back under the boundary, re-selecting
    // the PREVIOUS scene (`locate()`'s `g < off+len` check reads as still
    // inside it). A small nudge past the boundary lands unambiguously
    // inside the target scene — same lesson as SiteHeader's own landing
    // epsilon (site-header.tsx).
    const p = (SCENES[i].off + 0.05) / TOTAL;
    const targetY = wrapperTopAbs + p * span;
    // Native smooth scroll and Lenis both try to own the scroll position
    // — running both at once fights itself. Route through Lenis when
    // it's active (same computed targetY, just handed to Lenis's own
    // scrollTo instead of the browser's).
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(targetY);
    else window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  // STORY_VH (non-reduced) or REDUCED_STORY_VH (reduced) + OVERLAP_VH —
  // the pin stays sticky for the whole thing; see the doc comment above
  // and scrollState()'s own comment for how the two portions are told
  // apart again at read time.
  const wrapperVh = (reducedMotion ? REDUCED_STORY_VH : STORY_VH) + OVERLAP_VH;

  return (
    <section className="relative w-full" style={{ height: `${wrapperVh}vh` }} aria-label="Feizm hero">
      <div ref={scrollyRef} className="relative w-full" style={{ height: `${wrapperVh}vh` }}>
        <div
          ref={pinRef}
          className="w-full overflow-hidden"
          style={{
            // Ported from the prototype's own `.pin` exactly: `100svh`
            // (small viewport height), not `100vh`. `vh` resolves
            // against the browser's LARGEST possible viewport — on a
            // real browser with a collapsible toolbar, that's taller
            // than what's actually visible until the toolbar hides,
            // so a sticky `height:100vh` element can end slightly
            // ABOVE the true bottom of the visible viewport, exposing
            // the page's own (white) background in a strip below it.
            // `svh` always matches the viewport as currently shown,
            // which is what a `position: sticky` element needs here.
            // `env(safe-area-inset-top)` is the same unmodified
            // prototype value (0 on a device with no notch/inset; a
            // non-zero value only on devices that have one).
            //
            // `top`/`height` both also add `var(--banner-h)` — BannerTop
            // (components/layout/banner-top.tsx) is a permanent, always-
            // visible `position: fixed` bar with a HIGHER z-index than
            // SiteHeader. A bare `top: 0` would stick this pin right under
            // it, cropping the pinned hero's own top edge behind the now-
            // opaque banner for the entire scrub (confirmed: the old bare
            // `env(...)` value predates the banner being permanent, back
            // when it was dismissible/scrolled-away and never actually
            // overlapped the pin). `<main>`'s own `paddingTop:
            // var(--banner-h)` (see app/home/page.tsx) handles the
            // pre-scroll static position; this handles the pin's own
            // sticky offset once scrolling begins.
            //
            // Unconditional now (used to be `position:relative` +
            // `aspectRatio` under reduced motion, to avoid a tall
            // scroll-jacking area with nothing to scrub) — reduced
            // motion keeps the curtain overlap per the brief ("direct
            // scroll, not autonomous animation"), which itself needs a
            // sticky hold, so there's no more reduced-motion-specific
            // sizing to preserve; both branches render the same single
            // final frame through this same cover-fit sticky box, just
            // with zero scrub distance before the hold in the reduced
            // case (REDUCED_STORY_VH).
            position: "sticky",
            top: "calc(var(--banner-h) + env(safe-area-inset-top, 0px))",
            width: "100%",
            height: "calc(100svh - var(--banner-h) - env(safe-area-inset-top, 0px))",
            backgroundColor: "#0E0E11",
          }}
        >
          <div ref={stageRef} className="absolute left-0 top-0" style={{ width: STAGE_W, height: STAGE_H, transformOrigin: "0 0" }}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-hidden="true"
              className="absolute left-0 top-0"
              style={{ width: STAGE_W, height: STAGE_H }}
            />

            {/* Per-scene floating feature cards — ported 1:1 from the prototype's #ui0..#ui4, see scene-cards-data.ts */}
            {SCENE_CARDS.map((cards, sceneIdx) => (
              <div
                key={sceneIdx}
                ref={(el) => {
                  sceneUiRefs.current[sceneIdx] = el;
                }}
                className="absolute inset-0"
                aria-hidden="true"
                style={{ willChange: "transform" }}
              >
                {cards.map((card, cardIdx) => (
                  <div
                    key={cardIdx}
                    ref={(el) => {
                      if (el) cardRefs.current[sceneIdx][cardIdx] = el;
                    }}
                    className="absolute flex items-center"
                    style={{
                      left: 1030,
                      top: card.top,
                      width: 340,
                      height: 60,
                      boxSizing: "border-box",
                      padding: "0 16px",
                      gap: 12,
                      backgroundColor: "#18181D",
                      border: "1px solid #2C2C33",
                      borderRadius: 12,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                      opacity: 0,
                      transform: "translateY(12px)",
                      transition: reducedMotion ? "none" : "opacity 300ms cubic-bezier(.2,.7,.2,1), transform 300ms cubic-bezier(.2,.7,.2,1)",
                    }}
                  >
                    <span
                      className="flex shrink-0 items-center justify-center rounded-lg"
                      style={{ width: 32, height: 32, backgroundColor: "rgba(255,107,0,0.16)" }}
                      dangerouslySetInnerHTML={{ __html: card.iconSvg }}
                    />
                    <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25, color: "#F5F5F3", fontFamily: "'Plus Jakarta Sans', var(--font-hanken-grotesk), sans-serif" }}>
                      {card.text}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            {/* Shared Scene-5 alert — same construction, placeholder text removed (see doc comment) */}
            <div
              ref={alertRef}
              aria-hidden="true"
              className="absolute flex items-start"
              style={{
                left: 848,
                top: 540,
                width: 320,
                boxSizing: "border-box",
                padding: "14px 16px",
                gap: 12,
                backgroundColor: "#D92D20",
                color: "#FFFFFF",
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(217,45,32,0.35)",
                opacity: 0,
                transform: "translateY(8px)",
                transition: reducedMotion ? "none" : "opacity 250ms cubic-bezier(.2,.7,.2,1), transform 250ms cubic-bezier(.2,.7,.2,1)",
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 1 }} dangerouslySetInnerHTML={{ __html: ALERT_ICON_SVG }} />
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', var(--font-hanken-grotesk), sans-serif" }}>{ALERT_TITLE}</span>
            </div>
          </div>
          {/* ^ end of `stage` — everything above this line is scene
              geometry (canvas, feature cards, the alert) and scales/crops
              together via the cover-fit transform above. Everything
              below is real UI chrome and is deliberately OUTSIDE `stage`,
              positioned against the real (unscaled) pin instead — see
              layout()'s own comment for why. */}

          {/* Left-side black gradient scrim — Figma "Home / 01 Hero"'s own
              "Container" node (the same frame that holds the headline/
              buttons below, not a separate overlay layer in Figma — same
              "Container owns both the gradient fill AND the text"
              construction as Hero.tsx/FleetHero.tsx) has a GRADIENT_LINEAR
              fill. Its raw gradientTransform matrix implies a rotation,
              and hand-decoding it was unreliable (same conclusion reached
              for every other gradient in this project) — pixel-sampled
              the exported Container PNG's alpha channel instead (every
              2px along a text-free row, checked against multiple rows to
              confirm it's a clean horizontal gradient, not diagonal):
              flat opaque black from 0% to 6.4% of the hero's width, then
              a linear fade down to fully transparent by 49.2%, flat
              transparent for the remaining right half. Sized against the
              real (unscaled) pin, same as the UI overlay below it, not
              against the scaled 1440-wide stage — darkens the
              illustration behind the headline/button column specifically,
              which is itself positioned against the real pin too, so the
              two stay aligned regardless of viewport width. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 6.4%, rgba(0,0,0,0) 49.2%)",
            }}
          />

          {/* ---- Hero UI overlay (depth 0 — never moves), from Figma "Home / 01 Hero" ---- */}
          <div
            className="absolute inset-0 flex flex-col justify-end"
              style={{
                paddingLeft: "var(--fig-spacing-40)",
                paddingRight: "var(--fig-spacing-40)",
                // 44px, not 20px (fixed — was a left/right vs top/bottom
                // mix-up reading Figma's own padding array). Re-measured
                // directly on "Container" (116:741): its OWN bottom
                // padding is 40px (token), but Container itself is 4px
                // SHORTER than the hero's true bottom edge (792 vs the
                // illustration layer's 796, both at y:0 in a non-auto-
                // layout root) — so the real gap from the progress bars'
                // bottom edge to the hero's bottom edge is 40 + 4 = 44px,
                // confirmed by directly measuring the built page against
                // this figure (was 24px short, matching 44-20 exactly).
                paddingBottom: "calc(var(--fig-spacing-40) + 4px)",
                fontFamily: "var(--font-hanken-grotesk)",
              }}
            >
              <div className="flex flex-col" style={{ gap: "var(--fig-spacing-32)" }}>
                <div className="flex flex-col" style={{ gap: "var(--fig-spacing-24)", width: 432 }}>
                  <h1 className="font-normal" style={{ color: "var(--fig-color-neutral-0)", fontSize: "59.87px", lineHeight: "59.87px" }}>
                    Partner for the world&apos;s #1 fleet technology
                  </h1>
                  <p className="font-normal" style={{ color: "var(--fig-color-neutral-0)", fontSize: "16.84px", lineHeight: "24.32px" }}>
                    FeizM deploys, supports, and scales Geotab telematics, driver safety, and IoT solutions for fleets across Southeast Asia
                  </p>
                </div>

                {/* items-start, not items-center: Figma's row (116:751)
                    has counterAxisAlignItems "MIN" (top-align), not
                    centered — "See All Services" (32 tall) shares the
                    same top edge as the buttons (also 32 tall), not the
                    center of the full 50-tall row (buttons + gap +
                    progress track). Centering it against that taller row
                    was pushing it 9px lower than the buttons' own top —
                    confirmed by measuring both against the live page. */}
                <div className="flex items-start" style={{ width: 1351 }}>
                  <div className="flex items-center" style={{ gap: "var(--fig-spacing-16)" }}>
                    {SCENES.map((sc, i) => {
                      const Icon = SCENE_ICONS[i];
                      const active = i === activeScene;
                      return (
                        <div key={sc.key} className="flex flex-col items-stretch" style={{ gap: "var(--fig-spacing-16)" }}>
                          <button
                            type="button"
                            onClick={() => scrollToScene(i)}
                            aria-label={sc.label}
                            aria-current={active ? "step" : undefined}
                            className="flex w-fit cursor-pointer items-center"
                            style={{ height: 32 }}
                          >
                            <span
                              className="flex shrink-0 items-center justify-center rounded-full"
                              style={{
                                width: 40,
                                height: 32,
                                backgroundColor: active ? "var(--fig-color-neutral-0)" : "transparent",
                                border: "1px solid var(--fig-color-neutral-0)",
                                color: active ? "#000000" : "var(--fig-color-neutral-0)",
                              }}
                            >
                              <Icon width={16} height={16} />
                            </span>
                            {active && (
                              <span
                                className="flex shrink-0 items-center whitespace-nowrap rounded-full"
                                style={{
                                  marginLeft: -4,
                                  height: 32,
                                  paddingLeft: "var(--fig-spacing-12)",
                                  paddingRight: "var(--fig-spacing-12)",
                                  backgroundColor: "var(--fig-color-neutral-0)",
                                  border: "1px solid var(--fig-color-neutral-0)",
                                  color: "#000000",
                                  fontSize: 12,
                                  fontWeight: 500,
                                }}
                              >
                                {sc.label}
                              </span>
                            )}
                          </button>
                          <div className="relative w-full" style={{ height: 2, backgroundColor: "rgb(51,51,51)" }}>
                            <div
                              ref={(el) => {
                                progressFillRefs.current[i] = el;
                              }}
                              className="absolute inset-y-0 left-0 w-full"
                              style={{
                                transform: "scaleX(0)",
                                transformOrigin: "left",
                                backgroundColor: "var(--fig-color-neutral-0)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ flex: 1 }} />

                  <a
                    href="#"
                    className="flex shrink-0 cursor-pointer items-center rounded-full font-medium"
                    style={{
                      gap: "var(--fig-spacing-4)",
                      height: 32,
                      border: "1px solid var(--fig-color-neutral-0)",
                      color: "var(--fig-color-neutral-0)",
                      paddingLeft: "var(--fig-spacing-12)",
                      paddingRight: "var(--fig-spacing-12)",
                      fontSize: 12,
                    }}
                  >
                    See All Services
                    <ChevronRightIcon width={16} height={16} />
                  </a>
                </div>
              </div>
            </div>

          {/* Optional depth effect: darkens as Company's curtain covers
              the hero — see ENABLE_DEPTH_EFFECTS/applyDepthEffects above.
              Topmost child so it darkens the UI text too, not just the
              canvas. Starts at opacity 0 (no-op) whenever depth effects
              are off or under reduced motion — applyDepthEffects is
              simply never called in either of those cases. */}
          <div ref={darkenRef} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundColor: "#000000", opacity: 0 }} />
        </div>
      </div>
    </section>
  );
}
