import { describe, expect, it } from 'vitest';

import { resolveRuntimeConfig } from './config.js';

describe('resolveRuntimeConfig', () => {
  it('warns when Steel is configured without a trusted profile id', () => {
    const result = resolveRuntimeConfig({
      STEEL_API_KEY: 'steel_test_key',
    });

    expect(result.configWarnings).toContain(
      'STEEL_PROFILE_ID is not configured. Anonymous Steel sessions are more likely to hit YouTube sign-in or anti-bot challenges.',
    );
  });

  it('does not warn when a Steel profile id and bearer token are configured', () => {
    const result = resolveRuntimeConfig({
      STEEL_API_KEY: 'steel_test_key',
      STEEL_PROFILE_ID: 'profile_123',
      MCP_BEARER_TOKEN: 'token_123',
    });

    expect(result.configWarnings).toEqual([]);
  });

  it('defaults Supadata transcript mode to native', () => {
    const result = resolveRuntimeConfig({});

    expect(result.supadataTranscriptMode).toBe('native');
  });

  it('warns when Supadata transcript mode is set without an API key', () => {
    const result = resolveRuntimeConfig({
      SUPADATA_TRANSCRIPT_MODE: 'auto',
    });

    expect(result.supadataTranscriptMode).toBe('auto');
    expect(result.configWarnings).toContain(
      'SUPADATA_TRANSCRIPT_MODE is configured but SUPADATA_API_KEY is not set, so Supadata transcript extraction is disabled.',
    );
  });

  it('warns when billable transcript providers are exposed without bearer auth', () => {
    const result = resolveRuntimeConfig({
      SUPADATA_API_KEY: 'sd_123',
    });

    expect(result.security).toMatchObject({
      bearerProtectionEnabled: false,
      unauthenticatedBillableTranscriptAccess: true,
      unauthenticatedNotionAccess: false,
      recommendations: ['Set MCP_BEARER_TOKEN before exposing the remote MCP publicly.'],
    });
    expect(result.configWarnings).toContain(
      'MCP_BEARER_TOKEN is not configured. Public callers can consume billable transcript provider capacity (Supadata and/or Steel) without authentication.',
    );
  });

  it('warns when Notion tools are exposed without bearer auth', () => {
    const result = resolveRuntimeConfig({
      NOTION_API_KEY: 'secret_123',
    });

    expect(result.security).toMatchObject({
      bearerProtectionEnabled: false,
      unauthenticatedBillableTranscriptAccess: false,
      unauthenticatedNotionAccess: true,
      recommendations: ['Set MCP_BEARER_TOKEN before exposing the remote MCP publicly.'],
    });
    expect(result.configWarnings).toContain(
      'MCP_BEARER_TOKEN is not configured. Public callers can invoke Notion-backed tools without authentication.',
    );
  });
});
