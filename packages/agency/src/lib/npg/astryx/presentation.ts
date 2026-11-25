import { associatedPhones } from '../phones';
import { actionLabel, sourceArtifact, formatUsd, type NpgView } from '../display';

type Pending = NonNullable<NpgView['pending']>;
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// A display-only association: use an exact selected NPI and saved public registry rows.
// Vendor contacts, unmatched records and conflicting names never supply an identity label.
export function registryName(npi: string, sources: NpgView['sources']): string | null {
  const names = new Set<string>();
  for (const source of sources) {
    if (!['search_registry_sourcing', 'get_healthcare_practitioner'].includes(source.tool))
      continue;
    const artifact = sourceArtifact(source.data);
    const rows = [
      ...artifact.records,
      ...artifact.sections
        .filter((section) => section.title === 'Public registry record · unverified')
        .map((section) => section.fields)
    ];
    for (const fields of rows) {
      if (
        !fields.some(
          (field) =>
            ['candidate npi', 'npi'].includes(field.label.toLowerCase()) && field.value === npi
        )
      )
        continue;
      const value = (label: string) =>
        fields.find((field) => field.label.toLowerCase() === label)?.value.trim();
      const name =
        value('candidate name') ||
        value('name') ||
        [value('first name'), value('last name')].filter(Boolean).join(' ');
      if (name && name.length <= 120) names.add(name);
    }
  }
  return names.size === 1 ? [...names][0] : null;
}

export function hasThreeProviderScope(value: unknown): boolean {
  return Array.isArray(value) && value.length === 3 &&
    ['pdl', 'exa', 'apify'].every((key) => value.includes(key));
}

export function decisionSummary(pending: Pending, sources: NpgView['sources']) {
  const args = record(pending.arguments);
  const review = record(pending.review);
  const npis = Array.isArray(args.npis) ? args.npis : [];
  const npi =
    typeof args.npi === 'string'
      ? args.npi
      : npis.length === 1 && typeof npis[0] === 'string'
        ? npis[0]
        : null;
  const name = npi ? registryName(npi, sources) : null;
  const scope = Array.isArray(review.providers) ? review.providers.filter((key): key is string => typeof key === 'string') : [];
  const providerScope = scope.map(key => ({pdl:'PDL',exa:'Exa',apify:'Skip Trace',clay:'Clay',treg:'Treg'}[key] ?? key)).join(' · ');
  const title =
    (
      {
        enrich_candidate_skip_trace: 'Skip Trace lookup',
        enrich_candidate_complete_profile: scope.includes('treg') ? `Complete profile · ${scope.length} providers` : hasThreeProviderScope(review.providers)
          ? 'Complete profile · three providers' : 'Complete profile · four providers',
        estimate_registry_travel: 'Travel estimate',
        enrich_candidate_profile: 'Profile lookup',
        request_professional_contact_enrichment: 'Professional contact lookup',
        enrich_provider_professional_contact: 'Professional contact research'
      } as Record<string, string>
    )[pending.tool] ?? actionLabel(pending.tool);
  const target = npi
    ? 'NPI ' + npi
    : npis.length
      ? npis.length + ' selected NPIs'
      : 'Exact request in review';
  const estimate =
    typeof review.estimatedUsd === 'number' &&
    Number.isFinite(review.estimatedUsd) &&
    review.estimatedUsd >= 0
      ? review.estimatedUsd
      : null;
  const price = estimate === null ? 'Unknown' : formatUsd(estimate);
  const priceLabel = 'Estimate';
  return { title, target, name, price, priceLabel, providerScope };
}

