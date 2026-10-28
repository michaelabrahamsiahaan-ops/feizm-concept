import { HomeHeroParallax } from "@/components/home/hero-parallax/HomeHeroParallax";
import { HomeCompany } from "@/components/HomeCompany";
import { SiteHeader } from "@/components/layout/site-header";

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
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start">
      <SiteHeader triggerId="home-company" />
      <HomeHeroParallax />
      <HomeCompany />
    </main>
  );
}
