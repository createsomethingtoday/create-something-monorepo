import { isAbsolute, relative, resolve, sep } from 'node:path';

export type WorkspaceProcessPreviewDefinition = {
  kind?: 'process';
  command: string;
  args: string[];
  port: number;
  healthPath?: string;
};

export type WorkspaceStaticPreviewDefinition = {
  kind: 'static';
  root: string;
  entry: string;
};

export type WorkspacePreviewDefinition =
  | WorkspaceProcessPreviewDefinition
  | WorkspaceStaticPreviewDefinition;

export type WorkspaceDefinition = {
  id: string;
  label: string;
  sourceRoot: string;
  editableRoots: string[];
  preview: WorkspacePreviewDefinition;
};

export type PublicWorkspace = {
  id: string;
  label: string;
  previewPath: string;
};

export type WorkspaceRegistryOptions = {
  managedRoot: string;
  definitions: WorkspaceDefinition[];
};

export type WorkspaceRegistryErrorCode =
  | 'invalid_workspace_definition'
  | 'workspace_not_found'
  | 'workspace_path_escape'
  | 'workspace_root_escape';

export class WorkspaceRegistryError extends Error {
  readonly code: WorkspaceRegistryErrorCode;

  constructor(code: WorkspaceRegistryErrorCode, message: string) {
    super(message);
    this.name = 'WorkspaceRegistryError';
    this.code = code;
  }
}

export type ResolvedWorkspaceDefinition = Omit<
  WorkspaceDefinition,
  'sourceRoot' | 'editableRoots'
> & {
  sourceRoot: string;
  editableRoots: string[];
};

function isWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return (
    pathFromRoot === '' ||
    (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== '..' && !isAbsolute(pathFromRoot))
  );
}

function assertWorkspaceId(id: string): void {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
    throw new WorkspaceRegistryError(
      'invalid_workspace_definition',
      'Workspace id must be a lowercase slug.'
    );
  }
}

export class WorkspaceRegistry {
  readonly #managedRoot: string;
  readonly #definitions: Map<string, ResolvedWorkspaceDefinition>;

  constructor(options: WorkspaceRegistryOptions) {
    this.#managedRoot = resolve(options.managedRoot);
    this.#definitions = new Map();

    for (const definition of options.definitions) {
      this.register(definition);
    }
  }

  register(definition: WorkspaceDefinition): void {
    assertWorkspaceId(definition.id);
    if (this.#definitions.has(definition.id)) {
      throw new WorkspaceRegistryError(
        'invalid_workspace_definition',
        `Duplicate workspace id: ${definition.id}`
      );
    }

    const sourceRoot = resolve(definition.sourceRoot);
    if (!isWithin(this.#managedRoot, sourceRoot)) {
      throw new WorkspaceRegistryError(
        'workspace_root_escape',
        `Workspace ${definition.id} is outside the managed root.`
      );
    }

    const editableRoots = definition.editableRoots.map((editableRoot) => {
      if (editableRoot.trim() === '' || isAbsolute(editableRoot)) {
        throw new WorkspaceRegistryError(
          'invalid_workspace_definition',
          `Workspace ${definition.id} has an invalid editable root.`
        );
      }
      const normalized = resolve(sourceRoot, editableRoot);
      if (!isWithin(sourceRoot, normalized)) {
        throw new WorkspaceRegistryError(
          'workspace_root_escape',
          `Workspace ${definition.id} has an editable root outside its source root.`
        );
      }
      return normalized;
    });

    if (editableRoots.length === 0) {
      throw new WorkspaceRegistryError(
        'invalid_workspace_definition',
        `Workspace ${definition.id} must declare an editable root.`
      );
    }
    if (
      definition.preview.kind !== 'static' &&
      (!Number.isInteger(definition.preview.port) || definition.preview.port < 1024)
    ) {
      throw new WorkspaceRegistryError(
        'invalid_workspace_definition',
        `Workspace ${definition.id} has an invalid preview port.`
      );
    }
    if (
      definition.preview.kind === 'static' &&
      ((definition.preview.root !== '.' &&
        (definition.preview.root.trim() === '' ||
          isAbsolute(definition.preview.root) ||
          definition.preview.root.split(/[\\/]/).includes('..'))) ||
        definition.preview.entry.trim() === '' ||
        isAbsolute(definition.preview.entry) ||
        definition.preview.entry.split(/[\\/]/).includes('..'))
    ) {
      throw new WorkspaceRegistryError(
        'invalid_workspace_definition',
        `Workspace ${definition.id} has an invalid static preview boundary.`
      );
    }

    this.#definitions.set(definition.id, {
      ...definition,
      sourceRoot,
      editableRoots,
      preview:
        definition.preview.kind === 'static'
          ? { ...definition.preview }
          : { ...definition.preview, args: [...definition.preview.args] }
    });
  }

  list(): PublicWorkspace[] {
    return [...this.#definitions.values()].map(({ id, label }) => ({
      id,
      label,
      previewPath: `/api/workspaces/${encodeURIComponent(id)}/preview`
    }));
  }

  get(id: string): PublicWorkspace {
    const definition = this.#getDefinition(id);
    return {
      id: definition.id,
      label: definition.label,
      previewPath: `/api/workspaces/${encodeURIComponent(definition.id)}/preview`
    };
  }

  resolve(id: string): Readonly<ResolvedWorkspaceDefinition> {
    return this.#getDefinition(id);
  }

  resolveEditablePath(id: string, requestedPath: string): string {
    const definition = this.#getDefinition(id);
    if (requestedPath.trim() === '' || isAbsolute(requestedPath)) {
      throw new WorkspaceRegistryError(
        'workspace_path_escape',
        'Requested path is outside the workspace edit boundary.'
      );
    }

    const candidate = resolve(definition.sourceRoot, requestedPath);
    if (!definition.editableRoots.some((editableRoot) => isWithin(editableRoot, candidate))) {
      throw new WorkspaceRegistryError(
        'workspace_path_escape',
        'Requested path is outside the workspace edit boundary.'
      );
    }
    return candidate;
  }

  #getDefinition(id: string): ResolvedWorkspaceDefinition {
    const definition = this.#definitions.get(id);
    if (!definition) {
      throw new WorkspaceRegistryError('workspace_not_found', `Unknown workspace: ${id}`);
    }
    return definition;
  }
}
