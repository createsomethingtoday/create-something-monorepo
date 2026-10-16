import { describe, expect, it, vi } from 'vitest';
import { getFileBasedPapers } from '../src/lib/config/fileBasedPapers';
import { getPublishedPaperSlugs } from '../src/lib/config/paperCatalog';
const environment = vi.hoisted(() => ({ dev: false }));
vi.mock('$app/environment', () => environment);
import { load } from '../src/routes/papers/[slug]/+page.server';

const request = { params: { slug: 'selective-context' } } as Parameters<typeof load>[0];
describe('local research draft boundary', () => {
  it('does not advertise the draft in published collections', () => {
    expect(getFileBasedPapers().some(p => p.slug === 'selective-context')).toBe(false);
    expect(getPublishedPaperSlugs().has('selective-context')).toBe(false);
  });
  it('returns 404 outside local development', async () => {
    environment.dev = false;
    await expect(load(request)).rejects.toMatchObject({ status: 404 });
  });
  it('renders the local draft with unpublished metadata', async () => {
    environment.dev = true;
    const result = await load(request);
    expect(result?.paper.published).toBe(0);
    expect(result?.paper.content).toContain('Local research draft.');
    environment.dev = false;
  });
});
