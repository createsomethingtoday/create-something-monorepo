import { json } from "@sveltejs/kit";
const GET = async ({ platform }) => {
  const db = platform.env.DB;
  try {
    const signalsResult = await db.prepare(`
			SELECT id, platform, signal_type, author_name, author_handle, 
				   content, urgency, relevance_score, detected_at
			FROM community_signals 
			WHERE status = 'new'
			AND (urgency IN ('critical', 'high') OR relevance_score > 0.7)
			AND detected_at > datetime('now', '-48 hours')
			ORDER BY 
				CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
				relevance_score DESC
			LIMIT 10
		`).all();
    const queueResult = await db.prepare(`
			SELECT 
				q.id, q.draft_content, q.draft_reasoning, q.action_type, 
				q.platform, q.priority,
				s.content as signal_content,
				s.author_name as signal_author
			FROM community_queue q
			LEFT JOIN community_signals s ON q.signal_id = s.id
			WHERE q.status = 'pending'
			AND (q.expires_at IS NULL OR q.expires_at > datetime('now'))
			ORDER BY q.priority DESC
			LIMIT 10
		`).all();
    const relationshipsResult = await db.prepare(`
			SELECT id, platform, person_name, person_handle, person_company,
				   warmth_score, lead_potential, last_interaction
			FROM community_relationships
			WHERE lead_potential IN ('hot', 'warm')
			AND last_interaction > datetime('now', '-7 days')
			ORDER BY warmth_score DESC
			LIMIT 5
		`).all();
    const statsResult = await db.batch([
      db.prepare(`SELECT COUNT(*) as count FROM community_signals WHERE status = 'new'`),
      db.prepare(`SELECT COUNT(*) as count FROM community_queue WHERE status = 'pending'`),
      db.prepare(`SELECT COUNT(*) as count FROM community_relationships WHERE lead_potential = 'hot'`),
      db.prepare(`SELECT COUNT(*) as count FROM community_signals WHERE status = 'responded' AND reviewed_at > datetime('now', '-7 days')`)
    ]);
    const stats = {
      new_signals: statsResult[0].results[0]?.count || 0,
      pending_responses: statsResult[1].results[0]?.count || 0,
      hot_leads: statsResult[2].results[0]?.count || 0,
      responses_this_week: statsResult[3].results[0]?.count || 0
    };
    const estimatedMinutes = Math.ceil(
      signalsResult.results.length * 0.5 + queueResult.results.length * 0.33
    );
    return json({
      review: {
        urgent_signals: signalsResult.results,
        pending_responses: queueResult.results,
        active_relationships: relationshipsResult.results,
        stats,
        estimated_time: `${estimatedMinutes} min`,
        generated_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("Failed to generate review:", error);
    return json({ error: "Failed to generate review" }, { status: 500 });
  }
};
const POST = async ({ platform, request }) => {
  const db = platform.env.DB;
  const body = await request.json();
  const { actions } = body;
  if (!actions || !Array.isArray(actions)) {
    return json({ error: "Missing required field: actions (array)" }, { status: 400 });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const results = [];
  for (const action of actions) {
    const { type, id, edited_content } = action;
    try {
      if (type === "approve_response") {
        await db.prepare(`
					UPDATE community_queue 
					SET status = 'approved', approved_at = ?, approved_content = ?
					WHERE id = ?
				`).bind(now, edited_content || null, id).run();
        results.push({ id, success: true });
      } else if (type === "reject_response") {
        await db.prepare(`
					UPDATE community_queue SET status = 'rejected' WHERE id = ?
				`).bind(id).run();
        results.push({ id, success: true });
      } else if (type === "dismiss_signal") {
        await db.prepare(`
					UPDATE community_signals SET status = 'dismissed', reviewed_at = ? WHERE id = ?
				`).bind(now, id).run();
        results.push({ id, success: true });
      } else if (type === "flag_signal") {
        await db.prepare(`
					UPDATE community_signals SET status = 'reviewed', reviewed_at = ? WHERE id = ?
				`).bind(now, id).run();
        results.push({ id, success: true });
      } else {
        results.push({ id, success: false, error: `Unknown action type: ${type}` });
      }
    } catch (error) {
      results.push({ id, success: false, error: String(error) });
    }
  }
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  return json({
    processed: results.length,
    succeeded,
    failed,
    results
  });
};
export {
  GET,
  POST
};
