import { SectionBadge } from "@/components/SectionBadge";

/**
 * Shared hero for nav sections that don't have real designs yet (Resources,
 * Contact Us, Careers, Support — the Figma file only covers Home/About
 * Us/Fleet Management System). Not Figma-sourced: a plain dark section
 * (`--fig-color-neutral-900`, matching Hero.tsx/FleetHero.tsx's own
 * background) so the nav reads correctly against it, with an `id` for
 * SiteHeader's own `triggerId` overlay->solid switch (see site-header.tsx) —
 * without one, the header would stay in its white-on-transparent overlay
 * state for the entire page, invisible once real content was added. Swap
 * this out page-by-page as each section's real design lands.
 */
export function PlaceholderHero({ id, title }: { id: string; title: string }) {
  return (
    <section
      id={id}
      className="flex w-full flex-col items-center justify-center text-center"
      style={{
        minHeight: "70vh",
        backgroundColor: "var(--fig-color-neutral-900)",
        fontFamily: "var(--font-hanken-grotesk)",
        gap: "var(--fig-spacing-16)",
        padding: "var(--fig-spacing-16)",
      }}
    >
      <SectionBadge label="Coming soon" />
      <h1
        className="font-semibold"
        style={{ color: "var(--fig-color-neutral-0)", fontSize: "48px", lineHeight: "56px" }}
      >
        {title}
      </h1>
      <p style={{ color: "var(--fig-color-neutral-0)", opacity: 0.7, fontSize: "16px", lineHeight: "24px" }}>
        This page is on its way. In the meantime, reach out via the button below.
      </p>
    </section>
  );
}
