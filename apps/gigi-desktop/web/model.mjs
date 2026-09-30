export const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'gigs', label: 'Gigs & shifts' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'contacts', label: 'People' },
  { id: 'companies', label: 'Companies' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'finances', label: 'Money' },
  { id: 'locations', label: 'Places' },
  { id: 'notes', label: 'Notes' },
  { id: 'documents', label: 'Documents' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'services', label: 'Services' },
  { id: 'tags', label: 'Tags' },
  { id: 'profile', label: 'Profile' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' }
];

export const fields = {
  gigs: ['Status', 'Type', 'Date', 'Call Time', 'Set Time', 'Fee', 'Rate Type', 'Hours', 'Lead Source', 'Requirements'],
  schedule: ['Date', 'Type', 'Availability', 'All Day', 'Confirmed'],
  contacts: ['Type', 'Role', 'Email', 'Phone', 'Instagram', 'Preferred Channel', 'Status', 'Rate Notes'],
  companies: ['Type', 'Status', 'Website', 'Instagram', 'Email', 'Phone'],
  tasks: ['Status', 'Do Date', 'Due Date', 'Priority', 'Estimated Time', 'Recurring'],
  finances: ['Amount', 'Direction', 'Date', 'Due Date', 'Status', 'Deductible', 'Tax Category', 'Payment Method', 'Invoice Number'],
  locations: ['Type', 'Address', 'City', 'Region', 'Country', 'Timezone', 'Venue Intel', 'Capacity', 'Map URL'],
  notes: ['Note Details', 'Type', 'Status', 'Date', 'Pinned'],
  documents: ['Type', 'Status', 'Requires Signature', 'Signed Date', 'Expiration Date', 'Confidential', 'Summary', 'Details', 'Link'],
  interactions: ['Date', 'Direction', 'Status', 'Type', 'Follow-up Date', 'Sentiment', 'Thread ID'],
  services: ['Type', 'Rate', 'Rate Type', 'Default Hours', 'Description', 'Active'], tags: ['Category', 'Description', 'Active'],
  profile: ['Default Day Rate', 'Default Hourly Rate', 'Tax Set-Aside Percentage', 'Mileage Rate', 'Currency', 'Invoice Prefix', 'Entity Type']
};

export const moneyFields = new Set(['Fee', 'Amount', 'Default Day Rate', 'Default Hourly Rate', 'Mileage Rate', 'Rate']);
export const numericFields = new Set(['Hours', 'Estimated Time', 'Tax Set-Aside Percentage', 'Capacity', 'Default Hours']);
export const booleanFields = new Set(['notes.Pinned', 'gigs.Promotable', 'finances.Deductible', 'finances.Recurring', 'documents.Requires Signature', 'documents.Confidential', 'schedule.All Day', 'schedule.Confirmed', 'tags.Active', 'services.Active']);
export const supportedCurrencies = new Set(['USD', 'CAD', 'EUR', 'GBP']);
const options = { 'finances.Direction': ['Income', 'Expense'], 'finances.Status': ['Expected', 'Invoiced', 'Paid', 'Overdue'] };
export const fieldOptions = (entity, field) => options[`${entity}.${field}`] || null;

export function listFrom(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.records)) return result.records;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

export function recordFields(values, entity) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    const text = String(value ?? '').trim();
    if (text === '') return [key, ''];
    if (moneyFields.has(key)) {
      if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) throw new Error(`${key} must be a money amount with at most two decimal places.`);
      const [whole, fraction = ''] = text.split('.');
      const cents = Number(whole) * 100 + Math.sign(Number(whole) || (text.startsWith('-') ? -1 : 1)) * Number(fraction.padEnd(2, '0'));
      if (!Number.isSafeInteger(cents)) throw new Error(`${key} is too large.`);
      return [key, cents];
    }
    if (numericFields.has(key)) {
      const number = Number(text);
      if (!Number.isFinite(number)) throw new Error(`${key} must be a number.`);
      return [key, number];
    }
    if (booleanFields.has(`${entity}.${key}`)) return [key, text === 'true'];
    return [key, text];
  }).filter(([, value]) => value !== ''));
}

export function editedFields(existing, values, entity) {
  const next = { ...existing };
  for (const [key, raw] of Object.entries(values)) {
    if (String(raw ?? '').trim() === '') delete next[key];
    else next[key] = recordFields({ [key]: raw }, entity)[key];
  }
  return next;
}

export function formatMoney(value, currency) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (!currency) return `${(number / 100).toFixed(2)} (currency unset)`;
  if (!supportedCurrencies.has(currency)) return `${(number / 100).toFixed(2)} (unsupported currency ${currency})`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(number / 100);
}

export function summaryMoney(summary, currency) {
  return formatMoney(summary?.balanceDueCents, currency);
}

export function gigBalance(summary) {
  if (!summary) return '—';
  if (summary.financialsComplete !== true) return 'Incomplete';
  return summaryMoney(summary, summary.currency);
}

export function relatedEndpoint(relation, currentEntity, currentId) {
  if (relation.fromEntity === currentEntity && relation.fromId === currentId) return { entity: relation.toEntity, id: relation.toId, title: relation.toTitle || null, role: relation.role };
  if (relation.toEntity === currentEntity && relation.toId === currentId) return { entity: relation.fromEntity, id: relation.fromId, title: relation.fromTitle || null, role: relation.role };
  return null;
}

export function sourcePreview(source) {
  const data = source?.preview || {};
  const names = source?.provider === 'gmail' ? [['Sender', data.from], ['Excerpt', data.snippet]] : source?.provider === 'googlecalendar' ? [['Location', data.location], ['Description', data.description]] : [];
  return names.filter(([, value]) => typeof value === 'string' && value.trim()).map(([label, value]) => ({ label, value: value.trim() }));
}

export function sourceCanBegin(source) {
  return source?.state === 'disconnected' || source?.state === 'attention' && source.reconnectable === true && !sourceNeedsOperatorReview(source);
}

export function sourceNeedsOperatorReview(source) {
  return source?.state === 'attention' && source.recovery === 'operator_review';
}
