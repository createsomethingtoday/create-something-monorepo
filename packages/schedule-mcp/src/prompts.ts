/**
 * Schedule MCP — Prompt Registration
 * Three-Tier Framework: Judgment tier (MCP Prompts)
 *
 * Prompts provide user-controlled judgment templates that guide the model's
 * reasoning about schedule data. Each prompt sets context about the Schedule
 * MCP system, event structure (unix timestamps in seconds, fields like title,
 * start_time, end_time, calendar_id, status), and instructs the model to
 * perform a specific analysis or decision-making task.
 *
 * These prompts sit at the Judgment tier because they encode *policy* — how
 * the model should interpret data and what recommendations are appropriate.
 * The user controls which prompt to invoke and with what parameters.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared preamble
// ---------------------------------------------------------------------------

const SYSTEM_PREAMBLE = `You are analyzing data from the Schedule MCP system — a shared scheduling platform that manages calendars, events, members, and organizational units.

**Event structure reference:**
- Events use unix timestamps in seconds (not milliseconds)
- Key fields: title, start_time, end_time, calendar_id, status, description, location, recurrence_rule
- Status values: confirmed, tentative, cancelled
- Calendars belong to members or units; members belong to units

Keep analysis concrete and actionable. Use the data provided — do not invent events or assume information not present.`;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all MCP prompts on the server.
 *
 * @param server - The MCP server instance to register prompts on
 */
