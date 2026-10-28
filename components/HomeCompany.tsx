"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";

// ---- Tunable constants ----
const SECTION_W = 1440; // desktop (>=DESKTOP_BREAKPOINT) Figma frame width
const SECTION_H = 877; // desktop Figma frame height
const DESKTOP_BREAKPOINT = 1024;

// Viewport-fraction anchors for each effect's start/end scrollY — see the
// component doc comment for the exact formulas these feed into.
const PATTERN_START_VIEWPORT_FRACTION = 1.0; // section top at the viewport's bottom edge (100%)
const PATTERN_END_VIEWPORT_FRACTION = 0.2; // pattern's bottom edge at 20% from the viewport top
const TEXT_START_VIEWPORT_FRACTION = 0.9; // heading's top at 90% of the viewport
const TEXT_END_VIEWPORT_FRACTION = 0.25; // paragraph's bottom at 25% from the viewport top

const APPEAR_DURATION_MS = 900;
const APPEAR_STAGGER_MS = 150;
const APPEAR_EASE = "cubic-bezier(.16,1,.3,1)"; // ease-out
const APPEAR_TRANSLATE_PX = 24;

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
 * pinned version of this section (also see git history) — the section no
 * longer pins under the header at all; it's back in normal document
 * flow at its Figma height (1440x877 on desktop), confirmed not to leave
 * any gap or shift anything below it. The Hero's own pin (a separate,
 * unrelated component) is untouched.
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
 *   --tp (text sweep):    0 at the scrollY where the HEADING's top
 *        reaches 90% of the viewport (same scrollY the appear trigger
 *        below uses); 1 at the scrollY where the PARAGRAPH's bottom
 *        reaches 25% from the viewport's top.
 * Both are pure functions of scrollY (computed fresh from the live
 * scroll position every tick, not accumulated/eased), so scrolling back
 * up reverses both exactly. They're allowed to overlap in time (the spec
 * says so explicitly) — nothing coordinates one against the other.
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
 * uses (heading's top at 90% viewport), `appearedRef` latches true and
 * the heading fades/slides in (opacity + translateY 24px->0, 900ms
 * ease-out), the paragraph 150ms later. Once latched, always latched —
 * scrolling back up never re-hides or re-plays it. Checked once on
 * mount too: if the page loads already past that scrollY (e.g. a
 * mid-section refresh), both are set straight to their visible end state
 * with no transition, so there's no stray animation on load.
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

      const sectionTopAbs = section!.getBoundingClientRect().top + window.scrollY;
      const patternRect = pattern!.getBoundingClientRect();
      const patternBottomAbs = patternRect.top + window.scrollY + patternRect.height;
      const headingTopAbs = heading!.getBoundingClientRect().top + window.scrollY;
      const paragraphBottomAbs = paragraph!.getBoundingClientRect().top + window.scrollY + paragraph!.getBoundingClientRect().height;

      patternStartY = sectionTopAbs - PATTERN_START_VIEWPORT_FRACTION * vh;
      const patternNaturalEnd = patternBottomAbs - PATTERN_END_VIEWPORT_FRACTION * vh;
      patternEndY = Math.min(patternNaturalEnd, maxScrollY);
      patternEndY = Math.max(patternEndY, patternStartY + 1);

      textStartY = headingTopAbs - TEXT_START_VIEWPORT_FRACTION * vh;
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
      applyTextSweep(mapRange(scrollY, textStartY, textEndY));
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
