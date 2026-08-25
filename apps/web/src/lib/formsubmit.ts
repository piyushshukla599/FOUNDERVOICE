/**
 * Contact / Pro / feedback delivery through FormSubmit.
 *
 * The API route (`/api/contact`) still stores every lead in `contact_leads`,
 * but it can only *email* when SMTP_HOST and friends are configured on the
 * server. On a deploy where they are not, a lead lands in a SQLite table
 * nobody opens. FormSubmit needs no server at all: the browser posts straight
 * to their AJAX endpoint and the message arrives in the owner's inbox.
 *
 * So this is the path that has to succeed, and `/api/contact` is the archive
 * that runs beside it. See `submitLead` for how the two are combined.
 *
 * Setup, once: submit any of the forms and FormSubmit emails an activation
 * link to ENDPOINT. Until that link is clicked, every submission is held and
 * the API answers with a "confirm your email" message rather than delivering.
 *
 * The endpoint ships in the client bundle, so it is public by design. After
 * activating, FormSubmit hands out a random alias (a hashed string used in
 * place of the address); putting that in NEXT_PUBLIC_FORMSUBMIT_ENDPOINT keeps
 * the real inbox out of the JavaScript that scrapers read.
 */

import { api } from "@/lib/api";

const ENDPOINT =
  process.env.NEXT_PUBLIC_FORMSUBMIT_ENDPOINT || "piyushshuka599@gmail.com";

const FORMSUBMIT_URL = `https://formsubmit.co/ajax/${encodeURIComponent(ENDPOINT)}`;

export type Lead = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  /** pro | support | feedback | partnership | general — why they wrote. */
  interest: string;
  /** Which surface the form was on, so the subject line says where it came from. */
  source?: string;
  /** Honeypot. Anything but "" means a bot filled a field humans cannot see. */
  honey?: string;
};

const LABELS: Record<string, string> = {
  pro: "Pro access request",
  upgrade: "Pro access request",
  support: "Support",
  feedback: "Feedback",
  partnership: "Press / partnership",
  general: "Contact",
};

/**
 * Post one lead to FormSubmit. Resolves with the line to show the sender,
 * throws when the message did not get through.
 */
export async function sendToInbox(lead: Lead): Promise<string> {
  const label = LABELS[lead.interest] || "Contact";

  const res = await fetch(FORMSUBMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      // Named for the email, not for the code: these become the rows of the
      // message that arrives, so they read as English.
      Name: lead.name,
      Email: lead.email,
      Phone: lead.phone || "—",
      Company: lead.company || "—",
      About: label,
      Message: lead.message || "(no message)",
      "Sent from": lead.source || "foundervoice.app",

      _subject: `[FounderVoice] ${label} — ${lead.name}`,
      // Reply goes to the person who wrote, not back to FounderVoice.
      _replyto: lead.email,
      _template: "table",
      // FormSubmit's own captcha page only appears on a redirect flow, and
      // these forms never leave the app.
      _captcha: "false",
      _honey: lead.honey || "",
    }),
  });

  let payload: { success?: string | boolean; message?: string } = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    /* A non-JSON body means something other than FormSubmit answered. */
  }

  const ok = res.ok && (payload.success === true || payload.success === "true");
  if (!ok) {
    throw new Error(
      payload.message || "Could not send your message. Please try again.",
    );
  }

  return payload.message || "";
}

export const isBot = (honey?: string) => Boolean(honey && honey.trim());

/**
 * Deliver a lead, and archive it.
 *
 * Both requests go out together. FormSubmit is what makes the message
 * *arrive*, so its failure is what the sender hears about — but only if the
 * API did not save the lead either. When one of the two works, the person who
 * filled the form is done, and telling them otherwise would only make them
 * send it twice.
 */
export async function submitLead(lead: Lead): Promise<string> {
  // Silently accept and drop: a bot that sees an error retries.
  if (isBot(lead.honey)) return "Thanks. We have your note.";

  const [inbox, archive] = await Promise.allSettled([
    sendToInbox(lead),
    api.contact({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      message: lead.message,
      interest: lead.interest,
    }),
  ]);

  if (inbox.status === "fulfilled") {
    /* FormSubmit's own success line is addressed to the site owner, not to the
       person who just filled the form, so it is never what gets shown. */
    return (
      (archive.status === "fulfilled" ? archive.value.message : "") ||
      "Thanks. Your message is on its way, and the reply comes to this email."
    );
  }

  if (archive.status === "fulfilled") {
    return archive.value.message || "Thanks. We saved your request.";
  }

  throw inbox.reason instanceof Error
    ? inbox.reason
    : new Error("Could not send your message. Please try again.");
}
