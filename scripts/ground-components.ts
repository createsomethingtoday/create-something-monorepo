#!/usr/bin/env npx tsx
/**
 * Ground Component Locality Check
 * 
 * Standalone implementation of component-locality.yml patterns.
 * Detects components in route directories that should be in Canon.
 * 
 * Usage:
 *   pnpm ground:components              # Check for misplaced components
 *   pnpm ground:components --json       # JSON output for CI
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename, dirname } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration (from component-locality.yml)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_PATHS = [
  'packages/ltd/src/routes',
  'packages/agency/src/routes',
  'packages/space/src/routes',
  'packages/io/src/routes',
];

// SvelteKit page components (allowed in routes)
const ALLOWED_FILENAMES = [
  '+page.svelte',
  '+layout.svelte',
  '+error.svelte',
  '+loading.svelte',
];

const IGNORE_PATHS = [
  'node_modules',
  '.svelte-kit',
];

// Property mapping for suggestions
const PROPERTY_MAP: Record<string, string> = {
  'packages/ltd/': 'ltd',
  'packages/agency/': 'agency',
  'packages/space/': 'space',
  'packages/io/': 'io',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MisplacedComponent {
  file: string;
  filename: string;
  property: string;
  experiment?: string;
  hasProps: boolean;
  hasSlots: boolean;
  suggestedLocation: string;
}

interface Results {
  components: MisplacedComponent[];
  filesScanned: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detection
// ─────────────────────────────────────────────────────────────────────────────

function* walkSvelteFiles(dir: string): Generator<string> {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (IGNORE_PATHS.some(ignore => fullPath.includes(ignore))) {
        continue;
      }
      
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        yield* walkSvelteFiles(fullPath);
      } else if (entry.endsWith('.svelte')) {
        yield fullPath;
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

function getProperty(filePath: string): string {
  for (const [prefix, property] of Object.entries(PROPERTY_MAP)) {
    if (filePath.includes(prefix)) {
      return property;
    }
  }
  return 'unknown';
}

function getExperiment(filePath: string): string | undefined {
  const match = filePath.match(/\/routes\/experiments\/([^/]+)\//);
  return match ? match[1] : undefined;
}

function isComponentFile(filePath: string, content: string): boolean {
  const filename = basename(filePath);
  
  // Skip SvelteKit page components
  if (ALLOWED_FILENAMES.includes(filename)) {
    return false;
  }
  
  // Must be a .svelte file that's not a page
  if (!filename.endsWith('.svelte')) {
    return false;
  }
  
  // Check for component indicators
  const hasProps = content.includes('$props()') || content.includes('export let');
  const hasSlots = content.includes('<slot');
  const hasExport = content.includes('export default');
  
  // If it has props, slots, or exports, it's a component
  return hasProps || hasSlots || hasExport;
}

function suggestLocation(component: MisplacedComponent): string {
  if (component.experiment) {
    return `@create-something/canon/experiments/${component.experiment}/`;
  }
  return `@create-something/canon/domains/${component.property}/`;
}

function scanForMisplacedComponents(): Results {
  const components: MisplacedComponent[] = [];
  let filesScanned = 0;
  
  for (const routePath of ROUTE_PATHS) {
    for (const filePath of walkSvelteFiles(routePath)) {
      filesScanned++;
      
      try {
        const content = readFileSync(filePath, 'utf-8');
        
        if (isComponentFile(filePath, content)) {
          const property = getProperty(filePath);
          const experiment = getExperiment(filePath);
          const hasProps = content.includes('$props()') || content.includes('export let');
          const hasSlots = content.includes('<slot');
          
          const component: MisplacedComponent = {
            file: filePath,
            filename: basename(filePath),
            property,
            experiment,
            hasProps,
            hasSlots,
            suggestedLocation: '',
          };
          component.suggestedLocation = suggestLocation(component);
          
          components.push(component);
        }
      } catch {
        // Skip unreadable files
      }
    }
  }
  
  return { components, filesScanned };
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
  lines.push('│  Ground Component Locality Check                                │');
  lines.push('└─────────────────────────────────────────────────────────────────┘');
  lines.push('');
  
  if (results.components.length === 0) {
    lines.push('✓ No misplaced components found');
    lines.push(`  Scanned ${results.filesScanned} Svelte files in route directories`);
    return lines.join('\n');
  }
  
  // Group by experiment
  const byExperiment = new Map<string, MisplacedComponent[]>();
  const standalone: MisplacedComponent[] = [];
  
  for (const c of results.components) {
    if (c.experiment) {
      const existing = byExperiment.get(c.experiment) || [];
      existing.push(c);
      byExperiment.set(c.experiment, existing);
    } else {
      standalone.push(c);
    }
  }
  
  if (byExperiment.size > 0) {
    lines.push(`⚠ Components in Experiment Routes (${results.components.length - standalone.length})`);
    lines.push('─'.repeat(60));
    
    for (const [experiment, components] of byExperiment) {
      lines.push(`\n  experiments/${experiment}/`);
      for (const c of components) {
        const props = c.hasProps ? '(has props)' : '';
        const slots = c.hasSlots ? '(has slots)' : '';
        lines.push(`    ${c.filename} ${props} ${slots}`.trim());
      }
      lines.push(`    → Move to: ${components[0].suggestedLocation}`);
    }
  }
  
  if (standalone.length > 0) {
    lines.push(`\n⚠ Components in Other Routes (${standalone.length})`);
    lines.push('─'.repeat(60));
    
    for (const c of standalone) {
      lines.push(`\n  ${relative(process.cwd(), c.file)}`);
      lines.push(`    → Move to: ${c.suggestedLocation}`);
    }
  }
  
  lines.push('');
  lines.push('─'.repeat(60));
  lines.push(`Summary: ${results.components.length} components should move to Canon`);
  lines.push('');
  lines.push('The Graduation Pattern:');
  lines.push('  • 1-of-1 (experiment-specific) → canon/experiments/{name}/');
  lines.push('  • Property-specific → canon/domains/{property}/');
  lines.push('  • Shared (2+ uses) → canon/components/');
  lines.push('');
  
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  
  console.log(jsonOutput ? '' : '\nScanning route directories for misplaced components...\n');
  
  const results = scanForMisplacedComponents();
  console.log(formatResults(results, jsonOutput));
  
  process.exit(results.components.length > 0 ? 1 : 0);
}

main();
