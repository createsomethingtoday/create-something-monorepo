# Claude Code Skills: Hermeneutic Workflow Guide

> **How to use Claude Code Skills within the CREATE Something methodology**

This document explains how Claude Code Skills support the CREATE Something hermeneutic workflow—a circular interpretive process where understanding emerges through movement between parts and whole.

## The Hermeneutic Circle

```
                         ┌─────────────────┐
                         │   .ltd (Canon)  │
                         │  Being-as-Canon │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              │    canon-maintenance ◄────────────────┤
              │    voice-validator                    │
              │    design-ux-improvement              │
              │                   │                   │
              │                   ▼                   │
              │         ┌─────────────────┐           │
              │         │  .io (Research) │           │
              │         │ Being-as-Document│          │
              │         └────────┬────────┘           │
              │                  │                    │
              │    experiment-scaffold                │
              │    create-something-experiments       │
              │    technical-report-writing           │
              │                  │                    │
              │                  ▼                    │
              │         ┌─────────────────┐           │
              │         │ .space (Practice)│          │
              │         │Being-as-Experience│         │
              │         └────────┬────────┘           │
              │                  │                    │
              │    architectural-visualization        │
              │    cloudflare-notion-sync             │
              │    cloudflare-workers-optimization    │
              │    sveltekit-project-manager          │
              │                  │                    │
              │                  ▼                    │
              │         ┌─────────────────┐           │
              │         │ .agency (Service)│          │
              │         │ Being-as-Service │          │
              │         └────────┬────────┘           │
              │                  │                    │
              │    service-delivery-patterns          │
              │                  │                    │
              └──────────────────┴────────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │  subtractive-review                 │
              │  (Applies at ALL levels)            │
              └─────────────────────────────────────┘
                                 │
                                 ▼
                    Feeds back to refine Canon
```

## Skill Inventory

### Core Canon Skills (Define Standards)

| Skill | Primary Mode | Purpose |
|-------|--------------|---------|
| `canon-maintenance` | .ltd | **Full Subtractive Triad**: DRY → Rams → Heidegger auditing |
| `voice-validator` | .ltd | Validate content against the Five Principles of Communication |
| `subtractive-review` | All | Apply the Subtractive Triad as code review methodology |

### Research Skills (Document Findings)

| Skill | Primary Mode | Purpose |
|-------|--------------|---------|
| `experiment-scaffold` | .io/.space | Generate experiment structure with all required elements |
| `create-something-experiments` | .io/.space | Track experiments, generate research papers |
| `technical-report-writing` | .io | Convert projects into formal technical papers |

### Implementation Skills (Build Systems)

| Skill | Primary Mode | Purpose |
|-------|--------------|---------|
| `architectural-visualization` | .space | Floor plan visualization with Heidegger threshold zones |
| `cloudflare-notion-sync` | .space/.agency | Build OAuth-based API integrations |
| `cloudflare-workers-optimization` | .space/.agency | Optimize code for Workers runtime |
| `sveltekit-project-manager` | All | Deploy and manage SvelteKit projects |
| `design-ux-improvement` | .ltd | Creative-forward design analysis and improvement |

### Service Skills (Deliver Value)

| Skill | Primary Mode | Purpose |
|-------|--------------|---------|
| `service-delivery-patterns` | .agency | Client engagement and commercial delivery |

### Navigation Skills (Understand Context)

| Skill | Primary Mode | Purpose |
|-------|--------------|---------|
| `understanding-graphs` | All | Create UNDERSTANDING.md files for codebase navigation |

## When to Use Each Skill

### Starting a New Project

**Ask**: *What mode of being does this project represent?*

| If the project is... | Start with... |
|---------------------|---------------|
| Defining principles or standards | `canon-maintenance` |
| Researching or documenting | `create-something-experiments` |
| Building hands-on experiments | `cloudflare-workers-optimization` or `cloudflare-notion-sync` |
| Client work | `service-delivery-patterns` |
| Understanding unfamiliar code | `understanding-graphs` |

### During Development

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. SCOPE                                                    │
│     └─► service-delivery-patterns (if client)               │
│     └─► create-something-experiments (if research)          │
│                                                              │
│  2. BUILD                                                    │
│     └─► cloudflare-workers-optimization (Workers code)      │
│     └─► cloudflare-notion-sync (API integrations)           │
│     └─► sveltekit-project-manager (SvelteKit apps)          │
│                                                              │
│  3. REVIEW                                                   │
│     └─► canon-maintenance (philosophical integrity)         │
│     └─► design-ux-improvement (visual/UX quality)           │
│                                                              │
│  4. DOCUMENT                                                 │
│     └─► technical-report-writing (formal papers)            │
│     └─► create-something-experiments (experiment logs)      │
│                                                              │
│  5. DEPLOY                                                   │
│     └─► sveltekit-project-manager (Cloudflare Pages)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Cross-Property Work

When working across multiple properties, Skills compound:

**Example: Building a new .space lesson**

1. `create-something-experiments` - Initialize experiment tracking
2. `cloudflare-workers-optimization` - Ensure code is Workers-compatible
3. `sveltekit-project-manager` - Build and deploy the lesson
4. `canon-maintenance` - Audit against Rams principles
5. `technical-report-writing` - Document findings for .io

**Example: Client API integration (.agency)**

1. `service-delivery-patterns` - Scope and price the engagement
2. `cloudflare-notion-sync` - Build the integration
3. `cloudflare-workers-optimization` - Optimize for production
4. `create-something-experiments` - Track metrics and learnings
5. `canon-maintenance` - Final review before handoff

## Skill Interaction Patterns

