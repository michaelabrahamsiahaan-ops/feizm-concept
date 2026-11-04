/**
 * "Home / 07 Testimonies" content (frame 291:1395, read live via
 * `figma-cli` — directly under the "Design" page, no duplicate to ignore
 * this time). Figma's own attribution text is "Greeline Waste Co" (missing
 * an "n") — corrected to "Greenline Waste Co" here, matching the real
 * company name used in the Industries section elsewhere in this file.
 *
 * Only one testimonial exists in Figma (the frame has exactly one set of
 * quote/name/company text layers), but the frame also has prev/next nav
 * buttons (two "Button" instances, Type=outline/Size=sm, icons literally
 * named "Arrow left"/"Arrow right") — a carousel control with nothing to
 * carousel through yet. Kept as an array so TestimoniesSection's index
 * state is real (not faked), and adding a second entry is a data change,
 * not a rewrite.
 *
 * `isPlaceholder: true` per the user's explicit call — this quote reads
 * as real content (not lorem/dummy text) but is filler pending a real
 * customer testimonial, same semantic as industries-data.ts's own flag.
 */

export type Testimonial = {
  quote: string;
  name: string;
  title: string;
  company: string;
  isPlaceholder?: boolean;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "“We cut fuel per route by a third in six months. FeizM’s team didn’t just install devices — they rebuilt how we plan collections.”",
    name: "Michael Tarick",
    title: "Operations Director",
    company: "Greenline Waste Co",
    isPlaceholder: true,
  },
];
