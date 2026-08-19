/** Serialized microphone access — overlapping getUserMedia calls hang on Windows. */

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
          // Late success — release immediately so we don't leak a lock.
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

export async function openMicrophone(deviceId?: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot access the microphone.");
  }

  const run = async () => {
    const audio: boolean | MediaTrackConstraints = deviceId
      ? { deviceId: { ideal: deviceId } }
      : true;

    // Prefer default first — fastest path when permission already granted.
    try {
      return await withMicTimeout(
        () => navigator.mediaDevices.getUserMedia({ audio }),
        6000,
      );
    } catch (first) {
      // Fallback: any audioinput by explicit device id
      const mics = await listMics();
      if (!mics.length) {
        throw new Error(
          "No microphone detected. Plug one in (or enable it in Windows Sound settings) and retry.",
        );
      }
      const id = deviceId || mics[0].deviceId;
      if (!id) {
        throw first instanceof Error ? first : new Error(String(first));
      }
      return await withMicTimeout(
        () =>
          navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: id } },
          }),
        6000,
      );
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
