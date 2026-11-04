/**
 * "People 1" section of the Feizm "About Us" page — sits between Principles
 * and People 2 (PeopleSection2), matching Figma's page order.
 *
 * Built from a live `figma-cli` read of node 34:483 ("People 1 Section",
 * "FeizM" file) and DESIGN.md's tokens (app/tokens.css `--fig-*` custom
 * properties):
 *   - badge and heading are byte-identical to People 2's (same copy, same
 *     bound variables: brand-100/200 fill/border, radius-lg, neutral-900) —
 *     confirmed by reading both nodes rather than assumed from similarity
 *   - gap between badge/heading/photo-row (45px) and the paragraph's
 *     top offset (60px / spacing-60) are literal / tokenized the same way
 *     as People 2; the 32px gap between the photo grid and the paragraph
 *     column maps to spacing-32
 *   - paragraph text (14.97px, Hanken Grotesk Regular, neutral-900) is a
 *     literal component size — no matching typography-size token (closest,
 *     sm, is 16px, not the same value)
 *   - section background (#ececec) isn't tokenized — no neutral-* token in
 *     the extracted set matches it exactly (closest, neutral-200, is
 *     visibly lighter at #e3e3e3)
 *
 * Photo grid: 5 images arranged in a fixed 3-column x 3-row CSS grid
 * (235px / 235px / 473px columns, 155px / 156px / 213px rows, 2px gap) —
 * read directly from each image frame's x/y/w/h in Figma rather than
 * assumed from the screenshot, then expressed as grid placements:
 *   - col 1, row 1: forklift photo
 *   - col 2, rows 1-2 (spans both): Dresden freight center photo
 *   - col 3, rows 1-3 (spans all three): drivers-with-trucks photo (the
 *     large right-hand photo)
 *   - col 1, row 2: crane control panel photo
 *   - col 1-2 (spans both), row 3: truck cabin photo
 * All 5 images were exported directly from their Figma image fills via
 * `figma-cli verify --save` (no child image layer — each frame carries an
 * IMAGE fill directly) into public/people1/.
 *
 * Each photo has a 3.74px corner radius in Figma — not on the Image frame
 * itself (that's 0), but on its parent "Container" wrapper, which clips
 * (`clipsContent: true`). Reproduced here as `border-radius` directly on
 * each `<img>` (border-radius clips a replaced element's own content in
 * CSS, so no separate overflow-hidden wrapper is needed). 3.74px isn't an
 * exact match for any `--fig-radius-*` token (closest, sm, is 4px) — same
 * situation as this component's other literal, non-tokenized values.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as every other section on this page.
 */
export function PeopleSection1() {
  return (
    <section
      className="flex w-[1440px] flex-col"
      style={{
        backgroundColor: "#ececec",
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
          className="grid shrink-0"
          style={{
            width: 948,
            height: 528,
            gridTemplateColumns: "235px 235px 473px",
            gridTemplateRows: "155px 156px 213px",
            gap: 2,
          }}
        >
          <img
            src="/people1/img-a.png"
            alt="Emons employee giving a thumbs up in a forklift"
            className="h-full w-full object-cover"
            style={{ gridColumn: "1 / 2", gridRow: "1 / 2", borderRadius: "3.74px" }}
          />
          <img
            src="/people1/img-b.png"
            alt="Emons employees at the Dresden freight center"
            className="h-full w-full object-cover"
            style={{ gridColumn: "2 / 3", gridRow: "1 / 3", borderRadius: "3.74px" }}
          />
          <img
            src="/people1/img-c.png"
            alt="Emons drivers in front of trucks at the site"
            className="h-full w-full object-cover"
            style={{ gridColumn: "3 / 4", gridRow: "1 / 4", borderRadius: "3.74px" }}
          />
          <img
            src="/people1/img-d.png"
            alt="Emons employee controlling a crane via a digital control panel"
            className="h-full w-full object-cover"
            style={{ gridColumn: "1 / 2", gridRow: "2 / 3", borderRadius: "3.74px" }}
          />
          <img
            src="/people1/img-e.png"
            alt="Emons driver in a truck cabin looking at trailers"
            className="h-full w-full object-cover"
            style={{ gridColumn: "1 / 3", gridRow: "3 / 4", borderRadius: "3.74px" }}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col self-stretch" style={{ paddingTop: "var(--fig-spacing-60)" }}>
          <p
            className="font-normal"
            style={{
              color: "var(--fig-color-neutral-900)",
              fontSize: "14.97px",
              lineHeight: "22.45px",
            }}
          >
            Every Feizm deployment is backed by people who know fleet operations
            firsthand. Our team combines engineering depth with field experience,and we
            stay with you long after go-live
          </p>
        </div>
      </div>
    </section>
  );
}
