import { describe, expect, it } from 'vitest';
import { filterProjects, projects, workbenchTools } from './catalog';
import { getSpaceSitemapPaths } from '../search/sitemap';

describe('public workshop discovery', () => {
  it('finds a useful project by task and combines type filters', () => {
    expect(filterProjects('verification').map((p) => p.slug)).toContain('ground');
    expect(filterProjects('workflow', 'Building block').map((p) => p.slug)).toContain(
      'workflow-runtime'
    );
    expect(filterProjects('', 'Skill')).toHaveLength(6);
    expect(filterProjects('no-such-project-958')).toEqual([]);
  });
  it('publishes unique, complete entries with resolvable relationships', () => {
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length);
    for (const project of projects) {
      expect(project.source).toMatch(/^https:\/\/github.com\/createsomethingtoday\//);
      expect(project.usage.length).toBeGreaterThan(20);
      expect(project.limit.length).toBeGreaterThan(20);
      expect(project.source).not.toMatch(/clients\/|internal\/|halfdozen/);
      for (const slug of project.related) expect(projects.some((p) => p.slug === slug)).toBe(true);
    }
  });
  it('keeps old tools discoverable and adds all project detail pages to the sitemap', () => {
    const paths = getSpaceSitemapPaths();
    for (const tool of workbenchTools) expect(paths).toContain(tool.href);
    expect(paths).toContain('/workbench');
    expect(paths).toContain('/projects');
    for (const project of projects) expect(paths).toContain(`/projects/${project.slug}`);
    expect(paths).toContain('/data/nba/clutch');
  });
});

describe('workshop palette endpoint', () => {
  it('finds retained tools and catalog entries without a remote index', async () => {
    const { POST } = await import('../../routes/api/workshop/search/+server');
    for (const [query, path] of [
      ['Motion', '/motion'],
      ['Ground', '/projects/ground']
    ]) {
      const response = await POST({
        request: new Request('https://createsomething.space/api/workshop/search', {
          method: 'POST',
          body: JSON.stringify({ query })
        })
      } as Parameters<typeof POST>[0]);
      const body = await response.json();
      expect(body.results.some((item: { path: string }) => item.path === path)).toBe(true);
      expect(body.results.every((item: { url: string }) => item.url.startsWith('/'))).toBe(true);
    }
  });
  it('rejects malformed input and returns an empty result for an unknown query', async () => {
    const { POST } = await import('../../routes/api/workshop/search/+server');
    const request = (body: string) =>
      ({
        request: new Request('https://createsomething.space/api/workshop/search', {
          method: 'POST',
          body
        })
      }) as Parameters<typeof POST>[0];
    expect((await POST(request('{'))).status).toBe(400);
    expect((await POST(request('{"query":42}'))).status).toBe(400);
    expect((await (await POST(request('{"query":"zz-unlisted-958"}'))).json()).results).toEqual([]);
  });
});
