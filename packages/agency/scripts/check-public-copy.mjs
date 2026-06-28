#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const packageRoot = path.resolve(scriptDir, '..');
export const monorepoRoot = path.resolve(packageRoot, '../..');

const PUBLIC_ROUTE_SKIP_SEGMENTS = new Set([
  'account',
  'admin',
  'api',
  'auth',
  'dashboard',
  'experiments',
  'login',
  'mcp-access',
  'prospects'
]);

const ROUTE_COPY_FILES = new Set(['+error.svelte', '+layout.svelte', '+page.svelte']);

export const PUBLIC_COPY_RULES = [
  {
    id: 'workflow-trust-checklist-title',
    pattern: /Workflow Trust Checklist/g,
    replacement: 'Workflow Control Checklist'
  },
  {
    id: 'workflow-trust-checklist-lower',
    pattern: /workflow trust checklist/g,
    replacement: 'workflow control checklist'
  },
  {
    id: 'trust-checklist-title',
    pattern: /Trust checklist/g,
    replacement: 'Control checklist'
  },
  {
    id: 'trust-checklist-lower',
    pattern: /trust checklist/g,
    replacement: 'control checklist'
  },
  {
    id: 'workflow-trust-map',
    pattern: /Workflow Trust Map/g,
    replacement: 'Atlas workflow map'
  },
  {
    id: 'workflow-trust-layer',
    pattern: /Workflow Trust Layer/g,
    replacement: 'workflow control layer'
  },
  {
    id: 'trust-map-title',
    pattern: /Trust Map/g,
    replacement: 'Workflow Map'
  },
  {
    id: 'trust-map-sentence',
    pattern: /Trust map/g,
    replacement: 'Workflow map'
  },
  {
    id: 'trust-map-lower',
    pattern: /\btrust map\b/g,
    replacement: 'workflow map'
  },
  {
    id: 'trust-layer-title',
    pattern: /Trust Layer/g,
    replacement: 'Control Layer'
  },
  {
    id: 'trust-layer-sentence',
    pattern: /Trust layer/g,
    replacement: 'Control layer'
  },
  {
    id: 'trust-layer-lower',
    pattern: /\btrust layer\b/g,
    replacement: 'control layer'
  },
  {
    id: 'trust-boundaries',
    pattern: /\btrust boundaries\b/gi,
    replacement: 'workflow boundaries'
  },
  {
    id: 'trust-patterns',
    pattern: /\btrust patterns\b/gi,
    replacement: 'visible workflow patterns'
  },
  {
    id: 'workflow-trust-decision',
    pattern: /\bworkflow trust decision\b/gi,
    replacement: 'workflow control decision'
  },
  {
    id: 'trust-layer-controls',
    pattern: /\btrust-layer controls\b/gi,
    replacement: 'control-layer controls'
  },
  {
    id: 'first-safe-path',
    pattern: /\bfirst safe path\b/gi,
    replacement: 'first controlled path'
  },
  {
    id: 'safe-delegation',
    pattern: /\bsafe delegation\b/gi,
    replacement: 'controlled delegation'
  },
  {
    id: 'article-a-receipt-surface',
    pattern: /\ba receipt surface\b/gi,
    replacement: 'an audit trail'
  },
  {
    id: 'receipt-surface',
    pattern: /\breceipt surface\b/gi,
    replacement: 'audit trail'
  },
  {
    id: 'article-a-audit-trail',
    pattern: /\ba audit trail\b/g,
    replacement: 'an audit trail'
  },
  {
    id: 'source-state',
    pattern: /\bsource state\b/gi,
    replacement: 'starting state'
  },
  {
    id: 'hard-stop',
    pattern: /\bhard stop\b/gi,
    replacement: 'stop point'
  },
  {
    id: 'approval-owner',
    pattern: /\bapproval owner\b/gi,
    replacement: 'approval authority'
  },
  {
    id: 'buyer-language',
    pattern: /\bbuyers?\b/gi,
    replacement: 'teams'
  },
  {
    id: 'productized-wedge',
    pattern: /\bproductized\s+wedge\b/gi,
    replacement: 'clear starting offer'
  },
  {
    id: 'entry-wedge',
    pattern: /\bentry\s+wedge\b/gi,
    replacement: 'first workflow'
  },
  {
    id: 'wedge-title',
    pattern: /Wedge/g,
    replacement: 'Path'
  },
  {
    id: 'wedge-lower',
    pattern: /wedge/g,
    replacement: 'path'
  },
  {
    id: 'gtm-vector',
    pattern: /\bgtm\s+vector\b/gi,
    replacement: 'go-to-market path'
  },
  {
    id: 'lead-magnet',
    pattern: /\blead\s+magnet\b/gi,
    replacement: 'useful public artifact'
  },
  {
    id: 'mcp-first-thesis',
    pattern: /\bmcp-first\s+thesis\b/gi,
    replacement: 'workflow systems thesis'
  },
  {
    id: 'commoditized-mcp-consumption',
    pattern: /\bMCP\s+consumption\s+is\s+commoditized\b/gi,
    replacement: 'tool connection is only the starting point'
  }
];

