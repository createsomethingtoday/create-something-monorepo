import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8');

describe('Draw WebMCP page integration', () => {
  it('serializes camera focus with document mutations', () => {
    expect(page).toContain('focus: (target) => queueAgentMutation(() => focusAgentCamera(target))');
  });

  it('does not persist an already focused viewport', () => {
    expect(page).toContain('if (next.x === viewport.x && next.y === viewport.y && next.zoom === viewport.zoom) return');
    expect(page.indexOf('if (next.x === viewport.x')).toBeLessThan(page.indexOf('updateViewport(next, false);'));
  });

  it('uses shared indexes for focus and connector rendering', () => {
    expect(page).toContain('const objectIndex = $derived(new Map(document.objects.map((object) => [object.id, object])))');
    expect(page).toContain('const objects = ids?.map((id) => objectIndex.get(id))');
    expect(page).toContain('const from = objectIndex.get(object.fromId), to = objectIndex.get(object.toId)');
    expect(page).toContain('{@const from = objectIndex.get(object.fromId)}{@const to = objectIndex.get(object.toId)}');
  });
});
