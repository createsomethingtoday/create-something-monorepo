#!/usr/bin/env node
/**
 * Photo Cleanup Processor
 *
 * Processes photos with detection results from Claude Code agents.
 * Detection JSON is provided via stdin or --detections flag.
 *
 * Usage (called by Claude Code):
 *   echo '{"results":[...]}' | pnpm --filter=render-pipeline cleanup
 *   pnpm --filter=render-pipeline cleanup --detections=/tmp/detections.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  processBatchWithDetections,
  processWithDetection,
  printSummary,
  checkConfiguration,
  parseDetectionResults
} from '../cleanup/index.js';
import type { InpaintModel, BatchDetectionResult } from '../cleanup/index.js';

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  detectionsFile?: string;
  dryRun: boolean;
  saveMasks: boolean;
  saveDebug: boolean;
  model: InpaintModel;
  outputDir?: string;
  help: boolean;
} {
  const result = {
    detectionsFile: undefined as string | undefined,
    dryRun: false,
    saveMasks: false,
    saveDebug: false,
    model: 'flux' as InpaintModel,
    outputDir: undefined as string | undefined,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--dry-run' || arg === '-n') {
      result.dryRun = true;
    } else if (arg === '--save-masks' || arg === '-m') {
      result.saveMasks = true;
    } else if (arg === '--save-debug' || arg === '-d') {
      result.saveDebug = true;
    } else if (arg === '--model' || arg === '-M') {
      const model = args[++i];
      if (model === 'flux' || model === 'sdxl' || model === 'lama') {
        result.model = model;
      } else {
        console.error(`Unknown model: ${model}. Use 'flux' (best), 'sdxl', or 'lama' (fast).`);
        process.exit(1);
      }
    } else if (arg === '--output' || arg === '-o') {
      result.outputDir = args[++i];
    } else if (arg === '--detections' || arg === '-D') {
      result.detectionsFile = args[++i];
    } else if (arg.startsWith('--detections=')) {
      result.detectionsFile = arg.split('=')[1];
    }
  }

  return result;
}

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
Photo Cleanup Processor - Process photos with Claude Code detection results

USAGE:
  echo '{"results":[...]}' | cleanup [options]
  cleanup --detections=/path/to/detections.json [options]

This tool is designed to be called by Claude Code after vision analysis.
Detection JSON should contain results from Claude Code agents.

OPTIONS:
  -D, --detections <file>  Read detection results from JSON file
  -n, --dry-run            Generate debug images but don't inpaint
  -d, --save-debug         Save debug images showing detected regions
  -m, --save-masks         Save intermediate mask files
  -M, --model <name>       Inpainting model: 'flux' (best), 'sdxl', or 'lama' (fast)
  -o, --output <dir>       Output directory (default: same as input)
  -h, --help               Show this help message

INPUT FORMAT:
  {
    "results": [
      {
        "imagePath": "/path/to/image.jpg",
        "distractions": [
          {"x": 0.75, "y": 0.3, "width": 0.05, "height": 0.08, "label": "outlet"}
        ]
      }
    ]
  }

ENVIRONMENT:
  REPLICATE_API_TOKEN    Required for inpainting

EXAMPLE (Claude Code workflow):
  1. Claude Code analyzes images with vision
  2. Claude Code writes detection JSON to /tmp/detections.json
  3. Claude Code runs: cleanup --detections=/tmp/detections.json
  4. Cleaned images saved as *-cleaned.png
`);
}

/**
 * Read detection JSON from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  // Check if stdin has data (not a TTY)
  if (process.stdin.isTTY) {
    return '';
  }

  return new Promise((resolve, reject) => {
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);

    // Timeout after 1 second if no data
    setTimeout(() => resolve(''), 1000);
  });
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

  // Check Replicate configuration
  const config = checkConfiguration();
  if (!config.configured) {
    console.error('Error: Missing required environment variables:');
    for (const missing of config.missing) {
      console.error(`  - ${missing}`);
    }
    process.exit(1);
  }

  // Read detection results
  let detectionsJson: string;

  if (args.detectionsFile) {
    try {
      detectionsJson = await fs.readFile(args.detectionsFile, 'utf-8');
    } catch (err) {
      console.error(`Error reading detections file: ${args.detectionsFile}`);
      process.exit(1);
    }
  } else {
    detectionsJson = await readStdin();
  }

  if (!detectionsJson.trim()) {
    console.error('Error: No detection results provided.');
    console.error('Provide via stdin or --detections flag.');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  // Parse detection results
  let detections: BatchDetectionResult;
  try {
    detections = parseDetectionResults(detectionsJson);
  } catch (err) {
    console.error('Error parsing detection JSON:', err);
    process.exit(1);
  }

  if (detections.results.length === 0) {
    console.log('No images to process.');
    process.exit(0);
  }

  console.log(`Processing ${detections.results.length} image(s)`);
  console.log(`Model: ${args.model}`);
  if (args.dryRun) {
    console.log('DRY RUN - generating debug images only');
  }

  // Run cleanup
  const summary = await processBatchWithDetections(detections, {
    dryRun: args.dryRun,
    saveMasks: args.saveMasks,
    saveDebug: args.saveDebug,
    model: args.model,
    outputDir: args.outputDir
  });

  // Print summary
  printSummary(summary);

  // Exit with error code if any failed
  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
