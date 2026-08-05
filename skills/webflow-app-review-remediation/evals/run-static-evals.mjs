#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skill = resolve(here, '..');

// `yaml` is resolved from the nearest installation. The skill is designed to be
// copied around, so fail with an actionable message rather than a stack trace.
let yaml;
try {
  yaml = createRequire(import.meta.url)('yaml');
} catch {
  try {
    yaml = createRequire(join(process.cwd(), 'package.json'))('yaml');
  } catch {
    console.error(
      'This harness needs the `yaml` package.\n' +
        'Run it from a project that has it installed, or: npm i yaml'
    );
    process.exit(2);
  }
}
const read = (relativePath) => readFileSync(join(skill, relativePath), 'utf8');
const parse = (relativePath) => yaml.parse(read(relativePath));

const SKILL_NAME = 'webflow-app-review-remediation';
// Sibling skill (for the routing check). The pair ships together; if only one
// directory was copied, the routing check is skipped with a note.
const sibling = resolve(skill, '..', 'webflow-app-preflight');

const corpusFiles = [
  'SKILL.md',
  ...readdirSync(join(skill, 'checklists')).map((name) => `checklists/${name}`),
  ...readdirSync(join(skill, 'assets')).map((name) => `assets/${name}`)
];
const corpus = corpusFiles.map(read).join('\n').toLowerCase();

// For not_contains checks the skill may quote forbidden phrasing only to
// refute it — its refutation zone is the Boundaries section of SKILL.md.
const skillRaw = read('SKILL.md');
const boundariesSection = (skillRaw.split('## Boundaries')[1] ?? '').split('\n## ')[0];
const restrictedCorpus = corpusFiles
  .map((f) => (f === 'SKILL.md' ? skillRaw.replace(boundariesSection, '') : read(f)))
  .join('\n')
  .toLowerCase();

const frontmatterOf = (raw) => {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  return m ? yaml.parse(m[1]) : null;
};

// Crude but deterministic routing score: stemmed keyword overlap between a
// prompt and the tokens that are DISTINCTIVE to one skill's description
// (tokens shared by both descriptions carry no routing signal and are dropped).
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'to', 'of', 'is', 'are', 'it',
  'its', 'my', 'our', 'me', 'i', 'do', 'how', 'what', 'can', 'you', 'us', 'in',
  'on', 'as', 'be', 'we', 'this', 'these', 'into', 'from', 'that', 'was', 'will'
]);
const stemsOf = (s) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .map((w) => w.slice(0, 5))
  );

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

  // Issued finding IDs (e.g. "WF-01") are legitimately echoed from the eval
  // input; everything else a grounded model produces must exist in the corpus,
  // not merely in the prompt.
  const findingIdShaped = /^[a-z]{1,4}-\d{1,4}$/i;
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const entry of quality) {
    check('quality', `case ${entry.id} has expected output`, Boolean(entry.expected_output));
    for (const assertion of entry.assertions) {
      check(
        'quality',
        `case ${entry.id} assertion type ${assertion.type}`,
        assertion.type === 'contains' || assertion.type === 'not_contains'
      );
      const value = String(assertion.value);
      const v = value.toLowerCase();
      if (assertion.type === 'contains') {
        const echoedFindingId =
          findingIdShaped.test(value) && String(entry.input).toLowerCase().includes(v);
        check(
          'quality',
          `case ${entry.id} grounds "${value}" in the corpus`,
          echoedFindingId || corpus.includes(v),
          echoedFindingId
            ? 'finding-ID-shaped token echoed from the eval input'
            : 'string absent from the skill corpus — a grounded model could not produce it'
        );
      } else if (assertion.type === 'not_contains') {
        // Word-boundary match so e.g. "other app" is not tripped by
        // "another App"; allowed only inside the Boundaries section.
        const re = new RegExp(`\\b${escapeRegex(v).replace(/\s+/g, '\\s+')}\\b`, 'i');
        check(
          'quality',
          `case ${entry.id} "${value}" refuted, not endorsed`,
          !re.test(restrictedCorpus),
          'phrase appears in the corpus outside the Boundaries section'
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

  // Frontmatter contract: the description is the actual routing surface.
  const fm = frontmatterOf(skillRaw);
  check('frontmatter', 'SKILL.md has parseable YAML frontmatter', fm !== null);
  check('frontmatter', `name matches directory (${SKILL_NAME})`, fm?.name === SKILL_NAME);
  check(
    'frontmatter',
    'description is non-empty and < 1024 chars',
    typeof fm?.description === 'string' &&
      fm.description.length > 0 &&
      fm.description.length < 1024,
    `length=${fm?.description?.length ?? 0}`
  );
  check(
    'frontmatter',
    'description names the sibling skill',
    Boolean(fm?.description?.includes('webflow-app-preflight'))
  );

  // Trigger routing against both descriptions: each positive prompt must
  // score higher against this skill's description than the sibling's.
  if (existsSync(join(sibling, 'SKILL.md'))) {
    const sibFm = frontmatterOf(readFileSync(join(sibling, 'SKILL.md'), 'utf8'));
    const ownSet = stemsOf(fm?.description ?? '');
    const sibSet = stemsOf(sibFm?.description ?? '');
    const ownDistinct = [...ownSet].filter((t) => !sibSet.has(t));
    const sibDistinct = [...sibSet].filter((t) => !ownSet.has(t));
    for (const entry of parsed['evals/trigger-positive.yml'].evals) {
      const p = stemsOf(entry.prompt);
      const own = ownDistinct.filter((t) => p.has(t)).length;
      const sib = sibDistinct.filter((t) => p.has(t)).length;
      check(
        'routing',
        `positive ${entry.id} routes to ${SKILL_NAME}`,
        own > sib,
        `own=${own} sibling=${sib} :: ${entry.prompt}`
      );
    }
  } else {
    check('routing', 'sibling skill available for routing check', true, 'sibling directory not found — skipped');
  }

  for (const match of skillRaw.matchAll(/`((?:assets|checklists)\/[\w.-]+)`/g)) {
    check('structure', `referenced path exists: ${match[1]}`, existsSync(join(skill, match[1])));
  }

  // Both skills in the pair ship a README describing contents, evals, and scope.
  check('structure', 'README present', existsSync(join(skill, 'README.md')));

  // README and eval files ship with the skill, so they are scanned too.
  const shareable = [
    corpus,
    existsSync(join(skill, 'README.md')) ? read('README.md') : '',
    ...files.map(read)
  ]
    .join('\n')
    .toLowerCase();
  check(
    'shareable',
    'no internal tooling references',
    !['zendesk', 'airtable', 'slack canvas'].some((term) => shareable.includes(term))
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
