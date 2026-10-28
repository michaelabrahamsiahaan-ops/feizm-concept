"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Building, CalendarFold, Earth, Truck } from "lucide-react";
import type { ComponentType } from "react";
import { HalftoneGlobeWidget } from "@/components/HalftoneGlobeWidget";

const SECTION_W = 1440; // Figma frame width — all 3 keyframes share this
const SECTION_H = 820; // Figma frame height — unchanged across all 3 keyframes
const CONTENT_W = SECTION_W - 2 * 40; // minus spacing-40 x padding
const CONTENT_H = SECTION_H - 2 * 60; // minus spacing-60 y padding

// ---- Globe: read from the 3 Figma keyframes ("01/02/03 - Home / 03
// Stats", nodes 159:131668 / 159:138854 / 159:146040) ----
// Rim-circle center/radius per keyframe, in content-box coordinates.
// Center X is EXACTLY 680 (= 1360/2, the content box's own horizontal
// center) in all three — the globe never moves horizontally, only
// shrinks and rises. `rotation: 0` on every keyframe too, confirmed by
// the "no pink circle" investigation finding no actual 3D rotation —
// what looks like a different part of the globe showing between
// keyframe 1 and 2/3 is purely the crop: keyframe 1's globe is so large
// that only its very top cap fits inside the 700px-tall content box.
const GLOBE_KEYFRAMES = [
  { centerY: 891, radius: 521.89 }, // P=0 (keyframe 01)
  { centerY: 589, radius: 392.78 }, // P=0.5 (keyframe 02)
  { centerY: 274, radius: 248.89 }, // P=1 (keyframe 03)
];
// The globe widget's own mount box, fixed at keyframe 01's exact
// position/size (x:9, y:220, 1342x1342) — every other keyframe's state
// is reproduced purely via `transform: translateY() scale()` on this
// SAME box, per the brief's "transform/opacity only, no layout reflow"
// rule. Scale pivots around the box's own CSS default transform-origin
// (50% 50%) — which, not by accident, lands exactly on keyframe 01's own
// rim center (9+1342/2, 220+1342/2) = (680, 891): no separate anchor
// element is needed (the brief's "pink circle" — searched for
// exhaustively across all 3 keyframes' full node trees, including every
// one of the ~7000 individual dot vectors per keyframe, and it isn't a
// real layer in the document at all, most likely a Figma comment pin —
// would have marked this exact point).
const GLOBE_BASE = { x: 9, y: 220, size: 1342 };
const GLOBE_BASE_CENTER_Y = GLOBE_BASE.y + GLOBE_BASE.size / 2; // 891, matches keyframe 01 exactly
// The widget's own DEFAULTS (dotColor/rimColor) are white/near-black,
// meant for a dark hero-style background — invisible against this
// section's white one. Read directly off Figma's own "dots"/"rim"
// layers: both rgb(73,73,73) — rim additionally at 25% opacity in
// Figma, baked into this rgba() since the widget applies none of its own.
const GLOBE_DOT_COLOR = "#494949";
const GLOBE_RIM_COLOR = "rgba(73,73,73,0.25)";

