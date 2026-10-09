import { formatMoney, moneyFields, supportedCurrencies } from './model.mjs';

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
const datePresentation = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
function displayDate(value) {
  if (typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value) return new Intl.DateTimeFormat('en-US', datePresentation).format(date);
    return null;
  }
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts || Number(parts[2]) > 23 || Number(parts[3]) > 59 || Number(parts[4] || 0) > 59 || !Number.isFinite(Date.parse(value))) return null;
  // Format in the recorded offset, not the viewer's timezone. Stored values stay untouched.
  const wallTime = new Date(value.slice(0, -parts[6].length) + 'Z');
  if (!Number.isFinite(wallTime.getTime()) || wallTime.toISOString().slice(0, 10) !== parts[1]) return null;
  const options = { ...datePresentation, hour: 'numeric', minute: '2-digit', ...(Number(parts[4]) || parts[5] ? { second: '2-digit' } : {}), ...(parts[5] ? { fractionalSecondDigits: Math.min(3, parts[5].length - 1) } : {}) };
  return `${new Intl.DateTimeFormat('en-US', options).format(wallTime)} (UTC${parts[6] === 'Z' ? '' : parts[6]})`;
}
export function displayField(key, value, currency) {
  if (moneyFields.has(key)) return formatMoney(value, currency);
  if (key === 'Date' || key.endsWith(' Date') || key === 'Call Time' || key === 'Set Time') {
    const date = displayDate(value);
    if (date) return date;
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

export function fieldHelp(field, currency) {
  if (moneyFields.has(field)) return supportedCurrencies.has(currency)
    ? `Enter an amount in ${currency}, using up to two decimal places (for example, 90.00).`
    : 'Currency is not set. Check your profile currency before entering an amount.';
  if (field === 'Date' || field.endsWith(' Date')) return 'Use YYYY-MM-DD (2026-10-03), or a timestamp with a UTC offset (2026-10-03T16:00:00-05:00).';
  if (field === 'Call Time' || field === 'Set Time') return 'Use a clear time (18:30), or include the date and UTC offset (2026-10-03T18:30:00-05:00).';
  return '';
}
export function collectionCount(entity, count) {
  const [singular] = emptyDescriptions[entity] || ['record'];
  const nouns = { contacts: ['person', 'people'], companies: ['company', 'companies'], schedule: ['schedule entry', 'schedule entries'], gigs: ['gig or shift', 'gigs or shifts'] };
  const [one, many] = nouns[entity] || [singular, `${singular}s`];
  return `${count} ${count === 1 ? one : many}`;
}
