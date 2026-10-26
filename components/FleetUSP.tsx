import { UspDividerDot } from "./fleet/usp-divider-dot";

const USP_ROWS = [
  {
    reverse: false,
    rowHeight: 558,
    image: { src: "/fleet-usp/ranked-devices.png", alt: "MyGeotab dashboard across desktop, tablet and phone, next to a Geotab GO device" },
    imageHeading: "Ranked 1",
    imageSubheading: "by ABI Research worldwide",
    heading: "FeizMFLEET GPS Fleet Management Systems",
    subheading: "Power of GPS and Telematics for Fleet Management",
    paragraph:
      "FeizMFLEET by Geotab uses telematics for reliable GPS fleet management. It offers real-time tracking, driver monitoring, and cost savings, customizable for any business. Geotab's GO device deploys quickly, ensuring fast onboarding in Singapore",
  },
  {
    reverse: true,
    rowHeight: 478,
    image: { src: "/fleet-usp/geotab-go.png", alt: "Geotab GO device surrounded by fleet-monitoring alert icons, in front of the MyGeotab dashboard" },
    imageHeading: "Captures fleet data in real-time",
    imageSubheading: "The installation doesn't require any special tools",
    heading: "Geotab GO Device",
    subheading: "Leveraging Advanced Telematics in Fleet Management",
    paragraph:
      "Geotab’s GO device is a powerful telematics tool that captures fleet data in real-time for exceptional management. It installs easily to your vehicle’s OBD II port without special tools or damage",
  },
];

const TOTAL_ROWS_HEIGHT = USP_ROWS.reduce((sum, row) => sum + row.rowHeight, 0);

function ImageBlock({
  image,
  heading,
  subheading,
}: {
  image: { src: string; alt: string };
  heading: string;
  subheading: string;
}) {
  return (
    <div className="flex flex-col" style={{ width: 602 }}>
      <div className="flex flex-col" style={{ gap: "var(--fig-spacing-12)" }}>
        <span
          className="font-semibold"
          style={{ color: "var(--fig-color-neutral-900)", fontSize: "32px", lineHeight: "34px" }}
        >
          {heading}
        </span>
        <span
          className="font-normal"
          style={{ color: "var(--fig-color-neutral-900)", fontSize: "24px", lineHeight: "34px" }}
        >
          {subheading}
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt}
        style={{ marginTop: "var(--fig-spacing-64)", width: 531, height: 294, objectFit: "contain" }}
      />
    </div>
  );
}

function TextBlock({
  heading,
  subheading,
  paragraph,
}: {
  heading: string;
  subheading: string;
  paragraph: string;
}) {
  return (
    <div className="flex flex-col" style={{ width: 602 }}>
      <div className="flex flex-col" style={{ gap: "var(--fig-spacing-8)" }}>
        <h3
          className="font-normal"
          style={{ color: "var(--fig-color-neutral-900)", fontSize: "37.42px", lineHeight: "43.03px" }}
        >
          {heading}
        </h3>
        <span className="font-normal" style={{ color: "#696968", fontSize: "18.71px", lineHeight: "26.19px" }}>
          {subheading}
        </span>
      </div>
      <p
        className="font-normal"
        style={{
          marginTop: "var(--fig-spacing-24)",
          color: "var(--fig-color-neutral-900)",
          fontSize: "14.97px",
          lineHeight: "22.45px",
        }}
      >
        {paragraph}
      </p>
      <button
        type="button"
        className="w-fit cursor-pointer font-medium"
        style={{
          marginTop: "var(--fig-spacing-24)",
          fontSize: "12px",
          color: "var(--fig-color-neutral-0)",
          backgroundColor: "var(--fig-color-brand-500)",
          border: "1px solid var(--fig-color-accent-coral-light)",
          borderRadius: "var(--fig-radius-md)",
          paddingLeft: "var(--fig-spacing-12)",
          paddingRight: "var(--fig-spacing-12)",
          paddingTop: "var(--fig-spacing-8)",
          paddingBottom: "var(--fig-spacing-8)",
        }}
      >
        Learn More
      </button>
    </div>
  );
}

