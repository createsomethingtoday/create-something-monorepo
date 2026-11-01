/**
 * Minimal, lossless MDX sectioner for the Marketplace docs pages.
 *
 * A page is split into: frontmatter (raw) + ordered sections. A section starts
 * at a heading line (## … #####) that sits outside code fences and outside any
 * capitalised JSX block component (<Tabs>, <Accordion>, <Note> …). Everything
 * else is kept verbatim so `serialize(parse(text)) === text` for every page.
 *
 * The same module is inlined into the browser app (see build.mjs), so keep it
 * dependency-free and ES2020.
 */

export const HEADING_RE = /^(#{2,5})\s+(.*)$/;
const FENCE_RE = /^\s*(```|~~~)/;
const OPEN_TAG_RE = /<([A-Z][A-Za-z]*)(?:\s[^<>]*?)?(?<!\/)>/g;
const CLOSE_TAG_RE = /<\/([A-Z][A-Za-z]*)\s*>/g;
const SELF_CLOSE_RE = /<([A-Z][A-Za-z]*)(?:\s[^<>]*?)?\/>/g;

export function slugify(text) {
  return String(text)
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Count how many capitalised JSX block components a line opens minus closes. */
export function jsxDepthDelta(line) {
  let delta = 0;
  const noSelf = line.replace(SELF_CLOSE_RE, '');
  for (const _ of noSelf.matchAll(OPEN_TAG_RE)) delta += 1;
  for (const _ of noSelf.matchAll(CLOSE_TAG_RE)) delta -= 1;
  return delta;
}

export function splitFrontmatter(text) {
  if (!text.startsWith('---')) return { frontmatter: '', body: text };
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      const fmLines = lines.slice(0, i + 1);
      const frontmatter = fmLines.join('\n') + '\n';
      return { frontmatter, body: text.slice(frontmatter.length) };
    }
  }
  return { frontmatter: '', body: text };
}

export function parseFrontmatterFields(frontmatter) {
  const fields = {};
  for (const line of frontmatter.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_:-]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    fields[m[1]] = v;
  }
  return fields;
}

/**
 * @param {string} text full MDX file
 * @param {string} pageSlug used to namespace section ids
 */
export function parsePage(text, pageSlug) {
  const { frontmatter, body } = splitFrontmatter(text);
  const lines = body.split('\n');
  const sections = [];
  let current = { level: 0, heading: null, lines: [] };
  let inFence = false;
  let fenceMarker = null;
  let depth = 0;
  for (const line of lines) {
    const fence = line.match(FENCE_RE);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (fence[1] === fenceMarker) {
        inFence = false;
        fenceMarker = null;
      }
      current.lines.push(line);
      continue;
    }
    if (!inFence) {
      const h = depth === 0 ? line.match(HEADING_RE) : null;
      if (h) {
        sections.push(current);
        current = { level: h[1].length, heading: h[2].trim(), lines: [line] };
        continue;
      }
      depth = Math.max(0, depth + jsxDepthDelta(line));
    }
    current.lines.push(line);
  }
  sections.push(current);

  const seen = new Map();
  const out = sections
    .map((s, i) => {
      let base = s.heading == null ? '_intro' : slugify(s.heading) || `section-${i}`;
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      const id = `${pageSlug}/${n > 1 ? `${base}-${n}` : base}`;
      const section = { id, level: s.level, heading: s.heading, raw: s.lines.join('\n') };
      // A page whose body starts directly with a heading has a zero-line preamble;
      // it must not contribute a separator when serialised.
      if (i === 0 && s.lines.length === 0) section.empty = true;
      return section;
    });
  return { frontmatter, fields: parseFrontmatterFields(frontmatter), sections: out };
}

export function serializePage(page) {
  const parts = page.sections.filter((s) => !(s.empty && s.raw === ''));
  return page.frontmatter + parts.map((s) => s.raw).join('\n');
}

/** Top-level numbered rules and bullets inside a section (outside fences / JSX). */
export function extractRules(raw) {
  const rules = [];
  let inFence = false;
  let depth = 0;
  for (const line of raw.split('\n')) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (depth === 0) {
      const m = line.match(/^(\d+)\.\s+(.*)$/) || line.match(/^[-*]\s+(.*)$/);
      if (m) {
        const text = m.length === 3 ? m[2] : m[1];
        rules.push({ n: m.length === 3 ? Number(m[1]) : null, text: text.trim() });
      }
    }
    depth = Math.max(0, depth + jsxDepthDelta(line));
  }
  return rules;
}
