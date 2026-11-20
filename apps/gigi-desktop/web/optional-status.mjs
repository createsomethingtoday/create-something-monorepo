/** A slow optional read must not block local work. This does not cancel the native read. */
export function boundedStatusRead(read, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Status check timed out. Check again when ready.')), timeoutMs);
    timer.unref?.();
    Promise.resolve().then(read).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
