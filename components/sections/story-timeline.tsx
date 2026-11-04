"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type StoryMilestone = { year: string; description: string };

/**
 * Exact copy from spec / Figma's "Story Section" frame (node 7:404, file
 * "FeizM"), verified character-for-character — punctuation included, not
 * normalized. Item 4 has no trailing period because neither the spec nor
 * Figma's own text has one; items 1-3 do.
 */
export const STORY_MILESTONES: StoryMilestone[] = [
  {
    year: "2015",
    description:
      "Feizm established in Singapore to bridge global fleet tech with local markets.",
  },
  {
    year: "2018",
    description:
      "Became authorized Geotab partner — the world's #1 fleet management platform.",
  },
  {
    year: "2019",
    description: "Extended operations across 5 countries in Southeast Asia.",
  },
  {
    year: "2025 - now",
    description: "Planning for expanding in Middle-east and North Africa",
  },
];

// Figma-exact per-column widths (desktop >=768px), read from node 7:404's
// 4 "Tab Panel" layers. Panel 3 and 4 share the same width (378) because
// panel 4 was literally duplicated from panel 3 in Figma (same layer name,
// "Tab Panel - 3 of 9" x2) — not a coincidence, confirmed via figma-cli.
const COLUMN_WIDTHS_PX = [305, 460, 378, 378];
const COLUMN_GAP_DESKTOP = 128; // spacing-128, confirmed identical across all 3 Figma gaps
const COLUMN_GAP_MOBILE = 24; // spacing-24 — Figma has no mobile spec; one slide is visible at a time below 768px anyway

