"use client";

/**
 * The coach reading a session back to you.
 *
 * The words are always on screen, even while they are being spoken. That is
 * not a fallback for broken audio — it is the point. Somebody skims the fix
 * while the sentence about the cause is still playing, and somebody in an
 * open-plan office listens to none of it. The highlight just tells you where
 * the voice is.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button, Chip } from "@/components/ui";
import { SPEEDS, useCoachVoice } from "@/hooks/useCoachVoice";
import { api, type SpokenLine, type VoiceStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Lines the founder is meant to act on, set apart from the commentary. */
const EMPHASIS = new Set(["verdict", "issue", "fix", "lab"]);

export function CoachVoice({
  sessionId,
  autoPlay = false,
  className,
}: {
  sessionId: string;
  /** Speak as soon as the script arrives. Only ever set after a user gesture. */
  autoPlay?: boolean;
  className?: string;
}) {
  const voice = useCoachVoice();
  const [lines, setLines] = useState<SpokenLine[]>([]);
  const [server, setServer] = useState<VoiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const { play, stop, muted, playing } = voice;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .voiceScript(sessionId)
      .then((d) => {
        if (!alive) return;
        setLines(d.lines || []);
        setServer(d.voice || null);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!autoPlay || started.current || !lines.length || muted) return;
    started.current = true;
    void play(lines);
  }, [autoPlay, lines, muted, play]);

  // Leaving the page mid-sentence should not leave a voice talking to an empty
  // room; the browser keeps speaking across a client-side navigation.
  useEffect(() => stop, [stop]);

  const replay = useCallback(() => {
    if (playing) stop();
    else void play(lines);
  }, [lines, play, playing, stop]);

  if (failed) return null;

  const lab = lines.find((l) => l.lab_key);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={playing ? "secondary" : "primary"}
          size="sm"
          onClick={replay}
          disabled={loading || !lines.length || muted}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? "Stop" : "Hear this from the coach"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={voice.toggleMute}
          aria-pressed={muted}
          title={muted ? "Let the coach speak" : "Silence the coach"}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          {muted ? "Voice off" : "Voice on"}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {SPEEDS.map((speed) => (
            <Chip
              key={speed.label}
              selected={Math.abs(voice.rate - speed.rate) < 0.02}
              onClick={() => voice.chooseSpeed(speed.rate)}
            >
              {speed.label}
            </Chip>
          ))}

          {/* Only when the browser is doing the speaking: with a hosted voice
              the operator has already chosen one, and this list would not
              change what you hear. */}
          {!server?.tts && voice.voices.length > 1 && (
            <label className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
              <span className="sr-only">Coach voice</span>
              <select
                value={voice.voiceName}
                onChange={(e) => voice.chooseVoice(e.target.value)}
                className="rounded-[var(--r-full)] border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-[12px] text-[var(--ink)]"
              >
                {voice.voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Writing what the coach would say…</p>
      ) : (
        <ol className="space-y-2.5">
          {lines.map((line) => {
            const live = voice.speakingId === line.id;
            return (
              <li
                key={line.id}
                className={cn(
                  "rounded-[var(--r-md)] px-3.5 py-2.5 text-sm leading-relaxed transition-colors",
                  EMPHASIS.has(line.kind) ? "text-[var(--ink)]" : "text-[var(--muted)]",
                  live
                    ? "bg-[var(--accent-soft)] text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--accent-line)]"
                    : "bg-transparent",
                )}
              >
                {line.text}
              </li>
            );
          })}
        </ol>
      )}

      {lab?.lab_key && (
        <Link
          href={`/trainer?lab=${encodeURIComponent(lab.lab_key)}`}
          className="inline-flex text-[13px] text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Open the {lab.lab_title || "recommended"} lab →
        </Link>
      )}

      {!voice.supported && !server?.tts && (
        <p className="text-[12px] text-[var(--muted)]">
          This browser has no speech built in, so the review stays written. Chrome, Edge and Safari
          will read it aloud.
        </p>
      )}
    </div>
  );
}
