import assert from 'node:assert/strict';
import test from 'node:test';

import { collectIoPaperCycleContext } from '../io-paper-cycle-context.mjs';

test('shared IO footer files are publishable and verify both handoff modes', () => {
  for (const file of [
    'packages/io/src/routes/+layout.svelte',
    'packages/io/src/lib/config/footerHandoff.ts',
  ]) {
    const context = collectIoPaperCycleContext([file]);

    assert.equal(context.has_publishable_io_changes, true);
    assert.ok(context.publishable_io_files.includes(file));
    assert.ok(context.verification_routes.includes('/'));
    assert.ok(context.verification_routes.includes('/papers/endpoint-construction-product'));
    assert.ok(context.verification_routes.some((route) => route.startsWith('/experiments/')));
  }
});
