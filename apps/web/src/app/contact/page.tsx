import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "./ContactForm";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { BRAND, OG_IMAGE, ORG_ID, SITE_URL } from "@/lib/schema";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: "Contact & Pro access",
  description:
    "Ask about FounderVoice Pro, report a problem, or tell us what to build next. One short form, and a reply from a person.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    url: `${siteUrl}/contact`,
    title: `Contact ${BRAND}`,
    description: "Pro access, support, press and partnerships. One short form, a real reply.",
    images: [OG_IMAGE],
  },
};

/**
 * Everything above the form is server-rendered, and the `Suspense` fallback is
 * real markup rather than `null`.
 *
 * That combination is the whole point of this file. `ContactForm` reads search
 * params, so a `null` fallback bailed the entire subtree out to client-side
 * rendering, and the page Googlebot received was a visually-hidden h1 and an
 * empty `<template>` - three words on a URL that is in the sitemap. Anything a
 * crawler or a reader with JavaScript disabled needs has to live outside the
 * boundary, and the fallback has to render something when it is inside.
 */
export default function ContactPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": `${siteUrl}/contact#page`,
        name: `Contact ${BRAND}`,
        url: `${siteUrl}/contact`,
        isPartOf: { "@id": `${siteUrl}/#website` },
        // Points at the Organization declared once in the root layout rather
        // than minting a second company with the same name.
        about: { "@id": ORG_ID(siteUrl) },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PublicHeader />

      <main className="mx-auto max-w-2xl px-6 pb-4">
        <h1 className="fv-lede">Contact {BRAND}</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-[var(--muted)]">
          Questions about Pro access, a problem with a recording, press, or a feature you want
          next. The form below reaches the same inbox as{" "}
          <a
            href="mailto:info@foundervoice.app"
            className="text-[var(--violet-bright)] hover:underline"
          >
            info@foundervoice.app
          </a>
          , so use whichever you prefer.
        </p>
        <dl className="mt-7 grid gap-5 text-[14.5px] leading-relaxed sm:grid-cols-2">
          <div>
            <dt className="font-medium text-[var(--ink)]">Support</dt>
            <dd className="mt-1 text-[var(--muted)]">
              Recording failed, analysis looks wrong, or something will not load. Say which browser
              you were using.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">Pro access</dt>
            <dd className="mt-1 text-[var(--muted)]">
              The free tier is ten recordings every 24 hours. Ask here about lifting that.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">Press and partnerships</dt>
            <dd className="mt-1 text-[var(--muted)]">
              Accelerators, founder programmes and anyone writing about delivery coaching.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">Privacy requests</dt>
            <dd className="mt-1 text-[var(--muted)]">
              Deletion of a workspace and its recordings. See the{" "}
              <a href="/privacy" className="text-[var(--violet-bright)] hover:underline">
                privacy policy
              </a>{" "}
              for what is stored.
            </dd>
          </div>
        </dl>

        <Suspense
          fallback={
            <p className="pt-10 text-[14.5px] text-[var(--faint)]">
              Loading the form. If it does not appear, email{" "}
              <a href="mailto:info@foundervoice.app" className="text-[var(--violet-bright)]">
                info@foundervoice.app
              </a>{" "}
              directly.
            </p>
          }
        >
          <ContactForm />
        </Suspense>
      </main>

      <PublicFooter />
    </>
  );
}
