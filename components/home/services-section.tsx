import type { CSSProperties } from "react";
import { SectionBadge } from "@/components/SectionBadge";

type Service = {
  number: string;
  title: string;
  description: string;
  href: string;
};

const SERVICES: Service[] = [
  {
    number: "01",
    title: "Fleet Management",
    description:
      "Integrated GPS fleet management system; scalable to every business. It tracks your vehicles, monitors driver behaviour and manages your costs with comprehensive reports on fleet data.",
    href: "#",
  },
  {
    number: "02",
    title: "Asset Management",
    description:
      "IoT based asset tracking solution which makes use of industrialised hardware with sensors and software applications to track real-time information on movable assets.",
    href: "#",
  },
  {
    number: "03",
    title: "Safety and Surveillance",
    description:
      "Provides visual monitoring and assistance for fleet safety and surveillance. It enables drivers to prevent accidents, reduce costs associated to incidents with proof of incidence.",
    href: "#",
  },
  {
    number: "04",
    title: "Transport Management",
    description:
      "Cloud-based transport management system with electronic proof of delivery. It is built for transporters and encourages them to go paperless by digitally planning their jobs online.",
    href: "#",
  },
  {
    number: "05",
    title: "Device Management",
    description:
      "Enables device connectivity via industry standard IoT protocols, HTTP and SDK supporting both cloud and on-premises deployment.",
    href: "#",
  },
];

// Small -> large reference "Frame"s (nodes 190:342975 / 190:342979): the
// icon vector scales 7.375px -> 23.75px, and its stroke-width scales
// 0.9316 -> 3 in lockstep (ratio 0.3105 either way) — a pure uniform
// scale, not independently-varying stroke width, so the animation can
// just `transform: scale()` ONE svg exported at its large size rather
// than cross-fading between two assets.
const ARROW_SCALE_START = 7.375 / 23.75;

/**
 * The hover-reveal arrow (exported from node 189:221649 — the actual
 * arrow instance already live on "Home / 04 Services - Hover"'s Fleet
 * Management row, confirmed identical to the large reference frame, not
 * just assumed). Rendered at its native 57x57 (the exported frame's own
 * size, not cropped to the inner ~23.75px glyph) so the reserved layout
 * space matches Figma's own spacing model exactly: the title's own text
 * box width + this frame's full 57px width + the row's 8px gap is what
 * Figma actually measures, not title-width + glyph-width + gap.
 */
