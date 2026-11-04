"use client";

import { useEffect, useRef } from "react";

export type HalftoneWavesHandle = {
  pause: () => void;
  play: () => void;
  destroy: () => void;
};

type HalftoneWavesApi = {
  mount: (el: HTMLElement, opts?: Record<string, unknown>) => HalftoneWavesHandle;
};

declare global {
  interface Window {
    HalftoneWaves?: HalftoneWavesApi;
  }
}

export type HalftoneWavesWidgetProps = {
  dotColor?: string;
  background?: string | null;
  gridSpacing?: number;
  maxDotSize?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  fadeStart?: number;
  fadeStartRight?: number;
  fadeEnd?: number;
  loopDuration?: number;
  className?: string;
  style?: React.CSSProperties;
  onHandle?: (handle: HalftoneWavesHandle | null) => void;
};

/**
 * React wrapper for the animated Halftone Waves illustration
 * (public/halftone-waves.js — vendored from the user-supplied
 * "halftone-waves-embed.html", same "load the script once, mount into a
 * container div, tear down on unmount" pattern as HalftoneGlobeWidget's
 * own doc comment describes for public/halftone-globe.js). The container
 * just needs a size (width/height or aspect-ratio via `style`) — the
 * widget creates its own `<canvas>` inside it and sizes to fill.
 */
export function HalftoneWavesWidget({
  className,
  style,
  onHandle,
  ...opts
}: HalftoneWavesWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let handle: HalftoneWavesHandle | undefined;
    let cancelled = false;

    const mount = () => {
      const api = window.HalftoneWaves;
      if (cancelled || !ref.current || !api) return;
      handle = api.mount(ref.current, opts);
      onHandle?.(handle);
    };

    if (window.HalftoneWaves) {
      mount();
    } else {
      const script = document.createElement("script");
      script.src = "/halftone-waves.js";
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
