/**
 * @create-something/harness
 *
 * Runtime Configuration: Multi-provider support for AI coding agents.
 * Upstream pattern from Gas Town v0.2.2+.
 *
 * Philosophy: The tool recedes; the work remains.
 * Runtime switching should be transparent - you say "do the work"
 * and the right provider handles it.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported runtime providers.
 * Matches Gas Town's built-in agent presets.
 */
export type RuntimeProvider =
  | 'claude'   // Claude Code CLI (default)
  | 'codex'    // OpenAI Codex CLI
  | 'gemini'   // Google Gemini
  | 'cursor'   // Cursor IDE agent
  | 'auggie'   // Augmented AI
  | 'amp'      // Anthropic Model Provider (internal)
  | 'custom';  // User-defined

/**
 * Prompt injection mode for runtimes without native hooks.
 */
export type PromptMode =
  | 'hook'     // Use native hooks (Claude)
  | 'prime'    // Send startup prime command
  | 'inject'   // Inject mail at startup
  | 'none';    // No prompt injection

/**
 * Runtime configuration for a single provider.
 */
export interface RuntimeConfig {
  /** Provider identifier */
  provider: RuntimeProvider;
  /** Command to invoke the runtime */
  command: string;
  /** Additional command arguments */
  args: string[];
  /** How to inject prompts/context */
  promptMode: PromptMode;
  /** Model to use (provider-specific) */
  model?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Working directory override */
  cwd?: string;
}

/**
 * Agent preset configuration.
 * Maps preset names to runtime configs.
 */
export interface AgentPreset {
  name: string;
  description: string;
  runtime: RuntimeConfig;
}

/**
 * Settings configuration (settings/config.json).
 */
