import { Hero } from "@/components/Hero";
import { SiteHeader } from "@/components/layout/site-header";
import { CompanyProfile } from "@/components/CompanyProfile";
import { WhyFeizm } from "@/components/WhyFeizm";
import { AchievementSection } from "@/components/AchievementSection";
import { StoryTimeline } from "@/components/sections/story-timeline";
import { Principles } from "@/components/Principles";
import { PeopleSection1 } from "@/components/PeopleSection1";
import { PeopleSection2 } from "@/components/PeopleSection2";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

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
      <CTASection />
      <Footer />
    </main>
  );
}
