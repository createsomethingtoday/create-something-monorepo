/**
 * Progress Tracker
 *
 * Tracks learner progress through paths and lessons.
 * Implements the hermeneutic spiral—each visit deepens understanding.
 */

export interface LessonProgress {
  learnerId: string;
  pathId: string;
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt: number | null;
  completedAt: number | null;
  timeSpent: number;
  visits: number;
}

export interface PathProgress {
  learnerId: string;
  pathId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt: number | null;
  completedAt: number | null;
  currentLesson: string | null;
  lessonsCompleted: number;
  totalLessons: number;
}

export interface PraxisAttempt {
  id: number;
  learnerId: string;
  praxisId: string;
  status: 'started' | 'submitted' | 'passed' | 'failed';
  submission: unknown;
  feedback: string | null;
  score: number | null;
  startedAt: number;
  submittedAt: number | null;
}

/**
 * Progress tracker for the LMS.
 * Uses D1 for persistence.
 */
export class ProgressTracker {
  constructor(private db: D1Database) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Learner Management
  // ─────────────────────────────────────────────────────────────────────────

  async getOrCreateLearner(email: string, name?: string): Promise<string> {
    // Check if learner exists
    const existing = await this.db
      .prepare('SELECT id FROM learners WHERE email = ?')
      .bind(email)
      .first<{ id: string }>();

    if (existing) {
      // Update last seen
      await this.db
        .prepare('UPDATE learners SET last_seen_at = ? WHERE id = ?')
        .bind(Math.floor(Date.now() / 1000), existing.id)
        .run();
      return existing.id;
    }

    // Create new learner
    const id = crypto.randomUUID();
    await this.db
      .prepare('INSERT INTO learners (id, email, name) VALUES (?, ?, ?)')
      .bind(id, email, name ?? null)
      .run();

    return id;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lesson Progress
  // ─────────────────────────────────────────────────────────────────────────

  async startLesson(learnerId: string, pathId: string, lessonId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    // Upsert lesson progress
    await this.db
      .prepare(
        `INSERT INTO lesson_progress (learner_id, path_id, lesson_id, status, started_at, visits)
         VALUES (?, ?, ?, 'in_progress', ?, 1)
         ON CONFLICT(learner_id, path_id, lesson_id) DO UPDATE SET
           status = CASE WHEN status = 'completed' THEN 'completed' ELSE 'in_progress' END,
           visits = visits + 1`
      )
      .bind(learnerId, pathId, lessonId, now)
      .run();

    // Update path progress
    await this.db
      .prepare(
        `INSERT INTO path_progress (learner_id, path_id, status, started_at, current_lesson)
         VALUES (?, ?, 'in_progress', ?, ?)
         ON CONFLICT(learner_id, path_id) DO UPDATE SET
           status = CASE WHEN status = 'completed' THEN 'completed' ELSE 'in_progress' END,
           current_lesson = ?`
      )
      .bind(learnerId, pathId, now, lessonId, lessonId)
      .run();
  }

  async completeLesson(
    learnerId: string,
    pathId: string,
    lessonId: string,
    timeSpent: number
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `UPDATE lesson_progress
         SET status = 'completed', completed_at = ?, time_spent = time_spent + ?
         WHERE learner_id = ? AND path_id = ? AND lesson_id = ?`
      )
      .bind(now, timeSpent, learnerId, pathId, lessonId)
      .run();
  }

