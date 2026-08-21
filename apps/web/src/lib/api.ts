import { assertUploadSize } from "./upload";

/** Browser talks to FastAPI directly, avoids Next.js 10MB proxy buffering on uploads/audio. */
const CONFIGURED_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i;

/**
 * The API origin, with one correction applied in the browser.
 *
 * Locally the site is usually opened on localhost:3000 while the API is
 * configured as 127.0.0.1:8000. Those are the same machine but *different
 * sites* as far as cookies are concerned, and the workspace cookie is
 * SameSite=Lax. Fetches survive that (the app asks for credentials), but a
 * plain subresource does not: the <audio> element and the PDF link arrive at
 * the API with no cookie, land in a brand new empty workspace, and 404. Worse,
 * the API answers them with a Set-Cookie, which replaces the good cookie and
 * takes the visitor's whole session list with it.
 *
 * So when both hosts are loopback, follow whichever one the page was actually
 * opened on. Same host, same site, one cookie. Anything else - a real API
 * domain, a LAN address - is left exactly as configured.
 */
function resolveBase(): string {
  if (typeof window === "undefined") return CONFIGURED_BASE;
  try {
    const configured = new URL(CONFIGURED_BASE);
    const here = window.location.hostname;
    if (!LOOPBACK.test(configured.hostname) || !LOOPBACK.test(here)) return CONFIGURED_BASE;
    if (configured.hostname === here) return CONFIGURED_BASE;
    configured.hostname = here;
    return configured.origin;
  } catch {
    return CONFIGURED_BASE;
  }
}

