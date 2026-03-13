import { error, json } from "@sveltejs/kit";
const GET = async ({ params, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    throw error(500, "Database not available");
  }
  const { id } = params;
  try {
    const lead = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
    if (!lead) {
      throw error(404, "Lead not found");
    }
    return json(lead);
  } catch (err) {
    if (err instanceof Error && err.message === "Lead not found") {
      throw err;
    }
    console.error("Lead fetch error:", err);
    throw error(500, "Failed to fetch lead");
  }
};
const PATCH = async ({ params, request, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    throw error(500, "Database not available");
  }
  const { id } = params;
  const input = await request.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updates = ["updated_at = ?", "last_touch_at = ?"];
  const values = [now, now];
  if (input.stage !== void 0) {
    updates.push("stage = ?");
    values.push(input.stage);
    if (input.stage === "decision" && !input.discovery_call_at) {
      updates.push("discovery_call_at = ?");
      values.push(now);
    }
    if ((input.stage === "won" || input.stage === "lost") && !input.closed_at) {
      updates.push("closed_at = ?");
      values.push(now);
    }
  }
  if (input.name !== void 0) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.email !== void 0) {
    updates.push("email = ?");
    values.push(input.email);
  }
  if (input.company !== void 0) {
    updates.push("company = ?");
    values.push(input.company);
  }
  if (input.role !== void 0) {
    updates.push("role = ?");
    values.push(input.role);
  }
  if (input.linkedin_url !== void 0) {
    updates.push("linkedin_url = ?");
    values.push(input.linkedin_url);
  }
  if (input.source_detail !== void 0) {
    updates.push("source_detail = ?");
    values.push(input.source_detail);
  }
  if (input.campaign !== void 0) {
    updates.push("campaign = ?");
    values.push(input.campaign);
  }
  if (input.estimated_value !== void 0) {
    updates.push("estimated_value = ?");
    values.push(input.estimated_value);
  }
  if (input.actual_value !== void 0) {
    updates.push("actual_value = ?");
    values.push(input.actual_value);
  }
  if (input.service_interest !== void 0) {
    updates.push("service_interest = ?");
    values.push(input.service_interest);
  }
  if (input.notes !== void 0) {
    updates.push("notes = ?");
    values.push(input.notes);
  }
  if (input.discovery_call_at !== void 0) {
    updates.push("discovery_call_at = ?");
    values.push(input.discovery_call_at);
  }
  if (input.proposal_sent_at !== void 0) {
    updates.push("proposal_sent_at = ?");
    values.push(input.proposal_sent_at);
  }
  if (input.closed_at !== void 0) {
    updates.push("closed_at = ?");
    values.push(input.closed_at);
  }
  values.push(id);
  const query = `UPDATE leads SET ${updates.join(", ")} WHERE id = ?`;
  try {
    const result = await db.prepare(query).bind(...values).run();
    if (result.meta.changes === 0) {
      throw error(404, "Lead not found");
    }
    const lead = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
    return json(lead);
  } catch (err) {
    if (err instanceof Error && err.message === "Lead not found") {
      throw err;
    }
    console.error("Lead update error:", err);
    throw error(500, "Failed to update lead");
  }
};
const DELETE = async ({ params, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    throw error(500, "Database not available");
  }
  const { id } = params;
  try {
    const result = await db.prepare("DELETE FROM leads WHERE id = ?").bind(id).run();
    if (result.meta.changes === 0) {
      throw error(404, "Lead not found");
    }
    return json({ success: true, deleted: id });
  } catch (err) {
    if (err instanceof Error && err.message === "Lead not found") {
      throw err;
    }
    console.error("Lead delete error:", err);
    throw error(500, "Failed to delete lead");
  }
};
export {
  DELETE,
  GET,
  PATCH
};