export interface SettingsConfig {
  /** Default runtime for this workspace */
  runtime: RuntimeConfig;
  /** Named agent presets */
  agentPresets?: Record<string, AgentPreset>;
  /** Default agent preset name */
  defaultAgent?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in Agent Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Built-in agent presets matching Gas Town.
 */
export const BUILT_IN_PRESETS: Record<string, AgentPreset> = {
  claude: {
    name: 'claude',
    description: 'Claude Code CLI (default)',
    runtime: {
      provider: 'claude',
      command: 'claude',
      args: [],
      promptMode: 'hook',
    },
  },
  'claude-haiku': {
    name: 'claude-haiku',
    description: 'Claude Code with Haiku model (~$0.001)',
    runtime: {
      provider: 'claude',
      command: 'claude',
      args: ['--model', 'haiku'],
      promptMode: 'hook',
      model: 'haiku',
    },
  },
  'claude-sonnet': {
    name: 'claude-sonnet',
    description: 'Claude Code with Sonnet model (~$0.01)',
    runtime: {
      provider: 'claude',
      command: 'claude',
      args: ['--model', 'sonnet'],
      promptMode: 'hook',
      model: 'sonnet',
    },
  },
  'claude-opus': {
    name: 'claude-opus',
    description: 'Claude Code with Opus model (~$0.10)',
    runtime: {
      provider: 'claude',
      command: 'claude',
      args: ['--model', 'opus'],
      promptMode: 'hook',
      model: 'opus',
    },
  },
  codex: {
    name: 'codex',
    description: 'OpenAI Codex CLI',
    runtime: {
      provider: 'codex',
      command: 'codex',
      args: [],
      promptMode: 'prime', // Codex needs prime command
    },
  },
  gemini: {
    name: 'gemini',
    description: 'Google Gemini CLI',
    runtime: {
      provider: 'gemini',
      command: 'gemini',
      args: [],
      promptMode: 'prime',
    },
  },
  cursor: {
    name: 'cursor',
    description: 'Cursor IDE agent',
    runtime: {
      provider: 'cursor',
      command: 'cursor',
      args: ['--agent'],
      promptMode: 'none',
    },
  },
  auggie: {
    name: 'auggie',
    description: 'Augmented AI agent',
    runtime: {
      provider: 'auggie',
      command: 'auggie',
      args: [],
      promptMode: 'inject',
    },
  },
  amp: {
    name: 'amp',
    description: 'Anthropic Model Provider (internal)',
    runtime: {
      provider: 'amp',
      command: 'amp',
      args: [],
      promptMode: 'hook',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default runtime configuration (Claude Code).
 */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  provider: 'claude',
  command: 'claude',
  args: [],
  promptMode: 'hook',
};

/**
 * Default settings configuration.
 */
export const DEFAULT_SETTINGS_CONFIG: SettingsConfig = {
  runtime: DEFAULT_RUNTIME_CONFIG,
  agentPresets: BUILT_IN_PRESETS,
  defaultAgent: 'claude',
};

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Loading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load runtime configuration from settings/config.json.
 * Falls back to defaults if not found.
 */
export function loadRuntimeConfig(cwd: string = process.cwd()): SettingsConfig {
  const configPaths = [
    join(cwd, 'settings', 'config.json'),
    join(cwd, '.gastown', 'config.json'),
    join(cwd, '.claude', 'runtime.json'),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as Partial<SettingsConfig>;
        return mergeWithDefaults(config);
      } catch (error) {
        console.error(`Failed to parse ${configPath}:`, (error as Error).message);
      }
    }
  }

  // Check home directory for global config
  const globalConfigPath = join(homedir(), '.gastown', 'config.json');
  if (existsSync(globalConfigPath)) {
    try {
      const content = readFileSync(globalConfigPath, 'utf-8');
      const config = JSON.parse(content) as Partial<SettingsConfig>;
      return mergeWithDefaults(config);
    } catch (error) {
      console.error(`Failed to parse global config:`, (error as Error).message);
    }
  }

  return DEFAULT_SETTINGS_CONFIG;
}

/**
 * Merge partial config with defaults.
 */
function mergeWithDefaults(config: Partial<SettingsConfig>): SettingsConfig {
  return {
    runtime: config.runtime ?? DEFAULT_RUNTIME_CONFIG,
    agentPresets: {
      ...BUILT_IN_PRESETS,
      ...config.agentPresets,
    },
    defaultAgent: config.defaultAgent ?? 'claude',
  };
}

/**
 * Save runtime configuration.
 */
export function saveRuntimeConfig(
  config: SettingsConfig,
  cwd: string = process.cwd()
): void {
  const configPath = join(cwd, 'settings', 'config.json');
  const settingsDir = join(cwd, 'settings');

  // Ensure settings directory exists
  if (!existsSync(settingsDir)) {
    const { mkdirSync } = require('node:fs');
    mkdirSync(settingsDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve an agent preset by name.
 * Returns the runtime config for the agent.
 */
export function resolveAgent(
  agentName: string,
  settings?: SettingsConfig
): RuntimeConfig {
  const config = settings ?? loadRuntimeConfig();

  // Check custom presets first
  if (config.agentPresets?.[agentName]) {
    return config.agentPresets[agentName].runtime;
  }

  // Check built-in presets
  if (BUILT_IN_PRESETS[agentName]) {
    return BUILT_IN_PRESETS[agentName].runtime;
  }

  // If it looks like a command, create a custom runtime
  if (agentName.includes(' ')) {
    const [command, ...args] = agentName.split(' ');
    return {
      provider: 'custom',
      command,
      args,
      promptMode: 'prime',
    };
  }

  // Default to using the name as the command
  return {
    provider: 'custom',
    command: agentName,
    args: [],
    promptMode: 'prime',
  };
}

/**
 * Build the full command array for a runtime.
 */
export function buildRuntimeCommand(
  runtime: RuntimeConfig,
  extraArgs: string[] = []
): string[] {
  return [runtime.command, ...runtime.args, ...extraArgs];
}

/**
 * Format runtime for display.
 */
export function formatRuntime(runtime: RuntimeConfig): string {
  const cmd = buildRuntimeCommand(runtime);
  const model = runtime.model ? ` (${runtime.model})` : '';
  return `${cmd.join(' ')}${model}`;
}

