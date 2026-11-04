import {
  Navigation2,
  User,
  Database,
  Settings,
  Minimize2,
  LayoutDashboard,
  ListChecks,
  FileJson,
  type LucideIcon,
} from "lucide-react";

const ICON_COLOR = "#DC5225";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Navigation2,
    title: "Fast GPS acquisition time",
    description:
      "Achieving a rapid GPS acquisition time is crucial for enhancing navigation experiences",
  },
  {
    icon: User,
    title: "Real-time fleet tracking",
    description: "Real-time fleet tracking with patented method curve-based algorithm",
  },
  {
    icon: Database,
    title: "Rich Data",
    description: "Experience second-by-second data with an impressive accuracy of up to 3 meters",
  },
  {
    icon: Settings,
    title: "Precise Engine",
    description:
      "Experience precision with our ultra-accurate engine diagnostics, designed to you with insights",
  },
  {
    icon: Minimize2,
    title: "Self-calibrating",
    description:
      "A self-calibrating accelerometer is a sensor that adjusts its measurements for accuracy",
  },
  {
    icon: LayoutDashboard,
    title: "Customisable Dashboard",
    description:
      "A customizable dashboard that lets users tailor their experience to their needs",
  },
  {
    icon: ListChecks,
    title: "30 built-in reports",
    description:
      "Our software includes 30 standard reports for valuable insights and analytics",
  },
  {
    icon: FileJson,
    title: "Integrate Data",
    description:
      "Explore the seamless integration of open data through our powerful API and versatile SDK",
  },
];

// Radius lives only on the grid's 4 OUTER corners in Figma (each corner
// card owns one corner of the shared table, not each card having its own
// rounded corners) — confirmed per-card via topLeftRadius/etc. on all 8
// cells rather than assumed from the screenshot. Index-based here since
// the grid is a fixed 2x4.
const CORNER_RADIUS: Record<number, string> = {
  0: "var(--fig-radius-md) 0 0 0",
  3: "0 var(--fig-radius-md) 0 0",
  4: "0 0 0 var(--fig-radius-md)",
  7: "0 0 var(--fig-radius-md) var(--fig-radius-md)",
};

function FeatureCard({
  icon: Icon,
  title,
  description,
  radius,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  radius?: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 340,
        height: 224.5,
        backgroundColor: "var(--fig-color-neutral-0)",
        border: "1px solid var(--fig-color-neutral-200)",
        borderRadius: radius,
        padding: "var(--fig-spacing-22)",
        gap: "var(--fig-spacing-22)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--fig-spacing-11)" }}>
        <Icon size={24} strokeWidth={2} color={ICON_COLOR} />
        <span
          className="font-normal"
          style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "24px" }}
        >
          {title}
        </span>
      </div>
      <p
        className="font-normal"
        style={{ color: "var(--fig-color-neutral-900)", fontSize: "18.71px", lineHeight: "26.19px" }}
      >
        {description}
      </p>
    </div>
  );
}

