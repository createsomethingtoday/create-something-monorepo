// Provider text is data. Only these authored elements can become markup; links,
// HTML, images and action-like syntax stay inert. Code is never reparsed as prose.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(text, depth = 0) {
  if (depth > 3) return escape(text);
  const pattern = /`([^`\n]+)`|\*\*([^\n]+?)\*\*|__([^\n]+?)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
  let out = '', end = 0;
  for (const match of text.matchAll(pattern)) {
    out += escape(text.slice(end, match.index));
    out += match[1] !== undefined ? `<code>${escape(match[1])}</code>` : match[2] !== undefined || match[3] !== undefined ? `<strong>${inline(match[2] ?? match[3], depth + 1)}</strong>` : `<em>${inline(match[4] ?? match[5], depth + 1)}</em>`;
    end = match.index + match[0].length;
  }
  return out + escape(text.slice(end));
}
const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
const separator = line => line.includes('|') && cells(line).every(cell => /^:?-{3,}:?$/.test(cell));
export function renderAnswer(value) {
  const lines = String(value ?? '').slice(0, 100000).replace(/\r\n?/g, '\n').split('\n');
  const output = []; let group = []; let kind = ''; let start = 1;
  const flush = () => {
    if (!group.length) return;
    output.push(kind === 'ul' || kind === 'ol' ? `<${kind}${kind === 'ol' && start !== 1 ? ` start="${start}"` : ''}>${group.map(line => `<li>${inline(line)}</li>`).join('')}</${kind}>` : kind === 'quote' ? `<blockquote><p>${group.map(inlineText => inline(inlineText)).join('<br>')}</p></blockquote>` : `<p>${group.map(inlineText => inline(inlineText)).join('<br>')}</p>`);
    group = []; kind = ''; start = 1;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})([^`]*)$/);
    if (fence) {
      flush(); const code = []; const marker = fence[1][0]; const length = fence[1].length;
      while (++i < lines.length) { if (new RegExp(`^\\s{0,3}${marker}{${length},}\\s*$`).test(lines[i])) break; code.push(lines[i]); }
      output.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`); continue;
    }
    if (line.includes('|') && i + 1 < lines.length && separator(lines[i + 1])) {
      const headers = cells(line); const delimiters = cells(lines[i + 1]);
      if (headers.length >= 2 && headers.length <= 12 && headers.length === delimiters.length) {
        flush(); const rows = []; i++;
        while (i + 1 < lines.length && lines[i + 1].trim() && lines[i + 1].includes('|') && rows.length < 100) { rows.push(cells(lines[++i])); }
        output.push(`<div class="chat-table-scroll" tabindex="0" role="region" aria-label="Response table"><table><thead><tr>${headers.map(cell => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, index) => `<td>${inline(row[index] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
      }
    }
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(/^\s{0,3}#{1,3}\s+(.{1,300})$/);
    if (heading) { flush(); output.push(`<h3>${inline(heading[1])}</h3>`); continue; }
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/); const ordered = line.match(/^\s*(\d{1,3})[.)]\s+(.+)$/); const quote = line.match(/^\s{0,3}>\s?(.*)$/);
    const next = unordered ? 'ul' : ordered ? 'ol' : quote ? 'quote' : 'p';
    if (kind !== next) flush(); kind = next;
    if (ordered && !group.length) start = Number(ordered[1]);
    group.push(unordered?.[1] ?? ordered?.[2] ?? quote?.[1] ?? line);
  }
  flush(); return output.join('');
}
