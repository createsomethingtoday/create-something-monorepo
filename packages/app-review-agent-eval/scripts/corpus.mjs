#!/usr/bin/env node
// Build corpus/manifest.json: decided app versions with written reviewer
// feedback, joined to their asset's listing fields. Reviewer feedback is the
// label; it is written to a separate file the agent never sees.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { F, TABLES, getRecords, pages, sel } from './lib/airtable.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'corpus');
const since = process.argv[2] ?? '2026-07-01';

const V = F.versions;
const APP_TYPE = 'rec8UQzOkwrwQr7bf'; // asset type rollup value for App🖥️ (templates share this table)
const DECIDED = new Set(['❌Rejected', '❌Rejected (No Notification)', '📤Changes Requested', '✅Approved', '✅Approved (No Notification)']);

// Field names on this table carry emoji, so filterByFormula by name is brittle.
// Page newest-first by field id and stop at the window start.
const versions = [];
for await (const page of pages(TABLES.versions, { fields: Object.values(V), sort: [{ field: V.submittedAt, direction: 'desc' }] })) {
  let done = false;
  for (const r of page) {
    const at = r.fields[V.submittedAt];
    if (!at) continue;
    if (at < since) { done = true; break; }
    const status = sel(r.fields[V.status]);
    const text = `${r.fields[V.reviewFeedback] ?? ''}${r.fields[V.rejectionFeedback] ?? ''}`.trim();
    if (String(r.fields[V.assetType] ?? '') !== APP_TYPE) continue;
    if (DECIDED.has(status) && text.length > 40) versions.push(r);
  }
  if (done) break;
}

const assetIds = [...new Set(versions.flatMap((r) => r.fields[V.asset] ?? []))];
const assets = new Map((await getRecords(TABLES.assets, assetIds, Object.values(F.assets))).map((r) => [r.id, r.fields]));

const A = F.assets;
const manifest = versions.map((r) => {
  const f = r.fields;
  const assetId = (f[V.asset] ?? [])[0] ?? null;
  const a = assets.get(assetId) ?? {};
  return {
    versionId: r.id,
    assetId,
    appName: a[A.appName] ?? null,
    appId: a[A.appId] ?? null,
    clientId: a[A.clientId] ?? null,
    capability: sel(a[A.capabilities]),
    visibility: sel(a[A.visibility]),
    marketplaceStatus: sel(a[A.marketplaceStatus]),
    isPartner: Boolean((f[V.isPartner] ?? [])[0]),
    versionNumber: f[V.versionNumber] ?? null,
    reviewType: sel(f[V.reviewType]),
    submittedAt: f[V.submittedAt],
    decision: sel(f[V.status]),
    reason: sel(f[V.reason]),
    reviewer: f[V.reviewer]?.name ?? null,
    zendeskTicketId: f[V.zendesk] ?? null,
    receipt: f[V.receipt] ?? null,
    adminAppId: f[V.adminAppId] ?? null,
    extensionVersionId: f[V.extensionVersionId] ?? null,
    testingSiteUrl: (f[V.testingSiteUrl] && typeof f[V.testingSiteUrl] === 'object' ? f[V.testingSiteUrl].url : f[V.testingSiteUrl]) || null,
    listing: {
      shortDescription: a[A.shortDescription] ?? '',
      longDescriptionHtml: a[A.longDescriptionHtml] ?? '',
      featuresText: a[A.featuresText] ?? '',
      installUrl: a[A.installUrl] ?? '',
      website: a[A.website] ?? '',
      privacy: a[A.privacy] ?? '',
      terms: a[A.terms] ?? '',
      support: a[A.support] ?? '',
      demoVideo: a[A.demoVideo] ?? '',
      previewSite: a[A.previewSite] ?? '',
      payment: sel(a[A.payment]),
      iconAlt: a[A.iconAlt] ?? '',
      carouselCount: Array.isArray(a[A.carouselUrls]) ? a[A.carouselUrls].length : (a[A.carouselUrls] ? String(a[A.carouselUrls]).split(/\s+/).filter(Boolean).length : 0),
      carouselAlt: a[A.carouselAlt] ?? '',
      creatorNotes: a[A.notes] ?? '',
      credentialsNote: a[A.credentials] ?? '',
    },
    bundle: null,
  };
});

const labels = Object.fromEntries(
  versions.map((r) => [r.id, { reviewFeedback: r.fields[V.reviewFeedback] ?? '', rejectionFeedback: r.fields[V.rejectionFeedback] ?? '' }])
);

mkdirSync(OUT, { recursive: true });
// A rebuild refreshes labels and listing fields; bundle metadata (admin bundleUrl, sha256, local
// path) comes from the admin-versions join and the CDN fetch, so carry it over by version id.
const previous = existsSync(join(OUT, 'manifest.json')) ? JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')).versions : [];
const prevById = new Map(previous.map((v) => [v.versionId, v]));
for (const v of manifest) v.bundle = prevById.get(v.versionId)?.bundle ?? v.bundle;
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ since, builtAt: new Date().toISOString(), count: manifest.length, versions: manifest }, null, 2));
writeFileSync(join(OUT, 'labels.json'), JSON.stringify(labels, null, 2));

const by = (k) => Object.entries(manifest.reduce((m, v) => ((m[v[k] ?? 'null'] = (m[v[k] ?? 'null'] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
console.log(`${manifest.length} decided versions with written feedback since ${since}; ${assetIds.length} apps`);
console.log('decision:', by('decision').map(([k, n]) => `${k} ${n}`).join(' · '));
console.log('capability:', by('capability').map(([k, n]) => `${k} ${n}`).join(' · '));
console.log('reviewType:', by('reviewType').map(([k, n]) => `${k} ${n}`).join(' · '));
console.log('reviewer:', by('reviewer').map(([k, n]) => `${k} ${n}`).join(' · '));
console.log('admin app id:', manifest.filter((v) => v.adminAppId).length, '· extension version id:', manifest.filter((v) => v.extensionVersionId).length, '· testing site:', manifest.filter((v) => v.testingSiteUrl).length);
console.log('with receipt:', manifest.filter((v) => v.receipt).length, '· partner:', manifest.filter((v) => v.isPartner).length);
