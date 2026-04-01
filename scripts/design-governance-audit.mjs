#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PROPERTY_CONFIG = [
  {
    slug: 'agency',
    packageDir: 'packages/agency',
    sourceDir: 'packages/agency/src',
    auditDoc: 'packages/agency/CANON_AUDIT.md'
  },
  {
    slug: 'io',
    packageDir: 'packages/io',
    sourceDir: 'packages/io/src',
    auditDoc: 'packages/io/CANON_AUDIT.md'
  },
  {
    slug: 'space',
    packageDir: 'packages/space',
    sourceDir: 'packages/space/src',
    auditDoc: 'packages/space/CANON_AUDIT.md'
  },
  {
    slug: 'ltd',
    packageDir: 'packages/ltd',
    sourceDir: 'packages/ltd/src',
    auditDoc: 'packages/ltd/CANON_AUDIT.md'
  }
];

const REVIEWED_DESIGN_EXCEPTIONS = {
	'packages/agency/src/routes/admin/community/+page.svelte':
		'Platform badges intentionally preserve external network brand colors for operator recognition.',
	'packages/io/src/routes/visualizations/arena-scale/+page.svelte':
		'Arena-scale visualization uses a reviewed multi-industry palette to distinguish domains.',
	'packages/io/src/routes/experiments/hybrid-scheduling/+page.svelte':
		'Hybrid scheduling experiment keeps a reviewed accent palette for route-specific demonstration.',
	'packages/io/src/routes/papers/teaching-modalities-experiment/+page.svelte':
		'Research paper embeds an intentional modality palette as part of the argument.',
	'packages/io/src/routes/papers/open-weight-models-mcp-guidance/+page.svelte':
		'Research visualization preserves reviewed comparative color coding.',
	'packages/io/src/routes/papers/threshold-dwelling/+page.svelte':
		'Editorial paper uses a reviewed threshold palette for concept framing.',
	'packages/io/src/routes/experiments/render-studio/+page.svelte':
		'Rendering experiment keeps intentional preview colors for state comparison.',
	'packages/io/src/routes/experiments/render-preview/+page.svelte':
		'Rendering preview uses reviewed route-specific color coding.',
	'packages/io/src/lib/animations/TufteMorph.svelte':
		'Animation component preserves reviewed motion-study highlight colors.',
	'packages/io/src/routes/papers/subtractive-studio/+page.svelte':
		'Research paper includes reviewed studio palette examples as evidence.',
	'packages/io/src/routes/papers/tufte-mobile-optimization/+page.svelte':
		'Optimization paper retains reviewed comparison palette for before/after analysis.',
	'packages/io/src/routes/experiments/ascii-renderer/+page.svelte':
		'ASCII renderer experiment uses reviewed output colors for terminal fidelity.',
	'packages/io/src/routes/experiments/living-arena-gpu/+page.svelte':
		'GPU arena experiment keeps reviewed visualization colors for runtime comparison.',
	'packages/io/src/routes/papers/animation-spec-architecture/+page.svelte':
		'Animation specification paper includes reviewed accent references in examples.',
	'packages/io/src/routes/papers/ground-evidence-based-claims/+page.svelte':
		'Ground evidence paper uses reviewed highlight colors to separate evidence classes.',
	'packages/io/src/routes/papers/harness-agent-sdk-migration/+page.svelte':
		'Migration paper preserves reviewed diagram accents in embedded examples.',
	'packages/io/src/routes/papers/hermeneutic-spiral-ux/+page.svelte':
		'Editorial UX paper uses reviewed concept-color mapping in the spiral diagram.',
	'packages/space/src/lib/experiments/nba-live/RealtimeChart.svelte':
		'Realtime chart intentionally preserves data-series palette defaults for canvas fallback.',
	'packages/ltd/src/routes/presentations/abundance-system/IntakeExperience.svelte':
		'Presentation slide preserves reviewed narrative palette for the abundance-system deck.',
	'packages/ltd/src/routes/presentations/abundance-system/MatchingShortlistVisual.svelte':
		'Presentation visual keeps reviewed shortlist state colors for narrative clarity.',
	'packages/ltd/src/routes/presentations/abundance-system/RolloutTimelineVisual.svelte':
		'Timeline slide uses reviewed milestone colors for presentation legibility.',
	'packages/ltd/src/routes/presentations/abundance-system/PolicyEscalationVisual.svelte':
		'Escalation visual keeps reviewed status colors for presentation semantics.',
	'packages/ltd/src/routes/presentations/abundance-system/BudgetAllocationVisual.svelte':
		'Budget visual retains reviewed chart colors for slide readability.',
	'packages/ltd/src/routes/presentations/canon-design/+page.svelte':
		'Presentation route preserves reviewed design-deck palette accents.'
};

