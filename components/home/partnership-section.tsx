"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SectionBadge } from "@/components/SectionBadge";
import { ScrollFrameSequence, type ScrollFrameSequenceHandle } from "@/components/shared/scroll-frame-sequence";

// ---- Fluid insets — same clamp formulas as StatsSection (Figma's own
// 60px/40px section padding at its 1440 reference width). ----
const SIDE_INSET = "clamp(16px, 2.8vw, 64px)";
const VERTICAL_INSET = "clamp(24px, 4.17vw, 96px)";
// Extra space rendered INSIDE the left column, right after copy 2 (see
// where it's used below) — needed because this is currently the LAST
// section on the page (no footer yet). This has to live inside the left
// column specifically: the right column's sticky travel range comes from
// the ROW's own stretched height (flex `align-items: stretch`), which
// itself comes from the LEFT column's content height — extra height
// anywhere else (e.g. section padding outside the row) does nothing to
// the sticky's containing block. Without it, two things break at once:
// copy 2's reveal (triggers at ~85% of viewport) never fires because the
// document can't scroll far enough for copy 2 to cross that threshold,
// AND the sticky device releases and scrolls away well BEFORE copy 2
// reaches center (confirmed both ways by measurement at 1440x900).
// Tuned empirically (not derived from a closed-form formula — the sticky
// release point depends on the row's stretched height in a way that's
// easy to get sign/offset errors in by hand) to the smallest value that
// keeps the device visible and sticky through copy 2 reaching center at
// both 1440x900 and 1280x720.
const BOTTOM_SPACER_VH = 50;
const CONTENT_MAX_WIDTH_PX = 1600; // matches StatsSection's own CARD_MAX_WIDTH_PX
// 120px in Figma between the copy column and the device, reused as the
// column gap here (fluid so it doesn't force the layout wider than the
// viewport below the 1440 reference width it was measured at).
const COLUMN_GAP = "clamp(40px, 8vw, 120px)";
// Figma's own gap between the badge/heading block and the first copy row
// (59.87px, "Container"'s own itemSpacing on node 212:343206).
const HEADING_TO_COPY1_GAP = "clamp(24px, 4.16vw, 60px)";
// Each copy <p>'s own literal Figma text-node width (NOT the hugged
// Container width) — 577 for "Geotab brings…" (213:343268), 616 for
// "Feizm brings…" (216:343281), read directly off each TEXT node, not
// derived from the row's available space. They differ in Figma itself
// (confirmed: row 2's text is fixed at exactly its row's available width,
// row 1's is narrower than ITS row's available width) — kept as two
// distinct caps rather than forced to match, so both wrap the same way
// Figma does (2 lines each).
const COPY1_MAX_WIDTH_PX = 577;
const COPY2_MAX_WIDTH_PX = 616;
const RIGHT_COLUMN_WIDTH = "min(40vw, 624px)"; // Figma's own 624x624 device box, capped

