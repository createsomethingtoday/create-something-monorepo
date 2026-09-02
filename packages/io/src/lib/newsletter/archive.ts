export interface NewsletterEdition {
  slug: string;
  title: string;
  description: string;
  deliveryTarget: string;
  webPublishAt: string;
  webStatus: 'draft' | 'published';
  hero: string | null;
  markdown: string;
  readingMinutes: number;
}

type Frontmatter = Record<string, string>;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function splitFrontmatter(raw: string): { frontmatter: Frontmatter; markdown: string } {
  const normalized = raw.replace(/\r\n/g, '\n').trimStart();
  if (!normalized.startsWith('---\n')) {
    throw new Error('Newsletter source is missing YAML frontmatter');
  }

  const closingIndex = normalized.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    throw new Error('Newsletter source has unterminated YAML frontmatter');
  }

  const frontmatter: Frontmatter = {};
  for (const line of normalized.slice(4, closingIndex).split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) continue;
    frontmatter[line.slice(0, separatorIndex).trim()] = unquote(line.slice(separatorIndex + 1));
  }

  return {
    frontmatter,
    markdown: normalized.slice(closingIndex + 5).trim()
  };
}

function requireField(frontmatter: Frontmatter, field: string, slug: string): string {
  const value = frontmatter[field]?.trim();
  if (!value) throw new Error(`Newsletter ${slug} is missing ${field}`);
  return value;
}

function countReadingMinutes(markdown: string): number {
  const wordCount = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}'’-]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 220));
}

export function parseNewsletterEdition(slug: string, raw: string): NewsletterEdition {
  const { frontmatter, markdown: completeMarkdown } = splitFrontmatter(raw);
  const publicEndBefore = frontmatter.public_end_before;
  const markerIndex = publicEndBefore ? completeMarkdown.indexOf(publicEndBefore) : -1;
  let markdown = (
    markerIndex >= 0 ? completeMarkdown.slice(0, markerIndex) : completeMarkdown
  ).trim();
  const webStatus = frontmatter.web_status ?? 'draft';
  const title = requireField(frontmatter, 'title', slug);
  const hero = frontmatter.hero || null;
  const lines = markdown.split('\n');
  if (lines[0]?.trim() === `# ${title}`) {
    lines.shift();
    while (lines[0]?.trim() === '') lines.shift();
  }
  if (hero && lines[0]?.trim().startsWith('![') && lines[0].includes(`](${hero})`)) {
    lines.shift();
    while (lines[0]?.trim() === '') lines.shift();
  }
  markdown = lines.join('\n').trim();

  if (webStatus !== 'draft' && webStatus !== 'published') {
    throw new Error(`Newsletter ${slug} has invalid web_status: ${webStatus}`);
  }

  return {
    slug,
    title,
    description: requireField(frontmatter, 'preview', slug),
    deliveryTarget: requireField(frontmatter, 'delivery_target', slug),
    webPublishAt: requireField(frontmatter, 'web_publish_at', slug),
    webStatus,
    hero,
    markdown,
    readingMinutes: countReadingMinutes(markdown)
  };
}

export function getPublishedNewsletterEditions(
  editions: NewsletterEdition[],
  now = new Date()
): NewsletterEdition[] {
  return editions
    .filter((edition) => {
      if (edition.webStatus !== 'published') return false;
      const releaseTime = new Date(edition.webPublishAt).getTime();
      return Number.isFinite(releaseTime) && releaseTime <= now.getTime();
    })
    .sort((a, b) => new Date(b.deliveryTarget).getTime() - new Date(a.deliveryTarget).getTime());
}
