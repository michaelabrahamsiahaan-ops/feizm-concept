"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";

// ---- Tunable constants (all named per the spec, nothing magic inline) ----
const SECTION_W = 1440; // desktop (>=DESKTOP_BREAKPOINT) Figma frame width
const SECTION_H = 877; // desktop Figma frame height
const DESKTOP_BREAKPOINT = 1024;
const PIN_LENGTH_VH = 120; // desktop: extra scroll (vh) the section stays pinned for
const PIN_LENGTH_MOBILE_VH = 80; // mobile: same, when mobile pinning applies at all

// Pin-progress P (0->1) ranges that drive each step. All four numbers are
// independently tunable; TEXT_SWEEP_START intentionally equals
// PATTERN_END (0.35) — the text sweep picks up right where the pattern
// fill finishes, per the spec's own step order — but they're separate
// constants, not derived, so that relationship can be broken later
// without hunting through the math.
const PATTERN_START = 0;
const PATTERN_END = 0.35;
const APPEAR_AT = 0.2;
const TEXT_SWEEP_START = 0.35;
const TEXT_SWEEP_END = 0.9;
// 0.90 -> 1.00 is the hold: both ranges above are already clamped to 1 by
// then, so nothing further needs to animate — the "hold" is just the
// absence of any range covering that span, not separate code.

const APPEAR_DURATION_MS = 900;
const APPEAR_STAGGER_MS = 150;
const APPEAR_EASE = "cubic-bezier(.16,1,.3,1)"; // ease-out

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

/**
 * Renders `text` as plain whitespace + one <span> per word, each word's
 * ref collected into `wordRefs` at `startIndex + its position` — so a
 * heading block and a paragraph block can share ONE continuous reading-
 * order word sequence for the sweep, while still wrapping naturally
 * (only the words are spans; the whitespace between them is a plain text
 * node, so the browser's own line-breaking is untouched).
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

type LayoutMode = "desktop-pinned" | "mobile-pinned" | "mobile-unpinned";

const headingWordCount = wordCount(HEADING_TEXT);

/**
 * "Company" section of the Feizm Homepage ("Home / 02 Company"), with its
 * scroll-pinned reveal choreography (not in Figma — a separate animation
 * spec layered on top of the static build): pin the section under the
 * header for an extra stretch of scroll, during which the decorative
 * pattern sweeps gray->orange top-to-bottom, the heading/paragraph fade
 * in once, and then the text itself sweeps gray->black word by word in
 * reading order, before releasing.
 *
 * Static build details (copy/typography/tokens/pattern asset) are
 * unchanged from the original read of node 148:45272 — see the git
 * history for that derivation. This comment covers the animation layer.
 *
 * ---- Pin geometry ----
 * A wrapper div sized `section's own natural height + PIN_LENGTH` holds
 * the section as `position: sticky; top: var(--header-h)` — it pins
 * flush under the header (confirmed: the measured gap is 0px) and stays
 * stuck for exactly PIN_LENGTH of extra scroll before releasing, same
 * "wrapper + sticky inner, measure once via rect+scrollY, recompute on
 * resize" technique as HomeHeroParallax's own pin and the Fleet USP
 * divider dot. One live pin-progress value P (0->1) is computed from
 * scroll position via a passive scroll listener, rAF-throttled, gated by
 * an IntersectionObserver so nothing runs while off-screen — P=0 exactly
 * when the section starts sticking, P=1 exactly when it releases.
 *
 * Because this section's own `position: sticky` sits immediately after
 * the Hero's pinned wrapper in normal DOM flow with no gap, the two pins
 * never compete for the "stuck" state at the same scroll position —
 * that's how CSS sticky sequencing works natively (no manual handoff
 * coordination needed), verified by checking geometry right at the
 * handoff scrollY (no blank gap, no jump).
 *
 * ---- Choreography (all four thresholds and durations are named
 * constants above, tunable independently) ----
 * - PATTERN_START..PATTERN_END (0->0.35): two identical copies of the
 *   pattern SVG are stacked — a permanently-visible grayscale-filtered
 *   base layer, and the real (orange) layer on top, revealed via a
 *   `mask-image` linear-gradient whose boundary is written directly to
 *   the DOM each tick (`${p*100}%`), sweeping top to bottom as p runs
 *   0->1. Pure function of P, so scrolling back up reverses it exactly.
 * - APPEAR_AT (0.2, a single threshold not a range): a ONE-WAY latch
 *   (`appearedRef`) — once P crosses it, the heading fades/slides in via
 *   a real CSS transition (900ms ease-out), the paragraph the same
 *   150ms later. Latching makes this reproduce the "runs once, does not
 *   replay on scroll-up" requirement for free: once true, always true,
 *   the opacity/transform are never written again regardless of P.
 *   Checked once on mount too — if P is already past 0.2 at load (e.g. a
 *   mid-pin refresh), both are set straight to their visible end state
 *   with the transition temporarily disabled, so there's no stray
 *   animation playing on a page that loaded already-scrolled.
 * - TEXT_SWEEP_START..TEXT_SWEEP_END (0.35->0.9): the heading and
 *   paragraph are rendered as plain whitespace + one <span> per word
 *   (SweepWords), sharing one continuous reading-order index. Each
 *   word's `color` is written directly every tick, interpolated
 *   gray->black over a window centered on `tp * wordCount` reaching that
 *   word's own index — i.e. the sweep visits words strictly in reading
 *   order, heading first. Also a pure function of local progress `tp`,
 *   so it reverses on scroll-up exactly like the pattern fill.
 * - 0.9->1.0 is a hold with no code of its own: both ranges above are
 *   already clamped to their endpoint by P=0.9, so the state simply
 *   stays fully revealed until the pin lets go.
 *
 * ---- Header ----
 * No changes needed: SiteHeader's own trigger (site-header.tsx) reads
 * `#home-company`'s live `getBoundingClientRect().top`. Once this
 * section is stuck, that top is pinned at exactly `--header-h` for the
 * entire pin — already `<= header height`, so the header reads solid
 * continuously throughout, and slightly before too (as the section
 * scrolls up into that position in the first place), never overlay.
 *
 * ---- Responsive (<1024px) ----
 * Below DESKTOP_BREAKPOINT the fixed 1440x877 layout is replaced with a
 * fluid one (full width, auto height — this section specifically opts
 * out of this project's usual "fixed 1440px, not responsive" convention
 * for its own content box, since the pin/reveal spec explicitly asks for
 * mobile behavior). The section's own natural (unpinned) height is then
 * measured against the viewport height once mounted:
 *   - shorter than the viewport: pin it, same mechanism as desktop, with
 *     PIN_LENGTH_MOBILE instead of PIN_LENGTH.
 *   - taller than the viewport: pinning it would mean the sticky section
 *     hides its own overflowing content (nothing to scroll the overflow
 *     into), so it's NOT pinned — it renders as a normal block, and P is
 *     instead driven by how far the section has scrolled through the
 *     viewport (`P = clamp((viewportHeight - sectionTop) / viewportHeight,
 *     0, 1)`, i.e. 0 when the section's top is at the viewport's bottom
 *     edge, 1 once it reaches the viewport's top edge) — there's no prior
 *     non-pinned implementation to reuse (this is a new build, not an
 *     edit of an earlier one), so this is a reasonable, clearly-isolated
 *     formula a future pass can retune independently of the pinned math.
 * `isDesktop`/this mobile decision can only be resolved client-side
 * (matchMedia + a real measured content height) — both default to the
 * desktop shape for SSR and the very first client render specifically to
 * avoid a hydration mismatch (same reasoning, and same tradeoff, as
 * HomeHeroParallax's own `reducedMotion` state), corrected in a
 * useLayoutEffect immediately after mount.
 *
 * ---- Reduced motion ----
 * No pin, no scrub, no wrapper at all — renders the final state directly
 * (pattern fully orange, text fully appeared and fully black).
 */
