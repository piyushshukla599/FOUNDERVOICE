import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/components/OgCard";
import { TOOLS, getTool } from "@/lib/tools";

/**
 * A social card per tool page. Same reasoning and the same constraint as the
 * guides card next door: no `generateImageMetadata`, because exporting it
 * moves the served path under an id segment and 404s the stable URL that
 * page.tsx puts in `og:image`.
 */

export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);

  return new ImageResponse(
    (
      <OgCard
        section="Free tool"
        title={tool?.h1 ?? "FounderVoice"}
        subtitle={tool?.description}
        facts={["Free", "Ten recordings a day", "No account"]}
      />
    ),
    size,
  );
}