  async getLessonProgress(
    learnerId: string,
    pathId: string,
    lessonId: string
  ): Promise<LessonProgress | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM lesson_progress
         WHERE learner_id = ? AND path_id = ? AND lesson_id = ?`
      )
      .bind(learnerId, pathId, lessonId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    return {
      learnerId: row.learner_id as string,
      pathId: row.path_id as string,
      lessonId: row.lesson_id as string,
      status: row.status as LessonProgress['status'],
      startedAt: row.started_at as number | null,
      completedAt: row.completed_at as number | null,
      timeSpent: row.time_spent as number,
      visits: row.visits as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Path Progress
  // ─────────────────────────────────────────────────────────────────────────

  async getPathProgress(learnerId: string, pathId: string): Promise<PathProgress | null> {
    const row = await this.db
      .prepare('SELECT * FROM path_progress WHERE learner_id = ? AND path_id = ?')
      .bind(learnerId, pathId)
      .first<Record<string, unknown>>();

    // Count completed lessons
    const { results } = await this.db
      .prepare(
        `SELECT COUNT(*) as completed FROM lesson_progress
         WHERE learner_id = ? AND path_id = ? AND status = 'completed'`
      )
      .bind(learnerId, pathId)
      .all<{ completed: number }>();

    const completed = results[0]?.completed ?? 0;

    if (!row) {
      return {
        learnerId,
        pathId,
        status: 'not_started',
        startedAt: null,
        completedAt: null,
        currentLesson: null,
        lessonsCompleted: 0,
        totalLessons: 0, // Will be filled by caller
      };
    }

    return {
      learnerId: row.learner_id as string,
      pathId: row.path_id as string,
      status: row.status as PathProgress['status'],
      startedAt: row.started_at as number | null,
      completedAt: row.completed_at as number | null,
      currentLesson: row.current_lesson as string | null,
      lessonsCompleted: completed,
      totalLessons: 0, // Will be filled by caller
    };
  }

  async completePath(learnerId: string, pathId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `UPDATE path_progress SET status = 'completed', completed_at = ?
         WHERE learner_id = ? AND path_id = ?`
      )
      .bind(now, learnerId, pathId)
      .run();
  }

  async getCompletedPaths(learnerId: string): Promise<string[]> {
    const { results } = await this.db
      .prepare(
        `SELECT path_id FROM path_progress
         WHERE learner_id = ? AND status = 'completed'`
      )
      .bind(learnerId)
      .all<{ path_id: string }>();

    return results.map((r) => r.path_id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Praxis
  // ─────────────────────────────────────────────────────────────────────────

  async startPraxis(learnerId: string, praxisId: string): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO praxis_attempts (learner_id, praxis_id, status)
         VALUES (?, ?, 'started')`
      )
      .bind(learnerId, praxisId)
      .run();

    return result.meta.last_row_id as number;
  }

  async submitPraxis(
    attemptId: number,
    submission: unknown,
    feedback: string,
    score: number,
    passed: boolean
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `UPDATE praxis_attempts
         SET status = ?, submission = ?, feedback = ?, score = ?, submitted_at = ?
         WHERE id = ?`
      )
      .bind(
        passed ? 'passed' : 'failed',
        JSON.stringify(submission),
        feedback,
        score,
        now,
        attemptId
      )
      .run();
  }

  async getPraxisAttempts(learnerId: string, praxisId: string): Promise<PraxisAttempt[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM praxis_attempts
         WHERE learner_id = ? AND praxis_id = ?
         ORDER BY started_at DESC`
      )
      .bind(learnerId, praxisId)
      .all<Record<string, unknown>>();

    return results.map((row) => ({
      id: row.id as number,
      learnerId: row.learner_id as string,
      praxisId: row.praxis_id as string,
      status: row.status as PraxisAttempt['status'],
      submission: row.submission ? JSON.parse(row.submission as string) : null,
      feedback: row.feedback as string | null,
      score: row.score as number | null,
      startedAt: row.started_at as number,
      submittedAt: row.submitted_at as number | null,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reflections
  // ─────────────────────────────────────────────────────────────────────────

  async addReflection(
    learnerId: string,
    content: string,
    pathId?: string,
    lessonId?: string
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO reflections (learner_id, path_id, lesson_id, content)
         VALUES (?, ?, ?, ?)`
      )
      .bind(learnerId, pathId ?? null, lessonId ?? null, content)
      .run();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Understanding Snapshots
  // ─────────────────────────────────────────────────────────────────────────

  async recordUnderstanding(
    learnerId: string,
    pathId: string,
    level: number,
    assessmentType: 'self' | 'praxis' | 'reflection',
    notes?: string
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO understanding_snapshots
         (learner_id, path_id, understanding_level, assessment_type, notes)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(learnerId, pathId, level, assessmentType, notes ?? null)
      .run();
  }

  async getUnderstandingHistory(
    learnerId: string,
    pathId: string
  ): Promise<Array<{ level: number; assessedAt: number; type: string }>> {
    const { results } = await this.db
      .prepare(
        `SELECT understanding_level, assessed_at, assessment_type
         FROM understanding_snapshots
         WHERE learner_id = ? AND path_id = ?
         ORDER BY assessed_at ASC`
      )
      .bind(learnerId, pathId)
      .all<Record<string, unknown>>();

    return results.map((row) => ({
      level: row.understanding_level as number,
      assessedAt: row.assessed_at as number,
      type: row.assessment_type as string,
    }));
  }
}
