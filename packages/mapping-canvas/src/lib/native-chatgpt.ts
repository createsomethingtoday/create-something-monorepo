import { invokeNative } from './native-pairing';
export type ChatGPTAccount = { clientId: string; email?: string | null; subject: string; connected: boolean; planEnabled: boolean };
export type ChatGPTStatus = { available: boolean; busy: boolean; activeClientId?: string | null; accounts: ChatGPTAccount[]; pendingClientIds: string[]; error?: string | null; disconnectOutcome?: ChatGPTDisconnectOutcome | null };
export type ChatGPTModel = { slug: string; displayName: string };
export const activeChatGPTAccount = (status: ChatGPTStatus) => status.accounts.find(account => account.clientId === status.activeClientId);
export const canUseChatGPTPlan = (status: ChatGPTStatus) => Boolean(status.available && !status.busy && activeChatGPTAccount(status)?.connected && activeChatGPTAccount(status)?.planEnabled);
export const chatGPT = {
  openUsage: () => invokeNative<void>('draw_chatgpt_open_usage'),
  status: () => invokeNative<ChatGPTStatus>('draw_chatgpt_status'),
  connect: (selectedClientId: string | null = null) => invokeNative<ChatGPTStatus>('draw_chatgpt_connect', { selectedClientId }),
  cancel: () => invokeNative<void>('draw_chatgpt_cancel'),
  disconnect: (clientId: string) => invokeNative<ChatGPTStatus>('draw_chatgpt_disconnect', { clientId }),
  select: (clientId: string) => invokeNative<ChatGPTStatus>('draw_chatgpt_select', { clientId }),
  models: () => invokeNative<ChatGPTModel[]>('draw_chatgpt_models'),
  respond: (model: string, input: string) => invokeNative<string>('draw_chatgpt_respond', { model, input })
};
// Never display arbitrary native/provider errors, which may contain diagnostic data.
export function chatGPTError(error: unknown): string {
  const code = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  if (code === 'CANCELLED' || code === 'cancelled') return 'Connection cancelled. You can keep drawing.';
  if (code === 'PLAN_DISABLED' || code === 'plan_permission_required') return 'ChatGPT plan usage is not enabled for this connection. Enable it explicitly or keep drawing without AI.';
  if (code === 'USAGE_LIMIT' || code === 'RATE_LIMITED' || code === 'usage_limit_reached') return 'ChatGPT usage is currently limited. Check ChatGPT Settings → Usage or try later. No other billing method was used.';
  if (code === 'REVOKED' || code === 'REAUTH_REQUIRED' || code === 'sign_in_required') return 'This connection needs sign-in again. Your drawing and typed request are retained.';
  if (code === 'cancelled_revocation_unconfirmed') return 'Cancelled locally. Remote access cleanup was not confirmed; disconnect Draw in ChatGPT Settings.';
  if (code === 'REVOCATION_UNCONFIRMED' || code === 'revocation_unconfirmed') return 'Signed out locally. Remote revocation was not confirmed; disconnect Draw in ChatGPT Settings.';
  if (code === 'UNAVAILABLE') return 'ChatGPT is unavailable in this app. You can keep drawing offline.';
  if (code === 'plan_or_model_unavailable') return 'This plan or model is unavailable. Choose another available model or keep drawing without AI. No other billing method was used.';
  if (code === 'refresh_models_required') return 'Load available models again before sending. No request was sent.';
  if (code === 'sign_in_timed_out') return 'Sign-in timed out. You can retry when ready; your drawing is retained.';
  if (code === 'network_unavailable' || code === 'provider_unavailable') return 'ChatGPT is temporarily unavailable. Your request is retained; try later. No other billing method was used.';
  if (code === 'INVALID_INPUT') return 'Enter a request of at most 16,000 bytes.';
  return 'ChatGPT could not complete this action. Your drawing and typed request are retained. No other billing method was used.';
}

export type ChatGPTDisconnectOutcome = { localTokensRemoved: boolean; remoteRevocation: 'no_refresh_token' | 'not_attempted_unverifiable' | 'request_succeeded' | 'request_failed_or_unverifiable' };
// Receipts describe this disconnect only; never infer past revocation from signed-out status.
export function chatGPTDisconnectNotice(outcome?: ChatGPTDisconnectOutcome | null): string {
  const local = outcome?.localTokensRemoved ? 'Local credentials removed from this device.' : 'Local credential removal is unconfirmed.';
  const remote = outcome?.remoteRevocation === 'no_refresh_token' ? 'No refresh token was stored to revoke; remote access status is unknown.'
    : outcome?.remoteRevocation === 'not_attempted_unverifiable' ? 'Remote revocation was not attempted or could not be verified.'
    : outcome?.remoteRevocation === 'request_succeeded' ? 'The server acknowledged the revocation request; this does not prove token invalidation.'
    : outcome?.remoteRevocation === 'request_failed_or_unverifiable' ? 'The remote revocation request failed or could not be verified.'
    : 'Remote revocation status is unknown; no disconnect receipt is available.';
  return `${local} ${remote} Review Draw access in ChatGPT Settings if needed.`;
}
