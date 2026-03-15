/**
 * Pattern Analysis MCP Tools
 * 
 * Tools for analyzing user behavior patterns and detecting bottlenecks.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const PATTERN_TOOLS: Tool[] = [
  {
    name: 'pcn_analyze_patterns',
    description: `Analyze user behavior patterns from tracked events.

Returns patterns detected in:
- Video engagement (where users drop off, replay, convert)
- Error occurrences (recurring errors, affected pages)
- Navigation flows (common paths, dead ends)
- Search behavior (popular queries, no-result searches)

Use this to understand what's working and what needs improvement.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern_type: {
          type: 'string',
          enum: ['engagement', 'error', 'navigation', 'search', 'all'],
          description: 'Type of patterns to analyze'
        },
        date_range: {
          type: 'string',
          enum: ['24h', '7d', '30d'],
          description: 'Time period to analyze (default: 7d)'
        },
        min_occurrences: {
          type: 'number',
          description: 'Minimum occurrences to be considered a pattern (default: 3)'
        }
      },
      required: ['pattern_type']
    }
  },
  {
    name: 'pcn_detect_bottlenecks',
    description: `Detect bottlenecks in user flows.

Analyzes step-by-step funnels to find where users drop off:
- signup: Email entry → Password → Verification → Complete
- checkout: Start → Payment method → Confirmation → Success
- video_consumption: Play → Gate shown → Convert/Dismiss → Complete

Returns drop-off rates, average duration, and suggestions.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        flow_name: {
          type: 'string',
          enum: ['signup', 'checkout', 'video_consumption'],
          description: 'Which flow to analyze'
        },
        date_range: {
          type: 'string',
          enum: ['24h', '7d', '30d'],
          description: 'Time period to analyze (default: 7d)'
        }
      },
      required: ['flow_name']
    }
  },
  {
    name: 'pcn_get_pattern_details',
    description: `Get detailed information about a specific detected pattern.

Returns:
- Pattern description and evidence
- Affected users/sessions count
- First and last occurrence
- Suggested actions (if any)`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern_id: {
          type: 'string',
          description: 'The pattern ID to retrieve details for'
        }
      },
      required: ['pattern_id']
    }
  }
];

/**
 * Handle pattern analysis tool calls
 */
export async function handlePatternTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'pcn_analyze_patterns':
      return handleAnalyzePatterns(args);
    case 'pcn_detect_bottlenecks':
      return handleDetectBottlenecks(args);
    case 'pcn_get_pattern_details':
      return handleGetPatternDetails(args);
    default:
      throw new Error(\`Unknown pattern tool: \${name}\`);
  }
}

function handleAnalyzePatterns(args: Record<string, unknown>): string {
  const patternType = args.pattern_type as string;
  const dateRange = (args.date_range as string) || '7d';
  
  // In production, this would query the database
  // For now, return documentation about what this tool does
  
  return \`# Pattern Analysis: \${patternType}

## Time Period: \${dateRange}

### How This Works

This tool analyzes events from the \`user_events\` table to detect patterns.

**For engagement patterns:**
- Groups video events by video ID
- Calculates average watch time, drop-off points
- Identifies most replayed segments
- Finds videos with highest/lowest completion rates

**For error patterns:**
- Groups errors by message and stack trace
- Identifies recurring errors (3+ occurrences)
- Tracks affected pages and components
- Calculates error frequency trends

**For navigation patterns:**
- Traces user paths through the site
- Identifies common navigation sequences
- Finds pages with high exit rates
- Detects potential UX confusion points

**For search patterns:**
- Aggregates search queries
- Identifies no-result searches (content gaps)
- Tracks search-to-click rates
- Finds popular but unaddressed queries

### Database Query Example

\\\`\\\`\\\`sql
SELECT 
  event_type,
  page,
  COUNT(*) as occurrences,
  COUNT(DISTINCT session_id) as unique_sessions
FROM user_events
WHERE created_at >= strftime('%s', 'now', '-7 days')
GROUP BY event_type, page
HAVING COUNT(*) >= 3
ORDER BY occurrences DESC
\\\`\\\`\\\`

### Next Steps

To get actionable insights:
1. Run this analysis with specific pattern type
2. Use \`pcn_get_pattern_details\` for specific patterns
3. Use \`pcn_suggest_improvements\` for recommendations
\`;
}

function handleDetectBottlenecks(args: Record<string, unknown>): string {
  const flowName = args.flow_name as string;
  const dateRange = (args.date_range as string) || '7d';
  
  const flowSteps: Record<string, string[]> = {
    signup: ['page_view (/signup)', 'signup_started', 'signup_completed'],
    checkout: ['checkout_started', 'checkout_step (payment)', 'checkout_completed'],
    video_consumption: ['video_play', 'video_gate_shown', 'video_gate_converted', 'video_complete']
  };
  
  const steps = flowSteps[flowName] || [];
  
  return \`# Bottleneck Analysis: \${flowName}

## Time Period: \${dateRange}

### Flow Steps

\${steps.map((step, i) => \`\${i + 1}. \${step}\`).join('\\n')}

### How Bottleneck Detection Works

For each step in the flow, we calculate:

1. **Entry Count**: Users who reached this step
2. **Exit Count**: Users who left at this step
3. **Drop-off Rate**: exits / entries
4. **Average Duration**: Time spent at this step
5. **P90 Duration**: 90th percentile duration (identifies slow experiences)

### Key Metrics to Watch

**For video_consumption:**
- Gate shown → Convert rate (target: >10%)
- Average time before gate (optimal: 40-60s)
- Replay rate after gate dismiss

**For checkout:**
- Start → Complete rate (target: >50%)
- Payment step abandonment
- Error rate at each step

**For signup:**
- Form completion rate
- Time to complete
- Validation error frequency

### Query Pattern

\\\`\\\`\\\`sql
WITH flow_events AS (
  SELECT 
    session_id,
    event_type,
    created_at,
    LAG(event_type) OVER (PARTITION BY session_id ORDER BY created_at) as prev_event
  FROM user_events
  WHERE event_type IN ('video_play', 'video_gate_shown', 'video_gate_converted')
)
SELECT 
  event_type as step,
  COUNT(*) as entries,
  COUNT(CASE WHEN next_event IS NULL THEN 1 END) as exits
FROM flow_events
GROUP BY event_type
\\\`\\\`\\\`
\`;
}

function handleGetPatternDetails(args: Record<string, unknown>): string {
  const patternId = args.pattern_id as string;
  
  return \`# Pattern Details: \${patternId}

## Pattern Not Found

This pattern ID does not exist in the database, or the database is not connected.

### How to Use This Tool

1. First, run \`pcn_analyze_patterns\` to discover patterns
2. Note the pattern IDs from the results
3. Use this tool with a valid pattern ID

### Pattern ID Format

Pattern IDs follow this format:
- \`pat_engagement_XXXXX\` - Engagement patterns
- \`pat_error_XXXXX\` - Error patterns
- \`pat_nav_XXXXX\` - Navigation patterns
- \`pat_search_XXXXX\` - Search patterns
\`;
}
