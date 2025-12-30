/**
 * Infrastructure Edge Extractor
 *
 * Parses wrangler.toml/wrangler.jsonc to discover shared Cloudflare resources.
 * Captures hidden dependencies: packages sharing D1, KV, R2, or service bindings.
 *
 * Heideggerian framing:
 * - Infrastructure dependencies are Vorhandenheit (present-at-hand)
 * - They become visible only when they break (Breakdown)
 * - This extractor makes them permanently visible for navigation
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { glob } from 'glob';
import * as TOML from '@iarna/toml';
import type { GraphEdge } from '../types.js';

export interface InfraBinding {
  type: 'd1' | 'kv' | 'r2' | 'service' | 'queue' | 'ai' | 'durable_object';
  binding: string;
  resourceId: string; // database_id, namespace_id, bucket_name, etc.
  packagePath: string;
}

export interface InfraEdge extends GraphEdge {
  metadata: {
    resourceType: string;
    resourceId: string;
    binding: string;
  };
}

/**
 * Parse a wrangler config file (TOML or JSONC)
 */
function parseWranglerConfig(filePath: string): Record<string, unknown> {
  const content = readFileSync(filePath, 'utf-8');

  if (filePath.endsWith('.toml')) {
    return TOML.parse(content) as Record<string, unknown>;
  }

  // JSONC - strip comments
  const jsonContent = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  return JSON.parse(jsonContent);
}

/**
 * Extract bindings from a wrangler config
 */
function extractBindings(config: Record<string, unknown>, packagePath: string): InfraBinding[] {
  const bindings: InfraBinding[] = [];

  // D1 Databases
  const d1 = config.d1_databases as Array<{ binding: string; database_id: string }> | undefined;
  if (d1) {
    for (const db of d1) {
      bindings.push({
        type: 'd1',
        binding: db.binding,
        resourceId: db.database_id,
        packagePath,
      });
    }
  }

  // KV Namespaces
  const kv = config.kv_namespaces as Array<{ binding: string; id: string }> | undefined;
  if (kv) {
    for (const ns of kv) {
      bindings.push({
        type: 'kv',
        binding: ns.binding,
        resourceId: ns.id,
        packagePath,
      });
    }
  }

  // R2 Buckets
  const r2 = config.r2_buckets as Array<{ binding: string; bucket_name: string }> | undefined;
  if (r2) {
    for (const bucket of r2) {
      bindings.push({
        type: 'r2',
        binding: bucket.binding,
        resourceId: bucket.bucket_name,
        packagePath,
      });
    }
  }

  // Service Bindings
  const services = config.services as Array<{ binding: string; service: string }> | undefined;
  if (services) {
    for (const svc of services) {
      bindings.push({
        type: 'service',
        binding: svc.binding,
        resourceId: svc.service,
        packagePath,
      });
    }
  }

  // AI binding
  const ai = config.ai as { binding: string } | undefined;
  if (ai) {
    bindings.push({
      type: 'ai',
      binding: ai.binding,
      resourceId: 'workers-ai',
      packagePath,
    });
  }

  return bindings;
}

/**
 * Get package name from wrangler config path
 */
function getPackageName(wranglerPath: string, rootDir: string): string {
  const relative = wranglerPath.replace(rootDir, '').replace(/^\//, '');
  const parts = relative.split('/');

  // packages/io/wrangler.jsonc → io
  // packages/agency/workers/social-poster/wrangler.toml → agency/workers/social-poster
  if (parts[0] === 'packages' && parts.length >= 2) {
    if (parts[2] === 'workers' && parts.length >= 4) {
      return `${parts[1]}/${parts[2]}/${parts[3]}`;
    }
    return parts[1];
  }

  return dirname(relative);
}

/**
 * Extract infrastructure edges from all wrangler configs in the monorepo
 */
export async function extractInfrastructureEdges(rootDir: string): Promise<InfraEdge[]> {
  const pattern = resolve(rootDir, '**/wrangler.{toml,jsonc}');
  const files = await glob(pattern, {
    ignore: ['**/node_modules/**'],
  });

  // Collect all bindings
  const allBindings: InfraBinding[] = [];

  for (const file of files) {
    try {
      const config = parseWranglerConfig(file);
      const packagePath = getPackageName(file, rootDir);
      const bindings = extractBindings(config, packagePath);
      allBindings.push(...bindings);
    } catch (error) {
      console.warn(`Failed to parse ${file}:`, error);
    }
  }

  // Group by resource ID to find shared resources
  const resourceGroups = new Map<string, InfraBinding[]>();
  for (const binding of allBindings) {
    const key = `${binding.type}:${binding.resourceId}`;
    if (!resourceGroups.has(key)) {
      resourceGroups.set(key, []);
    }
    resourceGroups.get(key)!.push(binding);
  }

  // Create edges between packages that share resources
  const edges: InfraEdge[] = [];

  for (const [resourceKey, bindings] of resourceGroups) {
    if (bindings.length < 2) continue; // No sharing

    // Create edges between all pairs
    for (let i = 0; i < bindings.length; i++) {
      for (let j = i + 1; j < bindings.length; j++) {
        const a = bindings[i];
        const b = bindings[j];

        edges.push({
          source: a.packagePath,
          target: b.packagePath,
          type: 'infrastructure',
          weight: a.type === 'd1' ? 1.0 : 0.7, // D1 sharing is highest coupling
          metadata: {
            resourceType: a.type,
            resourceId: a.resourceId,
            binding: `${a.binding} ↔ ${b.binding}`,
          },
        });
      }
    }
  }

  return edges;
}

/**
 * Generate infrastructure graph summary
 */
export function summarizeInfrastructure(edges: InfraEdge[]): string {
  const byType = new Map<string, InfraEdge[]>();

  for (const edge of edges) {
    const type = edge.metadata.resourceType;
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(edge);
  }

  let summary = '## Infrastructure Dependencies\n\n';

  for (const [type, typeEdges] of byType) {
    summary += `### ${type.toUpperCase()} Sharing\n\n`;
    for (const edge of typeEdges) {
      summary += `- \`${edge.source}\` ↔ \`${edge.target}\` via ${edge.metadata.resourceId}\n`;
    }
    summary += '\n';
  }

  return summary;
}
