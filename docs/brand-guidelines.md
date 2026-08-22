# FounderVoice Brand Guidelines v1.0

> Last updated: 2026-08-22
> Status: Extracted from shipped code. Every value below is what the product
> actually renders — sourced from `apps/web/src/app/globals.css`,
> `apps/web/src/app/layout.tsx`, `AGENTS.md`, and `docs/SEO.md`.
> One open conflict is recorded in §7.

## Quick Reference

| Element | Value |
|---------|-------|
| Name | FounderVoice (one word, one spelling, everywhere) |
| Primary Color | #8B5CF6 |
| Secondary Color | #5B7CFA |
| Primary Font | Inter |
| Voice | Specific, Causal, Honest, Unhurried |

---

## 1. Color Palette

The base is near-black with a blue cast, lit from behind by violet, indigo and
magenta. Gradients are **lighting behind the interface**, never decoration on
top of it. Gold is reserved for genuine premium emphasis.

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Violet | #8B5CF6 | rgb(139,92,246) | `--accent`; primary CTAs, focus, selection |
| Violet Bright | #A78BFA | rgb(167,139,250) | `--accent-bright`; eyebrows, links, focus ring |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Indigo | #5B7CFA | rgb(91,124,250) | Mid-stop of the signature gradient |
| Magenta | #E056A0 | rgb(224,86,160) | End-stop of the signature gradient |
| Gold | #E9C27B | rgb(233,194,123) | Premium only: upgrade, streaks, milestones |
| Emerald | #3FD69A | rgb(63,214,154) | Positive metric states, completion |

### Neutral Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Background | #07080D | rgb(7,8,13) | `--bg`; page base |
| Surface | #0D0F18 | rgb(13,15,24) | `--surface`; panels |
| Surface 2 | #141726 | rgb(20,23,38) | `--surface-2`; raised panels |
| Surface 3 | #1C2036 | rgb(28,32,54) | `--surface-3`; highest elevation |
| Ink | #F4F3FB | rgb(244,243,251) | `--ink`; headings, body |
| Ink Dim | #C2C1D6 | rgb(194,193,214) | `--ink-dim`; secondary text |
| Muted | #8B8AA3 | rgb(139,138,163) | `--muted`; captions, supporting copy |
| Faint | #5C5B74 | rgb(92,91,116) | `--faint`; fine print, disclaimers |

Lines are hairlines only: `--line` is `rgba(244,243,251,0.07)`,
`--line-strong` is `rgba(244,243,251,0.14)`. Never a solid 1px grey border.

### Semantic Colors

| State | Hex | Usage |
|-------|-----|-------|
| Success | #3FD69A | Improved metrics, completed exercises |
| Warning | #F0B849 | Thresholds crossed, estimate caveats |
| Error | #F2617A | Failed recording, mic denied, destructive actions |
| Info | #5B7CFA | Neutral notices |

### The Signature Gradient

```css
--grad: linear-gradient(120deg, #8B5CF6 0%, #5B7CFA 45%, #E056A0 100%);
```

Used on: the app icon, `.fv-hero` primary buttons, and `.fv-grad-text` — which
is for **the one number that matters** on a screen, never a whole heading.

### Accessibility

- Ink #F4F3FB on Background #07080D: ~17:1 (AAA).
- Muted #8B8AA3 on Background: ~6.4:1 (AA for body, AAA for large).
- Faint #5C5B74 is below AA — restrict it to non-essential fine print.
- Focus is always visible: `2px solid var(--violet-bright)`, 3px offset.
- All motion (atmosphere drift, halo breathe, stagger) must respect
  `prefers-reduced-motion`.

---

## 2. Typography

### Font Stack

Resolved from the OS. **No webfont fetch** — the app is local-first and must
look right offline.

```css
--font-heading: 'Inter', 'Inter var', 'Segoe UI Variable Display', 'Segoe UI', -apple-system, system-ui, sans-serif;
--font-body: 'Inter', 'Inter var', 'Segoe UI Variable Text', 'Segoe UI', -apple-system, system-ui, sans-serif;
--font-mono: 'Cascadia Mono', Consolas, ui-monospace, monospace;
```

