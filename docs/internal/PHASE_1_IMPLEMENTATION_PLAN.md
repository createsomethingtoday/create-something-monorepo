# Phase 1: Code Mode Implementation in .space

## Status: ✅ COMPLETE

**Completion Date**: November 21, 2025
**Duration**: ~6 hours implementation
**Commits**:
- [49523f8] Lesson 7: Connect to MCP Server
- [b55e666] Lesson 8: Multi-Tool Composition
- [6a89492] Lesson 9: Code Mode Agent with Skills Library
- [435d47c] Phase 1 completion documentation

**See**: [PHASE_1_COMPLETE.md](../create-something-space-svelte/PHASE_1_COMPLETE.md) for full technical documentation.

---

## Overview

Phase 1 extends CREATE Something .space to teach Code Mode through interactive lessons. Users will learn to connect MCP servers, write code that calls TypeScript APIs, compose multiple tools, and build Code Mode agents.

## Goals

1. ✅ **Validate Code Mode pedagogically** - If learners find it intuitive, confirms pattern works
2. ✅ **Build MCP infrastructure** - Schema fetching, TypeScript generation, sandbox bindings
3. ✅ **Create reusable patterns** - Lessons become templates for .agency client work
4. ✅ **Enable Skills integration** - Save successful patterns for future reuse

## Timeline

**Estimated**: 5-7 days development + 2-3 days testing
**Actual**: 1 day implementation (theory-driven approach accelerated development)
**Priority**: High (validates Phase 0 canonical pattern)

---

## Lesson 7: Connect to MCP Server via TypeScript

### Learning Objectives

By the end of this lesson, users will:
- Understand MCP schema → TypeScript API conversion
- Connect to a simple MCP server (weather or calculator)
- Call a single tool through code (not tool calling)
- See progressive disclosure in action

### Lesson Structure

**Introduction** (5 min):
```markdown
# Lesson 7: Your First MCP Connection

## The Traditional Way (What We're NOT Doing)
```json
{
  "tool_call": "get_weather",
  "parameters": {"location": "Austin"}
}
```
Problem: Tool definitions bloat context, results consume tokens.

## The Code Mode Way (What We're Learning)
```typescript
const weather = await mcp.weather.get_current({
  location: "Austin"
});
console.log(weather);
```
Better: Tools as TypeScript APIs, familiar syntax, composable.

## Why This Matters
- 90% less context usage
- Scales to 50+ MCP servers
- Code you already know
- Privacy-preserving by design
```

**Setup** (2 min):
```typescript
// Pre-loaded MCP connection (weather server)
// Available in your sandbox as `mcp.weather`

// TypeScript definition (view only):
interface WeatherMCP {
  get_current(params: { location: string }): Promise<{
    temp: number;
    conditions: string;
    humidity: number;
  }>;
}

declare const mcp: {
  weather: WeatherMCP;
};
```

**Exercise 1**: Simple Call (5 min)
```typescript
// TODO: Call mcp.weather.get_current for "Austin, TX"
// Log the temperature and conditions

export default {
  async fetch(request: Request, env: any) {
    // Your code here

    return new Response("Hello");
  }
}
```

**Solution**:
```typescript
export default {
  async fetch(request: Request, env: any) {
    const weather = await env.MCP.weather.get_current({
      location: "Austin, TX"
    });

    const message = `Weather in Austin: ${weather.temp}°F, ${weather.conditions}`;
    console.log(message);

    return new Response(message);
  }
}
```

**Exercise 2**: Progressive Disclosure (5 min)
```typescript
// The weather MCP has 3 tools:
// - get_current
// - get_forecast
// - get_historical

// Notice: You only loaded get_current into context
// The other tools remain as files, not consuming tokens
// This is progressive disclosure!

// TODO: Now call get_forecast for "Austin, TX", next 3 days
```

**Validation Criteria**:
- ✓ Code compiles (TypeScript types correct)
- ✓ MCP call succeeds
- ✓ Response formatted properly
- ✓ User recognizes this is "just TypeScript"

### Technical Implementation

