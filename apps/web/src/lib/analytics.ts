/**
 * Analytics integration points.
 *
 * There is no analytics vendor wired into this project, and this file does not
 * add one - no script tag, no key, no third-party request. What it provides is
 * the seam: one list of event names, one `track()` call site, and a queue that
 * holds events until something is listening. Wiring a vendor later means
 * implementing `window.fvAnalytics` (or reading `window.dataLayer`) in exactly
 * one place instead of hunting for click handlers across the app.
 *
 * The reason to do this now rather than when a vendor is chosen: the funnel
 * this measures - guide read, CTA click, recording started, analysis seen - is
 * the thing SEO work is supposed to move. Without the events, a ranking
 * improvement and a conversion improvement are indistinguishable from each
 * other, and there is no way to tell which guide is actually earning users.
 */

export const EVENTS = {
  /** A public guide or marketing page was viewed. Props: `path`. */
  guideView: "guide_view",
  /** A CTA on an SEO surface was clicked. Props: `guide`, `href`. */
  seoCtaClick: "seo_cta_click",
  /** The recorder started capturing. */
  recordingStarted: "recording_started",
  /** Capture finished and upload began. */
  recordingCompleted: "recording_completed",
  /** The report came back and was rendered. */
  analysisCompleted: "analysis_completed",
  /** An account was created, for whenever accounts exist. */
  signupCompleted: "signup_completed",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export type EventProps = Record<string, string | number | boolean | undefined>;

type QueuedEvent = { name: EventName; props: EventProps; at: number };

declare global {
  interface Window {
    /** Implement this to receive events. Nothing here provides it. */
    fvAnalytics?: (name: string, props: EventProps) => void;
    /** Populated regardless, so a tag manager can read the history it missed. */
    fvEventQueue?: QueuedEvent[];
  }
}

/**
 * Records an event. Safe to call during SSR (it no-ops) and safe to call
 * before any consumer exists - the queue keeps the last 100 events so a
 * late-loading tag manager can replay what happened before it arrived.
 */
export function track(name: EventName, props: EventProps = {}): void {
  if (typeof window === "undefined") return;

  const queue = (window.fvEventQueue ??= []);
  queue.push({ name, props, at: Date.now() });
  if (queue.length > 100) queue.shift();

  try {
    window.fvAnalytics?.(name, props);
  } catch {
    // A broken analytics consumer must never break the product. Recording is
    // the thing this site exists to do; measurement of it is not.
  }
}
