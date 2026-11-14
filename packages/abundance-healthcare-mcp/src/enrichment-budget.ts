/** Spend tracking and dispatch idempotency. There is no financial admission ceiling. */
export type Provider = 'pdl' | 'clay' | 'exa' | 'apify';
export type BudgetGrant = { id: string; provider: Provider; token: string; npi: string };
export type BudgetOptions = {
  agencyApiKey?: string;
  agencyBaseUrl?: string;
  fetchFn?: typeof fetch;
};
export type SpendReceipt = {
  event_id: string;
  status: 'pending' | 'complete' | 'failed' | 'uncertain';
  actual_usd: number | null;
  estimated_usd: number | null;
  credits: number | null;
  credit_unit: string | null;
  receipt_ref: string | null;
};
const defaultBase = 'https://createsomething.agency';
export async function budgetRequest(
  options: BudgetOptions,
  provider: Provider | 'complete',
  body?: unknown
): Promise<any> {
  if (!options.agencyApiKey?.trim())
    throw new Error('Enrichment spend tracking is not configured.');
  const url = new URL('/api/abundance/enrichment-budget', options.agencyBaseUrl || defaultBase);
  if (!body) url.searchParams.set('provider', provider);
  const response = await (options.fetchFn ?? fetch)(url, {
    method: body ? 'POST' : 'GET',
    redirect: 'manual',
    headers: {
      Authorization: `Bearer ${options.agencyApiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok)
    throw new Error(
      'Enrichment tracking unavailable or this operation has already been dispatched. Do not automatically retry.'
    );
  const data = (await response.json()) as { success?: boolean; data?: unknown };
  if (data.success !== true || !data.data) throw new Error('Invalid enrichment tracking response.');
  return data.data;
}
export async function readEnrichmentReadiness(provider: Provider, options: BudgetOptions) {
  try {
    return await budgetRequest(options, provider);
  } catch {
    return {
      provider,
      ready: false,
      reason: 'Spend tracking connection unavailable.',
      blocking_reasons: ['Spend tracking connection unavailable.'],
      cost: { estimated_usd: null },
      spend: {
        currency: 'USD',
        confirmed_usd: null,
        estimated_usd: null,
        pending_count: null,
        history_complete: false,
        historical_usd: null
      }
    };
  }
}
export async function reserveBudget(
  provider: Provider | 'complete',
  identity: unknown,
  npi: string,
  options: BudgetOptions
) {
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify({ provider, identity }))
      )
    ),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
  return budgetRequest(options, provider, { provider, digest, npi }) as Promise<{
    id: string;
    grants: Partial<Record<Provider, BudgetGrant>>;
  }>;
}
export async function claimBudget(
  provider: Provider,
  identity: unknown,
  npi: string,
  options: BudgetOptions,
  grant?: BudgetGrant
) {
  const supplied =
    grant ?? (await reserveBudget(provider, identity, npi, options)).grants[provider];
  if (!supplied || supplied.provider !== provider || supplied.npi !== npi)
    throw new Error('Mismatched enrichment dispatch identity.');
  const result = await budgetRequest(options, provider, { action: 'claim', grant: supplied });
  if (result.claimed !== true) throw new Error('Enrichment dispatch claim was not confirmed.');
  return supplied;
}
export async function recordSpend(
  options: BudgetOptions,
  grant: BudgetGrant,
  receipt: SpendReceipt
) {
  await budgetRequest(options, grant.provider, { action: 'record', grant, ...receipt });
}
export const finiteAmount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
