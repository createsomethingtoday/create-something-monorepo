# LMS Progress Tracking Implementation

**Canon**: The infrastructure disappears; only the learning remains.

This document describes the progress tracking system for the CREATE SOMETHING LMS. The system tracks learner progress through paths, lessons, and praxis exercises using D1 database storage and a reactive Svelte store architecture.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  - Svelte stores ($lib/stores/progress.ts)                      │
│  - Reactive UI components                                        │
│  - Real-time progress updates                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  - /api/progress (GET) - Full progress overview                 │
│  - /api/progress/lesson (POST) - Start/complete lessons         │
│  - /api/progress/praxis (POST/GET) - Praxis attempts            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  - ProgressTracker class ($lib/progress/tracker.ts)             │
│  - Database operations                                           │
│  - Business logic                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      D1 Database                                 │
│  - learners                                                      │
│  - path_progress                                                 │
│  - lesson_progress                                               │
│  - praxis_attempts                                               │
│  - reflections                                                   │
│  - understanding_snapshots                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

The schema is defined in `/packages/lms/migrations/0001_initial.sql`.

### Core Tables

#### `learners`
Stores learner identity and metadata.
```sql
CREATE TABLE learners (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  metadata TEXT DEFAULT '{}'
);
```

#### `path_progress`
Tracks progress through learning paths.
```sql
CREATE TABLE path_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id),
  path_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at INTEGER,
  completed_at INTEGER,
  current_lesson TEXT,
  UNIQUE(learner_id, path_id)
);
```

#### `lesson_progress`
Tracks progress through individual lessons.
```sql
CREATE TABLE lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id),
  path_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at INTEGER,
  completed_at INTEGER,
  time_spent INTEGER DEFAULT 0,  -- Seconds
  visits INTEGER DEFAULT 0,      -- Hermeneutic spiral tracking
  UNIQUE(learner_id, path_id, lesson_id)
);
```

#### `praxis_attempts`
Tracks hands-on exercise attempts and results.
```sql
CREATE TABLE praxis_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id),
  praxis_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'submitted', 'passed', 'failed')),
  submission TEXT,            -- JSON
  feedback TEXT,              -- AI-generated
  score REAL,                 -- 0.0 to 1.0
  started_at INTEGER NOT NULL,
  submitted_at INTEGER,
  metadata TEXT DEFAULT '{}'
);
```

#### `reflections`
Learner insights and reflections.
```sql
CREATE TABLE reflections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id),
  path_id TEXT,
  lesson_id TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

#### `understanding_snapshots`
Tracks the hermeneutic spiral—how understanding deepens over time.
```sql
CREATE TABLE understanding_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id),
  path_id TEXT NOT NULL,
  understanding_level REAL NOT NULL,  -- 0.0 to 1.0
  assessed_at INTEGER NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('self', 'praxis', 'reflection')),
  notes TEXT
);
```

---

## API Endpoints

### `GET /api/progress`

Returns the authenticated user's complete progress across all paths.

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "learner@example.com",
    "name": "Learner Name"
  },
  "pathProgress": [
    {
      "pathId": "foundations",
      "status": "in_progress",
      "lessonsCompleted": 2,
      "totalLessons": 5,
      "currentLesson": "rams-artifact",
      "startedAt": 1702000000,
      "completedAt": null
    }
  ],
  "lessonProgress": [
    {
      "lessonId": "what-is-creation",
      "pathId": "foundations",
      "status": "completed",
      "visits": 1,
      "timeSpent": 900,
      "completedAt": 1702000900
    }
  ],
  "stats": {
    "totalPaths": 7,
    "pathsStarted": 1,
    "pathsCompleted": 0,
    "lessonsCompleted": 2,
    "totalLessons": 35,
    "totalTimeSpent": 1800
  }
}
```

### `POST /api/progress/lesson`

Start or complete a lesson.

**Request Body**:
```json
{
  "pathId": "foundations",
  "lessonId": "what-is-creation",
  "action": "start" | "complete",
  "timeSpent": 900  // Optional, for complete action (seconds)
}
```

**Response**:
```json
{
  "success": true,
  "message": "Lesson completed",
  "progress": {
    "learnerId": "uuid",
    "pathId": "foundations",
    "lessonId": "what-is-creation",
    "status": "completed",
    "startedAt": 1702000000,
    "completedAt": 1702000900,
    "timeSpent": 900,
    "visits": 1
  },
  "pathCompleted": false
}
```

### `POST /api/progress/praxis`

Start or submit a praxis exercise.

**Request Body** (start):
```json
{
  "praxisId": "triad-audit",
  "action": "start"
}
```