export function registerPrompts(server: McpServer): void {
  // --- Schedule Analysis ---------------------------------------------------
  server.prompt(
    'schedule_analysis',
    'Analyze schedule patterns, utilization, and workload distribution',
    {
      calendar_name: z.string().describe('Name of the calendar to analyze'),
      events_json: z
        .string()
        .describe('JSON array of events from the calendar'),
      time_period: z
        .string()
        .optional()
        .describe(
          'Time period to analyze, e.g., "last 30 days", "this week"',
        ),
    },
    async ({ calendar_name, events_json, time_period }) => {
      const periodClause = time_period
        ? `Focus the analysis on the period: ${time_period}.`
        : 'Analyze the full range of events provided.';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${SYSTEM_PREAMBLE}

## Task: Schedule Analysis

Analyze the schedule for calendar **"${calendar_name}"**. ${periodClause}

### Events Data

\`\`\`json
${events_json}
\`\`\`

### Instructions

1. **Overview** — Summarize the calendar: total events, date range covered, general character of the schedule.

2. **Patterns** — Identify recurring meetings, peak busy times (time of day, day of week), and quiet periods. Note any weekly or daily rhythms.

3. **Utilization** — Calculate:
   - Total hours scheduled vs. available (assume 8-hour workdays, Mon–Fri)
   - Busiest and lightest days of the week
   - Average meetings per day
   - Average meeting duration

4. **Issues** — Flag potential problems:
   - Back-to-back meetings with no breaks
   - Days with more than 6 hours of meetings
   - Very early or very late meetings
   - Meetings that span lunch hours consistently

5. **Recommendations** — Provide actionable suggestions to optimize the schedule:
   - Where to create focus time blocks
   - Which meetings could be shortened, combined, or made asynchronous
   - Ideal days/times for deep work based on current patterns

Format your response with clear section headings.`,
            },
          },
        ],
      };
    },
  );

  // --- Conflict Resolution -------------------------------------------------
  server.prompt(
    'conflict_resolution',
    'Guided conflict resolution when scheduling overlaps are detected',
    {
      conflicts_json: z
        .string()
        .describe(
          'JSON array of conflict objects with event_a, event_b, overlap details',
        ),
      member_names: z
        .string()
        .optional()
        .describe('Comma-separated names of affected members'),
      priority_rules: z
        .string()
        .optional()
        .describe(
          'Priority rules, e.g., "client meetings > internal meetings > 1:1s"',
        ),
    },
    async ({ conflicts_json, member_names, priority_rules }) => {
      const membersClause = member_names
        ? `Affected members: ${member_names}.`
        : '';

      const priorityClause = priority_rules
        ? `Apply these priority rules when deciding which event takes precedence:\n${priority_rules}`
        : 'Use reasonable defaults: external/client meetings generally take priority over internal meetings, and shorter adjustments are preferred over cancellations.';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${SYSTEM_PREAMBLE}

## Task: Conflict Resolution

Review the following scheduling conflicts and propose resolutions. ${membersClause}

### Conflicts Data

\`\`\`json
${conflicts_json}
\`\`\`

### Priority Rules

${priorityClause}

### Instructions

For each conflict:

1. **Assess severity** — Is it a full overlap (one event entirely within another) or partial? What is the overlap duration? Are both events confirmed or is one tentative?

2. **Determine precedence** — Using the priority rules above, identify which event should keep its slot and which should be moved.

3. **Propose resolution** — Suggest a specific action:
   - **Reschedule** — Move the lower-priority event to a specific alternative time
   - **Shorten** — Reduce one event's duration to eliminate overlap
   - **Combine** — Merge related events into a single meeting
   - **Cancel** — Remove an event if it's redundant or low-value

4. **Assess impact** — Consider downstream effects: does moving one event create new conflicts? Does it affect recurring series?

### Output Format

Provide a **prioritized action plan** — resolve the most severe or impactful conflicts first. For each resolution, state:
- Which conflict it addresses
- The proposed change
- Why this resolution was chosen
- Any risks or follow-up actions needed`,
            },
          },
        ],
      };
    },
  );

  // --- Schedule Optimization -----------------------------------------------
  server.prompt(
    'schedule_optimization',
    'Suggest improvements to reduce gaps, balance workload, and improve schedule health',
    {
      calendars_json: z
        .string()
        .describe(
          'JSON of calendar data including events for all members/units',
        ),
      goals: z
        .string()
        .optional()
        .describe(
          'Optimization goals, e.g., "more focus time", "reduce meeting load", "better team coverage"',
        ),
      constraints: z
        .string()
        .optional()
        .describe(
          'Constraints, e.g., "no meetings before 9am", "keep Fridays meeting-free"',
        ),
    },
    async ({ calendars_json, goals, constraints }) => {
      const goalsClause = goals
        ? `Optimize toward these goals:\n- ${goals.split(',').map((g) => g.trim()).join('\n- ')}`
        : 'Apply general best-practice goals: maximize focus time, minimize context switching, ensure adequate breaks.';

      const constraintsClause = constraints
        ? `Respect these constraints (non-negotiable):\n- ${constraints.split(',').map((c) => c.trim()).join('\n- ')}`
        : 'No explicit constraints provided. Use reasonable defaults (e.g., respect working hours, avoid extremely early/late meetings).';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${SYSTEM_PREAMBLE}

## Task: Schedule Optimization

Analyze the schedules holistically across all provided calendars and suggest concrete improvements.

### Calendar Data

\`\`\`json
${calendars_json}
\`\`\`

### Goals

${goalsClause}

### Constraints

${constraintsClause}

### Instructions

1. **Current State Assessment** — Summarize the overall schedule health across all calendars:
   - Meeting load per person/unit
   - Distribution of focus time vs. meeting time
   - Fragmentation score (how broken up are available blocks?)

2. **Opportunities** — Identify specific improvements:
   - **Meeting clustering** — Can meetings be grouped to create longer focus blocks?
   - **Focus time blocks** — Where can recurring protected time be created?
   - **Break patterns** — Are there adequate breaks? Suggest improvements.
   - **Timezone fairness** — For distributed teams, are meeting times equitable?
   - **Redundant meetings** — Any meetings that overlap in purpose and could be combined?

3. **Concrete Proposals** — For each suggestion, provide:
   - What to change (move event X from time A to time B)
   - Why it helps (creates a 3-hour focus block on Tuesday mornings)
   - Expected impact (quantify when possible, e.g., "Gains 2 hours of focus time per day")

4. **Implementation Plan** — Order proposals by:
   - Impact (highest improvement first)
   - Effort (easiest changes first when impact is similar)
   - Risk (flag changes that affect many people or recurring series)

Format your response with clear sections and use tables where they aid clarity.`,
            },
          },
        ],
      };
    },
  );
}
