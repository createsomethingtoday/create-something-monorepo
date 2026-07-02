/**
 * Learning Paths Configuration
 *
 * Learn Codex by building one MCP server end to end.
 */

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
}

export interface Path {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  lessons: Lesson[];
  prerequisites?: string[];
}

export const PATHS: Path[] = [
  {
    id: 'codex-mcp',
    title: 'Codex MCP Course',
    subtitle: 'Learn Codex by Building an MCP',
    description:
      'One practical path: build a stable local MCP server, connect it to Codex, test it, and ship it with a clear tool contract.',
    color: 'path-advanced',
    lessons: [
      {
        id: 'what-is-codex-and-mcp',
        title: 'What Codex + MCP Actually Do',
        description: 'Understand when MCP is the right boundary for repeatable Codex capabilities.',
        duration: '10 min'
      },
      {
        id: 'scaffold-an-mcp-server',
        title: 'Scaffold an MCP Server',
        description: 'Create a minimal TypeScript MCP server using the stable SDK and stdio transport.',
        duration: '20 min'
      },
      {
        id: 'add-your-first-tool',
        title: 'Add Your First Tool',
        description: 'Implement one focused tool with Zod input validation and machine-readable output.',
        duration: '25 min'
      },
      {
        id: 'connect-to-codex',
        title: 'Connect the Server to Codex',
        description: 'Register the server with Codex, inspect the config, and invoke the tool from chat.',
        duration: '15 min'
      },
      {
        id: 'test-debug-and-iterate',
        title: 'Test, Debug, Iterate',
        description: 'Use Inspector, Codex config checks, and stderr logs to diagnose real prompt failures.',
        duration: '25 min'
      },
      {
        id: 'ship-and-next-steps',
        title: 'Ship and Extend',
        description: 'Document the tool contract, safety model, evidence loop, and next useful tools.',
        duration: '10 min'
      }
    ]
  }
];

/**
 * Get a path by ID.
 */
export function getPath(id: string): Path | undefined {
  return PATHS.find((p) => p.id === id);
}

/**
 * Get a lesson by path and lesson ID.
 */
export function getLesson(pathId: string, lessonId: string): Lesson | undefined {
  const path = getPath(pathId);
  return path?.lessons.find((l) => l.id === lessonId);
}

/**
 * Get all lessons across all paths.
 */
export function getAllLessons(): Array<Lesson & { pathId: string }> {
  return PATHS.flatMap((path) =>
    path.lessons.map((lesson) => ({ ...lesson, pathId: path.id }))
  );
}

/**
 * Get paths available to a learner (based on completed prerequisites).
 */
export function getAvailablePaths(completedPaths: string[]): Path[] {
  return PATHS.filter((path) => {
    if (!path.prerequisites) return true;
    return path.prerequisites.every((prereq) => completedPaths.includes(prereq));
  });
}
