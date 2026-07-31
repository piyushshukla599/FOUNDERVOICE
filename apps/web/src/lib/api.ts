import { assertUploadSize } from "./upload";

/** Browser talks to FastAPI directly — avoids Next.js 10MB proxy buffering on uploads/audio. */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
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
      whisper_model: string;
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
};

export type DashboardData = {
  windows: Record<string, Record<string, number | null>>;
  top_patterns: { key: string; label: string; frequency: number; trend: number }[];
  insights: string[];
  series: Record<string, number | string | null>[];
  recent_sessions: SessionRow[];
};

export type MemoryData = DashboardData;

export type ExercisesData = {
  exercises: { key: string; title: string; category: string; description: string; duration_sec: number; target_pattern?: string }[];
  recommended: { key: string; title: string; category: string; description: string; duration_sec: number }[];
  streak: number;
  mission?: DailyMission;
  plan?: TrainingPlanItem[];
  goal?: { goal_key: string; goal_label: string };
  hard_words?: { word: string; count: number; avg_confidence?: number }[];
  philosophy?: string;
};

export type DailyMission = {
  date: string;
  title: string;
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
  latest_coach_line?: string | null;
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
