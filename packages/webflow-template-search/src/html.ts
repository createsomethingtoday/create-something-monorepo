const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITY_MAP[match] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract an explicitly labelled authored list, without inferring capabilities. */
export function extractDescriptionList(html: string, label: 'pages' | 'features'): string[] {
  const heading = label === 'pages' ? /(?:included\s+pages|pages\s+included|page\s+list)\s*[:<]/i : /(?:included\s+features|key\s+features|features)\s*[:<]/i;
  const start = html.search(heading);
  if (start < 0) return [];
  const section = html.slice(start, start + 12000);
  const list = section.match(/<(?:ul|ol)\b[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i);
  if (!list || /<h[1-6]\b/i.test(section.slice(0, list.index))) return [];
  return Array.from(list[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi), match => stripHtml(match[1])).filter(Boolean).slice(0, 40);
}