// Only known projection labels get friendlier names; unknown fields and every
// supplied value remain literal. Original source data is always available.
export function evidenceFieldLabel(label: string): string {
  const labels: Record<string, string> = {
    'Coverage · persona · taxonomy code': 'Taxonomy',
    'Coverage · market coverage status': 'Coverage status',
    'Coverage · direct outreach status': 'Outreach status',
    'Coverage · completeness · practice phone count': 'Practice phones',
    'Coverage · source · latest fetched at': 'Fetched',
    'Coverage · source · coverage limit reached': 'Limit reached',
    'Snapshot published': 'Published',
    'Source fetched': 'Fetched',
    'Coverage · limitations · 1': 'Qualifications'
  };
  return labels[label] ?? label.charAt(0).toUpperCase() + label.slice(1);
}
export function evidenceGroups(fields: Array<{ label: string; value: string }>) {
  const detailLabels = [
    'Source run',
    'limit',
    'offset',
    'Taxonomy scope',
    'source',
    'Snapshot',
    'Snapshot ID',
    'Snapshot taxonomy scope',
    'Coverage · persona · taxonomy code',
    'Coverage · completeness · practice phone count'
  ];
  const dateLabels = [
    'Source published',
    'Source fetched',
    'retrieved at',
    'Snapshot published',
    'Coverage · source · latest fetched at'
  ];
  const dates = fields.filter((field) => dateLabels.includes(field.label));
  const details = fields.filter((field) => detailLabels.includes(field.label));
  const priority = [
    'Coverage · limitations · 1',
    'Coverage · direct outreach status',
    'Coverage · market coverage status',
    'Coverage · source · coverage limit reached'
  ];
  const summary = fields
    .filter((field) => !details.includes(field) && !dates.includes(field))
    .sort(
      (a, b) =>
        (priority.includes(a.label) ? priority.indexOf(a.label) : priority.length) -
        (priority.includes(b.label) ? priority.indexOf(b.label) : priority.length)
    );
  const warnings = fields.flatMap((field) =>
    field.label === 'Coverage · market coverage status' && field.value === 'degraded'
      ? ['Source reports degraded coverage']
      : field.label === 'Coverage · direct outreach status' && field.value === 'blocked'
        ? ['Source reports blocked direct outreach']
        : []
  );
  return { summary, dates, details, warnings };
}

