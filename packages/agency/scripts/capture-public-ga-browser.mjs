#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const AGENCY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = path.resolve(AGENCY_ROOT, '..', '..');

function parseArgs(argv) {
  const options = {
    config: path.join(REPOSITORY_ROOT, 'config/public-ga.v1.json')
  };
  const args = argv.slice(2).filter((arg) => arg !== '--');
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--output-dir' && args[index + 1]) options.outputDir = args[++index];
    else if (arg === '--commit' && args[index + 1]) options.commit = args[++index];
    else if (arg === '--config' && args[index + 1]) options.config = args[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node packages/agency/scripts/capture-public-ga-browser.mjs \\
    --commit <40-character-main-sha> --output-dir <new-dir>

Captures fresh canonical production pricing evidence at the policy's desktop and
390px mobile widths. The output manifest is an input to public-ga-verify.mjs.
`);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function slug(value) {
  return value.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'home';
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }
  if (!/^[a-f0-9]{40}$/.test(options.commit ?? '')) throw new Error('--commit must be a full SHA');
  if (!options.outputDir) throw new Error('--output-dir is required');
  const outputDir = path.resolve(options.outputDir);
  if (await exists(outputDir))
    throw new Error(`Refusing to overwrite output directory: ${outputDir}`);
  await mkdir(outputDir, { recursive: true });
  const config = JSON.parse(await readFile(path.resolve(options.config), 'utf8'));
  const captures = [];
  const browser = await chromium.launch();
  try {
    for (const route of config.pricing.routes) {
      for (const width of config.pricing.browserWidths) {
        const viewport = { width, height: width === 390 ? 844 : 720 };
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const consoleErrors = [];
        const requestFailures = [];
        const targetOrigin = new URL(config.pricing.baseUrl).origin;
        page.on('console', (message) => {
          if (message.type() === 'error') {
            consoleErrors.push({ text: message.text(), location: message.location() });
          }
        });
        page.on('pageerror', (error) =>
          consoleErrors.push({ text: error.message, location: null })
        );
        page.on('requestfailed', (request) => {
          if (new URL(request.url()).origin === targetOrigin) {
            requestFailures.push({
              url: request.url(),
              error: request.failure()?.errorText ?? 'unknown'
            });
          }
        });

        const url = new URL(route.path, config.pricing.baseUrl).href;
        let response = await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1_000);
        response = await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1_000);
        const text = await page.locator('body').innerText();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const screenshotName = `${slug(route.path)}-${width}.png`;
        const screenshotPath = path.join(outputDir, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        const screenshot = await readFile(screenshotPath);
        captures.push({
          path: route.path,
          url: page.url(),
          viewport,
          httpStatus: response?.status() ?? null,
          requiredTextPass: route.requiredText.every((required) => text.includes(required)),
          requiredText: route.requiredText,
          horizontalOverflowPixels: overflow,
          consoleErrors,
          requestFailures,
          screenshotPath: screenshotName,
          screenshotSha256: sha256(screenshot)
        });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    schemaVersion: 1,
    gaCommit: options.commit,
    capturedAt: new Date().toISOString(),
    baseUrl: config.pricing.baseUrl,
    captures
  };
  const manifestPath = path.join(outputDir, 'browser-evidence.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ manifest: manifestPath, captures: captures.length }));
  if (
    captures.some(
      (capture) =>
        capture.httpStatus !== 200 ||
        !capture.requiredTextPass ||
        capture.horizontalOverflowPixels > 1 ||
        capture.consoleErrors.length > 0 ||
        capture.requestFailures.length > 0
    )
  ) {
    throw new Error('One or more public GA browser captures failed');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
