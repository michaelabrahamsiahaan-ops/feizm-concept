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

// Figma's own "Rectangle 5" overlay box: `layoutPositioning: ABSOLUTE`,
// `constraints: {vertical: MAX}` (bottom-anchored) and a FIXED height —
// confirmed via figma-cli eval, identical across all 3 Environmental
// Services cards, both states. It does NOT grow with the caption's own
// content (confirmed on Clearwater's collapsed variant specifically: its
// caption frame hugs to 120px for the 2-line name, but Rectangle 5 stays
// pinned at 84px flush with the bottom — the first line of a wrapped name
// sits above the overlay, directly on the photo, in Figma itself).
const OVERLAY_EXPANDED_HEIGHT = 201;
const OVERLAY_COLLAPSED_HEIGHT = 84;
const OVERLAY_CROSSFADE_MS = 300;

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
 * The caption's own background: Figma's EXACT SVG gradients, not a CSS
 * approximation. The Plugin API's `gradientStops` only exposes 3 control
 * points (`#f25a29` -> `#c36623` at 30.3% -> transparent) — a first pass
 * built from just those 3 produced a glow concentrated in one corner
 * instead of Figma's actual soft warm-brown spread. The REAL rendered
 * gradient (measured directly in Figma, 6 stops incl. 2 partial-alpha
 * mid stops) and its exact `gradientTransform` matrices are baked into
 * `public/industries/overlay-{expanded,collapsed}.svg` as real SVG
 * `radialGradient`/`linearGradient` defs (`preserveAspectRatio="none"` so
 * stretching them to a non-native aspect ratio via `background-size: 100%
 * 100%` doesn't letterbox) — confirmed identical across all 3
 * Environmental Services cards via figma-cli eval, so one pair of SVGs
 * covers all of them, not just Greenline.
 *
 * Both overlay images are always mounted and CROSSFADE opacity over
 * `OVERLAY_CROSSFADE_MS`, independent of the 550ms width transition —
 * NOT a single gradient morphing shape, which is what made the overlay
 * visibly distort mid-animation before. The collapsed SVG has no dark
 * linear layer at all (Figma: `visible: false` on Default/collapsed,
 * confirmed on all 3 cards), matching the "dark layer only in Hovered"
 * rule exactly rather than a single gradient needing to fade a layer in.
 */
function CardOverlay({ isExpanded, reducedMotion }: { isExpanded: boolean; reducedMotion: boolean }) {
  const transition = reducedMotion ? "none" : `opacity ${OVERLAY_CROSSFADE_MS}ms ease`;
  const base: CSSProperties = { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
  return (
    <>
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ ...base, height: OVERLAY_EXPANDED_HEIGHT, backgroundImage: "url(/industries/overlay-expanded.svg)", opacity: isExpanded ? 1 : 0, transition }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ ...base, height: OVERLAY_COLLAPSED_HEIGHT, backgroundImage: "url(/industries/overlay-collapsed.svg)", opacity: isExpanded ? 0 : 1, transition }}
      />
    </>
  );
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
      <div className="absolute inset-x-0 bottom-0">
        <CardOverlay isExpanded reducedMotion />
        <div className="relative flex flex-col" style={{ gap: 24, padding: 24 }}>
          <h3 className="font-semibold text-white" style={{ fontSize: 24, lineHeight: "36px", fontFamily: "var(--font-hanken-grotesk)" }}>
            {company.name}
          </h3>
          <CardDetails company={company} />
        </div>
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

      <div className="absolute inset-x-0 bottom-0">
        <CardOverlay isExpanded={isExpanded} reducedMotion={reducedMotion} />
        <div className="relative flex flex-col" style={{ gap: 24, padding: 24 }}>
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
      </div>
    </a>
  );
}
