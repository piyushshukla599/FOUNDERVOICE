import type { Metadata } from "next";

/**
 * The onboarding page is a client component, so it cannot export metadata
 * itself. Without this it inherited no canonical at all, which leaves Google
 * to pick one for it.
 */
export const metadata: Metadata = {
  title: "Start Free: Record Your First Minute",
  description:
    "Record 60 seconds of speech and get your pace, filler count, pause length and clarity measured. No account, no card, ten recordings a day.",
  alternates: { canonical: "/onboarding" },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
