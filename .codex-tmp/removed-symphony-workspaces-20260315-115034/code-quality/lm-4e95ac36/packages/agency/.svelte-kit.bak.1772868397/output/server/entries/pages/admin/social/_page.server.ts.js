import { g as getTokenStatus } from "../../../../chunks/linkedin-client.js";
import { g as getNextOptimalTime, D as DEFAULT_PREFERRED_DAYS } from "../../../../chunks/strategy.js";
import { g as getStartOfWeek } from "../../../../chunks/date.js";
const WEEKLY_RHYTHM = {
  monday: { focus: "Review learnings", description: "Identify patterns from the week" },
  tuesday: { focus: "Create primary content", description: "Draft main thread/post" },
  wednesday: { focus: "Derivatives", description: "Repurpose into secondary formats" },
  thursday: { focus: "Community engagement", description: "Respond, participate, connect" },
  friday: { focus: "Pipeline review", description: "Review leads, partners, opportunities" }
};
const load = async ({ platform }) => {
  const db = platform?.env?.DB;
  const sessions = platform?.env?.SESSIONS;
  if (!db || !sessions) {
    return {
      error: "Database or sessions not available",
      tokenStatus: { connected: false },
      stats: {},
      posts: [],
      rhythm: {},
      gaps: [],
      nextSlot: null
    };
  }
  const timezone = "America/Los_Angeles";
  const now = /* @__PURE__ */ new Date();
  const tokenStatus = await getTokenStatus(sessions);
  const statsResult = await db.prepare(`SELECT status, COUNT(*) as count FROM social_posts GROUP BY status`).all();
  const stats = {};
  for (const row of statsResult.results || []) {
    stats[row.status] = row.count;
  }
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksFromNow = new Date(now);
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
  const postsResult = await db.prepare(
    `SELECT * FROM social_posts
			 WHERE scheduled_for >= ? AND scheduled_for <= ?
			 ORDER BY scheduled_for ASC`
  ).bind(twoWeeksAgo.getTime(), twoWeeksFromNow.getTime()).all();
  const posts = (postsResult.results || []).map((post) => ({
    id: post.id,
    content: post.content,
    preview: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : ""),
    scheduledFor: new Date(post.scheduled_for).toISOString(),
    scheduledForFormatted: formatDateTime(new Date(post.scheduled_for), timezone),
    status: post.status,
    campaign: post.campaign,
    postUrl: post.post_url,
    error: post.error,
    isPast: post.scheduled_for < now.getTime()
  }));
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long"
  });
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const currentDay = dayFormatter.format(now).toLowerCase();
  const weekStart = getStartOfWeek(now, timezone);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const postsByDay = /* @__PURE__ */ new Map();
  for (const post of postsResult.results || []) {
    const postDate = new Date(post.scheduled_for);
    if (postDate >= weekStart && postDate < weekEnd) {
      const postDay = dayFormatter.format(postDate).toLowerCase();
      if (!postsByDay.has(postDay)) {
        postsByDay.set(postDay, post);
      }
    }
  }
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const currentDayIndex = dayOrder.indexOf(currentDay);
  const rhythm = {};
  const gaps = [];
  for (let i = 0; i < dayOrder.length; i++) {
    const day = dayOrder[i];
    const rhythmDef = WEEKLY_RHYTHM[day];
    const post = postsByDay.get(day);
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dateStr = dateFormatter.format(dayDate);
    let status;
    if (post) {
      status = post.status === "posted" ? "complete" : i === currentDayIndex ? "in_progress" : "pending";
    } else {
      if (i < currentDayIndex) {
        status = "missed";
      } else if (i === currentDayIndex) {
        status = "in_progress";
        gaps.push(dateStr);
      } else {
        status = "pending";
        gaps.push(dateStr);
      }
    }
    rhythm[day] = {
      focus: rhythmDef.focus,
      description: rhythmDef.description,
      status,
      date: dateStr,
      ...post && {
        post: {
          id: post.id,
          preview: post.content.substring(0, 60) + "..."
        }
      }
    };
  }
  const nextSlot = getNextOptimalTime(timezone, DEFAULT_PREFERRED_DAYS, 9, now);
  return {
    tokenStatus: {
      connected: tokenStatus.connected,
      daysRemaining: tokenStatus.daysRemaining,
      expiresAt: tokenStatus.expiresAt,
      warning: tokenStatus.warning
    },
    stats,
    posts,
    rhythm,
    currentDay,
    todaysFocus: WEEKLY_RHYTHM[currentDay]?.focus || "Weekend",
    gaps,
    nextSlot: {
      iso: nextSlot.toISOString(),
      formatted: formatDateTime(nextSlot, timezone)
    }
  };
};
function formatDateTime(date, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
export {
  load
};
