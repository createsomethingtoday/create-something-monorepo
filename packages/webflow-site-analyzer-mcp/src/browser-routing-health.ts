import type { BrowserProviderRuntimeConfig } from './providers/index.js';

export interface BrowserRoutingHealth {
  configured: boolean;
  primary: string | null;
  policy: {
    statelessPublic: string[];
    sessionful: string[];
  } | null;
  incumbentRollbackConfigured: boolean;
}

export function createBrowserRoutingHealth(
  config: BrowserProviderRuntimeConfig | undefined,
  activeProvider: string | null,
): BrowserRoutingHealth {
  const browserRunConfigured = Boolean(
    config?.cloudflareBrowserRunEnabled !== false
    && config?.cloudflareAccountId
    && config.cloudflareBrowserRunApiToken,
  );
  return {
    configured: browserRunConfigured,
    primary: browserRunConfigured ? 'cloudflare-kitesurf' : activeProvider,
    policy: browserRunConfigured
      ? {
        statelessPublic: ['cloudflare-kitesurf', 'cloudflare-chromium'],
        sessionful: ['cloudflare-chromium'],
      }
      : null,
    incumbentRollbackConfigured: Boolean(config?.steelApiKey || config?.browserlessToken),
  };
}
