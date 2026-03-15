import { error, json } from "@sveltejs/kit";
import { g as generateId } from "../../../../../chunks/index2.js";
const GET = async ({ url, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    throw error(500, "Database not available");
  }
  const stage = url.searchParams.get("stage");
  const source = url.searchParams.get("source");
  const campaign = url.searchParams.get("campaign");
  let query = "SELECT * FROM leads WHERE 1=1";
  const params = [];
  if (stage) {
    query += " AND stage = ?";
    params.push(stage);
  }
  if (source) {
    query += " AND source = ?";
    params.push(source);
  }
  if (campaign) {
    query += " AND campaign = ?";
    params.push(campaign);
  }
  query += " ORDER BY updated_at DESC";
  try {
    const result = await db.prepare(query).bind(...params).all();
    return json({ leads: result.results });
  } catch (err) {
    console.error("Leads query error:", err);
    return json({ leads: [] });
  }
};
const POST = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    throw error(500, "Database not available");
  }
  const input = await request.json();
  if (!input.name) {
    throw error(400, "Name is required");
  }
  if (!input.source) {
    throw error(400, "Source is required");
  }
  const id = generateId("lead");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const stage = input.stage || "awareness";
  try {
    await db.prepare(
      `
			INSERT INTO leads (
				id, name, email, company, role, linkedin_url,
				source, source_detail, campaign, stage,
				estimated_value, service_interest,
				first_touch_at, last_touch_at, notes,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
    ).bind(
      id,
      input.name,
      input.email || null,
      input.company || null,
      input.role || null,
      input.linkedin_url || null,
      input.source,
      input.source_detail || null,
      input.campaign || null,
      stage,
      input.estimated_value || null,
      input.service_interest || null,
      now,
      now,
      input.notes || null,
      now,
      now
    ).run();
    return json({ success: true, id, stage });
  } catch (err) {
    console.error("Lead insert error:", err);
    throw error(500, "Failed to create lead");
  }
};
export {
  GET,
  POST
};
