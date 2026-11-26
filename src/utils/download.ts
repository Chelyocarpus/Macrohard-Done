/**
 * Offers `text` to the person as a file download.
 *
 * Robustness / pitfalls guarded against:
 * - The temporary link and the object URL are cleaned up (the URL a little later, so the browser has started
 *   the download), so repeated exports don't leak memory.
 * - Nothing is written to the app's own storage.
 */
export function downloadTextFile(fileName: string, text: string, mimeType = 'application/json'): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
