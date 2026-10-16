import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFileBasedPaper, getFileBasedPapers } from '../src/lib/config/fileBasedPapers';
import { getPublishedPaperSlugs } from '../src/lib/config/paperCatalog';
const environment = vi.hoisted(() => ({ dev: false }));
vi.mock('$app/environment', () => environment);
import { load } from '../src/routes/papers/[slug]/+page.server';

const request = { params: { slug: 'selective-context' } } as Parameters<typeof load>[0];
const paper = getFileBasedPaper('selective-context')!;
afterEach(() => { delete paper.publication_status; environment.dev = false; });
describe('research publication boundary', () => {
  it('serves and lists the approved article in production', async () => {
    expect(getFileBasedPapers().some(p => p.slug === 'selective-context')).toBe(true);
    expect(getPublishedPaperSlugs().has('selective-context')).toBe(true);
    const result = await load(request);
    expect(result?.paper.published).toBe(1);
    expect(result?.paper.content).not.toContain('Local research draft.');
    expect(result?.paper.content).toContain('19 / 20');
  });
  it('excludes a draft fixture from production routes and collections', async () => {
    paper.publication_status = 'draft';
    expect(getFileBasedPapers().some(p => p.slug === paper.slug)).toBe(false);
    expect(getPublishedPaperSlugs().has(paper.slug)).toBe(false);
    await expect(load(request)).rejects.toMatchObject({ status: 404 });
  });
  it('allows development rendering of a draft fixture with unpublished metadata', async () => {
    paper.publication_status = 'draft';
    environment.dev = true;
    expect((await load(request))?.paper.published).toBe(0);
  });
});
