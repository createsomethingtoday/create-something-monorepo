/**
 * Database Access Layer
 *
 * Typed queries for the templates platform D1 database.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  User,
  Template,
  Tenant,
  TenantDeployment,
  TenantStatus
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first();

  return result ? mapUser(result) : null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first();

  return result ? mapUser(result) : null;
}

export async function createUser(
  db: D1Database,
  user: Omit<User, 'createdAt' | 'updatedAt'>
): Promise<User> {
  const id = user.id || crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO users (id, email, name, avatar_url)
       VALUES (?, ?, ?, ?)`
    )
    .bind(id, user.email, user.name || null, user.avatarUrl || null)
    .run();

  return (await getUserById(db, id))!;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export async function getTemplates(db: D1Database): Promise<Template[]> {
  const { results } = await db
    .prepare('SELECT * FROM templates WHERE is_active = 1 ORDER BY name')
    .all();

  return results.map(mapTemplate);
}

export async function getTemplateBySlug(db: D1Database, slug: string): Promise<Template | null> {
  const result = await db
    .prepare('SELECT * FROM templates WHERE slug = ? AND is_active = 1')
    .bind(slug)
    .first();

  return result ? mapTemplate(result) : null;
}

export async function getTemplateById(db: D1Database, id: string): Promise<Template | null> {
  const result = await db
    .prepare('SELECT * FROM templates WHERE id = ?')
    .bind(id)
    .first();

  return result ? mapTemplate(result) : null;
}

export async function getTemplatesByCategory(
  db: D1Database,
  category: string
): Promise<Template[]> {
  const { results } = await db
    .prepare('SELECT * FROM templates WHERE category = ? AND is_active = 1 ORDER BY name')
    .bind(category)
    .all();

  return results.map(mapTemplate);
}

// ═══════════════════════════════════════════════════════════════════════════
// TENANTS (Sites)
// ═══════════════════════════════════════════════════════════════════════════

export async function getTenantsByUserId(db: D1Database, userId: string): Promise<Tenant[]> {
  const { results } = await db
    .prepare('SELECT * FROM tenants WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all();

  return results.map(mapTenant);
}

export async function getTenantById(db: D1Database, id: string): Promise<Tenant | null> {
  const result = await db
    .prepare('SELECT * FROM tenants WHERE id = ?')
    .bind(id)
    .first();

  return result ? mapTenant(result) : null;
}

export async function getTenantBySubdomain(
  db: D1Database,
  subdomain: string
): Promise<Tenant | null> {
  const result = await db
    .prepare('SELECT * FROM tenants WHERE subdomain = ?')
    .bind(subdomain)
    .first();

  return result ? mapTenant(result) : null;
}

export async function isSubdomainAvailable(db: D1Database, subdomain: string): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM tenants WHERE subdomain = ?')
    .bind(subdomain)
    .first();

  return !result;
}

export async function createTenant(
  db: D1Database,
  tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Tenant> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO tenants (id, user_id, template_id, subdomain, custom_domain, status, config)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      tenant.userId,
      tenant.templateId,
      tenant.subdomain,
      tenant.customDomain || null,
      tenant.status,
      JSON.stringify(tenant.config)
    )
    .run();

  return (await getTenantById(db, id))!;
}

export async function updateTenantStatus(
  db: D1Database,
  id: string,
  status: TenantStatus,
  errorMessage?: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE tenants
       SET status = ?, error_message = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(status, errorMessage || null, id)
    .run();
}

export async function updateTenantConfig(
  db: D1Database,
  id: string,
  config: Record<string, unknown>
): Promise<void> {
  await db
    .prepare(
      `UPDATE tenants
       SET config = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(JSON.stringify(config), id)
    .run();
}

export async function markTenantDeployed(db: D1Database, id: string): Promise<void> {
  await db
    .prepare(
      `UPDATE tenants
       SET status = 'active', deployed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(id)
    .run();
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPLOYMENTS
// ═══════════════════════════════════════════════════════════════════════════

export async function createDeployment(
  db: D1Database,
  tenantId: string,
  configSnapshot: Record<string, unknown>
): Promise<TenantDeployment> {
  const id = crypto.randomUUID();

  // Get next version number
  const lastDeploy = await db
    .prepare('SELECT MAX(version) as max_version FROM deployments WHERE tenant_id = ?')
    .bind(tenantId)
    .first<{ max_version: number | null }>();

  const version = (lastDeploy?.max_version || 0) + 1;

  await db
    .prepare(
      `INSERT INTO deployments (id, tenant_id, version, status, config_snapshot)
       VALUES (?, ?, ?, 'pending', ?)`
    )
    .bind(id, tenantId, version, JSON.stringify(configSnapshot))
    .run();

  return {
    id,
    tenantId,
    version,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

export async function updateDeploymentStatus(
  db: D1Database,
  id: string,
  status: 'building' | 'deployed' | 'failed',
  buildLog?: string
): Promise<void> {
  const deployedAt = status === 'deployed' ? "datetime('now')" : 'NULL';

  await db
    .prepare(
      `UPDATE deployments
       SET status = ?, build_log = ?, deployed_at = ${status === 'deployed' ? "datetime('now')" : 'NULL'}
       WHERE id = ?`
    )
    .bind(status, buildLog || null, id)
    .run();
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPPERS
// ═══════════════════════════════════════════════════════════════════════════

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string | undefined,
    avatarUrl: row.avatar_url as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function mapTemplate(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as Template['category'],
    subcategories: JSON.parse((row.subcategories as string) || '[]'),
    thumbnail: row.thumbnail as string,
    previewUrl: row.preview_url as string,
    pricing: JSON.parse((row.pricing as string) || '{}'),
    features: JSON.parse((row.features as string) || '[]'),
    designPhilosophy: JSON.parse((row.design_philosophy as string) || '{}'),
    configSchema: JSON.parse((row.config_schema as string) || '{"required":[],"optional":[]}'),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function mapTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    templateId: row.template_id as string,
    subdomain: row.subdomain as string,
    customDomain: row.custom_domain as string | undefined,
    status: row.status as TenantStatus,
    config: JSON.parse((row.config as string) || '{}'),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deployedAt: row.deployed_at as string | undefined
  };
}
