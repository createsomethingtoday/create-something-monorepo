import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

/** Hash every byte and path, including dotfiles. No formatter or ignored generated files. */
export function manifest(root, prefix = '') {
  return readdirSync(join(root, prefix)).sort().flatMap((name) => {
    const relativePath = prefix ? `${prefix}/${name}` : name;
    const path = join(root, relativePath);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Unexpected generated symlink: ${relativePath}`);
    if (stat.isDirectory()) return manifest(root, relativePath);
    const bytes = readFileSync(path);
    return [{ path: relativePath, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
  });
}
