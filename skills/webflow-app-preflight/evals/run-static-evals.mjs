#!/usr/bin/env node
/**
 * Static eval harness for the webflow-app-preflight skill.
 *
 * Verifies that the skill corpus can satisfy every assertion declared in
 * quality.yml, plus structural invariants of the eval files themselves.
 *
 * This is NOT a model-in-the-loop run. It answers "could a grounded model
 * produce the expected output from this corpus, and are the eval files
 * internally consistent?" — not "did the model actually do it."
 * Usage:  node evals/run-static-evals.mjs
 * Exit:   0 = all checks pass, 1 = one or more failures
 *
 * Optional env:
 *   PREFLIGHT_FORBIDDEN_TERMS  comma-separated extra terms that must not
 *                              appear in the corpus (e.g. names you must not
 *                              ship in a public artifact). Case-insensitive.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..');

// `yaml` is resolved from the nearest installation. The skill is designed to be
// copied around, so fail with an actionable message rather than a stack trace.
let YAML;
try {
  YAML = createRequire(import.meta.url)('yaml');
} catch {
  try {
    YAML = createRequire(join(process.cwd(), 'package.json'))('yaml');
  } catch {
    console.error(
      'This harness needs the `yaml` package.\n' +
        'Run it from a project that has it installed, or: npm i yaml'
    );
    process.exit(2);
  }
}

const load = (p) => readFileSync(join(SKILL, p), 'utf8');
const yml = (p) => YAML.parse(load(p));

// Sibling skill (for the routing check). The pair ships together; if only one
// directory was copied, the routing check is skipped with a note.
const SIBLING = resolve(SKILL, '..', 'webflow-app-review-remediation');
const SKILL_NAME = 'webflow-app-preflight';

const frontmatterOf = (raw) => {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  return m ? YAML.parse(m[1]) : null;
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

const corpusFiles = [
  'SKILL.md',
  ...readdirSync(join(SKILL, 'checklists')).map((f) => `checklists/${f}`),
  ...readdirSync(join(SKILL, 'reference')).map((f) => `reference/${f}`)
];
const corpus = corpusFiles.map(load).join('\n').toLowerCase();
const antiLower = (load('SKILL.md').split('## Anti-advice')[1] ?? '')
  .split('\n## ')[0]
  .toLowerCase();

let pass = 0;
let fail = 0;
const rows = [];
const check = (group, name, ok, detail = '') => {
  ok ? pass++ : fail++;
  rows.push({ group, name, ok, detail });
};

// ---- 1. eval files parse -------------------------------------------------
const files = [
  'evals/quality.yml',
  'evals/rubric.yml',
  'evals/trigger-positive.yml',
  'evals/trigger-negative.yml'
];
const parsed = {};
for (const f of files) {
  try {
    parsed[f] = yml(f);
    check('yaml', f, true);
  } catch (e) {
    check('yaml', f, false, e.message);
  }
}
if (fail > 0) {
  report();
  process.exit(1);
}

// ---- 2. quality assertions are groundable in the corpus ------------------
for (const ev of parsed['evals/quality.yml'].evals) {
  for (const a of ev.assertions) {
    const v = String(a.value).toLowerCase();
    if (a.type === 'contains') {
      check(
        'quality',
        `case ${ev.id} contains "${a.value}"`,
        corpus.includes(v),
        'string absent from the skill corpus — a grounded model could not produce it'
      );
    } else if (a.type === 'not_contains') {
      // The skill may quote forbidden phrasing, but only to refute it —
      // i.e. it must appear solely inside the Anti-advice section.
      check(
        'quality',
        `case ${ev.id} "${a.value}" refuted, not endorsed`,
        !corpus.includes(v) || antiLower.includes(v),
        'phrase appears in the corpus outside the Anti-advice section'
      );
    } else {
      check('quality', `case ${ev.id} unknown assertion type "${a.type}"`, false);
    }
  }
}

// ---- 3. anti-advice section present and populated ------------------------
const antiCount = (antiLower.match(/^- ❌/gm) ?? []).length;
check('structure', 'Anti-advice has >= 5 entries', antiCount >= 5, `found ${antiCount}`);

// ---- 4. rubric integrity ------------------------------------------------
const rubric = parsed['evals/rubric.yml'];
const sum = rubric.criteria.reduce((n, c) => n + c.weight, 0);
check('rubric', 'weights sum to 100', sum === 100, `sum=${sum}`);
check(
  'rubric',
  'passing_score present',
  typeof rubric.passing_score === 'number',
  String(rubric.passing_score)
);
check(
  'rubric',
  'every criterion has id/description/weight',
  rubric.criteria.every((c) => c.id && c.description && typeof c.weight === 'number')
);
const criterionIds = rubric.criteria.map((c) => c.id);
check('rubric', 'criterion ids unique', new Set(criterionIds).size === criterionIds.length);

// ---- 5. rubric criteria are grounded in the corpus ----------------------
// Each criterion must be judgeable from the corpus, so its load-bearing
// vocabulary has to exist there.
const rubricKeywords = {
  governance_accuracy: ['immutable', 'integrityhash', 'app update', 'uninstall'],
  backend_authorization: ['id token', 'object-level', 'allowlist', 'cors'],
  no_inverted_advice: ['revocation', 'defense-in-depth'],
  verdict_explicit: ['do not submit']
};
for (const [id, kws] of Object.entries(rubricKeywords)) {
  check('grounding', `criterion "${id}" exists`, criterionIds.includes(id));
  for (const kw of kws) {
    check('grounding', `${id} -> "${kw}"`, corpus.includes(kw), 'keyword absent from corpus');
  }
}

// ---- 6. trigger files ---------------------------------------------------
for (const [f, expected] of [
  ['evals/trigger-positive.yml', 'webflow-app-preflight'],
  ['evals/trigger-negative.yml', null]
]) {
  const evs = parsed[f].evals;
  const ids = evs.map((e) => e.id);
  check('trigger', `${f} ids unique`, new Set(ids).size === ids.length);
  check(
    'trigger',
    `${f} expected_skill consistent`,
    evs.every((e) => (e.expected_skill ?? null) === expected),
    `${evs.length} cases`
  );
  check(
    'trigger',
    `${f} every case has a prompt`,
    evs.every((e) => typeof e.prompt === 'string' && e.prompt.length > 0)
  );
}

// ---- 7. checklist structure --------------------------------------------
const gate = load('checklists/pre-submission-quality-gate.md');
const backendSection = gate.split('## Backend & API surface')[1]?.split('\n## ')[0] ?? '';
const backendItems = (backendSection.match(/^- \[ \]/gm) ?? []).length;
const gateItems = (gate.match(/^- \[ \]/gm) ?? []).length;
check('structure', 'gate has a Backend & API surface section', backendSection.length > 0);
check('structure', 'backend section has >= 13 items', backendItems >= 13, `found ${backendItems}`);
// The gate held 44 items before the backend section was added; never regress below 55.
check('structure', 'gate total >= 55 items', gateItems >= 55, `found ${gateItems}`);

const pitfalls = load('checklists/governance-pitfalls.md');
const pitfallCount = (pitfalls.match(/^## \d+\./gm) ?? []).length;
const fixCount = (pitfalls.match(/\*\*Fix:\*\*/g) ?? []).length;
check('structure', 'pitfalls count >= 10', pitfallCount >= 10, `found ${pitfallCount}`);
check(
  'structure',
  'every pitfall states a Fix',
  fixCount >= pitfallCount,
  `${fixCount} fixes / ${pitfallCount} pitfalls`
);

