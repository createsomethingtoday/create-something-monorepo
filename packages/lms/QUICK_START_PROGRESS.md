# Progress Tracking - Quick Start Guide

Get started with LMS progress tracking in 5 minutes.

---

## 1. Understanding the System

The progress tracking system has three layers:

```
UI Components  →  Svelte Store  →  API Routes  →  D1 Database
```

- **UI**: Auto-tracks lesson views and completions
- **Store**: Reactive state management
- **API**: RESTful endpoints
- **Database**: D1 SQLite storage

---

## 2. Basic Usage (UI Components)

### Track Lesson Progress

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress, getLessonProgress } from '$lib/stores/progress';

  const lessonProgress = getLessonProgress('foundations', 'what-is-creation');

  onMount(() => {
    // Fetch progress
    progress.fetch();

    // Mark lesson as started
    progress.startLesson('foundations', 'what-is-creation');
  });

  async function completeLesson() {
    await progress.completeLesson('foundations', 'what-is-creation', 900);
  }
</script>

{#if $lessonProgress?.status === 'completed'}
  <p>✅ Completed</p>
{:else}
  <button onclick={completeLesson}>Complete Lesson</button>
{/if}
```

### Show Progress Dashboard

```svelte
<script lang="ts">
  import { progress, overallProgress } from '$lib/stores/progress';
  import { onMount } from 'svelte';

  onMount(() => {
    progress.fetch();
  });
</script>

<div>
  <h2>Progress: {$overallProgress}%</h2>
  <p>Lessons completed: {$progress.stats.lessonsCompleted}</p>
  <p>Paths completed: {$progress.stats.pathsCompleted}</p>
</div>
```

---

## 3. API Usage (Direct)

### Get Full Progress

```bash
curl http://localhost:5173/api/progress
```

### Start a Lesson

```bash
curl -X POST http://localhost:5173/api/progress/lesson \
  -H "Content-Type: application/json" \
  -d '{
    "pathId": "foundations",
    "lessonId": "what-is-creation",
    "action": "start"
  }'
```

### Complete a Lesson

```bash
curl -X POST http://localhost:5173/api/progress/lesson \
  -H "Content-Type: application/json" \
  -d '{
    "pathId": "foundations",
    "lessonId": "what-is-creation",
    "action": "complete",
    "timeSpent": 900
  }'
```

### Start Praxis Exercise

```bash
curl -X POST http://localhost:5173/api/progress/praxis \
  -H "Content-Type: application/json" \
  -d '{
    "praxisId": "triad-audit",
    "action": "start"
  }'
```

### Submit Praxis Exercise

```bash
curl -X POST http://localhost:5173/api/progress/praxis \
  -H "Content-Type: application/json" \
  -d '{
    "praxisId": "triad-audit",
    "action": "submit",
    "submission": {"answer": "..."},
    "score": 0.85,
    "passed": true,
    "feedback": "Excellent work!"
  }'
```

---

## 4. Database Queries

### Check Progress in Database

```bash
# Local dev
wrangler d1 execute lms-db --local --command "SELECT * FROM lesson_progress"

# Production
wrangler d1 execute lms-db --command "SELECT * FROM lesson_progress WHERE learner_id = 'user-id'"
```

### See Path Progress

```bash
wrangler d1 execute lms-db --local --command "
  SELECT p.path_id, p.status, COUNT(l.id) as lessons_completed
  FROM path_progress p
  LEFT JOIN lesson_progress l ON p.learner_id = l.learner_id AND p.path_id = l.path_id AND l.status = 'completed'
  GROUP BY p.path_id
"
```

---

## 5. Common Patterns

### Show Next Lesson

```svelte
<script lang="ts">
  import { progress } from '$lib/stores/progress';
  import { PATHS } from '$content/paths';

  function getNextLesson() {
    for (const path of PATHS) {
      for (const lesson of path.lessons) {
        const prog = $progress.lessonProgress.find(
          lp => lp.pathId === path.id && lp.lessonId === lesson.id
        );

        if (!prog || prog.status !== 'completed') {
          return { path, lesson };
        }
      }
    }
    return null;
  }
</script>

{#if getNextLesson()}
  {@const next = getNextLesson()}
  <a href="/paths/{next.path.id}/{next.lesson.id}">
    Continue: {next.lesson.title}
  </a>
{/if}
```

### Show Path Completion

```svelte
<script lang="ts">
  import { progress, getPathProgress } from '$lib/stores/progress';

  const pathProgress = getPathProgress('foundations');
</script>

{#if $pathProgress}
  <div>
    <h3>Foundations</h3>
    <p>{$pathProgress.lessonsCompleted} / {$pathProgress.totalLessons} lessons</p>
    <div class="progress-bar">
      <div style="width: {($pathProgress.lessonsCompleted / $pathProgress.totalLessons) * 100}%"></div>
    </div>
  </div>
{/if}
```

---

## 6. Deployment

### 1. Apply Migration

```bash
cd packages/lms
wrangler d1 migrations apply lms-db --remote
```

### 2. Build

```bash
pnpm build
```

### 3. Deploy

```bash
wrangler pages deploy .svelte-kit/cloudflare --project-name=createsomething-lms
```

---

## 7. Troubleshooting

### Progress Not Saving

1. Check authentication:
```typescript
console.log(locals.user); // Should be defined
```

2. Check database binding:
```typescript
console.log(platform?.env?.DB); // Should exist
```

3. Check API response:
```bash
curl -v http://localhost:5173/api/progress
```

### Type Errors

Run type check and generate types:
```bash
pnpm exec svelte-kit sync
pnpm exec tsc --noEmit
```

### Database Queries Failing

Check migration status:
```bash
wrangler d1 migrations list lms-db
```

Apply if needed:
```bash
wrangler d1 migrations apply lms-db --local
```

---

## 8. Further Reading

- **Full Documentation**: `PROGRESS_TRACKING.md`
- **Usage Examples**: `PROGRESS_USAGE_EXAMPLES.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Database Schema**: `migrations/0001_initial.sql`
- **Tracker Class**: `src/lib/progress/tracker.ts`
- **Store Implementation**: `src/lib/stores/progress.ts`

---

## Canon Philosophy

**The infrastructure disappears; only the learning remains.**

Progress tracking is Zuhandenheit—ready-to-hand, not present-at-hand. Components track progress naturally. APIs recede into transparent use. The database serves the journey.

**Weniger, aber besser**: Less ceremony, better learning.
