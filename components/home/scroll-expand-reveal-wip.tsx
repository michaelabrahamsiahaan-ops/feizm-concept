"use client";

/**
 * PARKED — not imported/rendered anywhere. This is the scroll-driven
 * "expand to full screen" reveal (small rounded box center-screen ->
 * grows to fill the viewport, pins via `position: sticky`, clip-path
 * reveal, eased scroll progress, header-overlay integration,
 * breakpoint-aware start inset, reduced-motion fallback) that USED to be
 * `TestimoniesSection` (components/home/testimonies-section.tsx). Removed
 * from Testimonies on the user's own request — not broken, just not the
 * right section for it: the effect actually belongs on a DIFFERENT,
 * later Home section whose Figma design is still in progress, and
 * Testimonies reverted to a plain static section in the meantime (see
 * that file's own doc comment). Kept here verbatim rather than deleted,
 * so the next section can be wired up to this mechanism directly instead
 * of rebuilding it from scratch once its design is ready.
 *
 * Still Testimonies-shaped internally (`Testimonial` type, "Trusted by
 * fleets across country" heading, quote/attribution layout) — adapt the
 * content model to whatever the next section actually needs once its
 * design exists; the MECHANISM (everything below `clamp01`) is the part
 * worth preserving as-is.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SectionBadge } from "@/components/SectionBadge";
import { TESTIMONIALS, type Testimonial } from "@/lib/testimonials-data";
import { cubicBezier } from "@/lib/cubic-bezier";

// ---- Tunable constants ----
const EXPAND_LENGTH_VH = 100; // scroll distance over which the box grows small -> fullscreen
const HOLD_LENGTH_VH = 40; // scroll distance holding fullscreen before releasing into the next section
// START_INSET percent, each side, at P=0 — per-breakpoint, confirmed with
// the user: desktop keeps 30% (box ~40% of the viewport); narrower
// screens get a relatively LARGER starting box (smaller inset) since a
// 30%-inset box on a 375px-wide phone would be tiny (~113px margins).
const START_INSET_DESKTOP = 30; // >=1024px
const START_INSET_TABLET = 20; // 768-1023px
const START_INSET_PHONE = 10; // <768px
const START_RADIUS = 24; // px, at P=0, same at every breakpoint
const EASE = cubicBezier(0.65, 0, 0.35, 1);
const CONTENT_REVEAL_P = 0.75; // raw (un-eased) scroll progress at which content starts appearing/becomes interactive
const HEADER_OVERLAY_P = 0.95; // raw scroll progress at which the header switches to overlay
const PHOTO_SCALE_START = 1.25; // photo scale at P=0, settles to 1.0 at P=1
const CONTENT_FADE_MS = 400;
const CONTENT_STAGGER_MS = 80;
const CONTENT_MAX_WIDTH = 1360; // same content width as the rest of the 1440-reference design (1440 - 2*40)

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/**
 * "Testimonies" section of the Feizm Homepage ("Home / 07 Testimonies",
 * node 291:1395). Previously a plain static section matching the
 * 1440px-fixed-width convention every other Home section uses; this
 * turn adds a scroll-driven "expand to full screen" reveal on top of it
 * per the user's own sketch (small rounded box center-screen -> grows to
 * fill the viewport), which REQUIRES this section to become the one
 * exception to that convention — a box that must fill "the entire
 * viewport" (confirmed by the brief's own verification across THREE
 * different viewport widths, 1280/1440/1920) cannot be a fixed 1440px
 * box; it has to be fluid/full-bleed. `app/home/page.tsx` renders this
 * WITHOUT the `overflow-x-hidden` wrapper every fixed-1440 section
 * needs (that wrapper exists purely to contain fixed-1440 overflow on
 * narrow viewports — a fluid section never overflows, so it's not
 * needed, and would do nothing here either way).
 *
 * ---- Structure ----
 * Outer wrapper: `height: calc(100vh + EXPAND_LENGTH_VH + HOLD_LENGTH_VH)`
 * — NOT just `100vh + EXPAND_LENGTH_VH` as Step 2 of the brief first
 * said; that was written before Step 3 added the hold phase, and a hold
 * needs its OWN scroll distance to hold across (see below). Inner stage:
 * `position: sticky; top: 0; height: 100vh`, sitting BEHIND the header
 * (no z-index ceiling under it) since the final state is genuinely
 * full-screen, matching the brief exactly.
 *
 * ---- The four phases, derived from one measurement ----
 * Every frame, `computeAndApply()` reads `wrapper.getBoundingClientRect
 * ().top` (call it `top`) — nothing else, so a mid-scroll page refresh
 * computes the correct state immediately, same reasoning as
 * SiteHeader's own `useLayoutEffect`-based initial read:
 *   - top > 0: not yet reached. rawP = 0.
 *   - 0 >= top > -expandPx: expanding. rawP = -top / expandPx, in [0, 1).
 *   - -expandPx >= top > -(expandPx+holdPx): holding. rawP clamps to 1.
 *   - top <= -(expandPx+holdPx): released, scrolled past. rawP stays
 *     clamped at 1 (harmless — nothing reads it once the sticky stage
 *     itself has scrolled off), but `isFullscreen` (below) is explicitly
 *     false here, not just "still true because rawP is 1" — otherwise
 *     the header would stay forced to overlay forever after scrolling
 *     past this section entirely, which is wrong once it's no longer on
 *     screen.
 * `isFullscreen = rawP >= HEADER_OVERLAY_P && top > -(expandPx+holdPx)`
 * is the one SiteHeader cares about (see below). `contentVisible = rawP
 * >= CONTENT_REVEAL_P` doesn't need the same extra guard — content
 * staying "visible" after the user has scrolled past is harmless, same
 * as any other section's content staying in its own final state once
 * off-screen.
 *
 * ---- Performance: one rAF write, not per-frame JS string-building ----
 * Only ONE numeric value — the EASED progress — is written per frame,
 * directly on the stage DOM node via `style.setProperty("--p", ...)`
 * (bypassing React state/re-render entirely for this; see below for why
 * that matters). `clip-path` and the photo's `transform: scale()` are
 * both plain CSS `calc()` expressions referencing `var(--p)` — set ONCE
 * in the JSX, never touched again — so the browser's own CSS engine
 * recomputes the derived inset/radius/scale values every frame, not
 * React/JS. `--p` is set on the STAGE element and read by both the
 * stage's own `clip-path` AND the (descendant) photo's `transform` via
 * normal CSS custom-property inheritance — one write reaches both.
 * `cubicBezier()` (lib/cubic-bezier.ts) is what computes the EASED value
 * from raw scroll progress — that math genuinely has to happen in JS
 * (CSS has no way to hand it an arbitrary bezier to sample from a
 * scroll-driven number), but it's one small function call per frame, not
 * per-frame string formatting.
 *
 * React STATE is used only for the few booleans that change rarely
 * (`contentVisible`, `isFullscreen`, `reducedMotion`, `isDesktop`) —
 * each gates a real CSS transition (for `contentVisible`) or triggers a
 * DOM-attribute write SiteHeader reads (`isFullscreen`), and re-rendering
 * a few times per full scroll-through is free; re-rendering 60x/second
 * for a continuously-changing number would not be.
 *
 * ---- Scroll source ----
 * Reads via a plain native `window.addEventListener("scroll", ...)`
 * (rAF-throttled) + `getBoundingClientRect()`, the SAME pattern every
 * other scroll-linked component in this project already uses
 * (PartnershipSection, SiteHeader, HomeHeroParallax) — not Lenis's own
 * `lenis.on("scroll", ...)` event. Confirmed directly in
 * HomeHeroParallax's own code/comments: Lenis smooths the REAL
 * `window.scrollY` itself (it's not a transform-based fake scroll), so
 * native scroll listeners already see the Lenis-smoothed position with
 * no extra wiring — Lenis is checked for (`getLenis()`) only when a
 * component wants to skip ITS OWN extra smoothing on top of Lenis's
 * (double-smoothing = lag, not smoothness, same lesson as that
 * component's own comment). This component doesn't apply any smoothing
 * of its own at all — `--p` maps directly off the live measured
 * position every tick — so there's nothing to skip; mentioned here only
 * to record that Lenis was accounted for, not ignored.
 *
 * ---- Header integration ----
 * See site-header.tsx's own updated comment for the DOM-attribute
 * mechanism (`document.documentElement.dataset.forceHeaderOverlay`) —
 * this component is the one that WRITES it, toggled only on the actual
 * `isFullscreen` boolean transition (not every tick).
 *
 * ---- Content reveal ----
 * `contentVisible` flips a real CSS transition (opacity + translateY,
 * ~400ms, `CONTENT_STAGGER_MS`-staggered per element: heading -> badge ->
 * quote -> name/company -> arrows) — chosen over driving the fade purely
 * from scroll position because the brief itself describes it in TIME
 * ("staggered ~80ms"), which only means something as a real transition
 * triggered by a threshold crossing, not a per-pixel scroll mapping.
 * This is also what makes "content fades out first" on scroll-up true
 * for free: `EASE` is a slow-start/fast-middle/soft-finish curve, so by
 * the time raw P drops back under 0.75 the BOX is still close to
 * full-screen (the eased curve front-loads most of the shrink into the
 * LAST stretch of raw P) — content hiding at the 0.75 threshold
 * necessarily happens before the box is visibly small again.
 *
 * ---- Reduced motion ----
 * Renders the static fallback (`StaticTestimonies` below): no pin, no
 * wrapper height trick, the section's ORIGINAL (pre-this-turn) fixed-1440
 * layout with content always visible — explicit in the brief ("no pin
 * and no expand").
 *
 * ---- Below 1024px ----
 * Gets the SAME expand mechanism, not the static fallback — only
 * `reducedMotion` triggers that now. Two things change per breakpoint,
 * confirmed with the user before building:
 *   - `START_INSET`: 30% (>=1024px, unchanged) / 20% (768-1023px) / 10%
 *     (<768px) — see the constants above for why narrower screens get a
 *     smaller inset (relatively larger starting box).
 *   - Content layout: the row split (420px-fixed heading/badge column +
 *     flexible quote column) would overflow under ~1024px (768-420=348px
 *     left for a 48px-type quote column is already cramped, and a phone
 *     width makes the fixed 420px column alone wider than the viewport).
 *     Below 1024px, `TestimonyContent`'s `stacked` prop switches to a
 *     plain vertical flow instead — same breakpoint IndustriesSection
 *     already uses for its own row-vs-stack decision, kept consistent
 *     rather than inventing a different one here. Typography stays the
 *     SAME pixel sizes at every tier (the brief's "never scale content"
 *     — this was about not scaling DURING the reveal, but there was no
 *     ask to redesign the type scale per breakpoint either, so it wraps
 *     naturally instead). Keeping full-size type stacked in one column
 *     DOES mean the full content block can be taller than a short phone
 *     viewport — confirmed directly (at 375x812, the heading measured
 *     fully off-screen above and the arrows fully off-screen below, both
 *     genuinely unreachable, not just visually tight) — since the stage
 *     is a fixed `h-screen` box with `overflow: hidden` for the clip-path
 *     reveal, content taller than it would otherwise be permanently
 *     clipped with no way to scroll to it. Fixed by making ONLY the
 *     stacked content wrapper `items-start` (not centered) with its own
 *     `overflow-y-auto` — top-aligned avoids the "centered content
 *     taller than an auto-overflow container clips at the start" flexbug
 *     that `items-center` + `overflow-y-auto` would otherwise hit, so
 *     scrolling reaches the full content reliably from the top down.
 *     Desktop keeps centering (its content always fits in 504px/100vh,
 *     confirmed, so this never triggers there).
 *
 * ---- Safari / clip-path performance ----
 * Could not be verified — this session's browser tooling is
 * Chromium-only, no Safari available to test actual frame timing on.
 * Flagging honestly rather than claiming a check that didn't happen; see
 * the brief's own fallback plan (a transform-based rounded mask) if it
 * turns out to stutter.
 */
