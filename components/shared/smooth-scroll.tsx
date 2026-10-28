"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// ---- Tunable constants ----
const LERP = 0.08; // lower = slower/smoother interpolation toward the target scroll position
const WHEEL_MULTIPLIER = 0.8; // less distance per wheel/trackpad step
const SMOOTH_WHEEL = true;

/**
 * Module-level singleton, not component state: every scroll-driven piece
 * on the page (HomeHeroParallax, HomeCompany, SiteHeader, ScrollLink) is
 * its own component with its own effects, and all of them need to answer
 * "is Lenis running right now, and if so, what instance" — passing it
 * down as a prop would mean threading it through components that have no
 * other reason to know about each other. A plain module singleton is the
 * simplest thing that lets any of them opt in without a context provider
 * wrapping the whole page (SmoothScroll itself renders nothing and can be
 * mounted anywhere in the tree).
 */
let activeLenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return activeLenis;
}

/**
 * Starts Lenis (inertia/eased scrolling) for as long as this component is
 * mounted, and runs its own requestAnimationFrame loop — per Lenis's own
 * docs, it does nothing on its own without something driving `lenis.raf()`
 * every frame.
 *
 * Mount this once, high in the tree of whichever page wants smooth
 * scrolling (currently just /home — see app/home/page.tsx). It's an
 * ordinary component, not a context provider, so enabling it on another
 * page later is exactly that: render `<SmoothScroll />` there too. Not
 * mounted in the root layout on purpose — the brief asks for Home only
 * "for now", and every other page's scroll-driven code (SiteHeader's
 * trigger, ScrollLink) already falls back to native scrolling correctly
 * when `getLenis()` returns null, so nothing on those pages depends on
 * this component existing.
 *
 * `prefers-reduced-motion`: Lenis is never constructed at all — native
 * scrolling, and every consumer's own `getLenis() === null` fallback path
 * runs, which for each of them is already their existing
 * reduced-motion-safe behavior (see each component's own comment).
 *
 * Destroyed on unmount (including on route change, since Next.js unmounts
 * page components on navigation) so it never keeps smoothing scroll on a
 * page that didn't ask for it.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: LERP,
      wheelMultiplier: WHEEL_MULTIPLIER,
      smoothWheel: SMOOTH_WHEEL,
      // Phones already have natural momentum scrolling; smoothing touch
      // on top of that reads as laggy, not smooth. `syncTouch: false`
      // (Lenis's modern option name) keeps touch scrolling native.
      syncTouch: false,
    });
    activeLenis = lenis;

    let raf = 0;
    function loop(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      activeLenis = null;
    };
  }, []);

  return null;
}
