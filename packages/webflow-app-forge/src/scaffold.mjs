// `wf-forge new <dir> --name "Product Name"`: copy the compliant template and
// fill the placeholders. The template is a superset of the official Webflow
// CLI `react` scaffold with the review rules baked in; see template/README.md.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_DIR = join(here, '..', 'template');

export function validateAppName(name) {
  const problems = [];
  const trimmed = String(name || '').trim();
  if (!trimmed) problems.push('App name is required (--name "Product Name").');
  if (trimmed.length > 30) problems.push(`App name is ${trimmed.length} characters; the listing allows 30.`);
  if (/webflow/i.test(trimmed)) problems.push('App name must not use the Webflow mark.');
  if (/^(my|test|untitled|sample|demo)\b/i.test(trimmed)) problems.push(`"${trimmed}" reads as a placeholder; reviewers return scaffold-default names.`);
  return problems;
}

export function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'designer-extension';
}

export function scaffold({ targetDir, appName, force = false }) {
  const problems = validateAppName(appName);
  if (problems.length) throw new Error(problems.join('\n'));
  const target = resolve(targetDir);
  if (existsSync(target) && readdirSync(target).length > 0 && !force) {
    throw new Error(`${target} is not empty. Pass --force to write into it anyway.`);
  }
  mkdirSync(target, { recursive: true });
  cpSync(TEMPLATE_DIR, target, { recursive: true });

  const slug = slugify(appName);
  const replacements = [
    [/__APP_NAME__/g, appName.trim()],
    [/__APP_SLUG__/g, slug],
  ];
  const written = [];
  walk(target, (file) => {
    if (/\.(json|mjs|ts|tsx|html|css|md|gitignore)$/.test(file) || file.endsWith('.gitignore')) {
      let text = readFileSync(file, 'utf8');
      const before = text;
      for (const [re, value] of replacements) text = text.replace(re, value);
      if (text !== before) {
        writeFileSync(file, text);
        written.push(file.slice(target.length + 1));
      }
    }
  });
  return { target, slug, filled: written };
}

function walk(dir, visit) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      walk(full, visit);
    } else visit(full);
  }
}
