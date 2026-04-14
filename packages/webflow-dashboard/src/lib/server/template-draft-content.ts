type TemplateContentInput = {
  descriptionLong?: string;
  notes?: string;
  category?: string;
  tags?: string[];
  styleTags?: string[];
  siteTypes?: string[];
  featureFlags?: string[];
  publishedUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toParagraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export function buildTemplateDraftSummary(input: TemplateContentInput): string {
  return [
    input.category ? `Category: ${input.category}` : '',
    input.tags && input.tags.length > 0 ? `Tags: ${input.tags.join(', ')}` : '',
    input.siteTypes && input.siteTypes.length > 0 ? `Site types: ${input.siteTypes.join(', ')}` : '',
    input.featureFlags && input.featureFlags.length > 0
      ? `Features: ${input.featureFlags.join(', ')}`
      : '',
    input.notes ? `Notes: ${input.notes}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildTemplateDraftHtml(input: TemplateContentInput): string {
  const tags = input.tags || [];
  const styleTags = input.styleTags || [];
  const siteTypes = input.siteTypes || [];
  const featureFlags = input.featureFlags || [];

  return [
    input.descriptionLong
      ? `<h2>Draft notes</h2>${toParagraphs(input.descriptionLong)}`
      : '',
    input.notes ? `<h3>Internal notes</h3>${toParagraphs(input.notes)}` : '',
    '<h3>Metadata</h3>',
    '<ul>',
    input.category ? `<li>Category: ${escapeHtml(input.category)}</li>` : '',
    tags.length > 0 ? `<li>Tags: ${escapeHtml(tags.join(', '))}</li>` : '',
    styleTags.length > 0 ? `<li>Style tags: ${escapeHtml(styleTags.join(', '))}</li>` : '',
    siteTypes.length > 0 ? `<li>Site types: ${escapeHtml(siteTypes.join(', '))}</li>` : '',
    featureFlags.length > 0
      ? `<li>Feature flags: ${escapeHtml(featureFlags.join(', '))}</li>`
      : '',
    input.publishedUrl ? `<li>Published URL: ${escapeHtml(input.publishedUrl)}</li>` : '',
    '</ul>'
  ]
    .filter(Boolean)
    .join('');
}
