import { HomeHeroParallax } from "@/components/home/hero-parallax/HomeHeroParallax";
import { HomeCompany } from "@/components/HomeCompany";
import { SiteHeader } from "@/components/layout/site-header";
import { SmoothScroll } from "@/components/shared/smooth-scroll";

/**
 * "Homepage" — Hero and Company exist in Figma so far (confirmed via
 * `figma-cli find "Home /"`), so this page has just these two sections
 * until more `Home / NN ...` frames exist to build from.
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
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start">
      <SmoothScroll />
      <SiteHeader triggerId="home-company" />
      <HomeHeroParallax />
      <HomeCompany />
    </main>
  );
}
