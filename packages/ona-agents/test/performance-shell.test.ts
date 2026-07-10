import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const agentsRoute = readFileSync(new URL('../src/routes/agents/+page.svelte', import.meta.url), 'utf8');

test('operator shell constrains shared Performance compositions to the mobile grid track', () => {
	assert.ok(agentsRoute.includes('grid-template-columns: minmax(0, 1fr);'));
	assert.ok(agentsRoute.includes('min-width: 0;'));
});
