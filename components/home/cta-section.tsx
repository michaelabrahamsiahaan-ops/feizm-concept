"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { FleetNightMapWidget } from "@/components/FleetNightMapWidget";
import { cubicBezier } from "@/lib/cubic-bezier";

// ---- Tunable constants (same values as the parked scroll-expand-reveal
// pattern — see this file's own doc comment for why) ----
const EXPAND_LENGTH_VH = 100;
const HOLD_LENGTH_VH = 40;
const START_INSET_DESKTOP = 30; // >=1024px
const START_INSET_TABLET = 20; // 768-1023px
const START_INSET_PHONE = 10; // <768px
const START_RADIUS = 24;
const EASE = cubicBezier(0.65, 0, 0.35, 1);
const CONTENT_REVEAL_P = 0.75;
const HEADER_OVERLAY_P = 0.95;
const MAP_SCALE_START = 1.25; // fleet map's own scale at P=0, settles to 1.0 at P=1
const CONTENT_FADE_MS = 400;
const CONTENT_STAGGER_MS = 80;
const CONTENT_BLOCK_WIDTH = 548; // matches Figma's own heading/subtext block width

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/**
 * "CTA" section of the Feizm Homepage ("Home / 08 CTA", node 304:2145 —
 * read live via `figma-cli`. Two duplicate frames exist (304:2145,
 * 323:2683); 304:2145 sits at the same x as every other Home section
 * (11735), the other at a different column (14878) — same disambiguation
 * method used throughout this page's other duplicate-frame cases.
 *
 * Exported as `HomeCTASection`, not `CTASection` — that name is already
 * taken by `components/CTASection.tsx`, the About page's own (visually
 * different) closing banner.
 *
 * ---- Scroll-driven "expand to full screen" reveal ----
 * This is the scroll-expand mechanism that was built for
 * TestimoniesSection, removed from it on the user's own request, and
 * parked in `components/home/scroll-expand-reveal-wip.tsx` + a project
 * memory note specifically so it could be reused once a real section
 * needed it (see that memory entry and the WIP file's own doc comment
 * for the full history). The user asked for it to be applied HERE. The
 * mechanism itself — sticky pin math, `--p` CSS custom-property
 * performance pattern, clip-path reveal, breakpoint-aware start inset,
 * header-overlay integration via `document.documentElement.dataset.
 * forceHeaderOverlay`, reduced-motion fallback — is carried over
 * UNCHANGED from the parked version; only the CONTENT and a few
 * CTA-specific adaptations differ, listed below. This component does not
 * import the WIP file (kept untouched as a reference for a possible
 * future THIRD use) — the mechanism is reimplemented inline with
 * CTA-local constants/types instead.
 *
 * ---- What's different from the parked (Testimonies) version ----
 * 1. Content: Testimonies had a row-split (heading/badge column + quote/
 *    attribution/arrows column) that needed a `stacked` breakpoint
 *    variant. CTA's own Figma content is simpler and ALWAYS a single
 *    left-aligned column (heading -> subtext -> button row, confirmed
 *    `primaryAxisAlignItems: CENTER` / `counterAxisAlignItems: MIN` on
 *    the original static frame) — no row-vs-stack decision needed, so
 *    `stacked` is gone. The fixed `548px` content width becomes
 *    `min(548px, 100%)` so it still wraps instead of overflowing on a
 *    real narrow viewport, same reasoning as every other fixed-width-
 *    wrap case in this project — this only mattered once the section
 *    went fluid/full-bleed (see point 4); the ORIGINAL static version
 *    could hardcode `548` because it sat inside a fixed-1440 wrapper.
 * 2. Background: Testimonies scaled a static photo
 *    (`background.webp`) inside the reveal. CTA's background is the
 *    LIVE animated `FleetNightMapWidget` (see that component's own doc
 *    comment) — same `scale()` treatment during the reveal, applied to
 *    its container div rather than a `next/image`. No extra dark
 *    overlay on top (Testimonies added `rgba(0,0,0,0.5)` for text
 *    legibility over a busy photo) — the fleet map already fades itself
 *    to solid black toward the copy zone by design (confirmed: its own
 *    `FADE_START`/`FADE_END` gradient), so a second overlay would just
 *    needlessly dim the map on the right.
 * 3. Stage backdrop color while the box is small: Testimonies used
 *    `--fig-color-neutral-0` (white) because it sat between two WHITE
 *    sections (ClientIndustriesSection before, and its own white static
 *    design). CTA now sits between TestimoniesSection (a dark photo) and
 *    SiteFooter (solid black) — used `#000000` here instead so the
 *    collapsed-box backdrop blends with both neighbors instead of
 *    flashing white between two dark sections.
 * 4. `app/home/page.tsx`: gets the SAME fluid/full-bleed, no-
 *    `overflow-x-hidden`-wrapper treatment Testimonies used to need, for
 *    the same reason (a box that must genuinely fill the viewport can't
 *    be a fixed-1440px section, and `overflow` on an ancestor of a
 *    `position: sticky` element can break its own stickiness) — see
 *    that file's own doc comment.
 *
 * Everything else — buttons, their exact tokens, the reduced-motion
 * fallback being literally this section's own former static layout — is
 * unchanged from the version `figma-cli` was read from; see git history
 * for that build's own doc comment if the token sourcing needs
 * rechecking.
 */
