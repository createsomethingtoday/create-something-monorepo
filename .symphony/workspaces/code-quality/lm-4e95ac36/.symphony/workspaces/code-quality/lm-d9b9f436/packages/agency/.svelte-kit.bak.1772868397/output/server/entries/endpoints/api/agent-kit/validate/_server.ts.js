import { error, json } from "@sveltejs/kit";
const POST = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    throw error(500, "Database not available");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid JSON body");
  }
  const { key, machineId, hostname, os } = body;
  if (!key || !machineId) {
    throw error(400, "Missing required fields: key, machineId");
  }
  if (!key.startsWith("ak_") || key.length < 20) {
    return json({
      valid: false,
      tier: "solo",
      error: "Invalid license key format"
    });
  }
  try {
    const purchase = await db.prepare(
      `
			SELECT
				id,
				email,
				tier,
				license_key,
				office_hours_remaining,
				team_seats_total,
				team_seats_used,
				created_at
			FROM agent_kit_purchases
			WHERE license_key = ?
		`
    ).bind(key).first();
    if (!purchase) {
      return json({
        valid: false,
        tier: "solo",
        error: "License key not found"
      });
    }
    await db.prepare(
      `
			INSERT INTO agent_kit_activations (id, license_key, machine_id, hostname, os, activated_at, last_seen_at)
			VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			ON CONFLICT(license_key, machine_id) DO UPDATE SET
				hostname = excluded.hostname,
				os = excluded.os,
				last_seen_at = datetime('now')
		`
    ).bind(crypto.randomUUID(), key, machineId, hostname || null, os || null).run();
    const teamSeatsRemaining = purchase.tier === "org" ? 999 : purchase.team_seats_total - purchase.team_seats_used;
    return json({
      valid: true,
      tier: purchase.tier,
      email: purchase.email,
      officeHoursRemaining: purchase.office_hours_remaining,
      teamSeatsRemaining
    });
  } catch (err) {
    console.error("License validation error:", err);
    throw error(500, "License validation failed");
  }
};
export {
  POST
};
