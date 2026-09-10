import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const canvas = readFileSync('src/routes/+page.svelte', 'utf8');
const motion = readFileSync('src/routes/animate/+page.svelte', 'utf8');
const motionStorage = readFileSync('src/lib/animation/storage.ts', 'utf8');
const projectStorage = readFileSync('src/lib/project-storage.ts', 'utf8');
const persistence = readFileSync('src/lib/persistence.ts', 'utf8');

it('navigates between Canvas and Motion using the same project identity', () => {
  expect(canvas).toContain('href={`/animate?project=${encodeURIComponent(document.id)}`}');
  expect(canvas).toContain('await persistCurrentDocument(document)');
  expect(canvas).toContain("if (!ready) { status = 'Canvas is still loading'; return; }");
  expect(canvas).toContain(
    "if (sharing || replacingDocument) { status = 'Wait for sharing or document replacement to finish before opening Motion'; return; }"
  );
  expect(canvas).toContain(
    'parsed.id === previous.id ? { ...parsed, updatedAt: mintReplacementTimestamp(previous.updatedAt) } : { ...parsed, id: crypto.randomUUID()'
  );
  expect(canvas).toContain('await loadDocument(next.id)');
  expect(canvas).toContain('persistedCanvasVersions.get(next.id)');
  expect(canvas).toContain('await activateCanvasProject(saved.id)');
  expect(motion).toContain('href={`/?project=${encodeURIComponent(project.id)}`}');
  expect(motion).toContain('await queue;');
  expect(motion).toContain('await importQueue;');
  expect(motion).toContain('importQueue = work.catch(() => {});');
  expect(motion).toContain('queueImport(() => importFile(e))');
  expect(motion).toContain('queueImport(() => imageFile(e))');
  expect(motion).toContain("status = 'Animation is still loading'");
  expect(motion).toContain('queue = loading.catch(() => {});');
  expect(motion.match(/queue = work\.catch\(\(\) => \{\}\);/g)).toHaveLength(4);
  expect(motion).not.toContain('Copy saved drawing');
  expect(motion).toContain("current.source?.space === 'canvas'");
  expect(persistence.indexOf('const legacy = await loadLegacyDocument()')).toBeLessThan(
    persistence.indexOf('if (record?.motion)')
  );
});

it('guards Motion synchronization with the loaded Canvas version and makes migration idempotent', () => {
  expect(motionStorage).toContain('loadedCanvasVersions.set(id, record.canvas.updatedAt)');
  expect(motionStorage).toContain('record.motion?.revision ?? null');
  expect(motionStorage).toContain('record.canvas.updatedAt');
  expect(motionStorage).toContain('for (let attempt = 0; attempt < 3; attempt++)');
  expect(motionStorage).toContain('if ((await loadProjectRecord(project.id))?.motion) break;');
  expect(motionStorage).toContain('const activeMigration = (async () => {');
  expect(motionStorage).toContain('existing?.canvas?.updatedAt ?? null');
  expect(motionStorage).toContain('if (attempt === 2) throw lastError;');
  expect(motionStorage).toContain('if (migration === activeMigration) migration = undefined;');
  expect(projectStorage).toContain(
    '(current?.canvas?.updatedAt ?? null) !== expectedCanvasUpdatedAt'
  );
  expect(projectStorage).toContain("conflict = 'canvas'");
});
