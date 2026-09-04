import { describe, expect, it } from 'vitest';
import { DOCUMENT_VERSION, commit, convert, createDocument, createObjectCenterResolver, objectBounds, objectCenter, parse, redo, removeObjects, resizeGroup, restoreConversion, serialize, undo, withObjects, type CanvasObject, type Connector, type History, type Stroke } from './document';
const stroke = (id: string, x = 10): Stroke => ({ id, kind: 'stroke', createdAt: '2026-08-27T00:00:00Z', points: [{ x, y: 20 }, { x: x + 40, y: 60 }], color: '#f7f4ee', width: 3 });
describe('mapping canvas contract', () => {
  it('creates a versioned document', () => expect(createDocument().version).toBe(DOCUMENT_VERSION));
  it('rejects ambiguous duplicate object ids', () => {
    const document = createDocument();
    const object = { id: 'duplicate', kind: 'note' as const, createdAt: document.createdAt, x: 10, y: 10, width: 200, height: 100, text: 'One' };
    expect(() => parse(JSON.stringify({ ...document, objects: [object, { ...object, text: 'Two' }] }))).toThrow(/not a supported/);
  });
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
  it('migrates cyclic connector graphs without discarding the canvas', () => {
    const source = createDocument();
    const cycle: Connector = { id: 'cycle', kind: 'connector', createdAt: 'now', fromId: 'cycle', toId: 'cycle', label: '' };
    expect(parse(JSON.stringify({ ...source, objects: [cycle] })).objects).toEqual([]);
  });
  it('migrates connector self-loops and repairs legacy dangling group membership', () => {
    const source = createDocument(), endpoint = stroke('endpoint');
    const selfLoop: Connector = { id: 'self-loop', kind: 'connector', createdAt: 'now', fromId: endpoint.id, toId: endpoint.id, label: '' };
    expect(parse(JSON.stringify({ ...source, objects: [endpoint, selfLoop] })).objects).toEqual([endpoint]);
    const dangling = { id: 'dangling-group', kind: 'group', createdAt: 'now', x: 0, y: 0, width: 100, height: 80, label: '', childIds: ['missing'] };
    expect(parse(JSON.stringify({ ...source, objects: [dangling] })).objects).toEqual([{ ...dangling, childIds: [] }]);
  });
  it('derives connector conversion bounds from its endpoints', () => {
    const source = withObjects(createDocument(), [stroke('a', 700), stroke('b', 900)]);
    const connected = convert(source, ['a', 'b'], 'connector');
    const connector = connected.objects.at(-1)!;
    expect(objectBounds([connector], connected.objects).x).toBeGreaterThanOrEqual(700);
    expect(convert(connected, [connector.id], 'note').objects.at(-1)).toMatchObject({ kind: 'note', x: 700 });
  });
  it('resolves branching connector centers without exponential recomputation', () => {
    const objects: CanvasObject[] = [stroke('origin', 0), stroke('second', 100)];
    for (let index = 0; index < 45; index += 1) objects.push({ id: `edge-${index}`, kind: 'connector', createdAt: 'now', fromId: objects.at(-1)!.id, toId: objects.at(-2)!.id, label: '' });
    expect(objectCenter(objects.at(-1)!, objects)).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
  });
  it('reuses one connector index and center cache across a document pass', () => {
    const objects: CanvasObject[] = [stroke('origin', 0)];
    for (let index = 0; index < 900; index += 1) objects.push({ id: `chain-${index}`, kind: 'connector', createdAt: 'now', fromId: objects.at(-1)!.id, toId: 'origin', label: '' });
    const resolve = createObjectCenterResolver(objects), first = resolve(objects.at(-1)!);
    expect(resolve(objects.at(-1)!)).toBe(first);
    expect(objects.map(resolve)).toHaveLength(901);
  });
  it('computes bounds for strokes larger than the function argument limit', () => {
    const large: Stroke = { id: 'large', kind: 'stroke', createdAt: 'now', color: '#fff', width: 3, points: Array.from({ length: 200_000 }, (_, index) => ({ x: index, y: -index })) };
    expect(objectBounds([large])).toEqual({ x: 0, y: -199_999, width: 199_999, height: 199_999 });
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
  it('removes transitively dependent connector chains', () => {
    const source = withObjects(createDocument(), [
      stroke('a'),
      stroke('b', 100),
      { id: 'first-link', kind: 'connector', createdAt: 'now', fromId: 'a', toId: 'b', label: '' },
      { id: 'second-link', kind: 'connector', createdAt: 'now', fromId: 'first-link', toId: 'b', label: '' }
    ]);
    const result = removeObjects(source, ['a']);
    expect(result.objects.map(({ id }) => id)).toEqual(['b']);
    expect(parse(serialize(result))).toEqual(result);
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
