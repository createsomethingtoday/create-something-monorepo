import { NpgStore, type Source, type State, type Conversation } from './store';
import type { Providers } from './providers';
export type EnrichmentRecovery = {
  actionId: string;
  npi: string;
  status: 'pending' | 'complete' | 'blocked' | 'exhausted';
  attempts: number;
  nextAttemptAt: number;
  deadlineAt: number;
  reason?: string;
};
const names = ['pdl', 'exa', 'apify'] as const;
const holds = new Set([
  'blocked_review',
  'privacy_blocked_review',
  'association_failure',
  'ambiguous',
  'blocked',
  'blocked_by_policy',
  'privacy_blocked'
]);
const waiting = new Set(['pending', 'delivery_unknown']);
const operationCacheHit = (receipt: any): boolean =>
  typeof receipt?.operation_cache_hit === 'boolean'
    ? receipt.operation_cache_hit
    : receipt?.cached === true || receipt?.cache_hit === true;
const amount = (n: unknown): number | null =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
const skipAnchor = (r: any, npi: string) =>
  /^[a-f0-9]{64}$/.test(r?.id ?? '') &&
  /^[A-Za-z0-9]{1,64}$/.test(r?.run_id ?? '') &&
  r.npi === npi;
function needsRead(provider: string, r: any, npi: string) {
  return provider === 'apify' && skipAnchor(r,npi) && (!holds.has(r.status) || (r.status === 'blocked_review' && r.charge_reconciled === false)) && (r.status === 'pending' || r.charge_reconciled !== true);
}
// Result completion is deliberately independent of the billing ledger.
export function recomputeProfile(data: any): any {
  const providers = data.providers ?? {};
  const blocked = Object.values(providers).some(
    (r: any) => holds.has(r?.status) || r?.match_status === 'ambiguous'
  );
  const terminal = new Set([
    'matched',
    'complete',
    'review_required',
    'no_contact',
    'no_match',
    'provider_failed',
    'provider_aborted',
    'provider_timeout',
    'blocked',
    'blocked_by_policy',
    'privacy_blocked'
  ]);
  const exaResult = (name: string) =>
    name === 'exa' &&
    providers[name]?.status === undefined &&
    ['verified_match', 'plausible_match', 'no_match'].includes(providers[name]?.match_status) &&
    ['unverified_enrichment_candidate', 'no_contact_candidate_found'].includes(
      providers[name]?.contact_route_status
    );
  const settled = (name: string) =>
    Boolean(providers[name]) &&
    (exaResult(name) || holds.has(providers[name].status) || terminal.has(providers[name].status));
  const pending = names.some((name) => !settled(name));
  const unstarted = Array.isArray(data.unstarted) && data.unstarted.length > 0;
  // A known Skip Trace pending receipt is recoverable. Unknown synchronous or
  // dispatch outcomes stay unresolved; successful exact reads replace stale flags.
  const uncertain = names.some(
    (name) =>
      !settled(name) &&
      !(providers[name]?.status === 'pending' && name === 'apify')
  );
  const historicalRetired = providers.clay && !terminal.has(providers.clay.status);
  const charges = [...names,...(providers.clay?['clay']:[])].map((name) => {
    const r = providers[name];
    return operationCacheHit(r)
      ? 0
      : amount(r?.operation_charge_usd ?? r?.actual_cost_usd ?? r?.charge_usd);
  });
  const known = charges.filter((n): n is number => n !== null);
  const unsettled = charges.filter((n) => n === null).length;
  return {
    ...data,
    ...(providers.clay ? {retired_providers:['clay']} : {}),
    status: blocked ? 'blocked' : pending || unstarted ? 'partial' : historicalRetired ? 'retired' : 'complete',
    uncertain_dispatch: uncertain,
    billing_reconciliation_required:
      (data.spend_tracking?.pending_receipts ?? unsettled) > 0 ||
      providers.apify?.charge_reconciled === false,
    providers,
    ...(data.profile && typeof data.profile === 'object'
      ? {
          profile: {
            ...data.profile,
            provider_results: Object.fromEntries(
              Object.keys(data.profile.provider_results ?? {}).map((name) => [
                name,
                providers[name] ?? data.profile.provider_results[name]
              ])
            ),
            verification: 'unverified'
          }
        }
      : {}),
    ...(data.spend_tracking && typeof data.spend_tracking === 'object'
      ? {
          spend_tracking: {
            ...data.spend_tracking,
            actual_usd:
              amount(data.spend_tracking?.actual_usd) ??
              (known.length ? Math.round(known.reduce((a, b) => a + b, 0) * 1e6) / 1e6 : null),
            pending_receipts: data.spend_tracking?.pending_receipts ?? unsettled
          }
        }
      : {})
  };
}
export function recoveryFor(source: Source, now: number): EnrichmentRecovery | undefined {
  const d = source.data as any;
  if (
    source.tool !== 'enrich_candidate_complete_profile' ||
    !source.actionId ||
    !/^\d{10}$/.test(d?.npi ?? '')
  )
    return;
  if (!['apify'].some((name) => needsRead(name, d.providers?.[name], d.npi))) return;
  return {
    actionId: source.actionId,
    npi: d.npi,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: now,
    deadlineAt: now + 86400000
  };
}
export function recoveryView(state: State, now: number): EnrichmentRecovery[] {
  const saved = (state.enrichmentRecovery ?? []).map(job => {
    const source=state.sources.find(s=>s.actionId===job.actionId);
    const data=source?.data as any;
    return job.status==='pending' && data?.providers?.clay && !needsRead('apify',data.providers.apify,job.npi) ? {...job,status:'complete' as const,reason:'Retired provider receipt retained for audit; no further recovery is scheduled.'} : job;
  });
  return [
    ...saved,
    ...state.sources.flatMap((source) => {
      const job = recoveryFor(source, now);
      return job && !saved.some((item) => item.actionId === job.actionId) ? [job] : [];
    })
  ];
}
/** Exact receipt reads only. Never invokes either provider's creation path. */
export async function reconcileState(
  store: NpgStore,
  row: Conversation,
  state: State,
  providers: Providers,
  reserved = false
) {
  const now = store.now();
  for(const source of state.sources) if(source.tool==='enrich_candidate_complete_profile' && (source.data as any)?.providers?.clay) source.data=recomputeProfile(source.data);
  state.enrichmentRecovery = recoveryView(state, now);
  for (const job of state.enrichmentRecovery) {
    if (job.status !== 'pending' || job.nextAttemptAt > now) continue;
    const source = state.sources.find(
      (s) => s.actionId === job.actionId && s.tool === 'enrich_candidate_complete_profile'
    );
    const approved = await store.action(row.owner_id, job.actionId);
    const args = JSON.parse(approved.arguments_json);
    if (
      !source ||
      approved.owner_id !== row.owner_id ||
      approved.conversation_id !== row.id ||
      approved.tool !== source.tool ||
      !['completed', 'ambiguous'].includes(approved.status) ||
      args.operation_id !== approved.id ||
      args.npi !== job.npi ||
      args.confirm_paid_enrichment !== true ||
      (source.data as any)?.npi !== job.npi
    ) {
      job.status = 'blocked';
      job.reason = 'Approved candidate receipt association could not be established.';
      continue;
    }
    if ((!reserved && job.attempts >= 24) || now >= job.deadlineAt) {
      job.status = 'exhausted';
      job.reason =
        'Automatic receipt recovery reached its 24-attempt or 24-hour bound. Operator reconciliation is required; no paid lookup was repeated.';
      continue;
    }
    if (!reserved) job.attempts++;
    const data = source.data as any;
    for (const name of ['apify']) {
      const prior = data.providers?.[name];
      if (!needsRead(name, prior, job.npi)) continue;
      try {
        let result:any=await providers.call('enrich_candidate_skip_trace',{npi:job.npi,confirm_paid_enrichment:true,reconcile_receipt:{id:prior.id,run_id:prior.run_id}});
        const valid=['pending','review_required','no_contact','blocked_review','provider_failed','provider_aborted','provider_timeout','privacy_blocked_review','association_failure','billing_review'].includes(result?.status) && skipAnchor(result,job.npi) && result.id===prior.id && result.run_id===prior.run_id;
        if (!valid) {
          data.providers[name] = {
            id: prior.id,
            run_id: prior.run_id,
            npi: job.npi,
            status: 'association_failure',
            charge_reconciled: false,
            reason:
              'Refreshed receipt did not match approved candidate/run. Previous contact evidence is withheld.'
          };
          job.reason = 'Provider receipt association failed; its contacts are withheld.';
          continue;
        }
        if(prior.status==='blocked_review') {
          // A billing read cannot clear an existing identity hold or reveal contacts.
          result={...prior,charge_reconciled:result.charge_reconciled,charge_usd:result.charge_usd,actual_cost_usd:result.actual_cost_usd,revision:result.revision};
          for(const field of ['contacts','emails','phones','personal_emails','phone_numbers','personal_contact','result']) delete result[field];
        }
        const priorRecordedCharge = amount(
          prior.operation_charge_usd ?? prior.actual_cost_usd ?? prior.charge_usd
        );
        const cachedOperation = operationCacheHit(prior);
        const oldCharge = cachedOperation ? 0 : priorRecordedCharge;
        const newCharge = cachedOperation
          ? 0
          : (amount(result.actual_cost_usd ?? result.charge_usd) ?? oldCharge);
        if (newCharge !== null && data.spend_tracking) {
          const priorTotal = amount(data.spend_tracking.actual_usd);
          data.spend_tracking = {
            ...data.spend_tracking,
            actual_usd: Math.round(((priorTotal ?? 0) - (oldCharge ?? 0) + newCharge) * 1e6) / 1e6,
            pending_receipts:
              priorRecordedCharge === null &&
              Number.isSafeInteger(data.spend_tracking.pending_receipts)
                ? Math.max(0, data.spend_tracking.pending_receipts - 1)
                : data.spend_tracking.pending_receipts
          };
        }
        data.providers[name] = {
          ...result,
          operation_cache_hit: cachedOperation,
          operation_charge_usd: newCharge
        };
      } catch {
        job.reason =
          'Existing receipt read failed. A bounded later read is scheduled; no paid dispatch was repeated.';
      }
    }
    source.data = recomputeProfile(data);
    if (
      job.status === 'pending' &&
      !['apify'].some((name) => needsRead(name, data.providers?.[name], job.npi))
    ) {
      job.status = ['complete','retired'].includes((source.data as any).status) ? 'complete' : 'blocked';
      job.reason =
        job.status === 'blocked'
          ? 'Provider result or identity review remains unresolved. Reconcile the explicit provider outcomes before repeating enrichment.'
          : 'Existing provider receipt recovery finished. Contact ownership and consent remain unverified.';
    }
    job.nextAttemptAt =
      now + Math.min(3600000, 60000 * 2 ** Math.min(Math.max(0, job.attempts - 1), 6));
  }
  const pending = state.enrichmentRecovery.filter((j) => j.status === 'pending');
  state.skipTraceQueue = state.skipTraceQueue?.filter(
    (r) => !state.enrichmentRecovery!.some((j) => j.actionId === r.actionId && !pending.includes(j))
  );
  if (
    state.skipTracePending &&
    state.enrichmentRecovery.some(
      (j) => j.actionId === state.skipTracePending!.actionId && j.status !== 'pending'
    )
  ) {
    state.skipTracePending = state.skipTraceQueue?.shift();
  }
}
/** Durable cron, including legacy sources. CAS leases serialize with interactive commands. */
export async function runRecoveryBatch(store: NpgStore, makeProviders: () => Providers) {
  const now = store.now();
  const rows = await store.db
    .prepare(
      `SELECT * FROM npg_analyst_conversations WHERE scope='npg' AND status IN ('idle','review','ambiguous','interrupted') AND lease_until<=?
    AND (status='review' OR json_extract(state_json,'$.pendingId') IS NULL)
    AND EXISTS (SELECT 1 FROM json_each(state_json,'$.sources') WHERE json_extract(value,'$.tool')='enrich_candidate_complete_profile')
    AND (json_extract(state_json,'$.enrichmentRecovery') IS NULL OR EXISTS (SELECT 1 FROM json_each(state_json,'$.enrichmentRecovery') WHERE json_extract(value,'$.status')='pending' AND json_extract(value,'$.nextAttemptAt')<=?))
    ORDER BY updated_at ASC LIMIT 1`
    )
    .bind(now, now)
    .all<Conversation>();
  let processed = 0;
  for (const row of rows.results) {
    const token = crypto.randomUUID();
    // Recovery preserves review versions so pending approvals remain valid. Compare
    // the selected state too, or a later lease can revive a stale receipt/backoff.
    const lock = await store.db
      .prepare(
        `UPDATE npg_analyst_conversations SET lease_token=?,lease_until=? WHERE id=? AND owner_id=? AND version=? AND status=? AND lease_until<=? AND state_json=? RETURNING id`
      )
      .bind(token, now + 240000, row.id, row.owner_id, row.version, row.status, now, row.state_json)
      .first();
    if (!lock) continue;
    processed++;
    let providers: Providers | undefined;
    try {
      const state: State = JSON.parse(row.state_json);
      state.enrichmentRecovery = recoveryView(state, now);
      // Reserve attempts durably before catalog/network IO. A crash leaves the same exact receipts due later.
      const due = new Set<string>();
      for (const job of state.enrichmentRecovery) {
        if (job.status !== 'pending' || job.nextAttemptAt > now) continue;
        if (job.attempts >= 24 || job.deadlineAt <= now) {
          job.status = 'exhausted';
          job.reason = 'Receipt recovery bound reached. Operator reconciliation required.';
          continue;
        }
        due.add(job.actionId);
        job.attempts++;
        job.nextAttemptAt = now + Math.min(3600000, 60000 * 2 ** Math.min(job.attempts - 1, 6));
      }
      const reserved = JSON.stringify(state);
      if (reserved.length > 450000) throw new Error('Recovery state exceeds conversation bound');
      await store.db
        .prepare(
          'UPDATE npg_analyst_conversations SET state_json=? WHERE id=? AND owner_id=? AND version=? AND lease_token=?'
        )
        .bind(reserved, row.id, row.owner_id, row.version, token)
        .run();
      providers = makeProviders();
      await providers.tools().catch(() => {});
      // Reservation already scheduled the next attempt, but this turn owns its due reads.
      for (const job of state.enrichmentRecovery)
        if (due.has(job.actionId) && job.status === 'pending') job.nextAttemptAt = now;
      await reconcileState(store, row, state, providers, true);
      if (JSON.stringify(state).length > 450000)
        throw new Error('Recovery result exceeds conversation bound');
      // Empty metadata also marks terminal legacy conversations as scanned.
      await store.db
        .prepare(
          `UPDATE npg_analyst_conversations SET state_json=?,version=version+CASE WHEN status='review' THEN 0 ELSE 1 END,updated_at=?,lease_until=0,lease_token=NULL WHERE id=? AND owner_id=? AND version=? AND lease_token=? AND lease_until>?`
        )
        .bind(
          JSON.stringify(state),
          store.now(),
          row.id,
          row.owner_id,
          row.version,
          token,
          store.now()
        )
        .run();
    } catch {
      // Reserved attempt remains durable; failures are isolated to this conversation.
    } finally {
      await providers?.close().catch(() => {});
      await store.db
        .prepare(
          'UPDATE npg_analyst_conversations SET lease_until=0,lease_token=NULL WHERE id=? AND owner_id=? AND lease_token=?'
        )
        .bind(row.id, row.owner_id, token)
        .run();
    }
  }
  return { processed };
}
