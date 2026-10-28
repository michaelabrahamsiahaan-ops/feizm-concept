"use client";

import { useEffect, useRef } from "react";

type HalftoneGlobeHandle = {
  set: (opts: Record<string, unknown>) => void;
  pause: () => void;
  play: () => void;
  destroy: () => void;
};

declare global {
  interface Window {
    HalftoneGlobe?: {
      mount: (el: HTMLElement, opts?: Record<string, unknown>) => HalftoneGlobeHandle;
      cities: Record<string, [number, number]>;
    };
  }
}

export type HalftoneGlobeWidgetProps = {
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
  className?: string;
  style?: React.CSSProperties;
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
  ...opts
}: HalftoneGlobeWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let handle: HalftoneGlobeHandle | undefined;
    let cancelled = false;

    const mount = () => {
      if (cancelled || !ref.current || !window.HalftoneGlobe) return;
      handle = window.HalftoneGlobe.mount(ref.current, opts);
    };

    if (window.HalftoneGlobe) {
      mount();
    } else {
      const script = document.createElement("script");
      script.src = "/halftone-globe.js";
      script.onload = mount;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      handle?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className={className} style={style} />;
}
