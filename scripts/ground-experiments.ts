#!/usr/bin/env npx tsx
/**
 * Ground Experiment Graduation Check
 * 
 * Tracks experiment component usage and suggests graduation.
 * 
 * The Graduation Pattern:
 *   1 use  → stays in experiments/
 *   2+ uses → graduates to components/ or domains/
 * 
 * Usage:
 *   pnpm ground:experiments           # Show status
 *   pnpm ground:experiments --json    # JSON output for CI
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, basename, dirname } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const EXPERIMENTS_PATH = 'packages/canon/src/lib/experiments';

const SEARCH_PATHS = [
  'packages/ltd/src',
  'packages/agency/src',
  'packages/space/src',
  'packages/io/src',
];

const GRADUATION_THRESHOLD = 2;

const EXTENSIONS = ['.ts', '.svelte', '.js'];

const IGNORE_PATHS = [
  'node_modules',
  '.svelte-kit',
  'dist',
  'build',
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ExperimentExport {
  name: string;
  experiment: string;
  type: 'component' | 'function' | 'type' | 'constant';
  importPath: string;
}

interface Usage {
  file: string;
  line: number;
  importStatement: string;
}

interface ExportUsage {
  export: ExperimentExport;
  usages: Usage[];
  shouldGraduate: boolean;
}

interface ExperimentStatus {
  name: string;
  exports: number;
  totalUsages: number;
  graduationCandidates: string[];
}

interface Results {
  experiments: ExperimentStatus[];
  graduationCandidates: ExportUsage[];
  stableExports: ExportUsage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanning
// ─────────────────────────────────────────────────────────────────────────────

function getExperiments(): string[] {
  if (!existsSync(EXPERIMENTS_PATH)) {
    return [];
  }
  
  return readdirSync(EXPERIMENTS_PATH)
    .filter(entry => {
      const fullPath = join(EXPERIMENTS_PATH, entry);
      return statSync(fullPath).isDirectory();
    });
}

function getExportsFromIndex(experiment: string): ExperimentExport[] {
  const indexPath = join(EXPERIMENTS_PATH, experiment, 'index.ts');
  if (!existsSync(indexPath)) {
    return [];
  }
  
  const content = readFileSync(indexPath, 'utf-8');
  const exports: ExperimentExport[] = [];
  const importPath = `@create-something/canon/experiments/${experiment}`;
  
  // Match export { default as Name } from './File.svelte'
  const defaultExports = content.matchAll(/export\s+{\s*default\s+as\s+(\w+)\s*}\s+from/g);
  for (const match of defaultExports) {
    exports.push({
      name: match[1],
      experiment,
      type: 'component',
      importPath,
    });
  }
  
  // Match export { Name } from or export { Name, Other } from
  const namedExports = content.matchAll(/export\s+{\s*([^}]+)\s*}\s+from/g);
  for (const match of namedExports) {
    const names = match[1].split(',').map(n => n.trim().split(' as ').pop()!.trim());
    for (const name of names) {
      if (name && !exports.some(e => e.name === name)) {
        exports.push({
          name,
          experiment,
          type: name[0] === name[0].toUpperCase() ? 'component' : 'function',
          importPath,
        });
      }
    }
  }
  
  // Match export type { Name }
  const typeExports = content.matchAll(/export\s+type\s+{\s*([^}]+)\s*}/g);
  for (const match of typeExports) {
    const names = match[1].split(',').map(n => n.trim());
    for (const name of names) {
      if (name && !exports.some(e => e.name === name)) {
        exports.push({
          name,
          experiment,
          type: 'type',
          importPath,
        });
      }
    }
  }
  
  return exports;
}

function* walkFiles(dir: string): Generator<string> {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (IGNORE_PATHS.some(ignore => fullPath.includes(ignore))) {
        continue;
      }
      
      // Skip the experiments directory itself
      if (fullPath.includes('canon/src/lib/experiments')) {
        continue;
      }
      
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        yield* walkFiles(fullPath);
      } else if (EXTENSIONS.some(ext => entry.endsWith(ext))) {
        yield fullPath;
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

function findUsages(exportItem: ExperimentExport): Usage[] {
  const usages: Usage[] = [];
  
  for (const searchPath of SEARCH_PATHS) {
    for (const filePath of walkFiles(searchPath)) {
      // Skip files within the same experiment's route directory
      // (sub-routes of an experiment don't count as separate usages)
      if (filePath.includes(`/experiments/${exportItem.experiment}/`)) {
        continue;
      }
      
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, lineIndex) => {
          // Check if this line imports from the experiment
          if (line.includes(exportItem.importPath)) {
            // Check if it imports this specific export
            const importMatch = line.match(/import\s+{([^}]+)}/);
            if (importMatch) {
              const imports = importMatch[1].split(',').map(i => i.trim().split(' as ')[0].trim());
              if (imports.includes(exportItem.name)) {
                usages.push({
                  file: filePath,
                  line: lineIndex + 1,
                  importStatement: line.trim(),
                });
              }
            }
          }
        });
      } catch {
        // Skip unreadable files
      }
    }
  }
  
  return usages;
}

function analyzeExperiments(): Results {
  const experiments = getExperiments();
  const experimentStatuses: ExperimentStatus[] = [];
  const graduationCandidates: ExportUsage[] = [];
  const stableExports: ExportUsage[] = [];
  
  for (const experiment of experiments) {
    const exports = getExportsFromIndex(experiment);
    const candidates: string[] = [];
    let totalUsages = 0;
    
    for (const exportItem of exports) {
      const usages = findUsages(exportItem);
      totalUsages += usages.length;
      
      const exportUsage: ExportUsage = {
        export: exportItem,
        usages,
        shouldGraduate: usages.length >= GRADUATION_THRESHOLD,
      };
      
      if (exportUsage.shouldGraduate) {
        graduationCandidates.push(exportUsage);
        candidates.push(exportItem.name);
      } else {
        stableExports.push(exportUsage);
      }
    }
    
    experimentStatuses.push({
      name: experiment,
      exports: exports.length,
      totalUsages,
      graduationCandidates: candidates,
    });
  }
  
  return {
    experiments: experimentStatuses,
    graduationCandidates,
    stableExports,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────────

function formatResults(results: Results, json: boolean): string {
  if (json) {
    return JSON.stringify(results, null, 2);
  }
  
  const lines: string[] = [];
  
  lines.push('');
  lines.push('┌─────────────────────────────────────────────────────────────────┐');
  lines.push('│  Ground Experiment Graduation Check                             │');
  lines.push('└─────────────────────────────────────────────────────────────────┘');
  lines.push('');
  
  // Summary table
  lines.push('Experiment Status');
  lines.push('─'.repeat(70));
  lines.push('');
  lines.push('  Experiment              Exports    Usages    Graduation Candidates');
  lines.push('  ' + '─'.repeat(66));
  
  for (const exp of results.experiments) {
    const name = exp.name.padEnd(22);
    const exports = exp.exports.toString().padStart(7);
    const usages = exp.totalUsages.toString().padStart(9);
    const candidates = exp.graduationCandidates.length > 0 
      ? exp.graduationCandidates.join(', ')
      : '—';
    lines.push(`  ${name}${exports}${usages}    ${candidates}`);
  }
  
  lines.push('');
  
  // Graduation candidates
  if (results.graduationCandidates.length > 0) {
    lines.push(`\n🎓 Ready for Graduation (${results.graduationCandidates.length})`);
    lines.push('─'.repeat(60));
    
    for (const candidate of results.graduationCandidates) {
      lines.push(`\n  ${candidate.export.name} (from ${candidate.export.experiment})`);
      lines.push(`  Used in ${candidate.usages.length} locations:`);
      for (const usage of candidate.usages.slice(0, 3)) {
        lines.push(`    • ${relative(process.cwd(), usage.file)}:${usage.line}`);
      }
      if (candidate.usages.length > 3) {
        lines.push(`    ... and ${candidate.usages.length - 3} more`);
      }
      
      // Suggest graduation target
      if (candidate.export.type === 'component') {
        lines.push(`  → Graduate to: @create-something/canon/components/`);
      } else {
        lines.push(`  → Graduate to: @create-something/canon/utils/`);
      }
    }
  } else {
    lines.push('✓ No graduation candidates (all experiments stable)');
  }
  
  lines.push('');
  lines.push('─'.repeat(60));
  lines.push(`Total: ${results.experiments.length} experiments, ${results.graduationCandidates.length} graduation candidates`);
  lines.push('');
  lines.push('The Graduation Pattern:');
  lines.push(`  • < ${GRADUATION_THRESHOLD} uses  → stays in experiments/`);
  lines.push(`  • ≥ ${GRADUATION_THRESHOLD} uses  → graduates to components/ or domains/`);
  lines.push('');
  
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  
  console.log(jsonOutput ? '' : '\nAnalyzing experiment usage...\n');
  
  const results = analyzeExperiments();
  console.log(formatResults(results, jsonOutput));
  
  // Exit with error if there are graduation candidates (for CI)
  process.exit(results.graduationCandidates.length > 0 ? 1 : 0);
}

main();
