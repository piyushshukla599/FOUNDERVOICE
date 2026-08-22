import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Header and footer for the pages crawlers actually see. Kept as a server
 * component with real anchors: the app's nav is client-side and renders
 * nothing useful without data, which is why the public pages do not reuse it.
 */
export function PublicHeader() {
  return (
    /* The row needs 405px to stand up - a 134px wordmark, a 223px nav and two
       24px gutters - and it carried no responsive class at all, so on every
       iPhone narrower than a Pro Max it simply overflowed: flex items default
       to min-width:auto, nothing shrank, nothing wrapped, and the whole
       landing page picked up a horizontal scrollbar with "Start free" hanging
       off the right edge. Wrapping puts the nav on its own line below the
       wordmark instead, which costs one line of height and loses nothing. At
       sm and up the nav is w-auto again and this is the same single row it
       always was. */
    <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-4 px-5 py-5 sm:px-6 sm:py-6">
      <Link href="/" aria-label="FounderVoice home">
        <Logo size={28} idSuffix="hdr" />
      </Link>
      <nav
        className="flex w-full items-center justify-between gap-6 text-[13.5px] sm:w-auto sm:justify-end"
        aria-label="Main"
      >
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
