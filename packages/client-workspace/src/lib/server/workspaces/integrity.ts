import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';

import type { ResolvedWorkspaceDefinition } from './registry.js';

export type WorkspaceIntegrityManifest = {
  schema: 'create-something/workspace-integrity@1';
  files: Record<string, string>;
};

export type WorkspaceIntegrityChange = {
  path: string;
  kind: 'added' | 'changed' | 'removed';
};

const DERIVED_DIRECTORY_NAMES = new Set([
  '.git',
  '.svelte-kit',
  '.vite',
  'build',
  'dist',
  'node_modules'
]);

function isWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return (
    pathFromRoot === '' ||
    (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== '..' && !isAbsolute(pathFromRoot))
  );
}

function isEditable(workspace: Readonly<ResolvedWorkspaceDefinition>, path: string): boolean {
  return workspace.editableRoots.some((editableRoot) => isWithin(editableRoot, path));
}

async function digest(path: string): Promise<string> {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink()) {
    return createHash('sha256')
      .update(`symlink:${await readlink(path)}`)
      .digest('hex');
  }
  if (!metadata.isFile()) return `mode:${metadata.mode}:other`;
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

export async function captureWorkspaceIntegrity(
  workspace: Readonly<ResolvedWorkspaceDefinition>
): Promise<WorkspaceIntegrityManifest> {
  const files: Record<string, string> = {};

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (isEditable(workspace, path)) continue;
      if (entry.isDirectory() && DERIVED_DIRECTORY_NAMES.has(entry.name)) continue;
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      const relativePath = relative(workspace.sourceRoot, path).split(sep).join('/');
      files[relativePath] = await digest(path);
    }
  }

  await visit(workspace.sourceRoot);
  return { schema: 'create-something/workspace-integrity@1', files };
}

export async function inspectWorkspaceIntegrity(
  workspace: Readonly<ResolvedWorkspaceDefinition>,
  baseline: WorkspaceIntegrityManifest
): Promise<WorkspaceIntegrityChange[]> {
  const current = await captureWorkspaceIntegrity(workspace);
  const paths = new Set([...Object.keys(baseline.files), ...Object.keys(current.files)]);
  return [...paths].sort().flatMap((path): WorkspaceIntegrityChange[] => {
    if (!(path in baseline.files)) return [{ path, kind: 'added' }];
    if (!(path in current.files)) return [{ path, kind: 'removed' }];
    return baseline.files[path] === current.files[path] ? [] : [{ path, kind: 'changed' }];
  });
}
