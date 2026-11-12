import { z } from 'zod';
import type { PdlStore } from './pdl.js';

export const skipIdentity = z
  .object({
    npi: z.string().regex(/^\d{10}$/),
    full_name: z
      .string()
      .regex(/^[A-Za-z .'-]{1,180}$/)
      .optional(),
    first: z.string().regex(/^[A-Za-z '-]{1,60}$/),
    last: z.string().regex(/^[A-Za-z '-]{1,60}$/),
    practice_city: z.string().regex(/^[A-Za-z .'-]{1,80}$/),
    practice_state: z.string().regex(/^[A-Z]{2}$/),
    confirm_paid_enrichment: z.literal(true),
    reconcile_receipt: z
      .object({
        id: z.string().regex(/^[a-f0-9]{64}$/),
        run_id: z.string().regex(/^[A-Za-z0-9]{1,64}$/)
      })
      .strict()
      .optional()
  })
  .strict();
export type SkipIdentity = z.infer<typeof skipIdentity>;
export type SkipResult = {
  id: string;
  npi: string;
  status: string;
  run_id?: string;
  dataset_id?: string;
  owner_id?: string;
  charge_usd?: number;
  charge_reconciled?: boolean;
  billing_observed_at?: number;
  terminal_at?: number;
  person_link?: string;
  revision?: number;
  contacts?: {
    emails: string[];
    phones: string[];
    home_city: string | null;
    home_state: string | null;
  };
  provenance: {
    source: string;
    actor: string;
    build: string;
    retrieved_at: string;
    ownership: 'unverified';
    consent: 'unverified';
    geography: 'registry_practice_not_home';
    readiness: 'blocked';
  };
  reason?: string;
};
const ACTOR = 'vmf6h5lxPAkB1W2gT';
const fields = [
  'Search Option',
  'Name Match',
  'Person Link',
  'Input Given',
  'First Name',
  'Last Name',
  'Address Locality',
  'Address Region',
  ...Array.from({ length: 5 }, (_, i) => `Email-${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `Phone-${i + 1}`)
];
const word = (v: unknown) =>
  typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : '';
const safeText = (v: unknown) =>
  typeof v === 'string' && /^[A-Za-z .'-]{1,80}$/.test(v) ? v : null;
const providerId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9]{1,64}$/.test(value);
export async function skipTrace(
  input: SkipIdentity,
  options: {
    token?: string;
    store: PdlStore;
    fetchFn?: typeof fetch;
    now?: number;
    dailyBudgetUsd?: number;
    privacyDatasetId?: string;
  }
): Promise<SkipResult> {
  const p = skipIdentity.parse(input);
  if (!options.token?.trim()) throw new Error('Skip Trace is not configured.');
  const { reconcile_receipt, ...identity } = p;
  const now = options.now ?? Date.now();
  const query = `${p.full_name ?? `${p.first} ${p.last}`}; ${p.practice_city}, ${p.practice_state}`;
  const digest = [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(identity)))
    )
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
  const key = `skip:${digest}`;
  const base: SkipResult = {
    id: digest,
    npi: p.npi,
    status: 'delivery_unknown',
    provenance: {
      source: 'Apify one-api/skip-trace',
      actor: ACTOR,
      build: '0.0.192',
      retrieved_at: new Date(now).toISOString(),
      ownership: 'unverified',
      consent: 'unverified',
      geography: 'registry_practice_not_home',
      readiness: 'blocked'
    }
  };
  let existing = await options.store.transaction(async (s) => {
    const cached = await s.get<SkipResult>(key);
    if (
      reconcile_receipt &&
      (reconcile_receipt.id !== digest ||
        !cached ||
        cached.run_id !== reconcile_receipt.run_id ||
        !providerId(cached.owner_id))
    )
      throw new Error('Known receipt unavailable; no dispatch authorized.');
    if (cached && cached.status !== 'privacy_blocked') return cached;
    const reservations = (
      (await s.get<{ at: number; cents: number; id: string; reconciled?: boolean }[]>(
        'skip:budget'
      )) ?? []
    ).filter((r) => !r.reconciled || r.at > now - 86400000);
    if (await s.get('skip:billing_block'))
      throw new Error('Skip Trace billing requires operator reconciliation.');
    const budget = options.dailyBudgetUsd ?? 1;
    if (
      !Number.isFinite(budget) ||
      budget <= 0 ||
      reservations.reduce((n, r) => n + r.cents, 0) + 10 > Math.floor(budget * 100)
    )
      throw new Error('Skip Trace daily budget exhausted.');
    await s.put('skip:budget', [
      ...reservations.filter((r) => r.id !== digest),
      { at: now, cents: 10, id: digest }
    ]);
    await s.put(key, base);
    return undefined;
  });
  if (
    existing &&
    existing.run_id === undefined &&
    existing.dataset_id === undefined &&
    existing.owner_id === undefined &&
    existing.status === 'delivery_unknown'
  )
    return existing;
  if (existing?.status === 'privacy_blocked') existing = undefined;
  // Serialize network reconciliation with a durable lease. A stale poll cannot overwrite a newer receipt.
  const lease = crypto.randomUUID();
  const acquired = await options.store.transaction(async (s) => {
    const held = await s.get<{ until: number }>('lease:' + key);
    if (held && held.until > now) return false;
    await s.put('lease:' + key, { id: lease, until: now + 120000 });
    return true;
  });
  if (!acquired) return existing ?? base;
  const api = async (path: string, method = 'GET', body?: unknown) => {
    const response = await (options.fetchFn ?? fetch)(`https://api.apify.com/v2/${path}`, {
      method,
      redirect: 'manual',
      headers: { Authorization: `Bearer ${options.token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Provider unavailable');
    return response.json() as Promise<any>;
  };
  let result = existing ?? base;
  let dispatched = Boolean(existing);
  try {
    // Validate cached identifiers before interpolating any provider-owned path.
    if (
      existing &&
      (!providerId(existing.run_id) ||
        !providerId(existing.dataset_id) ||
        !providerId(existing.owner_id))
    ) {
      result = { ...result, status: 'association_failure', charge_reconciled: false };
      delete result.contacts;
      throw new Error('Invalid cached receipt');
    }
    const { data: account } = await api('users/me');
    if (!providerId(account?.id)) throw new Error('Invalid authenticated account');
    if (existing && existing.owner_id !== account.id) {
      result = { ...result, status: 'association_failure', charge_reconciled: false };
      delete result.contacts;
      throw new Error('Cached account mismatch');
    }
    if (!existing) {
      // A harmless owner-created dataset inherits account permissions. Verify it exists
      // with the token and is inaccessible anonymously before creating any paid run.
      if (!providerId(options.privacyDatasetId)) throw new Error('Privacy preflight unavailable');
      const { data: sentinel } = await api(`datasets/${options.privacyDatasetId}`);
      if (
        !providerId(sentinel?.id) ||
        sentinel.id !== options.privacyDatasetId ||
        !providerId(sentinel.userId) ||
        sentinel.userId !== account.id ||
        sentinel.generalAccess !== 'FOLLOW_USER_SETTING' ||
        sentinel.itemCount !== 0
      )
        throw new Error('Privacy inheritance not established');
      const emptyItems = await api(`datasets/${options.privacyDatasetId}/items?limit=0`);
      if (!Array.isArray(emptyItems) || emptyItems.length !== 0)
        throw new Error('Sentinel items not empty');
      const anonymous = await (options.fetchFn ?? fetch)(
        `https://api.apify.com/v2/datasets/${options.privacyDatasetId}/items?limit=0`,
        { redirect: 'manual', signal: AbortSignal.timeout(15000) }
      );
      if (
        anonymous.status !== 403 ||
        !anonymous.headers.get('content-type')?.toLowerCase().includes('application/json')
      )
        throw new Error('Unrecognized anonymous response');
      const denied = (await anonymous.json()) as { error?: { type?: unknown; message?: unknown } };
      if (
        denied?.error?.type !== 'insufficient-permissions' ||
        denied.error.message !==
          "Insufficient permissions for the dataset. Make sure you're passing a correct API token and that it has the required permissions."
      )
        throw new Error('Unrecognized dataset denial');
      dispatched = true;
      const { data } = await api(
        `acts/${ACTOR}/runs?build=0.0.192&maxTotalChargeUsd=0.1&timeout=120&restartOnError=false&forcePermissionLevel=LIMITED_PERMISSIONS`,
        'POST',
        { name: [query], max_results: 1 }
      );
      if (
        !providerId(data?.userId) ||
        data.userId !== account.id ||
        !providerId(data.id) ||
        !providerId(data.defaultDatasetId)
      )
        throw new Error('Invalid receipt');
      result = {
        ...base,
        status: 'pending',
        run_id: data.id,
        dataset_id: data.defaultDatasetId,
        owner_id: account.id
      };
      await options.store.put(key, result);
    }
    const { data: run } = await api(`actor-runs/${result.run_id}`);
    if (
      !providerId(run?.id) ||
      !providerId(run.userId) ||
      run.userId !== account.id ||
      !providerId(run.defaultDatasetId) ||
      run.id !== result.run_id ||
      run.actId !== ACTOR ||
      run.defaultDatasetId !== result.dataset_id ||
      run.buildNumber !== '0.0.192'
    ) {
      result = { ...result, status: 'association_failure', charge_reconciled: false };
      delete result.contacts;
      throw new Error('Association failure');
    }
    if (
      run.usageTotalUsd !== undefined &&
      (typeof run.usageTotalUsd !== 'number' ||
        !Number.isFinite(run.usageTotalUsd) ||
        run.usageTotalUsd < 0 ||
        run.usageTotalUsd > 0.1 ||
        (result.charge_usd !== undefined && run.usageTotalUsd < result.charge_usd))
    ) {
      result = { ...result, status: 'billing_review', charge_reconciled: false };
      await options.store.put('skip:billing_block', true);
      throw new Error('Billing anomaly');
    }
    await api(`actor-runs/${result.run_id}`, 'PUT', { generalAccess: 'RESTRICTED' });
    await api(`datasets/${result.dataset_id}`, 'PUT', { generalAccess: 'RESTRICTED' });
    const { data: privateRun } = await api(`actor-runs/${result.run_id}`);
    const { data: privateDataset } = await api(`datasets/${result.dataset_id}`);
    if (
      !providerId(privateRun?.id) ||
      privateRun.id !== result.run_id ||
      !providerId(privateRun.userId) ||
      privateRun.userId !== account.id ||
      !providerId(privateRun.defaultDatasetId) ||
      privateRun.defaultDatasetId !== result.dataset_id ||
      !providerId(privateDataset?.id) ||
      privateDataset.id !== result.dataset_id ||
      !providerId(privateDataset.userId) ||
      privateDataset.userId !== account.id ||
      privateRun.generalAccess !== 'RESTRICTED' ||
      privateDataset.generalAccess !== 'RESTRICTED'
    ) {
      result = { ...result, status: 'privacy_blocked_review', charge_reconciled: false };
      delete result.contacts;
      throw new Error('Privacy readback failed');
    }
    if (!['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'].includes(run.status))
      throw new Error('Run pending');
    const charge = run.usageTotalUsd;
    const valid =
      typeof charge === 'number' &&
      Number.isFinite(charge) &&
      charge >= 0 &&
      charge <= 0.1 &&
      (result.charge_usd === undefined || charge >= result.charge_usd);
    const charged = run.chargedEventCounts;
    const accounted = run.accountedChargedEventCounts;
    const countsAccounted =
      charged &&
      accounted &&
      typeof charged === 'object' &&
      typeof accounted === 'object' &&
      Object.keys({ ...charged, ...accounted }).every(
        (k) => Number.isSafeInteger(charged[k]) && charged[k] >= 0 && charged[k] === accounted[k]
      );
    const reconciled =
      valid &&
      Boolean(countsAccounted) &&
      result.charge_usd === charge &&
      result.billing_observed_at !== undefined &&
      now - result.billing_observed_at >= 60000;
    if (!valid) await options.store.put('skip:billing_block', true);
    result = {
      ...result,
      status:
        run.status === 'SUCCEEDED'
          ? 'blocked_review'
          : run.status === 'TIMED-OUT'
            ? 'provider_timeout'
            : run.status === 'ABORTED'
              ? 'provider_aborted'
              : 'provider_failed',
      terminal_at: result.terminal_at ?? now,
      charge_reconciled: reconciled,
      billing_observed_at:
        valid && result.charge_usd === charge ? (result.billing_observed_at ?? now) : now,
      ...(valid ? { charge_usd: charge } : {}),
      reason: reconciled
        ? 'Terminal billing reconciled against repeated stable run readback and accounted event counts; not invoice finality.'
        : 'Provider terminal receipt; charges may settle later. Full cap remains reserved.'
    };
    delete result.contacts;
    delete result.person_link;
    if (!valid) {
      result.status = 'billing_review';
      delete result.contacts;
      result.reason =
        'Anomalous billing; paid dispatch globally blocked pending operator reconciliation.';
    }
    if (run.status === 'SUCCEEDED' && valid) {
      const rows = await api(
        `datasets/${result.dataset_id}/items?format=json&limit=2&fields=${encodeURIComponent(fields.join(','))}`
      );
      if (!Array.isArray(rows) || rows.length > 1) result.reason = 'Ambiguous response';
      else if (!rows.length) result.status = 'no_contact';
      else {
        const row = rows[0];
        const link = typeof row['Person Link'] === 'string' ? row['Person Link'] : '';
        try {
          const u = new URL(link);
          if (
            u.protocol === 'https:' &&
            !u.username &&
            !u.password &&
            !u.port &&
            link.length <= 1000
          )
            result.person_link = u.href;
        } catch {}
        if (
          row['Search Option'] !== 'Name+CityStateZip Search' ||
          word(row['Input Given']) !== word(query) ||
          word(row['First Name']) !== word(p.first) ||
          word(row['Last Name']) !== word(p.last) ||
          (row['Name Match'] !== undefined && word(String(row['Name Match'])) !== '')
        )
          result.reason = 'Identity, fallback or response association requires review';
        else if (word(row['Address Region']) !== word(p.practice_state))
          result.reason =
            'Different or missing home region requires review; practice geography is not residence';
        else {
          const emails = Array.from({ length: 5 }, (_, i) => row[`Email-${i + 1}`]).filter(
            (v): v is string =>
              typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254
          );
          const phones = Array.from({ length: 5 }, (_, i) => row[`Phone-${i + 1}`])
            .filter((v): v is string => typeof v === 'string' && /^[+()\d .-]+$/.test(v))
            .map((v) => v.replace(/\D/g, ''))
            .map((v) => (v.length === 10 ? '1' + v : v))
            .filter((v) => /^1[2-9]\d{2}[2-9]\d{6}$/.test(v))
            .map((v) => '+' + v);
          result = {
            ...result,
            status: emails.length || phones.length ? 'review_required' : 'no_contact',
            contacts: {
              emails: [...new Set(emails)],
              phones: [...new Set(phones)],
              home_city: safeText(row['Address Locality']),
              home_state: safeText(row['Address Region'])
            },
            reason:
              'Preliminary first/last and geography triage only. Contacts and consent unverified; never recruiter-ready. Phone metadata and freshness not inferred.'
          };
        }
      }
    }
  } catch {
    if (result.run_id) {
      delete result.contacts;
      delete result.person_link;
      result.charge_reconciled = false;
      delete result.billing_observed_at;
      if (
        !['association_failure', 'privacy_blocked_review', 'billing_review'].includes(result.status)
      )
        result.status = 'pending';
    }
    result = {
      ...result,
      status: !dispatched
        ? 'privacy_blocked'
        : result.run_id && result.status === 'pending'
          ? 'pending'
          : result.status,
      reason: !dispatched
        ? 'Account/sentinel access preflight failed; no paid dispatch. Check account ownership, empty sentinel and dataset denial semantics.'
        : 'Provider response uncertain; reconcile known run only. Never dispatch again automatically.'
    };
  }
  return options.store.transaction(async (s) => {
    const held = await s.get<{ id: string }>('lease:' + key);
    const current = await s.get<SkipResult>(key);
    if (held?.id !== lease) return current ?? result;
    // Do not re-persist malformed cached identifiers as a new receipt.
    for (const field of ['run_id', 'dataset_id', 'owner_id'] as const)
      if (!providerId(result[field])) delete result[field];
    result.revision = (current?.revision ?? 0) + 1;
    await s.put(key, result);
    await s.put('lease:' + key, { id: lease, until: 0 });
    if (!dispatched) {
      const reservations = (await s.get<{ id: string }[]>('skip:budget')) ?? [];
      await s.put(
        'skip:budget',
        reservations.filter((r) => r.id !== digest)
      );
    }
    if (dispatched) {
      const reservations =
        (await s.get<{ at: number; cents: number; id: string; reconciled?: boolean }[]>(
          'skip:budget'
        )) ?? [];
      const prior = reservations.find((r) => r.id === digest);
      const chargeChanged =
        result.charge_usd !== current?.charge_usd || result.charge_reconciled !== true;
      await s.put('skip:budget', [
        ...reservations.filter((r) => r.id !== digest),
        {
          id: digest,
          at: !prior || chargeChanged ? now : prior.at,
          cents: result.charge_reconciled ? Math.ceil((result.charge_usd ?? 0.1) * 100) : 10,
          reconciled: result.charge_reconciled === true
        }
      ]);
    }
    return result;
  });
}
