import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  type KeyObject
} from 'node:crypto';

export const CLIENT_WORKSPACE_PACKAGE_SCHEMA =
  'create-something/client-workspace-package@1' as const;

export type ClientWorkspaceStaticPreview = {
  kind: 'static';
  root: string;
  entry: string;
};

export type ClientWorkspacePackageManifest = {
  schema: typeof CLIENT_WORKSPACE_PACKAGE_SCHEMA;
  packageId: string;
  createdAt: string;
  issuer: string;
  keyId: string;
  releaseManifestPath: string;
  workspace: {
    id: string;
    label: string;
    sourcePrefix: string;
    editableRoots: string[];
    preview: ClientWorkspaceStaticPreview;
  };
  files: Array<{ path: string; sha256: string; sizeBytes: number }>;
};

export type ClientWorkspacePackageEnvelope = {
  schema: typeof CLIENT_WORKSPACE_PACKAGE_SCHEMA;
  manifest: ClientWorkspacePackageManifest;
  files: Array<{ path: string; contentBase64: string }>;
  signature: { algorithm: 'Ed25519'; value: string };
};

export type CreateClientWorkspacePackageOptions = {
  manifest: Omit<ClientWorkspacePackageManifest, 'schema' | 'files'>;
  files: Record<string, string | Uint8Array>;
  privateKey: KeyObject | string | Buffer;
};

export type VerifiedClientWorkspacePackage = {
  manifest: ClientWorkspacePackageManifest;
  files: Map<string, Buffer>;
};

export type ClientWorkspacePackageErrorCode =
  | 'file_hash_mismatch'
  | 'invalid_package'
  | 'invalid_path'
  | 'invalid_signature'
  | 'package_limit_exceeded';

export class ClientWorkspacePackageError extends Error {
  readonly code: ClientWorkspacePackageErrorCode;

  constructor(code: ClientWorkspacePackageErrorCode, message: string) {
    super(message);
    this.name = 'ClientWorkspacePackageError';
    this.code = code;
  }
}

const MAX_PACKAGE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 500;

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function assertRelativePath(value: unknown, allowCurrentDirectory = false): string {
  if (allowCurrentDirectory && value === '.') return '.';
  if (
    typeof value !== 'string' ||
    value === '' ||
    value.startsWith('/') ||
    value.startsWith('\\') ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.includes('\\') ||
    value
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..' || part.includes('\0'))
  ) {
    throw new ClientWorkspacePackageError(
      'invalid_path',
      'Package paths must be normalized relative paths.'
    );
  }
  return value;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ClientWorkspacePackageError('invalid_package', 'Expected a package object.');
  }
  return value as Record<string, unknown>;
}

function exactFields(object: Record<string, unknown>, fields: readonly string[]): void {
  const keys = Object.keys(object).sort();
  const expected = [...fields].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'Package fields do not match the schema.'
    );
  }
}

function requiredString(value: unknown, pattern?: RegExp): string {
  if (typeof value !== 'string' || value.trim() === '' || (pattern && !pattern.test(value))) {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'Package contains an invalid string field.'
    );
  }
  return value;
}

function parseManifest(value: unknown): ClientWorkspacePackageManifest {
  const manifest = asObject(value);
  exactFields(manifest, [
    'schema',
    'packageId',
    'createdAt',
    'issuer',
    'keyId',
    'releaseManifestPath',
    'workspace',
    'files'
  ]);
  if (manifest.schema !== CLIENT_WORKSPACE_PACKAGE_SCHEMA) {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'Unsupported workspace package schema.'
    );
  }
  const workspace = asObject(manifest.workspace);
  exactFields(workspace, ['id', 'label', 'sourcePrefix', 'editableRoots', 'preview']);
  const preview = asObject(workspace.preview);
  exactFields(preview, ['kind', 'root', 'entry']);
  if (preview.kind !== 'static') {
    throw new ClientWorkspacePackageError('invalid_package', 'Only static previews are supported.');
  }
  if (!Array.isArray(workspace.editableRoots) || workspace.editableRoots.length === 0) {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'At least one editable root is required.'
    );
  }
  if (
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0 ||
    manifest.files.length > MAX_FILES
  ) {
    throw new ClientWorkspacePackageError(
      'package_limit_exceeded',
      'Package file count is outside the allowed boundary.'
    );
  }

  const seen = new Set<string>();
  let totalSize = 0;
  const files = manifest.files.map((candidate) => {
    const file = asObject(candidate);
    exactFields(file, ['path', 'sha256', 'sizeBytes']);
    const path = assertRelativePath(file.path);
    if (seen.has(path)) {
      throw new ClientWorkspacePackageError(
        'invalid_package',
        'Package contains duplicate file paths.'
      );
    }
    seen.add(path);
    const sizeBytes = file.sizeBytes;
    if (
      !Number.isInteger(sizeBytes) ||
      (sizeBytes as number) < 0 ||
      (sizeBytes as number) > MAX_FILE_BYTES
    ) {
      throw new ClientWorkspacePackageError(
        'package_limit_exceeded',
        'Package file exceeds the allowed size.'
      );
    }
    totalSize += sizeBytes as number;
    return {
      path,
      sha256: requiredString(file.sha256, /^[a-f0-9]{64}$/),
      sizeBytes: sizeBytes as number
    };
  });
  if (totalSize > MAX_TOTAL_FILE_BYTES) {
    throw new ClientWorkspacePackageError(
      'package_limit_exceeded',
      'Package content exceeds the allowed size.'
    );
  }

  const sourcePrefix = assertRelativePath(workspace.sourcePrefix);
  const editableRoots = workspace.editableRoots.map((value) => assertRelativePath(value, true));
  const previewRoot = assertRelativePath(preview.root, true);
  const previewEntry = assertRelativePath(preview.entry);
  const createdAt = requiredString(manifest.createdAt);
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new ClientWorkspacePackageError('invalid_package', 'Package timestamp is invalid.');
  }

  return {
    schema: CLIENT_WORKSPACE_PACKAGE_SCHEMA,
    packageId: requiredString(manifest.packageId, /^[a-z0-9][a-z0-9-]{0,127}$/),
    createdAt,
    issuer: requiredString(manifest.issuer),
    keyId: requiredString(manifest.keyId, /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/),
    releaseManifestPath: assertRelativePath(manifest.releaseManifestPath),
    workspace: {
      id: requiredString(workspace.id, /^[a-z0-9][a-z0-9-]{0,63}$/),
      label: requiredString(workspace.label),
      sourcePrefix,
      editableRoots,
      preview: { kind: 'static', root: previewRoot, entry: previewEntry }
    },
    files
  };
}

