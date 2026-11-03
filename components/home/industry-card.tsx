"use client";

import Image from "next/image";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import type { IndustryCompany } from "@/lib/industries-data";

// Sized for the EXPANDED card (716px) at >=1024px — the image can grow to
// that width during the hover animation even while sitting collapsed, so
// `sizes` has to cover the larger of the two states, not the current one.
// Below 1024px the mobile stacked layout runs full-bleed (minus the
// section's own side padding), so 100vw is the right fallback there.
const IMAGE_SIZES = "(min-width: 1024px) 716px, 100vw";

export const EXPANDED_FLEX = 716;
export const COLLAPSED_FLEX = 298;
export const CARD_HEIGHT = 504;

const WIDTH_MS = 550;
const WIDTH_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
// Collapsing delays the width shrink so the text block (below) has time to
// fade out first, per the brief ("fade out quickly BEFORE the width
// shrinks"); expanding has no such delay, so the width grows immediately.
const COLLAPSE_WIDTH_DELAY_MS = 150;
const TEXT_IN_MS = 300;
// ~60% of WIDTH_MS, matching "fade/slide in AFTER the width is ~60% done".
const TEXT_IN_DELAY_MS = 330;
const TEXT_OUT_MS = 150;

/**
 * flex-grow IS the Figma width in px (716 / 298). Their sum across the 3
 * cards (716+298+298=1312) equals the row's content width (1360) minus its
 * two 24px gaps exactly, so distributing available space by this ratio
 * reproduces the Figma widths pixel-for-pixel for ANY card being the
 * expanded one, not just the first — no renormalization needed.
 */
function cardFlexStyle(isExpanded: boolean, reducedMotion: boolean): CSSProperties {
  const base: CSSProperties = {
    flexGrow: isExpanded ? EXPANDED_FLEX : COLLAPSED_FLEX,
    flexShrink: 0,
    flexBasis: 0,
    minWidth: 0,
  };
  if (reducedMotion) return base;
  return {
    ...base,
    transitionProperty: "flex-grow",
    transitionDuration: `${WIDTH_MS}ms`,
    transitionTimingFunction: WIDTH_EASE,
    transitionDelay: isExpanded ? "0ms" : `${COLLAPSE_WIDTH_DELAY_MS}ms`,
  };
}

/**
 * Animates the divider+metric+description+button block's own height via
 * the "animate to auto height" grid trick (0fr <-> 1fr), rather than a
 * fixed px height — its content is variable-length copy, and Figma hugs
 * it. `overflow: hidden` on the inner content below clips it visually
 * while collapsed WITHOUT removing it from the accessibility tree (unlike
 * `display: none`/`visibility: hidden`), which is exactly what the brief
 * asks for: "collapsed cards keep metric/description in the DOM (visually
 * hidden, not display:none) so screen readers can read all three cards."
 */
function detailWrapStyle(isExpanded: boolean, reducedMotion: boolean): CSSProperties {
  const base: CSSProperties = { display: "grid", gridTemplateRows: isExpanded ? "1fr" : "0fr" };
  if (reducedMotion) return base;
  return {
    ...base,
    transitionProperty: "grid-template-rows",
    transitionDuration: `${WIDTH_MS}ms`,
    transitionTimingFunction: WIDTH_EASE,
    transitionDelay: isExpanded ? "0ms" : `${COLLAPSE_WIDTH_DELAY_MS}ms`,
  };
}

function detailContentStyle(isExpanded: boolean, reducedMotion: boolean): CSSProperties {
  const base: CSSProperties = { overflow: "hidden", minHeight: 0 };
  if (reducedMotion) return { ...base, opacity: isExpanded ? 1 : 0 };
  return {
    ...base,
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? "translateY(0px)" : "translateY(12px)",
    transitionProperty: "opacity, transform",
    transitionDuration: isExpanded ? `${TEXT_IN_MS}ms` : `${TEXT_OUT_MS}ms`,
    transitionDelay: isExpanded ? `${TEXT_IN_DELAY_MS}ms` : "0ms",
    transitionTimingFunction: "ease-out",
  };
}

