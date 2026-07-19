import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const skills = [
  {
    name: 'debug-feedback-loop',
    codex: 'packages/dotfiles/codex/skills/debug-feedback-loop/SKILL.md',
    pi: 'packages/pi-policy-os/skills/debug-feedback-loop/SKILL.md',
    expectations: [
      /red-capable/i,
      /Database/,
      /Automation/,
      /Judgment/,
      /Linear/,
      /pnpm exports/,
      /Context7/,
      /Ground/
    ]
  },
  {
    name: 'tdd-vertical-slice',
    codex: 'packages/dotfiles/codex/skills/tdd-vertical-slice/SKILL.md',
    pi: 'packages/pi-policy-os/skills/tdd-vertical-slice/SKILL.md',
    expectations: [
      /public interface/i,
      /Red/i,
      /Green/i,
      /Refactor/i,
      /Linear/,
      /pnpm exports/,
      /Context7/,
      /Do not write all tests first|Never write a batch/i
    ]
  },
  {
    name: 'intent-mapping',
    codex: 'packages/dotfiles/codex/skills/intent-mapping/SKILL.md',
    pi: 'packages/pi-policy-os/skills/intent-mapping/SKILL.md',
    expectations: [
      /Intent Packet/,
      /one question at a time/i,
      /recommended answer/i,
      /Database/,
      /Automation/,
      /Judgment/,
      /Linear/,
      /pnpm agent:solo-loop/,
      /pnpm agent:claim-worktree/,
      /Stop conditions/i
    ]
  },
  {
    name: 'deep-module-design',
    codex: 'packages/dotfiles/codex/skills/deep-module-design/SKILL.md',
    pi: 'packages/pi-three-tier-framework/skills/deep-module-design/SKILL.md',
    expectations: [
      /Database/,
      /Automation/,
      /Judgment/,
      /leverage/i,
      /locality/i,
      /testability/i,
      /deletion test/i,
      /Do not refactor on taste alone/i,
      /Linear/
    ]
  }
];

const codexOnlySkills = [
  {
    name: 'writing-for-humans',
    codex: 'packages/dotfiles/codex/skills/writing-for-humans/SKILL.md',
    expectations: [
      /least-tenured credible practitioner/i,
      /preserve facts/i,
      /citations/i,
      /uncertainty/i,
      /must not invent/i,
      /pattern clusters/i,
      /property voice/i,
      /smallest useful framework stack/i,
      /reader and outcome/i,
      /operator-instructions\.md/,
      /reports-and-arguments\.md/,
      /sentence-clarity\.md/,
      /writing-tasks\.v1\.json/,
      /pnpm prose:check/,
      /human final read/i,
      /detector/i,
      /policy\.prose-quality\.v1/
    ]
  },
  {
    name: 'target-reader-review',
    codex: 'packages/dotfiles/codex/skills/target-reader-review/SKILL.md',
    expectations: [
      /least-tenured credible practitioner/i,
      /useful momentum/i,
      /pass \| revise \| hold/i,
      /deterministic/i,
      /judgment/i,
      /preservation_risks/,
      /human_review_needed/,
      /must not masquerade/i,
      /target-reader\.v1\.json/,
      /review_scope/,
      /rendered component/i,
      /artifact_type/,
      /can_orient/,
      /can_find_default/,
      /can_start/,
      /can_complete/,
      /can_recover/,
      /can_verify/,
      /unrelated file-level deterministic findings/i,
      /human final read/i
    ]
  },
  {
    name: 'svg-education-precision',
    codex: 'packages/dotfiles/codex/skills/svg-education-precision/SKILL.md',
    expectations: [
      /structured spec/i,
      /pnpm agent:svg-education validate/,
      /pnpm agent:svg-education build/,
      /pnpm agent:svg-education check/,
      /INVALID_ELEMENT_ID/,
      /ELEMENT_OUT_OF_BOUNDS/,
      /TEXT_OVERFLOW/,
      /ELEMENT_COLLISION/,
      /INVALID_CONTAINMENT/,
      /in-app browser/i,
      /geometry readback/i,
      /Image2/,
      /human review/i,
      /Do not move the source of truth into the renderer/i
    ]
  },
  {
    name: 'claude-agent-cli-handoff',
    codex: 'packages/dotfiles/codex/skills/claude-agent-cli-handoff/SKILL.md',
    expectations: [
      /claude --print --output-format json/,
      /claude --bg/,
      /--mcp-config/,
      /Slack/,
      /Google/,
      /Datadog/,
      /Amplitude/,
      /Claude tools expected:/,
      /source-of-truth tool/i,
      /Handoff Packet/,
      /Airtable Write Guardrails/,
      /Template Archive Packet/,
      /Readback evidence required:/,
      /Do not claim live control from local transcript visibility/i,
      /Asset table/,
      /Creator table or email table/,
      /Stop conditions:/,
      /Completion Bar/
    ]
  }
];

