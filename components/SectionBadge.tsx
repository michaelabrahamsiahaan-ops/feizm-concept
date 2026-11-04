/**
 * Small pill badge ("• Label") now appearing at the top of "Home / 02
 * Company", "Home / 03 Stats" and "Home / 04 Services" (read live via
 * `figma-cli` — all three instances share byte-identical styling, only
 * the label text and position differ):
 *   - fill/stroke (#fff2ea / #ffc2a0), corner radius (12) and padding (8)
 *     all match this project's own `--fig-color-brand-100`/`-200` and
 *     `--fig-radius-lg` tokens exactly, even though Figma has them bound
 *     to a DIFFERENT variable collection than this project's local one
 *     (confirmed via the bound variables' own IDs, a different source
 *     file key) — reused here rather than introducing new tokens for the
 *     same resolved colors
 *   - the dot (#ff7a1a) and text (#b45723) colors aren't part of this
 *     project's `--fig-*` collection at all: #b45723 matches the
 *     untokenized badge text color Principles.tsx already established on
 *     the About page's own badge (reused, not reinvented); #ff7a1a is the
 *     same accent orange already used for the Stats globe's routes/arc
 *     color elsewhere in this project
 *   - text is Inter Medium 14px/20px — a different family from this
 *     project's usual Hanken Grotesk body text, same as Principles.tsx's
 *     own badge
 */
export function SectionBadge({ label }: { label: string }) {
  return (
    <div
      className="flex w-fit shrink-0 items-center"
      style={{
        gap: "var(--fig-spacing-4)",
        padding: "var(--fig-spacing-8)",
        borderRadius: "var(--fig-radius-lg)",
        backgroundColor: "var(--fig-color-brand-100)",
        border: "1px solid var(--fig-color-brand-200)",
      }}
    >
      <span
        className="shrink-0 rounded-full"
        style={{ width: "10px", height: "10px", backgroundColor: "#ff7a1a" }}
      />
      <span
        style={{
          fontFamily: "Inter, var(--font-hanken-grotesk)",
          fontWeight: 500,
          fontSize: "14px",
          lineHeight: "20px",
          color: "#b45723",
        }}
      >
        {label}
      </span>
    </div>
  );
}
