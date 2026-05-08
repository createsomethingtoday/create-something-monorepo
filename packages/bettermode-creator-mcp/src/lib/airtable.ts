// Airtable Creator + linked Assets lookup. Direct REST.

const DEFAULT_API_BASE = 'https://api.airtable.com';

export type CreatorContext = {
  creator: { id: string; name?: string; email?: string; fields: Record<string, unknown> };
  assets: Array<{ id: string; name?: string; fields: Record<string, unknown> }>;
};

export type AirtableConfig = {
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

  const formula = `LOWER({${config.emailField}}) = "${escapeFormula(normalized)}"`;
  const url = new URL(`${config.apiBase}/v0/${config.baseId}/${config.creatorsTable}`);
  url.searchParams.set('filterByFormula', formula);
  url.searchParams.set('maxRecords', '1');

  const creatorRes = await airtableFetch(url.toString(), config);
  const creator = (creatorRes.records || [])[0];
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

async function fetchAssets(ids: string[], config: AirtableConfig) {
  const limited = ids.slice(0, 10);
  const formula = `OR(${limited.map((id) => `RECORD_ID() = "${id}"`).join(',')})`;
  const url = new URL(`${config.apiBase}/v0/${config.baseId}/${config.assetsTable}`);
  url.searchParams.set('filterByFormula', formula);
  url.searchParams.set('maxRecords', String(limited.length));
  const res = await airtableFetch(url.toString(), config);
  return res.records || [];
}

type AirtableRecord = { id: string; fields: Record<string, unknown> };
type AirtableListResponse = { records?: AirtableRecord[] };

async function airtableFetch(url: string, config: AirtableConfig): Promise<AirtableListResponse> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${config.apiKey}` } });
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
    const value = fields[name];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function escapeFormula(value: string): string {
  return value.replace(/"/g, '\\"');
}
