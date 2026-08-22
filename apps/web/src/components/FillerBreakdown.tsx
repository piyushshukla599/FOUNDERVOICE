"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { api, type Finding } from "@/lib/api";
import { fmtTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Filler words, broken down by the phrase that was actually said.
 *
 * A single count ("8") tells you that you have a problem but not which one.
 * Grouping the real filler findings by `meta.phrase` turns it into something
 * you can act on: four "like" is a different habit from four "actually", and
 * each occurrence keeps the timestamp it was heard at, so you can go and hear
 * yourself do it.
 *
 * Nothing here is derived or estimated. Every row is a filler event the
 * analyser emitted, and the count is the length of that group.
 *
 * The lexicon editor lives here rather than only in Coach because this is the
 * moment someone actually cares about it - looking at their own fillers and
 * noticing that the word they personally overuse is not being counted, or that
 * something being counted is not a filler for them.
 */

type Grouped = { phrase: string; custom: boolean; times: number[] };

export function FillerBreakdown({
  events,
  onSeek,
}: {
  events: Finding[];
  /** Jump the player to a moment, when the page has a player to jump. */
  onSeek?: (t: number) => void;
}) {
  const groups = useMemo<Grouped[]>(() => {
    const map = new Map<string, Grouped>();
    for (const e of events) {
      if (e.kind !== "filler") continue;
      const meta = (e.meta || {}) as { phrase?: string; custom?: boolean };
      // Fall back to the label only if meta is missing, so a phrase never
      // silently becomes "undefined" in the list.
      const phrase = meta.phrase || e.label.replace(/^Filler:\s*/, "").replace(/"/g, "") || "filler";
      const g = map.get(phrase) || { phrase, custom: Boolean(meta.custom), times: [] };
      g.times.push(e.start);
      map.set(phrase, g);
    }
    return [...map.values()].sort((a, b) => b.times.length - a.times.length);
  }, [events]);

  const total = groups.reduce((n, g) => n + g.times.length, 0);

  return (
    <div className="space-y-6">
      {total === 0 ? (
        /* Zero is a result, not an absence. Saying so is the difference between
           coaching and a scoreboard. */
        <div>
          <p className="fv-num text-[2.1rem] leading-none text-[var(--emerald)]">0</p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--ink-dim)]">
            No filler words detected. That is a strength &mdash; keep it.
          </p>
        </div>
      ) : (
        <div>
          <p className="fv-num text-[2.1rem] leading-none text-[var(--ink)]">{total}</p>
          <p className="mt-2 text-[12.5px] text-[var(--muted)]">
            across {groups.length} {groups.length === 1 ? "phrase" : "phrases"}
          </p>

          <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {groups.map((g) => (
              <li key={g.phrase} className="py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[15px] text-[var(--ink)]">
                    &ldquo;{g.phrase}&rdquo;
                    {g.custom && (
                      <span className="fv-pill fv-pill-accent ml-2 align-middle">yours</span>
                    )}
                  </span>
                  <span className="fv-num text-[13px] text-[var(--muted)]">
                    &times;{g.times.length}
                  </span>
                </div>

                {/* Every occurrence is anchored in the audio, so each one is a
                    way back to the moment rather than a statistic. */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.times.map((t, i) =>
                    onSeek ? (
                      <button
                        key={`${t}-${i}`}
                        type="button"
                        onClick={() => onSeek(t)}
                        className="fv-pill fv-lift min-h-[28px] cursor-pointer"
                        aria-label={`Play "${g.phrase}" at ${fmtTime(t)}`}
                      >
                        {fmtTime(t)}
                      </button>
                    ) : (
                      <span key={`${t}-${i}`} className="fv-pill">
                        {fmtTime(t)}
                      </span>
                    ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FillerLexiconEditor />
    </div>
  );
}

/**
 * Which words count as fillers, for this person.
 *
 * "Like" is a filler for most founders and a normal word for some; "basically"
 * is the tell for one person and absent in another. The lexicon is per-user for
 * that reason, and the API already supported it - this just puts the control
 * where the reason to use it appears.
 *
 * Changes apply to recordings analysed from here on. Saying so up front is
 * better than someone editing the list and wondering why this report did not
 * move.
 */
export function FillerLexiconEditor() {
  const [open, setOpen] = useState(false);
  const [builtin, setBuiltin] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let alive = true;
    api
      .fillers()
      .then((f) => {
        if (!alive) return;
        setBuiltin(f.builtin || []);
        setCustom(f.custom || []);
        setLoaded(true);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load your list"));
    return () => {
      alive = false;
    };
  }, [open, loaded]);

  const add = async () => {
    const phrase = input.trim();
    if (!phrase || busy) return;
    setBusy(true);
    setError("");
    try {
      const f = await api.addFiller(phrase);
      setCustom(f.custom || []);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that word");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (phrase: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const f = await api.removeFiller(phrase);
      setCustom(f.custom || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that word");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-[var(--line)] pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="fv-quiet-link min-h-[44px] text-[13px]"
      >
        {open ? "Hide" : "Choose which words count as fillers"}
      </button>

      {open && (
        <div className="fv-cue mt-4 space-y-5">
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            &ldquo;Like&rdquo; is a filler for most people and an ordinary word for some. Add the
            ones you personally lean on. This changes recordings you make from now on, not this
            one.
          </p>

          <div>
            <label htmlFor="fv-filler-add" className="fv-label">
              Add a word or phrase
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="fv-filler-add"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void add();
                  }
                }}
                placeholder="basically"
                className="fv-input"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => void add()}
                disabled={busy || !input.trim()}
                className="fv-ghost shrink-0 px-4 disabled:opacity-50"
              >
                <Plus size={15} aria-hidden /> Add
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-[12.5px] text-[var(--danger)]">
                {error}
              </p>
            )}
          </div>

          <div>
            <p className="fv-label">Your words</p>
            {custom.length === 0 ? (
              <p className="mt-2 text-[13px] text-[var(--muted)]">
                None yet. The built-in list below is still active.
              </p>
            ) : (
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {custom.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => void remove(p)}
                      disabled={busy}
                      className={cn(
                        "fv-pill fv-pill-accent fv-lift min-h-[32px] cursor-pointer gap-1.5",
                        busy && "opacity-50",
                      )}
                      aria-label={`Remove "${p}" from your filler words`}
                    >
                      {p}
                      <X size={12} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {builtin.length > 0 && (
            <div>
              <p className="fv-label">Always counted</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--faint)]">
                {builtin.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
