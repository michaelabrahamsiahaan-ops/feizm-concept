import type { Metadata } from "next";
import { FleetHero } from "@/components/FleetHero";
import { FleetWhy } from "@/components/FleetWhy";
import { FleetUSP } from "@/components/FleetUSP";
import { FleetTopFeatures } from "@/components/FleetTopFeatures";
import { HomeCTASection } from "@/components/home/cta-section";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Fleet Management System",
  description:
    "Locate every vehicle, monitor driver behaviour and cut fleet costs with FeizMFLEET, powered by Geotab.",
};

/**
 * "Fleet Management System" page. Hero, Why, USP and Top Features are
 * page-specific frames (see CLAUDE.md §1, now stale on this point —
 * written when only Hero existed). CTA and Footer are not: this page's
 * own Figma "REFERENCE (do not build)" mockup (node 34:1724) originally
 * showed its "CTA Section" (56:337) and footer "Section" (44:271) with
 * the exact same heading/subtext/column copy as the About page's own CTA
 * (34:508) and Footer (34:528) — confirmed back then by reading each
 * node's own text characters. Same as SiteHeader, these are shared
 * site-wide sections, not Fleet-specific ones.
 *
 * Now swapped to `HomeCTASection` / `SiteFooter` (the Home page's own
 * builds) on the user's own explicit request, to unify CTA and Footer
 * site-wide with the newest build — see `app/about-us/page.tsx`'s own
 * doc comment for the full rationale (same swap, same reasoning, applied
 * there first). `HomeCTASection` needs no `overflow-x-hidden` wrapper
 * (fluid/full-bleed, `position: sticky` descendant) — this page has no
 * such wrapper convention for any of its other sections either.
 *
 * SiteHeader is the same shared header component used on the About page
 * (Figma's "Top component" set, confirmed in CLAUDE.md §2 to be a single
 * component with Default/Scrolling variants, not a per-page one-off) —
 * reused directly rather than rebuilt. Its overlay->solid scroll trigger
 * watches for one `id`, configurable via the `triggerId` prop (defaults to
 * `"company-profile"`, the About page's own section). This page has no
 * company-profile section, so it passes `triggerId="why-feizmfleet"`
 * instead — the header switches to solid as soon as "Fleet Management
 * System / 02 Why" (`id="why-feizmfleet"` on FleetWhy's own `<section>`)
 * reaches the header's bottom edge, same trigger mechanics as the About
 * page. That id is also the Fleet Hero's "About Fleet Management System"
 * button's scroll target (components/shared/scroll-link.tsx) — one
 * element serving both roles by design, see site-header.tsx's own
 * "Boundary case" comment for why that's exactly the condition a landing
 * needs to read as solid, not overlay.
 */
export default function FleetManagementSystemPage() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start">
      <SiteHeader triggerId="why-feizmfleet" />
      <FleetHero />
      <FleetWhy />
      <FleetUSP />
      <FleetTopFeatures />
      <HomeCTASection />
      <SiteFooter />
    </main>
  );
}
