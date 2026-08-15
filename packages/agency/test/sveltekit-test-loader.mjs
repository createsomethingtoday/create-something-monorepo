import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.svelte')) {
    return {
      url: new URL('./svelte-component-stub.mjs', import.meta.url).href,
      shortCircuit: true
    };
  }

  if (specifier === '$app/environment') {
    return {
      url: new URL('./sveltekit-environment-stub.mjs', import.meta.url).href,
      shortCircuit: true
    };
  }

  if (specifier.startsWith('$lib/')) {
    const sourceUrl = new URL(`../src/lib/${specifier.slice('$lib/'.length)}`, import.meta.url);
    const resolvedUrl = existsSync(fileURLToPath(sourceUrl))
      ? sourceUrl
      : new URL(`${sourceUrl.href}.ts`);
    return {
      url: resolvedUrl.href,
      shortCircuit: true
    };
  }

  return nextResolve(specifier, context);
}
