import type { CanvasDocument } from './document';
import type { CanvasOperation } from './paired-session';

export type NativeRole = 'web' | 'host' | 'companion';

export type DiscoveredHost = {
  endpoint: string;
  sessionId: string;
  protocolVersion: string;
  certificateFingerprint: string;
  certificateDer: string;
};

export type PairingOffer = { code: string; expiresAt: string };

export type NativeSessionStatus = {
  status?: 'unpaired' | 'paired' | 'applied' | 'duplicate' | 'queued' | 'queue_full' | 'synced' | 'conflict';
  sessionId?: string;
  revision?: number;
  document?: CanvasDocument;
  previousDocument?: CanvasDocument;
  pairedClients?: { clientId: string; expiresAt: string; revokedAt?: string }[];
  transport?: { endpoint: string; certificateFingerprint: string };
  certificateFingerprint?: string;
  queueDepth?: number;
  online?: boolean;
  error?: string;
};

type NativeWindow = Window & {
  __TAURI_INTERNALS__?: {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  };
};

export const hasNativeBridge = () => typeof window !== 'undefined' && Boolean((window as NativeWindow).__TAURI_INTERNALS__);

export function invokeNative<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  const invoke = (window as NativeWindow).__TAURI_INTERNALS__?.invoke;
  if (!invoke) return Promise.reject(new Error('Native Draw bridge is unavailable'));
  return invoke<T>(command, args);
}

export const nativeRole = () => invokeNative<Exclude<NativeRole, 'web'>>('draw_runtime_role');
export const hostStatus = () => invokeNative<NativeSessionStatus>('draw_host_status');
export const companionStatus = () => invokeNative<NativeSessionStatus>('draw_companion_status');
export const beginPairing = () => invokeNative<PairingOffer>('draw_pair_begin');
export const discoverHosts = () => invokeNative<DiscoveredHost[]>('draw_discover_hosts');
export const pairCompanion = (host: DiscoveredHost, code: string) => invokeNative<NativeSessionStatus>('draw_companion_pair', { host, code });
export const submitNativeOperation = (role: Exclude<NativeRole, 'web'>, operation: CanvasOperation) =>
  invokeNative<NativeSessionStatus>(role === 'host' ? 'draw_host_apply_local' : 'draw_companion_submit', { operation });
export const replaceHostDocument = (document: CanvasDocument, reason: 'undo' | 'redo' | 'import' | 'reset', expectedRevision: number) =>
  invokeNative<NativeSessionStatus>('draw_host_replace_document', { document, reason, expectedRevision });
export const setCompanionOnline = (online: boolean) => invokeNative<NativeSessionStatus>('draw_companion_set_online', { online });
export const refreshCompanion = () => invokeNative<NativeSessionStatus>('draw_companion_refresh');
export const forgetCompanion = () => invokeNative<NativeSessionStatus>('draw_companion_forget');
export const revokeCompanion = (clientId: string) => invokeNative<NativeSessionStatus>('draw_revoke_client', { clientId });
