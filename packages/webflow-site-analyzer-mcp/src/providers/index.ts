/**
 * Browser Provider Factory
 *
 * Creates and manages browser automation providers with automatic fallback.
 *
 * Supported providers:
 * - steel: Steel.dev - AI-optimized, preferred for production cost efficiency
 * - browserless: Browserless.io - retained as an operational fallback
 */

import type {
  AnalyzeOptions,
  BrowserProvider,
  BrowserRequirement,
  BrowserSessionInit,
  ProviderHealthMetrics,
} from '../types.js';
import { createBrowserlessProvider } from './browserless.js';
import {
  createCloudflareBrowserRunProvider,
  type BrowserRunConnect,
} from './cloudflare-browser-run.js';
import { createSteelBrowserProvider } from './steel.js';

export type BrowserOperation =
  | 'analyze'
  | 'screenshot'
  | 'extractDesignerMetadata'
  | 'openSession';

export type BrowserCapability =
  | 'stateless-public'
  | 'visual-public'
  | 'pixel-sensitive'
  | 'designer-authenticated'
  | 'sessionful'
  | BrowserRequirement;

const DEFAULT_OPERATION_CAPABILITIES: Record<BrowserOperation, BrowserCapability> = {
  analyze: 'stateless-public',
  screenshot: 'visual-public',
  extractDesignerMetadata: 'designer-authenticated',
  openSession: 'sessionful',
};

const KITESURF_INCOMPATIBLE_CAPABILITIES = new Set<BrowserCapability>([
  'pixel-sensitive',
  'designer-authenticated',
  'sessionful',
  'webgl',
  'video',
  'real-tls',
  'bot-challenge',
]);

export interface BrowserRouteAttempt {
  provider: string;
  outcome: 'success' | 'failure';
  durationMs: number;
  error?: string;
}

export interface BrowserRoutingReceipt {
  operation: BrowserOperation;
  capability: BrowserCapability;
  selectedProvider: string | null;
  attempts: BrowserRouteAttempt[];
  fallbackReason?: string;
}

export interface BrowserOperationResult<T> {
  data: T;
  receipt: BrowserRoutingReceipt;
}

export interface ProviderManagerConfig {
  primary: string;
  steelApiKey?: string;
  browserlessToken?: string;
  providers?: BrowserProvider[];
  routes?: Partial<Record<BrowserOperation, string[]>>;
  capabilities?: Partial<Record<BrowserOperation, BrowserCapability>>;
  onRouteReceipt?: (receipt: BrowserRoutingReceipt) => void | Promise<void>;
  healthCheckInterval?: number;
}

export interface BrowserProviderRuntimeConfig {
  cloudflareBrowserRunEnabled?: boolean;
  cloudflareAccountId?: string;
  cloudflareBrowserRunApiToken?: string;
  steelApiKey?: string;
  browserlessToken?: string;
  healthCheckIntervalMs?: number;
  onRouteReceipt?: ProviderManagerConfig['onRouteReceipt'];
  connectBrowserRun?: BrowserRunConnect;
}

function computePassiveHealth(metrics: ProviderHealthMetrics): boolean {
  if (metrics.failureCount === 0) return true;
  return metrics.successRate >= 0.5;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function createMetrics(provider: string): ProviderHealthMetrics {
  return {
    provider,
    isHealthy: true,
    lastCheckTime: Date.now(),
    successRate: 1,
    averageLatencyMs: 0,
    failureCount: 0
  };
}

function sanitizeProviderError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:api[_-]?key|token)=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/("Authorization"\s*:\s*")[^"]+/gi, '$1[REDACTED]');
}

export class ProviderManager {
  private readonly providers = new Map<string, BrowserProvider>();
  private readonly healthMetrics = new Map<string, ProviderHealthMetrics>();
  private readonly primaryProviderName: string;
  private readonly fallbackProviderName: string | null;
  private activeProviderName: string;
  private healthCheckTimer?: NodeJS.Timeout;
  private readonly facade: BrowserProvider;
  private readonly routes: Partial<Record<BrowserOperation, string[]>>;
  private readonly capabilities: Record<BrowserOperation, BrowserCapability>;
  private readonly onRouteReceipt?: ProviderManagerConfig['onRouteReceipt'];

