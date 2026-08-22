/** Max upload size for audio (must stay ≤ Next.js proxy body limit). */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_UPLOAD_LABEL = "100 MB";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function assertUploadSize(blob: Blob): void {
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File is too large (${formatBytes(blob.size)}). Maximum allowed is ${MAX_UPLOAD_LABEL}.`,
    );
  }
}

/** Container MIME types the recorder can produce, and the extension the API
 *  stores each one under. Keep in step with the allow-list in the upload
 *  route (`apps/api/app/routers/sessions.py`). */
const UPLOAD_EXTENSIONS: ReadonlyArray<readonly [string, string]> = [
  ["audio/webm", ".webm"],
  ["audio/ogg", ".ogg"],
  ["audio/mp4", ".m4a"],
  ["audio/x-m4a", ".m4a"],
  ["audio/mpeg", ".mp3"],
  ["audio/wav", ".wav"],
  ["audio/x-wav", ".wav"],
  ["audio/wave", ".wav"],
  ["audio/flac", ".flac"],
  ["audio/x-flac", ".flac"],
];

/**
 * The filename to upload a recording under.
 *
 * The API takes the stored extension from this name and nothing else, so the
 * name decides the file type on disk and the Content-Type it is later served
 * with. A recorder Blob has no `.name`, and the hardcoded ".webm" that used to
 * fill the gap mislabelled every recording made on an iPhone: Safari has no
 * WebM encoder, so MediaRecorder hands back audio/mp4, which was then written
 * as a .webm and served as audio/webm - a type WebKit refuses, leaving the
 * report with no player at all. Read the container off the blob instead.
 */
export function uploadName(file: Blob, stem: string): string {
  const given = (file as File).name;
  if (given) return given;
  const type = (file.type || "").split(";")[0].trim().toLowerCase();
  const match = UPLOAD_EXTENSIONS.find(([mime]) => mime === type);
  // An unrecognised (or absent) type means the browser did not say. WebM is
  // the right guess: every browser with no MediaRecorder type of its own to
  // report is a Chromium one.
  return `${stem}${match ? match[1] : ".webm"}`;
}
