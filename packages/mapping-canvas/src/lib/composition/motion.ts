import { expand, parseDocument, serialize, type Document, type State } from './model';
export type Beat = {
  time: number;
  target: string;
  zoom: number;
  state: State;
  caption: string;
  reason: string;
};
export type Sequence = { id: 'context' | 'detail'; duration: number; beats: Beat[] };
export function sequences(d: Document): Sequence[] {
  const root = expand(d)[0].instanceId;
  const field = expand(d).find(
    (n) => n.kind === 'component' && n.ref === 'component.form-text-area'
  )!.instanceId;
  return [
    {
      id: 'context',
      duration: 18,
      beats: [
        {
          time: 0,
          target: root,
          zoom: 1,
          state: 'recovered',
          caption: 'A clear result. Your details stay with you.',
          reason: 'Establish the useful outcome.'
        },
        {
          time: 4,
          target: root,
          zoom: 1,
          state: 'empty',
          caption: 'Start with one change you want to make.',
          reason: 'Return to the input in the same place.'
        },
        {
          time: 8,
          target: root,
          zoom: 1,
          state: 'error',
          caption: 'A failed attempt should not erase your work.',
          reason: 'Keep the whole form and recovery action in view.'
        },
        {
          time: 13,
          target: root,
          zoom: 1,
          state: 'recovered',
          caption: 'Try again. Continue with the same context.',
          reason: 'Show the result without replacing the content.'
        }
      ]
    },
    {
      id: 'detail',
      duration: 18,
      beats: [
        {
          time: 0,
          target: root,
          zoom: 1,
          state: 'recovered',
          caption: 'Recovery is part of the design.',
          reason: 'Show the outcome before unpacking it.'
        },
        {
          time: 4,
          target: field,
          zoom: 1.15,
          state: 'invalid',
          caption: 'Name the missing detail beside the field.',
          reason: 'Make the field-level validation easier to inspect.'
        },
        {
          time: 8,
          target: root,
          zoom: 1,
          state: 'error',
          caption: 'Keep the request. Explain the next action.',
          reason: 'Restore context around the retained values.'
        },
        {
          time: 13,
          target: root,
          zoom: 1,
          state: 'recovered',
          caption: 'One composition. A different explanation.',
          reason: 'Reconnect the detail to the complete result.'
        }
      ]
    }
  ];
}
export function validateSequence(s: Sequence, d: Document): Sequence {
  const ids = new Set(expand(d).map((n) => n.instanceId));
  if (
    !['context', 'detail'].includes(s.id) ||
    !Number.isFinite(s.duration) ||
    s.duration < 1 ||
    s.duration > 60 ||
    !Array.isArray(s.beats) ||
    s.beats.length < 1 ||
    s.beats.length > 12
  )
    throw Error('Invalid sequence.');
  let last = -1;
  for (const b of s.beats) {
    if (
      !Number.isFinite(b.time) ||
      b.time <= last ||
      b.time < 0 ||
      b.time >= s.duration ||
      !ids.has(b.target) ||
      !Number.isFinite(b.zoom) ||
      b.zoom < 1 ||
      b.zoom > 1.2 ||
      !['empty', 'invalid', 'error', 'recovered'].includes(b.state) ||
      typeof b.caption !== 'string' ||
      b.caption.length > 140 ||
      typeof b.reason !== 'string' ||
      b.reason.length > 180
    )
      throw Error('Invalid camera target, cue, or timing.');
    last = b.time;
  }
  if (s.beats[0].time !== 0) throw Error('Sequence must start at zero.');
  return s;
}
export function beatAt(s: Sequence, time: number): Beat {
  return [...s.beats].reverse().find((b) => b.time <= time) || s.beats[0];
}
export async function digest(text: string) {
  const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(data), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function handoff(d: Document) {
  const composition = parseDocument(serialize(d));
  return {
    version: 'draw.render-handoff.v1',
    renderer: { id: 'canon-svelte-dom', version: 1, width: 1200, height: 900, fps: 30 },
    composition,
    compositionSha256: await digest(serialize(composition)),
    sequences: sequences(composition),
    hyperframes: { status: 'snapshot-adapter-v1' },
    authenticity: 'Scripted local fixture; no request is sent.'
  };
}
export async function parseHandoff(text: string) {
  if (text.length > 60000) throw Error('Handoff too large.');
  const h = JSON.parse(text);
  if (
    h.version !== 'draw.render-handoff.v1' ||
    JSON.stringify(h.renderer) !==
      JSON.stringify({ id: 'canon-svelte-dom', version: 1, width: 1200, height: 900, fps: 30 }) ||
    !['adapter-not-implemented', 'snapshot-adapter-v1'].includes(h.hyperframes?.status)
  )
    throw Error('Unsupported renderer handoff.');
  const d = parseDocument(JSON.stringify(h.composition));
  if (h.compositionSha256 !== (await digest(serialize(d))))
    throw Error('Composition digest mismatch.');
  if (
    !Array.isArray(h.sequences) ||
    h.sequences.length !== 2 ||
    new Set(h.sequences.map((s: Sequence) => s.id)).size !== 2
  )
    throw Error('Expected two sequences.');
  h.sequences.forEach((s: Sequence) => validateSequence(s, d));
  return h;
}