### Pattern 1: Canon-First Development

*"Start with principles, end with validation"*

```
canon-maintenance (define standards)
        │
        ▼
[development with other Skills]
        │
        ▼
canon-maintenance (audit result)
        │
        ▼
design-ux-improvement (if UI involved)
```

**Use when**: Building anything visible to users

### Pattern 2: Research-Driven Development

*"Hypothesis → Experiment → Document → Canonize"*

```
create-something-experiments (form hypothesis)
        │
        ▼
[implementation Skills]
        │
        ▼
create-something-experiments (collect data)
        │
        ▼
technical-report-writing (formalize findings)
        │
        ▼
canon-maintenance (if pattern validates, add to canon)
```

**Use when**: Testing new patterns or approaches

### Pattern 3: Service Delivery

*"Discovery → Build → Validate → Handoff"*

```
service-delivery-patterns (discovery + proposal)
        │
        ▼
[implementation Skills based on client needs]
        │
        ▼
create-something-experiments (track metrics)
        │
        ▼
canon-maintenance (quality review)
        │
        ▼
service-delivery-patterns (handoff + retrospective)
```

**Use when**: Working with clients

### Pattern 4: Infrastructure Work

*"Build → Optimize → Deploy"*

```
cloudflare-notion-sync OR custom implementation
        │
        ▼
cloudflare-workers-optimization (audit + fix)
        │
        ▼
sveltekit-project-manager (deploy)
```

**Use when**: Building backend systems

## Invoking Skills

### Explicit Invocation

Tell Claude Code directly:

```
"Use the canon-maintenance skill to audit this component"
"Apply service-delivery-patterns for this client proposal"
"Run cloudflare-workers-optimization on the src/ directory"
```

### Contextual Activation

Skills activate automatically when context matches:

| If you mention... | Skill activates |
|-------------------|-----------------|
| "Subtractive Triad", "Dieter Rams", "canonical", "principles", "audit" | `canon-maintenance` |
| "voice", "clarity over cleverness", "marketing jargon", "forbidden patterns" | `voice-validator` |
| "code review", "PR review", "earns existence", "remove", "unify" | `subtractive-review` |
| "new experiment", "hypothesis", "success criteria", "scaffold" | `experiment-scaffold` |
| "Awwwards", "design review", "UX audit" | `design-ux-improvement` |
| "floor plan", "threshold zones", "dwelling", "architecture" | `architectural-visualization` |
| "deploy to Cloudflare", "Pages", "SvelteKit build" | `sveltekit-project-manager` |
| "track this experiment", "write paper" | `create-something-experiments` |
| "formal report", "technical paper", "IEEE" | `technical-report-writing` |
| "OAuth", "Notion sync", "API integration" | `cloudflare-notion-sync` |
| "Workers error", "128KB limit", "eval error" | `cloudflare-workers-optimization` |
| "client", "proposal", "pricing", "scope" | `service-delivery-patterns` |
| "understand this codebase", "what should I read", "dependencies" | `understanding-graphs` |

## The Feedback Loop

Every Skill contributes to the hermeneutic circle:

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  canon-maintenance ─────────► Defines what "good" means     │
│         │                                                    │
│         ▼                                                    │
│  create-something-experiments ─► Tests if theory works      │
│         │                                                    │
│         ▼                                                    │
│  [implementation Skills] ──────► Builds real systems        │
│         │                                                    │
│         ▼                                                    │
│  service-delivery-patterns ────► Validates commercially     │
│         │                                                    │
│         ▼                                                    │
│  technical-report-writing ─────► Documents learnings        │
│         │                                                    │
│         └──────────────────────► Feeds back to Canon        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Nothing is canonical until it survives this full cycle.**

## Quick Reference

### By Property

| Property | Primary Skills |
|----------|---------------|
| `.ltd` | `canon-maintenance`, `design-ux-improvement` |
| `.io` | `create-something-experiments`, `technical-report-writing` |
| `.space` | `cloudflare-*`, `sveltekit-project-manager` |
| `.agency` | `service-delivery-patterns`, all implementation Skills |

### By Task Type

| Task | Skills to Use |
|------|---------------|
| Design review | `canon-maintenance` → `design-ux-improvement` |
| New experiment | `create-something-experiments` |
| API integration | `cloudflare-notion-sync` → `cloudflare-workers-optimization` |
| Deploy app | `sveltekit-project-manager` |
| Client work | `service-delivery-patterns` → [others as needed] |
| Write paper | `technical-report-writing` |
| Debug Workers | `cloudflare-workers-optimization` |
| Understand codebase | `understanding-graphs` |
| Onboard to project | `understanding-graphs` → [relevant Skills] |

### By Error Type

| Error | Skill |
|-------|-------|
| EvalError (Workers) | `cloudflare-workers-optimization` |
| RangeError 128KB | `cloudflare-workers-optimization` |
| Zod _zod error | `cloudflare-workers-optimization` |
| Build/deploy failure | `sveltekit-project-manager` |
| CORS issues | `sveltekit-project-manager` |
| Design feels wrong | `canon-maintenance` |

---

## Philosophy

These Skills embody **"Weniger, aber besser"**—less, but better.

Each Skill exists because it serves a distinct purpose in the hermeneutic workflow. There's no redundancy. Each one handles a mode of being that the others don't.

Together, they form a complete system for:
1. **Defining** what good means (Canon)
2. **Researching** what works (Document)
3. **Practicing** hands-on (Experience)
4. **Delivering** commercially (Service)

And then feeding learnings back to refine the Canon.

**The circle never stops turning.**

---

*"Understanding is always understanding differently."* — Hans-Georg Gadamer
