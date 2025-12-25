---
description: Generate and launch a harness spec for autonomous multi-session work
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Harness Command

Generate a harness spec from the current plan or conversation, then provide launch instructions.

## Workflow

1. **Check for existing plan**: Look for a plan file in `~/.claude/plans/` or ask user for context
2. **Generate spec**: Convert plan to harness-compatible format in `specs/` directory
3. **Create Beads issues**: Parse features into trackable issues
4. **Provide launch command**: Give user the exact command to run

## Spec Format (Critical)

Generate specs with this exact structure:

```markdown
# Project Title

## Overview

Brief description from plan context.
Include philosophy and acceptance criteria.

## Features

### Feature Name 1
Description with file paths.
- Acceptance criterion 1
- Acceptance criterion 2

### Feature Name 2
Next feature description.
- Criterion 1

### Verification
Final verification step.
- Run tests
- Check for regressions
```

## Execution Steps

1. Read the current plan file if it exists:
   ```bash
   ls ~/.claude/plans/*.md 2>/dev/null | head -1
   ```

2. If no plan exists, ask the user what work they want to automate

3. Generate the spec file:
   ```bash
   SPEC_NAME="[descriptive-kebab-case]"
   SPEC_FILE="specs/${SPEC_NAME}.md"
   ```

4. After writing the spec, provide this launch command:
   ```bash
   # Build harness if needed
   pnpm --filter=harness build

   # Launch harness
   node packages/harness/dist/cli.js start "$(pwd)/specs/${SPEC_NAME}.md"
   ```

## Arguments

The user may provide optional arguments:
- `$ARGUMENTS` - Description of what to automate, or path to plan file

## Example Output

After generating the spec:

```
Created: specs/canon-alignment.md

Features extracted:
1. Add components.css import to .ltd and .agency
2. Document .io view transition speed
3. Enhance .ltd H1 typography
4. Update css-canon.md documentation
5. Verification

Launch command:
node packages/harness/dist/cli.js start "$(pwd)/specs/canon-alignment.md"

Or with peer review:
node packages/harness/dist/cli.js start "$(pwd)/specs/canon-alignment.md" --reviewers security,architecture,quality
```

## Philosophy

**Zuhandenheit**: The harness disappears into work. Generate the spec, launch the command, walk away. Return to checkpoints.

**Weniger, aber besser**: Each feature must be independently completable. Not too granular (overhead), not too coarse (context overflow).
