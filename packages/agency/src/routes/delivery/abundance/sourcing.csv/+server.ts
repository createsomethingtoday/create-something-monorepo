import { marketLocale } from '$lib/server/npg/market';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessNpgHealthcareAnalyst } from '$lib/server/abundance-client-access';
import { parseSourcingQuery, exportSourcingCsv } from '$lib/server/abundance-sourcing';
export const GET: RequestHandler = async ({ url, locals, platform }) => {
  if (!locals.user)
    throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname + url.search));
  if (!canAccessNpgHealthcareAnalyst(locals.user.email, platform?.env?.AGENCY_OPERATOR_EMAILS))
    throw error(403, 'NPG client access required');
  if (!platform?.env?.DB) throw error(503, 'Database unavailable');
  const db = platform.env.DB;
  const id = crypto.randomUUID();
  // Every HTTP request is an event. A prepared response does not prove receipt by a browser.
  const query = (() => {
    try {
      return parseSourcingQuery(url.searchParams);
    } catch (cause) {
      throw error(400, cause instanceof Error ? cause.message : 'Invalid export query');
    }
  })();
  let tracked = false;
  try {
    await db
      .prepare(
        "INSERT INTO npg_registry_export_events(id,owner_id,locale,requested_at,status) VALUES(?,?,?,?,'requested')"
      )
      .bind(
        id,
        locals.user.id,
        marketLocale(
          {
            city: query.city,
            state: query.state,
            center_address: query.centerAddress,
            radius_miles: query.radiusMiles
          },
          true
        ),
        Date.now()
      )
      .run();
    tracked = true;
  } catch {
    /* Optional telemetry must never prevent an authorized registry export. */
  }
  try {
    const response = await exportSourcingCsv(db, query);
    if (tracked)
      await db
        .prepare(
          "UPDATE npg_registry_export_events SET status='prepared' WHERE id=? AND owner_id=? AND status='requested'"
        )
        .bind(id, locals.user.id)
        .run()
        .catch(() => {});
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (cause) {
    if (tracked)
      await db
        .prepare(
          "UPDATE npg_registry_export_events SET status='failed' WHERE id=? AND owner_id=? AND status='requested'"
        )
        .bind(id, locals.user.id)
        .run()
        .catch(() => {});
    throw error(
      cause instanceof TypeError ? 400 : 503,
      cause instanceof TypeError
        ? cause.message
        : 'Export unavailable; no complete export was produced.'
    );
  }
};
