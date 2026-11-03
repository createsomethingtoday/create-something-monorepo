// Checked-in sources are import candidates. Importing never grants send approval.
const candidate = '2026-09-08-test-the-checker';
const files = import.meta.glob('/content/newsletters/*/{newsletter.md,email-template.html,email.txt}', {
  eager: true, query: '?raw', import: 'default'
}) as Record<string, string>;

export function getNewsletterSource(slug: string) {
  if (slug !== candidate) throw new Error('This edition has no current import candidate. Prepare a new reviewed revision.');
  const root = `/content/newsletters/${slug}/`;
  const source = files[`${root}newsletter.md`];
  const html = files[`${root}email-template.html`];
  const text = files[`${root}email.txt`];
  if (!source || !html || !text) throw new Error('Edition source is incomplete');
  const field = (key: string) => source.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm'))?.[1];
  return {
    slug, title: field('title') || 'Test the checker before trusting the result',
    subject: field('subject') || 'Test the checker before trusting the result',
    owner: field('owner') || 'Micah Johnson', author: field('author') || 'CREATE SOMETHING',
    source_refs: [
      `packages/io/content/newsletters/${slug}/research-notes.md`,
      `packages/io/content/newsletters/${slug}/candidate-receipt-2026-11-03.md`,
      'https://github.com/createsomethingtoday/create-something-monorepo/blob/ground-v0.4.1/docs/guides/GROUND_SEEDED_TRIAL.md'
    ], html, text
  };
}
