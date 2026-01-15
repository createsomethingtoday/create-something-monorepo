# CREATE SOMETHING Rules Registry

This index catalogs all domain-specific rules that agents should apply during development. Rules differ from skills: **skills are invocable procedures**, while **rules are always-active constraints**.

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
| [beads-patterns](#beads-patterns) | Issue tracking, `bd` commands | Workflow |
| [orchestration-patterns](#orchestration-patterns) | Multi-session work | Workflow |
| [harness-patterns](#harness-patterns) | Single-session work | Workflow |
| [hipaa-compliance](#hipaa-compliance) | Medical/dental packages | Compliance |
| [templates-platform](#templates-platform) | Vertical templates | Platform |

### P2 — Contextual (Apply When Relevant)

| Rule | Triggers | Domain |
|------|----------|--------|
| [template-deployment-patterns](#template-deployment-patterns) | Template deploys | Deployment |
| [gastown-patterns](#gastown-patterns) | Multi-agent coordination | Legacy |
| [ralph-patterns](#ralph-patterns) | Autonomous loop work | Workflow |
| [model-routing-optimization](#model-routing-optimization) | Agent model selection | Performance |
| [dual-agent-routing](#dual-agent-routing) | Agent coordination | Architecture |
| [dental-api-integration](#dental-api-integration) | Dental package | Domain |
| [dental-scheduling](#dental-scheduling) | Dental scheduling | Domain |
| [social-patterns](#social-patterns) | Social media posting | Content |
| [paper-content-requirements](#paper-content-requirements) | Paper writing | Content |
| [taste-reference](#taste-reference) | Design decisions | Design |

### P3 — Specialized (Apply for Specific Domains)

| Rule | Triggers | Domain |
|------|----------|--------|
| [lsp-mcp-patterns](#lsp-mcp-patterns) | LSP/MCP integration | Integration |
| [dotfiles-conventions](#dotfiles-conventions) | `packages/dotfiles` | Configuration |
| [neomutt-patterns](#neomutt-patterns) | Neomutt config | Configuration |
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

#### taste-reference
- **File**: `rules/taste-reference.md`
- **Priority**: P2
- **Triggers**: Design decisions, visual work
- **Summary**: Reference for aesthetic decisions and design philosophy

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

---

### Workflow & Orchestration

#### beads-patterns
- **File**: `rules/beads-patterns.md`
- **Priority**: P1
- **Triggers**: Issue tracking, `bd` commands, workflow management
- **Summary**: Beads (bd) issue tracking patterns and conventions

#### orchestration-patterns
- **File**: `rules/orchestration-patterns.md`
- **Priority**: P1
- **Triggers**: Multi-session work, budget tracking, long-running features
- **Summary**: Nondeterministic idempotence via Git-committed checkpoints
- **Key Rules**:
  - Use for work >2 hours
  - Checkpoints every 15 minutes
  - Budget warnings at 80%, hard stop at 100%

#### harness-patterns
- **File**: `rules/harness-patterns.md`
- **Priority**: P1
- **Triggers**: Single-session work, `bd work` commands
- **Summary**: Single-session orchestration with quality gates

#### gastown-patterns
- **File**: `rules/gastown-patterns.md`
- **Priority**: P2 (Legacy — being replaced by orchestration)
- **Triggers**: Multi-agent coordination
- **Summary**: tmux-based multi-agent coordination (deprecated)

#### ralph-patterns
- **File**: `rules/ralph-patterns.md`
- **Priority**: P2
- **Triggers**: Autonomous development loop, PRD-driven work
- **Summary**: Iterative refinement via `ralph.sh`

#### dual-agent-routing
- **File**: `rules/dual-agent-routing.md`
- **Priority**: P2
- **Triggers**: Agent coordination decisions
- **Summary**: Patterns for routing work between agents

#### model-routing-optimization
- **File**: `rules/model-routing-optimization.md`
- **Priority**: P2
- **Triggers**: Model selection, cost optimization
- **Summary**: When to use Haiku vs Sonnet vs Opus

---

### Platform & Templates

#### templates-platform
- **File**: `rules/templates-platform.md`
- **Priority**: P1
- **Triggers**: `packages/verticals/*`, template creation
- **Summary**: Vertical template architecture and conventions

#### template-deployment-patterns
- **File**: `rules/template-deployment-patterns.md`
- **Priority**: P2
- **Triggers**: Template deployment, Cloudflare Pages
- **Summary**: Deployment patterns for vertical templates

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
- **Triggers**: `packages/verticals/dental-practice`
- **Summary**: Integration patterns for dental practice management APIs

#### dental-scheduling
- **File**: `rules/dental-scheduling.md`
- **Priority**: P2
- **Triggers**: Dental scheduling features
- **Summary**: Scheduling logic and appointment management

---

### Integration & Configuration

#### lsp-mcp-patterns
- **File**: `rules/lsp-mcp-patterns.md`
- **Priority**: P3
- **Triggers**: LSP server, MCP server development
- **Summary**: Language Server Protocol and Model Context Protocol patterns

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
| `packages/verticals/dental-*/**` | hipaa-compliance, dental-api-integration |
| `packages/dotfiles/**` | dotfiles-conventions |

### Context-Based Triggers

| Context | Rules Applied |
|---------|---------------|
| Creating issue | beads-patterns |
| Long-running work (>2h) | orchestration-patterns |
| Single-session work | harness-patterns |
| Deployment | cloudflare-patterns, template-deployment-patterns |
| Social posting | social-patterns, voice-canon |
| Design decisions | css-canon, taste-reference |

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
3. Define trigger patterns
4. Add to this registry
5. Update `settings.json` if rule should be auto-loaded

---

## Reference

- [SKILLS.md](./SKILLS.md) — Invocable skills registry
- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) — Inspiration for impact prioritization
- `.claude/settings.json` — Auto-load configuration
