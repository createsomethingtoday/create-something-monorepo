import { json } from "@sveltejs/kit";
import { readFile } from "fs/promises";
import { join } from "path";
import { g as getTokenStatus } from "../../../../../chunks/linkedin-client.js";
import { a as generateSchedule, b as generateThreadId, c as checkScheduleConflicts, s as suggestConflictFreeStartDate, f as formatSchedulePreview, d as generatePostId } from "../../../../../chunks/strategy.js";
function parseThread(markdown) {
  const lines = markdown.split("\n");
  const metadata = {
    title: "",
    hashtags: []
  };
  const posts = [];
  let currentPost = null;
  let inLongform = false;
  let inComment = false;
  let inHashtags = false;
  for (const line of lines) {
    if (line.startsWith("# LinkedIn Thread:")) {
      metadata.title = line.replace("# LinkedIn Thread:", "").trim();
      continue;
    }
    if (line.startsWith("# LinkedIn Post:")) {
      metadata.title = line.replace("# LinkedIn Post:", "").trim();
      continue;
    }
    if (line.startsWith("# ") && !metadata.title) {
      metadata.title = line.replace("# ", "").trim();
      continue;
    }
    if (line.startsWith("**Campaign:**")) {
      metadata.campaign = line.replace("**Campaign:**", "").trim();
      continue;
    }
    if (line.startsWith("**Target:**")) {
      metadata.target = line.replace("**Target:**", "").trim();
      continue;
    }
    if (line.startsWith("**Type:**")) {
      metadata.type = line.replace("**Type:**", "").trim();
      continue;
    }
    if (line.startsWith("**CTA:**")) {
      metadata.cta = line.replace("**CTA:**", "").trim();
      continue;
    }
    if (line.trim() === "## Thread") {
      inLongform = false;
      continue;
    }
    if (line.trim() === "## Post") {
      inLongform = true;
      currentPost = { label: "Longform", lines: [] };
      continue;
    }
    if (line.includes("## Comment")) {
      inComment = true;
      inLongform = false;
      if (currentPost && currentPost.lines.length > 0) {
        posts.push(buildPost(currentPost, posts.length, 0, metadata.hashtags));
        currentPost = null;
      }
      continue;
    }
    if (inComment && !line.startsWith("---") && !line.startsWith("## ")) {
      const hashtagMatches = line.match(/#\w+/g);
      if (hashtagMatches) {
        metadata.hashtags.push(...hashtagMatches);
      }
      continue;
    }
    if (line.includes("Suggested hashtags")) {
      inHashtags = true;
      continue;
    }
    if (inHashtags && line.startsWith("- #")) {
      metadata.hashtags.push(line.replace("- ", "").trim());
      continue;
    }
    if (inHashtags && line.startsWith("---")) {
      inHashtags = false;
      continue;
    }
    if (line.startsWith("## ") && !["## Thread", "## Post", "## Comment"].includes(line.trim())) {
      inLongform = false;
      inComment = false;
      if (currentPost && currentPost.lines.length > 0) {
        posts.push(buildPost(currentPost, posts.length, 0, metadata.hashtags));
        currentPost = null;
      }
      continue;
    }
    const tweetMatch = line.match(/^### (?:Tweet|Post) (\d+)(?: \(([^)]+)\))?/);
    if (tweetMatch) {
      if (currentPost && currentPost.lines.length > 0) {
        posts.push(buildPost(currentPost, posts.length, 0, metadata.hashtags));
      }
      currentPost = {
        label: tweetMatch[2] || `Part ${tweetMatch[1]}`,
        lines: []
      };
      continue;
    }
    if (currentPost && line.trim() !== "---") {
      currentPost.lines.push(line);
    }
    if (inLongform && currentPost && line.trim() !== "---") ;
  }
  if (currentPost) {
    posts.push(buildPost(currentPost, posts.length, 0, metadata.hashtags));
  }
  const total = posts.length;
  posts.forEach((post, i) => {
    post.total = total;
  });
  return { metadata, posts };
}
function buildPost(raw, index, total, hashtags) {
  const content = raw.lines.join("\n").trim().replace(/\*\*([^*]+)\*\*/g, "$1");
  const urlMatch = content.match(/https?:\/\/[^\s]+/);
  const hasLink = !!urlMatch;
  return {
    content,
    label: raw.label,
    index: index + 1,
    total,
    hashtags: index === 0 ? [] : hashtags,
    // Hashtags only on last post per best practices
    hasLink,
    linkForComment: hasLink ? urlMatch[0] : void 0
  };
}
function formatPostForLinkedIn(post, options = {}) {
  const { includeNumbering = true, includeHashtags = false, extractLinkToComment = true } = options;
  let postContent = post.content;
  if (includeNumbering && post.total > 1) {
    postContent = `${post.index}/${post.total}: ${postContent}`;
  }
  let commentContent;
  if (extractLinkToComment && post.linkForComment) {
    postContent = postContent.replace(post.linkForComment, "").trim();
    postContent = postContent.replace(/(?:Visit|Link|See|Check out)[:\s]*$/i, "").trim();
    commentContent = post.linkForComment;
  }
  if (includeHashtags && post.index === post.total && post.hashtags.length > 0) {
    postContent = `${postContent}

${post.hashtags.slice(0, 5).join(" ")}`;
  }
  return { postContent, commentContent };
}
function consolidateToLongForm(thread) {
  const sections = thread.posts.map((post, i) => {
    return `**${post.label}**

${post.content}`;
  });
  const content = sections.join("\n\n---\n\n");
  const allLinks = thread.posts.filter((p) => p.linkForComment).map((p) => p.linkForComment);
  return {
    content,
    label: "Long-form",
    index: 1,
    total: 1,
    hashtags: thread.metadata.hashtags,
    hasLink: allLinks.length > 0,
    linkForComment: allLinks.length > 0 ? allLinks.join("\n") : void 0
  };
}
const POST = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  const sessions = platform?.env?.SESSIONS;
  if (!db || !sessions) {
    return json({ error: "Database or sessions not available" }, { status: 500 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const {
    platform: targetPlatform,
    content,
    mode = "drip",
    timezone = "America/Los_Angeles",
    startDate,
    dryRun = false,
    forceSchedule = false,
    organizationId
  } = body;
  const tokenStatus = await getTokenStatus(sessions);
  const tokenWarning = !tokenStatus.connected ? "LinkedIn not connected. Authenticate at https://createsomething.io/api/linkedin/auth before scheduling." : tokenStatus.warning;
  if (!tokenStatus.connected && !dryRun) {
    return json(
      {
        error: "LinkedIn not connected",
        message: "Visit /api/linkedin/auth on createsomething.io to connect",
        authUrl: "https://createsomething.io/api/linkedin/auth"
      },
      { status: 401 }
    );
  }
  if (tokenStatus.warning) {
    console.warn("LinkedIn token warning:", tokenStatus.warning);
  }
  if (organizationId) {
    const authorizedOrgs = tokenStatus.organizations || [];
    const org = authorizedOrgs.find((o) => o.id === organizationId);
    if (!org) {
      return json(
        {
          error: `Not authorized to post as organization ${organizationId}`,
          authorizedOrganizations: authorizedOrgs.map((o) => ({
            id: o.id,
            name: o.name
          })),
          message: authorizedOrgs.length > 0 ? `Authorized organizations: ${authorizedOrgs.map((o) => `${o.name} (${o.id})`).join(", ")}` : "No organizations found. Re-authenticate at /api/linkedin/auth to refresh."
        },
        { status: 403 }
      );
    }
  }
  if (targetPlatform !== "linkedin") {
    return json(
      {
        error: "Unsupported platform",
        message: "Currently only LinkedIn is supported",
        supported: ["linkedin"]
      },
      { status: 400 }
    );
  }
  if (!content) {
    return json({ error: "Missing content field" }, { status: 400 });
  }
  let markdown;
  let campaign;
  if (content.length < 100 && !content.includes("\n")) {
    try {
      const contentPath = join(
        process.cwd(),
        "content",
        "social",
        `linkedin-thread-${content}.md`
      );
      markdown = await readFile(contentPath, "utf-8");
      campaign = content;
    } catch {
      markdown = content;
    }
  } else {
    markdown = content;
  }
  const thread = parseThread(markdown);
  if (thread.posts.length === 0) {
    return json(
      {
        error: "No posts found in content",
        message: "Content should have ### Tweet N or ### Post N sections"
      },
      { status: 400 }
    );
  }
  let postsToSchedule;
  if (mode === "longform") {
    const consolidated = consolidateToLongForm(thread);
    const { postContent, commentContent } = formatPostForLinkedIn(consolidated, {
      includeNumbering: false,
      includeHashtags: true,
      extractLinkToComment: true
    });
    postsToSchedule = [{ content: postContent, commentLink: commentContent }];
  } else {
    postsToSchedule = thread.posts.map((post) => {
      const { postContent, commentContent } = formatPostForLinkedIn(post, {
        includeNumbering: mode !== "immediate",
        // Number drip posts
        includeHashtags: post.index === post.total,
        extractLinkToComment: true
      });
      return { content: postContent, commentLink: commentContent };
    });
  }
  let parsedStartDate;
  let dateAdjusted = false;
  if (startDate) {
    parsedStartDate = new Date(startDate);
    const now2 = /* @__PURE__ */ new Date();
    if (parsedStartDate <= now2) {
      dateAdjusted = true;
      console.warn(
        `[Schedule API] Requested startDate ${startDate} parsed to past date ${parsedStartDate.toISOString()}. Will auto-adjust to future.`
      );
    }
  }
  const schedule = generateSchedule(postsToSchedule.length, {
    timezone,
    mode,
    startDate: parsedStartDate
  });
  const threadId = generateThreadId();
  const now = Date.now();
  let conflictResult = {
    hasConflicts: false,
    conflicts: [],
    message: ""
  };
  let suggestedStartDate;
  if (mode !== "immediate") {
    const minDate = Math.min(...schedule.map((d) => d.getTime()));
    const maxDate = Math.max(...schedule.map((d) => d.getTime()));
    const bufferDays = 7 * 24 * 60 * 60 * 1e3;
    const existingResult = await db.prepare(
      `SELECT id, scheduled_for, thread_id, thread_index, content
				 FROM social_posts
				 WHERE status = 'pending'
				   AND scheduled_for >= ?
				   AND scheduled_for <= ?
				 ORDER BY scheduled_for ASC`
    ).bind(minDate - bufferDays, maxDate + bufferDays).all();
    const existingPosts = existingResult.results || [];
    conflictResult = checkScheduleConflicts(schedule, existingPosts, timezone);
    if (conflictResult.hasConflicts) {
      const allPendingResult = await db.prepare(`SELECT scheduled_for FROM social_posts WHERE status = 'pending'`).all();
      const allPending = allPendingResult.results || [];
      const suggested = suggestConflictFreeStartDate(allPending, postsToSchedule.length, timezone);
      suggestedStartDate = suggested.toISOString().split("T")[0];
    }
  }
  const preview = formatSchedulePreview(schedule, postsToSchedule, timezone);
  if (dryRun) {
    const dryRunResponse = {
      dryRun: true,
      mode,
      timezone,
      threadId,
      totalPosts: postsToSchedule.length,
      ...organizationId && { organizationId },
      tokenStatus: {
        connected: tokenStatus.connected,
        daysRemaining: tokenStatus.daysRemaining,
        warning: tokenWarning,
        organizations: tokenStatus.organizations?.map((o) => ({ id: o.id, name: o.name }))
      },
      conflicts: conflictResult.hasConflicts ? {
        detected: true,
        count: conflictResult.conflicts.length,
        message: conflictResult.message,
        details: conflictResult.conflicts,
        suggestedStartDate
      } : { detected: false },
      scheduled: preview.map((p, i) => ({
        ...p,
        fullContent: postsToSchedule[i].content,
        hasCommentLink: !!postsToSchedule[i].commentLink
      }))
    };
    if (dateAdjusted) {
      dryRunResponse.dateAdjusted = {
        originalRequest: startDate,
        message: `Requested date "${startDate}" was in the past. Automatically adjusted to next optimal time.`,
        adjustedTo: schedule[0]?.toISOString()
      };
    }
    return json(dryRunResponse);
  }
  if (conflictResult.hasConflicts && !forceSchedule) {
    return json(
      {
        error: "Schedule conflicts detected",
        message: conflictResult.message,
        conflicts: conflictResult.conflicts,
        suggestedStartDate,
        hint: "Use startDate parameter to schedule after existing posts, or set forceSchedule: true to override"
      },
      { status: 409 }
    );
  }
  const insertedPosts = [];
  for (let i = 0; i < postsToSchedule.length; i++) {
    const postId = generatePostId();
    const post = postsToSchedule[i];
    const scheduledFor = schedule[i];
    const metadataObj = {};
    if (post.commentLink) metadataObj.commentLink = post.commentLink;
    if (organizationId) metadataObj.organizationId = organizationId;
    const metadata = Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null;
    await db.prepare(
      `INSERT INTO social_posts
			(id, platform, content, scheduled_for, timezone, status, campaign, thread_id, thread_index, thread_total, created_at, metadata)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      postId,
      "linkedin",
      post.content,
      scheduledFor.getTime(),
      timezone,
      "pending",
      campaign || null,
      threadId,
      i + 1,
      postsToSchedule.length,
      now,
      metadata
    ).run();
    insertedPosts.push({
      id: postId,
      scheduledFor: preview[i].scheduledFor,
      preview: preview[i].preview
    });
  }
  const response = {
    success: true,
    mode,
    timezone,
    threadId,
    totalPosts: postsToSchedule.length,
    ...organizationId && { organizationId },
    tokenStatus: {
      connected: tokenStatus.connected,
      daysRemaining: tokenStatus.daysRemaining,
      warning: tokenStatus.warning,
      organizations: tokenStatus.organizations?.map((o) => ({ id: o.id, name: o.name }))
    },
    scheduled: insertedPosts
  };
  if (conflictResult.hasConflicts && forceSchedule) {
    response.warning = {
      message: "Scheduled despite conflicts (forceSchedule=true)",
      conflicts: conflictResult.conflicts.length,
      note: "LinkedIn may penalize multiple posts on the same day"
    };
  }
  if (dateAdjusted) {
    response.dateAdjusted = {
      originalRequest: startDate,
      message: `Requested date "${startDate}" was in the past. Automatically adjusted to next optimal time.`,
      adjustedTo: schedule[0]?.toISOString()
    };
  }
  return json(response);
};
export {
  POST
};
