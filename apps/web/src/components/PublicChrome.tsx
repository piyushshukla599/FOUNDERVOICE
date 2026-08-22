import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Header and footer for the pages crawlers actually see. Kept as a server
 * component with real anchors: the app's nav is client-side and renders
 * nothing useful without data, which is why the public pages do not reuse it.
 */
export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
      <Link href="/" aria-label="FounderVoice home">
        <Logo size={28} idSuffix="hdr" />
      </Link>
      <nav className="flex items-center gap-6 text-[13.5px]" aria-label="Main">
        <Link href="/guides" className="text-[var(--muted)] transition-colors hover:text-[var(--ink)]">
          Guides
        </Link>
        <Link href="/contact" className="text-[var(--muted)] transition-colors hover:text-[var(--ink)]">
          Contact
        </Link>
        {/* Was white on --accent, which measures 4.23:1 and fails AA for text
            this size. .fv-hero carries the corrected dark-on-gradient ink plus
            the press and lift states, so the header CTA and the in-page ones
            are finally the same control. */}
        <Link href="/onboarding" className="fv-hero !h-9 !px-4 !text-[13px]">
          Start free
        </Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mx-auto max-w-5xl px-6 py-12 text-[13px] text-[var(--muted)]">
      <div className="border-t border-[var(--line)] pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo size={22} idSuffix="ftr" />
          <nav className="flex flex-wrap gap-5" aria-label="Footer">
            <Link href="/guides" className="transition-colors hover:text-[var(--ink)]">Guides</Link>
            <Link href="/onboarding" className="transition-colors hover:text-[var(--ink)]">Start free</Link>
            <Link href="/contact" className="transition-colors hover:text-[var(--ink)]">Contact</Link>
            <Link href="/privacy" className="transition-colors hover:text-[var(--ink)]">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-[var(--ink)]">Terms</Link>
          </nav>
        </div>
        <p className="mt-6 text-[12.5px] text-[var(--faint)]">
          Questions? <a href="mailto:info@foundervoice.app" className="text-[var(--violet-bright)]">info@foundervoice.app</a>
        </p>
        <p className="mt-2 text-[12.5px] text-[var(--faint)]">
          FounderVoice. Communication coaching for founders, measured from your own recordings.
        </p>
      </div>
    </footer>
  );
}
