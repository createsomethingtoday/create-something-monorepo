import { SCOPE_QUEUE_READ, SCOPE_READ, SCOPE_WRITE } from './oauth-access.js';

export interface RuntimePolicyInput {
  authMode?: 'legacy' | 'oauth';
  scopes?: readonly string[];
  forceReadOnly?: boolean;
}

export interface RuntimePolicy {
  allowWrites: boolean;
  queueReadOnly: boolean;
  scopesSupported: string[];
}

export function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/**
 * Resolve the tool and discovery policy once so every authentication path
 * honors an environment-level read-only boundary.
 */
export function resolveRuntimePolicy(input: RuntimePolicyInput): RuntimePolicy {
  const scopes = input.scopes ?? [];
  const queueReadOnly =
    input.authMode === 'oauth' &&
    scopes.includes(SCOPE_QUEUE_READ) &&
    !scopes.includes(SCOPE_READ) &&
    !scopes.includes(SCOPE_WRITE);

  if (input.forceReadOnly) {
    return {
      allowWrites: false,
      queueReadOnly,
      scopesSupported: [SCOPE_READ]
    };
  }

  return {
    allowWrites: input.authMode !== 'oauth' || scopes.includes(SCOPE_WRITE),
    queueReadOnly,
    scopesSupported: [SCOPE_QUEUE_READ, SCOPE_READ, SCOPE_WRITE]
  };
}
