#!/usr/bin/env node
/**
 * Documentation Generator CLI
 *
 * Generates documentation from screenshot analyses provided by Claude Code.
 * Analysis JSON is provided via stdin or --analysis flag.
 *
 * Usage (called by Claude Code):
 *   echo '{"title":"Guide","screenshots":[...]}' | pnpm --filter=render-pipeline docs
 *   pnpm --filter=render-pipeline docs --analysis=/tmp/analysis.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { generateDocs, validateScreenshots } from '../docs/index.js';
import type { BatchAnalysis, DocGenOptions } from '../docs/types.js';

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  analysisFile?: string;
  title?: string;
  outputDir: string;
  animate: boolean;
  skipCrops: boolean;
  dryRun: boolean;
  help: boolean;
} {
  const result = {
    analysisFile: undefined as string | undefined,
    title: undefined as string | undefined,
    outputDir: './docs',
    animate: false,
    skipCrops: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--analysis' || arg === '-a') {
      result.analysisFile = args[++i];
    } else if (arg.startsWith('--analysis=')) {
      result.analysisFile = arg.split('=')[1];
    } else if (arg === '--title' || arg === '-t') {
      result.title = args[++i];
    } else if (arg.startsWith('--title=')) {
      result.title = arg.split('=')[1];
    } else if (arg === '--output' || arg === '-o') {
      result.outputDir = args[++i];
    } else if (arg.startsWith('--output=')) {
      result.outputDir = arg.split('=')[1];
    } else if (arg === '--animate') {
      result.animate = true;
    } else if (arg === '--skip-crops') {
      result.skipCrops = true;
    } else if (arg === '--dry-run' || arg === '-n') {
      result.dryRun = true;
    }
  }

  return result;
}

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Documentation Generator - Generate docs from Claude Code screenshot analyses

USAGE:
  echo '{"title":"Guide","screenshots":[...]}' | docs [options]
  docs --analysis=/path/to/analysis.json [options]

This tool is designed to be called by Claude Code after vision analysis.
Analysis JSON should contain screenshot analyses from Claude Code agents.

OPTIONS:
  -a, --analysis <file>  Read analysis results from JSON file
  -t, --title <title>    Override documentation title
  -o, --output <dir>     Output directory (default: ./docs)
  --animate              Generate HTML with CSS animations
  --skip-crops           Don't generate cropped element images
  -n, --dry-run          Validate only, don't generate files
  -h, --help             Show this help message

PIPELINE:
  Screenshots → Claude (analyze UI) → Sharp (crop/highlight) → Markdown + Images

INPUT FORMAT:
  {
    "title": "Admin Guide",
    "screenshots": [
      {
        "imagePath": "/path/to/screenshot.png",
        "pageTitle": "Dashboard Overview",
        "description": "Main dashboard showing service status",
        "userFlowStep": 1,
        "elements": [
          {
            "x": 0.1,
            "y": 0.2,
            "width": 0.3,
            "height": 0.15,
            "label": "Connect Button",
            "description": "Click to connect service",
            "importance": "primary",
            "action": "Click to begin setup"
          }
        ],
        "nextAction": "Connect your accounts",
        "docSection": "Getting Started"
      }
    ]
  }

OUTPUT:
  docs/
  ├── guide-name.md           # Markdown documentation
  ├── guide-name.html         # HTML with animations (if --animate)
  └── images/
      ├── 01-screenshot.png       # Full screenshots
      ├── 01-screenshot-annotated.png  # With highlights
      └── 01-screenshot-crop-*.png     # Cropped elements

EXAMPLE (Claude Code workflow):
  1. Claude Code analyzes screenshots with vision
  2. Claude Code writes analysis JSON to /tmp/analysis.json
  3. Claude Code runs: docs --analysis=/tmp/analysis.json --animate
  4. Documentation generated in ./docs/
`);
}

/**
 * Read analysis JSON from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  // Check if stdin has data (not a TTY)
  if (process.stdin.isTTY) {
    return '';
  }

  return new Promise((resolve, reject) => {
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);

    // Timeout after 1 second if no data
    setTimeout(() => resolve(''), 1000);
  });
}

/**
 * Parse and validate analysis JSON
 */
