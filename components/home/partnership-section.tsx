"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SectionBadge } from "@/components/SectionBadge";
import { ScrollFrameSequence, type ScrollFrameSequenceHandle } from "@/components/shared/scroll-frame-sequence";

// ---- Fluid insets — same clamp formulas as StatsSection (Figma's own
// 60px/40px section padding at its 1440 reference width). ----
const SIDE_INSET = "clamp(16px, 2.8vw, 64px)";
const VERTICAL_INSET = "clamp(24px, 4.17vw, 96px)";
const CONTENT_MAX_WIDTH_PX = 1600; // matches StatsSection's own CARD_MAX_WIDTH_PX

// ---- Left column width ----
// Figma's two copy TEXT nodes are each individually a FIXED width, not a
// shared column: the Geotab block is 577px wide, the Feizm block 616px
// (read directly off each node's own `width` in Figma, confirmed via
// `figma-cli eval` — not a HUG-to-content artifact, both report
// `sizeH: "FIXED"`), each sized just narrow enough to wrap its own copy
// into exactly 2 lines. A real two-column layout needs ONE shared left-
// column width, so this uses the wider of the two (616px) — verified live
// that the Geotab copy still wraps to exactly 2 lines at 616px too (see
// this component's own Step-3 verification), so nothing is lost by
// sharing one width instead of Figma's two slightly different ones.
const COPY_MAX_WIDTH_PX = 616;

// ---- Vertical scroll distances around/between the two copy blocks
// (named per the brief, which explicitly invited adjusting these: "adjust
// if Figma's spacing suggests otherwise"). Figma has no equivalent values
// to read here (this scrolling structure doesn't exist in Figma at all —
// see this component's own doc comment). Three separate constants, not
// one, because they fix three different problems:
//   - LEAD_IN_VH (before copy 1): without this, copy 1 starts at the
//     exact same scroll position as the device's own sticky column (both
//     begin at the row's top), so by the time the device has scrolled up
//     enough to actually STICK, copy 1 has ALREADY scrolled most of the
//     way past — confirmed directly, this is exactly why the rotation
//     used to visibly happen off-screen before the device ever caught.
//     Giving copy 1 a head start (sitting further down the row) means the
//     device reaches its stuck position around the same time copy 1 is
//     still comfortably low in the viewport, not already leaving.
//     `(0.75 * viewport height) - header height` is the target (copy 1's
//     own "75% down the viewport" entrance should line up with the
//     moment the device sticks); 65vh approximates that at a 900px-tall
//     viewport without hard-coding a px value that wouldn't scale. The
//     progress math below also takes `max(stick point, copy-1-at-75%)`
//     as a safety net, so small imprecision here never lets rotation
//     start before the device is genuinely stuck.
//   - COPY_GAP_VH (between copy 1 and copy 2): was 130, which left an
//     all-device, no-copy gap on screen for a wide stretch of scroll
//     (confirmed: copy 1 fully gone, copy 2 still ~1140px below, nothing
//     but the device on screen) — shrunk to 45 so copy 2 starts entering
//     from the bottom before copy 1 has fully left the top (verified: see
//     this component's own Step-3 notes for the exact visible-range math).
//   - TRAIL_VH (after copy 2): new. This section is still the LAST thing
//     on the page, so without deliberate room after copy 2, the document
//     simply ends before copy 2 can reach its own "settled" position —
//     scrolling stops with copy 2 stuck low in the viewport and the
//     device never gets to hold its final lit state before releasing.
//     50vh gives copy 2 room to reach that position AND gives the device
//     a short hold afterward before it releases — real document height,
//     not just the scroll-clamp safety net (which still exists below for
//     belt-and-braces, but this is the actual fix).
const LEAD_IN_VH = 65;
const COPY_GAP_VH = 45;
const TRAIL_VH = 50;

// ---- Mobile (<1024px) sticky device height — confirmed with the user
// (AskUserQuestion) before building: device sticky near the top at
// ~45vh, copy scrolling underneath, rather than the two-column layout.
const MOBILE_DEVICE_VH = 45;

// ---- Badge -> heading gap (desktop left column) ----
// Checked every other section with a badge directly above a heading
// before picking this: WhyFeizm uses `--fig-spacing-32` (32px),
// AchievementSection uses `--fig-spacing-22` (22px), PeopleSection1 uses
// a literal 45px — three different values, each read off that section's
// OWN Figma frame, not one shared convention. Since there's no single
// precedent to match, this uses the user's own fallback instruction: 24px
// at the 1440 reference width, scaled fluidly the same way every other
// spacing value in this component is (ratio-of-1440, clamped).
const BADGE_HEADING_GAP = "clamp(16px, 1.667vw, 24px)";

// ---- Desktop device vertical centering ----
// The device's own rendered box (ScrollFrameSequence's canvas) must stay
// fully visible — including its baked-in drop shadow and the bottom
// mounting tab, both part of the same square frame image, not separate
// elements — with at least this much clearance from the viewport's own
// bottom edge while stuck. Applied symmetrically (see the centering
// effect below), so it's really "visually centered in the space below
// the header, with a floor on how close either edge gets."
const DEVICE_BOTTOM_CLEARANCE_PX = 40;

// ---- Scroll-linked background (peach -> white) ----
// Start matches the Services section above (seamless hand-off, confirmed
// live rather than assumed) and end matches "Home / 06 Industries"'s own
// solid white fill (read live via figma-cli — also confirmed, not
// assumed, so Partnership's own end color hands off with no seam on the
// OTHER side either, for free).
const BG_START_COLOR = "#FEEFEA";
const BG_END_COLOR = "#FFFFFF";
const BG_START_RGB = hexToRgb(BG_START_COLOR);
const BG_END_RGB = hexToRgb(BG_END_COLOR);

