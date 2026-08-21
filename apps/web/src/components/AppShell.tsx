"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ContactModal } from "@/components/ContactModal";

type NavItem = { href: string; label: string; icon: typeof Mic };

/** What you do. These read first. */
const PRIMARY: NavItem[] = [
  { href: "/today", label: "Today", icon: Sparkles },
  { href: "/trainer", label: "Labs", icon: Dumbbell },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/practice", label: "Practice", icon: MessagesSquare },
  { href: "/listen", label: "Listen", icon: Ear },
];

/** What you look back at. Quieter, not what you came here to do. */
const SECONDARY: NavItem[] = [
  { href: "/library", label: "Sessions", icon: Library },
  { href: "/dashboard", label: "Progress", icon: LineChart },
  { href: "/coach", label: "Coach", icon: Brain },
];

const MOBILE_PRIMARY = [PRIMARY[0], PRIMARY[1], PRIMARY[2], PRIMARY[4]];
const MOBILE_MORE = [PRIMARY[3], ...SECONDARY];

// Public pages carry their own header and footer rather than the app nav.
const CHROMELESS = ["/", "/welcome", "/privacy", "/terms", "/onboarding", "/contact"];
// Matched by prefix, since every guide under this path is public too.
const CHROMELESS_PREFIXES = ["/guides"];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [contactOpen, setContactOpen] = useState(false);
  const [contactInterest, setContactInterest] = useState<"feedback" | "general">("general");
  const [moreOpen, setMoreOpen] = useState(false);
  const hideChrome =
    CHROMELESS.includes(pathname) || CHROMELESS_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<{ interest?: "feedback" | "general" }>).detail;
      setContactInterest(detail?.interest === "feedback" ? "feedback" : "general");
      setContactOpen(true);
    };
    window.addEventListener("fv-open-contact", onOpen);
    return () => window.removeEventListener("fv-open-contact", onOpen);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const openFeedback = () => {
    setContactInterest("feedback");
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

  /* Active state is a soft glow and a brighter word, never a bordered button. */
  const navLink = ({ href, label, icon: Icon }: NavItem, quiet = false) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 transition-all duration-200",
          quiet ? "text-[12.5px]" : "text-[13.5px]",
          active
            ? "text-[var(--ink)]"
            : "text-[var(--muted)] hover:translate-x-0.5 hover:text-[var(--ink)]",
        )}
      >
        {active && (
          <motion.span
            layoutId="nav-glow"
            className="absolute inset-0 rounded-[var(--r-md)] bg-[var(--accent-soft)] shadow-[inset_0_0_0_1px_var(--accent-line),0_0_24px_-8px_var(--accent-glow)]"
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          />
        )}
        <Icon
          size={quiet ? 14 : 15}
          className={cn("relative z-10 shrink-0", active && "text-[var(--accent)]")}
          aria-hidden
        />
        <span className={cn("relative z-10 truncate", active && "font-medium")}>{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--r-full)] focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[var(--accent-ink)]"
      >
        Skip to content
      </a>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl gap-8 px-4 py-5 sm:px-6 lg:gap-12 lg:px-8 lg:py-8">
        {/* Navigation recedes: no border, no panel, just quiet words. */}
        <aside
          className="sticky top-8 hidden h-[calc(100vh-4rem)] w-40 shrink-0 flex-col xl:w-48 lg:flex"
          aria-label="Primary"
        >
          <Link href="/today" className="group mb-9 block px-3">
            <Logo size={26} idSuffix="nav" className="transition-opacity group-hover:opacity-80" />
          </Link>

          <nav className="flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="App">
            <div className="space-y-0.5">{PRIMARY.map((item) => navLink(item))}</div>
            <div className="space-y-0.5 border-t border-[var(--line)] pt-5">
              {SECONDARY.map((item) => navLink(item, true))}
            </div>
          </nav>

          <div className="space-y-3 px-3 pt-5">
            <button
              type="button"
              onClick={openFeedback}
              className="block text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            >
              Send feedback
            </button>
            <p className="text-[10.5px] leading-relaxed text-[var(--faint)]">
              Your recordings stay in this browser&apos;s workspace.
            </p>
            <div className="flex flex-wrap gap-2 text-[10.5px] text-[var(--faint)]">
              <Link href="/privacy" className="hover:text-[var(--muted)]">
                Privacy
              </Link>
              <span aria-hidden>·</span>
              <Link href="/terms" className="hover:text-[var(--muted)]">
                Terms
              </Link>
              <span aria-hidden>·</span>
              <Link href="/onboarding" className="hover:text-[var(--muted)]">
                How it works
              </Link>
              <span aria-hidden>·</span>
              <Link href="/contact" className="hover:text-[var(--muted)]">
                Contact
              </Link>
            </div>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 pb-28 lg:pb-4">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[var(--line)] bg-[rgba(7,8,13,0.88)] px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl lg:hidden"
        aria-label="Mobile"
      >
        {MOBILE_PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[var(--r-md)] px-3 py-1 text-[10px]",
                active ? "text-[var(--accent)]" : "text-[var(--muted)]",
              )}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className="flex flex-col items-center gap-1 rounded-[var(--r-md)] px-3 py-1 text-[10px] text-[var(--muted)]"
        >
          <MoreHorizontal size={18} aria-hidden />
          More
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-label="More"
              initial={{ y: 48 }}
              animate={{ y: 0 }}
              exit={{ y: 48 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-[var(--r-lg)] bg-[var(--surface)] p-5 pb-[max(2.25rem,env(safe-area-inset-bottom))]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="fv-eyebrow-quiet">More</span>
                <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close">
                  <X size={17} className="text-[var(--muted)]" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_MORE.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="fv-lift rounded-[var(--r-md)] bg-[rgba(244,243,251,0.03)] px-4 py-3.5"
                  >
                    <Icon size={16} className="text-[var(--accent)]" aria-hidden />
                    <div className="mt-2 text-[14px]">{label}</div>
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  openFeedback();
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 py-2.5 text-[13px] text-[var(--accent)]"
              >
                <MessageCircle size={15} /> Send feedback
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ContactModal open={contactOpen} interest={contactInterest} onClose={() => setContactOpen(false)} />
    </div>
  );
}
