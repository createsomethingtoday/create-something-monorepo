import { json } from "@sveltejs/kit";
import { g as getNextOptimalTime, D as DEFAULT_PREFERRED_DAYS } from "../../../../../chunks/strategy.js";
import { g as getStartOfWeek, a as getWeekNumber } from "../../../../../chunks/date.js";
const GET = async ({ url, platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Database not available" }, { status: 500 });
  }
  const weeks = parseInt(url.searchParams.get("weeks") || "2", 10);
  const timezone = url.searchParams.get("timezone") || "America/Los_Angeles";
  const now = /* @__PURE__ */ new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const startOfWeek = getStartOfWeek(now, timezone);
  const endDate = new Date(startOfWeek);
  endDate.setDate(endDate.getDate() + weeks * 7);
  const result = await db.prepare(
    `SELECT id, scheduled_for, status, content
			 FROM social_posts
			 WHERE scheduled_for >= ? AND scheduled_for <= ?
			 ORDER BY scheduled_for ASC`
  ).bind(startOfWeek.getTime(), endDate.getTime()).all();
  const posts = result.results || [];
  const postsByDate = /* @__PURE__ */ new Map();
  for (const post of posts) {
    const postDate = new Date(post.scheduled_for);
    const dateKey = formatter.format(postDate);
    postsByDate.set(dateKey, {
      id: post.id,
      status: post.status,
      preview: post.content.substring(0, 60) + (post.content.length > 60 ? "..." : "")
    });
  }
  const weeksData = [];
  const gaps = [];
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long"
  });
  let currentDate = new Date(startOfWeek);
  let currentWeekDays = {};
  let currentWeekNumber = getWeekNumber(currentDate, timezone);
  while (currentDate < endDate) {
    const dateKey = formatter.format(currentDate);
    const dayOfWeek = dayFormatter.format(currentDate).toLowerCase();
    const weekNum = getWeekNumber(currentDate, timezone);
    if (weekNum !== currentWeekNumber) {
      weeksData.push({
        weekNumber: currentWeekNumber,
        days: currentWeekDays
      });
      currentWeekDays = {};
      currentWeekNumber = weekNum;
    }
    if (isWeekday(currentDate, timezone)) {
      const postData = postsByDate.get(dateKey);
      let status;
      if (postData) {
        status = postData.status === "posted" ? "posted" : "scheduled";
      } else {
        status = "gap";
        if (currentDate >= now) {
          gaps.push(dateKey);
        }
      }
      currentWeekDays[dayOfWeek] = {
        date: dateKey,
        dayOfWeek,
        status,
        ...postData && { postId: postData.id, preview: postData.preview }
      };
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  if (Object.keys(currentWeekDays).length > 0) {
    weeksData.push({
      weekNumber: currentWeekNumber,
      days: currentWeekDays
    });
  }
  const nextOptimalSlot = getNextOptimalTime(timezone, DEFAULT_PREFERRED_DAYS, 9, now);
  let suggestion = "";
  if (gaps.length === 0) {
    suggestion = "No gaps in the schedule. All weekdays covered.";
  } else if (gaps.length === 1) {
    suggestion = `Schedule content for ${formatDateForHuman(gaps[0], timezone)}.`;
  } else {
    suggestion = `${gaps.length} gaps found. Next gap: ${formatDateForHuman(gaps[0], timezone)}.`;
  }
  return json({
    timezone,
    weeksAnalyzed: weeks,
    currentWeek: weeksData[0],
    allWeeks: weeksData,
    gaps,
    gapCount: gaps.length,
    nextOptimalSlot: nextOptimalSlot.toISOString(),
    nextOptimalSlotFormatted: formatDateTimeForHuman(nextOptimalSlot, timezone),
    suggestion
  });
};
function isWeekday(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  });
  const day = formatter.format(date).toLowerCase();
  return ["mon", "tue", "wed", "thu", "fri"].includes(day);
}
function formatDateForHuman(dateStr, timezone) {
  const date = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(date);
}
function formatDateTimeForHuman(date, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}
export {
  GET
};
