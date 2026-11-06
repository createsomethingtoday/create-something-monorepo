# T3 Code project workflow

The repo's [`t3.json`](../../t3.json) shares four actions. Import them in T3 Code
under **Settings → Projects → Actions**, with this project selected. Importing
copies the list into that environment's project settings; import updated actions
again when the repo definitions change. Save the previous project list before
replacing it.

| Action | Behavior |
| --- | --- |
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

Each entry point composes the existing repository policies and specialist skills.
Use the one that fits the task, and load another only when the work reaches it.

| Skill | Use it for |
| --- | --- |
| [`$cs-context`](../../.agents/skills/cs-context/SKILL.md) | Recovering previous decisions or unfamiliar project context, then checking current sources. |
| [`$cs-build`](../../.agents/skills/cs-build/SKILL.md) | Implementing a scoped feature or bug with acceptance criteria and independent verification. |
| [`$cs-design`](../../.agents/skills/cs-design/SKILL.md) | Applying Canon research and reviewing a rendered UI against its baseline. |
| [`$cs-release`](../../.agents/skills/cs-release/SKILL.md) | Completing authorized promotion or handoff with durable evidence and rollback. |

Canonical instructions live under `.agents/skills/`, with shared Claude skill
links. After installing or changing skills, use T3's
**Restart agent session** command so the next turn discovers the updated setup.
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

Run **Developer workflow checks**, validate `t3.json` against its declared schema,
and confirm the imported project actions by reading them back. A new-worktree
smoke should confirm bootstrap finishes before the agent begins dependency-based
work. Config readback alone does not establish that runtime ordering.

To roll back a local activation, restore the saved project action list. If the
prior list inherited its environment's actions, choose **Reset Actions to default**.
Remove a rollout-installed global skill copy only if it still matches the installation
receipt's SHA-256; preserve any subsequent edits. Revert the corresponding repo
change through the normal Git review path. Do not delete worktrees or undo their
Linear ownership records as a configuration rollback.

T3 contracts: [project settings](https://github.com/pingdotgg/t3code/blob/main/docs/user/project-settings.md),
[project schema](https://t3.codes/schema/t3.json), and
[skill discovery](https://github.com/pingdotgg/t3code/blob/main/docs/user/composer.md#commands-and-skills).