/**
 * The caption's own background — read live off the card's "Rectangle 5"
 * fills (figma-cli eval, including each fill's `gradientTransform`, which
 * the first read of this missed for the radial fill, producing a huge
 * wash instead of a small corner glow — confirmed wrong directly against
 * an isolated `figma-cli verify` screenshot of the real rectangle, both
 * variants, with the photo removed): an always-on radial, `#f25a29` (at
 * its center) -> `#c36623` at 30.3% -> fully transparent by ~55%, with
 * its center anchored at the caption's own BOTTOM-RIGHT corner (confirmed
 * against the isolated screenshots: the warm color hugs the right edge
 * and bottom, fading to nothing by roughly the midpoint, not spread
 * across the whole card) — plus, ONLY while expanded, a linear black fade
 * top->bottom at 20% layer opacity (`rgba(57,57,57,0)` -> `rgba(0,0,0,0.2)`
 * — Figma's own 0->1 alpha stops times its 0.2 layer opacity). Figma's
 * own transform is also slightly skewed/rotated (off-diagonal terms in
 * the matrix); this reproduces the same stops and corner anchoring
 * visually rather than pixel-matching that exact skew, which isn't worth
 * reverse-matrixing by hand for a decorative scrim. Figma's mono grain
 * noise effect has no CSS equivalent without a second image asset and is
 * intentionally skipped here (cosmetic only).
 */
function captionBackgroundStyle(isExpanded: boolean): CSSProperties {
  const radial = "radial-gradient(ellipse 85% 160% at 100% 100%, #f25a29 0%, #c36623 28%, transparent 55%)";
  const linear = "linear-gradient(to bottom, rgba(57,57,57,0) 0%, rgba(0,0,0,0.2) 100%)";
  return { backgroundImage: isExpanded ? `${linear}, ${radial}` : radial };
}

/**
 * Same width ratio Figma's own fill uses (identity `imageTransform` in
 * both variants — confirmed via `figma-cli eval` — so Figma itself is
 * just a plain centered "cover", not a custom per-variant crop), but a
 * PLAIN center crop doesn't reliably keep each photo's actual subject in
 * frame once the container narrows to the collapsed card's tall 298x504
 * ratio — `imagePosition` on each real company (lib/industries-data.ts)
 * was tuned by eye against that narrow crop instead of defaulting to
 * center everywhere. `object-position` transitions alongside the width
 * (same duration/easing) so a company with different expanded/collapsed
 * positions shifts its crop smoothly rather than jumping.
 */
function imageStyle(position: string, reducedMotion: boolean): CSSProperties {
  const base: CSSProperties = { objectFit: "cover", objectPosition: position };
  if (reducedMotion) return base;
  return {
    ...base,
    transitionProperty: "object-position",
    transitionDuration: `${WIDTH_MS}ms`,
    transitionTimingFunction: WIDTH_EASE,
  };
}

/**
 * `next/image` refuses to optimize a local SVG by default (no
 * `images.dangerouslyAllowSVG` in next.config.ts, and there's no reason to
 * add it for this) — placeholder companies use a flat-color SVG that was
 * never a real photo to begin with, so they skip `next/image` entirely and
 * render the same flat color directly, instead of fighting the optimizer.
 */
function CardPhoto({ company, position, reducedMotion }: { company: IndustryCompany; position: string; reducedMotion: boolean }) {
  if (company.isPlaceholder) return <div className="absolute inset-0" style={{ backgroundColor: "#d9d9d9" }} />;
  return <Image src={company.image} alt="" fill sizes={IMAGE_SIZES} style={imageStyle(position, reducedMotion)} />;
}

