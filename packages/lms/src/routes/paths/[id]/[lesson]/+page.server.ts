import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPath, getLesson } from '$lib/content/paths';
import { loadLesson, extractFrontmatter, stripDuplicateLessonHeading } from '$lib/content/lessons';
import { marked } from 'marked';

// Configure marked for clean output
marked.setOptions({
  gfm: true,
  breaks: false
});

export const load: PageServerLoad = async ({ params }) => {
  const pathData = getPath(params.id);
  const lesson = getLesson(params.id, params.lesson);

  if (!pathData || !lesson) {
    throw error(404, 'Lesson not found');
  }

  // Find current lesson index
  const currentIndex = pathData.lessons.findIndex((l) => l.id === params.lesson);

  // Get previous and next lessons
  const previousLesson = currentIndex > 0 ? pathData.lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < pathData.lessons.length - 1 ? pathData.lessons[currentIndex + 1] : null;

  let content = '';
  try {
    const markdown = await loadLesson(params.id, params.lesson);
    const parsed = extractFrontmatter(markdown);
    content = stripDuplicateLessonHeading(await marked.parse(parsed.content), lesson.title);
  } catch (err) {
    console.error(`Failed to load lesson content: ${params.id}/${params.lesson}`, err);
  }

  return {
    path: pathData,
    lesson,
    lessonNumber: currentIndex + 1,
    totalLessons: pathData.lessons.length,
    previousLesson,
    nextLesson,
    content
  };
};
