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
      setError(err instanceof Error ? err.message : "Could not send, is the API running?");
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
        className="fv-enter relative w-full max-w-lg rounded-[var(--r-lg)] bg-[var(--surface)] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] ring-1 ring-[var(--line-strong)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-[var(--r-full)] p-1.5 text-[var(--muted)] transition-colors hover:bg-[rgba(244,243,251,0.06)] hover:text-[var(--ink)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 id="fv-contact-title" className="pr-8 font-[family-name:var(--font-display)] text-2xl">
          {title}
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {isFeedback
            ? "FounderVoice is 100% free. Tell us what to improve. We read every note."
            : "Questions, press, or partnerships, leave your details and we’ll reply."}
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <label className="fv-label block">
            Full name *
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="fv-input mt-1"
            />
          </label>
          <label className="fv-label block">
            Email *
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fv-input mt-1"
            />
          </label>
          <label className="fv-label block">
            Phone / WhatsApp
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="fv-input mt-1"
            />
          </label>
          <label className="fv-label block">
            Company (optional)
            <input
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="fv-input mt-1"
            />
          </label>
          <label className="fv-label block">
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="fv-input mt-1"
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="fv-hero !h-11 !px-5 !text-[14px] disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="fv-ghost !h-11 !text-[14px]"
            >
              Cancel
            </button>
          </div>
          {done && (
            <p className="text-sm text-[var(--emerald)]" role="status">
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