  constructor(config: ProviderManagerConfig) {
    for (const provider of config.providers ?? []) {
      this.providers.set(provider.name, provider);
      this.healthMetrics.set(provider.name, createMetrics(provider.name));
    }

    if (config.steelApiKey) {
      const steel = createSteelBrowserProvider(config.steelApiKey);
      this.providers.set(steel.name, steel);
      this.healthMetrics.set(steel.name, createMetrics(steel.name));
    }

    if (config.browserlessToken) {
      const browserless = createBrowserlessProvider(config.browserlessToken);
      this.providers.set(browserless.name, browserless);
      this.healthMetrics.set(browserless.name, createMetrics(browserless.name));
    }

    const desiredPrimary = config.primary;
    const resolvedPrimary =
      this.providers.has(desiredPrimary)
        ? desiredPrimary
        : desiredPrimary === 'steel'
          ? (this.providers.has('steel') ? 'steel' : 'browserless')
          : (this.providers.has('browserless') ? 'browserless' : 'steel');

    if (!resolvedPrimary || !this.providers.has(resolvedPrimary)) {
      throw new Error(
        'No browser provider configured. Configure Cloudflare Browser Run, Steel, or Browserless.',
      );
    }

    this.primaryProviderName = resolvedPrimary;
    this.fallbackProviderName = Array.from(this.providers.keys()).find(
      (name) => name !== resolvedPrimary,
    ) ?? null;
    this.activeProviderName = this.primaryProviderName;
    this.routes = config.routes ?? {};
    this.capabilities = {
      ...DEFAULT_OPERATION_CAPABILITIES,
      ...config.capabilities,
    };
    this.onRouteReceipt = config.onRouteReceipt;
    const resolvedManager = this;

    this.facade = {
      get name() {
        return resolvedManager.activeProviderName;
      },
      analyze: async <T>(url: string, script: string, options?: AnalyzeOptions) =>
        (await resolvedManager.analyzeWithReceipt<T>(url, script, options)).data,
      screenshot: async (url: string, options?: AnalyzeOptions) =>
        (await resolvedManager.screenshotWithReceipt(url, options)).data,
      extractDesignerMetadata: async (url: string, timeout?: number) =>
        (await resolvedManager.extractDesignerMetadataWithReceipt(url, timeout)).data,
      openSession: async (input?: BrowserSessionInit) =>
        (await resolvedManager.openSessionWithReceipt(input)).data,
      healthCheck: async () => resolvedManager.checkHealthActive(),
      getSessionMetrics: () => resolvedManager.getAggregatedSessionMetrics()
    };

    if (config.healthCheckInterval) {
      this.startHealthChecks(config.healthCheckInterval);
    }
  }

  getProvider(): BrowserProvider {
    return this.facade;
  }

  analyzeWithReceipt<T>(
    url: string,
    script: string,
    options?: AnalyzeOptions,
  ): Promise<BrowserOperationResult<T>> {
    return this.runOperation(
      'analyze',
      (provider) => provider.analyze<T>(url, script, options),
      this.classifyCapability('analyze', url, options),
    );
  }

  screenshotWithReceipt(
    url: string,
    options?: AnalyzeOptions,
  ): Promise<BrowserOperationResult<Buffer>> {
    return this.runOperation(
      'screenshot',
      (provider) => provider.screenshot(url, options),
      this.classifyCapability('screenshot', url, options),
    );
  }

  extractDesignerMetadataWithReceipt(
    url: string,
    timeout?: number,
  ): Promise<BrowserOperationResult<Awaited<ReturnType<NonNullable<BrowserProvider['extractDesignerMetadata']>>>>> {
    return this.runOperation('extractDesignerMetadata', (provider) => {
      if (!provider.extractDesignerMetadata) {
        throw new Error(`Provider ${provider.name} does not support extractDesignerMetadata`);
      }
      return provider.extractDesignerMetadata(url, timeout);
    });
  }

  openSessionWithReceipt(
    input?: BrowserSessionInit,
  ): Promise<BrowserOperationResult<Awaited<ReturnType<NonNullable<BrowserProvider['openSession']>>>>> {
    return this.runOperation('openSession', (provider) => {
      if (!provider.openSession) {
        throw new Error(`Provider ${provider.name} does not support openSession`);
      }
      return provider.openSession(input);
    });
  }

  getProviderName(): string {
    return this.activeProviderName;
  }

  getHealthMetrics(): ProviderHealthMetrics[] {
    return Array.from(this.healthMetrics.values());
  }

  async checkHealth(): Promise<boolean> {
    for (const [name, metrics] of this.healthMetrics.entries()) {
      metrics.lastCheckTime = Date.now();
      metrics.isHealthy = computePassiveHealth(metrics);
      if (name === this.primaryProviderName && metrics.isHealthy) {
        this.activeProviderName = this.primaryProviderName;
      }
    }
    return this.healthMetrics.get(this.activeProviderName)?.isHealthy ?? false;
  }

