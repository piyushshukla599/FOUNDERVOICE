"use client";

/**
 * Reports which page was opened, and how long it was left open.
 *
 * Two events rather than one, because they answer different questions. A view
 * says the page was reached at all, which is what "which pages get used" means.
 * A dwell says how long it held someone, which is the only way to tell a page
 * people read from a page people bounce off - and those look identical in a
 * view count.
 *
 * The dwell is sent when the tab is hidden rather than on unmount: a closed tab
 * never unmounts anything, so an unmount-only version silently loses every
 * visit that ends by closing the window, which is most of them. It is sent with
 * `keepalive` so the request survives the page going away, and with credentials
 * so it carries the workspace cookie - without that every visit looks like a
 * different person.
 *
 * Nothing here blocks or reports failure. A dropped beacon is a missing row; an
 * exception in analytics is a broken page, and one of those matters.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiUrl } from "@/lib/api";

function send(path: string, kind: "view" | "dwell", seconds: number): void {
  try {
    void fetch(apiUrl("/api/analytics/track"), {
      method: "POST",
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, kind, seconds }),
    }).catch(() => undefined);
  } catch {
    /* analytics is never a reason for the page to misbehave */
  }
}

export function UsageBeacon() {
  const pathname = usePathname();
  const openedAt = useRef(0);
  const reported = useRef(false);

  useEffect(() => {
    if (!pathname) return;
    openedAt.current = Date.now();
    reported.current = false;
    send(pathname, "view", 0);

    const settle = () => {
      if (reported.current) return;
      reported.current = true;
      send(pathname, "dwell", (Date.now() - openedAt.current) / 1000);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") settle();
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", settle);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", settle);
      // Navigating within the app: the page really is being left, so the time
      // on it is final even though the tab never went away.
      settle();
    };
  }, [pathname]);

  return null;
}
