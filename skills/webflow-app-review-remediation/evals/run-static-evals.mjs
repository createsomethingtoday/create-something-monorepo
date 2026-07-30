#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skill = resolve(here, '..');
const yaml = createRequire(import.meta.url)('yaml');
const read = (relativePath) => readFileSync(join(skill, relativePath), 'utf8');
const parse = (relativePath) => yaml.parse(read(relativePath));

const corpusFiles = [
  'SKILL.md',
  ...readdirSync(join(skill, 'checklists')).map((name) => `checklists/${name}`),
  ...readdirSync(join(skill, 'assets')).map((name) => `assets/${name}`)
];
const corpus = corpusFiles.map(read).join('\n').toLowerCase();

let passed = 0;
let failed = 0;
const rows = [];

function check(group, name, condition, detail = '') {
  condition ? passed++ : failed++;
  rows.push({ group, name, condition, detail });
}

const files = [
  'evals/quality.yml',
  'evals/rubric.yml',
  'evals/trigger-positive.yml',
  'evals/trigger-negative.yml'
];
const parsed = {};

for (const file of files) {
  try {
    parsed[file] = parse(file);
    check('yaml', file, true);
  } catch (error) {
    check('yaml', file, false, error instanceof Error ? error.message : String(error));
  }
}

if (failed === 0) {
  const quality = parsed['evals/quality.yml'].evals;
  const qualityIds = quality.map((entry) => entry.id);
  check('quality', 'case ids are unique', new Set(qualityIds).size === qualityIds.length);

  for (const entry of quality) {
    const grounded = `${corpus}\n${String(entry.input).toLowerCase()}`;
    check('quality', `case ${entry.id} has expected output`, Boolean(entry.expected_output));
    for (const assertion of entry.assertions) {
      check(
        'quality',
        `case ${entry.id} assertion type ${assertion.type}`,
        assertion.type === 'contains' || assertion.type === 'not_contains'
      );
      if (assertion.type === 'contains') {
        check(
          'quality',
          `case ${entry.id} grounds "${assertion.value}"`,
          grounded.includes(String(assertion.value).toLowerCase())
        );
      }
    }
  }

  const rubric = parsed['evals/rubric.yml'];
  const criterionIds = rubric.criteria.map((criterion) => criterion.id);
  check(
    'rubric',
    'weights sum to 100',
    rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) === 100
  );
  check('rubric', 'criterion ids are unique', new Set(criterionIds).size === criterionIds.length);
  check('rubric', 'passing score exists', typeof rubric.passing_score === 'number');

  for (const [file, expected] of [
    ['evals/trigger-positive.yml', 'webflow-app-review-remediation'],
    ['evals/trigger-negative.yml', null]
  ]) {
    const entries = parsed[file].evals;
    check(
      'trigger',
      `${file} routes consistently`,
      entries.every((entry) => (entry.expected_skill ?? null) === expected)
    );
    check(
      'trigger',
      `${file} prompts are non-empty`,
      entries.every((entry) => typeof entry.prompt === 'string' && entry.prompt.length > 0)
    );
  }

  for (const match of read('SKILL.md').matchAll(/`((?:assets|checklists)\/[\w.-]+)`/g)) {
    check('structure', `referenced path exists: ${match[1]}`, existsSync(join(skill, match[1])));
  }

  check('structure', 'no auxiliary README', !existsSync(join(skill, 'README.md')));
  check(
    'shareable',
    'no internal tooling references',
    !['zendesk', 'airtable', 'slack canvas'].some((term) => corpus.includes(term))
  );
}

for (const group of [...new Set(rows.map((row) => row.group))]) {
  const groupRows = rows.filter((row) => row.group === group);
  const bad = groupRows.filter((row) => !row.condition);
  console.log(`\n[${group}] ${groupRows.length - bad.length}/${groupRows.length} passed`);
  for (const row of bad) {
    console.log(`   FAIL  ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
  }
}

console.log(`\nTOTAL: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
