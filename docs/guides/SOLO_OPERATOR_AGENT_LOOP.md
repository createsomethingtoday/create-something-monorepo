# Solo Operator Agent Loop

This guide codifies the Peter Steinberger-inspired fast lane for CREATE
SOMETHING when the operator is working alone and wants maximum iteration speed.

The point is not to remove governance. The point is to move governance to the
places where it buys confidence: validation, review, promotion, rollback, and
production evidence.

## When To Use This

Use the solo loop when:

- one operator owns the current checkout
- the work is exploratory, low-risk, or easy to validate locally
- the fastest trustworthy evidence is a CLI, test, smoke, preview, or browser
  check
- the operator can watch the agent stream and interrupt on drift
- production promotion is not being requested yet

Do not use this path for shared production promotion, concurrent edits to the
same surface, security-sensitive changes, destructive migrations, credential
rotation, or work where another operator needs a durable handoff before the
change is understood.

## Command

Run the readiness check from the checkout you intend to use:

```bash
pnpm agent:solo-loop
```

Use JSON output for dashboards or higher-level agents:

```bash
pnpm agent:solo-loop:json
```

Run the fast contract checks before relying on this lane for broader work:

```bash
pnpm agent:solo-loop:check
```

The check includes an advisory Ground review of package source changed from
`origin/main`. The receipt reports every discovered change, which files Ground
could analyze with its duplicate and orphan checks, explicit coverage
exclusions, and verified findings. During calibration, a finding or unavailable
Ground binary is visible in the step evidence but does not make the solo-loop
fail.

Run or capture the receipt directly when it belongs in a Linear or promotion
handoff:

```bash
pnpm ground:review -- --base origin/main
pnpm ground:review:json -- --base origin/main
```

The pilot covers changed TypeScript, JavaScript, and `.mjs` files beneath a
package with `package.json`. Svelte, Rust, root scripts, other unsupported
paths, and source files following the repository's
`*.generated.{ts,tsx,js,jsx,mjs}` convention remain named exclusions rather
than being reported as checked-clean.

Keep the receipt advisory until at least 20 representative PRs have recorded
finding precision, false positives, and coverage exclusions. Promotion to a
blocking gate requires an explicit policy change based on that calibration; a
successful advisory receipt is not approval to merge or deploy.

The default command is read-only. It reports checkout dirtiness, upstream
divergence, Codex command availability, and the recommended operating
loop. It does not mutate git, Linear, deployments, secrets, or production
state.

## Root Home-Base Contract

The repository root is useful as a boring control surface only while it is
clean `main` at the exact `origin/main` SHA. Verify that stronger invariant
before starting a root-home-base loop:

```bash
pnpm agent:home-base
```

The command is read-only and fails when the checkout is dirty, not on `main`,
does not track `origin/main`, is ahead or behind, or resolves to a different
SHA. A failure means use or claim an isolated worktree; it is not permission to
reset, stash, delete, or overwrite existing work.

Generate an inspectable starter prompt for the next loop without launching or
mutating anything:

```bash
pnpm agent:solo-loop:starter
pnpm agent:solo-loop -- --task "Add a CLI smoke for the template sync path"
```

The starter output includes the provider launch shape plus the prompt to paste
or hand to the worker. Use `--starter` without `--task` when you want the same
prompt scaffold with a task placeholder.

## Spark Mode

Use Codex Spark inside the solo loop when speed is the constraint and the
operator is actively watching:

- interactive UI/code edits with hot reload or quick tests
- fast repo scans where the output is a short target list
- Slack, Drive, Meet, GitHub, or log summaries that inform the next task
- duplicate issue or PR-comment triage before a deeper implementation pass

Keep the task compact and inspectable. Spark mode should produce one patch,
one target inventory, or one handoff packet at a time. Escalate to the strongest
full Codex model when the task needs long unattended reasoning, production
promotion, security review, destructive actions, or high-confidence final
judgment.

## Operating Loop

1. Work in the current checkout when the operator owns it.
2. Give the agent one compact task with the nearest command, file, or failing
   output.
3. Prefer CLI-verifiable surfaces. If a feature lacks a useful CLI or smoke,
   add the smallest one.
4. Watch the stream. Interrupt, redirect, or queue follow-up work when the
   agent drifts.
5. Ask for tests or write targeted tests in the same context so the model can
   use its fresh understanding.
6. Keep docs and `AGENTS.md` focused enough that the agent loads a map, not a
   manual.
7. Commit only when a commit improves review, rollback, production promotion,
   or durable handoff.

## Peter-Style Biases Adopted Here

- **Current checkout first**: do not force a Linear issue or worktree for every
  solo exploratory change.
- **CLI-first products**: agents need commands they can call to close their own
  loops.
- **Short prompts, strong context**: encode recurring facts in repo docs,
  package scripts, `AGENTS.md`, and skills instead of repeating long prompts.
- **Human steering**: the operator watches the stream and corrects direction
  early.
- **Small tasks in queue**: prefer several small loop iterations over one broad
  unsupervised run.

## Boundaries That Stay

Production promotion still needs provenance:

- branch, PR, merge, and deploy evidence by default
- or an explicitly approved immutable release path with equivalent rollback
  properties

Use `pnpm agent:claim-worktree -- --issue CRE-123` instead of the solo loop when
work needs shared ownership, parallel isolation, long-running background
execution, or cleanup guarantees.

At tracked-work closeout, record one explicit `Worktree disposition:` value in
Linear: `removed`, `preserved at <path/branch>`, or `retained until
<checkpoint>`. Clean status alone does not prove a worktree is safe to remove.

Use Linear when the work should be tracked across sessions, delegated to
another agent, reported externally, or marked complete with durable evidence.

## Local Ornith Use

Ornith is the local, open-weight execution lane for coding tasks that should not
consume metered model-API tokens. Run it through the governed operator-agent or
Zellij surfaces; Codex, Symphony, Linear, worktree contracts, and receipts retain
loop ownership and done authority.

"Tokenless" means no metered model-API tokens on the Ornith path. Local compute,
electricity, storage, and operator time remain real costs.

## Quick Decision Table

| Situation                                      | Preferred lane                                             |
| ---------------------------------------------- | ---------------------------------------------------------- |
| Solo exploratory edit                          | `pnpm agent:solo-loop` plus current-checkout agent session |
| Low-risk DEV or preview deploy                 | Git-light delivery with Linear evidence if useful          |
| Shared production change                       | branch, PR, merge, deploy, post-deploy verification        |
| Parallel agent work touching overlapping files | Linear plus isolated worktrees                             |
| Untrusted or destructive test                  | disposable sandbox such as E2B                             |

## Validation

For this guide and its command:

```bash
pnpm agent:solo-loop:test
node --test scripts/test/ground-review.test.mjs
pnpm agent:solo-loop:check
git diff --check
```
