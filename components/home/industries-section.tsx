"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SectionBadge } from "@/components/SectionBadge";
import { CARD_HEIGHT, IndustryCard } from "@/components/home/industry-card";
import { INDUSTRIES } from "@/lib/industries-data";

// See the brief's own note: "Alternative to compare later: reset to the
// first card on mouse leave." Flip this to try that behavior instead —
// every mouseleave-reset decision below reads this single constant.
const RESET_ON_LEAVE = false;

const TAB_SWITCH_MS = 250;

/**
 * "Industries" section of the Feizm Homepage ("Home / 06 Industries",
 * node 216:343285 — read live via `figma-cli`; the duplicate under the
 * "Home (Don't read this)" page was ignored). Follows PartnershipSection
 * directly (white -> white hand-off, no seam: Partnership's own
 * background fade already ends at #FFFFFF by its bottom edge, and this
 * section's Figma background is #FFFFFF too — confirmed, nothing extra
 * needed here).
 *
 * Fixed 1440px width at >=1024px, same convention as ServicesSection (no
 * Figma data exists for how this section should reflow below 1024px — the
 * brief's own Step 2 explicitly asked to propose and confirm that layout
 * rather than build it blind; the user picked "stacked, all expanded" —
 * see "Below 1024px" further down).
 *
 * ---- Hover-accordion model ----
 * `expandedIndex` is which of the CURRENT industry's 3 cards is expanded
 * (default 0). Exactly one card is ever expanded. Flicker-free gap
 * crossing comes from never clearing `expandedIndex` on a per-card
 * mouseleave — only `onMouseEnter` (on the card) ever sets a NEW index,
 * so moving from card A to card B is a single A->B state update with no
 * intermediate "nothing expanded" frame. The ROW's own `onMouseLeave`
 * (not each card's) is the only place `RESET_ON_LEAVE` is consulted.
 *
 * Keyboard mirrors hover exactly (`onFocus` -> `onEnter`), so Tab reaches
 * the same states a mouse would; Left/Right arrow moves focus between
 * cards (`IndustryCard`'s `onNavigate`), which re-triggers `onFocus` on
 * the newly-focused card and expands it as a side effect — one code path
 * for both activation sources, same pattern as ServicesSection's
 * `activeIndex`.
 *
 * Touch/no-hover handling lives in `IndustryCard` itself (`canHover`
 * gates both the mouseenter listener here and the tap-to-expand-first
 * logic there).
 *
 * ---- Why the section itself is `position: relative` ----
 * Partnership's own sticky device box uses a "sticky, zero layout
 * footprint" trick (`position: sticky` inside a column sized 100vh with a
 * matching negative bottom margin) that visually overlaps ~100vh PAST
 * Partnership's own document-flow end — harmless while Partnership was
 * the last section, but CSS paints positioned boxes (Partnership's own
 * `<section>` is `position: relative`, needed for that trick) AFTER
 * static ones regardless of DOM order, so without this, that overlap
 * painted on top of Industries' first viewport (confirmed directly: an
 * `elementFromPoint` at Industries' own measured top coordinate returned
 * Partnership's sticky box, not an Industries card). Making this section
 * `position: relative` too puts both in the same "positioned, z-index
 * auto" paint bucket, where DOM order decides — Industries, being later,
 * now correctly paints on top. No change needed on Partnership's side.
 *
 * ---- Tab switch ----
 * `selectTab` fades the row out (opacity, `TAB_SWITCH_MS`), swaps
 * `activeTabIndex` + resets `expandedIndex` to 0 once the fade-out
 * finishes, then fades back in — a sequential fade rather than a true
 * two-layer cross-dissolve (no second DOM copy of the row), which reads
 * the same for a ~250ms transition and avoids rendering 2 industries'
 * cards at once. Applies identically on mobile (the tab row/crossfade
 * stays; only the card row's own layout changes).
 *
 * ---- Below 1024px ----
 * No hover/accordion interaction at all — every card in the active
 * industry renders permanently expanded (`MobileIndustryCard`, in
 * industry-card.tsx), stacked full-width in a single column. The section
 * itself switches from the fixed 1440px desktop width to `w-full` with
 * tighter side padding, and the heading/badge row stacks (badge above
 * heading) rather than sitting side by side — not asked for explicitly,
 * but the same badge-above-heading pattern Partnership's own mobile
 * layout already uses, so narrow heading text has room to wrap under the
 * badge instead of squeezing against it. The tab row scrolls horizontally
 * (`overflow-x-auto`) since 5 chips don't fit a phone-width row.
 */
