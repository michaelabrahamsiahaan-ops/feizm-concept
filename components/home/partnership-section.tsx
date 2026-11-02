"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SectionBadge } from "@/components/SectionBadge";
import { ScrollFrameSequence, type ScrollFrameSequenceHandle } from "@/components/shared/scroll-frame-sequence";

// ---- Fluid insets — same clamp formulas as StatsSection (Figma's own
// 60px/40px section padding at its 1440 reference width), reused rather
// than re-derived so every pinned Home section breathes the same amount
// relative to viewport size. ----
const SIDE_INSET = "clamp(16px, 2.8vw, 64px)";
const VERTICAL_INSET_MIN_PX = 24;
const VERTICAL_INSET_PREFERRED_VW = 4.17;
const VERTICAL_INSET_MAX_PX = 96;
const VERTICAL_INSET = `clamp(${VERTICAL_INSET_MIN_PX}px, ${VERTICAL_INSET_PREFERRED_VW}vw, ${VERTICAL_INSET_MAX_PX}px)`;
const CONTENT_MAX_WIDTH_PX = 1600; // matches StatsSection's own CARD_MAX_WIDTH_PX
const CONTENT_MIN_HEIGHT_PX = 460;

// ---- Device frame sequence (public/illustrations/device/, copied from
// ~/Downloads/device-scroll/ — see that folder's own README.md for the
// authoritative timeline baked into the 48 frames themselves):
//   0.00-0.10 back view, held
//   0.10-0.70 rotates to the 3/4 front-top view (ease baked into the
//     frames, not re-applied here — see ScrollFrameSequence's own comment)
//   0.70-0.80 settled, LEDs off
//   0.80-0.95 LEDs light red -> green -> blue
//   0.95-1.00 final lit state, held
// p is read 1:1 off the pin's own scroll progress — the whole timeline is
// deliberately sized to exactly fill this section's own scroll range. ----
const FRAME_COUNT = 48;
const DEVICE_FRAME_URLS = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/illustrations/device/frames/frame_${String(i).padStart(2, "0")}.webp`,
);
const DEVICE_FALLBACK_SRC = "/illustrations/device/device-final-lit.webp";

// ---- Scroll ----
// Extra scroll room beyond the pin's own height, same role as
// StatsSection's STATS_SCROLL_LENGTH_VH — named separately because this
// section's content (one continuous 48-frame rotation + a copy crossfade)
// wants more scroll room to read as deliberate, not rushed, than Stats'
// simpler 3-keyframe shrink.
const PIN_LENGTH_VH = 150;

// ---- Copy crossfade ----
// The two Figma copy blocks ("Geotab brings..." / "Feizm brings...") are
// sequenced across the device's own rotation instead of shown stacked at
// once (see this component's own doc comment for the reasoning) — Geotab
// copy owns the rotate-in half of the timeline, Feizm copy owns the
// settle+LED half, crossfading through the midpoint.
const CROSSFADE_CENTER = 0.5;
const CROSSFADE_HALF_WIDTH = 0.08; // crossfades across p = 0.42 -> 0.58

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

const COPY = {
  geotab: "Geotab brings #1-ranked telematics platform (ABI Research) and GO devices & global data",
  feizm: "Feizm brings On-site deployment, training for your team, local support with same time zone",
};

/**
 * "Partnership" section of the Feizm Homepage ("Home / 05 Partnership",
 * node 212:343205, read live via `figma-cli`).
 *
 * ---- What Figma actually has vs. what this builds ----
 * Figma's own frame is fully static: a badge+heading row, then TWO
 * identical rows (copy left, 624x624 device image right) stacked 120px
 * apart — and both device images are pixel-identical to the supplied
 * `device-final-lit.png`, the same static asset placed twice, not two
 * different illustrations. No prototype/reaction data exists on any node
 * in this frame (checked directly) — the scroll-scrubbed rotation below
 * is a deliberate web-only enhancement (the joinsystems.co technique),
 * confirmed with the user rather than assumed, given it restructures
 * Figma's two-row layout into one pinned section:
 *   - ONE device (not two) pins on the right for the section's whole
 *     scroll range, cycling its full 48-frame rotation via
 *     `ScrollFrameSequence` (components/shared/scroll-frame-sequence.tsx)
 *   - the two Figma copy blocks crossfade on the left in sequence with
 *     that rotation (Geotab copy during the rotate-in half, Feizm copy
 *     during the settle+LED half) rather than sitting stacked and static
 *     — this uses the full scroll range for something, where showing both
 *     at once wouldn't, and keeps both pieces of real copy intact
 *   - the badge ("Partnership", byte-identical styling to the existing
 *     `SectionBadge` already used by Stats/Services — brand-100/200
 *     fill/stroke, #ff7a1a dot, #b45723 text, confirmed by comparing the
 *     raw fill/stroke colors node-for-node) and heading ("Global
 *     technology.\nLocal people who make it work.", 42px/43px Hanken
 *     Grotesk) are reproduced as-is
 *   - the hidden "Partner Logos" row (9 logos incl. Esri, `visible:
 *     false` in Figma) is left out — same intentional-omission pattern
 *     already used in AchievementSection.tsx
 *   - the section background gradient (#FEEFEA -> #FFFFFF) uses this
 *     project's own `--fig-color-brand-50` token for its start stop,
 *     an exact match confirmed against the raw gradient stop color
 *     rather than assumed from the hex looking familiar
 *
 * ---- Pin / scroll geometry — same mechanism as StatsSection ----
 * Pinned under the header (`position: sticky; top: var(--header-h)`,
 * height `calc(100svh - var(--header-h))`), with `PIN_LENGTH_VH` of extra
 * scroll room provided by the wrapper's own CSS height (self-contained,
 * same as Stats — never depends on content after this section). `p =
 * clamp(-wrapper.rect.top / span, 0, 1)` read via a passive scroll
 * listener + rAF-throttled tick, active only once an IntersectionObserver
 * confirms the section is near the viewport. Lenis (components/shared/
 * smooth-scroll.tsx) already moves the real scroll position/rect
 * progressively when active — `getBoundingClientRect()` here reads that
 * already-smoothed position directly, same treatment HomeHeroParallax
 * gives it, so no separate Lenis-specific listener or extra smoothing is
 * layered on top.
 *
 * Content fits the pinned viewport via flex (heading row `flex: 0 0 auto`,
 * then a row of `copy (flex: 1) + device (aspect-ratio 1/1, height: 100%,
 * capped at 624px)`) rather than Figma's fixed 1440px block, so it holds
 * together at any viewport height the pin actually gets, same fluid
 * philosophy as StatsSection's own CARD.
 *
 * ---- Reduced motion ----
 * No pin, no scrub: falls back to Figma's own literal static layout —
 * both copy blocks stacked and visible (not crossfaded) with
 * `device-final-lit.webp` as a plain image, shown once (not twice —
 * still one device, since duplicating a static asset for a reduced-motion
 * reader adds nothing). This is a genuine re-derivation of Figma's design
 * at p=1, not an arbitrary stand-in.
 */
export function PartnershipSection() {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const geotabCopyRef = useRef<HTMLParagraphElement | null>(null);
  const feizmCopyRef = useRef<HTMLParagraphElement | null>(null);
  const deviceRef = useRef<ScrollFrameSequenceHandle | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
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
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "100% 0px 100% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (reducedMotion) return;
    const wrapper = wrapperRef.current;
    const pin = pinRef.current;
    if (!wrapper || !pin) return;

    function applyProgress(p: number) {
      deviceRef.current?.setProgress(p);

      const start = CROSSFADE_CENTER - CROSSFADE_HALF_WIDTH;
      const end = CROSSFADE_CENTER + CROSSFADE_HALF_WIDTH;
      const t = clamp((p - start) / (end - start), 0, 1);
      const geotab = geotabCopyRef.current;
      const feizm = feizmCopyRef.current;
      if (geotab) geotab.style.opacity = `${1 - t}`;
      if (feizm) feizm.style.opacity = `${t}`;
    }

    function scrollProgress() {
      const rect = wrapper!.getBoundingClientRect();
      const span = rect.height - pin!.clientHeight;
      return span > 0 ? clamp(-rect.top / span, 0, 1) : 0;
    }

    let raf = 0;
    let ticking = false;
    const tick = () => {
      applyProgress(scrollProgress());
      ticking = false;
    };

    tick();

    if (!inView) return;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", tick);
    };
  }, [reducedMotion, inView]);

  const pinHeightExpr = "calc(100svh - var(--header-h))";
  const wrapperHeight = reducedMotion ? "auto" : `calc(${pinHeightExpr} + ${PIN_LENGTH_VH}vh)`;

  return (
    <section
      ref={wrapperRef}
      className="relative w-full"
      style={{ height: wrapperHeight }}
      aria-label="Partnership"
    >
      <div
        ref={pinRef}
        className="relative w-full"
        style={
          reducedMotion
            ? {
                height: "auto",
                paddingTop: VERTICAL_INSET,
                paddingBottom: VERTICAL_INSET,
                boxSizing: "border-box",
                background: "linear-gradient(180deg, var(--fig-color-brand-50) 0%, #FFFFFF 100%)",
              }
            : {
                position: "sticky",
                top: "var(--header-h)",
                height: pinHeightExpr,
                paddingTop: VERTICAL_INSET,
                paddingBottom: VERTICAL_INSET,
                boxSizing: "border-box",
                background: "linear-gradient(180deg, var(--fig-color-brand-50) 0%, #FFFFFF 100%)",
              }
        }
      >
        <div
          className="mx-auto flex h-full flex-col"
          style={{
            width: `calc(100% - 2 * ${SIDE_INSET})`,
            maxWidth: CONTENT_MAX_WIDTH_PX,
            minHeight: reducedMotion ? undefined : CONTENT_MIN_HEIGHT_PX,
            gap: "clamp(24px, 4vh, 60px)",
            fontFamily: "var(--font-hanken-grotesk)",
          }}
        >
          {/* Badge + heading row */}
          <div className="flex shrink-0 items-start justify-between gap-6">
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

          {/* Copy (crossfading) + device */}
          {reducedMotion ? (
            <div className="flex flex-1 flex-col items-center gap-10 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-8">
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
                style={{ width: "min(40vw, 420px)", aspectRatio: "1 / 1", flexShrink: 0 }}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center gap-10">
              <div className="relative min-w-0 flex-1" style={{ display: "grid" }}>
                <p
                  ref={geotabCopyRef}
                  className="font-normal"
                  style={{
                    gridArea: "1 / 1",
                    color: "var(--fig-color-neutral-900)",
                    fontSize: "20px",
                    lineHeight: "30px",
                    margin: 0,
                    opacity: 1,
                  }}
                >
                  {COPY.geotab}
                </p>
                <p
                  ref={feizmCopyRef}
                  className="font-normal"
                  style={{
                    gridArea: "1 / 1",
                    color: "var(--fig-color-neutral-900)",
                    fontSize: "20px",
                    lineHeight: "30px",
                    margin: 0,
                    opacity: 0,
                  }}
                >
                  {COPY.feizm}
                </p>
              </div>
              <ScrollFrameSequence
                ref={deviceRef}
                frameUrls={DEVICE_FRAME_URLS}
                fallbackSrc={DEVICE_FALLBACK_SRC}
                alt="Telematics device"
                style={{ height: "100%", maxHeight: 624, maxWidth: 624, aspectRatio: "1 / 1", flexShrink: 0 }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
