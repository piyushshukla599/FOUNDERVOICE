"use client";

/**
 * Levels read as a route you move along, not a filter row.
 *
 * A rail runs behind the steps with a node on each one; the active node lights
 * up with the spectrum gradient, and steps you have already worked stay filled.
 * Selecting a step is still just filtering the list below. The difference is
 * that it now looks like progression rather than a segmented control.
 */
export function TrainingPath({
  steps,
  active,
  onSelect,
  label = "Your training path",
}: {
  steps: { n: number; name: string; blurb?: string; done?: boolean }[];
  active: number;
  onSelect: (n: number) => void;
  label?: string;
}) {
  const current = steps.find((s) => s.n === active);

  return (
    <div>
      <p className="fv-eyebrow-quiet mb-5">{label}</p>

      <div className="fv-path" role="tablist" aria-label={label}>
        {steps.map((s) => (
          <button
            key={s.n}
            type="button"
            role="tab"
            aria-selected={active === s.n}
            data-done={s.done ? "true" : "false"}
            onClick={() => onSelect(s.n)}
            className="fv-path-step text-[13px]"
          >
            <span className={active === s.n ? "font-medium" : ""}>{s.name}</span>
            <span className="fv-path-node" aria-hidden />
          </button>
        ))}
      </div>

      {current?.blurb && (
        <p key={current.n} className="fv-cue mt-7 text-center text-[12.5px] text-[var(--faint)]">
          {current.blurb}
        </p>
      )}
    </div>
  );
}
