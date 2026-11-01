// Keep observed rows intact. The request builder owns the hard UTF-8 byte cap;
// these limits split ordinary passages without silently clipping a long row.
const maxLines = 12;
const maxCharacters = 1600;
const isHeading = (line) => /^#{1,3} /.test(line);
const isRow = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const cells = (line) => line.trim().slice(1, -1).split(/(?<!\\)\|/).map((cell) => cell.trim());

function tableAt(lines, index) {
  if (!isRow(lines[index]) || !isRow(lines[index + 1] ?? '')) return false;
  const separator = cells(lines[index + 1]);
  return separator.length === cells(lines[index]).length && separator.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function wikiPassages(text, fallbackHeading) {
  const lines = text.split('\n');
  const passages = [];
  let heading = fallbackHeading;
  for (let start = 0; start < lines.length;) {
    if (isHeading(lines[start])) heading = lines[start].replace(/^#+ /, '');
    if (tableAt(lines, start)) {
      const header = [start, start + 1];
      let end = start + 2;
      while (end < lines.length && isRow(lines[end])) end++;
      const approvalColumn = cells(lines[start]).findIndex((cell) => /^approval required$/i.test(cell));
      const groups = new Map();
      for (let row = start + 2; row < end; row++) {
        const value = approvalColumn < 0 ? null : (cells(lines[row])[approvalColumn] ?? '');
        if (!groups.has(value)) groups.set(value, []);
        groups.get(value).push(row);
      }
      for (const [value, rows] of groups) {
        let chunk = [];
        const emit = () => {
          if (!chunk.length) return;
          const sourceLines = [...header, ...chunk].map((index) => index + 1);
          passages.push({
            line: chunk[0] + 1,
            heading,
            excerpt: sourceLines.map((line) => lines[line - 1]).join('\n'),
            sourceLines,
            ...(approvalColumn < 0 ? {} : { tableGroup: { column: cells(lines[start])[approvalColumn], value } }),
          });
        };
        for (const row of rows) {
          const next = [...header, ...chunk, row];
          if (chunk.length && (next.length > maxLines || next.map((index) => lines[index]).join('\n').length > maxCharacters)) {
            emit();
            chunk = [];
          }
          chunk.push(row);
        }
        emit();
      }
      start = end;
      continue;
    }
    let end = start + 1;
    while (end < lines.length && !isHeading(lines[end]) && !tableAt(lines, end) && end - start < maxLines && lines.slice(start, end + 1).join('\n').length <= maxCharacters) end++;
    const excerpt = lines.slice(start, end).join('\n');
    if (excerpt.trim()) passages.push({ line: start + 1, heading, excerpt, sourceLines: Array.from({ length: end - start }, (_, index) => start + index + 1) });
    start = end;
  }
  return passages;
}
