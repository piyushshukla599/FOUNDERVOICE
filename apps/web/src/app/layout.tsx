import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

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
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0f1412",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
