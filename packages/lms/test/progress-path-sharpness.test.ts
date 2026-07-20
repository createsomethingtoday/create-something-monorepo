import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../../../', import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, root), 'utf8');
}

test('learn-progress is registered as one migrated tool cohort', async () => {
  const registry = await source('config/performance-pages/registry.ts');
  const group = registry.match(/'learn-progress',[\s\S]*?\n\s*\)/)?.[0] ?? '';

  assert.match(group, /'lms',[\s\S]*?\['progress'\],[\s\S]*?'migrated'/);
  assert.match(group, /'tool'/);
  assert.match(group, /next incomplete objective/i);
});

test('the route exposes three non-overlapping tool chapters under the layout main', async () => {
  const page = await source('packages/lms/src/routes/progress/+page.svelte');

  assert.equal((page.match(/data-performance-chapter=/g) ?? []).length, 3);
  assert.match(page, /data-performance-chapter="task-state"/);
  assert.match(page, /data-performance-chapter="workspace"/);
  assert.match(page, /data-performance-chapter="decision-receipt"/);
  assert.doesNotMatch(page, /<main(?:\s|>)/);
  assert.doesNotMatch(page, /\bthe page\b/i);
});

test('a new learner starts the first real lesson without duplicate start choices', async () => {
  const { buildProgressView } = await import('../src/lib/progress/view.ts');
  const { PATHS } = await import('../src/lib/content/paths.ts');
  const page = await source('packages/lms/src/routes/progress/+page.svelte');

  const view = buildProgressView(
    PATHS,
    [
      {
        pathId: 'codex-mcp',
        status: 'not_started',
        lessonsCompleted: 0,
        totalLessons: 6,
        currentLesson: null
      },
      {
        pathId: 'make-your-workflow-visible',
        status: 'not_started',
        lessonsCompleted: 0,
        totalLessons: 5,
        currentLesson: null
      }
    ],
    { lessonsCompleted: 0, totalLessons: 11 }
  );

  assert.equal(view.state, 'new');
  assert.equal(view.href, '/paths/codex-mcp/what-is-codex-and-mcp');
  assert.match(view.label, /What Codex Uses MCP For/);
  assert.doesNotMatch(page, /buildPathAction/);
  assert.doesNotMatch(page, /class="path-action"/);
});

test('an active learner resumes the named current lesson directly', async () => {
  const { buildProgressView } = await import('../src/lib/progress/view.ts');
  const { PATHS } = await import('../src/lib/content/paths.ts');

  const view = buildProgressView(
    PATHS,
    [
      {
        pathId: 'codex-mcp',
        status: 'in_progress',
        lessonsCompleted: 2,
        totalLessons: 6,
        currentLesson: 'add-your-first-tool'
      }
    ],
    { lessonsCompleted: 2, totalLessons: 11 },
    [
      { pathId: 'codex-mcp', lessonId: 'what-is-codex-and-mcp', status: 'completed' },
      { pathId: 'codex-mcp', lessonId: 'scaffold-an-mcp-server', status: 'completed' }
    ]
  );

  assert.equal(view.state, 'resume');
  assert.equal(view.href, '/paths/codex-mcp/add-your-first-tool');
  assert.match(view.label, /Add a Business Search Tool/);
  assert.doesNotMatch(view.label, /add-your-first-tool/);
});

test('a completed learner receives an earned course-list handoff', async () => {
  const { buildProgressView } = await import('../src/lib/progress/view.ts');
  const { PATHS } = await import('../src/lib/content/paths.ts');

  const view = buildProgressView(PATHS, [], { lessonsCompleted: 11, totalLessons: 11 });

  assert.equal(view.state, 'complete');
  assert.equal(view.href, '/paths');
  assert.match(view.label, /review|practice|path/i);
});

test('loading, failure, no-JavaScript, refresh, and preserved evidence remain explicit', async () => {
  const page = await source('packages/lms/src/routes/progress/+page.svelte');
  const store = await source('packages/lms/src/lib/stores/progress.ts');

  assert.match(page, /\$progress\.loading/);
  assert.match(page, /\$progress\.error/);
  assert.match(page, /<noscript>/);
  assert.match(page, /progress\.fetch\(\)/);
  assert.match(page, /PATHS/);
  assert.match(page, /overallProgress/);
  assert.match(page, /formatTime/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /class="progress-page/);
  assert.match(page, /--color-fg-primary:\s*#1a1a1a/);
  assert.match(store, /lastUpdatedAt/);
});
