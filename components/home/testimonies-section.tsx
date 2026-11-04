"use client";

import { useLayoutEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SectionBadge } from "@/components/SectionBadge";
import { TESTIMONIALS, type Testimonial } from "@/lib/testimonials-data";

/**
 * "Testimonies" section of the Feizm Homepage ("Home / 07 Testimonies",
 * node 291:1395). Plain static section, back to the fixed-1440px
 * convention every other Home section uses (ServicesSection,
 * IndustriesSection, ClientIndustriesSection, ...) — no scroll-linked
 * animation, no pin.
 *
 * This briefly had a scroll-driven "expand to full screen" reveal built
 * on top of it (small box -> fills the viewport). Removed on the user's
 * own request: not because it was broken, but because that effect
 * actually belongs on a LATER Home section whose Figma design is still
 * in progress — Testimonies reverts to its original plain layout in the
 * meantime. The full implementation (sticky pin, clip-path reveal, eased
 * scroll progress via a CSS custom property, header-overlay integration,
 * breakpoint-aware start inset, reduced-motion fallback) is preserved
 * verbatim, not deleted, in
 * [scroll-expand-reveal-wip.tsx](components/home/scroll-expand-reveal-wip.tsx)
 * — wire it up to whichever section needs it once that design is ready,
 * rather than rebuilding it from scratch.
 *
 * ---- Responsive ----
 * Below 1024px the 420px-fixed heading/badge column + flexible quote
 * column overflows, so `stacked` switches `TestimonyContent` to a plain
 * vertical flow instead — same 1024px breakpoint IndustriesSection
 * already uses for the same decision.
 */
function TestimonyContent({
  testimonial,
  stacked,
  onNavigate,
}: {
  testimonial: Testimonial;
  stacked: boolean;
  onNavigate: (direction: 1 | -1) => void;
}) {
  const arrows = (
    <div className="flex items-center" style={{ gap: "8px" }}>
      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => onNavigate(-1)}
        className="flex cursor-pointer items-center justify-center"
        style={{
          width: 40,
          height: 32,
          borderRadius: "var(--fig-radius-md)",
          backgroundColor: "var(--fig-color-neutral-0)",
          border: "1px solid var(--fig-color-accent-coral-light)",
        }}
      >
        <ArrowLeft size={16} strokeWidth={1.6} color="#1e1e1e" />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => onNavigate(1)}
        className="flex cursor-pointer items-center justify-center"
        style={{
          width: 40,
          height: 32,
          borderRadius: "var(--fig-radius-md)",
          backgroundColor: "var(--fig-color-neutral-0)",
          border: "1px solid var(--fig-color-accent-coral-light)",
        }}
      >
        <ArrowRight size={16} strokeWidth={1.6} color="#1e1e1e" />
      </button>
    </div>
  );

  const attribution = (
    <div className="flex flex-col" style={{ gap: "8px" }}>
      <p className="font-normal" style={{ color: "var(--fig-color-neutral-0)", fontSize: "20px", lineHeight: "30px" }}>
        {testimonial.name} - {testimonial.title}
      </p>
      <p className="font-bold" style={{ color: "var(--fig-color-neutral-0)", fontSize: "20px", lineHeight: "30px" }}>
        {testimonial.company}
      </p>
    </div>
  );

  const quote = (
    <p className="font-normal" style={{ color: "var(--fig-color-neutral-0)", fontSize: "48px", lineHeight: "72px" }}>
      {testimonial.quote}
    </p>
  );

  const heading = (
    <h2 className="font-normal" style={{ color: "var(--fig-color-neutral-0)", fontSize: "40px", lineHeight: "44.9px" }}>
      Trusted by fleets across country
    </h2>
  );

  const badge = <SectionBadge label="Testimonial" />;

  // Below 1024px: the 420px-fixed heading column + flexible quote column
  // overflows (see this component's own doc comment) — plain vertical
  // flow instead, same 1024px breakpoint IndustriesSection already uses.
  if (stacked) {
    return (
      <div className="relative flex w-full flex-col" style={{ gap: "24px" }}>
        {heading}
        {badge}
        {quote}
        {attribution}
        {arrows}
      </div>
    );
  }

  return (
    <div className="relative flex w-full items-start" style={{ gap: "64px" }}>
      <div className="flex shrink-0 flex-col" style={{ width: 420, gap: "32px" }}>
        {heading}
        {badge}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between" style={{ height: 504 }}>
        {quote}
        <div className="flex flex-col" style={{ gap: "24px" }}>
          {attribution}
          {arrows}
        </div>
      </div>
    </div>
  );
}

export function TestimoniesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const testimonial = TESTIMONIALS[activeIndex];

  // SSR-safe default (desktop), corrected post-mount before first paint —
  // same tradeoff as every other such check in this project (e.g.
  // PartnershipSection's own `isDesktop`).
  const [stacked, setStacked] = useState(false);

  function go(direction: 1 | -1) {
    setActiveIndex((prev) => (prev + direction + TESTIMONIALS.length) % TESTIMONIALS.length);
  }

  useLayoutEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as every other such check in this project
    setStacked(!desktopMq.matches);
    const onChange = () => setStacked(!desktopMq.matches);
    desktopMq.addEventListener("change", onChange);
    return () => desktopMq.removeEventListener("change", onChange);
  }, []);

  return (
    <section
      className="relative flex w-[1440px] flex-col overflow-hidden"
      style={{
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: "var(--fig-spacing-40)",
        paddingRight: "var(--fig-spacing-40)",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <Image src="/testimonials/background.webp" alt="" fill sizes="1440px" style={{ objectFit: "cover" }} />
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
      <TestimonyContent testimonial={testimonial} stacked={stacked} onNavigate={go} />
    </section>
  );
}
