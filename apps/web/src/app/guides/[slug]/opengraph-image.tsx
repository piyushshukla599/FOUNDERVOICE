import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/components/OgCard";
import { GUIDES, getGuide } from "@/lib/guides";

/**
 * A social card per guide, drawn from that guide's own title.
 *
 * All seventeen guides previously pointed at the site-wide card in
 * app/opengraph-image.tsx. That is one image shared by eighteen URLs, which
 * costs twice: every share of a guide shows a headline that has nothing to do
 * with the page, and `image` in the Article schema resolves to the same asset
 * for every article on the site - a sameness signal on the one field meant to
 * distinguish them.
 *
 * Deliberately no `generateImageMetadata`. Exporting it turns this into a
 * multi-image route and moves the served path to
 * /guides/<slug>/opengraph-image/<id>, which would 404 the single stable URL
 * that page.tsx puts in `og:image` and in the Article schema. The per-guide
 * `alt` is set alongside that URL in page.tsx instead.
 */

export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

/** What the eyebrow says, per cluster. */
const CLUSTER_LABEL: Record<string, string> = {
  speaking: "Delivery",
  founder: "Founder communication",
  tools: "Free AI tools",
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);

  return new ImageResponse(
    (
      <OgCard
        section={guide ? CLUSTER_LABEL[guide.cluster] : "Guides"}
        title={guide?.title ?? "FounderVoice"}
        subtitle={guide?.description}
        facts={
          guide
            ? ["Free", "No signup to read", `${guide.readMinutes} min read`]
            : ["Free", "No signup to read"]
        }
      />
    ),
    size,
  );
}
