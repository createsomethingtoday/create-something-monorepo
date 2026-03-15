/**
 * Documentation Generator
 * Generate Markdown and HTML from screenshot analyses
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { slugify } from '@create-something/canon';
import type { ProcessedScreenshot, DocGenOptions, DocGenResult } from './types.js';

/**
 * Get relative path from docs folder to image
 */
function getRelativePath(imagePath: string, docsDir: string): string {
  const relative = path.relative(docsDir, imagePath);
  // Ensure forward slashes for markdown
  return relative.replace(/\\/g, '/');
}

/**
 * Generate markdown for a single screenshot section
 */
function generateScreenshotMarkdown(
  screenshot: ProcessedScreenshot,
  docsDir: string
): string {
  const { analysis, images } = screenshot;
  const lines: string[] = [];

  // Section header with step number
  lines.push(`## ${analysis.userFlowStep}. ${analysis.pageTitle}`);
  lines.push('');

  // Find full screenshot image
  const fullImage = images.find((img) => img.type === 'full');
  if (fullImage) {
    const relativePath = getRelativePath(fullImage.path, docsDir);
    lines.push(`![${analysis.pageTitle}](${relativePath})`);
    lines.push('');
  }

  // Description
  if (analysis.description) {
    lines.push(analysis.description);
    lines.push('');
  }

  // Primary elements with actions
  const primaryElements = analysis.elements.filter((e) => e.importance === 'primary');
  if (primaryElements.length > 0) {
    for (const element of primaryElements) {
      lines.push(`### ${element.label}`);
      lines.push('');

      // Find crop for this element
      const crop = images.find(
        (img) =>
          img.type === 'crop' &&
          img.elementLabel?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ===
            element.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      );

      if (crop) {
        const relativePath = getRelativePath(crop.path, docsDir);
        lines.push(`![${element.label} Detail](${relativePath})`);
        lines.push('');
      }

      if (element.description) {
        lines.push(element.description);
        lines.push('');
      }

      if (element.action) {
        lines.push(`**Action**: ${element.action}`);
        lines.push('');
      }
    }
  }

  // Next action
  if (analysis.nextAction) {
    lines.push(`> **Next**: ${analysis.nextAction}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate complete markdown documentation
 */
export function generateMarkdown(
  title: string,
  screenshots: ProcessedScreenshot[],
  docsDir: string
): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${title}`);
  lines.push('');

  // Table of contents
  lines.push('## Contents');
  lines.push('');
  for (const screenshot of screenshots) {
    const { analysis } = screenshot;
    const anchor = slugify(analysis.pageTitle);
    lines.push(`${analysis.userFlowStep}. [${analysis.pageTitle}](#${analysis.userFlowStep}-${anchor})`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Individual sections
  for (const screenshot of screenshots) {
    lines.push(generateScreenshotMarkdown(screenshot, docsDir));
  }

  return lines.join('\n');
}

/**
 * CSS for animated HTML documentation
 */
const ANIMATION_CSS = `
<style>
  :root {
    --bg: #000;
    --surface: #111;
    --text: #fff;
    --text-muted: rgba(255, 255, 255, 0.6);
    --border: rgba(255, 255, 255, 0.1);
    --highlight: rgba(255, 255, 255, 0.15);
    --radius: 8px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 2rem;
    font-weight: 600;
  }

  h2 {
    font-size: 1.5rem;
    margin: 2rem 0 1rem;
    font-weight: 500;
  }

  h3 {
    font-size: 1.125rem;
    margin: 1.5rem 0 0.5rem;
    font-weight: 500;
  }

  p {
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .step {
    position: relative;
    margin: 2rem 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .step img {
    width: 100%;
    display: block;
  }

  .highlight {
    position: absolute;
    border: 2px solid var(--text);
    border-radius: 4px;
    background: var(--highlight);
    pointer-events: none;
  }

  .highlight.pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.02);
    }
  }

  .highlight-label {
    position: absolute;
    top: -28px;
    left: 0;
    background: rgba(0, 0, 0, 0.9);
    color: var(--text);
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .action-hint {
    background: var(--surface);
    padding: 1rem;
    border-radius: var(--radius);
    margin: 1rem 0;
    border-left: 3px solid var(--text);
  }

  .action-hint strong {
    color: var(--text);
  }

  .crop-detail {
    display: inline-block;
    max-width: 400px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin: 1rem 0;
  }

  .crop-detail img {
    width: 100%;
    display: block;
  }

  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 3rem 0;
  }

  .toc {
    background: var(--surface);
    padding: 1.5rem;
    border-radius: var(--radius);
    margin-bottom: 2rem;
  }

  .toc ol {
    margin: 0;
    padding-left: 1.5rem;
  }

  .toc a {
    color: var(--text);
    text-decoration: none;
  }

  .toc a:hover {
    text-decoration: underline;
  }
</style>
`;

/**
 * Generate HTML element for a highlight overlay
 */
function generateHighlightHtml(
  element: { x: number; y: number; width: number; height: number; label: string },
  animate: boolean
): string {
  const style = `left: ${element.x * 100}%; top: ${element.y * 100}%; width: ${element.width * 100}%; height: ${element.height * 100}%;`;
  const classes = animate ? 'highlight pulse' : 'highlight';

  return `
    <div class="${classes}" style="${style}">
      <span class="highlight-label">${escapeHtml(element.label)}</span>
    </div>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate HTML section for a screenshot
 */
function generateScreenshotHtml(
  screenshot: ProcessedScreenshot,
  docsDir: string,
  animate: boolean
): string {
  const { analysis, images } = screenshot;
  const lines: string[] = [];

  const anchor = slugify(analysis.pageTitle);
  lines.push(`<section id="${analysis.userFlowStep}-${anchor}">`);
  lines.push(`  <h2>${analysis.userFlowStep}. ${escapeHtml(analysis.pageTitle)}</h2>`);

  // Find full screenshot
  const fullImage = images.find((img) => img.type === 'full');
  if (fullImage) {
    const relativePath = getRelativePath(fullImage.path, docsDir);
    lines.push(`  <div class="step">`);
    lines.push(`    <img src="${relativePath}" alt="${escapeHtml(analysis.pageTitle)}" />`);

    // Add highlight overlays for primary elements
    const primaryElements = analysis.elements.filter((e) => e.importance === 'primary');
    for (const element of primaryElements) {
      lines.push(generateHighlightHtml(element, animate));
    }

    lines.push(`  </div>`);
  }

  // Description
  if (analysis.description) {
    lines.push(`  <p>${escapeHtml(analysis.description)}</p>`);
  }

  // Primary elements with crops
  const primaryElements = analysis.elements.filter((e) => e.importance === 'primary');
  for (const element of primaryElements) {
    lines.push(`  <h3>${escapeHtml(element.label)}</h3>`);

    // Find crop
    const crop = images.find(
      (img) =>
        img.type === 'crop' &&
        img.elementLabel?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ===
          element.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    );

    if (crop) {
      const relativePath = getRelativePath(crop.path, docsDir);
      lines.push(`  <div class="crop-detail">`);
      lines.push(`    <img src="${relativePath}" alt="${escapeHtml(element.label)} Detail" />`);
      lines.push(`  </div>`);
    }

    if (element.description) {
      lines.push(`  <p>${escapeHtml(element.description)}</p>`);
    }

    if (element.action) {
      lines.push(`  <div class="action-hint"><strong>Action:</strong> ${escapeHtml(element.action)}</div>`);
    }
  }

  // Next action
  if (analysis.nextAction) {
    lines.push(`  <div class="action-hint"><strong>Next:</strong> ${escapeHtml(analysis.nextAction)}</div>`);
  }

  lines.push(`</section>`);
  lines.push(`<hr />`);

  return lines.join('\n');
}

/**
 * Generate complete HTML documentation with CSS animations
 */
export function generateHtml(
  title: string,
  screenshots: ProcessedScreenshot[],
  docsDir: string,
  animate: boolean = true
): string {
  const lines: string[] = [];

  lines.push('<!DOCTYPE html>');
  lines.push('<html lang="en">');
  lines.push('<head>');
  lines.push(`  <meta charset="UTF-8">`);
  lines.push(`  <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
  lines.push(`  <title>${escapeHtml(title)}</title>`);
  lines.push(ANIMATION_CSS);
  lines.push('</head>');
  lines.push('<body>');
  lines.push('<div class="container">');

  // Title
  lines.push(`  <h1>${escapeHtml(title)}</h1>`);

  // Table of contents
  lines.push(`  <nav class="toc">`);
  lines.push(`    <ol>`);
  for (const screenshot of screenshots) {
    const { analysis } = screenshot;
    const anchor = slugify(analysis.pageTitle);
    lines.push(`      <li><a href="#${analysis.userFlowStep}-${anchor}">${escapeHtml(analysis.pageTitle)}</a></li>`);
  }
  lines.push(`    </ol>`);
  lines.push(`  </nav>`);

  // Sections
  for (const screenshot of screenshots) {
    lines.push(generateScreenshotHtml(screenshot, docsDir, animate));
  }

  lines.push('</div>');
  lines.push('</body>');
  lines.push('</html>');

  return lines.join('\n');
}

/**
 * Write documentation files
 */
export async function writeDocumentation(
  title: string,
  screenshots: ProcessedScreenshot[],
  options: DocGenOptions
): Promise<{ markdownPath: string; htmlPath?: string }> {
  const outputDir = options.outputDir || './docs';
  const slug = slugify(title);

  await fs.mkdir(outputDir, { recursive: true });

  // Write markdown
  const markdownContent = generateMarkdown(title, screenshots, outputDir);
  const markdownPath = path.join(outputDir, `${slug}.md`);
  await fs.writeFile(markdownPath, markdownContent, 'utf-8');

  // Write HTML if animate option enabled
  let htmlPath: string | undefined;
  if (options.animate) {
    const htmlContent = generateHtml(title, screenshots, outputDir, true);
    htmlPath = path.join(outputDir, `${slug}.html`);
    await fs.writeFile(htmlPath, htmlContent, 'utf-8');
  }

  return { markdownPath, htmlPath };
}
