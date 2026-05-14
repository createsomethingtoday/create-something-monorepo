import type { Process, Sandbox } from '@cloudflare/sandbox';
import type { MoltbotEnv } from '../types';
import {
  MOLTBOT_PORT,
  R2_MOUNT_PATH,
  RELAY_RUNTIME,
  RELAY_VERSION_MATRIX,
} from '../config';
import { findExistingMoltbotProcess } from './process';
import { mountR2Storage } from './r2';
import { waitForProcess } from './utils';

export type GatewayStatusValue = 'not_running' | 'running' | 'not_responding' | 'error';

export interface GatewayProcessStatus {
  ok: boolean;
  status: GatewayStatusValue;
  port: number;
  process?: {
    id: string;
    status: Process['status'];
  };
  error?: string;
}

export interface StorageStatus {
  configured: boolean;
  mounted: boolean;
  missing?: string[];
  lastSync: string | null;
  message: string;
  error?: string;
}

export interface RuntimeStatus {
  ok: boolean;
  checkedAt: string;
  service: 'relay';
  runtime: typeof RELAY_RUNTIME;
  versions: typeof RELAY_VERSION_MATRIX;
  gateway: GatewayProcessStatus;
  modelProvider: {
    mode: 'cloudflare_ai_gateway' | 'direct_provider' | 'unconfigured';
    provider: 'openai' | 'anthropic' | 'unknown';
    hasAiGatewayBaseUrl: boolean;
    hasDirectAnthropicKey: boolean;
    hasDirectOpenAiKey: boolean;
  };
  storage: StorageStatus;
}

export async function getGatewayProcessStatus(
  sandbox: Sandbox,
  timeoutMs = 5000,
): Promise<GatewayProcessStatus> {
  try {
    const process = await findExistingMoltbotProcess(sandbox);
    if (!process) {
      return {
        ok: false,
        status: 'not_running',
        port: MOLTBOT_PORT,
      };
    }

    const processSummary = {
      id: process.id,
      status: process.status,
    };

    try {
      await process.waitForPort(MOLTBOT_PORT, { mode: 'tcp', timeout: timeoutMs });
      return {
        ok: true,
        status: 'running',
        port: MOLTBOT_PORT,
        process: processSummary,
      };
    } catch {
      return {
        ok: false,
        status: 'not_responding',
        port: MOLTBOT_PORT,
        process: processSummary,
      };
    }
  } catch (err) {
    return {
      ok: false,
      status: 'error',
      port: MOLTBOT_PORT,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getStorageStatus(
  sandbox: Sandbox,
  env: MoltbotEnv,
): Promise<StorageStatus> {
  const hasCredentials = !!(
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.CF_ACCOUNT_ID
  );

  const missing: string[] = [];
  if (!env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (!env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
  if (!env.CF_ACCOUNT_ID) missing.push('CF_ACCOUNT_ID');

  let lastSync: string | null = null;
  let mounted = false;
  let error: string | undefined;

  if (hasCredentials) {
    try {
      mounted = await mountR2Storage(sandbox, env);

      if (mounted) {
        const proc = await sandbox.startProcess(
          `cat ${R2_MOUNT_PATH}/.last-sync 2>/dev/null || echo ""`,
        );
        await waitForProcess(proc, 5000);
        const logs = await proc.getLogs();
        const timestamp = logs.stdout?.trim();
        if (timestamp) {
          lastSync = timestamp;
        }
      }
    } catch (err) {
      // Storage status should stay readable even when the mount/timestamp check fails.
      error = err instanceof Error ? err.message : 'Unknown storage status error';
    }
  }

  return {
    configured: hasCredentials,
    mounted,
    missing: missing.length > 0 ? missing : undefined,
    lastSync,
    message: hasCredentials
      ? mounted
        ? 'R2 storage is configured. Your data will persist across container restarts.'
        : 'R2 storage is configured, but the mount is not currently available.'
      : 'R2 storage is not configured. Paired devices and conversations will be lost when the container restarts.',
    error,
  };
}

export function getModelProviderStatus(env: MoltbotEnv): RuntimeStatus['modelProvider'] {
  const normalizedBaseUrl = env.AI_GATEWAY_BASE_URL?.replace(/\/+$/, '');
  const hasAiGateway = !!env.AI_GATEWAY_API_KEY;
  const hasDirectAnthropicKey = !!env.ANTHROPIC_API_KEY;
  const hasDirectOpenAiKey = !!env.OPENAI_API_KEY;

  let provider: RuntimeStatus['modelProvider']['provider'] = 'unknown';
  if (normalizedBaseUrl?.endsWith('/openai')) {
    provider = 'openai';
  } else if (normalizedBaseUrl || hasDirectAnthropicKey || hasAiGateway) {
    provider = 'anthropic';
  } else if (hasDirectOpenAiKey) {
    provider = 'openai';
  }

  return {
    mode: hasAiGateway
      ? 'cloudflare_ai_gateway'
      : hasDirectAnthropicKey || hasDirectOpenAiKey
        ? 'direct_provider'
        : 'unconfigured',
    provider,
    hasAiGatewayBaseUrl: !!normalizedBaseUrl,
    hasDirectAnthropicKey,
    hasDirectOpenAiKey,
  };
}

export async function getRuntimeStatus(
  sandbox: Sandbox,
  env: MoltbotEnv,
): Promise<RuntimeStatus> {
  const [gateway, storage] = await Promise.all([
    getGatewayProcessStatus(sandbox),
    getStorageStatus(sandbox, env),
  ]);

  return {
    ok: gateway.ok && (!storage.configured || storage.mounted),
    checkedAt: new Date().toISOString(),
    service: 'relay',
    runtime: RELAY_RUNTIME,
    versions: RELAY_VERSION_MATRIX,
    gateway,
    modelProvider: getModelProviderStatus(env),
    storage,
  };
}
