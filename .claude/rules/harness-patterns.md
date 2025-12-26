# Harness Patterns

**Use the `harness` subagent** for autonomous work orchestration.

```bash
bd work cs-xyz                   # Work on issue
bd work --create "Fix button"    # Create and work
bd work --spec specs/feature.md  # Parse spec
```

The harness subagent handles: complexity detection, model routing, session protocols, two-stage completion (`code-complete` → `verified`), and Beads integration.

Invoke explicitly or let Claude delegate when `bd work` or harness operations are needed.