/** The divider + metric + description + "See More" block, shared by both the animated desktop card and the static mobile one below. */
function CardDetails({ company }: { company: IndustryCompany }) {
  return (
    <>
      <div style={{ height: 1, backgroundColor: "#d9d9d9", marginBottom: 24 }} />
      <div className="flex items-end" style={{ gap: 28 }}>
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 8 }}>
          <p className="font-semibold text-white" style={{ fontSize: 24, lineHeight: "36px", fontFamily: "var(--font-hanken-grotesk)" }}>
            {company.metric}
          </p>
          <p className="text-white" style={{ fontSize: 16, lineHeight: "24px", fontFamily: "var(--font-hanken-grotesk)" }}>
            {company.description}
          </p>
        </div>
        <span
          className="shrink-0 rounded-[12px] bg-white px-3 py-2 font-medium"
          style={{ color: "#494949", fontSize: 12, lineHeight: "16px", fontFamily: "var(--font-hanken-grotesk)" }}
        >
          See More
        </span>
      </div>
    </>
  );
}

/**
 * Below 1024px (per the user's explicit choice: "stacked, all expanded" —
 * no hover/accordion interaction on narrow screens at all), every card
 * renders in its permanently-expanded visual state, full width, stacked
 * vertically by the parent. No flex-grow/grid-rows/fade transitions, no
 * touch tap-to-expand-first step, no arrow-key nav — there's nothing to
 * animate between or navigate away from, so none of that logic applies.
 */
function MobileIndustryCard({ company }: { company: IndustryCompany }) {
  const position = company.imagePosition?.expanded ?? "center";
  return (
    <a href={company.href} className="relative block w-full overflow-hidden" style={{ height: CARD_HEIGHT, backgroundColor: "#eeeeee" }}>
      <CardPhoto company={company} position={position} reducedMotion />
      <div className="absolute inset-x-0 bottom-0 flex flex-col" style={{ gap: 24, padding: 24, ...captionBackgroundStyle(true) }}>
        <h3 className="font-semibold text-white" style={{ fontSize: 24, lineHeight: "36px", fontFamily: "var(--font-hanken-grotesk)" }}>
          {company.name}
        </h3>
        <CardDetails company={company} />
      </div>
    </a>
  );
}

export function IndustryCard({
  company,
  isExpanded,
  canHover,
  reducedMotion,
  onEnter,
  onFocus,
  onNavigate,
  cardRef,
  isMobileLayout,
}: {
  company: IndustryCompany;
  isExpanded: boolean;
  canHover: boolean;
  reducedMotion: boolean;
  onEnter: () => void;
  onFocus: () => void;
  onNavigate: (direction: 1 | -1) => void;
  cardRef: (el: HTMLAnchorElement | null) => void;
  isMobileLayout?: boolean;
}) {
  if (isMobileLayout) return <MobileIndustryCard company={company} />;

  // Touch/no-hover: first tap on a collapsed card expands it instead of
  // navigating; a second tap (now expanded) follows the link normally.
  // Hover-capable devices never hit the `preventDefault` branch — the
  // card is already expanded by the mouseenter that preceded the click.
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!canHover && !isExpanded) {
      e.preventDefault();
      onEnter();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLAnchorElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onNavigate(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onNavigate(-1);
    }
  }

  const position = isExpanded ? (company.imagePosition?.expanded ?? "center") : (company.imagePosition?.collapsed ?? "center");

  return (
    <a
      ref={cardRef}
      href={company.href}
      className="relative block overflow-hidden outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--fig-color-brand-500)]"
      style={{ ...cardFlexStyle(isExpanded, reducedMotion), height: CARD_HEIGHT, backgroundColor: "#eeeeee" }}
      onMouseEnter={() => canHover && onEnter()}
      onFocus={onFocus}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <CardPhoto company={company} position={position} reducedMotion={reducedMotion} />

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col"
        style={{ gap: 24, padding: 24, ...captionBackgroundStyle(isExpanded) }}
      >
        <h3
          className="font-semibold text-white"
          style={{ fontSize: 24, lineHeight: "36px", fontFamily: "var(--font-hanken-grotesk)" }}
        >
          {company.name}
        </h3>

        <div style={detailWrapStyle(isExpanded, reducedMotion)}>
          <div style={detailContentStyle(isExpanded, reducedMotion)}>
            <CardDetails company={company} />
          </div>
        </div>
      </div>
    </a>
  );
}
