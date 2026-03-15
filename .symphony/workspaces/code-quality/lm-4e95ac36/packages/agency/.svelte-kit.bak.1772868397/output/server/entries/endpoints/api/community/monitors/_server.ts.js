import { json } from "@sveltejs/kit";
const DEFAULT_KEYWORDS = [
  // Brand
  "create something",
  "createsomething",
  "@createsomething",
  // Products/Tools
  "ground cli",
  "plagiarism agent",
  "vertical template",
  // Methodology
  "subtractive triad",
  "design canon",
  "zuhandenheit design",
  // Competitors/adjacent (for opportunity detection)
  "webflow template",
  "webflow agency",
  "framer template",
  "design system agency"
];
function classifySignalType(content) {
  const lower = content.toLowerCase();
  if (lower.includes("?") || lower.includes("how do") || lower.includes("how to") || lower.includes("anyone know")) {
    return "question";
  }
  if (lower.includes("looking for") || lower.includes("need help") || lower.includes("hiring") || lower.includes("recommend")) {
    return "opportunity";
  }
  if (lower.includes("great") || lower.includes("love") || lower.includes("amazing") || lower.includes("awesome") || lower.includes("thanks")) {
    return "praise";
  }
  if (lower.includes("@") || lower.includes("reply") || lower.includes("thread")) {
    return "reply";
  }
  return "mention";
}
function scoreRelevance(signal, config) {
  let score = 0.5;
  const content = signal.content.toLowerCase();
  if (content.includes("create something") || content.includes("createsomething")) {
    score += 0.3;
  }
  if (signal.signal_type === "question") {
    score += 0.15;
  }
  if (signal.signal_type === "opportunity") {
    score += 0.2;
  }
  if (signal.author_followers) {
    if (signal.author_followers > 1e4) score += 0.15;
    else if (signal.author_followers > 5e3) score += 0.1;
    else if (signal.author_followers > 1e3) score += 0.05;
  }
  return Math.min(1, score);
}
function classifyUrgency(signal) {
  if (signal.signal_type === "opportunity" && (signal.author_followers || 0) > 5e3) {
    return "critical";
  }
  if (signal.signal_type === "question" && (signal.author_followers || 0) > 1e3) {
    return "high";
  }
  if (signal.content.toLowerCase().includes("urgent") || signal.content.toLowerCase().includes("asap")) {
    return "high";
  }
  if (signal.signal_type === "question" || signal.signal_type === "opportunity") {
    return "medium";
  }
  return "low";
}
class LinkedInMonitor {
  config;
  accessToken = null;
  constructor(config) {
    this.config = {
      keywords: config?.keywords || DEFAULT_KEYWORDS,
      watchAccounts: config?.watchAccounts || [],
      minFollowers: config?.minFollowers || 0,
      maxResults: config?.maxResults || 50
    };
  }
  /**
   * Set the access token for API calls
   */
  setAccessToken(token) {
    this.accessToken = token;
  }
  /**
   * Run the monitor
   */
  async run(db, token) {
    const startTime = (/* @__PURE__ */ new Date()).toISOString();
    const signals = [];
    const errors = [];
    if (token) {
      this.accessToken = token;
    }
    if (!this.accessToken) {
      const storedToken = await db.prepare(
        "SELECT access_token FROM linkedin_tokens WHERE id = 1"
      ).first();
      if (storedToken?.access_token) {
        this.accessToken = storedToken.access_token;
      } else {
        return {
          monitor: "linkedin",
          started_at: startTime,
          completed_at: (/* @__PURE__ */ new Date()).toISOString(),
          signals_found: 0,
          signals: [],
          errors: ["No LinkedIn access token available"]
        };
      }
    }
    try {
      const commentSignals = await this.scanPostComments();
      signals.push(...commentSignals);
    } catch (error) {
      errors.push(`Comment scan failed: ${error}`);
    }
    try {
      const mentionSignals = await this.scanMentions();
      signals.push(...mentionSignals);
    } catch (error) {
      errors.push(`Mention scan failed: ${error}`);
    }
    const processedSignals = signals.map((signal) => ({
      ...signal,
      relevance_score: scoreRelevance(signal, this.config),
      urgency: classifyUrgency(signal),
      signal_type: signal.signal_type || classifySignalType(signal.content)
    }));
    for (const signal of processedSignals) {
      try {
        const id = `sig_li_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.prepare(`
					INSERT OR IGNORE INTO community_signals (
						id, platform, signal_type, source_url, source_id,
						author_id, author_name, author_handle, author_followers,
						content, context, relevance_score, urgency, status,
						detected_at, metadata
					) VALUES (?, 'linkedin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
				`).bind(
          id,
          signal.signal_type,
          signal.source_url || null,
          signal.source_id || null,
          signal.author_id || null,
          signal.author_name || null,
          signal.author_handle || null,
          signal.author_followers || null,
          signal.content,
          signal.context || null,
          signal.relevance_score || 0.5,
          signal.urgency || "low",
          (/* @__PURE__ */ new Date()).toISOString(),
          signal.metadata ? JSON.stringify(signal.metadata) : null
        ).run();
      } catch (error) {
        console.error("Failed to store signal:", error);
      }
    }
    const runId = `run_li_${Date.now()}`;
    await db.prepare(`
			INSERT INTO community_monitor_runs (
				id, monitor_type, started_at, completed_at, signals_found, status
			) VALUES (?, 'linkedin', ?, ?, ?, 'completed')
		`).bind(runId, startTime, (/* @__PURE__ */ new Date()).toISOString(), processedSignals.length).run();
    return {
      monitor: "linkedin",
      started_at: startTime,
      completed_at: (/* @__PURE__ */ new Date()).toISOString(),
      signals_found: processedSignals.length,
      signals: processedSignals,
      errors: errors.length > 0 ? errors : void 0
    };
  }
  /**
   * Scan comments on our recent posts
   */
  async scanPostComments() {
    const signals = [];
    if (!this.accessToken) return signals;
    try {
      const postsResponse = await fetch(
        "https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:me&count=10",
        {
          headers: {
            "Authorization": `Bearer ${this.accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0"
          }
        }
      );
      if (!postsResponse.ok) {
        console.error("Failed to fetch LinkedIn posts:", postsResponse.status);
        return signals;
      }
      const postsData = await postsResponse.json();
      for (const post of postsData.elements || []) {
        const activityUrn = post.activity || post.id;
        const commentsResponse = await fetch(
          `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(activityUrn)}/comments`,
          {
            headers: {
              "Authorization": `Bearer ${this.accessToken}`,
              "X-Restli-Protocol-Version": "2.0.0"
            }
          }
        );
        if (!commentsResponse.ok) continue;
        const commentsData = await commentsResponse.json();
        for (const comment of commentsData.elements || []) {
          signals.push({
            platform: "linkedin",
            signal_type: "reply",
            content: comment.message?.text || "",
            source_id: comment.id,
            source_url: `https://linkedin.com/feed/update/${activityUrn}`,
            author_id: comment.actor,
            metadata: {
              activity_urn: activityUrn,
              created_time: comment.created?.time
            }
          });
        }
      }
    } catch (error) {
      console.error("LinkedIn comment scan error:", error);
    }
    return signals;
  }
  /**
   * Scan for mentions via notifications or search
   */
  async scanMentions() {
    const signals = [];
    if (!this.accessToken) return signals;
    try {
      const notificationsResponse = await fetch(
        "https://api.linkedin.com/v2/notifications?q=criteria&count=50",
        {
          headers: {
            "Authorization": `Bearer ${this.accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0"
          }
        }
      );
      if (!notificationsResponse.ok) {
        return signals;
      }
      const notificationsData = await notificationsResponse.json();
      for (const notification of notificationsData.elements || []) {
        if (notification.notificationType?.includes("MENTION") || notification.notificationType?.includes("COMMENT") || notification.notificationType?.includes("SHARE")) {
          signals.push({
            platform: "linkedin",
            signal_type: "mention",
            content: notification.headline || "LinkedIn notification",
            source_id: notification.id,
            author_id: notification.actor,
            metadata: {
              notification_type: notification.notificationType,
              created_time: notification.created?.time
            }
          });
        }
      }
    } catch (error) {
      console.error("LinkedIn notification scan error:", error);
    }
    return signals;
  }
}
const OUR_REPOS = [
  "create-something/ground",
  "create-something/templates"
  // Add more repos as they become public
];
class GitHubMonitor {
  config;
  token = null;
  constructor(config) {
    this.config = {
      keywords: config?.keywords || DEFAULT_KEYWORDS,
      watchAccounts: config?.watchAccounts || [],
      minFollowers: config?.minFollowers || 0,
      maxResults: config?.maxResults || 50,
      since: config?.since
    };
  }
  /**
   * Set GitHub token for API calls
   */
  setToken(token) {
    this.token = token;
  }
  /**
   * Run the monitor
   */
  async run(db, token) {
    const startTime = (/* @__PURE__ */ new Date()).toISOString();
    const signals = [];
    const errors = [];
    if (token) {
      this.token = token;
    }
    const headers = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "CREATE-SOMETHING-Monitor"
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    try {
      const searchSignals = await this.searchMentions(headers);
      signals.push(...searchSignals);
    } catch (error) {
      errors.push(`Search failed: ${error}`);
    }
    try {
      const repoSignals = await this.scanOurRepos(headers);
      signals.push(...repoSignals);
    } catch (error) {
      errors.push(`Repo scan failed: ${error}`);
    }
    const processedSignals = signals.map((signal) => ({
      ...signal,
      relevance_score: scoreRelevance(signal, this.config),
      urgency: classifyUrgency(signal),
      signal_type: signal.signal_type || classifySignalType(signal.content)
    }));
    const seen = /* @__PURE__ */ new Set();
    const uniqueSignals = processedSignals.filter((s) => {
      if (s.source_id && seen.has(s.source_id)) return false;
      if (s.source_id) seen.add(s.source_id);
      return true;
    });
    for (const signal of uniqueSignals) {
      try {
        const id = `sig_gh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.prepare(`
					INSERT OR IGNORE INTO community_signals (
						id, platform, signal_type, source_url, source_id,
						author_id, author_name, author_handle, author_followers,
						content, context, relevance_score, urgency, status,
						detected_at, metadata
					) VALUES (?, 'github', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
				`).bind(
          id,
          signal.signal_type,
          signal.source_url || null,
          signal.source_id || null,
          signal.author_id || null,
          signal.author_name || null,
          signal.author_handle || null,
          signal.author_followers || null,
          signal.content,
          signal.context || null,
          signal.relevance_score || 0.5,
          signal.urgency || "low",
          (/* @__PURE__ */ new Date()).toISOString(),
          signal.metadata ? JSON.stringify(signal.metadata) : null
        ).run();
      } catch (error) {
        console.error("Failed to store GitHub signal:", error);
      }
    }
    const runId = `run_gh_${Date.now()}`;
    await db.prepare(`
			INSERT INTO community_monitor_runs (
				id, monitor_type, started_at, completed_at, signals_found, status
			) VALUES (?, 'github', ?, ?, ?, 'completed')
		`).bind(runId, startTime, (/* @__PURE__ */ new Date()).toISOString(), uniqueSignals.length).run();
    return {
      monitor: "github",
      started_at: startTime,
      completed_at: (/* @__PURE__ */ new Date()).toISOString(),
      signals_found: uniqueSignals.length,
      signals: uniqueSignals,
      errors: errors.length > 0 ? errors : void 0
    };
  }
  /**
   * Search GitHub for keyword mentions
   */
  async searchMentions(headers) {
    const signals = [];
    const keywords = this.config.keywords.slice(0, 5);
    const query = keywords.map((k) => `"${k}"`).join(" OR ");
    const sinceDate = this.config.since ? new Date(this.config.since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const searchUrl = new URL("https://api.github.com/search/issues");
    searchUrl.searchParams.set("q", `${query} created:>=${sinceDate.toISOString().split("T")[0]}`);
    searchUrl.searchParams.set("sort", "created");
    searchUrl.searchParams.set("order", "desc");
    searchUrl.searchParams.set("per_page", String(this.config.maxResults || 30));
    try {
      const response = await fetch(searchUrl.toString(), { headers });
      if (!response.ok) {
        console.error("GitHub search failed:", response.status);
        return signals;
      }
      const data = await response.json();
      for (const item of data.items || []) {
        if (OUR_REPOS.some((repo) => item.repository_url?.includes(repo))) {
          continue;
        }
        signals.push({
          platform: "github",
          signal_type: item.html_url.includes("/issues/") ? "question" : "mention",
          content: `${item.title}

${item.body?.slice(0, 500) || ""}`,
          source_url: item.html_url,
          source_id: `gh_issue_${item.id}`,
          author_handle: item.user?.login,
          author_id: String(item.user?.id),
          context: `Repository: ${item.repository_url?.split("/repos/")[1] || "unknown"}`,
          metadata: {
            state: item.state,
            created_at: item.created_at
          }
        });
      }
    } catch (error) {
      console.error("GitHub search error:", error);
    }
    return signals;
  }
  /**
   * Scan our repos for new issues, discussions, and notable events
   */
  async scanOurRepos(headers) {
    const signals = [];
    for (const repo of OUR_REPOS) {
      try {
        const issuesUrl = `https://api.github.com/repos/${repo}/issues?state=open&sort=created&direction=desc&per_page=10`;
        const issuesResponse = await fetch(issuesUrl, { headers });
        if (issuesResponse.ok) {
          const issues = await issuesResponse.json();
          for (const issue of issues) {
            if (issue.html_url.includes("/pull/")) continue;
            const isQuestion = issue.labels?.some(
              (l) => l.name.toLowerCase().includes("question") || l.name.toLowerCase().includes("help")
            );
            signals.push({
              platform: "github",
              signal_type: isQuestion ? "question" : "mention",
              content: `${issue.title}

${issue.body?.slice(0, 500) || ""}`,
              source_url: issue.html_url,
              source_id: `gh_our_issue_${issue.id}`,
              author_handle: issue.user?.login,
              author_id: String(issue.user?.id),
              context: `Our repo: ${repo}`,
              urgency: "medium",
              // Issues on our repos are higher priority
              metadata: {
                repo,
                created_at: issue.created_at
              }
            });
          }
        }
        const starsUrl = `https://api.github.com/repos/${repo}/stargazers?per_page=20`;
        const starsResponse = await fetch(starsUrl, {
          headers: { ...headers, "Accept": "application/vnd.github.star+json" }
        });
        if (starsResponse.ok) {
          const stargazers = await starsResponse.json();
          for (const star of stargazers) {
            if (star.user?.followers > 100) {
              signals.push({
                platform: "github",
                signal_type: "praise",
                content: `${star.user.login} starred ${repo}`,
                source_url: `https://github.com/${star.user.login}`,
                source_id: `gh_star_${repo}_${star.user.id}`,
                author_handle: star.user.login,
                author_id: String(star.user.id),
                author_followers: star.user.followers,
                context: `Starred ${repo}`,
                metadata: {
                  repo,
                  starred_at: star.starred_at
                }
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning repo ${repo}:`, error);
      }
    }
    return signals;
  }
}
const GET = async ({ platform }) => {
  const db = platform.env.DB;
  try {
    const runs = await db.prepare(`
			SELECT * FROM community_monitor_runs 
			ORDER BY started_at DESC 
			LIMIT 20
		`).all();
    return json({
      monitors: ["linkedin", "github"],
      recent_runs: runs.results,
      available_tokens: {
        linkedin: !!await db.prepare(
          "SELECT 1 FROM linkedin_tokens WHERE id = 1 AND access_token IS NOT NULL"
        ).first()
      }
    });
  } catch (error) {
    return json({ error: "Failed to fetch monitor status" }, { status: 500 });
  }
};
const POST = async ({ platform, request }) => {
  const db = platform.env.DB;
  const body = await request.json();
  const { monitor, github_token, linkedin_token } = body;
  if (!monitor || !["linkedin", "github", "all"].includes(monitor)) {
    return json(
      { error: "Invalid monitor. Must be: linkedin, github, or all" },
      { status: 400 }
    );
  }
  const results = {};
  if (monitor === "linkedin" || monitor === "all") {
    try {
      const linkedinMonitor = new LinkedInMonitor({
        maxResults: 50
      });
      results.linkedin = await linkedinMonitor.run(db, linkedin_token);
    } catch (error) {
      results.linkedin = { error: String(error) };
    }
  }
  if (monitor === "github" || monitor === "all") {
    try {
      const githubMonitor = new GitHubMonitor({
        maxResults: 50,
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString()
      });
      results.github = await githubMonitor.run(db, github_token || platform.env.GITHUB_TOKEN);
    } catch (error) {
      results.github = { error: String(error) };
    }
  }
  return json({
    triggered: monitor,
    results
  });
};
export {
  GET,
  POST
};
