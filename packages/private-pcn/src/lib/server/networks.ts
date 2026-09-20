import type { D1Database } from '@cloudflare/workers-types';
export type Network = {
  id: string;
  slug: string;
  owner_id: string | null;
  name: string;
  description: string;
  format: 'academy' | 'collective' | 'research';
  access_model: 'members' | 'preview';
  status: 'draft' | 'active' | 'suspended';
};
const reserved = new Set([
  'admin',
  'api',
  'dashboard',
  'login',
  'signup',
  'new',
  'settings',
  'www',
  'private'
]);
export function validSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(value) &&
    !reserved.has(value)
  );
}
export function networkSlug(path: string): string | null {
  const match = path.match(/^\/(?:n|api\/networks)\/([^/]+)(?:\/|$)/);
  return match ? match[1] : null;
}
export async function networkRole(
  db: D1Database,
  network: Network,
  identity: { subject: string; email: string } | null,
  platformAdmin: boolean
): Promise<'admin' | 'member' | 'blocked' | undefined> {
  if (!identity) return undefined;
  // Platform administration is deliberately confined to the original network.
  if (network.owner_id === identity.subject || (network.id === 'default' && platformAdmin))
    return 'admin';
  const member = await db
    .prepare('SELECT active FROM members WHERE network_id = ? AND email = ?')
    .bind(network.id, identity.email)
    .first<{ active: number }>();
  return member?.active === 1 ? 'member' : 'blocked';
}
export function publicNetwork(network: Network) {
  const { owner_id: _, ...publicFields } = network;
  return publicFields;
}
