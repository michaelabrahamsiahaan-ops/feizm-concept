import Link from "next/link";
import { HalftoneWavesWidget } from "@/components/HalftoneWavesWidget";

/**
 * "Footer Section" — read live via `figma-cli` (`figma-cli find "Footer"`
 * found it as an INSTANCE, node 304:2241, using the "Variant=Desktop" of a
 * `Footer Section` COMPONENT SET, node 305:2307). Unlike every `Home / NN
 * ...` frame built so far, this one has NO `Home /` prefix and sits
 * directly under the "Design" page as its own component — it's a shared,
 * site-wide footer, not a Home-page-only section, so it lives in
 * `components/layout/` next to SiteHeader rather than `components/home/`.
 *
 * The component set's OTHER variant ("Variant=Mobile", node 305:2366) is
 * pixel-identical to Desktop in every dimension checked (same 1440 width,
 * same every x/y/w/h down to the nested list items) — confirmed directly,
 * not assumed. It's an unused/orphaned duplicate, not an actual distinct
 * mobile layout, so there's nothing to build a responsive variant FROM;
 * this is one fixed-1440px design, same convention as every other static
 * section (ServicesSection, IndustriesSection, ClientIndustriesSection).
 *
 * Added only to the Home page for now (`app/home/page.tsx`), not to the
 * root layout — matching the EXISTING precedent that SiteHeader is also
 * rendered per-page (with page-specific props), not globally, even though
 * it's conceptually a shared/global component too. about-us and
 * fleet-management-system don't get it yet; add it there explicitly if
 * asked, same as SiteHeader would be.
 *
 * ---- Structure ----
 * Black (`#000000` — no exact DESIGN.md token match, closest is
 * `--fig-color-neutral-900` at `#030000`, not exact, so used as a literal
 * like other untokenized colors elsewhere in this project) background,
 * `--fig-spacing-40` padding on all sides. One column: a row (logo left,
 * three link columns right, pushed to the far edges — Figma's own
 * itemSpacing on that row is a fixed 544px, but since this is a static
 * 1440px design the fixed-544-gap-then-fill-remainder behavior and a
 * plain `justify-between` produce IDENTICAL pixels at this exact width,
 * so `justify-between` is used for simplicity), then the copyright line
 * below it with a `--fig-spacing-24` gap.
 *
 * The logo is `public/brand/logo-white.svg` — re-exported this exact
 * vector via `figma-cli export node -f svg` and it came back BYTE-
 * IDENTICAL to the asset SiteHeader already uses for its own white logo
 * state (same file, same path data). Reused directly, not duplicated
 * (REUSE BEFORE REBUILD) — plain `<img>`, not `next/image`, same reason
 * as every other local SVG in this project (`next.config.ts` has no
 * `images.dangerouslyAllowSVG`).
 *
 * Each nav column is a heading (30px / Regular / white) + a tight list of
 * links (`--fig-color-neutral-500` == `#838181` exactly, confirmed
 * against DESIGN.md). Font sizes transcribed directly from Figma's own
 * reported values (29.93px / 16.84px / 14.97px etc, not rounded to
 * "clean" numbers) — matches the SAME convention SiteHeader's own nav
 * already uses (`fontSize: "14.97px"` there too, for what is structurally
 * the same base text style). `hover:opacity-70` on every link, reusing
 * SiteHeader's own nav-link hover convention exactly.
 *
 * Link targets: only two of these point anywhere real in this app today
 * (`/about-us`, `/fleet-management-system` — confirmed those routes
 * exist) and use `next/link`; the rest (Locations, News, Contact person,
 * Jobs, and the other four Services items) have no page yet, so they're
 * plain `<a href="#">`, matching SiteHeader's own placeholder nav links.
 *
 * ---- Re-checked via figma-cli (2026-11-04) — the design changed ----
 * Re-reading "Footer Section" fresh turned up a real design update since
 * this was first built: nav columns + copyright TEXT are byte-identical
 * (diffed the full structure, not assumed), but three things changed:
 *
 * 1. A new decorative background image, a RECTANGLE named
 *    "halftone-waves-t0-2880x1600 1" (node `I304:2241;315:2423`),
 *    `layoutPositioning: ABSOLUTE`, local `x:0 y:-52 w:1440 h:800`, an
 *    orange-on-black halftone-dot wave rising from the bottom. Figma's
 *    own raster export (`figma-cli export node`) hit the SAME known
 *    "fetch failed" bug documented elsewhere in this project — worked
 *    around with `figma-cli verify <id> --scale 2` instead (verify's own
 *    export path isn't affected), saved to
 *    `public/home/footer-wave-bg.png`. Confirmed via direct canvas-pixel
 *    sampling (not by eye — a PNG's transparent areas render as WHITE in
 *    an isolated preview, which looks identical to opaque white at a
 *    glance) that the top/mid area is REAL alpha transparency (`a:0`),
 *    not opaque white, so it composites seamlessly over this footer's
 *    own black background with no code-side color tricks needed.
 * 2. The footer instance itself is now a FIXED 1440×748 (was
 *    content-hugging at ~387px) — the extra height is exactly what the
 *    wave image needs at the bottom; the nav/copyright content stays
 *    top-aligned at its old size and position, unchanged.
 * 3. The copyright line is now CENTERED in the full content width
 *    (confirmed from its container: a 1360px-wide row with the
 *    325px-wide text block at `x:517.5` — exactly `(1360-325)/2`) —
 *    it was left-aligned before.
 *
 * The image's own local box (`y:-52`, extending 52px above the footer's
 * own top edge) assumes the real Figma layout, where `Home / 08 CTA`
 * sits directly above and absorbs that bleed. This app skips CTA (see
 * `app/home/page.tsx`'s own comment) and has TestimoniesSection there
 * instead, which the bleed has no business overlapping — so this build
 * clips it to the footer's own box (`overflow: hidden` + the image div
 * still placed at `top: -52px` internally, just cropped rather than
 * reflowed) instead of reproducing the bleed, preserving the image's own
 * bottom-aligned composition while not leaking into an unrelated section.
 *
 * ---- Re-checked again (same day) — nav columns rearranged ----
 * Re-read a second time and the nav row itself changed (text content is
 * still byte-identical — only arrangement):
 *
 * 1. Column ORDER is now Services -> About us -> Career (was About us ->
 *    Career -> Services). `SERVICE_LINKS`/`ABOUT_LINKS`/`CAREER_LINKS`
 *    kept their own names (still describe the same link lists) — only
 *    the JSX call order changed.
 * 2. Each column is now a FIXED 283px-wide slot (confirmed via
 *    `layoutSizingHorizontal` on the actual column nodes: "About us" and
 *    "Career" report `FIXED`, "Services" reports `HUG` but its own
 *    widest child — the "List" frame — is itself fixed at 283, same
 *    visible result), not three content-hugging widths (previously
 *    119 / 94 / 283). This matters even though the gap token is
 *    unchanged (still `--fig-spacing-64` between column BOXES): a
 *    short column like Career (its own content only ~94px wide) used to
 *    leave a 64px gap right after its own text, but now reserves a full
 *    283px slot first — i.e. ~189px of empty space, THEN the 64px gap.
 *    Hugging each column's own content instead of giving it `w: 283`
 *    would visibly under-space every column shorter than 283px, so the
 *    width is set explicitly here rather than left to hug.
 * 3. The outer row (logo + nav block) now reports
 *    `primaryAxisAlignItems: SPACE_BETWEEN` (was `MIN`) — confirmed via
 *    `figma-cli eval`. This happens to be EXACTLY what this file's own
 *    `justify-between` already implements (chosen earlier purely because
 *    it was pixel-identical to the old fixed-544-gap layout at this
 *    width — see the paragraph above), so no change was needed there;
 *    Figma's own mechanism just caught up to match the code instead of
 *    the other way around.
 *
 * ---- Re-checked a third time — bigger redesign ----
 * Re-reading again (same component, `figma-cli eval` after re-connecting
 * the plugin) turned up real structural + typographic changes, not just
 * reshuffling:
 *
 * 1. The column-to-column gap mechanic changed underneath the unchanged-
 *    looking result: `Frame 21`'s own `itemSpacing` is now `0` (was the
 *    irrelevant leftover `64` the earlier comment above cited) — three
 *    FIXED 283px columns now sit flush against each other with NO flex
 *    gap between their boxes; the visible spacing is ENTIRELY the
 *    trailing empty space inside each 283px box (same mechanism as
 *    before, just the explicit `gap` token this file was also adding
 *    between them was double-spacing them). Removed that `gap` — the
 *    column width alone now does the full job.
 * 2. Every text style shrank to a clean modular scale (previously odd
 *    decimals like `29.93px`/`16.84px`, an artifact of this exact file's
 *    earlier scale-factor theory — now genuinely clean, confirmed via
 *    `fontSize`/`lineHeight` straight from the Plugin API, all exactly
 *    1.5x line-height): headings `24px/36px` (was `~30/35.55`), body
 *    links `16px/24px` (was `~16.84/24.32`), copyright `14px/21px` (was
 *    `~14.97/22.45`). The heading-to-list gap inside each column also
 *    shrank, `--fig-spacing-12` now (was `--fig-spacing-22`).
 * 3. The logo gained a tagline directly underneath it: "Fleet Management
 *    System", `12px/18px`, `--fig-color-neutral-500` gray, 20px below
 *    the logo (no exact spacing token for 20, used as a literal like
 *    other untokenized values in this project).
 * 4. Services column link labels changed (shortened/reworded, confirmed
 *    as the actual new `characters`, not a rename guess): "Fleet
 *    Management System" (unchanged), "Asset Management", "Safety and
 *    Surveillance", "Transport Management", "Device Management".
 * 5. The copyright row is a full redesign: 4 social icons (Facebook,
 *    Instagram, X/Twitter, LinkedIn — Figma's own layer names are literal
 *    Iconify ids, "akar-icons:facebook-fill" etc., but this project only
 *    has `lucide-react` installed, which deliberately excludes brand
 *    icons — exported the real vectors instead, same path as the FeizM
 *    logo and Client Industries marks: `figma-cli export node -f svg`,
 *    saved to `public/icons/social-*.svg`, already `fill="#838181"` i.e.
 *    `--fig-color-neutral-500` baked in, nothing recolored in code) on
 *    the LEFT, the copyright text — now shortened to "© 2026 FeizM. All
 *    rights reserved" (was "...All Rights Reserved, FeizM Pte Ltd") — on
 *    the RIGHT, `justify-between` + `items-start` (Figma: `MIN` on the
 *    cross axis, `SPACE_BETWEEN` on the main axis) with
 *    `--fig-spacing-16` top/bottom padding on the row itself (both
 *    children start at the same y, which is the padding's own 16px, not
 *    a shared vertical center — their 3px height difference, 24 vs 21,
 *    is otherwise invisible at this size). No longer centered — that
 *    was last iteration's design, fully replaced now.
 * 6. That same icons+copyright row has a 1px bottom border
 *    (`--fig-color-neutral-500`, `strokeAlign: INSIDE`, confirmed via
 *    `strokeBottomWeight: 1` with the other three sides at `0`) —
 *    visible in Figma's own screenshot as the thin line separating the
 *    nav content from the wave graphic below, easy to miss since it's
 *    the exact same gray as the body text right above it.
 *
 * ---- Background illustration: static PNG -> live animation ----
 * The static "halftone-waves-t0-2880x1600 1" PNG described above (point 1
 * of the first re-check) has been swapped for a LIVE, animated version,
 * per the user's own request and a supplied reference file
 * ("halftone-waves-embed.html" — a self-contained `<canvas>` + script that
 * renders the exact same orange-on-transparent halftone wave field, just
 * continuously animated instead of a single baked frame). Not a Figma
 * re-read — Figma's own design still only has the static image; this is a
 * deliberate upgrade beyond it, same category of decision as
 * TestimoniesSection's scroll-driven reveal (built from a brief, not from
 * a Figma frame that already shows the motion).
 *
 * Vendored as `public/halftone-waves.js` + `components/HalftoneWavesWidget.tsx`,
 * mirroring this project's EXISTING `public/halftone-globe.js` +
 * `components/HalftoneGlobeWidget.tsx` pattern exactly (both docment this
 * same "load the script once, `api.mount(container, opts)`, tear down on
 * unmount" convention) — chosen over inventing a new pattern since one
 * already exists and works. The actual dot/wave rendering math inside
 * `createHalftoneWaves` is byte-for-byte what the supplied HTML file had;
 * the only real change is wrapping its hardcoded, single-canvas-id
 * "STAGE + AUTOPLAY" IIFE into a reusable `mount()` that creates its own
 * canvas inside whatever container it's given (same reason
 * HalftoneGlobeWidget needed that shape, not a stylistic preference).
 *
 * `public/home/footer-wave-bg.png` (the now-superseded static export) was
 * deleted — confirmed nothing else in the codebase referenced it before
 * removing it.
 *
 * ---- Re-checked once more — tagline copy changed ----
 * Everything else diffed identical; only the one-line "Fleet Management
 * System" tagline under the logo was replaced with a real company
 * description that now wraps across 3 lines inside a fixed 315px box
 * (confirmed via the text node's own reported `w:315 h:54`, 54 = 18px
 * line-height x 3 lines) — `width: 315` added here to reproduce that same
 * wrap point, rather than leaving it to wrap at an arbitrary container
 * width.
 */
