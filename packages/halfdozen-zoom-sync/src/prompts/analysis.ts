/**
 * Analysis Prompts — transcript_analysis, clip_summarization, sync_strategy
 * Three-Tier Framework: Judgment tier (MCP Prompts)
 *
 * Prompts provide user-controlled judgment templates for analyzing
 * Zoom Clips data. Each prompt encodes policy about how the model
 * should interpret transcript content and make recommendations.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared preamble
// ---------------------------------------------------------------------------

const SYSTEM_PREAMBLE = `You are analyzing data from the Zoom Clips MCP system — a platform that syncs Zoom Clips (standalone video recordings, like Loom) to Notion with full transcripts.

**Clip structure reference:**
- Each clip has: title, speaker, created date, transcript, summary, source URL
- Clips are stored in Notion with select properties: Status (Active), Source (Zoom), Type (Clip)
- Transcripts are extracted via browser automation from Zoom's interface
- Clips are NOT meeting recordings — they are standalone async video messages

Keep analysis concrete and actionable. Use the data provided — do not invent clips or assume information not present.`;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerPrompts(server: McpServer): void {
  // --- Transcript Analysis --------------------------------------------------
  server.prompt(
    'transcript_analysis',
    'Analyze a clip transcript for key topics, action items, and decisions',
    {
      clip_title: z.string().describe('Title of the clip being analyzed'),
      speaker: z
        .string()
        .optional()
        .describe('Name of the person in the clip'),
      transcript: z
        .string()
        .describe('Full transcript text of the clip'),
      context: z
        .string()
        .optional()
        .describe(
          'Additional context about the clip (project, team, purpose)',
        ),
    },
    async ({ clip_title, speaker, transcript, context }) => {
      const speakerClause = speaker ? `Speaker: **${speaker}**` : '';
      const contextClause = context
        ? `\n\n### Context\n\n${context}`
        : '';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${SYSTEM_PREAMBLE}

## Task: Transcript Analysis

Analyze the transcript from clip **"${clip_title}"**. ${speakerClause}${contextClause}

### Transcript

\`\`\`
${transcript}
\`\`\`

### Instructions

1. **Summary** — Provide a concise 2-3 sentence summary of what this clip covers.

2. **Key Topics** — List the main topics discussed, each with a brief description.

3. **Action Items** — Extract any explicit or implied action items:
   - What needs to be done
   - Who is responsible (if mentioned)
   - Any deadlines mentioned

4. **Decisions** — List any decisions that were made or proposed.

5. **Questions Raised** — Note any open questions that weren't resolved in the clip.

6. **Follow-up Recommendations** — Based on the content, suggest:
   - Who else should see this clip
   - What meetings or discussions should follow
   - Any documents or resources that should be created

Format your response with clear section headings.`,
            },
          },
        ],
      };
    },
  );

  // --- Clip Summarization ---------------------------------------------------
  server.prompt(
    'clip_summarization',
    'Summarize a set of clips from a date range',
    {
      clips_json: z
        .string()
        .describe(
          'JSON array of clip objects (title, speaker, date, transcript or summary)',
        ),
      date_range: z
        .string()
        .optional()
        .describe('Date range being summarized (e.g., "Jan 27 - Feb 3, 2026")'),
      focus_area: z
        .string()
        .optional()
        .describe(
          'Specific area to focus on (e.g., "product decisions", "client updates")',
        ),
    },
    async ({ clips_json, date_range, focus_area }) => {
      const dateClause = date_range
        ? `for the period **${date_range}**`
        : 'across all provided clips';

      const focusClause = focus_area
        ? `Pay special attention to content related to: **${focus_area}**`
        : '';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${SYSTEM_PREAMBLE}

## Task: Clip Summarization

Create a digest of Zoom Clips ${dateClause}. ${focusClause}

### Clips Data

\`\`\`json
${clips_json}
\`\`\`

### Instructions

1. **Executive Summary** — 3-5 sentences covering the most important information across all clips.

2. **Clip-by-Clip Breakdown** — For each clip:
   - **Title** and **Speaker**
   - One-sentence summary
   - Key takeaway

3. **Themes** — Identify recurring themes or topics that appear across multiple clips.

4. **Action Items Roll-up** — Consolidated list of all action items mentioned across clips, grouped by responsible person if possible.

5. **Decisions Made** — All decisions across the clips, noting which clip each came from.

6. **Open Items** — Questions or unresolved topics that need follow-up.

7. **Recommended Next Steps** — Based on the full set of clips, what should happen next?

Format as a professional weekly/daily digest that someone could skim in 2 minutes.`,
            },
          },
        ],
      };
    },
  );

  // --- Sync Strategy --------------------------------------------------------
  server.prompt(
    'sync_strategy',
    'Recommend sync frequency and clip selection based on usage patterns',
    {
      sync_history_json: z
        .string()
        .describe(
          'JSON array of recent sync runs (status, clips_found, clips_synced, timestamps)',
        ),
      clip_count: z
        .number()
        .optional()
        .describe('Total number of clips currently in the Notion database'),
      usage_notes: z
        .string()
        .optional()
        .describe(
          'Notes about how clips are used (e.g., "team standup recaps", "client demos")',
        ),
    },
    async ({ sync_history_json, clip_count, usage_notes }) => {
      const countClause = clip_count
        ? `Current database size: **${clip_count} clips**.`
        : '';

      const usageClause = usage_notes
        ? `\n\n### Usage Context\n\n${usage_notes}`
        : '';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${SYSTEM_PREAMBLE}

## Task: Sync Strategy

Analyze the sync history and recommend an optimal sync configuration. ${countClause}${usageClause}

### Sync History

\`\`\`json
${sync_history_json}
\`\`\`

### Instructions

1. **Current State Assessment** — Analyze the sync history:
   - Success rate
   - Average clips per sync
   - Session expiry frequency
   - Any patterns in failures

2. **Frequency Recommendation** — Based on clip creation patterns, recommend:
   - Optimal sync frequency (hourly, daily, twice daily)
   - Best time of day to sync
   - Whether weekend syncs are needed

3. **Clip Selection** — Recommend:
   - Whether to sync all clips or filter by criteria
   - Maximum clips per run (for performance)
   - Whether to skip clips without transcripts

4. **Session Management** — Recommend:
   - Cookie refresh schedule
   - Alerting thresholds for session expiry
   - Backup strategies if sessions fail

5. **Cost Optimization** — Consider:
   - Steel.dev session costs (billed per session)
   - Notion API rate limits
   - Balance between freshness and efficiency

Provide specific, actionable recommendations with reasoning.`,
            },
          },
        ],
      };
    },
  );
}
