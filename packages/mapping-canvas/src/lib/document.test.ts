import { describe, expect, it } from 'vitest';
import { DOCUMENT_VERSION, commit, convert, createDocument, objectBounds, parse, redo, removeObjects, resizeGroup, restoreConversion, serialize, undo, withObjects, type Connector, type History, type Stroke } from './document';
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
  it('does not restore preserved connectors whose endpoint was erased', () => {
    const source = withObjects(createDocument(), [stroke('a'), stroke('b', 100)]);
    const connected = convert(source, ['a', 'b'], 'connector');
    const connector = connected.objects.at(-1)!;
    const converted = convert(connected, [connector.id], 'note');
    const note = converted.objects.at(-1)!;
    const endpointRemoved = removeObjects(converted, ['a']);
    const restored = restoreConversion(endpointRemoved, note.id);
    expect(restored.objects.some(({ id }) => id === connector.id)).toBe(false);
    expect(parse(serialize(restored))).toEqual(restored);
  });
  it('rejects cyclic connector graphs', () => {
    const source = createDocument();
    const cycle: Connector = { id: 'cycle', kind: 'connector', createdAt: 'now', fromId: 'cycle', toId: 'cycle', label: '' };
    expect(() => parse(JSON.stringify({ ...source, objects: [cycle] }))).toThrow(/not a supported/);
  });
  it('derives connector conversion bounds from its endpoints', () => {
    const source = withObjects(createDocument(), [stroke('a', 700), stroke('b', 900)]);
    const connected = convert(source, ['a', 'b'], 'connector');
    const connector = connected.objects.at(-1)!;
    expect(objectBounds([connector], connected.objects).x).toBeGreaterThanOrEqual(700);
    expect(convert(connected, [connector.id], 'note').objects.at(-1)).toMatchObject({ kind: 'note', x: 700 });
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
  it('resizes a group and its contained elements as one unit', () => {
    const source = withObjects(createDocument(), [
      { id: 'note', kind: 'note', createdAt: 'now', x: 20, y: 30, width: 40, height: 20, text: 'Together' },
      { id: 'shape', kind: 'rectangle', createdAt: 'now', from: { x: 60, y: 50 }, to: { x: 90, y: 80 }, color: '#fff' },
      { id: 'group', kind: 'group', createdAt: 'now', x: 10, y: 20, width: 100, height: 80, label: 'Working group', childIds: ['note', 'shape'] }
    ]);
    const resized = resizeGroup(source, 'group', 200, 160);
    expect(resized.objects.find(({ id }) => id === 'group')).toMatchObject({ width: 200, height: 160 });
    expect(resized.objects.find(({ id }) => id === 'note')).toMatchObject({ x: 30, y: 40, width: 80, height: 40 });
    expect(resized.objects.find(({ id }) => id === 'shape')).toMatchObject({ from: { x: 110, y: 80 }, to: { x: 170, y: 140 } });
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