// Every file the SKILL.md References section points at must exist.
for (const m of load('SKILL.md').matchAll(/`(reference\/[\w.-]+|checklists\/[\w.-]+|evals\/)`/g)) {
  const target = m[1].endsWith('/') ? m[1] : m[1];
  check('structure', `referenced path exists: ${target}`, existsSync(join(SKILL, target)));
}

// ---- 7b. frontmatter contract ------------------------------------------
const skillRaw = load('SKILL.md');
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
  Boolean(fm?.description?.includes('webflow-app-review-remediation'))
);

// ---- 7c. SKILL.md backend exemplars have not drifted from the gate -------
// Phase 3's backend subsection is deliberately a premise plus a few exemplar
// controls; the gate owns the authoritative list. Both must stay groundable
// in each other, or the pair silently diverges.
const skillBackend = (skillRaw.split('### Backend and API surface')[1] ?? '')
  .split('\n### ')[0]
  .toLowerCase();
check('drift', 'SKILL.md has a Backend and API surface subsection', skillBackend.length > 0);
check(
  'drift',
  'SKILL.md names the gate as authoritative for the backend surface',
  skillBackend.includes('pre-submission-quality-gate.md')
);
for (const kw of [
  'attacker-controlled',
  'id token',
  'object-level',
  'defense-in-depth',
  'allowlist',
  'single-use',
  'state'
]) {
  check('drift', `backend keyword "${kw}" present in SKILL.md exemplars`, skillBackend.includes(kw));
  check(
    'drift',
    `backend keyword "${kw}" present in gate backend section`,
    backendSection.toLowerCase().includes(kw)
  );
}

