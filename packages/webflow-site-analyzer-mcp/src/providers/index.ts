/**
 * Browser Provider Factory
 *
 * Creates and manages browser automation providers with automatic fallback.
 *
 * Supported providers:
 * - steel: Steel.dev - AI-optimized, preferred for production cost efficiency
 * - browserless: Browserless.io - retained as an operational fallback
 */

import type { AnalyzeOptions, BrowserProvider, BrowserSessionInit, ProviderHealthMetrics } from '../types.js';
import { createBrowserlessProvider } from './browserless.js';
import { createSteelBrowserProvider } from './steel.js';

export interface ProviderManagerConfig {
  primary: 'steel' | 'browserless';
  steelApiKey?: string;
  browserlessToken?: string;
  healthCheckInterval?: number;
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

export class ProviderManager {
  private readonly providers = new Map<string, BrowserProvider>();
  private readonly healthMetrics = new Map<string, ProviderHealthMetrics>();
  private readonly primaryProviderName: string;
  private readonly fallbackProviderName: string | null;
  private activeProviderName: string;
  private healthCheckTimer?: NodeJS.Timeout;
  private readonly facade: BrowserProvider;

  constructor(config: ProviderManagerConfig) {
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
      desiredPrimary === 'steel'
        ? (this.providers.has('steel') ? 'steel' : 'browserless')
        : (this.providers.has('browserless') ? 'browserless' : 'steel');

    if (!resolvedPrimary || !this.providers.has(resolvedPrimary)) {
      throw new Error('No browser provider configured. Set STEEL_API_KEY or BROWSERLESS_TOKEN.');
    }

    this.primaryProviderName = resolvedPrimary;
    this.fallbackProviderName =
      resolvedPrimary === 'steel' && this.providers.has('browserless')
        ? 'browserless'
        : resolvedPrimary === 'browserless' && this.providers.has('steel')
          ? 'steel'
          : null;
    this.activeProviderName = this.primaryProviderName;
    const resolvedManager = this;

    this.facade = {
      get name() {
        return resolvedManager.activeProviderName;
      },
      analyze: async <T>(url: string, script: string, options?: AnalyzeOptions) =>
        resolvedManager.runWithFallback((provider) => provider.analyze<T>(url, script, options)),
      screenshot: async (url: string, options?: AnalyzeOptions) =>
        resolvedManager.runWithFallback((provider) => provider.screenshot(url, options)),
      extractDesignerMetadata: async (url: string, timeout?: number) =>
        resolvedManager.runWithFallback((provider) => {
          if (!provider.extractDesignerMetadata) {
            throw new Error(`Provider ${provider.name} does not support extractDesignerMetadata`);
          }
          return provider.extractDesignerMetadata(url, timeout);
        }),
      openSession: async (input?: BrowserSessionInit) =>
        resolvedManager.runWithFallback((provider) => {
          if (!provider.openSession) {
            throw new Error(`Provider ${provider.name} does not support openSession`);
          }
          return provider.openSession(input);
        }),
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

  private async runWithFallback<T>(operation: (provider: BrowserProvider) => Promise<T>): Promise<T> {
    const primary = this.getActiveProvider();

    try {
      return await operation(primary);
    } catch (error) {
      this.recordAnalysis(false, 0);
      const fallback = this.getFallbackProvider();
      if (!fallback || fallback.name === primary.name) {
        throw error;
      }

      this.activeProviderName = fallback.name;
      return operation(fallback);
    }
  }
}

export { createBrowserlessProvider } from './browserless.js';
export { createSteelBrowserProvider } from './steel.js';

export function createProviderManager(): ProviderManager {
  const steelKey = process.env.STEEL_API_KEY;
  const browserlessToken = process.env.BROWSERLESS_TOKEN || process.env.BROWSERLESS_API_KEY;
  const healthCheckInterval = parsePositiveInt(process.env.WEBFLOW_SITE_ANALYZER_HEALTHCHECK_INTERVAL_MS);
  const primary = steelKey ? 'steel' : (browserlessToken ? 'browserless' : 'steel');

  return new ProviderManager({
    primary,
    steelApiKey: steelKey,
    browserlessToken,
    healthCheckInterval
  });
}
