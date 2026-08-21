import type { Metadata, Viewport } from "next";
import { AnalyticsBridge } from "@/components/AnalyticsBridge";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BRAND, ORG_ID, organizationNode, webSiteNode } from "@/lib/schema";
import "./globals.css";

// No next/font/google here on purpose. This product is local-first and has to
// build and run offline or behind a proxy; fetching Inter at build time made
// every heading fall back to Times New Roman whenever that fetch failed.
// Typefaces are resolved from the OS in globals.css instead.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// One spelling of the name, everywhere. "FounderVoice AI", "Founder Voice" and
// "FounderVoice" competing across titles, schema and footer split the brand
// into three entities as far as a search engine is concerned, and none of them
// accumulates the signal the other two earned.

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND}: Communication Coach for Founders`,
    template: `%s · ${BRAND}`,
  },
  description:
    "Free AI communication coach for founders. Record sixty seconds and learn which delivery habit is costing you the room, measured against your own history.",
  applicationName: BRAND,
  authors: [{ name: BRAND, url: siteUrl }],
  creator: BRAND,
  publisher: BRAND,
  keywords: [
    "founder communication",
    "investor pitch practice",
    "startup pitch practice",
    "AI communication coach",
    "speaking pace words per minute",
    "how to stop filler words",
    "how to speak with confidence",
    "presentation practice",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: BRAND,
    title: `${BRAND}: Communication Coach for Founders`,
    description: "Free. Record once, learn why you rushed, and exactly how to fix it.",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND,
    description: "Founder communication, measured. Record once, and learn exactly what to fix.",
  },
  // No canonical here on purpose. In the root layout it is inherited by every
  // page that does not set its own, which declared /contact, /privacy and the
  // rest duplicates of the homepage and kept them out of the index.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#07080d",
  width: "device-width",
  initialScale: 1,
};

/**
 * Site-wide structured data, emitted from the root layout so every page
 * carries the same brand entity. Individual pages add their own nodes
 * (Article, BreadcrumbList) and reference this Organization by `@id` rather
 * than redeclaring it, which is what makes them one company instead of eleven.
 *
 * The free allowance in `offers` mirrors `free_upload_limit` and
 * `free_practice_limit` in apps/api/app/config.py. It previously advertised
 * five recordings while the API granted ten, and schema that contradicts the
 * page is the kind of thing that costs a rich result outright.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationNode(siteUrl),
    webSiteNode(siteUrl),
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#app`,
      name: BRAND,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      publisher: { "@id": ORG_ID(siteUrl) },
      description:
        "AI communication coach for founders. Record sixty seconds and learn why you rushed, and exactly how to fix it.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free: ten recordings every 24 hours and two practice rounds. No account.",
      },
      featureList: [
        "Speaking pace in words per minute",
        "Filler word count with timestamps",
        "Pause length and placement",
        "Word-level clarity",
        "Vocal energy and pitch range",
        "Voice Memory across sessions",
        "Investor practice under pressure",
      ],
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <AnalyticsBridge />
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