const ABOUT_LINKS: Array<{ label: string; href?: string }> = [
  { label: "About", href: "/about-us" },
  { label: "Locations" },
  { label: "News" },
  { label: "Contact person" },
];

const CAREER_LINKS: Array<{ label: string; href?: string }> = [{ label: "Jobs" }];

const SERVICE_LINKS: Array<{ label: string; href?: string }> = [
  { label: "Fleet Management System", href: "/fleet-management-system" },
  { label: "Asset Management" },
  { label: "Safety and Surveillance" },
  { label: "Transport Management" },
  { label: "Device Management" },
];

const SOCIAL_LINKS: Array<{ label: string; src: string }> = [
  { label: "Facebook", src: "/icons/social-facebook.svg" },
  { label: "Instagram", src: "/icons/social-instagram.svg" },
  { label: "X (Twitter)", src: "/icons/social-twitter-x.svg" },
  { label: "LinkedIn", src: "/icons/social-linkedin.svg" },
];

function FooterLink({ label, href }: { label: string; href?: string }) {
  const className = "block py-[6.71px] transition-opacity hover:opacity-70";
  const style = {
    color: "var(--fig-color-neutral-500)",
    fontSize: "16px",
    lineHeight: "24px",
  };
  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {label}
      </Link>
    );
  }
  return (
    <a href="#" className={className} style={style}>
      {label}
    </a>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="flex w-[283px] flex-col" style={{ gap: "var(--fig-spacing-12)" }}>
      <h3 style={{ color: "var(--fig-color-neutral-0)", fontSize: "24px", lineHeight: "36px" }}>
        {heading}
      </h3>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            <FooterLink label={link.label} href={link.href} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer
      className="relative flex w-[1440px] flex-col overflow-hidden"
      style={{
        height: 748,
        padding: "var(--fig-spacing-40)",
        backgroundColor: "#000000",
        // body's own `font-sans` token is circular (`--font-sans: var(--font-sans)`
        // in app/globals.css) and resolves to the browser's serif fallback, NOT
        // Hanken Grotesk — confirmed directly (`getComputedStyle(document.body)
        // .fontFamily` came back "Times"). Every other component in this project
        // works around the same bug by setting this explicitly (Hero.tsx,
        // site-header.tsx, testimonies-section.tsx, etc.) — this was the one
        // component that missed it, which is why the font looked visibly
        // different here specifically.
        fontFamily: "var(--font-hanken-grotesk)",
      }}
    >
      <HalftoneWavesWidget className="absolute left-0 w-[1440px]" style={{ top: -52, height: 800 }} />
      <div className="relative flex flex-col" style={{ gap: "var(--fig-spacing-24)" }}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col" style={{ gap: 20 }}>
            <Link href="/" aria-label="FeizM home" className="block h-[30px] w-[104px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: next/image refuses local SVGs without images.dangerouslyAllowSVG, see this file's own doc comment */}
              <img src="/brand/logo-white.svg" alt="FeizM" className="h-full w-full" />
            </Link>
            <p style={{ color: "var(--fig-color-neutral-500)", fontSize: "12px", lineHeight: "18px", width: 315 }}>
              Singapore-based fleet technology partner, bringing Geotab&rsquo;s world-leading telematics to businesses
              across Southeast Asia since 2015.
            </p>
          </div>
          <div className="flex">
            <FooterColumn heading="Services" links={SERVICE_LINKS} />
            <FooterColumn heading="About us" links={ABOUT_LINKS} />
            <FooterColumn heading="Career" links={CAREER_LINKS} />
          </div>
        </div>
        <div
          className="flex items-start justify-between"
          style={{
            paddingTop: "var(--fig-spacing-16)",
            paddingBottom: "var(--fig-spacing-16)",
            borderBottom: "1px solid var(--fig-color-neutral-500)",
          }}
        >
          <div className="flex items-center" style={{ gap: "var(--fig-spacing-12)" }}>
            {SOCIAL_LINKS.map((social) => (
              <a key={social.label} href="#" aria-label={social.label} className="block h-6 w-6 transition-opacity hover:opacity-70">
                {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: next/image refuses local SVGs without images.dangerouslyAllowSVG, see this file's own doc comment */}
                <img src={social.src} alt="" className="h-full w-full" />
              </a>
            ))}
          </div>
          <p style={{ color: "var(--fig-color-neutral-500)", fontSize: "14px", lineHeight: "21px" }}>
            © 2026 FeizM. All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