function StaticTestimonies({ testimonial, stacked }: { testimonial: Testimonial; stacked: boolean }) {
  return (
    <section
      className="relative flex w-full flex-col overflow-hidden"
      style={{
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <Image src="/testimonials/background.webp" alt="" fill sizes="100vw" style={{ objectFit: "cover" }} />
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
      <TestimonyContent testimonial={testimonial} visible reducedMotion stacked={stacked} onNavigate={() => {}} />
    </section>
  );
}

/** Shared between the static fallback and the fullscreen stage — see each caller for how `visible`/`reducedMotion`/`stacked` differ. */
function TestimonyContent({
  testimonial,
  visible,
  reducedMotion,
  stacked,
  onNavigate,
}: {
  testimonial: Testimonial;
  visible: boolean;
  reducedMotion: boolean;
  stacked: boolean;
  onNavigate: (direction: 1 | -1) => void;
}) {
  function itemStyle(index: number): CSSProperties {
    if (reducedMotion) return { opacity: 1 };
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0px)" : "translateY(24px)",
      transition: `opacity ${CONTENT_FADE_MS}ms ease, transform ${CONTENT_FADE_MS}ms ease`,
      transitionDelay: `${index * CONTENT_STAGGER_MS}ms`,
    };
  }

  const arrows = (
    <div className="flex items-center" style={{ ...itemStyle(4), gap: "8px", pointerEvents: visible ? "auto" : "none" }}>
      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => onNavigate(-1)}
        className="flex cursor-pointer items-center justify-center"
        style={{
          width: 40,
          height: 32,
          borderRadius: "var(--fig-radius-md)",
          backgroundColor: "var(--fig-color-neutral-0)",
          border: "1px solid var(--fig-color-accent-coral-light)",
        }}
      >
        <ArrowLeft size={16} strokeWidth={1.6} color="#1e1e1e" />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => onNavigate(1)}
        className="flex cursor-pointer items-center justify-center"
        style={{
          width: 40,
          height: 32,
          borderRadius: "var(--fig-radius-md)",
          backgroundColor: "var(--fig-color-neutral-0)",
          border: "1px solid var(--fig-color-accent-coral-light)",
        }}
      >
        <ArrowRight size={16} strokeWidth={1.6} color="#1e1e1e" />
      </button>
    </div>
  );

  const attribution = (
    <div className="flex flex-col" style={{ ...itemStyle(3), gap: "8px" }}>
      <p className="font-normal" style={{ color: "var(--fig-color-neutral-0)", fontSize: "20px", lineHeight: "30px" }}>
        {testimonial.name} - {testimonial.title}
      </p>
      <p className="font-bold" style={{ color: "var(--fig-color-neutral-0)", fontSize: "20px", lineHeight: "30px" }}>
        {testimonial.company}
      </p>
    </div>
  );

  const quote = (
    <p className="font-normal" style={{ ...itemStyle(2), color: "var(--fig-color-neutral-0)", fontSize: "48px", lineHeight: "72px" }}>
      {testimonial.quote}
    </p>
  );

  const heading = (
    <h2 className="font-normal" style={{ ...itemStyle(0), color: "var(--fig-color-neutral-0)", fontSize: "40px", lineHeight: "44.9px" }}>
      Trusted by fleets across country
    </h2>
  );

  const badge = (
    <div style={itemStyle(1)}>
      <SectionBadge label="Testimonial" />
    </div>
  );

  // Below 1024px: the 420px-fixed heading column + flexible quote column
  // overflows (see this component's own doc comment) — plain vertical
  // flow instead, same 1024px breakpoint IndustriesSection already uses.
  if (stacked) {
    return (
      <div className="relative flex w-full flex-col" style={{ gap: "24px" }}>
        {heading}
        {badge}
        {quote}
        {attribution}
        {arrows}
      </div>
    );
  }

  return (
    <div className="relative flex w-full items-start" style={{ gap: "64px" }}>
      <div className="flex shrink-0 flex-col" style={{ width: 420, gap: "32px" }}>
        {heading}
        {badge}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between" style={{ height: 504 }}>
        {quote}
        <div className="flex flex-col" style={{ gap: "24px" }}>
          {attribution}
          {arrows}
        </div>
      </div>
    </div>
  );
}

