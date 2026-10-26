import { ArrowDown, ChevronRight } from "lucide-react";
import { HalftoneGlobeWidget } from "./HalftoneGlobeWidget";
import { ScrollLink } from "./shared/scroll-link";

/**
 * Hero section of the Feizm "About Us" page.
 *
 * Rebuilt 1:1 from the Figma frame (node 3:58, "Hero Section", read live via
 * `figma-cli` — the earlier doc comment here referenced node 1:489, which
 * no longer resolves to the Hero at all; re-verified fresh against 3:58) and
 * DESIGN.md's "About Us Tokens" variable collection:
 *   - colors, radius and spacing below come from `--fig-*` custom properties
 *     (app/tokens.css, generated with `figma-cli export css`)
 *   - the background glow is exported straight from the Figma node
 *     (public/hero/bg-glow.png); the halftone globe is a live animated
 *     widget (public/halftone-globe.js, see HalftoneGlobeWidget.tsx)
 *     replacing the earlier static trace of the same Figma illustration
 *   - heading/paragraph font sizes (59.87/16.84px) are literal Figma values;
 *     DESIGN.md intentionally did not tokenize these — they come from a
 *     component-scaled text layer, not a deliberate type-scale step — so
 *     they're reproduced here as exact arbitrary values instead of being
 *     forced onto the nearest unrelated token. The "About Us" CTA button's
 *     own text is a separate, smaller literal size (12px, Hanken Grotesk
 *     Medium) — confirmed directly on that text node rather than assumed to
 *     match the breadcrumb's 14px, which is a different, unrelated text
 *     layer that happens to sit visually nearby.
 *
 * Section fills the viewport (w-full, h-screen) rather than the fixed
 * 1440x795 Figma frame size. The background/globe scale with it (converted
 * to % position/size instead of literal px), and the content column is
 * bottom-left anchored via flex (justify-end + the same 40px padding
 * tokens Figma used) instead of a fixed top offset computed for exactly
 * 795px — that offset only made sense at the one height it was measured
 * at. Text sizes are still the literal Figma px values (not fluid/clamp()
 * yet), so very narrow viewports aren't a solved case here.
 */
export function Hero() {
  return (
    <section
      className="relative h-screen w-full overflow-hidden"
      style={{
        backgroundColor: "var(--fig-color-neutral-900)",
        // --fig-typography-font-family (Figma token) is the bare name
        // "Hanken Grotesk"; next/font hashes its own family name, so the
        // actual typeface is wired through its --font-hanken-grotesk
        // variable (app/layout.tsx) rather than the literal token string.
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      {/* Background glow (Figma node 1:490, image fill exported as PNG) */}
      <img
        src="/hero/bg-glow.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Halftone globe — live animated version (public/halftone-globe.js,
          vendored unmodified per its own README). Replaces the earlier
          static SVG trace. Same Figma layout box as before (949x949 at
          x:507, y:-46); the section's `overflow-hidden` clips it exactly
          like Figma's frame clip did.
          `background` defaults to 'transparent' as of this library version
          (it properly `clearRect`s every frame, so it animates cleanly
          with no fill at all — no background box outside the globe OR
          between the dots inside it), so the Hero's own gradient shows
          through everywhere, matching the original Figma compositing with
          no CSS workaround needed. `arcColor` is --fig-color-brand-500
          (#f25a29) — canvas fillStyle can't resolve a CSS var, so the
          token's literal value is used.
          Position/size are % of the section (507/1440, -46/795, 949/1440,
          949/795) instead of literal px, so it scales with the now-fluid
          section instead of only being correct at 1440x795. */}
      <HalftoneGlobeWidget
        className="pointer-events-none absolute"
        style={{ left: "35.21%", top: "-5.79%", width: "65.9%", height: "119.37%" }}
        arcColor="#f25a29"
      />

      {/* Bottom gradient scrim — Figma node 3:61's own fill (the same
          "Container" that also holds the text content below, not a
          separate overlay layer in Figma — split out here as its own div
          so the gradient math doesn't have to be re-derived against the
          content column's different, full-height box). Read via
          `figma-cli` as a GRADIENT_LINEAR fill with THREE stops (black,
          alpha 0 at 0% -> alpha 0.4258 at 20.26% -> alpha 1 at 100%), a
          real kink, not a straight fade — re-read fresh and updated from
          an earlier 2-stop version. As with the earlier version, the raw
          gradientTransform matrix implied a slight diagonal; empirical
          pixel-sampling of the actual exported node (alpha channel at
          x:1400, away from any text) confirms a perfectly vertical
          gradient instead — same matrix-decoding ambiguity, same fix
          (trust the pixels), and the same pixel sample located the middle
          stop at almost exactly its reported position/alpha (measured
          ~111/255 at y=22% vs. the reported 0.4258 at 20.26% — a match
          within sampling noise) and found the gradient reaches fully
          opaque black at ~84% of this box's own height (not the literal
          100% the raw stop position implies), solid for the remainder.
          This exact 3-stop curve was found on the Fleet Hero's equivalent
          gradient and intentionally carried over here too, even though
          this page's own Figma node (3:61) still has the older 2-stop
          version — the two heroes are meant to share one gradient design.
          Box position/size are % of the section (409/795, 386/795)
          matching Figma's node 3:61 exactly — NOT the full hero height,
          which is why this is its own absolutely-positioned layer rather
          than the content column's background. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: "51.45%",
          height: "48.55%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4258) 20.26%, rgba(0,0,0,1) 84%)",
        }}
      />

      {/* Content column — bottom-left anchored (justify-end) instead of the
          original fixed paddingTop:429 (409 Hero Background + 20 Hero
          Content), which only placed the text correctly at exactly 795px
          tall. The 40px left/bottom padding tokens are the same ones Figma
          used (Hero Content's own padding-left/bottom). */}
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
                About Us
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
                Feizm keeps world&apos;s fleets moving
              </h1>
              <div style={{ maxWidth: 536, width: "100%" }}>
                <p
                  className="font-normal"
                  style={{
                    color: "var(--fig-color-neutral-0)",
                    fontSize: "16.84px",
                    lineHeight: "24.32px",
                  }}
                >
                  Fleet management, driver safety, asset tracking, and IoT,{" "}
                  powered by world-class technology with local expertise
                </p>
              </div>
            </div>
          </div>

          {/* CTA button (outline, "About Us" — the only visible button; a
              hidden "Request Demo" primary button exists in Figma but its
              visible flag is off, so it's intentionally omitted here too).
              A real `<a href="#company-profile">` (ScrollLink,
              components/shared/scroll-link.tsx) rather than a `<button>` —
              scrolls smoothly to the "Company Profile Overview" section,
              landing exactly below the fixed header (that section's own
              `scroll-mt-[var(--header-h)]`) with the header already in
              its solid state (SiteHeader's trigger on this page already
              watches that same id — see site-header.tsx). */}
          <ScrollLink
            targetId="company-profile"
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
            About Us
          </ScrollLink>
        </div>
      </div>
    </section>
  );
}
