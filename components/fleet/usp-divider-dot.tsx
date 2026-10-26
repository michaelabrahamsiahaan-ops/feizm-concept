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
 * Scroll math (exactly as specified): on every scroll tick, `progress`
 * is how far the viewport's vertical center has traveled through the
 * track (0 = track's top edge is at the viewport center, 1 = track's
 * bottom edge is), clamped to [0, 1] so the dot never leaves the line.
 * `dotY` is that progress scaled to the dot's own travel range
 * (track height minus dot height, so the dot's CENTER — not its top-left
 * corner — reaches the track's true top and bottom edges). Applied via
 * `transform: translate(-50%, dotY)` only — never `top`/`margin` — so
 * moving the dot never triggers layout/reflow.
 *
 * Work only happens while the track is near the viewport: an
 * IntersectionObserver (generous rootMargin, so the listener attaches
 * slightly before the section enters view and detaches slightly after it
 * leaves) gates whether the scroll listener is even attached at all, and
 * the listener itself is throttled to one `requestAnimationFrame` per
 * tick. A ResizeObserver on the track re-runs the same calculation on
 * layout changes (e.g. fonts finishing load, window resize) so the dot
 * can't drift off the line.
 */
export function UspDividerDot() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    const dot = dotRef.current;
    if (!track || !dot) return;

    const update = () => {
      const rect = track.getBoundingClientRect();
      const center = window.innerHeight / 2;
      const progress = Math.min(1, Math.max(0, (center - rect.top) / rect.height));
      const dotY = progress * (rect.height - DOT_HEIGHT);
      dot.style.transform = `translate(-50%, ${dotY}px)`;
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
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

    const ro = new ResizeObserver(() => update());
    ro.observe(track);

    window.addEventListener("resize", update);

    return () => {
      detachScroll();
      window.removeEventListener("resize", update);
      io.disconnect();
      ro.disconnect();
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
