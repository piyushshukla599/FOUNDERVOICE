import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/components/OgCard";

/**
 * The site-wide social card, drawn rather than shipped as a PNG.
 *
 * Generating it keeps the card in step with the palette in `globals.css`; a
 * checked-in image silently goes stale the first time the brand moves. Next
 * renders this once at build time and serves a static PNG.
 *
 * The layout itself now lives in components/OgCard.tsx, shared with the
 * per-guide and per-tool cards so all three stay identical.
 */

export const alt = "FounderVoice: AI communication coach for founders";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        title="Hear why you lost the room."
        subtitle="Record once. Get the one habit costing you the most, and the drill that fixes it."
        facts={["Free to start", "Coached from your history", "No account needed"]}
      />
    ),
    size,
  );
}