// ---- 8. partner checklist has not drifted from the gate ----------------
// The partner checklist is a derived, self-contained asset for developers who
// aren't running an agent. It must stay in step with the gate and the pitfalls.
const partner = load('assets/webflow-app-submission-checklist.md');
const normalize = (s) => s.replace(/&/g, 'and').toLowerCase();
const gateSections = [...gate.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
for (const section of gateSections) {
  check(
    'partner-doc',
    `covers gate section "${section}"`,
    normalize(partner).includes(normalize(section)),
    'section missing from the partner checklist'
  );
}
const partnerItems = (partner.match(/^- \[ \]/gm) ?? []).length;
check(
  'partner-doc',
  'item count >= gate item count',
  partnerItems >= gateItems,
  `partner ${partnerItems} vs gate ${gateItems}`
);
const partnerPitfalls = (partner.match(/^\*\*\d+ · /gm) ?? []).length;
check(
  'partner-doc',
  'covers every pitfall',
  partnerPitfalls >= pitfallCount,
  `partner ${partnerPitfalls} vs pitfalls ${pitfallCount}`
);
check(
  'partner-doc',
  'restates the Anti-advice items',
  (partner.match(/^- ❌/gm) ?? []).length >= antiCount,
  `partner ${(partner.match(/^- ❌/gm) ?? []).length} vs skill ${antiCount}`
);

// ---- 8b. load-bearing sentence lock --------------------------------------
// The corrective phrasing behind the Anti-advice items and the retained-
// cleanup-scopes rule must appear verbatim (modulo markdown emphasis) in all
// three surfaces. Item-count checks alone would let a reworded item say the
// opposite and still pass.
// Strip markdown emphasis (asterisks, backticks, space-adjacent underscores)
// without touching snake_case identifiers like custom_code:write.
const lockNormalize = (s) =>
  s.toLowerCase().replace(/[*`]/g, '').replace(/ _|_ /g, ' ').replace(/\s+/g, ' ');
const lockDocs = {
  'SKILL.md': lockNormalize(skillRaw),
  'quality gate': lockNormalize(gate),
  'partner checklist': lockNormalize(partner)
};
const lockPhrases = [
  'a persistent 401 on a previously valid token is revocation', // 401 ≠ retry
  'retain', // cleanup scopes are retained, not dropped
  'custom_code:write',
  'sites:write',
  'site and page level', // removal is the App's job, at both levels
  'defense-in-depth', // CORS is not authorization
  'published page source' // site IDs are not secrets
];
for (const [doc, text] of Object.entries(lockDocs)) {
  for (const phrase of lockPhrases) {
    check('lock', `"${phrase}" appears in ${doc}`, text.includes(phrase));
  }
}

// ---- 8c. trigger routing against both descriptions -----------------------
// ID-uniqueness and non-empty prompts validate YAML against itself; the
// frontmatter description is what actually routes. Each positive prompt must
// score higher against this skill's description than the sibling's.
if (existsSync(join(SIBLING, 'SKILL.md'))) {
  const sibFm = frontmatterOf(readFileSync(join(SIBLING, 'SKILL.md'), 'utf8'));
  const ownSet = stemsOf(fm?.description ?? '');
  const sibSet = stemsOf(sibFm?.description ?? '');
  const ownDistinct = [...ownSet].filter((t) => !sibSet.has(t));
  const sibDistinct = [...sibSet].filter((t) => !ownSet.has(t));
  for (const ev of parsed['evals/trigger-positive.yml'].evals) {
    const p = stemsOf(ev.prompt);
    const own = ownDistinct.filter((t) => p.has(t)).length;
    const sib = sibDistinct.filter((t) => p.has(t)).length;
    check(
      'routing',
      `positive ${ev.id} routes to ${SKILL_NAME}`,
      own > sib,
      `own=${own} sibling=${sib} :: ${ev.prompt}`
    );
  }
} else {
  check('routing', 'sibling skill available for routing check', true, 'sibling directory not found — skipped');
}

// ---- 9. shareability: no internal identifiers --------------------------
// Default terms are internal *tooling* and finding-ID shapes, not names of any
// third party — pass PREFLIGHT_FORBIDDEN_TERMS to add your own.
const forbidden = [
  'zendesk',
  'airtable',
  ...(process.env.PREFLIGHT_FORBIDDEN_TERMS ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
];
// The partner checklist, README, and eval files ship to third parties, so
// they are scanned too — internal names must not leak through any of them.
const evalRaw = files.map(load).join('\n');
const readmeRaw = load('README.md');
const shareable = `${corpus}\n${partner.toLowerCase()}\n${evalRaw.toLowerCase()}\n${readmeRaw.toLowerCase()}`;
const termHits = forbidden.filter((t) => shareable.includes(t));
check('shareable', 'no internal tooling references', termHits.length === 0, termHits.join(', '));
// Internal finding IDs look like "AB-01" / "AB-1234".
const idHits = [...shareable.matchAll(/\b[a-z]{2,3}-\d{2,4}\b/g)]
  .map((m) => m[0])
  .filter((s) => !/^es-\d+$/.test(s)); // es-2020 etc. are legitimate build targets
check('shareable', 'no internal finding IDs', idHits.length === 0, [...new Set(idHits)].join(', '));

// ---- report -------------------------------------------------------------
function report() {
  for (const g of [...new Set(rows.map((r) => r.group))]) {
    const gr = rows.filter((r) => r.group === g);
    const bad = gr.filter((r) => !r.ok);
    console.log(`\n[${g}] ${gr.length - bad.length}/${gr.length} passed`);
    for (const r of bad) console.log(`   FAIL  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${pass} passed, ${fail} failed`);
}

report();
process.exit(fail === 0 ? 0 : 1);
