"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Building, CalendarFold, Earth, Truck } from "lucide-react";
import type { ComponentType } from "react";
import { HalftoneGlobeWidget } from "@/components/HalftoneGlobeWidget";

// ---- Card: fluid, fits the viewport under the header ----
// Figma's own section padding (40px sides / 60px top+bottom at its 1440
// reference width) re-expressed as fluid clamps so the card scales with
// any monitor instead of staying a fixed 1440px box. SIDE_INSET's clamp
// is exactly as specified (40/1440 = 2.8vw); VERTICAL_INSET extrapolates
// the same ratio-of-min/max-to-preferred shape from Figma's 60px value
// (60/1440 = 4.17vw, with min/max scaled by the same 40%/160% ratio
// SIDE_INSET's own 16px/64px bounds use relative to its own 40px
// preferred value) — the brief only specified the side formula
// explicitly, so this is the most consistent extrapolation for the
// unspecified top/bottom one, not a separate arbitrary guess.
const SIDE_INSET = "clamp(16px, 2.8vw, 64px)";
// Numeric (not a CSS string) because the short-screen fallback below
// needs to compute with it in JS (reduce it, or decide not to pin at
// all) — VERTICAL_INSET_* mirrors this as plain CSS for the normal case.
const VERTICAL_INSET_MIN_PX = 24;
const VERTICAL_INSET_PREFERRED_VW = 4.17;
const VERTICAL_INSET_MAX_PX = 96;
const VERTICAL_INSET = `clamp(${VERTICAL_INSET_MIN_PX}px, ${VERTICAL_INSET_PREFERRED_VW}vw, ${VERTICAL_INSET_MAX_PX}px)`;
const CARD_MAX_WIDTH_PX = 1600;
const CARD_MIN_HEIGHT_PX = 560;
const CARD_BG = "#FBFBFB"; // Figma's own card fill (rgb 251,251,251) — see this component's own doc comment
const CARD_RADIUS = 0; // Figma's own value — literally unrounded, despite looking card-like

// ---- Counter row: Figma insets from the CARD, as % (identical across
// all 3 keyframes) ----
const ROW_LEFT_PCT = 1.7647; // 24 / 1360
const ROW_WIDTH_PCT = 96.5441; // 1313 / 1360
const ROW_BOTTOM_INSET_PCT = 3.0; // 21 / 700 (card height)
// How far ABOVE its Figma resting position the row starts (P=0), as a %
// of card height — NOT Figma-sourced (all 3 keyframes show the row
// static; "moves down" is a web-only enhancement, same precedent as the
// previous build), but now interpreted as "moves down INTO the Figma
// position" rather than "moves down PAST it" — the previous build's
// bug (counter cut off by the viewport bottom) was exactly this: it
// started AT the Figma-safe position and moved further down from there,
// overshooting past the card's own safe inset. The Figma position is now
// always the END state (P=1), never exceeded.
const ROW_START_OFFSET_PCT = 8;

// ---- Globe: read from the 3 Figma keyframes ("01/02/03 - Home / 03
// Stats", nodes 159:131668 / 159:138854 / 159:146040), as % of the
// CARD's own width (size + x) and height (y) — using width for BOTH
// size and x, rather than size-as-%-of-width and size-as-%-of-height
// independently, is deliberate: the card's aspect ratio (1360:700 in
// Figma) won't hold at other viewport sizes once it's fluid, and scaling
// a circle by two different independent percentages would stretch it
// into an ellipse. Center X is exactly 50% of card width in all three
// keyframes (confirmed — the globe never moves horizontally, only
// shrinks and rises) and `rotation: 0` on every keyframe (confirmed via
// the earlier "no pink circle" investigation — the look of a different
// part of the globe showing between keyframes is purely the crop,
// keyframe 1's globe is so large only its very top cap fits in the card).
const GLOBE_KEYFRAMES_PCT = [
  { sizePctW: 98.6765, xPctW: 0.6618, yPctH: 31.4286 }, // P=0 (keyframe 01)
  { sizePctW: 74.2647, xPctW: 12.8676, yPctH: 12.0 }, // P=0.5 (keyframe 02)
  { sizePctW: 47.0588, xPctW: 26.4706, yPctH: -6.5714 }, // P=1 (keyframe 03)
];
// The widget's own DEFAULTS (dotColor/rimColor) are white/near-black,
// meant for a dark hero-style background — invisible against this card's
// near-white one. Read directly off Figma's own "dots"/"rim" layers:
// both rgb(73,73,73) — rim additionally at 25% opacity in Figma, baked
// into this rgba() since the widget applies none of its own.
const GLOBE_DOT_COLOR = "#494949";
const GLOBE_RIM_COLOR = "rgba(73,73,73,0.25)";

