# FeizM — Figma source map

Generated from a live, read-only `figma-cli` audit of the "FeizM" Figma file
(file key `dAgS7vcszoW56amjz9pbFg`). Nothing in Figma was created, renamed,
moved, or modified to produce this document.

**Source-of-truth rule used throughout this file:** frames named
`About / NN ...` and `Fleet Management System / NN ...` are canonical. Two
frames are explicitly marked **REFERENCE (do not build)** in Figma itself
(`About Us – REFERENCE`, `Fleet Management System – REFERENCE`) and are
ignored for the site map / component list below — they're full page mockups
containing their own nested, sometimes-stale duplicate of every section,
used only in §5 to diff copy against the canonical frames.

---

## 1. Site map

### Route: `/about`

Canonical frame: `About / 01 Hero` … `About / 10 Footer Section`, all
top-level frames on the "Design" page, 1440px wide. Order below is the
frame's own `NN` prefix, left to right as laid out on canvas (top to bottom
in y-position, matching reading order):

| # | Figma frame | Node ID | Height | Built as |
|---|---|---|---|---|
| 01 | About / 01 Hero | `3:58` | 795 | `components/Hero.tsx` |
| 02 | About / 02 Glimps of Feizm | `3:132` | 857 | `components/CompanyProfile.tsx` |
| 03 | About / 03 Why | `4:164` | 1128 | `components/WhyFeizm.tsx` |
| 04 | About / 04 Achievement Section | `4:344` | 569 | `components/AchievementSection.tsx` |
| 05 | About / 05 Story Section | `7:404` | 820 | `components/sections/story-timeline.tsx` |
| 06 | About / 06 Principles Section | `24:643` | 641 | `components/Principles.tsx` |
| 07 | About / 07 People 1 Section | `34:483` | 928 | `components/PeopleSection1.tsx` |
| 08 | About / 08 People 2 Section | `33:232` | 1068 | `components/PeopleSection2.tsx` |
| 09 | About / 09 CTA Section | `34:508` | 475 | `components/CTASection.tsx` |
| 10 | About / 10 Footer Section | `34:528` | 449 | `components/Footer.tsx` |

All 10 are already built and wired into `app/page.tsx` in this order, with
the header (§2) overlaying as a fixed element rather than a frame in this
list.

### Route: `/fleet-management-system`

Only one real (non-REFERENCE) frame exists for this page so far:

| # | Figma frame | Node ID | Height | Built as |
|---|---|---|---|---|
| 01 | Fleet Management System / 01 Hero | `73:48687` | 795 | *not built* |

No `/fleet-management-system` route or component exists in this repo yet.
If more `Fleet Management System / NN ...` frames get added in Figma later,
re-run this audit — the page's section list here will be incomplete by
construction until then.

**Fleet Hero copy (for when this gets built):**
- Breadcrumb: Home → Fleet Management System
- Heading: "Locate every vehicle within 3m accuracy"
- Paragraph: "Our Fleet Management Solution by Geotab is the top choice by
  ABI Research. With advanced technology, we ensure your fleet operates
  efficiently and safely, delivering cargo on time"
- Primary button **"Request Demo" is visible here** (`Type=primary,
  Status=default, Size=sm`) — unlike the About Hero, where the equivalent
  button exists in Figma but has `visible: false` and was correctly
  omitted from `Hero.tsx`. Don't carry that omission over to the Fleet
  Hero without re-checking — the two pages differ on this specific button.
- Outline button: "About Fleet Management System" (`Type=outline,
  Status=default, Size=sm`)
- Background: same `blue-glowing-digital-sphere...` image rectangle as the
  About Hero, but the globe illustration is a different asset — a static,
  non-animated "Singapore — dot illustration" `GROUP` of ~800 individual
  `ELLIPSE` nodes (not the halftone-globe canvas used on About). Exporting
  that as a static image rather than trying to trace it node-by-node is the
  only sane path if/when this gets built.

---

## 2. Shared components

### Header — `Top component` (node `74:55585`, COMPONENT_SET on the Design page)

The canonical, currently-correct source for the header. It has one variant
axis:

```
variantGroupProperties: { State: ["Default", "Scrolling"] }
```

- `State=Default` — node `74:55584` — the transparent/dark overlay variant
- `State=Scrolling` — node `74:55583` — the white solid variant

