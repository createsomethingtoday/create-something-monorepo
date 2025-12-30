# Understanding: @create-something/space

> **The interactive laboratory—Being-as-Experience where theory becomes hands-on practice.**

## Ontological Position

**Mode of Being**: `.space` — Being-as-Experience

This is where learning happens through doing. While `.io` documents theory, `.space` lets you *experience* it. Interactive code editors, real-time execution, progress tracking—all designed to transform abstract patterns into embodied understanding. Patterns are tested here before being validated commercially in `.agency`.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/components` | Shared UI for consistent experience |
| `codemirror ^6.0` | In-browser code editing |
| `@cloudflare/sandbox` | Secure code execution |
| `gsap` | Smooth animations for interactions |
| Cloudflare Pages + D1 | Edge deployment with progress persistence |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `@create-something/agency` | Which patterns work in practice |
| `@create-something/io` | Empirical validation of theory |
| Learners | How to apply AI-native development patterns |
| The methodology | What hands-on practice reveals |

## Internal Structure

```
src/routes/
├── +page.svelte              → Homepage: featured experiments
├── experiments/              → Interactive lessons
│   ├── +page.svelte          → Lesson listing
│   ├── [slug]/               → Individual lesson pages
│   └── +layout.svelte        → Lesson layout with code editor
├── methodology/              → How practice works
├── categories/               → Lesson categorization
├── about/                    → About the lab
└── api/                      → Backend endpoints
    └── ...                   → Progress, execution, etc.

src/lib/
├── components/
│   ├── CodeEditor.svelte     → CodeMirror wrapper
│   ├── CodeRunner.svelte     → Execution interface
│   └── ProgressTracker.svelte → Learning progress
└── utils/
    └── executor.ts           → Code execution logic
```

## To Understand This Package, Read

1. **`src/routes/experiments/[slug]/+page.svelte`** — How lessons are structured
2. **`src/lib/components/CodeEditor.svelte`** — Interactive code editing pattern
3. **`src/routes/api/`** — Backend patterns for execution and progress
4. **`src/routes/+layout.svelte`** — App shell and navigation

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Lesson | Interactive experiment with code exercises | `/experiments/[slug]` |
| Code Editor | In-browser editing with syntax highlighting | `CodeEditor.svelte` |
| Execution | Secure code running via Cloudflare Sandbox | `CodeRunner.svelte` |
| Progress | Persistent tracking of completed lessons | `ProgressTracker.svelte` |

## This Package Helps You Understand

- **Learning by doing**: Theory → practice transformation
- **Code Mode patterns**: How Claude Code techniques work hands-on
- **Edge execution**: Running user code securely at the edge
- **Progressive disclosure**: Revealing complexity gradually

## Common Tasks

| Task | Start Here |
|------|------------|
| Try a lesson | `/experiments/[slug]` |
| Understand code editing | `src/lib/components/CodeEditor.svelte` |
| See execution pattern | `src/routes/api/execute/` |
| Track progress | `src/lib/components/ProgressTracker.svelte` |

## Lesson Structure

Each lesson follows this canonical structure:

```
┌─────────────────────────────────────────────────┐
│  Lesson Title                                   │
├─────────────────────────────────────────────────┤
│  Introduction                                   │
│  [Context and motivation]                       │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Instructions │  │ Code Editor             │  │
│  │              │  │                         │  │
│  │ Step 1...    │  │ // Your code here       │  │
│  │ Step 2...    │  │                         │  │
│  │              │  │ [Run] [Reset]           │  │
│  └──────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  Output                                         │
│  [Execution results appear here]                │
├─────────────────────────────────────────────────┤
│  [Mark Complete]                                │
└─────────────────────────────────────────────────┘
```

## Hermeneutic Function

```
.ltd (Canon) ──► .io (Research)
                    │
                    ▼
               .space (Practice) ◄── "Does it work hands-on?"
                    │
                    ├──► Validates theory from .io
                    ├──► Provides patterns for .agency
                    │
                    └──► Learnings return to refine .io and .ltd
```

---

## Related Packages

### `@create-something/io` — Hermeneutic Partner

**Relationship**: Practice ↔ Theory

| Aspect | `.space` (This Package) | `.io` |
|--------|------------------------|-------|
| Mode of Being | Being-as-Experience | Being-as-Document |
| Primary Function | Enable hands-on practice | Document methodology |
| Output | Completed exercises | Papers, research |
| Validation | Empirical success | Theoretical rigor |

**Shared Architecture Patterns**:
- `/experiments/` routes (lessons here, papers there)
- `/methodology/` explaining approach
- `/categories/` for content organization
- Same Canon token system and styling
- Same hermeneutic circle participation

**Data Flow**:
```
.io publishes theory → .space implements practice
.space discovers patterns → .io documents findings
```

**See**: [`packages/io/UNDERSTANDING.md`](../io/UNDERSTANDING.md)

---

*Last validated: 2025-12-30*