  async checkHealthActive(): Promise<boolean> {
    const provider = this.providers.get(this.activeProviderName);
    if (!provider) return false;

    const metrics = this.healthMetrics.get(this.activeProviderName)!;
    const startTime = Date.now();
    try {
      const isHealthy = await provider.healthCheck();
      const latency = Date.now() - startTime;
      metrics.isHealthy = isHealthy;
      metrics.lastCheckTime = Date.now();
      metrics.averageLatencyMs = (metrics.averageLatencyMs + latency) / 2;
      if (!isHealthy) {
        metrics.failureCount += 1;
        metrics.successRate = Math.max(0, metrics.successRate - 0.1);
        if (this.fallbackProviderName) {
          this.activeProviderName = this.fallbackProviderName;
        }
      } else {
        metrics.successRate = Math.min(1, metrics.successRate + 0.05);
        if (provider.name === this.primaryProviderName) {
          this.activeProviderName = this.primaryProviderName;
        }
      }
      return isHealthy;
    } catch {
      metrics.isHealthy = false;
      metrics.lastCheckTime = Date.now();
      metrics.failureCount += 1;
      metrics.successRate = Math.max(0, metrics.successRate - 0.1);
      if (this.fallbackProviderName) {
        this.activeProviderName = this.fallbackProviderName;
      }
      return false;
    }
  }

  shutdown(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  recordAnalysis(success: boolean, durationMs: number): void {
    const metrics = this.healthMetrics.get(this.activeProviderName);
    if (!metrics) return;

    if (!success) {
      metrics.failureCount += 1;
      metrics.successRate = Math.max(0, metrics.successRate - 0.05);
      if (this.activeProviderName === this.primaryProviderName && this.fallbackProviderName) {
        this.activeProviderName = this.fallbackProviderName;
      }
    } else {
      metrics.successRate = Math.min(1, metrics.successRate + 0.01);
    }

    metrics.averageLatencyMs = (metrics.averageLatencyMs * 0.9) + (durationMs * 0.1);
  }

  private getActiveProvider(): BrowserProvider {
    const provider = this.providers.get(this.activeProviderName);
    if (!provider) {
      throw new Error(`Active provider ${this.activeProviderName} is not configured`);
    }
    return provider;
  }

  private getFallbackProvider(): BrowserProvider | null {
    if (!this.fallbackProviderName) return null;
    return this.providers.get(this.fallbackProviderName) ?? null;
  }

  private startHealthChecks(intervalMs: number): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.checkHealth();
    }, intervalMs);
  }

  private getAggregatedSessionMetrics() {
    const aggregated = Array.from(this.providers.values()).reduce(
      (acc, provider) => {
        const metrics = provider.getSessionMetrics();
        acc.sessionsCreated += metrics.sessionsCreated;
        acc.sessionsClosed += metrics.sessionsClosed;
        acc.sessionErrors += metrics.sessionErrors;
        acc.totalDurationMs += metrics.totalDurationMs;
        acc.pageLoadsCompleted += metrics.pageLoadsCompleted;
        acc.pageLoadErrors += metrics.pageLoadErrors;
        return acc;
      },
      {
        sessionsCreated: 0,
        sessionsClosed: 0,
        sessionErrors: 0,
        totalDurationMs: 0,
        averageDurationMs: 0,
        pageLoadsCompleted: 0,
        pageLoadErrors: 0
      }
    );
    aggregated.averageDurationMs =
      aggregated.sessionsCreated > 0 ? aggregated.totalDurationMs / aggregated.sessionsCreated : 0;
    return aggregated;
  }

  private getOperationRoute(
    operationName: BrowserOperation,
    capability: BrowserCapability,
  ): string[] {
    const configuredRoute = this.routes[operationName];
    if (configuredRoute && configuredRoute.length > 0) {
      return this.filterRouteForCapability(configuredRoute, capability);
    }

    const route = [this.activeProviderName];
    if (this.fallbackProviderName && this.fallbackProviderName !== this.activeProviderName) {
      route.push(this.fallbackProviderName);
    }
    return this.filterRouteForCapability(route, capability);
  }

  private filterRouteForCapability(
    route: string[],
    capability: BrowserCapability,
  ): string[] {
    if (KITESURF_INCOMPATIBLE_CAPABILITIES.has(capability)) {
      return route.filter((provider) => provider !== 'cloudflare-kitesurf');
    }
    return [...route];
  }

  private classifyCapability(
    operationName: BrowserOperation,
    url?: string,
    options?: AnalyzeOptions,
  ): BrowserCapability {
    if (operationName === 'openSession') return 'sessionful';
    if (operationName === 'extractDesignerMetadata') return 'designer-authenticated';
    if (options?.pixelSensitive) return 'pixel-sensitive';
    if (options?.cookies?.length || url?.includes('preview.webflow.com/preview/')) {
      return 'designer-authenticated';
    }
    if (options?.browserRequirement) return options.browserRequirement;
    return this.capabilities[operationName];
  }

  private async runOperation<T>(
    operationName: BrowserOperation,
    operation: (provider: BrowserProvider) => Promise<T>,
    capability: BrowserCapability = this.capabilities[operationName],
  ): Promise<BrowserOperationResult<T>> {
    const route = this.getOperationRoute(operationName, capability);

    let firstError: unknown;
    const attempts: BrowserRouteAttempt[] = [];
    for (const providerName of route) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      const startedAt = Date.now();
      let result: T;
      try {
        result = await operation(provider);
      } catch (error) {
        const safeError = sanitizeProviderError(error);
        firstError ??= new Error(safeError);
        attempts.push({
          provider: providerName,
          outcome: 'failure',
          durationMs: Date.now() - startedAt,
          error: safeError,
        });
        continue;
      }

      attempts.push({
        provider: providerName,
        outcome: 'success',
        durationMs: Date.now() - startedAt,
      });
      const receipt: BrowserRoutingReceipt = {
        operation: operationName,
        capability,
        selectedProvider: providerName,
        attempts,
        fallbackReason: attempts.find((attempt) => attempt.outcome === 'failure')?.error,
      };
      await this.emitRouteReceipt(receipt);
      return { data: result, receipt };
    }

    await this.emitRouteReceipt({
      operation: operationName,
      capability,
      selectedProvider: null,
      attempts,
      fallbackReason: attempts[0]?.error,
    });
    if (firstError !== undefined) throw firstError;
    throw new Error(`No configured browser provider can execute ${operationName}`);
  }

  private async emitRouteReceipt(receipt: BrowserRoutingReceipt): Promise<void> {
    await this.onRouteReceipt?.(receipt);
  }
}

