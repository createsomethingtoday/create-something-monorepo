#!/usr/bin/env node
/**
 * Refresh source/*.mdx from webflow/openapi-internal main via the GitHub API.
 * Uses `gh auth token --user micahwithwf` (the only account with repo access).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(here, '..', 'source');
const REPO = 'webflow/openapi-internal';
const DIR = 'fern/products/data/pages/MARKETPLACE';
const REF = process.argv[2] || 'main';

const token = execFileSync('gh', ['auth', 'token', '--user', 'micahwithwf'], { encoding: 'utf8' }).trim();
const headers = { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' };

const commit = await fetch(`https://api.github.com/repos/${REPO}/commits/${REF}`, { headers }).then((r) => r.json());
const listing = await fetch(`https://api.github.com/repos/${REPO}/contents/${DIR}?ref=${commit.sha}`, { headers }).then((r) => r.json());
for (const entry of listing.filter((e) => e.name.endsWith('.mdx'))) {
  const raw = await fetch(entry.url, { headers: { ...headers, Accept: 'application/vnd.github.raw' } }).then((r) => r.text());
  writeFileSync(join(sourceDir, entry.name), raw);
  console.log(`synced ${entry.name} (${raw.length} bytes)`);
}
writeFileSync(
  join(sourceDir, 'SOURCE.json'),
  JSON.stringify(
    {
      repo: REPO,
      ref: REF,
      sha: commit.sha,
      committedAt: commit.commit.committer.date,
      dir: DIR,
      syncedAt: new Date().toISOString(),
      note: 'Snapshot of the Marketplace docs pages. Refresh with `pnpm sync-source` (needs `gh auth` as micahwithwf).',
    },
    null,
    2,
  ) + '\n',
);
console.log(`source now at ${commit.sha.slice(0, 8)} (${commit.commit.committer.date})`);
