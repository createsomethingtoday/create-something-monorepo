import { error, json } from "@sveltejs/kit";
import { s as safeJsonParse, g as generateId } from "../../../../../chunks/matching.js";
const POST = async ({ request, platform }) => {
  try {
    if (!platform?.env?.DB) {
      throw error(500, "Database not available");
    }
    const body = await request.json();
    const {
      phone,
      name,
      email,
      portfolio_url,
      instagram,
      skills,
      styles,
      hourly_rate_min,
      hourly_rate_max,
      availability,
      timezone,
      abundance_index
    } = body;
    if (!phone || !phone.trim()) {
      return json({ success: false, error: "Phone number is required" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return json({ success: false, error: "Name is required" }, { status: 400 });
    }
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return json({ success: false, error: "At least one skill is required" }, { status: 400 });
    }
    const existing = await platform.env.DB.prepare(
      "SELECT * FROM talent WHERE phone = ?"
    ).bind(phone.trim()).first();
    if (existing) {
      const talent2 = {
        ...existing,
        skills: safeJsonParse(existing.skills, [], "skills"),
        styles: safeJsonParse(existing.styles, void 0, "styles")
      };
      return json({ success: true, data: talent2 });
    }
    const id = generateId();
    const skillsJson = JSON.stringify(skills);
    const stylesJson = styles ? JSON.stringify(styles) : null;
    await platform.env.DB.prepare(`
			INSERT INTO talent (id, phone, name, email, portfolio_url, instagram, skills, styles, hourly_rate_min, hourly_rate_max, availability, timezone, abundance_index, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
		`).bind(
      id,
      phone.trim(),
      name.trim(),
      email?.trim() || null,
      portfolio_url?.trim() || null,
      instagram?.trim() || null,
      skillsJson,
      stylesJson,
      hourly_rate_min || null,
      hourly_rate_max || null,
      availability || "available",
      timezone?.trim() || null,
      abundance_index || 50
    ).run();
    const created = await platform.env.DB.prepare(
      "SELECT * FROM talent WHERE id = ?"
    ).bind(id).first();
    if (!created) {
      throw error(500, "Failed to create talent");
    }
    const talent = {
      ...created,
      skills: safeJsonParse(created.skills, [], "skills"),
      styles: safeJsonParse(created.styles, void 0, "styles")
    };
    return json({ success: true, data: talent }, { status: 201 });
  } catch (err) {
    console.error("Talent creation error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error creating talent: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
};
const GET = async ({ url, platform }) => {
  try {
    if (!platform?.env?.DB) {
      throw error(500, "Database not available");
    }
    const phone = url.searchParams.get("phone");
    const id = url.searchParams.get("id");
    const skill = url.searchParams.get("skill");
    const availability = url.searchParams.get("availability");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    if (phone) {
      const talent = await platform.env.DB.prepare(
        "SELECT * FROM talent WHERE phone = ?"
      ).bind(phone.trim()).first();
      if (!talent) {
        return json({ success: false, error: "Talent not found" }, { status: 404 });
      }
      const result = {
        ...talent,
        skills: safeJsonParse(talent.skills, [], "skills"),
        styles: safeJsonParse(talent.styles, void 0, "styles")
      };
      return json({ success: true, data: result });
    }
    if (id) {
      const talent = await platform.env.DB.prepare(
        "SELECT * FROM talent WHERE id = ?"
      ).bind(id.trim()).first();
      if (!talent) {
        return json({ success: false, error: "Talent not found" }, { status: 404 });
      }
      const result = {
        ...talent,
        skills: safeJsonParse(talent.skills, [], "skills"),
        styles: safeJsonParse(talent.styles, void 0, "styles")
      };
      return json({ success: true, data: result });
    }
    let query = "SELECT * FROM talent WHERE status = ?";
    const params = ["active"];
    if (availability) {
      query += " AND availability = ?";
      params.push(availability);
    }
    if (skill) {
      query += " AND skills LIKE ?";
      params.push(`%"${skill}"%`);
    }
    query += " ORDER BY abundance_index DESC, created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const { results } = await platform.env.DB.prepare(query).bind(...params).all();
    const talents = results.map((t) => ({
      ...t,
      skills: safeJsonParse(t.skills, [], "skills"),
      styles: safeJsonParse(t.styles, void 0, "styles")
    }));
    let countQuery = "SELECT COUNT(*) as count FROM talent WHERE status = ?";
    const countParams = ["active"];
    if (availability) {
      countQuery += " AND availability = ?";
      countParams.push(availability);
    }
    if (skill) {
      countQuery += " AND skills LIKE ?";
      countParams.push(`%"${skill}"%`);
    }
    const countResult = await platform.env.DB.prepare(countQuery).bind(...countParams).first();
    return json({
      success: true,
      data: talents,
      total: countResult?.count || 0,
      offset,
      limit
    });
  } catch (err) {
    console.error("Talent fetch error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error fetching talent: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
};
export {
  GET,
  POST
};
