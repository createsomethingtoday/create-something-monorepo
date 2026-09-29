import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PATHS } from '../src/lib/content/paths';
import { REFERENCE_CATALOG, REFERENCE_REVISION } from '../src/lib/content/reference/catalog.generated';
import { sections, terms, type FoundationEntry } from '../src/lib/server/foundation/core';

const root = new URL('../', import.meta.url);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const entries: FoundationEntry[] = [];
const plain = (value: string) => value.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ').replace(/<!--[^]*?-->/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, ' ').replace(/[#*`|_]/g, ' ').replace(/\s+/g, ' ').trim();

for (const path of PATHS) for (const lesson of path.lessons) {
  const markdown = await readFile(new URL(`src/lib/content/lessons/${path.id}/${lesson.id}.md`, root), 'utf8');
  const contentHash = hash(markdown);
  const url = `https://learn.createsomething.space/paths/${path.id}/${lesson.id}`;
  entries.push({ id: `original/${path.id}/${lesson.id}`, title: lesson.title, summary: lesson.description,
    corpus: 'original', url, sourceUrl: url, attribution: 'CREATE SOMETHING', licenseUrl: null,
    revision: `sha256:${contentHash}`, contentHash, headings: sections(markdown).map(x => x.title).join(' '), terms: terms(plain(markdown)) });
}
for (const lesson of REFERENCE_CATALOG) {
  const markdown = await readFile(new URL(`src/lib/content/reference/phases/${lesson.phase}/${lesson.lesson}/en.md`, root), 'utf8');
  entries.push({ id: `reference/${lesson.phase}/${lesson.lesson}`, title: lesson.title,
    summary: plain(markdown.replace(/^#.*\n/, '')).slice(0, 240), corpus: 'reference',
    url: `https://learn.createsomething.space/reference/${lesson.phase}/${lesson.lesson}`,
    sourceUrl: `https://github.com/rohitg00/ai-engineering-from-scratch/blob/${REFERENCE_REVISION}/phases/${lesson.phase}/${lesson.lesson}/docs/en.md`,
    attribution: 'Rohit Ghumare and AI Engineering from Scratch contributors',
    licenseUrl: 'https://learn.createsomething.space/reference-license.txt', revision: REFERENCE_REVISION,
    contentHash: hash(markdown), headings: sections(markdown).map(x => x.title).join(' '), terms: terms(plain(markdown)) });
}
entries.sort((a, b) => a.id.localeCompare(b.id));
if (new Set(entries.map(x => x.id)).size !== entries.length || REFERENCE_CATALOG.length !== 523) throw new Error('Unexpected curriculum inventory. Review before changing the public corpus.');
const serialized = JSON.stringify({ revision: hash(JSON.stringify(entries)), entries });
const target = fileURLToPath(new URL('src/lib/server/foundation/catalog.generated.json', root));
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== serialized + '\n') throw new Error('Foundation index is stale. Run pnpm foundation:index in packages/lms.');
} else await writeFile(target, serialized + '\n');
console.log(`Foundation index: ${entries.length} lessons (${REFERENCE_CATALOG.length} reference).`);