/**
 * "USP" section of the Feizm "Fleet Management System" page.
 *
 * Built from a live `figma-cli` read of node 77:69473 ("Fleet Management
 * System / 03 USP", "FeizM" file) and DESIGN.md's tokens (app/tokens.css
 * `--fig-*` custom properties):
 *   - "Learn More" button: fill brand-500, border accent-coral-light,
 *     radius-md all exact token matches — a SOLID filled button, not the
 *     transparent-outline style used by the Hero "About Fleet Management
 *     System" button; confirmed on this node's own fills rather than
 *     assumed to match the other button style used elsewhere on this page
 *   - divider dot (brand-500) is an exact token match; the divider LINE
 *     color (~#F9B39D) and the subheading color (~#696968) are both close
 *     to but not exact matches for any token (accent-coral-light/#fbccbd
 *     and neutral-700/#444444 respectively) — kept as literals
 *   - the divider line is DASHED (Figma `dashPattern: [2, 2]`), not solid
 *     — missed on the first pass (only `strokes`/`strokeWeight` were
 *     checked, not `dashPattern`), caught by cropping both screenshots
 *     tightly around the dot/line and comparing pixel-for-pixel rather
 *     than at full-section scale, where a 1px-wide dashed line is
 *     indistinguishable from solid. Reproduced via a `repeating-linear-
 *     gradient` background (2px color, 2px transparent) rather than CSS
 *     `border-style: dashed`, which doesn't allow specifying an exact
 *     dash/gap ratio for a 1px-wide element
 *   - gaps: image-heading-to-image (64px), ranked-heading-to-subheading
 *     (12px), and paragraph-to-button (24px) all map to real spacing
 *     tokens (spacing-64, spacing-12, spacing-24)
 *   - text sizes (32/24/37.42/18.71/14.97/12px) are literal
 *     component-scaled values, same reasoning as every other section
 *
 * Two staggered rows, each pairing one "image block" (short heading above
 * a photo) with one "text block" (heading/subheading/paragraph/button),
 * alternating which side each sits on — confirmed by reading each row's
 * actual child order in Figma (row 1: image left, text right; row 2: text
 * left, image right), not assumed from the screenshot alone. A 156px
 * gutter between the two 602px columns reserves space for the center
 * divider, but the divider + dot themselves are rendered ONCE as a single
 * overlay spanning both rows (`UspDividerDot`, components/fleet/), not
 * duplicated per row — see that component's own doc comment for why: an
 * earlier pass had two independent static dots and two disconnected line
 * segments, neither scroll-linked, which directly contradicted what
 * Figma actually has (only the row-1 dot is visible there; the row-2
 * dot's wrapper frame is `visible: false`).
 *
 * Both photos (node 77:69480, 77:69503) are real exported images here —
 * unlike the "Why" section's "Rectangle 2", which resolved to a broken
 * 1x1px asset, these both exported at their real 1062x588 size (confirmed
 * by reading the actual file dimensions, not just the fill's `type:
 * "IMAGE"`), so no placeholder treatment was needed.
 *
 * Each row's own height (`rowHeight`, 558 / 478) is taken directly from
 * Figma rather than left to hug its content blocks (438px each) — Figma's
 * own row height is driven by its (now-removed) per-row divider segment,
 * not the content, in both rows. Without `rowHeight` set explicitly, each
 * row collapsed to the shorter, content-only height and the whole section
 * rendered 160px shorter than Figma — caught by comparing the two
 * screenshots' heights directly (1116 vs 956), not by eye. The two rows'
 * heights still sum to the exact track height `UspDividerDot` travels
 * (`TOTAL_ROWS_HEIGHT`), so the dot's range matches "top of row 1 to
 * bottom of row 2" with no separate conversion needed.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as every other section on this page.
 */
export function FleetUSP() {
  return (
    <section
      className="flex w-[1440px] flex-col"
      style={{
        backgroundColor: "var(--fig-color-neutral-0)",
        paddingTop: "var(--fig-spacing-40)",
        paddingBottom: "var(--fig-spacing-40)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <div className="relative" style={{ height: TOTAL_ROWS_HEIGHT }}>
        {USP_ROWS.map((row) => (
          <div key={row.heading} className="flex items-start" style={{ height: row.rowHeight }}>
            {row.reverse ? (
              <TextBlock heading={row.heading} subheading={row.subheading} paragraph={row.paragraph} />
            ) : (
              <ImageBlock image={row.image} heading={row.imageHeading} subheading={row.imageSubheading} />
            )}

            {/* Spacer matching the center gutter's width — the actual
                divider + dot are rendered once, below, as a single overlay
                spanning both rows (see UspDividerDot's own doc comment). */}
            <div className="shrink-0" style={{ width: 156, alignSelf: "stretch" }} />

            {row.reverse ? (
              <ImageBlock image={row.image} heading={row.imageHeading} subheading={row.imageSubheading} />
            ) : (
              <TextBlock heading={row.heading} subheading={row.subheading} paragraph={row.paragraph} />
            )}
          </div>
        ))}

        <UspDividerDot />
      </div>
    </section>
  );
}
