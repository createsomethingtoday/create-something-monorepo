// Plain text plus validated links. Model output never becomes HTML.
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
