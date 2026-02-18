/**
 * Braintrust integration helpers.
 *
 * Notes:
 * - `braintrust`'s `initLogger()` will prompt for login if no API key is set.
 *   In server/CI contexts that is undesirable, so this wrapper disables tracing
 *   when `BRAINTRUST_API_KEY` is missing.
 * - `wrapOpenAI()` is a no-op when Braintrust isn't configured.
 */

import {
  currentLogger,
  currentSpan,
  flush,
  initLogger,
  setMaskingFunction,
  startSpan,
  traced,
  wrapAnthropic,
  wrapOpenAI,
  wrapOpenAIv4,
  type Logger
} from 'braintrust';

export {
  // Core span APIs
  traced,
  startSpan,
  currentSpan,

  // Logger helpers
  currentLogger,
  flush,

  // LLM provider wrappers
  wrapOpenAI,
  wrapOpenAIv4,
  wrapAnthropic
};

export interface BraintrustConfig {
  apiKey?: string;
  projectName?: string;
  projectId?: string;
  orgName?: string;
  appUrl?: string;
  enabled?: boolean;
  asyncFlush?: boolean;
  maskSecrets?: boolean;
}

let braintrustLogger: Logger<boolean> | null = null;
let braintrustEnabled = true;

function parseEnabled(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return undefined;
}

function defaultMaskSecrets(value: unknown): unknown {
  const seen = new WeakMap<object, unknown>();

  const shouldRedactKey = (key: string): boolean =>
    /(^|_)(api[-_]?key|token|secret|password|authorization|cookie|set-cookie)($|_)/i.test(key);

  const redactString = (input: string): string => {
    const trimmed = input.trim();
    if (/^bearer\\s+/i.test(trimmed)) return '[REDACTED]';
    // Common API key prefixes. Keep heuristic broad; false positives are acceptable.
    if (/\\bsk-[A-Za-z0-9_-]{10,}\\b/.test(trimmed)) return '[REDACTED]';
    if (/\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b/.test(trimmed)) return '[REDACTED]';
    return input;
  };

  const walk = (v: unknown, depth: number): unknown => {
    if (depth > 20) return '[TRUNCATED]';
    if (v === null || v === undefined) return v;

    if (typeof v === 'string') return redactString(v);
    if (typeof v === 'number' || typeof v === 'boolean') return v;

    if (Array.isArray(v)) return v.map((item) => walk(item, depth + 1));

    if (typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const existing = seen.get(obj);
      if (existing) return existing;

      const out: Record<string, unknown> = {};
      seen.set(obj, out);

      for (const [key, val] of Object.entries(obj)) {
        if (shouldRedactKey(key)) {
          out[key] = '[REDACTED]';
        } else {
          out[key] = walk(val, depth + 1);
        }
      }
      return out;
    }

    // Functions, symbols, bigints, etc. Don't leak arbitrary values.
    return String(v);
  };

  return walk(value, 0);
}

/**
 * Initialize the Braintrust logger.
 *
 * This sets Braintrust's "current logger" global, which is what `wrapOpenAI()`
 * and other helpers rely on to emit traces.
 */
export function initBraintrust(options: BraintrustConfig = {}): Logger<boolean> | null {
  const enabled = options.enabled ?? parseEnabled(process.env.BRAINTRUST_ENABLED) ?? true;

  if (!enabled) {
    braintrustEnabled = false;
    braintrustLogger = null;
    return null;
  }

  const apiKey = options.apiKey ?? process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    // Avoid interactive login prompts in non-local environments.
    console.warn('[observability] Missing BRAINTRUST_API_KEY. Braintrust tracing disabled.');
    braintrustEnabled = false;
    braintrustLogger = null;
    return null;
  }

  braintrustEnabled = true;
  const maskSecrets = options.maskSecrets ?? true;
  if (maskSecrets) {
    setMaskingFunction(defaultMaskSecrets);
  }

  braintrustLogger = initLogger({
    apiKey,
    projectName: options.projectName ?? process.env.BRAINTRUST_PROJECT_NAME,
    projectId: options.projectId ?? process.env.BRAINTRUST_PROJECT_ID,
    orgName: options.orgName ?? process.env.BRAINTRUST_ORG_NAME,
    appUrl: options.appUrl ?? process.env.BRAINTRUST_APP_URL,
    asyncFlush: options.asyncFlush ?? true
  });

  return braintrustLogger;
}

export function getBraintrustLogger(): Logger<boolean> | null {
  return braintrustLogger;
}

export function isBraintrustEnabled(): boolean {
  return braintrustEnabled;
}

/**
 * Flush any pending Braintrust logs.
 * Call before process exit (especially in short-lived scripts).
 */
export async function shutdownBraintrust(): Promise<void> {
  if (!braintrustEnabled) return;
  await flush();
  braintrustLogger = null;
}