// ---- Device frame sequence (public/illustrations/device/, copied from
// ~/Downloads/device-scroll/ — see that folder's own README.md for the
// authoritative timeline baked into the 48 frames themselves):
//   0.00-0.10 back view, held
//   0.10-0.70 rotates to the 3/4 front-top view (ease baked into the
//     frames, not re-applied here — see ScrollFrameSequence's own comment)
//   0.70-0.80 settled, LEDs off
//   0.80-0.95 LEDs light red -> green -> blue
//   0.95-1.00 final lit state, held
const FRAME_COUNT = 48;
const DEVICE_FRAME_URLS = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/illustrations/device/frames/frame_${String(i).padStart(2, "0")}.webp`,
);
const DEVICE_FALLBACK_SRC = "/illustrations/device/device-final-lit.webp";

// ---- Device progress (p) phases ----
const P_START = 0;
const P_COPY1_DONE = 0.7;
const P_COPY2_START = 0.8;
const P_COPY2_DONE = 1;

// Viewport-height fractions that drive the breakpoints — "copy 1 travels
// from ~75% to ~35% of the viewport height" etc, per the brief. Applied
// to each copy wrapper's own TOP edge (not its center), consistently for
// both copy blocks.
const COPY1_ENTER_FRAC = 0.75;
const COPY1_SETTLE_FRAC = 0.35;
const COPY2_ENTER_FRAC = 0.75;
const COPY2_SETTLE_FRAC = 0.45;

// ---- Reveal ("rises in once", joinsystems.co-style) ----
const REVEAL_TRANSLATE_PX = 40;
const REVEAL_DURATION_MS = 800;
const REVEAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
// Shrinking the IntersectionObserver's effective root by 15% from the
// bottom is the standard way to express "fires when the element's top
// crosses 85% down the viewport".
const REVEAL_ROOT_MARGIN = "0px 0px -15% 0px";

// ---- Optional focus-dim — built behind a flag per the brief ("build it
// behind a flag and show me both"). OFF by default: without it, both
// copy blocks simply stay fully visible once revealed, per the brief's
// own default behavior. Flip to `true` to compare.
const ENABLE_FOCUS_DIM = false;
const FOCUS_DIM_OPACITY = 0.35;
const FOCUS_DIM_MS = 300;
// Switches at the midpoint of the 0.70->0.80 "between copies" gap — the
// one p value with no better claim to either copy block.
const FOCUS_DIM_SWITCH_P = (P_COPY1_DONE + P_COPY2_START) / 2;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
// Hoisted (function declaration, not a const arrow) so BG_START_RGB /
// BG_END_RGB above can call it at module-evaluation time, before this
// point in the file is reached line-by-line.
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Same live measurement StatsSection/SiteHeader/ScrollLink all use for
// the header's own rendered height.
function headerHeightPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

const COPY = {
  geotab: "Geotab brings #1-ranked telematics platform (ABI Research) and GO devices & global data",
  feizm: "Feizm brings On-site deployment, training for your team, local support with same time zone",
};

/**
 * Wires up one reveal-once block: starts hidden (opacity 0, translateY
 * `REVEAL_TRANSLATE_PX`) and animates to visible the first time `wrapper`
 * crosses `REVEAL_ROOT_MARGIN`'s threshold, then disconnects — it never
 * re-hides on scroll back up. If `wrapper` has ALREADY crossed that
 * threshold by the time observation starts (page loaded mid-section, or
 * landed via an anchor link), it's shown immediately with `transition:
 * none`, per the brief ("show it immediately without animating").
 *
 * That "already past" case is decided from the IntersectionObserver's
 * OWN first callback (`isFirstCallback` below), NOT a synchronous
 * `getBoundingClientRect()` check made before the observer is even
 * attached — an earlier version did exactly that and had a confirmed
 * bug: `useLayoutEffect` runs essentially as soon as this component
 * mounts, which can be BEFORE other, heavier components earlier on the
 * page (the hero parallax, in particular) finish their own async height
 * adjustments. At that moment the document can still be far shorter than
 * its settled height, so a synchronous check read the wrapper as "close
 * to the top of a short page" and revealed it immediately — even though,
 * once the page finished settling a few hundred ms later, the wrapper's
 * true position was thousands of px below the viewport. Confirmed
 * directly: this is exactly why copy 2 was showing at opacity 1 while
 * still ~1100px off-screen. An IntersectionObserver callback is always
 * computed against current, stable layout (the browser schedules it
 * after layout settles, not synchronously inside the effect that created
 * it), so deciding from its first callback instead has no equivalent
 * failure mode — it cannot fire against a layout that hasn't settled yet
 * the way a same-tick synchronous read can.
 *
 * `wrapper` and `text` are separate elements (not always the same node):
 * `wrapper` is what gets observed (a plain, never-transformed box),
 * `text` is what actually receives the opacity/transform styles.
 * Splitting them matters for the copy blocks specifically — their
 * `wrapper` is also what the device-progress effect below measures for
 * scroll breakpoints, and measuring a node that's mid-translateY would
 * read a few px off from its true document position.
 */
function setupReveal(wrapper: HTMLElement, text: HTMLElement, onRevealed?: () => void): () => void {
  text.style.opacity = "0";
  text.style.transform = `translateY(${REVEAL_TRANSLATE_PX}px)`;

  let isFirstCallback = true;
  const io = new IntersectionObserver(
    (entries) => {
      const wasFirstCallback = isFirstCallback;
      isFirstCallback = false;
      if (!entries[0].isIntersecting) return;
      text.style.transition = wasFirstCallback
        ? "none"
        : `opacity ${REVEAL_DURATION_MS}ms ${REVEAL_EASE}, transform ${REVEAL_DURATION_MS}ms ${REVEAL_EASE}`;
      text.style.opacity = "1";
      text.style.transform = "translateY(0px)";
      onRevealed?.();
      io.disconnect();
    },
    { rootMargin: REVEAL_ROOT_MARGIN },
  );
  io.observe(wrapper);
  return () => io.disconnect();
}

/**
 * "Partnership" section of the Feizm Homepage ("Home / 05 Partnership",
 * node 212:343205, read live via `figma-cli`) — joinsystems.co-style
 * structure: the device stays fixed on the right while the copy column
 * scrolls normally on the left, replacing an earlier full-section-pin
 * build (see git history) that put both copy blocks at one fixed spot
 * and crossfaded between them, which wasn't what was asked for.
 *
 * ---- What Figma actually has vs. what this builds ----
 * Figma's own frame is fully static: a badge+heading row, then TWO
 * identical rows (copy left, 624x624 device image right) stacked 120px
 * apart, and both device images are pixel-identical to the supplied
 * `device-final-lit.png` — the same static asset placed twice, not two
 * different illustrations or states. No prototype/reaction data exists
 * on any node in this frame. The scroll-scrubbed rotation/reveal below is
 * a deliberate web-only enhancement, confirmed with the user:
 *   - ONE device (not two) sits sticky on the right for the whole
 *     section, cycling its 48-frame rotation via `ScrollFrameSequence`
 *     as the copy column scrolls past it
 *   - the badge ("Partnership", byte-identical styling to the existing
 *     `SectionBadge`) and heading ("Global technology\nLocal people who
 *     make it work", 42px/43px Hanken Grotesk, no trailing periods per
 *     the user's own copy edit) keep their own styling, but NOT Figma's
 *     layout: Figma puts the badge top-right, same row as the heading.
 *     This deliberately deviates from that (badge moved above the
 *     heading, left-aligned, inside the LEFT column on desktop — see
 *     "Structure" below for why) per the user's own request, confirmed
 *     rather than assumed; Figma itself was NOT modified, so its frame
 *     still shows the old top-right placement until someone updates it
 *     there too
 *   - copy width uses a single shared 616px column (`COPY_MAX_WIDTH_PX`
 *     — see its own comment for why, given Figma's two text boxes are
 *     577/616 individually)
 *   - the hidden "Partner Logos" row (9 logos incl. Esri, `visible:
 *     false` in Figma) stays left out, same as the previous build
 *   - Figma's own flat background is a #FEEFEA -> #FFFFFF gradient
 *     stretched over the whole frame; this now SCROLL-LINKS that same
 *     pair of colors into a single interpolated solid instead (see
 *     "Scroll-linked background" below) rather than reproducing a static
 *     gradient — a deliberate web-only enhancement, not assumed from
 *     Figma, matching `--fig-color-brand-50`'s own resolved value for
 *     the start color so it's the same peach either way
 *
 * ---- Structure ----
 * A single relative section, no section-level pin, either (>=1024px) a
 * two-column flex row or (<1024px) a single stacked column — see "Below
 * 1024px" further down. `headingBlock` (badge above heading, left-
 * aligned, `BADGE_HEADING_GAP` between them) is one JSX value rendered in
 * a DIFFERENT position per layout, not a fixed shared row above
 * everything the way it used to be:
 *   - Desktop: the FIRST thing in the LEFT column, followed by the
 *     `LEAD_IN_VH` spacer, copy 1, etc. The RIGHT column (device) is now
 *     a plain sibling of the left column with no heading row above it —
 *     it starts level with the badge, not below the heading, which is
 *     the actual fix for the complaint that started this: the right
 *     column used to start BELOW the heading+badge row (badge was a
 *     sibling of the heading, both outside/above the two-column split),
 *     pushing the device down far enough that its bottom (shadow +
 *     mounting tab) got cut off by the viewport. Moving the badge beside
 *     the heading inside the left column, and making the two-column row
 *     itself start where that combined block starts, removes that whole
 *     extra row's height from the right column's starting position —
 *     confirmed directly (see the centering effect below for exactly how
 *     much this moved the device up).
 *   - Reduced motion / mobile: still a plain sibling ABOVE the rest of
 *     the content, same position as before — only its OWN internal
 *     layout changed (badge above heading instead of beside it); neither
 *     of these had the "device starts late" problem the desktop
 *     restructure fixes, since neither puts the device in a column
 *     that's a sibling of the heading row to begin with.
 *   - Copy: copy 1, a `COPY_GAP_VH` spacer, copy 2 — all in normal
 *     document flow, real HTML text, reading order preserved.
 *   - Device: a `position: sticky` box, sized/positioned so it reads as
 *     "stays in place" while the copy scrolls past (standard sticky-
 *     sidebar technique) until its own containing block's bottom edge
 *     approaches, at which point it releases and scrolls away with the
 *     rest of the section — no separate release logic, this falls out of
 *     `position: sticky` for free. On desktop that containing block is
 *     the RIGHT column, grown to match the LEFT column's height by the
 *     flex row's own default `align-items: stretch` (no JS height math
 *     needed for this part).
 *
 * The device's own containing block needs to be MEANINGFULLY taller than
 * the sticky box itself for this to actually be visible (confirmed
 * directly: at `COPY_GAP_VH`'s first value, 80, the two were within
 * ~15px of each other — technically still spec-correct, briefly
 * sticking, but imperceptible to a scrolling user, and even unreliable
 * under automated headless-Chromium checks specifically, which were
 * separately confirmed to under-render `position: sticky` in this exact
 * tight-margin situation where a real Chromium window does stick — see
 * `COPY_GAP_VH`'s own comment). 130 gives several hundred px of genuine
 * stuck room on desktop; `MOBILE_DEVICE_VH`'s much shorter box leaves
 * comparatively enormous slack by the same logic.
 *
 * ---- Desktop device centering (no cropping) ----
 * The sticky box's OWN height, before this, was never actually measured
 * against the viewport — `top: var(--header-h)` just pinned it directly
 * under the header with no regard for whether the box (624px at its
 * largest) plus the header height together exceeded a SHORT viewport,
 * which is exactly how its bottom — the drop shadow and the mounting tab,
 * both baked into the same square frame image, not separate elements —
 * ended up clipped by the viewport's own bottom edge.
 *
 * Two independent fixes, not one:
 *   - The device's own max size is now also capped by the viewport's
 *     available height (`calc(100svh - var(--header-h) - 2 *
 *     DEVICE_BOTTOM_CLEARANCE_PX)`, folded into the SAME `width`
 *     min()` the 624px/90%-of-column caps already used — aspect-ratio
 *     1:1 means a width cap is also a height cap here, so this needed no
 *     separate max-height rule that could fight the aspect-ratio for the
 *     non-constrained axis). On a short viewport, this SHRINKS the
 *     device instead of letting it overflow.
 *   - A small effect (`deviceBoxRef`, desktop only) measures the device's
 *     own ACTUAL rendered size (via the same canvas element
 *     `canvasElRef` already finds, not the sticky wrapper itself — that
 *     wrapper has no explicit width of its own, so it reports the RIGHT
 *     COLUMN's width, not the device's) and sets the sticky box's `top`
 *     to `headerH + max(DEVICE_BOTTOM_CLEARANCE_PX, (availableHeight -
 *     deviceSize) / 2)` — i.e. vertically centered in the space below
 *     the header, with the clearance floor applying if centering alone
 *     wouldn't give at least that much room (it always does once the
 *     width cap above is in effect, but the floor is the actual
 *     guarantee, not a coincidence of the two numbers happening to agree).
 *     Re-runs in the same `measure()` pass as everything else (resize,
 *     document-height change) — never on a scroll tick, since neither the
 *     device's size nor the viewport's height change while scrolling.
 *
 * Reusing the full `100svh - header` height as the sticky box's OWN
 * height (instead of just its `top` offset) was deliberately rejected
 * for this — confirmed directly, in an earlier build, that it revives
 * the exact "early release" bug `COPY_GAP_VH`'s own comment describes:
 * the box's bottom edge would then sit at the viewport's own bottom edge
 * with zero slack, releasing as soon as the row's bottom reaches the
 * viewport bottom rather than once copy 2 has actually settled.
 *
 * ---- Device progress (p) — tied to copy position AND the device's own
 * stick point, not a pin formula ----
 * Four scroll-position breakpoints, each measured once (via
 * `getBoundingClientRect() + window.scrollY` on a plain, never-sticky,
 * never-transformed wrapper — never re-read on every scroll tick):
 *   b0 = max(deviceStickY, copy1TopY - 0.75*viewportH)
 *   b1 = copy1TopY - 0.35*viewportH
 *   b2 = copy2TopY - 0.75*viewportH
 *   b3 = copy2TopY - 0.45*viewportH
 * where `deviceStickY` is the scrollY at which the device's own sticky
 * box first catches (`deviceColumnRef`'s own absolute top minus the
 * header height — see `headerHeightPx()`). `p` is piecewise-linear:
 * b0->b1 maps 0->0.70, b1->b2 maps 0.70->0.80, b2->b3 maps 0.80->1.00.
 *
 * The `max()` in b0 is the fix for a real, confirmed bug in an earlier
 * build: copy 1 and the device both start at the SAME scroll position
 * (the row's own top), so by the time the device had scrolled up enough
 * to actually stick, copy 1 had already scrolled most of the way past —
 * the whole rotation played out off-screen, stuck looking nearly done by
 * the time the device caught. `LEAD_IN_VH` (above) gives copy 1 a head
 * start so the two moments land close together on their own, and the
 * `max()` is the hard guarantee underneath that: p cannot leave 0 until
 * the device has GENUINELY caught, no matter how viewport height or
 * content changes shift the lead-in's exact alignment.
 *
 * `b3` (and, chained through it, b0-b2) is ALSO clamped against the
 * document's real max scrollY — same technique as `UspDividerDot`
 * (components/fleet/usp-divider-dot.tsx) — as a safety net on top of
 * `TRAIL_VH`'s real document space, not a replacement for it: this is
 * still the last section on the page, and the clamp is what keeps p
 * reaching exactly 1 even on a viewport/content combination where
 * `TRAIL_VH` isn't quite enough. A `ResizeObserver` on `document.body`
 * re-measures whenever the document's total height changes (more
 * sections added below later), so the clamp stops mattering entirely
 * once real content after this section provides the room on its own.
 *
 * `measure()` (breakpoints) and `paint()` (p + device draw, reads
 * `window.scrollY` only) are split the same way as `UspDividerDot` for
 * the same reason: `paint()` runs on every scroll tick and must stay
 * cheap (no `getBoundingClientRect()` in that path), while `measure()`
 * only needs to re-run on resize / document-height change.
 *
 * ---- Scroll-linked background (peach -> white) ----
 * Two MORE breakpoints, measured in the exact same `measure()` pass as
 * b0-b3 above (same scroll tick, no separate listener, per the brief):
 *   bgStartY = sectionTopAbs - headerH   (section's own top reaches the
 *     top of the viewport, i.e. right under the fixed header)
 *   bgEndY = b1                          (copy 1 at 35% down the viewport
 *     — reused directly, not recomputed: it's the exact same moment the
 *     brief asks for, "by the time the device has finished rotating")
 * `paint()` turns that into `bgT = easeInOutCubic(clamp01((scrollY -
 * bgStartY) / (bgEndY - bgStartY)))` and writes ONE CSS custom property,
 * `--partnership-bg`, as a plain `rgb(...)` string — each channel
 * lerped directly in sRGB (`hexToRgb` + `lerp`, both already defined
 * above for other reasons).
 *
 * An earlier version used `color-mix(in oklch, ...)` instead, reasoning
 * that OKLCH's perceptual uniformity would avoid a muddy midpoint — but
 * that was a solution to a problem these two colors don't actually have
 * (they're close together and both near-white, nothing here was ever
 * going muddy), and it introduced a REAL one: peach and white are both
 * low-chroma colors, which OKLCH represents with a "powerless" (ill-
 * defined) hue component, and interpolating hue between two powerless
 * values is explicitly browser-dependent per spec — confirmed directly,
 * the user's own Chrome rendered a visibly pink/rose midpoint that never
 * showed up in this project's own testing tools, because their engine
 * picked a different hue to interpolate through than ours did. Plain
 * sRGB lerp has no hue channel to go wrong in the first place, and for
 * two colors this close together it can't produce mud either — the
 * "OKLCH to avoid mud" concern only bites when interpolating between
 * distant, saturated hues, which this never was.
 *
 * The color lives on ONE custom property set on the section element
 * itself, read by two different consumers via `var(--partnership-bg, ...)`
 * — the full-bleed sticky background layer (next) AND, on the mobile
 * layout only, the sticky device box's own backdrop (it needs to stay
 * opaque against the copy scrolling underneath it, same reasoning as
 * before, but now tracking the live color instead of a fixed tone so it
 * never visibly mismatches the backdrop it sits on). One write, two
 * readers, always in sync.
 *
 * The layer itself: `position: sticky; top: 0; height: 100vh;
 * margin-bottom: -100vh` — the standard "sticky background, zero layout
 * footprint" technique. `top: 0` (not `var(--header-h)`) and `height:
 * 100vh` (not `100svh - header`) deliberately: this needs to paint
 * behind the fixed header too (the brief explicitly calls out checking
 * the header's own contrast against it), not just the content area under
 * it, so it has to cover the FULL viewport, not the under-header region
 * the device/copy layouts use elsewhere in this component. The negative
 * margin pulls the next sibling up by the same amount, so this costs zero
 * extra document height despite declaring `100vh` — confirmed directly,
 * section height is unchanged from before this feature.
 *
 * Reduced motion keeps Figma's own static linear-gradient entirely
 * untouched (no custom property, no sticky layer at all) — per the brief.
 *
 * ---- Reveal ----
 * `setupReveal()` (above) handles the heading+badge row and each copy
 * block identically — hidden until ~85% down the viewport, then rises in
 * once, never re-hides. The optional focus-dim (`ENABLE_FOCUS_DIM`) only
 * ever dims a block AFTER it has revealed (tracked via
 * `copy{1,2}RevealedRef`) — otherwise a not-yet-revealed block could be
 * nudged to 0.35 opacity by the dim logic before its own reveal animation
 * ever ran, which would show it prematurely instead of rising in from
 * fully hidden.
 *
 * ---- Reduced motion ----
 * The ONLY path that skips sticky/reveal/scrub entirely: both copy
 * blocks stacked and visible with `device-final-lit.webp` as a plain
 * image — this is Figma's own static design at p=1, not an arbitrary
 * stand-in.
 *
 * ---- Below 1024px ----
 * Proposed to the user and confirmed (not guessed) before building: the
 * device stays sticky near the TOP of the screen at `MOBILE_DEVICE_VH`
 * (~45vh) instead of a right column, with both copy blocks stacked
 * underneath it in normal flow. Same `position: sticky` mechanism, same
 * reveal/progress wiring (`copy{1,2}WrapRef`, `setupReveal`, the
 * breakpoint math) — only the JSX arrangement differs; p is computed
 * purely from the copy blocks' own position, which doesn't care whether
 * they're laid out beside the device or below it.
 */
export function PartnershipSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headingWrapRef = useRef<HTMLDivElement | null>(null);
  const copy1WrapRef = useRef<HTMLDivElement | null>(null);
  const copy1TextRef = useRef<HTMLParagraphElement | null>(null);
  const copy2WrapRef = useRef<HTMLDivElement | null>(null);
  const copy2TextRef = useRef<HTMLParagraphElement | null>(null);
  // The sticky box's own DIRECT PARENT (never itself sticky, so its
  // getBoundingClientRect() is always reliable regardless of the child's
  // current stuck/unstuck state) — see this component's own doc comment
  // for why `deviceStickY` is derived from this, not from the sticky
  // element itself.
  const deviceColumnRef = useRef<HTMLDivElement | null>(null);
  // The sticky box ITSELF (desktop only) — its own `top` is what the
  // centering effect in measure() adjusts. Unlike deviceColumnRef, this
  // one genuinely is the sticky element, not its parent.
  const deviceBoxRef = useRef<HTMLDivElement | null>(null);
  const deviceRef = useRef<ScrollFrameSequenceHandle | null>(null);
  // Found once in measure() (not on every scroll tick) purely so paint()
  // can stamp `data-progress` on it for QA — see paint()'s own comment.
  // Also doubles as the device-centering effect's own size measurement
  // (the canvas's rendered width/height, not the sticky wrapper's own —
  // see this component's "Desktop device centering" doc comment for why).
  const canvasElRef = useRef<HTMLElement | null>(null);

  const copy1RevealedRef = useRef(false);
  const copy2RevealedRef = useRef(false);

  // Scroll-position breakpoints (abs document Y, px) — see this
  // component's own doc comment for b0..b3's meaning.
  const b0Ref = useRef(0);
  const b1Ref = useRef(1);
  const b2Ref = useRef(2);
  const b3Ref = useRef(3);
  // Background breakpoints (abs document Y, px) — see this component's
  // own "Scroll-linked background" doc comment for what these mean.
  const bgStartYRef = useRef(0);
  const bgEndYRef = useRef(1);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [inView, setInView] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as every other reducedMotion state in this project
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia has no SSR-safe value, same tradeoff as the reducedMotion check above
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      rootMargin: "100% 0px 100% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ---- Reveal wiring (heading row + both copy blocks) ----
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const cleanups: Array<() => void> = [];
    if (headingWrapRef.current) {
      cleanups.push(setupReveal(headingWrapRef.current, headingWrapRef.current));
    }
    if (copy1WrapRef.current && copy1TextRef.current) {
      cleanups.push(
        setupReveal(copy1WrapRef.current, copy1TextRef.current, () => {
          copy1RevealedRef.current = true;
        }),
      );
    }
    if (copy2WrapRef.current && copy2TextRef.current) {
      cleanups.push(
        setupReveal(copy2WrapRef.current, copy2TextRef.current, () => {
          copy2RevealedRef.current = true;
        }),
      );
    }
    return () => cleanups.forEach((fn) => fn());
    // `isDesktop` is a dependency even though this effect never reads it
    // directly: it decides which JSX branch (and therefore which actual
    // DOM nodes `copy1WrapRef` etc. point to) is mounted. `isDesktop`
    // defaults to `true` and is corrected to its real value shortly after
    // mount (see its own matchMedia effect) — on an actual mobile
    // viewport, that correction unmounts the desktop branch and mounts
    // the mobile one, re-attaching every ref to BRAND NEW nodes. Without
    // this dependency, this effect only ran once, against the ORIGINAL
    // (desktop) nodes that no longer exist — confirmed directly: on
    // mobile, the copy blocks sat at opacity 1 from the very first frame
    // because `setupReveal` had never been called on the real, mounted
    // paragraphs at all.
  }, [reducedMotion, isDesktop]);

  // ---- Device progress (p), tied to copy position AND the device's own
  // stick point — see this component's own doc comment for the full
  // breakpoint math. ----
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const copy1 = copy1WrapRef.current;
    const copy2 = copy2WrapRef.current;
    const deviceColumn = deviceColumnRef.current;
    if (!copy1 || !copy2 || !deviceColumn) return;
    // Re-query fresh on every effect restart (e.g. the isDesktop switch
    // this effect's own dependency comment explains) — the previously
    // found canvas may belong to a branch that just unmounted.
    canvasElRef.current = null;

    function measure() {
      const viewportH = window.innerHeight;
      const headerH = headerHeightPx();
      const r1 = copy1!.getBoundingClientRect();
      const r2 = copy2!.getBoundingClientRect();
      const rDevice = deviceColumn!.getBoundingClientRect();
      const copy1TopAbs = r1.top + window.scrollY;
      const copy2TopAbs = r2.top + window.scrollY;
      const deviceColumnTopAbs = rDevice.top + window.scrollY;
      const deviceStickY = deviceColumnTopAbs - headerH;
      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - viewportH);

      const raw0 = Math.max(deviceStickY, copy1TopAbs - COPY1_ENTER_FRAC * viewportH);
      const raw1 = copy1TopAbs - COPY1_SETTLE_FRAC * viewportH;
      const raw2 = copy2TopAbs - COPY2_ENTER_FRAC * viewportH;
      const raw3 = copy2TopAbs - COPY2_SETTLE_FRAC * viewportH;

      // Clamp monotonically against the document's real max scroll (see
      // this component's own doc comment — same technique as
      // UspDividerDot) and guard against a degenerate (zero-width) range
      // between adjacent breakpoints, which would divide by ~0 below.
      const c0 = Math.min(raw0, maxScrollY);
      const c1 = Math.max(Math.min(raw1, maxScrollY), c0 + 1);
      const c2 = Math.max(Math.min(raw2, maxScrollY), c1);
      const c3 = Math.max(Math.min(raw3, maxScrollY), c2 + 1);

      b0Ref.current = c0;
      b1Ref.current = c1;
      b2Ref.current = c2;
      b3Ref.current = c3;

      // Background breakpoints — see this component's own "Scroll-linked
      // background" doc comment. bgEndY reuses c1 directly (not a fresh
      // copy1TopAbs - 0.35*viewportH computation): it's the exact same
      // moment, and reusing it keeps the two features from drifting apart
      // if the device-progress math above ever changes.
      if (sectionRef.current) {
        const sectionTopAbs = sectionRef.current.getBoundingClientRect().top + window.scrollY;
        bgStartYRef.current = sectionTopAbs - headerH;
        bgEndYRef.current = Math.max(c1, bgStartYRef.current + 1);
      }

      if (!canvasElRef.current) {
        canvasElRef.current = deviceColumn!.querySelector('canvas[aria-label="Telematics device"]');
      }

      // Desktop device centering — see this component's own "Desktop
      // device centering" doc comment. Only runs when deviceBoxRef is
      // actually mounted (desktop only; null on mobile/reduced motion).
      if (deviceBoxRef.current && canvasElRef.current) {
        const deviceSize = canvasElRef.current.getBoundingClientRect().width;
        const availH = viewportH - headerH;
        const clearance = Math.max(DEVICE_BOTTOM_CLEARANCE_PX, (availH - deviceSize) / 2);
        deviceBoxRef.current.style.top = `${headerH + clearance}px`;
      }
    }

    function progressFor(scrollY: number) {
      const b0 = b0Ref.current;
      const b1 = b1Ref.current;
      const b2 = b2Ref.current;
      const b3 = b3Ref.current;
      if (scrollY <= b0) return P_START;
      if (scrollY >= b3) return P_COPY2_DONE;
      if (scrollY <= b1) return lerp(P_START, P_COPY1_DONE, (scrollY - b0) / (b1 - b0));
      if (scrollY <= b2) return lerp(P_COPY1_DONE, P_COPY2_START, (scrollY - b1) / (b2 - b1));
      return lerp(P_COPY2_START, P_COPY2_DONE, (scrollY - b2) / (b3 - b2));
    }

    function paint() {
      const scrollY = window.scrollY;
      const p = progressFor(scrollY);
      deviceRef.current?.setProgress(p);
      // Exposed for QA/verification only (e.g. `canvas.dataset.progress`
      // from a console or test script) — harmless in production, not
      // read by any other code in this component.
      if (canvasElRef.current) canvasElRef.current.dataset.progress = p.toFixed(4);

      // Scroll-linked background — see this component's own doc comment
      // for why this is a hand-rolled sRGB lerp, not color-mix(in oklch).
      // One write (a CSS custom property on the section), read by every
      // consumer via var(--partnership-bg, ...). Byte-exact at both ends
      // by construction (lerp at t=0/t=1 returns the endpoint exactly, no
      // color-space round trip to introduce drift) — important because
      // that exactness is what "no visible seam" at the Services hand-off
      // actually depends on.
      if (sectionRef.current) {
        const bgT = easeInOutCubic(clamp01((scrollY - bgStartYRef.current) / (bgEndYRef.current - bgStartYRef.current)));
        const r = Math.round(lerp(BG_START_RGB[0], BG_END_RGB[0], bgT));
        const g = Math.round(lerp(BG_START_RGB[1], BG_END_RGB[1], bgT));
        const b = Math.round(lerp(BG_START_RGB[2], BG_END_RGB[2], bgT));
        sectionRef.current.style.setProperty("--partnership-bg", `rgb(${r}, ${g}, ${b})`);
      }

      if (ENABLE_FOCUS_DIM) {
        const t1 = copy1TextRef.current;
        const t2 = copy2TextRef.current;
        const copy1Active = p < FOCUS_DIM_SWITCH_P;
        if (t1 && copy1RevealedRef.current) {
          t1.style.transition = `opacity ${FOCUS_DIM_MS}ms ease`;
          t1.style.opacity = copy1Active ? "1" : `${FOCUS_DIM_OPACITY}`;
        }
        if (t2 && copy2RevealedRef.current) {
          t2.style.transition = `opacity ${FOCUS_DIM_MS}ms ease`;
          t2.style.opacity = copy1Active ? `${FOCUS_DIM_OPACITY}` : "1";
        }
      }
    }

    function update() {
      measure();
      paint();
    }

    update();
    if (!inView) return;

    let raf = 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(() => {
        paint();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    // Document height changes (more sections added below, images/fonts
    // loading further down the page) change `maxScrollY` and therefore
    // the b3 clamp — re-measure whenever that happens, not just on
    // viewport resize (same precedent as UspDividerDot).
    const bodyRO = new ResizeObserver(update);
    bodyRO.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      bodyRO.disconnect();
    };
    // `isDesktop` is a dependency for the same reason as the reveal
    // effect's own (see its comment) — it decides which DOM nodes
    // `copy1WrapRef`/`copy2WrapRef`/`deviceColumnRef` actually point to.
  }, [reducedMotion, isDesktop, inView]);

  // Badge above heading, left-aligned, BADGE_HEADING_GAP between them —
  // rendered in a different POSITION per layout below, not a fixed
  // shared row above everything (see this component's own "Structure"
  // doc comment for why).
  const headingBlock = (
    <div ref={headingWrapRef} className="flex w-fit flex-col items-start" style={{ gap: BADGE_HEADING_GAP }}>
      <SectionBadge label="Partnership" />
      <h2
        className="font-normal"
        style={{
          color: "var(--fig-color-neutral-900)",
          fontSize: "clamp(26px, 2.9vw, 42px)",
          lineHeight: 1.05,
          margin: 0,
        }}
      >
        Global technology
        <br />
        Local people who make it work
      </h2>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      aria-label="Partnership"
      className="relative w-full"
      // Reduced motion: Figma's own static gradient, untouched. Otherwise
      // no background here at all — the sticky layer below paints it,
      // driven by the live --partnership-bg custom property this
      // component's scroll-tick effect sets directly on this element.
      style={
        reducedMotion ? { background: "linear-gradient(180deg, var(--fig-color-brand-50) 0%, #FFFFFF 100%)" } : undefined
      }
    >
      {!reducedMotion && (
        <div
          aria-hidden
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            marginBottom: "-100vh",
            backgroundColor: `var(--partnership-bg, ${BG_START_COLOR})`,
          }}
        />
      )}
      <div
        className="mx-auto"
        style={{
          width: `calc(100% - 2 * ${SIDE_INSET})`,
          maxWidth: CONTENT_MAX_WIDTH_PX,
          paddingTop: VERTICAL_INSET,
          paddingBottom: VERTICAL_INSET,
          fontFamily: "var(--font-hanken-grotesk)",
        }}
      >
        {reducedMotion ? (
          <>
            {headingBlock}
            <div className="mt-16 flex flex-col items-center gap-10 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-col gap-8" style={{ maxWidth: COPY_MAX_WIDTH_PX, width: "100%" }}>
                <p
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px", margin: 0 }}
                >
                  {COPY.geotab}
                </p>
                <p
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px", margin: 0 }}
                >
                  {COPY.feizm}
                </p>
              </div>
              <ScrollFrameSequence
                frameUrls={DEVICE_FRAME_URLS}
                fallbackSrc={DEVICE_FALLBACK_SRC}
                alt="Telematics device"
                reducedMotion
                style={{ width: "min(60vw, 420px)", aspectRatio: "1 / 1", flexShrink: 0 }}
              />
            </div>
          </>
        ) : isDesktop ? (
          <div className="flex" style={{ gap: 120 }}>
            {/* LEFT column — heading block first (see headingBlock's own
                comment), then copy in normal document flow. */}
            <div className="shrink-0" style={{ width: `min(100%, ${COPY_MAX_WIDTH_PX}px)` }}>
              {headingBlock}
              <div aria-hidden className="mt-16" style={{ height: `${LEAD_IN_VH}vh` }} />
              <div ref={copy1WrapRef}>
                <p
                  ref={copy1TextRef}
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px", margin: 0 }}
                >
                  {COPY.geotab}
                </p>
              </div>
              <div aria-hidden style={{ height: `${COPY_GAP_VH}vh` }} />
              <div ref={copy2WrapRef}>
                <p
                  ref={copy2TextRef}
                  className="font-normal"
                  style={{ color: "var(--fig-color-neutral-900)", fontSize: "20px", lineHeight: "30px", margin: 0 }}
                >
                  {COPY.feizm}
                </p>
              </div>
              <div aria-hidden style={{ height: `${TRAIL_VH}vh` }} />
            </div>

            {/* RIGHT column — NO heading row above it any more: it starts
                level with the badge (see this component's own "Structure"
                doc comment for why that's the actual fix, not just a
                cosmetic reorder). Stretched by the flex row's own default
                align-items:stretch to match the LEFT column's height; the
                sticky box inside it is what actually stays put. Sized to
                the DEVICE itself (not a full `100svh - header` box) — see
                "Desktop device centering" for why, and for how `top` gets
                set to center it with clearance instead of just pinning it
                under the header. */}
            <div ref={deviceColumnRef} className="relative min-w-0 flex-1">
              <div ref={deviceBoxRef} style={{ position: "sticky", top: "var(--header-h)" }}>
                <ScrollFrameSequence
                  ref={deviceRef}
                  frameUrls={DEVICE_FRAME_URLS}
                  fallbackSrc={DEVICE_FALLBACK_SRC}
                  alt="Telematics device"
                  style={{
                    width: `min(624px, 90%, calc(100svh - var(--header-h) - ${2 * DEVICE_BOTTOM_CLEARANCE_PX}px))`,
                    aspectRatio: "1 / 1",
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {headingBlock}
            {/* `deviceColumnRef` goes on THIS outer wrapper, not a wrapper
                around just the sticky box — the sticky box's real CSS
                containing block (and therefore its actual stick-range) is
                its own PARENT's content box, which is this whole column
                (device + copy area together), not an isolated box around
                just the device. Wrapping only the device here would leave
                the sticky box with zero taller container to roam in and
                silently kill the stick effect — confirmed directly when
                first tried this way (see git history of this file). */}
            <div ref={deviceColumnRef} className="mt-10 flex flex-col">
              {/* Device — sticky near the top of the screen (not a full-
                  height box like desktop); the copy below it is what gives
                  this room to actually stick, same principle as the
                  desktop right column just rotated 90°. */}
              <div
                className="relative z-10 flex items-center justify-center"
                style={{
                  position: "sticky",
                  top: "var(--header-h)",
                  height: `${MOBILE_DEVICE_VH}vh`,
                  // Opaque, not transparent: this box sticks at a fixed
                  // viewport position while copy scrolls underneath it, so
                  // it needs its own backdrop or that copy would show
                  // through. Reads the SAME live --partnership-bg custom
                  // property as the full-bleed layer (see this component's
                  // own "Scroll-linked background" doc comment) rather than
                  // a fixed tone, so it never mismatches the backdrop it's
                  // sitting on.
                  backgroundColor: `var(--partnership-bg, ${BG_START_COLOR})`,
                }}
              >
                <ScrollFrameSequence
                  ref={deviceRef}
                  frameUrls={DEVICE_FRAME_URLS}
                  fallbackSrc={DEVICE_FALLBACK_SRC}
                  alt="Telematics device"
                  style={{ height: "85%", aspectRatio: "1 / 1", maxWidth: "85vw" }}
                />
              </div>

              <div className="mt-8 flex flex-col">
                <div aria-hidden style={{ height: `${LEAD_IN_VH}vh` }} />
                <div ref={copy1WrapRef}>
                  <p
                    ref={copy1TextRef}
                    className="font-normal"
                    style={{ color: "var(--fig-color-neutral-900)", fontSize: "18px", lineHeight: "28px", margin: 0 }}
                  >
                    {COPY.geotab}
                  </p>
                </div>
                <div aria-hidden style={{ height: `${COPY_GAP_VH}vh` }} />
                <div ref={copy2WrapRef}>
                  <p
                    ref={copy2TextRef}
                    className="font-normal"
                    style={{ color: "var(--fig-color-neutral-900)", fontSize: "18px", lineHeight: "28px", margin: 0 }}
                  >
                    {COPY.feizm}
                  </p>
                </div>
                <div aria-hidden style={{ height: `${TRAIL_VH}vh` }} />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
