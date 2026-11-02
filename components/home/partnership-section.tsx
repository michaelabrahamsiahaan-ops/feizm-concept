"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SectionBadge } from "@/components/SectionBadge";
import { ScrollFrameSequence, type ScrollFrameSequenceHandle } from "@/components/shared/scroll-frame-sequence";

// ---- Fluid insets — same clamp formulas as StatsSection (Figma's own
// 60px/40px section padding at its 1440 reference width). ----
const SIDE_INSET = "clamp(16px, 2.8vw, 64px)";
const VERTICAL_INSET = "clamp(24px, 4.17vw, 96px)";
const CONTENT_MAX_WIDTH_PX = 1600; // matches StatsSection's own CARD_MAX_WIDTH_PX

// ---- Left column width ----
// Figma's two copy TEXT nodes are each individually a FIXED width, not a
// shared column: the Geotab block is 577px wide, the Feizm block 616px
// (read directly off each node's own `width` in Figma, confirmed via
// `figma-cli eval` — not a HUG-to-content artifact, both report
// `sizeH: "FIXED"`), each sized just narrow enough to wrap its own copy
// into exactly 2 lines. A real two-column layout needs ONE shared left-
// column width, so this uses the wider of the two (616px) — verified live
// that the Geotab copy still wraps to exactly 2 lines at 616px too (see
// this component's own Step-3 verification), so nothing is lost by
// sharing one width instead of Figma's two slightly different ones.
const COPY_MAX_WIDTH_PX = 616;

// ---- Vertical scroll distance between the two copy blocks (named per
// the brief, which explicitly invited adjusting it: "adjust if Figma's
// spacing suggests otherwise"). Figma has no equivalent value to read
// here (this scrolling structure doesn't exist in Figma at all — see
// this component's own doc comment), so 80 was a starting guess that
// turned out too small: the right column's total height (both copy
// blocks + this gap) must be MEANINGFULLY taller than the sticky
// device's own box, or there's no real room for `position: sticky` to
// visibly hold — at 80vh the two were within ~15px of each other, which
// technically still satisfies the CSS spec (confirmed directly: it does
// stick, briefly) but reads as "doesn't stick at all" to a scrolling user
// and even an automated headless Chromium check (separately confirmed:
// headless Chromium's own position:sticky implementation glitches and
// never visibly catches at all when the margin is this tight, where a
// real Chromium window does — see this component's own Step-3 notes).
// 130 gives the box several hundred px of genuine, clearly visible stuck
// room while keeping the section meaningfully shorter than the old
// full-section-pin build (verified).
const COPY_GAP_VH = 130;

// ---- Mobile (<1024px) sticky device height — confirmed with the user
// (AskUserQuestion) before building: device sticky near the top at
// ~45vh, copy scrolling underneath, rather than the two-column layout.
const MOBILE_DEVICE_VH = 45;

