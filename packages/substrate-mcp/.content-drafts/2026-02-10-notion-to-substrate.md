---
title: "From Notion to Substrate: A Live Migration Diary"
author: Micah Johnson
date: 2026-02-10
property: .space
tags:
  - substrate
  - agent-native
  - cloudflare
  - mcp
---

# From Notion to Substrate: A Live Migration Diary

*A practitioner diary of migrating our content calendar to an agent-native data layer — written, tracked, and reviewed inside the system it describes.*

---

This article is tracked in the system it describes. The record you'd find by calling `find_records` on the Content table — with `publish_date: 2026-02-10` and `status: in_review` — is this article. That's not a gimmick. It's the whole point.

## The Before

Our content calendar lived in Notion for over a year. A database view with columns for title, status, property (.io, .space, .ltd, .agency), publish date, and author. We had a Kanban board for pipeline visualization: Draft → In Progress → Review → Scheduled → Published. It worked. Notion is genuinely good at this.

Here's what the daily workflow looked like: open Notion, scan the Kanban board, drag a card from Draft to In Progress, write in the embedded page, toggle the status dropdown, assign a person. The whole loop was visual, manual, and human-mediated. Every interaction required a human opening the app and clicking.

That's fine when humans are the primary workers. But our content pipeline changed. Agents started drafting pieces, claiming work from task queues, submitting bodies for review. The human role shifted from *writing in the tool* to *reviewing what agents wrote*. Notion became a bottleneck — not because it was slow, but because it was designed for humans to operate, and the operators were increasingly not human.

## The Migration

The first design decision was schema. Notion databases have a fixed set of column types: text, select, multi-select, date, URL, etc. Substrate's `define_table` tool accepts the same vocabulary — `text`, `select`, `multi_select`, `date`, `url`, `json` — because the abstraction is the same. A column is a column.

Here's what the Content table looks like:

```
define_table:
  workspace: "CREATE SOMETHING Content"
  name: "Content"
  columns:
    - title (text, required)
    - status (select: draft, claimed, in_progress, in_review, scheduled, published, archived)
    - type (select: blog_post, paper, experiment, newsletter, case_study, tutorial, paradigm)
    - property (select: .agency, .io, .ltd, .space)
    - publish_date (date)
    - author (text)
    - summary (text)
    - tags (multi_select: mcp, three-tier-framework, substrate, automotive-framework, ...)
    - url (url)
    - sources (json)
    - assigned_agent (text)
    - claimed_at (datetime)
    - body (text)
    - review_notes (text)
```

Fourteen columns. Three of them — `assigned_agent`, `claimed_at`, `body` — don't exist in our old Notion database. They're agent-native fields: who claimed the work, when, and what they wrote. In Notion, agents couldn't claim work. In Substrate, claiming is a tool call.

The second design decision was supporting tables. Notion had related databases for series and topics. Substrate has the same:

- **Series** — recurring publication tracks (weekly, biweekly, monthly)
- **Topics** — taxonomy that spans properties (MCP applies to .io and .agency; Three-Tier Framework applies to .io and .ltd)

Bidirectional relations link content to series and topics, same as Notion's relation columns. The difference: agents can `create_relation` and `find_records` across these links in a single tool call, without navigating a UI.

The third decision was what *not* to migrate. We didn't bring over archived content, comment threads, or Notion-specific integrations (Slack notifications, calendar embeds). Substrate doesn't try to replicate Notion's feature surface. It provides the data layer and lets the agent conversation be the interface.

## The After

The daily workflow now:

An agent calls `list_workspaces` and gets back the full schema — every table, every column, every option value. No guessing, no hallucinating column names. The response is structured JSON, not a screenshot of a Kanban board.

To see what's due this week:

```
find_records:
  workspace_name: "CREATE SOMETHING Content"
  table_name: "Content"
  filters: [{column: "status", operator: "in", value: ["draft", "claimed", "in_progress"]}]
  sorts: [{column: "publish_date", direction: "asc"}]
```

One call. Filtered, sorted, paginated. The agent gets back records with all fields, sees what needs writing, and can claim a piece by calling `update_record` to set `assigned_agent` and `status: claimed`.

