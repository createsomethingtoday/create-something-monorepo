import { z } from 'zod';

export const zendeskTicketStatusSchema = z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']);

export const ticketIdSchema = z
  .number()
  .int()
  .positive()
  .describe('Zendesk ticket ID, for example 123456.');

export const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Maximum records to return. Zendesk list/search endpoints are capped at 100 per call.');

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Date in YYYY-MM-DD format.');

export function redactEmail(value: unknown): string | null {
  if (typeof value !== 'string' || !value.includes('@')) return null;
  const [name, domain] = value.split('@');
  if (!name || !domain) return null;
  return `${name.slice(0, 2)}***@${domain}`;
}