const intentMappingBehaviorFixtures = [
  {
    name: 'ambiguous workflow improvement',
    prompt: 'I want to improve our agent workflow based on this transcript.',
    expectedBehaviors: [
      /Ask one question at a time/i,
      /recommended answer/i,
      /inspect that source instead of\s+asking the user/i,
      /choose the correct workflow lane/i,
      /Verification:/,
      /Stop conditions:/
    ]
  },
  {
    name: 'shared implementation handoff',
    prompt: 'Turn this plan into shared implementation work another agent can pick up.',
    expectedBehaviors: [
      /Use Linear for shared, delegated, long-running, production-bound/i,
      /pnpm agent:claim-worktree -- --issue CRE-123/,
      /Evidence target:/,
      /Policy artifacts:/,
      /before implementation starts/i
    ]
  },
  {
    name: 'solo exploratory work',
    prompt: 'Help me explore a small local workflow idea before we create an issue.',
    expectedBehaviors: [
      /pnpm agent:solo-loop/,
      /solo-loop \| claim-worktree \| PR\/promotion \| research\/no-edit/,
      /one concrete outcome/i,
      /observable done condition/i
    ]
  },
  {
    name: 'multi-session wayfinding',
    prompt: 'Use intent mapping as an orchestrator for many grilling sessions.',
    expectedBehaviors: [
      /Map Mode/,
      /Linear-native way to orchestrate/i,
      /Destination/,
      /Decisions so far/,
      /Not yet specified/,
      /Out of scope/,
      /frontier/i,
      /Never resolve more than one map ticket in a single session/i,
      /Grilling/,
      /Research/,
      /Prototype/,
      /Task/
    ]
  }
];

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function extractIntentPacketFields(body) {
  const match = body.match(/```text\n([\s\S]+?)\n```/);
  assert(match, 'intent-mapping skill is missing its Intent Packet fenced block');

  return match[1]
    .split('\n')
    .filter((line) => /^[A-Z][A-Za-z -]+:/.test(line))
    .map((line) => line.slice(0, line.indexOf(':') + 1));
}

function assertSkillFrontmatter(skillName, relPath) {
  const body = read(relPath);
  const match = body.match(/^---\n([\s\S]+?)\n---/);
  assert(match, `${relPath} is missing YAML frontmatter`);
  assert.match(match[1], new RegExp(`^name:\\s*${skillName}$`, 'm'));
  assert.match(match[1], /^description:\s*\S/m);
  return body;
}

test('adapted skills are present in Codex and Pi/package surfaces', () => {
  for (const skill of skills) {
    assert(existsSync(path.join(REPO_ROOT, skill.codex)), `${skill.codex} missing`);
    assert(existsSync(path.join(REPO_ROOT, skill.pi)), `${skill.pi} missing`);
    assertSkillFrontmatter(skill.name, skill.codex);
    assertSkillFrontmatter(skill.name, skill.pi);
  }
});

test('adapted skills retain the behavioral contracts that make them effective', () => {
  for (const skill of skills) {
    for (const relPath of [skill.codex, skill.pi]) {
      const body = read(relPath);
      for (const expectation of skill.expectations) {
        assert.match(body, expectation, `${relPath} missing ${expectation}`);
      }
    }
  }
});

