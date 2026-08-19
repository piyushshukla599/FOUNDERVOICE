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
    default: "FounderVoice AI — Local-first Executive Speech Coach",
    template: "%s · FounderVoice AI",
  },
  description:
    "100% free local-first AI coach for founders and executives. Audio stays on your machine. Voice Memory coaches from your history — not generic tips.",
  applicationName: "FounderVoice AI",
  authors: [{ name: "FounderVoice" }],
  keywords: [
    "speech coach",
    "founder pitch",
    "executive presence",
    "local AI",
    "privacy",
    "voice memory",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "FounderVoice AI",
    title: "FounderVoice AI — Local-first Executive Speech Coach",
    description:
      "Free. Private. Local. Record once — learn why you rushed, and exactly how to fix it.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FounderVoice AI",
    description: "Local-first AI executive speech coach. Audio never leaves your machine.",
  },
  alternates: { canonical: "/" },
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
    "Local-first AI executive speech coach for founders. Record once and learn why you rushed, and exactly how to fix it.",
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