/**
 * "Our Story" timeline — Story Section, Figma node 7:404 ("FeizM" file).
 *
 * Every value below was read live via `figma-cli` against node 7:404, not
 * carried over from an earlier, different Story build in this project
 * (that one was against a different frame, "Our Story Timeline" in a
 * different file, with different content — 3 years, no 2025 item,
 * different ball offset). This component replaces it entirely.
 *
 * Figma file note: the "FeizM" file's Safe Mode plugin connection is
 * unstable — it only binds on roughly 1 in 3-4 daemon restarts (the other
 * open file, "figma-cli test", wins the rest of the time), for reasons
 * that look like a genuine race between two plugin instances rather than
 * anything fixable from the CLI side. All the measurements below were
 * pulled in back-to-back calls immediately after confirming the binding,
 * verified against the bound file each time.
 *
 * Known inconsistency in the source file (reported, not fixed — the file
 * is read-only): Tab Panel 4 ("2025 - now") sits at absolute x:1567, but
 * the section itself is only 1440px wide — it renders entirely outside
 * the visible frame in Figma. The 128px gap pattern between it and panel
 * 3 is otherwise perfectly consistent with the other two gaps, and panel
 * 3/4 share the identical Figma layer name ("Tab Panel - 3 of 9"), so
 * this reads as an unfinished duplicate, not an intentional design.
 * Built as a normal 4th column here regardless, per the given spec.
 *
 * Layout (requirement: multi-column >=1024px like Figma, single column
 * only <768px): each slide's width is driven by a `--col-w` CSS custom
 * property (one of COLUMN_WIDTHS_PX) that only takes effect at the `md:`
 * breakpoint; below that every slide is 100% width. This has to be done
 * via inline custom properties rather than a plain Tailwind arbitrary
 * class per item, because the four widths differ per item and Tailwind's
 * JIT compiler needs the class string itself to be static — `w-[var(--col-w)]`
 * is a static class whose *value* varies at runtime through the custom
 * property, which is what makes this approach actually work.
 *
 * Interaction: Embla Carousel, configured with `containScroll: "keepSnaps"`
 * specifically so every slide keeps its own scroll snap point — the
 * default trimming behavior is what merges snap points when several
 * slides fit in the viewport simultaneously, which is why pagination
 * below is NOT built from `emblaApi.scrollSnapList()` (that still only
 * reflects however many snaps Embla decided to keep) but directly from
 * `STORY_MILESTONES.length`, guaranteeing exactly 4 dots regardless of
 * Embla's internal grouping.
 *
 * The active index and the ball's horizontal position are both derived
 * from the same live geometry, not from Embla's snap index: on every
 * Embla `scroll`/`select`/`reInit` event (and on window resize), every
 * slide's `getBoundingClientRect().left` is measured relative to the
 * track, and whichever slide's left edge is closest to the track's own
 * left edge becomes the active one. This is what makes the ball follow
 * continuously during a drag (not just snap into place at rest) and also
 * what makes the last slide resolve correctly even if Embla's internal
 * snap count is lower than 4 — the geometry doesn't care how many actual
 * snap points exist, it just measures what's on screen.
 *
 * Navigation — touch/mouse drag, two-finger trackpad swipe, Shift+wheel,
 * dot click, clicking a year column directly, and ArrowLeft/ArrowRight
 * (when the track has focus) — all end up calling the same
 * `scrollTo(index)` (click/key paths) or driving the same `scroll`/`select`
 * event pipeline (drag/wheel paths), which is what the geometry sync above
 * reads from — one source of truth instead of separate state for "where
 * Embla thinks it is" vs "where the UI shows the ball."
 *
 * Trackpad/wheel support is the official `embla-carousel-wheel-gestures`
 * plugin, registered as a plugin rather than hand-rolled: it already does
 * the hard part (distinguishing a horizontal-dominant gesture, which
 * should move the carousel, from a vertical one, which must keep scrolling
 * the page — it does this per-gesture automatically since `forceWheelAxis`
 * is left unset) and integrates with Embla's own `dragFree: false` snap
 * behavior for free, so a flick naturally snaps to the nearest year with
 * no custom momentum/threshold code. What the plugin does NOT do is fire
 * Embla's `pointerDown`/`pointerUp` events for a wheel gesture (there's no
 * pointer) — it only toggles a CSS class on the viewport
 * ("is-wheel-dragging") for the gesture's duration. A `MutationObserver`
 * watches that class and folds it into the same `isDraggingRef` state a
 * mouse drag uses, which is what makes the ball continuously follow a
 * trackpad swipe (not just jump at the end) and what drives the
 * grab/grabbing cursor and the temporary text-selection lock for both
 * interaction types through one code path instead of two.
 * `overscroll-behavior-x: contain` on the viewport stops a horizontal
 * trackpad swipe from escalating into the browser's own swipe-to-go-back
 * navigation once the carousel reaches either end; `touch-action: pan-y`
 * does the equivalent for touchscreens, leaving vertical touch-scrolling
 * of the page alone while horizontal touch drags move the carousel.
 *
 * Vertical rhythm — read as absolute y-offsets from the top of the
 * section (i.e. including its own 60px padding-top) via
 * `node.absoluteBoundingBox`, then converted to the gaps below:
 *   - padding-top: 60 (spacing-60)
 *   - badge (36) -> gap 22 (spacing-22) -> heading (44)
 *   - gap 163 (literal — doesn't resolve to a named token) -> scrubber row
 *   - scrubber row, 35 tall: ball at top:0 (32 tall), line at top:33 (2
 *     tall) — the ball's bottom edge sits 1px above the line, essentially
 *     touching it, NOT centered on it. This matches Figma exactly; an
 *     earlier version of a similar component on this page assumed
 *     vertical centering, which was wrong even there.
 *   - gap 22 (spacing-22) -> year columns (302 tall)
 *   - gap 45 (literal) -> pagination dots
 *
 * Other bound DESIGN.md tokens: section background (brand-500), badge
 * fill/border (brand-100/200), badge radius (radius-lg), year-label color
 * (accent-yellow-light), description color (brand-50), column divider
 * (brand-50), description font-size (16px, exact match for
 * typography-size-sm). Not tokenized (literal, verified via figma-cli):
 * badge text color (#b45723), ball stroke (#662611), active dot color
 * (#853217) — all shared-component colors outside the About Us Tokens
 * collection. The badge's font is Inter Medium, genuinely different from
 * the Hanken Grotesk used everywhere else in Figma — kept as read, not
 * normalized, since the ask was to match Figma exactly.
 *
 * The decorative dot-pattern background reuses the real supplied SVG
 * asset from the previous Story build (public/story/pattern.svg) — same
 * halftone graphic, confirmed via figma-cli (1200x1174 white-fill vector
 * at the same relative position), not re-exported this session.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as the other sections — the responsive
 * breakpoints above govern the *carousel*, not the section's own width.
 */
