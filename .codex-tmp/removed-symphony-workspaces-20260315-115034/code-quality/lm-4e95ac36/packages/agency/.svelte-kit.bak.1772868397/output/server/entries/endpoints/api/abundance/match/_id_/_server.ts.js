import { error, json } from "@sveltejs/kit";
import { s as safeJsonParse } from "../../../../../../chunks/matching.js";
const GET = async ({ params, platform }) => {
  try {
    if (!platform?.env?.DB) {
      throw error(500, "Database not available");
    }
    const match = await platform.env.DB.prepare(
      "SELECT * FROM matches WHERE id = ?"
    ).bind(params.id).first();
    if (!match) {
      return json({ success: false, error: "Match not found" }, { status: 404 });
    }
    const result = {
      ...match,
      deliverables: safeJsonParse(match.deliverables, void 0, "deliverables"),
      fit_breakdown: safeJsonParse(match.fit_breakdown, void 0, "fit_breakdown")
    };
    return json({ success: true, data: result });
  } catch (err) {
    console.error("Match fetch error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error fetching match: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
};
const PATCH = async ({ params, request, platform }) => {
  try {
    if (!platform?.env?.DB) {
      throw error(500, "Database not available");
    }
    const existing = await platform.env.DB.prepare(
      "SELECT * FROM matches WHERE id = ?"
    ).bind(params.id).first();
    if (!existing) {
      return json({ success: false, error: "Match not found" }, { status: 404 });
    }
    const body = await request.json();
    const updates = [];
    const values = [];
    if ("status" in body) {
      const validStatuses = ["suggested", "accepted", "declined", "in_progress", "completed", "cancelled"];
      const status = body.status;
      if (!validStatuses.includes(status)) {
        return json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
      }
      updates.push("status = ?");
      values.push(status);
      if (["completed", "cancelled", "declined"].includes(status)) {
        updates.push("resolved_at = datetime('now')");
      }
    }
    const feedbackFields = ["seeker_rating", "seeker_feedback", "talent_rating", "talent_feedback"];
    for (const field of feedbackFields) {
      if (field in body) {
        const fieldValue = body[field];
        if (field.includes("rating") && fieldValue !== null) {
          const rating = Number(fieldValue);
          if (isNaN(rating) || rating < 1 || rating > 5) {
            return json({ success: false, error: `${field} must be between 1 and 5` }, { status: 400 });
          }
        }
        updates.push(`${field} = ?`);
        values.push(fieldValue ?? null);
      }
    }
    if (updates.length === 0) {
      return json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }
    values.push(params.id);
    await platform.env.DB.prepare(`
			UPDATE matches SET ${updates.join(", ")} WHERE id = ?
		`).bind(...values).run();
    const updated = await platform.env.DB.prepare(
      "SELECT * FROM matches WHERE id = ?"
    ).bind(params.id).first();
    if (!updated) {
      throw error(500, "Failed to fetch updated match");
    }
    const result = {
      ...updated,
      deliverables: safeJsonParse(updated.deliverables, void 0, "deliverables"),
      fit_breakdown: safeJsonParse(updated.fit_breakdown, void 0, "fit_breakdown")
    };
    return json({ success: true, data: result });
  } catch (err) {
    console.error("Match update error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error updating match: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
};
export {
  GET,
  PATCH
};