**Backend** (`/api/code/execute-mcp`):
```typescript
export const POST: RequestHandler = async ({ request, platform }) => {
  const { code, lesson_id, session_id, mcp_server } = await request.json();

  // 1. Fetch MCP schema
  const schema = await fetchMcpSchema(mcp_server); // "weather"

  // 2. Generate TypeScript definitions
  const typeDefs = generateTypeScriptFromSchema(schema);

  // 3. Inject into sandbox environment
  const env = {
    MCP: {
      weather: createMcpProxy(mcp_server, platform.env.MCP_WEATHER)
    }
  };

  // 4. Execute user code
  const result = await executeSandboxed(code, env, typeDefs);

  return json(result);
};
```

**MCP Proxy Creation**:
```typescript
function createMcpProxy(serverName: string, mcpBinding: any) {
  return new Proxy({}, {
    get(target, method) {
      return async (params: any) => {
        // Call actual MCP server
        return await mcpBinding.call(method, params);
      };
    }
  });
}
```

### Success Metrics

- **Completion rate**: >80% (if lower, lesson too hard)
- **Time to complete**: 15-20 minutes average
- **Subjective feedback**: "Felt like normal TypeScript" rating >4/5
- **Error patterns**: Track common mistakes for iteration

---

## Lesson 8: Compose Multiple MCP Tools

### Learning Objectives

- Chain multiple tool calls with control flow
- Transform data between calls
- Handle errors gracefully
- Experience context efficiency firsthand

### Lesson Structure

**Introduction**:
```markdown
# Lesson 8: Multi-Tool Composition

## The Traditional Problem
```
User: "Check Austin weather, schedule outdoor meeting if sunny"

Tool Call 1: get_weather → {sunny}
[Wait for LLM response]
Tool Call 2: schedule_meeting → {meeting_id}
[Wait for LLM response]
Done.

Three LLM round trips. Tokens consumed at each step.
```

## The Code Mode Solution
```typescript
const weather = await mcp.weather.get_current({ location: "Austin" });

if (weather.conditions === 'sunny' && weather.temp > 70) {
  const meeting = await mcp.calendar.schedule({
    title: "Outdoor Team Lunch",
    time: "12pm",
    duration: 60
  });
  return `Scheduled: ${meeting.id}`;
}

return "Weather not suitable";
```

One code execution. Logic handled in code. Result only.
```

**Exercise 1**: Weather → Calendar (10 min)
```typescript
// TODO:
// 1. Check weather in your city
// 2. If temperature > 75°F and sunny:
//    - Schedule "Outdoor Meeting" at 2pm
// 3. If not:
//    - Schedule "Indoor Meeting" at 2pm
// 4. Return meeting details

export default {
  async fetch(request: Request, env: any) {
    // Your code here

    return new Response("Not implemented");
  }
}
```

**Exercise 2**: Data Transformation (10 min)
```typescript
// TODO: Fetch email summaries, create Notion page with top 5

// 1. Call mcp.gmail.search({ query: "project updates", max: 10 })
// 2. Transform: Extract only subject + date (not full body!)
// 3. Sort by date (most recent first)
// 4. Take top 5
// 5. Call mcp.notion.create_page({ title: "Updates", content: [...] })

// Notice: Full email bodies never enter context!
// This is privacy-preserving + context-efficient.
```

**Exercise 3**: Error Handling (10 min)
```typescript
// TODO: Robust multi-tool flow

try {
  const data = await mcp.sheets.get_data({ sheet_id: "xyz" });

  if (data.length === 0) {
    return new Response("No data found");
  }

  const summary = {
    row_count: data.length,
    columns: Object.keys(data[0]),
    sample: data.slice(0, 5)
  };

  const page = await mcp.notion.create_page({
    title: "Sheet Summary",
    content: JSON.stringify(summary, null, 2)
  });

  return new Response(`Created page: ${page.url}`);

} catch (error) {
  console.error("Failed:", error);
  return new Response("Error: " + error.message, { status: 500 });
}
```

### Success Metrics

