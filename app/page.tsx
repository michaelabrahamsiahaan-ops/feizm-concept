import type { Metadata } from "next";
import { HomeHeroParallax } from "@/components/home/hero-parallax/HomeHeroParallax";
import { HomeCompany } from "@/components/HomeCompany";
import { StatsSection } from "@/components/home/stats-section";
import { ServicesSection } from "@/components/home/services-section";
import { PartnershipSection } from "@/components/home/partnership-section";
import { IndustriesSection } from "@/components/home/industries-section";
import { ClientIndustriesSection } from "@/components/home/client-industries-section";
import { TestimoniesSection } from "@/components/home/testimonies-section";
import { HomeCTASection } from "@/components/home/cta-section";
import { BannerTop } from "@/components/layout/banner-top";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SmoothScroll } from "@/components/shared/smooth-scroll";

// `absolute` bypasses the root layout's `title.template` ("%s | FeizM")
// instead of appending to it — this page's title is meant to stand alone
// in the tab, not read "Fleet Management & Telematics in Southeast Asia
// | FeizM" the way About/Fleet Management System's titles do.
export const metadata: Metadata = {
  title: { absolute: "Fleet Management & Telematics in Southeast Asia" },
  description:
    "Real-time GPS tracking, driver safety and fleet insights, set up and supported by a local team in your time zone.",
};

/**
 * "Homepage" — Hero, Company, Stats, Services and Partnership exist in
 * Figma so far (confirmed via `figma-cli find "Home /"`), so this page
 * has just these five sections until more `Home / NN ...` frames exist to
 * build from.
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
 *
 * PartnershipSection ("Home / 05 Partnership") is NOT pinned at the
 * section level (an earlier build pinned the whole section and crossfaded
 * two copy blocks at one spot — replaced, see git history and that
 * component's own doc comment) — only its device illustration is
 * `position: sticky`, joinsystems.co-style, while its copy scrolls past
 * normally on the left. Its own scroll-breakpoint clamp (see that
 * component's doc comment) was written for it being the last section and
 * is UNCHANGED now that IndustriesSection follows it — the clamp only
 * caps how far the device's progress can run past Partnership's own
 * bottom edge, which still holds with real content below it.
 *
 * IndustriesSection ("Home / 06 Industries") is a plain static section —
 * no scroll-linked animation, no pin — with its own hover-accordion
 * interaction self-contained inside the component. White-to-white
 * hand-off from Partnership's own background fade, no seam (see
 * IndustriesSection's own doc comment).
 *
 * ClientIndustriesSection ("Home / 06.1 Client Industries") is a plain
 * static section — a 4-logo "trusted by" strip, no scroll-linked
 * animation, no pin — fixed 1440px, same convention as every other
 * static section. Sits between Industries and Testimonies per its own
 * "06.1" name; white background on both sides of it, no seam either way.
 *
 * Its wrapper gets `relative z-10` (unlike the plain `overflow-x-hidden`
 * wrapper every other fixed-1440 section uses) to fix a real stacking
 * bug, not a style preference: PartnershipSection's own zero-height
 * sticky background layer (`position: sticky; height: 100vh;
 * margin-bottom: -100vh` — see that component's own doc comment) still
 * paints ON TOP of normal-flow content for roughly 100vh of scroll past
 * Partnership's own end, even though it's earlier in the DOM — confirmed
 * directly via `elementFromPoint` at this section's own top edge, which
 * returned that sticky layer's div, not this section's content, and
 * fixed by giving this wrapper its own stacking context. It was always
 * silently true for whatever used to sit right after Partnership (both
 * white, so invisible) — it only became VISIBLE now because this
 * section draws a `#c5c5c4` border right at that top edge, which the
 * sticky white layer was painting over, erasing exactly the top stroke.
 * IndustriesSection likely has the same underlying defect at its own top
 * edge (same position, same sticky culprit) but nothing there is thin or
 * bordered enough to reveal it — left alone since it has no visible
 * symptom to fix.
 *
 * TestimoniesSection ("Home / 07 Testimonies") is a plain static section
 * again, same fixed-1440px convention as everything else here — it
 * briefly had a scroll-driven "expand to fullscreen" reveal (small box ->
 * fills the viewport), removed on the user's own request because that
 * effect actually belongs on a LATER section whose Figma design is still
 * in progress, not on Testimonies. The full implementation is preserved,
 * not deleted, in
 * [scroll-expand-reveal-wip.tsx](components/home/scroll-expand-reveal-wip.tsx)
 * — see that file's own doc comment. Gets the same `overflow-x-hidden`
 * wrapper as every other fixed-1440 section now that there's no sticky
 * descendant for that wrapper to interfere with.
 *
 * HomeCTASection ("Home / 08 CTA", `components/home/cta-section.tsx` —
 * exported as `HomeCTASection` since `CTASection` is already the About
 * page's own, visually different closing banner) fills the gap that
 * used to skip straight from Testimonies to Footer. It's now the ONE
 * exception to the fixed-1440px convention, same reason Testimonies used
 * to be: the user asked for the scroll-driven "expand to fullscreen"
 * reveal parked for exactly this reuse (see that component's own doc
 * comment, and the project memory note it came from) to be applied here,
 * so it has to be fluid/full-bleed, not fixed-width. Rendered WITHOUT the
 * `overflow-x-hidden` wrapper every fixed-1440 section above gets, for
 * the same two reasons as before: a fluid section never overflows, and
 * `overflow` on an ancestor of a `position: sticky` element can
 * constrain or break its own stickiness.
 *
 * SiteFooter ("Footer Section", `components/layout/site-footer.tsx`) is
 * the last thing, right after CTA.
 */