// Literal provider facts only. Counts describe returned candidates, never permission.
export function enrichmentSummary(sources: NpgView['sources']) {
  const source = [...sources]
    .reverse()
    .find((entry) => entry.tool === 'enrich_candidate_complete_profile');
  if (!source) return null;
  const data = record(source.data);
  const providers = record(data.providers);
  const activeProviders = data.active_providers;
  const threeProviders = hasThreeProviderScope(activeProviders);
  const tregScope = Array.isArray(activeProviders) && activeProviders.length === 4 && ['pdl','exa','apify','treg'].every(key => activeProviders.includes(key));
  const knownScope = tregScope || activeProviders === undefined || threeProviders ||
    (Array.isArray(activeProviders) && activeProviders.length === 4 &&
      ['pdl', 'clay', 'exa', 'apify'].every((key) => activeProviders.includes(key)));
  const count = (value: unknown) =>
    Array.isArray(value) ? value.length : typeof value === 'string' && value.trim() ? 1 : 0;
  const uniqueContactCount = (...values: unknown[]) =>
    new Set(
      values
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        .map((value) => value.trim().toLowerCase())
    ).size;
  const providerKeys = tregScope || 'treg' in providers ? ['pdl', 'exa', 'apify', 'treg'] as const : ['pdl', 'exa', 'apify'] as const;
  const rows = providerKeys.map((key) => {
    const value = record(providers[key]);
    const state = String(value.status ?? value.match_status ?? 'not_returned');
    const professional = record(value.professional_contact);
    const personal = record(value.personal_contact);
    const direct = record(value.contacts);
    const result = record(value.result);
    const contacts = Array.isArray(result.contacts) ? result.contacts.map(record) : [];
    const tregEmail = record(direct.email);
    const tregPhone = record(direct.phone);
    const emails = (key === 'treg' && tregEmail.status === 'found' ? count(tregEmail.value) : 0) +
      (key === 'pdl'
        ? uniqueContactCount(
            personal.personal_emails,
            personal.recommended_personal_email,
            record(value.professional).work_email
          )
        : count(personal.emails)) +
      count(direct.emails) +
      count(professional.email) +
      contacts.filter((contact) => contact.type === 'email').length;
    const phones = (key === 'treg' && tregPhone.status === 'found' ? count(tregPhone.value) : 0) +
      (key === 'pdl'
        ? uniqueContactCount(personal.phone_numbers, personal.mobile_phone)
        : count(personal.phones)) +
      count(direct.phones) +
      count(professional.phone) +
      contacts.filter((contact) => contact.type === 'phone').length;
    const terminal = [
      'matched',
      'complete',
      'completed',
      'review_required',
      'no_contact',
      'no_match',
      'verified_match',
      'plausible_match'
    ].includes(state);
    const pending = ['pending', 'running', 'submitted', 'queued'].includes(state);
    const blocked =
      /identity|mismatch|association/.test(state) ||
      (/identity/i.test(String(value.reason ?? '')) && !emails && !phones);
    const summary = pending
      ? 'Awaiting existing provider result'
      : blocked
        ? 'Identity unresolved · operator review'
        : /blocked|hold|review_required/.test(state) &&
            !emails &&
            !phones &&
            state !== 'review_required' &&
            !state.startsWith('privacy_')
          ? 'Provider hold · operator review'
          : state === 'not_returned'
            ? 'No result returned'
            : state === 'no_match'
              ? 'No match returned'
              : state === 'privacy_blocked' || state === 'privacy_blocked_review'
                ? 'Privacy hold · operator review'
                : state === 'delivery_unknown' || state === 'unresolved'
                  ? 'Delivery uncertain · operator review'
                  : /aborted|cancelled|canceled/.test(state)
                    ? 'Provider stopped · operator review'
                    : /error|failed|unavailable|not_configured|timeout/.test(state)
                      ? 'Provider unavailable · operator review'
                      : !terminal
                        ? 'Outcome unresolved · operator review'
                        : `${key === 'pdl' && Object.keys(record(value.professional)).length ? 'Profile returned · ' : ''}${emails} email${emails === 1 ? '' : 's'} · ${phones} phone${phones === 1 ? '' : 's'}`;
    return {
      key,
      label: { pdl: 'PDL', clay: 'Clay', exa: 'Exa', apify: 'Skip Trace', treg:'Treg' }[key],
      state,
      outcome: pending
        ? 'Pending'
        : blocked
          ? 'Identity review'
          : state.startsWith('privacy_')
            ? 'Privacy review'
            : !terminal
              ? 'Needs review'
              : state === 'no_match'
                ? 'No match'
                : state === 'no_contact'
                  ? 'No contacts'
                  : state === 'not_returned'
                    ? 'Not returned'
                    : 'Returned',
      summary,
      pending,
      terminal,
      blocked,
      data: value
    };
  });
  const spend = record(data.spend_tracking);
  const actual =
    typeof spend.actual_usd === 'number'
      ? `${formatUsd(spend.actual_usd)} confirmed`
      : 'Confirmed cost unknown';
  const pendingReceipts =
    typeof spend.pending_receipts === 'number'
      ? `${spend.pending_receipts} receipt${spend.pending_receipts === 1 ? '' : 's'} pending`
      : 'Receipt status unknown';
  return {
    npi: String(data.npi ?? ''),
    scope: providerKeys.length === 3 ? 'PDL, Exa and Skip Trace' : 'PDL, Exa, Skip Trace and Treg',
    rows,
    phones: associatedPhones(data),
    pending: rows.some((row) => row.pending),
    complete:
      knownScope && rows.every((row) => row.terminal && !row.blocked) &&
      (tregScope || threeProviders || !Object.keys(record(providers.clay)).length ||
        ['matched','complete','completed','review_required','no_contact','no_match'].includes(String(record(providers.clay).status))) &&
      (data.status === undefined || data.status === 'complete') &&
      data.uncertain_dispatch !== true &&
      (!Array.isArray(data.unstarted) || data.unstarted.length === 0),
    billing: `${actual} · ${pendingReceipts}${spend.historical_status === 'unknown' ? ' · historical spend unknown' : ''}`
  };
}

// Exact old host copy only; later conversational answers must remain visible.
export function isLegacyEnrichmentMessage(message: { role: string; text: string }) {
  return (
    message.role === 'assistant' &&
    (message.text.startsWith(
      'The complete profile is incomplete. Review each provider’s result and any unstarted providers below. Billing and pending results need reconciliation.'
    ) ||
      message.text ===
        'This request stopped after a paid action may have been sent. Do not repeat it. Ask your operator to reconcile the source result. Existing returned evidence is below.')
  );
}
