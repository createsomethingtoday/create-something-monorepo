/** Resume existing approved receipts through Agency's owning store. Never create a lookup. */
export async function triggerEnrichmentRecovery(
  env: { AGENCY_INTERNAL_API_KEY?: string; AGENCY_BASE_URL?: string },
  fetchFn: typeof fetch = fetch
): Promise<void> {
  const key = env.AGENCY_INTERNAL_API_KEY?.trim();
  const base = env.AGENCY_BASE_URL?.trim() || 'https://createsomething.agency';
  if (!key || new URL(base).origin !== 'https://createsomething.agency')
    throw new Error('Enrichment recovery configuration unavailable.');
  const response = await fetchFn('https://createsomething.agency/api/abundance/healthcare-providers/reconcile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    redirect: 'manual',
    signal: AbortSignal.timeout(180000)
  });
  // The response has no client data needed by this trigger. Never log provider bodies.
  await response.body?.cancel();
  if (!response.ok) throw new Error(`Enrichment receipt recovery returned HTTP ${response.status}.`);
}
