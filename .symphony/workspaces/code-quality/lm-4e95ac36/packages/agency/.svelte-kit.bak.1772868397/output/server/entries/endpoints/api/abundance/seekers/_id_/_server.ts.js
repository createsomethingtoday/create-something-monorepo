import { error, json } from "@sveltejs/kit";
import { s as safeJsonParse } from "../../../../../../chunks/matching.js";
const GET = async ({ params, platform }) => {
  try {
    if (!platform?.env?.DB) {
      throw error(500, "Database not available");
    }
    const seeker = await platform.env.DB.prepare(
      "SELECT * FROM seekers WHERE id = ?"
    ).bind(params.id).first();
    if (!seeker) {
      return json({ success: false, error: "Seeker not found" }, { status: 404 });
    }
    const result = {
      ...seeker,
      preferred_formats: safeJsonParse(seeker.preferred_formats, void 0, "preferred_formats")
    };
    return json({ success: true, data: result });
  } catch (err) {
    console.error("Seeker fetch error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error fetching seeker: ${err instanceof Error ? err.message : "Unknown error"}` },
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
      "SELECT * FROM seekers WHERE id = ?"
    ).bind(params.id).first();
    if (!existing) {
      return json({ success: false, error: "Seeker not found" }, { status: 404 });
    }
    const body = await request.json();
    const updates = [];
    const values = [];
    const allowedFields = [
      "name",
      "email",
      "brand_name",
      "brand_vibe",
      "website",
      "typical_budget_min",
      "typical_budget_max",
      "readiness_score",
      "status"
    ];
    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field] ?? null);
      }
    }
    if ("preferred_formats" in body) {
      updates.push("preferred_formats = ?");
      values.push(body.preferred_formats ? JSON.stringify(body.preferred_formats) : null);
    }
    if (updates.length === 0) {
      return json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }
    values.push(params.id);
    await platform.env.DB.prepare(`
			UPDATE seekers SET ${updates.join(", ")} WHERE id = ?
		`).bind(...values).run();
    const updated = await platform.env.DB.prepare(
      "SELECT * FROM seekers WHERE id = ?"
    ).bind(params.id).first();
    if (!updated) {
      throw error(500, "Failed to fetch updated seeker");
    }
    const result = {
      ...updated,
      preferred_formats: safeJsonParse(updated.preferred_formats, void 0, "preferred_formats")
    };
    return json({ success: true, data: result });
  } catch (err) {
    console.error("Seeker update error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error updating seeker: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
};
export {
  GET,
  PATCH
};
