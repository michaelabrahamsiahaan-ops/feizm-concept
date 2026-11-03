/**
 * "Home / 06 Industries" content (section frame 216:343285, read live via
 * `figma-cli` — the duplicate under the "Home (Don't read this)" page was
 * ignored). Figma names the card components "...Enviromental Services..."
 * (misspelled) — corrected to "Environmental" everywhere here.
 *
 * Only Environmental Services has real company data from Figma (its 3rd
 * card's Figma layer is literally named "Clearwater Environmental" — a
 * copy-paste leftover confirmed directly — but renders "Terrabin
 * Recycling"; its copy below is read from the card's "Hovered" variant,
 * not "Default": the Default variant's own metric/description text nodes
 * still hold Greenline's placeholder copy for 2 of the 3 companies, a
 * stale-but-harmless Figma authoring leftover since those exact nodes are
 * `visible: false` whenever a card is collapsed).
 *
 * The other 4 industries have no Figma content yet — placeholder copy
 * given verbatim by the user, `isPlaceholder: true`, pointing at the
 * shared neutral-gray placeholder image until real copy/photos exist.
 *
 * Environmental Services photos: the user's own 3 source JPGs from
 * ~/Downloads/FeizM/background-card/ (~3-4.8MB each), mapped by CONTENT
 * (filenames didn't match company names) — garbage truck -> Greenline,
 * blue water jugs on a street -> Clearwater, bottle caps -> Terrabin —
 * converted to WebP (max 2000px long side, quality tuned per image down
 * to hit <=250KB: 4104KB->246KB at q65 for Greenline, 3076KB->153KB at
 * q80 for Clearwater, 4755KB->239KB at q50/1600px for Terrabin, whose
 * high-frequency bottle-cap texture needed the extra size step down to
 * clear the target at all). `imagePosition` is a CSS `object-position`
 * per card STATE, not just per company: Expanded (716x504, landscape)
 * and Collapsed (298x504, tall-narrow) crop very differently off the
 * same photo, and Figma's own crop here is a plain centered "cover" (the
 * fill's own `imageTransform` is the identity matrix in both variants,
 * confirmed via `figma-cli eval`) — but a plain center crop on the
 * COLLAPSED (narrow) ratio isn't guaranteed to keep each photo's actual
 * subject in frame, so these were tuned by eye per company instead of
 * defaulting to "center" everywhere.
 */

export type IndustryCompany = {
  name: string;
  metric: string;
  description: string;
  image: string;
  /** CSS `object-position`, per card state. Defaults to "center" for both when omitted (placeholders, and any state not worth a custom crop). */
  imagePosition?: { expanded: string; collapsed: string };
  href: string;
  isPlaceholder?: boolean;
};

export type Industry = {
  industry: string;
  companies: IndustryCompany[];
};

const PLACEHOLDER_IMAGE = "/industries/placeholder.svg";

export const INDUSTRIES: Industry[] = [
  {
    industry: "Environmental Services",
    companies: [
      {
        name: "Greenline Waste Co",
        metric: "32% less fuel per route",
        description: "Optimized collection routes for 140 garbage trucks with live GPS tracking",
        image: "/industries/environmental/greenline-waste-co.webp",
        imagePosition: { expanded: "center", collapsed: "35% center" },
        href: "#",
      },
      {
        name: "Clearwater Environmental",
        metric: "18 min faster response",
        description: "Spill-response crews dispatched from the nearest available vehicle.",
        image: "/industries/environmental/clearwater-environmental.webp",
        imagePosition: { expanded: "center 65%", collapsed: "center 70%" },
        href: "#",
      },
      {
        name: "Terrabin Recycling",
        metric: "100% pickup proof",
        description: "Every bin collection logged with time and location for client reports.",
        image: "/industries/environmental/terrabin-recycling.webp",
        imagePosition: { expanded: "center", collapsed: "center" },
        href: "#",
      },
    ],
  },
  {
    industry: "Transportation",
    companies: [
      {
        name: "Meridian Coachlines",
        metric: "27% fewer harsh-braking events",
        description: "In-cab driver coaching across 85 intercity buses.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
      {
        name: "Harborline Shuttle",
        metric: "99.2% on-time departures",
        description: "Live arrival estimates shared with dispatch and passengers.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
      {
        name: "Kestrel Taxi Group",
        metric: "S$420K saved on fuel yearly",
        description: "Idling and speeding reports turned into weekly driver scorecards.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
    ],
  },
  {
    industry: "Logistics",
    companies: [
      {
        name: "Northbay Freight",
        metric: "41% fewer empty miles",
        description: "Load matching powered by real-time vehicle location.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
      {
        name: "Parcelo Express",
        metric: "+22% deliveries per driver",
        description: "Digital proof of delivery replaced paper runs and phone check-ins.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
      {
        name: "Coldlink Logistics",
        metric: "0 spoiled shipments",
        description: "Temperature sensors on 60 reefer trucks alert before cargo is at risk.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
    ],
  },
  {
    industry: "Oil & Gas",
    companies: [
      {
        name: "Strata Energy Services",
        metric: "45% fewer speeding incidents",
        description: "Remote-site convoys monitored with geofenced speed limits.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
      {
        name: "Pelagic Offshore Supply",
        metric: "3,200 assets tracked",
        description: "Generators, tanks and tools located across 4 supply bases.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
      {
        name: "Basinpoint Drilling",
        metric: "24/7 lone-worker coverage",
        description: "Panic alerts and check-ins for crews working in remote fields.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
    ],
  },
  {
    industry: "Construction",
    companies: [
      {
        name: "Ironridge Builders",
        metric: "38% less equipment idle time",
        description: "Machine utilization reports helped reassign excavators across 9 sites.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
      {
        name: "Granite & Co. Contractors",
        metric: "15% lower maintenance cost",
        description: "Engine-hour based servicing for 200+ heavy machines.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
      {
        name: "Keystone Civil Works",
        metric: "12 stolen units recovered",
        description: "After-hours movement alerts on every trailer and generator.",
        image: PLACEHOLDER_IMAGE,
        href: "#",
        isPlaceholder: true,
      },
    ],
  },
];
