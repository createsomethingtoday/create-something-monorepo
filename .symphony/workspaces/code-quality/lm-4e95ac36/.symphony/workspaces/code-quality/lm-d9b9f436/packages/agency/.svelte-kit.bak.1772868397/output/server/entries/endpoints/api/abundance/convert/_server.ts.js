import { error, json } from "@sveltejs/kit";
import { s as safeJsonParse, g as generateId } from "../../../../../chunks/matching.js";
const POST = async ({ request, platform }) => {
  try {
    if (!platform?.env?.DB) {
      throw error(500, "Database not available");
    }
    const body = await request.json();
    const { phone, target_type } = body;
    if (!phone || !phone.trim()) {
      return json({ success: false, error: "Phone number is required" }, { status: 400 });
    }
    if (!target_type || !["seeker", "talent"].includes(target_type)) {
      return json({ success: false, error: 'target_type must be "seeker" or "talent"' }, { status: 400 });
    }
    const db = platform.env.DB;
    const existingSeeker = await db.prepare(
      "SELECT * FROM seekers WHERE phone = ?"
    ).bind(phone.trim()).first();
    const existingTalent = await db.prepare(
      "SELECT * FROM talent WHERE phone = ?"
    ).bind(phone.trim()).first();
    if (target_type === "talent") {
      if (!body.skills || !Array.isArray(body.skills) || body.skills.length === 0) {
        return json({ success: false, error: "skills array is required when converting to talent" }, { status: 400 });
      }
      if (existingTalent) {
        return json({
          success: true,
          data: {
            ...existingTalent,
            skills: safeJsonParse(existingTalent.skills, [], "skills"),
            styles: safeJsonParse(existingTalent.styles, void 0, "styles")
          },
          message: "User is already registered as talent"
        });
      }
      const name = existingSeeker?.name;
      if (!name) {
        return json({ success: false, error: "User not found. Create via POST /talent instead." }, { status: 404 });
      }
      const talentId = generateId();
      await db.prepare(`
				INSERT INTO talent (id, phone, name, email, skills, styles, hourly_rate_min, hourly_rate_max, availability, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
			`).bind(
        talentId,
        phone.trim(),
        name,
        existingSeeker?.email || null,
        JSON.stringify(body.skills),
        body.styles ? JSON.stringify(body.styles) : null,
        body.hourly_rate_min || null,
        body.hourly_rate_max || null,
        body.availability || "available"
      ).run();
      if (existingSeeker) {
        await db.prepare("DELETE FROM seekers WHERE phone = ?").bind(phone.trim()).run();
      }
      const created = await db.prepare(
        "SELECT * FROM talent WHERE id = ?"
      ).bind(talentId).first();
      return json({
        success: true,
        data: {
          ...created,
          skills: safeJsonParse(created?.skills, [], "skills"),
          styles: safeJsonParse(created?.styles, void 0, "styles")
        },
        message: "Converted to talent successfully"
      }, { status: 201 });
    }
    if (target_type === "seeker") {
      if (existingSeeker) {
        return json({
          success: true,
          data: {
            ...existingSeeker,
            preferred_formats: safeJsonParse(existingSeeker.preferred_formats, void 0, "preferred_formats")
          },
          message: "User is already registered as seeker"
        });
      }
      const name = existingTalent?.name;
      if (!name) {
        return json({ success: false, error: "User not found. Create via POST /seekers instead." }, { status: 404 });
      }
      const seekerId = generateId();
      await db.prepare(`
				INSERT INTO seekers (id, phone, name, email, brand_name, brand_vibe, typical_budget_min, typical_budget_max, preferred_formats, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
			`).bind(
        seekerId,
        phone.trim(),
        name,
        existingTalent?.email || null,
        body.brand_name || null,
        body.brand_vibe || null,
        body.typical_budget_min || null,
        body.typical_budget_max || null,
        body.preferred_formats ? JSON.stringify(body.preferred_formats) : null
      ).run();
      if (existingTalent) {
        await db.prepare("DELETE FROM talent WHERE phone = ?").bind(phone.trim()).run();
      }
      const created = await db.prepare(
        "SELECT * FROM seekers WHERE id = ?"
      ).bind(seekerId).first();
      return json({
        success: true,
        data: {
          ...created,
          preferred_formats: safeJsonParse(created?.preferred_formats, void 0, "preferred_formats")
        },
        message: "Converted to seeker successfully"
      }, { status: 201 });
    }
    return json({ success: false, error: "Invalid target_type" }, { status: 400 });
  } catch (err) {
    console.error("Conversion error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error converting user: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
};
export {
  POST
};
