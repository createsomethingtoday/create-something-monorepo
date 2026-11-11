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
const actionLabels: Record<string, string> = {
  estimate_registry_travel: 'Estimate practice-to-clinic driving times',
  enrich_candidate_profile: 'Look up one candidate with People Data Labs',
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
    idle: 'Ready',
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
    }
  ]
    .map(({ title, value }) => ({ title, fields: evidenceFields(value) }))
    .filter((section) => section.fields.length);
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
  maximumCost: 'Maximum cost',
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
      .filter(([key, v]) => key !== 'confirm_paid_enrichment' && v !== null && v !== undefined)
      .map(([key, v]) => {
        let text: string;
        if (key === 'clinics' && Array.isArray(v))
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
