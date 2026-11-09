"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { BANNER_RESIZE_EVENT } from "./banner-top";
import { getLenis } from "@/components/shared/smooth-scroll";

const NAV_LINKS = [
  "About us",
  "Services",
  "Resources",
  "Contact Us",
  "Careers",
  "Support",
];

// Only an initial value for the ref below, corrected synchronously (before
// paint) by the ResizeObserver effect the first time it runs — never read
// again after that. Matches globals.css's own `--nav-h` fallback for
// the same reason (see that file's comment); neither one is the source of
// truth for the app's actual scroll-offset math, which is the live
// measured DOM height.
const INITIAL_HEADER_HEIGHT = 75;
const TRANSITION = "duration-[250ms] ease-in-out motion-reduce:transition-none";

// Same pattern as scroll-link.tsx's own `headerHeight()`, but reading
// --banner-h instead — BannerTop's own live-measured height, published via
// its own ResizeObserver (see that component's doc comment). Used by the
// solid-trigger effect below for where the fixed chrome's bottom edge
// currently is (nav's own `top` no longer needs any JS — see below).
function bannerHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--banner-h");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

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
 *   - CTA button: fill/border/radius identical in both source frames
 *     (confirmed byte-for-byte) — rendered with fixed brand-500/
 *     accent-coral-light styling regardless of `solid`, no variant
 *     branching on it at all. Figma's own text is "Schedule Demo"; reads
 *     "Request Demo" here on the user's own explicit request (matches
 *     the CTA buttons elsewhere on the site, e.g. HomeCTASection's own
 *     "Request Demo" button) — a deliberate copy change, not a Figma
 *     re-read.
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
 * Scroll trigger: solid activates when the trigger section's top edge
 * reaches the header's own bottom edge (not an arbitrary scrollY pixel
 * value) — computed from `target.getBoundingClientRect().top <=
 * headerHeight` on every scroll tick (rAF-throttled, passive listener;
 * see the trigger effect below). The live-position read rather than a
 * cached scrollY also means this stays correct deep into later sections
 * (a large negative top is still <= headerHeight, correctly staying
 * "solid") and reverts cleanly scrolling back up.
 *
 * This used to be an IntersectionObserver on a 1px sentinel with a
 * `rootMargin` shrunk by the header's height, which is the usual trick
 * for "did this line cross the header's bottom edge" — cheaper than a
 * scroll listener, and correct for ordinary user scrolling. It broke for
 * ScrollLink's own landings specifically: `scroll-margin-top:
 * var(--header-h)` means a ScrollLink scroll lands with the sentinel's
 * top EXACTLY at the header's height — i.e. exactly on the rootMargin
 * boundary IntersectionObserver was watching, not past it. Native smooth
 * scrolling is monotonic (no overshoot), so the animation approaches that
 * boundary from one side and stops precisely there, never crossing to the
 * other side — the one IntersectionObserver callback this needs to see
 * (ratio flipping as the sentinel exits the margin-shrunk root) never
 * fires, because the sentinel never actually leaves it. Verified directly
 * (not just theorized): instrumented the old effect and confirmed zero
 * IntersectionObserver callbacks fired after the one at scroll-start, for
 * every ScrollLink landing tested. A plain scroll listener has no such
 * blind spot — it re-reads the live position on every tick regardless of
 * where the animation happens to stop, so landing exactly on the boundary
 * is resolved the same as landing anywhere else.
 *
 * `triggerId` defaults to "company-profile" (the About page's own
 * section) and is overridable per page — the Fleet page passes
 * "why-feizmfleet" since it has no company-profile section of its own,
 * but the same early-switch-to-solid behavior still makes sense once
 * there's *something* below the Hero to switch on.
 *
 * Force-overlay override: any section can ask for the overlay (dark-text-
 * friendly) state regardless of the triggerId computation above — e.g.
 * TestimoniesSection's scroll-driven expand-to-fullscreen reveal, which
 * sits on a photo and needs the overlay state once it fills the
 * viewport, even though by then `triggerId`'s own math says "solid"
 * (every section below Hero does). Rather than prop-drilling or lifting
 * state into a shared client ancestor (page.tsx is a server component;
 * doing this would mean converting it), any section signals this the
 * same way `triggerId` itself works — through a plain DOM read, not a
 * React data path — by toggling `document.documentElement.dataset.
 * forceHeaderOverlay = "true"/removeAttribute(...)`. This effect's own
 * `compute()` checks it on every scroll tick (the same tick already
 * re-reading `triggerId`'s position), so it's correct the instant either
 * input changes, from either direction, with no extra listener needed.
 *
 * Boundary case: a ScrollLink landing (components/shared/scroll-link.tsx)
 * puts the trigger section's top edge EXACTLY at the header's bottom edge
 * via `scroll-margin-top: var(--header-h)` — right on this effect's `<=`
 * boundary. A 1px epsilon (`SOLID_EPSILON` below) absorbs sub-pixel
 * rounding from smooth-scroll's fractional scroll positions so that exact
 * landing always reads unambiguously "solid" and never flickers. Because
 * this recomputes on every scroll tick (not just at crossing events), the
 * state updates live *during* the scroll, as soon as that tick's position
 * satisfies the boundary — not only once the scroll settles.
 *
 * Header height: measured live off the `<nav>` itself via ResizeObserver
 * and published as `--nav-h` on `:root`. `globals.css` combines it with
 * BannerTop's own `--banner-h` into `--header-h: calc(var(--nav-h) +
 * var(--banner-h))` — consumed by `scroll-mt-[var(--header-h)]` on every
 * scroll target — rather than hard-coding a pixel offset anywhere. The
 * overlay and solid states share one fixed-height `<nav>` (only the
 * background/logo/text colors cross-fade — see below), so there's no
 * "measure it in the solid state specifically" step needed; the measured
 * height is state-independent by construction, and would stay correct if
 * a future breakpoint ever made it not be.
 *
 * ---- Stacking below BannerTop ----
 * BannerTop (components/layout/banner-top.tsx) is a permanent, non-
 * dismissible disclaimer bar, `position: fixed` at the very top with a
 * HIGHER z-index than this `<nav>` — it is always on screen, not just at
 * the top of the page. This `<nav>` stays `position: fixed` too (zero
 * layout footprint — required for Hero's full-bleed background to sit
 * directly behind a transparent-overlay nav; `sticky` was considered and
 * rejected, it would reserve its own 75px in normal flow and shove Hero
 * down by that much on top of the banner's own offset). Since BannerTop
 * never moves or disappears, the nav's own `top: var(--banner-h)` (set
 * once in the JSX style below) is ALL that's needed to sit directly below
 * it — no scroll-tick JS repositioning, unlike an earlier revision where
 * BannerTop scrolled away with the page and the nav had to chase a moving
 * target (`Math.max(0, bannerHeight - scrollY)` on every tick). Because
 * `top` is a plain `var()` read, the nav repositions itself automatically
 * the instant `--banner-h` changes (e.g. the mobile 2-line wrap), with no
 * JS involved at all.
 *
 * Every page's own `<main>` also adds `paddingTop: var(--banner-h)` (see
 * e.g. app/home/page.tsx) so Hero — and everything after it — starts that
 * same distance down too, preserving the nav-overlays-hero relationship
 * exactly as before, just shifted down as a unit instead of starting at
 * the very top of the viewport. The solid-trigger math below reads
 * `bannerHeight() + headerHeightRef.current` for where the fixed chrome's
 * bottom edge currently is — both now constant per viewport width, not
 * scroll-dependent.
 *
 * Initial state uses `useLayoutEffect` (not `useEffect`) specifically so a
 * mid-page refresh or anchor-link load computes and applies the correct
 * variant before the browser's first paint — avoiding a flash of the wrong
 * state, which a post-paint effect wouldn't fully prevent.
 */
const SOLID_EPSILON = 1;

export function SiteHeader({ triggerId = "company-profile" }: { triggerId?: string }) {
  const [solid, setSolid] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const headerHeightRef = useRef(INITIAL_HEADER_HEIGHT);
  const linkFocusColor = solid ? "#282828" : "var(--fig-color-neutral-0)";

  // Measure the header's real rendered height and publish it as
  // --header-h on :root — see the doc comment above for why this
  // replaces a hard-coded offset everywhere it would otherwise be needed
  // (scroll-margin-top on scroll targets, and this component's own
  // trigger math below).
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const apply = () => {
      const height = nav.getBoundingClientRect().height;
      headerHeightRef.current = height;
      document.documentElement.style.setProperty("--nav-h", `${height}px`);
    };

    apply();

    // getBoundingClientRect (border-box), not entry.contentRect (content box
    // only) — contentRect under-reports by the nav's own padding/border, the
    // same bug confirmed in banner-top.tsx's identical ResizeObserver.
    const ro = new ResizeObserver(() => apply());
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const target = document.getElementById(triggerId);
    if (!target) return;

    // target.getBoundingClientRect().top reads the section's own border-box
    // top edge, unaffected by its own (internal) padding — no sentinel
    // element needed now that this isn't threshold-crossing-based (see the
    // doc comment above for why a sentinel + IntersectionObserver used to
    // be here and why it broke for an exact ScrollLink landing).
    const compute = () => {
      const navBottom = bannerHeight() + headerHeightRef.current;
      const baseSolid = target.getBoundingClientRect().top <= navBottom + SOLID_EPSILON;
      const forceOverlay = document.documentElement.dataset.forceHeaderOverlay === "true";
      setSolid(baseSolid && !forceOverlay);
    };

    compute();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        compute();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute);
    // BannerTop's own ResizeObserver can change --banner-h (e.g. the mobile
    // 2-line wrap threshold) without any scroll or window resize happening —
    // without this, the solid-trigger math would read a stale banner height
    // until the next real scroll.
    window.addEventListener(BANNER_RESIZE_EVENT, compute);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
      window.removeEventListener(BANNER_RESIZE_EVENT, compute);
    };
  }, [triggerId]);

  // Clicking the logo while already on "/" has nowhere to navigate to —
  // Link would still push a no-op "/" -> "/" history entry and do nothing
  // visible, which reads as a dead click. Scrolling to top instead gives it
  // the same "go home" affordance most sites' logos have. Read
  // window.location.pathname directly in the handler (not a router hook)
  // since this only needs to know where we are AT CLICK TIME, after
  // hydration — same "plain DOM read over React state" preference this
  // file already uses for window.scrollY/document.activeElement elsewhere.
  // On every other route, falls through and lets <Link> navigate normally.
  function handleLogoClick(event: MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(0, { immediate: reduced });
    } else {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }
  }

  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 z-50 h-[75px] w-full"
      style={{ top: "var(--banner-h)", fontFamily: "var(--font-hanken-grotesk)" }}
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
        {/* Logo — cross-faded white/orange SVGs, see comment above. onClick
            only intercepts the navigation when already on "/" (scrolls to
            top instead) — see handleLogoClick's own comment. */}
        <Link
          href="/"
          onClick={handleLogoClick}
          aria-label="FeizM — go to homepage"
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
            Request Demo
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
