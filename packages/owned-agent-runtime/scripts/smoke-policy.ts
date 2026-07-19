export function evaluateAnonymousControlSmoke(input: {
  status: number;
  error?: string;
  requireConfigured: boolean;
}): { passed: boolean; skipped: boolean } {
  if (input.status === 401) return { passed: true, skipped: false };
  if (
    !input.requireConfigured &&
    input.status === 503 &&
    input.error === 'control_identity_unconfigured'
  ) {
    return { passed: true, skipped: true };
  }
  return { passed: false, skipped: false };
}
