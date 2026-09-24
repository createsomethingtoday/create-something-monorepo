export const LIMITS = Object.freeze({ runs: 4, concurrency: 1, deadlineMs: 45000, cleanupAttempts: 3 });
export function admit(state, request, now) {
  if (!request || Object.keys(request).sort().join(',') !== 'id,mode'
    || !/^run-[a-z0-9-]{1,64}$/.test(request.id)
    || !['normal', 'abandon', 'cleanup-fault'].includes(request.mode)) {
    return { status: 400, error: 'invalid_owned_fixture_request' };
  }
  if (state.runs[request.id]) {
    const existing = state.runs[request.id];
    if (existing.mode !== request.mode) return { status: 409, error: 'idempotency_conflict' };
    return { status: 200, duplicate: true, run: existing };
  }
  if (state.active) return { status: 409, error: 'active_or_quarantined_run' };
  if (state.issued >= LIMITS.runs) return { status: 429, error: 'preview_run_budget_exhausted' };
  const run = { id: request.id, mode: request.mode, startedAt: now, deadline: now + LIMITS.deadlineMs,
    status: 'reserved', cleanupAttempts: 0 };
  return { status: 202, run, next: { issued: state.issued + 1, active: request.id,
    runs: { ...state.runs, [request.id]: run } } };
}

export function stopped(state) {
  return ['stopped', 'stopped_with_code'].includes(state?.status);
}

export async function authorized(header, token) {
  if (!/^[a-f0-9]{64}$/.test(token ?? '') || !/^Bearer [a-f0-9]{64}$/.test(header ?? '')) return false;
  const enc = new TextEncoder();
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(header.slice(7))));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(token)));
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
