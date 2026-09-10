import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const canvas = readFileSync('src/routes/+page.svelte', 'utf8');
const motion = readFileSync('src/routes/animate/+page.svelte', 'utf8');

it('navigates between Canvas and Motion using the same project identity', () => {
  expect(canvas).toContain('href={`/animate?project=${document.id}`}');
  expect(canvas).toContain('await saveDocument(document)');
  expect(canvas).toContain('await activateCanvasProject(saved.id)');
  expect(motion).toContain('href={`/?project=${project.id}`}');
  expect(motion).toContain('await queue;');
  expect(motion).not.toContain('Copy saved drawing');
});
