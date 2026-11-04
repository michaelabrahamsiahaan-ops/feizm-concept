import { Building2, CalendarFold, Earth, Truck } from "lucide-react";

const STATS = [
  { label: "Years in Market", value: "10+", icon: CalendarFold },
  { label: "Enterprise", value: "500+", icon: Building2 },
  { label: "Vehicles Traced", value: "50.000+", icon: Truck },
  { label: "Countries", value: "5+", icon: Earth },
];

/**
 * "Achievement Section" of the Feizm "About Us" page.
 *
 * Note on source: built from the Figma frame named "Trust Stats" (node
 * 1:584, "figma-cli test" file) — "Achievement Section" (node 4:344) in
 * the "FeizM" file is the same content under a different name. A later
 * session caught a brief, accidental connection to FeizM (the plugin
 * connection is flaky — see other sections' comments) and used it to
 * verify the stat-card internals directly against 4:344, which is how the
 * card-spacing bug below was actually found and fixed: not by assumption,
 * by reading the real node.
 *
 * Stat card internal spacing: each card's inner container is a FIXED
 * 243px tall with `primaryAxisAlignItems: SPACE_BETWEEN` — i.e. the
 * label+icon row is pinned to the top, the big number pinned to the
 * bottom, with the gap between them coming from distributing the
 * remaining space, not a fixed itemSpacing value (which reports as 0).
 * An earlier version of this component had neither the fixed height nor
 * `justify-between`, so the number sat directly under the label with
 * almost no gap — confirmed via figma-cli, not visually guessed, since
 * `itemSpacing: 0` on its own is actively misleading about this.
 *
 * Built from DESIGN.md's "About Us Tokens" variable collection (same
 * `--fig-*` custom properties as the other sections, from app/tokens.css):
 *   - badge fill/border (brand-100/200), badge radius (radius-lg), card
 *     divider color (neutral-300) are all bound Figma variables
 *   - the big stat numbers (59.87px) and the intro question (37.42px) are
 *     literal Figma values, same reasoning as every other section's
 *     component-scaled text: not a deliberate type-scale step, so not
 *     forced onto an unrelated token
 *   - the badge's text color (#b45723) is the same untokenized
 *     shared-component color used in WhyFeizm's badge
 *
 * Card borders: Figma distributes top/bottom/left on every card and adds a
 * right border only on the last one (so adjacent cards don't double up a
 * shared edge). Reproduced here with one outer border around the whole
 * card row plus a left divider on every card after the first — same
 * visual result, simpler markup.
 *
 * Card row corners: Figma rounds this 4px (radius-sm) — not via a radius on
 * the row itself, but on each individual card: the first card has its two
 * LEFT corners rounded, the last card has its two RIGHT corners rounded,
 * and every card in between is square (confirmed via each card's
 * top/bottom-left/right radius, since the row's own cornerRadius reads as
 * Figma's "mixed" value with no uniform number). Reproduced here as
 * `border-radius` + `overflow-hidden` on the single outer row wrapper —
 * same visual result (the inner cards have no fill of their own to clip
 * differently), simpler than rounding each card individually.
 *
 * One deliberate omission: a "Partner Logos" row (9 logos, including an
 * Esri one) exists in the Figma node tree directly below the stat cards,
 * but its `visible` flag is false — same pattern as Hero's hidden
 * "Request Demo" button. Left out here too, since it's not part of the
 * actual rendered design.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as the other sections.
 */
export function AchievementSection() {
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
      <div className="flex flex-col" style={{ gap: "var(--fig-spacing-60)" }}>
        {/* Badge + intro question */}
        <div className="flex flex-col" style={{ gap: "var(--fig-spacing-22)" }}>
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
              02 - Trust
            </span>
          </div>
          <p
            className="font-normal"
            style={{
              maxWidth: 1047,
              color: "var(--fig-color-neutral-900)",
              fontSize: "37.42px",
              lineHeight: "43px",
            }}
          >
            What is particularly important to you is not entrusted to
            everyone
          </p>
        </div>

        {/* Stat cards */}
        <div
          className="flex w-full overflow-hidden"
          style={{
            border: "1px solid var(--fig-color-neutral-300)",
            borderRadius: "var(--fig-radius-sm)",
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-1 flex-col justify-between"
              style={{
                height: 243,
                padding: "var(--fig-spacing-15)",
                borderLeft:
                  i === 0 ? undefined : "1px solid var(--fig-color-neutral-300)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "16.84px" }}
                >
                  {stat.label}
                </span>
                <stat.icon size={24} color="var(--fig-color-neutral-500)" />
              </div>
              <span
                className="font-normal"
                style={{
                  color: "var(--fig-color-neutral-900)",
                  fontSize: "59.87px",
                  lineHeight: "60px",
                }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