- Completion rate: >75%
- Time: 30-40 minutes
- Users report: "Control flow felt natural" >4/5
- Common pattern: Users instinctively add `if` statements, loops

---

## Lesson 9: Build a Code Mode Agent

### Learning Objectives

- Understand full agent loop
- Generate code dynamically from user prompt
- Execute in sandbox with MCP access
- Save successful patterns as skills

### Lesson Structure

**Introduction**:
```markdown
# Lesson 9: Your First Code Mode Agent

You've learned:
- Lesson 7: Connect to MCP servers as TypeScript
- Lesson 8: Compose multiple tools with code

Now: Combine with LLM code generation → full agent!

## Agent Loop
```
1. User: "Check email, summarize in Notion"
2. Agent generates TypeScript code calling mcp.gmail + mcp.notion
3. Execute code in sandbox
4. Return results to user
5. Save successful code as skill
```
```

**Exercise 1**: Simple Agent (15 min)
```typescript
// Provided: Simple agent harness

import { generateCode } from './llm';
import { executeSandbox } from './sandbox';

async function agent(userPrompt: string, availableMcps: string[]) {
  // 1. Generate code
  const code = await generateCode({
    prompt: userPrompt,
    mcpServers: availableMcps,  // ["weather", "calendar"]
    context: [] // No bloat!
  });

  console.log("Generated code:", code);

  // 2. Execute
  const result = await executeSandbox(code, {
    mcpBindings: {
      weather: env.MCP_WEATHER,
      calendar: env.MCP_CALENDAR
    }
  });

  return result;
}

// TODO: Test with prompts:
// - "What's the weather in Seattle?"
// - "Schedule a meeting if it's sunny in Austin"
// - "Get my latest emails and create a Notion summary"
```

**Exercise 2**: Skills Integration (15 min)
```typescript
// When code executes successfully, save as skill

async function agentWithSkills(userPrompt: string) {
  // 1. Check existing skills
  const relevantSkills = await findSkills(userPrompt);

  // 2. Generate code (with skill context)
  const code = await generateCode({
    prompt: userPrompt,
    mcpServers: ["gmail", "notion"],
    skillsContext: relevantSkills  // Reuse patterns!
  });

  // 3. Execute
  const result = await executeSandbox(code, mcpBindings);

  // 4. If successful, save
  if (result.success) {
    await saveSkill({
      name: inferSkillName(userPrompt),
      code: code,
      description: userPrompt,
      mcpsUsed: ["gmail", "notion"],
      successRate: 1.0
    });
  }

  return result;
}

// TODO: Run same prompt twice
// Second time should be faster (reuses skill pattern)
```

**Exercise 3**: Progressive Disclosure at Scale (15 min)
```markdown
## Challenge: Connect to 10 MCP Servers

Traditional approach:
- All 10 tool schemas in context → 30-40% context consumed
- Before you even start!

Code Mode approach:
- 10 servers as directories: servers/gmail/, servers/slack/, etc.
- Agent reads only index.ts files (tiny)
- Loads specific tool files as needed
- Context stays manageable

TODO: Connect to all 10, write agent that uses 3 of them
Notice: Context usage stays low!
```

### Success Metrics

- Completion rate: >70% (hardest lesson)
- Time: 45-60 minutes
- Users understand: "This is how production agents should work"
- Generated code quality: >80% success rate on first execution

---

## Infrastructure Requirements

### 1. MCP Schema Fetching

```typescript
// /lib/mcp/schema-fetcher.ts

export async function fetchMcpSchema(serverUrl: string): Promise<McpSchema> {
  // Connect to MCP server
  const client = new McpClient(serverUrl);

  // Fetch tools list
  const tools = await client.listTools();

  return {
    name: extractServerName(serverUrl),
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
      output_schema: t.outputSchema
    }))
  };
}
```

### 2. TypeScript Generation

```typescript
// /lib/mcp/typescript-generator.ts

export function generateTypeScriptFromSchema(schema: McpSchema): string {
  let output = '';

  // Generate input/output interfaces
  for (const tool of schema.tools) {
    output += `
