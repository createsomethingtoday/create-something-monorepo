// Generates a canon_workflow_contexts seed migration from a delivery context
// TS module, so the D1 seed and the deploy-time fallback are byte-identical
// (docs/DELIVERY_SURFACE_SPEC.md). Run from packages/agency:
//
//   node scripts/generate-delivery-context-migration.mjs \
//     src/lib/delivery/abundance-context.ts \
//     migrations/0025_abundance_delivery_context.sql \
//     abundanceWorkflowContext

import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { transform } from 'esbuild';

const [, , modulePath, migrationPath, exportName] = process.argv;

if (!modulePath || !migrationPath || !exportName) {
	console.error(
		'Usage: node scripts/generate-delivery-context-migration.mjs <context-module.ts> <migration.sql> <exportName>'
	);
	process.exit(1);
}

const src = readFileSync(modulePath, 'utf8');
const { code } = await transform(src, { loader: 'ts', format: 'esm' });
const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const ctx = mod[exportName];

if (!ctx || typeof ctx !== 'object') {
	console.error(`Export ${exportName} not found in ${modulePath}`);
	process.exit(1);
}

const { contextId, title, summary, source, updatedAt, ...workflow } = ctx;
const json = JSON.stringify(workflow, null, 2);
const esc = (value) => value.replace(/'/g, "''");
const sourceRef = relative(resolve('..', '..'), resolve(modulePath));

const sql = `-- Delivery engagement context seed — generated, do not hand-edit.
-- Source of truth before seeding: ${sourceRef}
-- Regenerate: node scripts/generate-delivery-context-migration.mjs ${modulePath} ${migrationPath} ${exportName}
-- Once this row exists, D1 wins and content edits happen here, not in the TS fallback.
-- Client-safe content only: no secrets, tokens, raw records, or contact data.

INSERT INTO canon_workflow_contexts (
  context_id,
  title,
  summary,
  workflow_json,
  visibility
) VALUES (
  '${esc(contextId)}',
  '${esc(title)}',
  '${esc(summary)}',
  '${esc(json)}',
  'public'
)
ON CONFLICT(context_id) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  workflow_json = excluded.workflow_json,
  visibility = excluded.visibility,
  updated_at = datetime('now');
`;

writeFileSync(migrationPath, sql);
console.log(`${migrationPath}: seeded ${contextId} (${json.length} bytes of workflow_json)`);
