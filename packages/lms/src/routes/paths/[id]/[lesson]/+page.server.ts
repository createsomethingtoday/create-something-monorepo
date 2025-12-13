import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPath, getLesson } from '$lib/content/paths';

export const load: PageServerLoad = async ({ params }) => {
  const path = getPath(params.id);
  const lesson = getLesson(params.id, params.lesson);

  if (!path || !lesson) {
    throw error(404, 'Lesson not found');
  }

  // Find current lesson index
  const currentIndex = path.lessons.findIndex((l) => l.id === params.lesson);

  // Get previous and next lessons
  const previousLesson = currentIndex > 0 ? path.lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < path.lessons.length - 1 ? path.lessons[currentIndex + 1] : null;

  return {
    path,
    lesson,
    lessonNumber: currentIndex + 1,
    totalLessons: path.lessons.length,
    previousLesson,
    nextLesson
  };
};
