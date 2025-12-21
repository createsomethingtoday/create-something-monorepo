# Mobile Responsive Tables

## Overview

Transform all tables across CREATE SOMETHING properties (space, io, agency, ltd) to be fully mobile responsive following Canon design principles.

**Philosophy**: Tables should recede into transparent data presentation. On mobile, they adapt without requiring horizontal scroll—the user sees the data, not the container.

**Current State**: 23 files with tables across 4 packages. Only 14% have any responsive handling (overflow-x-auto wrappers). No standardized mobile pattern exists.

**Approach**: Create a reusable responsive table pattern in `@create-something/components`, then migrate existing tables. For simple tables, use CSS-only card transformation. For complex tables, use collapsible rows.

**Canon Token Reference**:
- Background: `--color-bg-surface`, `--color-bg-subtle`
- Borders: `--color-border-default`, `--color-border-emphasis`
- Text: `--color-fg-primary`, `--color-fg-secondary`, `--color-fg-muted`
- Spacing: `--space-xs`, `--space-sm`, `--space-md`
- Transitions: `--duration-micro`, `--ease-standard`

## Features

### Create responsive table styles in components package
Add responsive table CSS utilities to `packages/components/src/lib/styles/tables.css`.
- Define `.responsive-table` base class with Canon tokens
- Add `@media (max-width: 768px)` card transformation pattern
- Each row becomes a stacked card with label:value pairs
- Headers hidden on mobile, data-label attributes shown
- Include `.table-scroll-hint` for tables that must scroll
- Export from `packages/components/src/lib/styles/canon.css`

### Update io admin subscribers table
Make `packages/io/src/routes/admin/subscribers/+page.svelte` mobile responsive.
- Add responsive-table class and data-label attributes
- Convert to card layout on mobile breakpoint
- Status badges stack below email on mobile
- Actions row becomes full-width button group
- Test at 375px viewport width

### Update io admin analytics tables
Make `packages/io/src/routes/admin/analytics/+page.svelte` tables mobile responsive.
- HighDensityTable components already compact, add overflow handling
- Stats grid already responsive, verify at mobile breakpoints
- Event tables use card layout on mobile
- Preserve Tufte high-density philosophy while adapting to mobile

### Update io papers tables
Make all paper tables in `packages/io/src/routes/papers/` mobile responsive.
- Files: harness-agent-sdk-migration, hermeneutic-debugging, ethos-transfer-agentic-engineering, understanding-graphs, autonomous-harness-architecture, kickstand-triad-audit, hermeneutic-spiral-ux, subtractive-form-design
- Add responsive-table class to existing table wrappers
- Data tables use card transformation
- Reference/comparison tables may keep scroll with hint indicator
- Maintain readability of code examples in table cells

### Update io experiments tables
Make `packages/io/src/routes/experiments/` tables mobile responsive.
- agent-continuity and template-recategorization pages
- Apply responsive-table pattern
- Feature comparison tables use card layout
- Preserve experiment data integrity at all viewport sizes

### Update space admin analytics table
Make `packages/space/src/routes/admin/analytics/+page.svelte` mobile responsive.
- Events table converts to card layout on mobile
- Each event shows category, action, target stacked
- URL truncates with ellipsis, tap to expand
- Timestamp shows relative time on mobile

### Update space experiments tables
Make `packages/space/src/routes/experiments/workway-canon-audit/+page.svelte` mobile responsive.
- Audit results table uses card layout on mobile
- Pass/fail indicators prominent on mobile
- Details expandable/collapsible per row

### Update ltd patterns tables
Make `packages/ltd/src/routes/patterns/` tables mobile responsive.
- principled-defaults and timeless-materials pages
- Pattern documentation tables use card layout
- Preserve semantic relationship between columns
- Consider/rationale columns stack on mobile

### Update ltd ethos and standards tables
Make `packages/ltd/src/routes/ethos/+page.svelte` and `packages/ltd/src/routes/standards/+page.svelte` mobile responsive.
- Philosophy tables use card layout on mobile
- Values and principles remain clear at all sizes
- Maintain typographic hierarchy on mobile

### Update templates-platform admin analytics table
Make `packages/templates-platform/src/routes/admin/analytics/+page.svelte` mobile responsive.
- Template performance table uses card layout
- Metrics stack vertically on mobile
- Sort controls remain accessible

### Update tufte HighDensityTable component
Enhance `packages/tufte/src/lib/components/HighDensityTable.svelte` for mobile.
- Already compact but ensure no horizontal overflow
- Reduce gap and padding at mobile breakpoint
- Rank column can hide on very small screens
- Percentage column optional via prop on mobile

### Update webflow-dashboard table components
Make `packages/webflow-dashboard/src/lib/components/ui/Table.svelte` and related components mobile responsive.
- Base Table component adds responsive wrapper
- TableRow component supports card mode via prop
- MarketplaceInsights leaderboard adapts to mobile
- Preserve existing scroll behavior as fallback

### Update maverick-admin dashboard tables
Make `packages/maverick-admin/src/routes/dashboard/` tables mobile responsive.
- Recent contacts table uses card layout on mobile
- Solutions table adapts for narrow viewports
- Action buttons accessible at all sizes

### Audit Canon compliance in all updated tables
Review all modified files for Canon token compliance.
- No hardcoded colors (hex, rgb, rgba)
- Use Canon spacing tokens not arbitrary values
- Use Canon timing for transitions
- Borders use `--color-border-default` or semantic variants
- Run `/audit-canon` on each modified directory

### Verification
Confirm all tables are mobile responsive with zero horizontal scroll issues.
- Build all packages: `pnpm build`
- Test each property at 375px, 428px, 768px viewports
- Verify no horizontal scroll on table pages
- Confirm card layouts readable with proper hierarchy
- Check transitions respect `prefers-reduced-motion`
- Grep for remaining non-responsive tables: `grep -r "overflow-x-auto" packages/*/src/routes/`
