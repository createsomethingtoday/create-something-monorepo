export class TravelQuotaError extends Error {}
/** One atomic SQLite statement prevents parallel callers overspending the shared allowance.
 * A conservative rolling 26-hour window avoids depending on the vendor's reset timezone.
 * Reservations are not refunded after ambiguous failures: the vendor may have billed them.
 */
export async function reserveTravelCredits(db: D1Database, credits: number, allowance = 2000) {
  if (!Number.isInteger(credits) || credits < 1 || credits > 300)
    throw new TypeError('Invalid routing batch size.');
  if (!Number.isInteger(allowance) || allowance < 0 || allowance > 2000)
    throw new TypeError('Routing allowance must be between 0 and 2000 credits.');
  const now = Date.now();
  const row = await db
    .prepare(
      `INSERT INTO abundance_travel_credit_reservations(id,credits,reserved_at_ms)
 SELECT ?,?,? WHERE (SELECT coalesce(sum(credits),0) FROM abundance_travel_credit_reservations WHERE reserved_at_ms>=?) + ? <= ?
 RETURNING id`
    )
    .bind(crypto.randomUUID(), credits, now, now - 26 * 60 * 60 * 1000, credits, allowance)
    .first<{ id: string }>();
  if (!row)
    throw new TravelQuotaError(
      'Routing allowance exhausted. Existing results remain available; retry after reservations expire.'
    );
}
