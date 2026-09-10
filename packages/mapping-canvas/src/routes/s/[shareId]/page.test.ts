import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8');

describe('view-only Draw snapshot', () => {
  it('creates an additive local project without moving source ownership', () => {
    expect(page).toContain("import { saveDocument } from '$lib/persistence';");
    expect(page).toContain('await saveDocument(next);');
    expect(page).not.toContain('Replace your local canvas');
    expect(page).not.toContain('draw-share:');
  });
});
