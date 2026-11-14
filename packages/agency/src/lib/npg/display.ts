// Plain text plus validated links. Model output never becomes HTML.
export function readDrafts(raw: string | null): Record<string, string> {
  const drafts: Record<string, string> = Object.create(null);
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return drafts;
    for (const [key, value] of Object.entries(parsed).slice(0, 250)) {
      if (
        (key === 'new' || /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(key)) &&
        typeof value === 'string' &&
        value.length <= 6000
      )
        drafts[key] = value;
    }
  } catch {
    /* A damaged tab cache must not prevent questions. */
  }
  return drafts;
}

// Bounded, labeled source values. Paid-action review formatting stays separate.
function evidenceFields(value: unknown, prefix = ''): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = [];
  function walk(item: unknown, label: string, depth: number) {
    if (item === null || item === undefined || fields.length >= 60) return;
    if (typeof item === 'object') {
      if (depth >= 3) return;
      for (const [key, child] of Object.entries(item))
        walk(
          child,
          [label, Array.isArray(item) ? String(Number(key) + 1) : key.replaceAll('_', ' ')]
            .filter(Boolean)
            .join(' · '),
          depth + 1
        );
    } else
      fields.push({
        label,
        value: typeof item === 'boolean' ? (item ? 'Yes' : 'No') : String(item)
      });
  }
  walk(value, prefix, 0);
  return fields;
}

export function safeLink(raw: string): string | null {
  try {
    const url = new URL(raw, 'https://createsomething.agency');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      /(?:api.?key|token|secret|authorization|password)/i.test(url.search)
    )
      return null;
    if (
      url.pathname === '/mcp' ||
      url.pathname.startsWith('/mcp/') ||
      url.hostname === 'api.openai.com'
    )
      return null;
    if (
      url.origin === 'https://createsomething.agency' &&
      ['/delivery/abundance/sourcing.csv', '/delivery/abundance/travel.csv'].includes(url.pathname)
    )
      return url.pathname + url.search;
    if (!raw.startsWith('https://')) return null;
    return url.href;
  } catch {
    return null;
  }
}
export function linkParts(text: string): Array<{ text: string; href?: string }> {
  const parts: Array<{ text: string; href?: string }> = [];
  const pattern =
    /\[([^\]\n]+)\]\((https:\/\/[^\s)]+|\/delivery\/abundance\/[^\s)]+)\)|(https:\/\/[^\s<>\]]+)/g;
  let at = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > at) parts.push({ text: text.slice(at, match.index) });
    const raw = (match[2] || match[3]).replace(/[.,;]+$/, '');
    const href = safeLink(raw);
    parts.push({ text: match[1] || raw, ...(href ? { href } : {}) });
    at = match.index! + match[0].length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}
export function sourceLinks(data: unknown): string[] {
  const found = new Set<string>();
  function walk(v: unknown) {
    if (typeof v === 'string') {
      const href = safeLink(v);
      if (href) found.add(href);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  }
  walk(data);
  return [...found].slice(0, 50);
}
export function formatUsd(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'Unknown';
  if (value > 0 && value < 0.000001) return '<$0.000001 USD';
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value) + ' USD'
  );
}
const actionLabels: Record<string, string> = {
  estimate_registry_travel: 'Estimate practice-to-clinic driving times',
  enrich_candidate_profile: 'Look up one candidate with People Data Labs',
  enrich_candidate_skip_trace: 'Look up one candidate with Skip Trace',
  enrich_candidate_complete_profile: 'Enrich one candidate with all four providers',
  request_professional_contact_enrichment: 'Request public professional contacts from Clay',
  enrich_provider_professional_contact: 'Research public professional contacts with Exa',
  search_registry_sourcing: 'Registry sourcing',
  search_coverage_candidates: 'Coverage candidates',
  get_healthcare_coverage: 'Coverage and freshness',
  get_healthcare_practitioner: 'Registry practitioner',
  get_provider_contact_information: 'Public registry contacts',
  get_professional_contact_enrichment: 'Clay lookup status',
  get_enrichment_readiness: 'Enrichment availability'
};
export const actionLabel = (name: string) => actionLabels[name] ?? name;

export const conversationStatus = (status: string) =>
  ({
    idle: 'Chat ready',
    running: 'Working',
    review: 'Needs review',
    interrupted: 'Interrupted',
    ambiguous: 'Needs reconciliation'
  })[status] ?? status;

