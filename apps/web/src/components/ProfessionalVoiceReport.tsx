"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, Stat } from "@/components/ui";
import { fmtTime } from "@/lib/utils";

type Props = {
  payload: Record<string, unknown> | null | undefined;
  onSeek?: (t: number) => void;
};

export function ProfessionalVoiceReport({ payload, onSeek }: Props) {
  // The professional report is a free-form JSON blob built by the Python
  // pipeline; its shape varies with which analyses ran. Reading it loosely here
  // is deliberate. Every field below is already guarded with a fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pro = (payload?.professional || null) as Record<string, any> | null;
  if (!pro) {
    return (
      <Panel>
        <p className="text-sm text-[var(--muted)]">
          Professional voice analysis appears after the next recording (re-analyze older sessions to
          upgrade).
        </p>
      </Panel>
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

  return (
    <div className="space-y-4">
      <Panel className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl">How you sound</h3>
        <p className="text-sm text-[var(--muted)]">
          Estimates from acoustic features, not medical scores. We improve clarity and habits, never
          your accent.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <Stat label="Avg pitch" value={pitch.average_pitch_hz ? `${Math.round(pitch.average_pitch_hz)} Hz` : "—"} />
        </div>
        {vq.reasoning && <p className="text-sm leading-relaxed">{vq.reasoning}</p>}
      </Panel>

      <Panel>
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">Voice quality dimensions</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(dims).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
              <div className="text-[var(--muted)]">{k.replace(/_/g, " ")}</div>
              <div className="font-medium">{Math.round(Number(v))}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="space-y-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Pitch analysis</h3>
          <p className="text-sm text-[var(--muted)]">{pitch.summary}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Range: {pitch.pitch_range_hz ?? "—"} Hz</div>
            <div>Stability: {pitch.pitch_stability ?? "—"}</div>
            <div>Monotone: {pitch.monotone_score ?? "—"}</div>
            <div>Fry (est.): {pitch.vocal_fry_est ?? "—"}</div>
          </div>
          {pitchSeries.length > 2 && (
            <div className="mt-2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pitchSeries}>
                  <XAxis
                    dataKey="t"
                    stroke="#8fa094"
                    tickFormatter={(v) => fmtTime(Number(v))}
                    fontSize={10}
                  />
                  <YAxis stroke="#8fa094" fontSize={10} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#171e1a", border: "1px solid #2a3530" }}
                    labelFormatter={(v) => fmtTime(Number(v))}
                  />
                  <Line type="monotone" dataKey="hz" stroke="#c4a35a" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel className="space-y-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Resonance</h3>
          <p className="text-lg font-medium">{resonance.placement}</p>
          <p className="text-sm text-[var(--muted)]">
            Chest {resonance.chest_resonance ?? "—"} · Nasal {resonance.nasal_resonance ?? "—"} ·
            Resonance {resonance.vocal_resonance ?? "—"}
          </p>
          <p className="text-sm">
            Recommend: {resonance.recommendation} → Labs exercise{" "}
            <span className="text-[var(--accent)]">{resonance.exercise}</span>
          </p>
          <p className="text-xs text-[var(--muted)]">{resonance.note}</p>
        </Panel>
      </div>

      <Panel className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Executive Presence</h3>
        <p className="text-sm leading-relaxed">{ep.reason}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
              <div className="text-[var(--muted)]">{k.replace(/_/g, " ")}</div>
              <div className="font-medium">{Math.round(Number(v))}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl border border-[var(--line)] p-3">
            <div className="text-[var(--muted)]">Biggest weakness</div>
            <div className="font-semibold">{ep.biggest_weakness?.label ?? "—"}</div>
            <div className="text-[var(--muted)]">{ep.biggest_weakness?.why}</div>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <div className="text-[var(--muted)]">Fastest improvement</div>
            <div className="font-semibold">{ep.fastest_improvement?.label ?? "—"}</div>
            <div className="text-[var(--muted)]">{ep.fastest_improvement?.habit}</div>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <div className="text-[var(--muted)]">Potential after practice</div>
            <div className="font-semibold">{ep.potential_after_practice ?? "—"}</div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="space-y-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Authority · {authority.score ?? "—"}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {(authority.reasons || []).map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <p className="text-sm text-[var(--muted)]">{authority.improvement_plan}</p>
        </Panel>
        <Panel className="space-y-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Trust · {trust.score ?? "—"}</h3>
          <p className="text-sm">{trust.reason}</p>
          <p className="text-sm text-[var(--muted)]">{trust.improvement_plan}</p>
        </Panel>
      </div>

      <Panel className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Emotional voice timeline</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {["calmness", "nervousness", "excitement", "stress", "enthusiasm", "confidence", "hesitation"].map(
            (k) => (
              <span key={k} className="rounded-lg border border-[var(--line)] px-2 py-1">
                {k}: {emotion[k] != null ? Math.round(Number(emotion[k])) : "—"}
              </span>
            ),
          )}
        </div>
        <ul className="space-y-2">
          {(emotion.timeline || []).slice(0, 12).map((row: { t: number; label: string }, i: number) => (
            <li key={i}>
              <button
                type="button"
                className="text-left text-sm hover:text-[var(--accent)]"
                onClick={() => onSeek?.(row.t)}
              >
                <span className="text-[var(--muted)]">{fmtTime(row.t)}</span>{row.label}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--muted)]">{emotion.note}</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="space-y-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Breath</h3>
          <p className="text-sm">Timing: {breath.breath_timing}</p>
          <p className="text-sm">Frequency: {breath.breath_frequency ?? "—"} / min (est.)</p>
          <p className="text-sm">{breath.impact_on_clarity}</p>
          <p className="text-sm text-[var(--emerald)]">{breath.fix}</p>
        </Panel>
        <Panel className="space-y-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Listener fatigue</h3>
          <p className="text-2xl font-semibold">{listener.comfortable_listening_minutes ?? "—"} min</p>
          <p className="text-sm text-[var(--muted)]">{listener.why}</p>
          <div className="flex gap-2 text-xs text-[var(--muted)]">
            {(listener.options || [5, 15, 30, 60]).map((m: number) => (
              <span
                key={m}
                className={`rounded border px-2 py-1 ${
                  m === listener.comfortable_listening_minutes
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--line)]"
                }`}
              >
                {m}m
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Articulation & clarity</h3>
        <p className="text-sm">{accent.policy}</p>
        <p className="text-sm">{accent.example}</p>
        {(artic.practice_list || []).length > 0 && (
          <>
            <p className="text-sm text-[var(--muted)]">Practice list (slow → normal → presentation):</p>
            <div className="flex flex-wrap gap-2">
              {artic.practice_list.map((w: string) => (
                <span key={w} className="rounded-lg border border-[var(--line)] px-3 py-1 text-sm">
                  {w}
                </span>
              ))}
            </div>
          </>
        )}
        <p className="text-sm">
          Persuasion: {persuasiveness.where_lost} (score {persuasiveness.score ?? "—"})
        </p>
      </Panel>

      {(pro.one_habit_next || pro.expected_if_fixed) && (
        <Panel className="border-[var(--accent)]/30">
          <h3 className="font-[family-name:var(--font-display)] text-xl">One habit next</h3>
          <p className="mt-2 text-sm">{pro.one_habit_next}</p>
          <p className="mt-1 text-sm text-[var(--accent)]">Expected: {pro.expected_if_fixed}</p>
        </Panel>
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
      className="block w-full rounded-xl border border-[var(--line)] p-3 text-left hover:border-[var(--accent)]"
    >
      <div className="text-sm font-semibold">{observation}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">{fmtTime(event.start || 0)}</div>
      <div className="mt-2 space-y-1 text-sm">
        <div>
          <span className="text-[var(--accent)]">Cause:</span> {event.cause}
        </div>
        {evidence && (
          <div>
            <span className="text-[var(--accent)]">Evidence:</span> {evidence}
          </div>
        )}
        {impact && (
          <div>
            <span className="text-[var(--accent)]">Impact:</span> {impact}
          </div>
        )}
        <div>
          <span className="text-[var(--emerald)]">Fix:</span> {event.fix}
          {event.exercise ? ` · Exercise: ${event.exercise}` : ""}
        </div>
        {expected && (
          <div>
            <span className="text-[var(--emerald)]">Expected:</span> {expected}
          </div>
        )}
        {trend && <div className="text-xs text-[var(--muted)]">{trend}</div>}
      </div>
    </button>
  );
}
