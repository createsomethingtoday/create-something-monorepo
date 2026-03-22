# Code-Quality Pi Lane

This lane replaces the old Code-Quality Symphony workflow.

Use it for implementation, bug fixing, refactors, test repair, typecheck cleanup, and narrow code-quality tasks labeled `code-quality` in Loom.

## Start

```bash
pnpm loom:remote list --status ready --label code-quality
pnpm pi:code-quality -- --task-id <id> --claim
```

## Operating rules

- Keep Loom as the task source of truth.
- Make the smallest defensible code change first.
- Verify with the narrowest relevant surface before widening to full-repo checks.
- Leave evidence for the operator to record in Loom.

## Default validation order

1. **Priority:** Begin with package-level or file-targeted checks to ensure focused validation.
2. **Command:** Run `pnpm check`, prioritizing the smallest relevant lane check to maintain flow stability.
3. **Command:** Next, execute `pnpm lint` to catch any linting issues before broader tests.
4. **Command:** Finally, run `pnpm test` to validate functionality.

**Note:** Always prefer the first trustworthy command over the largest possible command to avoid stalling.

**Note:** Ensure to prefer the smallest trustworthy command over the largest possible command.

Prefer the first trustworthy command over the largest possible command.
