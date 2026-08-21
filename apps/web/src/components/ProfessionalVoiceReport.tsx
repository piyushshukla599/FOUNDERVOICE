"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Divider, Meter, SectionTitle, Stat } from "@/components/ui";
import { fmtTime } from "@/lib/utils";

type Props = {
  payload: Record<string, unknown> | null | undefined;
  onSeek?: (t: number) => void;
};

/** A scored dimension: the name, a hairline bar, the number. No box. */
function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-[9.5rem] shrink-0 text-[12.5px] capitalize text-[var(--muted)]">
        {label.replace(/_/g, " ")}
      </span>
      <span className="min-w-0 flex-1">
        <Meter value={value ?? 0} tone={value != null && value >= 70 ? "accent" : "quiet"} />
      </span>
      <span className="fv-num w-9 shrink-0 text-right text-[13px]">
        {value == null ? "—" : Math.round(value)}
      </span>
    </div>
  );
}

/** A label with its answer under it. Used where boxes used to be. */
function Note({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="fv-eyebrow-quiet mb-1.5">{label}</p>
      <div className="text-[13.5px] leading-relaxed">{children}</div>
    </div>
  );
}

function Pill({ children, on = false }: { children: React.ReactNode; on?: boolean }) {
  return (
    <span
      className={`rounded-[var(--r-full)] px-3 py-1 text-[12px] ${
        on
          ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-[inset_0_0_0_1px_var(--accent-line)]"
          : "bg-[rgba(244,243,251,0.04)] text-[var(--ink-dim)]"
      }`}
    >
      {children}
    </span>
  );
}

