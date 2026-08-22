/** Serialized microphone access, overlapping getUserMedia calls hang on Windows. */

let micLock: Promise<unknown> = Promise.resolve();

export type MicDevice = { deviceId: string; label: string };

export async function listMics(): Promise<MicDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  // Need a prior permission grant for labels; try a quick open/close if labels empty.
  let devices = await navigator.mediaDevices.enumerateDevices();
  let inputs = devices.filter((d) => d.kind === "audioinput");
  if (inputs.length && inputs.every((d) => !d.label)) {
    try {
      const tmp = await withMicTimeout(
        () => navigator.mediaDevices.getUserMedia({ audio: true }),
        5000,
      );
      tmp.getTracks().forEach((t) => t.stop());
      devices = await navigator.mediaDevices.enumerateDevices();
      inputs = devices.filter((d) => d.kind === "audioinput");
    } catch {
      /* permission denied or timeout */
    }
  }
  return inputs.map((d, i) => ({
    deviceId: d.deviceId,
    label: d.label || `Microphone ${i + 1}`,
  }));
}

function withMicTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          "Microphone timed out. Close other apps using the mic (Zoom/Teams), then click Start again.",
        ),
      );
    }, ms);
    fn()
      .then((v) => {
        if (settled) {
          // Late success, release immediately so we don't leak a lock.
          const late = v as unknown as MediaStream | undefined;
          if (late && typeof late === "object" && "getTracks" in late) {
            late.getTracks().forEach((t) => t.stop());
          }
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

/**
 * Turn whatever the browser threw into something a person can act on.
 *
 * getUserMedia reports four unrelated situations through the same
 * NotAllowedError, whose message in Chrome is the bare string "Permission
 * denied". Surfacing that verbatim tells someone nothing about which of the
 * four they are in, or what to do next, so each one is named here instead.
 */
export function micErrorMessage(err: unknown): string {
  // Our own thrown Errors (timeout, no device) already say something useful.
  if (err instanceof Error && !(err instanceof DOMException)) return err.message;

  const name = err instanceof DOMException ? err.name : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return (
        "The browser is blocking the microphone for this site. Click the icon " +
        "at the left of the address bar, set Microphone to Allow, then reload. " +
        "If it is already set to Allow, check that your operating system lets " +
        "this browser use the microphone."
      );
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone is connected. Plug one in, or enable it in your sound settings, and retry.";
    case "NotReadableError":
    case "TrackStartError":
      return (
        "Another app is holding the microphone. Close Zoom, Teams, Meet or " +
        "any other tab that is recording, then click Start again."
      );
    case "OverconstrainedError":
      return "That microphone is no longer available. Pick a different one and retry.";
    case "SecurityError":
      return "The microphone is blocked by this page's security policy. Reload, and tell us if it continues.";
    default:
      return err instanceof Error && err.message
        ? err.message
        : "Could not open the microphone. Reload the page and try again.";
  }
}

/** True for a NotAllowedError, which no amount of device hunting can fix. */
function isPermissionError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
  );
}

export async function openMicrophone(deviceId?: string): Promise<MediaStream> {
  /* A page served over plain http has no navigator.mediaDevices at all, so the
     old message blamed the browser for what is actually the address. This is
     the single most common reason recording works locally and not on a LAN IP
     or a preview URL. */
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error(
      "The microphone only works on a secure connection. Open this site over " +
        "https (or on localhost) and try again.",
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot access the microphone.");
  }

  const run = async () => {
    const audio: boolean | MediaTrackConstraints = deviceId
      ? { deviceId: { ideal: deviceId } }
      : true;

    // Prefer default first, fastest path when permission already granted.
    try {
      return await withMicTimeout(
        () => navigator.mediaDevices.getUserMedia({ audio }),
        6000,
      );
    } catch (first) {
      /* A refusal is about permission, not about hardware. Falling through to
         the device hunt made a blocked microphone report itself as "No
         microphone detected. Plug one in", which sends someone to check cables
         over a setting in the address bar. Retrying by device id cannot
         succeed either: the block is per-origin, not per-device. */
      if (isPermissionError(first)) {
        throw new Error(micErrorMessage(first));
      }

      // Fallback: any audioinput by explicit device id
      const mics = await listMics();
      if (!mics.length) {
        throw new Error(
          "No microphone detected. Plug one in (or enable it in Windows Sound settings) and retry.",
        );
      }
      const id = deviceId || mics[0].deviceId;
      if (!id) {
        throw new Error(micErrorMessage(first));
      }
      try {
        return await withMicTimeout(
          () =>
            navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: id } },
            }),
          6000,
        );
      } catch (second) {
        throw new Error(micErrorMessage(second));
      }
    }
  };

  // Queue behind any in-flight open so Windows doesn't deadlock.
  const next = micLock.then(run, run);
  micLock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
