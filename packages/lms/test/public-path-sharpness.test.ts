import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { stripDuplicateLessonHeading } from '../src/lib/content/lessons/index.ts';
import { PATHS } from '../src/lib/content/paths.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');

test('classifies the complete public learning spine without claiming redirects as pages', () => {
  const index = group('learn-path-index');
  const paths = group('learn-paths');
  const redirects = group('learn-legacy-redirects');

  assert.equal(index?.status, 'migrated');
  assert.deepEqual(index?.sources, [source('paths')]);
  assert.equal(paths?.status, 'migrated');
  assert.deepEqual(paths?.sources, [source('paths/[id]'), source('paths/[id]/[lesson]')]);
  assert.equal(redirects?.status, 'technical-exclusion');
  assert.equal(redirects?.exclusion?.kind, 'redirect');
  assert.deepEqual(redirects?.sources, [source('seeing'), source('seeing/[lesson]')]);
});

test('keeps the chooser and path overview to opening plus one ordered collection', () => {
  const index = read(source('paths'));
  const path = read(source('paths/[id]'));

  assert.equal(count(index, 'paths-opening'), 1);
  assert.equal(count(index, 'paths-collection'), 1);
  assert.equal(count(path, 'path-opening'), 1);
  assert.equal(count(path, 'path-sequence'), 1);

  for (const learningPath of PATHS) {
    assert.ok(index.includes('PATHS'), `index lost ${learningPath.id}`);
    assert.ok(path.includes('path.lessons'), `path template lost ${learningPath.id} lessons`);
  }
});

test('owns section rhythm locally instead of inheriting the site-wide presentation spacing', () => {
  const index = read(source('paths'));
  const path = read(source('paths/[id]'));
  const lesson = read(source('paths/[id]/[lesson]'));

  assert.match(index, /\.paths-opening,\s*\.paths-collection\s*\{[^}]*padding:\s*0;/s);
  assert.match(path, /\.path-opening,\s*\.path-sequence\s*\{[^}]*padding:\s*0;/s);
  assert.match(lesson, /\.lesson-opening\s*\{[^}]*padding:\s*0;/s);
});

test('removes only a duplicated leading lesson heading from rendered Markdown', () => {
  const body = '<h1>What Codex Uses MCP For</h1>\n<h2>Outcome</h2>\n<p>Keep this.</p>';

  assert.equal(
    stripDuplicateLessonHeading(body, 'What Codex Uses MCP For'),
    '<h2>Outcome</h2>\n<p>Keep this.</p>'
  );
  assert.equal(stripDuplicateLessonHeading(body, 'Different title'), body);
  assert.equal(
    stripDuplicateLessonHeading('<h2>Outcome</h2><p>Keep this.</p>', 'Outcome'),
    '<h2>Outcome</h2><p>Keep this.</p>'
  );
});

test('renders every lesson as orientation, uninterrupted work, and one handoff', () => {
  const lesson = read(source('paths/[id]/[lesson]'));

  assert.equal(count(lesson, 'lesson-opening'), 1);
  assert.equal(count(lesson, 'lesson-content'), 1);
  assert.equal(count(lesson, 'lesson-handoff'), 1);
  assert.doesNotMatch(lesson, /class="lesson-nav"/);
  assert.doesNotMatch(lesson, /class="completion-section"/);
});

test('keeps anonymous lessons public without calling authenticated progress APIs', () => {
  const lesson = read(source('paths/[id]/[lesson]'));

  assert.match(lesson, /if \(!data\.user\) return/);
  assert.match(lesson, /Sign in to save progress/);
  assert.match(lesson, /Continue to next lesson/);
  assert.match(lesson, /Progress could not be saved/);
});

test('contains lesson tables and inline code inside the mobile reading surface', () => {
  const lesson = read(source('paths/[id]/[lesson]'));

  assert.match(lesson, /\.prose :global\(table\)[^{]*\{[^}]*table-layout:\s*fixed;/s);
  assert.match(
    lesson,
    /\.prose :global\(th\),\s*\.prose :global\(td\)[^{]*\{[^}]*overflow-wrap:\s*anywhere;/s
  );
  assert.match(lesson, /\.prose :global\(code\)[^{]*\{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(lesson, /\.prose :global\(pre code\)[^{]*\{[^}]*overflow-wrap:\s*normal;/s);
});

test('preserves all lessons, sequence destinations, and completion states', () => {
  const lesson = read(source('paths/[id]/[lesson]'));
  const overview = read(source('paths/[id]'));
  const lessonCount = PATHS.reduce((total, path) => total + path.lessons.length, 0);

  assert.equal(lessonCount, 11);
  for (const token of [
    'previousLesson',
    'nextLesson',
    'handleCompleteLesson',
    "status === 'completed'",
    'Complete & Continue',
    'View path overview',
    'All lessons'
  ]) {
    assert.ok(lesson.includes(token), `lesson template lost ${token}`);
  }
  assert.ok(overview.includes('path.lessons[0].id'));
  assert.ok(overview.includes('/paths/{path.id}/{lesson.id}'));
});

function group(id: string) {
  return performancePageRegistry.find((entry) => entry.id === id);
}

function source(route: string) {
  return `packages/lms/src/routes/${route}/+page.svelte`;
}

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}

function count(sourceText: string, className: string) {
  return (sourceText.match(new RegExp(`class="[^"]*\\b${className}\\b`, 'g')) ?? []).length;
}
