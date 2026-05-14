/**
 * Configuration constants for Moltbot Sandbox
 */

/** Port that the Moltbot gateway listens on inside the container */
export const MOLTBOT_PORT = 18789;

/** Maximum time to wait for Moltbot to start (3 minutes) */
export const STARTUP_TIMEOUT_MS = 180_000;

/** Mount path for R2 persistent storage inside the container */
export const R2_MOUNT_PATH = '/data/moltbot';

/** R2 bucket name for persistent storage */
export const R2_BUCKET_NAME = 'moltbot-data';

/** Runtime role for Policy OS contract evidence. */
export const RELAY_RUNTIME = {
  id: 'pi_openclaw',
  role: 'channel_gateway',
  policyOsSurface: 'operator_visible_gateway',
} as const;

/** Explicit relay version matrix. Keep aligned with Dockerfile and start-moltbot.sh. */
export const RELAY_VERSION_MATRIX = {
  cloudflareSandboxImage: 'cloudflare/sandbox:0.7.0',
  containerNodeVersion: '22.13.1',
  gatewayCliPackage: 'clawdbot',
  gatewayCliVersion: '2026.1.24-3',
  gatewayCommand: 'clawdbot gateway',
  defaultPrimaryModel: 'anthropic/claude-opus-4-5',
  openAiGatewayPrimaryModel: 'openai/gpt-5.2',
  anthropicGatewayPrimaryModel: 'anthropic/claude-opus-4-5-20251101',
} as const;