function ServiceArrow({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      width="57"
      height="57"
      viewBox="0 0 57 57"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M16.625 16.625H40.375V40.375"
        stroke="var(--fig-color-brand-500)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.625 40.375L40.375 16.625"
        stroke="var(--fig-color-brand-500)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "Services" section of the Feizm Homepage ("Home / 04 Services", node
 * 179:160782, read live via `figma-cli`) and DESIGN.md's "About Us Tokens"
 * variable collection (same `--fig-*` custom properties as the other
 * sections, from app/tokens.css):
 *   - section padding (60/40), content gap (36) and each row's own
 *     top/bottom padding (24) and column gap (64) all map to real spacing
 *     tokens — confirmed per-value, not assumed from other sections'
 *     similar-looking numbers. Each row's LEFT/RIGHT padding is 0 — the
 *     row's own horizontal inset comes entirely from the section's own
 *     40px side padding, and the description column fills the reclaimed
 *     space (747px wide, not 699).
 *   - heading color (neutral-900), index number color (brand-500), row
 *     divider (neutral-200), title/description color (neutral-900), and
 *     the hover arrow's stroke (brand-500) are all bound variables
 *   - heading (40px), title (38px), description (20px) and the index
 *     number (16px) are literal component-scaled sizes, same reasoning as
 *     every other section's non-tokenized text
 *
 * Layout: each row is a horizontal flex — a FIXED 549px-wide "index +
 * title" column (fixed, not hug, so every row's title starts at the same
 * x regardless of the index/title's own text length) then the description
 * filling the remainder. Every row (including the last) has its own
 * bottom-only divider (a uniform `border` would double every shared edge
 * between rows, so only `borderBottom` is set).
 *
 * ---- Hover arrow (new; read from "Home / 04 Services - Hover", node
 * 189:160942, and the two reference "Frame" nodes 190:342975/342979) ----
 * Every row is a real `<a>` covering the whole row (the hover/focus and
 * click target), each independently animating its own arrow — no shared
 * state, so moving the mouse quickly down the list can't leave a stale
 * arrow stuck on a row the cursor has already left (each row's CSS
 * transition is self-contained, driven by its own `:hover`/
 * `:focus-visible`, not by any JS-tracked "which row is active" state).
 *
 * The arrow sits INSIDE the title's own flex row (a sibling of the title
 * text, 8px gap — matches Figma's title-wrapper `itemSpacing`, confirmed
 * directly: `arrow.x (323) === title text width (315) + 8`), not
 * absolutely positioned over it — it's always rendered (never
 * conditionally mounted), so its 57px-wide box is always reserved in the
 * row's layout and the title's own position never shifts when the arrow
 * fades/grows in, confirmed in Step 3's before/during-hover measurement.
 * Only `opacity` and `transform: scale()` are ever animated (GPU-only,
 * no layout properties).
 *
 * Hidden -> hover-in uses the FAST, floaty ease-out
 * (`cubic-bezier(0,0,0.2,1)`, ~300ms) specified in the brief; hover-out
 * reverses with a snappier ease-in (`cubic-bezier(0.4,0,1,1)`, ~200ms) —
 * expressed as two different Tailwind arbitrary-value `transition-*`
 * utilities, one on the base (unhovered) class list and one on the
 * `group-hover:`/`group-focus-visible:` class list; which one actually
 * drives a given transition is ordinary CSS behavior (the transition
 * runs using the newly-matched rule's own `transition` property), not
 * anything JS-timed.
 *
 * `prefers-reduced-motion`: `motion-reduce:duration-0` on both directions
 * collapses the transition to instant — the arrow still appears/
 * disappears (opacity still changes), just with no animated scale to
 * perceive, same effect as "no animation" without a separate markup path.
 *
 * Touch (no `hover`): `@media (hover: hover)` is what Tailwind's `hover:`
 * variant already compiles to, but `group-hover:` on a non-interactive
 * group needs the same scoping done explicitly here, since Tailwind's
 * plain `group-hover:` does NOT add a `(hover: hover)` guard by default —
 * so touch devices (which merely TAP, they don't hover) would otherwise
 * never trigger it and the arrow would just never appear there. Per
 * explicit confirmation, touch instead shows the arrow statically (no
 * animation): `[@media(hover:none)]:opacity-100` here, plus the matching
 * `@media (hover: none) { .service-arrow { transform: scale(1); } }`
 * rule in globals.css (see `.service-arrow`'s own comment there for why
 * the scale itself is a hand-written rule, not a Tailwind utility).
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as the other sections (e.g. Principles.tsx).
 */
export function ServicesSection() {
  return (
    <section
      className="flex w-[1440px] flex-col"
      style={{
        backgroundColor: "var(--fig-color-neutral-0)",
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        gap: "36px",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <div className="flex w-full items-center justify-between">
        <h2
          className="font-normal"
          style={{
            color: "var(--fig-color-neutral-900)",
            fontSize: "40px",
            lineHeight: "44.9px",
          }}
        >
          What can FeizM do for your business?
        </h2>
        <SectionBadge label="Services" />
      </div>

      <div className="flex w-full flex-col">
        {SERVICES.map((service) => (
          <a
            key={service.number}
            href={service.href}
            className="group flex w-full items-start no-underline outline-none focus-visible:rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--fig-color-brand-500)]"
            style={{
              gap: "var(--fig-spacing-64)",
              paddingTop: "var(--fig-spacing-24)",
              paddingBottom: "var(--fig-spacing-24)",
              borderBottom: "1px solid var(--fig-color-neutral-200)",
            }}
          >
            <div className="flex shrink-0 items-end" style={{ width: 549, gap: "var(--fig-spacing-8)" }}>
              <span className="shrink-0" style={{ paddingBottom: "9px" }}>
                <span
                  className="font-normal"
                  style={{ color: "var(--fig-color-brand-500)", fontSize: "16px", lineHeight: "24px" }}
                >
                  {service.number}
                </span>
              </span>
              <h3
                className="flex items-start font-normal"
                style={{ color: "var(--fig-color-neutral-900)", fontSize: "38px", lineHeight: "57px", gap: "8px" }}
              >
                <span>{service.title}</span>
                <ServiceArrow
                  className={[
                    "service-arrow origin-bottom-left opacity-0",
                    "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.4,0,1,1)]",
                    "group-hover:opacity-100",
                    "group-hover:transition-[opacity,transform] group-hover:duration-300 group-hover:ease-[cubic-bezier(0,0,0.2,1)]",
                    "group-focus-visible:opacity-100",
                    "group-focus-visible:transition-[opacity,transform] group-focus-visible:duration-300 group-focus-visible:ease-[cubic-bezier(0,0,0.2,1)]",
                    // Reduced motion must win over BOTH directions — the
                    // base `motion-reduce:` pair alone only reaches the
                    // hover-OUT direction (confirmed directly: hovering
                    // IN still animated over the full 300ms under
                    // `prefers-reduced-motion: reduce` without these
                    // compound `group-hover:motion-reduce:`/
                    // `group-focus-visible:motion-reduce:` variants too,
                    // since `group-hover:duration-300` on its own has
                    // nothing to do with motion preference).
                    "motion-reduce:duration-0 motion-reduce:transition-none",
                    "group-hover:motion-reduce:duration-0 group-hover:motion-reduce:transition-none",
                    "group-focus-visible:motion-reduce:duration-0 group-focus-visible:motion-reduce:transition-none",
                    "[@media(hover:none)]:opacity-100 [@media(hover:none)]:transition-none",
                  ].join(" ")}
                  style={{ ["--arrow-start" as string]: ARROW_SCALE_START }}
                />
              </h3>
            </div>
            <p
              className="min-w-0 flex-1 font-normal"
              style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px" }}
            >
              {service.description}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
