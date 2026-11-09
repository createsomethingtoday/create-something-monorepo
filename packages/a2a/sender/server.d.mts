import type { Server } from 'node:http';
import type { sendCallback } from './transport.mjs';
export function validSenderToken(token: unknown): token is string;
export function authorized(supplied: unknown, token: string): boolean;
export function createSenderServer(options: { token: string; send?: typeof sendCallback }): Server;
