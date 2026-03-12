import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolve_service_config, validate_dispatch_config } from '../src/config.js';
import { SymphonyError } from '../src/errors.js';
import { render_prompt_template } from '../src/template.js';
import { load_workflow_definition } from '../src/workflow.js';

describe('workflow/config/template', () => {
  it('loads WORKFLOW.md with YAML front matter and prompt body', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'symphony-workflow-'));
    await writeFile(
      join(dir, 'WORKFLOW.md'),
      `---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: repo
---

Hello {{ issue.identifier }}
`
    );

    const workflow = await load_workflow_definition(undefined, dir);
    expect(workflow.config).toMatchObject({
      tracker: {
        kind: 'linear',
        api_key: '$LINEAR_API_KEY',
      },
    });
    expect(workflow.prompt_template).toBe('Hello {{ issue.identifier }}');
  });

  it('rejects missing workflow files with a typed error', async () => {
    await expect(load_workflow_definition(undefined, await mkdtemp(join(tmpdir(), 'symphony-missing-')))).rejects.toMatchObject({
      code: 'missing_workflow_file',
    });
  });

  it('rejects non-map front matter', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'symphony-frontmatter-'));
    await writeFile(join(dir, 'WORKFLOW.md'), `---\n- nope\n---\nBody`);

    await expect(load_workflow_definition(undefined, dir)).rejects.toMatchObject({
      code: 'workflow_front_matter_not_a_map',
    });
  });

  it('resolves config from workflow and validates tracker.kind strictly', async () => {
    const workflow = {
      path: '/tmp/WORKFLOW.md',
      config: {
        tracker: {
          kind: 'linear',
          api_key: '$LINEAR_API_KEY',
          project_slug: 'repo',
        },
      },
      prompt_template: 'Prompt',
    };

    const config = resolve_service_config(workflow, '/tmp', { LINEAR_API_KEY: 'token-123' });
    expect(config.tracker.api_key).toBe('token-123');
    expect(config.tracker.kind).toBe('linear');
    expect(() => validate_dispatch_config(config)).not.toThrow();

    const bad = resolve_service_config(
      {
        ...workflow,
        config: {
          tracker: {
            kind: 'jira',
            api_key: 'x',
            project_slug: 'repo',
          },
        },
      },
      '/tmp',
      {}
    );

    expect(() => validate_dispatch_config(bad)).toThrowError(SymphonyError);
    expect(() => validate_dispatch_config(bad)).toThrow(/Unsupported tracker kind/);
  });

  it('treats explicitly unresolved tracker api_key env vars as missing', () => {
    const workflow = {
      path: '/tmp/WORKFLOW.md',
      config: {
        tracker: {
          kind: 'linear',
          api_key: '$CUSTOM_LINEAR_KEY',
          project_slug: 'repo',
        },
      },
      prompt_template: 'Prompt',
    };

    const config = resolve_service_config(workflow, '/tmp', { LINEAR_API_KEY: 'fallback-token' });
    expect(config.tracker.api_key).toBe('');
    expect(() => validate_dispatch_config(config)).toThrowError(/Missing tracker API key/);
  });

  it('renders strict prompt templates', async () => {
    const rendered = await render_prompt_template('Issue {{ issue.identifier }} / {{ attempt | default: "first" }}', {
      issue: {
        id: '1',
        identifier: 'ABC-1',
        title: 'Demo',
        description: null,
        priority: 1,
        state: 'Todo',
        branch_name: null,
        url: null,
        labels: ['a'],
        blocked_by: [],
        created_at: null,
        updated_at: null,
      },
      attempt: null,
    });

    expect(rendered).toContain('ABC-1');

    await expect(
      render_prompt_template('Bad {{ issue.unknown_field }}', {
        issue: {
          id: '1',
          identifier: 'ABC-1',
          title: 'Demo',
          description: null,
          priority: 1,
          state: 'Todo',
          branch_name: null,
          url: null,
          labels: [],
          blocked_by: [],
          created_at: null,
          updated_at: null,
        },
        attempt: null,
      })
    ).rejects.toMatchObject({
      code: 'template_render_error',
    });
  });
});
