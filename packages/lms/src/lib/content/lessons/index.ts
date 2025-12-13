/**
 * Lesson Content Loader
 *
 * Loads markdown lesson content from the filesystem.
 * Content is organized by path, then lesson ID.
 */

/**
 * Load lesson content by path and lesson ID.
 *
 * @param pathId - The learning path ID (e.g., 'foundations')
 * @param lessonId - The lesson ID (e.g., 'what-is-creation')
 * @returns The markdown content as a string
 * @throws Error if the lesson file doesn't exist
 */
export async function loadLesson(pathId: string, lessonId: string): Promise<string> {
  try {
    // Dynamic import of markdown file
    const module = await import(`./${pathId}/${lessonId}.md?raw`);
    return module.default;
  } catch (error) {
    throw new Error(
      `Failed to load lesson: ${pathId}/${lessonId}. ` +
      `Ensure the file exists at src/lib/content/lessons/${pathId}/${lessonId}.md`
    );
  }
}

/**
 * Check if a lesson file exists.
 *
 * @param pathId - The learning path ID
 * @param lessonId - The lesson ID
 * @returns True if the lesson file exists
 */
export async function lessonExists(pathId: string, lessonId: string): Promise<boolean> {
  try {
    await loadLesson(pathId, lessonId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load all lessons for a given path.
 *
 * @param pathId - The learning path ID
 * @param lessonIds - Array of lesson IDs to load
 * @returns Map of lesson ID to markdown content
 */
export async function loadPathLessons(
  pathId: string,
  lessonIds: string[]
): Promise<Map<string, string>> {
  const lessons = new Map<string, string>();

  await Promise.all(
    lessonIds.map(async (lessonId) => {
      try {
        const content = await loadLesson(pathId, lessonId);
        lessons.set(lessonId, content);
      } catch (error) {
        console.error(`Failed to load lesson ${pathId}/${lessonId}:`, error);
      }
    })
  );

  return lessons;
}

/**
 * Extract frontmatter from markdown content.
 * Looks for YAML frontmatter between --- delimiters.
 *
 * @param markdown - Raw markdown content
 * @returns Object with frontmatter data and remaining content
 */
export function extractFrontmatter(markdown: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: markdown };
  }

  const frontmatterText = match[1];
  const content = markdown.slice(match[0].length);

  // Simple YAML parsing for key: value pairs
  const frontmatter: Record<string, unknown> = {};
  frontmatterText.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  });

  return { frontmatter, content };
}

/**
 * Extract section headings from markdown content.
 * Useful for generating a table of contents.
 *
 * @param markdown - Raw markdown content
 * @returns Array of { level: number, text: string, id: string }
 */
export function extractHeadings(markdown: string): Array<{
  level: number;
  text: string;
  id: string;
}> {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];

  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    headings.push({ level, text, id });
  }

  return headings;
}