export default function HomePage() {
  return (
    <main
      className="flex min-h-screen flex-col items-start justify-start"
      style={{ paddingTop: "var(--banner-h)" }}
    >
      <SmoothScroll />
      <BannerTop />
      <SiteHeader triggerId="home-company" />
      <HomeHeroParallax />
      <HomeCompany />
      <StatsSection />
      {/* ServicesSection is a fixed 1440px design (see its own doc
          comment) — on a narrow viewport that overflows horizontally,
          and WITHOUT this wrapper, a mobile browser doesn't just
          horizontally-scroll past it: it zooms the ENTIRE PAGE out to
          fit the widest overflowing element (confirmed directly,
          Chromium at 375x812 reported window.innerWidth/innerHeight as
          1440x3119), breaking every other section's own responsive
          layout along with it. `overflow-x: hidden` fixes that — but it
          has to live on a wrapper scoped to ONLY this section, not on
          html/body: that was tried first and reverted, because it broke
          `position: sticky` for Hero/Company/Stats globally (setting
          overflow-x on html/body makes them a new scroll-container
          ancestor for the ENTIRE page, not just this one section —
          confirmed directly, Hero's own sticky pin stopped sticking
          entirely and scrolled away, producing a genuinely blank page
          while scrolling). Scoped to a wrapper that only contains
          ServicesSection (a later sibling of Hero/Company/Stats, not an
          ancestor), it can't touch their containing-block chain at all. */}
      <div className="w-full overflow-x-hidden">
        <ServicesSection />
      </div>
      <PartnershipSection />
      {/* Same fixed-1440px-overflow fix as ServicesSection above (see that
          wrapper's own comment for why this can't live on html/body):
          confirmed directly, IndustriesSection without this wrapper
          reproduced the exact same whole-page zoom-out at 375x812
          (window.innerWidth reporting 1440 instead of 375). */}
      <div className="w-full overflow-x-hidden">
        <IndustriesSection />
      </div>
      <div className="relative z-10 w-full overflow-x-hidden">
        <ClientIndustriesSection />
      </div>
      <div className="w-full overflow-x-hidden">
        <TestimoniesSection />
      </div>
      <HomeCTASection />
      <div className="w-full overflow-x-hidden">
        <SiteFooter />
      </div>
    </main>
  );
}
