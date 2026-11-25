// Display evidence only. A number's presence, format or vendor verdict grants no contact authority.
export type AssociatedPhone = {
  number: string;
  kind: 'associated' | 'fax' | 'shared';
  sources: string[];
  roles: string[];
  lineType: string;
  reachability: 'Unknown';
  ownership: 'Unknown';
  consent: 'Unknown';
  vendorReports: string[];
  lineCheckProvider?: string;
};
const object = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
export function associatedPhones(data: unknown): AssociatedPhone[] {
  const root = object(data);
  const rows = new Map<string, AssociatedPhone>();
  const add = (value: unknown, source: string, kind: AssociatedPhone['kind'] = 'associated', lineType = 'Unknown', report?: string) => {
    if (Array.isArray(value)) { for (const number of value) add(number, source, kind, lineType, report); return; }
    if (typeof value !== 'string' || !value.trim()) return;
    const base = value.replace(/(?:ext\.?|x|#)\s*\d+\s*$/i, '');
    const extension = value.slice(base.length).replace(/\D/g, '');
    const digits = base.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return;
    const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (base.trim().startsWith('+') && !base.trim().startsWith('+1')) source += ' · international format';
    // Fax/shared evidence remains distinct even when the same digits appear elsewhere.
    const key = `${base.trim().startsWith('+') && !base.trim().startsWith('+1') ? '+' : ''}${normalized}:${extension}`;
    const row = rows.get(key) ?? {number:normalized.length === 10 && !extension ? `(${normalized.slice(0,3)}) ${normalized.slice(3,6)}-${normalized.slice(6)}` : value.trim(),kind,sources:[],roles:[],lineType,reachability:'Unknown',ownership:'Unknown',consent:'Unknown',vendorReports:[]};
    if (!row.sources.includes(source)) row.sources.push(source);
    const role = kind === 'fax' ? 'Fax' : kind === 'shared' ? 'Shared line (vendor reported)' : 'Associated phone candidate';
    if (!row.roles.includes(role)) row.roles.push(role);
    if (kind === 'associated') row.kind = 'associated';
    if (report && !row.vendorReports.includes(report)) row.vendorReports.push(report);
    if (lineType !== 'Unknown') row.lineType = row.lineType === 'Unknown' || row.lineType === lineType ? lineType : 'Conflicting vendor reports';
    rows.set(key,row);
  };
  const registry = object(root.registry ?? root.provider ?? object(root.profile).registry);
  add(registry.practice_phone, 'Public registry · practice');
  add(registry.practice_fax, 'Public registry · practice fax', 'fax');
  add(registry.mailing_phone, 'Public registry · mailing');
  add(registry.mailing_fax, 'Public registry · mailing fax', 'fax');
  const registryEvidence = object(registry.phone_evidence);
  if (registryEvidence.status === 'available' && Array.isArray(registryEvidence.phones)) {
    for (const entry of registryEvidence.phones) {
      const phone = object(entry);
      if (['practice','mailing','practice fax','mailing fax'].includes(phone.role)) add(phone.number, 'Public registry · ' + phone.role, phone.role.includes('fax') ? 'fax' : 'associated');
    }
  }
  const providers = object(root.providers);
  for (const [key, raw] of Object.entries(providers)) {
    const value = object(raw);
    const label = ({pdl:'PDL',exa:'Exa',apify:'Skip Trace',treg:'Treg',clay:'Clay'} as Record<string,string>)[key] ?? key;
    if (key === 'pdl' && value.status === 'matched') {
      const personal = object(value.personal_contact);
      add(personal.phone_numbers,label); add(personal.mobile_phone,label);
    }
    if (key === 'apify' && value.status === 'review_required' && object(value.provenance).source === 'Apify one-api/skip-trace') add(object(value.contacts).phones,label);
    if (key === 'exa' && ['verified_match','plausible_match'].includes(value.match_status) && value.contact_route_status === 'unverified_enrichment_candidate' && Array.isArray(value.source_citations) && value.source_citations.length) add(object(value.professional_contact).phone,label);
    if (key === 'treg') {
      const phone = object(object(value.contacts).phone);
      if (phone.status === 'found') {
        const verification = object(phone.verification);
        const source = object(phone.source);
        const lineType = typeof verification.line_type === 'string' ? verification.line_type : 'Unknown';
        const kind = /fax/i.test(lineType) ? 'fax' : /shared|switchboard|practice/i.test(lineType) ? 'shared' : 'associated';
        add(phone.value, [label,source.served_by,source.provider,source.identity_source_url].filter(item => typeof item === 'string' && item).join(' · '),kind,lineType,verification.checked === true && verification.pending !== true && typeof verification.verdict === 'string' ? verification.verdict : undefined);
        const row = [...rows.values()].find(row => row.sources.some(source => source.startsWith('Treg · ')));
        if (row) row.lineCheckProvider = typeof verification.provider === 'string' ? verification.provider : typeof verification.served_by === 'string' ? verification.served_by : 'Treg line check';
      }
    }
  }
  return [...rows.values()].sort((a,b) => Number(b.vendorReports.length > 0) - Number(a.vendorReports.length > 0) || Number(a.kind === 'fax') - Number(b.kind === 'fax'));
}
