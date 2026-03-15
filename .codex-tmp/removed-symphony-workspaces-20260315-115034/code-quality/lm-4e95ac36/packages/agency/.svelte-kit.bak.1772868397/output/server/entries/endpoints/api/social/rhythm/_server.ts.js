import { json } from "@sveltejs/kit";
import { a as getWeekNumber, g as getStartOfWeek } from "../../../../../chunks/date.js";
const WEEKLY_RHYTHM = {
  monday: {
    focus: "Review learnings",
    description: "Identify 1 pattern to capture from the week"
  },
  tuesday: {
    focus: "Create primary content",
    description: "Draft main thread/post for the week"
  },
  wednesday: {
    focus: "Derivatives",
    description: "Repurpose content into secondary formats"
  },
  thursday: {
    focus: "Community engagement",
    description: "Respond, participate, connect in communities"
  },
  friday: {
    focus: "Pipeline review",
    description: "Review leads, partners, opportunities"
  }
};
const GET = async ({ platform }) => {
  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Database not available" }, { status: 500 });
  }
  const timezone = "America/Los_Angeles";
  const now = /* @__PURE__ */ new Date();
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long"
  });
  const currentDay = dayFormatter.format(now).toLowerCase();
  const weekNumber = getWeekNumber(now, timezone);
  const weekStart = getStartOfWeek(now, timezone);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const result = await db.prepare(
    `SELECT id, scheduled_for, status, content
			 FROM social_posts
			 WHERE scheduled_for >= ? AND scheduled_for < ?
			   AND (status = 'posted' OR status = 'pending')
			 ORDER BY scheduled_for ASC`
  ).bind(weekStart.getTime(), weekEnd.getTime()).all();
  const posts = result.results || [];
  const postsByDay = /* @__PURE__ */ new Map();
  for (const post of posts) {
    const postDate = new Date(post.scheduled_for);
    const postDay = dayFormatter.format(postDate).toLowerCase();
    postsByDay.set(postDay, {
      id: post.id,
      status: post.status,
      content: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : "")
    });
  }
  const rhythm = {};
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const currentDayIndex = dayOrder.indexOf(currentDay);
  let completedDays = 0;
  for (let i = 0; i < dayOrder.length; i++) {
    const day = dayOrder[i];
    const rhythmDef = WEEKLY_RHYTHM[day];
    const post = postsByDay.get(day);
    let status;
    if (post) {
      if (post.status === "posted") {
        status = "complete";
        completedDays++;
      } else {
        status = i === currentDayIndex ? "in_progress" : "pending";
      }
    } else {
      if (i < currentDayIndex) {
        status = "missed";
      } else if (i === currentDayIndex) {
        status = "in_progress";
      } else {
        status = "pending";
      }
    }
    rhythm[day] = {
      focus: rhythmDef.focus,
      description: rhythmDef.description,
      status,
      ...post && { postId: post.id, content: post.content }
    };
  }
  const score = `${completedDays}/5`;
  let recommendation = "";
  const todaysRhythm = WEEKLY_RHYTHM[currentDay];
  if (currentDay === "saturday" || currentDay === "sunday") {
    recommendation = "Weekend - no posting scheduled. Prepare for next week.";
  } else if (rhythm[currentDay]?.status === "complete") {
    recommendation = `Today's focus (${todaysRhythm.focus}) is complete. Consider working ahead.`;
  } else if (rhythm[currentDay]?.status === "in_progress") {
    recommendation = `Focus on: ${todaysRhythm.focus}. ${todaysRhythm.description}.`;
  } else {
    recommendation = `Today: ${todaysRhythm.focus}. ${todaysRhythm.description}.`;
  }
  const missedDays = Object.values(rhythm).filter((r) => r.status === "missed").length;
  if (missedDays > 0) {
    recommendation += ` Note: ${missedDays} day(s) missed this week.`;
  }
  return json({
    week: weekNumber,
    dayOfWeek: currentDay,
    todaysFocus: todaysRhythm?.focus || "Weekend",
    todaysDescription: todaysRhythm?.description || "No posting scheduled",
    rhythm,
    score,
    completedDays,
    missedDays,
    recommendation
  });
};
export {
  GET
};
