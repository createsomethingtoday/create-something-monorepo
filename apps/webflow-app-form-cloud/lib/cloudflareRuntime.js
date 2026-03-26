export async function getCloudflareEnv(runtime = {}) {
  if (runtime.env) {
    return runtime.env;
  }

  try {
    const { getRuntimeCloudflareEnv } = await import('../cloudflare.env');
    const env = await getRuntimeCloudflareEnv();
    if (env) {
      return env;
    }
  } catch {
    // Webflow Cloud can omit the root helper during local setup.
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const context = await getCloudflareContext({ async: true });
    return context?.env || null;
  } catch {
    return null;
  }
}

export async function getEnvValue(name, runtime = {}) {
  const env = await getCloudflareEnv(runtime);
  if (env && env[name] !== undefined) {
    return env[name];
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }

  return undefined;
}
