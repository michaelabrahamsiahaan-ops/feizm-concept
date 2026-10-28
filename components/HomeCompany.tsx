"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";
import { OVERLAP_VH } from "@/components/home/overlap-config";

// ---- Tunable constants ----
const SECTION_W = 1440; // desktop (>=DESKTOP_BREAKPOINT) Figma frame width
const SECTION_H = 877; // desktop Figma frame height
const DESKTOP_BREAKPOINT = 1024;

// Viewport-fraction anchors for each effect's start/end scrollY — see the
// component doc comment for the exact formulas these feed into.
const PATTERN_START_VIEWPORT_FRACTION = 1.0; // section top at the viewport's bottom edge (100%)
const PATTERN_END_VIEWPORT_FRACTION = 0.2; // pattern's bottom edge at 20% from the viewport top
const TEXT_END_VIEWPORT_FRACTION = 0.25; // paragraph's bottom at 25% from the viewport top (non-pinned fallback only)

const APPEAR_DURATION_MS = 900;
const APPEAR_STAGGER_MS = 150;
const APPEAR_EASE = "cubic-bezier(.16,1,.3,1)"; // ease-out
const APPEAR_TRANSLATE_PX = 24;
// Small buffer added on top of the appear's own total duration before the
// transitionend-watcher's timer fallback fires — see applyAppear.
const APPEAR_WATCHER_TIMEOUT_BUFFER_MS = 50;
// Phase 2 (the sweep) must cover at least this fraction of the viewport
// height once rebased, or it's extended — non-pinned fallback only, see
// that path's own tick() comment.
const MIN_SWEEP_VIEWPORT_FRACTION = 0.4;

// ---- Pin (desktop, text fits) ----
const PIN_LENGTH_VH = 120; // extra scroll the pin holds for, after it engages
const SWEEP_END_P = 0.9; // the sweep completes by this pin-progress; 0.9->1.0 holds
// "Comfortable spacing" for the pin position check — reusing this
// project's own spacing-60 token value (not a new arbitrary number) for
// both the gap under the header and the gap above the viewport bottom.
const TEXT_TOP_GAP_PX = 60;
const TEXT_BOTTOM_GAP_PX = 60;

const GRAY: [number, number, number] = [131, 129, 129]; // --fig-color-neutral-500
const BLACK: [number, number, number] = [3, 0, 0]; // --fig-color-neutral-900 (this section's own text color)

