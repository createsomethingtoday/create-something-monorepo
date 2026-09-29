import generated from './catalog.generated.json';
import { loadLesson } from '$lib/content/lessons';
import { loadReferenceLesson } from '$lib/content/reference';
import type { FoundationCatalog, FoundationEntry } from './core';

export const catalog = generated as FoundationCatalog;
export async function loadFoundationContent(entry: FoundationEntry): Promise<string> {
  // IDs are accepted only after an exact match against the generated public allowlist.
  const [corpus, group, lesson] = entry.id.split('/');
  if (corpus === 'original') return loadLesson(group, lesson);
  const content = await loadReferenceLesson(group, lesson);
  if (content === null) throw new Error('Published reference content is unavailable.');
  return content;
}
