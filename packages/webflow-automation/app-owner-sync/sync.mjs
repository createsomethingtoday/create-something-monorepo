#!/usr/bin/env node
/**
 * App owner sync: Webflow (Snowflake OAUTH_APPLICATIONS + workspace owners) → Airtable 👛Assets / 🎨Creators.
 *
 * Why: the submission form's ownership rule (wf-app-form-cloud lib/submissionOwnership.js)
 * matches the signed-in developer against the asset's 🔄Workspace ID, the creator's
 * 🔑WF User ID, or the creator's 📧WF Account Email. Those fields were mostly empty
 * (2026-10-26: 86 app assets had no workspace, only 298 had a creator email, 197 a user
 * id, and ~170 email overrides held a website URL), and the workspace rollup only moves
 * when a bundle is uploaded, so an app transfer left the listing refusing its new owner.
 *
 * What it writes (only when the live value differs or the field is empty):
 *   👛Assets  👀🔄Workspace ID (Override)          live owner workspace when it differs from the rollup
 *   👛Assets  👀🎨📧 Creator WF Account Email (Override)  owner email when the field holds a non-email (URL)
 *   🎨Creators 🔑WF User ID                      owner user id when empty
 *   🎨Creators 📧WF Account Email                owner email when empty
 *
 * Input: --owners <json> exported from Snowflake (see owners.sql), or run with --snowflake
 * to query it (Okta externalbrowser or SNOWFLAKE_PAT). Dry run by default; --execute writes.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = 'appMoIgXMTTTNIc3p';
const ASSETS = 'tblRwzpWoLgE9MrUm';
const CREATORS = 'tbljt0plqxdMARZXb';
const A = {
  name: 'fldUzJBor3Gnkykjc',
  clientId: 'fldtwvVVlTeDRlTYV',
  creator: 'fldGDWo2VfnTbSUiL',
  workspaceId: 'fldSk9BexoELpi2AV',
  workspaceIdOverride: 'fldcKRKXJzFNYGm2D',
  wfEmailLookup: 'fldYhLsUwL8FJUM5b',
  wfEmailOverride: 'fldo7ei39ETI7Cjp2',
  wfUserIdLookup: 'fld2jvWS6WF5rvVXr',
  status: 'fld51CeQNGDgW9b0D',
};
const C = { wfEmail: 'fldT0VVP9GXMOhajO', wfUserId: 'fldpwkyHcmErSNkzX', workspaceIdOverride: 'fldCBw83kFNJOoNPd' };

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const ownersArg = args.indexOf('--owners');
const KEY = process.env.AIRTABLE_API_KEY;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const HEX24 = /^[0-9a-f]{24}$/;
const log = (...p) => console.log(new Date().toISOString(), ...p);
if (!KEY) { console.error('AIRTABLE_API_KEY missing'); process.exit(1); }

async function at(path, init = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    ...init, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (res.status === 429) { await new Promise((r) => setTimeout(r, 1500)); return at(path, init); }
  if (!res.ok) throw new Error(`Airtable ${res.status} ${path}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
async function listAll(table, fields, filterByFormula) {
  const out = []; let offset;
  do {
    const q = new URLSearchParams({ returnFieldsByFieldId: 'true', pageSize: '100' });
    for (const f of fields) q.append('fields[]', f);
    if (filterByFormula) q.set('filterByFormula', filterByFormula);
    if (offset) q.set('offset', offset);
    const page = await at(`${table}?${q}`);
    out.push(...page.records); offset = page.offset;
  } while (offset);
  return out;
}
async function patchAll(table, records) {
  for (let i = 0; i < records.length; i += 10) {
    await at(table, { method: 'PATCH', body: JSON.stringify({ records: records.slice(i, i + 10), typecast: false }) });
  }
}
const first = (v) => (Array.isArray(v) ? v[0] : v);
const str = (v) => (v == null ? '' : String(first(v)).trim());

function loadOwners() {
  if (ownersArg !== -1) return JSON.parse(readFileSync(args[ownersArg + 1], 'utf8'));
  const pat = process.env.SNOWFLAKE_PAT;
  const r = spawnSync('uvx', ['--from', 'snowflake-cli', 'snow', 'sql', '-f', join(HERE, 'owners.sql'), '--temporary-connection',
    '--account', 'wn71398.us-east-1', '--user', process.env.SNOWFLAKE_USER || 'micah@webflow.com',
    '--authenticator', pat ? 'PROGRAMMATIC_ACCESS_TOKEN' : 'externalbrowser', '--database', 'ANALYTICS', '--schema', 'WEBFLOW',
    '--warehouse', 'SNOWFLAKE_REPORTING', '--format', 'json'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: pat ? { ...process.env, SNOWFLAKE_PASSWORD: pat } : process.env });
  if (r.status !== 0) throw new Error(`snow sql failed: ${r.stderr?.slice(0, 500)}`);
  const i = r.stdout.indexOf('['); return JSON.parse(r.stdout.slice(i));
}

const owners = new Map();
for (const row of loadOwners()) {
  const cid = String(row.CLIENT_ID || '').toLowerCase();
  if (!cid) continue;
  owners.set(cid, {
    workspaceId: str(row.OWNER_WORKSPACE_ID), ownerType: str(row.OWNER_TYPE),
    userId: str(row.WS_OWNER_USER_ID) || str(row.APP_OWNER_USER_ID),
    email: str(row.WS_OWNER_EMAIL).toLowerCase(), deleted: row.WS_OWNER_DELETED === true, appName: str(row.APP_NAME),
  });
}
log(`owners loaded: ${owners.size}`);

const assets = await listAll(ASSETS, Object.values(A), `{${A.clientId}} != ''`);
const creatorIds = new Set(assets.flatMap((r) => (r.fields[A.creator] || []).map((l) => (typeof l === 'string' ? l : l.id))));
const creators = new Map((await listAll(CREATORS, Object.values(C))).filter((r) => creatorIds.has(r.id)).map((r) => [r.id, r]));
log(`assets with client id: ${assets.length}; creators linked: ${creators.size}`);

const plan = { assetWorkspaceOverride: [], assetEmailOverrideFix: [], creatorUserId: [], creatorEmail: [], unmatched: [], conflicts: [] };
const creatorCandidates = new Map(); // creatorId → Map(workspaceId → {userId,email,count})

for (const asset of assets) {
  const f = asset.fields;
  const cid = str(f[A.clientId]).toLowerCase();
  const live = owners.get(cid);
  const name = str(f[A.name]);
  if (!live) { plan.unmatched.push({ id: asset.id, name, cid }); continue; }
  if (live.ownerType !== 'Workspace' || !HEX24.test(live.workspaceId)) { plan.conflicts.push({ id: asset.id, name, reason: `owner type ${live.ownerType}` }); continue; }

  const rollup = str(f[A.workspaceId]);
  const override = str(f[A.workspaceIdOverride]);
  const effective = override || rollup;
  if (effective !== live.workspaceId) {
    // Rollup differs (transfer, or never set): point the override at the live owner.
    plan.assetWorkspaceOverride.push({ id: asset.id, name, from: effective || '(empty)', to: live.workspaceId });
  } else if (override && override === rollup) {
    // Override redundant; leave it (harmless).
  }

  const emailOverride = str(f[A.wfEmailOverride]);
  if (emailOverride && !EMAIL_RE.test(emailOverride) && live.email && !live.deleted) {
    plan.assetEmailOverrideFix.push({ id: asset.id, name, from: emailOverride, to: live.email });
  }

  for (const link of f[A.creator] || []) {
    const creatorId = typeof link === 'string' ? link : link.id;
    if (!creatorCandidates.has(creatorId)) creatorCandidates.set(creatorId, new Map());
    const byWs = creatorCandidates.get(creatorId);
    const entry = byWs.get(live.workspaceId) || { userId: live.userId, email: live.email, deleted: live.deleted, count: 0 };
    entry.count += 1; byWs.set(live.workspaceId, entry);
  }
}

for (const [creatorId, byWs] of creatorCandidates) {
  const creator = creators.get(creatorId);
  if (!creator) continue;
  // Pick the workspace that owns most of this creator's apps; ties → skip (ambiguous).
  const ranked = [...byWs.entries()].sort((a, b) => b[1].count - a[1].count);
  if (ranked.length > 1 && ranked[0][1].count === ranked[1][1].count) { plan.conflicts.push({ id: creatorId, reason: 'creator spans workspaces evenly' }); continue; }
  const best = ranked[0][1];
  if (best.deleted) continue;
  if (!str(creator.fields[C.wfUserId]) && HEX24.test(best.userId)) plan.creatorUserId.push({ id: creatorId, to: best.userId });
  if (!str(creator.fields[C.wfEmail]) && EMAIL_RE.test(best.email)) plan.creatorEmail.push({ id: creatorId, to: best.email });
}

mkdirSync(join(HERE, 'runs'), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(join(HERE, 'runs', `plan-${stamp}.json`), JSON.stringify(plan, null, 2));
log('plan:', Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, v.length])));
for (const row of plan.assetWorkspaceOverride.slice(0, 15)) log('  ws', row.name, row.from, '→', row.to);
for (const row of plan.assetEmailOverrideFix.slice(0, 8)) log('  email-fix', row.name, row.from, '→', row.to);

if (!EXECUTE) { log('dry run; pass --execute to write'); process.exit(0); }

await patchAll(ASSETS, plan.assetWorkspaceOverride.map((r) => ({ id: r.id, fields: { [A.workspaceIdOverride]: r.to } })));
await patchAll(ASSETS, plan.assetEmailOverrideFix.map((r) => ({ id: r.id, fields: { [A.wfEmailOverride]: r.to } })));
const creatorPatches = new Map();
for (const r of plan.creatorUserId) creatorPatches.set(r.id, { ...(creatorPatches.get(r.id) || {}), [C.wfUserId]: r.to });
for (const r of plan.creatorEmail) creatorPatches.set(r.id, { ...(creatorPatches.get(r.id) || {}), [C.wfEmail]: r.to });
await patchAll(CREATORS, [...creatorPatches].map(([id, fields]) => ({ id, fields })));
log('written:', { assets: plan.assetWorkspaceOverride.length + plan.assetEmailOverrideFix.length, creators: creatorPatches.size });
