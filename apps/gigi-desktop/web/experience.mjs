import { formatMoney, moneyFields } from './model.mjs';

const priorities = {
  gigs: ['Date', 'Call Time', 'Set Time', 'Fee', 'Status', 'Requirements'],
  tasks: ['Due Date', 'Do Date', 'Priority', 'Status'],
  finances: ['Amount', 'Direction', 'Status', 'Due Date', 'Date'],
  schedule: ['Date', 'Type', 'Availability', 'All Day', 'Confirmed'],
  contacts: ['Role', 'Email', 'Phone', 'Preferred Channel', 'Status'],
  companies: ['Type', 'Status', 'Website', 'Email', 'Phone'],
  locations: ['Address', 'City', 'Region', 'Country', 'Timezone', 'Map URL'],
  notes: ['Note Details', 'Date', 'Pinned'],
  documents: ['Summary', 'Link', 'Status', 'Requires Signature', 'Expiration Date'],
};
export function importantDetails(entity, values) {
  const keys = priorities[entity] || Object.keys(values).slice(0, 6);
  return { primary: keys.filter((key) => Object.hasOwn(values, key)).map((key) => [key, values[key]]), supporting: Object.entries(values).filter(([key]) => !keys.includes(key)) };
}
export function displayField(key, value, currency) {
  if (moneyFields.has(key)) return formatMoney(value, currency);
  if ((key === 'Date' || key.endsWith(' Date')) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value) return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
}
const emptyDescriptions = {
  gigs: ['gig or shift', 'Keep dates, fees and the people involved together.'],
  tasks: ['task', 'Track the next action and link it to the work it supports.'],
  finances: ['financial record', 'Track expected income and expenses, then link them to a gig.'],
  contacts: ['contact', 'Keep the people you work with here and link them to gigs or companies.'],
  companies: ['company', 'Keep organizations and their contacts connected to your work.'],
  schedule: ['schedule entry', 'Record availability and important dates.'],
  locations: ['place', 'Save addresses and venue details for future work.'],
  notes: ['note', 'Keep supporting details and link them to a record.'],
  documents: ['document', 'Keep references to contracts, invoices and supporting files.'],
  interactions: ['interaction', 'Capture conversations and follow-up details.'],
  services: ['service', 'Save the work you offer and its usual rate.'],
  tags: ['tag', 'Organize related records with reusable categories.'],
  profile: ['profile', 'Set your personal defaults for this workspace.'],
};
export function emptyCopy(entity) {
  const [name, description] = emptyDescriptions[entity] || ['record', 'Add a record to start building your workspace.'];
  return { title: `No ${({ gigs: 'gigs or shifts', schedule: 'schedule entries', companies: 'companies' })[entity] || name + 's'} yet.`, description, action: `Add your first ${name}` };
}
export function localToday(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
