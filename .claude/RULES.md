# CREATE SOMETHING Rules Registry

This index catalogs all domain-specific rules that agents should apply during development. Rules differ from skills: **skills are invocable procedures**, while **rules are always-active constraints**.

## Loading

Rules without frontmatter load every session and count toward Claude Code's 150k-char instruction budget. Rules marked **path-scoped** carry a `paths:` frontmatter list and load only when Claude reads a matching file. Keep the always-on set small; scope anything domain-specific.

## Quick Reference by Impact Tier

### P0 — Critical (Always Apply)

| Rule | Triggers | Domain |
|------|----------|--------|
| [css-canon](#css-canon) | `*.svelte`, `*.css` | Design system |
| [voice-canon](#voice-canon) | `*.md`, content creation | Writing |
| [sveltekit-conventions](#sveltekit-conventions) | `*.svelte`, `*.ts` in routes | Framework |
| [error-handling-patterns](#error-handling-patterns) | API routes, server code | Reliability |

### P1 — Important (Apply for Context)

| Rule | Triggers | Domain |
|------|----------|--------|
| [cloudflare-patterns](#cloudflare-patterns) | D1, KV, Workers code | Infrastructure |
| [context7-patterns](#context7-patterns) | External library/API docs | Grounding |
| [harness-patterns](#harness-patterns) | Single-session work | Workflow |
| [hipaa-compliance](#hipaa-compliance) | Medical/dental packages (path-scoped) | Compliance |

### P2 — Contextual (Apply When Relevant)

| Rule | Triggers | Domain |
|------|----------|--------|
| [dental-api-integration](#dental-api-integration) | Dental package (path-scoped) | Domain |
| [dental-scheduling](#dental-scheduling) | Dental scheduling (path-scoped) | Domain |
| [social-patterns](#social-patterns) | Social media posting (path-scoped) | Content |
| [paper-content-requirements](#paper-content-requirements) | Paper writing (path-scoped) | Content |

### P3 — Specialized (Apply for Specific Domains)

| Rule | Triggers | Domain |
|------|----------|--------|
| [dotfiles-conventions](#dotfiles-conventions) | `packages/dotfiles` (path-scoped) | Configuration |
| [neomutt-patterns](#neomutt-patterns) | Neomutt config (path-scoped) | Configuration |
| [PROJECT_NAME_REFERENCE](#project_name_reference) | Project naming | Reference |

---

## By Category

### Design System

#### css-canon
- **File**: `rules/css-canon.md`
- **Priority**: P0
- **Triggers**: `*.svelte`, `*.css`, any styling work
- **Summary**: Tailwind for structure, Canon tokens for aesthetics. Single source of truth: `packages/components/src/lib/styles/tokens.css`
- **Key Rules**:
  - Use `var(--color-*)` not `bg-white/10`
  - Use `var(--radius-*)` not `rounded-lg`
  - Use `var(--duration-*)` for animations
  - Respect `prefers-reduced-motion` and `prefers-contrast: more`

---

### Voice & Content

#### voice-canon
- **File**: `rules/voice-canon.md`
- **Priority**: P0
- **Triggers**: `*.md` files, documentation, any writing
- **Summary**: Five principles: Clarity over cleverness, Specificity over generality, Honesty over polish, Useful over interesting, Grounded over trendy
- **Key Rules**:
  - No marketing jargon (cutting-edge, revolutionary, leverage)
  - All claims must be measurable
  - Document failures alongside successes

#### social-patterns
- **File**: `rules/social-patterns.md`
- **Priority**: P2
- **Triggers**: Social media content, public posting
- **Summary**: Voice guidelines for social media presence

#### paper-content-requirements
- **File**: `rules/paper-content-requirements.md`
- **Priority**: P2
- **Triggers**: Paper creation in `packages/io/src/routes/papers/`
- **Summary**: Required sections and structure for research papers

---

### Framework & Infrastructure

#### sveltekit-conventions
- **File**: `rules/sveltekit-conventions.md`
- **Priority**: P0
- **Triggers**: Any SvelteKit route, `+page.svelte`, `+server.ts`, `+layout.svelte`
- **Summary**: File structure, routing patterns, type generation, component patterns
- **Key Rules**:
  - Use `$props()` not `export let`
  - Use `{@render children?.()}` for slots
  - Types from `./$types`

#### cloudflare-patterns
- **File**: `rules/cloudflare-patterns.md`
- **Priority**: P1
- **Triggers**: D1 queries, KV operations, Workers, deployment
- **Summary**: D1/KV access patterns, Wrangler types, project naming
- **Key Rules**:
  - Always use `platform?.env.DB` in load functions
  - Generate types with `wrangler types`
  - Use exact project names (see table in doc)

#### error-handling-patterns
- **File**: `rules/error-handling-patterns.md`
- **Priority**: P0
- **Triggers**: API routes, server-side code, error boundaries
- **Summary**: Consistent error handling across the monorepo

#### context7-patterns
- **File**: `rules/context7-patterns.md`
- **Priority**: P1
- **Triggers**: External library/API documentation, setup/configuration, version-sensitive code generation
- **Summary**: Use Context7 MCP to pull up-to-date, version-specific docs/examples into context

---

### Workflow & Orchestration

  - Use for work >2 hours
  - Checkpoints every 15 minutes
  - Budget warnings at 80%, hard stop at 100%

#### harness-patterns
- **File**: `rules/harness-patterns.md`
- **Priority**: P1
- **Triggers**: Single-session work, Linear-tracked issues
- **Summary**: Single-session orchestration with quality gates

---

### Domain-Specific

#### hipaa-compliance
- **File**: `rules/hipaa-compliance.md`
- **Priority**: P1
- **Triggers**: Medical/dental packages, PHI handling
- **Summary**: HIPAA compliance requirements for healthcare verticals
- **Key Rules**:
  - Never log PHI
  - Encrypt data at rest and in transit
  - Audit trail for all PHI access

#### dental-api-integration
- **File**: `rules/dental-api-integration.md`
- **Priority**: P2
- **Triggers**: `packages/tend/src/lib/verticals/dental/**`
- **Summary**: Integration patterns for dental practice management APIs

#### dental-scheduling
- **File**: `rules/dental-scheduling.md`
- **Priority**: P2
- **Triggers**: Dental scheduling features
- **Summary**: Scheduling logic and appointment management

---

### Integration & Configuration

#### dotfiles-conventions
- **File**: `rules/dotfiles-conventions.md`
- **Priority**: P3
- **Triggers**: `packages/dotfiles`
- **Summary**: Conventions for dotfiles management

#### neomutt-patterns
- **File**: `rules/neomutt-patterns.md`
- **Priority**: P3
- **Triggers**: Neomutt configuration
- **Summary**: Neomutt email client configuration patterns

#### PROJECT_NAME_REFERENCE
- **File**: `rules/PROJECT_NAME_REFERENCE.md`
- **Priority**: P3
- **Triggers**: Project naming, Cloudflare project references
- **Summary**: Reference for project naming conventions

---

## Archived Rules

Retired patterns live in `docs/archive/claude-rules/` and are not loaded. Read them only for historical context.

| File | Why archived |
|------|--------------|
| `gastown-patterns.md` | tmux multi-agent orchestration; `gt` is not installed, superseded by Agent tool subagents |
| `ralph-patterns.md` | PRD loop; superseded by Linear-tracked harness work |
| `beads-patterns.md` | `bd` issue tracking; Linear is the source of truth |
| `orchestration-patterns.md` | `orch` CLI (Phase 1 only, never shipped further) |
| `dual-agent-routing.md` | Gemini/Codex routing experiment, marked not viable 2026-01 |
| `model-routing-optimization.md` | Model routing for Gastown/harness swarms |
| `lsp-mcp-patterns.md` | lsmcp removed from MCP config 2026-09-09 |
| `taste-reference.md` | Are.na curation reference; consult via `css-canon` skill when needed |

---

## Trigger Patterns

Rules activate based on file patterns and contexts:

### File-Based Triggers

| Pattern | Rules Applied |
|---------|---------------|
| `*.svelte` | css-canon, sveltekit-conventions |
| `*.css` | css-canon |
| `*.md` | voice-canon |
| `+page.server.ts` | sveltekit-conventions, error-handling-patterns |
| `+server.ts` | sveltekit-conventions, cloudflare-patterns, error-handling-patterns |
| `packages/io/src/routes/papers/**` | paper-content-requirements, voice-canon |
| `packages/tend/src/lib/verticals/dental/**`, `packages/agent-sdk/**` | hipaa-compliance, dental-api-integration, dental-scheduling |
| `packages/dotfiles/**` | dotfiles-conventions (+ neomutt-patterns under `neomutt/`) |
| `packages/agency/**/social/**`, `packages/social-*/**` | social-patterns |

### Context-Based Triggers

| Context | Rules Applied |
|---------|---------------|
| Creating issue | Linear (`pnpm linear:*`) |
| Single-session work | harness-patterns |
| Deployment | cloudflare-patterns |
| Social posting | social-patterns, voice-canon |
| Design decisions | css-canon |

---

## Priority Decision Matrix

When multiple rules apply, use priority to resolve conflicts:

```
P0 rules ALWAYS apply (no exceptions)
P1 rules apply unless explicitly overridden for context
P2 rules apply when their domain is active
P3 rules apply only when specifically relevant
```

### Conflict Resolution

| Conflict Type | Resolution |
|---------------|------------|
| P0 vs P1 | P0 wins |
| P1 vs P1 | Both apply (usually complementary) |
| P2 vs P2 | Context determines which is more relevant |
| Any rule vs experiment route | Rule is relaxed during development, enforced before merge |

---

## Adding New Rules

1. Create `rules/your-rule.md`
2. Determine priority tier:
   - P0: Always apply, blocking
   - P1: Important for context
   - P2: Apply when relevant
   - P3: Domain-specific
3. Define trigger patterns; if domain-specific, add `paths:` frontmatter so it only loads on matching files
4. Add to this registry
5. Update `settings.json` if rule should be auto-loaded

---

## Reference

- [SKILLS.md](./SKILLS.md) — Invocable skills registry
- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) — Inspiration for impact prioritization
- `.claude/settings.json` — Auto-load configuration
