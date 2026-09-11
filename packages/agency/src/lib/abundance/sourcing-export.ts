import type { HealthcareProvider } from './healthcare-providers';

export function registryPhoneStatus(value: unknown): string {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!digits) return 'not_available';
  return /^(\d)\1+$/.test(digits) || digits.length < 10 ? 'invalid_placeholder' : 'unverified';
}
const headers = [
  'NPI',
  'Candidate Name',
  'Practice Address 1',
  'Practice Address 2',
  'City',
  'State',
  'ZIP',
  'Country',
  'Registry Practice Phone',
  'Phone Status',
  'Contact Status',
  'Registry Taxonomy',
  'Registry Credential Text',
  'Registry License State',
  'Registry License Number',
  'NPPES Status',
  'Registry Updated',
  'Source Fetched',
  'Location Match',
  'Distance Miles',
  'License Status',
  'Certification (FNP/AGNP)',
  'Experience Type',
  'EMR Experience',
  'Commute Feasibility',
  'Fit Rating',
  'Source',
  'Recruiter Notes',
  'Outreach Review'
];
function cell(value: unknown): string {
  let text = value == null ? '' : String(value);
  // Quoting alone does not prevent spreadsheet formula execution.
  if (/^[\s]*[=+\-@\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function sourcingCsvHeader(): string {
  return headers.map(cell).join(',') + '\r\n';
}
export function sourcingCsvRow(
  p: HealthcareProvider,
  locationMatch = 'city_or_state_association_only',
  distanceMiles?: number
): string {
  return (
    [
      p.npi,
      p.name,
      p.practice_address_1,
      p.practice_address_2,
      p.practice_city,
      p.practice_state,
      p.practice_postal_code,
      p.practice_country,
      p.practice_phone,
      registryPhoneStatus(p.practice_phone),
      'public_registry_unverified',
      p.primary_taxonomy_description,
      p.credential,
      p.license_state,
      p.license_number,
      p.status,
      p.last_updated_date,
      p.source_fetched_at,
      locationMatch,
      distanceMiles,
      'Not verified',
      'Not verified',
      'Not verified',
      'Not verified',
      'Not verified',
      'Not assessed',
      'Udify / NPPES',
      '',
      'Human review required'
    ]
      .map(cell)
      .join(',') + '\r\n'
  );
}