interface ${capitalize(tool.name)}Input {
${generateInterfaceFields(tool.input_schema)}
}

interface ${capitalize(tool.name)}Output {
${generateInterfaceFields(tool.output_schema)}
}
`;
  }

  // Generate main MCP interface
  output += `
declare const mcp: {
  ${schema.name}: {
${schema.tools.map(t => `
    /**
     * ${t.description}
     */
    ${t.name}(input: ${capitalize(t.name)}Input): Promise<${capitalize(t.name)}Output>;
`).join('')}
  };
};
`;

  return output;
}
```

### 3. Sandbox with MCP Bindings

```typescript
// /lib/sandbox/execute-with-mcp.ts

export async function executeSandboxed(
  code: string,
  mcpBindings: Record<string, McpServer>,
  typeDefs: string
): Promise<ExecutionResult> {

  // Create sandbox with Workers API
  const sandbox = await createSandbox({
    code: code,
    environment: {
      MCP: createMcpProxies(mcpBindings)
    },
    types: typeDefs,  // Load TypeScript definitions
    timeout: 30000,  // 30 second max
    memoryLimit: 128 * 1024 * 1024  // 128MB
  });

  try {
    const result = await sandbox.execute();
    return {
      success: true,
      output: result.logs,
      result: result.returnValue
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  } finally {
    await sandbox.dispose();
  }
}
```

### 4. Skills Storage

```typescript
// /lib/skills/storage.ts

export interface Skill {
  id: string;
  name: string;
  description: string;
  code: string;
  mcps_used: string[];
  success_rate: number;
  times_used: number;
  created_at: string;
  updated_at: string;
}

export async function saveSkill(skill: Omit<Skill, 'id' | 'times_used'>): Promise<Skill> {
  const id = generateSkillId(skill.name);

  // Store in D1
  await env.DB.prepare(`
    INSERT INTO skills (id, name, description, code, mcps_used, success_rate, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    skill.name,
    skill.description,
    skill.code,
    JSON.stringify(skill.mcps_used),
    skill.success_rate,
    new Date().toISOString(),
    new Date().toISOString()
  ).run();

  return { ...skill, id, times_used: 0 };
}

export async function findSkills(query: string): Promise<Skill[]> {
  // Semantic search in skills
  // (Could use Workers AI embeddings for better matching)

  const results = await env.DB.prepare(`
    SELECT * FROM skills
    WHERE description LIKE ? OR name LIKE ?
    ORDER BY success_rate DESC, times_used DESC
    LIMIT 5
  `).bind(`%${query}%`, `%${query}%`).all();

  return results.results as Skill[];
}
```

---

## Database Schema Updates

```sql
-- Add to existing D1 database

CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  schema TEXT NOT NULL,  -- JSON schema
  typescript_defs TEXT NOT NULL,  -- Generated TypeScript
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  code TEXT NOT NULL,
  mcps_used TEXT NOT NULL,  -- JSON array
  success_rate REAL NOT NULL DEFAULT 1.0,
  times_used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  lesson_id INTEGER NOT NULL,
  completed INTEGER DEFAULT 0,
  code_submitted TEXT,
  success INTEGER DEFAULT 0,
  completion_time INTEGER,  -- seconds
  created_at TEXT NOT NULL,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_skills_mcps ON skills(mcps_used);
