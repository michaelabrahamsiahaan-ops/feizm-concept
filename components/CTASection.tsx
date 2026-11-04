/**
 * "CTA" section of the Feizm "About Us" page — the closing "See FeizMFLEET
 * in Action" banner.
 *
 * Built from a live `figma-cli` read of node 34:508 ("CTA Section",
 * "FeizM" file, directly on the "Design" page — not the older node 1:857,
 * a same-named frame nested inside a separate "About Us" mockup frame on a
 * different page; 34:508 is the one that matches every other section built
 * this session, a top-level frame on the same page) and DESIGN.md's tokens
 * (app/tokens.css `--fig-*` custom properties):
 *   - "Request Demo" button: fill brand-500, border accent-coral-light,
 *     radius-md — all bound Figma variables
 *   - "Download Brochure" button: no fill/border at all (plain text on the
 *     section background, not a ghost-button style with a hover state
 *     implied) — confirmed via Figma's own fills/strokes arrays, both empty
 *   - gaps: 24px (heading block to buttons) and 16px (heading to subtext)
 *     map to spacing-24/spacing-16; the 14px gap between the two buttons
 *     doesn't match any spacing token, so it's literal
 *   - subtext (16px) matches typography-size-sm exactly; the heading
 *     (59.87px) is the same recurring literal component-scale size used by
 *     every other section's large numerals/headings on this page
 *   - section background (#ff8963) isn't tokenized — it's a lighter, more
 *     peach shade than brand-500 (#f25a29, used elsewhere for solid
 *     sections/buttons), not a rounding difference
 *
 * Both button icon slots exist in Figma (leading + trailing "info"
 * instances inside each button) but are set `visible: false` — same
 * "hidden content left out" pattern as Hero's hidden "Request Demo"
 * button and Achievement's hidden partner-logo row. Left out here too.
 *
 * Background wave pattern: exported straight from the Figma vector (node
 * 34:509) as a real SVG via `figma-cli export node -f svg` (not the PNG
 * screenshot route used for photos) into public/cta/pattern.svg — the
 * export auto-crops to the pattern's visible intersection with the
 * section's own bounds, which is why it's placed at the section's own
 * top-left origin rather than replicating Figma's large negative x/y
 * offset on the full, uncropped vector.
 *
 * Brochure image: node 34:517 is a RECTANGLE with an IMAGE fill taller and
 * wider than the section itself (742x1328 vs the section's 1440x475) that
 * Figma clips via the section's own `clipsContent: true`. `figma-cli
 * verify --save` screenshots the node AS RENDERED on canvas, respecting
 * that ancestor clipping — so the downloaded file is already the clipped
 * 678x475 result (742 minus the 64px that falls past the section's right
 * edge at x:762, 1328 cropped down to the section's own 475px height, the
 * -16px top offset clipped away), not the full unclipped image. Reproduced
 * here by placing that already-clipped image at its real left offset
 * (762) and top:0 (the -16 is already baked into what got exported) —
 * `overflow-hidden` on the section is kept as a safety net, not what's
 * doing the actual clipping here.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as every other section on this page.
 */
export function CTASection() {
  return (
    <section
      className="relative flex w-[1440px] items-center overflow-hidden"
      style={{ height: 475, backgroundColor: "#ff8963" }}
    >
      <img
        src="/cta/pattern.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: 979, height: 475 }}
      />

      <img
        src="/cta/brochure.png"
        alt="FeizM brochure: Optimize your fleet. Increase efficiency."
        className="absolute"
        style={{ left: 762, top: 0, width: 678, height: 475 }}
      />

      <div
        className="relative z-10 flex flex-col"
        style={{ gap: "var(--fig-spacing-24)", paddingLeft: "var(--fig-spacing-40)" }}
      >
        <div className="flex flex-col" style={{ gap: "var(--fig-spacing-16)", width: 696 }}>
          <h2
            className="font-medium"
            style={{
              color: "var(--fig-color-neutral-0)",
              fontSize: "59.87px",
              lineHeight: "59.87px",
              fontFamily: "var(--font-hanken-grotesk)",
            }}
          >
            See FeizMFLEET in Action
          </h2>
          <p
            className="font-normal"
            style={{
              color: "var(--fig-color-neutral-0)",
              fontSize: "var(--fig-typography-size-sm)",
              lineHeight: "28.8px",
              fontFamily: "var(--font-hanken-grotesk)",
            }}
          >
            See FeizMFLEET in action get a personalised demo for your fleet
          </p>
        </div>

        <div className="flex items-center" style={{ gap: "14px" }}>
          <button
            type="button"
            className="cursor-pointer font-medium"
            style={{
              fontFamily: "Inter, var(--font-hanken-grotesk)",
              fontSize: "14px",
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
              color: "var(--fig-color-neutral-0)",
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
    </section>
  );
}
