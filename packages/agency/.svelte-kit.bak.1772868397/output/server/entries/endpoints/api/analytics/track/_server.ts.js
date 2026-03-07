import { json } from "@sveltejs/kit";
async function trackAnalyticsEvent(db, request) {
  try {
    const { event_type, property, path, experiment_id, tag_id, referrer } = await request.json();
    if (!event_type) {
      return {
        success: false,
        error: "event_type is required",
        status: 400
      };
    }
    const user_agent = request.headers.get("user-agent") || "";
    const country = request.headers.get("cf-ipcountry") || "";
    await db.prepare(`INSERT INTO analytics_events (event_type, property, path, experiment_id, tag_id, referrer, user_agent, country)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(event_type, property || null, path || null, experiment_id || null, tag_id || null, referrer || null, user_agent, country).run();
    return { success: true, status: 201 };
  } catch (error) {
    console.error("Failed to track analytics event:", error);
    return { success: false, status: 200 };
  }
}
const POST = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Database not available" }, { status: 500 });
  }
  const result = await trackAnalyticsEvent(db, request);
  return json(
    result.error ? { error: result.error } : { success: result.success },
    { status: result.status }
  );
};
export {
  POST
};
