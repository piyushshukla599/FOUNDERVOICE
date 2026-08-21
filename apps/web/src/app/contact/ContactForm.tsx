"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Mail, Sparkles } from "lucide-react";
import { Divider, ErrorBanner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

/* The reason someone landed here. `interest=pro` arrives from the upgrade gate,
   so the page can lead with Pro rather than a generic contact form. */
const INTERESTS = [
  { key: "pro", label: "Pro access", blurb: "Remove the free caps on recordings and practice." },
  { key: "support", label: "Something broke", blurb: "Tell us what happened. We will fix it." },
  { key: "feedback", label: "Feedback", blurb: "What should we build next?" },
  { key: "partnership", label: "Press / partnership", blurb: "Working together." },
];

export function ContactForm() {
  const params = useSearchParams();
  const initial = params.get("interest") || "feedback";
  const [interest, setInterest] = useState(
    INTERESTS.some((i) => i.key === initial) ? initial : "feedback",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const isPro = interest === "pro";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.contact({ name, email, company, message, interest });
      setDone(res.message || "Thanks. We have your note.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl pt-10 md:pt-16">
        <section className="fv-enter fv-glow-panel p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[var(--r-full)] bg-[var(--emerald-soft)] text-[var(--emerald)]">
            <Check size={18} aria-hidden />
          </div>
          <h2 className="mt-4 fv-display text-[1.35rem]">Got it.</h2>
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--muted)]">
            {done}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pt-4 md:pt-10">
      <PageHeader
        eyebrow={isPro ? "Pro access" : "Contact"}
        title={isPro ? "Unlock the full coach" : "Talk to us"}
        sub={
          isPro
            ? "FounderVoice is free to try, and free to keep using within the caps. Pro lifts them. Tell us how you are using it and we will set you up."
            : "Support, feedback, press or partnerships. One form, and a real person answers it."
        }
      />

      {isPro && (
        <section className="fv-enter mt-7 space-y-3">
          <p className="fv-eyebrow-quiet">What Pro changes</p>
          <ul className="fv-stagger space-y-2.5">
            {[
              "Unlimited recordings. No daily cap.",
              "Unlimited investor practice rounds.",
              "Priority on new labs and the deeper report.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 text-[14px] text-[var(--ink-dim)]">
                <Sparkles size={14} className="mt-1 shrink-0 text-[var(--violet-bright)]" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Divider />

      <form onSubmit={(e) => void submit(e)} className="fv-enter space-y-5">
        <div>
          <p className="fv-eyebrow-quiet mb-3">What is this about</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {INTERESTS.map((i) => (
              <button
                key={i.key}
                type="button"
                aria-pressed={interest === i.key}
                onClick={() => setInterest(i.key)}
                className={
                  interest === i.key
                    ? "fv-tile shadow-[inset_0_0_0_1px_var(--accent-line)]"
                    : "fv-tile"
                }
              >
                <span className="block text-[14px] font-medium">{i.label}</span>
                <span className="mt-1 block text-[12.5px] leading-snug text-[var(--muted)]">
                  {i.blurb}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="fv-label">
            Your name *
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="fv-input mt-1.5"
            />
          </label>
          <label className="fv-label">
            Email *
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fv-input mt-1.5"
            />
          </label>
        </div>

        <label className="fv-label block">
          Company (optional)
          <input
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="fv-input mt-1.5"
          />
        </label>

        <label className="fv-label block">
          {isPro ? "How are you using FounderVoice?" : "Message"}
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isPro
                ? "e.g. raising a seed round, pitching weekly, need unlimited practice."
                : "Tell us what happened, or what you want."
            }
            className="fv-input mt-1.5"
          />
        </label>

        {error && <ErrorBanner message={error} />}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button type="submit" disabled={busy} className="fv-hero disabled:opacity-50">
            <Mail size={16} aria-hidden />
            {busy ? "Sending…" : isPro ? "Request Pro access" : "Send"}
          </button>
          <p className="text-[12.5px] text-[var(--faint)]">
            We only use this to reply. Nothing else.
          </p>
        </div>
      </form>
    </div>
  );
}
