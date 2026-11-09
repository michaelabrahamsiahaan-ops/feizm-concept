"use client";

import { useLayoutEffect, useRef } from "react";

// SiteHeader's solid-trigger effect only re-runs on `scroll`/`resize` —
// this bar's own ResizeObserver firing (e.g. the mobile 2-line wrap
// threshold) changes --banner-h on a tick neither of those fires on,
// so without this the header's "has the trigger section reached the
// header's bottom edge" math would read a stale --banner-h until the
// next real scroll. SiteHeader listens for this alongside `scroll`/`resize`.
export const BANNER_RESIZE_EVENT = "feizm-banner-resize";

/**
 * Concept-project disclaimer bar — always visible, `position: fixed` at the
 * very top of the viewport, above SiteHeader (higher z-index). Not a cookie
 * notice or a dismissible nag: it's a standing disclaimer that this is an
 * unaffiliated concept project, so there's no close button and nothing to
 * remember in localStorage — simpler than the component's own first
 * revision, which (incorrectly) treated it as dismissible.
 *
 * ---- Revision history ----
 * v1 (Figma-sourced): white bar, `position: fixed`, dismissible via a close
 * icon. Reported as a bug (stayed pinned for the ENTIRE page scroll with no
 * way to tell it apart from permanent chrome) and changed to `position:
 * absolute` so it scrolled away like ordinary content instead.
 * v2 (this revision, explicit user request): the OPPOSITE correction — the
 * user wants it permanently visible after all, just styled as a dark,
 * non-dismissible disclaimer bar rather than a white dismissible one. Back
 * to `position: fixed`, with the dismiss machinery removed entirely rather
 * than left dormant (dead localStorage/close-button code for a bar that can
 * no longer be dismissed would just be confusing).
 *
 * ---- Layout ----
 * Dark bar (`#0B0B0B`), white text at 90% opacity for the sentence, the
 * "ui.ux.abraham" credit — a real link to
 * https://abraham-space.framer.website/ (the designer's own portfolio,
 * given directly by the user; opens in a new tab since it navigates away
 * from the site entirely) — at full 100% opacity + underline so it still
 * reads as a link against the dimmer surrounding text. ~32px tall on
 * desktop (13px text, 7px top/bottom padding); no truncation on narrow
 * viewports — the sentence just wraps to 2 lines (`flex-wrap` on the single
 * text line, no `whitespace-nowrap`/`truncate` anywhere), growing the bar's
 * own height instead of clipping.
 *
 * Real height is measured live via `ResizeObserver` (border-box, via
 * `getBoundingClientRect` — NOT `entry.contentRect`, which is content-box
 * only and under-reports by this bar's own padding, confirmed directly: it
 * published 24px, the text's own line-height, instead of the true 40px bar
 * height, in the old 40px-tall v1 design) and published as `--banner-h` on
 * `:root`. Three independent consumers all read that single var rather than
 * a hardcoded pixel offset:
 *   - SiteHeader's own `<nav>` — `top: var(--banner-h)`, pure CSS, so it
 *     repositions itself the instant the var changes, no JS needed.
 *   - Every page's `<main>` — `paddingTop: var(--banner-h)`, pushing Hero
 *     (and everything after it) down by the same amount so the overlay
 *     relationship between SiteHeader and Hero is preserved, just shifted
 *     down as a unit instead of starting at the very top of the viewport.
 *   - `globals.css`'s `--header-h: calc(var(--nav-h) + var(--banner-h))` —
 *     every `scroll-mt-[var(--header-h)]` anchor target site-wide now
 *     clears BOTH fixed bars, not just the nav.
 *   - `HomeHeroParallax`'s pinned hero — its sticky `.pin`'s own `top`
 *     (see that component's doc comment) also adds `var(--banner-h)`, since
 *     a bare `top: 0` would stick the pin right under this now-opaque,
 *     always-visible bar and crop its top edge.
 */
export function BannerTop() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const apply = () => {
      document.documentElement.style.setProperty("--banner-h", `${bar.getBoundingClientRect().height}px`);
      window.dispatchEvent(new Event(BANNER_RESIZE_EVENT));
    };

    apply();

    const ro = new ResizeObserver(() => apply());
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 top-0 z-[60] flex w-full items-center justify-center px-4"
      style={{
        paddingTop: "7px",
        paddingBottom: "7px",
        backgroundColor: "#0B0B0B",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <p
        className="max-w-[90ch] text-center font-normal"
        style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px", lineHeight: "18px" }}
      >
        Concept design project by{" "}
        <a
          href="https://abraham-space.framer.website/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#FFFFFF", textDecoration: "underline" }}
        >
          ui.ux.abraham
        </a>{" "}
        — not affiliated with FeizM or Geotab.
      </p>
    </div>
  );
}
