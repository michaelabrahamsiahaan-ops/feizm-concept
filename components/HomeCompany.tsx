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
const TEXT_END_VIEWPORT_FRACTION = 0.25; // paragraph's bottom at 25% from the viewport top

const APPEAR_DURATION_MS = 900;
const APPEAR_STAGGER_MS = 150;
const APPEAR_EASE = "cubic-bezier(.16,1,.3,1)"; // ease-out
const APPEAR_TRANSLATE_PX = 24;
// Small buffer added on top of the appear's own total duration before the
// transitionend-watcher's timer fallback fires — see applyAppear.
const APPEAR_WATCHER_TIMEOUT_BUFFER_MS = 50;
// Phase 2 (the sweep) must cover at least this fraction of the viewport
// height once rebased, or it's extended — see the tick()/rebase comment.
const MIN_SWEEP_VIEWPORT_FRACTION = 0.4;

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
 * on the static build): as the section scrolls through the viewport
 * normally (NOT pinned — see below), its decorative pattern sweeps
 * gray->orange top-to-bottom, the heading/paragraph fade in once, and the
 * text itself sweeps gray->black word by word in reading order.
 *
 * Static build details (copy/typography/tokens/pattern asset) are
 * unchanged from the original read of node 148:45272 — see git history.
 * This comment covers the animation layer, which replaces an earlier
 * pinned version of this section (also see git history) — the section
 * itself is NOT pinned/sticky; it's back in normal document flow at its
 * Figma height (1440x877 on desktop), confirmed not to leave any gap or
 * shift anything below it.
 *
 * ---- Overlap with the Hero (curtain reveal) ----
 * `margin-top: -OVERLAP_VHvh` (plus `position: relative` and a positive
 * `z-index`) pulls this section's box up by the same amount
 * HomeHeroParallax's own wrapper was made taller by (OVERLAP_VH, from the
 * shared `overlap-config.ts` — kept in one place so the two values can
 * never drift apart) — the two cancel exactly, so this section's
 * EFFECTIVE on-screen position ends up identical to where it always sat
 * before the Hero's hold existed. That's deliberate, not a missed
 * opportunity: it's what makes this section slide up and visibly cover
 * the Hero's still-sticky final frame (instead of just appearing
 * abruptly once the Hero's sticky hold releases, which is what pure
 * extension-with-no-pull-up produces — the two need to move together,
 * one scroll pixel at a time, for the curtain edge itself to be visible
 * sliding at all), while keeping every one of this section's OWN
 * animation thresholds below completely unaffected (they're computed
 * from this section's live, actual `getBoundingClientRect()` every time,
 * and that position is — again, by construction — unchanged from before
 * the overlap feature existed, so nothing below needed retuning; verified
 * directly, not just reasoned about — see the PR this landed in). No
 * transform is used for this (a transform would be the more "obviously
 * correct" tool for a pure visual slide, but it would also distort every
 * `getBoundingClientRect()` read this section's own measure() takes of
 * ITSELF while a curtain transform was still resolving — margin avoids
 * that whole class of timing bug by never touching this section's real,
 * stable layout position at all).
 *
 * ---- Progress values ----
 * Two independent scroll-linked values drive everything, each mapped
 * from a *fixed* scrollY range computed once (not re-derived every
 * frame) from where the relevant element's edge crosses a given fraction
 * of the viewport height — i.e. literally "when element edge X reaches
 * viewport position Y%", per the spec:
 *   --p  (pattern fill):  0 at the scrollY where the SECTION's own top
 *        reaches the viewport's bottom edge (100%); 1 at the scrollY
 *        where the PATTERN's own bottom edge reaches 20% from the
 *        viewport's top.
 *   --tp (text sweep):    0 at the scrollY where the SECTION's own top
 *        reaches the header's bottom edge (same trigger SiteHeader's own
 *        overlay->solid switch uses, and the same scrollY the appear
 *        trigger below uses) — i.e. only once the Hero/Company overlap
 *        (see that doc comment below) has fully closed and this section
 *        fills the screen, not while it's still sliding up over the
 *        Hero; 1 at the scrollY where the PARAGRAPH's bottom reaches 25%
 *        from the viewport's top — THIS pair of endpoints is only the
 *        *configured* range; see "Two-phase sequencing" below for how
 *        it's actually applied.
 * --p is a pure function of scrollY (computed fresh from the live scroll
 * position every tick, not accumulated/eased), so scrolling back up
 * reverses it exactly.
 *
 * ---- Two-phase sequencing (appear, then sweep) ----
 * The sweep (--tp) is gated behind the appear finishing — they used to
 * run concurrently (the sweep could start moving words toward black while
 * they were still fading in), which read as the text changing color
 * mid-fade. Now:
 *   Phase 1 (appear, time-based, below): while it is running — or hasn't
 *     started yet — every word is forced to the flat gray start color
 *     (`applyTextSweep(0)`), full stop, no matter how far the user keeps
 *     scrolling.
 *   Phase 2 (sweep, scroll-linked): unlocked (`sweepUnlockedRef`, a
 *     one-way latch like `appearedRef` itself) only once the paragraph's
 *     own appear transition actually finishes — a real `transitionend`
 *     on the paragraph, with a timer fallback (total appear duration +
 *     a small buffer) in case the event never fires (e.g. the tab was
 *     backgrounded, or a browser quirk drops it). The moment it unlocks,
 *     `completionScrollYRef` records either the scrollY at that instant
 *     (the common case) or `-Infinity` (meaning "don't rebase, use the
 *     configured range as-is") for two situations where rebasing would
 *     be wrong:
 *       - instant/no-gating path (page loaded already past the appear
 *         threshold — see applyAppear's `instant` branch): the spec
 *         wants the sweep applied directly at the correct progress, no
 *         phase gating at all.
 *       - the section has already scrolled fully off-screen (its own
 *         bottom <= 0) by the time the timer/transitionend fires, e.g.
 *         from very fast scrolling: rebasing to "now" would restart the
 *         sweep from gray on a section the user can no longer see and
 *         isn't scrolling back into on purpose. Using the *unrebased*
 *         configured range instead makes it resolve to its correct
 *         (already fully swept) state immediately, matching the spec's
 *         "jump to the correct state for the current position" case.
 *   Every tick, once unlocked, the EFFECTIVE range re-derives from that
 *   one latched value — not a second mutable range — so a later resize
 *   (which recomputes the *configured* `textStartY`/`textEndY` from
 *   fresh layout via `measure()`) still rebases correctly instead of
 *   silently reverting: `effStart = max(textStartY, completionScrollY)`,
 *   `effEnd = textEndY`, then if `effEnd - effStart` is under
 *   `MIN_SWEEP_VIEWPORT_FRACTION` of the viewport height, `effEnd` is
 *   pushed out that far (capped at `maxScrollY`, same reachability
 *   clamp as everything else here) so the sweep is never rushed. This is
 *   exactly the spec's "no jump" rule: if the user kept scrolling during
 *   the fade, `effStart` lands at wherever they are *right when Phase 1
 *   finishes*, so the very next tick's progress is 0 (all still gray)
 *   and grows smoothly from there — never a burst of words snapping to
 *   black at once.
 * Once unlocked, `sweepUnlockedRef` never re-locks — scrolling back up
 * above the section and down again does not replay the appear (already
 * true of `appearedRef`) and the sweep simply keeps following its own
 * (by-then-fixed) effective range, fully reversible within it.
 *
 * Applied the same way as before: the pattern is two stacked copies of
 * the same SVG (a permanent grayscale base layer + the real orange layer
 * masked on top, the mask's boundary written directly each tick as
 * `${p*100}%`), and each word span's `color` is interpolated gray->black
 * over a window centered on `tp * wordCount` reaching that word's own
 * index, so the sweep visits words strictly in reading order (heading
 * first). Both written via direct DOM style per tick, not through React
 * state/CSS custom properties — same "measure/paint split, direct writes
 * for continuous values" convention already used by the Fleet USP
 * divider dot and the Hero's own progress bars elsewhere in this project
 * (functionally identical result to driving them through --p/--tp/--i
 * custom properties and a CSS formula; this is the technique already
 * established and proven in this codebase, not a new one).
 *
 * ---- Appear (one-way latch, not a range) ----
 * The moment scrollY first reaches the SAME threshold `--tp`'s 0-point
 * uses (section top at the header's bottom edge — i.e. the Hero/Company
 * overlap has fully closed), `appearedRef` latches true and the heading
 * fades/slides in (opacity + translateY 24px->0, 900ms ease-out), the
 * paragraph 150ms later. Before this point the text stays fully hidden —
 * including while the section is still sliding up over the Hero, partly
 * visible but not yet "settled" — only the pattern (`--p`, unaffected by
 * any of this) is already changing color during that slide. Once
 * latched, always latched — scrolling back up never re-hides or re-plays
 * it, not even back past the header threshold while the Hero becomes
 * visible again underneath. Checked once on mount too: if the page loads
 * already past that scrollY (e.g. a mid-section refresh), both are set
 * straight to their visible end state with no transition, so there's no
 * stray animation on load.
 *
 * ---- Reachability guarantee ----
 * Every END threshold (`patternEndY`, `textEndY`) is clamped to the
 * document's actual max scrollY (`scrollHeight - innerHeight`), exactly
 * like the Fleet USP divider dot's own fix for the same class of bug: if
 * the page doesn't have enough real scroll room for an element's edge to
 * literally reach its target viewport fraction (e.g. the paragraph's
 * bottom can't reach 25% because the page ends first), capping the end
 * at the max reachable scrollY still drives that progress value to
 * exactly 1 once the user has scrolled as far as the page allows, rather
 * than leaving it stuck short forever. Recomputed on resize AND via a
 * ResizeObserver on `document.body` (content below this section loading
 * or changing size also changes the document's max scroll).
 *
 * ---- Header ----
 * No changes, nothing section-specific: SiteHeader's own scroll-driven
 * trigger (site-header.tsx) already reads `#home-company`'s live
 * `getBoundingClientRect().top` every tick and flips solid once it's
 * <= the header's height — since this section is normal (non-sticky)
 * flow now, that happens naturally as it scrolls up past the header,
 * exactly like any other section on the site.
 *
 * ---- Responsive ----
 * Below DESKTOP_BREAKPOINT the fixed 1440x877 box becomes fluid (full
 * width, auto height) — this section's own opt-out of this project's
 * usual "fixed 1440px" convention, since its content needs to reflow at
 * narrow widths for the scroll-linked thresholds to make sense at all.
 * The scroll-linked math itself doesn't change by breakpoint — it's
 * already expressed in viewport fractions, so it works the same at any
 * width/height, including where the paragraph wraps into many more
 * lines (confirmed at 1440x900, 1024x768 and 375x812).
 *
 * ---- Reduced motion ----
 * No scroll listener at all — renders the final state directly (pattern
 * fully orange, text fully appeared and fully black, no transition).
 */
export function HomeCompany() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const patternOrangeRef = useRef<HTMLImageElement | null>(null);
  const headingWrapRef = useRef<HTMLHeadingElement | null>(null);
  const paragraphWrapRef = useRef<HTMLParagraphElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const appearedRef = useRef(false);
  // Phase-2 gate — see the "Two-phase sequencing" doc comment above.
  const sweepUnlockedRef = useRef(false);
  const completionScrollYRef = useRef(-Infinity);
  const maxScrollYRef = useRef(0);

  // SSR/first-client-render defaults: desktop width, not reduced motion —
  // hydration-safety (matchMedia has no SSR-safe value), same tradeoff as
  // HomeHeroParallax's own reducedMotion state. Corrected post-mount.
  const [isDesktop, setIsDesktop] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

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

  const [inView, setInView] = useState(false);
  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "100% 0px 100% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pattern = patternOrangeRef.current;
    const heading = headingWrapRef.current;
    const paragraph = paragraphWrapRef.current;
    if (!section || !pattern || !heading || !paragraph) return;

    function applyPattern(p: number) {
      const pct = `${p * 100}%`;
      const mask = `linear-gradient(to bottom, black 0, black ${pct}, transparent ${pct})`;
      pattern!.style.maskImage = mask;
      pattern!.style.webkitMaskImage = mask;
    }

    // Hoisted so the outer effect's cleanup can always reach whichever
    // watcher (transitionend listener + its timer fallback) is currently
    // pending, even though applyAppear only runs once, at an arbitrary
    // tick well after this effect's own setup.
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

    function unlockSweep() {
      if (sweepUnlockedRef.current) return;
      // Fully scrolled past already (very fast scrolling during the
      // fade) — rebasing to "now" would restart the sweep from gray on a
      // section the user isn't looking at. Use the unrebased configured
      // range instead so it resolves straight to its already-complete
      // state — see the doc comment above.
      const offScreen = section!.getBoundingClientRect().bottom <= 0;
      completionScrollYRef.current = offScreen ? -Infinity : window.scrollY;
      sweepUnlockedRef.current = true;
      clearAppearWatchers();
    }

    function applyAppear(instant: boolean) {
      if (appearedRef.current) return;
      appearedRef.current = true;
      const reveal = (el: HTMLElement, delayMs: number) => {
        if (instant) {
          // Page loaded already past the threshold (e.g. a mid-section
          // refresh) — jump straight to the end state with no transition
          // at all, rather than letting the 900ms ease-out play on load.
          // Restored afterward so this never permanently disables the
          // element's transition (harmless here since nothing else
          // transitions these elements, but correct regardless).
          el.style.transition = "none";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          // Force the instant style to actually paint before restoring
          // the transition property, so the browser can't coalesce this
          // into the same frame as the restore and animate anyway.
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
        // No gating at all in this case — apply the sweep directly at
        // the correct progress for the current scroll position.
        completionScrollYRef.current = -Infinity;
        sweepUnlockedRef.current = true;
        return;
      }

      onParagraphTransitionEnd = (e: TransitionEvent) => {
        if (e.target !== paragraph) return;
        unlockSweep();
      };
      appearTransitionTarget = paragraph;
      paragraph!.addEventListener("transitionend", onParagraphTransitionEnd);
      appearTimeoutId = window.setTimeout(
        unlockSweep,
        APPEAR_STAGGER_MS + APPEAR_DURATION_MS + APPEAR_WATCHER_TIMEOUT_BUFFER_MS,
      );
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

    // ---- Reduced motion: final state, no listeners at all ----
    if (reducedMotion) {
      applyPattern(1);
      applyAppear(true);
      applyTextSweep(1);
      return;
    }

    if (!inView) return;

    let patternStartY = 0;
    let patternEndY = 1;
    let textStartY = 0;
    let textEndY = 1;

    function measure() {
      const vh = window.innerHeight;
      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - vh);
      maxScrollYRef.current = maxScrollY;

      const sectionTopAbs = section!.getBoundingClientRect().top + window.scrollY;
      const patternRect = pattern!.getBoundingClientRect();
      const patternBottomAbs = patternRect.top + window.scrollY + patternRect.height;
      const paragraphBottomAbs = paragraph!.getBoundingClientRect().top + window.scrollY + paragraph!.getBoundingClientRect().height;

      patternStartY = sectionTopAbs - PATTERN_START_VIEWPORT_FRACTION * vh;
      const patternNaturalEnd = patternBottomAbs - PATTERN_END_VIEWPORT_FRACTION * vh;
      patternEndY = Math.min(patternNaturalEnd, maxScrollY);
      patternEndY = Math.max(patternEndY, patternStartY + 1);

      // Section top at the header's bottom edge — same condition
      // site-header.tsx's own trigger uses for its overlay->solid switch
      // (see that component), so text starts exactly when the Hero/
      // Company overlap has fully closed, not mid-slide.
      textStartY = sectionTopAbs - headerHeightPx();
      const textNaturalEnd = paragraphBottomAbs - TEXT_END_VIEWPORT_FRACTION * vh;
      textEndY = Math.min(textNaturalEnd, maxScrollY);
      textEndY = Math.max(textEndY, textStartY + 1);
    }

    let raf = 0;
    let ticking = false;
    // Only the very first tick (from the initial synchronous update()
    // call below, before any scroll/resize has happened) may apply the
    // appear state instantly — any later crossing of the threshold, from
    // a real scroll or a later resize-triggered update, animates
    // normally. See applyAppear's own comment for why.
    let isInitialTick = true;
    const tick = () => {
      const scrollY = window.scrollY;
      applyPattern(mapRange(scrollY, patternStartY, patternEndY));
      if (scrollY >= textStartY) applyAppear(isInitialTick);

      if (!sweepUnlockedRef.current) {
        // Phase 1 (appear) hasn't finished yet — every word stays flat
        // gray no matter how far the user keeps scrolling.
        applyTextSweep(0);
      } else {
        // Per spec: never start earlier than "now" — pulling the start
        // back to get more room would make progress already > 0 the
        // instant the sweep unlocks, which is the exact snap this phase
        // gating exists to prevent. Only the END may move, and only
        // forward (capped at the document's own max scroll) — so on a
        // page where the rebased start lands very close to that max
        // (e.g. very fast scrolling, with little real estate left below
        // this section), the sweep is still guaranteed its full window
        // when room exists, and otherwise finishes over whatever short
        // distance physically remains, never before.
        const vh = window.innerHeight;
        const effStart = Math.max(textStartY, completionScrollYRef.current);
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

    // Document-height changes (content elsewhere on the page loading or
    // resizing) can move maxScrollY, which can move a clamped end point —
    // not just viewport resizes.
    const bodyRO = new ResizeObserver(update);
    bodyRO.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      bodyRO.disconnect();
      clearAppearWatchers();
    };
  }, [reducedMotion, inView]);

  const appearStyle = (): CSSProperties =>
    reducedMotion
      ? { opacity: 1, transform: "none" }
      : {
          opacity: 0,
          transform: `translateY(${APPEAR_TRANSLATE_PX}px)`,
          transition: `opacity ${APPEAR_DURATION_MS}ms ${APPEAR_EASE}, transform ${APPEAR_DURATION_MS}ms ${APPEAR_EASE}`,
        };

  return (
    <section
      ref={sectionRef}
      id="home-company"
      className="relative flex flex-col overflow-hidden"
      style={{
        width: isDesktop ? SECTION_W : "100%",
        height: isDesktop ? SECTION_H : "auto",
        justifyContent: isDesktop ? "flex-end" : undefined,
        // Curtain-over-the-hero overlap — see the doc comment above.
        marginTop: `-${OVERLAP_VH}vh`,
        zIndex: 1,
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
    </section>
  );
}
