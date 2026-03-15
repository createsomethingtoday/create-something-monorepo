/**
 * @create-something/harness
 *
 * Config Loader: Load and merge harness configuration.
 * Philosophy: Crystallize human judgment into configurable constraints.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { HarnessConfig } from '../types.js';
import { DEFAULT_HARNESS_CONFIG } from '../types.js';
import { validateConfig } from './schema.js';

/**
 * Configuration file names to search for (in order of priority).
 */
const CONFIG_FILE_NAMES = [
  'harness.config.yaml',
  'harness.config.yml',
  '.harnessrc.yaml',
  '.harnessrc.yml',
];

/**
 * Search for a config file in the given directory and its parents.
 */
async function findConfigFile(startDir: string): Promise<string | null> {
  let currentDir = resolve(startDir);
  const root = dirname(currentDir);

  while (currentDir !== root) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const configPath = resolve(currentDir, fileName);
      if (existsSync(configPath)) {
        return configPath;
      }
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Deep merge two objects, with source values overriding target values.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load external prompt file content.
 */
async function loadExternalPrompt(
  promptPath: string,
  configDir: string
): Promise<string | null> {
  if (!promptPath.startsWith('./') && !promptPath.startsWith('../')) {
    // Not a file path, return as-is (inline prompt or package ref)
    return null;
  }

  const fullPath = resolve(configDir, promptPath);
  if (!existsSync(fullPath)) {
    console.warn(`Warning: Prompt file not found: ${fullPath}`);
    return null;
  }

  return readFile(fullPath, 'utf-8');
}

/**
 * Load harness configuration from file or defaults.
 *
 * @param configPath - Explicit path to config file (optional)
 * @param cwd - Working directory to search for config (optional)
 * @returns Loaded and merged configuration
 */
export async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<{ config: HarnessConfig; configPath: string | null }> {
  let effectivePath: string | null = null;

  // 1. Use explicit path if provided
  if (configPath) {
    effectivePath = resolve(cwd, configPath);
    if (!existsSync(effectivePath)) {
      throw new Error(`Config file not found: ${effectivePath}`);
    }
  } else {
    // 2. Search for config file
    effectivePath = await findConfigFile(cwd);
  }

  // 3. If no config file found, return defaults
  if (!effectivePath) {
    return { config: DEFAULT_HARNESS_CONFIG, configPath: null };
  }

  // 4. Load and parse config file
  const configContent = await readFile(effectivePath, 'utf-8');
  let userConfig: Partial<HarnessConfig>;

  try {
    userConfig = parseYaml(configContent) as Partial<HarnessConfig>;
  } catch (error) {
    throw new Error(
      `Failed to parse config file ${effectivePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // 5. Validate config
  const validation = validateConfig(userConfig);
  if (!validation.valid) {
    throw new Error(
      `Invalid config file ${effectivePath}:\n${validation.errors.join('\n')}`
    );
  }

  // 6. Merge with defaults
  const mergedConfig = deepMerge(
    DEFAULT_HARNESS_CONFIG as unknown as Record<string, unknown>,
    userConfig as Record<string, unknown>
  ) as unknown as HarnessConfig;

  // 7. Load external prompts for reviewers
  const configDir = dirname(effectivePath);
  for (const reviewer of mergedConfig.reviewers.reviewers) {
    if (reviewer.prompt) {
      const externalPrompt = await loadExternalPrompt(reviewer.prompt, configDir);
      if (externalPrompt) {
        reviewer.prompt = externalPrompt;
      }
    }
  }

  return { config: mergedConfig, configPath: effectivePath };
}

/**
 * Get the effective model routing config, with pattern matching.
 */
export function getModelFromConfig(
  config: HarnessConfig,
  title: string,
  labels: string[]
): 'opus' | 'sonnet' | 'haiku' {
  const titleLower = title.toLowerCase();

  // 1. Explicit label override (highest priority)
  if (labels.includes('model:haiku')) return 'haiku';
  if (labels.includes('model:sonnet')) return 'sonnet';
  if (labels.includes('model:opus')) return 'opus';

  // 2. Complexity from spec (second priority)
  if (labels.includes('complexity:trivial')) return config.modelRouting.complexity.trivial;
  if (labels.includes('complexity:simple')) return config.modelRouting.complexity.simple;
  if (labels.includes('complexity:standard')) return config.modelRouting.complexity.standard;
  if (labels.includes('complexity:complex')) return config.modelRouting.complexity.complex;

  // 3. Pattern matching (third priority)
  const { patterns } = config.modelRouting;

  // Check haiku patterns first (cheapest)
  if (patterns.haiku.some(p => titleLower.includes(p.toLowerCase()))) {
    return 'haiku';
  }

  // Check opus patterns (most expensive but capable)
  if (patterns.opus.some(p => titleLower.includes(p.toLowerCase()))) {
    return 'opus';
  }

  // Check sonnet patterns
  if (patterns.sonnet.some(p => titleLower.includes(p.toLowerCase()))) {
    return 'sonnet';
  }

  // 4. Default
  return config.modelRouting.default;
}

/**
 * Format config for display.
 */
export function formatConfigDisplay(config: HarnessConfig, configPath: string | null): string {
  const lines: string[] = [];

  lines.push('┌────────────────────────────────────────────────────────────────┐');
  lines.push('│  HARNESS CONFIGURATION                                        │');
  lines.push('├────────────────────────────────────────────────────────────────┤');

  if (configPath) {
    lines.push(`│  Source: ${configPath.slice(0, 50).padEnd(50)} │`);
  } else {
    lines.push('│  Source: Built-in CREATE SOMETHING defaults                   │');
  }

  lines.push('├────────────────────────────────────────────────────────────────┤');
  lines.push('│  Model Routing:                                                │');
  lines.push(`│    Default: ${config.modelRouting.default.padEnd(47)} │`);
  lines.push(`│    Haiku patterns: ${config.modelRouting.patterns.haiku.length.toString().padEnd(40)} │`);
  lines.push(`│    Sonnet patterns: ${config.modelRouting.patterns.sonnet.length.toString().padEnd(39)} │`);
  lines.push(`│    Opus patterns: ${config.modelRouting.patterns.opus.length.toString().padEnd(41)} │`);
  lines.push('├────────────────────────────────────────────────────────────────┤');
  lines.push('│  Quality Gates:                                                │');

  const enabledGates: string[] = [];
  if (config.qualityGates.builtIn.tests) enabledGates.push('tests');
  if (config.qualityGates.builtIn.typecheck) enabledGates.push('typecheck');
  if (config.qualityGates.builtIn.lint) enabledGates.push('lint');
  if (config.qualityGates.builtIn.build) enabledGates.push('build');
  enabledGates.push(...config.qualityGates.custom.map(g => g.name));

  lines.push(`│    Enabled: ${enabledGates.join(', ').slice(0, 48).padEnd(48)} │`);
  lines.push('├────────────────────────────────────────────────────────────────┤');
  lines.push('│  Reviewers:                                                    │');

  const enabledReviewers = config.reviewers.reviewers
    .filter(r => r.enabled)
    .map(r => r.id)
    .join(', ');

  lines.push(`│    Enabled: ${enabledReviewers.slice(0, 48).padEnd(48)} │`);
  lines.push('├────────────────────────────────────────────────────────────────┤');
  lines.push('│  Labels:                                                       │');
  lines.push(`│    Scope: ${config.labels.scope.join(', ').slice(0, 50).padEnd(50)} │`);
  lines.push(`│    Type: ${config.labels.type.join(', ').slice(0, 51).padEnd(51)} │`);
  lines.push('└────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}
