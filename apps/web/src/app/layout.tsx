import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

// No next/font/google here on purpose. This product is local-first and has to
// build and run offline or behind a proxy; fetching Inter at build time made
// every heading fall back to Times New Roman whenever that fetch failed.
// Typefaces are resolved from the OS in globals.css instead.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FounderVoice AI: Founder-Level Communication Coach",
    template: "%s · FounderVoice AI",
  },
  description:
    "Free AI speech coach for founders. Record sixty seconds and learn which delivery habit is costing you the room, measured against your own history.",
  applicationName: "FounderVoice AI",
  authors: [{ name: "FounderVoice" }],
  keywords: [
    "AI speech coach",
    "founder communication",
    "executive presence",
    "investor pitch delivery",
    "pitch practice",
    "public speaking practice",
    "speaking pace words per minute",
    "how to stop filler words",
    "speak with confidence",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "FounderVoice AI",
    title: "FounderVoice AI: Founder-Level Communication Coach",
    description:
      "Free. Record once, learn why you rushed, and exactly how to fix it.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FounderVoice AI",
    description:
      "Founder-level communication, measured. Record once, and learn exactly what to fix.",
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

/* Structured data: tells search engines this is a free web application, which
   is what earns the rich result rather than a plain blue link. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FounderVoice AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description:
    "AI communication coach for founders. Record once and learn why you rushed, and exactly how to fix it.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier: 5 recordings and 2 investor practice rounds.",
  },
  featureList: [
    "Local Whisper transcription",
    "Founder Voice score",
    "Voice Memory across sessions",
    "Targeted speaking labs",
    "Investor practice under pressure",
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
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
