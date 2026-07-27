import { randomUUID, type KeyObject } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { inspectBuildReleasePackage } from '@create-something/delivery-schema/build-release';
import {
  ClientWorkspacePackageError,
  verifyClientWorkspacePackage
} from '@create-something/delivery-schema/client-workspace-package';

import type { WorkspaceDefinition } from '../workspaces/registry.js';

const CATALOG_SCHEMA = 'create-something/imported-client-workspace@1' as const;

type ImportedWorkspaceCatalog = {
  schema: typeof CATALOG_SCHEMA;
  packageId: string;
  importedAt: string;
  release: { releaseId: string; sourceSha: string };
  workspace: {
    id: string;
    label: string;
    editableRoots: string[];
    preview: { kind: 'static'; root: string; entry: string };
  };
};

export type ImportClientWorkspaceDeliveryOptions = {
  packageJson: string | Buffer;
  trustedPublicKey: KeyObject | string | Buffer;
  managedRoot: string;
  stateRoot: string;
  now?: () => Date;
};

export type ClientWorkspaceDeliveryErrorCode =
  | 'catalog_invalid'
  | 'delivery_import_unavailable'
  | 'package_untrusted'
  | 'release_not_ready'
  | 'workspace_exists'
  | 'workspace_invalid';

export class ClientWorkspaceDeliveryError extends Error {
  readonly code: ClientWorkspaceDeliveryErrorCode;

  constructor(code: ClientWorkspaceDeliveryErrorCode, message: string) {
    super(message);
    this.name = 'ClientWorkspaceDeliveryError';
    this.code = code;
  }
}

function definitionFromCatalog(
  catalog: ImportedWorkspaceCatalog,
  managedRoot: string
): WorkspaceDefinition {
  return {
    id: catalog.workspace.id,
    label: catalog.workspace.label,
    sourceRoot: join(resolve(managedRoot), catalog.workspace.id),
    editableRoots: [...catalog.workspace.editableRoots],
    preview: { ...catalog.workspace.preview }
  };
}

function parseCatalog(value: unknown): ImportedWorkspaceCatalog {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ClientWorkspaceDeliveryError(
      'catalog_invalid',
      'Imported workspace catalog is invalid.'
    );
  }
  const catalog = value as Partial<ImportedWorkspaceCatalog>;
  if (
    catalog.schema !== CATALOG_SCHEMA ||
    typeof catalog.packageId !== 'string' ||
    typeof catalog.importedAt !== 'string' ||
    !catalog.release ||
    typeof catalog.release.releaseId !== 'string' ||
    typeof catalog.release.sourceSha !== 'string' ||
    !catalog.workspace ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(catalog.workspace.id ?? '') ||
    typeof catalog.workspace.label !== 'string' ||
    !Array.isArray(catalog.workspace.editableRoots) ||
    catalog.workspace.editableRoots.length === 0 ||
    catalog.workspace.preview?.kind !== 'static'
  ) {
    throw new ClientWorkspaceDeliveryError(
      'catalog_invalid',
      'Imported workspace catalog is invalid.'
    );
  }
  return catalog as ImportedWorkspaceCatalog;
}

export function loadImportedWorkspaceDefinitions(options: {
  managedRoot: string;
  stateRoot: string;
}): WorkspaceDefinition[] {
  const catalogRoot = join(resolve(options.stateRoot), 'deliveries');
  if (!existsSync(catalogRoot)) return [];
  return readdirSync(catalogRoot)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => parseCatalog(JSON.parse(readFileSync(join(catalogRoot, name), 'utf8'))))
    .map((catalog) => definitionFromCatalog(catalog, options.managedRoot))
    .filter(
      (definition) =>
        existsSync(definition.sourceRoot) && statSync(definition.sourceRoot).isDirectory()
    );
}

