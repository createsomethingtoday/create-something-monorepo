# Social Calendar MCP Server

Agent-native tools for managing the CREATE SOMETHING social calendar.

## Philosophy

**Zuhandenheit**: The tools recede into use. Agents don't think about "calling the API" - they think about "checking the schedule" or "finding content gaps."

## Tools

### Observation Tools

| Tool | Description |
|------|-------------|
| `social_status` | Get current state (pending, posted, failed, token status) |
| `social_gaps` | Find gaps in weekly rhythm (days without posts) |
| `social_next_slot` | Get next optimal posting time |

### Action Tools

| Tool | Description |
|------|-------------|
| `social_schedule` | Schedule content (filename or raw markdown) |
| `social_cancel` | Cancel a scheduled post |

### Intelligence Tools

| Tool | Description |
|------|-------------|
| `social_suggest` | AI-powered content suggestions based on methodology |
| `social_rhythm` | Check adherence to Clay playbook weekly rhythm |

## Installation

```bash
# From monorepo root
pnpm install
pnpm --filter=social-mcp build
```

## Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "social": {
      "command": "node",
      "args": ["packages/social-mcp/dist/index.js"],
      "env": {
        "SOCIAL_API_URL": "https://createsomething.agency/api/social"
      }
    }
  }
}
```

## Usage Examples

### Check schedule status

```
Agent: "What's on the social calendar?"
→ calls social_status
→ "2 posts scheduled: Tuesday (Subtractive Triad), Thursday (Kickstand). Token expires in 45 days."
```

### Find gaps

```
Agent: "Are there gaps in the posting schedule?"
→ calls social_gaps
→ "Wednesday and Friday have no content. Next optimal slot: Wed Jan 22 at 9:00 AM PT."
```

### Schedule content

```
Agent: "Schedule the AI patterns post for Wednesday"
→ calls social_schedule with content: "ai-patterns", startDate: "2026-01-22"
→ "Scheduled 'AI Agent Patterns' for Wed Jan 22 at 9:00 AM PT"
```

### Get suggestions

```
Agent: "What should I post about?"
→ calls social_suggest
→ "Based on Clay playbook, today is 'Create primary content' day. Suggest: methodology content (Subtractive Triad not posted in 2 weeks)."
```

### Check rhythm

```
Agent: "How's my weekly rhythm?"
→ calls social_rhythm
→ "Week 4: 2/5 complete. Monday (done), Tuesday (in progress). Focus today: Create primary content."
```

## Clay Playbook Weekly Rhythm

| Day | Focus |
|-----|-------|
| Monday | Review week's learnings |
| Tuesday | Create primary content |
| Wednesday | Derivatives (repurpose) |
| Thursday | Community engagement |
| Friday | Pipeline review |

## Development

```bash
# Build
pnpm --filter=social-mcp build

# Watch mode
pnpm --filter=social-mcp dev

# Run directly
node packages/social-mcp/dist/index.js
```

## API Dependency

This MCP server calls the agency API endpoints:

- `GET /api/social/status` - Schedule status
- `GET /api/social/gaps` - Gap analysis
- `GET /api/social/rhythm` - Rhythm tracking
- `GET /api/social/suggest` - Content suggestions
- `POST /api/social/schedule` - Schedule content
- `POST /api/social/cancel` - Cancel posts

Set `SOCIAL_API_URL` environment variable to override the default API base URL.