function StaticHomeCTA() {
  return (
    <section
      className="relative flex w-full flex-col items-start justify-center overflow-hidden"
      style={{
        height: 624,
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        backgroundColor: "#000000",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <FleetNightMapWidget className="pointer-events-none absolute inset-0" />
      <div style={{ width: `min(${CONTENT_BLOCK_WIDTH}px, 100%)` }}>
        <HomeCTAContent visible reducedMotion />
      </div>
    </section>
  );
}

/** Shared between the static fallback and the fullscreen stage. */
function HomeCTAContent({ visible, reducedMotion }: { visible: boolean; reducedMotion: boolean }) {
  function itemStyle(index: number): CSSProperties {
    if (reducedMotion) return { opacity: 1 };
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0px)" : "translateY(24px)",
      transition: `opacity ${CONTENT_FADE_MS}ms ease, transform ${CONTENT_FADE_MS}ms ease`,
      transitionDelay: `${index * CONTENT_STAGGER_MS}ms`,
    };
  }

  return (
    <div className="relative z-10 flex flex-col" style={{ gap: "var(--fig-spacing-24)" }}>
      <div className="flex flex-col">
        <h2
          className="font-medium"
          style={{ ...itemStyle(0), color: "var(--fig-color-neutral-0)", fontSize: "54px", lineHeight: "81px" }}
        >
          Ready to see your fleet clearly?
        </h2>
        <p
          className="font-normal"
          style={{ ...itemStyle(1), color: "var(--fig-color-neutral-0)", fontSize: "20px", lineHeight: "30px" }}
        >
          Get a walkthrough of the platform trusted by 500+ businesses, set up and supported by a local team in your
          time zone.
        </p>
      </div>

      <div className="flex items-center" style={{ ...itemStyle(2), gap: "14px", pointerEvents: visible || reducedMotion ? "auto" : "none" }}>
        <button
          type="button"
          className="cursor-pointer font-medium"
          style={{
            fontFamily: "Inter, var(--font-hanken-grotesk)",
            fontSize: "14px",
            lineHeight: "20px",
            color: "var(--fig-color-neutral-0)",
            backgroundColor: "var(--fig-color-brand-500)",
            border: "1px solid var(--fig-color-accent-coral-light)",
            borderRadius: "var(--fig-radius-md)",
            paddingLeft: "var(--fig-spacing-16)",
            paddingRight: "var(--fig-spacing-16)",
            paddingTop: "var(--fig-spacing-12)",
            paddingBottom: "var(--fig-spacing-12)",
          }}
        >
          Request Demo
        </button>
        <button
          type="button"
          className="cursor-pointer font-medium"
          style={{
            fontFamily: "Inter, var(--font-hanken-grotesk)",
            fontSize: "14px",
            lineHeight: "20px",
            color: "var(--fig-color-neutral-0)",
            border: "1px solid var(--fig-color-neutral-0)",
            borderRadius: "var(--fig-radius-md)",
            paddingLeft: "var(--fig-spacing-16)",
            paddingRight: "var(--fig-spacing-16)",
            paddingTop: "var(--fig-spacing-12)",
            paddingBottom: "var(--fig-spacing-12)",
          }}
        >
          Download Brochure
        </button>
      </div>
    </div>
  );
}

