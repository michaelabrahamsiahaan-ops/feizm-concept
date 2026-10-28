"use client";

import { useEffect, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { getLenis } from "./smooth-scroll";

function headerHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Scrolls to the section with `targetId`, respecting its own
 * `scroll-margin-top` (so it lands below the fixed SiteHeader — see
 * `scroll-mt-[var(--header-h)]` on the target sections, and
 * site-header.tsx for how `--header-h` is measured). Shared by every
 * in-page "jump to section" control, not just ScrollLink's own click
 * handler, so a direct #hash page load (see ScrollHashOnLoad below) lands
 * exactly the same way a click does.
 *
 * `behavior` defaults to following `prefers-reduced-motion` so callers
 * don't have to think about it; pass "auto" explicitly to force an
 * instant jump regardless (used for the initial-hash correction, where an
 * animated scroll immediately on page load would be unwanted even for
 * motion-OK users — see ScrollHashOnLoad).
 *
 * When Lenis (components/shared/smooth-scroll.tsx) is active on the
 * current page, routes through `lenis.scrollTo()` instead of the native
 * `scrollIntoView` — native smooth scroll and Lenis both try to own the
 * scroll position, so running both at once fights itself. Lenis's own
 * `offset` takes the place of `scroll-margin-top` here (negative, so the
 * landing stops `headerHeight` px short of the target's own top, leaving
 * it sitting just below the header — same clearance, computed the same
 * way, just handed to a different scroller). `getLenis()` returns null
 * on every page that doesn't mount `<SmoothScroll />`, so this is a
 * no-op fallback to the original native behavior everywhere else.
 */
export function scrollToSection(
  targetId: string,
  { behavior, focusAfter = false }: { behavior?: ScrollBehavior; focusAfter?: boolean } = {},
) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resolvedBehavior = behavior ?? (reduced ? "auto" : "smooth");

  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(target, {
      offset: -headerHeight(),
      immediate: resolvedBehavior === "auto",
      onComplete: focusAfter ? () => target.focus({ preventScroll: true }) : undefined,
    });
    return; // Lenis's own onComplete already handles focusAfter — skip the native path below.
  }

  target.scrollIntoView({ behavior: resolvedBehavior, block: "start" });

  if (focusAfter) {
    const focus = () => target.focus({ preventScroll: true });
    // `scrollend` (Chrome 114+, Firefox 109+, Safari 17.4+) fires once the
    // browser's own smooth-scroll animation actually settles — far more
    // accurate than guessing a duration. Where it's unsupported, fall
    // back to a timeout a little longer than Chromium's own default
    // smooth-scroll duration; an instant ("auto") jump has already
    // resolved by the time either fires, so the fallback is harmless
    // there too.
    const supportsScrollend = "onscrollend" in window;
    if (supportsScrollend) {
      window.addEventListener("scrollend", focus, { once: true });
    } else {
      setTimeout(focus, 600);
    }
  }
}

type ScrollLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  targetId: string;
  children: ReactNode;
};

/**
 * A real `<a href="#targetId">` (works with JS disabled — native hash
 * navigation and :target-based `scroll-margin-top` still apply) enhanced
 * to smooth-scroll, correctly offset under the fixed header, and leave no
 * "#targetId" in the address bar.
 *
 * `preventDefault` stops the browser's own instant hash-jump (and, since
 * the default is what would set `location.hash`, that alone is also what
 * keeps the URL clean — there's nothing to `history.replaceState` away
 * here, unlike the one-time initial-hash correction in
 * ScrollHashOnLoad, which runs *after* the browser has already navigated
 * to a URL that came with the hash attached).
 */
export function ScrollLink({ targetId, onClick, children, ...rest }: ScrollLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    scrollToSection(targetId, { focusAfter: true });
  }

  return (
    <a href={`#${targetId}`} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

/**
 * Corrects a direct page load with a URL hash (e.g.
 * `/fleet-management-system#why-feizmfleet`) to land through the exact
 * same `scrollToSection` path a click uses, rather than trusting the
 * browser's own native anchor-scroll.
 *
 * In practice the native jump is usually already correct by itself — the
 * target's `scroll-margin-top: var(--header-h)` is present in the
 * server-rendered HTML, and globals.css's `--header-h` fallback (see that
 * file) gives the variable a real value before any JS runs — but native
 * anchor positioning has no equivalent of our overlay->solid header
 * state, and timing between the stylesheet loading and the browser's own
 * anchor-scroll isn't something this app controls. Re-running the same
 * scroll on mount is cheap insurance: a no-op if the native jump already
 * landed correctly (same final position, nothing visibly moves), and a
 * correction if it didn't.
 *
 * Deliberately instant ("auto"), not smooth — animating the viewport
 * immediately on page load, before the person has done anything, isn't
 * the "smooth scroll CTA" behavior this exists for. Also deliberately
 * does NOT move focus (unlike a click) and does NOT touch the URL: a
 * direct link to a specific section is a legitimate, bookmarkable
 * destination, not an in-page navigation to clean up after.
 *
 * Mounted once, site-wide, in app/layout.tsx — not per-page — so every
 * current and future `#section-id` deep link benefits without each page
 * needing its own copy.
 */
export function ScrollHashOnLoad() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    scrollToSection(id, { behavior: "auto" });
  }, []);

  return null;
}
