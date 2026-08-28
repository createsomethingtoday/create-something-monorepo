import { describe, expect, it } from 'vitest';
import { DOCUMENT_VERSION, commit, convert, createDocument, parse, redo, restoreConversion, serialize, undo, withObjects, type History, type Stroke } from './document';
const stroke = (id: string, x = 10): Stroke => ({ id, kind: 'stroke', createdAt: '2026-08-27T00:00:00Z', points: [{ x, y: 20 }, { x: x + 40, y: 60 }], color: '#f7f4ee', width: 3 });
describe('mapping canvas contract', () => {
  it('creates a versioned document', () => expect(createDocument().version).toBe(DOCUMENT_VERSION));
  it('preserves source when converting ink to a note', () => {
    const source = withObjects(createDocument(), [stroke('a')]);
    const note = convert(source, ['a'], 'note').objects.at(-1)!;
    expect(note).toMatchObject({ kind: 'note', sourceIds: ['a'] });
    expect(note.sourceSnapshot?.[0]).toMatchObject({ id: 'a', kind: 'stroke' });
  });
  it('converts proxy-backed UI state into a portable source snapshot', () => {
    const proxied = new Proxy(stroke('proxy-source'), {});
    const source = withObjects(createDocument(), [proxied]);
    expect(convert(source, ['proxy-source'], 'note').objects.at(-1)?.sourceSnapshot?.[0]).toMatchObject({ id: 'proxy-source', kind: 'stroke' });
  });
  it('requires two objects for connectors', () => {
    const source = withObjects(createDocument(), [stroke('a'), stroke('b', 100)]);
    expect(convert(source, ['a'], 'connector')).toBe(source);
    expect(convert(source, ['a', 'b'], 'connector').objects.at(-1)).toMatchObject({ kind: 'connector', fromId: 'a', toId: 'b' });
  });
  it('restores a removed preserved source', () => {
    const source = withObjects(createDocument(), [stroke('a')]);
    const converted = convert(source, ['a'], 'group');
    const group = converted.objects.at(-1)!;
    const withoutInk = withObjects(converted, converted.objects.filter(({ id }) => id !== 'a'));
    expect(restoreConversion(withoutInk, group.id).objects.map(({ id }) => id)).toContain('a');
  });
  it('undoes and redoes committed states', () => {
    const first = createDocument(), second = withObjects(first, [stroke('a')]);
    const history: History = commit({ past: [], present: first, future: [] }, second);
    expect(undo(history).present.objects).toHaveLength(0);
    expect(redo(undo(history)).present.objects).toHaveLength(1);
  });
  it('round trips supported JSON and rejects unrelated input', () => {
    const source = withObjects(createDocument(), [stroke('a')]);
    expect(parse(serialize(source))).toEqual(source);
    expect(() => parse('{"hello":"world"}')).toThrow(/not a supported/);
  });
});
