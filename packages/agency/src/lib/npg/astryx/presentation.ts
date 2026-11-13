import { actionLabel, sourceArtifact, type NpgView } from '../display';

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
  const title =
    (
      {
        enrich_candidate_skip_trace: 'Skip Trace lookup',
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
  let price = 'See terms';
  let priceLabel = 'Cost';
  if (
    typeof review.maximumCost === 'number' &&
    Number.isFinite(review.maximumCost) &&
    review.maximumCost >= 0 &&
    typeof review.currency === 'string' &&
    /^[A-Z]{3}$/.test(review.currency)
  ) {
    try {
      price =
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: review.currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 20
        }).format(review.maximumCost) +
        ' ' +
        review.currency;
      priceLabel = 'Maximum';
    } catch {
      /* Preserve the original cost terms in the review. */
    }
  } else if (typeof review.cost === 'string') {
    const cap = review.cost.match(/^Up to (\$\d+(?:\.\d+)?) reserved\./);
    if (cap) {
      price = cap[1];
      priceLabel = 'Maximum';
    } else if (review.cost.startsWith('Exact cost unavailable.')) price = 'Not quoted';
  }
  return { title, target, name, price, priceLabel };
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
