---
description: Audit a codebase for Policy OS governance gaps
argument-hint: "[path]"
---

Load the policy-os-starter skill, then audit `$@` for governance gaps.

## Checks

### 1. Quality Gate Coverage
- Are there pre-commit hooks? (`husky`, `lint-staged`, `.husky/`)
- Are there CI checks? (`.github/workflows/`, type check, lint, test)
- Is there a design system enforced? (token compliance, component library)

### 2. Agent Legibility
- Does each package have a clear entry point?
- Is there a boot command documented?
- Is there a smoke/validation path?
- Is there an escalation rule?

### 3. Policy Artifacts
- Are there versioned policy files? (`policies/`, `*.policy.*`)
- Are approval gates defined?
- Are escalation paths documented?

### 4. Evidence Surface
- Where is delivery evidence recorded?
- Is there an issue tracker integration?
- Are deploys traceable to issues?

### 5. Subtractive Triad Compliance
- **DRY**: Any obvious duplication across packages?
- **Rams**: Any packages/files that don't earn their existence?
- **Heidegger**: Any orphaned code that doesn't serve the whole?

## Output

```
## Policy Audit: [path]

### Governance Score: [0-100]

### Quality Gates: [score]
- ...

### Agent Legibility: [score]
- ...

### Policy Artifacts: [score]
- ...

### Evidence Surface: [score]
- ...

### Recommendations (prioritized)
1. ...
2. ...
3. ...

### Policy OS Fit
- Current tier: [MCP-only | Policy OS Trial | Policy OS Core]
- Recommended tier: ...
- Key gap: ...
```