Root font size is **15px**, not 16px. Body line-height 1.55, letter-spacing
-0.011em.

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| Lede (`.fv-lede`) | clamp(1.45rem, 1rem + 1.9vw, 2.5rem) | 500 | 1.14 | -0.036em |
| Display (`.fv-display`) | contextual | 600 | 1.15 | -0.034em |
| H1–H3 | contextual | 600 | 1.15 | -0.032em |
| Body | 15px | 400 | 1.55 | -0.011em |
| Small | 14px | 400 | 1.5 | -0.011em |
| Caption | 12.5px | 400 | 1.5 | -0.011em |
| Eyebrow (`.fv-eyebrow`) | 11px | 400 | 1.2 | 0.2em, uppercase |

Numbers use `.fv-num` — tabular figures, -0.03em. Paragraphs cap at `44rem`;
the lede caps at `22ch`.

---

## 3. Logo Usage

### Variants

| Variant | File | Usage |
|---------|------|-------|
| App mark | `apps/web/src/app/icon.svg` | Favicon, nav, PWA |
| Apple icon | `apps/web/src/app/apple-icon.tsx` | iOS home screen |
| OG image | `apps/web/src/app/opengraph-image.tsx` | Social preview |

The mark is five rounded bars — a waveform — in white at 93% opacity on a
38×38 rounded rect (11px radius) filled with the signature gradient.

### Clear Space

Minimum clear space on all sides equals the corner radius of the mark
(11/38 of its width).

### Minimum Size

16px square. Below that the five bars stop resolving — use a single bar.

### Don'ts

| Don't | Why |
|-------|-----|
| Recolor the mark's gradient | The gradient is the brand |
| Place the mark on a light background | It is drawn for a near-black base |
| Stretch or re-space the bars | They read as a waveform only at these ratios |
| Add a wordmark lockup that spells "Founder Voice" | One word, one spelling |

---

## 4. Voice & Tone

The product's own thesis is the voice rule: most tools say *"You spoke too
fast."* FounderVoice answers *"Why did you speak too fast, what caused it, and
exactly how do you fix it?"* Marketing copy holds the same bar as coaching copy.

### Core Attributes

| Attribute | Meaning |
|-----------|---------|
| **Specific** | Name the habit and the number, never "improve your delivery" |
| **Causal** | Observation → likely cause → concrete fix → exercise |
| **Honest** | Estimates are labelled estimates; no faked precision |
| **Unhurried** | Calm executive tool. Short sentences, no exclamation marks |

### Brand Personality

| Trait | Expression |
|-------|------------|
| **Specific** | "Every um, uh, like, you know and so, counted and timestamped" |
| **Causal** | "Learn exactly which habit is costing you the room, and how to fix it" |
| **Honest** | "Free: ten recordings every 24 hours and two practice rounds. No account." |
| **Unhurried** | "Record sixty seconds." — not "Get started in seconds!" |

### Voice Chart

| We are | We are not |
|--------|------------|
| A coach | A dashboard |
| Direct about the flaw | Harsh about the person |
| Numeric where numbers help | A metrics dump |
| Plain-spoken | Corporate or hype |

### Tone by Context

| Context | Tone |
|---------|------|
| Landing / marketing | Confident, concrete, zero hype. Lead with what the user does, not what the AI is |
| Coaching output | Second person, causal chain, one fix at a time. Max 3 insights on first run |
| Empty & error states | Practical and blameless. Say what happened and the next action |
| Privacy / limits | Flat and literal. Never soften a limit into marketing |

### Prohibited Terms

