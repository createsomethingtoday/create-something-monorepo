import { readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validatePerformancePageContract,
  type PerformancePageRegistryGroup as CanonPerformancePageRegistryGroup
} from '../packages/canon/src/lib/components/performance/page-contract.ts';
import { performancePageRegistry } from '../config/performance-pages/registry.ts';

export const performancePageProperties = [
  'agency',
  'ltd',
  'io',
  'lms',
  'space',
  'ona-agents'
] as const;

export type PerformancePageProperty = (typeof performancePageProperties)[number];
export type PerformancePageRegistryGroup =
  CanonPerformancePageRegistryGroup<PerformancePageProperty>;

export type PerformancePageRegistryEntry = {
  source: string;
  groupId: string;
  property: PerformancePageProperty;
  status: PerformancePageRegistryGroup['status'];
  contract?: PerformancePageRegistryGroup['contract'];
  exclusion?: PerformancePageRegistryGroup['exclusion'];
};

export type PerformancePageAuditResult = {
  ok: boolean;
  errors: string[];
  entries: PerformancePageRegistryEntry[];
  cohorts: Array<{
    groupId: string;
    property: PerformancePageProperty;
    status: PerformancePageRegistryGroup['status'];
    archetype?: NonNullable<PerformancePageRegistryGroup['contract']>['archetype'];
    decision?: string;
    count: number;
    sources: string[];
  }>;
  totals: {
    discovered: number;
    registered: number;
    migrated: number;
    pending: number;
    excluded: number;
  };
};

export function discoverPerformancePageSources(
  workspaceRoot: string,
  properties: readonly PerformancePageProperty[] = performancePageProperties
): string[] {
  const sources: string[] = [];

  for (const property of properties) {
    const routesRoot = join(workspaceRoot, 'packages', property, 'src', 'routes');
    walk(routesRoot, (absolutePath) => {
      if (absolutePath.endsWith(`${sep}+page.svelte`)) {
        sources.push(toPosix(relative(workspaceRoot, absolutePath)));
      }
    });
  }

  return sources.sort();
}

export function auditPerformancePageRegistry(
  discoveredSources: readonly string[],
  groups: readonly PerformancePageRegistryGroup[]
): PerformancePageAuditResult {
  const errors: string[] = [];
  const discovered = new Set(discoveredSources);
  const registrations = new Map<string, PerformancePageRegistryGroup[]>();

  for (const group of groups) {
    if (!group.id.trim()) {
      errors.push('Performance page registry groups require a stable id.');
    }

    if (group.sources.length === 0) {
      errors.push(`${group.id || 'Performance page group'} must register at least one source.`);
    }

    if (group.status === 'technical-exclusion') {
      if (!group.exclusion?.reason.trim()) {
        errors.push(`${group.id} requires a specific technical exclusion reason.`);
      }
      if (group.contract) {
        errors.push(
          `${group.id} cannot combine a technical exclusion with a rendered page contract.`
        );
      }
    } else if (!group.contract) {
      errors.push(
        `${group.id} requires a Performance page contract while status is ${group.status}.`
      );
    } else {
      const validation = validatePerformancePageContract({ id: group.id, ...group.contract });
      errors.push(...validation.errors);
    }

		for (const source of group.sources) {
			const normalizedSource = toPosix(source);
			if (!normalizedSource.startsWith(`packages/${group.property}/src/routes/`)) {
				errors.push(`${group.id} assigns ${normalizedSource} to property ${group.property}.`);
			}
			const matches = registrations.get(normalizedSource) ?? [];
      matches.push(group);
      registrations.set(normalizedSource, matches);

      if (!discovered.has(normalizedSource)) {
        errors.push(`${group.id} registers missing page source ${normalizedSource}.`);
      }
    }
  }

  for (const source of discoveredSources) {
    const matches = registrations.get(source) ?? [];
    if (matches.length === 0) {
      errors.push(`${source} is not registered in the Performance page system.`);
    } else if (matches.length > 1) {
      errors.push(
        `${source} is registered by multiple groups: ${matches.map((group) => group.id).join(', ')}.`
      );
    }
  }

  const entries = discoveredSources
    .flatMap((source) => {
      const group = registrations.get(source)?.[0];
      if (!group) return [];
      return [
        {
          source,
          groupId: group.id,
          property: group.property,
          status: group.status,
          contract: group.contract,
          exclusion: group.exclusion
        } satisfies PerformancePageRegistryEntry
      ];
    })
    .sort((left, right) => left.source.localeCompare(right.source));
  const cohorts = [...new Set(entries.map((entry) => entry.groupId))].sort().map((groupId) => {
    const cohortEntries = entries.filter((entry) => entry.groupId === groupId);
    const first = cohortEntries[0];
    return {
      groupId,
      property: first.property,
      status: first.status,
      archetype: first.contract?.archetype,
      decision: first.contract?.decision,
      count: cohortEntries.length,
      sources: cohortEntries.map((entry) => entry.source)
    };
  });

  return {
    ok: errors.length === 0,
    errors,
    entries,
    cohorts,
    totals: {
      discovered: discoveredSources.length,
      registered: entries.length,
      migrated: entries.filter((entry) => entry.status === 'migrated').length,
      pending: entries.filter((entry) => entry.status === 'pending').length,
      excluded: entries.filter((entry) => entry.status === 'technical-exclusion').length
    }
  };
}

export function runPerformancePageAudit(workspaceRoot: string): PerformancePageAuditResult {
  return auditPerformancePageRegistry(
    discoverPerformancePageSources(workspaceRoot),
    performancePageRegistry as PerformancePageRegistryGroup[]
  );
}

function walk(directory: string, visit: (absolutePath: string) => void) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, visit);
    } else if (entry.isFile()) {
      visit(absolutePath);
    }
  }
}

function toPosix(value: string) {
  return value.split(sep).join('/');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = runPerformancePageAudit(workspaceRoot);
  const requireMigrated = process.argv.includes('--require-migrated');
  const errors = [...result.errors];

  if (requireMigrated && result.totals.pending > 0) {
    errors.push(`${result.totals.pending} registered page implementation(s) remain pending.`);
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...result, ok: errors.length === 0, errors }, null, 2));
  } else {
    console.log(
      `Performance page registry: ${result.totals.registered}/${result.totals.discovered} registered, ${result.totals.migrated} migrated, ${result.totals.pending} pending, ${result.totals.excluded} technical exclusions.`
    );
    for (const error of errors) console.error(`- ${error}`);
  }

  if (errors.length > 0) process.exitCode = 1;
}
