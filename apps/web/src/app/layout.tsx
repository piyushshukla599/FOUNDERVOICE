import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { AnalyticsBridge } from "@/components/AnalyticsBridge";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BRAND, ORG_ID, SITE_URL, organizationNode, webSiteNode } from "@/lib/schema";
import "./globals.css";

/*
 * Still no next/font/google. This product is local-first and has to build and
 * run offline or behind a proxy; fetching a webfont at build time made every
 * heading fall back to Times New Roman whenever that fetch failed.
 *
 * These are next/font/local instead, pointed at woff2 files that ship inside
 * the @fontsource-variable packages in node_modules. There is no network call
 * at build or at runtime, so the offline guarantee holds, and we still get the
 * things next/font does for us: preloading, a size-adjusted fallback so
 * swapping in the real face does not shift layout, and no FOUT.
 *
 * Three faces, three jobs. Display carries headlines and the one number that
 * matters; Instrument Sans carries everything you read; JetBrains Mono carries
 * everything measured, because tabular figures keep columns still while a
 * value updates.
 */

const display = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-display",
  fallback: ["Segoe UI Variable Display", "Segoe UI", "system-ui", "sans-serif"],
});

const sans = localFont({
  src: "../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-sans",
  fallback: ["Segoe UI Variable Text", "Segoe UI", "system-ui", "sans-serif"],
});

const mono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  display: "swap",
  variable: "--font-mono",
  fallback: ["Cascadia Mono", "Consolas", "ui-monospace", "monospace"],
});

// One definition of the origin, in lib/schema.ts. See the note there.
const siteUrl = SITE_URL;

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
    "free ai communication coach",
    "free ai tool for communication skills",
    "free ai for public speaking",
    "ai speaking partner",
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
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
        <Analytics />
      </body>
    </html>
  );
}
