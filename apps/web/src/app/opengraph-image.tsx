import { ImageResponse } from "next/og";

/**
 * The social card, drawn rather than shipped as a PNG.
 *
 * Generating it keeps the card in step with the palette in `globals.css`, a
 * checked-in image silently goes stale the first time the brand moves. Next
 * renders this once at build time and serves a static PNG.
 *
 * Satori (the renderer) supports a subset of CSS: gradients yes, `filter:
 * blur()` no, and every element with more than one child needs an explicit
 * `display: flex`. The glow here is therefore real radial-gradients rather than
 * the blurred light sources the live site uses.
 */

export const alt = "FounderVoice: AI communication coach for founders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mirrors globals.css
const BG = "#07080d";
const INK = "#f4f3fb";
const INK_DIM = "#c2c1d6";
const MUTED = "#8b8aa3";
const VIOLET_BRIGHT = "#a78bfa";
const GOLD = "#e9c27b";

/* A waveform, tallest in the middle. The same motif as VoiceViz. */
const BARS = [
  14, 26, 20, 42, 64, 48, 88, 72, 116, 96, 140, 108, 152, 124, 96, 132, 78, 104,
  60, 84, 46, 62, 32, 44, 22, 30, 16,
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          backgroundImage: [
            "radial-gradient(900px 520px at 12% -10%, rgba(139,92,246,0.38), transparent 60%)",
            "radial-gradient(760px 460px at 92% 8%, rgba(91,124,250,0.30), transparent 62%)",
            "radial-gradient(820px 520px at 78% 108%, rgba(224,86,160,0.26), transparent 62%)",
          ].join(","),
          padding: "72px 80px",
        }}
      >
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: VIOLET_BRIGHT,
              marginRight: 16,
            }}
          />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: VIOLET_BRIGHT,
            }}
          >
            FounderVoice AI
          </div>
        </div>

        {/* The claim */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              lineHeight: 1.05,
              letterSpacing: -3,
              color: INK,
              maxWidth: 900,
            }}
          >
            Hear why you lost the room.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 30,
              lineHeight: 1.35,
              color: INK_DIM,
              maxWidth: 780,
            }}
          >
            Record once. Get the one habit costing you the most, and the drill
            that fixes it.
          </div>
        </div>

        {/* Waveform */}
        <div style={{ display: "flex", alignItems: "center", height: 160 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: h,
                marginRight: 10,
                borderRadius: 999,
                backgroundColor: i % 3 === 0 ? VIOLET_BRIGHT : "#5b7cfa",
                opacity: 0.35 + (h / 152) * 0.65,
              }}
            />
          ))}
        </div>

        {/* Footer facts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex", color: GOLD }}>Free to start</div>
          <div style={{ display: "flex", margin: "0 16px" }}>·</div>
          <div style={{ display: "flex" }}>Coached from your history</div>
          <div style={{ display: "flex", margin: "0 16px" }}>·</div>
          <div style={{ display: "flex" }}>No account needed</div>
        </div>
      </div>
    ),
    size,
  );
}