// A readable projection of supplied evidence, never an inferred match or qualification.
// Unknown result shapes remain available in the original source disclosure.
export function sourceArtifact(data: unknown) {
  function unpack(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const record = value as Record<string, unknown>;
    if (record.structuredContent) return unpack(record.structuredContent);
    if (Array.isArray(record.content)) {
      for (const part of record.content) {
        if (part?.type === 'text' && typeof part.text === 'string') {
          try {
            return unpack(JSON.parse(part.text));
          } catch {
            /* Retain raw source below. */
          }
        }
      }
    }
    return record;
  }
  const record = unpack(data);
  const count = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const rows = Array.isArray(record.results) ? record.results : null;
  const shown = count(record.displayed) ?? (rows ? rows.length : null);
  const keys = [
    'id',
    'npi',
    'charge_usd',
    'charge_reconciled',
    'uncertain_dispatch',
    'billing_reconciliation_required',
    'unstarted',
    'reason',
    'run_id',
    'snapshot',
    'source_published_at',
    'source_fetched_at',
    'taxonomy_scope',
    'scope',
    'source',
    'retrieved_at',
    'provenance',
    'limit',
    'offset',
    'status',
    'completeness',
    'unresolved_address_count',
    'unresolved_count',
    'contact_availability',
    'contact_route_status',
    'clinical_verification_status',
    'direct_outreach_status',
    'outreach_authority_status',
    'personal_contact_access',
    'failure_kind',
    'limitation',
    'contact_limitation',
    'outreach_policy',
    'csv_access'
  ];
  const labels: Record<string, string> = {
    id: 'Source job',
    npi: 'Candidate NPI',
    charge_usd: 'Charged (USD)',
    charge_reconciled: 'Charge reconciled',
    run_id: 'Source run',
    snapshot: 'Snapshot',
    source_published_at: 'Source published',
    source_fetched_at: 'Source fetched',
    taxonomy_scope: 'Taxonomy scope',
    unresolved_address_count: 'Unresolved addresses',
    unresolved_count: 'Unresolved records',
    csv_access: 'Export scope',
    limitation: 'Limits and unknowns'
  };
  if (record.cached === true || record.cache_hit === true)
    labels.charge_usd = 'Original run charge (USD)';
  const run =
    record.run && typeof record.run === 'object' ? (record.run as Record<string, unknown>) : {};
  const fields = keys.flatMap((key) =>
    evidenceFields(record[key], labels[key] ?? key.replaceAll('_', ' '))
  );
  fields.push(
    ...evidenceFields({
      'Snapshot ID': run.id,
      'Snapshot taxonomy scope': run.taxonomy_scope,
      'Snapshot published': run.source_published_at,
      'Snapshot status': run.status
    })
  );
  const report =
    record.report && typeof record.report === 'object'
      ? (record.report as Record<string, unknown>)
      : {};
  for (const key of [
    'persona',
    'evaluated_at',
    'market_coverage_status',
    'market_coverage_reasons',
    'direct_outreach_status',
    'direct_outreach_reasons',
    'completeness',
    'source',
    'limitations'
  ])
    fields.push(...evidenceFields(report[key], 'Coverage · ' + key.replaceAll('_', ' ')));
  const sections = [
    { title: 'Public registry record · unverified', value: record.provider ?? record.registry },
    { title: 'Registry contact · outreach authority not established', value: record.contact },
    { title: 'Recruiting readiness and unknowns', value: record.readiness },
    // An ambiguous vendor match must not be presented as this candidate's profile.
    {
      title: 'Vendor-reported professional profile · unverified',
      value: record.status === 'matched' ? record.professional : undefined
    },
    {
      title: 'Vendor-reported personal contact · consent not recorded',
      value: record.status === 'matched' ? record.personal_contact : undefined
    },
    {
      title:
        'Skip Trace vendor contacts · ownership and consent unverified; recruiting readiness blocked',
      value:
        record.status === 'review_required' &&
        (record.provenance as Record<string, unknown> | undefined)?.source ===
          'Apify one-api/skip-trace'
          ? record.contacts
          : undefined
    }
  ]
    .map(({ title, value }) => ({ title, fields: evidenceFields(value) }))
    .filter((section) => section.fields.length);
  if (
    record.providers &&
    typeof record.providers === 'object' &&
    !Array.isArray(record.providers)
  ) {
    const results = record.providers as Record<string, unknown>;
    for (const [provider, label] of Object.entries({
      pdl: 'PDL',
      clay: 'Clay',
      exa: 'Exa',
      apify: 'Skip Trace'
    })) {
      if (!(provider in results)) {
        sections.push({ title: label + ' · not started or no result supplied', fields: [] });
        continue;
      }
      const result = results[provider];
      // Recursively project only known evidence shapes. Ambiguous matches never acquire contact sections.
      const artifact = sourceArtifact(result);
      const receipt =
        result && typeof result === 'object' ? (result as Record<string, unknown>) : {};
      const spend =
        receipt.spend_tracking && typeof receipt.spend_tracking === 'object'
          ? (receipt.spend_tracking as Record<string, unknown>)
          : {};
      const cached =
        receipt.operation_cache_hit === true ||
        ((receipt.cached === true || receipt.cache_hit === true) &&
          receipt.operation_cache_hit !== false &&
          receipt.operation_charge_usd === undefined);
      const actual =
        spend.actual_usd ??
        receipt.operation_charge_usd ??
        (cached ? 0 : (receipt.actual_cost_usd ?? receipt.charge_usd));
      const usd = (value: unknown) =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0
          ? formatUsd(value)
          : 'Unknown';
      artifact.fields.push(
        {
          label: cached ? 'Confirmed USD · no new charge (cached)' : 'Confirmed USD',
          value:
            cached ||
            receipt.charge_reconciled === true ||
            spend.actual_usd !== undefined ||
            typeof receipt.operation_charge_usd === 'number' ||
            typeof receipt.actual_cost_usd === 'number'
              ? usd(actual)
              : 'Unknown'
        },
        { label: 'Estimate', value: usd(spend.estimated_usd) }
      );
      const billing =
        receipt.billing && typeof receipt.billing === 'object'
          ? (receipt.billing as Record<string, unknown>)
          : {};
      if (typeof billing.credits_used === 'number' && Number.isFinite(billing.credits_used))
        artifact.fields.push({
          label: 'PDL credits used · USD receipt pending',
          value: String(billing.credits_used)
        });
      sections.push({
        title: label + ' · provider outcome; identity and consent unverified',
        fields: artifact.fields
      });
      for (const section of artifact.sections)
        sections.push({ title: label + ' · ' + section.title, fields: section.fields });
    }
  }
  const tracking =
    record.spend_tracking && typeof record.spend_tracking === 'object'
      ? (record.spend_tracking as Record<string, unknown>)
      : null;
  if (tracking) {
    const money = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? formatUsd(value)
        : 'Unknown';
    sections.unshift({
      title: 'Spend tracking · this operation',
      fields: [
        { label: 'Confirmed recorded subtotal (USD)', value: money(tracking.actual_usd) },
        { label: 'Estimate · separate from confirmed USD', value: money(tracking.estimated_usd) },
        {
          label: 'Pending receipts',
          value: Number.isSafeInteger(tracking.pending_receipts)
            ? String(tracking.pending_receipts)
            : 'Unknown'
        },
        { label: 'Historical spend', value: 'Unknown; tracked receipts are not a lifetime total.' }
      ]
    });
  }
  return {
    total: count(record.total),
    shown,
    links: [...new Set([...sourceLinks(data), ...sourceLinks(record)])],
    fields,
    sections,
    records: (rows ?? []).slice(0, 5).map((row) => reviewFields(row)),
    previewCount: Math.min(rows?.length ?? 0, 5)
  };
}
const fieldLabels: Record<string, string> = {
  provider: 'Provider',
  scope: 'Scope',
  limits: 'Limits',
  cost: 'Credits and cost',
  currency: 'Currency',
  maximumCost: 'Legacy cost ceiling',
  confirmedTrackedUsd: 'Confirmed tracked subtotal (USD)',
  estimatedUsd: 'Estimate (USD)',
  pendingReceipts: 'Pending receipts',
  historicalSpend: 'Historical spend',
  providerEstimates: 'Provider estimates',
  spendPolicy: 'Spend tracking',
  execution: 'Execution',
  operation_id: 'Operation',
  maximumSharedCost: 'Shared lookup maximum',
  skipTraceMaximumCost: 'Skip Trace maximum',
  maximum_shared_usd: 'Approved shared maximum',
  reserved: 'Reserved allowance',
  providers: 'Provider maximums',
  totalAllowance: 'One-time shared allowance',
  recordedSpend: 'Recorded spending',
  remaining: 'Remaining allowance',
  contactScope: 'Contact scope',
  requireContact: 'Require a match with contact information',
  require_contact: 'Require a match with contact information',
  npi: 'Candidate NPI',
  npis: 'Selected NPIs',
  clinics: 'Clinic addresses',
  max_minutes: 'Maximum one-way driving time',
  clinic_match: 'Clinic matching rule',
  include_personal_contact: 'Include personal contact details',
  profile_url: 'Candidate profile',
  name: 'Candidate name',
  locality: 'Locality',
  region: 'Region',
  company: 'Company',
  market_id: 'Market',
  run_id: 'Source snapshot',
  contact_types: 'Contact types',
  purpose: 'Purpose'
};
export function reviewFields(value: unknown): Array<{ label: string; value: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return (
    Object.entries(value)
      // This model-supplied flag is not the human's approval; the exact request remains inspectable.
      .filter(
        ([key]) =>
          ![
            'confirm_paid_enrichment',
            'maximumCost',
            'maximumSharedCost',
            'skipTraceMaximumCost',
            'maximum_shared_usd',
            'reserved',
            'remaining',
            'totalAllowance'
          ].includes(key)
      )
      .map(([key, v]) => {
        let text: string;
        if (v === null || v === undefined) text = 'Unknown';
        else if (
          ['confirmedTrackedUsd', 'estimatedUsd'].includes(key) &&
          typeof v === 'number' &&
          Number.isFinite(v)
        )
          text = formatUsd(v);
        else if (key === 'providerEstimates' && Array.isArray(v))
          text = v
            .map((p) => {
              const names: Record<string, string> = {
                pdl: 'PDL',
                clay: 'Clay',
                exa: 'Exa',
                apify: 'Skip Trace'
              };
              return (
                (names[p?.provider] ?? 'Provider') +
                ': ' +
                (typeof p?.estimated_usd === 'number' && Number.isFinite(p.estimated_usd)
                  ? formatUsd(p.estimated_usd) + ' estimate'
                  : 'Estimate unknown')
              );
            })
            .join('\n');
        else if (key === 'clinics' && Array.isArray(v))
          text = v
            .map((clinic) =>
              typeof clinic?.address === 'string' ? clinic.address : JSON.stringify(clinic)
            )
            .join('\n');
        else if (key === 'clinic_match' && (v === 'any' || v === 'all'))
          text = v === 'any' ? 'Any one of the listed clinics' : 'All listed clinics';
        else if (key === 'max_minutes' && typeof v === 'number') text = `${v} minutes`;
        else if (typeof v === 'boolean') text = v ? 'Yes' : 'No';
        else if (Array.isArray(v))
          text = v
            .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
            .join(', ');
        else text = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return { label: fieldLabels[key] ?? key.replaceAll('_', ' '), value: text };
      })
  );
}
export type NpgView = {
  id: string;
  version: number;
  status: string;
  messages: Array<{ role: 'user' | 'assistant'; text: string }>;
  sources: Array<{ tool: string; data: unknown }>;
  pending: null | {
    id: string;
    tool: string;
    arguments: unknown;
    review: unknown;
    expiresAt: number;
  };
};

