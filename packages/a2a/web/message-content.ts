export type MessagePart = { text: string; href?: string };

// Deliberately conservative prose links. Never interpret HTML, Markdown or receipt fields.
// Leave stripped sentence punctuation as text; retain balanced path parentheses.
export function messageParts(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const openings: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  let cursor = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"`]+/giu)) {
    const start = match.index;
    if (start > 0 && !/[\s([{"'<`]/u.test(text[start - 1])) continue;
    let candidate = match[0];
    const counts: Record<string, number> = { '(': 0, ')': 0, '[': 0, ']': 0, '{': 0, '}': 0, '?': 0 };
    for (const character of candidate) {
      if (character in counts) counts[character]++;
    }
    let end = candidate.length;
    while (end) {
      const last = candidate[end - 1];
      const opening = openings[last];
      if (
        (last === "'" && text[start - 1] === "'") ||
        /[.,:!?]/u.test(last) ||
        (last === ';' && counts['?'] === 0) ||
        (opening && counts[last] > counts[opening])
      ) {
        if (last in counts) counts[last]--;
        end--;
      } else break;
    }
    candidate = candidate.slice(0, end);
    if (
      !candidate ||
      /[\\\u0000-\u001f\u007f\p{Cf}]/u.test(candidate) ||
      text[start + match[0].length] === '\t'
    )
      continue;
    try {
      const url = new URL(candidate);
      const authority = candidate.slice(candidate.indexOf('://') + 3).split(/[/?#]/u)[0];
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !url.hostname ||
        !authority ||
        url.username ||
        url.password ||
        /[@%]/u.test(authority)
      )
        continue;
      if (start > cursor) parts.push({ text: text.slice(cursor, start) });
      parts.push({ text: candidate, href: url.href });
      cursor = start + candidate.length;
    } catch {
      /* Invalid candidates remain unchanged literal text. */
    }
  }
  if (cursor < text.length || !parts.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

export function messagePreview(text: string): string | null {
  if (text.length <= 900 && text.split(/\r\n|\r|\n/u).length <= 12) return null;
  let prefix = Array.from(text).slice(0, 120).join('');
  const breaks = [...prefix.matchAll(/\r\n|\r|\n/gu)];
  if (breaks[2]) prefix = prefix.slice(0, breaks[2].index);
  else {
    const lastBreak = breaks.at(-1)?.index;
    const lastWord = prefix.search(/\s+\S*$/u);
    if (lastBreak !== undefined && lastBreak >= 80) prefix = prefix.slice(0, lastBreak);
    else if (lastWord >= 80) prefix = prefix.slice(0, lastWord);
  }
  return prefix.trimEnd();
}

// An attributed literal quotation only: never a verified outcome or request association.
// Ambiguous repeated fields fall back to the ordinary first-text preview.
export function messageResultExcerpt(text: string, kind: string): string | null {
  if (kind === 'request' || messagePreview(text) === null) return null;
  const lines = text.split(/\r\n|\r|\n/u).filter((line) => line.startsWith('Result:'));
  if (lines.length !== 1 || !lines[0].slice('Result:'.length).trim()) return null;
  const points = Array.from(lines[0]);
  if (points.length <= 120) return lines[0];
  let excerpt = points.slice(0, 120).join('');
  const lastWord = excerpt.search(/\s+\S*$/u);
  if (lastWord >= 80 && !/\s/u.test(points[120])) excerpt = excerpt.slice(0, lastWord);
  return excerpt.trimEnd() + '…';
}
