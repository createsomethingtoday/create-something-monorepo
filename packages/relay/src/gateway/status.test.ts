import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Process } from '@cloudflare/sandbox';
import {
  getGatewayProcessStatus,
  getModelProviderStatus,
  getRuntimeStatus,
  getStorageStatus,
} from './status';
import { MOLTBOT_PORT, RELAY_RUNTIME, RELAY_VERSION_MATRIX } from '../config';
import {
  createMockEnv,
  createMockEnvWithR2,
  createMockProcess,
  createMockSandbox,
  suppressConsole,
} from '../test-utils';

function createGatewayProcess(overrides: Partial<Process> = {}): Process {
  return {
    id: 'gateway-1',
    command: 'clawdbot gateway --port 18789',
    status: 'running',
    startTime: new Date(),
    endTime: undefined,
    exitCode: undefined,
    waitForPort: vi.fn().mockResolvedValue(undefined),
    kill: vi.fn(),
    getLogs: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
    ...overrides,
  } as Process;
}

describe('runtime status helpers', () => {
  beforeEach(() => {
    suppressConsole();
  });

  describe('getGatewayProcessStatus', () => {
    it('returns not_running when no gateway process exists', async () => {
      const { sandbox } = createMockSandbox({ processes: [] });

      const result = await getGatewayProcessStatus(sandbox);

      expect(result).toEqual({
        ok: false,
        status: 'not_running',
        port: MOLTBOT_PORT,
      });
    });

    it('returns running with a redacted process summary when the port responds', async () => {
      const gatewayProcess = createGatewayProcess();
      const { sandbox, listProcessesMock } = createMockSandbox();
      listProcessesMock.mockResolvedValue([gatewayProcess]);

      const result = await getGatewayProcessStatus(sandbox);

      expect(result).toEqual({
        ok: true,
        status: 'running',
        port: MOLTBOT_PORT,
        process: {
          id: 'gateway-1',
          status: 'running',
        },
      });
      expect(gatewayProcess.waitForPort).toHaveBeenCalledWith(MOLTBOT_PORT, {
        mode: 'tcp',
        timeout: 5000,
      });
    });

    it('returns not_responding when the process exists but the port is closed', async () => {
      const gatewayProcess = createGatewayProcess({
        waitForPort: vi.fn().mockRejectedValue(new Error('port closed')),
      });
      const { sandbox, listProcessesMock } = createMockSandbox();
      listProcessesMock.mockResolvedValue([gatewayProcess]);

      const result = await getGatewayProcessStatus(sandbox);

      expect(result).toEqual({
        ok: false,
        status: 'not_responding',
        port: MOLTBOT_PORT,
        process: {
          id: 'gateway-1',
          status: 'running',
        },
      });
    });
  });

  describe('getStorageStatus', () => {
    it('returns missing R2 configuration without touching the sandbox', async () => {
      const { sandbox, startProcessMock, mountBucketMock } = createMockSandbox();

      const result = await getStorageStatus(sandbox, createMockEnv());

      expect(result).toEqual({
        configured: false,
        mounted: false,
        missing: ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'CF_ACCOUNT_ID'],
        lastSync: null,
        message: 'R2 storage is not configured. Paired devices and conversations will be lost when the container restarts.',
        error: undefined,
      });
      expect(startProcessMock).not.toHaveBeenCalled();
      expect(mountBucketMock).not.toHaveBeenCalled();
    });

    it('reports configured and mounted R2 storage with the last sync timestamp', async () => {
      const { sandbox, startProcessMock } = createMockSandbox();
      const timestamp = '2026-05-14T03:00:00+00:00';
      startProcessMock
        .mockResolvedValueOnce(createMockProcess('s3fs on /data/moltbot type fuse.s3fs\n'))
        .mockResolvedValueOnce(createMockProcess(timestamp));

      const result = await getStorageStatus(sandbox, createMockEnvWithR2());

      expect(result).toEqual({
        configured: true,
        mounted: true,
        missing: undefined,
        lastSync: timestamp,
        message: 'R2 storage is configured. Your data will persist across container restarts.',
        error: undefined,
      });
    });

    it('reports configured but unavailable storage when the R2 mount fails', async () => {
      const { sandbox, mountBucketMock, startProcessMock } = createMockSandbox();
      mountBucketMock.mockRejectedValue(new Error('mount denied'));
      startProcessMock
        .mockResolvedValueOnce(createMockProcess(''))
        .mockResolvedValueOnce(createMockProcess(''));

      const result = await getStorageStatus(sandbox, createMockEnvWithR2());

      expect(result.configured).toBe(true);
      expect(result.mounted).toBe(false);
      expect(result.lastSync).toBeNull();
      expect(result.message).toBe('R2 storage is configured, but the mount is not currently available.');
    });
  });

  describe('getModelProviderStatus', () => {
    it('detects OpenAI routed through Cloudflare AI Gateway', () => {
      const result = getModelProviderStatus(createMockEnv({
        AI_GATEWAY_API_KEY: 'gateway-secret',
        AI_GATEWAY_BASE_URL: 'https://gateway.ai.cloudflare.com/v1/account/gateway/openai/',
      }));

      expect(result).toEqual({
        mode: 'cloudflare_ai_gateway',
        provider: 'openai',
        hasAiGatewayBaseUrl: true,
        hasDirectAnthropicKey: false,
        hasDirectOpenAiKey: false,
      });
    });

    it('reports unconfigured when no model provider credentials are set', () => {
      const result = getModelProviderStatus(createMockEnv());

      expect(result).toEqual({
        mode: 'unconfigured',
        provider: 'unknown',
        hasAiGatewayBaseUrl: false,
        hasDirectAnthropicKey: false,
        hasDirectOpenAiKey: false,
      });
    });
  });

  describe('getRuntimeStatus', () => {
    it('returns relay runtime/version evidence without exposing secret values', async () => {
      const gatewayProcess = createGatewayProcess();
      const { sandbox, listProcessesMock, startProcessMock } = createMockSandbox();
      listProcessesMock.mockResolvedValue([gatewayProcess]);
      startProcessMock
        .mockResolvedValueOnce(createMockProcess('s3fs on /data/moltbot type fuse.s3fs\n'))
        .mockResolvedValueOnce(createMockProcess('2026-05-14T03:00:00+00:00'));

      const result = await getRuntimeStatus(sandbox, createMockEnvWithR2({
        AI_GATEWAY_API_KEY: 'gateway-secret',
        AI_GATEWAY_BASE_URL: 'https://gateway.ai.cloudflare.com/v1/account/gateway/anthropic',
        ANTHROPIC_API_KEY: 'anthropic-secret',
        OPENAI_API_KEY: 'openai-secret',
      }));

      expect(result.ok).toBe(true);
      expect(result.service).toBe('relay');
      expect(result.runtime).toBe(RELAY_RUNTIME);
      expect(result.versions).toBe(RELAY_VERSION_MATRIX);
      expect(result.gateway.status).toBe('running');
      expect(result.storage.mounted).toBe(true);
      expect(JSON.stringify(result)).not.toContain('gateway-secret');
      expect(JSON.stringify(result)).not.toContain('anthropic-secret');
      expect(JSON.stringify(result)).not.toContain('openai-secret');
      expect(JSON.stringify(result)).not.toContain('test-secret-key');
    });

    it('marks runtime unhealthy when configured storage is unavailable', async () => {
      const gatewayProcess = createGatewayProcess();
      const { sandbox, listProcessesMock, mountBucketMock, startProcessMock } = createMockSandbox();
      listProcessesMock.mockResolvedValue([gatewayProcess]);
      mountBucketMock.mockRejectedValue(new Error('mount denied'));
      startProcessMock
        .mockResolvedValueOnce(createMockProcess(''))
        .mockResolvedValueOnce(createMockProcess(''));

      const result = await getRuntimeStatus(sandbox, createMockEnvWithR2());

      expect(result.ok).toBe(false);
      expect(result.gateway.ok).toBe(true);
      expect(result.storage.configured).toBe(true);
      expect(result.storage.mounted).toBe(false);
    });
  });
});
