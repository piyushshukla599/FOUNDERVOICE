"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { EVENTS, track } from "@/lib/analytics";

/**
 * Turns markup into events without a handler on every link.
 *
 * CTAs across the SEO surfaces carry `data-fv-event` and `data-fv-guide`
 * attributes; one delegated listener on the document reads them. That keeps
 * the guide template, the guides index and the landing page free of analytics
 * imports, and it means a new CTA is instrumented by adding an attribute
 * rather than by remembering to import anything.
 *
 * Renders nothing and loads nothing. See lib/analytics.ts for why there is no
 * vendor behind this yet.
 */
export function AnalyticsBridge() {
  const pathname = usePathname();

  // Page views for the public surfaces only. The signed-in screens are one
  // person looking at their own data and are noindex; counting them here would
  // mix product usage into what is meant to measure acquisition.
  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/guides")) {
      track(EVENTS.guideView, { path: pathname });
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      const el = target?.closest?.("[data-fv-event]");
      if (!(el instanceof HTMLElement)) return;

      const name = el.dataset.fvEvent;
      if (name !== EVENTS.seoCtaClick) return;

      track(EVENTS.seoCtaClick, {
        guide: el.dataset.fvGuide,
        href: el.getAttribute("href") ?? undefined,
        path: pathname,
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  return null;
}
