// Look up a Marketplace Creator by email and return their linked Assets/templates.
// We talk to Airtable's REST API directly to keep the worker free of the
// `airtable` Node SDK and its dependencies.

const DEFAULT_API_BASE = 'https://api.airtable.com';

export type CreatorContext = {
  creator: {
    id: string;
    name?: string;
    email?: string;
    fields: Record<string, unknown>;
  };
  assets: Array<{
    id: string;
    name?: string;
    fields: Record<string, unknown>;
  }>;
};

type AirtableConfig = {
  apiKey: string;
  apiBase: string;
  baseId: string;
  creatorsTable: string;
  assetsTable: string;
  emailField: string;
  assetsLinkField: string;
};

export function airtableConfig(env: {
  AIRTABLE_API_KEY?: string;
  AIRTABLE_API_BASE?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_CREATORS_TABLE?: string;
  AIRTABLE_ASSETS_TABLE?: string;
  AIRTABLE_CREATORS_EMAIL_FIELD?: string;
  AIRTABLE_CREATORS_ASSETS_LINK_FIELD?: string;
}): AirtableConfig | null {
  if (
    !env.AIRTABLE_API_KEY ||
    !env.AIRTABLE_BASE_ID ||
    !env.AIRTABLE_CREATORS_TABLE ||
    !env.AIRTABLE_ASSETS_TABLE
  ) {
    return null;
  }
  return {
    apiKey: env.AIRTABLE_API_KEY,
    apiBase: env.AIRTABLE_API_BASE || DEFAULT_API_BASE,
    baseId: env.AIRTABLE_BASE_ID,
    creatorsTable: env.AIRTABLE_CREATORS_TABLE,
    assetsTable: env.AIRTABLE_ASSETS_TABLE,
    emailField: env.AIRTABLE_CREATORS_EMAIL_FIELD || 'Email',
    assetsLinkField: env.AIRTABLE_CREATORS_ASSETS_LINK_FIELD || 'Assets',
  };
}

export async function fetchCreatorContext(
  email: string,
  config: AirtableConfig,
): Promise<CreatorContext | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  // The Email field on Creators is a rollup that can return an array of
  // strings even when a single linked email exists. Direct equality
  // (`LOWER({Email}) = "x"`) compares against the array and always fails.
  // ARRAYJOIN coerces to a comma-joined string; FIND does substring match.
  const formula =
    `FIND("${escapeFormula(normalized)}", LOWER(ARRAYJOIN({${config.emailField}}))) > 0`;
  const url = new URL(`${config.apiBase}/v0/${config.baseId}/${config.creatorsTable}`);
  url.searchParams.set('filterByFormula', formula);
  url.searchParams.set('maxRecords', '1');

  const creatorRes = await airtableFetch(url.toString(), config);
  const creators = (creatorRes.records || []) as AirtableRecord[];
  const creator = creators[0];
  if (!creator) return null;

  const assetIds = arrayField(creator.fields, config.assetsLinkField);
  const assets = assetIds.length > 0 ? await fetchAssets(assetIds, config) : [];

  return {
    creator: {
      id: creator.id,
      name: stringField(creator.fields, ['Name', 'Full Name', 'Display Name']),
      email: stringField(creator.fields, [config.emailField, 'Email']),
      fields: creator.fields,
    },
    assets: assets.map((asset) => ({
      id: asset.id,
      name: stringField(asset.fields, ['Name', 'Title', 'Template Name']),
      fields: asset.fields,
    })),
  };
}

async function fetchAssets(
  ids: string[],
  config: AirtableConfig,
): Promise<AirtableRecord[]> {
  // Cap context cost: only first ~10 assets.
  const limited = ids.slice(0, 10);
  const formula = `OR(${limited.map((id) => `RECORD_ID() = "${id}"`).join(',')})`;
  const url = new URL(`${config.apiBase}/v0/${config.baseId}/${config.assetsTable}`);
  url.searchParams.set('filterByFormula', formula);
  url.searchParams.set('maxRecords', String(limited.length));

  const res = await airtableFetch(url.toString(), config);
  return (res.records || []) as AirtableRecord[];
}

type AirtableRecord = { id: string; fields: Record<string, unknown> };
type AirtableListResponse = { records?: AirtableRecord[] };

async function airtableFetch(url: string, config: AirtableConfig): Promise<AirtableListResponse> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${config.apiKey}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable request failed (${response.status}): ${text.slice(0, 200)}`);
  }
  return (await response.json()) as AirtableListResponse;
}

function arrayField(fields: Record<string, unknown>, name: string): string[] {
  const value = fields[name];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function stringField(fields: Record<string, unknown>, names: string[]): string | undefined {
  for (const name of names) {
    const s = coerceFieldToString(fields[name]);
    if (s) return s;
  }
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targets = names.map(norm).filter(Boolean);
  if (targets.length === 0) return undefined;
  for (const [key, value] of Object.entries(fields)) {
    const nk = norm(key);
    if (!targets.some((t) => nk.includes(t))) continue;
    const s = coerceFieldToString(value);
    if (s) return s;
  }
  return undefined;
}

function coerceFieldToString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim();
    return t || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = coerceFieldToString(item);
      if (s) return s;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate = obj.name ?? obj.email ?? obj.text;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

function escapeFormula(value: string): string {
  return value.replace(/"/g, '\\"');
}