// ---- Scroll-linked progress (A) ----
// Pinned — see this component's own doc comment for the fuller
// reasoning (a no-pin version was tried first and concretely failed: at
// P=1 the section's own normal scroll motion had already carried the
// globe off the top of the viewport, because nothing was holding the
// composition in place while its properties changed).
const STATS_SCROLL_LENGTH_VH = 80;

// ---- Count-up (B) ----
const COUNT_UP_DURATION_MS = 1200;
const COUNT_UP_STAGGER_MS = 80;
const ENABLE_COUNT_STAGGER = true;
const COUNT_VISIBLE_THRESHOLD = 0.5; // "counter row at least 50% visible"

// ---- Typography: fluid number size ----
// Figma's own 59.87px at its 1440 reference width is the clamp's
// PREFERRED value AND its max (59.87/1440 = 4.157vw) — deliberately
// capped there rather than left to keep growing past 1440: the card
// itself stops growing around ~1695px wide (CARD_MAX_WIDTH_PX, reached
// earlier than that via SIDE_INSET's own 64px ceiling), so letting the
// number keep scaling with raw vw past the Figma reference would
// eventually outgrow the cell it was sized for. MIN (32px) is a safety
// floor for the narrower end of the range this section is actually
// tested at (1280px) — "50.000+" fits comfortably there (verified).
const NUMBER_FONT_SIZE = "clamp(32px, 4.157vw, 59.87px)";

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
// Same live measurement SiteHeader/ScrollLink/HomeCompany all use for
// the header's own rendered height.
function headerHeightPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}
// "50.000", not "50,000" — hand-rolled rather than `toLocaleString`,
// which is locale-dependent (wrong separator on an en-US runtime) and
// this needs the dot specifically, every environment, every intermediate
// frame of the count.
function formatThousands(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const ICON_COLOR = "#30302F"; // exact Figma value, not a named token — see git history
const CARD_GAP = "var(--fig-spacing-24)";

type Stat = {
  label: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  value: number;
  suffix: string;
};

const STATS: Stat[] = [
  { label: "Years in Market", icon: CalendarFold, value: 10, suffix: "+" },
  { label: "Enterprise", icon: Building, value: 500, suffix: "+" },
  { label: "Vehicles Traced", icon: Truck, value: 50000, suffix: "+" },
  { label: "Countries", icon: Earth, value: 5, suffix: "+" },
];

/**
 * "Stats" section of the Feizm Homepage, built on top of three Figma
 * keyframes ("01/02/03 - Home / 03 Stats") — see the constants above for
 * exactly what was read from each and how.
 *
 * ---- Fluid card (fixing the previous build) ----
 * The previous build never rendered Figma's own light-gray card
 * (`#FBFBFB`, read off "Frame 1362793307"'s own fill, previously used
 * only for measurement) — the globe floated directly over the page, the
 * counter cells had no opaque background (dots showed through labels),
 * and everything was a fixed 1440x820 box that didn't fit shorter/
 * narrower monitors. Now:
 *   - the CARD is a real element: `background: #FBFBFB`, `overflow:
 *     hidden` (clipping the globe, same as Figma's own `clipsContent`),
 *     no border-radius (Figma's own value is 0, despite looking
 *     card-like).
 *   - width: `min(100% - 2*SIDE_INSET, 1600px)`, auto-centered once
 *     capped.
 *   - height: `max(560px, 100% of the pin's own height - 2*
 *     VERTICAL_INSET)` — the PIN itself (see below) is already sized to
 *     exactly fill the viewport under the header, so subtracting the
 *     header height a second time here isn't needed; "100%" here
 *     resolves against the pin's own definite height.
 *   - the counter row gets its OWN opaque white background (Figma has
 *     this on the row as a whole, not per-cell — same visual result
 *     either way; doing it once on the row is simpler) and sits ABOVE
 *     the globe via z-index, so dots never show through a label again.
 *
 * ---- Card-relative animation (percentages, not fixed px) ----
 * The 3 keyframes' globe size/position and the counter row's own
 * geometry are stored as PERCENTAGES of the card (see the constants
 * above), converted to real pixels via a `ResizeObserver` on the card
 * itself (not just a window resize listener — the card's rendered size
 * can change for reasons other than the window resizing, e.g. the
 * header's own height changing) and written as the globe/counter
 * elements' base (non-animated) `left/top/width/height`. The PER-TICK
 * scroll-driven animation still only ever touches `transform`
 * (translateY + scale) on top of that resize-updated base — same
 * "transform/opacity only, no layout reflow" performance rule as
 * before, just with the base values now responsive. Globe SIZE and
 * X-position scale off the card's WIDTH, Y-position off its HEIGHT
 * (never size independently off both axes — see GLOBE_KEYFRAMES_PCT's
 * own comment for why that would stretch the circle into an ellipse
 * once the card's aspect ratio stops matching Figma's 1360:700).
 *
 * Counter row: base (P=1, resting) position is Figma's own insets
 * (left/width/bottom, all %-of-card). The P=0 "start" position is
 * `ROW_START_OFFSET_PCT` of card height ABOVE that, reached via
 * `transform: translateY()` — i.e. the row moves DOWN INTO the Figma
 * position as P goes 0->1, never past it, fixing the previous build's
 * "cut off by the viewport bottom" bug (which moved it further down
 * FROM the already-safe Figma position instead of toward it).
 *
 * ---- Progress P, pin ----
 * Unchanged mechanism from the previous build: pinned (see
 * STATS_SCROLL_LENGTH_VH's own comment for why a no-pin version was
 * tried first and failed), `P = clamp(-wrapper.rect.top / span, 0, 1)`
 * where `span` is the wrapper's own extra height beyond the pin
 * (STATS_SCROLL_LENGTH_VH). `easeInOutCubic(P)` feeds a piecewise-linear
 * interpolation across the 3 keyframes (0->0.5->1), landing exactly on
 * each keyframe at P=0/0.5/1. The PIN itself is sized to exactly fill
 * the viewport under the header (`height: calc(100svh - var(--header-h))`,
 * `top: var(--header-h)`) and the CARD is centered within it with its own
 * fluid height — so "the card is fully in view under the header" at P=0
 * and "still fully visible" at P=1 both follow directly from the pin's
 * own sizing, not a separate check.
 *
 * ---- B) Count-up (time-based, once) — UNCHANGED ----
 * Trigger: counter row >= 50% visible (real IntersectionObserver,
 * threshold 0.5), latched via `countedRef` so it can never replay.
 * SSR/SEO: the JSX always renders the FINAL formatted string as real
 * text content; the animating `<span aria-hidden>` is only ever mutated
 * via direct `textContent` writes, and the wrapping stat element carries
 * `aria-label` with the real final value for screen readers. No flash of
 * the final value before the count starts: a pre-paint synchronous
 * visibility check decides whether to hide the digits at all, before the
 * real IntersectionObserver takes over watching for the 50% crossing.
 * `prefers-reduced-motion` skips this whole effect.
 *
 * ---- Integration — UNCHANGED ----
 * Header: site-header.tsx's own trigger (watching `#home-company`'s top
 * edge) stays solid automatically through this section. Company: no
 * overlapping scroll ranges are possible by construction — this
 * section's pin can't engage until Company has fully scrolled past.
 *
 * ---- Reduced motion ----
 * No scroll listener, no rAF loop: the globe/counter transforms jump
 * straight to their P=1 state and the SSR final numbers are simply left
 * alone — final frame, immediately. The pin itself is skipped too (plain
 * `position: relative`, `height: auto`), same precedent as every other
 * pinned section in this project.
 */
export function StatsSection() {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const globeWrapRef = useRef<HTMLDivElement | null>(null);
  const counterRowRef = useRef<HTMLDivElement | null>(null);
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const countedRef = useRef(false);

  // Base (non-animated) geometry, recomputed from the card's own measured
  // size on mount/resize (see the ResizeObserver effect below) and read
  // by the scroll-tick effect to compute each frame's `transform`. Refs,
  // not state: these feed a per-frame rAF loop, not React renders.
  const globeKeyframesPxRef = useRef<{ centerY: number; radius: number }[]>([
    { centerY: 0, radius: 1 },
    { centerY: 0, radius: 1 },
    { centerY: 0, radius: 1 },
  ]);
  const globeBaseCenterYRef = useRef(0);
  const rowOffsetPxRef = useRef(0);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  // SSR-safe defaults matching the 1440 Figma reference (pinnable, full
  // vertical inset) — corrected post-mount by the fit-measurement effect
  // below, before first paint, same tradeoff as every other measured
  // value in this project.
  const [isPinnable, setIsPinnable] = useState(true);
  const [effectiveInsetPx, setEffectiveInsetPx] = useState(60);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as every other reducedMotion state in this project
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Short-screen fallback per the brief: first try shrinking the
  // top/bottom inset so the card still hits CARD_MIN_HEIGHT_PX; only if
  // that's not enough (available height itself is under the minimum)
  // does the section stop pinning entirely and fall back to normal
  // scroll flow — same "if it genuinely doesn't fit, don't pin" shape as
  // HomeCompany's own `textFits` fallback. Pure CSS clamp() can express
  // "shrink continuously," but not "shrink, then give up and switch
  // layout modes" — that branch needs this JS measurement.
  useLayoutEffect(() => {
    function measureFit() {
      const vw = window.innerWidth;
      const vh = window.innerHeight; // practical proxy for 100svh on desktop
      const available = vh - headerHeightPx();
      const naturalInset = clamp(VERTICAL_INSET_MIN_PX, (VERTICAL_INSET_PREFERRED_VW / 100) * vw, VERTICAL_INSET_MAX_PX);
      if (available - 2 * naturalInset >= CARD_MIN_HEIGHT_PX) {
        setIsPinnable(true);
        setEffectiveInsetPx(naturalInset);
      } else if (available >= CARD_MIN_HEIGHT_PX) {
        setIsPinnable(true);
        setEffectiveInsetPx((available - CARD_MIN_HEIGHT_PX) / 2);
      } else {
        setIsPinnable(false);
      }
    }
    measureFit();
    window.addEventListener("resize", measureFit);
    return () => window.removeEventListener("resize", measureFit);
  }, []);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "100% 0px 100% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Converts the card's own measured size into real pixels for the
  // globe's base box and keyframes, and the counter row's base position
  // and start-offset — see this component's own "Card-relative animation"
  // doc comment. Re-runs on every card resize (ResizeObserver), not just
  // window resize, per the brief.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const globeWrap = globeWrapRef.current;
    const counterRow = counterRowRef.current;
    if (!card || !globeWrap || !counterRow) return;

    function applyCardGeometry() {
      const w = card!.clientWidth;
      const h = card!.clientHeight;
      if (w === 0 || h === 0) return;

      const base = GLOBE_KEYFRAMES_PCT[0];
      globeWrap!.style.left = `${(base.xPctW / 100) * w}px`;
      globeWrap!.style.top = `${(base.yPctH / 100) * h}px`;
      globeWrap!.style.width = `${(base.sizePctW / 100) * w}px`;
      globeWrap!.style.height = `${(base.sizePctW / 100) * w}px`;
      globeBaseCenterYRef.current = (base.yPctH / 100) * h + ((base.sizePctW / 100) * w) / 2;
      globeKeyframesPxRef.current = GLOBE_KEYFRAMES_PCT.map((kf) => {
        const sizePx = (kf.sizePctW / 100) * w;
        return { centerY: (kf.yPctH / 100) * h + sizePx / 2, radius: sizePx / 2 };
      });

      counterRow!.style.left = `${(ROW_LEFT_PCT / 100) * w}px`;
      counterRow!.style.width = `${(ROW_WIDTH_PCT / 100) * w}px`;
      counterRow!.style.bottom = `${(ROW_BOTTOM_INSET_PCT / 100) * h}px`;
      rowOffsetPxRef.current = (ROW_START_OFFSET_PCT / 100) * h;
    }

    applyCardGeometry();
    const ro = new ResizeObserver(applyCardGeometry);
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  // ---- A) Scroll-linked globe shrink + counter move (pinned) ----
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const pin = pinRef.current;
    const globeWrap = globeWrapRef.current;
    const counterRow = counterRowRef.current;
    if (!wrapper || !pin || !globeWrap || !counterRow) return;

    function applyProgress(p: number) {
      const eased = easeInOutCubic(p);
      const kf = globeKeyframesPxRef.current;
      let centerY: number, radius: number;
      if (eased <= 0.5) {
        const t = eased / 0.5;
        centerY = lerp(kf[0].centerY, kf[1].centerY, t);
        radius = lerp(kf[0].radius, kf[1].radius, t);
      } else {
        const t = (eased - 0.5) / 0.5;
        centerY = lerp(kf[1].centerY, kf[2].centerY, t);
        radius = lerp(kf[1].radius, kf[2].radius, t);
      }
      const scale = radius / kf[0].radius;
      const translateY = centerY - globeBaseCenterYRef.current;
      globeWrap!.style.transform = `translateY(${translateY}px) scale(${scale})`;
      // Moves DOWN into its resting (Figma) position as eased goes 0->1
      // — see ROW_START_OFFSET_PCT's own comment.
      counterRow!.style.transform = `translateY(${-rowOffsetPxRef.current * (1 - eased)}px)`;
    }

    if (reducedMotion || !isPinnable) {
      // Not pinnable: falling back to a non-pinned, scroll-linked
      // animation here would reintroduce the exact bug that made this
      // section pin in the first place (the globe scrolling off-screen
      // before its shrink finishes — see this component's own doc
      // comment) — on a screen too short to hold the card at all, simply
      // show the final (P=1) state, same as reduced motion.
      applyProgress(1);
      return;
    }

    if (!inView) return;

    // Same sticky-scrub formula as HomeHeroParallax's own scrollState():
    // `span` is how much scroll room the wrapper provides BEYOND the
    // pin's own height — exactly STATS_SCROLL_LENGTH_VH, by construction
    // of the wrapper's own CSS height below. Self-contained: the wrapper
    // supplies its own scroll room, so this never depends on there being
    // enough content after this section.
    function scrollProgress() {
      const rect = wrapper!.getBoundingClientRect();
      const span = rect.height - pin!.clientHeight;
      return span > 0 ? clamp(-rect.top / span, 0, 1) : 0;
    }

    let raf = 0;
    let ticking = false;
    const tick = () => {
      applyProgress(scrollProgress());
      ticking = false;
    };

    tick();

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", tick);
    };
  }, [reducedMotion, inView, isPinnable]);

  // ---- B) Count-up, once — UNCHANGED ----
  useLayoutEffect(() => {
    if (reducedMotion) {
      for (const el of numberRefs.current) {
        if (el) el.style.opacity = "1";
      }
      return;
    }
    const row = counterRowRef.current;
    if (!row) return;

    function visibleFraction() {
      const rect = row!.getBoundingClientRect();
      if (rect.height <= 0) return 0;
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(window.innerHeight, rect.bottom);
      return Math.max(0, visibleBottom - visibleTop) / rect.height;
    }

    function startCountUp() {
      for (const el of numberRefs.current) {
        if (el) el.style.opacity = "1";
      }
      let raf = 0;
      const start = performance.now();
      const maxStagger = ENABLE_COUNT_STAGGER ? (STATS.length - 1) * COUNT_UP_STAGGER_MS : 0;
      const totalDuration = COUNT_UP_DURATION_MS + maxStagger;

      const frame = (now: number) => {
        const elapsed = now - start;
        STATS.forEach((stat, i) => {
          const el = numberRefs.current[i];
          if (!el) return;
          const delay = ENABLE_COUNT_STAGGER ? i * COUNT_UP_STAGGER_MS : 0;
          const local = clamp((elapsed - delay) / COUNT_UP_DURATION_MS, 0, 1);
          const current = stat.value * easeOutCubic(local);
          el.textContent = formatThousands(current) + stat.suffix;
        });
        if (elapsed < totalDuration) {
          raf = requestAnimationFrame(frame);
        }
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }

    if (visibleFraction() >= COUNT_VISIBLE_THRESHOLD) {
      countedRef.current = true;
      return;
    }

    for (const el of numberRefs.current) {
      if (el) el.style.opacity = "0";
    }

    let cleanupCountUp: (() => void) | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (countedRef.current) return;
        if (entries[0].isIntersecting) {
          countedRef.current = true;
          io.disconnect();
          cleanupCountUp = startCountUp();
        }
      },
      { threshold: COUNT_VISIBLE_THRESHOLD },
    );
    io.observe(row);

    return () => {
      io.disconnect();
      cleanupCountUp?.();
    };
  }, [reducedMotion]);

  const effectivelyPinned = isPinnable && !reducedMotion;
  // Once `isPinnable` is true, `effectiveInsetPx` already guarantees
  // `100svh - header - 2*inset >= CARD_MIN_HEIGHT_PX` by construction
  // (see the fit-measurement effect above) — so the pin can simply fill
  // "the viewport under the header" directly, no defensive `max()`
  // needed the way a pure-CSS-only version would've needed one.
  const pinHeightExpr = "calc(100svh - var(--header-h))";
  const wrapperHeight = effectivelyPinned ? `calc(${pinHeightExpr} + ${STATS_SCROLL_LENGTH_VH}vh)` : "auto";

  return (
    <section ref={wrapperRef} className="relative w-full" style={{ height: wrapperHeight }} aria-label="Company stats">
      <div
        ref={pinRef}
        id="home-stats"
        className="relative w-full"
        style={
          !effectivelyPinned
            ? { height: "auto", paddingTop: VERTICAL_INSET, paddingBottom: VERTICAL_INSET, boxSizing: "border-box" }
            : {
                position: "sticky",
                top: "var(--header-h)",
                height: pinHeightExpr,
                // Top/bottom insets live here as PADDING, not as a
                // margin-top on the card below — a margin on the card
                // would collapse through the pin (no padding/border/
                // overflow of its own to stop it), rendering as if the
                // inset didn't exist: confirmed directly, the card's own
                // top sat flush at the header's own edge (0px gap)
                // instead of the inset away. Padding never collapses, so
                // this is the structural fix, not a tweak to the inset's
                // own value. `effectiveInsetPx` (not the raw CSS clamp)
                // because it may already be the shrunk, short-screen
                // value — see the fit-measurement effect above.
                paddingTop: effectiveInsetPx,
                paddingBottom: effectiveInsetPx,
                boxSizing: "border-box",
              }
        }
      >
        <div
          ref={cardRef}
          className="relative mx-auto overflow-hidden"
          style={{
            width: `min(calc(100% - 2 * ${SIDE_INSET}), ${CARD_MAX_WIDTH_PX}px)`,
            // "100%" resolves against the pin's own CONTENT box (its
            // padding, set above, is already subtracted) when pinned —
            // no second inset subtraction needed here. Not pinned: a
            // flat minimum, just enough for the globe/counter to size
            // against in this rare (very short viewport) fallback.
            height: effectivelyPinned ? `max(${CARD_MIN_HEIGHT_PX}px, 100%)` : `${CARD_MIN_HEIGHT_PX}px`,
            backgroundColor: CARD_BG,
            borderRadius: CARD_RADIUS,
          }}
        >
          <div
            ref={globeWrapRef}
            aria-hidden="true"
            className="absolute"
            style={{ transformOrigin: "center" }}
          >
            <HalftoneGlobeWidget
              className="h-full w-full"
              dotColor={GLOBE_DOT_COLOR}
              rimColor={GLOBE_RIM_COLOR}
              centerX={540}
              centerY={540}
              radius={420}
            />
          </div>

          <div
            ref={counterRowRef}
            className="absolute z-10 flex"
            style={{ backgroundColor: "#FFFFFF", fontFamily: "var(--font-hanken-grotesk)" }}
          >
            {STATS.map((stat, i) => {
              const { label, icon: Icon, value, suffix } = stat;
              const finalText = formatThousands(value) + suffix;
              return (
                <div
                  key={label}
                  className="flex flex-1 flex-col"
                  style={{
                    border: "1px solid var(--fig-color-neutral-300)",
                    padding: "var(--fig-spacing-15)",
                    gap: CARD_GAP,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-normal" style={{ fontSize: "16.84px", lineHeight: "24.32px", color: "var(--fig-color-neutral-900)" }}>
                      {label}
                    </span>
                    <Icon size={24} color={ICON_COLOR} strokeWidth={2} />
                  </div>
                  <span aria-label={finalText} className="font-normal" style={{ fontSize: NUMBER_FONT_SIZE, lineHeight: 1, color: "var(--fig-color-neutral-900)", whiteSpace: "nowrap" }}>
                    <span
                      aria-hidden="true"
                      ref={(el) => {
                        numberRefs.current[i] = el;
                      }}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {finalText}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
