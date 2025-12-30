# Understanding: @create-something/lms

> **The learning platform—Being-as-Learning that teaches the ethos through practice.**

## Ontological Position

**Mode of Being**: `.lms` — Being-as-Learning

This is where the methodology becomes teachable. When someone wants to learn the CREATE Something way, `.lms` provides structured paths. It's not a tutorial site—it's a practice ground where learners encounter the Subtractive Triad, Heideggerian tool philosophy, and Canon principles through doing, not just reading.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/components` | Shared UI + learning event tracking utilities |
| `@create-something/tufte` | Visualization for progress tracking |
| `packages/identity-worker` | Authentication for learner accounts |
| `marked` | Markdown → HTML for lesson content |
| Cloudflare Pages + D1 | Edge deployment with database for progress tracking |

**Key Integration**: `@create-something/components/utils/learning.ts` provides the unified `trackLearningEvent()` API that all properties use to send progress data to the LMS.

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| New practitioners | How to apply the Subtractive Triad |
| Agency clients | CREATE Something methodology in action |
| Partner developers | Standards for collaborative work |
| The field | AI-native development as learnable craft |

## Internal Structure

```
src/routes/
├── +page.svelte              → Homepage: learning path overview
├── +layout.svelte            → Layout with navigation, auth state
├── +layout.server.ts         → Auth check, user data
├── paths/                    → Learning path listings
│   └── [slug]/               → Individual path pages
├── modules/                  → Module content
│   └── [slug]/               → Individual module pages
├── praxis/                   → Practice exercises
├── progress/                 → Learner progress tracking
├── account/                  → User account management
├── auth/                     → Authentication flow
├── login/                    → Login page
├── signup/                   → Registration page
└── api/
    ├── progress/             → Progress tracking endpoints
    └── modules/              → Module data endpoints
```

## Learning Paths

| Path | Focus | Audience |
|------|-------|----------|
| **Foundations** | Core philosophy and principles | Beginners |
| **Craft** | Implementation patterns and techniques | Practitioners |
| **Infrastructure** | Cloudflare, deployment, tooling | DevOps-oriented |
| **Agents** | AI-native development workflows | AI developers |
| **Method** | The Subtractive Triad in practice | All levels |
| **Systems** | Architecture and hermeneutic thinking | Architects |
| **Partnership** | Human-AI collaboration patterns | All levels |
| **Advanced** | Deep dives and specializations | Advanced practitioners |

## Critical Paths

### Path 1: User Enrolls in Learning Path
```
GET /paths/[slug]
  ↓
PageLoad: Fetch path data from D1
  ├─ Path metadata (name, description, modules)
  ├─ User progress (if authenticated)
  └─ Module completion status
  ↓
Render: Path overview + module listing
  ├─ Module cards with completion badges
  ├─ Estimated time
  └─ "Start" or "Continue" CTA
```

### Path 2: User Completes Module
```
GET /modules/[slug]
  ↓
PageLoad: Fetch module content + user progress
  ↓
User reads content, completes exercises
  ↓
POST /api/progress
  ├─ Record completion timestamp
  ├─ Update completion percentage
  └─ Unlock next module
  ↓
Redirect: Next module or path completion
```

### Path 3: User Views Progress Dashboard
```
GET /progress
  ↓
PageLoad: Aggregate user progress
  ├─ Completed modules
  ├─ Active paths
  ├─ Time invested
  └─ Next recommended module
  ↓
Render: Tufte dashboard with metrics
  ├─ Sparklines for completion trends
  ├─ Path completion percentages
  └─ Achievement badges
```

## To Understand This Package, Read

**For Learning Paths**:
1. **`src/routes/paths/+page.svelte`** — Path listing
2. **`src/routes/paths/[slug]/+page.svelte`** — Path detail page
3. **`src/routes/modules/[slug]/+page.svelte`** — Module content rendering

**For Progress Tracking**:
1. **`src/routes/progress/+page.svelte`** — Progress dashboard
2. **`src/routes/api/progress/+server.ts`** — Progress API
3. **`PROGRESS_TRACKING.md`** — Progress system documentation

**For Authentication**:
1. **`src/routes/+layout.server.ts`** — Auth check
2. **`src/routes/auth/+page.svelte`** — Auth flow
3. **`packages/identity-worker`** — Identity service integration

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Learning Path | Structured sequence of modules on a topic | `/paths` |
| Module | Individual lesson with content and exercises | `/modules/[slug]` |
| Praxis | Practice exercises that apply learned concepts | `/praxis` |
| Progress | Learner's completion state across paths | `/progress` |
| Identity | Authenticated learner account | `identity-worker` |

## This Package Helps You Understand

- **Methodology as practice**: How to DO the Subtractive Triad, not just read about it
- **Hermeneutic learning**: Understanding emerges through doing
- **Tool philosophy**: Zuhandenheit (ready-to-hand) vs Vorhandenheit (present-at-hand)
- **AI-native workflows**: How to partner with Claude Code effectively
- **Canon application**: How design principles manifest in code

## Common Tasks

| Task | Start Here |
|------|------------|
| Browse learning paths | `/paths` |
| Start a module | `/modules/[slug]` |
| View progress | `/progress` |
| Practice concepts | `/praxis` |
| Manage account | `/account` |

## Database Schema (D1)

### learners
```sql
CREATE TABLE learners (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_active INTEGER
);
```

### paths
```sql
CREATE TABLE paths (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER,
  estimated_hours INTEGER
);
```

### modules
```sql
CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  path_id TEXT REFERENCES paths(id),
  name TEXT NOT NULL,
  content TEXT,
  order_index INTEGER,
  estimated_minutes INTEGER
);
```

### progress
```sql
CREATE TABLE progress (
  learner_id TEXT REFERENCES learners(id),
  module_id TEXT REFERENCES modules(id),
  completed_at INTEGER,
  PRIMARY KEY (learner_id, module_id)
);
```

## Authentication Flow

```
User visits /signup or /login
  ↓
