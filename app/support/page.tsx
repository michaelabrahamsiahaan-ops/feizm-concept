import type { Metadata } from "next";
import { BannerTop } from "@/components/layout/banner-top";
import { SiteHeader } from "@/components/layout/site-header";
import { PlaceholderHero } from "@/components/layout/placeholder-hero";
import { HomeCTASection } from "@/components/home/cta-section";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Support",
};

export default function SupportPage() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start" style={{ paddingTop: "var(--banner-h)" }}>
      <BannerTop />
      <SiteHeader triggerId="support-hero" />
      <PlaceholderHero id="support-hero" title="Support" />
      <HomeCTASection />
      <SiteFooter />
    </main>
  );
}
