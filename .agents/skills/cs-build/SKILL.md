---
name: cs-build
description: Implement CREATE SOMETHING changes through scoped acceptance criteria, checkout ownership, regression checks, and independent verification. Use for feature or bug implementation; use cs-context for research alone and cs-release for promotion.
---

# CREATE SOMETHING build

Resolve paths from the repository root. The applicable `AGENTS.md`, owning
package, and the user's current scope govern this loop.

1. State the observable acceptance criteria and identify the tier served:
   Database, Automation, or Judgment. Use `$cs-context` when prior decisions or
   unfamiliar ownership affect the change. Read owning source before choosing
   symbols, imports, or an implementation.
2. Establish checkout ownership. Use the solo loop for one operator's bounded
   exploration; track shared, delegated, long-running, or production-bound work
   in Linear. In a T3-created worktree, register that actual checkout using
   `--register-existing`; do not create a second one. Follow
   `docs/guides/T3_CODE_WORKFLOW.md` for the command and bootstrap contract.
3. Choose only the specialist guidance needed for the change:
   - Behavior or bug: `packages/dotfiles/codex/skills/tdd-vertical-slice/SKILL.md`.
     Demonstrate a failing regression before a bug fix, then a passing check.
   - Unclear failure: `packages/dotfiles/codex/skills/debug-feedback-loop/SKILL.md`.
   - Material UI change: `.agents/skills/cs-design/SKILL.md`.
   Load another domain skill only when its decisions apply.
4. Implement a bounded slice and exercise its public behavior. Run the checks
   relevant to the affected package and acceptance criteria. When UI changes,
   inspect the actual rendered states and interactions. Distinguish fixtures,
   local runtime, and live evidence; a build alone does not establish UX quality.
5. Correct demonstrated findings and rerun affected checks. Follow the applicable
   `AGENTS.md` delegation limits and independent Sol 6.1 final re-test requirement;
   give the reviewer the acceptance criteria and actual artifact. The parent
   owns integration and the done decision. End when criteria pass or a specific
   blocker leaves named work unresolved.

Report functional correctness, perceptual/product quality, and release readiness
as passed, failed, untested, or not-applicable, with evidence and limits. Use
`.agents/skills/cs-release/SKILL.md` when promotion or final delivery is in scope.
An implementation request does not erase explicit read-only, no-merge, no-deploy,
or approval boundaries, and completion evidence does not create new authority.
