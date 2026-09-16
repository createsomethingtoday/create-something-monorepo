import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./s/[shareId]/+page.svelte', import.meta.url), 'utf8');

describe('Draw share page', () => {
  it('keeps managed-link ownership with the retained source project', () => {
    expect(page).not.toContain('localStorage.setItem');
    expect(page).not.toContain('localStorage.removeItem');
    expect(page).toContain('return next.id;');
    expect(page).toContain('location.href = `/?project=${encodeURIComponent(projectId)}`');
    expect(page).toContain("const DRAW_DOCUMENT_LOCK = 'draw-active-document'");
    expect(page).toContain('navigator.locks.request(DRAW_DOCUMENT_LOCK, replace)');
    expect(page).toContain('fill={document.background}');
    expect(page).toContain('style:background={document.background}');
  });
});
