import fs from 'node:fs';
import path from 'node:path';

// The generator emits inline file links. Check them before writing, including
// sibling pages that are about to be generated. Remote URLs are not probed.
export function checkLocalLinks(directory, pages) {
  const generated = new Set([...pages.keys()].map((name) => path.resolve(directory, name)));
  const errors = [];
  for (const [name, content] of pages) {
    content.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(/\]\(([^)]+)\)/g)) {
        const target = match[1];
        if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target)) continue;
        let file;
        try { file = decodeURIComponent(target.split('#')[0]); }
        catch { errors.push(`${name}:${index + 1}: ${target}`); continue; }
        const resolved = path.resolve(directory, path.dirname(name), file);
        if (!generated.has(resolved) && !fs.existsSync(resolved)) errors.push(`${name}:${index + 1}: ${target}`);
      }
    });
  }
  return errors;
}

export function sourceTimestamp(artifact) {
  const value = artifact.generatedAt ?? artifact.coverage?.generatedAt ?? artifact.updatedAt;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error('Wiki source is missing a valid snapshot timestamp');
  }
  return value;
}
