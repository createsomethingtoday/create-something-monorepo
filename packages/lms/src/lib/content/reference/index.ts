import { REFERENCE_CATALOG, REFERENCE_REVISION } from './catalog.generated';

export { REFERENCE_CATALOG, REFERENCE_REVISION };

const documents = import.meta.glob('./phases/*/*/en.md', {
  query: '?raw',
  import: 'default'
}) as Record<string, () => Promise<string>>;

export const REFERENCE_PHASES = [...new Set(REFERENCE_CATALOG.map((item) => item.phase))].map(
  (id) => ({
    id,
    title: id.replace(/^\d+-/, '').replaceAll('-', ' '),
    count: REFERENCE_CATALOG.filter((item) => item.phase === id).length
  })
);

export function getReferenceLesson(phase: string, lesson: string) {
  return REFERENCE_CATALOG.find((item) => item.phase === phase && item.lesson === lesson);
}

export async function loadReferenceLesson(phase: string, lesson: string): Promise<string | null> {
  const loader = documents[`./phases/${phase}/${lesson}/en.md`];
  return loader ? loader() : null;
}

export function referenceSourceUrl(phase: string, lesson: string, suffix = 'docs/en.md') {
  const view = suffix === 'code' ? 'tree' : 'blob';
  return `https://github.com/rohitg00/ai-engineering-from-scratch/${view}/${REFERENCE_REVISION}/phases/${phase}/${lesson}/${suffix}`;
}
