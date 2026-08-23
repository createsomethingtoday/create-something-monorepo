import { describe, expect, it } from 'vitest';

import { buildLtdSitemapPaths } from './sitemap';

describe('ltd sitemap catalog', () => {
  it('derives indexable detail routes from their owning content sources', () => {
    const paths = buildLtdSitemapPaths({
      canonPaths: [[], ['concepts', 'conviction-without-dependence']],
      patternSlugs: ['crystallization', 'universal-utility'],
      masterSlugs: ['dieter-rams']
    });

    expect(paths).toContain('/patterns/crystallization');
    expect(paths).toContain('/patterns/universal-utility');
    expect(paths).toContain('/masters/dieter-rams');
    expect(paths).toContain('/canon/concepts/conviction-without-dependence');
    expect(paths).toContain('/playbooks');
    expect(paths).toContain('/playbooks/inbound-triage');
    expect(paths).toContain('/playbooks/decision-brief');
    expect(paths).toContain('/playbooks/exception-handoff');
    expect(paths).toContain('/playbooks/solo-control-tower');
    expect(paths).toContain('/readiness');
    expect(paths).not.toContain('/privacy');
    expect(paths).not.toContain('/terms');
  });
});
