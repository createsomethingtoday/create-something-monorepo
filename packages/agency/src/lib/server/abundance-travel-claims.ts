export class TravelInProgressError extends Error {}
export async function withTravelReportClaim<T>(
  db: D1Database,
  cacheKey: string,
  work: () => Promise<T>
): Promise<T> {
  const owner = crypto.randomUUID(),
    now = Date.now();
  const claim = await db
    .prepare(
      `INSERT INTO abundance_travel_claims(cache_key,owner,expires_at_ms) VALUES(?,?,?)
 ON CONFLICT(cache_key) DO UPDATE SET owner=excluded.owner,expires_at_ms=excluded.expires_at_ms WHERE abundance_travel_claims.expires_at_ms<? RETURNING owner`
    )
    .bind(cacheKey, owner, now + 300000, now)
    .first<{ owner: string }>();
  if (!claim)
    throw new TravelInProgressError(
      'An identical travel report is in progress. Retry shortly to retrieve its result.'
    );
  try {
    return await work();
  } finally {
    await db
      .prepare('DELETE FROM abundance_travel_claims WHERE cache_key=? AND owner=?')
      .bind(cacheKey, owner)
      .run();
  }
}
