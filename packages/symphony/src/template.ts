import { Liquid } from 'liquidjs';
import { SymphonyError } from './errors.js';
import type { Issue } from './types.js';

const engine = new Liquid({
  strictFilters: true,
  strictVariables: true,
});

function toTemplateIssue(issue: Issue): Record<string, unknown> {
  return {
    ...issue,
  };
}

export async function render_prompt_template(
  prompt_template: string,
  input: { issue: Issue; attempt: number | null }
): Promise<string> {
  const source = prompt_template.trim() === '' ? 'You are working on an issue from Linear.' : prompt_template;

  let parsed;
  try {
    parsed = engine.parse(source);
  } catch (error) {
    throw new SymphonyError('template_parse_error', `Failed to parse workflow template: ${(error as Error).message}`, {
      cause: error,
    });
  }

  try {
    const rendered = await engine.render(parsed, {
      issue: toTemplateIssue(input.issue),
      attempt: input.attempt,
    });
    return rendered.trim();
  } catch (error) {
    throw new SymphonyError(
      'template_render_error',
      `Failed to render workflow template: ${(error as Error).message}`,
      { cause: error }
    );
  }
}