// ---- Device frame sequence (public/illustrations/device/, copied from
// ~/Downloads/device-scroll/ — see that folder's own README.md for the
// authoritative timeline baked into the 48 frames themselves):
//   0.00-0.10 back view, held
//   0.10-0.70 rotates to the 3/4 front-top view (ease baked into the
//     frames, not re-applied here — see ScrollFrameSequence's own comment)
//   0.70-0.80 settled, LEDs off
//   0.80-0.95 LEDs light red -> green -> blue
//   0.95-1.00 final lit state, held ----
const FRAME_COUNT = 48;
const DEVICE_FRAME_URLS = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/illustrations/device/frames/frame_${String(i).padStart(2, "0")}.webp`,
);
const DEVICE_FALLBACK_SRC = "/illustrations/device/device-final-lit.webp";

// ---- Copy layout ----
// Vertical gap between copy 1 and copy 2 specifically (NOT the
// heading-to-copy1 gap) — large on purpose, so each copy block gets
// roughly its own viewport of scroll to rise into, settle, and own a
// phase of the device animation before the next one starts entering.
const COPY_GAP_VH = 80;

// ---- Device progress phases (p 0->1, driven by the copy blocks' own
// scroll position — see measure()/paint() below) ----
const PHASE1_END = 0.7; // copy 1 bottom-of-viewport -> center: p 0 -> 0.70
const PHASE2_END = 0.8; // gap between the copies: p 0.70 -> 0.80
// copy 2 bottom-of-viewport -> center: p 0.80 -> 1.00

// ---- Copy reveal (joinsystems.co-style rise-in) ----
const REVEAL_DURATION_MS = 800;
const REVEAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const REVEAL_TRANSLATE_PX = 40;
// "~85% of the viewport height" => shrink the IntersectionObserver's
// effective viewport by 15% from the bottom, so isIntersecting flips true
// exactly when the element enters that top 85% band.
const REVEAL_ROOT_MARGIN = "0px 0px -15% 0px";

// ---- Optional focus-dim (behind a flag, see this component's own doc
// comment — built so both variants can be screenshotted and compared) ----
const ENABLE_FOCUS_DIM = false;
const FOCUS_DIM_OPACITY = 0.35;
const FOCUS_DIM_DURATION_MS = 300;

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

const COPY = {
  geotab: "Geotab brings #1-ranked telematics platform (ABI Research) and GO devices & global data",
  feizm: "Feizm brings On-site deployment, training for your team, local support with same time zone",
};

/**
 * Attaches the joinsystems.co-style "rise in once" reveal to one element:
 * opacity 0 + translateY(REVEAL_TRANSLATE_PX) -> opacity 1 + translateY(0)
 * over REVEAL_DURATION_MS, triggered the first time the element crosses
 * into the top 85% of the viewport (REVEAL_ROOT_MARGIN), and never
 * reverses (the observer disconnects itself after firing once — scrolling
 * back up never re-hides it).
 *
 * "If the page loads with a block already past its trigger point, show it
 * immediately without animating": the very first IntersectionObserver
 * callback can fire with `isIntersecting: true` on mount (e.g. a reload
 * mid-page) — that first callback applies the revealed state with
 * `transition: none` instead of the normal transition, so there's nothing
 * to animate from. Every later (real, scroll-triggered) callback gets the
 * normal timed transition.
 *
 * Returns a disconnect function for cleanup. Does nothing (and returns a
 * no-op) when `el` is null, so callers can call this unconditionally in a
 * layout effect without their own null-guard.
 */
function attachReveal(el: HTMLElement | null): () => void {
  if (!el) return () => {};
  el.style.opacity = "0";
  el.style.transform = `translateY(${REVEAL_TRANSLATE_PX}px)`;
  el.style.transition = "none";

  let firstCallback = true;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) {
        firstCallback = false;
        return;
      }
      if (!firstCallback) {
        el.style.transition = `opacity ${REVEAL_DURATION_MS}ms ${REVEAL_EASE}, transform ${REVEAL_DURATION_MS}ms ${REVEAL_EASE}`;
      }
      // Two rAFs: one to let the (possibly "none") transition value
      // commit as a style, a second before flipping the animated
      // properties — otherwise the browser can coalesce the transition
      // and the property change into the same frame and skip straight to
      // the end state even when a real transition was requested.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0px)";
        });
      });
      firstCallback = false;
      io.disconnect();
    },
    { rootMargin: REVEAL_ROOT_MARGIN },
  );
  io.observe(el);
  return () => io.disconnect();
}

/**
 * "Partnership" section of the Feizm Homepage ("Home / 05 Partnership",
 * node 212:343205, read live via `figma-cli`).
 *
 * ---- What Figma actually has vs. what this builds ----
 * Figma's own frame is fully static: a badge+heading row, then TWO
 * identical rows (copy left, 624x624 device image right) stacked 120px
 * apart — both device images are pixel-identical to the supplied
 * `device-final-lit.png` (the same static asset placed twice, not two
 * different illustrations — confirmed directly, not assumed). No
 * prototype/reaction data exists on any node in this frame. The
 * scroll-scrubbed rotation + joinsystems.co-style sticky layout below is
 * a deliberate web-only enhancement, confirmed with the user.
 *
 * ---- Structure (replaces an earlier full-section-pin build) ----
 * This is now a NORMAL-FLOW section, not pinned. Two columns at >=1024px:
 *   - LEFT: badge+heading row, then copy 1, then copy 2 — real HTML text
 *     in document order, each copy block's own max-width taken directly
 *     from its Figma text node (577px / 616px — see COPY1/2_MAX_WIDTH_PX,
 *     these are NOT the same value in Figma and are kept distinct on
 *     purpose), separated by `COPY_GAP_VH` (80vh) so each one gets
 *     roughly a full viewport of scroll to rise into and own a phase of
 *     the device animation.
 *   - RIGHT: ONLY the device canvas, inside a `position: sticky` box
 *     (`top: var(--header-h)`, `height: calc(100svh - var(--header-h))`,
 *     centered) nested in a right-column div with NO explicit height of
 *     its own — flexbox's default `align-items: stretch` on the row makes
 *     that outer div match the LEFT column's full (much taller) natural
 *     height, which is what gives the sticky box something to stick
 *     *within* and release from cleanly once the row's bottom (= left
 *     column's bottom) scrolls up to it. No JS manages the stickiness —
 *     it's plain CSS, same as any sticky-sidebar-next-to-long-content
 *     layout.
 *
 * ---- Device progress (p 0->1) ----
 * Driven by where the two copy blocks ACTUALLY are on screen, not by a
 * pin wrapper (there isn't one anymore):
 *   - copy 1 moving from entering the viewport bottom to centered -> p
 *     0.00 -> PHASE1_END (0.70)
 *   - the gap between copy 1 centered and copy 2 entering -> p
 *     PHASE1_END -> PHASE2_END (0.70 -> 0.80)
 *   - copy 2 moving from entering the viewport bottom to centered -> p
 *     PHASE2_END -> 1.00
 * Implemented the same measure()/paint() split as the Fleet USP divider
 * dot (components/fleet/usp-divider-dot.tsx): `measure()` converts each
 * copy block's live position into fixed DOCUMENT-space scrollY
 * thresholds (`enter1`/`centered1`/`enter2`/`centered2` — the scrollY at
 * which that block's center reaches the viewport bottom / viewport
 * center, respectively) and caches them in refs; `paint()`, which runs on
 * every scroll tick, only reads `window.scrollY` against those cached
 * thresholds — no `getBoundingClientRect()` in the scroll path itself.
 * Re-measured on resize, when the copy blocks' own layout changes
 * (ResizeObserver on each), and — same fix as the USP dot, for the same
 * reason — on `document.body` resize, since this is currently the LAST
 * section on the page: `centered2`'s NATURAL value (where copy 2 would
 * sit exactly centered) can fall past the document's actual max scrollY
 * when there isn't enough page left below it, which without a clamp
 * would strand `p` short of 1 forever (the page physically can't scroll
 * that far). Clamping `centered2` (and `enter2`) to `maxScrollY` makes
 * `p` reach exactly 1.00 at the real end of the page, however much of
 * copy 2's approach that corresponds to today, and stops mattering on its
 * own once more sections push the real max scroll past the natural value.
 *
 * ---- Copy reveal ----
 * `attachReveal()` (above) handles the "rise in once at ~85% of the
 * viewport, never fades back out" behavior for the heading/badge row and
 * both copy blocks independently — plain opacity/transform CSS
 * transitions, not scroll-tick-driven, so they cost nothing in the p
 * scroll handler.
 *
 * ---- Optional focus-dim (ENABLE_FOCUS_DIM) ----
 * When true, the copy block that ISN'T paired with the device's current
 * phase (p < 0.75 => copy 1 is "active", >= 0.75 => copy 2 is) dims to
 * FOCUS_DIM_OPACITY over FOCUS_DIM_DURATION_MS. Implemented as a SEPARATE
 * nested wrapper around each copy's text (its own opacity + transition,
 * independent of and multiplying with the reveal wrapper's opacity) so it
 * never fights the reveal-in transition's own timing/easing. Off by
 * default — both stay fully visible once revealed, per the brief.
 *
 * ---- Reduced motion ----
 * No reveal animation, no scrub, no sticky: both copy blocks render at
 * their final state immediately, and the device is a plain static
 * `device-final-lit.webp` image next to them (ScrollFrameSequence's own
 * `reducedMotion` branch) — same two-column shape, just inert.
 *
 * ---- Below 1024px ----
 * Not an approved design yet — ask before building the real mobile
 * layout. `isDesktop` (plain `matchMedia`, SSR-safe default true,
 * corrected post-mount) gates ONLY the sticky positioning; the column
 * ↔ stack switch itself is Tailwind's own `lg:flex-row` (a compiled CSS
 * breakpoint, not JS, so there's no hydration-mismatch risk for that
 * part). Below 1024px this renders as an inert stacked fallback — the
 * device scrolls in normal flow (not stuck) at a smaller placeholder
 * width — not the real mobile design.
 */
export function PartnershipSection() {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const headingRowRef = useRef<HTMLDivElement | null>(null);
  // copy1Ref/copy2Ref point at the stable, NEVER-transformed <p> wrappers
  // (read by the scroll-math measure() below) — the reveal's own
  // opacity/translateY is applied to a separate inner span
  // (copy1RevealRef/copy2RevealRef) instead of these, specifically so a
  // getBoundingClientRect() read during/after the reveal transition never
  // picks up its transform offset (see this component's own doc comment).
  const copy1Ref = useRef<HTMLParagraphElement | null>(null);
  const copy2Ref = useRef<HTMLParagraphElement | null>(null);
  const copy1RevealRef = useRef<HTMLSpanElement | null>(null);
  const copy2RevealRef = useRef<HTMLSpanElement | null>(null);
  const copy1DimRef = useRef<HTMLSpanElement | null>(null);
  const copy2DimRef = useRef<HTMLSpanElement | null>(null);
  const deviceRef = useRef<ScrollFrameSequenceHandle | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  // Gates the sticky positioning specifically (not the column layout,
  // which is plain Tailwind `lg:flex-row` — a compiled CSS breakpoint,
  // not JS, so it can't mismatch on hydration). Below 1024px this section
  // doesn't have an approved design yet (see this component's own doc
  // comment) — `position: sticky` on the device would still technically
  // "work" stacked in a column, just not as anything reviewed, so it's
  // switched off there rather than shipped un-asked-for. SSR-safe default
  // true, corrected post-mount — same tradeoff as every other
  // measured-after-mount value in this project.
  const [isDesktop, setIsDesktop] = useState(true);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as reducedMotion above
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ---- Reveal: heading row + both copy blocks, independent of the
  // scroll-linked device progress below. ----
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const disconnectHeading = attachReveal(headingRowRef.current);
    const disconnectCopy1 = attachReveal(copy1RevealRef.current);
    const disconnectCopy2 = attachReveal(copy2RevealRef.current);
    return () => {
      disconnectHeading();
      disconnectCopy1();
      disconnectCopy2();
    };
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "100% 0px 100% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ---- Device progress (p) + optional focus-dim — see this component's
  // own doc comment for the measure()/paint() split and the maxScrollY
  // clamp (same technique as the Fleet USP divider dot). ----
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const copy1 = copy1Ref.current;
    const copy2 = copy2Ref.current;
    if (!copy1 || !copy2) return;

    const enter1Ref = { current: 0 };
    const centered1Ref = { current: 1 };
    const enter2Ref = { current: 2 };
    const centered2Ref = { current: 3 };
    let activePhaseRef: 1 | 2 = 1;

    function measure() {
      const vh = window.innerHeight;
      const r1 = copy1!.getBoundingClientRect();
      const r2 = copy2!.getBoundingClientRect();
      const scrollY = window.scrollY;
      const center1Doc = r1.top + scrollY + r1.height / 2;
      const center2Doc = r2.top + scrollY + r2.height / 2;
      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - vh);

      const enter1 = center1Doc - vh;
      const centered1 = center1Doc - vh / 2;
      const naturalEnter2 = center2Doc - vh;
      const naturalCentered2 = center2Doc - vh / 2;

      enter1Ref.current = enter1;
      centered1Ref.current = Math.max(centered1, enter1 + 1);
      // Clamp to the document's real max scroll — see this component's
      // own doc comment (same fix as the Fleet USP divider dot) — so p
      // reaches exactly 1 at the real end of the page even when there
      // isn't enough room below copy 2 for it to naturally reach center.
      const enter2 = Math.min(naturalEnter2, maxScrollY);
      const centered2 = Math.min(naturalCentered2, maxScrollY);
      enter2Ref.current = Math.max(enter2, centered1Ref.current + 1);
      centered2Ref.current = Math.max(centered2, enter2Ref.current + 1);
    }

    function paint() {
      const scrollY = window.scrollY;
      const enter1 = enter1Ref.current;
      const centered1 = centered1Ref.current;
      const enter2 = enter2Ref.current;
      const centered2 = centered2Ref.current;

      const c1 = clamp((scrollY - enter1) / (centered1 - enter1), 0, 1);
      const c2 = clamp((scrollY - enter2) / (centered2 - enter2), 0, 1);

      let p: number;
      if (scrollY <= centered1) {
        p = c1 * PHASE1_END;
      } else if (scrollY <= enter2) {
        const g = clamp((scrollY - centered1) / (enter2 - centered1), 0, 1);
        p = PHASE1_END + g * (PHASE2_END - PHASE1_END);
      } else {
        p = PHASE2_END + c2 * (1 - PHASE2_END);
      }
      p = clamp(p, 0, 1);
      deviceRef.current?.setProgress(p);

      if (ENABLE_FOCUS_DIM) {
        const nextPhase: 1 | 2 = p < 0.75 ? 1 : 2;
        if (nextPhase !== activePhaseRef) {
          activePhaseRef = nextPhase;
          const dim1 = copy1DimRef.current;
          const dim2 = copy2DimRef.current;
          if (dim1) dim1.style.opacity = nextPhase === 1 ? "1" : `${FOCUS_DIM_OPACITY}`;
          if (dim2) dim2.style.opacity = nextPhase === 2 ? "1" : `${FOCUS_DIM_OPACITY}`;
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

    const copy1RO = new ResizeObserver(update);
    copy1RO.observe(copy1);
    const copy2RO = new ResizeObserver(update);
    copy2RO.observe(copy2);
    // See this component's own doc comment: this section being the LAST
    // one on the page means the document's own height can change (more
    // sections added below later) in a way that changes maxScrollY/the
    // clamp above, independent of this section's own layout.
    const bodyRO = new ResizeObserver(update);
    bodyRO.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      copy1RO.disconnect();
      copy2RO.disconnect();
      bodyRO.disconnect();
    };
  }, [reducedMotion, inView]);

  const copyTextStyle = (maxWidth: number): CSSProperties => ({
    color: "var(--fig-color-neutral-900)",
    fontSize: "20px",
    lineHeight: "30px",
    margin: 0,
    maxWidth,
  });

  return (
    <section
      ref={wrapperRef}
      className="relative w-full"
      style={{
        background: "linear-gradient(180deg, var(--fig-color-brand-50) 0%, #FFFFFF 100%)",
        paddingTop: VERTICAL_INSET,
        paddingBottom: VERTICAL_INSET,
      }}
      aria-label="Partnership"
    >
      <div
        className="mx-auto flex flex-col items-start lg:flex-row lg:items-stretch"
        style={{
          width: `calc(100% - 2 * ${SIDE_INSET})`,
          maxWidth: CONTENT_MAX_WIDTH_PX,
          gap: COLUMN_GAP,
          fontFamily: "var(--font-hanken-grotesk)",
        }}
      >
        {/* Left column — heading/badge, then both copy blocks in normal flow */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={headingRowRef} className="flex items-start justify-between gap-6">
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

          <p
            ref={copy1Ref}
            className="font-normal"
            style={{ ...copyTextStyle(COPY1_MAX_WIDTH_PX), marginTop: HEADING_TO_COPY1_GAP }}
          >
            <span ref={copy1RevealRef} style={{ display: "inline-block" }}>
              {ENABLE_FOCUS_DIM ? (
                <span ref={copy1DimRef} style={{ transition: `opacity ${FOCUS_DIM_DURATION_MS}ms ease` }}>
                  {COPY.geotab}
                </span>
              ) : (
                COPY.geotab
              )}
            </span>
          </p>

          <p
            ref={copy2Ref}
            className="font-normal"
            style={{ ...copyTextStyle(COPY2_MAX_WIDTH_PX), marginTop: reducedMotion ? HEADING_TO_COPY1_GAP : `${COPY_GAP_VH}vh` }}
          >
            <span ref={copy2RevealRef} style={{ display: "inline-block" }}>
              {ENABLE_FOCUS_DIM ? (
                <span ref={copy2DimRef} style={{ transition: `opacity ${FOCUS_DIM_DURATION_MS}ms ease` }}>
                  {COPY.feizm}
                </span>
              ) : (
                COPY.feizm
              )}
            </span>
          </p>

          {/* See BOTTOM_SPACER_VH's own comment — this has to live INSIDE
              the left column (not as section padding outside the row):
              the right column's sticky travel range comes from the ROW's
              own stretched height, which in turn comes from the LEFT
              column's content height, so only extra height actually
              inside this column pushes the sticky release point later. */}
          {!reducedMotion && <div aria-hidden style={{ height: `${BOTTOM_SPACER_VH}vh` }} />}
        </div>

        {/* Right column — device only. No explicit height: the flex
            row's default `align-items: stretch` makes this div match the
            left column's full (much taller) height, which is what lets
            the sticky box inside it stick through both copy phases and
            release cleanly at the row's own bottom. */}
        <div className="relative w-full shrink-0" style={{ width: isDesktop ? RIGHT_COLUMN_WIDTH : "min(70vw, 380px)" }}>
          <div
            className="flex items-center justify-center"
            style={
              reducedMotion || !isDesktop
                ? undefined
                : { position: "sticky", top: "var(--header-h)", height: "calc(100svh - var(--header-h))" }
            }
          >
            <ScrollFrameSequence
              ref={deviceRef}
              frameUrls={DEVICE_FRAME_URLS}
              fallbackSrc={DEVICE_FALLBACK_SRC}
              alt="Telematics device"
              reducedMotion={reducedMotion}
              style={{ width: "100%", maxWidth: 624, maxHeight: 624, aspectRatio: "1 / 1" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
