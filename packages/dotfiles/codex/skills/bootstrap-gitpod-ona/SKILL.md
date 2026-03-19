---
name: bootstrap-gitpod-ona
description: Prepare Gitpod, Ona, and similar ephemeral cloud workspaces so repo-owned Codex skills, bootstrap commands, and verification checks are available before development begins. Use when Codex is running in Gitpod/Ona, a devcontainer, or another fresh workspace and needs to detect the environment, install repo-owned skills into $CODEX_HOME, verify workspace bootstrap, or adapt the same pattern to another project.
---

# Bootstrap Gitpod Ona

Use this skill before task work when the main risk is an unprepared workspace rather than missing application code.

## Start Here

1. Detect whether the workspace is ephemeral or freshly provisioned.
2. Find the canonical repo-owned Codex skill source.
3. Install the skills into `${CODEX_HOME:-$HOME/.codex}/skills`.
4. Verify the expected symlinks or copied directories exist.
5. Only then rely on the installed skills during follow-up work.

Check these signals first:

- environment variables such as `GITPOD_WORKSPACE_ID`, `GITPOD_REPO_ROOT`, or other platform-specific workspace markers
- bootstrap files such as `.gitpod.yml`, `.devcontainer/devcontainer.json`, `.devcontainer/post-create.sh`, or project setup scripts
- repo-owned skill directories such as `packages/dotfiles/codex/skills`, `skills/`, or another versioned shared skill path

## CREATE SOMETHING Workflow

In CREATE SOMETHING repositories, use this order:

1. Read `AGENTS.md` and the active workspace bootstrap files.
2. Treat `packages/dotfiles/codex/skills/` as the canonical repo-owned Codex skill source.
3. Use `pnpm --filter @create-something/dotfiles install-codex-skills` to link those skills into `${CODEX_HOME:-$HOME/.codex}/skills`.
4. If the install is still manual, add the install command to the workspace bootstrap path instead of documenting another one-off setup step.
5. After bootstrap, continue with the repo's normal coordination and quality workflow.

## Install And Verify

For this repo, prefer these commands:

```bash
pnpm install --frozen-lockfile
pnpm --filter @create-something/dotfiles install-codex-skills
ls -la "${CODEX_HOME:-$HOME/.codex}/skills"
```

Use a temporary install root when you only need verification and do not want to touch the current home directory:

```bash
export CODEX_HOME="$(mktemp -d)"
pnpm --filter @create-something/dotfiles install-codex-skills
ls -la "$CODEX_HOME/skills"
```

Confirm that:

- the target directory exists
- the expected skill names appear there
- symlinks resolve back to the repo-owned source directory when the installer uses symlinks
- the workspace bootstrap path runs the install automatically in fresh environments

## Adapt To Other Projects

When the user wants the same pattern in another repo or package:

1. Find the shared skill source for that project.
2. Avoid duplicating the same skill in multiple packages unless those packages are intentionally standalone.
3. Install from the shared source into `${CODEX_HOME:-$HOME/.codex}/skills`.
4. Wire the install into the workspace's real bootstrap mechanism:
   - `.gitpod.yml`
   - a Gitpod init task
   - a devcontainer `postCreateCommand`
   - a project setup script
   - a workspace image build step
5. Keep the skill definition versioned with the repo instead of relying on manual copy-paste.

Prefer a repo-level skill when the workflow is reused across multiple packages or instances. Prefer a package-local skill only when the workflow is tightly coupled to one isolated package and would create noise elsewhere.

## Escalate

Ask before:

- writing secrets into shared workspace config
- changing a platform-owned Gitpod or Ona image outside the current repo
- replacing an org-wide bootstrap path that other teams may depend on
- installing duplicate skill trees from multiple sources into the same Codex home
