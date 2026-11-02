"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";

const DPR_CAP = 2;
// How close the section needs to be before the remaining (lazy) frames
// start loading — matches StatsSection/HomeHeroParallax's own "wake up
// roughly a viewport early" IntersectionObserver margin convention.
const LAZY_ROOT_MARGIN = "100% 0px 100% 0px";

export type ScrollFrameSequenceHandle = {
  /** p in [0, 1] — draws frame round(p * (frameCount - 1)). */
  setProgress: (p: number) => void;
};

type Props = {
  /** Frame URLs in order, p=0 -> frameUrls[0], p=1 -> frameUrls[last]. */
  frameUrls: string[];
  /** Shown as a plain <img> when reducedMotion is true, and behind the canvas until frame 0 decodes. */
  fallbackSrc: string;
  /** Decorative by default (aria-hidden). Pass alt to expose it as role="img" instead. */
  alt?: string;
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Canvas-based scroll-scrubbed frame sequence (the joinsystems.co-style
 * "object rotates as you scroll" technique). Reusable: the caller owns the
 * scroll math entirely and just calls `ref.current.setProgress(p)` on its
 * own rAF tick — this component never reads the scroll position itself,
 * so it has no opinion on pinning, easing, or where p=0/1 land.
 *
 * Loading: frame 0 loads eagerly (fetchPriority "high") so there's always
 * something to paint the moment the canvas mounts. The remaining frames
 * load lazily, triggered by this component's own IntersectionObserver
 * (same ~1-viewport-early margin the project's other scroll effects use),
 * not by the caller — a caller driving a pin doesn't necessarily know
 * when "near the viewport" is for this specific element.
 *
 * Drawing: only redraws when the target frame INDEX changes (not on every
 * setProgress call — many scroll ticks round to the same frame), and if
 * that frame isn't decoded yet, draws the nearest already-loaded frame
 * instead of leaving the canvas blank (scrubbing ahead of the lazy load,
 * or a slow network) — never nothing on screen.
 */
export const ScrollFrameSequence = forwardRef<ScrollFrameSequenceHandle, Props>(
  function ScrollFrameSequence({ frameUrls, fallbackSrc, alt, reducedMotion, className, style }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
    const loadedRef = useRef<boolean[]>([]);
    const drawnIndexRef = useRef(-1);
    const lastRequestedIndexRef = useRef(0);
    const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

    useImperativeHandle(
      ref,
      () => ({
        setProgress(p: number) {
          const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
          const idx = Math.round(clamped * (frameUrls.length - 1));
          lastRequestedIndexRef.current = idx;
          drawFrame(idx);
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- drawFrame is a stable closure over refs only, redefining it per frameUrls identity is intentional below
      [frameUrls],
    );

    function nearestLoadedIndex(idx: number): number {
      const loaded = loadedRef.current;
      if (loaded[idx]) return idx;
      for (let d = 1; d < loaded.length; d++) {
        if (idx - d >= 0 && loaded[idx - d]) return idx - d;
        if (idx + d < loaded.length && loaded[idx + d]) return idx + d;
      }
      return -1;
    }

    function drawFrame(idx: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const drawIdx = nearestLoadedIndex(idx);
      if (drawIdx === -1 || drawIdx === drawnIndexRef.current) return;
      const img = imagesRef.current[drawIdx];
      if (!img) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      drawnIndexRef.current = drawIdx;
    }

    // Size the canvas backing store to the container's own rendered box
    // (devicePixelRatio capped at 2 — a 48-frame x 4x-dpr backing store is
    // wasted memory/paint cost for marginal sharpness past 2x).
    useLayoutEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      function applySize() {
        const rect = container!.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (sizeRef.current.w === w && sizeRef.current.h === h) return;
        sizeRef.current = { w, h, dpr };
        canvas!.width = w;
        canvas!.height = h;
        drawnIndexRef.current = -1; // force a redraw at the new size
        drawFrame(lastRequestedIndexRef.current);
      }

      applySize();
      const ro = new ResizeObserver(applySize);
      ro.observe(container);
      return () => ro.disconnect();
      // drawFrame is a stable closure over refs only (no reactive values) — redefining this effect per render isn't needed
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load frame 0 eagerly, then the rest once the component is within
    // roughly a viewport of the screen.
    useLayoutEffect(() => {
      if (reducedMotion || frameUrls.length === 0) return;
      const container = containerRef.current;
      if (!container) return;

      imagesRef.current = new Array(frameUrls.length).fill(null);
      loadedRef.current = new Array(frameUrls.length).fill(false);
      let cancelled = false;

      function loadOne(i: number, eager: boolean) {
        const img = new Image();
        if (eager) img.fetchPriority = "high";
        img.decoding = "async";
        img.src = frameUrls[i];
        imagesRef.current[i] = img;
        img
          .decode()
          .catch(() => {}) // decode() can reject on some browsers for reasons that don't affect onload firing
          .finally(() => {
            if (cancelled) return;
            loadedRef.current[i] = true;
            if (i === lastRequestedIndexRef.current || drawnIndexRef.current === -1) {
              drawFrame(lastRequestedIndexRef.current);
            }
          });
      }

      loadOne(0, true);
      drawFrame(0);

      const io = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          for (let i = 1; i < frameUrls.length; i++) loadOne(i, false);
        },
        { rootMargin: LAZY_ROOT_MARGIN },
      );
      io.observe(container);

      return () => {
        cancelled = true;
        io.disconnect();
      };
      // frameUrls is treated as a stable identity by callers (a module-level array), same convention as this project's other effect deps that intentionally don't track array contents
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reducedMotion]);

    if (reducedMotion) {
      return (
        <div ref={containerRef} className={className} style={style}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fallbackSrc}
            alt={alt ?? ""}
            aria-hidden={alt ? undefined : true}
            role={alt ? "img" : undefined}
            className="h-full w-full object-contain"
          />
        </div>
      );
    }

    return (
      <div ref={containerRef} className={className} style={style}>
        <canvas
          ref={canvasRef}
          aria-hidden={alt ? undefined : true}
          role={alt ? "img" : undefined}
          aria-label={alt}
          className="h-full w-full"
          style={{ display: "block", objectFit: "contain" }}
        />
      </div>
    );
  },
);
