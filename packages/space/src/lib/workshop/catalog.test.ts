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