| Avoid → use instead |
|---------------------|
| "Improve your English" → "communicate at a founder level" |
| "English communication skills" → "investor pitch", "board update", "founder delivery" |
| "Non-native speaker" → "founders, executives, public speakers" |
| "Fix your accent" → "clarity, pace, filler rate" |
| "Communication skills" (unqualified) → name the moment: the pitch, the Q&A, the interview |
| "Language learning", "speak better English", "fluency" → out of scope entirely |
| "Revolutionary / game-changing / unlock / supercharge" → say the actual result |
| "FounderVoice AI" / "Founder Voice" / "Foundervoice" → "FounderVoice" |
| "Powered by AI" → name the concrete thing it does |

### Positioning

FounderVoice coaches **founder-level communication** — and only ever the
founder-level kind. It is not an English tutor, not a language app, and not a
generic "communication skills" course.

The word *communication* never travels alone. It is always qualified by
*founder* or by the actual high-stakes moment being coached:

| In scope | Out of scope |
|----------|--------------|
| Investor pitch, the sixty-second version and the Q&A after it | Improving someone's English |
| Demo day and product explanation | Accent reduction or pronunciation drilling |
| Board updates and standups | Grammar, vocabulary, fluency |
| Interview and resume pitch — talking about your own work | General public-speaking theory |
| Long-form answers where rambling costs you the edit | ESL / language learning of any kind |

We measure delivery — pace, fillers, pauses, clarity, pitch variation — against
the user's own history. We never assess their English.

The single deliberate exception in the whole product is the guide at
`/guides/how-to-improve-english-communication-skills`, which targets that exact
search query and keeps its English wording on purpose. It is an acquisition
page, not a statement of what the product is. Nothing else — no title, tagline,
`llms.txt` line, or guide — may describe FounderVoice in English-improvement
terms.

**Naming rule:** the brand is `BRAND`, exported from
`apps/web/src/lib/schema.ts`. Titles use the template `%s · FounderVoice`.

---

## 5. Imagery Guidelines

### Photography Style

Effectively none. The product ships no photography — the visual interest is
light, not stock imagery. If photography is ever added it must be dark-room,
single-source, no smiling-team-around-a-laptop framing.

### Illustrations

Light and waveform only. Blurred radial gradients as atmosphere, animated
slowly (52s drift, 19s halo breathe). A 0.035-opacity fractal-noise grain
overlays everything so darks never read as flat #000.

### Icons

Line icons, ~1.5px stroke, `currentColor`. No filled-shape icon sets, no emoji
in product UI.

---

## 6. Design Components

### Buttons

| Variant | Class | Spec |
|---------|-------|------|
| Primary | `.fv-hero` | 52px tall, pill, gradient fill, white 600, ring + 34px glow, lifts 1px on hover, arrow slides 4px |
| Secondary | `.fv-ghost` | 44px tall, pill, `rgba(244,243,251,0.05)` fill, ink-dim text |
| Premium | `.fv-gold` | Gold text. Upgrade, streaks, milestones only |

Disabled is `opacity: 0.5` with `cursor: not-allowed`.

### Surfaces

Glass, not cards: `.fv-raised` is a hairline plus a 4.5%→1.5% vertical fill.
Never a solid grey card.

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--r-sm` | 10px | Inputs, pills inside dense rows |
| `--r-md` | 14px | Tiles, small panels |
| `--r-lg` | 22px | Hero panels, modals |
| `--r-full` | 999px | Buttons, badges, the record dot |

---

## 7. Open Conflict

`AGENTS.md` (UX principles) states: *"Brand: FounderVoice AI — calm executive
tool, not generic AI purple SaaS."* The shipped design language in
`globals.css` is explicitly violet/indigo/magenta.

These cannot both be the standard. This document records **what ships** as of
2026-08-22. Resolve by either updating the `AGENTS.md` line to match the
shipped spectrum, or re-theming the app away from violet. Until then, treat
this file as the source of truth for color and `AGENTS.md` as the source of
truth for product behaviour.

Note also that `AGENTS.md` uses "FounderVoice AI" while `docs/SEO.md` mandates
the single spelling "FounderVoice".

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-08-22 | Extracted from shipped code and product docs |