export const API_BASE = CONFIGURED_BASE;

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${resolveBase()}${p}`;
}

export type QuotaState = {
  feature: string;
  label: string;
  used: number;
  /** -1 when unlimited. */
  limit: number;
  remaining: number;
  unlimited: boolean;
  exhausted: boolean;
  /** ISO timestamp when this counter rolls over, or null when unlimited. */
  resets_at?: string | null;
  resets_in_seconds?: number | null;
  window_hours?: number;
};

/** The free allowance for this visitor ran out. Rendered as a gate, not an error. */
export class QuotaError extends Error {
  readonly quota?: QuotaState;
  constructor(message: string, quota?: QuotaState) {
    super(message);
    this.name = "QuotaError";
    this.quota = quota;
  }
}

/**
 * FastAPI reports failures as `{"detail": ...}` where detail is a string for
 * plain aborts and an object for structured ones. Returning the raw body meant
 * users saw a JSON blob, or, worse, a caller replaced it with a guess like
 * "is the API running?" and hid the real cause.
 */
function explain(status: number, body: string): Error {
  let detail: unknown = body;
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.detail ?? parsed;
  } catch {
    /* not JSON. The raw text is the best we have */
  }

  if (detail && typeof detail === "object") {
    const d = detail as { error?: string; message?: string; quota?: QuotaState };
    if (status === 402 || d.error === "free_limit_reached") {
      return new QuotaError(d.message || "Free limit reached.", d.quota);
    }
    if (d.message) return new Error(d.message);
  }
  if (typeof detail === "string" && detail.trim()) return new Error(detail);
  if (status === 429) return new Error("Too many requests, wait a moment and try again.");
  if (status >= 500) return new Error("The server hit an error. Check the API logs.");
  return new Error(`Request failed (${status}).`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      cache: "no-store",
      // The API hands out a workspace cookie, and that cookie is the only
      // thing keeping one visitor's recordings out of another's list. Fetch
      // drops cookies on cross-origin requests unless asked, and the site and
      // the API are different origins in every deployment.
      credentials: "include",
    });
  } catch {
    // Only a genuine transport failure means the API is unreachable.
    throw new Error("Cannot reach the API. Check that it is running.");
  }
  if (!res.ok) {
    throw explain(res.status, await res.text());
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () =>
    request<{
      ok: boolean;
      deepseek_configured?: boolean;
      ai_coach_enhanced?: boolean;
      ai_coach?: string;
      asr_provider?: string;
      asr_model?: string;
    }>("/api/health"),
  contact: (body: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    interest?: string;
  }) =>
    request<{ status: string; emailed: boolean; message: string }>("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  quota: () =>
    request<{
      enabled: boolean;
      features: Record<string, QuotaState>;
      upgrade_url: string;
    }>("/api/quota"),
  sessions: () => request<SessionRow[]>("/api/sessions"),
  session: (id: string) => request<SessionDetail>(`/api/sessions/${id}`),
  deleteSession: (id: string) => request<{ status: string }>(`/api/sessions/${id}`, { method: "DELETE" }),
  dashboard: () => request<DashboardData>("/api/dashboard"),
  memory: () => request<MemoryData>("/api/memory"),
  voiceProgram: () => request<VoiceProgramData>("/api/voice-program"),
  setVoiceGoal: (goal_key: string) =>
    request<VoiceProgramData>("/api/voice-goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal_key }),
    }),
  completeMission: () =>
    request<DailyMission>("/api/daily-mission/complete", { method: "POST" }),
  fillers: () =>
    request<{ builtin: string[]; custom: string[]; active: string[]; note?: string }>("/api/fillers"),
  addFiller: (phrase: string) =>
    request<{ builtin: string[]; custom: string[]; active: string[] }>("/api/fillers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase }),
    }),
  removeFiller: (phrase: string) =>
    request<{ builtin: string[]; custom: string[]; active: string[] }>(
      `/api/fillers/${encodeURIComponent(phrase)}`,
      { method: "DELETE" },
    ),
  freshStart: () =>
    request<{ status: string; message: string; deleted: { sessions: number; files: number } }>(
      "/api/fresh-start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      },
    ),
  exercises: () => request<ExercisesData>("/api/exercises"),
  completeExercise: (key: string) =>
    request<{ status: string; streak: number }>(`/api/exercises/${key}/complete`, { method: "POST" }),
  upload: async (
    file: Blob,
    title: string,
    mode = "free",
    meta?: {
      exercise_key?: string;
      exercise_title?: string;
      exercise_category?: string;
      exercise_description?: string;
      focus_note?: string;
    },
  ) => {
    assertUploadSize(file);
    const fd = new FormData();
    fd.append("file", file, (file as File).name || "recording.webm");
    fd.append("title", title);
    fd.append("mode", mode);
    if (meta?.exercise_key) fd.append("exercise_key", meta.exercise_key);
    if (meta?.exercise_title) fd.append("exercise_title", meta.exercise_title);
    if (meta?.exercise_category) fd.append("exercise_category", meta.exercise_category);
    if (meta?.exercise_description) fd.append("exercise_description", meta.exercise_description);
    if (meta?.focus_note) fd.append("focus_note", meta.focus_note);
    return request<{ session_id: string; status: string; mode?: string }>("/api/sessions/upload", {
      method: "POST",
      body: fd,
    });
  },
  startListening: (body: {
    title?: string;
    device_label?: string;
    speech_start_sec?: number;
    silence_end_sec?: number;
    min_conversation_sec?: number;
    min_speech_ratio?: number;
  }) =>
    request<{ id: string; status: string; settings: Record<string, number> }>("/api/listening/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  listening: (id: string) => request<ListeningDetail>(`/api/listening/${id}`),
  listListening: () => request<ListeningRow[]>("/api/listening"),
  activeListening: () =>
    request<{ active: false } | ({ active: true } & ListeningDetail)>("/api/listening/active"),
  endListening: (id: string) =>
    request<{ id: string; status: string; summary: ListeningSummary }>(`/api/listening/${id}/end`, {
      method: "POST",
    }),
  unlockVerdict: (listeningId: string, exerciseSessionId?: string) =>
    request<{ id: string; verdict: FounderVerdict }>(`/api/listening/${listeningId}/verdict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise_session_id: exerciseSessionId || null }),
    }),
  uploadListeningConversation: async (
    listeningId: string,
    file: Blob,
    opts: { title: string; conversation_index: number; duration_hint: number },
  ) => {
    assertUploadSize(file);
    const fd = new FormData();
    const name = file.type.includes("wav") ? "conversation.wav" : "conversation.webm";
    fd.append("file", file, name);
    fd.append("title", opts.title);
    fd.append("conversation_index", String(opts.conversation_index));
    fd.append("duration_hint", String(opts.duration_hint));
    return request<{ session_id: string; status: string; title: string }>(
      `/api/listening/${listeningId}/conversations`,
      { method: "POST", body: fd },
    );
  },
  practiceStart: (pitch_context: string) =>
    request<PracticeResult>("/api/practice/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pitch_context }),
    }),
  practiceTurn: (payload: {
    pitch_context: string;
    history: { role: string; content: string }[];
    founder_message: string;
  }) =>
    request<PracticeResult>("/api/practice/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

export type SessionRow = {
  id: string;
  title: string;
  created_at: string;
  status: string;
  duration: number;
  mode: string;
  exercise_key?: string | null;
  wpm?: number;
  filler_count?: number;
  clarity?: number;
  confidence_est?: number;
  executive_presence?: number;
};

export type Finding = {
  id?: number;
  kind: string;
  start: number;
  end: number;
  severity: number;
  label: string;
  cause: string;
  fix: string;
  exercise?: string;
  observation?: string;
  evidence?: string;
  impact?: string;
  expected_improvement?: string;
  weekly_trend?: string;
  meta?: Record<string, unknown>;
};

export type SessionDetail = {
  session: SessionRow & {
    coach_summary?: string;
    exercise_key?: string | null;
    focus?: {
      exercise_key?: string | null;
      exercise_title?: string | null;
      exercise_category?: string | null;
      exercise_description?: string | null;
      focus_note?: string | null;
      full_evaluation?: boolean;
      note?: string;
    } | null;
    transcript?: {
      text: string;
      words: { start: number; end: number; word: string; probability: number }[];
      sentences: { start: number; end: number; text: string; confidence: number }[];
      warning?: string;
    };
    error?: string;
  };
  metrics: Record<string, unknown> | null;
  events: Finding[];
  lab_recs?: LabRec[];
};

export type DashboardData = {
  windows: Record<string, Record<string, number | null>>;
  top_patterns: { key: string; label: string; frequency: number; trend: number }[];
  insights: string[];
  series?: Record<string, number | string | null>[];
  recent_sessions: SessionRow[];
};

export type MemoryData = DashboardData;

export type ExerciseItem = {
  key: string;
  title: string;
  category: string;
  description: string;
  duration_sec: number;
  target_pattern?: string;
  level?: number;
  times_completed?: number;
  completed?: boolean;
  why?: string;
  sound?: string;
  fix_line?: string;
  speak?: string;
  how?: string;
  sense?: string;
  similar?: string[];
};

export type LabRec = {
  key: string;
  title: string;
  description?: string;
  duration_sec?: number;
  level?: number;
  category?: string;
  sound?: string;
  why?: string;
  fix_line?: string;
  speak?: string;
  how?: string;
  sense?: string;
  source?: string;
};

export type ExercisesData = {
  exercises: ExerciseItem[];
  recommended: ExerciseItem[];
  streak: number;
  mission?: DailyMission;
  plan?: TrainingPlanItem[];
  goal?: { goal_key: string; goal_label: string };
  hard_words?: { word: string; count: number; avg_confidence?: number }[];
  philosophy?: string;
  levels?: {
    unlocked: Record<string, boolean>;
    unique_l1: number;
    unique_l2: number;
    xp: number;
    next_unlock?: string | null;
  };
};

export type DailyMission = {
  date: string;
  title: string;
  /** The measurable half of the mission, rendered as a pill, not in the headline. */
  target?: string;
  focus_key?: string;
  exercise_key?: string;
  why?: string;
  completed?: boolean;
};

export type TrainingPlanItem = {
  weakness_key: string;
  title: string;
  why?: string;
  exercise_key?: string;
  priority: number;
  expected_gain?: Record<string, number>;
  exercise?: {
    key: string;
    title: string;
    category: string;
    description: string;
    duration_sec: number;
  } | null;
};

export type VoiceProfile = {
  scores: Record<string, number | null>;
  baseline?: Record<string, number> | null;
  deltas?: Record<string, number>;
  hard_words?: { word: string; count: number; avg_confidence?: number }[];
  weekly?: Record<string, number | null>;
  monthly?: Record<string, number | null>;
  sessions_counted?: number;
  updated_at?: string | null;
  note?: string;
  inverse_keys?: string[];
};

export type VoiceProgramData = {
  goal: { goal_key: string; goal_label: string };
  goals: { key: string; label: string }[];
  profile: VoiceProfile;
  plan: TrainingPlanItem[];
  mission: DailyMission;
  philosophy: string;
};

export type PracticeResult = {
  reply: string;
  scores: Record<string, number>;
  history: { role: string; content: string }[];
  /** What this visitor has left after the call the server just served. */
  quota?: QuotaState;
};

export type ListeningRow = {
  id: string;
  created_at: string;
  ended_at?: string | null;
  title: string;
  status: string;
  conversation_count: number;
  speaking_time_sec: number;
  device_label?: string | null;
  summary?: ListeningSummary | null;
};

export type ListeningConversation = {
  id: string;
  title: string;
  created_at: string;
  duration: number;
  status: string;
  conversation_index?: number;
  wpm?: number;
  clarity?: number;
  confidence_est?: number;
  executive_presence?: number;
  filler_count?: number;
  error?: string;
  coach_summary?: string;
};

export type ListeningDetail = {
  listening: ListeningRow & {
    settings?: Record<string, number>;
    summary?: ListeningSummary | null;
  };
  conversations: ListeningConversation[];
  analyzing: boolean;
};

export type FounderVerdict = {
  status: "pending" | "ready";
  founder_voice_score?: number;
  exercise_score?: number;
  headline: string;
  verdict?: string;
  why?: string;
  insights?: string[];
  top_fix?: string;
  daily_habit?: string;
  listening_clips?: number;
  exercise_required?: boolean;
  exercise_title?: string;
  cta?: string;
  device_label?: string;
  mic_note?: string;
};

export type ListeningSummary = {
  session_duration_sec: number;
  session_duration_label: string;
  meaningful_conversations: number;
  analyzed_conversations: number;
  speaking_time_sec: number;
  speaking_time_label: string;
  average_wpm: number | null;
  most_common_weakness: string;
  most_improved_skill: string;
  highest_roi_recommendation: string;
  lab_recs?: LabRec[];
  latest_coach_line?: string | null;
  verdict_status?: "pending" | "ready";
  verdict?: FounderVerdict;
  device_label?: string;
  conversations: {
    id: string;
    title?: string;
    created_at?: string;
    duration?: number;
    status?: string;
    wpm?: number;
    conversation_index?: number;
  }[];
};
