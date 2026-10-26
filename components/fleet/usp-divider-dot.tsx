"use client";

import { useEffect, useRef } from "react";

// Figma "Ellipse 2" (node 77:69482): 24w x 25h, not a perfect circle. Height
// is what matters for the vertical travel-range math below.
const DOT_WIDTH = 24;
const DOT_HEIGHT = 25;
const LINE_COLOR = "#F9B39D";
const DOT_COLOR = "var(--fig-color-brand-500)";

/**
 * The scroll-linked dot + its dashed track for the Fleet USP section.
 *
 * Fixed from a broken first pass that had TWO static dots (one per grid
 * row) and TWO separate divider segments, neither connected to scroll at
 * all. Both problems traced back to Figma, re-checked directly rather
 * than guessed:
 *   - the row 2 dot's wrapper frame ("Frame 15", node 77:69497) has
 *     `visible: false` in Figma — only ONE dot is actually meant to show.
 *     The ellipse node itself reads `visible: true`, which is why a check
 *     that only looked at the ellipse (not its parent) missed this.
 *   - the two divider segments ARE both visible in Figma, but they're
 *     contiguous (row 1's ends exactly where row 2's begins) and were
 *     always meant to read as one continuous line, not two independent
 *     ones — confirmed against the parent's own instructions, not
 *     re-derived from scratch.
 *
 * This component owns ONE continuous track + ONE dot. It expects to be
 * rendered as an absolutely-positioned child of a `position: relative`
 * wrapper that's exactly as tall as "top of row 1 to bottom of row 2" (no
 * section padding) and exactly as wide as one grid row (so `left: 50%`
 * lands on the same center line Figma uses, x=680 of a 1360-wide row) —
 * see FleetUSP.tsx for how that wrapper is built.
 *
 * Scroll math: `start` is the scrollY at which the track's top edge
 * reaches the viewport's vertical center (dot at the top of the line);
 * `end` is the scrollY at which its bottom edge WOULD reach center,
 * clamped to the document's actual max scrollY. That clamp matters
 * because this is currently the last section on the page — the "natural"
 * end (bottom-of-track-at-center) can sit past what the page can actually
 * scroll to, which without the clamp left the dot stuck partway down the
 * line forever (it physically can't scroll any further to reach the
 * unclamped end). With the clamp, reaching the document's real max scroll
 * always drives progress to exactly 1, however much of the track that
 * corresponds to today — and automatically stops mattering once more
 * sections push the real max scroll past the natural end on its own.
 * `progress = clamp((scrollY - start) / (end - start), 0, 1)`, and `dotY`
 * is that progress scaled to the dot's own travel range (track height
 * minus dot height, so the dot's CENTER — not its top-left corner —
 * reaches the track's true top and bottom edges). Applied via
 * `transform: translate(-50%, dotY)` only — never `top`/`margin` — so
 * moving the dot never triggers layout/reflow.
 *
 * `start`/`end` depend on the track's position, the viewport height, and
 * the document's total height — none of which change on every scroll
 * tick, only on resize or when content elsewhere on the page changes the
 * document's height (more sections will be added below later). So they're
 * computed once by `measure()` (resize, a ResizeObserver on `document.body`
 * for document-height changes, and a ResizeObserver on the track itself
 * for its own layout changes e.g. fonts loading) and cached in refs;
 * `paint()`, which runs on every scroll tick, only reads `window.scrollY`
 * and interpolates — no `getBoundingClientRect()` call in the scroll path
 * at all.
 *
 * Work only happens while the track is near the viewport: an
 * IntersectionObserver (generous rootMargin, so the listener attaches
 * slightly before the section enters view and detaches slightly after it
 * leaves) gates whether the scroll listener is even attached at all, and
 * the listener itself is throttled to one `requestAnimationFrame` per
 * tick.
 */
export function UspDividerDot() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  // Cached by measure(), read by paint() — see comment above for why
  // these are split instead of recomputing rects on every scroll tick.
  const startRef = useRef(0);
  const endRef = useRef(1);
  const trackHeightRef = useRef(1);

  useEffect(() => {
    const track = trackRef.current;
    const dot = dotRef.current;
    if (!track || !dot) return;

    const measure = () => {
      const rect = track.getBoundingClientRect();
      const trackTopAbs = rect.top + window.scrollY;
      const trackHeight = rect.height;
      const center = window.innerHeight / 2;
      const maxScrollY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );

      const start = trackTopAbs - center;
      const naturalEnd = trackTopAbs + trackHeight - center;
      const end = Math.min(naturalEnd, maxScrollY);

      startRef.current = start;
      // Guard against a degenerate (zero/negative) range, e.g. before
      // layout has settled — keeps the division in paint() well-defined.
      endRef.current = Math.max(end, start + 1);
      trackHeightRef.current = trackHeight;
    };

    const paint = () => {
      const start = startRef.current;
      const end = endRef.current;
      const progress = Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
      const dotY = progress * (trackHeightRef.current - DOT_HEIGHT);
      dot.style.transform = `translate(-50%, ${dotY}px)`;
    };

    const update = () => {
      measure();
      paint();
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        paint();
        ticking = false;
      });
    };

    let scrollAttached = false;
    const attachScroll = () => {
      if (scrollAttached) return;
      scrollAttached = true;
      window.addEventListener("scroll", onScroll, { passive: true });
    };
    const detachScroll = () => {
      if (!scrollAttached) return;
      scrollAttached = false;
      window.removeEventListener("scroll", onScroll);
    };

    // Correct position immediately on mount (covers load / refresh
    // mid-page / anchor-link navigation), independent of whether the
    // IntersectionObserver's first callback has fired yet.
    update();

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          attachScroll();
          update();
        } else {
          detachScroll();
        }
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
    io.observe(track);

    const trackRO = new ResizeObserver(() => update());
    trackRO.observe(track);

    // Document height changes (more sections added below, images/fonts
    // loading further down the page, etc.) change `maxScrollY` and
    // therefore `end` — re-measure whenever that happens, not just on
    // viewport resize.
    const bodyRO = new ResizeObserver(() => update());
    bodyRO.observe(document.body);

    window.addEventListener("resize", update);

    return () => {
      detachScroll();
      window.removeEventListener("resize", update);
      io.disconnect();
      trackRO.disconnect();
      bodyRO.disconnect();
    };
  }, []);

  return (
    <div ref={trackRef} aria-hidden="true" className="absolute inset-y-0" style={{ left: "50%", width: 1 }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, ${LINE_COLOR} 0, ${LINE_COLOR} 2px, transparent 2px, transparent 4px)`,
        }}
      />
      <div
        ref={dotRef}
        className="absolute rounded-full"
        style={{
          left: 0,
          top: 0,
          width: DOT_WIDTH,
          height: DOT_HEIGHT,
          backgroundColor: DOT_COLOR,
          transform: "translate(-50%, 0px)",
        }}
      />
    </div>
  );
}
