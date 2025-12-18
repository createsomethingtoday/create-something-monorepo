# CREATE SOMETHING Canon Alignment

## Overview

Ensure all four CREATE SOMETHING properties follow the Canon design system consistently. The foundation is solid—Canon tokens are centralized at `@create-something/components` and all properties import them correctly. This spec addresses the remaining violations to achieve full alignment.

**Principle**: Tailwind for structure, Canon for aesthetics.

**Current State**:
- `.ltd` — 98% compliant (exemplary reference)
- `.agency` — 99% compliant (strong)
- `.space` — 85% compliant (experimental drift)
- `.io` — 75% compliant (analytics library violations)

## Features

### TufteDashboard Refactor
- Audit TufteDashboard.svelte for Tailwind color violations
  - 53 violations in single component
  - Primary patterns: text-white/40, bg-white/5, rounded-lg
- Create Canon-compliant wrapper styles
  - Map Tailwind opacity variants to Canon tokens
  - Replace bg-white/5 with var(--color-bg-subtle)
  - Replace text-white/40 with var(--color-fg-muted)
  - Replace text-white/60 with var(--color-fg-tertiary)
- Update data visualization colors to use Canon palette
  - Use --color-data-1 through --color-data-6
  - Ensure semantic color consistency
- Verify TufteDashboard renders correctly after migration

### IO Legacy Alias Deprecation
- Audit io/src/app.css legacy aliases
  - --bg-primary, --bg-secondary, --text-primary, etc.
  - These duplicate Canon tokens with old names
- Search io codebase for legacy alias usage
  - Document all files using old naming
  - Count instances per file
- Replace legacy aliases with Canon equivalents
  - --bg-primary becomes var(--color-bg-pure)
  - --text-primary becomes var(--color-fg-primary)
  - --spacing-section becomes var(--space-2xl)
- Remove legacy aliases from io/src/app.css
- Verify io builds and renders correctly

### IO Experimental Routes Cleanup
- Audit io experimental routes for violations
  - data-patterns, agentic-visualization routes
  - Documentation routes (categories, terms, privacy)
- Migrate hardcoded Tailwind colors to Canon tokens
  - Focus on bg-red-500/10, border-red-500/20 patterns
  - Replace with semantic error/warning tokens
- Update typography to use Canon scale
  - Replace text-sm with var(--text-body-sm)
  - Replace text-xs with var(--text-caption)

### Space Experimental Boundary
- Document experimental route Canon policy
  - Experiments may drift during development
  - Production experiments should align before merge
- Audit motion-ontology route (21 violations)
  - Migrate bg-black/50 to var(--color-bg-surface)
  - Migrate border-white/10 to var(--color-border-default)
  - Update input styling to use Canon tokens
- Audit minimal-capture route (6 violations)
  - Replace Tailwind opacity patterns
- Audit workway-canon-audit route (6 violations)
  - Ironic: Canon audit page has Canon violations
  - Fix for philosophical consistency

### Shared Canon Utilities
- Create utility classes in components/styles/canon.css
  - .text-muted for var(--color-fg-muted)
  - .text-tertiary for var(--color-fg-tertiary)
  - .bg-subtle for var(--color-bg-subtle)
  - .bg-hover for var(--color-hover)
- Document utility class usage in css-canon.md rules
  - When to use utility vs inline style
  - Pattern examples for common violations
- Update components.css with opacity utilities
  - Standardize hover state patterns
  - Create elevation transition utilities

### Agency Verification
- Verify agency maintains 99% compliance
  - Check experiments/[slug]/+page.svelte (1 violation)
  - Fix or document as intentional
- Confirm The Stack remains isolated
  - Client work intentionally outside Canon
  - No changes needed

### LTD Verification
- Verify ltd maintains 98% compliance
  - Check standards/+page.svelte (1 violation)
  - Likely documentation showing violations
- Document ltd as canonical reference
  - Other properties should match ltd patterns
  - Longest view-transition-duration (500ms) is intentional

### Cross-Property Audit
- Run Canon audit across all properties
  - Use /audit-canon slash command
  - Generate violation report
- Verify shared components are Canon-compliant
  - Button, Card, Heading, Navigation, Footer
  - All 18+ components in packages/components
- Document final compliance percentages
  - Target: 95%+ for all core properties
  - Experiments may remain at 85%

## Technical Requirements

- All changes must pass TypeScript type checking
- No visual regressions (verify in browser)
- Canon tokens must be used via CSS custom properties
- Tailwind utilities allowed only for layout (flex, grid, spacing)
- Run pnpm build for each modified package
- Commit atomic changes per feature section

## Success Criteria

- `.io` compliance rises from 75% to 95%+
- `.space` compliance rises from 85% to 95%+
- `.agency` and `.ltd` maintain 98%+ compliance
- Zero Canon violations in shared components
- Legacy aliases removed from io/src/app.css
- Documentation updated in .claude/rules/css-canon.md
