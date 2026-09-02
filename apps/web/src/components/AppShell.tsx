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
  Timer,
  Sparkles,
  Ear,
  MessageCircle,
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ContactModal, type ContactInterest } from "@/components/ContactModal";

type NavItem = { href: string; label: string; icon: typeof Mic };
type NavGroup = NavItem & {
  /** Routes that belong to this group. The first is the group's own landing. */
  items?: NavItem[];
  /** Extra path prefixes that should light this group up. */
  owns?: string[];
};

/**
 * Four destinations, grouped by what someone is trying to do rather than by
 * which pipeline serves them.
 *
 * This replaces five primary plus three secondary entries. Every route keeps
 * its URL - the change is navigational, not structural - but two things get
 * fixed. Record, Labs, Practice and Listen are all "make a recording" from the
 * user's side of the screen and now sit together. And the mobile bar fits all
 * four without an overflow sheet, which is where Practice used to be buried.
 */
const NAV: NavGroup[] = [
  { href: "/today", label: "Today", icon: Sparkles },
  {
    href: "/record",
    label: "Speak",
    icon: Mic,
    items: [
      { href: "/record", label: "Record", icon: Mic },
      { href: "/pitch", label: "45s Pitch", icon: Timer },
      { href: "/trainer", label: "Labs", icon: Dumbbell },
      { href: "/practice", label: "Practice", icon: MessagesSquare },
      { href: "/listen", label: "Listen", icon: Ear },
    ],
  },
  { href: "/library", label: "Sessions", icon: Library, owns: ["/sessions"] },
  {
    href: "/dashboard",
    label: "Progress",
    icon: LineChart,
    items: [
      { href: "/dashboard", label: "Progress", icon: LineChart },
      { href: "/coach", label: "Coach", icon: Brain },
    ],
  },
];

// Public pages carry their own header and footer rather than the app nav.
const CHROMELESS = ["/", "/welcome", "/privacy", "/terms", "/onboarding", "/contact"];
// Matched by prefix, since every guide under this path is public too.
const CHROMELESS_PREFIXES = ["/guides"];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

/** Every path a group is responsible for lighting up. */
function groupPaths(g: NavGroup) {
  return [g.href, ...(g.items?.map((i) => i.href) ?? []), ...(g.owns ?? [])];
}

