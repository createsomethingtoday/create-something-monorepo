#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_DIR = join(ROOT, 'site');

const requiredFiles = [
  'site/index.html',
  'site/insights.html',
  'site/resiliency-reports.html',
  'site/newsroom.html',
  'site/resource-library.html',
  'site/cato-research.html',
  'site/data/insights-cms.json',
  'site/scripts/render-insights-cms.mjs',
  'site/css/cato-supply-d7e71b67b38f3b9d81c65760356.webflow.css',
];

function listHtmlFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .map((entry) => join(dir, String(entry)))
    .filter((path) => statSync(path).isFile() && path.endsWith('.html'))
    .sort();
}

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(join(ROOT, file))) {
    errors.push(`Missing required file: ${file}`);
  }
}

const htmlFiles = listHtmlFiles(SITE_DIR);
const contentPages = [
  'insights.html',
  'resiliency-reports.html',
  'newsroom.html',
  'resource-library.html',
  'cato-research.html',
  '2026-supply-disruption-preparedness-brief.html',
];

for (const page of contentPages) {
  const path = join(SITE_DIR, page);
  if (!existsSync(path)) {
    errors.push(`Missing content page: site/${page}`);
    continue;
  }

  const html = readFileSync(path, 'utf8');
  if (!html.includes('data-cato-nav-controller')) {
    errors.push(`Missing shared nav controller: site/${page}`);
  }
  if (!html.includes('nav_dropdown is-mega')) {
    errors.push(`Missing Insights mega menu markup: site/${page}`);
  }
}

const cmsPath = join(SITE_DIR, 'data/insights-cms.json');
if (existsSync(cmsPath)) {
  const cms = JSON.parse(readFileSync(cmsPath, 'utf8'));
  if (!Array.isArray(cms.items) || cms.items.length < 10) {
    errors.push('Expected at least 10 mock Insights CMS items.');
  }
  if (!Array.isArray(cms.categories) || cms.categories.length < 4) {
    errors.push('Expected at least 4 mock Insights CMS categories.');
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  package: '@create-something/cato-supply-insights-review',
  htmlFiles: htmlFiles.length,
  site: relative(process.cwd(), SITE_DIR),
}, null, 2));
