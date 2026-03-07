import { json } from "@sveltejs/kit";
const GET = async ({ platform, url }) => {
  const db = platform.env.DB;
  const status = url.searchParams.get("status");
  const pillar = url.searchParams.get("pillar");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  let query = "SELECT * FROM content_ideas WHERE 1=1";
  const params = [];
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (pillar) {
    query += " AND pillar = ?";
    params.push(pillar);
  }
  query += " ORDER BY priority DESC, created_at DESC LIMIT ?";
  params.push(limit);
  try {
    const result = await db.prepare(query).bind(...params).all();
    const ideas = result.results.map((idea) => ({
      ...idea,
      tags: idea.tags ? JSON.parse(idea.tags) : []
    }));
    const statsResult = await db.prepare(`
			SELECT status, COUNT(*) as count FROM content_ideas GROUP BY status
		`).all();
    const stats = Object.fromEntries(
      statsResult.results.map((r) => [r.status, r.count])
    );
    return json({
      ideas,
      count: ideas.length,
      pipeline: stats
    });
  } catch (error) {
    console.error("Failed to fetch ideas:", error);
    return json({ error: "Failed to fetch ideas" }, { status: 500 });
  }
};
const POST = async ({ platform, request }) => {
  const db = platform.env.DB;
  const body = await request.json();
  const {
    title,
    description,
    source,
    source_id,
    pillar,
    format,
    target_audience,
    priority = 5,
    tags,
    created_by = "agent"
  } = body;
  if (!title || !source) {
    return json({ error: "Missing required fields: title, source" }, { status: 400 });
  }
  const id = `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const pillarToDayMap = {
    methodology: "monday",
    case_study: "tuesday",
    industry: "wednesday",
    behind_scenes: "thursday",
    value_share: "friday"
  };
  const best_day = pillar ? pillarToDayMap[pillar] || null : null;
  try {
    await db.prepare(`
			INSERT INTO content_ideas (
				id, title, description, source, source_id, pillar, format,
				target_audience, priority, best_day, tags, created_by, status
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discovered')
		`).bind(
      id,
      title,
      description || null,
      source,
      source_id || null,
      pillar || null,
      format || null,
      target_audience || null,
      priority,
      best_day,
      tags ? JSON.stringify(tags) : null,
      created_by
    ).run();
    return json({ id, status: "discovered", best_day }, { status: 201 });
  } catch (error) {
    console.error("Failed to create idea:", error);
    return json({ error: "Failed to create idea" }, { status: 500 });
  }
};
const PATCH = async ({ platform, request }) => {
  const db = platform.env.DB;
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) {
    return json({ error: "Missing required field: id" }, { status: 400 });
  }
  const allowedFields = [
    "status",
    "research_notes",
    "draft_content",
    "draft_format",
    "pillar",
    "format",
    "priority",
    "scheduled_post_id",
    "beads_issue_id"
  ];
  const setClauses = ["updated_at = CURRENT_TIMESTAMP"];
  const params = [];
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== void 0) {
      setClauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  params.push(id);
  try {
    await db.prepare(`
			UPDATE content_ideas SET ${setClauses.join(", ")} WHERE id = ?
		`).bind(...params).run();
    return json({ id, updated: true, ...updates });
  } catch (error) {
    console.error("Failed to update idea:", error);
    return json({ error: "Failed to update idea" }, { status: 500 });
  }
};
export {
  GET,
  PATCH,
  POST
};
