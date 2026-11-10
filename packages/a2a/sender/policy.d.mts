export const MAX_REQUEST_BYTES: number;
export const MAX_RESPONSE_BYTES: number;
export const DEADLINE_MS: number;
export const MAX_ENVELOPE_BYTES: number;
export class CallbackTransportError extends Error { readonly code: string; constructor(code: string); }
export function validateCallback(input: string): URL;
export function assertPublicAddress(address: string): { address: string; family: 4 | 6 };
export function validateHeaders(input: Record<string, string>): Record<string, string>;
export function validatePayload(url: string, body: string, headers: Record<string, string>): { endpoint: URL; body: string; headers: Record<string, string> };