export function HomeCTASection() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tier, setTier] = useState<"desktop" | "tablet" | "phone">("desktop");
  const [contentVisible, setContentVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const startInset = tier === "desktop" ? START_INSET_DESKTOP : tier === "tablet" ? START_INSET_TABLET : START_INSET_PHONE;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const contentVisibleRef = useRef(false);
  const isFullscreenRef = useRef(false);

  useLayoutEffect(() => {
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    const tabletMq = window.matchMedia("(min-width: 768px)");
    const computeTier = (): "desktop" | "tablet" | "phone" => (desktopMq.matches ? "desktop" : tabletMq.matches ? "tablet" : "phone");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as every other such check in this project
    setReducedMotion(motionMq.matches);
    setTier(computeTier());
    const onMotionChange = () => setReducedMotion(motionMq.matches);
    const onTierChange = () => setTier(computeTier());
    motionMq.addEventListener("change", onMotionChange);
    desktopMq.addEventListener("change", onTierChange);
    tabletMq.addEventListener("change", onTierChange);
    return () => {
      motionMq.removeEventListener("change", onMotionChange);
      desktopMq.removeEventListener("change", onTierChange);
      tabletMq.removeEventListener("change", onTierChange);
    };
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "100% 0px 100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.forceHeaderOverlay;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrapper || !stage) return;

    function computeAndApply() {
      if (!wrapper || !stage) return;
      const vh = window.innerHeight;
      const expandPx = (EXPAND_LENGTH_VH / 100) * vh;
      const holdPx = (HOLD_LENGTH_VH / 100) * vh;
      const top = wrapper.getBoundingClientRect().top;
      const scrolledIn = -top;
      const rawP = clamp01(scrolledIn / expandPx);
      const eased = EASE(rawP);
      stage.style.setProperty("--p", eased.toFixed(4));

      const stillStuck = scrolledIn <= expandPx + holdPx;
      const isFullscreenNow = rawP >= HEADER_OVERLAY_P && stillStuck;
      if (isFullscreenNow !== isFullscreenRef.current) {
        isFullscreenRef.current = isFullscreenNow;
        if (isFullscreenNow) document.documentElement.dataset.forceHeaderOverlay = "true";
        else delete document.documentElement.dataset.forceHeaderOverlay;
      }

      const contentVisibleNow = rawP >= CONTENT_REVEAL_P;
      if (contentVisibleNow !== contentVisibleRef.current) {
        contentVisibleRef.current = contentVisibleNow;
        setContentVisible(contentVisibleNow);
      }
    }

    computeAndApply();

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        computeAndApply();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", computeAndApply);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", computeAndApply);
    };
  }, [reducedMotion, inView]);

  if (reducedMotion) {
    return <StaticHomeCTA />;
  }

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ height: `calc(${EXPAND_LENGTH_VH}vh + ${HOLD_LENGTH_VH}vh + 100vh)` }}>
      <div
        ref={stageRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ backgroundColor: "#000000", ["--p" as string]: 0 } as CSSProperties}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            clipPath: `inset(calc(${startInset}% * (1 - var(--p))) calc(${startInset}% * (1 - var(--p))) calc(${startInset}% * (1 - var(--p))) calc(${startInset}% * (1 - var(--p))) round calc(${START_RADIUS}px * (1 - var(--p))))`,
          }}
        >
          <div className="absolute inset-0" style={{ transform: `scale(calc(1 + ${MAP_SCALE_START - 1} * (1 - var(--p))))` }}>
            <FleetNightMapWidget className="absolute inset-0" />
          </div>

          <div
            className="relative flex h-full w-full items-center"
            style={{ padding: `0 var(--fig-spacing-40)`, fontFamily: "var(--font-hanken-grotesk)" }}
          >
            <div style={{ width: `min(${CONTENT_BLOCK_WIDTH}px, 100%)` }}>
              <HomeCTAContent visible={contentVisible} reducedMotion={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
