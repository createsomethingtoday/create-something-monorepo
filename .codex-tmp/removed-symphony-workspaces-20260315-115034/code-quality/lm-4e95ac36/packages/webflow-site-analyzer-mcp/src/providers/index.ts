/**
 * Browser Provider Factory
 * 
 * Creates and manages browser automation providers with automatic fallback.
 * 
 * Supported providers:
 * - steel: Steel.dev - AI-optimized, 24h sessions, recommended for production
 * - browserless: Browserless.io - Good for local development/testing
 */

import type { BrowserProvider, ProviderHealthMetrics } from '../types.js';
import { BrowserlessProvider, createBrowserlessProvider } from './browserless.js';
import { SteelBrowserProvider, createSteelBrowserProvider } from './steel.js';

// =============================================================================
// Types
// =============================================================================

export interface ProviderManagerConfig {
  primary: 'steel' | 'browserless';
  steelApiKey?: string;
  browserlessToken?: string;
  healthCheckInterval?: number; // ms
}

// =============================================================================
// Provider Manager
// =============================================================================

export class ProviderManager {
  private provider: BrowserProvider;
  private healthMetrics: Map<string, ProviderHealthMetrics> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: ProviderManagerConfig) {
    // Create primary provider
    switch (config.primary) {
      case 'steel':
        this.provider = createSteelBrowserProvider(config.steelApiKey);
        break;
      case 'browserless':
        this.provider = createBrowserlessProvider(config.browserlessToken);
        break;
      default:
        throw new Error(`Unknown provider: ${config.primary}`);
    }

    // Initialize health metrics
    this.healthMetrics.set(this.provider.name, {
      provider: this.provider.name,
      isHealthy: true, // Assume healthy until proven otherwise
      lastCheckTime: Date.now(),
      successRate: 1,
      averageLatencyMs: 0,
      failureCount: 0
    });

    // Start health checks if interval specified
    if (config.healthCheckInterval) {
      this.startHealthChecks(config.healthCheckInterval);
    }
  }

  /**
   * Get the active provider
   */
  getProvider(): BrowserProvider {
    return this.provider;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Get health metrics for all providers
   */
  getHealthMetrics(): ProviderHealthMetrics[] {
    return Array.from(this.healthMetrics.values());
  }

  /**
   * Check health of primary provider
   */
  async checkHealth(): Promise<boolean> {
    const startTime = Date.now();
    const metrics = this.healthMetrics.get(this.provider.name)!;

    try {
      const isHealthy = await this.provider.healthCheck();
      const latency = Date.now() - startTime;

      // Update metrics
      metrics.isHealthy = isHealthy;
      metrics.lastCheckTime = Date.now();
      metrics.averageLatencyMs = (metrics.averageLatencyMs + latency) / 2;
      
      if (!isHealthy) {
        metrics.failureCount++;
        metrics.successRate = Math.max(0, metrics.successRate - 0.1);
      } else {
        metrics.successRate = Math.min(1, metrics.successRate + 0.05);
      }

      return isHealthy;

    } catch {
      metrics.isHealthy = false;
      metrics.lastCheckTime = Date.now();
      metrics.failureCount++;
      metrics.successRate = Math.max(0, metrics.successRate - 0.1);
      return false;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(intervalMs: number): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.checkHealth();
    }, intervalMs);
  }

  /**
   * Stop health checks and cleanup
   */
  shutdown(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  /**
   * Record an analysis result for metrics
   */
  recordAnalysis(success: boolean, durationMs: number): void {
    const metrics = this.healthMetrics.get(this.provider.name)!;
    
    if (!success) {
      metrics.failureCount++;
      metrics.successRate = Math.max(0, metrics.successRate - 0.05);
    } else {
      metrics.successRate = Math.min(1, metrics.successRate + 0.01);
    }
    
    // Rolling average for latency
    metrics.averageLatencyMs = (metrics.averageLatencyMs * 0.9) + (durationMs * 0.1);
  }
}

// =============================================================================
// Exports
// =============================================================================

export { BrowserlessProvider, createBrowserlessProvider } from './browserless.js';
export { SteelBrowserProvider, createSteelBrowserProvider } from './steel.js';

/**
 * Create a provider manager with defaults from environment
 * 
 * Uses Steel as default (production-ready, 24h sessions)
 * Falls back to Browserless if BROWSERLESS_TOKEN is set but STEEL_API_KEY is not
 */
export function createProviderManager(): ProviderManager {
  const steelKey = process.env.STEEL_API_KEY;
  const browserlessToken = process.env.BROWSERLESS_TOKEN;
  
  // Prefer Steel, fall back to Browserless
  const primary = steelKey ? 'steel' : (browserlessToken ? 'browserless' : 'steel');
  
  return new ProviderManager({
    primary,
    steelApiKey: steelKey,
    browserlessToken,
    healthCheckInterval: 60000 // Check every minute
  });
}
