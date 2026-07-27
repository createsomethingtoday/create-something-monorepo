import { readFile } from 'node:fs/promises';

import type { ClientWorkspaceTrustPolicy } from '@create-something/delivery-schema/client-workspace-package';

const KEYRING_SCHEMA = 'create-something/client-workspace-keyring@1' as const;

type KeyringFile = {
  schema: typeof KEYRING_SCHEMA;
  issuer: string;
  appVersion: string;
  allowLegacyV1: boolean;
  revokedKeyIds: string[];
  keys: Array<{ keyId: string; publicKeyPem: string }>;
};

function parseKeyring(value: unknown): KeyringFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_client_workspace_keyring');
  }
  const keyring = value as Partial<KeyringFile>;
  if (
    keyring.schema !== KEYRING_SCHEMA ||
    typeof keyring.issuer !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(keyring.appVersion ?? '') ||
    typeof keyring.allowLegacyV1 !== 'boolean' ||
    !Array.isArray(keyring.revokedKeyIds) ||
    !Array.isArray(keyring.keys) ||
    keyring.keys.length === 0
  ) {
    throw new Error('invalid_client_workspace_keyring');
  }
  const seen = new Set<string>();
  for (const key of keyring.keys) {
    if (
      !key ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(key.keyId) ||
      typeof key.publicKeyPem !== 'string' ||
      !key.publicKeyPem.includes('BEGIN PUBLIC KEY') ||
      seen.has(key.keyId)
    ) {
      throw new Error('invalid_client_workspace_keyring');
    }
    seen.add(key.keyId);
  }
  if (keyring.revokedKeyIds.some((keyId) => !seen.has(keyId))) {
    throw new Error('invalid_client_workspace_keyring');
  }
  return keyring as KeyringFile;
}

export async function loadClientWorkspaceTrustPolicy(
  keyringPath: string
): Promise<ClientWorkspaceTrustPolicy> {
  const keyring = parseKeyring(JSON.parse(await readFile(keyringPath, 'utf8')));
  return {
    issuer: keyring.issuer,
    appVersion: keyring.appVersion,
    allowLegacyV1: keyring.allowLegacyV1,
    revokedKeyIds: [...keyring.revokedKeyIds],
    keys: Object.fromEntries(keyring.keys.map((key) => [key.keyId, key.publicKeyPem]))
  };
}