const SUPPORTED_EXTENSIONS = new Set(['.svelte', '.css']);

function parseArgs(argv) {
  const args = {
    format: 'text',
    properties: PROPERTY_CONFIG.map((property) => property.slug),
    runMobile: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--format') {
      args.format = argv[index + 1] ?? 'text';
      index += 1;
      continue;
    }

    if (arg.startsWith('--format=')) {
      args.format = arg.slice('--format='.length);
      continue;
    }

    if (arg === '--properties') {
      args.properties = (argv[index + 1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg.startsWith('--properties=')) {
      args.properties = arg
        .slice('--properties='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      continue;
    }

    if (arg === '--run-mobile') {
      args.runMobile = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!['text', 'json'].includes(args.format)) {
    throw new Error(`Unsupported format "${args.format}". Use text or json.`);
  }

  return args;
}

function printHelp() {
  console.log(`Design governance audit

Usage:
  node scripts/design-governance-audit.mjs [--format text|json] [--properties agency,io,space,ltd] [--run-mobile]

Examples:
  pnpm design:governance:audit
  pnpm design:governance:audit:json
  node scripts/design-governance-audit.mjs --properties agency,io --run-mobile`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

function listFiles(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) return results;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, results);
      continue;
    }

    if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results;
}

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function normalizeForLiteralChecks(content) {
	return content
		.replace(/var\([^)]*\)/g, 'var()')
		.replace(/&#(?:x[a-fA-F0-9]+|\d+);/g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|[^\w:])\/\/.*$/gm, '$1');
}

function parseAuditDoc(relativePath) {
  if (!relativePath || !fileExists(relativePath)) {
    return null;
  }

  const content = fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
  const lastVerified = content.match(/\*\*Last Verified\*\*:\s*([^\n]+)/)?.[1]?.trim() ?? null;
  const overallCompliance = content.match(/\*\*Overall Compliance\*\*:\s*([^\n]+)/)?.[1]?.trim() ?? null;

  return {
    path: relativePath,
    lastVerified,
    overallCompliance
  };
}

function analyzeSourceFiles(sourceDir) {
  const fullSourceDir = path.join(ROOT_DIR, sourceDir);
  const files = listFiles(fullSourceDir);

  const metrics = {
    filesAnalyzed: files.length,
    canonImports: 0,
    canonStylesheetImports: 0,
    cssVariableUsages: 0,
    hexColors: 0,
    arbitraryColorUtilities: 0,
    rgbaLiterals: 0,
    durationLiterals: 0,
    reviewedExceptionFiles: 0,
    reviewedHexColors: 0,
    reviewedArbitraryColorUtilities: 0,
    reviewedRgbaLiterals: 0,
    reviewedExceptions: []
  };

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
    const normalizedForLiteralChecks = normalizeForLiteralChecks(content);
    const hexColors = countMatches(normalizedForLiteralChecks, /(?<![A-Za-z0-9&])#[0-9a-fA-F]{3,8}\b/g);
    const arbitraryColorUtilities = countMatches(
      normalizedForLiteralChecks,
      /\b(?:bg|text|border|ring|outline|from|to|via)-\[#(?:[0-9a-fA-F]{3,8})\]/g
    );
    const rgbaLiterals = countMatches(
      normalizedForLiteralChecks,
      /\brgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}[^)]*\)/g
    );
    metrics.canonImports += countMatches(content, /@create-something\/canon/g);
    metrics.canonStylesheetImports += countMatches(content, /canon(?:\.css|\/styles\/canon\.css|\/styles\/tokens\.css)/g);
    metrics.cssVariableUsages += countMatches(content, /var\(--/g);
    metrics.durationLiterals += countMatches(content, /\b\d+(?:\.\d+)?m?s\b/g);

    const reviewedRationale = REVIEWED_DESIGN_EXCEPTIONS[relativePath];
    if (reviewedRationale) {
      metrics.reviewedExceptionFiles += 1;
      metrics.reviewedHexColors += hexColors;
      metrics.reviewedArbitraryColorUtilities += arbitraryColorUtilities;
      metrics.reviewedRgbaLiterals += rgbaLiterals;
      metrics.reviewedExceptions.push({
        path: relativePath,
        rationale: reviewedRationale,
        hexColors,
        arbitraryColorUtilities,
        rgbaLiterals
      });
      continue;
    }

    metrics.hexColors += hexColors;
    metrics.arbitraryColorUtilities += arbitraryColorUtilities;
    metrics.rgbaLiterals += rgbaLiterals;
  }

  return metrics;
}

function analyzeResponsiveCoverage(property) {
  const packageJson = readJson(path.join(ROOT_DIR, property.packageDir, 'package.json'));
  const mobileSmokeConfigured = Boolean(packageJson.scripts?.['smoke:mobile']);
  const mobileSmokeDir = path.join(ROOT_DIR, property.packageDir, 'tests', 'mobile-smoke');
  const mobileSmokeTests = fs.existsSync(mobileSmokeDir)
    ? fs.readdirSync(mobileSmokeDir).filter((entry) => entry.endsWith('.spec.ts') || entry.endsWith('.spec.js')).length
    : 0;
  const appHtmlPath = path.join(ROOT_DIR, property.packageDir, 'src', 'app.html');
  const viewportMetaConfigured = fs.existsSync(appHtmlPath)
    ? /<meta\s+name=["']viewport["']/i.test(fs.readFileSync(appHtmlPath, 'utf8'))
    : false;

  return {
    mobileSmokeConfigured,
    mobileSmokeTests,
    viewportMetaConfigured
  };
}

function analyzeProperty(property) {
  const packageJsonPath = path.join(ROOT_DIR, property.packageDir, 'package.json');
  const packageJson = readJson(packageJsonPath);
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.optionalDependencies
  };
  const designMetrics = analyzeSourceFiles(property.sourceDir);
  const responsive = analyzeResponsiveCoverage(property);
  const auditDoc = parseAuditDoc(property.auditDoc);
  const hasCanonDependency = Boolean(dependencies['@create-something/canon']);

  const findings = [];
  const nextActions = [];

  if (!hasCanonDependency) {
    findings.push('Canon dependency is missing.');
    nextActions.push('Add @create-something/canon as the shared design dependency.');
  }

  if (designMetrics.hexColors > 0) {
    findings.push(`${designMetrics.hexColors} hardcoded hex color signals detected in Svelte/CSS surfaces.`);
    nextActions.push('Review the hex color signals and replace unintended literals with Canon semantic tokens.');
  }

  if (designMetrics.arbitraryColorUtilities > 0) {
    findings.push(`${designMetrics.arbitraryColorUtilities} Tailwind arbitrary color utilities detected.`);
    nextActions.push('Replace arbitrary color utilities with Canon-backed classes or CSS variables.');
  }

  if (!responsive.mobileSmokeConfigured) {
    findings.push('No property-level mobile smoke script is configured.');
    nextActions.push('Add a smoke:mobile script and at least one breakpoint-critical Playwright assertion.');
  }

  if (responsive.mobileSmokeConfigured && responsive.mobileSmokeTests === 0) {
    findings.push('A mobile smoke script exists but no mobile smoke spec files were found.');
    nextActions.push('Add tests/mobile-smoke coverage for overflow, clipping, and one feature-critical mobile flow.');
  }

  if (!responsive.viewportMetaConfigured) {
    findings.push('Viewport meta tag is missing from src/app.html.');
    nextActions.push('Add a viewport meta tag so responsive behavior is explicit.');
  }

  if (!auditDoc) {
    nextActions.push('Create a baseline Canon audit doc for this property.');
  }

  const status =
    findings.length === 0
      ? 'good'
      : findings.some((finding) => finding.includes('missing') || finding.includes('No property-level mobile smoke'))
        ? 'needs_governance'
        : 'needs_review';

  return {
    property: property.slug,
    packageDir: property.packageDir,
    sourceDir: property.sourceDir,
    hasCanonDependency,
    auditDoc,
    designMetrics,
    responsive,
    status,
    findings,
    nextActions
  };
}

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function maybeRunMobileSmoke(result) {
  if (!result.responsive.mobileSmokeConfigured) {
    return {
      status: 'not_configured'
    };
  }

  const run = await runCommand('pnpm', ['run', 'smoke:mobile'], path.join(ROOT_DIR, result.packageDir));
  return {
    status: run.code === 0 ? 'pass' : 'fail',
    exitCode: run.code,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim()
  };
}

function printTextReport(report) {
  console.log('CREATE SOMETHING Design Governance Audit');
  console.log('');
  console.log(`Properties reviewed: ${report.results.map((result) => result.property).join(', ')}`);
  console.log('');

  for (const result of report.results) {
    console.log(`${result.property}`);
    console.log(`  status: ${result.status}`);
    console.log(`  canon dependency: ${result.hasCanonDependency ? 'yes' : 'no'}`);
    console.log(`  files analyzed: ${result.designMetrics.filesAnalyzed}`);
    console.log(`  canon imports: ${result.designMetrics.canonImports}`);
    console.log(`  canon stylesheet imports: ${result.designMetrics.canonStylesheetImports}`);
    console.log(`  css variable usages: ${result.designMetrics.cssVariableUsages}`);
    console.log(`  hex colors: ${result.designMetrics.hexColors}`);
    console.log(`  arbitrary color utilities: ${result.designMetrics.arbitraryColorUtilities}`);
    console.log(`  rgba literals: ${result.designMetrics.rgbaLiterals}`);
    console.log(`  reviewed exception files: ${result.designMetrics.reviewedExceptionFiles}`);
    console.log(`  reviewed hex colors: ${result.designMetrics.reviewedHexColors}`);
    console.log(`  mobile smoke configured: ${result.responsive.mobileSmokeConfigured ? 'yes' : 'no'}`);
    console.log(`  mobile smoke tests: ${result.responsive.mobileSmokeTests}`);
    console.log(`  viewport meta configured: ${result.responsive.viewportMetaConfigured ? 'yes' : 'no'}`);
    console.log(
      `  baseline audit: ${
        result.auditDoc
          ? `${result.auditDoc.path}${result.auditDoc.lastVerified ? ` (last verified ${result.auditDoc.lastVerified})` : ''}`
          : 'missing'
      }`
    );

    if (result.mobileSmokeRun) {
      console.log(`  mobile smoke run: ${result.mobileSmokeRun.status}`);
    }

    if (result.findings.length > 0) {
      console.log('  findings:');
      for (const finding of result.findings) {
        console.log(`    - ${finding}`);
      }
    }

    if (result.nextActions.length > 0) {
      console.log('  next actions:');
      for (const action of result.nextActions) {
        console.log(`    - ${action}`);
      }
    }

    if (result.designMetrics.reviewedExceptions.length > 0) {
      console.log('  reviewed exceptions:');
      for (const exception of result.designMetrics.reviewedExceptions) {
        console.log(`    - ${exception.path}: ${exception.rationale}`);
      }
    }

    console.log('');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selectedProperties = PROPERTY_CONFIG.filter((property) => args.properties.includes(property.slug));

  if (selectedProperties.length === 0) {
    throw new Error(`No matching properties found for "${args.properties.join(',')}".`);
  }

  const results = [];
  for (const property of selectedProperties) {
    const result = analyzeProperty(property);
    if (args.runMobile) {
      result.mobileSmokeRun = await maybeRunMobileSmoke(result);
    }
    results.push(result);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    analysisMode: 'heuristic_svelte_css_scan',
    properties: selectedProperties.map((property) => property.slug),
    results
  };

  if (args.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printTextReport(report);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
