import { HomeHeroParallax } from "@/components/home/hero-parallax/HomeHeroParallax";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * "Homepage" — only "Home / 01 Hero" exists in Figma so far (confirmed via
 * `figma-cli find "Home /"`), so this page is just the pinned parallax
 * hero until more `Home / NN ...` frames exist to build from.
 *
 * SiteHeader stays in its overlay (transparent) state for the entire
 * 1100vh pinned hero and only switches to solid once the pin releases —
 * `triggerId="home-hero-end"` points at a 1px sentinel rendered
 * immediately after the hero (not inside it), so SiteHeader's existing
 * "section's top edge reaches the header's bottom edge" trigger (see
 * site-header.tsx) fires exactly when the pin lets go, with no changes to
 * that shared component needed. Once a real next section exists here,
 * this sentinel can be deleted and triggerId pointed at that section's
 * own id instead.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start">
      <SiteHeader triggerId="home-hero-end" />
      <HomeHeroParallax />
      <div id="home-hero-end" aria-hidden="true" />
    </main>
  );
}
