# T3 Code project workflow

The repo's [`t3.json`](../../t3.json) shares five actions. Import them in T3 Code
under **Settings → Projects → Actions**, with this project selected. Importing
copies the list into that environment's project settings; import updated actions
again when the repo definitions change. Save the previous project list before
replacing it.

To add just **Check workspace**, open the thread's action menu and select it
under **From t3.json → Import**. Importing saves the action; select the imported
action again to run it in the thread's checkout. Read back the effective action
list in the selected project's environment before and after adoption. The repo
file alone does not describe inherited or environment-specific settings.

| Action | Behavior |
| --- | --- |
| Check workspace | Summarizes Git identity, change entries and local upstream state; offers a read-only next command. Full unexecuted validation inventory is available with `--json`. Requires Node and Git, with no dependency bootstrap. |
| Bootstrap worktree | Runs the repo-pinned Node/pnpm bootstrap after T3 creates a worktree. `async: false` holds the agent until setup exits. |
| Agency dev | Builds the shared libraries used by Agency and starts its development server. Stop its terminal when finished. |
| Developer workflow checks | Runs the focused checkout-registration tests. Package-specific checks still belong to the task's acceptance criteria. |
| Linear ready | Reads the ready queue using the existing Infisical login and project configuration. It requires permission to read that secret environment. |

Only bootstrap runs automatically. Workspace and model defaults remain inherited.
Use the local checkout for solo exploration; use a T3-managed worktree for isolated
implementation. A setup failure needs diagnosis and a successful rerun before
running dependency-based checks. The helper scripts use pinned tooling even when
`pnpm` is absent from the host's `PATH`.

## Register a T3-created checkout

T3 owns worktree creation and the thread's checkout binding. In that worktree,
register the existing checkout with the owning Linear issue:

```bash
infisical run --env=prod --path=/ --include-imports=true --silent -- \
  bash scripts/ona-bootstrap-local.sh pnpm agent:claim-worktree -- \
  --issue CRE-123 --register-existing --worktree "$PWD" --base origin/main
```

Registration validates the checkout and records its actual branch, path, and base.
It does not create a second checkout or reset the branch. Use `--dry-run --json`
to inspect the validated handoff before Linear writes. Existing-worktree
registration does not fetch; refresh remote refs separately when the task needs
current upstream evidence. Keep the Linear closeout's `Worktree disposition:`
explicit.

## Choose a workflow entry point

For repository implementation and review, state the request normally. The repo's
agent instructions route it through [`canon-work`](../../.agents/skills/canon-work/SKILL.md),
which selects the relevant specialists; no manual skill sequence is needed.
The skill can also be selected explicitly. These tracked files are local source, not evidence that a
running T3 session has discovered the skill or imported the action. Native action
imports remain scoped to the selected project and environment.

| Skill | Use it for |
| --- | --- |
| [`$cs-context`](../../.agents/skills/cs-context/SKILL.md) | Recovering previous decisions or unfamiliar project context, then checking current sources. |
| [`$cs-build`](../../.agents/skills/cs-build/SKILL.md) | Implementing a scoped feature or bug with acceptance criteria and independent verification. |
| [`$cs-design`](../../.agents/skills/cs-design/SKILL.md) | Applying Canon research and reviewing a rendered UI against its baseline. |
| [`$cs-release`](../../.agents/skills/cs-release/SKILL.md) | Completing authorized promotion or handoff with durable evidence and rollback. |

Canonical instructions live under `.agents/skills/`. The four `cs-*` specialists
have shared Claude skill links. The new `canon-work` route is configured through
`AGENTS.md`; discovery and use were exercised in Codex. Other providers need
their own discovery and routing verification before adoption. After installing
or changing skills, use T3's **Restart agent session** command so the next turn
discovers the updated setup.
History can locate evidence; current source and the owning service establish
current state. Partial CTX coverage is reported rather than repaired on every task.

This workstation also has reviewed copies at `~/.codex/skills/cs-*/SKILL.md`
for discovery before older checkouts contain the shared skills. Update each copy
deliberately from its canonical repo skill when its instructions change.

The release entry point records the issue, acceptance criteria, exact artifact,
three quality gates, PR/deployment evidence, rollback, next owner, and explicit
worktree disposition. Preserve those receipts in Linear and the owning artifact
location before temporary captures or worktrees expire.

## Workstation visibility and retention

Keep the project's Sol 6.1 medium-effort default for normal implementation;
increase effort when difficult debugging or consequential review warrants it.
In **Settings → Appearance → Thread details**, enable **Usage limits** and
**Context window**. These are the current thread-details controls; enabling the
legacy context meter as well is unnecessary.

On this workstation, **Settings → Maintenance → Artifacts and logs** retains
browser captures and rotated logs for 30 days. This gives review evidence more
time than the previous eight-day window. Worktree cleanup settings are unchanged.
Capture retention is not a durable evidence store: copy required proof into the
owning artifact location and link it in Linear before cleanup, including before
merge-triggered worktree removal. Settings apply to the selected environment;
do not assume offline machines received them.

## Validation and rollback

Run `node --test scripts/test/canon-work-*.test.mjs` for the local entry point.
The read-only workspace command also accepts a directory, including from a
subdirectory when invoked using its actual script path.
`node .agents/skills/canon-work/scripts/plan-actions.mjs path/to/t3.json` prints
a proposed configuration to stdout without writing or importing it; it preserves
existing fields, rejects name conflicts and limits the proposal to 50 actions.
It validates action fields only, not the entire T3 schema.

Run **Developer workflow checks**, validate `t3.json` against its declared schema,
and confirm the imported project actions by reading them back. A new-worktree
smoke should confirm bootstrap finishes before the agent begins dependency-based
work. Config readback alone does not establish that runtime ordering.

For source-only rollback, remove the canon-work routing paragraph, skill folder,
Check workspace action and accompanying documentation/tests, preserving unrelated
changes and the four pre-existing actions. No global skill installation is needed.

If adoption added only **Check workspace**, delete that added action in the same
project and environment, then read back the remaining list. Preserve subsequent
edits and do not reset the whole list merely to remove one action.

To roll back a local activation, restore the saved project action list. If the
prior list inherited its environment's actions, choose **Reset Actions to default**.
Remove a rollout-installed global skill copy only if it still matches the installation
receipt's SHA-256; preserve any subsequent edits. Revert the corresponding repo
change through the normal Git review path. Do not delete worktrees or undo their
Linear ownership records as a configuration rollback.

T3 contracts: [project settings](https://github.com/pingdotgg/t3code/blob/main/docs/user/project-settings.md),
[project schema](https://t3.codes/schema/t3.json), and
[skill discovery](https://github.com/pingdotgg/t3code/blob/main/docs/user/composer.md#commands-and-skills).