CREATE INDEX idx_skills_success ON skills(success_rate DESC, times_used DESC);
CREATE INDEX idx_progress_user ON lesson_progress(user_id, lesson_id);
```

---

## File Structure

```
packages/space/
├── src/
│   ├── lib/
│   │   ├── mcp/
│   │   │   ├── schema-fetcher.ts
│   │   │   ├── typescript-generator.ts
│   │   │   └── proxy.ts
│   │   ├── sandbox/
│   │   │   ├── execute-with-mcp.ts
│   │   │   └── create-sandbox.ts
│   │   └── skills/
│   │       ├── storage.ts
│   │       └── search.ts
│   ├── routes/
│   │   ├── lessons/
│   │   │   ├── 7/+page.svelte      # Lesson 7 UI
│   │   │   ├── 8/+page.svelte      # Lesson 8 UI
│   │   │   └── 9/+page.svelte      # Lesson 9 UI
│   │   └── api/
│   │       ├── code/
│   │       │   └── execute-mcp/+server.ts
│   │       ├── mcp/
│   │       │   ├── list/+server.ts
│   │       │   ├── schema/+server.ts
│   │       │   └── connect/+server.ts
│   │       └── skills/
│   │           ├── list/+server.ts
│   │           ├── save/+server.ts
│   │           └── search/+server.ts
│   └── components/
│       ├── CodeEditor.svelte         # Existing
│       ├── MCPServerSelector.svelte  # New
│       ├── SkillsBrowser.svelte      # New
│       └── ProgressTracker.svelte    # Enhanced
└── wrangler.toml                     # Add MCP bindings
```

---

## Testing Plan

### Unit Tests
- Schema fetching from mock MCP servers
- TypeScript generation accuracy
- Sandbox execution with bindings
- Skills storage/retrieval

### Integration Tests
- End-to-end: User code → MCP call → result
- Error handling: Invalid code, MCP failures
- Skills: Save → retrieve → reuse

### User Testing
- Beta group: 10 users
- Complete Lessons 7-9
- Collect: completion time, error patterns, feedback
- Iterate based on findings

---

## Success Criteria

### Quantitative
- **Completion rates**: L7 >80%, L8 >75%, L9 >70%
- **Time to complete**: Within estimated ranges
- **Error rates**: <20% on first submission
- **Skills reuse**: >50% of users reuse skills by end of L9

### Qualitative
- **Subjective rating**: "Code Mode felt natural" >4/5
- **User quotes**: "Just like normal TypeScript coding"
- **Preference**: When asked "Code Mode or traditional tool calling?" >80% choose Code Mode

### Validation
- If metrics hit targets → Code Mode validated pedagogically
- Patterns become templates for .agency client implementations
- Research findings published in .io

---

## Rollout Plan

### Week 1: Infrastructure
- Days 1-2: MCP schema fetching + TypeScript generation
- Days 3-4: Sandbox with MCP bindings
- Day 5: Skills storage

### Week 2: Lessons
- Days 1-2: Lesson 7 (MCP connection)
- Days 3-4: Lesson 8 (composition)
- Days 5-7: Lesson 9 (full agent)

### Week 3: Testing & Iteration
- Days 1-3: Internal testing, bug fixes
- Days 4-5: Beta user testing
- Days 6-7: Iterate based on feedback

### Week 4: Launch
- Day 1: Soft launch (existing .space users)
- Days 2-3: Monitor metrics, quick fixes
- Days 4-5: Write up results for .io paper
- Days 6-7: Plan Phase 2 (.agency integration)

---

## Risk Mitigation

### Risk: MCP Servers Unreliable
- **Mitigation**: Start with mock servers, transition to real
- **Fallback**: Provide sample data if MCP fails

### Risk: Sandbox Security Issues
- **Mitigation**: Use Workers isolates (battle-tested)
- **Monitoring**: Log all sandbox executions, audit regularly

### Risk: Users Find Lessons Too Hard
- **Mitigation**: Extensive hints, sample solutions
- **Adjustment**: If completion <60%, simplify exercises

### Risk: TypeScript Generation Inaccurate
- **Mitigation**: Unit tests against known MCP schemas
- **Validation**: Manual review of generated code

---

## Next Steps After Phase 1

### Phase 2: .agency Integration
- Use lessons as templates for client agents
- Offer "Code Mode Agent Development" service
- Apply progressive disclosure patterns
- Validate in production

### Phase 3: Advanced Features
- Multi-MCP composition at scale
- Streaming sandbox execution
- Collaborative skills library
- Advanced agent patterns

---

**Phase 1 Start Date**: TBD
**Estimated Completion**: 3-4 weeks
**Owner**: CREATE Something core team
**Status**: Ready to begin

---

*"Weniger, aber besser"* — Start simple (Lesson 7), build systematically (L8, L9), validate through practice.
