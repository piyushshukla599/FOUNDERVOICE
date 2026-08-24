/**
 * The shared layout for a generated social card.
 *
 * There are three of these routes now (the site card, one per guide, one per
 * tool) and they have to stay visually identical, because a share of a guide
 * and a share of the homepage are both the brand showing up in someone's feed.
 * Three copies of the same gradient stack drift the first time one is touched.
 *
 * Satori renders these, and its CSS subset is narrower than a browser's:
 * gradients yes, `filter: blur()` no, and every element with more than one
 * child needs an explicit `display: flex`.
 */

// Mirrors globals.css.
const BG = "#07080d";
const INK = "#f4f3fb";
const INK_DIM = "#c2c1d6";
const MUTED = "#8b8aa3";
const VIOLET_BRIGHT = "#a78bfa";
const GOLD = "#e9c27b";

export const OG_SIZE = { width: 1200, height: 630 };

/** Cuts at a word boundary. Slicing at a fixed index put the ellipsis mid-word
 *  ("a two-...") on cards whose description happened to cross the limit
 *  inside a hyphenated compound, which is visible on every share. */
function trim(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\-–—]$/, "")}…`;
}

export function OgCard({
  section,
  title,
  subtitle,
  facts,
}: {
  /** The eyebrow after the wordmark: which part of the site this is. */
  section?: string;
  title: string;
  subtitle?: string;
  /** Footer line. The first is tinted gold, as on the site card. */
  facts: string[];
}) {
  // Long titles have to come down in size; Satori has no text-overflow to fall
  // back on and will simply run the line off the canvas.
  const titleSize = title.length > 46 ? 62 : title.length > 32 ? 70 : 80;

  return (
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
          FounderVoice
        </div>
        {section && (
          <>
            <div style={{ display: "flex", margin: "0 18px", color: MUTED, fontSize: 22 }}>·</div>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: MUTED }}>
              {section}
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            lineHeight: 1.06,
            letterSpacing: -3,
            color: INK,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 27,
              lineHeight: 1.35,
              color: INK_DIM,
              maxWidth: 860,
            }}
          >
            {trim(subtitle, 150)}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", fontSize: 24, color: MUTED }}>
        {facts.map((fact, i) => (
          <div key={fact} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && <div style={{ display: "flex", margin: "0 16px" }}>·</div>}
            <div style={{ display: "flex", color: i === 0 ? GOLD : MUTED }}>{fact}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
