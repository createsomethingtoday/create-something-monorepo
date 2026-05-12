export type PropertyArtifactTag = string | { name?: string | null; slug?: string | null };

export type PropertyArtifact = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  excerpt?: string | null;
  excerpt_short?: string | null;
  excerpt_long?: string | null;
  category?: string | null;
  readingTime?: number | null;
  reading_time?: number | null;
  reading_time_minutes?: number | null;
  difficulty?: string | null;
  difficulty_level?: string | null;
  keywords?: string[] | null;
  tags?: PropertyArtifactTag[] | null;
  technical_focus?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  date?: string | null;
  featured?: boolean | number | null;
  interactive_demo_url?: string | null;
  is_file_based?: boolean | null;
};

export type PropertyArtifactKind = 'paper' | 'experiment' | 'artifact';

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getArtifactSlug(artifact: PropertyArtifact): string {
  return clean(artifact.slug);
}

export function getArtifactTitle(artifact: PropertyArtifact): string {
  return clean(artifact.title) || 'Untitled artifact';
}

export function getArtifactDescription(artifact: PropertyArtifact): string {
  return (
    clean(artifact.description) ||
    clean(artifact.subtitle) ||
    clean(artifact.excerpt_long) ||
    clean(artifact.excerpt) ||
    clean(artifact.excerpt_short)
  );
}

export function getArtifactCategory(artifact: PropertyArtifact, fallback = 'Artifact'): string {
  return clean(artifact.category) || fallback;
}

export function getArtifactReadingTime(artifact: PropertyArtifact): number | null {
  const value = artifact.readingTime ?? artifact.reading_time ?? artifact.reading_time_minutes;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getArtifactDifficulty(artifact: PropertyArtifact): string {
  return clean(artifact.difficulty) || clean(artifact.difficulty_level);
}

export function getArtifactDate(artifact: PropertyArtifact): string {
  const raw = clean(artifact.published_at) || clean(artifact.created_at) || clean(artifact.date);
  if (!raw) return '';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getArtifactTags(artifact: PropertyArtifact, limit = 4): string[] {
  const keywordTags = Array.isArray(artifact.keywords) ? artifact.keywords : [];
  const relationTags = Array.isArray(artifact.tags)
    ? artifact.tags.map((tag) => (typeof tag === 'string' ? tag : clean(tag.name))).filter(Boolean)
    : [];
  const technicalTags = clean(artifact.technical_focus)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...keywordTags, ...relationTags, ...technicalTags]
    .filter((tag, index, list) => tag && list.indexOf(tag) === index)
    .slice(0, limit);
}

export function getArtifactHref(artifact: PropertyArtifact, basePath: string): string {
  const slug = getArtifactSlug(artifact);
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return slug ? `${normalizedBase}/${slug}` : normalizedBase || '/';
}
