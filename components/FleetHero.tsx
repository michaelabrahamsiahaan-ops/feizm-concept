import { ArrowDown, ChevronRight } from "lucide-react";
import { FleetHeroAnimation } from "./FleetHeroAnimation";
import { ScrollLink } from "./shared/scroll-link";

/**
 * Hero section of the Feizm "Fleet Management System" page.
 *
 * Built from a live `figma-cli` read of node 73:48687 ("Fleet Management
 * System / 01 Hero", "FeizM" file) and DESIGN.md's tokens (app/tokens.css
 * `--fig-*` custom properties) — structurally near-identical to the About
 * page's Hero.tsx (same breadcrumb/divider/heading/paragraph/button
 * layout, same gaps, same text sizes: 59.87px heading, 16.84px paragraph,
 * 14px breadcrumb, 12px button), confirmed by reading both frames rather
 * than assumed from visual similarity. What differs:
 *   - copy: breadcrumb "Home / Fleet Management System", heading "Locate
 *     every vehicle within 3m accuracy", paragraph "Our Fleet Management
 *     Solution by Geotab is the top choice by ABI Research. With advanced
 *     technology, we ensure your fleet operates efficiently and safely,
 *     delivering cargo on time"
 *   - only ONE button is visible here ("About Fleet Management System",
 *     outline style) — a primary "Request Demo" button exists in the
 *     Figma node but is `visible: false`, same hidden-button pattern as
 *     the About Hero's own omitted "Request Demo" button, independently
 *     confirmed on this node rather than assumed to carry over
 *   - the globe illustration is NOT the animated halftone-globe widget
 *     used on the About page — it's a separate, static "Singapore — dot
 *     illustration" layer (~800 individual small ELLIPSE nodes forming a
 *     dot-map silhouette of Singapore). Traced node-by-node would be
 *     impractical for zero visual benefit over a flat image, so it's
 *     exported as one rasterized PNG via `figma-cli verify --scale 2`
 *     into public/fleet/singapore-dots.png (confirmed to preserve real
 *     alpha transparency around the dots, not a flattened white box)
 *   - the background glow image is the exact same Figma image fill as the
 *     About Hero's (byte-identical `imageHash`, confirmed by reading both
 *     nodes' fills) — reused directly from public/hero/bg-glow.png rather
 *     than re-exported
 *   - the bottom gradient scrim is the same linear-gradient construction
 *     as Hero.tsx's (transparent black -> opaque black by ~82% of its own
 *     box height — see Hero.tsx's own comment for how that 82% figure and
 *     the "vertical, not diagonal" direction were derived empirically via
 *     pixel-sampling, same gradientTransform matrix here too), but this
 *     section's content column is taller (217px heading block vs the
 *     About Hero's 193px, from the longer paragraph), so the scrim's own
 *     box is a DIFFERENT size here — top:48.43%, height:51.57% of the
 *     section (385/795, 410/795 in Figma), not the About Hero's
 *     51.45%/48.55% — measured fresh against this node, not copied over
 *   - background base color is a literal `#dc5225` (confirmed via Figma,
 *     doesn't match brand-500 `#f25a29` or brand-600 `#df3d31` exactly)
 *     — moot in practice since the glow image covers the section at full
 *     opacity edge-to-edge either way, same as Hero.tsx's choice of a
 *     plain `neutral-900` fallback for the identical reason
 *
 * Section fills the viewport (h-screen) rather than the fixed 1440x795
 * Figma frame, same fluid-sizing approach as Hero.tsx, for the same
 * reason (a fixed pixel offset only ever lines up at exactly 795px tall).
 *
 * Fixed-width (1440px) only for the purposes of a pixel comparison
 * screenshot — not yet wired into a `/fleet-management-system` route.
 */