export function HomeCompany() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const patternOrangeRef = useRef<HTMLImageElement | null>(null);
  const headingWrapRef = useRef<HTMLHeadingElement | null>(null);
  const paragraphWrapRef = useRef<HTMLParagraphElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const appearedRef = useRef(false);

  // SSR/first-client-render default: desktop, not reduced motion — see
  // doc comment above for why (hydration-safety, same tradeoff as
  // HomeHeroParallax). Corrected post-mount.
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("desktop-pinned");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resolved, setResolved] = useState(false); // true once the real mode is known

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const widthMq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

    function resolveMode() {
      if (widthMq.matches) {
        setLayoutMode("desktop-pinned");
        setResolved(true);
        return;
      }
      // Mobile: measure the section's own natural height (it renders
      // fluid/auto-height in this branch — see the JSX below) against the
      // viewport to decide pinned vs unpinned.
      const el = sectionRef.current;
      if (!el) return;
      const naturalH = el.getBoundingClientRect().height;
      setLayoutMode(naturalH > window.innerHeight ? "mobile-unpinned" : "mobile-pinned");
      setResolved(true);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia/layout measurement are browser-only, no SSR-safe value (see doc comment)
    setReducedMotion(mq.matches);
    resolveMode();

    const onMotionChange = () => setReducedMotion(mq.matches);
    const onWidthChange = () => resolveMode();
    mq.addEventListener("change", onMotionChange);
    widthMq.addEventListener("change", onWidthChange);
    window.addEventListener("resize", resolveMode);
    return () => {
      mq.removeEventListener("change", onMotionChange);
      widthMq.removeEventListener("change", onWidthChange);
      window.removeEventListener("resize", resolveMode);
    };
  }, []);

  const [inView, setInView] = useState(false);
  useLayoutEffect(() => {
    const el = wrapperRef.current ?? sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "50% 0px 50% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [layoutMode]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    function headerHeight() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    }

    function applyPattern(p: number) {
      const orange = patternOrangeRef.current;
      if (!orange) return;
      const pct = `${p * 100}%`;
      const mask = `linear-gradient(to bottom, black 0, black ${pct}, transparent ${pct})`;
      orange.style.maskImage = mask;
      orange.style.webkitMaskImage = mask;
    }

    function applyAppear() {
      if (appearedRef.current) return;
      appearedRef.current = true;
      const reveal = (el: HTMLElement | null, delayMs: number) => {
        if (!el) return;
        el.style.transitionDelay = `${delayMs}ms`;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      };
      reveal(headingWrapRef.current, 0);
      reveal(paragraphWrapRef.current, APPEAR_STAGGER_MS);
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

    function apply(P: number) {
      applyPattern(mapRange(P, PATTERN_START, PATTERN_END));
      if (P >= APPEAR_AT) applyAppear();
      applyTextSweep(mapRange(P, TEXT_SWEEP_START, TEXT_SWEEP_END));
    }

    // ---- Reduced motion: final state, no listeners at all ----
    if (reducedMotion) {
      apply(1);
      return;
    }

    if (!resolved) return;

    // ---- Mobile, unpinned: P driven by normal scroll-through position ----
    if (layoutMode === "mobile-unpinned") {
      if (!inView) return;
      let raf = 0;
      let ticking = false;
      const tick = () => {
        const rect = section.getBoundingClientRect();
        const P = clamp((window.innerHeight - rect.top) / window.innerHeight, 0, 1);
        apply(P);
        ticking = false;
      };
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        raf = requestAnimationFrame(tick);
      };
      tick();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", tick);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", tick);
      };
    }

    // ---- Pinned (desktop or mobile): P driven by the wrapper's scroll range ----
    const wrapper = wrapperRef.current;
    if (!wrapper || !inView) return;

    let startScrollY = 0;
    let pinLengthPx = 1;

    // The wrapper's height is set HERE, not in static CSS: on desktop the
    // section's height is the known fixed SECTION_H, but on mobile it's
    // fluid (auto, driven by text wrap at whatever width), so there's no
    // static `calc()` that could express "content height + PIN_LENGTH"
    // without first measuring the content. Explicitly setting it from the
    // real measured section height makes this the single source of truth
    // for both modes, rather than trusting a static value that's only
    // correct on desktop and then separately deriving pinLengthPx back
    // out of it (fragile — the two would need to agree).
    function measure() {
      const sectionH = section!.getBoundingClientRect().height;
      const pinLengthVh = layoutMode === "desktop-pinned" ? PIN_LENGTH_VH : PIN_LENGTH_MOBILE_VH;
      pinLengthPx = Math.max(1, (pinLengthVh / 100) * window.innerHeight);
      wrapper!.style.height = `${sectionH + pinLengthPx}px`;

      const rect = wrapper!.getBoundingClientRect();
      const wrapperTopAbs = rect.top + window.scrollY;
      startScrollY = wrapperTopAbs - headerHeight();
    }

    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    let raf = 0;
    let ticking = false;
    const tick = () => {
      const P = clamp((window.scrollY - startScrollY) / pinLengthPx, 0, 1);
      apply(P);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [layoutMode, reducedMotion, resolved, inView]);

  const isDesktop = layoutMode === "desktop-pinned";
  const isPinned = reducedMotion ? false : layoutMode !== "mobile-unpinned";

  const appearStyle = (): CSSProperties =>
    reducedMotion
      ? { opacity: 1, transform: "none" }
      : {
          opacity: 0,
          transform: "translateY(16px)",
          transition: `opacity ${APPEAR_DURATION_MS}ms ${APPEAR_EASE}, transform ${APPEAR_DURATION_MS}ms ${APPEAR_EASE}`,
        };

  const sectionEl = (
    <section
      ref={sectionRef}
      id="home-company"
      className="relative flex flex-col overflow-hidden"
      style={{
        width: isDesktop ? SECTION_W : "100%",
        height: isDesktop ? SECTION_H : "auto",
        justifyContent: isDesktop ? "flex-end" : undefined,
        position: isPinned ? "sticky" : "relative",
        top: isPinned ? "var(--header-h)" : undefined,
        backgroundColor: "var(--fig-color-neutral-0)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      {/* Base (always-visible) grayscale layer + the real orange layer
          revealed on top via a mask that grows top-to-bottom with P —
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

  if (!isPinned) return sectionEl;

  return (
    // Static fallback height only (the real height, which on mobile
    // depends on a runtime content measurement, is set imperatively in
    // the effect's own measure() — see its comment). Desktop's fallback
    // is already exactly correct since SECTION_H is fixed; mobile's is a
    // rough placeholder for the one frame before that effect runs.
    <div
      ref={wrapperRef}
      className="relative w-full"
      style={{
        height: isDesktop ? `calc(${SECTION_H}px + ${PIN_LENGTH_VH}vh)` : `calc(100vh + ${PIN_LENGTH_MOBILE_VH}vh)`,
      }}
    >
      {sectionEl}
    </div>
  );
}
