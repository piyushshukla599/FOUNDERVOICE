"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Library,
  LineChart,
  Brain,
  Dumbbell,
  MessagesSquare,
  Sparkles,
  Ear,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactModal } from "@/components/ContactModal";

const links = [
  { href: "/", label: "Record", icon: Mic },
  { href: "/listen", label: "Smart Session", icon: Ear },
  { href: "/library", label: "Library", icon: Library },
  { href: "/dashboard", label: "Dashboard", icon: LineChart },
  { href: "/coach", label: "Coach", icon: Brain },
  { href: "/trainer", label: "Labs", icon: Dumbbell },
  { href: "/practice", label: "Practice", icon: MessagesSquare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [contactOpen, setContactOpen] = useState(false);
  const [contactInterest, setContactInterest] = useState<"feedback" | "general">("general");
  const hideChrome = pathname === "/welcome" || pathname === "/privacy" || pathname === "/terms";

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<{ interest?: "feedback" | "general" }>).detail;
      setContactInterest(detail?.interest === "feedback" ? "feedback" : "general");
      setContactOpen(true);
    };
    window.addEventListener("fv-open-contact", onOpen);
    return () => window.removeEventListener("fv-open-contact", onOpen);
  }, []);

  const openFeedback = () => {
    setContactInterest("feedback");
    setContactOpen(true);
  };
  const openContact = () => {
    setContactInterest("general");
    setContactOpen(true);
  };

  if (hideChrome) {
    return (
      <>
        {children}
        <ContactModal open={contactOpen} interest={contactInterest} onClose={() => setContactOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-[#1a1510]"
      >
        Skip to content
      </a>
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-8">
        <aside
          className="sticky top-6 hidden h-[calc(100vh-3rem)] w-56 shrink-0 flex-col rounded-2xl border border-[var(--line)] bg-[rgba(23,30,26,0.85)] p-4 backdrop-blur md:flex"
          aria-label="Primary"
        >
          <div className="mb-8">
            <Link href="/welcome" className="flex items-center gap-2 text-[var(--accent)]">
              <Sparkles size={18} aria-hidden />
              <span className="text-xs font-semibold tracking-[0.2em] uppercase">FounderVoice</span>
            </Link>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--ink)]">
              AI Executive Coach
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Why it happened. How to fix it.</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--accent-2)]">
              100% free · Local-first · Private
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-1" aria-label="App">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-[var(--bg-soft)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={16} className="relative z-10" aria-hidden />
                  <span className="relative z-10">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={openFeedback}
              className="w-full rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[#1a1510]"
            >
              Share feedback
            </button>
            <button
              type="button"
              onClick={openContact}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Contact us
            </button>
            <p className="text-[10px] leading-relaxed text-[var(--muted)]">
              Audio stays on your machine. Never uploaded for cloud storage.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] text-[var(--muted)]">
              <Link href="/privacy" className="hover:text-[var(--accent)]">
                Privacy
              </Link>
              <span aria-hidden>·</span>
              <Link href="/terms" className="hover:text-[var(--accent)]">
                Terms
              </Link>
              <span aria-hidden>·</span>
              <Link href="/welcome" className="hover:text-[var(--accent)]">
                About
              </Link>
            </div>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[var(--line)] bg-[rgba(15,20,18,0.95)] px-1 py-2 backdrop-blur md:hidden"
        aria-label="Mobile"
      >
        {links.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-1.5 py-1 text-[10px]",
                active ? "text-[var(--accent)]" : "text-[var(--muted)]",
              )}
            >
              <Icon size={16} aria-hidden />
              {label.split(" ")[0]}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={openFeedback}
          className="flex flex-col items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] text-[var(--accent)]"
        >
          <MessageCircle size={16} aria-hidden />
          Feedback
        </button>
      </nav>

      <ContactModal open={contactOpen} interest={contactInterest} onClose={() => setContactOpen(false)} />
    </div>
  );
}
