const TRANSIENT_CONTAINER_ERROR_PATTERNS = [
  /container suddenly disconnected/i,
  /operation was aborted/i,
  /durable object storage caused object to be reset/i,
  /broken pipe/i,
  /connection reset/i,
  /socket hang up/i,
];

export function isTransientContainerError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return TRANSIENT_CONTAINER_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}
