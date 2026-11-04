const PEOPLE_PARAGRAPHS: string[] = [
  "At Feiz, we value community relations encompassing businesses and networks. Our purpose is to contribute our solutions to social causes that will help improve lives with advanced mobility technologies",
  "In addition to upholding integrity in our stakeholder interactions, we actively create opportunities through CSR activities, to have a positive impact on both ours and clients communities",
  "We look forward to connecting with more individuals and organisations who believe in collaborating or participating for social relationship building activities",
  "Food From The Heart is a non-profit organisation based in Singapore that brings joy to those in need by delivering food, toys and essentials",
];

/**
 * "People" section of the Feizm "About Us" page.
 *
 * Built from a live `figma-cli` read of node 33:232 ("People Section",
 * "FeizM" file) and DESIGN.md's tokens (app/tokens.css `--fig-*` custom
 * properties):
 *   - badge fill/border (brand-100/200), badge radius (radius-lg), heading
 *     color (neutral-900), paragraph color (neutral-700) are all bound
 *     Figma variables that map cleanly to existing tokens
 *   - gaps: 45px between badge/heading/image-row is a literal value (no
 *     matching spacing token — same situation as other sections' untokenized
 *     gaps); 32px between the image box and the text column and 24px
 *     between paragraphs both map to real tokens (spacing-32, spacing-24)
 *   - badge text color (#b45723), the image box's 1px border (#ececec) and
 *     the inline link color (#f15a29) aren't tokenized — none of the three
 *     match any variable in the extracted set, so they're literal, same
 *     reasoning as every other section's untokenized one-off colors
 *   - heading (36px) and paragraph (18px) sizes are literal component
 *     text, consistent with every other section on this page
 *
 * The last paragraph has one substring ("Food from the Heart") recolored
 * inline within a single Figma text node (confirmed via
 * getStyledTextSegments, not a separate overlapping layer) — reproduced
 * here as a nested <span> rather than splitting into multiple <p> tags.
 *
 * Image: node 33:240 has a Figma IMAGE fill directly on the frame (no
 * child image layer), exported via `figma-cli verify --scale 2` to
 * public/people/food-from-the-heart.png. The frame that actually carries
 * the visible 1px border and houses the logo is its parent, Frame 11
 * (593x735, no fill, border only) — the logo itself is centered within it
 * both axes, not stretched to fill it.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as the other sections.
 */
export function PeopleSection2() {
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
        <span style={{ fontSize: "14px" }}>05 - People</span>
      </div>

      <h2
        className="font-normal"
        style={{
          marginTop: 45,
          color: "var(--fig-color-neutral-900)",
          fontSize: "36px",
          lineHeight: "42px",
        }}
      >
        The most important thing behind the company
        <br />
        are the people
      </h2>

      <div className="flex items-center" style={{ marginTop: 45, gap: "var(--fig-spacing-32)" }}>
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ width: 593, height: 735, border: "1px solid #ececec" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/people/food-from-the-heart.png"
            alt="Food from the Heart"
            width={300}
            height={160}
            style={{ width: 300, height: 160 }}
          />
        </div>

        <div
          className="flex min-w-0 flex-1 flex-col font-semibold"
          style={{
            gap: "var(--fig-spacing-24)",
            fontFamily: "var(--font-open-sans)",
            color: "var(--fig-color-neutral-700)",
            fontSize: "18px",
            lineHeight: "32px",
          }}
        >
          {PEOPLE_PARAGRAPHS.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
          <p>
            With the continuous support and help from our team, we have successfully
            installed our systems into their delivery vehicles to allow{" "}
            <span style={{ color: "#f15a29" }}>Food from the Heart</span> to better manage
            their deliveries and keep up the good work without limitations. While they
            deliver smiles right from the core of their heart, we make sure their drivers
            are safe and secure and the good deed doesn&rsquo;t go in vain! A new project
            to enhance operation efficiency with route optimisation is currently
            underway. We are blessed to be part of this movement
          </p>
        </div>
      </div>
    </section>
  );
}
