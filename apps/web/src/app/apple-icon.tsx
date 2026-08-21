import { ImageResponse } from "next/og";

/**
 * The home-screen icon, generated rather than committed as a binary so it
 * stays in step with the logo in `components/Logo.tsx`. Apple ignores SVG
 * icons, so this is the only way an installed shortcut gets the real mark
 * instead of a screenshot of the page.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // Same ascending waveform as the logo, scaled for 180px.
  const bars = [
    { h: 38, x: 33 },
    { h: 66, x: 57 },
    { h: 104, x: 81 },
    { h: 76, x: 105 },
    { h: 47, x: 129 },
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8b5cf6 0%, #5b7cfa 45%, #e056a0 100%)",
          position: "relative",
        }}
      >
        {bars.map((b) => (
          <div
            key={b.x}
            style={{
              position: "absolute",
              left: b.x,
              top: 90 - b.h / 2,
              width: 18,
              height: b.h,
              borderRadius: 9,
              background: "rgba(255,255,255,0.94)",
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
