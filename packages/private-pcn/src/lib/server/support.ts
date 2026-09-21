import type { D1Database } from '@cloudflare/workers-types';
export interface SupportWorkspace {
  network_id: string;
  owner_id: string;
  partner_id: string;
  company: string;
  workflow: string;
  status: string;
  slug: string;
}
export async function supportWorkspace(db: D1Database, id: string, subject: string) {
  return db
    .prepare(
      `SELECT s.*,n.slug FROM support_workspaces s JOIN networks n ON n.id=s.network_id WHERE s.network_id=?
 AND (s.owner_id=? OR (s.partner_id=? AND EXISTS(SELECT 1 FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.subject=s.partner_id AND p.approved=1 AND a.status='approved')))`
    )
    .bind(id, subject, subject)
    .first<SupportWorkspace>();
}
