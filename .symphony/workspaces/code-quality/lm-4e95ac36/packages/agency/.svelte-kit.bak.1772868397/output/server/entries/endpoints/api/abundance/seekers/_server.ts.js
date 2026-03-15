import { error, json } from "@sveltejs/kit";
import { s as safeJsonParse, g as generateId } from "../../../../../chunks/matching.js";
const POST = async ({ request, platform }) => {
  try {
    if (!platform?.env?.DB) {
      throw error(500, "Database not available");
    }
    const body = await request.json();
    const { phone, name, email, brand_name, brand_vibe, website, typical_budget_min, typical_budget_max, preferred_formats, readiness_score } = body;
    if (!phone || !phone.trim()) {
      return json({ success: false, error: "Phone number is required" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return json({ success: false, error: "Name is required" }, { status: 400 });
    }
    const existing = await platform.env.DB.prepare(
      "SELECT * FROM seekers WHERE phone = ?"
    ).bind(phone.trim()).first();
    if (existing) {
      const seeker2 = {
        ...existing,
        preferred_formats: safeJsonParse(existing.preferred_formats, void 0, "preferred_formats")
      };
      return json({ success: true, data: seeker2 });
    }
    const id = generateId();
    const formatsJson = preferred_formats ? JSON.stringify(preferred_formats) : null;
    await platform.env.DB.prepare(`
			INSERT INTO seekers (id, phone, name, email, brand_name, brand_vibe, website, typical_budget_min, typical_budget_max, preferred_formats, readiness_score, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
		`).bind(
      id,
      phone.trim(),
      name.trim(),
      email?.trim() || null,
      brand_name?.trim() || null,
      brand_vibe?.trim() || null,
      website?.trim() || null,
      typical_budget_min || null,
      typical_budget_max || null,
      formatsJson,
      readiness_score || 50
    ).run();
    const created = await platform.env.DB.prepare(
      "SELECT * FROM seekers WHERE id = ?"
    ).bind(id).first();
    if (!created) {
      throw error(500, "Failed to create seeker");
    }
    const seeker = {
      ...created,
      preferred_formats: safeJsonParse(created.preferred_formats, void 0, "preferred_formats")
    };
    return json({ success: true, data: seeker }, { status: 201 });
  } catch (err) {
    console.error("Seeker creation error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error creating seeker: ${err instanceof Error ? err.message : "Unknown error"}` },
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
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    if (phone) {
      const seeker = await platform.env.DB.prepare(
        "SELECT * FROM seekers WHERE phone = ?"
      ).bind(phone.trim()).first();
      if (!seeker) {
        return json({ success: false, error: "Seeker not found" }, { status: 404 });
      }
      const result = {
        ...seeker,
        preferred_formats: safeJsonParse(seeker.preferred_formats, void 0, "preferred_formats")
      };
      return json({ success: true, data: result });
    }
    if (id) {
      const seeker = await platform.env.DB.prepare(
        "SELECT * FROM seekers WHERE id = ?"
      ).bind(id.trim()).first();
      if (!seeker) {
        return json({ success: false, error: "Seeker not found" }, { status: 404 });
      }
      const result = {
        ...seeker,
        preferred_formats: safeJsonParse(seeker.preferred_formats, void 0, "preferred_formats")
      };
      return json({ success: true, data: result });
    }
    const { results } = await platform.env.DB.prepare(
      "SELECT * FROM seekers WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind("active", limit, offset).all();
    const seekers = results.map((s) => ({
      ...s,
      preferred_formats: safeJsonParse(s.preferred_formats, void 0, "preferred_formats")
    }));
    const countResult = await platform.env.DB.prepare(
      "SELECT COUNT(*) as count FROM seekers WHERE status = ?"
    ).bind("active").first();
    return json({
      success: true,
      data: seekers,
      total: countResult?.count || 0,
      offset,
      limit
    });
  } catch (err) {
    console.error("Seeker fetch error:", err);
    if (err instanceof Response) throw err;
    return json(
      { success: false, error: `Error fetching seekers: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
};
export {
  GET,
  POST
};