export function FleetHero() {
  return (
    <section
      className="relative h-screen w-full overflow-hidden"
      style={{
        backgroundColor: "var(--fig-color-neutral-900)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      {/* Background glow — byte-identical Figma image fill to the About
          Hero's, reused from the same exported asset. */}
      <img
        src="/hero/bg-glow.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Singapore dot-map illustration — animated, see
          components/FleetHeroAnimation.tsx for the full derivation. Box
          position/size are % of the section (317/1440, 92/795, 1094/1440,
          635/795), matching Figma's "Singapore — dot illustration" group
          exactly — re-measured fresh since the first pass here used the
          animation reference's own 1360x820 design resolution directly
          instead of Figma's actual (smaller) illustration box, which
          rendered the map noticeably larger than the design. The box's
          own aspect ratio (1094:635 ≈ 1.72) is close to but not identical
          to the canvas's native 1360:820 (≈1.66) — `object-fit: contain`
          scales the animation to fit without distorting the hand-tuned
          route/dot coordinates, same technique the original static PNG
          used here before being replaced by this animation.
          `darkBackdrop={false}` keeps the canvas transparent so the
          existing bg-glow image + gradient scrim underneath still show
          through, instead of the reference's own opaque #14100E. */}
      <FleetHeroAnimation
        className="pointer-events-none absolute"
        style={{
          left: "22.01%",
          top: "11.57%",
          width: "75.97%",
          height: "79.87%",
          objectFit: "contain",
        }}
        darkBackdrop={false}
      />

      {/* Bottom gradient scrim — THREE stops (alpha 0 at 0% -> 0.4258 at
          20.26% -> 1 at 100%, reaching fully opaque at ~84% in practice),
          re-read fresh from this node directly — this is where the 3-stop
          curve was actually found and measured; see Hero.tsx's comment
          for the full derivation (vertical-not-diagonal direction, pixel-
          sampling method, and why the same curve was carried over there
          too). This section's own box is a different size (taller content
          column) than the About Hero's, re-measured against this node,
          not copied from Hero.tsx's percentages. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: "48.43%",
          height: "51.57%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4258) 20.26%, rgba(0,0,0,1) 84%)",
        }}
      />

      {/* Content column — bottom-left anchored (justify-end), same
          technique and padding tokens as Hero.tsx. */}
      <div
        className="relative flex h-full flex-col justify-end"
        style={{
          paddingLeft: "var(--fig-spacing-40)",
          paddingBottom: "var(--fig-spacing-40)",
        }}
      >
        <div
          className="flex flex-col"
          style={{ maxWidth: 553, width: "100%", gap: "var(--fig-spacing-32)" }}
        >
          <div className="flex flex-col" style={{ gap: "var(--fig-spacing-24)" }}>
            {/* Breadcrumb */}
            <nav
              className="flex items-center"
              style={{ gap: "var(--fig-spacing-12)" }}
              aria-label="Breadcrumb"
            >
              <span
                className="text-[14px]"
                style={{ color: "var(--fig-color-neutral-300)" }}
              >
                Home
              </span>
              <ChevronRight
                size={14}
                style={{ color: "var(--fig-color-neutral-300)" }}
              />
              <span
                className="text-[14px]"
                style={{ color: "var(--fig-color-neutral-0)" }}
              >
                Fleet Management System
              </span>
            </nav>

            {/* Divider */}
            <div
              style={{
                width: "100%",
                height: 1,
                backgroundColor: "var(--fig-color-neutral-0)",
              }}
            />

            {/* Heading block */}
            <div className="flex flex-col" style={{ gap: "var(--fig-spacing-24)" }}>
              <h1
                className="font-normal"
                style={{
                  color: "var(--fig-color-neutral-0)",
                  fontSize: "59.87px",
                  lineHeight: "59.87px",
                }}
              >
                Locate every vehicle within 3m accuracy
              </h1>
              <div style={{ maxWidth: 553, width: "100%" }}>
                <p
                  className="font-normal"
                  style={{
                    color: "var(--fig-color-neutral-0)",
                    fontSize: "16.84px",
                    lineHeight: "24.32px",
                  }}
                >
                  Our Fleet Management Solution by Geotab is the top choice by ABI
                  Research. With advanced technology, we ensure your fleet operates
                  efficiently and safely, delivering cargo on time
                </p>
              </div>
            </div>
          </div>

          {/* CTA button (outline, "About Fleet Management System" — the
              only visible button; a hidden "Request Demo" primary button
              exists in Figma but its visible flag is off, same pattern as
              the About Hero, independently confirmed here). A real
              `<a href="#why-feizmfleet">` (ScrollLink,
              components/shared/scroll-link.tsx) rather than a `<button>` —
              scrolls smoothly to "Fleet Management System / 02 Why",
              landing exactly below the fixed header (that section's own
              `scroll-mt-[var(--header-h)]`) with the header already in
              its solid state (SiteHeader's trigger on this page watches
              that same id — see page.tsx). */}
          <ScrollLink
            targetId="why-feizmfleet"
            className="flex w-fit items-center text-[12px] font-medium"
            style={{
              gap: "var(--fig-spacing-4)",
              paddingTop: "var(--fig-spacing-8)",
              paddingBottom: "var(--fig-spacing-8)",
              paddingLeft: "var(--fig-spacing-12)",
              paddingRight: "var(--fig-spacing-12)",
              borderRadius: "var(--fig-radius-md)",
              border: "1px solid var(--fig-color-neutral-0)",
              color: "var(--fig-color-neutral-0)",
              background: "transparent",
            }}
          >
            <ArrowDown size={16} />
            About Fleet Management System
          </ScrollLink>
        </div>
      </div>
    </section>
  );
}
