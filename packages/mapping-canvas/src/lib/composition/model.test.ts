import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceLock } from './model';
import { describe, it, expect } from 'vitest';
import { createDocument, expand, parseDocument, serialize, updateContent, validate } from './model';
import { handoff, parseHandoff, sequences, validateSequence, beatAt } from './motion';
const mutate = (fn: (d: any) => unknown) => {
  const d = createDocument();
  fn(d);
  return () => parseDocument(JSON.stringify(d));
};
describe('composition public contract', () => {
  it('edits props and round trips nested identities without copying Canon components', () => {
    const a = createDocument();
    const b = updateContent(a, { title: 'A clearer next step.' });
    expect(expand(b).map((n) => n.instanceId)).toEqual(expand(a).map((n) => n.instanceId));
    expect(parseDocument(serialize(b))).toEqual(b);
    expect(b.revision).toBe(1);
    expect(expand(b).filter((n) => n.kind === 'component')).toHaveLength(4);
  });
  it.each([
    ['unknown version', (d: any): unknown => (d.version = 'next')],
    ['unknown prop', (d: any): unknown => (d.content.css = 'red')],
    ['unknown variant', (d: any): unknown => (d.content.variant = 'custom')],
    ['empty title', (d: any): unknown => (d.content.title = ' ')],
    ['wrong source', (d: any): unknown => (d.source.revision = 'other')],
    ['unknown component', (d: any): unknown => (d.definitions.fields.children[0].ref = 'custom')],
    [
      'unknown field prop',
      (d: any): unknown => (d.definitions.fields.children[0].props.html = '<script>')
    ],
    [
      'wrong binding',
      (d: any): unknown => (d.definitions.fields.children[0].props.binding = 'brief')
    ],
    ['duplicate ID', (d: any): unknown => (d.definitions.fields.children[1].id = 'name')],
    ['missing slot', (d: any): unknown => delete d.root.slots.heading],
    ['unused slot', (d: any): unknown => (d.root.slots.other = d.root.slots.heading)],
    ['missing definition', (d: any): unknown => (d.root.definition = 'absent')],
    [
      'cycle',
      (d: any): unknown =>
        (d.definitions.fields.children = [
          { id: 'cycle', kind: 'use', definition: 'fields', slots: {} }
        ])
    ]
  ] as const)('rejects %s', (_, fn) => expect(mutate(fn)).toThrow());
  it('validates empty, whitespace and completed values', () => {
    expect(validate({ name: ' ', brief: '' })).toEqual({
      name: 'Enter your name.',
      brief: 'Describe one thing you want to improve.'
    });
    expect(validate({ name: 'Alex', brief: 'Keep details.' })).toEqual({ name: '', brief: '' });
  });
  it('rejects oversized input and invalid JSON', () => {
    expect(() => parseDocument(' '.repeat(40001))).toThrow();
    expect(() => parseDocument('{bad')).toThrow();
  });
});
describe('renderer handoff', () => {
  it('binds both camera sequences to the exact shared composition', async () => {
    const d = createDocument();
    const h = await handoff(d);
    expect((await parseHandoff(JSON.stringify(h))).composition).toEqual(d);
    expect(h.hyperframes.status).toBe('snapshot-adapter-v1');
    expect(h.sequences).toHaveLength(2);
    expect(h.sequences[0].beats[0].target).toBe(h.sequences[1].beats[0].target);
    expect(beatAt(h.sequences[1], 5).state).toBe('invalid');
  });
  it('detects content substitution', async () => {
    const h = await handoff(createDocument());
    h.composition.content.title = 'Changed';
    await expect(parseHandoff(JSON.stringify(h))).rejects.toThrow('digest');
  });
  it.each(['target', 'time', 'zoom', 'order', 'duration'] as const)(
    'rejects malformed %s',
    (kind) => {
      const d = createDocument(),
        s = sequences(d)[0];
      if (kind === 'target') s.beats[1].target = 'dangling';
      if (kind === 'time') s.beats[1].time = NaN;
      if (kind === 'zoom') s.beats[1].zoom = Infinity;
      if (kind === 'order') s.beats[1].time = 0;
      if (kind === 'duration') s.duration = -1;
      expect(() => validateSequence(s, d)).toThrow();
    }
  );
});

it('pins the real Canon, overlay and approved brand source bytes', () => {
  for (const [path, hash] of Object.entries(sourceLock.files)) {
    const bytes = readFileSync(new URL('../../../../../' + path, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
  }
});
