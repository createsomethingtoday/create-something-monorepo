import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function reviewPacket(file, subjectId, ids) {
  if (ids.length < 1 || ids.length > 8 || new Set([subjectId, ...ids]).size !== ids.length + 1) {
    throw new Error('Choose one subject and 1–8 distinct candidate IDs');
  }
  const state = JSON.parse(readFileSync(file, 'utf8'));
  if (state.schema !== 'substrate-learned-vocabulary/v1') throw new Error('Unsupported vocabulary state');
  const project = id => {
    const type = state.types.find(item => item.id === id);
    if (!type) throw new Error('Unknown vocabulary ID: ' + id);
    const evidence = type.evidence[0];
    const prefix = evidence?.source + ': ';
    const raw = evidence?.excerpt ?? '';
    const excerpt = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
    return {id, name: type.name, description: type.description.slice(0, 300), excerpt: excerpt.slice(0, 220)};
  };
  return {subject: project(subjectId), candidates: ids.map(project)};
}

export async function shadowReview(file, subjectId, ids, provider, rank) {
  const packet = reviewPacket(file, subjectId, ids);
  const hash = createHash('sha256').update(JSON.stringify(packet)).digest('hex');
  if (!provider) return {status: 'preview', hash, packet};
  if (!['openai', 'jev'].includes(provider)) throw new Error('Choose provider openai or jev');
  const {choice, model} = await rank(packet, {provider});
  const fresh = reviewPacket(file, subjectId, ids);
  if (JSON.stringify(packet) !== JSON.stringify(fresh)) throw new Error('Vocabulary changed during review; regenerate the preview');
  return {status: 'advisory', provider, model, choice, hash, packet};
}