test('Codex-only skills retain their local runtime handoff contracts', () => {
  for (const skill of codexOnlySkills) {
    assert(existsSync(path.join(REPO_ROOT, skill.codex)), `${skill.codex} missing`);
    const body = assertSkillFrontmatter(skill.name, skill.codex);

    for (const expectation of skill.expectations) {
      assert.match(body, expectation, `${skill.codex} missing ${expectation}`);
    }
  }
});

test('skills remain wired into Codex installation and Pi discovery docs', () => {
  const codexReadme = read('packages/dotfiles/codex/README.md');
  const piSystem = read('.pi/APPEND_SYSTEM.md');
  const piPolicyReadme = read('packages/pi-policy-os/README.md');
  const piFrameworkReadme = read('packages/pi-three-tier-framework/README.md');
  const piSettings = JSON.parse(read('.pi/settings.json'));
  const piSkillPaths = piSettings.skills.join('\n');

  assert.match(piSkillPaths, /packages\/pi-policy-os\/skills/);
  assert.match(piSkillPaths, /packages\/pi-three-tier-framework\/skills/);

  for (const skill of skills) {
    assert.match(codexReadme, new RegExp(`\\b${skill.name}\\b`));
    assert.match(piSystem, new RegExp(`/skill:${skill.name}\\b`));
  }

  for (const skill of codexOnlySkills) {
    assert.match(codexReadme, new RegExp(`\\b${skill.name}\\b`));
  }

  assert.match(piPolicyReadme, /\/skill:debug-feedback-loop/);
  assert.match(piPolicyReadme, /\/skill:tdd-vertical-slice/);
  assert.match(piPolicyReadme, /\/skill:intent-mapping/);
  assert.match(piFrameworkReadme, /\/skill:deep-module-design/);
});

test('intent-mapping has deterministic behavioral fixture coverage', () => {
  const codexBody = read('packages/dotfiles/codex/skills/intent-mapping/SKILL.md');
  const piBody = read('packages/pi-policy-os/skills/intent-mapping/SKILL.md');
  const expectedPacketFields = [
    'Linear:',
    'Lane:',
    'Tier:',
    'Goal:',
    'Decisions:',
    'Non-goals:',
    'Acceptance criteria:',
    'Verification:',
    'Stop conditions:',
    'Policy artifacts:',
    'Evidence target:'
  ];

  for (const [name, body] of [
    ['Codex', codexBody],
    ['Pi', piBody]
  ]) {
    assert.deepEqual(
      extractIntentPacketFields(body),
      expectedPacketFields,
      `${name} intent-mapping skill has drifted from the required Intent Packet shape`
    );

    for (const fixture of intentMappingBehaviorFixtures) {
      assert(fixture.prompt.length > 0, `${fixture.name} fixture prompt is empty`);

      for (const expectation of fixture.expectedBehaviors) {
        assert.match(
          body,
          expectation,
          `${name} intent-mapping skill does not encode ${fixture.name}: ${expectation}`
        );
      }
    }
  }
});

test('writing skills route realistic artifacts through bounded framework stacks', () => {
  const corpus = JSON.parse(read('scripts/prose-quality/evals/writing-tasks.v1.json'));
  const writer = read('packages/dotfiles/codex/skills/writing-for-humans/SKILL.md');
  const reviewer = read('packages/dotfiles/codex/skills/target-reader-review/SKILL.md');
  const referenceRoot = 'packages/dotfiles/codex/skills/writing-for-humans/references';

  assert.equal(corpus.version, 1);
  assert.equal(corpus.reader, 'junior-practitioner');
  assert.equal(corpus.cases.length, 6);
  assert.deepEqual(corpus.cases.map((entry) => entry.artifactType).sort(), [
    'argument',
    'case-study',
    'operator-instructions',
    'report',
    'teaching',
    'technical-explanation'
  ]);

  for (const entry of corpus.cases) {
    assert.match(entry.prompt, /\S/);
    assert.match(entry.sourceExcerpt, /\S/);
    assert(entry.expectedSequence.length >= 3, `${entry.id} needs an observable sequence`);
    assert(
      entry.preservationRequirements.length > 0,
      `${entry.id} needs preservation requirements`
    );
    assert.match(writer, new RegExp(entry.artifactType.replaceAll('-', '[ -]'), 'i'));

    const referencePath = `${referenceRoot}/${entry.reference}`;
    assert(existsSync(path.join(REPO_ROOT, referencePath)), `${referencePath} missing`);
    const reference = read(referencePath);
    for (const signal of entry.requiredSignals) {
      assert.match(reference, new RegExp(signal, 'i'), `${entry.id} missing ${signal}`);
    }
  }

  for (const field of [
    'can_orient',
    'can_find_default',
    'can_start',
    'can_complete',
    'can_recover',
    'can_verify'
  ]) {
    assert.match(reviewer, new RegExp(field));
  }
});

