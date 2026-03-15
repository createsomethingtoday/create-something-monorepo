import { error, json } from "@sveltejs/kit";
import { s as safeJsonParse } from "../../../../../../chunks/matching.js";
const GET = async ({ params, platform }) => {
  try {
    if (!platform?.env?.DB) {
      throw error(500, "Database not available");
    }
    const talent = await platform.env.DB.prepare(
      "SELECT * FROM talent WHERE id = ?"
    ).bind(params.id).first();
    if (!talent) {
      return json({ success: false, error: "Talent not found" }, { status: 404 });
    }
    const result = {
      ...talent,
      skills: safeJsonParse(talent.skills, [], "skills"),
      styles: safeJsonParse(talent.styles, void 0, "styles")
    };
    return json({ success: true, data: result });
  } catch (err) {
    console.error("Talent fetch error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error fetching talent: ${err instanceof Error ? err.message : "Unknown error"}` },
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
      "SELECT * FROM talent WHERE id = ?"
    ).bind(params.id).first();
    if (!existing) {
      return json({ success: false, error: "Talent not found" }, { status: 404 });
    }
    const body = await request.json();
    const updates = [];
    const values = [];
    const allowedFields = [
      "name",
      "email",
      "portfolio_url",
      "instagram",
      "hourly_rate_min",
      "hourly_rate_max",
      "availability",
      "timezone",
      "abundance_index",
      "status"
    ];
    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field] ?? null);
      }
    }
    if ("skills" in body) {
      const skills = body.skills;
      if (!Array.isArray(skills) || skills.length === 0) {
        return json({ success: false, error: "Skills must be a non-empty array" }, { status: 400 });
      }
      updates.push("skills = ?");
      values.push(JSON.stringify(skills));
    }
    if ("styles" in body) {
      updates.push("styles = ?");
      values.push(body.styles ? JSON.stringify(body.styles) : null);
    }
    if (updates.length === 0) {
      return json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }
    values.push(params.id);
    await platform.env.DB.prepare(`
			UPDATE talent SET ${updates.join(", ")} WHERE id = ?
		`).bind(...values).run();
    const updated = await platform.env.DB.prepare(
      "SELECT * FROM talent WHERE id = ?"
    ).bind(params.id).first();
    if (!updated) {
      throw error(500, "Failed to fetch updated talent");
    }
    const result = {
      ...updated,
      skills: safeJsonParse(updated.skills, [], "skills"),
      styles: safeJsonParse(updated.styles, void 0, "styles")
    };
    return json({ success: true, data: result });
  } catch (err) {
    console.error("Talent update error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error updating talent: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
};
export {
  GET,
  PATCH
};
