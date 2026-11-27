# Webflow Marketplace skills

Three skills for people who submit templates and Apps to the Webflow Marketplace. Each skill has a maintainer, a sample task with an answer key, and a measured result with and without the skill.

These are independent CREATE SOMETHING tools. They are not official Webflow validators, and a clean result is not an approval.

| Skill                                                                       | Use it                                | Sample task                                                                                                | Measured 2026-11-26 (problems caught: no skill → with skill) |
| --------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`template-preflight`](template-preflight/SKILL.md)                         | Before you submit a template          | [task](evals/tasks/template-preflight/task.md), [answer key](evals/tasks/template-preflight/expected.json) | 12 to 13 of 22 → 22 of 22                                    |
| [`webflow-app-preflight`](webflow-app-preflight/SKILL.md)                   | Before you submit an App              | [task](evals/tasks/app-preflight/task.md), [answer key](evals/tasks/app-preflight/expected.json)           | 11 to 13 of 14 → 14 of 14                                    |
| [`webflow-app-review-remediation`](webflow-app-review-remediation/SKILL.md) | After you receive App review findings | none yet                                                                                                   | not measured                                                 |

Full results and limits: [evals/results/2026-11-26.md](evals/results/2026-11-26.md). Maintainer, supported agents, sources and last review date for each skill: [pack.json](pack.json). For the two App skills, also read [WEBFLOW_APP_DEVELOPER_TOOLKIT.md](WEBFLOW_APP_DEVELOPER_TOOLKIT.md).

## Install

For Claude Code:

```bash
claude plugin marketplace add https://raw.githubusercontent.com/createsomethingtoday/create-something-monorepo/main/skills/.claude-plugin/marketplace.json
claude plugin install webflow-templates@webflow-marketplace-skills
claude plugin install webflow-apps@webflow-marketplace-skills
```

Install only the plugin you need. Each install downloads this folder only (about 1 MB), not the full repository. Then start a new session and give the agent your task in your own words, for example: "Check my template at https://my-template.webflow.io before I submit it."

To get the current rules later:

```bash
claude plugin marketplace update webflow-marketplace-skills
claude plugin update webflow-templates@webflow-marketplace-skills
```

For other agents, copy the skill folder into the skills location of your agent.

## Report a wrong result

If a skill tells you to fix something that a reviewer or the Validator accepts, or misses something that a reviewer sends back, open an issue in this repository. Give the skill name, what the skill said, and what the reviewer or the Validator said. The maintainer adds the case to the sample task and corrects the skill.

## Maintain

- Each skill has one maintainer in `pack.json`.
- `node skills/evals/check-pack.mjs` fails when a skill has no maintainer, no sample task, no dated source, a `SKILL.md` body longer than 500 lines, or a review date older than 45 days.
- To review a skill: compare it with its sources, run the with/without test, then set `reviewed` in `pack.json`.
- When the no-skill arm equals the skill arm on two runs in a row, cut the skill down to what still differs, or retire it.

## Run the with/without test

Needs the `claude` CLI, signed in. The sessions use real tokens (about $0.15 to $0.20 for each session on Sonnet).

```bash
node skills/evals/ablate.mjs run --task template-preflight --run my-run
node skills/evals/ablate.mjs run --task app-preflight --run my-run
node skills/evals/ablate.mjs judge --run my-run
node skills/evals/ablate.mjs report --run my-run
```

To compare an older copy of a skill, add an arm: `--arms without,with,old=/path/to/older/skill-folder`.
