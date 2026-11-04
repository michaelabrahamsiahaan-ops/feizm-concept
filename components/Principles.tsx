const PRINCIPLES = [
  {
    title: "Reliable Data",
    description:
      "Fleet decisions can't wait. Every data point is real-time and accurate. No delays, no approximations",
  },
  {
    title: "Partnership First",
    description:
      "We deploy. We train. We stay. From first onboarding to ongoing support, we're in it for the long haul",
  },
  {
    title: "Ecosystem",
    description:
      "One platform. Five solutions. Zero silos between fleet management, driver safety, and IoT",
  },
];

/**
 * "Our Principles" section of the Feizm "About Us" page.
 *
 * Rebuilt from a live `figma-cli` read of node 1:633 ("Our Principles",
 * connected "figma-cli test" file) and DESIGN.md's "About Us Tokens"
 * variable collection (same `--fig-*` custom properties as the other
 * sections, from app/tokens.css):
 *   - badge fill/border (brand-100/200), badge radius (radius-lg), heading
 *     color (neutral-900), row divider (neutral-300), dot + title color
 *     (brand-500), description color (brand-700) are all bound variables
 *   - gaps (22/60/64/15) and row padding (12) all map cleanly to real
 *     spacing tokens — confirmed by reading each one directly rather than
 *     assumed from the other sections' similar-looking numbers
 *   - heading (37.42px), title (13.56px) and description (29.93px) are
 *     literal component-scaled sizes, same reasoning as every other
 *     section's non-tokenized text
 *   - badge text color (#b45723) isn't tokenized — same untokenized
 *     shared-component color used on every other badge across this page
 *
 * The badge copy in Figma is literally "04- Princples" — missing the "i" in
 * "Principles," and no space before the dash (every other section's badge
 * uses "NN - Label"). Per request, the dash spacing is corrected here
 * ("04 - Princples") to match the other badges; the "Princples" spelling is
 * left as-is (Figma itself is unchanged either way — read-only).
 *
 * Layout: two columns (heading block + principles list) via a horizontal
 * flex row, each row within the list itself a horizontal flex (a narrow
 * title column with a dot marker, then the description) — matches Figma's
 * actual two-column-per-row structure, not a stacked title-above-description
 * layout the screenshot alone might suggest at a glance.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as the other sections.
 */
export function Principles() {
  return (
    <section
      className="flex w-[1440px] flex-col"
      style={{
        backgroundColor: "var(--fig-color-neutral-0)",
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <div className="flex w-full" style={{ gap: "var(--fig-spacing-60)" }}>
        {/* Left: badge + heading */}
        <div className="flex flex-1 flex-col" style={{ gap: "var(--fig-spacing-22)" }}>
          <div
            className="flex w-fit items-center"
            style={{
              fontFamily: "Inter, var(--font-hanken-grotesk)",
              fontWeight: 500,
              gap: "var(--fig-spacing-4)",
              padding: "var(--fig-spacing-8)",
              borderRadius: "var(--fig-radius-lg)",
              backgroundColor: "var(--fig-color-brand-100)",
              border: "1px solid var(--fig-color-brand-200)",
              color: "#b45723",
            }}
          >
            <span style={{ fontSize: "14px" }}>04 - Princples</span>
          </div>
          <h2
            className="font-normal"
            style={{
              color: "var(--fig-color-neutral-900)",
              fontSize: "37.42px",
              lineHeight: "43.03px",
            }}
          >
            Because it matters that it matters
          </h2>
        </div>

        {/* Right: principles list */}
        <div
          className="flex flex-1 flex-col"
          style={{ gap: "var(--fig-spacing-64)" }}
        >
          {PRINCIPLES.map((p) => (
            <div
              key={p.title}
              className="flex w-full"
              style={{
                gap: "var(--fig-spacing-15)",
                paddingTop: "var(--fig-spacing-12)",
                paddingBottom: "var(--fig-spacing-12)",
                borderTop: "1px solid var(--fig-color-neutral-300)",
              }}
            >
              <div className="flex shrink-0 items-center" style={{ width: 122, gap: "var(--fig-spacing-4)" }}>
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: "9.42px",
                    height: "9.42px",
                    backgroundColor: "var(--fig-color-brand-500)",
                  }}
                />
                <span
                  className="font-normal"
                  style={{
                    color: "var(--fig-color-brand-500)",
                    fontSize: "13.56px",
                    lineHeight: "17.77px",
                  }}
                >
                  {p.title}
                </span>
              </div>
              <p
                className="min-w-0 flex-1 font-normal"
                style={{
                  color: "var(--fig-color-brand-700)",
                  fontSize: "29.93px",
                  lineHeight: "35.55px",
                }}
              >
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
