import type { Metadata } from "next";
import { Geist, Geist_Mono, Hanken_Grotesk, Open_Sans } from "next/font/google";
import { ScrollHashOnLoad } from "@/components/shared/scroll-link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Loaded so the `--fig-typography-font-family: "Hanken Grotesk"` token
// (app/tokens.css, from the Figma "About Us Tokens" collection) actually
// resolves to a real typeface instead of falling back to the browser default.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

// People section's paragraph body text is set in Open Sans SemiBold in
// Figma (node 33:232), not Hanken Grotesk — loaded so that text renders in
// the actual authored typeface instead of silently falling back.
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

// NEXT_PUBLIC_SITE_URL isn't set anywhere in this project yet (no .env
// file exists) — falls back to localhost for local dev; set it in the
// real deployment environment so absolute OG/canonical URLs resolve
// correctly in production instead of silently pointing at localhost.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const SITE_TITLE = "FeizM | Fleet Management & Telematics in Southeast Asia";
const SITE_DESCRIPTION =
  "Singapore-based fleet technology partner bringing Geotab's world-leading telematics to businesses across Southeast Asia since 2015.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | FeizM",
    default: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: "FeizM",
    type: "website",
    locale: "en_SG",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${hankenGrotesk.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Corrects a direct #section-id page load to the same offset a
            ScrollLink click lands at — see scroll-link.tsx. Site-wide
            (not per-page) so it covers every current and future anchor. */}
        <ScrollHashOnLoad />
        {children}
      </body>
    </html>
  );
}
