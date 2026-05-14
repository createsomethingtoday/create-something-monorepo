import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/cloudflare-readiness-runtime-routing.json';
import {
  CLOUDFLARE_READINESS_RUNTIME,
  DEFAULT_EXPECTED_WEBHOOK_AGENTS,
  createCloudflareReadinessPrompt,
  createCloudflareReadinessReport,
  parseCloudflareReadinessPayload,
  validateCloudflareReadinessReport,
} from './cloudflare-readiness.js';

function manifest(agents = DEFAULT_EXPECTED_WEBHOOK_AGENTS) {
  return {
    agents: agents.map((name) => ({
      name,
      triggers: { webhook: true },
    })),
  };
}

function wranglerConfig(agentClasses = ['ServiceDelivery', 'DeliveryReadiness', 'McpAccessReview', 'CloudflareReadiness']) {
  return {
    main: '_entry.ts',
    name: 'flue-service-agent',
    compatibility_date: '2026-04-01',
    compatibility_flags: ['nodejs_compat'],
    durable_objects: {
      bindings: [
        ...agentClasses.map((className) => ({ name: className, class_name: className })),
        { name: 'FLUE_REGISTRY', class_name: 'FlueRegistry' },
      ],
    },
    migrations: [
      ...agentClasses.map((className) => ({
        tag: `flue-class-${className}`,
        new_sqlite_classes: [className],
      })),
      {
        tag: 'flue-class-FlueRegistry',
        new_sqlite_classes: ['FlueRegistry'],
      },
    ],
  };
}

describe('Cloudflare readiness adapter', () => {
  it('returns ready when generated Flue Cloudflare artifacts are complete', () => {
    const input = parseCloudflareReadinessPayload({
      ...fixture,
      generatedArtifacts: {
        manifestPath: 'dist/flue-cloudflare/manifest.json',
        wranglerConfigPath: 'dist/flue-cloudflare/wrangler.jsonc',
        entryPath: 'dist/flue-cloudflare/_entry.ts',
        manifestJson: manifest(),
        wranglerConfigJson: wranglerConfig(),
        entryText: DEFAULT_EXPECTED_WEBHOOK_AGENTS.join('\n'),
      },
    });

    const report = validateCloudflareReadinessReport(createCloudflareReadinessReport(input));

    expect(report.readiness).toBe('ready');
    expect(report.score).toBe(1);
    expect(report.evidence.endpointPattern).toBe(CLOUDFLARE_READINESS_RUNTIME.endpointPattern);
    expect(report.evidence.workerName).toBe('flue-service-agent');
    expect(report.evidence.durableObjectBindings).toContain('FLUE_REGISTRY');
  });

  it('blocks when a webhook agent is missing from the generated manifest', () => {
    const input = parseCloudflareReadinessPayload({
      ...fixture,
      generatedArtifacts: {
        manifestPath: 'dist/flue-cloudflare/manifest.json',
        wranglerConfigPath: 'dist/flue-cloudflare/wrangler.jsonc',
        entryPath: 'dist/flue-cloudflare/_entry.ts',
        manifestJson: manifest(['service-delivery']),
        wranglerConfigJson: wranglerConfig(),
        entryText: DEFAULT_EXPECTED_WEBHOOK_AGENTS.join('\n'),
      },
    });

    const report = createCloudflareReadinessReport(input);

    expect(report.readiness).toBe('blocked');
    expect(report.missingEvidence).toContain('delivery-readiness, mcp-access-review, cloudflare-readiness');
  });

  it('blocks when Durable Object migrations are incomplete', () => {
    const input = parseCloudflareReadinessPayload({
      ...fixture,
      generatedArtifacts: {
        manifestPath: 'dist/flue-cloudflare/manifest.json',
        wranglerConfigPath: 'dist/flue-cloudflare/wrangler.jsonc',
        entryPath: 'dist/flue-cloudflare/_entry.ts',
        manifestJson: manifest(),
        wranglerConfigJson: {
          ...wranglerConfig(),
          migrations: [],
        },
        entryText: DEFAULT_EXPECTED_WEBHOOK_AGENTS.join('\n'),
      },
    });

    const report = createCloudflareReadinessReport(input);

    expect(report.readiness).toBe('blocked');
    expect(report.checks.some((check) => check.id === 'durable-object-migrations-present')).toBe(true);
  });

  it('creates a deployment-readiness prompt without raw secret values', () => {
    const input = parseCloudflareReadinessPayload({
      ...fixture,
      generatedArtifacts: {
        manifestPath: 'dist/flue-cloudflare/manifest.json',
        wranglerConfigPath: 'dist/flue-cloudflare/wrangler.jsonc',
        entryPath: 'dist/flue-cloudflare/_entry.ts',
        manifestJson: manifest(),
        wranglerConfigJson: wranglerConfig(),
        entryText: DEFAULT_EXPECTED_WEBHOOK_AGENTS.join('\n'),
      },
    });

    const prompt = createCloudflareReadinessPrompt(input);

    expect(prompt).toContain('Baseline Cloudflare readiness report');
    expect(prompt).toContain('/agents/cloudflare-readiness/:id');
    expect(prompt).toContain('flue-service-agent');
    expect(prompt).not.toContain('sk-test');
    expect(prompt).not.toContain('gateway-secret');
  });
});
