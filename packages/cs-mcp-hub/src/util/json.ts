/**
 * Shared low-level JSON / argument helpers.
 *
 * Extracted from `src/index.ts` to keep that file focused on wiring. Pure
 * functions only — no module-level state.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeArgs(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) {
    return {};
  }
  return raw;
}

export function stringArg(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function numberArg(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

export function enumArg<T extends string>(
  raw: unknown,
  fieldName: string,
  values: readonly T[],
  fallback: T,
): T {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string') {
    throw new Error(`"${fieldName}" must be one of: ${values.join(', ')}`);
  }
  const normalized = raw.trim().toLowerCase();
  const matched = values.find((value) => value === normalized);
  if (!matched) {
    throw new Error(`"${fieldName}" must be one of: ${values.join(', ')}`);
  }
  return matched;
}

export function stringArrayArg(raw: unknown, fieldName: string): string[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string')) {
    throw new Error(`"${fieldName}" must be an array of strings`);
  }
  return [...new Set(raw.map((v) => v.trim()).filter(Boolean))];
}

export function booleanArg(raw: unknown, defaultValue: boolean): boolean {
  if (raw === undefined) {
    return defaultValue;
  }
  if (typeof raw !== 'boolean') {
    throw new Error('Boolean argument expected');
  }
  return raw;
}

export function parseCsvList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((part) => part.trim()).filter(Boolean))].sort();
}

export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function parseBooleanEnv(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function toJsonResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export function toJsonResource(uri: string, payload: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function toErrorResult(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}