export async function importClientWorkspaceDelivery(
  options: ImportClientWorkspaceDeliveryOptions
): Promise<WorkspaceDefinition> {
  let verified;
  try {
    verified = verifyClientWorkspacePackage(options.packageJson, options.trustedPublicKey);
  } catch (error) {
    if (error instanceof ClientWorkspacePackageError) {
      throw new ClientWorkspaceDeliveryError(
        'package_untrusted',
        'Delivery signature or content verification failed.'
      );
    }
    throw error;
  }

  const managedRoot = resolve(options.managedRoot);
  const stateRoot = resolve(options.stateRoot);
  const destination = join(managedRoot, verified.manifest.workspace.id);
  if (existsSync(destination)) {
    throw new ClientWorkspaceDeliveryError(
      'workspace_exists',
      'This workspace is already installed.'
    );
  }
  const stagingRoot = join(managedRoot, '.imports', randomUUID());
  const sourceRoot = join(stagingRoot, verified.manifest.workspace.sourcePrefix);

  await mkdir(stagingRoot, { recursive: true, mode: 0o700 });
  try {
    for (const [path, content] of verified.files) {
      const target = join(stagingRoot, ...path.split('/'));
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, content, { flag: 'wx', mode: 0o600 });
    }

    const inspection = inspectBuildReleasePackage(
      join(stagingRoot, ...verified.manifest.releaseManifestPath.split('/'))
    );
    if (!inspection.releaseReady || !inspection.manifest) {
      throw new ClientWorkspaceDeliveryError(
        'release_not_ready',
        'Delivery Build release evidence is not ready.'
      );
    }
    if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory()) {
      throw new ClientWorkspaceDeliveryError(
        'workspace_invalid',
        'Delivery workspace source is missing.'
      );
    }
    for (const editableRoot of verified.manifest.workspace.editableRoots) {
      const path = editableRoot === '.' ? sourceRoot : join(sourceRoot, ...editableRoot.split('/'));
      if (!existsSync(path) || !statSync(path).isDirectory()) {
        throw new ClientWorkspaceDeliveryError(
          'workspace_invalid',
          'Delivery editable root is missing.'
        );
      }
    }
    const previewRoot =
      verified.manifest.workspace.preview.root === '.'
        ? sourceRoot
        : join(sourceRoot, ...verified.manifest.workspace.preview.root.split('/'));
    const previewEntry = join(previewRoot, ...verified.manifest.workspace.preview.entry.split('/'));
    if (!existsSync(previewEntry) || !statSync(previewEntry).isFile()) {
      throw new ClientWorkspaceDeliveryError(
        'workspace_invalid',
        'Delivery preview entry is missing.'
      );
    }

    const importedAt = (options.now ?? (() => new Date()))().toISOString();
    const catalog: ImportedWorkspaceCatalog = {
      schema: CATALOG_SCHEMA,
      packageId: verified.manifest.packageId,
      importedAt,
      release: {
        releaseId: inspection.manifest.releaseId,
        sourceSha: inspection.manifest.release.sourceSha
      },
      workspace: {
        id: verified.manifest.workspace.id,
        label: verified.manifest.workspace.label,
        editableRoots: [...verified.manifest.workspace.editableRoots],
        preview: { ...verified.manifest.workspace.preview }
      }
    };
    const deliveryRoot = join(stateRoot, 'deliveries');
    await mkdir(deliveryRoot, { recursive: true, mode: 0o700 });
    const packagePath = join(deliveryRoot, `${catalog.workspace.id}.csworkspace`);
    const catalogPath = join(deliveryRoot, `${catalog.workspace.id}.json`);
    const temporaryPackage = `${packagePath}.${randomUUID()}.tmp`;
    const temporaryCatalog = `${catalogPath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPackage, options.packageJson, { flag: 'wx', mode: 0o600 });
    await writeFile(temporaryCatalog, `${JSON.stringify(catalog, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600
    });

    await mkdir(managedRoot, { recursive: true, mode: 0o700 });
    await rename(sourceRoot, destination);
    try {
      await rename(temporaryPackage, packagePath);
      await rename(temporaryCatalog, catalogPath);
    } catch (error) {
      await rm(destination, { recursive: true, force: true });
      throw error;
    }
    return definitionFromCatalog(catalog, managedRoot);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}
