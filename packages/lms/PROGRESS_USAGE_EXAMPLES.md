# Progress Tracking Usage Examples

Quick reference for integrating progress tracking into LMS components.

---

## Lesson Page Integration

Track when a learner views and completes a lesson:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress, getLessonProgress } from '$lib/stores/progress';
  import { CheckCircle } from 'lucide-svelte';

  let { data } = $props();
  const { path, lesson } = data;

  let startTime = 0;
  let isCompleting = false;

  // Get reactive progress for this lesson
  const lessonProgress = getLessonProgress(path.id, lesson.id);

  onMount(() => {
    startTime = Date.now();

    // Track lesson start
    progress.startLesson(path.id, lesson.id);

    // Load progress
    progress.fetch();
  });

  async function handleComplete() {
    isCompleting = true;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const result = await progress.completeLesson(path.id, lesson.id, timeSpent);

      if (result.pathCompleted) {
        // Show celebration
        console.log('🎉 Path completed!');
      }

      // Navigate to next lesson
      window.location.href = `/paths/${path.id}/${nextLesson.id}`;
    } catch (err) {
      console.error('Failed to complete lesson:', err);
      isCompleting = false;
    }
  }
</script>

<!-- Show completion status -->
{#if $lessonProgress?.status === 'completed'}
  <div class="completed">
    <CheckCircle size={20} />
    <span>Completed</span>
  </div>
{:else}
  <button onclick={handleComplete} disabled={isCompleting}>
    {isCompleting ? 'Completing...' : 'Complete Lesson'}
  </button>
{/if}
```

---

## Praxis Exercise Integration

Track when a learner starts and submits a praxis exercise:

```svelte
<script lang="ts">
  import { progress } from '$lib/stores/progress';

  let { data } = $props();
  const { praxis } = data;

  let attemptId = 0;
  let submission = $state({});
  let result = $state(null);

  async function startExercise() {
    attemptId = await progress.startPraxis(praxis.id);
    console.log(`Started attempt ${attemptId}`);
  }

  async function submitExercise() {
    // Validate submission
    const score = evaluateSubmission(submission); // Your logic
    const passed = score >= 0.7;
    const feedback = generateFeedback(submission); // Your logic

    result = await progress.submitPraxis(
      praxis.id,
      submission,
      score,
      passed,
      feedback
    );
  }

  // Load previous attempts
  async function loadAttempts() {
    const attempts = await progress.getPraxisAttempts(praxis.id);
    console.log(`Found ${attempts.length} previous attempts`);
  }
</script>

{#if !attemptId}
  <button onclick={startExercise}>Start Exercise</button>
{:else if !result}
  <!-- Exercise UI -->
  <button onclick={submitExercise}>Submit</button>
{:else}
  <div class="result {result.passed ? 'passed' : 'failed'}">
    <h3>{result.passed ? 'Passed!' : 'Try Again'}</h3>
    <p>Score: {(result.score * 100).toFixed(0)}%</p>
    {#if result.feedback}
      <p>{result.feedback}</p>
    {/if}
  </div>
{/if}
```

---

## Progress Dashboard

Display overall progress:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress, overallProgress } from '$lib/stores/progress';

  onMount(() => {
    progress.fetch();
  });

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
</script>

<div class="dashboard">
  <h2>Your Progress</h2>

  <!-- Overall percentage -->
  <div class="progress-circle">
    {$overallProgress}%
  </div>

  <!-- Stats grid -->
  <div class="stats">
    <div class="stat">
      <span class="value">{$progress.stats.pathsCompleted}</span>
      <span class="label">Paths Completed</span>
    </div>
    <div class="stat">
      <span class="value">{$progress.stats.lessonsCompleted}</span>
      <span class="label">Lessons Completed</span>
    </div>
    <div class="stat">
      <span class="value">{formatTime($progress.stats.totalTimeSpent)}</span>
      <span class="label">Time Learning</span>
    </div>
  </div>

  <!-- Path list -->
  {#each $progress.pathProgress as pathProg}
    <div class="path-card">
      <h3>{pathProg.pathId}</h3>
      <div class="progress-bar">
        <div
          class="fill"
          style="width: {(pathProg.lessonsCompleted / pathProg.totalLessons) * 100}%"
        ></div>
      </div>
      <span>{pathProg.lessonsCompleted} / {pathProg.totalLessons} lessons</span>
    </div>
  {/each}

  <!-- Loading state -->
  {#if $progress.loading}
    <div class="loading">Loading progress...</div>
  {/if}

  <!-- Error state -->
  {#if $progress.error}
    <div class="error">{$progress.error}</div>
  {/if}
</div>
```

---

## Path Overview

Show lesson completion status:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress, getPathProgress } from '$lib/stores/progress';
  import { CheckCircle, Circle } from 'lucide-svelte';

  let { data } = $props();
  const { path } = data;

  const pathProgress = getPathProgress(path.id);

  onMount(() => {
    progress.fetch();
  });

  // Check if a specific lesson is completed
  function isLessonCompleted(lessonId) {
    return $progress.lessonProgress.find(
      lp => lp.pathId === path.id && lp.lessonId === lessonId && lp.status === 'completed'
    );
  }
</script>

<div class="path-overview">
  <h1>{path.title}</h1>

  <!-- Path progress bar -->
  {#if $pathProgress}
    <div class="path-progress">
      <div class="bar">
        <div
          class="fill"
          style="width: {($pathProgress.lessonsCompleted / $pathProgress.totalLessons) * 100}%"
        ></div>
      </div>
      <span>{$pathProgress.lessonsCompleted} / {$pathProgress.totalLessons} completed</span>
    </div>
  {/if}

  <!-- Lesson list -->
  <ul class="lessons">
    {#each path.lessons as lesson, i}
      {@const completed = isLessonCompleted(lesson.id)}
      <li class:completed>
        <a href="/paths/{path.id}/{lesson.id}">
          {#if completed}
            <CheckCircle size={20} />
          {:else}
            <Circle size={20} />
          {/if}
          <span>{i + 1}. {lesson.title}</span>
        </a>
      </li>
    {/each}
  </ul>
</div>
```

---

## Manual Refresh

Add a refresh button to update progress:

```svelte
<script lang="ts">
  import { progress } from '$lib/stores/progress';
  import { RefreshCw } from 'lucide-svelte';

  async function handleRefresh() {
    await progress.fetch();
  }
</script>

<button
  onclick={handleRefresh}
  disabled={$progress.loading}
  class:spinning={$progress.loading}
>
  <RefreshCw size={20} />
  Refresh
</button>

<style>
  .spinning :global(svg) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
```

---

## Next Lesson Recommendation

Suggest the next lesson to take:

```svelte
<script lang="ts">
  import { progress } from '$lib/stores/progress';
  import { PATHS } from '$content/paths';

  const nextLesson = $derived(() => {
    for (const path of PATHS) {
      const pathProg = $progress.pathProgress.find(p => p.pathId === path.id);

      if (!pathProg || pathProg.status === 'completed') continue;

      // Find first incomplete lesson
      for (const lesson of path.lessons) {
        const lessonProg = $progress.lessonProgress.find(
          lp => lp.pathId === path.id && lp.lessonId === lesson.id
        );

        if (!lessonProg || lessonProg.status !== 'completed') {
          return { path, lesson };
        }
      }
    }

    return null;
  });
</script>

{#if nextLesson}
  <div class="next-lesson">
    <h3>Continue Learning</h3>
    <a href="/paths/{nextLesson.path.id}/{nextLesson.lesson.id}">
      <strong>{nextLesson.lesson.title}</strong>
      <span>{nextLesson.path.title}</span>
    </a>
  </div>
{/if}
```

---

## Testing Progress Tracking

### Manual Testing

1. Start a lesson:
```bash
curl -X POST http://localhost:5173/api/progress/lesson \
  -H "Content-Type: application/json" \
  -d '{"pathId":"foundations","lessonId":"what-is-creation","action":"start"}'
```

2. Complete a lesson:
```bash
curl -X POST http://localhost:5173/api/progress/lesson \
  -H "Content-Type: application/json" \
  -d '{"pathId":"foundations","lessonId":"what-is-creation","action":"complete","timeSpent":900}'
```

3. Get progress:
```bash
curl http://localhost:5173/api/progress
```

### Database Inspection

Check progress in the D1 database:

```bash
# Local dev
wrangler d1 execute lms-db --local --command "SELECT * FROM lesson_progress"

# Production
wrangler d1 execute lms-db --command "SELECT * FROM lesson_progress"
```

---

## Canon Compliance

All examples follow CREATE SOMETHING principles:

- **Zuhandenheit**: APIs recede into transparent use
- **DRY**: Single store, unified data flow
- **Weniger, aber besser**: Minimal boilerplate, maximum clarity
- **Hermeneutic spiral**: Visits tracking acknowledges non-linear learning

**The infrastructure disappears; only the learning remains.**