function canonicalManifest(manifest: ClientWorkspacePackageManifest): Buffer {
  return Buffer.from(JSON.stringify(manifest));
}

function keyObject(value: KeyObject | string | Buffer, kind: 'private' | 'public'): KeyObject {
  if (typeof value !== 'string' && !Buffer.isBuffer(value)) return value;
  return kind === 'private' ? createPrivateKey(value) : createPublicKey(value);
}

export function createClientWorkspacePackage(options: CreateClientWorkspacePackageOptions): string {
  const files = Object.entries(options.files)
    .map(([path, content]) => {
      const normalizedPath = assertRelativePath(path);
      const bytes = Buffer.from(content);
      return {
        path: normalizedPath,
        bytes,
        reference: { path: normalizedPath, sha256: sha256(bytes), sizeBytes: bytes.byteLength }
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  const manifest = parseManifest({
    ...options.manifest,
    schema: CLIENT_WORKSPACE_PACKAGE_SCHEMA,
    files: files.map((file) => file.reference)
  });
  const signature = sign(
    null,
    canonicalManifest(manifest),
    keyObject(options.privateKey, 'private')
  );
  const envelope: ClientWorkspacePackageEnvelope = {
    schema: CLIENT_WORKSPACE_PACKAGE_SCHEMA,
    manifest,
    files: files.map(({ path, bytes }) => ({ path, contentBase64: bytes.toString('base64') })),
    signature: { algorithm: 'Ed25519', value: signature.toString('base64') }
  };
  return `${JSON.stringify(envelope)}\n`;
}

export function verifyClientWorkspacePackage(
  packageJson: string | Buffer,
  trustedPublicKey: KeyObject | string | Buffer
): VerifiedClientWorkspacePackage {
  const bytes = Buffer.from(packageJson);
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PACKAGE_BYTES) {
    throw new ClientWorkspacePackageError(
      'package_limit_exceeded',
      'Workspace package exceeds the allowed size.'
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'Workspace package is not valid JSON.'
    );
  }
  const envelope = asObject(parsed);
  exactFields(envelope, ['schema', 'manifest', 'files', 'signature']);
  if (envelope.schema !== CLIENT_WORKSPACE_PACKAGE_SCHEMA) {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'Unsupported workspace package schema.'
    );
  }
  const manifest = parseManifest(envelope.manifest);
  const signature = asObject(envelope.signature);
  exactFields(signature, ['algorithm', 'value']);
  if (signature.algorithm !== 'Ed25519') {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'Unsupported workspace package signature algorithm.'
    );
  }
  let signatureBytes: Buffer;
  try {
    signatureBytes = Buffer.from(requiredString(signature.value), 'base64');
  } catch {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'Workspace package signature is malformed.'
    );
  }
  if (
    !verify(
      null,
      canonicalManifest(manifest),
      keyObject(trustedPublicKey, 'public'),
      signatureBytes
    )
  ) {
    throw new ClientWorkspacePackageError(
      'invalid_signature',
      'Workspace package signature is not trusted.'
    );
  }
  if (!Array.isArray(envelope.files) || envelope.files.length !== manifest.files.length) {
    throw new ClientWorkspacePackageError(
      'invalid_package',
      'Workspace package content does not match its manifest.'
    );
  }
  const references = new Map(manifest.files.map((file) => [file.path, file]));
  const decoded = new Map<string, Buffer>();
  for (const candidate of envelope.files) {
    const file = asObject(candidate);
    exactFields(file, ['path', 'contentBase64']);
    const path = assertRelativePath(file.path);
    const reference = references.get(path);
    if (!reference || decoded.has(path)) {
      throw new ClientWorkspacePackageError(
        'invalid_package',
        'Workspace package contains undeclared or duplicate content.'
      );
    }
    const contentBase64 = requiredString(file.contentBase64);
    const content = Buffer.from(contentBase64, 'base64');
    if (content.byteLength !== reference.sizeBytes || sha256(content) !== reference.sha256) {
      throw new ClientWorkspacePackageError(
        'file_hash_mismatch',
        `Workspace package content failed verification: ${path}`
      );
    }
    decoded.set(path, content);
  }
  return { manifest, files: decoded };
}
