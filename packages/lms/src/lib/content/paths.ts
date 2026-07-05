/**
 * Learning Paths Configuration
 *
 * Teach operators through practical CREATE SOMETHING workflows.
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
    title: 'Build Your First Business MCP',
    subtitle: 'Learn Codex by Creating an MCP for Business Data',
    description:
      'One practical path: use the Codex app to turn a RapidAPI business-data endpoint into a stable local MCP server for a real operator workflow.',
    color: 'path-advanced',
    lessons: [
      {
        id: 'what-is-codex-and-mcp',
        title: 'What Codex Uses MCP For',
        description: 'Understand how Codex uses MCP tools and its MCP-building skill to make business workflows repeatable.',
        duration: '10 min'
      },
      {
        id: 'scaffold-an-mcp-server',
        title: 'Scaffold an MCP Server',
        description: 'Use the Codex MCP-building skill to plan a minimal TypeScript server, then scaffold it locally.',
        duration: '20 min'
      },
      {
        id: 'add-your-first-tool',
        title: 'Add a Business Search Tool',
        description: 'Connect RapidAPI Local Business Data with Zod input validation and machine-readable output.',
        duration: '25 min'
      },
      {
        id: 'connect-to-codex',
        title: 'Connect the Server to Codex',
        description: 'Register the server in the Codex app, inspect the MCP settings, and invoke the tool from chat.',
        duration: '15 min'
      },
      {
        id: 'test-debug-and-iterate',
        title: 'Test, Debug, Iterate',
        description: 'Use Inspector, Codex config checks, and stderr logs to diagnose API, schema, and prompt failures.',
        duration: '25 min'
      },
      {
        id: 'ship-and-next-steps',
        title: 'Ship and Extend',
        description: 'Document the tool contract, safety model, evidence loop, and next useful tools.',
        duration: '10 min'
      }
    ]
  },
  {
    id: 'make-your-workflow-visible',
    title: 'Make Your Workflow Visible',
    subtitle: 'Learn Canon by Turning Work Into Proof Images',
    description:
      'Use Canon image rules to turn an operator workflow into clear maps, MCP boundaries, policy gates, validation receipts, and handoff artifacts.',
    color: 'path-systems',
    lessons: [
      {
        id: 'what-images-prove',
        title: 'What a Workflow Image Must Prove',
        description:
          'Learn the Canon rule for useful images: show the object, decision state, proof, or owner.',
        duration: '10 min'
      },
      {
        id: 'map-three-tiers',
        title: 'Map Database, Automation, Judgment',
        description:
          'Turn a business workflow into three visible lanes so Codex and operators know what is data, execution, and policy.',
        duration: '15 min'
      },
      {
        id: 'show-mcp-boundary',
        title: 'Show the MCP Boundary',
        description:
          'Draw the edge between Codex, the MCP server, external APIs, and the human approval point.',
        duration: '15 min'
      },
      {
        id: 'place-policy-gates',
        title: 'Place Policy Gates',
        description:
          'Use run, review, stop, and escalate states to make automation limits visible before work ships.',
        duration: '15 min'
      },
      {
        id: 'ship-receipts-and-metadata',
        title: 'Ship Receipts and Metadata',
        description:
          'Package the image with the claim, validation evidence, owner, refresh date, and next action.',
        duration: '15 min'
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
