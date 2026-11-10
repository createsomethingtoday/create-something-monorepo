import type { RequestOptions } from 'node:https';
import type { IncomingMessage, ClientRequest } from 'node:http';
export interface TransportOverrides {
  resolve?: (hostname: string) => Promise<Array<{ address: string; family: number }>>;
  request?: (options: RequestOptions, callback: (response: IncomingMessage) => void) => ClientRequest;
  deadlineMs?: number;
  signal?: AbortSignal;
}
export function sendCallback(url: string, body: string, headers: Record<string, string>, overrides?: TransportOverrides): Promise<{ status: number; body: string }>;
