# Cursor Directory Submission

Submit Ground MCP at: https://cursor.directory/mcp/new

## Submission Details

### Name
Ground

### Short Description
Evidence-first TypeScript, JavaScript, and Svelte code analysis for agents.

### Full Description
AI agents are confident. Too confident. They'll tell you two files are "95% similar" without ever comparing them. They'll declare code "dead" without checking who uses it.

Ground requires **verification before its claim tools record a finding**:

- **ground_compare** — Compare two files before claiming they're duplicates
- **ground_count_uses** — Count symbol uses before claiming code is dead
- **ground_find_orphans** — Check connections before claiming a module is orphaned
- **ground_find_drift** — Find design system violations (hardcoded colors, spacing)
- **ground_adoption_ratio** — Calculate design token adoption metrics

The 0.3.6 advisory release gate uses a checked-in calibration ledger, native and published-package receipts, and a 21-tool MCP smoke test. The calibration is not a population-wide accuracy estimate.

### Install Config

```json
{
  "command": "npx",
  "args": ["--yes", "-p", "@createsomething/ground-mcp", "ground-mcp"]
}
```

### Category
Developer Tools / Code Analysis

### Tags
- code-analysis
- duplicate-detection
- dead-code
- design-system
- grounding
- verification

### Links
- **Homepage**: https://createsomething.agency/products/ground
- **npm**: https://www.npmjs.com/package/@createsomething/ground-mcp
- **GitHub**: https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground
- **Case Study**: https://createsomething.io/papers/kickstand-triad-audit

### Logo
Use the CREATE SOMETHING logo or a shield icon representing "grounded/verified claims".

### Author
CREATE SOMETHING
- Website: https://createsomething.agency
- Email: hello@createsomething.io

---

## How to Submit

1. Go to https://cursor.directory/mcp/new
2. Log in (requires GitHub or other auth)
3. Fill in the details above
4. Submit for review

## Example Prompts for Users

After installation, users can ask Claude:

```
Find duplicate functions in src/ with at least 10 lines
```

```
Check if the old-utils module is still connected to anything
```

```
Run ground_analyze on packages/sdk to find dead code
```

```
Find design system drift in my components - hardcoded colors and spacing
```