// ---- Scroll-linked progress (A) ----
// Pinned: P=0 the moment the section becomes sticky (its natural top
// would otherwise pass the header's bottom edge — same condition
// site-header.tsx's own overlay->solid trigger and HomeCompany's text-
// appear trigger both use, just enforced here by CSS `position: sticky`
// itself rather than a computed scrollY threshold), held for
// STATS_SCROLL_LENGTH_VH (80vh) of scroll before releasing at P=1 — same
// extended-wrapper + sticky-stage mechanism HomeHeroParallax already
// uses. This was NOT the first design tried: a no-pin version (just
// interpolating a property over a fixed scroll distance while the
// section scrolled normally, the same technique HomeCompany's pattern-
// fill/text-sweep use) was built and measured first, and failed
// concretely — at P=1 the section's own normal scroll motion had ALREADY
// carried the globe wrapper's bottom edge up to y=9px in the viewport
// (9px of the shrunk globe left visible, confirmed via
// getBoundingClientRect()), because nothing was holding the composition
// in the viewport while its properties changed. Company's reveal-while-
// passing-through effects don't need that; this one — "the same
// viewport-locked view, properties interpolate" — is the same category
// as Hero's own scene-scrubbing, and needs the same fix.
const STATS_SCROLL_LENGTH_VH = 80;
// How far the counter row moves down at P=1. NOT sourced from Figma —
// all 3 keyframes show Frame 8 at the exact same (24, 538.07) position,
// confirmed by comparing every keyframe's own measurements; "moves down"
// is a web-only enhancement with no Figma-given distance. Kept modest
// and tied to the section's own fixed geometry rather than the globe's
// full 617px of vertical travel: the row's own bottom sits just 21px
// above the content box's bottom edge at P=0 (538.07+140.93=679 vs
// content box height 700), and the section's total height doesn't grow
// for this animation (same "transform only, no reflow" rule) — 64px
// (one more spacing-64 token's worth) leaves the row comfortably inside
// the section's own 60px bottom padding (21+64=85 < 120px of total
// clearance to the section's hard 820px edge) with no risk of clipping.
const COUNTER_TRANSLATE_Y_PX = 64;

// ---- Count-up (B) ----
const COUNT_UP_DURATION_MS = 1200;
const COUNT_UP_STAGGER_MS = 80;
// Toggle to compare simultaneous vs. staggered count-up — see this
// component's own verification notes for both variants.
const ENABLE_COUNT_STAGGER = true;
const COUNT_VISIBLE_THRESHOLD = 0.5; // "counter row at least 50% visible"

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
 * "Stats" section of the Feizm Homepage, scroll-animated per the brief
 * built on top of three Figma keyframes ("01/02/03 - Home / 03 Stats") —
 * see the constants above for exactly what was read from each and how.
 *
 * ---- A) Globe shrink + counter move (scroll-linked, reversible) ----
 * Pinned — see STATS_SCROLL_LENGTH_VH's own comment for why a no-pin
 * version was tried first and concretely failed. One progress value P
 * (0->1), computed fresh from the pin's own live sticky-scrub position
 * every tick (not accumulated/eased in JS state — see HomeCompany's own
 * "--p is a pure function of scrollY" precedent and HomeHeroParallax's
 * own `scrollState()`, which this directly reuses the formula from): 0
 * the moment the section becomes sticky, 1 once the wrapper's own
 * STATS_SCROLL_LENGTH_VH of extra height has been scrolled through.
 * Lenis-compatible for free: Lenis moves the real `window.scrollY` and
 * dispatches native scroll events, so the plain `scroll` listener below
 * already reads Lenis-smoothed positions with no special-casing
 * (confirmed pattern, see HomeCompany/HomeHeroParallax's own comments on
 * this).
 *
 * `easeInOutCubic(P)` is applied once, then used as the parameter for a
 * piecewise-linear interpolation across the 3 keyframes (0->0.5->1) —
 * this keeps the motion smooth across the whole range while still
 * landing exactly on each keyframe's own values at P=0/0.5/1 (the cubic
 * passes through (0.5, 0.5) exactly, so the midpoint keyframe lands
 * precisely at the midpoint of the motion, not skewed).
 *
 * Every property changes via `transform` only (translateY + scale on the
 * globe's own fixed-size mount box; translateY on the counter row) — no
 * top/left/width writes, so this never triggers layout. The globe
 * widget's own internal canvas is NEVER told to resize/redraw for this:
 * CSS transforms don't fire ResizeObserver, so its one rAF loop keeps
 * drawing the SAME fixed-resolution canvas (rotation/routes/pulse still
 * live — kept per explicit request over the lighter but fully-static SVG
 * export) while our transform scales the whole thing visually.
 *
 * ---- B) Count-up (time-based, once) ----
 * Trigger: counter row >= 50% visible (real IntersectionObserver,
 * threshold 0.5), latched via `countedRef` so it can never replay.
 * SSR/SEO: the JSX always renders the FINAL formatted string
 * ("10+"/"500+"/"50.000+"/"5+") as real text content — nothing is ever
 * rendered as "0" server-side. The animating `<span aria-hidden>` is
 * only ever mutated via direct `textContent` writes from the rAF loop
 * (same "direct DOM write for continuous values" convention as every
 * other scroll-driven effect in this project), and the wrapping stat
 * element carries `aria-label` with the real final value so screen
 * readers always get "10+", never the changing digits mid-count.
 *
 * No flash of the final value before the count starts: a
 * `useLayoutEffect` runs synchronously pre-paint and does a ONE-TIME
 * synchronous visibility check (not the IO's own first callback, which
 * fires asynchronously) — if the row is already >=50% visible right then
 * (e.g. a mid-section refresh), nothing is hidden and nothing animates:
 * the SSR-rendered final value is correct and simply stays. Only if it's
 * NOT yet visible does this same pre-paint effect hide the digits
 * (`opacity: 0`, written directly, no React state/re-render involved)
 * before the browser's first paint, then sets up the real
 * IntersectionObserver to catch the moment it crosses 50% and run the
 * count. `prefers-reduced-motion` skips this whole effect — the SSR
 * final value is simply left alone, fully visible, no hide, no count.
 *
 * ---- Integration ----
 * Header: no changes needed. site-header.tsx's trigger watches
 * `#home-company`'s own top edge, which only moves further negative as
 * the user scrolls into this (later) section — stays solid automatically,
 * and this section's own sticky `top: var(--header-h)` sits it exactly
 * below that already-solid header.
 * Company: no overlapping scroll ranges are possible by construction —
 * this section's own pin can't engage until Company has fully scrolled
 * past, since Stats doesn't reach the header before that regardless of
 * Company's own animation timing. Exact scrollY ranges for both are
 * measured and reported in this change's own verification notes, not
 * hardcoded here.
 *
 * ---- Scope note: responsive ----
 * Below 1024px this section still renders at the same fixed 1440 width
 * (same convention this section has used since its first build, and
 * unchanged by this pass) — the brief asked for the shrink/count-up
 * animation here, not a ground-up responsive rebuild of the 4-card row
 * into a 2x2/1-column grid, which is a separate, larger task with its
 * own breakpoint decisions. "Scale proportionally" was chosen for THAT
 * eventual rebuild; there's nothing to scale yet while the section
 * itself doesn't reflow below 1024px.
 *
 * ---- Reduced motion ----
 * No scroll listener, no rAF loops at all: the globe/counter transforms
 * jump straight to their P=1 state and the SSR final numbers are simply
 * left alone (already correct, see B above) — final frame, immediately,
 * exactly per spec.
 */
