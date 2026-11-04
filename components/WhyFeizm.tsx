/**
 * "Why Feizm" section of the Feizm "About Us" page.
 *
 * Rebuilt 1:1 from the Figma frame (node 1:573, "Why Feizm", read live via
 * `figma-cli`) and DESIGN.md's "About Us Tokens" variable collection (same
 * `--fig-*` custom properties as the other sections, from app/tokens.css):
 *   - section background (brand-50), badge fill/border (brand-100/200),
 *     badge radius (radius-lg), photo placeholder bg (neutral-100) and its
 *     radius (radius-sm) are all bound Figma variables
 *   - both the headline and the paragraph are genuinely 44px in Figma
 *     (confirmed via `figma-cli eval`, not assumed) — that's an exact
 *     match for the typography/size/3xl token, so unlike Hero's
 *     component-scaled fractional sizes, this one really is bound to the
 *     token rather than used as a literal. The two read as different
 *     sizes on screen only because the paragraph is much longer and wraps
 *     into 4 lines, not because the font size differs.
 *   - the badge's text color (#b45723) isn't one of the 18 tokenized
 *     colors — it's a shared-component color from Figma's Badge component,
 *     outside the About Us Tokens collection — so it's a literal value
 *     here, same treatment as other untokenized-but-precise figures
 *
 * The team photo is a supplied asset (public/why/team.jpeg) — a trade-show
 * booth shot with the FeizM Solution Ecosystem backdrop, the same kind of
 * scene as Figma's original image fill. Its native aspect (2400x1792,
 * ~1.34:1) is narrower than the 1360x571 (~2.38:1) display box, so
 * object-cover crops more off the top/bottom than Figma's own asset did;
 * centered crop was chosen to keep the team in frame.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as the other sections.
 */
export function WhyFeizm() {
  return (
    <section
      className="flex w-[1440px] flex-col"
      style={{
        backgroundColor: "var(--fig-color-brand-50)",
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        gap: "var(--fig-spacing-64)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      {/* Intro block: badge + heading + paragraph */}
      <div className="flex flex-col" style={{ gap: "var(--fig-spacing-32)" }}>
        <div
          className="flex w-fit items-center"
          style={{
            gap: "var(--fig-spacing-4)",
            padding: "var(--fig-spacing-8)",
            borderRadius: "var(--fig-radius-lg)",
            backgroundColor: "var(--fig-color-brand-100)",
            border: "1px solid var(--fig-color-brand-200)",
            color: "#b45723",
          }}
        >
          <span className="font-normal" style={{ fontSize: "14px" }}>
            01 - Why FeizM?
          </span>
        </div>

        <div className="flex flex-col" style={{ gap: "var(--fig-spacing-60)" }}>
          <h2
            className="font-normal"
            style={{
              color: "var(--fig-color-neutral-900)",
              fontSize: "var(--fig-typography-size-3xl)",
              lineHeight: "44.9px",
            }}
          >
            We always have big plans for our clients&apos; fleets
          </h2>
          <p
            className="font-normal"
            style={{
              color: "var(--fig-color-neutral-900)",
              fontSize: "var(--fig-typography-size-3xl)",
              lineHeight: "49.9px",
            }}
          >
            Feizm is an authorized Geotab partner serving Singapore
            We&apos;ve been solving real fleet challenges since 2015,
            combining the world&apos;s #1 fleet technology with local
            deployment expertise that global platforms simply can&apos;t
            match
          </p>
        </div>
      </div>

      {/* Team photo */}
      <div
        className="w-full overflow-hidden"
        style={{
          height: 571,
          borderRadius: "var(--fig-radius-sm)",
          backgroundColor: "var(--fig-color-neutral-100)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/why/team.jpeg"
          alt="The Feizm team"
          className="h-full w-full object-cover"
        />
      </div>
    </section>
  );
}
