export interface ReadingHeading {
  label: string;
  id?: string;
}

export interface ReadingChapter {
  label: string;
  id: string;
}

export function buildReadingChapters(headings: ReadingHeading[]): ReadingChapter[] {
  const claimed = new Set<string>();

  return headings.map((heading) => {
    const base = heading.id?.trim() || slugify(heading.label) || 'chapter';
    let id = base;
    let suffix = 2;

    while (claimed.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }

    claimed.add(id);
    return { label: heading.label.trim(), id };
  });
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
