import { Check } from "lucide-react";

const WHY_ITEMS = [
  {
    title: "Real-time Fleet Visibility",
    description:
      "Know where every vehicle is — right now. Accurate to 3m with patented curve-based tracking",
  },
  {
    title: "Driver Intelligence",
    description:
      "Speeding, harsh braking, idling, comprehensive driver behaviour reports to coach, not just penalise",
  },
  {
    title: "Fleet Cost Savings",
    description:
      "Identify fuel waste, optimise routes, reduce idle time. Everything you need to cut fleet running costs",
  },
  {
    title: "Third-Party Integration",
    description:
      "Open API + SDK + IOX expandability connects FeizMFLEET with your existing business software",
  },
];

/**
 * "Why" section of the Feizm "Fleet Management System" page.
 *
 * Built from a live `figma-cli` read of node 76:69404 ("Fleet Management
 * System / 02 Why", "FeizM" file) and DESIGN.md's tokens (app/tokens.css
 * `--fig-*` custom properties):
 *   - icon badge fill (brand-500) and checkmark color (brand-50) are exact
 *     token matches, confirmed by converting each fill's RGB to hex, not
 *     assumed from visual similarity
 *   - gaps: icon-to-text (22px) and title-to-description (8px) both map to
 *     real spacing tokens (spacing-22, spacing-8); the 210px gap between
 *     the left column and the list doesn't match any spacing token and is
 *     literal
 *   - heading (44.9px), item title (18.71px) and description (14px) are
 *     literal component-scaled sizes, same reasoning as every other
 *     section's non-tokenized text — notably the description is 14px, NOT
 *     typography-size-sm (16px), confirmed on the actual text node rather
 *     than assumed to match the nearest token
 *   - list dividers (neutral-200, exact match): the list has its own
 *     top border, and each item has its own bottom border — not one
 *     border per item on every edge, confirmed by reading `strokeTopWeight`/
 *     `strokeBottomWeight` directly rather than assumed from the screenshot
 *     (which shows a line above every item, including the first)
 *
 * Photo (node 76:69409, "Rectangle 2") intentionally omitted: its IMAGE
 * fill resolves to a literal 1x1px asset (confirmed by reading the
 * exported file's real pixel dimensions, not just trusting the fill's
 * `type: "IMAGE"`) — effectively an empty/unset placeholder, not a real
 * photo. An earlier pass reproduced it as a plain neutral-100 box; removed
 * per request rather than keeping a placeholder for content that doesn't
 * exist yet. Left column is just the heading now.
 *
 * Checkmark icon: Figma's own icon is a custom vector (34x34 circle +
 * 16x12 check glyph, fill-based not stroke-based) — reproduced with
 * lucide's `Check` icon at a comparable weight/size inside a plain
 * circular badge, not traced node-for-node.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as every other section on this page.
 *
 * `id="why-feizmfleet"` is the Fleet Hero's "About Fleet Management
 * System" button's scroll target (components/shared/scroll-link.tsx) and
 * the SiteHeader's overlay->solid trigger target on this page (see
 * app/fleet-management-system/page.tsx's `triggerId` prop) — the same
 * element serves both, since "section is at the header's bottom edge"
 * and "header should be solid" are the same condition by design.
 * `scroll-mt-[var(--header-h)]` makes a ScrollLink landing stop with this
 * section's own top padding (not the header) as the breathing room above
 * the heading — no extra offset needed on top of that. `tabIndex={-1}` +
 * `outline-none` let ScrollLink move keyboard focus here after a landing
 * without the section ever joining normal Tab order or showing a focus
 * ring (it's only ever focused programmatically).
 */
export function FleetWhy() {
  return (
    <section
      id="why-feizmfleet"
      tabIndex={-1}
      className="flex w-[1440px] scroll-mt-[var(--header-h)] items-start outline-none"
      style={{
        backgroundColor: "var(--fig-color-neutral-0)",
        paddingTop: "var(--fig-spacing-40)",
        paddingBottom: "var(--fig-spacing-40)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        gap: 210,
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      {/* Left: heading */}
      <div className="flex shrink-0 flex-col" style={{ width: 530 }}>
        <h2
          className="font-normal"
          style={{
            color: "var(--fig-color-neutral-900)",
            fontSize: "44.9px",
            lineHeight: "50.9px",
          }}
        >
          Why FeizMFLEET GPS Fleet Management Systems?
        </h2>
      </div>

      {/* Right: checklist */}
      <ul
        className="flex min-w-0 flex-1 flex-col"
        style={{ borderTop: "1px solid var(--fig-color-neutral-200)" }}
      >
        {WHY_ITEMS.map((item) => (
          <li
            key={item.title}
            className="flex items-center"
            style={{
              height: 116,
              borderBottom: "1px solid var(--fig-color-neutral-200)",
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{
                width: 34,
                height: 34,
                backgroundColor: "var(--fig-color-brand-500)",
              }}
            >
              <Check size={16} strokeWidth={2.5} color="var(--fig-color-brand-50)" />
            </span>
            <div
              className="flex min-w-0 flex-col"
              style={{ marginLeft: "var(--fig-spacing-22)", gap: "var(--fig-spacing-8)" }}
            >
              <span
                className="font-normal"
                style={{
                  color: "var(--fig-color-neutral-900)",
                  fontSize: "18.71px",
                  lineHeight: "26.19px",
                }}
              >
                {item.title}
              </span>
              <p
                className="font-normal"
                style={{
                  color: "var(--fig-color-neutral-900)",
                  fontSize: "14px",
                  lineHeight: "16px",
                }}
              >
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
