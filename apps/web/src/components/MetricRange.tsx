import { cn } from "@/lib/utils";

/**
 * The primary metric, drawn rather than printed.
 *
 * A number on its own ("177 WPM") makes the reader do the work: is that good,
 * how far off is it, was it better last time. The track answers all three at a
 * glance - where the target sits, where you are, and where you were - and the
 * copy underneath only has to say why it matters.
 *
 * It deliberately does not force every metric into one shape. A metric with a
 * target band (pace) gets the band; a metric where more is simply better
 * (clarity) gets a fill; a metric where less is better (fillers) inverts. Pass
 * what is true and the component draws the right thing.
 */

export type MetricRangeProps = {
  label: string;
  value: number;
  unit?: string;
  /** Scale bounds. Values outside are clamped for drawing, never for display. */
  min: number;
  max: number;
  /** The good zone, when the metric has one. Pace is 130-145, not "more". */
  ideal?: [number, number];
  /** Previous take, when there is one to compare against. */
  previous?: number | null;
  /** Direction of "better" when there is no band. */
  goal?: "higher" | "lower";
  className?: string;
};

const pct = (v: number, min: number, max: number) =>
  Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));

export function MetricRange({
  label,
  value,
  unit,
  min,
  max,
  ideal,
  previous,
  goal = "higher",
  className,
}: MetricRangeProps) {
  const here = pct(value, min, max);
  const before = previous != null && Number.isFinite(previous) ? pct(previous, min, max) : null;

  const inTarget = ideal ? value >= ideal[0] && value <= ideal[1] : null;
  const bandStart = ideal ? pct(ideal[0], min, max) : null;
  const bandWidth = ideal ? pct(ideal[1], min, max) - pct(ideal[0], min, max) : null;

  // Without a band, the fill itself carries the reading: it grows from the end
  // that counts as good, so a short bar always means "work to do".
  const fillFromLeft = goal === "higher";

  const tone = inTarget === null ? "neutral" : inTarget ? "good" : "off";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[13px] font-medium text-[var(--muted)]">{label}</h3>
        {ideal && (
          <p className="fv-num text-[11.5px] text-[var(--faint)]">
            ideal {ideal[0]}&ndash;{ideal[1]}
            {unit ? ` ${unit}` : ""}
          </p>
        )}
      </div>

      <p className="mt-1.5 flex items-baseline gap-2">
        <span
          className={cn(
            "fv-num text-[2.1rem] leading-none tracking-tight",
            tone === "good" ? "text-[var(--emerald)]" : "text-[var(--ink)]",
          )}
        >
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        {unit && <span className="text-[12.5px] text-[var(--muted)]">{unit}</span>}
      </p>

      {/* The track. aria-hidden because the numbers above and the summary below
          already say everything it shows; a screen reader gains nothing from
          being read a series of positioned divs. */}
      <div className="mt-3.5" aria-hidden>
        <div className="relative h-1.5 rounded-[var(--r-full)] bg-[rgba(244,243,251,0.07)]">
          {ideal ? (
            <span
              className="absolute inset-y-0 rounded-[var(--r-full)] bg-[var(--emerald-soft)] shadow-[inset_0_0_0_1px_rgba(63,214,154,0.28)]"
              style={{ left: `${bandStart}%`, width: `${bandWidth}%` }}
            />
          ) : (
            <span
              className="absolute inset-y-0 rounded-[var(--r-full)] bg-[var(--accent)] opacity-70"
              style={
                fillFromLeft
                  ? { left: 0, width: `${here}%` }
                  : { right: 0, width: `${100 - here}%` }
              }
            />
          )}

          {before != null && (
            <span
              className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-[var(--faint)]"
              style={{ left: `${before}%` }}
            />
          )}

          <span
            className={cn(
              "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-full)] border-2 border-[var(--bg)]",
              tone === "good" ? "bg-[var(--emerald)]" : "bg-[var(--ink)]",
            )}
            style={{ left: `${here}%` }}
          />
        </div>

        <div className="fv-num mt-2 flex justify-between text-[10.5px] text-[var(--faint)]">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>

      {/* The one line a reader actually needs, in words rather than position. */}
      <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
        {ideal
          ? inTarget
            ? "Inside your target range."
            : value > ideal[1]
              ? `${Math.round(value - ideal[1])}${unit ? ` ${unit}` : ""} above your target range.`
              : `${Math.round(ideal[0] - value)}${unit ? ` ${unit}` : ""} below your target range.`
          : null}
        {before != null && previous != null && (
          <>
            {ideal ? " " : ""}
            Last time {Number.isInteger(previous) ? previous : previous.toFixed(1)}
            {unit ? ` ${unit}` : ""}.
          </>
        )}
      </p>
    </div>
  );
}
