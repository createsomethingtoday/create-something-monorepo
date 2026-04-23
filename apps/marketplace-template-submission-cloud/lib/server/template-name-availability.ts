import { checkRemoteTemplateNameAvailability } from '../intake/external';
import { getServerAirtable } from './airtable';

type AirtableClient = Awaited<ReturnType<typeof getServerAirtable>>;

type SourceResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: unknown;
    };

export type TemplateNameAvailability = {
  available: boolean;
  source: 'hybrid' | 'local' | 'remote';
  warning?: string;
};

function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (
    typeof error === 'object' &&
    error &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return ((error as { message: string }).message || '').trim() || null;
  }

  return null;
}

async function getLocalAvailability(
  name: string,
  airtable?: AirtableClient
): Promise<SourceResult<{ unique: boolean }>> {
  try {
    const client = airtable ?? (await getServerAirtable());
    const result = await client.checkAssetNameUniqueness(name);
    return { ok: true, value: result };
  } catch (error) {
    return { ok: false, error };
  }
}

async function getRemoteAvailability(
  name: string
): Promise<SourceResult<{ taken: boolean }>> {
  try {
    const result = await checkRemoteTemplateNameAvailability(name);
    return { ok: true, value: result };
  } catch (error) {
    return { ok: false, error };
  }
}

function resolveSource(
  local: SourceResult<{ unique: boolean }>,
  remote: SourceResult<{ taken: boolean }>
): TemplateNameAvailability['source'] {
  if (local.ok && remote.ok) return 'hybrid';
  return local.ok ? 'local' : 'remote';
}

function resolveWarning(
  local: SourceResult<{ unique: boolean }>,
  remote: SourceResult<{ taken: boolean }>
): string | undefined {
  if (local.ok && remote.ok) return undefined;

  const fallbackSource = local.ok ? 'local Airtable data' : 'the remote marketplace service';
  return `Template name availability fallback is using ${fallbackSource}.`;
}

export async function checkTemplateNameAvailability(
  name: string,
  options: { airtable?: AirtableClient } = {}
): Promise<TemplateNameAvailability> {
  const [local, remote] = await Promise.all([
    getLocalAvailability(name, options.airtable),
    getRemoteAvailability(name)
  ]);

  if ((local.ok && !local.value.unique) || (remote.ok && remote.value.taken)) {
    return {
      available: false,
      source: resolveSource(local, remote),
      warning: resolveWarning(local, remote)
    };
  }

  if ((local.ok && local.value.unique) || (remote.ok && !remote.value.taken)) {
    return {
      available: true,
      source: resolveSource(local, remote),
      warning: resolveWarning(local, remote)
    };
  }

  throw new Error(
    getErrorMessage(local.ok ? null : local.error) ||
      getErrorMessage(remote.ok ? null : remote.error) ||
      'Template name availability is temporarily unavailable. Please try again.'
  );
}
