// Generates a forward recovery migration from a historical delivery-context
// seed. Recovery inserts a missing row but never overwrites an environment's
// surviving D1-owned context.

import { readFileSync, writeFileSync } from 'node:fs';

const [, , seedPath, recoveryPath] = process.argv;

if (!seedPath || !recoveryPath) {
	console.error(
		'Usage: node scripts/generate-delivery-context-recovery.mjs <seed-migration.sql> <recovery-migration.sql>'
	);
	process.exit(1);
}

const seed = readFileSync(seedPath, 'utf8');
const insertStart = seed.indexOf('INSERT INTO canon_workflow_contexts');
const updateClause = /ON CONFLICT\(context_id\) DO UPDATE SET[\s\S]+?updated_at = datetime\('now'\);\s*$/;

if (insertStart === -1 || !updateClause.test(seed)) {
	console.error(`${seedPath}: expected a generated canon_workflow_contexts upsert`);
	process.exit(1);
}

const insertIfMissing = seed
	.slice(insertStart)
	.replace(updateClause, 'ON CONFLICT(context_id) DO NOTHING;\n');
const sql = `-- Forward recovery for environments that applied the original destructive 0027.
-- Source seed: ${seedPath}
-- Regenerate: node scripts/generate-delivery-context-recovery.mjs ${seedPath} ${recoveryPath}
-- Insert only when missing; surviving D1-owned context remains authoritative.
-- A future removal requires the explicit approval and evidence tracked in CRE-1317.

${insertIfMissing}`;

writeFileSync(recoveryPath, sql);
console.log(`${recoveryPath}: generated insert-if-missing recovery from ${seedPath}`);
