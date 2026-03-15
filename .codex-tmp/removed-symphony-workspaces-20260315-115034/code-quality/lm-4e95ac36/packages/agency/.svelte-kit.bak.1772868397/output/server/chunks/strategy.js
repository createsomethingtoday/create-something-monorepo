function generateId(prefix, randomLength = 4) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 2 + randomLength);
  return `${prefix}_${timestamp}_${random}`;
}
const DEFAULT_PREFERRED_DAYS = ["mon", "tue", "wed", "thu", "fri"];
const DEFAULT_PREFERRED_HOUR = 9;
function getNextOptimalTime(timezone, preferredDays = DEFAULT_PREFERRED_DAYS, preferredHour = DEFAULT_PREFERRED_HOUR, after = /* @__PURE__ */ new Date()) {
  const now = /* @__PURE__ */ new Date();
  const effectiveAfter = after > now ? after : now;
  let candidate = new Date(effectiveAfter);
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const testDate = new Date(candidate);
    testDate.setDate(testDate.getDate() + dayOffset);
    const localDayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short"
    });
    const localDay = localDayFormatter.format(testDate).toLowerCase().slice(0, 3);
    if (preferredDays.includes(localDay)) {
      const targetDate = setLocalHour(testDate, preferredHour, timezone);
      if (targetDate > now && targetDate > effectiveAfter) {
        return targetDate;
      }
    }
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return setLocalHour(tomorrow, preferredHour, timezone);
}
function setLocalHour(date, hour, timezone) {
  const targetDate = new Date(date);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const localDateStr = formatter.format(targetDate);
  const [year, month, day] = localDateStr.split("-").map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset"
  });
  const parts = offsetFormatter.formatToParts(localDate);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  if (offsetPart) {
    const offsetMatch = offsetPart.value.match(/([+-])(\d{2}):?(\d{2})?/);
    if (offsetMatch) {
      const sign = offsetMatch[1] === "+" ? -1 : 1;
      const hours = parseInt(offsetMatch[2], 10);
      const minutes = parseInt(offsetMatch[3] || "0", 10);
      const offsetMs = sign * (hours * 60 + minutes) * 60 * 1e3;
      return new Date(localDate.getTime() + offsetMs);
    }
  }
  return localDate;
}
function generateSchedule(postCount, options) {
  const { timezone, mode, startDate, preferredDays, preferredHour } = options;
  const schedule = [];
  if (mode === "immediate") {
    const now = /* @__PURE__ */ new Date();
    for (let i = 0; i < postCount; i++) {
      const postTime = new Date(now.getTime() + i * 60 * 1e3);
      schedule.push(postTime);
    }
    return schedule;
  }
  if (mode === "longform") {
    if (startDate) {
      const exactTime = setLocalHour(startDate, preferredHour || DEFAULT_PREFERRED_HOUR, timezone);
      const now = /* @__PURE__ */ new Date();
      if (exactTime <= now) {
        console.warn(
          `[Schedule] Requested date ${startDate.toISOString()} is in the past. Finding next optimal time from now.`
        );
        const optimalTime = getNextOptimalTime(
          timezone,
          preferredDays || DEFAULT_PREFERRED_DAYS,
          preferredHour || DEFAULT_PREFERRED_HOUR,
          now
        );
        schedule.push(optimalTime);
      } else {
        schedule.push(exactTime);
      }
    } else {
      const optimalTime = getNextOptimalTime(
        timezone,
        preferredDays || DEFAULT_PREFERRED_DAYS,
        preferredHour || DEFAULT_PREFERRED_HOUR,
        /* @__PURE__ */ new Date()
      );
      schedule.push(optimalTime);
    }
    return schedule;
  }
  let nextTime = getNextOptimalTime(
    timezone,
    preferredDays || DEFAULT_PREFERRED_DAYS,
    preferredHour || DEFAULT_PREFERRED_HOUR,
    startDate || /* @__PURE__ */ new Date()
  );
  for (let i = 0; i < postCount; i++) {
    schedule.push(new Date(nextTime));
    const afterThis = new Date(nextTime.getTime() + 24 * 60 * 60 * 1e3);
    nextTime = getNextOptimalTime(
      timezone,
      preferredDays || DEFAULT_PREFERRED_DAYS,
      preferredHour || DEFAULT_PREFERRED_HOUR,
      afterThis
    );
  }
  return schedule;
}
function generatePostId() {
  return generateId("sp", 6);
}
function generateThreadId() {
  return generateId("thread");
}
function formatSchedulePreview(schedule, posts, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });
  return schedule.map((date, i) => ({
    scheduledFor: formatter.format(date),
    preview: posts[i]?.content.substring(0, 80) + (posts[i]?.content.length > 80 ? "..." : "")
  }));
}
function checkScheduleConflicts(schedule, existingPosts, timezone) {
  const conflicts = [];
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const existingByDate = /* @__PURE__ */ new Map();
  for (const post of existingPosts) {
    const postDate = new Date(post.scheduled_for);
    const dateKey = getLocalDateKey(postDate, timezone);
    if (!existingByDate.has(dateKey)) {
      existingByDate.set(dateKey, {
        id: post.id,
        threadId: post.thread_id,
        threadIndex: post.thread_index,
        preview: post.content.substring(0, 60) + (post.content.length > 60 ? "..." : "")
      });
    }
  }
  for (let i = 0; i < schedule.length; i++) {
    const dateKey = getLocalDateKey(schedule[i], timezone);
    const existing = existingByDate.get(dateKey);
    if (existing) {
      conflicts.push({
        date: dateKey,
        formattedDate: dateFormatter.format(schedule[i]),
        existingPost: existing,
        newPostIndex: i + 1
      });
    }
  }
  const hasConflicts = conflicts.length > 0;
  let message = "";
  if (hasConflicts) {
    const dateList = conflicts.map((c) => c.formattedDate).join(", ");
    message = `${conflicts.length} scheduling conflict${conflicts.length > 1 ? "s" : ""} detected. Posts already scheduled for: ${dateList}. LinkedIn penalizes multiple posts per day.`;
  }
  return { hasConflicts, conflicts, message };
}
function getLocalDateKey(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}
function suggestConflictFreeStartDate(existingPosts, postCount, timezone, preferredDays = DEFAULT_PREFERRED_DAYS) {
  let latestExisting = /* @__PURE__ */ new Date();
  for (const post of existingPosts) {
    const postDate = new Date(post.scheduled_for);
    if (postDate > latestExisting) {
      latestExisting = postDate;
    }
  }
  const startAfter = new Date(latestExisting.getTime() + 24 * 60 * 60 * 1e3);
  return getNextOptimalTime(timezone, preferredDays, DEFAULT_PREFERRED_HOUR, startAfter);
}
export {
  DEFAULT_PREFERRED_DAYS as D,
  generateSchedule as a,
  generateThreadId as b,
  checkScheduleConflicts as c,
  generatePostId as d,
  formatSchedulePreview as f,
  getNextOptimalTime as g,
  suggestConflictFreeStartDate as s
};