function groupActive(pathname: string, g: NavGroup) {
  return groupPaths(g).some((p) => isActive(pathname, p));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [contactOpen, setContactOpen] = useState(false);
  const [contactInterest, setContactInterest] = useState<ContactInterest>("general");
  const [moreOpen, setMoreOpen] = useState(false);
  const hideChrome =
    CHROMELESS.includes(pathname) || CHROMELESS_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<{ interest?: string }>).detail;
      /* "upgrade" is what the coach page sends; it is the same request as
         "pro", and collapsing both to "general" used to file a Pro lead as an
         ordinary contact note. */
      const asked = detail?.interest;
      setContactInterest(
        asked === "feedback"
          ? "feedback"
          : asked === "pro" || asked === "upgrade"
            ? "pro"
            : "general",
      );
      setContactOpen(true);
    };
    window.addEventListener("fv-open-contact", onOpen);
    return () => window.removeEventListener("fv-open-contact", onOpen);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const activeGroup = NAV.find((g) => groupActive(pathname, g));

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

  /* Active state is a soft glow and a brighter word, never a bordered button.
     `glow` is off for a group header whose child is already carrying the
     indicator: two elements sharing one layoutId at the same time makes Framer
     tween the marker between them forever. */
  const navLink = ({ href, label, icon: Icon }: NavItem, quiet = false, glow = true) => {
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
        {active && glow && (
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

          {/* Groups, with their members nested underneath. Nothing is hidden on
              desktop: everything is still one click, it is just organised by
              intent instead of by a primary/secondary split. */}
          <nav className="flex flex-col gap-5 overflow-y-auto" aria-label="App">
            {NAV.map((group) => {
              const open = groupActive(pathname, group);
              return (
                <div key={group.href} className="space-y-0.5">
                  {navLink(group, false, !(group.items && open))}
                  {group.items && open && (
                    <div className="ml-[1.45rem] space-y-0.5 border-l border-[var(--line)] pl-2">
                      {group.items.map((item) => navLink(item, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* The nav above is flex-1, so on a tall screen this footer was pushed
              to the bottom with a large void above it. It now sits directly
              under the navigation and the empty space falls below, which reads
              as breathing room rather than a gap. */}
          <div className="mt-6 space-y-3 border-t border-[var(--line)] px-3 pt-5">
            <button
              type="button"
              onClick={openFeedback}
              className="block text-[12.5px] text-[var(--ink-dim)] transition-colors hover:text-[var(--accent)]"
            >
              Send feedback
            </button>
            <p className="text-[10.5px] leading-relaxed text-[var(--faint)]">
              Your recordings stay in this browser&apos;s workspace.
            </p>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10.5px] text-[var(--faint)]">
              <Link href="/privacy" className="transition-colors hover:text-[var(--muted)]">
                Privacy
              </Link>
              <span aria-hidden>·</span>
              <Link href="/terms" className="transition-colors hover:text-[var(--muted)]">
                Terms
              </Link>
              <span aria-hidden>·</span>
              <Link href="/onboarding" className="transition-colors hover:text-[var(--muted)]">
                How it works
              </Link>
              <span aria-hidden>·</span>
              <Link href="/contact" className="transition-colors hover:text-[var(--muted)]">
                Contact
              </Link>
            </div>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 pb-28 lg:pb-4">
          {/* Mobile had no header at all: the logo lived in a sidebar that is
              hidden below lg, so on a phone there was nothing identifying the
              product and no way back to Today from a detail screen except the
              bottom bar. Sticky, compact, and it never covers content because
              it participates in flow rather than overlaying it. */}
          <div className="sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between border-b border-[var(--line)] bg-[rgba(7,8,13,0.82)] px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
            <Link href="/today" aria-label="FounderVoice home" className="flex items-center">
              <Logo size={22} idSuffix="mob" />
            </Link>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              <MoreHorizontal size={19} aria-hidden />
              <span className="sr-only">More</span>
            </button>
          </div>

          {/* On mobile the bottom bar carries the four groups, so the members of
              the active group need somewhere to live. This rail is that place.
              It is why the overflow sheet could go: Practice used to be
              reachable on a phone only by opening a "More" dialog. */}
          {activeGroup?.items && (
            <nav
              className="fv-scroll -mt-1 mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label={`${activeGroup.label} sections`}>
              {activeGroup.items.map(({ href, label }) => {
                const on = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-[var(--r-full)] px-3.5 py-2 text-[13px] transition-colors",
                      on
                        ? "bg-[var(--accent-soft)] text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--accent-line)]"
                        : "text-[var(--muted)] hover:text-[var(--ink)]",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[var(--line)] bg-[rgba(7,8,13,0.88)] px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl lg:hidden"
        aria-label="Mobile"
      >
        {/* The four groups, all of them. A destination is highlighted whenever
            any route inside it is open, so Labs lights "Speak" rather than
            leaving the bar looking like nowhere is selected. */}
        {NAV.map((group) => {
          const { href, label, icon: Icon } = group;
          const active = groupActive(pathname, group);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-[var(--r-md)] px-3 py-1 text-[10px] transition-colors",
                active ? "text-[var(--accent)]" : "text-[var(--muted)]",
              )}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          );
        })}
        {/* No fifth "More" here on purpose. It moved to the top header, which
            leaves the bar as exactly the four destinations and nothing that
            looks like a destination but is not one. */}
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
              {/* This sheet no longer holds navigation. Practice, Labs, Listen
                  and Coach were all in here, which put core features behind a
                  disclosure on the only device where that hurts. What is left
                  is the utility that has nowhere else to sit on a phone, since
                  app screens have no footer. */}
              <div className="mb-4 flex items-center justify-between">
                <span className="fv-eyebrow-quiet">More</span>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                  className="-m-2 flex h-11 w-11 items-center justify-center"
                >
                  <X size={17} className="text-[var(--muted)]" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  openFeedback();
                }}
                className="fv-lift flex w-full items-center gap-3 rounded-[var(--r-md)] bg-[rgba(244,243,251,0.03)] px-4 py-3.5 text-left text-[14px]"
              >
                <MessageCircle size={16} className="text-[var(--accent)]" aria-hidden />
                Send feedback
              </button>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 px-1 text-[12.5px] text-[var(--muted)]">
                <Link href="/onboarding" className="fv-quiet-link">
                  How it works
                </Link>
                <Link href="/contact" className="fv-quiet-link">
                  Contact
                </Link>
                <Link href="/privacy" className="fv-quiet-link">
                  Privacy
                </Link>
                <Link href="/terms" className="fv-quiet-link">
                  Terms
                </Link>
              </div>
              <p className="mt-4 px-1 text-[11px] leading-relaxed text-[var(--faint)]">
                Your recordings stay in this browser&apos;s workspace.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ContactModal open={contactOpen} interest={contactInterest} onClose={() => setContactOpen(false)} />
    </div>
  );
}
