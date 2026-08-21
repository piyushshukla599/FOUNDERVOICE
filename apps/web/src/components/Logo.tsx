/**
 * The mark is a voice waveform whose bars climb left to right, so it reads as
 * both speech and progress, which is what the product actually sells. Bars are
 * plain rects with rounded caps rather than a traced path: at 16px in a browser
 * tab a path turns to mush, while rects stay on the pixel grid and legible.
 *
 * Gradient ids are suffixed per instance because two inline SVGs on one page
 * sharing an id makes the second silently reuse the first one's stops.
 */

type MarkProps = {
  size?: number;
  className?: string;
  /** Distinct per rendered instance. */
  idSuffix?: string;
};

export function LogoMark({ size = 32, className = "", idSuffix = "d" }: MarkProps) {
  const grad = `fvGrad-${idSuffix}`;
  // Ascending, with the tallest just past centre so it looks spoken rather
  // than like a bar chart.
  const bars = [
    { x: 7, h: 8 },
    { x: 12, h: 14 },
    { x: 17, h: 22 },
    { x: 22, h: 16 },
    { x: 27, h: 10 },
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38 38"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="0.45" stopColor="#5b7cfa" />
          <stop offset="1" stopColor="#e056a0" />
        </linearGradient>
      </defs>
      <rect width="38" height="38" rx="11" fill={`url(#${grad})`} />
      {bars.map((b) => (
        <rect
          key={b.x}
          x={b.x}
          y={19 - b.h / 2}
          width="4"
          height={b.h}
          rx="2"
          fill="#fff"
          fillOpacity={0.93}
        />
      ))}
    </svg>
  );
}

export function Logo({
  size = 30,
  className = "",
  idSuffix = "w",
  showWordmark = true,
}: MarkProps & { showWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} idSuffix={idSuffix} />
      {showWordmark && (
        <span className="fv-grad-text text-[15px] font-semibold tracking-[-0.01em]">
          FounderVoice
        </span>
      )}
    </span>
  );
}
