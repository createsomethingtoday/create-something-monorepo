#!/usr/bin/env node
/**
 * Checks that every skill in ../pack.json is fit to hand to someone else:
 * it has an owner, a short entry point, a sample task with an answer key,
 * a dated source, and a review date that is not too old.
 *
 *   node skills/evals/check-pack.mjs [--today 2026-12-31]
 *
 * Exit 0 when every check passes, 1 when one fails.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = resolve(HERE, '..');
const pack = JSON.parse(readFileSync(join(SKILLS, 'pack.json'), 'utf8'));
const catalog = JSON.parse(
  readFileSync(join(SKILLS, '.claude-plugin', 'marketplace.json'), 'utf8')
);
const todayFlag = process.argv.indexOf('--today');
const today = new Date(todayFlag > -1 ? process.argv[todayFlag + 1] : Date.now());

const failures = [];
const check = (skill, ok, message) => {
  if (!ok) failures.push(`${skill}: ${message}`);
};

check('pack', Boolean(pack.maintainer?.github), 'pack.json needs maintainer.github');

const published = catalog.plugins.flatMap((plugin) =>
  plugin.skills.map((path) => path.replace(/^\.\//, ''))
);
for (const name of published)
  check(
    name,
    pack.skills.some((skill) => skill.name === name),
    'is in the plugin catalog but not in pack.json'
  );

for (const skill of pack.skills) {
  const { name } = skill;
  const file = join(SKILLS, name, 'SKILL.md');
  check(name, published.includes(name), 'is in pack.json but not in the plugin catalog');
  if (!existsSync(file)) {
    check(name, false, 'SKILL.md is missing');
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  check(name, Boolean(front), 'SKILL.md has no frontmatter');
  const field = (key) =>
    new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(front?.[1] ?? '')?.[1].trim() ?? '';
  check(name, field('name') === name, `frontmatter name is "${field('name')}"`);
  check(
    name,
    field('description').length > 0 && field('description').length <= 1024,
    'description must be 1 to 1024 characters'
  );
  const bodyLines = text.slice(front?.[0].length ?? 0).split('\n').length;
  check(
    name,
    bodyLines <= 500,
    `SKILL.md body is ${bodyLines} lines; keep it at 500 or fewer and move detail to linked files`
  );

  check(name, skill.works_with?.length > 0, 'works_with is empty');
  check(
    name,
    skill.sources?.length > 0 && skill.sources.every((source) => source.url && source.version),
    'each source needs a url and a version'
  );
  const age = Math.floor((today - new Date(skill.reviewed)) / 86_400_000);
  check(
    name,
    Number.isFinite(age) && age <= pack.review_every_days,
    `last reviewed ${skill.reviewed} (${age} days ago); the limit is ${pack.review_every_days} days. Compare the skill with its sources, run the with/without test again, then update "reviewed"`
  );

  if (skill.task) {
    const taskDir = join(HERE, 'tasks', skill.task);
    check(
      name,
      existsSync(join(taskDir, 'task.md')),
      `sample task ${skill.task}/task.md is missing`
    );
    if (existsSync(join(taskDir, 'expected.json'))) {
      const expected = JSON.parse(readFileSync(join(taskDir, 'expected.json'), 'utf8'));
      check(
        name,
        expected.skills.includes(name),
        `${skill.task}/expected.json does not list this skill`
      );
      check(
        name,
        expected.planted.length > 0,
        `${skill.task}/expected.json has no planted problems`
      );
    } else {
      check(name, false, `answer key ${skill.task}/expected.json is missing`);
    }
  }
}

const untested = pack.skills.filter((skill) => !skill.task).map((skill) => skill.name);
if (untested.length) console.log(`No with/without task yet: ${untested.join(', ')}`);
if (failures.length) {
  console.error(failures.map((line) => `FAIL ${line}`).join('\n'));
  process.exit(1);
}
console.log(
  `OK: ${pack.skills.length} skills, maintainer ${pack.maintainer.github}, review limit ${pack.review_every_days} days`
);