Form submission → /api/auth
  ↓
Identity Worker validates credentials
  ├─ Success: Set session cookie
  └─ Failure: Return error
  ↓
Redirect to /paths (authenticated)
```

**Identity Worker** handles:
- User registration
- Login/logout
- Session management
- Password hashing
- Token validation

## Progress Tracking System

The LMS uses **Tufte-style dashboards** for learner progress visualization:

| Metric | Visualization |
|--------|---------------|
| Module completion | Sparkline trend |
| Path progress | Horizontal bar |
| Time invested | Cumulative line chart |
| Active streak | Calendar heatmap |

**Data aggregation**:
- Nightly cron job calculates aggregate stats
- Real-time updates on module completion
- KV cache for frequently accessed progress

## Hermeneutic Function

```
.ltd (Canon) ──────────────────────────────────────┐
    │                                               │
    ▼                                               │
.io (Research) ──────────────────────────┐          │
    │                                     │          │
    ▼                                     ▼          │
.lms (Learning) ◄── "How do we teach this?" ◄──────┤
    │                                               │
    ├──► Trains practitioners                       │
    ├──► Validates methodology clarity              │
    ├──► Tests pattern applicability                │
    │                                               │
    └──► Discovers teaching gaps → returns to .io ─┘
```

**The hermeneutic loop**:
1. `.ltd` defines principles
2. `.io` documents research
3. `.lms` teaches application
4. Learner struggles reveal documentation gaps
5. Gaps feed back to `.io` for clarification
6. Clarified patterns return to `.ltd` as canon

## Styling & Theming

All LMS UI uses **Canon tokens** for consistency with other properties:

| Pattern | Token |
|---------|-------|
| Card backgrounds | `--color-bg-surface` |
| Completion badges | `--color-success` |
| Progress bars | `--color-data-1` (blue) |
| Text (primary) | `--color-fg-primary` |
| Text (muted) | `--color-fg-muted` |
| Spacing | `--space-sm`, `--space-md`, `--space-lg` |
| Border radius | `--radius-md`, `--radius-lg` |
| Transitions | `--duration-micro`, `--ease-standard` |

**Learning-specific patterns**:
- **Module cards**: Hover lift effect (8px translateY)
- **Completion indicators**: Checkmark with success color
- **Progress bars**: Animated width transition on milestone
- **Path navigation**: Breadcrumb trail with active state

## Accessibility

The LMS prioritizes accessible learning:

- **WCAG AA compliant** contrast ratios throughout
- **Keyboard navigation** for all interactive elements
- **Screen reader** announcements for progress updates
- **Reduced motion** respects user preferences
- **Focus indicators** with `--color-focus` token

## Common Patterns

### Module Card Component
```svelte
<script lang="ts">
  interface Props {
    module: Module;
    completed: boolean;
  }

  let { module, completed }: Props = $props();
</script>

<a href="/modules/{module.slug}" class="module-card">
  <div class="card-header">
    <h3>{module.name}</h3>
    {#if completed}
      <span class="badge-success">✓</span>
    {/if}
  </div>
  <p class="muted">{module.estimated_minutes} min</p>
</a>

<style>
  .module-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    transition: all var(--duration-standard) var(--ease-standard);
  }

  .module-card:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-lg);
  }

  .badge-success {
    color: var(--color-success);
    font-size: var(--text-body-sm);
  }

  .muted {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }
</style>
```

### Progress Bar Component
```svelte
<script lang="ts">
  interface Props {
    percentage: number;
  }

  let { percentage }: Props = $props();
</script>

<div class="progress-container">
  <div class="progress-bar" style="width: {percentage}%"></div>
</div>

<style>
  .progress-container {
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    height: 8px;
    overflow: hidden;
  }

  .progress-bar {
    background: var(--color-data-1);
    height: 100%;
    transition: width var(--duration-complex) var(--ease-standard);
  }
</style>
```

## Deployment

The LMS deploys to Cloudflare Pages with D1 database:

```bash
# Build
pnpm --filter=lms build

# Deploy
wrangler pages deploy packages/lms/.svelte-kit/cloudflare --project-name=createsomething-lms

# Migrations
wrangler d1 migrations apply LMS_DB --remote
```

**Project name**: `createsomething-lms` (note: no hyphen between words—see `.claude/rules/PROJECT_NAME_REFERENCE.md`)

**Domain**: `learn.createsomething.space`

## See Also

| Related Package | Connection |
|-----------------|------------|
| `@create-something/components` | `utils/learning.ts` sends events here; `utils/completion.ts` for local state |
| `@create-something/tufte` | Sparkline, progress visualization components |

**Inbound Event Flow**:
```
@create-something/components/utils/learning.ts
  ↓ trackLearningEvent({ property, eventType, metadata })
/api/events (this package)
  ↓ INSERT INTO learning_events
D1 Database
  ↓ aggregated by
/progress dashboard
```

---

*Last validated: 2025-12-29*

**This UNDERSTANDING.md follows the "Less, but better" principle—document what's critical to understand, not every detail. When you need deeper knowledge, follow the references to source files.**
