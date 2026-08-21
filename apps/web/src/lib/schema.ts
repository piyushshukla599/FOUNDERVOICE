/**
 * Structured data shared across pages.
 *
 * Every page used to declare its own `Organization` inline, which produced
 * eleven separate publisher entities that happened to have the same name.
 * Search engines resolve entities by `@id`, so one node with a stable id and
 * references to it everywhere else describes a single company; copies describe
 * a coincidence. The ids are URL fragments on the site origin because that is
 * the convention crawlers already expect.
 *
 * Nothing here asserts anything that is not true on the page. There are no
 * ratings, no founder credentials and no `sameAs` profiles, because inventing
 * any of them is both a policy violation and trivially checkable.
 */

export const ORG_ID = (site: string) => `${site}/#organization`;
export const SITE_ID = (site: string) => `${site}/#website`;

export const BRAND = "FounderVoice";

/**
 * The social card, drawn by app/opengraph-image.tsx.
 *
 * It has to be named explicitly by any page that declares its own `openGraph`
 * block. Next.js attaches the file-convention image automatically only while a
 * route inherits the parent's Open Graph metadata; the moment a page sets
 * `openGraph` itself, that object replaces the parent's and the image goes
 * with it. Guide pages had no `og:image` at all for this reason, and /guides
 * lost the one it had the day it gained an `openGraph` block.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${BRAND}: AI communication coach for founders`,
} as const;

export function organizationNode(site: string) {
  return {
    "@type": "Organization",
    "@id": ORG_ID(site),
    name: BRAND,
    url: site,
    // The generated social card doubles as the brand mark. A logo that does
    // not exist is worse than no logo property at all.
    logo: {
      "@type": "ImageObject",
      url: `${site}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    description:
      "FounderVoice is a web-based AI communication coach for founders. It measures speaking pace, filler words, pauses, clarity and vocal energy from a recording and names the one habit to fix.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@foundervoice.app",
      url: `${site}/contact`,
    },
  };
}

export function webSiteNode(site: string) {
  return {
    "@type": "WebSite",
    "@id": SITE_ID(site),
    name: BRAND,
    url: site,
    inLanguage: "en",
    publisher: { "@id": ORG_ID(site) },
  };
}