This is the real shared component — confirmed present and with identical
text/structure to what `components/layout/site-header.tsx` already
implements (overlay→solid cross-fade on scroll, triggered by the
`company-profile` section). **Stale IDs to be aware of:** an earlier pass
this session built the header from two separate standalone frames, `Top
Navigation` (`3:90`) and `Scrolling - Top Navigation` (`34:586`) — both
have since been **deleted** from the file (confirmed: `getNodeByIdAsync`
returns `null` for both now). The component set (`74:55585` and its two
variant children) is the only remaining source and the one to use for any
future re-reads.

The header isn't placed as a literal instance inside any of the 10 section
frames or the Fleet Hero — it only exists as this standalone component
definition. The fixed/overlay implementation in code (not embedded per
section) matches that.

### Button (external library component, not local to this file)

Confirmed via `node.getMainComponentAsync()` on instances inside both the
About Hero and the Fleet Hero. Variant axes: `Type` (`primary` | `outline`),
`Status` (`default` — no other status seen in use), `Size` (`sm` — no other
size seen in use). The component's own parent chain terminates immediately
after its component set (`Button`, node `1:168`) with no further ancestry
resolvable — consistent with it being a **remote/external library
component**, not something defined on a local page of this file.

Used identically on both pages (About Hero's "About Us" outline button,
Fleet Hero's "Request Demo" primary + "About Fleet Management System"
outline, every other section's CTA/arrow buttons throughout `/about`).

### Link / Breadcrumb / Chevron / icon components (also external library)

Same situation as Button — `Breadcrumb`, `Link` (`Status=default,
Type=default` / `Type=in-link`), `Chevron right`, `info`, `arrow-down` all
resolve to components whose parent chain terminates immediately, i.e. all
remote library components. Used identically on both Hero frames checked.

### Section badge — `Badge` (local component, `Color=Primary, Size=md`, node `1:377`)

Confirmed via matching `mainComponentId` (`1:377`) across independently
checked instances in `About / 04 Achievement Section` and `About / 07
People 1 Section` — genuinely the same shared component, not just visually
similar copies. This is the small pill ("02 - Trust", "05 - People", etc.)
at the top of every section. Variant axes: `Color` (`Primary` — no other
color seen in use), `Size` (`md` — no other size seen in use).

### Footer, CTA — not Figma components

Despite being visually identical in structure wherever repeated, neither
"Footer" nor "CTA Section" resolves to a shared Figma component or
component set anywhere in the file — they're one-off frames. The repeated
pattern (if the Fleet page eventually needs its own footer/CTA) would need
to be copied/rebuilt by hand in Figma too, same as in code. Since the Fleet
page currently has only a Hero section, there's no second instance of
either to confirm sharing against yet — treat "footer and CTA are shared
across pages" as the evident *intent*, not something Figma itself enforces
structurally today.

---

## 3. Design tokens → Tailwind theme names

Already extracted into `app/tokens.css` via `figma-cli export css`
(collection: "About Us Tokens"), loaded as plain `--fig-*` CSS custom
properties and consumed via inline `style={{ color: "var(--fig-color-...)"
}}` throughout every built component — **not yet wired into Tailwind's
`@theme` block** in `app/globals.css` (which defines its own, separate
shadcn-sourced `--radius-*` scale; the two don't collide by design, per the
comment at the top of `tokens.css`, but they also don't share a namespace).
The table below is what each token *would* map to as a first-class Tailwind
theme name if that wiring is ever done — not a claim that the classes below
already work.

### Colors

| Figma variable | Value | Current CSS var | Proposed Tailwind theme name | Utility class |
|---|---|---|---|---|
| brand/50 | `#feefea` | `--fig-color-brand-50` | `--color-brand-50` | `bg-brand-50` |
| brand/100 | `#fff2ea` | `--fig-color-brand-100` | `--color-brand-100` | `bg-brand-100` |
| brand/200 | `#ffc2a0` | `--fig-color-brand-200` | `--color-brand-200` | `bg-brand-200` |
| brand/300 | `#ffb79d` | `--fig-color-brand-300` | `--color-brand-300` | `bg-brand-300` |
| brand/500 | `#f25a29` | `--fig-color-brand-500` | `--color-brand-500` | `bg-brand-500` |
| brand/600 | `#df3d31` | `--fig-color-brand-600` | `--color-brand-600` | `bg-brand-600` |
| brand/700 | `#ac401d` | `--fig-color-brand-700` | `--color-brand-700` | `bg-brand-700` |
| neutral/0 | `#ffffff` | `--fig-color-neutral-0` | `--color-neutral-0` | `bg-neutral-0` |
| neutral/100 | `#f3f3f3` | `--fig-color-neutral-100` | `--color-neutral-100` | `bg-neutral-100` |
| neutral/150 | `#e8e8e8` | `--fig-color-neutral-150` | `--color-neutral-150` | `bg-neutral-150` |
| neutral/200 | `#e3e3e3` | `--fig-color-neutral-200` | `--color-neutral-200` | `bg-neutral-200` |
| neutral/300 | `#c5c5c4` | `--fig-color-neutral-300` | `--color-neutral-300` | `bg-neutral-300` |
| neutral/500 | `#838181` | `--fig-color-neutral-500` | `--color-neutral-500` | `bg-neutral-500` |
| neutral/700 | `#444444` | `--fig-color-neutral-700` | `--color-neutral-700` | `bg-neutral-700` |
| neutral/800 | `#252524` | `--fig-color-neutral-800` | `--color-neutral-800` | `bg-neutral-800` |
| neutral/900 | `#030000` | `--fig-color-neutral-900` | `--color-neutral-900` | `bg-neutral-900` |
| accent/yellow-light | `#fffbdf` | `--fig-color-accent-yellow-light` | `--color-accent-yellow-light` | `bg-accent-yellow-light` |
| accent/coral-light | `#fbccbd` | `--fig-color-accent-coral-light` | `--color-accent-coral-light` | `bg-accent-coral-light` |

**Untokenized colors found while building** (confirmed, via every section's
own build notes, not to match any variable above — used as literal hex in
code): badge text `#b45723`, People1/CTA link/icon colors `#1e1e1e` /
`#f15a29`, header's solid-state text `#282828` (close to but not exactly
`neutral-800`), Hero/nav gradient scrims (`rgba(29,29,28,...)` and pure
black), People1 image-grid border `#ececec`, PeopleSection1's section
background `#ececec`.

### Typography

| Figma variable | Value | Current CSS var | Proposed Tailwind theme name |
|---|---|---|---|
| size/sm | 16px | `--fig-typography-size-sm` | `--text-fig-sm` |
| size/md | 18px | `--fig-typography-size-md` | `--text-fig-md` |
| size/xl | 36px | `--fig-typography-size-xl` | `--text-fig-xl` |
| size/2xl | 38px | `--fig-typography-size-2xl` | `--text-fig-2xl` |
| size/3xl | 44px | `--fig-typography-size-3xl` | `--text-fig-3xl` |
| font-family | Hanken Grotesk | `--fig-typography-font-family` | `--font-fig-sans` (resolved in code via `--font-hanken-grotesk`, the `next/font` hash, not the literal token string) |

Every large heading/number across every section (59.87px, 44.9px, 37.42px,
29.93px, etc.) is a **literal, non-tokenized, component-scaled size** —
confirmed repeatedly across every section this session, not forced onto
the nearest token above. DESIGN.md deliberately didn't tokenize these; they
aren't a deliberate type-scale step.

### Spacing

| Value | Current CSS var | Proposed Tailwind theme name | Utility class |
|---|---|---|---|
| 2px | `--fig-spacing-2` | `--spacing-fig-2` | `p-fig-2` / `gap-fig-2` |
| 4px | `--fig-spacing-4` | `--spacing-fig-4` | `p-fig-4` |
| 8px | `--fig-spacing-8` | `--spacing-fig-8` | `p-fig-8` |
| 11px | `--fig-spacing-11` | `--spacing-fig-11` | `p-fig-11` |
| 12px | `--fig-spacing-12` | `--spacing-fig-12` | `p-fig-12` |
| 15px | `--fig-spacing-15` | `--spacing-fig-15` | `p-fig-15` |
| 16px | `--fig-spacing-16` | `--spacing-fig-16` | `p-fig-16` |
| 22px | `--fig-spacing-22` | `--spacing-fig-22` | `p-fig-22` |
| 24px | `--fig-spacing-24` | `--spacing-fig-24` | `p-fig-24` |
| 32px | `--fig-spacing-32` | `--spacing-fig-32` | `p-fig-32` |
| 40px | `--fig-spacing-40` | `--spacing-fig-40` | `p-fig-40` |
| 60px | `--fig-spacing-60` | `--spacing-fig-60` | `p-fig-60` |
| 64px | `--fig-spacing-64` | `--spacing-fig-64` | `p-fig-64` |
| 128px | `--fig-spacing-128` | `--spacing-fig-128` | `gap-fig-128` |

### Radius

| Value | Current CSS var | Proposed Tailwind theme name | Utility class |
|---|---|---|---|
| 4px | `--fig-radius-sm` | `--radius-fig-sm` | `rounded-fig-sm` |
| 8px | `--fig-radius-md` | `--radius-fig-md` | `rounded-fig-md` |
| 12px | `--fig-radius-lg` | `--radius-fig-lg` | `rounded-fig-lg` |
| 1680px (pill) | `--fig-radius-full` | `--radius-fig-full` | `rounded-fig-full` |

One non-tokenized radius found: the People 1 photo grid's `3.74px` corner
radius (closest token, `sm`, is 4px — not an exact match) — kept as a
literal, same reasoning as the untokenized text sizes above.

---

## 4. Interaction notes / annotations

**None found.** Checked three separate ways:
1. `figma-cli annotate list <id>` on all 10 About frames, the Fleet Hero,
   the "Top component" set, and both REFERENCE frames — every single one
   returned "no annotations" (Figma's formal dev-mode inline-note feature
   is unused in this file).
2. Prototype click reactions (`node.reactions`) checked on every button and
   nav link encountered — empty everywhere. No prototype connections exist
   in the file at all.
3. A keyword scan (note/todo/scroll/hover/click/interact/overlay/solid/
   trigger/state/animat...) across every text layer on the Design page —
   the only matches were real page copy that happened to contain a
   substring like "interact" (e.g. "...stakeholder interactions..."), not
   actual designer notes.

The one real interaction-relevant artifact in the file is structural, not
a note: the header's `State=Default`/`State=Scrolling` variant pair (§2) —
the existence of two states *is* the spec for the overlay→solid scroll
behavior, there's just no accompanying text describing the trigger
condition, timing, or easing (all of that was derived and already built
this session from first principles + the two states' own visual content,
not from any annotation).

---

## 5. Copy differences between duplicate frames — need your decision

Every `About / NN ...` canonical frame has a duplicate nested inside `About
Us – REFERENCE (do not build)` (a full assembled page mockup). Comparing
all text on every pair, most are byte-identical (Glimps of Feizm, People 1,
People 2, CTA, Footer all matched exactly). Four did not:

| Section | REFERENCE text | Canonical (`About / NN`) text | Repo currently has |
|---|---|---|---|
| Hero | "Feizm keeps world's fleets moving**.**" | "Feizm keeps world's fleets moving" (no period) | No period — matches canonical |
| Hero | "...local expertise**.**" | "...local expertise" (no period) | No period — matches canonical |
| Why | "...clients' fleets**.**" | "...clients' fleets" (no period) | No period — matches canonical |
| Why | "...simply can't match**.**" | "...simply can't match" (no period) | No period — matches canonical |
| Achievement/Trust | Badge **"02- Trust"** (no space) | Badge **"02 - Trust"** (space) | Has the space — matches canonical |
| Achievement/Trust | "...entrusted to everyone**.**" | "...entrusted to everyone" (no period) | No period — matches canonical |
| Principles | Badge **"04- Princples"** (no space) | Badge **"04 - Princples"** (space) | Has the space — matches canonical (and you explicitly asked for this exact fix earlier this session) |

**Pattern:** REFERENCE consistently has a trailing period where canonical
doesn't, and REFERENCE consistently has the dash-spacing typo
(`"NN- Label"`) where canonical already has it corrected
(`"NN - Label"`). Every one of these already resolves in canonical's favor
under the "use `About/...` and `Fleet/...` as source of truth, ignore
REFERENCE" rule you gave me, and the repo's current code already matches
canonical in all seven cases — so nothing needs to change here. Flagging
per your request anyway, in case REFERENCE's wording (e.g. the trailing
periods) is actually the *newer* edit and canonical is what's stale — I
can't tell intent from the file alone, only which one the stated
source-of-truth rule picks.

**One more thing found, not a "which is correct" case:** REFERENCE's Story
Section (node `1:589`) still contains dozens of unused template panels from
what looks like the Figma template's original company (~30 "Emons"
history entries from 1960–2024, plus German "Back"/"Weiter" pagination
labels) alongside the real 2015/2018/2019 content. This reads as leftover
template cruft in the REFERENCE mockup specifically, not a genuine
alternate draft — the canonical `About / 05 Story Section` frame doesn't
carry this, and the repo's Story Timeline component is already built from
canonical. No action needed, just flagging why that one frame's size/
content doesn't line up 1:1 with the others in case it looks like a bug
later.

Let me know which way you want the four real differences above to go
(keep canonical's version, or pull in REFERENCE's periods/dash-spacing) —
nothing changes until you say so.
