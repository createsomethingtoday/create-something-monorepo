const STATE_NAME_BY_CODE: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

const NORMALIZED_STATE_LOOKUP = new Map<string, string>(
  Object.entries(STATE_NAME_BY_CODE).flatMap(([code, name]) => [
    [code.toLowerCase(), name],
    [name.toLowerCase(), name],
  ]),
);

export function normalizeUsStateFilter(value: string | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim().replace(/\./g, '').toLowerCase();
  if (!normalized) return null;

  return NORMALIZED_STATE_LOOKUP.get(normalized) ?? toTitleCase(normalized);
}

export function extractJobState(input: {
  rawPayload?: string | null;
  location?: string | null;
}): string | null {
  const parsed = parseJson(input.rawPayload);
  const fromPayload = extractPayloadState(parsed);
  if (fromPayload) {
    return fromPayload;
  }

  return extractStateFromLocation(input.location ?? null);
}

function extractPayloadState(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const directState = normalizeUsStateFilter(asString(record.state) ?? undefined);
  if (directState) {
    return directState;
  }

  const location = record.location;
  if (!location || typeof location !== 'object') {
    return null;
  }

  const locationRecord = location as Record<string, unknown>;
  const area = locationRecord.area;
  if (Array.isArray(area) && typeof area[1] === 'string') {
    return normalizeUsStateFilter(area[1]) ?? area[1].trim();
  }

  return extractStateFromLocation(asString(locationRecord.display_name));
}

function extractStateFromLocation(location: string | null): string | null {
  if (!location) return null;

  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const candidate = parts[parts.length - 1];
  return normalizeUsStateFilter(candidate) ?? null;
}

function parseJson(value: string | null | undefined): unknown {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ');
}
