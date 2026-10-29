"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SectionBadge } from "@/components/SectionBadge";

type Service = {
  number: string;
  title: string;
  description: string;
  href: string;
};

const SERVICES: Service[] = [
  {
    number: "01",
    title: "Fleet Management",
    description:
      "Integrated GPS fleet management system; scalable to every business. It tracks your vehicles, monitors driver behaviour and manages your costs with comprehensive reports on fleet data.",
    href: "#",
  },
  {
    number: "02",
    title: "Asset Management",
    description:
      "IoT based asset tracking solution which makes use of industrialised hardware with sensors and software applications to track real-time information on movable assets.",
    href: "#",
  },
  {
    number: "03",
    title: "Safety and Surveillance",
    description:
      "Provides visual monitoring and assistance for fleet safety and surveillance. It enables drivers to prevent accidents, reduce costs associated to incidents with proof of incidence.",
    href: "#",
  },
  {
    number: "04",
    title: "Transport Management",
    description:
      "Cloud-based transport management system with electronic proof of delivery. It is built for transporters and encourages them to go paperless by digitally planning their jobs online.",
    href: "#",
  },
  {
    number: "05",
    title: "Device Management",
    description:
      "Enables device connectivity via industry standard IoT protocols, HTTP and SDK supporting both cloud and on-premises deployment.",
    href: "#",
  },
];

// Reference values from canalsandwindmills.com's own GSAP hover code, not
// this project's Figma file (the small/large "Frame" ratio from Figma is
// no longer used as the start scale — see the component doc comment).
const ARROW_IN_MS = 950;
const ARROW_IN_EASE = "cubic-bezier(0.16, 1, 0.3, 1)"; // expo.out
const ARROW_OUT_MS = 450;
const ARROW_OUT_EASE = "cubic-bezier(0.215, 0.61, 0.355, 1)"; // power3.out
const ARROW_REDUCED_MOTION_MS = 150;

/**
 * Per-row arrow style — a single function so every activation path (real
 * mouse hover, keyboard focus, and the touch/scroll IntersectionObserver
 * path below) animates through the exact same transition, not three
 * subtly-different copies. Returns a plain inline `style` object rather
 * than Tailwind `hover:`/hand-written CSS classes: the previous version
 * of this component hit two separate Tailwind v4 arbitrary-value bugs
 * (a `scale-(--var)` utility that silently produced no CSS at all, and
 * `outline-2` needing a separate `outline-solid` utility to actually show
 * — see git history) — now that activation is JS-driven anyway (required
 * for the scroll-deactivation and touch-center-activation behavior
 * below), inline style sidesteps that whole class of bug and is no less
 * correct: a CSS transition triggered by an inline style change behaves
 * identically to one triggered by a class/pseudo-class change, including
 * reversing smoothly mid-transition (confirmed in Step 3 verification).
 */
function arrowStyle(isActive: boolean, reducedMotion: boolean): CSSProperties {
  const base: CSSProperties = { transformOrigin: "bottom left" };
  if (reducedMotion) {
    // No scale at all — opacity only, ~150ms, per the brief.
    return {
      ...base,
      opacity: isActive ? 1 : 0,
      transitionProperty: "opacity",
      transitionDuration: `${ARROW_REDUCED_MOTION_MS}ms`,
      transitionTimingFunction: "ease-out",
    };
  }
  return {
    ...base,
    opacity: isActive ? 1 : 0,
    transform: isActive ? "scale(1)" : "scale(0)",
    transitionProperty: "opacity, transform",
    transitionDuration: `${isActive ? ARROW_IN_MS : ARROW_OUT_MS}ms`,
    transitionTimingFunction: isActive ? ARROW_IN_EASE : ARROW_OUT_EASE,
  };
}

/**
 * The hover-reveal arrow (exported from Figma node 189:221649 — the
 * actual arrow instance on "Home / 04 Services - Hover"'s Fleet
 * Management row). Rendered at its native 57x57 (the exported frame's
 * own size, not cropped to the inner ~23.75px glyph) so the reserved
 * layout space matches Figma's own spacing model exactly: the title's
 * own text box width + this frame's full 57px width + the row's 8px gap
 * is what Figma actually measures, not title-width + glyph-width + gap.
 */
