// Minimal Airtable REST client. AIRTABLE_API_KEY is scoped to the App Review base.
const BASE = 'appMoIgXMTTTNIc3p';
export const TABLES = { assets: 'tblRwzpWoLgE9MrUm', versions: 'tblHxZ2hgSFLZxsZu' };

export const F = {
  versions: {
    status: 'flde8Huk5NRIdm2wZ',
    reviewType: 'fldjYFJMGTerFYlol',
    reason: 'fldC7Hfkd0TlLtbcy',
    reviewFeedback: 'fldHxIGHMHn4xb9U4',
    rejectionFeedback: 'fldXIdcnOQXLVrsuN',
    submittedAt: 'fldWTKKh989L4lTTB',
    versionNumber: 'fldn2ImbgwKfCdWWA',
    receipt: 'fldsC51z2wJrWCfKj',
    asset: 'fldemWilqCQcOCh5s',
    reviewer: 'fldoZScwdH94PVVQE',
    zendesk: 'fldHKvyh55jJ0VK1u',
    creatorNotes: 'flduQyARdf4aXB0K1',
    isPartner: 'fldczL9zgq44MjxQE',
    assetType: 'fldOsqqUdqzYyLNBq',
    adminAppId: 'fldypmytG4DpK8a8h',
    extensionVersionId: 'fld7OTRT3A9ado4MF',
    testingSiteUrl: 'fldj5QWwHLJgjDu7W',
  },
  assets: {
    appName: 'fldUzJBor3Gnkykjc',
    capabilities: 'fldxkZNofdI0i1A9a',
    clientId: 'fldtwvVVlTeDRlTYV',
    appId: 'fldxFrPOO2xtLk93e',
    visibility: 'fldCM1pKBKvgAylh2',
    marketplaceStatus: 'fld51CeQNGDgW9b0D',
    featuresText: 'fldLMnR8pz6OFSXCg',
    notes: 'fldBVKHOno8aJlnox',
    credentials: 'fldNtdflbOhjx46A0',
    shortDescription: 'fldgUDxVqRkSqVWn9',
    longDescriptionHtml: 'fldiDg3clkRAaPWU9',
    installUrl: 'fld0WE5PKhWksXpjt',
    iconAlt: 'fldKG132fWtKXhwsH',
    carouselUrls: 'fldneaPyoRXBAVtS1',
    carouselAlt: 'fldJ2HQ8HgScYomuE',
    payment: 'fldOe6TV2zC1BDlR3',
    demoVideo: 'fldrlBXRrBW9c1hGW',
    privacy: 'fldSw4lJp05JLz3nJ',
    terms: 'fldEmM7EFEPoMqHOa',
    website: 'fld3OtovhDTyDO0uZ',
    support: 'fldRq4MBDoxMhpiwH',
    previewSite: 'fldROrXCnuZyKNCxW',
  },
};

function key() {
  const k = process.env.AIRTABLE_API_KEY;
  if (!k) throw new Error('AIRTABLE_API_KEY is not set (inject with `infisical run`)');
  return k;
}

export async function listAll(table, { filterByFormula, fields, sort, max = 5000 } = {}) {
  const out = [];
  let offset;
  do {
    const u = new URL(`https://api.airtable.com/v0/${BASE}/${table}`);
    u.searchParams.set('returnFieldsByFieldId', 'true');
    u.searchParams.set('pageSize', '100');
    if (filterByFormula) u.searchParams.set('filterByFormula', filterByFormula);
    for (const f of fields ?? []) u.searchParams.append('fields[]', f);
    (sort ?? []).forEach((s, i) => {
      u.searchParams.set(`sort[${i}][field]`, s.field);
      u.searchParams.set(`sort[${i}][direction]`, s.direction ?? 'asc');
    });
    if (offset) u.searchParams.set('offset', offset);
    const res = await fetch(u, { headers: { authorization: `Bearer ${key()}` } });
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    out.push(...json.records);
    offset = json.offset;
    if (out.length >= max) break;
  } while (offset);
  return out;
}

/** Async pages of records; stops when the caller stops iterating. */
export async function* pages(table, { filterByFormula, fields, sort } = {}) {
  let offset;
  do {
    const u = new URL(`https://api.airtable.com/v0/${BASE}/${table}`);
    u.searchParams.set('returnFieldsByFieldId', 'true');
    u.searchParams.set('pageSize', '100');
    if (filterByFormula) u.searchParams.set('filterByFormula', filterByFormula);
    for (const f of fields ?? []) u.searchParams.append('fields[]', f);
    (sort ?? []).forEach((s, i) => {
      u.searchParams.set(`sort[${i}][field]`, s.field);
      u.searchParams.set(`sort[${i}][direction]`, s.direction ?? 'asc');
    });
    if (offset) u.searchParams.set('offset', offset);
    const res = await fetch(u, { headers: { authorization: `Bearer ${key()}` } });
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    yield json.records;
    offset = json.offset;
  } while (offset);
}

export async function getRecords(table, ids, fields) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const formula = `OR(${chunk.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
    out.push(...(await listAll(table, { filterByFormula: formula, fields })));
  }
  return out;
}

export const sel = (v) => (v && typeof v === 'object' && 'name' in v ? v.name : Array.isArray(v) ? v.map(sel) : v ?? null);
