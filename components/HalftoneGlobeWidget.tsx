"use client";

import { useEffect, useRef } from "react";

export type HalftoneGlobeHandle = {
  set: (opts: Record<string, unknown>) => void;
  pause: () => void;
  play: () => void;
  destroy: () => void;
};

type HalftoneGlobeApi = {
  mount: (el: HTMLElement, opts?: Record<string, unknown>) => HalftoneGlobeHandle;
  cities: Record<string, [number, number]>;
};

declare global {
  interface Window {
    // Two widget versions can be mounted in the same browser session
    // (Hero.tsx uses the original; Stats uses the v2 script below) without
    // colliding, because each is vendored under its own global name — see
    // public/halftone-globe-v2.js's own export comment.
    HalftoneGlobe?: HalftoneGlobeApi;
    HalftoneGlobeV2?: HalftoneGlobeApi;
  }
}

export type HalftoneGlobeWidgetProps = {
  // Which vendored script + window global to load/mount. Defaults match
  // the original widget (public/halftone-globe.js, window.HalftoneGlobe) —
  // pass scriptSrc="/halftone-globe-v2.js" globalName="HalftoneGlobeV2" to
  // use the newer script (public/halftone-globe-v2.js) instead.
  scriptSrc?: string;
  globalName?: "HalftoneGlobe" | "HalftoneGlobeV2";
  speed?: number;
  background?: string;
  dotColor?: string;
  rimColor?: string;
  arcColor?: string;
  startLon?: number;
  tilt?: number;
  // Composition within the widget's own 1080×1080 design space — the
  // script's DEFAULTS bias these off-center for a "cropped bottom-right"
  // composition; a centered circle (e.g. the Figma "Home / 03 Stats"
  // globe, centerX/Y 540/540 — exactly the design space's own center —
  // radius 420) needs these overridden per mount, not patched in the
  // vendored script itself.
  centerX?: number;
  centerY?: number;
  radius?: number;
  dotSize?: number;
  // v2-script-only options (public/halftone-globe-v2.js) — harmless no-ops
  // on the original script, which ignores unknown opts.
  sphereFill?: string;
  layout?: "center" | "crop";
  className?: string;
  style?: React.CSSProperties;
  // Called once the widget has actually mounted (script loaded +
  // `window.HalftoneGlobe.mount()` returned), with the handle itself —
  // lets a consumer call `pause()`/`play()` on the widget's own internal
  // rAF loop (e.g. to stop its continuous full-canvas redraw — ~7000
  // individually-drawn dots — while something else needs the main thread,
  // without touching the vendored script's own logic). Called again with
  // `null` right before the widget is torn down, so a consumer never
  // holds a stale handle.
  onHandle?: (handle: HalftoneGlobeHandle | null) => void;
};

/**
 * React wrapper for the animated Halftone Globe illustration
 * (public/halftone-globe.js — vendored as-is, per its own README: "Use
 * halftone-globe.js without changing its logic"). Loads the script once,
 * mounts it into a container div, and tears it down on unmount.
 */
export function HalftoneGlobeWidget({
  className,
  style,
  onHandle,
  scriptSrc = "/halftone-globe.js",
  globalName = "HalftoneGlobe",
  ...opts
}: HalftoneGlobeWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let handle: HalftoneGlobeHandle | undefined;
    let cancelled = false;

    const mount = () => {
      const api = window[globalName];
      if (cancelled || !ref.current || !api) return;
      handle = api.mount(ref.current, opts);
      onHandle?.(handle);
    };

    if (window[globalName]) {
      mount();
    } else {
      const script = document.createElement("script");
      script.src = scriptSrc;
      script.onload = mount;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      onHandle?.(null);
      handle?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className={className} style={style} />;
}