export function StoryTimeline() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      containScroll: "keepSnaps",
      dragFree: false,
    },
    [WheelGesturesPlugin()],
  );

  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ballLeft, setBallLeft] = useState(0);
  // Mirrors `activeIndex` for use inside Embla event callbacks, which close
  // over values from whenever the effect ran, not the latest render.
  const activeIndexRef = useRef(0);
  // True while the user is actively driving the carousel (pointer drag OR
  // a trackpad/wheel gesture) — see the `onScroll` handler below for why
  // this distinction matters, and the effect further down for how wheel
  // gestures (which fire no pointerDown/pointerUp of their own) get
  // folded into it via the plugin's CSS class.
  const isDraggingRef = useRef(false);
  // Furthest scroll-progress values (can exceed [0,1] during overscroll)
  // reached during the current gesture — see onSettle below for why this is
  // needed to resolve Embla's own tied/ambiguous snap points near the end.
  const peakMaxProgressRef = useRef(0);
  const peakMinProgressRef = useRef(0);

  // Measures the position of a SPECIFIC, already-known slide relative to the
  // viewport and moves the ball there — deliberately not "whichever slide is
  // closest to the viewport's left edge" (see below for why that was wrong).
  const measureBallForIndex = useCallback((index: number) => {
    const track = trackRef.current;
    const viewport = track?.parentElement;
    const slide = slideRefs.current[index];
    if (!viewport || !slide) return;
    const viewportRect = viewport.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    setBallLeft(slideRect.left - viewportRect.left);
  }, []);

  const setActive = useCallback(
    (index: number) => {
      activeIndexRef.current = index;
      setActiveIndex(index);
      measureBallForIndex(index);
    },
    [measureBallForIndex],
  );

  useEffect(() => {
    if (!emblaApi) return;
    const viewport = emblaApi.rootNode();

    // Cursor feedback + temporary text-selection lock, shared by both a
    // mouse/touch drag (pointerDown/pointerUp) and a trackpad/wheel gesture
    // (tracked below via the wheel plugin's own CSS class, since wheel
    // gestures fire no pointerDown/pointerUp of their own).
    const beginInteraction = () => {
      isDraggingRef.current = true;
      const p = emblaApi.scrollProgress();
      peakMaxProgressRef.current = p;
      peakMinProgressRef.current = p;
      viewport.style.cursor = "grabbing";
      viewport.style.userSelect = "none";
    };
    const endInteraction = () => {
      isDraggingRef.current = false;
      viewport.style.cursor = "grab";
      viewport.style.userSelect = "";
    };

    const onPointerDown = () => beginInteraction();
    const onPointerUp = () => endInteraction();

    // embla-carousel-wheel-gestures toggles a class on the viewport
    // ("is-wheel-dragging" by default) for the duration of an active wheel
    // gesture, but doesn't fire a matching Embla event — watch the class
    // directly so a trackpad swipe gets exactly the same continuous
    // ball-follow / cursor / text-selection treatment as a pointer drag.
    const wheelDraggingClass = "is-wheel-dragging";
    const classObserver = new MutationObserver(() => {
      if (viewport.classList.contains(wheelDraggingClass)) beginInteraction();
      else endInteraction();
    });
    classObserver.observe(viewport, { attributes: true, attributeFilter: ["class"] });

    // During an actual drag there's no predetermined target slide, so this
    // infers one: whichever slide is currently nearest the viewport's start
    // edge. For a click-driven navigation (scrollTo already set
    // activeIndexRef explicitly) this branch never runs, which is the fix —
    // an earlier version used this "closest" geometry to derive the active
    // index unconditionally, including right after an explicit scrollTo().
    // That broke near the end of the content: Embla's containScroll clamps
    // the max scroll short of fully aligning the last slide(s) to "start"
    // (there isn't enough trailing content to scroll further into), so
    // "closest to the start edge" kept resolving to the slide BEFORE the one
    // that was actually requested, and the ball never reached slides 3/4.
    const onScroll = () => {
      if (isDraggingRef.current) {
        const track = trackRef.current;
        const viewport = track?.parentElement;
        if (!viewport) return;
        const viewportRect = viewport.getBoundingClientRect();
        let closestIndex = 0;
        let closestDistance = Infinity;
        slideRefs.current.forEach((el, i) => {
          if (!el) return;
          const distance = Math.abs(el.getBoundingClientRect().left - viewportRect.left);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
          }
        });
        activeIndexRef.current = closestIndex;
        setActiveIndex(closestIndex);

        // Track how far the live (unclamped) scroll progress travels during
        // this gesture — used on settle to disambiguate Embla's own tied
        // snap points (see onSettle).
        const progress = emblaApi.scrollProgress();
        if (progress > peakMaxProgressRef.current) peakMaxProgressRef.current = progress;
        if (progress < peakMinProgressRef.current) peakMinProgressRef.current = progress;
      }
      // Always re-measure the ball against whichever index is currently
      // active (set either by the drag-geometry guess just above, or
      // directly by scrollTo() for clicks/keys) — this is what makes the
      // ball move smoothly WITH the slide during the scroll animation,
      // landing wherever that slide actually ends up even if Embla clamped
      // short of "start" alignment.
      measureBallForIndex(activeIndexRef.current);
    };

    // When the trailing content is shorter than the viewport (e.g. a narrow
    // last slide), Embla can't give the last slide(s) a distinct "start"
    // aligned scroll position — scrollSnapList() reports the SAME clamped
    // value for more than one index, and selectedScrollSnap() always
    // resolves to the first (earlier) index in that tied group, regardless
    // of which one the user actually dragged/swiped toward. Explicit
    // navigation (scrollTo below) sidesteps this by setting activeIndexRef
    // before Embla ever runs its own resolution; a drag/wheel release has no
    // such explicit target, so resolve the tie here using how far the LIVE
    // (unclamped, can exceed [0,1]) scroll progress overshot the tied value
    // during the gesture — that overshoot is Embla's only signal of intent
    // once every tied index maps to the identical clamped position.
    const onSettle = () => {
      const snapList = emblaApi.scrollSnapList();
      const resolved = emblaApi.selectedScrollSnap();
      const resolvedValue = snapList[resolved];
      const EPS = 0.0005;
      const tiedIndices = snapList.reduce<number[]>((acc, v, i) => {
        if (Math.abs(v - resolvedValue) < EPS) acc.push(i);
        return acc;
      }, []);

      let finalIndex = resolved;
      if (tiedIndices.length > 1) {
        const OVERSHOOT = 0.03;
        if (peakMaxProgressRef.current > resolvedValue + OVERSHOOT) {
          finalIndex = Math.max(...tiedIndices);
        } else if (peakMinProgressRef.current < resolvedValue - OVERSHOOT) {
          finalIndex = Math.min(...tiedIndices);
        }
      }

      if (finalIndex !== activeIndexRef.current) {
        activeIndexRef.current = finalIndex;
        setActiveIndex(finalIndex);
      }
      measureBallForIndex(activeIndexRef.current);
    };

    viewport.style.cursor = "grab";

    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp", onPointerUp);
    emblaApi.on("scroll", onScroll);
    emblaApi.on("settle", onSettle);
    emblaApi.on("reInit", onSettle);
    measureBallForIndex(0);

    return () => {
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp", onPointerUp);
      emblaApi.off("scroll", onScroll);
      emblaApi.off("settle", onSettle);
      emblaApi.off("reInit", onSettle);
      classObserver.disconnect();
    };
  }, [emblaApi, measureBallForIndex]);

  // prefers-reduced-motion: Embla's own snap/settle easing is a JS-driven
  // animation (its `duration` option, in frames), not a CSS transition, so
  // a media-query CSS override can't reach it — it has to be set on the
  // instance directly. The ball's CSS `left` transition is handled
  // separately via Tailwind's `motion-reduce:transition-none` in the JSX.
  useEffect(() => {
    if (!emblaApi) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => emblaApi.reInit({ duration: mq.matches ? 0 : 25 });
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [emblaApi]);

  useEffect(() => {
    const onResize = () => measureBallForIndex(activeIndexRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureBallForIndex]);

  const scrollTo = useCallback(
    (index: number) => {
      if (!emblaApi) return;
      const clamped = Math.max(0, Math.min(STORY_MILESTONES.length - 1, index));
      // Reset the drag-overshoot tie-breaker so a stale peak from an earlier
      // gesture can't override this explicit target once onSettle fires.
      const p = emblaApi.scrollProgress();
      peakMaxProgressRef.current = p;
      peakMinProgressRef.current = p;
      setActive(clamped);
      emblaApi.scrollTo(clamped);
    },
    [emblaApi, setActive],
  );


  // Shift+wheel: real mouse hardware + a real browser converts a shift-held
  // vertical wheel delta into a horizontal one before JS ever sees it (a
  // long-standing, widely-implemented convention), which is normally all
  // embla-carousel-wheel-gestures would need — it just reads deltaX/deltaY,
  // it doesn't care how they got produced. That conversion is specifically
  // an input-layer behavior, though, not something guaranteed by every
  // environment (it isn't reproducible through CDP-dispatched synthetic
  // wheel events, which is how this was actually caught — relying on it
  // untested would have been a guess, not a verified fix). This listener
  // makes Shift+wheel work on its own terms instead of hoping the browser
  // does the conversion: accumulate shiftKey+deltaY and step one year per
  // threshold crossed, through the same `scrollTo()` every other input
  // method uses (so cursor/active-index/ball state all stay consistent).
  // It only acts when the gesture is shift-held AND vertical-dominant —
  // a real horizontal trackpad gesture (shiftKey or not) still goes
  // through the plugin untouched.
  useEffect(() => {
    if (!emblaApi) return;
    const viewport = emblaApi.rootNode();
    let accumulated = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;
    const STEP_PX = 60;

    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      accumulated += e.deltaY;
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        accumulated = 0;
      }, 250);
      if (Math.abs(accumulated) >= STEP_PX) {
        const direction = accumulated > 0 ? 1 : -1;
        accumulated = 0;
        scrollTo(activeIndexRef.current + direction);
      }
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [emblaApi, scrollTo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollTo(activeIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollTo(activeIndex + 1);
    }
  };

  return (
    <section
      className="relative flex w-[1440px] flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--fig-color-brand-500)",
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      {/* Decorative dot pattern — real supplied asset, see file doc comment */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/story/pattern.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0"
        style={{ width: 787, height: "100%" }}
      />

      <div className="relative flex flex-col">
        {/* Badge — Inter Medium, matching Figma exactly (not Hanken Grotesk) */}
        <div
          className="flex w-fit items-center"
          style={{
            fontFamily: "Inter, var(--font-hanken-grotesk)",
            fontWeight: 500,
            gap: "var(--fig-spacing-4)",
            padding: "var(--fig-spacing-8)",
            borderRadius: "var(--fig-radius-md)",
            backgroundColor: "var(--fig-color-brand-100)",
            border: "1px solid var(--fig-color-brand-200)",
            color: "#b45723",
          }}
        >
          <span style={{ fontSize: "14px" }}>03 - Our Story</span>
        </div>

        {/* Heading */}
        <h2
          className="font-normal"
          style={{
            marginTop: 22,
            color: "var(--fig-color-accent-yellow-light)",
            fontSize: "44px",
            lineHeight: "43.03px",
          }}
        >
          Built to solve real fleet challenges.
        </h2>

        {/* Scrubber: ball (top) touching the line (bottom), not centered on it */}
        <div className="relative" style={{ marginTop: 163, height: 35, width: 2033 }}>
          <div
            data-testid="story-ball"
            className="absolute rounded-full transition-[left] duration-150 ease-out motion-reduce:transition-none"
            style={{
              left: ballLeft,
              top: 0,
              width: 32,
              height: 32,
              backgroundColor: "var(--fig-color-neutral-0)",
              border: "1px solid #662611",
            }}
          />
          <div
            className="absolute w-full"
            style={{ top: 33, height: 2, backgroundColor: "var(--fig-color-neutral-0)" }}
          />
        </div>

        {/* Carousel viewport. overscrollBehaviorX:contain stops a
            horizontal trackpad swipe here from triggering the browser's
            own swipe-to-go-back/forward navigation once the carousel hits
            its start/end. cursor starts as "grab" (set imperatively in the
            effect above, alongside "grabbing" during an active drag or
            wheel gesture) rather than as a static class, since it has to
            react to the same pointerDown/pointerUp + wheel-class state. */}
        <div
          ref={emblaRef}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="overflow-hidden focus:outline-none"
          style={{ marginTop: 22, overscrollBehaviorX: "contain", touchAction: "pan-y" }}
        >
          <div
            ref={trackRef}
            className="flex gap-6 md:[gap:var(--track-gap)]"
            style={{ "--track-gap": `${COLUMN_GAP_DESKTOP}px` } as React.CSSProperties}
          >
            {STORY_MILESTONES.map((m, i) => (
              <div
                key={m.year}
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                onClick={() => scrollTo(i)}
                role="button"
                aria-label={`Go to ${m.year}`}
                className="w-full min-w-0 shrink-0 cursor-pointer md:w-[var(--col-w)]"
                style={{ "--col-w": `${COLUMN_WIDTHS_PX[i]}px` } as React.CSSProperties}
              >
                <div
                  className="flex h-full min-w-0 flex-col"
                  style={{
                    gap: "var(--fig-spacing-15)",
                    paddingTop: "var(--fig-spacing-22)",
                    paddingLeft: "var(--fig-spacing-22)",
                    borderLeft: "1px solid var(--fig-color-brand-50)",
                  }}
                >
                  <span
                    className="font-normal"
                    style={{
                      color: "var(--fig-color-accent-yellow-light)",
                      fontSize: "37.42px",
                      lineHeight: "43.03px",
                    }}
                  >
                    {m.year}
                  </span>
                  <p
                    className="font-normal"
                    style={{
                      color: "var(--fig-color-brand-50)",
                      fontSize: "var(--fig-typography-size-sm)",
                      lineHeight: "17.77px",
                    }}
                  >
                    {m.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls row — pagination dots (always STORY_MILESTONES.length,
            never Embla's snap count) on the left, prev/next arrows on the
            right. The arrows call the same scrollTo() used by dot/year
            clicks and arrow keys — no new interaction, just another trigger
            for the existing navigation. */}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: 45 }}
        >
          <div className="flex items-center" style={{ gap: "7px" }}>
            {STORY_MILESTONES.map((m, i) => (
              <button
                key={m.year}
                type="button"
                aria-label={`Go to ${m.year}`}
                onClick={() => scrollTo(i)}
                className="cursor-pointer rounded-full transition-colors"
                style={{
                  width: 8,
                  height: 7,
                  backgroundColor: i === activeIndex ? "#853217" : "var(--fig-color-neutral-0)",
                }}
              />
            ))}
          </div>

          <div className="flex items-center" style={{ gap: "8px" }}>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => scrollTo(activeIndex - 1)}
              className="flex cursor-pointer items-center justify-center"
              style={{
                width: 40,
                height: 32,
                borderRadius: "var(--fig-radius-md)",
                backgroundColor: "var(--fig-color-neutral-0)",
                border: "1px solid var(--fig-color-accent-coral-light)",
              }}
            >
              <ChevronLeft size={16} strokeWidth={1.6} color="#1e1e1e" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => scrollTo(activeIndex + 1)}
              className="flex cursor-pointer items-center justify-center"
              style={{
                width: 40,
                height: 32,
                borderRadius: "var(--fig-radius-md)",
                backgroundColor: "var(--fig-color-neutral-0)",
                border: "1px solid var(--fig-color-accent-coral-light)",
              }}
            >
              <ChevronRight size={16} strokeWidth={1.6} color="#1e1e1e" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
