export const MISSIONS = [
  'install_authorize',
  'configure',
  'publish',
  'production_runtime',
  'uninstall_cleanup'
] as const;

export type MissionId = (typeof MISSIONS)[number];

export interface CapturedEvent {
  kind: 'navigation' | 'network' | 'dom' | 'error' | 'lifecycle';
  at: string;
  url?: string;
  method?: string;
  statusCode?: number;
  resourceType?: string;
  detail?: Record<string, string | number | boolean | null>;
}

const SECRET = /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|\bsk-[A-Za-z0-9_-]{12,}|password|secret|token|cookie|authorization)/i;

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) url.searchParams.set(key, '[redacted]');
    return url.toString().slice(0, 2048);
  } catch {
    return '[invalid-url]';
  }
}

export function sanitizeDetail(
  detail: Record<string, unknown> | undefined
): Record<string, string | number | boolean | null> | undefined {
  if (!detail) return undefined;
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(detail).slice(0, 40)) {
    if (SECRET.test(key)) continue;
    if (typeof value === 'string') {
      output[key] = SECRET.test(value) ? '[redacted]' : value.slice(0, 256);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      output[key] = value;
    }
  }
  return output;
}

export function normalizeEvent(event: CapturedEvent): CapturedEvent {
  return {
    kind: event.kind,
    at: Number.isFinite(Date.parse(event.at)) ? event.at : new Date(0).toISOString(),
    ...(event.url ? { url: sanitizeUrl(event.url) } : {}),
    ...(event.method ? { method: event.method.slice(0, 12).toUpperCase() } : {}),
    ...(typeof event.statusCode === 'number' ? { statusCode: event.statusCode } : {}),
    ...(event.resourceType ? { resourceType: event.resourceType.slice(0, 40) } : {}),
    ...(event.detail ? { detail: sanitizeDetail(event.detail) } : {})
  };
}

export function coverageStatus(
  missions: Array<{ id: MissionId; status: string }>
): 'validated' | 'blocked' {
  return MISSIONS.every((id) =>
    missions.some(
      (mission) =>
        mission.id === id &&
        (mission.status === 'passed' || mission.status === 'not_applicable')
    )
  )
    ? 'validated'
    : 'blocked';
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Bytes(value: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', value);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
