import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8');

describe('view-only Draw snapshot', () => {
  it('requires confirmation before replacing an existing local canvas', () => {
    expect(page).toContain("import { loadDocument, saveDocument } from '$lib/persistence';");
    expect(page).toContain('const existing = await loadDocument();');
    expect(page).toContain('if (existing && !confirm(`Replace your local canvas');
    expect(page.indexOf('const existing = await loadDocument();')).toBeLessThan(page.indexOf('await saveDocument('));
  });
});
