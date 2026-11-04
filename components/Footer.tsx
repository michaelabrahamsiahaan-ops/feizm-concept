const FOOTER_COLUMNS = [
  {
    heading: "About us",
    links: ["About", "Locations", "News", "Contact person"],
  },
  {
    heading: "Services",
    links: [
      "Fleet Management System",
      "Smart Surveillance & Security System",
      "Asset Management System",
      "Transport Management System",
      "IoT Device Management System",
    ],
  },
  {
    heading: "Career",
    links: ["Jobs"],
  },
];

/**
 * Footer section of the Feizm "About Us" page.
 *
 * Built from a live `figma-cli` read of node 34:528 ("Footer Section",
 * "FeizM" file) and DESIGN.md's tokens (app/tokens.css `--fig-*` custom
 * properties):
 *   - section background (neutral-100), column heading / copyright color
 *     (neutral-800), link color (neutral-500) all map to exact token
 *     values — confirmed by converting each fill's RGB to hex and matching
 *     against the extracted palette, not assumed from visual similarity
 *   - gaps: 40 (section padding, all sides), 32 (logo to column row), 24
 *     (column row to copyright line), 22 (column heading to its link list)
 *     all map to real spacing tokens
 *   - heading (29.93px), link (16.84px) and copyright (14.97px) text are
 *     literal component-scaled sizes, same reasoning as every other
 *     section's non-tokenized text — notably the column headings are
 *     Hanken Grotesk *Regular*, not bold; the visual weight in the design
 *     comes entirely from the larger size, confirmed via fontName, not
 *     assumed from how the screenshot reads at a glance
 *
 * Columns are a fixed 392px wide each (confirmed via layoutSizingHorizontal,
 * not just eyeballing roughly-even spacing) with zero gap between them —
 * the visual column rhythm comes from each column's own fixed width, not
 * an itemSpacing value, which is why this uses three explicit w-[392px]
 * boxes in a row rather than a gap-based grid.
 *
 * Four "List Item" rows across the About-us and Career columns exist in
 * Figma but carry no text content at all (empty Link frame, no child text
 * node) — `visible: true`, so not the same "hidden, left out" pattern as
 * other sections' unused content, but they render nothing either way, so
 * reproducing them would mean adding visually-blank rows the screenshot
 * itself doesn't show. Left out of FOOTER_COLUMNS for that reason — the
 * two columns' link counts (4 and 1) match exactly what's visible, not
 * what Figma's layer count would otherwise suggest (5 and 4).
 *
 * No divider line above the copyright row — checked directly (both the
 * nav-column container and the copyright container have empty `strokes`
 * arrays) after first assuming one from the screenshot's visual gap.
 *
 * Logo: node 34:531 ("Logo orange") exported as a real SVG via `figma-cli
 * export node -f svg` into public/footer/logo.svg — a different color
 * variant from the Navbar's existing public/nav/logo-white.png (confirmed
 * by Figma's own layer name), not reused from it.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as every other section on this page.
 */
export function Footer() {
  return (
    <section
      className="flex w-[1440px] flex-col"
      style={{
        backgroundColor: "var(--fig-color-neutral-100)",
        paddingTop: "var(--fig-spacing-40)",
        paddingBottom: "var(--fig-spacing-40)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <div className="flex flex-col" style={{ gap: "var(--fig-spacing-24)" }}>
        <div className="flex flex-col" style={{ gap: "var(--fig-spacing-32)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/footer/logo.svg" alt="FeizM" style={{ width: 104, height: 30 }} />

          <div className="flex">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading} className="flex shrink-0 flex-col" style={{ width: 392 }}>
                <span
                  className="font-normal"
                  style={{
                    color: "var(--fig-color-neutral-800)",
                    fontSize: "29.93px",
                    lineHeight: "35.55px",
                  }}
                >
                  {col.heading}
                </span>
                <div className="flex flex-col" style={{ marginTop: "var(--fig-spacing-22)" }}>
                  {col.links.map((link) => (
                    <a
                      key={link}
                      href="#"
                      className="flex w-fit items-center font-normal"
                      style={{
                        height: 37,
                        color: "var(--fig-color-neutral-500)",
                        fontSize: "16.84px",
                        lineHeight: "24.32px",
                      }}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p
          className="font-normal"
          style={{
            color: "var(--fig-color-neutral-800)",
            fontSize: "14.97px",
            lineHeight: "22.45px",
          }}
        >
          © 2026 FeizM. All Rights Reserved, FeizM Pte Ltd
        </p>
      </div>
    </section>
  );
}
