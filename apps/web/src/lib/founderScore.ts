/** Local Founder Voice Score, same weights as the API, no network. */

export function founderVoiceScore(m: {
  clarity?: number | null;
  executive_presence?: number | null;
  confidence_est?: number | null;
  pause_quality?: number | null;
  filler_rate?: number | null;
  wpm?: number | null;
}): number {
  const clarity = Number(m.clarity ?? 55);
  const presence = Number(m.executive_presence ?? 55);
  const conf = Number(m.confidence_est ?? 55);
  const pauseQ = Number(m.pause_quality ?? 50);
  const fillerRate = Number(m.filler_rate ?? 0);
  const wpm = Number(m.wpm ?? 140);
  const fillerPen = Math.min(18, fillerRate * 400);
  const pacePen = wpm > 165 ? 8 : wpm > 155 ? 4 : 0;
  const paceBonus = wpm >= 125 && wpm <= 145 ? 4 : 0;
  const raw = clarity * 0.28 + presence * 0.28 + conf * 0.22 + pauseQ * 0.22;
  return Math.max(20, Math.min(98, Math.round(raw - fillerPen - pacePen + paceBonus)));
}

export const DAILY_PROMPTS = [
  { id: "oneliner", label: "Company in 45s", text: "Explain what you build to a smart stranger. One pause after the first sentence." },
  { id: "why_you", label: "Why you", text: "Why are you the person to build this? Speak 45 seconds. Finish every word." },
  { id: "hard_q", label: "Hard question", text: "Answer: “Why isn’t this working yet?” Pause one second, then lead with the headline." },
  { id: "shipped", label: "This week", text: "Team update: what shipped, what slipped, what’s next. 60 seconds." },
  { id: "ask", label: "The ask", text: "Deliver your ask once, slowly. Pause before the number." },
];
