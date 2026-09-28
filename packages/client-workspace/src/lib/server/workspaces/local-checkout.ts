import { existsSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

import type { WorkspaceDefinition } from './registry.js';

export function loadLocalCheckout(raw: string | undefined): WorkspaceDefinition | null {
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('invalid_local_checkout'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_local_checkout');
  const item = value as Record<string, unknown>;
  if (Object.keys(item).sort().join(',') !== 'editableRoots,id,label,root' ||
    typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(item.id) ||
    typeof item.label !== 'string' || !item.label.trim() || item.label.length > 100 ||
    typeof item.root !== 'string' || !isAbsolute(item.root) || item.root === '/' ||
    !Array.isArray(item.editableRoots) || item.editableRoots.length === 0 ||
    !item.editableRoots.every((part) => typeof part === 'string' && part !== '.' &&
      part.length > 0 && !isAbsolute(part) && !part.split(/[\\/]/).includes('..'))) {
    throw new Error('invalid_local_checkout');
  }
  const root = resolve(item.root);
  if (!existsSync(root) || !existsSync(join(root, '.git')) ||
    realpathSync(root) !== root || !statSync(root).isDirectory() ||
    lstatSync(root).isSymbolicLink() ||
    (!statSync(join(root, '.git')).isDirectory() && !statSync(join(root, '.git')).isFile())) {
    throw new Error('invalid_local_checkout');
  }
  for (const part of item.editableRoots as string[]) {
    const path = resolve(root, part);
    if (!statSync(path).isDirectory()) throw new Error('invalid_local_checkout');
  }
  return {
    id: item.id, label: item.label, sourceRoot: root,
    editableRoots: item.editableRoots as string[], preview: { kind: 'none' }
  };
}
