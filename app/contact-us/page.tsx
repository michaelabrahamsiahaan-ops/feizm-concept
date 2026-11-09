import type { Metadata } from "next";
import { BannerTop } from "@/components/layout/banner-top";
import { SiteHeader } from "@/components/layout/site-header";
import { PlaceholderHero } from "@/components/layout/placeholder-hero";
import { HomeCTASection } from "@/components/home/cta-section";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Contact Us",
};

export default function ContactUsPage() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-start" style={{ paddingTop: "var(--banner-h)" }}>
      <BannerTop />
      <SiteHeader triggerId="contact-us-hero" />
      <PlaceholderHero id="contact-us-hero" title="Contact Us" />
      <HomeCTASection />
      <SiteFooter />
    </main>
  );
}