export function ScrollExpandRevealWip() {
  const [activeIndex, setActiveIndex] = useState(0);
  const testimonial = TESTIMONIALS[activeIndex];

  // SSR-safe defaults (desktop, not reduced-motion), corrected post-mount
  // before first paint — same tradeoff as every other such check in this
  // project (e.g. PartnershipSection's own `isDesktop`). `tier` drives
  // START_INSET (30/20/10 — see the constants above); `stacked` (derived
  // from it) drives TestimonyContent's layout and uses the SAME 1024px
  // boundary IndustriesSection already uses for the same decision.
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tier, setTier] = useState<"desktop" | "tablet" | "phone">("desktop");
  const [contentVisible, setContentVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const stacked = tier !== "desktop";
  const startInset = tier === "desktop" ? START_INSET_DESKTOP : tier === "tablet" ? START_INSET_TABLET : START_INSET_PHONE;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const contentVisibleRef = useRef(false);
  const isFullscreenRef = useRef(false);

  function go(direction: 1 | -1) {
    setActiveIndex((prev) => (prev + direction + TESTIMONIALS.length) % TESTIMONIALS.length);
  }

  useLayoutEffect(() => {
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    const tabletMq = window.matchMedia("(min-width: 768px)");
    const computeTier = (): "desktop" | "tablet" | "phone" => (desktopMq.matches ? "desktop" : tabletMq.matches ? "tablet" : "phone");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as every other such check in this project
    setReducedMotion(motionMq.matches);
    setTier(computeTier());
    const onMotionChange = () => setReducedMotion(motionMq.matches);
    const onTierChange = () => setTier(computeTier());
    motionMq.addEventListener("change", onMotionChange);
    desktopMq.addEventListener("change", onTierChange);
    tabletMq.addEventListener("change", onTierChange);
    return () => {
      motionMq.removeEventListener("change", onMotionChange);
      desktopMq.removeEventListener("change", onTierChange);
      tabletMq.removeEventListener("change", onTierChange);
    };
  }, []);

  // IntersectionObserver gate — the scroll listener below only runs while
  // the wrapper is within one viewport height of the visible area, per
  // the brief's own "Performance: active only near the viewport".
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "100% 0px 100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Cleared on unmount/exit unconditionally (not just "while inView") so
  // navigating away mid-animation never leaves the header permanently
  // forced to overlay.
  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.forceHeaderOverlay;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrapper || !stage) return;

    function computeAndApply() {
      if (!wrapper || !stage) return;
      const vh = window.innerHeight;
      const expandPx = (EXPAND_LENGTH_VH / 100) * vh;
      const holdPx = (HOLD_LENGTH_VH / 100) * vh;
      const top = wrapper.getBoundingClientRect().top;
      const scrolledIn = -top;
      const rawP = clamp01(scrolledIn / expandPx);
      const eased = EASE(rawP);
      stage.style.setProperty("--p", eased.toFixed(4));

      const stillStuck = scrolledIn <= expandPx + holdPx;
      const isFullscreenNow = rawP >= HEADER_OVERLAY_P && stillStuck;
      if (isFullscreenNow !== isFullscreenRef.current) {
        isFullscreenRef.current = isFullscreenNow;
        if (isFullscreenNow) document.documentElement.dataset.forceHeaderOverlay = "true";
        else delete document.documentElement.dataset.forceHeaderOverlay;
      }

      const contentVisibleNow = rawP >= CONTENT_REVEAL_P;
      if (contentVisibleNow !== contentVisibleRef.current) {
        contentVisibleRef.current = contentVisibleNow;
        setContentVisible(contentVisibleNow);
      }
    }

    // Correct state immediately on mount — a mid-animation page refresh
    // (or fast-scroll arriving here before this effect's first tick)
    // must not show a flash of the wrong (default) state.
    computeAndApply();

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        computeAndApply();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", computeAndApply);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", computeAndApply);
    };
  }, [reducedMotion, inView]);

  if (reducedMotion) {
    return <StaticTestimonies testimonial={testimonial} stacked={stacked} />;
  }

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ height: `calc(${EXPAND_LENGTH_VH}vh + ${HOLD_LENGTH_VH}vh + 100vh)` }}>
      <div
        ref={stageRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ backgroundColor: "var(--fig-color-neutral-0)", ["--p" as string]: 0 } as CSSProperties}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            clipPath: `inset(calc(${startInset}% * (1 - var(--p))) calc(${startInset}% * (1 - var(--p))) calc(${startInset}% * (1 - var(--p))) calc(${startInset}% * (1 - var(--p))) round calc(${START_RADIUS}px * (1 - var(--p))))`,
          }}
        >
          <div className="absolute inset-0" style={{ transform: `scale(calc(1 + ${PHOTO_SCALE_START - 1} * (1 - var(--p))))` }}>
            <Image src="/testimonials/background.webp" alt="" fill sizes="100vw" style={{ objectFit: "cover" }} />
          </div>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />

          <div
            className={stacked ? "relative flex h-full w-full items-start justify-center overflow-y-auto" : "relative flex h-full w-full items-center justify-center"}
            style={{ padding: stacked ? "40px" : "0 40px", fontFamily: "var(--font-hanken-grotesk)" }}
          >
            <div style={{ width: `min(${CONTENT_MAX_WIDTH}px, 100%)` }}>
              <TestimonyContent testimonial={testimonial} visible={contentVisible} reducedMotion={false} stacked={stacked} onNavigate={go} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
