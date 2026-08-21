"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type ExercisesData, type MemoryData, type SessionRow } from "@/lib/api";

export type JourneyStage = "new" | "learning" | "returning";

/**
 * What the product knows about where this user is in the journey.
 *
 * Everything is derived from data the API already returns, a user who wipes
 * local storage but has 40 sessions is still a returning user, and a user with
 * a full localStorage but no recordings still gets the guided first run.
 */
export function useJourney() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [labs, setLabs] = useState<ExercisesData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [s, m, e] = await Promise.all([api.sessions(), api.memory(), api.exercises()]);
      setSessions(s);
      setMemory(m);
      setLabs(e);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the local API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return useMemo(() => {
    const all = sessions || [];
    const ready = all.filter((s) => s.status === "ready");
    const byMode = (mode: string) => ready.filter((s) => s.mode === mode);
    const readyCount = ready.length;
    const stage: JourneyStage = readyCount === 0 ? "new" : readyCount < 3 ? "learning" : "returning";

    return {
      loading,
      error,
      reload,
      sessions: all,
      readySessions: ready,
      memory,
      labs,
      readyCount,
      stage,
      /** Newest analyzed session of any kind. */
      latest: ready[0] || null,
      hasRecorded: readyCount > 0,
      hasLab: byMode("exercise").length > 0,
      hasListen: byMode("listening").length > 0,
      hasPractice: byMode("practice").length > 0,
      hasTrend: readyCount >= 3,
    };
  }, [error, labs, loading, memory, reload, sessions]);
}

export type Journey = ReturnType<typeof useJourney>;
