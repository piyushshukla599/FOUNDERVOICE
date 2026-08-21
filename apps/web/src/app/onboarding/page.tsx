"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { Button, ChoiceCard, ErrorBanner, HeroButton, LinkButton, Steps } from "@/components/ui";
import { PracticeRecorderBar } from "@/components/PracticeRecorderBar";
import { VoiceViz } from "@/components/VoiceViz";
import { usePracticeRecorder } from "@/hooks/usePracticeRecorder";
import { api } from "@/lib/api";
import { DAILY_PROMPTS } from "@/lib/founderScore";
import { FOCUS_OPTIONS, GOAL_OPTIONS, usePrefs, type FocusKey, type GoalKey } from "@/lib/prefs";

type Step = "welcome" | "how" | "goal" | "record";

const CHECK_PROMPT = DAILY_PROMPTS[0];

export default function OnboardingPage() {
  const router = useRouter();
  const rec = usePracticeRecorder();
  const { prefs, update } = usePrefs();
  const [step, setStep] = useState<Step>("welcome");
  const [goal, setGoal] = useState<GoalKey>("investor_pitch");
  const [name, setName] = useState("");
  const [focus, setFocus] = useState<FocusKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const finishSetup = async () => {
    update({ goal, focus, name: name.trim(), onboardedAt: new Date().toISOString() });
    try {
      await api.setVoiceGoal(goal);
    } catch {
      /* the plan still rebuilds from defaults if the API is cold */
    }
    setStep("record");
  };

  const finishCheck = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await rec.stop();
      if (!result || result.blob.size < 800) {
        setError("That was too short to read. Speak the prompt for about a minute, then stop.");
        setBusy(false);
        return;
      }
      const uploaded = await api.upload(result.blob, "First check · Company in 45s", "exercise", {
        exercise_key: "one_liner",
        exercise_title: CHECK_PROMPT.label,
        exercise_category: "daily",
        exercise_description: CHECK_PROMPT.text,
        focus_note: CHECK_PROMPT.text,
      });
      update({ onboardedAt: new Date().toISOString() });
      router.push(`/sessions/${uploaded.session_id}?first=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Is the local API running on port 8000?");
      setBusy(false);
    }
  };

  const skip = () => {
    update({ goal, focus, name: name.trim(), onboardedAt: new Date().toISOString() });
    router.push("/today");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8 md:py-14">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            FounderVoice
          </span>
          {step !== "welcome" && (
            <button
              type="button"
              onClick={() => setStep(step === "record" ? "goal" : "welcome")}
              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          {step === "welcome" && (
            <section className="space-y-8 py-6">
              <div className="space-y-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                  FounderVoice
                </p>
                <h1 className="fv-display text-[2.4rem] leading-[1.08] tracking-tight md:text-[3.2rem]">
                  Become a better speaker.{" "}
                  <span className="block text-[var(--muted)]">One conversation at a time.</span>
                </h1>
              </div>

              <VoiceViz active={false} height={128} />

              <div className="space-y-6">
                <div>
                  <p className="text-[13px] text-[var(--emerald)]">Your coach is ready.</p>
                  <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-[var(--ink-dim)]">
                    Record 60 seconds of natural speech. We name the one habit costing you the most,
                    and give you something specific to practice.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <HeroButton onClick={() => setStep("goal")}>Start practicing</HeroButton>
                  <button
                    type="button"
                    onClick={() => setStep("how")}
                    className="text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
                  >
                    See how it works
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[12px] text-[var(--faint)]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-[var(--emerald)]" />
                    Audio stays on this machine
                  </span>
                  <button
                    type="button"
                    onClick={skip}
                    className="underline-offset-4 transition-colors hover:text-[var(--muted)]"
                  >
                    Skip for now
                  </button>
                </div>
              </div>

              {/* Below the button on purpose. This is the page every guide CTA
                  lands on, and it answered none of the questions someone
                  arriving cold actually has - it was 62 words to a crawler and
                  not many more to a reader. Nothing here sits between anyone
                  and the record button. */}
              <div className="max-w-xl space-y-6 border-t border-[var(--line)] pt-8">
                <div>
                  <h2 className="text-[15px] font-medium text-[var(--ink)]">
                    What the next minute looks like
                  </h2>
                  <ol className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-[var(--muted)]">
                    <li>
                      <span className="text-[var(--ink-dim)]">You answer one question aloud.</span>{" "}
                      The kind you would get in an interview, a standup or a pitch. Sixty seconds is
                      enough, and unrehearsed is better than polished - rehearsed speech hides the
                      habits worth finding.
                    </li>
                    <li>
                      <span className="text-[var(--ink-dim)]">You get five numbers.</span> Speaking
                      pace in words per minute, filler words per minute, how long your pauses run,
                      word-level clarity, and pitch range. Each one comes with the timestamp that
                      produced it, so you can hear the moment rather than trust a score.
                    </li>
                    <li>
                      <span className="text-[var(--ink-dim)]">You get one drill.</span> Not a list
                      of twelve. The single habit costing you the most, chosen from what your
                      recording actually showed.
                    </li>
                  </ol>
                </div>

                <div>
                  <h2 className="text-[15px] font-medium text-[var(--ink)]">
                    What it costs and what it keeps
                  </h2>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">
                    Ten recordings every 24 hours, free, with no account, no card and no trial
                    period. Recordings belong to the workspace held by this browser, so they are
                    not shared with anyone else who visits. After three sessions the coaching stops
                    being generic and starts comparing you against your own history.
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === "how" && (
            <section className="space-y-6">
              <div className="space-y-2">
                <p className="fv-eyebrow">How it works</p>
                <h1 className="fv-display text-3xl md:text-4xl">One loop, repeated.</h1>
                <p className="text-[14px] text-[var(--muted)]">
                  Everything in the product serves the same cycle. You&apos;ll meet each part when it
                  becomes useful, not all at once.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { t: "Discover", d: "Record or listen. We find the one habit costing you the most." },
                  { t: "Practice", d: "A Lab turns that habit into a short, specific drill." },
                  { t: "Measure", d: "Every take is compared to your own history, not a generic benchmark." },
                  { t: "Improve", d: "Voice Memory carries what it learns into tomorrow's coaching." },
                ].map((item) => (
                  <div key={item.t} className="fv-raised p-4">
                    <h2 className="fv-display text-lg">{item.t}</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{item.d}</p>
                  </div>
                ))}
              </div>

              <div className="fv-raised p-4">
                <p className="fv-eyebrow-quiet">What you get after 60 seconds</p>
                <Steps
                  className="mt-3"
                  items={[
                    "Your biggest opportunity, in one plain sentence.",
                    "Why it costs you something when you're being listened to.",
                    "A two-minute drill built for that exact habit.",
                  ]}
                />
              </div>

              <Button size="lg" onClick={() => setStep("goal")}>
                Start my 60-second check
              </Button>
            </section>
          )}

          {step === "goal" && (
            <section className="space-y-6">
              <div className="space-y-2">
                <p className="fv-eyebrow">Step 1 of 2</p>
                <h1 className="fv-display text-3xl md:text-4xl">What are you speaking for?</h1>
                <p className="text-[14px] text-[var(--muted)]">
                  This sets your training priorities. You can change it any time in Coach.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {GOAL_OPTIONS.slice(0, 6).map((g) => (
                  <ChoiceCard
                    key={g.key}
                    title={g.label}
                    blurb={g.blurb}
                    selected={goal === g.key}
                    onClick={() => setGoal(g.key)}
                  />
                ))}
              </div>

              <details className="text-[13px]">
                <summary className="cursor-pointer text-[var(--muted)]">More goals</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {GOAL_OPTIONS.slice(6).map((g) => (
                    <ChoiceCard
                      key={g.key}
                      title={g.label}
                      blurb={g.blurb}
                      selected={goal === g.key}
                      onClick={() => setGoal(g.key)}
                    />
                  ))}
                </div>
              </details>

              <div>
                <p className="fv-eyebrow-quiet">Anything you already know you want to fix? (optional)</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {FOCUS_OPTIONS.map((f) => {
                    const on = focus.includes(f.key);
                    return (
                      <button
                        key={f.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setFocus((prev) => (on ? prev.filter((x) => x !== f.key) : [...prev, f.key]))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-[var(--r-full)] border px-3 py-1.5 text-[13px] ${
                          on
                            ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--ink)]"
                            : "border-[var(--line)] text-[var(--muted)]"
                        }`}
                      >
                        {on && <Check size={12} />}
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="fv-eyebrow-quiet mb-2.5">What should we call you? (optional)</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name"
                  className="w-full max-w-xs rounded-[var(--r-full)] bg-[rgba(244,243,251,0.04)] px-5 py-2.5 text-[14px] outline-none placeholder:text-[var(--faint)] focus:bg-[rgba(244,243,251,0.07)]"
                />
              </div>

              <HeroButton onClick={() => void finishSetup()}>Continue</HeroButton>
            </section>
          )}

          {step === "record" && (
            <section className="space-y-6">
              <div className="space-y-2">
                <p className="fv-eyebrow">Step 2 of 2</p>
                <h1 className="fv-display text-3xl md:text-4xl">Speak for 60 seconds.</h1>
                <p className="text-[14px] text-[var(--muted)]">
                  Talk the way you normally would. There is no right answer. We&apos;re listening to
                  how you say it, not what you say.
                </p>
              </div>

              <div className="fv-raised p-5">
                <p className="fv-eyebrow">Your prompt</p>
                <h2 className="mt-1 fv-display text-xl">{CHECK_PROMPT.label}</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ink-dim)]">
                  {CHECK_PROMPT.text}
                </p>
              </div>

              {error && <ErrorBanner message={error} />}
              {rec.error && <ErrorBanner message={rec.error} />}

              <PracticeRecorderBar
                recording={rec.recording}
                starting={rec.starting}
                elapsed={rec.elapsed}
                stream={rec.stream}
                liveTranscript={rec.liveTranscript}
                targetSec={60}
                startLabel="Start my check"
                disabled={busy}
                onStart={() => void rec.start()}
                onStop={() => void finishCheck()}
              />

              {busy && (
                <p className="text-[13px] text-[var(--muted)]">
                  Uploading and starting analysis…
                </p>
              )}

              <p className="text-[12px] text-[var(--muted)]">
                Rather do this later?{" "}
                <button type="button" onClick={skip} className="text-[var(--accent)] underline-offset-4 hover:underline">
                  Go to the app
                </button>
              </p>
            </section>
          )}
        </motion.div>

        <footer className="mt-10 flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
          <Link href="/privacy" className="hover:text-[var(--accent)]">
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-[var(--accent)]">
            Terms
          </Link>
          {prefs.onboardedAt && (
            <>
              <span aria-hidden>·</span>
              <LinkButton href="/today" variant="ghost" size="sm" className="!px-0 !py-0">
                Today
              </LinkButton>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
