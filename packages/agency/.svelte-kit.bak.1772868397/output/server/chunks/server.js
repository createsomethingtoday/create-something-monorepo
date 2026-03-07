import { error, json } from "@sveltejs/kit";
function createUserAnalyticsHandler(options) {
  const PROPERTY = options.property;
  return async ({ locals, platform, url }) => {
    const db = platform?.env?.DB;
    if (!db) {
      throw error(500, "Database not available");
    }
    const userId = locals.user?.id;
    const serviceToken = url.searchParams.get("token");
    const requestUserId = url.searchParams.get("userId");
    if (!userId && !serviceToken) {
      throw error(401, "Authentication required");
    }
    const targetUserId = userId || requestUserId;
    if (!targetUserId) {
      throw error(400, "User ID required");
    }
    const days = parseInt(url.searchParams.get("days") || "30");
    try {
      const [sessionsResult, dailyResult, categoryResult, topPagesResult] = await Promise.all([
        db.prepare(`SELECT
							COUNT(*) as total,
							COALESCE(SUM(page_views), 0) as page_views,
							COALESCE(SUM(duration_seconds), 0) as duration_seconds
						FROM unified_sessions
						WHERE user_id = ?
						AND started_at >= datetime('now', '-' || ? || ' days')`).bind(targetUserId, days).first(),
        db.prepare(`SELECT date, SUM(count) as count
						FROM unified_events_daily
						WHERE property = ?
						AND date >= date('now', '-' || ? || ' days')
						GROUP BY date
						ORDER BY date`).bind(PROPERTY, days).all(),
        db.prepare(`SELECT category, COUNT(*) as count
						FROM unified_events
						WHERE user_id = ?
						AND created_at >= datetime('now', '-' || ? || ' days')
						GROUP BY category
						ORDER BY count DESC`).bind(targetUserId, days).all(),
        db.prepare(`SELECT url, COUNT(*) as views
						FROM unified_events
						WHERE user_id = ?
						AND action = 'page_view'
						AND created_at >= datetime('now', '-' || ? || ' days')
						GROUP BY url
						ORDER BY views DESC
						LIMIT 10`).bind(targetUserId, days).all()
      ]);
      const sessions = sessionsResult || { total: 0, page_views: 0, duration_seconds: 0 };
      const dailyActivity = dailyResult.results || [];
      const categoryBreakdown = (categoryResult.results || []).map((r) => ({
        category: r.category,
        count: r.count
      }));
      const topPages = topPagesResult.results || [];
      const response = {
        property: PROPERTY,
        sessions: {
          total: sessions.total,
          pageViews: sessions.page_views,
          durationSeconds: sessions.duration_seconds
        },
        dailyActivity,
        categoryBreakdown,
        topPages
      };
      return json(response);
    } catch (err) {
      console.error(`[UserAnalyticsAPI:${PROPERTY}] Failed to fetch`, { userId: targetUserId, days, error: err });
      throw error(500, "Failed to fetch analytics");
    }
  };
}
async function processEventBatch(db, batch, context) {
  const { events, sentAt } = batch;
  if (!events || events.length === 0) {
    return { success: true, received: 0 };
  }
  const errors = [];
  const statements = [];
  for (const event of events) {
    try {
      if (!validateEvent(event)) {
        errors.push(`Invalid event: ${event.eventId}`);
        continue;
      }
      const stmt = db.prepare(`INSERT INTO unified_events
           (id, session_id, user_id, property, category, action, target, value, url, referrer, user_agent, ip_country, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(event.eventId, event.sessionId, event.userId || null, event.property, event.category, event.action, event.target || null, event.value || null, event.url, event.referrer || null, context.userAgent || null, context.ipCountry || null, event.metadata ? JSON.stringify(event.metadata) : null, event.timestamp);
      statements.push(stmt);
    } catch (error2) {
      errors.push(`Error processing event ${event.eventId}: ${String(error2)}`);
    }
  }
  if (statements.length > 0) {
    try {
      await db.batch(statements);
    } catch (error2) {
      errors.push(`Batch insert failed: ${String(error2)}`);
    }
  }
  try {
    await updateDailyAggregates(db, events);
  } catch {
  }
  try {
    await updateSessionSummaries(db, events, context);
  } catch {
  }
  return {
    success: errors.length === 0,
    received: statements.length,
    errors: errors.length > 0 ? errors : void 0
  };
}
function validateEvent(event) {
  if (!event.eventId || !event.sessionId)
    return false;
  if (!event.property || !event.category || !event.action)
    return false;
  if (!event.url || !event.timestamp)
    return false;
  const validProperties = ["space", "io", "agency", "ltd", "lms"];
  if (!validProperties.includes(event.property))
    return false;
  const validCategories = [
    "navigation",
    "interaction",
    "search",
    "content",
    "conversion",
    "error",
    "performance"
  ];
  if (!validCategories.includes(event.category))
    return false;
  return true;
}
async function updateDailyAggregates(db, events) {
  const aggregates = /* @__PURE__ */ new Map();
  for (const event of events) {
    const date = event.timestamp.split("T")[0];
    const key = `${date}:${event.property}:${event.category}:${event.action}`;
    let agg = aggregates.get(key);
    if (!agg) {
      agg = {
        date,
        property: event.property,
        category: event.category,
        action: event.action,
        count: 0,
        sessions: /* @__PURE__ */ new Set(),
        totalValue: 0
      };
      aggregates.set(key, agg);
    }
    agg.count++;
    agg.sessions.add(event.sessionId);
    if (event.value)
      agg.totalValue += event.value;
  }
  const statements = [];
  for (const [key, agg] of aggregates) {
    const id = `daily_${key.replace(/:/g, "_")}`;
    statements.push(db.prepare(`INSERT INTO unified_events_daily (id, date, property, category, action, count, unique_sessions, total_value, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(date, property, category, action) DO UPDATE SET
           count = count + excluded.count,
           unique_sessions = unique_sessions + excluded.unique_sessions,
           total_value = total_value + excluded.total_value,
           updated_at = datetime('now')`).bind(id, agg.date, agg.property, agg.category, agg.action, agg.count, agg.sessions.size, agg.totalValue));
  }
  if (statements.length > 0) {
    await db.batch(statements);
  }
}
async function updateSessionSummaries(db, events, context) {
  const sessionEvents = /* @__PURE__ */ new Map();
  for (const event of events) {
    const existing = sessionEvents.get(event.sessionId) || [];
    existing.push(event);
    sessionEvents.set(event.sessionId, existing);
  }
  for (const [sessionId, sessionEvts] of sessionEvents) {
    sessionEvts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const firstEvent = sessionEvts[0];
    const lastEvent = sessionEvts[sessionEvts.length - 1];
    const pageViews = sessionEvts.filter((e) => e.category === "navigation" && e.action === "page_view").length;
    const interactions = sessionEvts.filter((e) => e.category === "interaction").length;
    const conversions = sessionEvts.filter((e) => e.category === "conversion").length;
    const errors = sessionEvts.filter((e) => e.category === "error").length;
    const maxScrollDepth = Math.max(0, ...sessionEvts.filter((e) => e.action === "scroll_depth" && e.value).map((e) => e.value || 0));
    const sessionEndEvent = sessionEvts.find((e) => e.action === "session_end");
    const clientReportedDuration = sessionEndEvent?.value;
    const existing = await db.prepare("SELECT * FROM unified_sessions WHERE id = ?").bind(sessionId).run();
    if (existing.results && existing.results.length > 0) {
      const eventUserId = sessionEvts.find((e) => e.userId)?.userId || null;
      if (clientReportedDuration !== void 0 && clientReportedDuration > 0) {
        await db.prepare(`UPDATE unified_sessions SET
						 user_id = COALESCE(user_id, ?),
						 ended_at = ?,
						 duration_seconds = ?,
						 page_views = page_views + ?,
						 interactions = interactions + ?,
						 conversions = conversions + ?,
						 errors = errors + ?,
						 max_scroll_depth = MAX(max_scroll_depth, ?),
						 exit_url = ?,
						 updated_at = datetime('now')
						 WHERE id = ?`).bind(eventUserId, lastEvent.timestamp, Math.round(clientReportedDuration), pageViews, interactions, conversions, errors, maxScrollDepth, lastEvent.url, sessionId).run();
      } else {
        await db.prepare(`UPDATE unified_sessions SET
						 user_id = COALESCE(user_id, ?),
						 ended_at = ?,
						 duration_seconds = CASE
						   WHEN page_views + ? > 0 THEN MAX(CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER), 1)
						   ELSE CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER)
						 END,
						 page_views = page_views + ?,
						 interactions = interactions + ?,
						 conversions = conversions + ?,
						 errors = errors + ?,
						 max_scroll_depth = MAX(max_scroll_depth, ?),
						 exit_url = ?,
						 updated_at = datetime('now')
						 WHERE id = ?`).bind(eventUserId, lastEvent.timestamp, pageViews, lastEvent.timestamp, lastEvent.timestamp, pageViews, interactions, conversions, errors, maxScrollDepth, lastEvent.url, sessionId).run();
      }
    } else {
      let durationSeconds;
      if (clientReportedDuration !== void 0 && clientReportedDuration > 0) {
        durationSeconds = Math.round(clientReportedDuration);
      } else {
        const startTime = new Date(firstEvent.timestamp).getTime();
        const endTime = new Date(lastEvent.timestamp).getTime();
        durationSeconds = Math.round((endTime - startTime) / 1e3);
        if (durationSeconds === 0 && pageViews > 0) {
          durationSeconds = 1;
        }
      }
      await db.prepare(`INSERT INTO unified_sessions
					 (id, property, user_id, started_at, ended_at, duration_seconds, page_views, interactions, conversions, errors, max_scroll_depth, entry_url, exit_url, referrer, user_agent, ip_country)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(sessionId, firstEvent.property, firstEvent.userId || null, firstEvent.timestamp, lastEvent.timestamp, durationSeconds, pageViews, interactions, conversions, errors, maxScrollDepth, firstEvent.url, lastEvent.url, firstEvent.referrer || null, context.userAgent || null, context.ipCountry || null).run();
    }
  }
}
export {
  createUserAnalyticsHandler as c,
  processEventBatch as p
};