export function IndustriesSection() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [rowOpacity, setRowOpacity] = useState(1);
  // SSR-safe defaults (desktop, hover-capable, not reduced-motion),
  // corrected post-mount — same tradeoff as every other such check in
  // this project (e.g. Partnership's own `isDesktop`).
  const [isDesktop, setIsDesktop] = useState(true);
  const [canHover, setCanHover] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const switchTimeoutRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    const hoverMq = window.matchMedia("(hover: hover)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as every other such check in this project
    setIsDesktop(desktopMq.matches);
    setCanHover(hoverMq.matches);
    setReducedMotion(motionMq.matches);
    const onDesktopChange = () => setIsDesktop(desktopMq.matches);
    const onHoverChange = () => setCanHover(hoverMq.matches);
    const onMotionChange = () => setReducedMotion(motionMq.matches);
    desktopMq.addEventListener("change", onDesktopChange);
    hoverMq.addEventListener("change", onHoverChange);
    motionMq.addEventListener("change", onMotionChange);
    return () => {
      desktopMq.removeEventListener("change", onDesktopChange);
      hoverMq.removeEventListener("change", onHoverChange);
      motionMq.removeEventListener("change", onMotionChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) window.clearTimeout(switchTimeoutRef.current);
    };
  }, []);

  const industry = INDUSTRIES[activeTabIndex];

  function selectTab(i: number) {
    if (i === activeTabIndex) return;
    if (switchTimeoutRef.current) window.clearTimeout(switchTimeoutRef.current);
    if (reducedMotion) {
      setActiveTabIndex(i);
      setExpandedIndex(0);
      return;
    }
    setRowOpacity(0);
    switchTimeoutRef.current = window.setTimeout(() => {
      setActiveTabIndex(i);
      setExpandedIndex(0);
      setRowOpacity(1);
    }, TAB_SWITCH_MS);
  }

  return (
    <section
      className={isDesktop ? "relative flex w-[1440px] flex-col" : "relative flex w-full flex-col"}
      style={{
        backgroundColor: "#ffffff",
        paddingTop: "var(--fig-spacing-60)",
        paddingBottom: "var(--fig-spacing-60)",
        paddingLeft: isDesktop ? "var(--fig-spacing-40)" : "20px",
        paddingRight: isDesktop ? "var(--fig-spacing-40)" : "20px",
        gap: "36px",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <div className="flex w-full flex-col" style={{ gap: "24px" }}>
        <div className={isDesktop ? "flex w-full items-center justify-between" : "flex w-full flex-col items-start gap-3"}>
          {!isDesktop && <SectionBadge label="Industries" />}
          <h2
            className="font-normal"
            style={{ color: "var(--fig-color-neutral-900)", fontSize: "40px", lineHeight: "44.9px" }}
          >
            Built for the way your industry moves
          </h2>
          {/* Figma's own badge text reads "Indsutries" (typo) — fixed here. */}
          {isDesktop && <SectionBadge label="Industries" />}
        </div>

        <div className="flex items-center" style={{ gap: "12px", overflowX: isDesktop ? "visible" : "auto" }}>
          {INDUSTRIES.map((ind, i) => {
            const active = i === activeTabIndex;
            return (
              <button
                key={ind.industry}
                type="button"
                onClick={() => selectTab(i)}
                className="shrink-0 rounded-[12px] border font-medium outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fig-color-brand-500)]"
                style={{
                  padding: "8px 12px",
                  fontSize: "14px",
                  lineHeight: "20px",
                  backgroundColor: "#ffffff",
                  borderColor: active ? "var(--fig-color-neutral-900)" : "var(--fig-color-neutral-300)",
                  color: active ? "var(--fig-color-neutral-900)" : "#494949",
                }}
              >
                {ind.industry}
              </button>
            );
          })}
        </div>
      </div>

      {isDesktop ? (
        <div
          className="relative flex w-full"
          style={{
            height: CARD_HEIGHT,
            gap: "16px",
            opacity: rowOpacity,
            transition: reducedMotion ? "none" : `opacity ${TAB_SWITCH_MS}ms ease`,
          }}
          onMouseLeave={() => {
            if (RESET_ON_LEAVE) setExpandedIndex(0);
          }}
        >
          {industry.companies.map((company, i) => (
            <IndustryCard
              key={company.name}
              company={company}
              isExpanded={i === expandedIndex}
              canHover={canHover}
              reducedMotion={reducedMotion}
              onEnter={() => setExpandedIndex(i)}
              onFocus={() => setExpandedIndex(i)}
              onNavigate={(direction) => {
                const next = (i + direction + industry.companies.length) % industry.companies.length;
                cardRefs.current[next]?.focus();
              }}
              cardRef={(el) => {
                cardRefs.current[i] = el;
              }}
            />
          ))}
        </div>
      ) : (
        <div
          className="flex w-full flex-col"
          style={{
            gap: "16px",
            opacity: rowOpacity,
            transition: reducedMotion ? "none" : `opacity ${TAB_SWITCH_MS}ms ease`,
          }}
        >
          {industry.companies.map((company) => (
            <IndustryCard
              key={company.name}
              company={company}
              isExpanded
              canHover={canHover}
              reducedMotion={reducedMotion}
              onEnter={() => {}}
              onFocus={() => {}}
              onNavigate={() => {}}
              cardRef={() => {}}
              isMobileLayout
            />
          ))}
        </div>
      )}
    </section>
  );
}
