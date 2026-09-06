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

  it('keeps formatting changes undoable and preserves managed shares across imports', () => {
    expect(page).toContain("apply(withObjects(document, document.objects.map((entry) => entry.id === note.id ? changed : entry)), { type: 'put_object', object: changed });");
    expect(page).toContain('const previousDocumentId = history.present.id, managed = currentManagedShare();');
    expect(page).toContain('if (managed) rememberShare(managed, committed.id, previousDocumentId); else restoreManagedShare(committed.id);');
  });

  it('revokes a newly published snapshot when its capability cannot be persisted', () => {
    expect(page).toContain('async function retainPublishedShare(candidate: ManagedShare)');
    expect(page).toContain("if (rememberShare(candidate)) return;");
    expect(page).toContain("method: 'DELETE', headers: { Authorization: `Bearer ${candidate.token}` }");
    expect(page).toContain('await retainPublishedShare(candidate);');
  });

  it('coordinates publishing and management state across browser tabs', () => {
    expect(page).toContain('const snapshot = structuredClone(document), documentId = snapshot.id;');
    expect(page).toContain("if (document.id !== documentId) throw new Error('The canvas changed while waiting to publish. Review it and try again.')");
    expect(page).toContain('navigator.locks.request(`draw-share-publish:${documentId}`, run)');
    expect(page).toContain("window.addEventListener('storage', storage)");
    expect(page).toContain('restoreManagedShare(documentId);');
    expect(page).toContain("if (sharing || replacingDocument) throw new Error('Wait for the active snapshot or document replacement to finish.')");
    expect(page).toContain('if (replacingDocument || agentMutationActive) throw new Error');
    expect(page).toContain('replacingDocument = true;');
    expect(page).toContain('finally { replacingDocument = false;');
  });
});