export function StatsSection() {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const globeWrapRef = useRef<HTMLDivElement | null>(null);
  const counterRowRef = useRef<HTMLDivElement | null>(null);
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const countedRef = useRef(false);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as every other reducedMotion state in this project
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
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

  // ---- A) Scroll-linked globe shrink + counter move (pinned) ----
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const pin = pinRef.current;
    const globeWrap = globeWrapRef.current;
    const counterRow = counterRowRef.current;
    if (!wrapper || !pin || !globeWrap || !counterRow) return;

    function applyProgress(p: number) {
      const eased = easeInOutCubic(p);
      let centerY: number, radius: number;
      if (eased <= 0.5) {
        const t = eased / 0.5;
        centerY = lerp(GLOBE_KEYFRAMES[0].centerY, GLOBE_KEYFRAMES[1].centerY, t);
        radius = lerp(GLOBE_KEYFRAMES[0].radius, GLOBE_KEYFRAMES[1].radius, t);
      } else {
        const t = (eased - 0.5) / 0.5;
        centerY = lerp(GLOBE_KEYFRAMES[1].centerY, GLOBE_KEYFRAMES[2].centerY, t);
        radius = lerp(GLOBE_KEYFRAMES[1].radius, GLOBE_KEYFRAMES[2].radius, t);
      }
      const scale = radius / GLOBE_KEYFRAMES[0].radius;
      const translateY = centerY - GLOBE_BASE_CENTER_Y;
      globeWrap!.style.transform = `translateY(${translateY}px) scale(${scale})`;
      counterRow!.style.transform = `translateY(${eased * COUNTER_TRANSLATE_Y_PX}px)`;
    }

    if (reducedMotion) {
      applyProgress(1);
      return;
    }

    if (!inView) return;

    // Same sticky-scrub formula as HomeHeroParallax's own scrollState():
    // `span` is how much scroll room the wrapper provides BEYOND the
    // pin's own height — exactly STATS_SCROLL_LENGTH_VH, by construction
    // of the wrapper's own CSS height below. Self-contained: the wrapper
    // supplies its own scroll room, so (unlike the no-pin version this
    // replaced) this never depends on there being enough content AFTER
    // this section — works correctly even with Stats as the last section
    // on the page.
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
  }, [reducedMotion, inView]);

  // ---- B) Count-up, once ----
  useLayoutEffect(() => {
    if (reducedMotion) {
      // Explicitly restore visibility, not just "do nothing": this effect
      // can run once already (hiding the digits pre-paint, below) BEFORE
      // the separate matchMedia-detection effect corrects `reducedMotion`
      // from its SSR-safe `false` default to `true` — a plain early
      // return here would leave them stuck hidden from that earlier pass
      // instead of showing the final values immediately, per spec.
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
        // totalDuration already accounts for the last number's own
        // stagger delay plus its own full duration, so elapsed crossing
        // it means every number has already written its exact final
        // (not just eased-to-1) text — stop scheduling frames.
        if (elapsed < totalDuration) {
          raf = requestAnimationFrame(frame);
        }
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }

    // Synchronous, pre-paint check — NOT the IntersectionObserver's own
    // first callback, which fires asynchronously and would let the
    // SSR-rendered final value visibly flash before any hide could apply.
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

  // Wrapper height: the pin's own 820px + STATS_SCROLL_LENGTH_VH of hold
  // room — same `pinHeight + scrubDistance` formula as HomeHeroParallax's
  // own wrapper. "auto" under reduced motion: no scroll-jacking area at
  // all, same precedent as Hero/Company's own reduced-motion branches.
  const wrapperHeight = reducedMotion ? "auto" : `calc(${SECTION_H}px + ${STATS_SCROLL_LENGTH_VH}vh)`;

  return (
    <section ref={wrapperRef} className="relative w-full" style={{ height: wrapperHeight }} aria-label="Company stats">
      <div
        ref={pinRef}
        id="home-stats"
        className="w-full overflow-hidden"
        style={{
          ...(reducedMotion
            ? { position: "relative" }
            : // Sticks right below the header, same `--header-h` custom
              // property every other section's scroll-margin/trigger math
              // already uses (site-header.tsx publishes it).
              { position: "sticky", top: "var(--header-h)" }),
          width: SECTION_W,
          height: SECTION_H,
          backgroundColor: "var(--fig-color-neutral-0)",
          paddingLeft: "var(--fig-spacing-40)",
          paddingRight: "var(--fig-spacing-40)",
          paddingTop: "var(--fig-spacing-60)",
          paddingBottom: "var(--fig-spacing-60)",
          fontFamily: "var(--font-hanken-grotesk)",
        }}
      >
        <div className="relative" style={{ width: CONTENT_W, height: CONTENT_H }}>
          <div
            ref={globeWrapRef}
            aria-hidden="true"
            className="absolute"
            style={{
              left: GLOBE_BASE.x,
              top: GLOBE_BASE.y,
              width: GLOBE_BASE.size,
              height: GLOBE_BASE.size,
              transformOrigin: "center",
            }}
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

          <div ref={counterRowRef} className="absolute flex" style={{ left: 24, top: 538.07, width: 1313 }}>
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
                  <span aria-label={finalText} className="font-normal" style={{ fontSize: "59.87px", lineHeight: "59.87px", color: "var(--fig-color-neutral-900)" }}>
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
