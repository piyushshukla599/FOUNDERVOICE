/** Local mic preferences for Smart Session Listening (device-local only). */

const KEY = "fv_mic_prefs_v1";

export type MicPrefs = {
  preferredDeviceId: string;
  backupDeviceId: string;
  alwaysUsePreferred: boolean;
  speechStartSec: number;
  silenceEndSec: number;
  minConversationSec: number;
  minSpeechRatio: number;
};

const DEFAULTS: MicPrefs = {
  preferredDeviceId: "",
  backupDeviceId: "",
  alwaysUsePreferred: true,
  speechStartSec: 3.5,
  silenceEndSec: 4.5,
  minConversationSec: 8,
  minSpeechRatio: 0.22,
};

export function defaultMicPrefs(): MicPrefs {
  return { ...DEFAULTS };
}

export function loadMicPrefs(): MicPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveMicPrefs(prefs: Partial<MicPrefs>): MicPrefs {
  const next = { ...loadMicPrefs(), ...prefs };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}