export { createBrowserlessProvider } from './browserless.js';
export { createCloudflareBrowserRunProvider } from './cloudflare-browser-run.js';
export { createSteelBrowserProvider } from './steel.js';

function runtimeConfigFromEnv(): BrowserProviderRuntimeConfig {
  return {
    cloudflareBrowserRunEnabled: process.env.BROWSER_RUN_ENABLED === 'true',
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID,
    cloudflareBrowserRunApiToken:
      process.env.CLOUDFLARE_BROWSER_RUN_API_TOKEN
      || process.env.CLOUDFLARE_API_TOKEN
      || process.env.CF_API_TOKEN,
    steelApiKey: process.env.STEEL_API_KEY,
    browserlessToken: process.env.BROWSERLESS_TOKEN || process.env.BROWSERLESS_API_KEY,
    healthCheckIntervalMs: parsePositiveInt(
      process.env.WEBFLOW_SITE_ANALYZER_HEALTHCHECK_INTERVAL_MS,
    ),
  };
}

function compactRoute(names: Array<string | false | undefined>): string[] {
  return names.filter((name): name is string => typeof name === 'string');
}

export function createProviderManager(
  runtimeConfig: BrowserProviderRuntimeConfig = runtimeConfigFromEnv(),
): ProviderManager {
  const cloudflareConfigured = Boolean(
    runtimeConfig.cloudflareBrowserRunEnabled === true
    && runtimeConfig.cloudflareAccountId
    && runtimeConfig.cloudflareBrowserRunApiToken,
  );
  const cloudflareProviders = cloudflareConfigured
    ? [
      createCloudflareBrowserRunProvider({
        accountId: runtimeConfig.cloudflareAccountId!,
        apiToken: runtimeConfig.cloudflareBrowserRunApiToken!,
        engine: 'kitesurf',
        connect: runtimeConfig.connectBrowserRun,
      }),
      createCloudflareBrowserRunProvider({
        accountId: runtimeConfig.cloudflareAccountId!,
        apiToken: runtimeConfig.cloudflareBrowserRunApiToken!,
        engine: 'chromium',
        connect: runtimeConfig.connectBrowserRun,
      }),
    ]
    : [];
  const primary = cloudflareConfigured
    ? 'cloudflare-kitesurf'
    : runtimeConfig.steelApiKey
      ? 'steel'
      : runtimeConfig.browserlessToken
        ? 'browserless'
        : 'cloudflare-kitesurf';
  const incumbentRoute = compactRoute([
    runtimeConfig.steelApiKey && 'steel',
    runtimeConfig.browserlessToken && 'browserless',
  ]);
  const routes = cloudflareConfigured
    ? {
      analyze: ['cloudflare-kitesurf', 'cloudflare-chromium', ...incumbentRoute],
      screenshot: ['cloudflare-kitesurf', 'cloudflare-chromium', ...incumbentRoute],
      extractDesignerMetadata: ['cloudflare-chromium', ...incumbentRoute],
      openSession: ['cloudflare-chromium', ...incumbentRoute],
    }
    : undefined;

  return new ProviderManager({
    primary,
    providers: cloudflareProviders,
    steelApiKey: runtimeConfig.steelApiKey,
    browserlessToken: runtimeConfig.browserlessToken,
    healthCheckInterval: runtimeConfig.healthCheckIntervalMs,
    routes,
    onRouteReceipt: runtimeConfig.onRouteReceipt,
  });
}
