import { createHash } from 'node:crypto';

export function stableId(prefix: string, parts: string[]): string {
  const digest = createHash('sha256')
    .update(parts.map((part) => part.trim()).join('\u001f'))
    .digest('hex')
    .slice(0, 20);
  return `${prefix}_${digest}`;
}
