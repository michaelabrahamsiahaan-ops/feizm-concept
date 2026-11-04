/**
 * "Client Industries" section of the Feizm Homepage ("Home / 06.1 Client
 * Industries", node 300:2115 — read live via `figma-cli`. Two duplicate
 * frames exist (299:1977 and 300:2115), BOTH directly under the "Design"
 * page this time (no "Home (Don't read this)" page to rule one out
 * automatically) — picked by POSITION instead: 300:2115 sits at the same
 * x as every other Home section (11735) and its y (5466) lands exactly
 * between Industries' own bottom edge (4657+763=5420) and Testimonies'
 * own top edge (5733), with a symmetric ~46px gap on each side — clearly
 * the one actually laid out in the page flow. 299:1977 sits at x:0, an
 * unrelated column, and was ignored.
 *
 * A plain static section, fixed 1440px width, same convention as
 * ServicesSection/IndustriesSection — no scroll-linked animation, no
 * pin. Placed between IndustriesSection and TestimoniesSection in
 * app/home/page.tsx per its own "06.1" name (between "06" and "07").
 *
 * ---- What it actually is ----
 * A "trusted by" logo strip: 4 equal 340px-wide cells in one row
 * (1360/4 exactly, confirmed), each a bordered box (1px `#c5c5c4` ==
 * `--fig-color-neutral-300` exactly, confirmed against DESIGN.md) with
 * one logo mark centered inside.
 *
 * Border is NOT uniform on all 4 sides: confirmed via `figma-cli eval`
 * reading `strokeTopWeight`/`strokeRightWeight`/`strokeBottomWeight`/
 * `strokeLeftWeight` on each cell (the dump's `strokes` array alone
 * doesn't carry per-side weights) — the first 3 cells have
 * top/bottom/left = 1px and right = 0px, and only the 4th (last) cell
 * has right = 1px too. This is how Figma avoids a doubled 2px seam where
 * adjacent cells would otherwise each contribute their own right+left
 * 1px edges at the same shared line; the last cell has no neighbor to
 * its right, so it gets its own closing edge. Reproduced with
 * `borderRight` only on the last cell.
 *
 * There is NOT ONE text node anywhere in
 * the whole frame — no company names, nothing to read them off of. The
 * 4 marks are generic abstract icons (confirmed by exporting each as a
 * real SVG via `figma-cli export node -f svg` — the raster/PNG export
 * path has a known bug in this CLI build, but vector SVG export works
 * fine, same as site-header.tsx's own logo exports — and viewing them:
 * a stylized tree, a circle with an infinity/bowtie mark, an 8-point
 * sunburst, and a diagonally-cut mountain/chart shape) — i.e. this reads
 * as a placeholder client-logo wall, not 4 real identifiable brands, so
 * nothing here invents company names that aren't in the design.
 * Exported at their own native Figma sizes (noticeably different from
 * each other: 63x52, 50x50, 46x46, 36x41) and rendered at that native
 * size, not forced into a uniform square — matches Figma exactly.
 *
 * Icon fill color `#494949` has no DESIGN.md token (same untokenized
 * literal already used elsewhere in this project, e.g. the Industries
 * cards' own "See More" text) — baked into the exported SVGs themselves,
 * not reapplied in code.
 *
 * Plain `<img>`, not `next/image`: this project's `next.config.ts` has
 * no `images.dangerouslyAllowSVG`, so `next/image` refuses to optimize a
 * local SVG by default — same reason IndustryCard's own placeholder
 * skips it (see that component's `CardPhoto`). These are tiny decorative
 * vector marks with no real benefit from the image optimizer anyway.
 */
const CLIENT_LOGOS = ["/client-logos/client-logo-1.svg", "/client-logos/client-logo-2.svg", "/client-logos/client-logo-3.svg", "/client-logos/client-logo-4.svg"];

export function ClientIndustriesSection() {
  return (
    <section className="flex w-[1440px] flex-col items-center justify-center" style={{ padding: "var(--fig-spacing-40)", backgroundColor: "#ffffff" }}>
      <div className="flex w-full">
        {CLIENT_LOGOS.map((src, i) => (
          <div
            key={src}
            className="flex flex-1 items-center justify-center"
            style={{
              height: 141,
              borderTop: "1px solid var(--fig-color-neutral-300)",
              borderBottom: "1px solid var(--fig-color-neutral-300)",
              borderLeft: "1px solid var(--fig-color-neutral-300)",
              borderRight: i === CLIENT_LOGOS.length - 1 ? "1px solid var(--fig-color-neutral-300)" : "none",
              padding: 15,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: next/image refuses local SVGs without images.dangerouslyAllowSVG, see this file's own doc comment */}
            <img src={src} alt="" />
          </div>
        ))}
      </div>
    </section>
  );
}
