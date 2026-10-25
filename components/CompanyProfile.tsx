const TOPICS = [
  { number: "01", label: "Why FeizM" },
  { number: "02", label: "Trust" },
  { number: "03", label: "Our Story" },
  { number: "04", label: "Our Principles" },
  { number: "05", label: "People" },
];

/**
 * "Company Profile Overview" section of the Feizm "About Us" page.
 *
 * Rebuilt 1:1 from the Figma frame (node 1:542, read live via `figma-cli`)
 * and DESIGN.md's "About Us Tokens" variable collection (same `--fig-*`
 * custom properties as Hero.tsx, from app/tokens.css):
 *   - heading color (neutral-900), topic-number color (brand-500), row
 *     divider color (neutral-200), image placeholder bg (neutral-100) and
 *     its radius (radius-sm) are all bound Figma variables
 *   - the heading's font size (44.9px) is a literal Figma value, same
 *     reasoning as Hero.tsx: it's a component-scaled size DESIGN.md
 *     deliberately left untokenized, not a real type-scale step
 *   - the trade-show photo is the asset supplied for this section
 *     (public/profile/trade-show.jpeg), replacing the Figma image fill
 *
 * One deliberate omission: Figma's node tree has a "Decorative Accent"
 * image layer (531x294, rounded) positioned almost exactly behind the
 * profile photo. Because "Content Row" paints after "Section Title Block"
 * in sibling order, that layer is fully covered and invisible in the
 * actual rendered design (confirmed via screenshot) — so it's left out
 * here rather than reproducing an invisible layer.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same as Hero.tsx.
 */
export function CompanyProfile() {
  return (
    <section
      id="company-profile"
      className="relative flex w-[1440px] flex-col"
      style={{
        backgroundColor: "var(--fig-color-neutral-0)",
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        gap: "var(--fig-spacing-64)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      {/* Section title */}
      <h2
        className="font-normal"
        style={{
          width: 530,
          color: "var(--fig-color-neutral-900)",
          fontSize: "44.9px",
          lineHeight: "50.9px",
        }}
      >
        Glimps of Feizm Company Profile
      </h2>

      {/* Content row: photo + numbered topic list */}
      <div className="flex w-full items-start" style={{ gap: "var(--fig-spacing-32)" }}>
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: 668,
            height: 571,
            borderRadius: "var(--fig-radius-sm)",
            backgroundColor: "var(--fig-color-neutral-100)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/profile/trade-show.jpeg"
            alt="Feizm team presenting the IoT Solution Ecosystem at a trade show booth"
            className="h-full w-full object-cover"
          />
        </div>

        <ul className="flex w-full flex-col">
          {TOPICS.map((topic) => (
            <li
              key={topic.number}
              className="flex items-center"
              style={{
                gap: "var(--fig-spacing-24)",
                paddingTop: "var(--fig-spacing-24)",
                paddingBottom: "var(--fig-spacing-24)",
                borderBottom: "1px solid var(--fig-color-neutral-200)",
              }}
            >
              <span
                className="font-normal"
                style={{
                  color: "var(--fig-color-brand-500)",
                  fontSize: "16px",
                  lineHeight: "24px",
                }}
              >
                {topic.number}
              </span>
              <span
                className="font-normal"
                style={{
                  color: "var(--fig-color-neutral-900)",
                  fontSize: "38px",
                  lineHeight: "45.6px",
                }}
              >
                {topic.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
