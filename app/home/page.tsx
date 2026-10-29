import { HomeHeroParallax } from "@/components/home/hero-parallax/HomeHeroParallax";
import { HomeCompany } from "@/components/HomeCompany";
import { StatsSection } from "@/components/home/stats-section";
import { ServicesSection } from "@/components/home/services-section";
import { SiteHeader } from "@/components/layout/site-header";
import { SmoothScroll } from "@/components/shared/smooth-scroll";

/**
 * "Homepage" — Hero, Company, Stats and Services exist in Figma so far
 * (confirmed via `figma-cli find "Home /"`), so this page has just these
 * four sections until more `Home / NN ...` frames exist to build from.
 *
 * SiteHeader stays in its overlay (transparent) state for the entire
 * 1100vh pinned hero and only switches to solid once the pin releases —
 * `triggerId="home-company"` points at the real next section
 * (HomeCompany's own `id`) now that one exists, so SiteHeader's existing
 * "section's top edge reaches the header's bottom edge" trigger (see
 * site-header.tsx) fires exactly when the pin lets go, with no changes to
 * that shared component needed. This replaces the temporary
 * `#home-hero-end` sentinel div used before Company existed.
 *
 * <SmoothScroll /> is mounted here, not in the root layout — Home is the
 * only page asking for inertia scrolling right now (see that component's
 * own doc comment for why this is "on" simply by being rendered, with no
 * separate toggle prop needed).
 *
 * StatsSection is pinned (see its own doc comment) and provides almost
 * all its own scroll room via its wrapper's CSS height — much less
 * dependent on content after it than a no-pin scroll-linked effect would
 * be, but not fully independent: a sticky element still needs its OWN
 * height worth of normal document flow to release into once its hold
 * ends, and with nothing after it that only resolves if the viewport is
 * at least that tall. At 1440x900 (pin height 820px) this section used to
 * fall exactly 80px (900-820) short of ever reaching P=1 with nothing
 * below it (confirmed by measurement, not guessed) — covered back then by
 * a TEMPORARY 100vh spacer div, now removed in favor of ServicesSection
 * itself providing that room for real, per that spacer's own comment.
 *
 * ServicesSection ("Home / 04 Services") is a plain static section (fixed
 * 1440px width, same convention as Principles.tsx on the About page) — no
 * scroll-linked animation, no pin, nothing that needs coordinating with
 * the sections above it.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start">
      <SmoothScroll />
      <SiteHeader triggerId="home-company" />
      <HomeHeroParallax />
      <HomeCompany />
      <StatsSection />
      <ServicesSection />
    </main>
  );
}