function parseAnalysis(json: string): BatchAnalysis {
  const data = JSON.parse(json);

  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Missing or invalid "title" field');
  }

  if (!Array.isArray(data.screenshots) || data.screenshots.length === 0) {
    throw new Error('Missing or empty "screenshots" array');
  }

  // Validate each screenshot analysis
  for (let i = 0; i < data.screenshots.length; i++) {
    const s = data.screenshots[i];
    const prefix = `screenshots[${i}]`;

    if (!s.imagePath) throw new Error(`${prefix}: missing imagePath`);
    if (!s.pageTitle) throw new Error(`${prefix}: missing pageTitle`);
    if (typeof s.userFlowStep !== 'number') throw new Error(`${prefix}: missing userFlowStep`);
    if (!Array.isArray(s.elements)) throw new Error(`${prefix}: missing elements array`);

    // Validate elements
    for (let j = 0; j < s.elements.length; j++) {
      const e = s.elements[j];
      const ePrefix = `${prefix}.elements[${j}]`;

      if (typeof e.x !== 'number') throw new Error(`${ePrefix}: missing x`);
      if (typeof e.y !== 'number') throw new Error(`${ePrefix}: missing y`);
      if (typeof e.width !== 'number') throw new Error(`${ePrefix}: missing width`);
      if (typeof e.height !== 'number') throw new Error(`${ePrefix}: missing height`);
      if (!e.label) throw new Error(`${ePrefix}: missing label`);
      if (!e.importance) throw new Error(`${ePrefix}: missing importance`);
    }
  }

  return data as BatchAnalysis;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Read analysis results
  let analysisJson: string;

  if (args.analysisFile) {
    try {
      analysisJson = await fs.readFile(args.analysisFile, 'utf-8');
    } catch (err) {
      console.error(`Error reading analysis file: ${args.analysisFile}`);
      process.exit(1);
    }
  } else {
    analysisJson = await readStdin();
  }

  if (!analysisJson.trim()) {
    console.error('Error: No analysis results provided.');
    console.error('Provide via stdin or --analysis flag.');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  // Parse analysis
  let analysis: BatchAnalysis;
  try {
    analysis = parseAnalysis(analysisJson);
  } catch (err) {
    console.error('Error parsing analysis JSON:', err);
    process.exit(1);
  }

  // Override title if provided
  if (args.title) {
    analysis.title = args.title;
  }

  // Validate screenshot files exist
  const imagePaths = analysis.screenshots.map((s) => s.imagePath);
  const validPaths = await validateScreenshots(imagePaths);

  if (validPaths.length === 0) {
    console.error('Error: No valid screenshot files found.');
    process.exit(1);
  }

  if (validPaths.length < imagePaths.length) {
    // Filter to only valid screenshots
    analysis.screenshots = analysis.screenshots.filter((s) => validPaths.includes(s.imagePath));
  }

  console.log(`Processing ${analysis.screenshots.length} screenshot(s)`);
  console.log(`Title: ${analysis.title}`);
  console.log(`Output: ${args.outputDir}`);
  if (args.animate) console.log('Generating HTML with animations');
  if (args.skipCrops) console.log('Skipping cropped images');

  if (args.dryRun) {
    console.log('\nDRY RUN - validation passed, no files generated');
    process.exit(0);
  }

  // Generate documentation
  const options: DocGenOptions = {
    title: analysis.title,
    outputDir: args.outputDir,
    animate: args.animate,
    skipCrops: args.skipCrops,
    dryRun: args.dryRun,
  };

  const result = await generateDocs(analysis, options);

  // Print summary
  console.log('\n✓ Documentation generated successfully');
  console.log(`  Markdown: ${result.markdownPath}`);
  if (result.htmlPath) {
    console.log(`  HTML: ${result.htmlPath}`);
  }
  console.log(`  Images: ${result.imageCount}`);
  console.log(`  Duration: ${result.duration}ms`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
