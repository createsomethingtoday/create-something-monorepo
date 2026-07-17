export async function resolve(specifier, context, nextResolve) {
  if (specifier === '$app/environment') {
    return {
      url: new URL('./sveltekit-environment-stub.mjs', import.meta.url).href,
      shortCircuit: true
    };
  }

  return nextResolve(specifier, context);
}
