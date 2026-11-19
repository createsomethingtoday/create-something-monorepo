import type { CanvasDocument } from './document';
import { isLayerLocked, visibleObjects } from './editing';
import { drawRevision } from './webmcp';

export type FocusedRevision = {
  documentId: string;
  baseRevision: string;
  selectedIds: string[];
  find: string;
  replacement: string;
  affected: Array<{ id: string; name: string; before: string; after: string }>;
  excluded: Array<{ id: string; reason: string }>;
  unchangedSelectedIds: string[];
};

export class FocusedRevisionInputError extends Error {
  constructor(message: string, readonly field: 'find' | 'replacement') { super(message); this.name = 'FocusedRevisionInputError'; }
}

/** Highlight only substituted occurrences, including literal replacement strings such as $&. */
export function focusedRevisionDiff(before: string, find: string, replacement: string) {
  if (!find.length) throw new FocusedRevisionInputError('Enter exact text to find.', 'find');
  const pieces = before.split(find);
  const original: Array<{ text: string; changed: boolean }> = [], proposed: Array<{ text: string; changed: boolean }> = [];
  pieces.forEach((text, index) => {
    if (index) { original.push({ text: find, changed: true }); proposed.push({ text: replacement, changed: true }); }
    if (text) { original.push({ text, changed: false }); proposed.push({ text, changed: false }); }
  });
  return { original, proposed, count: pieces.length - 1 };
}

/** Local prototype contract: literal text only, no model/network and no draft mutation. */
export function prepareFocusedRevision(document: CanvasDocument, selectedIds: string[], find: string, replacement: string): FocusedRevision {
  if (new TextEncoder().encode(JSON.stringify(document)).byteLength > 1024 * 1024) throw new Error('This local prototype supports canvases up to 1 MiB so targeted Undo can be retained.');
  if (!selectedIds.length || selectedIds.length > 100 || new Set(selectedIds).size !== selectedIds.length) throw new Error('Select 1–100 individual elements first.');
  if (!find.length || find.length > 500) throw new FocusedRevisionInputError('Find text must contain 1–500 characters.', 'find');
  if (replacement.length > 1000) throw new FocusedRevisionInputError('Replacement supports at most 1,000 characters.', 'replacement');
  if (find === replacement) throw new FocusedRevisionInputError('Replacement must differ from Find text.', 'replacement');
  const objects = new Map(document.objects.map(object => [object.id, object]));
  if (selectedIds.some(id => !objects.has(id))) throw new Error('The selection changed. Select the notes again.');
  if (selectedIds.some(id => objects.get(id)?.kind === 'group')) throw new Error('Select individual plain notes rather than a group. Group descendants are not revised by this prototype.');
  const visible = new Set(visibleObjects(document).map(object => object.id));
  const affected: FocusedRevision['affected'] = [], excluded: FocusedRevision['excluded'] = [], unchangedSelectedIds: string[] = [];
  for (const id of selectedIds) {
    const object = objects.get(id)!;
    const reason = !visible.has(id) ? 'Hidden element preserved' : isLayerLocked(document, id) ? 'Locked element preserved' : object.kind !== 'note' ? 'Non-note annotation/artwork preserved' : object.content ? 'Structured note preserved; plain notes only' : undefined;
    if (reason) { excluded.push({ id, reason }); continue; }
    if (object.kind !== 'note') continue;
    if (!object.text.includes(find)) { unchangedSelectedIds.push(id); continue; }
    const after = object.text.split(find).join(replacement);
    if (after.length > 4000) throw new FocusedRevisionInputError(`Replacement in ${id} exceeds the prototype's 4,000-character note limit.`, 'replacement');
    affected.push({ id, name: object.name || object.text.split('\n')[0].slice(0, 80) || 'Untitled note', before: object.text, after });
  }
  if (!affected.length) throw new FocusedRevisionInputError('No selected editable plain note contains that exact text. Artwork, locked and structured notes are preserved.', 'find');
  if (affected.length > 20) throw new Error('Select at most 20 matching plain notes for one revision.');
  return { documentId: document.id, baseRevision: drawRevision(document), selectedIds: [...selectedIds], find, replacement, affected, excluded, unchangedSelectedIds };
}

export function focusedRevisionIsCurrent(proposal: FocusedRevision, document: CanvasDocument, selectedIds: string[]) {
  return proposal.documentId === document.id && proposal.baseRevision === drawRevision(document) && JSON.stringify([...proposal.selectedIds].sort()) === JSON.stringify([...selectedIds].sort());
}

/** Revalidate exact scope at the UI boundary; the existing tool rechecks its revision inside the mutation queue. */
export function focusedRevisionPatch(proposal: FocusedRevision, document: CanvasDocument, selectedIds: string[]) {
  if (!focusedRevisionIsCurrent(proposal, document, selectedIds)) throw new Error('Canvas or selection changed. Preview the revision again; nothing was applied.');
  const recomputed = prepareFocusedRevision(document, proposal.selectedIds, proposal.find, proposal.replacement);
  if (JSON.stringify(recomputed) !== JSON.stringify(proposal)) throw new Error('The proposal changed. Preview the revision again; nothing was applied.');
  return { expectedRevision: proposal.baseRevision, patches: proposal.affected.map(({ id, after }) => ({ id, text: after })) };
}