test('writing skills reject local-clarity false positives', () => {
  const writer = read('packages/dotfiles/codex/skills/writing-for-humans/SKILL.md');
  const reviewer = read('packages/dotfiles/codex/skills/target-reader-review/SKILL.md');
  const sentenceClarity = read(
    'packages/dotfiles/codex/skills/writing-for-humans/references/sentence-clarity.md'
  );
  const policy = JSON.parse(read('docs/policies/v1/policy.prose-quality.v1.json'));
  const corpus = JSON.parse(read('scripts/prose-quality/evals/target-reader.v1.json'));

  for (const expectation of [
    /first encounter/i,
    /artifact-facing meta-copy/i,
    /actor.*action.*observable result/is,
    /downstream.*cannot.*rescue/is,
    /exact-string.*preservation evidence/is
  ]) {
    assert.match(writer, expectation);
  }

  assert.match(sentenceClarity, /actor.*action.*observable result/is);
  assert.match(reviewer, /plain_language_restatement/);
  assert.match(reviewer, /first_friction.*none/is);
  assert.match(reviewer, /material friction.*revise/is);

  assert.deepEqual(policy.reader_judgment_contract, {
    local_comprehension: ['recognizable_actor', 'meaningful_action', 'observable_result'],
    plain_language_restatement: true,
    pass_invariants: ['first_friction_none', 'no_material_frictions'],
    non_proof: ['exact_string_assertion', 'build', 'render', 'linter']
  });

  const agencyPair = corpus.cases.filter((entry) => entry.pair === 'agency-operating-story');
  assert.deepEqual(
    agencyPair.map((entry) => entry.expected).sort(),
    ['pass', 'revise']
  );
  const agencyNegative = agencyPair.find((entry) => entry.expected === 'revise');
  const agencyPositive = agencyPair.find((entry) => entry.expected === 'pass');
  assert.match(agencyNegative?.source?.revision ?? '', /^[0-9a-f]{40}$/);
  assert.match(agencyNegative?.source?.anchor ?? '', /The page now holds one argument/);
  assert.match(agencyPositive?.fixture?.excerpt ?? '', /Your team sets the limits/);
});

test('repo-owned Codex skill installer links the adapted skills', (t) => {
  const codexHome = mkdtempSync(path.join(tmpdir(), 'codex-skills-effectiveness-'));
  t.after(() => rmSync(codexHome, { recursive: true, force: true }));
  const unrelatedSkill = path.join(codexHome, 'skills', 'unrelated-personal-skill');
  mkdirSync(unrelatedSkill, { recursive: true });
  writeFileSync(path.join(unrelatedSkill, 'SKILL.md'), '# Preserve me\n');

  const result = spawnSync(
    'pnpm',
    ['--filter', '@create-something/dotfiles', 'install-codex-skills'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        CODEX_HOME: codexHome
      }
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  for (const skill of [...skills, ...codexOnlySkills]) {
    const linkedPath = path.join(codexHome, 'skills', skill.name);
    assert(lstatSync(linkedPath).isSymbolicLink(), `${linkedPath} is not a symlink`);
    assert.match(result.stdout, new RegExp(`Linked ${skill.name}\\b`));
  }

  assert.equal(
    readFileSync(path.join(unrelatedSkill, 'SKILL.md'), 'utf8'),
    '# Preserve me\n',
    'installer modified an unrelated skill'
  );
});
