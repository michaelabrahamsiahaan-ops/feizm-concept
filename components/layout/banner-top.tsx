"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const DISMISS_KEY = "feizm-banner-top-dismissed";

// SiteHeader's solid-trigger effect only re-runs on `scroll`/`resize` —
// this bar's own ResizeObserver firing (e.g. the mobile 2-line wrap
// threshold, or dismissing) changes --banner-h on a tick neither of those
// fires on, so without this the header's "has the trigger section reached
// the header's bottom edge" math would read a stale --banner-h until the
// next real scroll. SiteHeader listens for this alongside `scroll`/`resize`.
export const BANNER_RESIZE_EVENT = "feizm-banner-resize";

/**
 * Concept-project disclaimer bar — `position: fixed` at the very top of the
 * viewport, above SiteHeader (higher z-index).
 *
 * ---- Revision history ----
 * v1 (Figma-sourced): white bar, `position: fixed`, dismissible via a close
 * icon. Reported as a bug (stayed pinned for the ENTIRE page scroll with no
 * way to tell it apart from permanent chrome) and changed to `position:
 * absolute` so it scrolled away like ordinary content instead.
 * v2: the opposite correction — permanently visible, dark, with the dismiss
 * button removed entirely ("NOT dismissible" was explicit at the time).
 * v3 (this revision): Figma's own "Banner top component" (node 344:272) was
 * updated by the designer — pure black fill (not `#0B0B0B`), 12px text
 * (was 13px), uniform 100%-opacity white text (was 90% for the sentence),
 * 8/8/8/16 padding (was 7/7 symmetric), and — notably — a real visible
 * close icon reappeared in the design (plus its matching invisible
 * left-side spacer, same balancing trick as the original v1). Per explicit
 * user instruction: keep the CURRENT site copy (Figma's own text dropped
 * "FeizM or" and its trailing period — the user asked to keep the fuller
 * wording instead of matching that), but DO restore the dismiss button
 * "just like design" — the Figma vector (345:274) is a FILLED white X
 * shape, not a stroked line icon, so this is the real exported SVG
 * (`public/icons/banner-close.svg`, `figma-cli export node 345:274 -f
 * svg`) rather than a reused lucide-react icon — lucide's `X` is
 * stroke-based and would only approximate the actual shape, and the user
 * asked for a match to the design, not a generic substitute. Persistence
 * (localStorage) is back too — a dismiss button that forgets on every
 * reload isn't really a dismiss.
 *
 * ---- Layout ----
 * Pure black (`#000000` — sampled directly from Figma; no existing neutral
 * token is an exact match, the closest is `--fig-color-neutral-900`
 * `#030000`, off by a few units, so this stays a literal rather than
 * snapping to a near-but-wrong token), white text (`--fig-color-neutral-0`)
 * at full opacity throughout — the "ui.ux.abraham" credit is distinguished
 * from the rest of the sentence by its underline alone now, not by extra
 * opacity. Padding/gap use `--fig-spacing-8`/`--fig-spacing-16` (exact
 * token matches for Figma's 8/8/8/16 padding and 8px gap). ~34px tall on
 * desktop (12px text, 18px line-height, 8px top/bottom padding — matches
 * Figma's own HUG-sized frame height exactly); no truncation on narrow
 * viewports — the sentence just wraps to 2 lines, growing the bar's own
 * height instead of clipping (verified: the left spacer + right button
 * stay fixed-size while the text's own `flex-1` shrinks and wraps).
 *
 * Real height is measured live via `ResizeObserver` (border-box, via
 * `getBoundingClientRect` — NOT `entry.contentRect`, which is content-box
 * only and under-reports by this bar's own padding) and published as
 * `--banner-h` on `:root`. Three independent consumers all read that
 * single var rather than a hardcoded pixel offset:
 *   - SiteHeader's own `<nav>` — `top: var(--banner-h)`, pure CSS, so it
 *     repositions itself the instant the var changes (including to 0 on
 *     dismiss), no JS needed.
 *   - Every page's `<main>` — `paddingTop: var(--banner-h)`, pushing Hero
 *     (and everything after it) down by the same amount so the overlay
 *     relationship between SiteHeader and Hero is preserved, just shifted
 *     down as a unit instead of starting at the very top of the viewport.
 *   - `globals.css`'s `--header-h: calc(var(--nav-h) + var(--banner-h))` —
 *     every `scroll-mt-[var(--header-h)]` anchor target site-wide now
 *     clears BOTH fixed bars, not just the nav.
 *   - `HomeHeroParallax`'s pinned hero — its sticky `.pin`'s own `top` also
 *     adds `var(--banner-h)`, since a bare `top: 0` would stick the pin
 *     right under this bar and crop its top edge while it's showing.
 *
 * ---- Dismiss behavior ----
 * Clicking the close icon hides the banner (immediately sets `--banner-h`
 * to `0px` rather than waiting on the ResizeObserver's own
 * disconnect-on-unmount, which wouldn't reset the variable on its own) and
 * remembers the dismissal in `localStorage` so it stays hidden on return
 * visits. SSR-safe default is "showing" (matches globals.css's own
 * `--banner-h` pre-hydration fallback) — a returning, already-dismissed
 * visitor briefly sees the banner's reserved space before this component's
 * own mount effect reads `localStorage` and corrects it to hidden.
 */
export function BannerTop() {
  const [dismissed, setDismissed] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage has no SSR-safe value, same tradeoff as every other such check in this project
      setDismissed(true);
    }
  }, []);

  useLayoutEffect(() => {
    if (dismissed) {
      document.documentElement.style.setProperty("--banner-h", "0px");
      window.dispatchEvent(new Event(BANNER_RESIZE_EVENT));
      return;
    }
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
  }, [dismissed]);

  if (dismissed) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    document.documentElement.style.setProperty("--banner-h", "0px");
    window.dispatchEvent(new Event(BANNER_RESIZE_EVENT));
    setDismissed(true);
  }

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 top-0 z-[60] flex w-full items-center justify-center"
      style={{
        gap: "var(--fig-spacing-8)",
        paddingTop: "var(--fig-spacing-8)",
        paddingRight: "var(--fig-spacing-16)",
        paddingBottom: "var(--fig-spacing-8)",
        paddingLeft: "var(--fig-spacing-8)",
        backgroundColor: "#000000",
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <div aria-hidden className="h-4 w-4 shrink-0" />
      <p
        className="flex-1 text-center font-normal"
        style={{ color: "var(--fig-color-neutral-0)", fontSize: "12px", lineHeight: "18px" }}
      >
        Concept design project by{" "}
        <a
          href="https://abraham-space.framer.website/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ color: "var(--fig-color-neutral-0)", textDecoration: "underline" }}
        >
          ui.ux.abraham
        </a>{" "}
        — not affiliated with FeizM or Geotab.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: next/image refuses local SVGs without images.dangerouslyAllowSVG, same convention as site-footer.tsx's social icons */}
        <img src="/icons/banner-close.svg" alt="" aria-hidden className="h-[11px] w-[11px]" />
      </button>
    </div>
  );
}
