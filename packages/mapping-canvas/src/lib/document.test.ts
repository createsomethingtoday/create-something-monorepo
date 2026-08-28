import { describe, expect, it } from 'vitest';
import { DOCUMENT_VERSION, commit, convert, createDocument, parse, redo, removeObjects, restoreConversion, serialize, undo, withObjects, type History, type Stroke } from './document';
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

  it('removes connectors that reference a restored conversion', () => {
    const source = withObjects(createDocument(), [{ id: 'a', kind: 'stroke', createdAt: 'now', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#fff', width: 2 }]);
    const converted = convert(source, ['a'], 'note');
    const note = converted.objects.at(-1)!;
    const linked = withObjects(converted, [...converted.objects, { id: 'link', kind: 'connector', createdAt: 'now', fromId: 'a', toId: note.id, label: '' }]);
    const restored = restoreConversion(linked, note.id);
    expect(restored.objects.some(({ id }) => id === 'link')).toBe(false);
    expect(parse(serialize(restored))).toEqual(restored);
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
  it('rejects malformed known objects before they reach rendering or persistence', () => {
    const source = createDocument();
    expect(() => parse(JSON.stringify({ ...source, objects: [{ id: 'bad', kind: 'stroke', createdAt: source.createdAt, color: '#fff', width: 3 }] }))).toThrow(/not a supported/);
  });
  it('removes connectors that reference an erased endpoint and repairs groups', () => {
    const source = withObjects(createDocument(), [stroke('a'), stroke('b', 100)]);
    const connected = convert(source, ['a', 'b'], 'connector');
    const grouped = convert(connected, ['a', 'b'], 'group');
    const result = removeObjects(grouped, ['a']);
    expect(result.objects.some(({ kind }) => kind === 'connector')).toBe(false);
    expect(result.objects.find(({ kind }) => kind === 'group')).toMatchObject({ childIds: ['b'] });
  });
  it('round trips arbitrarily nested operator conversion provenance', () => {
    let source = withObjects(createDocument(), [stroke('nested')]);
    let selected = 'nested';
    for (let index = 0; index < 4; index += 1) {
      source = convert(source, [selected], 'note');
      selected = source.objects.at(-1)!.id;
    }
    expect(parse(serialize(source))).toEqual(source);
  });
});
