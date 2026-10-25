"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";

const NAV_LINKS = [
  "About us",
  "Services",
  "Resources",
  "Contact Us",
  "Careers",
  "Support",
];

const HEADER_HEIGHT = 75;
const TRANSITION = "duration-[250ms] ease-in-out motion-reduce:transition-none";

/**
 * Site header — overlay/solid, scroll-triggered.
 *
 * Both visual states read live via `figma-cli` from node 3:90 ("Top
 * Navigation") and node 34:586 ("Scrolling - Top Navigation"), both
 * top-level frames on the same "FeizM" / "Design" page. Reported as a spec
 * table before building (see prior turn); structure and every x/y position
 * are pixel-identical between the two frames — only fills, the logo, and
 * shadow differ, which is why this is ONE component with a `solid` boolean
 * driving color values, not two separate navbars:
 *   - overlay background: linear-gradient(to bottom, rgba(29,29,28,.6) 0%,
 *     rgba(29,29,28,0) 73.7%) — Figma's raw gradientStops say the second
 *     stop sits at 65%, but direct pixel-sampling of the actual exported
 *     frame (alpha channel, sampled every 5px down a column away from any
 *     text) shows the falloff reaching ~0 by ~74%, not 65% — used as
 *     ground truth, consistent with an earlier session's independent pixel
 *     read of this same gradient. Figma's gradientTransform matrix is
 *     genuinely ambiguous to hand-decode (tried, got contradictory
 *     results) — pixel sampling isn't.
 *   - solid background: neutral-0, with a very subtle drop-shadow
 *     (0 8px 15px rgba(172,172,172,.05)) — both bound/measured exactly
 *   - overlay logo: white fill; solid logo: orange, exact match to
 *     brand-500 (#f25a29) — both exported as real SVGs via `figma-cli
 *     export node -f svg` into public/brand/ (logo-white.svg /
 *     logo-orange.svg), not screenshots
 *   - overlay text/icons: neutral-0 (white); solid: #282828 — close to but
 *     not an exact match for neutral-800 (#252524, off by 3 in each
 *     channel); kept as a literal rather than snapped to the token, since
 *     it's what Figma actually has
 *   - "Schedule Demo" button: fill/border/radius/text identical in both
 *     source frames (confirmed byte-for-byte) — rendered with fixed
 *     brand-500/accent-coral-light styling regardless of `solid`, no
 *     variant branching on it at all
 *   - gaps (22px between links, 22px between actions) are spacing-22 in
 *     both frames; link vertical padding is spacing-11
 *   - "Nav Menu" is NOT a normal flex sibling — it's absolutely positioned
 *     at a fixed x:440 in Figma (30.56% of 1440), same quirk the previous
 *     single-variant Navbar.tsx already reproduced and preserved here
 *
 * No hover/active states exist in Figma for the nav links (plain frames,
 * not component instances with variant states) — added a subtle opacity
 * hover here as baseline polish since leaving links with zero interactive
 * feedback isn't a real option, not because Figma specified one.
 *
 * Cross-fade, not hard swap: both the background (gradient vs solid+shadow)
 * and the logo (white vs orange) are rendered as two stacked, absolutely
 * positioned layers with their opacity toggled, rather than swapping a
 * single element's style/src. This is necessary, not just stylistic — CSS
 * cannot interpolate `background` between a gradient and a solid color (no
 * flicker-free way to transition that as a single property), and swapping
 * an <img> src always causes a one-frame flash while the new image
 * decodes. Stacked layers sidestep both. `motion-reduce:transition-none`
 * (Tailwind's `prefers-reduced-motion` variant) collapses the cross-fade
 * to an instant swap, no separate JS media-query branch needed.
 *
 * Scroll trigger: solid activates when the "company-profile" section's
 * top edge reaches the header's own bottom edge (not an arbitrary scrollY
 * pixel value) — an IntersectionObserver on #company-profile with
 * `rootMargin: "-75px 0px 0px 0px"` (shrinks the observed viewport by the
 * header's height from the top) and threshold 0. The state itself is
 * computed from `entry.boundingClientRect.top <= HEADER_HEIGHT` inside the
 * callback rather than trusting `entry.isIntersecting` directly — isIntersecting
 * alone would incorrectly flip back to "overlay" once the (very tall)
 * company-profile section scrolls entirely past the viewport further down
 * the page, since at that point it's no longer intersecting ANYTHING. Using
 * the live boundingClientRect instead stays correct deep into later
 * sections (a large negative top is still <= HEADER_HEIGHT, correctly
 * staying "solid") and reverts cleanly on the way back up.
 *
 * Initial state uses `useLayoutEffect` (not `useEffect`) specifically so a
 * mid-page refresh or anchor-link load computes and applies the correct
 * variant before the browser's first paint — avoiding a flash of the wrong
 * state, which a post-paint effect wouldn't fully prevent.
 */
