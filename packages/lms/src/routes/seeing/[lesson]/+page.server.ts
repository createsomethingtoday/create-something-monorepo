import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const LEGACY_LESSON_REDIRECTS: Record<string, string> = {
  'setting-up': 'what-is-codex-and-mcp',
  'what-is-creation': 'what-is-codex-and-mcp',
  'automation-layer': 'scaffold-an-mcp-server',
  'subtractive-triad': 'add-your-first-tool',
  'external-memory': 'test-debug-and-iterate',
  'agent-native-tools': 'connect-to-codex',
  capstone: 'ship-and-next-steps'
};

export const load: PageServerLoad = async ({ params, url }) => {
  const lessonId = LEGACY_LESSON_REDIRECTS[params.lesson] ?? 'what-is-codex-and-mcp';
  const queryString = url.searchParams.toString();
  const destination = `/paths/codex-mcp/${lessonId}${queryString ? `?${queryString}` : ''}`;
  throw redirect(308, destination);
};