const HEADING_TEXT = "Your Problem, Our Mission to Solve";
const PARAGRAPH_TEXT =
  "We believe in bringing the best solutions by developing meaningful partnerships across the globe and applying their expertise to successfully implement comprehensive solutions in areas of fleet management, asset tracking, safety & surveillance and transport management with IoT. With a culture of innovation and excellence, people at FeizM are relentlessly working towards addressing business challenges with real-time data visibility";

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function mapRange(v: number, a: number, b: number) {
  return clamp((v - a) / (b - a), 0, 1);
}
function rgb([r, g, b]: [number, number, number]) {
  return `rgb(${r},${g},${b})`;
}
function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}
// Same live measurement SiteHeader/ScrollLink already use for the header's
// own rendered height (site-header.tsx publishes it as this CSS custom
// property via a ResizeObserver; globals.css gives it a same-valued
// fallback for the one frame before that effect runs) — not a separate
// guess, so this can never drift from the header's actual trigger point.
function headerHeightPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Renders `text` as plain whitespace + one <span> per word, each word's
 * ref collected into `wordRefs` at `startIndex + its position` — so a
 * heading block and a paragraph block can share ONE continuous reading-
 * order word sequence for the sweep, while still wrapping naturally
 * (only the words are spans; the whitespace between them is a plain text
 * node, so the browser's own line-breaking is untouched, and screen
 * readers see the actual words as ordinary text content — the sweep only
 * ever touches each span's `color`).
 */
function SweepWords({
  text,
  startIndex,
  wordRefs,
}: {
  text: string;
  startIndex: number;
  wordRefs: MutableRefObject<(HTMLSpanElement | null)[]>;
}) {
  const tokens = text.split(/(\s+)/);
  let i = startIndex;
  const nodes: ReactNode[] = tokens.map((tok, k) => {
    if (tok === "" || /^\s+$/.test(tok)) return tok;
    const idx = i++;
    return (
      <span
        key={k}
        ref={(el) => {
          wordRefs.current[idx] = el;
        }}
        style={{ color: rgb(GRAY) }}
      >
        {tok}
      </span>
    );
  });
  return <>{nodes}</>;
}

const headingWordCount = wordCount(HEADING_TEXT);

/**
 * "Company" section of the Feizm Homepage ("Home / 02 Company"), with a
 * scroll-linked reveal (not in Figma — a separate animation spec layered
 * on the static build): its decorative pattern sweeps gray->orange
 * top-to-bottom, the heading/paragraph fade in once, and the text itself
 * sweeps gray->black word by word in reading order — and, new in this
 * revision, the section PINS (sticky) once the text block is fully in
 * place so the whole appear+sweep sequence plays with the user unable to
 * scroll it away mid-animation. See "Pin" below for the structural
 * change and why; everything about pattern-fill/word-sweep mechanics
 * themselves is unchanged from before.
 *
 * ---- Overlap with the Hero (curtain reveal) — UNCHANGED ----
 * `margin-top: -OVERLAP_VHvh` (plus `position: relative` and a positive
 * `z-index`), now on the OUTER WRAPPER (`wrapperRef`) rather than directly
 * on the visual section box, still pulls this component's box up by the
 * same amount HomeHeroParallax's own wrapper was made taller by
 * (OVERLAP_VH, from the shared `overlap-config.ts`) — the two cancel
 * exactly, making this section slide up and visibly cover the Hero's
 * still-sticky final frame. Moving this margin from the section itself to
 * the new outer wrapper preserves the exact same curtain timing (the
 * math never depended on this component's own height — see
 * HomeHeroParallax's own doc comment) and is what makes the curtain ->
 * pin hand-off a single continuous motion: the wrapper scrolls normally
 * (1:1, same curtain slide as before) right up until its own top crosses
 * the pin's sticky `top` offset, at which point CSS position:sticky
 * engages by definition exactly where the natural motion left off — no
 * separate synchronization needed, no jump possible.
 *
 * ---- Pin: structure ----
 * `wrapperRef` (outer, normal flow, carries the curtain margin) wraps
 * `pinRef` (inner, `id="home-company"`, the actual 1440x877 visual box —
 * everything that used to be the single top-level section now lives
 * here unchanged). When pinned, the wrapper's CSS height becomes
 * `877px + PIN_LENGTH_VH` (the same `pinHeight + scrubDistance` formula
 * HomeHeroParallax/StatsSection's own wrappers use) and the pin gets
 * `position: sticky`; when not pinned (see "When NOT to pin" below), the
 * wrapper is just `height: auto` and the pin is `position: relative` —
 * i.e. exactly the single-box structure this component had before this
 * change, byte-for-byte the same rendered box.
 *
 * ---- Pin: WHERE it sticks (not simply "top: header height") ----
 * At 877px tall, this section is taller than the space below the header
 * on a 900px (or shorter) viewport — sticking it at `top: header height`
 * the way Stats/Hero do would push the heading UNDER the header. Instead,
 * a `useLayoutEffect` measures (on mount and on resize) the text block's
 * own rendered height (paragraph bottom − heading top) and the text
 * block's own offset within the pin box (heading top − pin top) — both
 * scroll-position-independent, valid whether or not the pin currently
 * happens to be stuck — and computes the sticky `top` so that:
 *   headingTop (viewport) = header height + TEXT_TOP_GAP_PX
 * which, worked back through the measured offset, gives
 *   stickyTopPx = (header height + TEXT_TOP_GAP_PX) − textTopOffset
 * — routinely NEGATIVE (the pin's own top, and the decorative Pattern
 * living at that top, sitting above the visible viewport once stuck;
 * explicitly fine per the brief — "the decorative Pattern at the top may
 * be partially cropped"). The same measurement checks whether the
 * resulting paragraph bottom still clears `TEXT_BOTTOM_GAP_PX` above the
 * viewport's own bottom; if it doesn't (`textFits` false), this falls
 * back to no pin entirely — see "When NOT to pin".
 *
 * ---- Pin: progress P and the appear/sweep sequence inside it ----
 * `pinProgress()` is the same sticky-scrub formula as Hero/Stats
 * (`span = wrapper.height − pin.height`), generalized for a NON-zero
 * (here, negative) sticky offset — Hero/Stats both stick at
 * approximately `top: 0`, where `-rect.top/span` already is correct, but
 * that formula is only an approximation once the offset is meaningfully
 * non-zero, which IS the case here. The corrected version:
 *   P = clamp((stickyTopPx − wrapper.rect.top) / span, 0, 1)
 * — P=0 exactly when the wrapper's natural top crosses the sticky offset
 * (the pin visually engages), P=1 exactly at release, matching the
 * actual CSS sticky mechanics instead of assuming they sit at the
 * viewport's top edge.
 *   P=0: `appearedRef` latches (same one-way latch as before) and the
 *     heading/paragraph fade in (900ms, then +150ms stagger) — identical
 *     mechanism to the pre-pin version, just triggered by
 *     "pin has engaged" instead of "scrollY past a threshold".
 *   Sweep held at `applyTextSweep(0)` until the appear's own
 *     `transitionend` (or its timeout fallback) fires — same
 *     `sweepUnlockedRef` latch as before. The moment it unlocks, the
 *     rebase value is `pinProgress()` at that instant (or `-Infinity`,
 *     meaning "no rebase, map the natural 0->SWEEP_END_P range directly",
 *     for the same two cases as before: page loaded already past the
 *     trigger, or the pin has already fully scrolled past — see
 *     `applyAppear`/`unlockSweep`, shared verbatim between both paths).
 *     From then on, `tp = mapRange(P, rebaseP, SWEEP_END_P)` — reversible,
 *     and since the pin provides a fixed, generous (120vh) range by
 *     construction, there's no reachability concern to guard here the
 *     way the non-pinned fallback's `MIN_SWEEP_VIEWPORT_FRACTION` clamp
 *     has to (that clamp existed specifically because a non-pinned
 *     section's remaining scroll room depends on page content after it;
 *     a pin brings its own self-contained room regardless).
 *   P in [SWEEP_END_P, 1]: `mapRange` clamps at tp=1 automatically — the
 *     "hold" is simply this clamped tail, no separate code needed.
 * Pattern (`--p`) is UNCHANGED in mechanism, but its end point is now
 * additionally clamped to never exceed the scrollY where the pin
 * engages (`pinEngageScrollY = wrapperTopAbs − stickyTopPx`), satisfying
 * "the pattern fill should be complete by the time the pin starts" by
 * construction rather than hoping the existing viewport-fraction numbers
 * happen to finish in time.
 *
 * ---- When NOT to pin ----
 * `effectivelyPinned = isDesktop && textFits && !reducedMotion`. Any of:
 * below DESKTOP_BREAKPOINT, the measured text block doesn't clear both
 * gaps even at this viewport height, or reduced motion — falls back to
 * EXACTLY this component's pre-pin behavior: wrapper `height: auto`, pin
 * `position: relative`, pattern/appear/sweep driven by plain scrollY
 * thresholds (the "Two-phase sequencing"/"Reachability guarantee"
 * sections below describe that path, unchanged). `textFits` is computed
 * by the same measurement effect as the sticky-top offset, so narrow
 * viewports (where `isDesktop` is already false) never even evaluate the
 * fit — mobile is unconditionally no-pin, consistent with the "Below
 * DESKTOP_BREAKPOINT" responsive note further down.
 *
 * ---- Two-phase sequencing (non-pinned fallback path) ----
 * The sweep (--tp) is gated behind the appear finishing — they used to
 * run concurrently (the sweep could start moving words toward black while
 * they were still fading in), which read as the text changing color
 * mid-fade. Now:
 *   Phase 1 (appear, time-based): while it is running — or hasn't
 *     started yet — every word is forced to the flat gray start color
 *     (`applyTextSweep(0)`), full stop, no matter how far the user keeps
 *     scrolling.
 *   Phase 2 (sweep, scroll-linked): unlocked only once the paragraph's
 *     own appear transition actually finishes — a real `transitionend`
 *     on the paragraph, with a timer fallback in case the event never
 *     fires. The moment it unlocks, the rebase value records either the
 *     current scrollY (the common case) or `-Infinity` (no rebase — page
 *     loaded already past the trigger, or the section has scrolled fully
 *     off-screen by the time the timer fires) for the same reasons
 *     documented on `unlockSweep` itself.
 *   Every tick, once unlocked, the EFFECTIVE range re-derives from that
 *   one latched value: `effStart = max(textStartY, rebaseValue)`,
 *   `effEnd = textEndY`, then if `effEnd - effStart` is under
 *   `MIN_SWEEP_VIEWPORT_FRACTION` of the viewport height, `effEnd` is
 *   pushed out that far (capped at `maxScrollY`) so the sweep is never
 *   rushed.
 * Once unlocked, `sweepUnlockedRef` never re-locks — scrolling back up
 * above the section and down again does not replay the appear and the
 * sweep simply keeps following its own (by-then-fixed) effective range.
 *
 * Applied the same way as before: the pattern is two stacked copies of
 * the same SVG (a permanent grayscale base layer + the real orange layer
 * masked on top, the mask's boundary written directly each tick as
 * `${p*100}%`), and each word span's `color` is interpolated gray->black
 * over a window centered on `tp * wordCount` reaching that word's own
 * index, so the sweep visits words strictly in reading order (heading
 * first). Both written via direct DOM style per tick, not through React
 * state/CSS custom properties — same "measure/paint split, direct writes
 * for continuous values" convention used throughout this project.
 *
 * ---- Appear (one-way latch, not a range) ----
 * Checked once on mount too: if the page loads already past the trigger
 * (pin already engaged, or past the scrollY threshold in the non-pinned
 * path — e.g. a mid-pin/mid-section refresh), both heading and paragraph
 * are set straight to their visible end state with no transition, so
 * there's no stray animation on load.
 *
 * ---- Reachability guarantee (non-pinned fallback only) ----
 * Every END threshold (`patternEndY`, `textEndY`) is clamped to the
 * document's actual max scrollY, exactly like the Fleet USP divider
 * dot's own fix for the same class of bug. Recomputed on resize AND via
 * a ResizeObserver on `document.body`.
 *
 * ---- Header ----
 * No changes, nothing section-specific: SiteHeader's own scroll-driven
 * trigger (site-header.tsx) already reads `#home-company`'s live
 * `getBoundingClientRect().top` every tick and flips solid once it's
 * <= the header's height — `id="home-company"` now lives on `pinRef`
 * (the actual visual box) rather than the wrapper, so this keeps reading
 * the right element. While pinned, the pin's own top sits at
 * `stickyTopPx` (negative), comfortably <= header height the entire
 * hold, so the header stays solid throughout without any extra code.
 *
 * ---- Responsive ----
 * Below DESKTOP_BREAKPOINT the fixed 1440x877 box becomes fluid (full
 * width, auto height) — this section's own opt-out of this project's
 * usual "fixed 1440px" convention — and, per "When NOT to pin" above,
 * never pins. The non-pinned scroll-linked math itself doesn't change by
 * breakpoint — it's already expressed in viewport fractions, so it works
 * the same at any width/height (confirmed at 1440x900, 1024x768 and
 * 375x812 before this change; this change only adds the pin path for
 * desktop widths where the text fits, so those lower-breakpoint results
 * still hold).
 *
 * ---- Reduced motion ----
 * No pin (see `effectivelyPinned`), no scroll listener at all — renders
 * the final state directly (pattern fully orange, text fully appeared
 * and fully black, no transition).
 */
export function HomeCompany() {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const patternOrangeRef = useRef<HTMLImageElement | null>(null);
  const headingWrapRef = useRef<HTMLHeadingElement | null>(null);
  const paragraphWrapRef = useRef<HTMLParagraphElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const appearedRef = useRef(false);
  // Phase-2 gate — see the "Two-phase sequencing"/"Pin" doc comments
  // above. `rebaseRef` holds whichever unit the active path uses
  // (scrollY for the non-pinned fallback, pin progress P for the pinned
  // path) — each path only ever reads it in its own consistent unit.
  const sweepUnlockedRef = useRef(false);
  const rebaseRef = useRef(-Infinity);
  const maxScrollYRef = useRef(0);

  // SSR/first-client-render defaults: desktop width, not reduced motion,
  // text assumed to fit — hydration-safety (matchMedia/layout measurement
  // have no SSR-safe value), same tradeoff as HomeHeroParallax's own
  // reducedMotion state. All corrected post-mount, before first paint.
  const [isDesktop, setIsDesktop] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [textFits, setTextFits] = useState(true);
  const [stickyTopPx, setStickyTopPx] = useState(0);

  const effectivelyPinned = isDesktop && textFits && !reducedMotion;

  useLayoutEffect(() => {
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const widthMq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia is browser-only, no SSR-safe value (see doc comment); covers both setState calls below
    setReducedMotion(motionMq.matches);
    setIsDesktop(widthMq.matches);
    const onMotionChange = () => setReducedMotion(motionMq.matches);
    const onWidthChange = () => setIsDesktop(widthMq.matches);
    motionMq.addEventListener("change", onMotionChange);
    widthMq.addEventListener("change", onWidthChange);
    return () => {
      motionMq.removeEventListener("change", onMotionChange);
      widthMq.removeEventListener("change", onWidthChange);
    };
  }, []);

  // Measures whether the text block fits comfortably under the header at
  // the current viewport height, and the sticky `top` offset that makes
  // it do so — see the "Pin: WHERE it sticks" doc comment above. Both
  // measurements are scroll-position-independent (valid whether or not
  // the pin currently happens to be stuck), so this only needs to re-run
  // on mount, when `isDesktop` changes, or on resize.
  useLayoutEffect(() => {
    const pin = pinRef.current;
    const heading = headingWrapRef.current;
    const paragraph = paragraphWrapRef.current;
    if (!pin || !heading || !paragraph) return;

    function measureFit() {
      if (!isDesktop) {
        setTextFits(false);
        return;
      }
      // Before the appear has played, the heading/paragraph still carry
      // their pre-appear `translateY(APPEAR_TRANSLATE_PX)` — measuring
      // through that would offset every downstream number by 24px
      // (confirmed). Worse: both elements have a STANDING
      // `transition: transform 900ms ...` from `appearStyle()` (always
      // present, not just while actually appearing), so a plain
      // `style.transform = "translateY(0)"` write doesn't take effect
      // instantly — the browser animates toward it, so a `
      // getBoundingClientRect()` read in the very next line still sees
      // the OLD (pre-write) position (confirmed directly: computed
      // transform read back as `translateY(24px)` immediately after
      // writing `translateY(0)`). Same class of bug `applyAppear`'s own
      // `instant` branch already solves, same fix: force `transition:
      // none` + a reflow (`void el.offsetHeight`) before writing the
      // neutral transform, so the write actually commits as a real
      // instant frame before this measurement reads it. All four of
      // these mutations are restored in the same synchronous tick —
      // nothing else re-renders in between — and once the appear HAS
      // played this whole dance is already a no-op (transform is already
      // translateY(0), no transition left to fight).
      const prevHeadingTransition = heading!.style.transition;
      const prevParagraphTransition = paragraph!.style.transition;
      const prevHeadingTransform = heading!.style.transform;
      const prevParagraphTransform = paragraph!.style.transform;
      heading!.style.transition = "none";
      paragraph!.style.transition = "none";
      heading!.style.transform = "translateY(0)";
      paragraph!.style.transform = "translateY(0)";
      void heading!.offsetHeight;
      void paragraph!.offsetHeight;
      const pinRect = pin!.getBoundingClientRect();
      const headingRect = heading!.getBoundingClientRect();
      const paragraphRect = paragraph!.getBoundingClientRect();
      heading!.style.transform = prevHeadingTransform;
      paragraph!.style.transform = prevParagraphTransform;
      heading!.style.transition = prevHeadingTransition;
      paragraph!.style.transition = prevParagraphTransition;

      const textTopOffset = headingRect.top - pinRect.top;
      const textBlockHeight = paragraphRect.bottom - headingRect.top;
      const vh = window.innerHeight;
      const desiredHeadingTop = headerHeightPx() + TEXT_TOP_GAP_PX;
      const desiredParagraphBottom = desiredHeadingTop + textBlockHeight;
      setTextFits(desiredParagraphBottom <= vh - TEXT_BOTTOM_GAP_PX);
      setStickyTopPx(Math.round(desiredHeadingTop - textTopOffset));
    }

    measureFit();
    window.addEventListener("resize", measureFit);
    return () => window.removeEventListener("resize", measureFit);
  }, [isDesktop]);

  const [inView, setInView] = useState(false);
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "100% 0px 100% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const pin = pinRef.current;
    const pattern = patternOrangeRef.current;
    const heading = headingWrapRef.current;
    const paragraph = paragraphWrapRef.current;
    if (!wrapper || !pin || !pattern || !heading || !paragraph) return;

    function applyPattern(p: number) {
      const pct = `${p * 100}%`;
      const mask = `linear-gradient(to bottom, black 0, black ${pct}, transparent ${pct})`;
      pattern!.style.maskImage = mask;
      pattern!.style.webkitMaskImage = mask;
    }

    function applyTextSweep(tp: number) {
      const n = wordRefs.current.length;
      if (n === 0) return;
      const target = tp * n;
      for (let i = 0; i < n; i++) {
        const el = wordRefs.current[i];
        if (!el) continue;
        const local = clamp(target - i, 0, 1);
        const c: [number, number, number] = [
          lerp(GRAY[0], BLACK[0], local),
          lerp(GRAY[1], BLACK[1], local),
          lerp(GRAY[2], BLACK[2], local),
        ];
        el.style.color = rgb(c);
      }
    }

    // Hoisted so the outer effect's cleanup can always reach whichever
    // watcher (transitionend listener + its timer fallback) is currently
    // pending, even though applyAppear only runs once, at an arbitrary
    // tick well after this effect's own setup. Shared between both paths.
    let appearTimeoutId: number | null = null;
    let appearTransitionTarget: HTMLElement | null = null;
    let onParagraphTransitionEnd: ((e: TransitionEvent) => void) | null = null;
    function clearAppearWatchers() {
      if (appearTimeoutId !== null) {
        window.clearTimeout(appearTimeoutId);
        appearTimeoutId = null;
      }
      if (appearTransitionTarget && onParagraphTransitionEnd) {
        appearTransitionTarget.removeEventListener("transitionend", onParagraphTransitionEnd);
      }
      appearTransitionTarget = null;
      onParagraphTransitionEnd = null;
    }

    // `getCurrentValue` lets both paths share this exact logic while each
    // rebases in its own unit (scrollY vs. pin progress P) — see the
    // "Pin" doc comment above for why -Infinity means "no rebase".
    function unlockSweep(getCurrentValue: () => number) {
      if (sweepUnlockedRef.current) return;
      const offScreen = pin!.getBoundingClientRect().bottom <= 0;
      rebaseRef.current = offScreen ? -Infinity : getCurrentValue();
      sweepUnlockedRef.current = true;
      clearAppearWatchers();
    }

    function applyAppear(instant: boolean, getCurrentValue: () => number) {
      if (appearedRef.current) return;
      appearedRef.current = true;
      const reveal = (el: HTMLElement, delayMs: number) => {
        if (instant) {
          // Page loaded already past the trigger (e.g. a mid-pin/mid-
          // section refresh) — jump straight to the end state with no
          // transition at all, rather than letting the 900ms ease-out
          // play on load. Restored afterward so this never permanently
          // disables the element's transition.
          el.style.transition = "none";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          void el.offsetHeight;
          el.style.transition = "";
        }
        el.style.transitionDelay = `${delayMs}ms`;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      };
      reveal(heading!, 0);
      reveal(paragraph!, APPEAR_STAGGER_MS);

      if (instant) {
        rebaseRef.current = -Infinity;
        sweepUnlockedRef.current = true;
        return;
      }

      onParagraphTransitionEnd = (e: TransitionEvent) => {
        if (e.target !== paragraph) return;
        unlockSweep(getCurrentValue);
      };
      appearTransitionTarget = paragraph;
      paragraph!.addEventListener("transitionend", onParagraphTransitionEnd);
      appearTimeoutId = window.setTimeout(
        () => unlockSweep(getCurrentValue),
        APPEAR_STAGGER_MS + APPEAR_DURATION_MS + APPEAR_WATCHER_TIMEOUT_BUFFER_MS,
      );
    }

    // ---- Reduced motion: final state, no listeners at all ----
    if (reducedMotion) {
      applyPattern(1);
      applyAppear(true, () => 0);
      applyTextSweep(1);
      return;
    }

    if (!inView) return;

    let raf = 0;
    let ticking = false;
    let isInitialTick = true;

    if (effectivelyPinned) {
      // ---- PINNED PATH ----
      let patternStartY = 0;
      let patternEndY = 1;

      function pinProgress() {
        const rect = wrapper!.getBoundingClientRect();
        const span = rect.height - pin!.clientHeight;
        // Generalized for a non-zero (here, negative) sticky offset —
        // see this component's own doc comment for why the simpler
        // Hero/Stats `-rect.top/span` formula isn't precise enough here.
        return span > 0 ? clamp((stickyTopPx - rect.top) / span, 0, 1) : 0;
      }
      function pinHasEngaged() {
        return wrapper!.getBoundingClientRect().top <= stickyTopPx;
      }

      function measure() {
        const vh = window.innerHeight;
        const maxScrollY = Math.max(0, document.documentElement.scrollHeight - vh);
        maxScrollYRef.current = maxScrollY;

        const wrapperTopAbs = wrapper!.getBoundingClientRect().top + window.scrollY;
        const patternRect = pattern!.getBoundingClientRect();
        const patternBottomAbs = patternRect.top + window.scrollY + patternRect.height;

        patternStartY = wrapperTopAbs - PATTERN_START_VIEWPORT_FRACTION * vh;
        const patternNaturalEnd = patternBottomAbs - PATTERN_END_VIEWPORT_FRACTION * vh;
        // Must finish by the moment the pin engages — see this
        // component's own "Pin" doc comment.
        const pinEngageScrollY = wrapperTopAbs - stickyTopPx;
        patternEndY = Math.min(patternNaturalEnd, maxScrollY, pinEngageScrollY);
        patternEndY = Math.max(patternEndY, patternStartY + 1);
      }

      const tick = () => {
        const scrollY = window.scrollY;
        applyPattern(mapRange(scrollY, patternStartY, patternEndY));
        if (pinHasEngaged()) applyAppear(isInitialTick, pinProgress);

        if (!sweepUnlockedRef.current) {
          applyTextSweep(0);
        } else {
          const p = pinProgress();
          const effStart = Math.max(rebaseRef.current, 0);
          if (SWEEP_END_P <= effStart) {
            applyTextSweep(1);
          } else {
            applyTextSweep(mapRange(p, effStart, SWEEP_END_P));
          }
        }
        ticking = false;
      };
      const update = () => {
        measure();
        tick();
        isInitialTick = false;
      };

      update();

      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        raf = requestAnimationFrame(tick);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", update);
      const bodyRO = new ResizeObserver(update);
      bodyRO.observe(document.body);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", update);
        bodyRO.disconnect();
        clearAppearWatchers();
      };
    }

    // ---- NON-PINNED FALLBACK PATH (below DESKTOP_BREAKPOINT, text
    // doesn't fit even at desktop width, or reduced motion handled
    // above) — unchanged from this component's pre-pin behavior. ----
    let patternStartY = 0;
    let patternEndY = 1;
    let textStartY = 0;
    let textEndY = 1;

    function measure() {
      const vh = window.innerHeight;
      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - vh);
      maxScrollYRef.current = maxScrollY;

      const sectionTopAbs = pin!.getBoundingClientRect().top + window.scrollY;
      const patternRect = pattern!.getBoundingClientRect();
      const patternBottomAbs = patternRect.top + window.scrollY + patternRect.height;
      const paragraphBottomAbs = paragraph!.getBoundingClientRect().top + window.scrollY + paragraph!.getBoundingClientRect().height;

      patternStartY = sectionTopAbs - PATTERN_START_VIEWPORT_FRACTION * vh;
      const patternNaturalEnd = patternBottomAbs - PATTERN_END_VIEWPORT_FRACTION * vh;
      patternEndY = Math.min(patternNaturalEnd, maxScrollY);
      patternEndY = Math.max(patternEndY, patternStartY + 1);

      textStartY = sectionTopAbs - headerHeightPx();
      const textNaturalEnd = paragraphBottomAbs - TEXT_END_VIEWPORT_FRACTION * vh;
      textEndY = Math.min(textNaturalEnd, maxScrollY);
      textEndY = Math.max(textEndY, textStartY + 1);
    }

    const tick = () => {
      const scrollY = window.scrollY;
      applyPattern(mapRange(scrollY, patternStartY, patternEndY));
      if (scrollY >= textStartY) applyAppear(isInitialTick, () => window.scrollY);

      if (!sweepUnlockedRef.current) {
        applyTextSweep(0);
      } else {
        const vh = window.innerHeight;
        const effStart = Math.max(textStartY, rebaseRef.current);
        let effEnd = textEndY;
        if (effEnd - effStart < MIN_SWEEP_VIEWPORT_FRACTION * vh) {
          effEnd = Math.min(maxScrollYRef.current, effStart + MIN_SWEEP_VIEWPORT_FRACTION * vh);
        }
        effEnd = Math.max(effEnd, effStart + 1);
        applyTextSweep(mapRange(scrollY, effStart, effEnd));
      }
      ticking = false;
    };
    const update = () => {
      measure();
      tick();
      isInitialTick = false;
    };

    update();

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    const bodyRO = new ResizeObserver(update);
    bodyRO.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      bodyRO.disconnect();
      clearAppearWatchers();
    };
  }, [reducedMotion, inView, effectivelyPinned, stickyTopPx]);

  const appearStyle = (): CSSProperties =>
    reducedMotion
      ? { opacity: 1, transform: "none" }
      : {
          opacity: 0,
          transform: `translateY(${APPEAR_TRANSLATE_PX}px)`,
          transition: `opacity ${APPEAR_DURATION_MS}ms ${APPEAR_EASE}, transform ${APPEAR_DURATION_MS}ms ${APPEAR_EASE}`,
        };

  const wrapperHeight = effectivelyPinned ? `calc(${SECTION_H}px + ${PIN_LENGTH_VH}vh)` : "auto";

  return (
    <section
      ref={wrapperRef}
      className="relative w-full"
      style={{
        height: wrapperHeight,
        // Curtain-over-the-hero overlap — see the doc comment above.
        marginTop: `-${OVERLAP_VH}vh`,
        zIndex: 1,
      }}
    >
      <div
        ref={pinRef}
        id="home-company"
        className="w-full overflow-hidden"
        style={{
          ...(effectivelyPinned ? { position: "sticky", top: stickyTopPx } : { position: "relative" }),
          width: isDesktop ? SECTION_W : "100%",
          height: isDesktop ? SECTION_H : "auto",
          justifyContent: isDesktop ? "flex-end" : undefined,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--fig-color-neutral-0)",
          paddingLeft: "var(--fig-spacing-40)",
          paddingRight: "var(--fig-spacing-40)",
          paddingTop: "var(--fig-spacing-60)",
          paddingBottom: "var(--fig-spacing-60)",
          fontFamily: "var(--font-hanken-grotesk)",
        }}
      >
        {/* Base (always-visible) grayscale layer + the real orange layer
            revealed on top via a mask that grows top-to-bottom with --p —
            see the doc comment above. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home-company/pattern.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-0 top-0"
          style={{ filter: "grayscale(1)" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={patternOrangeRef}
          src="/home-company/pattern.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-0 top-0"
          style={{
            maskImage: reducedMotion ? "none" : "linear-gradient(to bottom, black 0, transparent 0)",
            WebkitMaskImage: reducedMotion ? "none" : "linear-gradient(to bottom, black 0, transparent 0)",
          }}
        />

        <div className="relative flex flex-col" style={{ gap: "var(--fig-spacing-60)" }}>
          <h2
            ref={headingWrapRef}
            className="font-normal"
            style={{ fontSize: "44px", lineHeight: "44.9px", ...appearStyle() }}
          >
            <SweepWords text={HEADING_TEXT} startIndex={0} wordRefs={wordRefs} />
          </h2>
          <p
            ref={paragraphWrapRef}
            className="font-normal"
            style={{ fontSize: "44px", lineHeight: "49.9px", ...appearStyle() }}
          >
            <SweepWords text={PARAGRAPH_TEXT} startIndex={headingWordCount} wordRefs={wordRefs} />
          </p>
        </div>
      </div>
    </section>
  );
}