export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const linkFocusColor = solid ? "#282828" : "var(--fig-color-neutral-0)";

  useLayoutEffect(() => {
    const target = document.getElementById("company-profile");
    if (!target || !target.parentElement) return;

    // Observing company-profile itself doesn't work: it's far taller than
    // the viewport, so its intersection ratio only crosses 0 (the only
    // threshold IntersectionObserver fires on by default) when it fully
    // enters or exits the shrunk root — not at the one specific line this
    // needs, which sits deep inside the section for most of the scroll
    // range. A thin 1px sentinel placed at the section's own top edge
    // (a sibling, not a child, so it isn't affected by the section's own
    // padding) crosses that line cleanly once per direction instead.
    // Created here in JS rather than in CompanyProfile.tsx's own markup —
    // the section itself isn't touched beyond the id already added there.
    const sentinel = document.createElement("div");
    sentinel.style.cssText =
      "position:relative;width:1px;height:1px;margin-top:-1px;pointer-events:none;visibility:hidden;";
    target.parentElement.insertBefore(sentinel, target);

    const compute = () => {
      setSolid(sentinel.getBoundingClientRect().top <= HEADER_HEIGHT);
    };

    compute();

    const observer = new IntersectionObserver(() => compute(), {
      rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px`,
      threshold: 0,
    });
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 h-[75px] w-full"
      style={{ fontFamily: "var(--font-hanken-grotesk)" }}
    >
      {/* Background layers — cross-faded via opacity, see comment above */}
      <div
        aria-hidden
        className={`absolute inset-0 transition-opacity ${TRANSITION}`}
        style={{
          opacity: solid ? 0 : 1,
          background:
            "linear-gradient(to bottom, rgba(29,29,28,0.6) 0%, rgba(29,29,28,0) 73.7%)",
        }}
      />
      <div
        aria-hidden
        className={`absolute inset-0 transition-opacity ${TRANSITION}`}
        style={{
          opacity: solid ? 1 : 0,
          backgroundColor: "var(--fig-color-neutral-0)",
          boxShadow: "0 8px 15px rgba(172,172,172,0.05)",
        }}
      />

      <div
        className="relative flex h-full w-full items-center justify-between"
        style={{
          paddingLeft: "var(--fig-spacing-40)",
          paddingRight: "var(--fig-spacing-40)",
        }}
      >
        {/* Logo — cross-faded white/orange SVGs, see comment above */}
        <Link
          href="/"
          aria-label="FeizM home"
          className="relative block h-[30px] w-[104px] rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: linkFocusColor }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-white.svg"
            alt="FeizM"
            className={`absolute inset-0 h-full w-full transition-opacity ${TRANSITION}`}
            style={{ opacity: solid ? 0 : 1 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-orange.svg"
            alt=""
            aria-hidden
            className={`absolute inset-0 h-full w-full transition-opacity ${TRANSITION}`}
            style={{ opacity: solid ? 1 : 0 }}
          />
        </Link>

        {/* Nav Menu — absolutely positioned at x:440 (30.56% of 1440),
            matching Figma; not a normal flex sibling (see comment above) */}
        <ul
          className="absolute top-0 flex h-full items-center"
          style={{ left: "30.56%", gap: "var(--fig-spacing-22)" }}
        >
          {NAV_LINKS.map((label) => (
            <li key={label}>
              <a
                href="#"
                className={`block rounded transition-colors hover:opacity-70 ${TRANSITION} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                style={{
                  paddingTop: "var(--fig-spacing-11)",
                  paddingBottom: "var(--fig-spacing-11)",
                  color: solid ? "#282828" : "var(--fig-color-neutral-0)",
                  outlineColor: linkFocusColor,
                  fontSize: "14.97px",
                  lineHeight: "23px",
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* Nav Actions: CTA button (identical in both states, no variant
            branching) + language selector */}
        <div className="flex items-center" style={{ gap: "var(--fig-spacing-22)" }}>
          <button
            type="button"
            className="flex items-center justify-center rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              paddingLeft: "var(--fig-spacing-12)",
              paddingRight: "var(--fig-spacing-12)",
              paddingTop: "var(--fig-spacing-8)",
              paddingBottom: "var(--fig-spacing-8)",
              borderRadius: "var(--fig-radius-md)",
              backgroundColor: "var(--fig-color-brand-500)",
              border: "1px solid var(--fig-color-accent-coral-light)",
              color: "var(--fig-color-neutral-0)",
              outlineColor: "var(--fig-color-brand-500)",
              fontSize: "14.97px",
            }}
          >
            Schedule Demo
          </button>

          <button
            type="button"
            className={`flex items-center rounded transition-colors ${TRANSITION} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
            style={{
              gap: "var(--fig-spacing-8)",
              color: solid ? "#282828" : "var(--fig-color-neutral-0)",
              outlineColor: linkFocusColor,
            }}
          >
            <Search size={16} />
            <span style={{ fontSize: "14.97px" }}>SG</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