function ServiceArrow({ style }: { style?: CSSProperties }) {
  return (
    <svg
      width="57"
      height="57"
      viewBox="0 0 57 57"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={style}
    >
      <path
        d="M16.625 16.625H40.375V40.375"
        stroke="var(--fig-color-brand-500)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.625 40.375L40.375 16.625"
        stroke="var(--fig-color-brand-500)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "Services" section of the Feizm Homepage ("Home / 04 Services", node
 * 206:343030 — re-read fresh each time this section changes in Figma, the
 * node id is NOT stable across revisions, confirmed directly: this was
 * 179:160782 two reads ago) and DESIGN.md's "About Us Tokens" variable
 * collection (same `--fig-*` custom properties as the other sections,
 * from app/tokens.css):
 *   - section background is `brand-50` (`#feefea`) — was `neutral-0`
 *     (white) as of two reads ago
 *   - the "Services" badge next to the heading (`SectionBadge`, same
 *     component/styling as Company's and Stats') was removed in the
 *     PREVIOUS re-read, then reinstated in this one, byte-identical to
 *     its earlier styling (fill/stroke/radius/dot/text all unchanged) —
 *     confirmed directly, not assumed back from habit
 *   - section padding (60/40), content gap (36) and each row's own
 *     top/bottom padding (24) and column gap (64) all map to real spacing
 *     tokens. Each row's LEFT/RIGHT padding is 0 — the row's own
 *     horizontal inset comes entirely from the section's own 40px side
 *     padding, and the description column fills the reclaimed space
 *     (747px wide, not 699).
 *   - heading color (neutral-900), index number color (brand-500), row
 *     divider (neutral-200), title/description color (neutral-900), and
 *     the hover arrow's stroke (brand-500) are all bound variables
 *   - heading (40px), title (32px, was 38px), description (20px) and the
 *     index number (16px) are literal component-scaled sizes
 *
 * Layout: each row is a horizontal flex — a FIXED 549px-wide "index +
 * title" column (fixed, not hug, so every row's title starts at the same
 * x) then the description filling the remainder. Every row has its own
 * bottom-only divider; the list as a whole ALSO has its own top-only
 * divider (confirmed on the "List" frame itself — `strokeTopWeight: 1,
 * strokeBottomWeight: 0` — not on the heading row, which has an empty
 * `strokes` array despite all four of its own per-side weights reading
 * 1: weights without an actual stroke paint render nothing, a real gotcha
 * caught by rendering and pixel-measuring the frame, not by trusting the
 * weight properties alone), between the heading and row 01.
 *
 * ---- Index number / title baseline alignment ----
 * The small index number (16px) and the much larger title (32px) must
 * sit on the same text BASELINE (confirmed by pixel-measuring Figma's own
 * render: the bottom of "01" and the bottom of "Fleet" — a word with no
 * descenders — land on the exact same pixel row). An earlier version of
 * this component tried to approximate this by bottom-aligning the two
 * elements' own line-height BOXES (`items-end` + a hand-tuned padding-
 * bottom on the number) — this is NOT the same thing as baseline
 * alignment and breaks as soon as the two font sizes differ: a font's
 * baseline sits a DIFFERENT distance above its own line-height box's
 * bottom edge depending on font-size (roughly proportional to it, via
 * the font's own ascent/descent metrics), so matching box-bottoms for a
 * 16px and a 32px text of the same font still leaves their baselines
 * offset — confirmed directly, pixel-measured at 7px (the number sitting
 * visibly lower than the title's true baseline, the title's baseline
 * cutting through the number's middle, matching the bug report exactly).
 * `items-baseline` on the index+title flex row fixes this properly: it's
 * a browser-native computation from the actual font metrics, correct
 * regardless of how the two font-sizes/line-heights relate, and (per the
 * flexbox spec) uses a multi-line flex item's FIRST line baseline
 * automatically, so a title wrapping to two lines on a narrow viewport
 * still aligns the number against the first line without extra code.
 * The title+arrow row's own internal alignment (`items-start`, inside
 * the `<h3>`) is unchanged — only the outer index-vs-title alignment
 * changed, so the arrow's own position next to the title is unaffected.
 *
 * ---- Hover arrow animation ----
 * Tuned to match canalsandwindmills.com's own GSAP hover feel (reference
 * values given directly, not re-derived from Figma): scale 0 -> 1,
 * opacity 0 -> 1, `transform-origin: bottom left` so it grows up-and-
 * right in the direction it points. In: 950ms expo.out
 * (`cubic-bezier(0.16,1,0.3,1)`). Out: 450ms power3.out
 * (`cubic-bezier(0.215,0.61,0.355,1)`) — asymmetric on purpose, matching
 * the reference site, not a typo.
 *
 * Every row is a real `<a>` covering the whole row. A single `activeIndex`
 * piece of state (not per-row local state) tracks which ONE row's arrow
 * is showing, fed by three independent sources that all converge on the
 * same `arrowStyle()` output:
 *   1. Mouse hover (`onMouseEnter`/`onMouseLeave`) — hover-capable
 *      devices only (`(hover: hover)`, measured via matchMedia, SSR-safe
 *      default true like every other such check in this project).
 *   2. Keyboard focus (`onFocus`/`onBlur`) — always, regardless of hover
 *      capability, so Tab navigation keeps working on a touch device
 *      with a keyboard attached.
 *   3. Touch/no-hover: an IntersectionObserver per row (`rootMargin:
 *      "-50% 0px -50% 0px"`) activates whichever row is currently
 *      crossing the viewport's vertical center while scrolling, and
 *      only that one — each row's own intersecting state is tracked in a
 *      ref array and `activeIndex` is derived as "the first row
 *      currently intersecting" on every IntersectionObserver callback,
 *      rather than naively setting/clearing on each entry individually
 *      (two adjacent rows crossing the center back-to-back would
 *      otherwise risk a one-frame flicker to `null` between them,
 *      depending on callback batching order).
 *
 * Edge case: scrolling while hovering, with the cursor stationary, can
 * carry the active row out from under the pointer — browsers only
 * re-evaluate `:hover` on pointer movement, not on scroll, so without
 * handling this explicitly the arrow would stay stuck on a row the
 * cursor is no longer over. A `pointermove` listener tracks the last
 * known pointer position; a throttled (rAF) `scroll` listener re-checks
 * whether that position still falls inside the active row's own
 * `getBoundingClientRect()`, and clears `activeIndex` if not.
 *
 * The arrow's 57px-wide box is always rendered (never conditionally
 * mounted) as a sibling of the title text inside the title's own flex
 * row (8px gap, matching Figma's own title-wrapper spacing) — so its
 * space is always reserved and the title never shifts when it animates
 * in, regardless of which of the three activation paths triggered it.
 * Only `opacity` and `transform: scale()` are ever animated (GPU-only,
 * no layout properties) — a CSS transition reversing mid-flight
 * interpolates from whatever the current rendered value is, the same
 * whether the trigger was a class/pseudo-class change or (as here) an
 * inline style change, confirmed directly in Step 3 verification.
 *
 * `prefers-reduced-motion`: `arrowStyle()`'s own `reducedMotion` branch
 * drops the scale entirely and shortens to ~150ms, applied uniformly
 * across all three activation paths since they all go through the same
 * function.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison at desktop, same convention as the other sections — the
 * touch-activation path is what actually gets exercised at narrow
 * viewports, not a separate responsive layout.
 */
export function ServicesSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // SSR-safe defaults (hover-capable, not reduced-motion) — corrected
  // post-mount, before first paint, same tradeoff as every other such
  // check in this project (see e.g. HomeCompany's own reducedMotion).
  const [canHover, setCanHover] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const activeIndexRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: -1, y: -1 });

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useLayoutEffect(() => {
    const hoverMq = window.matchMedia("(hover: hover)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as every other such check in this project
    setCanHover(hoverMq.matches);
    setReducedMotion(motionMq.matches);
    const onHoverChange = () => setCanHover(hoverMq.matches);
    const onMotionChange = () => setReducedMotion(motionMq.matches);
    hoverMq.addEventListener("change", onHoverChange);
    motionMq.addEventListener("change", onMotionChange);
    return () => {
      hoverMq.removeEventListener("change", onHoverChange);
      motionMq.removeEventListener("change", onMotionChange);
    };
  }, []);

  // Hover-capable devices only — see the "Edge case" doc comment above.
  useEffect(() => {
    if (!canHover) return;

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };

    let ticking = false;
    const checkActiveUnderPointer = () => {
      ticking = false;
      const idx = activeIndexRef.current;
      if (idx === null) return;
      const el = rowRefs.current[idx];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const { x, y } = pointerRef.current;
      const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      if (!inside) setActiveIndex(null);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(checkActiveUnderPointer);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [canHover]);

  // Touch/no-hover devices only — see the "Touch/no-hover" doc comment
  // above for why `activeIndex` is derived from a full intersecting-array
  // scan on every callback rather than set/cleared per entry.
  useEffect(() => {
    if (canHover) return;
    const intersecting = new Array(SERVICES.length).fill(false) as boolean[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = rowRefs.current.indexOf(entry.target as HTMLAnchorElement);
          if (idx !== -1) intersecting[idx] = entry.isIntersecting;
        }
        const activeIdx = intersecting.findIndex(Boolean);
        setActiveIndex(activeIdx === -1 ? null : activeIdx);
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    for (const el of rowRefs.current) {
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [canHover]);

  return (
    <section
      className="flex w-[1440px] flex-col"
      style={{
        backgroundColor: "var(--fig-color-brand-50)",
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        gap: "36px",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <div className="flex w-full items-center justify-between">
        <h2
          className="font-normal"
          style={{
            color: "var(--fig-color-neutral-900)",
            fontSize: "40px",
            lineHeight: "44.9px",
          }}
        >
          What can FeizM do for your business?
        </h2>
        <SectionBadge label="Services" />
      </div>

      <div className="flex w-full flex-col" style={{ borderTop: "1px solid var(--fig-color-neutral-200)" }}>
        {SERVICES.map((service, i) => (
          <a
            key={service.number}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            href={service.href}
            onMouseEnter={() => canHover && setActiveIndex(i)}
            onMouseLeave={() => canHover && setActiveIndex((prev) => (prev === i ? null : prev))}
            onFocus={() => setActiveIndex(i)}
            onBlur={() => setActiveIndex((prev) => (prev === i ? null : prev))}
            className="flex w-full items-start no-underline outline-none focus-visible:rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--fig-color-brand-500)]"
            style={{
              gap: "var(--fig-spacing-64)",
              paddingTop: "var(--fig-spacing-24)",
              paddingBottom: "var(--fig-spacing-24)",
              borderBottom: "1px solid var(--fig-color-neutral-200)",
            }}
          >
            <div className="flex shrink-0 items-baseline" style={{ width: 549, gap: "var(--fig-spacing-8)" }}>
              <span
                className="shrink-0 font-normal"
                style={{ color: "var(--fig-color-brand-500)", fontSize: "16px", lineHeight: "22px" }}
              >
                {service.number}
              </span>
              <h3
                className="flex items-start font-normal"
                style={{ color: "var(--fig-color-neutral-900)", fontSize: "32px", lineHeight: "48px", gap: "8px" }}
              >
                <span>{service.title}</span>
                <ServiceArrow style={arrowStyle(activeIndex === i, reducedMotion)} />
              </h3>
            </div>
            <p
              className="min-w-0 flex-1 font-normal"
              style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px" }}
            >
              {service.description}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
