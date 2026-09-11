export interface ProgressLesson {
  id: string;
  title: string;
}

export interface ProgressPath {
  id: string;
  title: string;
  lessons: ProgressLesson[];
}

export interface ProgressPathRecord {
  pathId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  lessonsCompleted: number;
  totalLessons: number;
  currentLesson: string | null;
}

export interface ProgressLessonRecord {
  pathId: string;
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface ProgressTotals {
  lessonsCompleted: number;
  totalLessons: number;
}

export interface ProgressAction {
  state: 'new' | 'resume' | 'complete' | 'browse';
  heading: string;
  description: string;
  label: string;
  href: string;
}

export function buildProgressView(
  paths: ProgressPath[],
  pathProgress: ProgressPathRecord[],
  totals: ProgressTotals,
  lessonProgress: ProgressLessonRecord[] = []
): ProgressAction {
  if (totals.totalLessons > 0 && totals.lessonsCompleted >= totals.totalLessons) {
    return {
      state: 'complete',
      heading: 'Every lesson is complete.',
      description: `You finished all ${totals.totalLessons} lessons. Choose a path to review or practice again.`,
      label: 'Review paths and choose what to practice',
      href: '/paths'
    };
  }

  const activeRecord = pathProgress.find((record) => record.status === 'in_progress');
  if (activeRecord) {
    const activePath = paths.find((path) => path.id === activeRecord.pathId);
    const completedLessonIds = new Set(
      lessonProgress
        .filter((lesson) => lesson.pathId === activeRecord.pathId && lesson.status === 'completed')
        .map((lesson) => lesson.lessonId)
    );
    const nextLesson =
      activePath?.lessons.find((lesson) => !completedLessonIds.has(lesson.id)) ??
      activePath?.lessons.find((lesson) => lesson.id === activeRecord.currentLesson);

    if (activePath && nextLesson) {
      return {
        state: 'resume',
        heading: 'Resume the next unfinished lesson.',
        description: `You completed ${totals.lessonsCompleted} of ${totals.totalLessons} lessons. Continue in ${activePath.title}.`,
        label: `Resume: ${nextLesson.title}`,
        href: `/paths/${activePath.id}/${nextLesson.id}`
      };
    }
  }

  const availableRecord = pathProgress.find((record) => record.status === 'not_started');
  const availablePath = paths.find((path) => path.id === availableRecord?.pathId) ?? paths.at(0);
  const firstLesson = availablePath?.lessons.at(0);

  if (availablePath && firstLesson && totals.lessonsCompleted === 0) {
    return {
      state: 'new',
      heading: 'Start with one lesson.',
      description: `Begin ${availablePath.title}. Your saved progress will update after the lesson.`,
      label: `Start: ${firstLesson.title}`,
      href: `/paths/${availablePath.id}/${firstLesson.id}`
    };
  }

  return {
    state: 'browse',
    heading: 'Choose the next lesson.',
    description: `You completed ${totals.lessonsCompleted} of ${totals.totalLessons} lessons. Open the course list to continue.`,
    label: 'Open the course list',
    href: '/paths'
  };
}