**Request Body** (submit):
```json
{
  "praxisId": "triad-audit",
  "action": "submit",
  "submission": { /* exercise submission data */ },
  "score": 0.85,
  "passed": true,
  "feedback": "Excellent application of the Subtractive Triad..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Praxis passed!",
  "attemptId": 123,
  "score": 0.85,
  "passed": true,
  "feedback": "Excellent application..."
}
```

### `GET /api/progress/praxis?praxisId={id}`

Get all attempts for a specific praxis exercise.

**Response**:
```json
{
  "success": true,
  "praxisId": "triad-audit",
  "attempts": [
    {
      "id": 123,
      "learnerId": "uuid",
      "praxisId": "triad-audit",
      "status": "passed",
      "submission": { /* data */ },
      "feedback": "Excellent...",
      "score": 0.85,
      "startedAt": 1702000000,
      "submittedAt": 1702001000
    }
  ]
}
```

---

## Client-Side Store

The progress store (`$lib/stores/progress.ts`) provides reactive state management for the client.

### Usage

```typescript
import { progress, getLessonProgress, overallProgress } from '$lib/stores/progress';
import { onMount } from 'svelte';

// In a component
onMount(() => {
  progress.fetch(); // Load initial progress
});

// Track lesson start
await progress.startLesson('foundations', 'what-is-creation');

// Complete lesson
const result = await progress.completeLesson('foundations', 'what-is-creation', 900);
if (result.pathCompleted) {
  // Show celebration
}

// Start praxis
const attemptId = await progress.startPraxis('triad-audit');

// Submit praxis
const result = await progress.submitPraxis('triad-audit', submission, 0.85, true, 'Excellent...');

// Get attempts
const attempts = await progress.getPraxisAttempts('triad-audit');

// Reactive progress for a specific lesson
const lessonProgress = getLessonProgress('foundations', 'what-is-creation');
// Use in template: {$lessonProgress?.status}

// Overall progress percentage
// Use in template: {$overallProgress}% (0-100)
```

### Store State

```typescript
interface ProgressState {
  pathProgress: PathProgress[];
  lessonProgress: LessonProgress[];
  stats: ProgressStats;
  loading: boolean;
  error: string | null;
}
```

---

## UI Integration

### Progress Page (`/progress`)

- Displays overall stats (paths completed, lessons completed, time spent)
- Shows progress bars for each path
- Lists all paths with completion status
- Refresh button for manual updates
- Real-time reactivity via stores

### Lesson Page (`/paths/[id]/[lesson]`)

- Automatically tracks lesson start on mount
- Tracks time spent on page
- "Complete & Continue" button marks lesson as complete
- Shows completion indicator for completed lessons
- Navigates to next lesson or path overview on completion
- Automatically completes path when final lesson is done

### Path Page (`/paths/[id]`)

- Shows lesson completion status for each lesson
- Displays path progress bar
- Links to next incomplete lesson

---

## Deployment

### Database Migration

Apply the migration to the D1 database:

```bash
wrangler d1 migrations apply lms-db --remote
```

### Environment Variables

Ensure `wrangler.toml` has the correct D1 binding:

```toml
[[d1_databases]]
binding = "DB"
database_name = "lms-db"
database_id = "2ec4ea2e-c25f-4832-b78f-a608ff9f8ad7"
```

### Authentication

Progress tracking requires authentication. The user is available via `locals.user` (set by `hooks.server.ts`), which is provided by the Identity Worker.

---

## Hermeneutic Design

The progress tracking system embodies the hermeneutic spiral:

1. **Visits tracking**: Each return to a lesson increments the `visits` counter, acknowledging that learning is not linear but spiral.

2. **Understanding snapshots**: The system can record self-assessments, praxis scores, and reflection depth over time, showing how understanding evolves.

3. **Time as secondary**: Time spent is tracked but not emphasized. The focus is on completion and understanding, not speed.

4. **Path as journey**: Paths have prerequisites, creating a natural progression that builds understanding.

---

## Future Enhancements

- **Certificates**: Generate completion certificates for paths
- **Leaderboards**: Optional community engagement (with privacy controls)
- **Reflection prompts**: Guided reflections after key lessons
- **Understanding graphs**: Visualize the hermeneutic spiral over time
- **Adaptive paths**: Recommend next steps based on progress and interests
- **Export progress**: Download learning journey as JSON or PDF

---

## Canon Compliance

This implementation follows CREATE SOMETHING principles:

- **DRY**: Single source of truth in D1, unified API layer
- **Rams**: Every table, field, and endpoint earns its existence
- **Heidegger**: The system serves the learning journey—infrastructure recedes
- **Zuhandenheit**: Progress tracking is ready-to-hand, not present-at-hand
- **Hermeneutic Spiral**: Visits and understanding snapshots acknowledge non-linear learning

**Weniger, aber besser**: Less infrastructure, better learning.
