import type { Logger, LoggerFields } from './types.js';

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (/^[A-Za-z0-9._:/+-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function formatLine(level: string, message: string, fields: LoggerFields = {}): string {
  const parts = [`level=${level}`, `msg=${formatValue(message)}`];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    parts.push(`${key}=${formatValue(value)}`);
  }
  return parts.join(' ');
}

export class ConsoleLogger implements Logger {
  debug(message: string, fields?: LoggerFields): void {
    console.debug(formatLine('debug', message, fields));
  }

  info(message: string, fields?: LoggerFields): void {
    console.info(formatLine('info', message, fields));
  }

  warn(message: string, fields?: LoggerFields): void {
    console.warn(formatLine('warn', message, fields));
  }

  error(message: string, fields?: LoggerFields): void {
    console.error(formatLine('error', message, fields));
  }
}

export class MemoryLogger implements Logger {
  readonly lines: string[] = [];

  debug(message: string, fields?: LoggerFields): void {
    this.lines.push(formatLine('debug', message, fields));
  }

  info(message: string, fields?: LoggerFields): void {
    this.lines.push(formatLine('info', message, fields));
  }

  warn(message: string, fields?: LoggerFields): void {
    this.lines.push(formatLine('warn', message, fields));
  }

  error(message: string, fields?: LoggerFields): void {
    this.lines.push(formatLine('error', message, fields));
  }
}