/**
 * "Top Features" section of the Feizm "Fleet Management System" page.
 *
 * Built from a live `figma-cli` read of node 79:69590 ("Fleet Management
 * System / 04 Top Features", "FeizM" file) and DESIGN.md's tokens
 * (app/tokens.css `--fig-*` custom properties):
 *   - heading (44.9px) and card title (20px) are literal component-scaled
 *     sizes; card description (18.71px) matches the same literal size used
 *     for body copy elsewhere on this page (FleetUSP/FleetWhy)
 *   - card fill (neutral-0), border (neutral-200) and text (neutral-900)
 *     are exact token matches, confirmed by converting each fill's RGB to
 *     hex rather than assumed from visual similarity
 *   - card padding/gap (22.45px) and icon-to-title gap (11px) map to real
 *     spacing tokens (spacing-22, spacing-11); the root section's 80px
 *     top/bottom padding does NOT match any spacing token (closest are
 *     spacing-64 and spacing-128) and is kept as a literal, same reasoning
 *     as every other off-scale value this session
 *   - icon color (#DC5225) is a literal, confirmed on the actual Vector
 *     stroke fill rather than assumed to match brand-500 (#F25A29, close
 *     but not identical) — unbound in Figma (no boundVariables on the fill)
 *   - radius-md (8px) sits ONLY on the grid's 4 outer corners, one per
 *     corner card (verified per-cell via topLeftRadius/etc. on all 8
 *     cells, not assumed from the screenshot) — every other card corner
 *     is square, so adjacent cards' borders simply meet edge-to-edge,
 *     same as Figma's own individually-bordered-cell construction
 *
 * Icons are lucide-react equivalents of Figma's own icon-library instances
 * (confirmed via each instance's `getMainComponentAsync()` name —
 * navigation-2/user/database/settings/minimize/layout-dashboard/list-check/
 * file-json), not traced node-for-node, same convention as the checkmark
 * icon in FleetWhy.
 *
 * Banner: a 1360x567 rounded-lg (radius-lg, 12px) panel in brand-50
 * (#FEEFEA, exact token match) containing the MyGeotab dashboard
 * screenshot. Two things worth noting:
 *   - the screenshot ("image 2", node 79:69639) is a REAL exported
 *     composite image (desktop + tablet + mobile mockups layered into one
 *     1089x588 asset), unlike FleetWhy's broken placeholder — confirmed by
 *     reading its actual exported pixel size, not just the fill's `type:
 *     "IMAGE"`. It's placed at Figma's own offset (135, 65) and clipped by
 *     the banner's `clipsContent: true` to 502px of visible height (567 -
 *     65 = 502, confirmed by the clipped export itself coming back 502px
 *     tall instead of the node's reported 588) — same "verify screenshots
 *     respect ancestor clipping" lesson learned from the CTA brochure.
 *   - the pink panel has a VERY subtle halftone dot texture behind the
 *     screenshot (Figma "Group 4": 15,160 individual 6px ellipses, color
 *     #FFE6DE on the #FEEFEA panel). Reproducing 15k literal nodes isn't
 *     practical, so it's rebuilt as a CSS dot-grid instead of a giant
 *     raster export: pixel-sampled the exported texture (same empirical
 *     technique used for this session's gradients) to find an 8px dot
 *     pitch with alternating rows offset by 4px (a "brick" stagger, not a
 *     plain square grid) and a 6px dot diameter — reproduced as two
 *     radial-gradient background layers on an 8x16 repeat tile.
 *
 * Fixed-width (1440px design) to match the Figma frame for a pixel
 * comparison, same convention as every other section on this page.
 */
export function FleetTopFeatures() {
  return (
    <section
      className="flex w-[1440px] flex-col"
      style={{
        backgroundColor: "var(--fig-color-neutral-0)",
        paddingTop: "80px",
        paddingBottom: "80px",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        gap: "var(--fig-spacing-32)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <div className="flex flex-col" style={{ gap: "var(--fig-spacing-32)" }}>
        <h2
          className="font-normal"
          style={{ color: "var(--fig-color-neutral-900)", fontSize: "44.9px", lineHeight: "50.9px" }}
        >
          Top Features of Geotab Telematics
        </h2>

        <div className="flex flex-col" style={{ width: 1360 }}>
          <div className="flex">
            {FEATURES.slice(0, 4).map((f, i) => (
              <FeatureCard key={f.title} {...f} radius={CORNER_RADIUS[i]} />
            ))}
          </div>
          <div className="flex">
            {FEATURES.slice(4, 8).map((f, i) => (
              <FeatureCard key={f.title} {...f} radius={CORNER_RADIUS[i + 4]} />
            ))}
          </div>
        </div>
      </div>

      <div
        className="relative overflow-hidden"
        style={{
          width: 1360,
          height: 567,
          borderRadius: "var(--fig-radius-lg)",
          backgroundColor: "var(--fig-color-brand-50)",
          backgroundImage:
            "radial-gradient(circle, #FFE6DE 0px, transparent 3px), radial-gradient(circle, #FFE6DE 0px, transparent 3px)",
          backgroundSize: "8px 16px, 8px 16px",
          backgroundPosition: "0 0, 4px 8px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fleet-top-features/dashboard-screenshot.png"
          alt="MyGeotab dashboard shown across desktop, tablet and phone"
          style={{ position: "absolute", left: 135, top: 65, width: 1089, height: "auto" }}
        />
      </div>
    </section>
  );
}
