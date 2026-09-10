import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const canvas = readFileSync('src/routes/+page.svelte', 'utf8');
const motion = readFileSync('src/routes/animate/+page.svelte', 'utf8');
const motionStorage = readFileSync('src/lib/animation/storage.ts', 'utf8');
const projectStorage = readFileSync('src/lib/project-storage.ts', 'utf8');

it('navigates between Canvas and Motion using the same project identity', () => {
  expect(canvas).toContain('href={`/animate?project=${encodeURIComponent(document.id)}`}');
  expect(canvas).toContain('await persistCurrentDocument(document)');
  expect(canvas).toContain("if (!ready) { status = 'Canvas is still loading'; return; }");
  expect(canvas).toContain('await loadDocument(next.id)');
  expect(canvas).toContain('persistedCanvasVersions.get(next.id)');
  expect(canvas).toContain('await activateCanvasProject(saved.id)');
  expect(motion).toContain('href={`/?project=${encodeURIComponent(project.id)}`}');
  expect(motion).toContain('await queue;');
  expect(motion).toContain("status = 'Animation is still loading'");
  expect(motion).toContain('queue = loading.catch(() => {});');
  expect(motion.match(/queue = work\.catch\(\(\) => \{\}\);/g)).toHaveLength(4);
  expect(motion).not.toContain('Copy saved drawing');
});

it('guards Motion synchronization with the loaded Canvas version and makes migration idempotent', () => {
  expect(motionStorage).toContain('loadedCanvasVersions.set(id, record.canvas.updatedAt)');
  expect(motionStorage).toContain('record.motion?.revision ?? null, record.canvas.updatedAt');
  expect(motionStorage).toContain(
    'if (!(await loadProjectRecord(project.id))?.motion) throw error;'
  );
  expect(projectStorage).toContain(
    '(current?.canvas?.updatedAt ?? null) !== expectedCanvasUpdatedAt'
  );
  expect(projectStorage).toContain("conflict = 'canvas'");
});