function walk(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const child = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(child));
      continue;
    }

    if (entry.isFile()) {
      files.push(child);
    }
  }

  return files;
}

function isPublicRouteFile(file) {
  const relative = path.relative(path.join(packageRoot, 'src/routes'), file);
  const segments = relative.split(path.sep);
  const routeSegments = segments.slice(0, -1);

  if (!ROUTE_COPY_FILES.has(path.basename(file))) {
    return false;
  }

  return routeSegments.every((segment) => !PUBLIC_ROUTE_SKIP_SEGMENTS.has(segment));
}

function readableFile(file) {
  return path.relative(packageRoot, file).replaceAll(path.sep, '/');
}

function lineColumn(source, index) {
  const before = source.slice(0, index);
  const lines = before.split('\n');

  return {
    line: lines.length,
    column: lines.at(-1).length + 1
  };
}

function uniqueSorted(files) {
  return [...new Set(files)].sort((a, b) => readableFile(a).localeCompare(readableFile(b)));
}

export function discoverPublicCopyFiles() {
  const routeFiles = walk(path.join(packageRoot, 'src/routes')).filter(isPublicRouteFile);
  const componentFiles = walk(path.join(packageRoot, 'src/lib/components')).filter((file) =>
    file.endsWith('.svelte')
  );
  const dataFiles = walk(path.join(packageRoot, 'src/lib/data')).filter((file) =>
    /\.(ts|svelte|json)$/.test(file)
  );
  const atlasFiles = walk(path.join(packageRoot, 'src/lib/atlas')).filter((file) =>
    /\.(ts|svelte|json)$/.test(file)
  );
  const canonicalSeo = path.join(monorepoRoot, 'packages/canon/src/lib/components/SEO.svelte');
  const canonicalAtlasFiles = walk(path.join(monorepoRoot, 'packages/canon/src/lib/atlas')).filter(
    (file) => /\.(ts|svelte|json)$/.test(file)
  );
  const extraFiles = existsSync(canonicalSeo) ? [canonicalSeo, ...canonicalAtlasFiles] : canonicalAtlasFiles;

  return uniqueSorted([...routeFiles, ...componentFiles, ...dataFiles, ...atlasFiles, ...extraFiles]);
}

export function auditPublicCopy(files = discoverPublicCopyFiles()) {
  const findings = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');

    for (const rule of PUBLIC_COPY_RULES) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`);
      const matches = source.matchAll(pattern);

      for (const match of matches) {
        const position = lineColumn(source, match.index ?? 0);
        findings.push({
          file: readableFile(file),
          line: position.line,
          column: position.column,
          rule: rule.id,
          text: match[0],
          replacement: rule.replacement
        });
      }
    }
  }

  return findings;
}

export function healPublicCopy(files = discoverPublicCopyFiles()) {
  const changed = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    let next = source;

    for (const rule of PUBLIC_COPY_RULES) {
      next = next.replace(rule.pattern, rule.replacement);
    }

    if (next !== source) {
      writeFileSync(file, next);
      changed.push(readableFile(file));
    }
  }

  return changed;
}

function formatFindings(findings) {
  return findings
    .map(
      (finding) =>
        `${finding.file}:${finding.line}:${finding.column} ${finding.rule} "${finding.text}" -> "${finding.replacement}"`
    )
    .join('\n');
}

function main() {
  const args = new Set(process.argv.slice(2));
  const files = discoverPublicCopyFiles();

  if (args.has('--list-files')) {
    console.log(files.map(readableFile).join('\n'));
    return;
  }

  if (args.has('--write')) {
    const changed = healPublicCopy(files);
    console.log(
      changed.length === 0
        ? 'Public copy already matches the plain-language contract.'
        : `Repaired public copy in ${changed.length} file(s):\n${changed.join('\n')}`
    );
  }

  const findings = auditPublicCopy(files);

  if (findings.length > 0) {
    console.error(formatFindings(findings));
    process.exitCode = 1;
    return;
  }

  console.log(`Public copy check passed across ${files.length} file(s).`);
}

if (process.argv[1] && statSync(process.argv[1]).isFile() && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
