import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "./ContactForm";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Contact & Pro access",
  description:
    "Ask about FounderVoice Pro, report a problem, or tell us what to build next. We reply personally.",
  alternates: { canonical: `${siteUrl}/contact` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/contact`,
    title: "Contact FounderVoice AI",
    description: "Pro access, support, press and partnerships. One short form, a real reply.",
  },
};

export default function ContactPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ContactForm />
      </Suspense>
      {/* Search engines read the organisation's contact point from here. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact FounderVoice AI",
            url: `${siteUrl}/contact`,
            mainEntity: {
              "@type": "Organization",
              name: "FounderVoice AI",
              url: siteUrl,
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                availableLanguage: ["en"],
              },
            },
          }),
        }}
      />
    </>
  );
}