// Eligibility only; the host revalidates owner, original action and exact receipt before reading.
export function canRefreshSkipTrace(view: NpgView | null): boolean {
  if (!view || !['idle', 'ambiguous'].includes(view.status) || view.pending) return false;
  return view.sources.some((source) => {
    const data = source.data as any;
    const receipt =
      source.tool === 'enrich_candidate_complete_profile'
        ? data?.providers?.apify
        : source.tool === 'enrich_candidate_skip_trace'
          ? data
          : null;
    return (
      receipt &&
      /^\d{10}$/.test(receipt.npi ?? '') &&
      (source.tool !== 'enrich_candidate_complete_profile' || data.npi === receipt.npi) &&
      /^[a-f0-9]{64}$/.test(receipt.id ?? '') &&
      /^[A-Za-z0-9]{1,64}$/.test(receipt.run_id ?? '') &&
      (receipt.status === 'pending' ||
        ([
          'review_required',
          'no_contact',
          'blocked_review',
          'provider_failed',
          'provider_aborted',
          'provider_timeout'
        ].includes(receipt.status) &&
          receipt.charge_reconciled !== true))
    );
  });
}
export function canSendNpgMessage(view: NpgView | null, value: string): boolean {
  return (
    !view ||
    view.status === 'idle' ||
    (value.trim().toLowerCase() === 'refresh skip trace' && canRefreshSkipTrace(view))
  );
}
