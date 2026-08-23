const compilerOwnedBundles = new WeakSet<object>();

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const entry of Object.values(value as Record<string, unknown>)) {
    deepFreeze(entry, seen);
  }
  Object.freeze(value);
  return value;
}

export function finalizeCompiledWorkflowBundle<T extends object>(bundle: T): T {
  deepFreeze(bundle);
  compilerOwnedBundles.add(bundle);
  return bundle;
}

export function isCompilerOwnedBundle(value: unknown): value is object {
  return typeof value === 'object' && value !== null && compilerOwnedBundles.has(value);
}
