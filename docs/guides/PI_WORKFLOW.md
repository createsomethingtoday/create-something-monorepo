# Pi Workflow

Pi is the default terminal agent runtime for shared coding lanes in this repository.

Use Pi for the agent host layer. Keep Loom, quality gates, policy artifacts, and deploy checkpoints as the workflow backbone.

## What Pi replaces

- Symphony lane execution
- ad hoc prompt plumbing for recurring coding lanes
- host-specific agent boot instructions when a repo-local Pi resource is sufficient

## What stays

- remote Loom for tracked work and evidence
- `pnpm check`, `pnpm lint`, `pnpm test`, and targeted package checks
- `ground` for repo verification
- deploy checkpoint scripts and rollback notes
- policy artifacts in `docs/policies/`

## Requirements

Install Pi globally:

```bash
npm install -g @mariozechner/pi-coding-agent
```

This repo ships project-level Pi defaults in `.pi/settings.json` and sets the default provider to OpenAI.

Authenticate Pi for OpenAI in one of two supported ways:

API key:

```bash
export OPENAI_API_KEY=sk-...
```

Subscription:

```bash
pi
/login
```

Then select `OpenAI Codex` in the Pi login flow.

Verify the repo-local Pi/OpenAI setup:

```bash
pnpm pi:doctor
```

Then verify Pi can start in this repo:

```bash
pi
```

Pi loads `AGENTS.md` automatically, applies `.pi/settings.json`, and discovers repo-local resources from `.pi/`.

For provisioned Ona or Gitpod workspaces, keep the same Pi commands and treat Ona as the environment layer:

```bash
lm ready
pnpm loom:remote ready
pnpm pi:doctor
```

## Repo resources

- `.pi/prompts/code-quality-lane.md`
- `.pi/prompts/policy-lane.md`
- `.pi/settings.json`
- `.pi/skills/create-something-monorepo-workflow/`
- `.pi/skills/code-quality-workflow/`
- `.pi/skills/policy-artifact-workflow/`
- `automation/pi/code-quality/README.md`
- `automation/pi/policy/README.md`
- `pnpm pi:doctor`
- `pnpm pi:code-quality -- --task-id <id> --claim`
- `pnpm pi:policy -- --task-id <id> --claim`

## Repo-local Pi skills

Use these when the task is broader than a single prompt template:

- `create-something-monorepo-workflow` for repo startup, lane selection, runtime rules, and task coordination
- `code-quality-workflow` for implementation, bug-fixing, refactors, and narrow validation
- `policy-artifact-workflow` for versioned policy artifacts, governance docs, and policy validation

## Default loop

1. Create or pick a Loom task.
2. Claim it in remote Loom.
3. Start Pi against that task and lane.
4. Run the narrowest relevant validation surface.
5. Record evidence back to Loom.

Example:

```bash
pnpm pi:doctor
pnpm loom:remote list --status ready --label code-quality
pnpm pi:code-quality -- --task-id lm-12345678 --claim
pnpm loom:remote done --task-id lm-12345678 --evidence "Updated package X, ran pnpm check:clients"
```

## Lane runner

The repo ships a small Pi lane helper:

```bash
pnpm pi:doctor
pnpm pi:code-quality -- --task-id <id> --claim
pnpm pi:policy -- --task-id <id> --claim
```

Useful flags:

- `--mode interactive` starts Pi normally
- `--mode print` uses `pi -p` and defaults to a bounded kickoff response
- `--mode json` uses `pi --mode json` and defaults to a bounded kickoff response
- `--provider <name>` overrides the Pi provider for one run
- `--model <name>` overrides the Pi model for one run
- `--thinking <level>` overrides the Pi thinking level for one run
- `--tools <list>` restricts Pi to a comma-separated tool allowlist
- `--no-tools` disables Pi tools for one run
- `--session-dir <dir>` overrides where Pi stores session files for one run
- `--smoke` runs a narrow prompt-wiring smoke test instead of the full lane prompt
- `--agent <name>` overrides the Loom claim agent name
- `--dry-run` prints the generated Pi command and task prompt without launching Pi

Smoke test example:

```bash
pnpm pi:code-quality -- --task-id lm-12345678 --mode print --smoke --provider openai --model gpt-4o-mini
```

Use `--smoke` to verify repo context, Loom task fetch, prompt wiring, and Pi/OpenAI connectivity without launching the broader lane workflow. Keep the full lane run for real task execution.

For the non-interactive `print` and `json` modes, the lane runner now defaults to low thinking, no tools unless you explicitly pass `--tools`, and `--no-session` so kickoff and smoke runs stay ephemeral. That keeps one-shot responses fast and grounded.

For `interactive` mode, the lane runner now stores Pi sessions under `.pi/sessions/` by default instead of relying on a global session directory. That keeps repo work local to the workspace while leaving Pi auth and provider configuration alone. Use `--session-dir <dir>` if you need a different session location.

## Boundaries

Use Pi to replace the agent shell, not the repo's control plane.

Do not replace Loom, quality gates, or policy artifacts with Pi prompts. If Pi needs those surfaces, point it at the existing repo artifacts instead of rebuilding them inside the agent host.

## OpenAI Notes

Official Pi sources currently support both:

- OpenAI Platform API via `OPENAI_API_KEY`
- ChatGPT Plus/Pro via Pi `/login` and the `OpenAI Codex` OAuth provider

Project settings in this repo default Pi to the `openai` provider. If you want to use the ChatGPT subscription path as your primary provider, switch models interactively with `/model` after login or override the provider at launch time.