When the agent finishes writing, it calls `update_record` again to set the `body` field and advance the status to `in_review`. The audit log captures every mutation — who changed what, when, with before/after snapshots. That's the trust layer.

The human review happens in two places: the conversation (an agent summarizes what it wrote and asks for feedback) and the dashboard at `substrate.mcp.createsomething.agency/dashboard`. The dashboard is a read-only HTML view — no login, no editing, just a pipeline visualization with status badges, an 8-day timeline showing gaps, and an activity feed. It auto-refreshes every 60 seconds.

The dashboard exists because trust requires visibility. Agents manage the data; the dashboard lets humans verify it. The UI is optional, but the data is real.

## The Trade-offs

### What Notion does better

**Bulk entry.** Opening Notion and typing five rows into a table view takes 30 seconds. In Substrate, you'd call `add_record` five times or use `bulk_create_records`. The GUI wins for rapid manual input.

**Visual Kanban.** Dragging a card from "Draft" to "In Progress" is instant spatial reasoning. The dashboard shows status badges, but it's read-only. There's no drag-and-drop. The pipeline is a list, not a board.

**Real-time collaboration UI.** Two humans can edit the same Notion page simultaneously with cursors visible. Substrate has optimistic locking on `update_record` — it detects conflicts and asks you to retry — but that's conflict *detection*, not collaborative *editing*.

**Low barrier for non-technical contributors.** Anyone can use Notion. Substrate requires an MCP client (Claude Desktop, Cursor, Claude Code) or API knowledge. The audience is agents and technical operators, not general users.

### What Substrate does better

**Agent-first queries.** No human opens a database UI. The agent calls `find_records` with filters and sorts, gets structured JSON, reasons over it, and acts. The tool recedes; the work remains.

**Full audit trail.** Every create, update, archive, and restore is logged with actor, timestamp, and change diff. Notion has page history, but it's per-page and requires manual inspection. Substrate's audit log is queryable — you can ask "what changed in the last 24 hours?" and get a structured answer.

**Role-based prompts.** Substrate serves four MCP prompts: `workspace_setup`, `data_modeling`, `role_perspective`, `data_audit`. An editor agent and a writer agent see the same data through different lenses. Notion has no equivalent — views are visual filters, not cognitive frames.

**Edge-deployed.** The data lives in Cloudflare D1 at the edge. The MCP server runs as a Cloudflare Worker with Durable Objects for session state. Latency is measured in milliseconds, not the seconds it takes to load a Notion page over their API.

**Programmable trust boundaries.** Access tokens with role-based scoping, sensitive field redaction, and a separate Reader endpoint (`/reader/mcp`) that exposes only 4 tools: `find_records`, `list_workspaces`, `get_record`, `upvote_content`. Notion's sharing model is all-or-nothing at the page/database level.

## What This Sets Up

This migration diary is the first in a five-part series running through February 17th:

- **Today (Feb 10)** — You're reading it. The migration story.
- **Feb 12** — *MCP Apps + Substrate: When the Data Layer Gets a UI.* What happens when Anthropic's MCP Apps spec meets an agent-native data layer? The dashboard was built by hand; this explores what agents could build dynamically.
- **Feb 14** — *We Reduced MCP Tool Tokens by 60%.* The token optimization journey: from 25 tools with verbose schemas to 20 tools with name-based lookups, routing hints, and the `find_records` single-call pattern.
- **Feb 15** — *Substrate: The Agent-Native Data Layer.* Architecture deep-dive: D1 schemas, FTS5 full-text search, R2 file storage, Durable Object session management, the executor abstraction that lets the same service layer work in stdio and Worker mode.
- **Feb 17** — *The Hermeneutic Circle Closes at the Agent.* The philosophical grounding: why an agent that can encounter the world (Tools), remember what it found (Resources), and ask what it should do (Prompts) mirrors embodied cognition — and what that means for the Three-Tier Framework.

The Notion database served us well. But when the primary operators of your data layer become agents, the interface should speak their language. That language is MCP.

---

*This article was written by an agent, tracked in Substrate, and reviewed by a human. The record ID is `0301fb7c`. You can verify it at the [dashboard](https://substrate.mcp.createsomething.agency/dashboard).*