export function ProfessionalVoiceReport({ payload, onSeek }: Props) {
  // The professional report is a free-form JSON blob built by the Python
  // pipeline; its shape varies with which analyses ran. Reading it loosely here
  // is deliberate. Every field below is already guarded with a fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pro = (payload?.professional || null) as Record<string, any> | null;
  if (!pro) {
    return (
      <p className="text-[13px] leading-relaxed text-[var(--muted)]">
        Professional voice analysis appears after the next recording (re-analyze older sessions to
        upgrade).
      </p>
    );
  }

  const vq = pro.voice_quality || {};
  const pitch = pro.pitch || {};
  const resonance = pro.resonance || {};
  const ep = pro.executive_presence || {};
  const authority = pro.authority || {};
  const trust = pro.trustworthiness || {};
  const emotion = pro.emotion || {};
  const breath = pro.breath || {};
  const artic = pro.articulation || {};
  const projection = pro.projection || {};
  const listener = pro.listener_fatigue || {};
  const persuasiveness = pro.persuasiveness || {};
  const accent = pro.accent_clarity || {};
  const dims = (vq.dimensions || {}) as Record<string, number>;
  const breakdown = (ep.breakdown || {}) as Record<string, number>;
  const pitchSeries = ((pitch.timeline || []) as { t: number; hz: number }[]).map((p) => ({
    t: p.t,
    hz: p.hz,
  }));
  const emotions = [
    "calmness",
    "nervousness",
    "excitement",
    "stress",
    "enthusiasm",
    "confidence",
    "hesitation",
  ];

  return (
    <div>
      {/* Headline numbers, unboxed, as one grid of type. */}
      <section>
        <SectionTitle
          eyebrow="Acoustic analysis"
          title="How you sound"
          sub="Estimates from acoustic features, not medical scores. We improve clarity and habits, never your accent."
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Voice Quality" value={vq.score ?? "—"} hint="Overall estimate" />
          <Stat label="Executive Presence" value={ep.score ?? "—"} hint={ep.biggest_weakness?.label} />
          <Stat label="Authority" value={authority.score ?? "—"} />
          <Stat label="Trust" value={trust.score ?? "—"} />
          <Stat label="Projection" value={projection.score ?? "—"} hint={projection.label} />
          <Stat label="Persuasiveness" value={persuasiveness.score ?? "—"} />
          <Stat
            label="Comfortable listen"
            value={`${listener.comfortable_listening_minutes ?? "—"} min`}
            hint="Listener fatigue estimate"
          />
          <Stat
            label="Avg pitch"
            value={pitch.average_pitch_hz ? `${Math.round(pitch.average_pitch_hz)} Hz` : "—"}
          />
        </div>
        {vq.reasoning && (
          <p className="mt-6 max-w-prose text-[13.5px] leading-relaxed text-[var(--ink-dim)]">
            {vq.reasoning}
          </p>
        )}
      </section>

      {Object.keys(dims).length > 0 && (
        <>
          <Divider />
          <section>
            <SectionTitle eyebrow="Detail" title="Voice quality dimensions" />
            <div className="space-y-3">
              {Object.entries(dims).map(([k, v]) => (
                <ScoreRow key={k} label={k} value={Number(v)} />
              ))}
            </div>
          </section>
        </>
      )}

      <Divider />
      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Melody" title="Pitch" sub={pitch.summary} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Stat label="Range" value={pitch.pitch_range_hz != null ? `${pitch.pitch_range_hz} Hz` : "—"} />
            <Stat label="Stability" value={pitch.pitch_stability ?? "—"} />
            <Stat label="Monotone" value={pitch.monotone_score ?? "—"} />
            <Stat label="Fry (est.)" value={pitch.vocal_fry_est ?? "—"} />
          </div>
          {pitchSeries.length > 2 && (
            <div className="mt-6 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pitchSeries} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <XAxis
                    dataKey="t"
                    stroke="var(--faint)"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => fmtTime(Number(v))}
                    fontSize={10}
                  />
                  <YAxis
                    stroke="var(--faint)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line-strong)",
                      borderRadius: "var(--r-md)",
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => fmtTime(Number(v))}
                  />
                  <Line type="monotone" dataKey="hz" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div>
          <SectionTitle eyebrow="Placement" title="Resonance" />
          <p className="fv-display text-[1.35rem]">{resonance.placement}</p>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            Chest {resonance.chest_resonance ?? "—"} · Nasal {resonance.nasal_resonance ?? "—"} ·
            Resonance {resonance.vocal_resonance ?? "—"}
          </p>
          <p className="mt-5 text-[13.5px] leading-relaxed">
            Recommend: {resonance.recommendation} → Labs exercise{" "}
            <span className="text-[var(--accent)]">{resonance.exercise}</span>
          </p>
          {resonance.note && (
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{resonance.note}</p>
          )}
        </div>
      </section>

      <Divider />
      <section>
        <SectionTitle eyebrow="How you land" title="Executive presence" sub={ep.reason} />
        {Object.keys(breakdown).length > 0 && (
          <div className="space-y-3">
            {Object.entries(breakdown).map(([k, v]) => (
              <ScoreRow key={k} label={k} value={Number(v)} />
            ))}
          </div>
        )}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Note label="Biggest weakness">
            <span className="fv-display block text-[1.05rem]">{ep.biggest_weakness?.label ?? "—"}</span>
            <span className="mt-1 block text-[var(--muted)]">{ep.biggest_weakness?.why}</span>
          </Note>
          <Note label="Fastest improvement">
            <span className="fv-display block text-[1.05rem]">
              {ep.fastest_improvement?.label ?? "—"}
            </span>
            <span className="mt-1 block text-[var(--muted)]">{ep.fastest_improvement?.habit}</span>
          </Note>
          <Note label="Potential after practice">
            <span className="fv-display fv-num block text-[1.05rem] text-[var(--emerald)]">
              {ep.potential_after_practice ?? "—"}
            </span>
          </Note>
        </div>
      </section>

      <Divider />
      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow={`Score ${authority.score ?? "—"}`} title="Authority" />
          <ul className="space-y-2 text-[13.5px] leading-relaxed">
            {(authority.reasons || []).map((r: string, i: number) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-[var(--r-full)] bg-[var(--accent)]" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          {authority.improvement_plan && (
            <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
              {authority.improvement_plan}
            </p>
          )}
        </div>
        <div>
          <SectionTitle eyebrow={`Score ${trust.score ?? "—"}`} title="Trust" />
          <p className="text-[13.5px] leading-relaxed">{trust.reason}</p>
          {trust.improvement_plan && (
            <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
              {trust.improvement_plan}
            </p>
          )}
        </div>
      </section>

      <Divider />
      <section>
        <SectionTitle
          eyebrow="Across the recording"
          title="Emotional voice timeline"
          sub="Click a moment to hear it."
        />
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {emotions.map((k) => (
            <ScoreRow key={k} label={k} value={emotion[k] != null ? Number(emotion[k]) : null} />
          ))}
        </div>
        {(emotion.timeline || []).length > 0 && (
          <ul className="mt-7 space-y-0.5">
            {(emotion.timeline || [])
              .slice(0, 12)
              .map((row: { t: number; label: string }, i: number) => (
                <li key={i}>
                  <button
                    type="button"
                    className="-mx-2 flex w-full items-baseline gap-3 rounded-[var(--r-sm)] px-2 py-1.5 text-left text-[13.5px] transition hover:bg-[rgba(244,243,251,0.04)]"
                    onClick={() => onSeek?.(row.t)}
                  >
                    <span className="fv-num shrink-0 text-[11px] text-[var(--faint)]">
                      {fmtTime(row.t)}
                    </span>
                    <span>{row.label}</span>
                  </button>
                </li>
              ))}
          </ul>
        )}
        {emotion.note && (
          <p className="mt-4 text-[12px] leading-relaxed text-[var(--muted)]">{emotion.note}</p>
        )}
      </section>

      <Divider />
      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Support" title="Breath" />
          <div className="space-y-2 text-[13.5px] leading-relaxed">
            <p>Timing: {breath.breath_timing}</p>
            <p>
              Frequency: <span className="fv-num">{breath.breath_frequency ?? "—"}</span> / min (est.)
            </p>
            <p className="text-[var(--muted)]">{breath.impact_on_clarity}</p>
            {breath.fix && <p className="text-[var(--emerald)]">{breath.fix}</p>}
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="How long you hold a room" title="Listener fatigue" />
          <p className="fv-display fv-num text-[2rem]">
            {listener.comfortable_listening_minutes ?? "—"}
            <span className="ml-1 text-[1rem] text-[var(--muted)]">min</span>
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{listener.why}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(listener.options || [5, 15, 30, 60]).map((m: number) => (
              <Pill key={m} on={m === listener.comfortable_listening_minutes}>
                {m}m
              </Pill>
            ))}
          </div>
        </div>
      </section>

      <Divider />
      <section>
        <SectionTitle eyebrow="Words" title="Articulation & clarity" />
        <div className="max-w-prose space-y-2 text-[13.5px] leading-relaxed">
          <p>{accent.policy}</p>
          <p className="text-[var(--muted)]">{accent.example}</p>
        </div>
        {(artic.practice_list || []).length > 0 && (
          <>
            <p className="mt-6 text-[12px] text-[var(--muted)]">
              Practice list (slow → normal → presentation):
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {artic.practice_list.map((w: string) => (
                <Pill key={w}>{w}</Pill>
              ))}
            </div>
          </>
        )}
        <p className="mt-6 text-[13.5px] leading-relaxed">
          Persuasion: {persuasiveness.where_lost} (score{" "}
          <span className="fv-num">{persuasiveness.score ?? "—"}</span>)
        </p>
      </section>

      {(pro.one_habit_next || pro.expected_if_fixed) && (
        <>
          <Divider />
          <section className="fv-halo py-2 text-center">
            <p className="fv-eyebrow-quiet mb-3">One habit next</p>
            <p className="fv-lede mx-auto max-w-2xl text-balance">{pro.one_habit_next}</p>
            {pro.expected_if_fixed && (
              <p className="mt-4 text-[13.5px] text-[var(--accent)]">
                Expected: {pro.expected_if_fixed}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function RootCauseFinding({
  event,
  onSeek,
}: {
  event: {
    label?: string;
    start?: number;
    cause?: string;
    fix?: string;
    exercise?: string;
    observation?: string;
    evidence?: string;
    impact?: string;
    expected_improvement?: string;
    weekly_trend?: string;
    meta?: Record<string, unknown>;
  };
  onSeek?: (t: number) => void;
}) {
  const observation = event.observation || event.label;
  const evidence = event.evidence || (event.meta?.evidence as string | undefined);
  const impact = event.impact || (event.meta?.impact as string | undefined);
  const expected =
    event.expected_improvement || (event.meta?.expected_improvement as string | undefined);
  const trend = event.weekly_trend || (event.meta?.weekly_trend as string | undefined);

  return (
    <button
      type="button"
      onClick={() => onSeek?.(event.start || 0)}
      className="group -mx-3 block w-full rounded-[var(--r-md)] px-3 py-3 text-left transition hover:bg-[rgba(244,243,251,0.04)]"
    >
      <div className="flex items-baseline gap-3">
        <span className="fv-num shrink-0 text-[11px] text-[var(--faint)]">
          {fmtTime(event.start || 0)}
        </span>
        <span className="fv-display text-[15px] group-hover:text-[var(--accent)]">{observation}</span>
      </div>
      <div className="mt-2.5 space-y-1.5 pl-[3.4rem] text-[13px] leading-relaxed">
        <p>
          <span className="text-[var(--accent)]">Cause: </span>
          {event.cause}
        </p>
        {evidence && (
          <p>
            <span className="text-[var(--accent)]">Evidence: </span>
            {evidence}
          </p>
        )}
        {impact && (
          <p>
            <span className="text-[var(--accent)]">Impact: </span>
            {impact}
          </p>
        )}
        <p>
          <span className="text-[var(--emerald)]">Fix: </span>
          {event.fix}
          {event.exercise ? ` · Exercise: ${event.exercise}` : ""}
        </p>
        {expected && (
          <p>
            <span className="text-[var(--emerald)]">Expected: </span>
            {expected}
          </p>
        )}
        {trend && <p className="text-[12px] text-[var(--muted)]">{trend}</p>}
      </div>
    </button>
  );
}