// ---- Device frame sequence (public/illustrations/device/, copied from
// ~/Downloads/device-scroll/ — see that folder's own README.md for the
// authoritative timeline baked into the 48 frames themselves):
//   0.00-0.10 back view, held
//   0.10-0.70 rotates to the 3/4 front-top view (ease baked into the
//     frames, not re-applied here — see ScrollFrameSequence's own comment)
//   0.70-0.80 settled, LEDs off
//   0.80-0.95 LEDs light red -> green -> blue
//   0.95-1.00 final lit state, held
const FRAME_COUNT = 48;
const DEVICE_FRAME_URLS = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/illustrations/device/frames/frame_${String(i).padStart(2, "0")}.webp`,
);
const DEVICE_FALLBACK_SRC = "/illustrations/device/device-final-lit.webp";

// ---- Device progress breakpoints, expressed as p (0..1) at four named
// phases of SCROLL POSITION (not of the frame index) — see this
// component's own doc comment for how scroll position maps to these. ----
const P_COPY1_START = 0;
const P_COPY1_CENTER = 0.7;
const P_COPY2_START = 0.8;
const P_COPY2_CENTER = 1;

// ---- Reveal ("rises in once", joinsystems.co-style) ----
const REVEAL_TRANSLATE_PX = 40;
const REVEAL_DURATION_MS = 800;
const REVEAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
// Shrinking the IntersectionObserver's effective root by 15% from the
// bottom is the standard way to express "fires when the element's top
// crosses 85% down the viewport".
const REVEAL_ROOT_MARGIN = "0px 0px -15% 0px";

// ---- Optional focus-dim — built behind a flag per the brief ("build it
// behind a flag and show me both"). OFF by default: without it, both
// copy blocks simply stay fully visible once revealed, per the brief's
// own default behavior. Flip to `true` to compare.
const ENABLE_FOCUS_DIM = false;
const FOCUS_DIM_OPACITY = 0.35;
const FOCUS_DIM_MS = 300;
// Switches at the midpoint of the 0.70->0.80 "between copies" gap — the
// one p value with no better claim to either copy block.
const FOCUS_DIM_SWITCH_P = (P_COPY1_CENTER + P_COPY2_START) / 2;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const COPY = {
  geotab: "Geotab brings #1-ranked telematics platform (ABI Research) and GO devices & global data",
  feizm: "Feizm brings On-site deployment, training for your team, local support with same time zone",
};

/**
 * Wires up one reveal-once block: starts hidden (opacity 0, translateY
 * `REVEAL_TRANSLATE_PX`) and animates to visible the first time `wrapper`
 * crosses `REVEAL_ROOT_MARGIN`'s threshold, then disconnects — it never
 * re-hides on scroll back up. If `wrapper` has ALREADY crossed that
 * threshold at setup time (page loaded mid-section, or landed via an
 * anchor link), it's shown immediately with `transition: none`, per the
 * brief ("show it immediately without animating") — this is a
 * synchronous check done BEFORE the IntersectionObserver is even
 * attached, not a race against its first callback.
 *
 * `wrapper` and `text` are separate elements (not always the same node):
 * `wrapper` is what gets measured/observed (a plain, never-transformed
 * box), `text` is what actually receives the opacity/transform styles.
 * Splitting them matters for the copy blocks specifically — their
 * `wrapper` is also what the device-progress effect below measures for
 * scroll breakpoints, and measuring a node that's mid-translateY would
 * read a few px off from its true document position.
 */
function setupReveal(wrapper: HTMLElement, text: HTMLElement, onRevealed?: () => void): () => void {
  const thresholdY = window.innerHeight * 0.85;
  if (wrapper.getBoundingClientRect().top <= thresholdY) {
    text.style.transition = "none";
    text.style.opacity = "1";
    text.style.transform = "translateY(0px)";
    onRevealed?.();
    return () => {};
  }

  text.style.opacity = "0";
  text.style.transform = `translateY(${REVEAL_TRANSLATE_PX}px)`;
  text.style.transition = `opacity ${REVEAL_DURATION_MS}ms ${REVEAL_EASE}, transform ${REVEAL_DURATION_MS}ms ${REVEAL_EASE}`;

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      text.style.opacity = "1";
      text.style.transform = "translateY(0px)";
      onRevealed?.();
      io.disconnect();
    },
    { rootMargin: REVEAL_ROOT_MARGIN },
  );
  io.observe(wrapper);
  return () => io.disconnect();
}

/**
 * "Partnership" section of the Feizm Homepage ("Home / 05 Partnership",
 * node 212:343205, read live via `figma-cli`) — joinsystems.co-style
 * structure: the device stays fixed on the right while the copy column
 * scrolls normally on the left, replacing an earlier full-section-pin
 * build (see git history) that put both copy blocks at one fixed spot
 * and crossfaded between them, which wasn't what was asked for.
 *
 * ---- What Figma actually has vs. what this builds ----
 * Figma's own frame is fully static: a badge+heading row, then TWO
 * identical rows (copy left, 624x624 device image right) stacked 120px
 * apart, and both device images are pixel-identical to the supplied
 * `device-final-lit.png` — the same static asset placed twice, not two
 * different illustrations or states. No prototype/reaction data exists
 * on any node in this frame. The scroll-scrubbed rotation/reveal below is
 * a deliberate web-only enhancement, confirmed with the user:
 *   - ONE device (not two) sits sticky on the right for the whole
 *     section, cycling its 48-frame rotation via `ScrollFrameSequence`
 *     as the copy column scrolls past it
 *   - the badge ("Partnership", byte-identical styling to the existing
 *     `SectionBadge`) and heading ("Global technology.\nLocal people who
 *     make it work.", 42px/43px Hanken Grotesk) are reproduced as-is
 *   - copy width uses a single shared 616px column (`COPY_MAX_WIDTH_PX`
 *     — see its own comment for why, given Figma's two text boxes are
 *     577/616 individually)
 *   - the hidden "Partner Logos" row (9 logos incl. Esri, `visible:
 *     false` in Figma) stays left out, same as the previous build
 *   - the background gradient (#FEEFEA -> #FFFFFF) still uses this
 *     project's own `--fig-color-brand-50` token for its start stop
 *
 * ---- Structure ----
 * A single relative section, no section-level pin. Below the badge+
 * heading row, either (>=1024px) a two-column flex row or (<1024px) a
 * single stacked column — see "Below 1024px" further down:
 *   - Copy: copy 1, a `COPY_GAP_VH` spacer, copy 2 — all in normal
 *     document flow, real HTML text, reading order preserved.
 *   - Device: a `position: sticky` box that flex-centers the device
 *     inside it, sized/positioned so it reads as "stays in place" while
 *     the copy scrolls past (standard sticky-sidebar technique) until
 *     its own containing block's bottom edge approaches, at which point
 *     it releases and scrolls away with the rest of the section — no
 *     separate release logic, this falls out of `position: sticky` for
 *     free. On desktop that containing block is the RIGHT column, grown
 *     to match the LEFT column's height by the flex row's own default
 *     `align-items: stretch` (no JS height math needed for this part).
 *
 * The device's own containing block needs to be MEANINGFULLY taller than
 * the sticky box itself for this to actually be visible (confirmed
 * directly: at `COPY_GAP_VH`'s first value, 80, the two were within
 * ~15px of each other — technically still spec-correct, briefly
 * sticking, but imperceptible to a scrolling user, and even unreliable
 * under automated headless-Chromium checks specifically, which were
 * separately confirmed to under-render `position: sticky` in this exact
 * tight-margin situation where a real Chromium window does stick — see
 * `COPY_GAP_VH`'s own comment). 130 gives several hundred px of genuine
 * stuck room on desktop; `MOBILE_DEVICE_VH`'s much shorter box leaves
 * comparatively enormous slack by the same logic.
 *
 * ---- Device progress (p) — tied to copy position, not a pin formula ----
 * Each copy block's own ABSOLUTE document Y (measured once via its
 * `wrapper`'s `getBoundingClientRect() + window.scrollY`, not re-read on
 * every scroll tick) gives four scroll-position breakpoints:
 *   b0 = copy1CenterY - viewportH        (copy 1 at the viewport BOTTOM)
 *   b1 = copy1CenterY - viewportH / 2     (copy 1 at the viewport CENTER)
 *   b2 = copy2CenterY - viewportH        (copy 2 at the viewport BOTTOM)
 *   b3 = copy2CenterY - viewportH / 2     (copy 2 at the viewport CENTER)
 * `p` is piecewise-linear across them: b0->b1 maps to `P_COPY1_START ->
 * P_COPY1_CENTER` (0 -> 0.70), b1->b2 to 0.70 -> 0.80, b2->b3 to 0.80 ->
 * 1.00 — i.e. copy 1's own entrance drives the back-view-to-rotation
 * phase, the quiet gap between copies drives the settled/LEDs-off phase,
 * and copy 2's entrance drives the LED-lighting phase, exactly as asked.
 *
 * `b3` (and, chained through it, b0-b2) is clamped against the document's
 * real max scrollY — same technique as `UspDividerDot`
 * (components/fleet/usp-divider-dot.tsx): this is currently the last
 * section on the page, so the "natural" b3 (copy 2 truly centered) can
 * sit past what the page can physically scroll to. Without the clamp, p
 * would get stuck short of 1 forever once the user hits the document's
 * real bottom. A `ResizeObserver` on `document.body` re-measures whenever
 * the document's total height changes (more sections added below later),
 * so the clamp automatically stops mattering once there's real content
 * after this section providing the scroll room on its own.
 *
 * `measure()` (breakpoints) and `paint()` (p + device draw, reads
 * `window.scrollY` only) are split the same way as `UspDividerDot` for
 * the same reason: `paint()` runs on every scroll tick and must stay
 * cheap (no `getBoundingClientRect()` in that path), while `measure()`
 * only needs to re-run on resize / document-height change.
 *
 * ---- Reveal ----
 * `setupReveal()` (above) handles the heading+badge row and each copy
 * block identically — hidden until ~85% down the viewport, then rises in
 * once, never re-hides. The optional focus-dim (`ENABLE_FOCUS_DIM`) only
 * ever dims a block AFTER it has revealed (tracked via
 * `copy{1,2}RevealedRef`) — otherwise a not-yet-revealed block could be
 * nudged to 0.35 opacity by the dim logic before its own reveal animation
 * ever ran, which would show it prematurely instead of rising in from
 * fully hidden.
 *
 * ---- Reduced motion ----
 * The ONLY path that skips sticky/reveal/scrub entirely: both copy
 * blocks stacked and visible with `device-final-lit.webp` as a plain
 * image — this is Figma's own static design at p=1, not an arbitrary
 * stand-in.
 *
 * ---- Below 1024px ----
 * Proposed to the user and confirmed (not guessed) before building: the
 * device stays sticky near the TOP of the screen at `MOBILE_DEVICE_VH`
 * (~45vh) instead of a right column, with both copy blocks stacked
 * underneath it in normal flow. Same `position: sticky` mechanism, same
 * reveal/progress wiring (`copy{1,2}WrapRef`, `setupReveal`, the
 * breakpoint math) — only the JSX arrangement differs; p is computed
 * purely from the copy blocks' own position, which doesn't care whether
 * they're laid out beside the device or below it.
 */
export function PartnershipSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headingWrapRef = useRef<HTMLDivElement | null>(null);
  const copy1WrapRef = useRef<HTMLDivElement | null>(null);
  const copy1TextRef = useRef<HTMLParagraphElement | null>(null);
  const copy2WrapRef = useRef<HTMLDivElement | null>(null);
  const copy2TextRef = useRef<HTMLParagraphElement | null>(null);
  const deviceRef = useRef<ScrollFrameSequenceHandle | null>(null);

  const copy1RevealedRef = useRef(false);
  const copy2RevealedRef = useRef(false);

  // Scroll-position breakpoints (abs document Y, px) — see this
  // component's own doc comment for b0..b3's meaning.
  const b0Ref = useRef(0);
  const b1Ref = useRef(1);
  const b2Ref = useRef(2);
  const b3Ref = useRef(3);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
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
    const mq = window.matchMedia("(min-width: 1024px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as the reducedMotion check above
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "100% 0px 100% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ---- Reveal wiring (heading row + both copy blocks) ----
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const cleanups: Array<() => void> = [];
    if (headingWrapRef.current) {
      cleanups.push(setupReveal(headingWrapRef.current, headingWrapRef.current));
    }
    if (copy1WrapRef.current && copy1TextRef.current) {
      cleanups.push(
        setupReveal(copy1WrapRef.current, copy1TextRef.current, () => {
          copy1RevealedRef.current = true;
        }),
      );
    }
    if (copy2WrapRef.current && copy2TextRef.current) {
      cleanups.push(
        setupReveal(copy2WrapRef.current, copy2TextRef.current, () => {
          copy2RevealedRef.current = true;
        }),
      );
    }
    return () => cleanups.forEach((fn) => fn());
  }, [reducedMotion]);

  // ---- Device progress (p), tied to copy position — see this
  // component's own doc comment for the full breakpoint math. ----
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const copy1 = copy1WrapRef.current;
    const copy2 = copy2WrapRef.current;
    if (!copy1 || !copy2) return;

    function measure() {
      const viewportH = window.innerHeight;
      const r1 = copy1!.getBoundingClientRect();
      const r2 = copy2!.getBoundingClientRect();
      const copy1CenterAbs = r1.top + window.scrollY + r1.height / 2;
      const copy2CenterAbs = r2.top + window.scrollY + r2.height / 2;
      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - viewportH);

      const raw0 = copy1CenterAbs - viewportH;
      const raw1 = copy1CenterAbs - viewportH / 2;
      const raw2 = copy2CenterAbs - viewportH;
      const raw3 = copy2CenterAbs - viewportH / 2;

      // Clamp monotonically against the document's real max scroll (see
      // this component's own doc comment — same technique as
      // UspDividerDot) and guard against a degenerate (zero-width) range
      // between adjacent breakpoints, which would divide by ~0 below.
      const c0 = Math.min(raw0, maxScrollY);
      const c1 = Math.max(Math.min(raw1, maxScrollY), c0 + 1);
      const c2 = Math.max(Math.min(raw2, maxScrollY), c1);
      const c3 = Math.max(Math.min(raw3, maxScrollY), c2 + 1);

      b0Ref.current = c0;
      b1Ref.current = c1;
      b2Ref.current = c2;
      b3Ref.current = c3;
    }

    function progressFor(scrollY: number) {
      const b0 = b0Ref.current;
      const b1 = b1Ref.current;
      const b2 = b2Ref.current;
      const b3 = b3Ref.current;
      if (scrollY <= b0) return P_COPY1_START;
      if (scrollY >= b3) return P_COPY2_CENTER;
      if (scrollY <= b1) return lerp(P_COPY1_START, P_COPY1_CENTER, (scrollY - b0) / (b1 - b0));
      if (scrollY <= b2) return lerp(P_COPY1_CENTER, P_COPY2_START, (scrollY - b1) / (b2 - b1));
      return lerp(P_COPY2_START, P_COPY2_CENTER, (scrollY - b2) / (b3 - b2));
    }

    function paint() {
      const p = progressFor(window.scrollY);
      deviceRef.current?.setProgress(p);

      if (ENABLE_FOCUS_DIM) {
        const t1 = copy1TextRef.current;
        const t2 = copy2TextRef.current;
        const copy1Active = p < FOCUS_DIM_SWITCH_P;
        if (t1 && copy1RevealedRef.current) {
          t1.style.transition = `opacity ${FOCUS_DIM_MS}ms ease`;
          t1.style.opacity = copy1Active ? "1" : `${FOCUS_DIM_OPACITY}`;
        }
        if (t2 && copy2RevealedRef.current) {
          t2.style.transition = `opacity ${FOCUS_DIM_MS}ms ease`;
          t2.style.opacity = copy1Active ? `${FOCUS_DIM_OPACITY}` : "1";
        }
      }
    }

    function update() {
      measure();
      paint();
    }

    update();
    if (!inView) return;

    let raf = 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(() => {
        paint();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    // Document height changes (more sections added below, images/fonts
    // loading further down the page) change `maxScrollY` and therefore
    // the b3 clamp — re-measure whenever that happens, not just on
    // viewport resize (same precedent as UspDividerDot).
    const bodyRO = new ResizeObserver(update);
    bodyRO.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      bodyRO.disconnect();
    };
  }, [reducedMotion, inView]);

  return (
    <section
      ref={sectionRef}
      aria-label="Partnership"
      className="relative w-full"
      style={{ background: "linear-gradient(180deg, var(--fig-color-brand-50) 0%, #FFFFFF 100%)" }}
    >
      <div
        className="mx-auto"
        style={{
          width: `calc(100% - 2 * ${SIDE_INSET})`,
          maxWidth: CONTENT_MAX_WIDTH_PX,
          paddingTop: VERTICAL_INSET,
          paddingBottom: VERTICAL_INSET,
          fontFamily: "var(--font-hanken-grotesk)",
        }}
      >
        {/* Badge + heading row */}
        <div ref={headingWrapRef} className="flex items-start justify-between gap-6">
          <h2
            className="font-normal"
            style={{
              color: "var(--fig-color-neutral-900)",
              fontSize: "clamp(26px, 2.9vw, 42px)",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Global technology.
            <br />
            Local people who make it work.
          </h2>
          <SectionBadge label="Partnership" />
        </div>

        {reducedMotion ? (
          <div className="mt-16 flex flex-col items-center gap-10 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-col gap-8" style={{ maxWidth: COPY_MAX_WIDTH_PX, width: "100%" }}>
              <p
                className="font-normal"
                style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px", margin: 0 }}
              >
                {COPY.geotab}
              </p>
              <p
                className="font-normal"
                style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px", margin: 0 }}
              >
                {COPY.feizm}
              </p>
            </div>
            <ScrollFrameSequence
              frameUrls={DEVICE_FRAME_URLS}
              fallbackSrc={DEVICE_FALLBACK_SRC}
              alt="Telematics device"
              reducedMotion
              style={{ width: "min(60vw, 420px)", aspectRatio: "1 / 1", flexShrink: 0 }}
            />
          </div>
        ) : isDesktop ? (
          <div className="mt-16 flex" style={{ gap: 120 }}>
            {/* LEFT column — copy in normal document flow */}
            <div className="shrink-0" style={{ width: `min(100%, ${COPY_MAX_WIDTH_PX}px)` }}>
              <div ref={copy1WrapRef}>
                <p
                  ref={copy1TextRef}
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px", margin: 0 }}
                >
                  {COPY.geotab}
                </p>
              </div>
              <div aria-hidden style={{ height: `${COPY_GAP_VH}vh` }} />
              <div ref={copy2WrapRef}>
                <p
                  ref={copy2TextRef}
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px", margin: 0 }}
                >
                  {COPY.feizm}
                </p>
              </div>
            </div>

            {/* RIGHT column — stretched by the flex row's own default
                align-items:stretch to match the LEFT column's height;
                the sticky box inside it is what actually stays put. */}
            <div className="relative min-w-0 flex-1">
              <div
                className="flex items-center justify-center"
                style={{ position: "sticky", top: "var(--header-h)", height: "calc(100svh - var(--header-h))" }}
              >
                <ScrollFrameSequence
                  ref={deviceRef}
                  frameUrls={DEVICE_FRAME_URLS}
                  fallbackSrc={DEVICE_FALLBACK_SRC}
                  alt="Telematics device"
                  style={{ width: "min(624px, 90%)", aspectRatio: "1 / 1" }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-10 flex flex-col">
            {/* Device — sticky near the top of the screen (not a full-
                height column like desktop); the copy below it is what
                gives this box room to actually stick, same principle as
                the desktop right column just rotated 90°. */}
            <div
              className="relative z-10 flex items-center justify-center"
              style={{
                position: "sticky",
                top: "var(--header-h)",
                height: `${MOBILE_DEVICE_VH}vh`,
                // Opaque, not the section's own gradient: this box sticks
                // at a fixed viewport position while the gradient (tied to
                // the section's own scroll position) moves underneath it,
                // so reusing the gradient here would visibly seam against
                // the real one. A flat near-white tone (close to the
                // gradient's own end stop) reads fine at any scroll depth
                // without needing to track the section's scroll position
                // just to color this box.
                backgroundColor: "#FFFBF8",
              }}
            >
              <ScrollFrameSequence
                ref={deviceRef}
                frameUrls={DEVICE_FRAME_URLS}
                fallbackSrc={DEVICE_FALLBACK_SRC}
                alt="Telematics device"
                style={{ height: "85%", aspectRatio: "1 / 1", maxWidth: "85vw" }}
              />
            </div>

            <div className="mt-8 flex flex-col">
              <div ref={copy1WrapRef}>
                <p
                  ref={copy1TextRef}
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "18px", lineHeight: "28px", margin: 0 }}
                >
                  {COPY.geotab}
                </p>
              </div>
              <div aria-hidden style={{ height: `${COPY_GAP_VH}vh` }} />
              <div ref={copy2WrapRef}>
                <p
                  ref={copy2TextRef}
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "18px", lineHeight: "28px", margin: 0 }}
                >
                  {COPY.feizm}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
