"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  /** feedback = product feedback; general = contact / partnership */
  interest?: "feedback" | "general";
};

export function ContactModal({ open, onClose, interest = "general" }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDone("");
    setError("");
  }, [open, interest]);

  if (!open) return null;

  const isFeedback = interest === "feedback";
  const title = isFeedback ? "Share feedback" : "Contact FounderVoice";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone("");
    try {
      const res = await api.contact({
        name,
        email,
        phone,
        company,
        message:
          message ||
          (isFeedback ? "I'd like to share product feedback." : ""),
        interest: isFeedback ? "feedback" : "general",
      });
      setDone(res.message);
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send — is the API running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fv-contact-title"
        className="relative w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-[var(--muted)] hover:text-[var(--ink)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 id="fv-contact-title" className="pr-8 font-[family-name:var(--font-display)] text-2xl">
          {title}
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {isFeedback
            ? "FounderVoice is 100% free. Tell us what to improve — we read every note."
            : "Questions, press, or partnerships — leave your details and we’ll reply."}
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <label className="block text-xs text-[var(--muted)]">
            Full name *
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-xs text-[var(--muted)]">
            Email *
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-xs text-[var(--muted)]">
            Phone / WhatsApp
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-xs text-[var(--muted)]">
            Company (optional)
            <input
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block text-xs text-[var(--muted)]">
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
          {done && (
            <p className="text-sm text-[var(--accent-2)]" role="status">
              {done}
            </p>
          )}
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
