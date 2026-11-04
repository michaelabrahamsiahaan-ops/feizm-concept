import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { SiteHeader } from "@/components/layout/site-header";
import { CompanyProfile } from "@/components/CompanyProfile";
import { WhyFeizm } from "@/components/WhyFeizm";
import { AchievementSection } from "@/components/AchievementSection";
import { StoryTimeline } from "@/components/sections/story-timeline";
import { Principles } from "@/components/Principles";
import { PeopleSection1 } from "@/components/PeopleSection1";
import { PeopleSection2 } from "@/components/PeopleSection2";
import { HomeCTASection } from "@/components/home/cta-section";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Global technology, local people. Learn how FeizM has helped fleets across five Southeast Asian countries since 2015.",
};

/**
 * CTA and Footer were swapped from the page-local `components/CTASection`
 * / `components/Footer` to the shared `HomeCTASection` / `SiteFooter`
 * built for the Home page, on the user's own explicit request (confirmed,
 * not assumed) to unify both sections site-wide with the newest build.
 *
 * This is a real content change, not just a style refresh: the old
 * `CTASection` read "See FeizMFLEET in Action" with a static wave
 * pattern + brochure image (Figma node 34:508); `HomeCTASection` reads
 * "Ready to see your fleet clearly?" with a live animated fleet-tracking
 * map and adds the scroll-driven "expand to fullscreen" reveal (see that
 * component's own doc comment) — confirmed with the user before
 * replacing rather than assumed to be an equivalent swap. The OLD
 * `Footer`, by contrast, was confirmed to be the exact same Figma
 * component as `SiteFooter` at an earlier revision (same columns, same
 * link text) before it picked up its black background, social icons, and
 * shortened copyright — a genuine style/content update to the SAME
 * section, not a different design.
 *
 * `HomeCTASection` needs no `overflow-x-hidden` wrapper (same reason as
 * on the Home page: it's fluid/full-bleed with a `position: sticky`
 * descendant) — this page's other sections render bare too (no
 * fixed-1440-on-mobile wrapper convention exists here at all, unlike
 * `app/home/page.tsx`), so this isn't a departure from how this page
 * already handles section width.
 *
 * `components/CTASection.tsx` and `components/Footer.tsx` are now
 * unused (confirmed via a repo-wide grep) but left in place, not
 * deleted — not asked to clean those up.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start bg-zinc-100">
      {/* SiteHeader is fixed to the viewport (not just overlaid on Hero) so
          it stays pinned while scrolling past Hero into the rest of the
          page — `fixed` takes it out of normal flow entirely, so this
          doesn't shift any later section. It switches its own overlay/solid
          variant internally based on the #company-profile section (see
          components/layout/site-header.tsx). */}
      <SiteHeader />
      <Hero />
      <CompanyProfile />
      <WhyFeizm />
      <AchievementSection />
      <StoryTimeline />
      <Principles />
      <PeopleSection1 />
      <PeopleSection2 />
      <HomeCTASection />
      <SiteFooter />
    </main>
  );
}
