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
