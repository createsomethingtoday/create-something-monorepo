import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  type KeyObject
} from 'node:crypto';

import type { WorkflowArtifactManifest } from './artifacts.js';

export type WorkflowArtifactKey = KeyObject | string | Buffer;

export interface WorkflowArtifactAttestation {
  schemaVersion: 'workflow_artifact_attestation.v0.1';
  algorithm: 'Ed25519';
  keyId: string;
  publicKeyFingerprint: string;
  manifestHash: string;
  signature: string;
}

export interface WorkflowArtifactSigningOptions {
  keyId: string;
  privateKey: WorkflowArtifactKey;
}

export type WorkflowArtifactAttestationErrorCode =
  | 'ATTESTATION_MISSING'
  | 'INVALID_ATTESTATION'
  | 'INVALID_KEY_ID'
  | 'INVALID_PRIVATE_KEY'
  | 'INVALID_PUBLIC_KEY'
  | 'KEY_FINGERPRINT_MISMATCH'
  | 'MANIFEST_HASH_MISMATCH'
  | 'SIGNATURE_INVALID'
  | 'UNSUPPORTED_KEY_TYPE';

export class WorkflowArtifactAttestationError extends Error {
  readonly code: WorkflowArtifactAttestationErrorCode;

  constructor(code: WorkflowArtifactAttestationErrorCode, message: string) {
    super(message);
    this.name = 'WorkflowArtifactAttestationError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index])
  );
}

export function canonicalWorkflowArtifactManifest(manifest: WorkflowArtifactManifest): Buffer {
  return Buffer.from(JSON.stringify(manifest), 'utf8');
}

export function workflowArtifactManifestHash(manifest: WorkflowArtifactManifest): string {
  return `sha256:${createHash('sha256')
    .update(canonicalWorkflowArtifactManifest(manifest))
    .digest('hex')}`;
}

function canonicalAttestationStatement(
  value: Omit<WorkflowArtifactAttestation, 'signature'>
): Buffer {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

function parseKey(value: WorkflowArtifactKey, kind: 'private' | 'public'): KeyObject {
  try {
    const key =
      typeof value === 'string' || Buffer.isBuffer(value)
        ? kind === 'private'
          ? createPrivateKey(value)
          : createPublicKey(value)
        : value;
    if (kind === 'private' && key.type !== 'private') throw new Error();
    if (kind === 'public' && key.type === 'private') return createPublicKey(key);
    return key;
  } catch {
    throw new WorkflowArtifactAttestationError(
      kind === 'private' ? 'INVALID_PRIVATE_KEY' : 'INVALID_PUBLIC_KEY',
      `Workflow artifact ${kind} key is invalid.`
    );
  }
}

function assertEd25519(key: KeyObject): void {
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new WorkflowArtifactAttestationError(
      'UNSUPPORTED_KEY_TYPE',
      'Workflow artifact attestations require an Ed25519 key.'
    );
  }
}

export function workflowArtifactPublicKeyFingerprint(publicKey: WorkflowArtifactKey): string {
  const key = parseKey(publicKey, 'public');
  assertEd25519(key);
  const bytes = key.export({ type: 'spki', format: 'der' });
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export function createWorkflowArtifactAttestation(
  manifest: WorkflowArtifactManifest,
  options: WorkflowArtifactSigningOptions
): WorkflowArtifactAttestation {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(options.keyId)) {
    throw new WorkflowArtifactAttestationError(
      'INVALID_KEY_ID',
      'Workflow artifact key IDs must use 1-128 letters, numbers, dots, underscores, or hyphens.'
    );
  }
  const privateKey = parseKey(options.privateKey, 'private');
  assertEd25519(privateKey);
  const publicKey = createPublicKey(privateKey);
  const statement = {
    schemaVersion: 'workflow_artifact_attestation.v0.1',
    algorithm: 'Ed25519',
    keyId: options.keyId,
    publicKeyFingerprint: workflowArtifactPublicKeyFingerprint(publicKey),
    manifestHash: workflowArtifactManifestHash(manifest)
  } as const;
  return {
    ...statement,
    signature: sign(null, canonicalAttestationStatement(statement), privateKey).toString('base64')
  };
}

export function parseWorkflowArtifactAttestation(value: unknown): WorkflowArtifactAttestation {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      'algorithm',
      'keyId',
      'manifestHash',
      'publicKeyFingerprint',
      'schemaVersion',
      'signature'
    ]) ||
    value.schemaVersion !== 'workflow_artifact_attestation.v0.1' ||
    value.algorithm !== 'Ed25519' ||
    typeof value.keyId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value.keyId) ||
    typeof value.publicKeyFingerprint !== 'string' ||
    !/^sha256:[a-f0-9]{64}$/.test(value.publicKeyFingerprint) ||
    typeof value.manifestHash !== 'string' ||
    !/^sha256:[a-f0-9]{64}$/.test(value.manifestHash) ||
    typeof value.signature !== 'string' ||
    !/^[A-Za-z0-9+/]{86}==$/.test(value.signature)
  ) {
    throw new WorkflowArtifactAttestationError(
      'INVALID_ATTESTATION',
      'Workflow artifact attestation does not match workflow_artifact_attestation.v0.1.'
    );
  }
  const signature = Buffer.from(value.signature, 'base64');
  if (signature.byteLength !== 64 || signature.toString('base64') !== value.signature) {
    throw new WorkflowArtifactAttestationError(
      'INVALID_ATTESTATION',
      'Workflow artifact attestation signature is malformed.'
    );
  }
  return {
    schemaVersion: 'workflow_artifact_attestation.v0.1',
    algorithm: 'Ed25519',
    keyId: value.keyId,
    publicKeyFingerprint: value.publicKeyFingerprint,
    manifestHash: value.manifestHash,
    signature: value.signature
  };
}

export function verifyWorkflowArtifactAttestation(
  manifest: WorkflowArtifactManifest,
  attestationValue: unknown,
  trustedPublicKey: WorkflowArtifactKey
): WorkflowArtifactAttestation {
  const attestation = parseWorkflowArtifactAttestation(attestationValue);
  const publicKey = parseKey(trustedPublicKey, 'public');
  assertEd25519(publicKey);
  const fingerprint = workflowArtifactPublicKeyFingerprint(publicKey);
  if (fingerprint !== attestation.publicKeyFingerprint) {
    throw new WorkflowArtifactAttestationError(
      'KEY_FINGERPRINT_MISMATCH',
      'Workflow artifact attestation was not created by the trusted public key.'
    );
  }
  if (workflowArtifactManifestHash(manifest) !== attestation.manifestHash) {
    throw new WorkflowArtifactAttestationError(
      'MANIFEST_HASH_MISMATCH',
      'Workflow artifact attestation does not bind the current manifest.'
    );
  }
  if (
    !verify(
      null,
      canonicalAttestationStatement({
        schemaVersion: attestation.schemaVersion,
        algorithm: attestation.algorithm,
        keyId: attestation.keyId,
        publicKeyFingerprint: attestation.publicKeyFingerprint,
        manifestHash: attestation.manifestHash
      }),
      publicKey,
      Buffer.from(attestation.signature, 'base64')
    )
  ) {
    throw new WorkflowArtifactAttestationError(
      'SIGNATURE_INVALID',
      'Workflow artifact attestation signature is invalid.'
    );
  }
  return attestation;
}
