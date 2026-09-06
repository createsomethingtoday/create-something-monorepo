import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./s/[shareId]/+page.svelte', import.meta.url), 'utf8');

describe('Draw share page', () => {
  it('transfers managed-link ownership only after the copied canvas is durable', () => {
    expect(page).toContain('const oldKey = existing ? `draw-share:${existing.id}` : null');
    expect(page.indexOf('await saveDocument(next);')).toBeLessThan(page.indexOf('localStorage.setItem(nextKey, managed)'));
    expect(page).toContain('if (existing) await saveDocument(existing)');
    expect(page).toContain("const lockName = `draw-share-publish:${existing?.id ?? 'empty'}`");
    expect(page).toContain('navigator.locks.request(lockName, replace)');
  });
});
