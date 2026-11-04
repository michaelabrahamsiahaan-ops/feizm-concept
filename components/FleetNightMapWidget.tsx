"use client";

import { useEffect, useRef } from "react";

export type FleetNightMapHandle = {
  pause: () => void;
  play: () => void;
  destroy: () => void;
};

type FleetNightMapApi = {
  mount: (el: HTMLElement, opts?: Record<string, unknown>) => FleetNightMapHandle;
};

declare global {
  interface Window {
    FleetNightMap?: FleetNightMapApi;
  }
}

export type FleetNightMapWidgetProps = {
  ariaLabel?: string;
  respectReducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onHandle?: (handle: FleetNightMapHandle | null) => void;
};

/**
 * React wrapper for the animated FleetNightMap illustration
 * (public/fleet-night-map.js — vendored from the user-supplied
 * "fleet-night-map.html", same "load the script once, mount into a
 * container div, tear down on unmount" pattern as HalftoneGlobeWidget /
 * HalftoneWavesWidget). The container just needs a size (width/height or
 * aspect-ratio via `style`) — the widget creates its own `<canvas>`
 * inside it and sizes to fill.
 */
export function FleetNightMapWidget({
  className,
  style,
  onHandle,
  ...opts
}: FleetNightMapWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let handle: FleetNightMapHandle | undefined;
    let cancelled = false;

    const mount = () => {
      const api = window.FleetNightMap;
      if (cancelled || !ref.current || !api) return;
      handle = api.mount(ref.current, opts);
      onHandle?.(handle);
    };

    if (window.FleetNightMap) {
      mount();
    } else {
      const script = document.createElement("script");
      script.src = "/fleet-night-map.js";
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
