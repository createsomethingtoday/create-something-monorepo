import type { TemplateSort } from './types.js';

export const TEMPLATE_SORT_ALIASES: Readonly<Record<string, TemplateSort>> = {
  popular: 'popular',
  best_selling: 'best_selling',
  'best-selling': 'best_selling',
  best_sellers: 'best_selling',
  'best-sellers': 'best_selling',
  newest: 'newest',
  'approval-date-desc': 'newest',
  price_asc: 'price_asc',
  'price-asc': 'price_asc',
  price_desc: 'price_desc',
  'price-desc': 'price_desc',
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
}

export function ensureNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function ensureBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    return ensureStringArray(JSON.parse(value));
  } catch {
    return [];
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeSort(value: string | null | undefined): TemplateSort {
  return TEMPLATE_SORT_ALIASES[(value ?? '').trim()] ?? 'popular';
}

export function chunk<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}
