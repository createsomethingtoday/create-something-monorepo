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

// Import all interactive lesson JSON files
const interactiveFiles = import.meta.glob('/src/lib/content/lessons/**/*.json', {
  import: 'default',
  eager: true
}) as Record<string, unknown>;

/**
 * Strip YAML frontmatter from markdown content.
 * Frontmatter is delimited by --- at the start of the file.
 */
function stripFrontmatter(markdown: string): string {
  const frontmatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
  return markdown.replace(frontmatterRegex, '');
}

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

  // Check for interactive lesson JSON first
  const interactiveKey = `/src/lib/content/lessons/${params.id}/${params.lesson}.json`;
  const interactiveData = interactiveFiles[interactiveKey] as { interactive?: boolean; sections?: unknown[] } | undefined;

  // Load markdown content from pre-imported files
  let content = '';
  const contentKey = `/src/lib/content/lessons/${params.id}/${params.lesson}.md`;
  const markdown = lessonFiles[contentKey];

  if (markdown) {
    // Strip YAML frontmatter before parsing
    const markdownContent = stripFrontmatter(markdown);
    content = await marked.parse(markdownContent);
  }

  return {
    path: pathData,
    lesson,
    lessonNumber: currentIndex + 1,
    totalLessons: pathData.lessons.length,
    previousLesson,
    nextLesson,
    content,
    // Include interactive data if available
    interactive: interactiveData?.interactive ?? false,
    interactiveData: interactiveData ?? null
  };
};
