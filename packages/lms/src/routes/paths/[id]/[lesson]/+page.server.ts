import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPath, getLesson } from '$lib/content/paths';
import { marked } from 'marked';

// Configure marked for clean output
marked.setOptions({
  gfm: true,
  breaks: false
});

// Import all lesson markdown files at build time using Vite's glob import
const lessonFiles = import.meta.glob('/src/lib/content/lessons/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

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

  // Load markdown content from pre-imported files
  let content = '';
  const contentKey = `/src/lib/content/lessons/${params.id}/${params.lesson}.md`;
  const markdown = lessonFiles[contentKey];

  if (markdown) {
    content = await marked.parse(markdown);
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
