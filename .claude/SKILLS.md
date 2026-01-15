# CREATE SOMETHING Skills Registry

This index catalogs all available agent skills for the CREATE SOMETHING system. Skills are modular instruction sets that agents can load dynamically based on task context.

## Quick Reference

| Skill | Category | Priority | Composable |
|-------|----------|----------|------------|
| [voice-validator](#voice-validator) | quality-assurance | P0 | Yes |
| [canon-maintenance](#canon-maintenance) | quality-assurance | P0 | Yes |
| [subtractive-review](#subtractive-review) | quality-assurance | P0 | Yes |
| [experiment-auditor](#experiment-auditor) | quality-assurance | P1 | Yes |
| [paper-auditor](#paper-auditor) | quality-assurance | P1 | Yes |
| [experiment-scaffold](#experiment-scaffold) | content-generation | P1 | Yes |
| [orchestration-worker](#orchestration-worker) | orchestration | P1 | No |
| [voice-audit-worker](#voice-audit-worker) | orchestration | P1 | No |
| [doc-generator](#doc-generator) | content-generation | P2 | No |
| [prd-to-ralph](#prd-to-ralph) | content-generation | P2 | No |
| [photo-cleanup](#photo-cleanup) | specialized | P2 | No |
| [graph-relationship-audit](#graph-relationship-audit) | knowledge-management | P2 | No |
| [understanding-graphs](#understanding-graphs) | knowledge-management | P2 | No |
| [architectural-visualization](#architectural-visualization) | specialized | P3 | No |

## By Category

### Quality Assurance

Skills for validating code, content, and design against CREATE SOMETHING standards.

#### voice-validator
- **File**: `skills/voice-validator.md`
- **Priority**: P0
- **Description**: Validate content against CREATE SOMETHING's Five Principles of Communication
- **Triggers**: `*.md publish`, content review, before deployment
- **Related**: canon-maintenance, experiment-scaffold, voice-audit-worker
- **Composable**: Yes — layer with property-specific rules

#### canon-maintenance
- **File**: `skills/canon-maintenance.md`
- **Priority**: P0
- **Description**: Maintain and enforce CREATE SOMETHING's design canon based on the Subtractive Triad
- **Triggers**: `*.svelte modify`, `*.css modify`, design review, before deployment
- **Related**: voice-validator, subtractive-review, experiment-auditor
- **Composable**: Yes — layer with voice-validator for complete audits

#### subtractive-review
- **File**: `skills/subtractive-review.md`
- **Priority**: P0
- **Description**: Apply the Subtractive Triad as code review methodology (DRY → Rams → Heidegger)
- **Triggers**: code review, pull request, refactor, architecture discussion
- **Related**: canon-maintenance, triad-audit
- **Composable**: Yes — integrate with PR workflows

#### experiment-auditor
- **File**: `skills/experiment-auditor.md`
- **Priority**: P1
- **Description**: Validate experiment styling and structure for CREATE SOMETHING's .space property
- **Triggers**: `packages/space/src/routes/experiments/**/*.svelte modify`, `/audit-experiment`, before publish experiment
- **Related**: canon-maintenance, paper-auditor, experiment-scaffold
- **Composable**: Yes — run after experiment-scaffold

#### paper-auditor
- **File**: `skills/paper-auditor.md`
- **Priority**: P1
- **Description**: Validate paper styling against CREATE SOMETHING's standard paper template patterns
- **Triggers**: `packages/io/src/routes/papers/**/*.svelte modify`, `/audit-paper`, before publish paper
- **Related**: canon-maintenance, voice-validator, experiment-auditor
- **Composable**: Yes — combine with voice-validator

### Content Generation

Skills for creating structured content following CREATE SOMETHING methodology.

#### experiment-scaffold
- **File**: `skills/experiment-scaffold.md`
- **Priority**: P1
- **Description**: Generate experiment structure with all required elements from the CREATE SOMETHING methodology
- **Triggers**: new experiment, create experiment, `packages/space/src/routes/experiments/** create`
- **Related**: voice-validator, canon-maintenance, experiment-auditor
- **Composable**: Yes — follow with experiment-auditor

#### doc-generator
- **File**: `skills/doc-generator.md`
- **Priority**: P2
- **Description**: Generate documentation from screenshots by embedding live UI components
- **Triggers**: `/doc-generator`, screenshot documentation, admin guide
- **Related**: voice-validator
- **Composable**: No

#### prd-to-ralph
- **File**: `skills/prd-to-ralph.md`
- **Priority**: P2
- **Description**: Convert a feature description into a Ralph-compatible PRD JSON file for autonomous development
- **Triggers**: `/prd-to-ralph`, create prd, ralph feature
- **Related**: orchestration-worker
- **Composable**: No

### Orchestration

Skills for autonomous agent coordination and convoy work.

#### orchestration-worker
- **File**: `skills/orchestration-worker.md`
- **Priority**: P1
- **Context**: fork
- **Agent**: worker
- **Description**: Execute orchestration convoy work in isolated context
- **Triggers**: convoy assignment, worker task
- **Related**: voice-audit-worker
- **Composable**: No — runs in isolation

#### voice-audit-worker
- **File**: `skills/voice-audit-worker.md`
- **Priority**: P1
- **Context**: fork
- **Agent**: voice-auditor
- **Description**: Execute voice canon compliance audit for CREATE SOMETHING content
- **Triggers**: voice audit convoy, content compliance check
- **Related**: voice-validator, orchestration-worker
- **Composable**: No — runs in isolation

### Knowledge Management

Skills for maintaining understanding and knowledge graphs.

#### graph-relationship-audit
- **File**: `skills/graph-relationship-audit.md`
- **Priority**: P2
- **Description**: Periodic review and refinement of knowledge graph relationships for the CREATE SOMETHING knowledge base
- **Triggers**: graph audit, quarterly maintenance, knowledge graph review, after major documentation changes
- **Related**: understanding-graphs, canon-maintenance
- **Composable**: No

#### understanding-graphs
- **File**: `skills/understanding-graphs.md`
- **Priority**: P2
- **Description**: Create and maintain UNDERSTANDING.md files—minimal, human-readable dependency graphs that capture understanding-critical relationships
- **Triggers**: onboarding, create UNDERSTANDING.md, document package, knowledge transfer
- **Related**: graph-relationship-audit
- **Composable**: No

### Specialized

Domain-specific skills for particular workflows.

#### photo-cleanup
- **File**: `skills/photo-cleanup.md`
- **Priority**: P2
- **Description**: AI-powered photo editing via natural language - describe what to remove, Claude locates it, Flux removes it
- **Triggers**: `/photo-cleanup`, remove from photo, clean up image, `*.jpg cleanup`, `*.png cleanup`
- **Related**: (none)
- **Composable**: No

#### architectural-visualization
- **File**: `skills/architectural-visualization.md`
- **Priority**: P3
- **Description**: CREATE SOMETHING methodology for floor plan visualization with Heidegger threshold zones
- **Triggers**: floor plan, architectural rendering, threshold zones, dwelling visualization
- **Related**: canon-maintenance
- **Composable**: No

## Skill Metadata Schema

All skills use YAML frontmatter with this schema:

```yaml
---
name: skill-name                    # Required: unique identifier
description: Brief description      # Required: one-line summary
category: quality-assurance         # Required: see categories below
triggers:                           # Required: when to activate
  - "file pattern"
  - "command"
  - "context"
related:                            # Optional: connected skills
  - other-skill
composable: true                    # Optional: can layer with others
priority: P0                        # Required: P0 (critical) to P3 (optional)
context: fork                       # Optional: execution context
agent: worker                       # Optional: agent type
tools: Read, Write, Grep            # Optional: required tools
---
```

### Categories

| Category | Purpose |
|----------|---------|
| `quality-assurance` | Validation, auditing, compliance checking |
| `content-generation` | Creating structured content |
| `orchestration` | Agent coordination, convoy work |
| `knowledge-management` | Documentation, graphs, understanding |
| `specialized` | Domain-specific workflows |

### Priority Levels

| Priority | Meaning | When to Use |
|----------|---------|-------------|
| P0 | Critical | Always apply before shipping |
| P1 | Important | Apply for relevant contexts |
| P2 | Useful | Apply when specifically needed |
| P3 | Optional | Nice-to-have for specific domains |

## Composability Patterns

Some skills are designed to be layered together:

### Content Publication Stack
```
experiment-scaffold → experiment-auditor → voice-validator → canon-maintenance
```

### Code Review Stack
```
subtractive-review + canon-maintenance + voice-validator (for docs in PR)
```

### Paper Publication Stack
```
paper-auditor + voice-validator + canon-maintenance
```

## Adding New Skills

1. Create `skills/your-skill.md` with YAML frontmatter
2. Follow the schema above
3. Add entry to this registry
4. Document triggers and composability
5. Test with related skills

## Reference

- [Anthropic Skills Pattern](https://github.com/anthropics/skills) — Inspiration for skill structure
- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) — Inspiration for impact prioritization
- `.claude/rules/` — Domain-specific rules that skills may reference
