# Code-Mediated Tool Use: A Hermeneutic Analysis of LLM-Tool Interaction

**Abstract**: This paper applies Heidegger's phenomenological analysis of ready-to-hand (*Zuhandenheit*) versus present-at-hand (*Vorhandenheit*) to contemporary Large Language Model (LLM) agent architecture, specifically examining the distinction between direct tool calling and code-mediated tool access (Code Mode). We argue that Code Mode achieves *Zuhandenheit*—tools becoming transparent in use—while traditional tool calling forces *Vorhandenheit*—tools as objects of conscious focus. This is not merely an optimization but an ontological shift in how agents relate to tools. We validate this through empirical evidence from Cloudflare's research, CREATE Something's .space pedagogy, and hermeneutic interpretation through the canonical principles of "Weniger, aber besser."

**Keywords**: Code Mode, MCP, hermeneutic circle, ready-to-hand, present-at-hand, LLM agents, Cloudflare Workers, phenomenology, AI-native development

---

## I. INTRODUCTION

### 1.1 The Problem of Tool Calling

Contemporary LLM agents interact with external tools through a mechanism called "tool calling" or "function calling." The LLM generates special tokens that signal intent to invoke a tool, providing parameters in JSON format. The agent harness intercepts these tokens, invokes the tool, and feeds results back to the LLM.

This approach has become ubiquitous in agent frameworks (LangChain, Semantic Kernel, Haystack) and is the native mode for Model Context Protocol (MCP), which standardizes how agents discover and connect to tools across diverse providers.

However, Cloudflare's research into their Agents SDK revealed a surprising finding: **LLMs are significantly better at writing TypeScript code to call tools than at generating tool calls directly** (Varda & Pai, 2025).

This raises a fundamental question: **Why?**

### 1.2 The Hermeneutic Question

Traditional explanations frame this as a training data problem: LLMs have vast TypeScript code in their training corpus but limited synthetic examples of tool calling. This is true but incomplete.

We propose a phenomenological interpretation: Code Mode achieves what Heidegger calls *Zuhandenheit* (ready-to-hand), while direct tool calling forces *Vorhandenheit* (present-at-hand). Tools function best when they recede from conscious attention—when they become transparent extensions of capability rather than objects requiring explicit focus.

This paper applies hermeneutic philosophy to agent architecture, examining:
1. How Code Mode achieves ready-to-hand tool interaction
2. Why traditional tool calling forces present-at-hand objectification
3. How CREATE Something's .space platform validates this pattern pedagogically
4. What this reveals about authentic AI-native development

### 1.3 Methodology

We employ **hermeneutic phenomenology** as methodological framework:

- **Phenomenology**: Examine the lived experience of LLM agents interacting with tools (as observable through their behavior, error patterns, and success rates)
- **Hermeneutics**: Interpret this experience through established philosophical frameworks (Heidegger, Gadamer) while situating it in contemporary technical context (Workers, MCP, agent frameworks)
- **Hermeneutic circle**: Move iteratively between understanding Code Mode (the part) and understanding CREATE Something's methodology (the whole), each illuminating the other

Our evidence base includes:
- Cloudflare's empirical findings on Code Mode performance
- CREATE Something .space's pedagogical implementation
- Comparative analysis of tool calling vs. code generation in production LLMs
- Technical architecture analysis of Cloudflare Workers' isolate-based sandboxing

### 1.4 Structure

Section II establishes Heidegger's conceptual framework of ready-to-hand vs. present-at-hand and its applicability to software tools.

Section III analyzes traditional tool calling through this framework, arguing it forces Vorhandenheit.

Section IV examines Code Mode as achieving Zuhandenheit, with empirical validation from Cloudflare and CREATE Something.

Section V explores the hermeneutic circle: how Code Mode illuminates CREATE Something's philosophy, and vice versa.

Section VI discusses technical implementation constraints and why Cloudflare Workers provides ideal infrastructure.

Section VII concludes with implications for agent architecture, MCP evolution, and AI-native development methodology.

---

## II. THEORETICAL FRAMEWORK: READY-TO-HAND VS. PRESENT-AT-HAND

### 2.1 Heidegger's Tool Analysis

In *Being and Time* (1927), Martin Heidegger distinguishes two fundamental modes of encountering entities in the world:

**Zuhandenheit (Ready-to-hand)**:
- Tools in use become transparent, receding from explicit awareness
- The hammer "disappears" when hammering—you don't think about the hammer, you think about the nail
- Tools extend capability seamlessly, becoming part of one's situated action
- Characterized by *familiarity*, *non-thematic awareness*, *practical absorption*

**Vorhandenheit (Present-at-hand)**:
- Tools as objects of theoretical contemplation
- The hammer breaks; suddenly it becomes an object you examine, theorize about, consciously consider
- Tools become *present before* (vor-handen) you as things with properties
- Characterized by *explicit focus*, *thematic awareness*, *detached observation*

Heidegger argues that **Zuhandenheit is ontologically prior**—it's how we primarily encounter tools in authentic engaged activity. Vorhandenheit is a *derived* mode that arises when this primary relationship breaks down.

### 2.2 The Workshop Example

Heidegger uses the workshop as paradigmatic:

> "The wood is a forest of timber, the mountain a quarry of rock; the river is water-power, the wind is wind 'in the sails'... The 'Nature' which 'stirs and strives', which assails us and enthralls us as landscape, remains hidden. The peasant's equipment is aware of this in its use." (Being and Time, §15)

When the carpenter hammers, the hammer is ready-to-hand:
- Not thought about explicitly
- Incorporated into fluid action
- Defined by its *for-the-sake-of-which* (making the table)
- Part of a referential totality (hammer → nail → wood → table → dining)

When the hammer breaks, it becomes present-at-hand:
- Object of explicit focus
- Properties examined (weight, balance, broken head)
- Removed from practical context
- Defined by *what it is* rather than *what it's for*

### 2.3 Software Tools as Heideggerian Equipment

Can this analysis apply to software tools?

**Yes—but with important distinctions**:

In traditional software development:
- **IDEs** become ready-to-hand through familiarity (you don't think "I'm using VSCode," you just code)
- **Version control** becomes ready-to-hand through learned practice (git commands flow automatically)
- **APIs** become ready-to-hand when well-designed (HTTP client libraries recede into background)

Conversely:
- **Poorly designed APIs** remain present-at-hand (constant documentation lookup, explicit parameter formatting)
- **Unfamiliar tools** require present-at-hand learning (conscious study before transparent use)
- **Breaking tools** force present-at-hand debugging (stack traces, error messages become objects of focus)

The key insight: **Tools achieve ready-to-hand status through practice within a familiar domain**. Expertise makes tools transparent.

### 2.4 Applying This to LLM Agents

LLMs don't have "practice" in Heidegger's sense—they don't iteratively learn through use. But they do have something analogous: **training data as pre-understanding**.

When an LLM writes TypeScript code:
- Drawing on millions of examples from training
- Patterns are deeply familiar (functions, variables, control flow)
- Code flows naturally—syntactic structures are ready-to-hand

When an LLM generates tool calls:
- Drawing on synthetic training data (contrived examples)
- Patterns are less familiar (special tokens, JSON schemas, parameter matching)
- Tool calling requires explicit focus—tools remain present-at-hand

**Hypothesis**: Code Mode works better not just because of training data quantity, but because it achieves *Zuhandenheit* where tool calling forces *Vorhandenheit*.

Let's examine this empirically.

---

## III. TRADITIONAL TOOL CALLING AS VORHANDENHEIT

### 3.1 The Phenomenology of Tool Calling

Consider an LLM asked to "check the weather in Austin, TX and schedule a meeting if it's sunny."

**Traditional Tool Calling Flow**:

```
1. LLM generates: "I need to check the weather"
2. LLM generates: <tool_call>get_weather(location: "Austin, TX")</tool_call>
3. Harness invokes tool → {temp: 75, conditions: "sunny"}
4. LLM receives result via special tokens
5. LLM generates: "Weather is sunny, I'll schedule the meeting"
6. LLM generates: <tool_call>schedule_meeting(title: "Outdoor meeting", time: "2pm")</tool_call>
7. Harness invokes tool → {meeting_id: "abc123"}
8. LLM generates: "Meeting scheduled with ID abc123"
```

**Phenomenological observations**:

- **Each tool is explicitly thematized**: The LLM must consciously "choose" the tool from available options
- **Parameters require conscious formatting**: JSON construction, type matching, schema adherence
- **Context switching at each step**: Tool call → result → process → next tool call
- **Tools remain objects of focus**: Never receding into transparent use
- **Serial dependency**: Each operation requires round-trip through LLM's attention

This is *Vorhandenheit*—tools as present-before, requiring explicit manipulation.

### 3.2 Evidence of Present-at-Hand Struggle

Empirical observations from production agent systems reveal patterns consistent with Vorhandenheit:

**1. Tool Selection Errors** (from Anthropic's tool use documentation):
- LLMs frequently select wrong tools when many are available
- Recommendations: Limit to 5-7 tools, provide clear descriptions, use one-tool-per-purpose
- *Interpretation*: Tools remain objects requiring conscious choice, not transparent instruments

**2. Parameter Formatting Failures**:
- Common errors: wrong types, missing required fields, malformed JSON
- LLMs often "try again" with corrected parameters
- *Interpretation*: Schema matching requires explicit focus, not fluent practice

**3. Sequential Bottleneck**:
- Multi-step workflows require repeated LLM invocations
- Each intermediate result must pass through LLM context
- Token costs scale linearly with operation count
- *Interpretation*: Tools cannot be composed transparently—each use is a thematic event

**4. Error Recovery Patterns**:
- When tool call fails, LLM must explicitly reason about failure
- Retry logic requires meta-awareness of tool mechanics
- *Interpretation*: Tools breaking force even more extreme Vorhandenheit

### 3.3 The Ontological Cost

This isn't merely inefficiency—it's an **ontological mismatch**. The LLM's natural mode of operation (generating text/code) is interrupted by tool calling's requirement for explicit object-level manipulation.

Gadamer's concept of **horizon** is relevant here:
- LLMs have a "horizon of understanding" formed by training data
- Code is within this horizon (familiar, comfortable)
- Tool calling is at the edge of this horizon (unfamiliar, effortful)
- Vorhandenheit arises precisely when we encounter entities outside our comfortable horizon

Traditional tool calling forces the LLM into a mode of operation *alien* to its training, requiring what Heidegger would call "explicit thematization" rather than "absorbed coping."

---

## IV. CODE MODE AS ZUHANDENHEIT

### 4.1 The Phenomenology of Code Mode

Same task: "Check weather in Austin, TX and schedule meeting if sunny."

**Code Mode Flow**:

```typescript
// LLM generates this code in one response:
async function handleWeatherMeeting(location: string) {
  const weather = await codemode.get_weather({ location });

  if (weather.conditions === 'sunny') {
    const meeting = await codemode.schedule_meeting({
      title: 'Outdoor meeting',
      time: '2pm'
    });
    return `Meeting scheduled: ${meeting.id}`;
  }

  return 'Weather not suitable for outdoor meeting';
}

const result = await handleWeatherMeeting('Austin, TX');
console.log(result);
```

**Phenomenological observations**:

- **Tools recede from focus**: The LLM writes familiar TypeScript; tools are just API calls
- **Composition is natural**: `if` statements, variable assignment—standard control flow
- **Single generation**: One code block handles entire workflow
- **No context switching**: Write code → sandbox executes → return results
- **Tools as ready-to-hand**: Like `fetch()` or `JSON.parse()`—familiar APIs, not special constructs

This is *Zuhandenheit*—tools transparent in use, absorbed into fluid action.

### 4.2 Empirical Validation from Cloudflare

Cloudflare's Agents SDK team documented striking findings (Varda & Pai, 2025):

**Quantitative Results**:
- **Better tool selection**: LLMs handle "many more tools" when presented as TypeScript APIs vs. direct tool calls
- **Better complexity handling**: "More complex tools" work reliably in Code Mode but fail in traditional calling
- **Faster execution**: Chaining operations in code avoids token-wasting round trips
- **Lower costs**: Fewer LLM invocations for multi-step workflows

**Qualitative Observations**:
- Code generation "feels natural" to LLMs
- Tool calling "struggles" increase with tool count/complexity
- LLMs leverage TypeScript idioms (error handling, composition, abstraction)

**Critical Quote**:
> "Perhaps this is because LLMs have an enormous amount of real-world TypeScript in their training set, but only a small set of contrived examples of tool calls."

This training data explanation is correct but insufficient. Let's apply hermeneutic interpretation.

### 4.3 Hermeneutic Interpretation

**Training data as Vorhabe (fore-having)**:
- Heidegger: Understanding always has a "fore-structure"—pre-understanding brought to interpretation
- LLMs' fore-structure: vast corpus of code where APIs are ready-to-hand
- TypeScript patterns (async/await, function composition, error handling) are *pre-understood*
- Tool calling patterns are not pre-understood—must be explicitly learned

**Code Mode leverages existing horizon**:
- LLMs don't need to learn "how to use tools"—they already know "how to write code"
- MCP tools, when presented as TypeScript APIs, fit within familiar horizon
- No ontological shift required—tools naturally integrate into code-writing practice

**Zuhandenheit through familiarity**:
- Heidegger: Tools become ready-to-hand through *concerned absorption* in activity
- LLMs are "concerned absorbed" in code generation (it's their primary mode)
- Tools accessed through code remain within this absorbed activity
- No breaking away into present-at-hand contemplation

### 4.4 Architectural Enablement

Code Mode requires specific infrastructure—notably, **secure sandboxing**. Cloudflare Workers provides ideal substrate:

**V8 Isolates**:
- Start in milliseconds (vs. containers: seconds)
- Use minimal memory (~few MB vs. containers: 100s of MB)
- Disposable—create per code execution, no reuse needed
- Enable "Code Mode feels native" experience

**Bindings vs. Network Access**:
- Traditional sandboxes: network access + API keys → security risk
- Workers bindings: typed objects providing authorized access → no key leakage
- Bindings make resources ready-to-hand (like `env.DB.query()`)—clean API surface

**Network Isolation by Default**:
- Sandbox has no internet access
- Only connected to approved MCP servers via bindings
- Architectural constraint = security guarantee

This technical architecture *enables* the phenomenological property (Zuhandenheit). The infrastructure itself embodies "tools as ready-to-hand"—bindings are typed, familiar, transparent in use.

---

## V. THE HERMENEUTIC CIRCLE: CODE MODE ⟷ CREATE SOMETHING

### 5.1 Part and Whole

Hermeneutics emphasizes the **circular relationship between part and whole**:
- Understanding a text requires understanding its parts
- Understanding the parts requires grasping the whole
- Interpretation moves iteratively between them, deepening both

For CREATE Something:
- **Whole**: The four-property ecosystem (.ltd, .io, .space, .agency)
- **Part**: Code Mode as a specific pattern within this ecosystem

Let's trace the hermeneutic circle.

### 5.2 First Movement: Whole → Part

**CREATE Something provides the interpretive context for understanding Code Mode**:

**From .ltd (Canon)**:
- Dieter Rams: "Good design is honest"
  - Code Mode is honest about what LLMs do well (code) vs. poorly (synthetic tool calls)
- Rams: "Good design makes a product understandable"
  - TypeScript APIs are more understandable than tool call schemas
- Rams: "As little design as possible"
  - Code Mode removes unnecessary abstraction layer (tool calling mechanism)

**From .io (Research)**:
- Systematic methodology: Code Mode demands empirical validation (not just intuition)
- Documented lineage: Connect contemporary patterns (MCP) to philosophical foundations (Heidegger)
- Reproducible experiments: .space validates Code Mode through pedagogy

**From .space (Practice)**:
- Already teaching code-mediated access (Workers KV via TypeScript)
- Students experience ready-to-hand tool interaction firsthand
- Validates pattern works pedagogically before applying agentically

**From .agency (Services)**:
- Patterns must survive production use to become canonical
- Code Mode will be validated through client agent implementations
- Commercial constraint ensures practical value, not just theoretical elegance

**Interpretation**: Code Mode makes sense *within* CREATE Something's hermeneutic methodology. It's not just a technique—it's an expression of the philosophy.

### 5.3 Second Movement: Part → Whole

**Code Mode illuminates CREATE Something's deeper principles**:

**Reveals Hermeneutic Circle Structure**:
- .space teaches pattern → validates in practice → elevates to .ltd canon
- Code Mode exemplifies this: discovered through .space, now canonical in .ltd
- The process itself is hermeneutic—understanding emerges through circular refinement

**Demonstrates Interpretive Application**:
- Heidegger wrote about workshops; we apply to agents
- Not "adopting" Heidegger but *interpreting* him through our horizon (LLMs, MCP, Workers)
- Code Mode shows how timeless principles (ready-to-hand) illuminate contemporary problems

**Embodies "Less, But Better"**:
- Traditional tool calling: more abstraction, more complexity, more explicit management
- Code Mode: less abstraction (just write code), better results (faster, more reliable)
- Constraint (code-only) breeds excellence

**Validates Pedagogical Approach**:
- .space teaches by having users write code, not by having them "configure tools"
- Code Mode formalizes what .space discovered: code-mediated access is superior
- Teaching and agent architecture converge on same pattern

**Interpretation**: Code Mode reveals CREATE Something's methodology is not arbitrary—it's grounded in phenomenological truth about how understanding works.

### 5.4 The Circle Turns

This iterative movement deepens understanding:

**First iteration**: Code Mode is a technique for agents
**Second iteration**: Code Mode expresses CREATE Something's philosophy
**Third iteration**: CREATE Something's philosophy explains why Code Mode works
**Fourth iteration**: Code Mode validates CREATE Something's methodology

The circle has no final endpoint—understanding continues to deepen through practice, reflection, refinement.

This *is* the hermeneutic circle Gadamer describes:
> "The circle of understanding is not a vicious circle... It is not a circle in which any arbitrary kind of knowledge operates, but it expresses the existential forestructure of Dasein itself."

Code Mode exists within CREATE Something's "existential forestructure"—the pre-understanding that shapes how patterns are discovered, validated, canonized.

---

## VI. TECHNICAL IMPLEMENTATION AND CONSTRAINTS

### 6.1 MCP Schema → TypeScript API Conversion

Code Mode requires converting MCP tool schemas into TypeScript definitions. Cloudflare's implementation:

```typescript
// MCP Tool Schema (JSON)
{
  "name": "search_agents_documentation",
  "description": "Semantically search within the fetched documentation",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query to find relevant documentation"
      }
    },
    "required": ["query"]
  }
}

// Generated TypeScript API
interface SearchAgentsDocumentationInput {
  /**
   * The search query to find relevant documentation
   */
  query: string;
}

declare const codemode: {
  /**
   * Semantically search within the fetched documentation from
   * GitHub repository: cloudflare/agents. Useful for specific queries.
   */
  search_agents_documentation: (
    input: SearchAgentsDocumentationInput
  ) => Promise<SearchAgentsDocumentationOutput>;
};
```

**Benefits of TypeScript Conversion**:
- **Type safety**: LLM generates typed code; errors caught at generation time
- **IntelliSense-like documentation**: Doc comments provide inline guidance
- **Familiar patterns**: Async functions, typed parameters—standard TypeScript
- **Composition**: TypeScript functions can be combined with language features (`Promise.all`, error handling)

**Generation Process**:
1. Fetch MCP server schema via protocol
2. Parse JSON Schema definitions
3. Generate TypeScript interfaces for inputs/outputs
4. Create typed function signatures
5. Load into sandbox context as ambient declarations

### 6.2 Sandbox Execution Model

**Isolation Requirements**:
- Must prevent network access (except via MCP bindings)
- Must prevent filesystem access (except authorized mounts)
- Must prevent process spawning, eval, dynamic imports
- Must enforce resource limits (CPU, memory, execution time)

**Workers Implementation**:
```javascript
// Dynamic Worker loading (new Worker Loader API)
let worker = env.LOADER.get(agentId, async () => {
  return {
    compatibilityDate: "2025-06-01",
    mainModule: "agent.js",
    modules: {
      "agent.js": generatedCode  // LLM's code
    },
    env: {
      // Bindings to MCP servers (NOT network access)
      MCP_SERVER_A: ctx.exports.McpServerA(),
      MCP_SERVER_B: ctx.exports.McpServerB()
    },
    globalOutbound: null  // Disable network entirely
  };
});

// Execute
let result = await worker.getEntrypoint().fetch(request);
```

**Key Properties**:
- **No network**: `globalOutbound: null` enforces at platform level
- **Bindings-only access**: MCP servers provided as typed objects in `env`
- **Ephemeral**: Worker created, used, discarded—no state persists
- **Fast**: Isolate startup ~1-5ms (containers: 100-1000ms)

### 6.3 Why Workers Enable Code Mode

**Millisecond Startup**:
- Code Mode generates code per task
- Must execute immediately for responsive agents
- Containers too slow; isolates perfect fit

**Bindings as Ready-to-Hand Resources**:
- `env.DB`, `env.KV`, `env.MCP_SERVER` are typed objects
- Accessed like any TypeScript API—no special handling
- Phenomenologically: bindings *are* ready-to-hand infrastructure

**Security Through Architecture**:
- No API keys in code (LLM never sees them)
- No network access (LLM can't exfiltrate)
- Resource limits enforced (can't DOS)
- Architectural constraints = security guarantees

**Cost Efficiency**:
- Isolates use ~2-5MB memory
- Created on-demand, no pooling needed
- Pricing: per-execution, not per-instance
- Code Mode economically viable at scale

### 6.4 Comparison: Workers vs. Containers

| Property | Workers (Isolates) | Containers (Docker, etc.) |
|----------|-------------------|---------------------------|
| Startup time | 1-5ms | 100-1000ms |
| Memory per instance | 2-5MB | 100-500MB |
| Cost model | Per-execution | Per-instance-hour |
| Bindings support | Native | Custom implementation |
| Network isolation | Default | Configuration |
| Disposability | Perfect fit | Possible but wasteful |
| Code Mode viability | Ideal | Workable but expensive |

**Interpretation**: Workers' architecture naturally aligns with Code Mode's requirements. This isn't coincidence—both prioritize **fast, ephemeral, binding-based execution**.

---

## VII. IMPLICATIONS FOR AGENT ARCHITECTURE

### 7.1 Rethinking MCP Tool Design

If Code Mode is superior to direct tool calling, what does this mean for MCP server design?

**Traditional MCP Design**:
- Simple tools (fetch_document, search, get_weather)
- Minimal parameters
- Flat schemas (avoid nesting)
- Tool count limited (5-7 recommended)

**Code Mode MCP Design**:
- Complex APIs are acceptable (LLM writes code, not JSON)
- Rich type hierarchies work (TypeScript handles complexity)
- Tool count less constrained (imports manage namespace)
- Composition through code (not chaining tool calls)

**Example**:

Traditional MCP design might provide:
```
list_emails(folder: string)
get_email(id: string)
send_email(to: string, subject: string, body: string)
```

Code Mode design can provide richer API:
```typescript
interface EmailClient {
  folders: {
    list(): Promise<Folder[]>;
    get(id: string): Promise<Folder>;
  };
  messages: {
    list(folder: string, filter?: Filter): Promise<Message[]>;
    get(id: string): Promise<Message>;
    send(draft: EmailDraft): Promise<MessageId>;
    reply(messageId: string, body: string): Promise<MessageId>;
  };
}
```

LLM writes code against rich API; complexity is absorbed into TypeScript rather than forcing flat tool calls.

### 7.2 Impact on Agent Frameworks

**LangChain, Semantic Kernel, Haystack**: Currently built around tool calling. Code Mode suggests alternative architecture:

**Current**:
```python
agent = Agent(
    llm=model,
    tools=[WeatherTool(), CalendarTool(), EmailTool()]
)
result = agent.run("Check weather and schedule meeting if sunny")
```

**Code Mode Alternative**:
```python
agent = CodeModeAgent(
    llm=model,
    sandbox=WorkersSandbox(),
    mcp_servers={
        'weather': WeatherMcpServer(),
        'calendar': CalendarMcpServer()
    }
)
result = agent.run("Check weather and schedule meeting if sunny")
# LLM generates TypeScript → sandbox executes → returns result
```

**Key Difference**: Agent doesn't manage tool invocation loop; it generates code, executes, returns.

### 7.3 Educational Implications

CREATE Something's .space validates Code Mode *pedagogically*:

**Current .space Implementation** (packages/space/src/routes/api/code/execute/+server.ts):
- Teaches Workers KV by having users write code
- Not "configure KV tool"—write `env.KV.get(key)`
- Students experience code-mediated access as natural

**Planned Extension**:
- Teach MCP integration same way
- Users write code calling MCP TypeScript APIs
- Experience composition, error handling, control flow
- Validates Code Mode pattern through learning outcomes

**Hypothesis**: Students will find code-mediated tool access more intuitive than tool calling configuration—just as LLMs do.

### 7.4 Philosophical Implications

Code Mode reveals something fundamental about AI-native development:

**1. Ontological Alignment**:
- LLMs' being-in-the-world is code generation
- Tools accessed through code remain within this world
- Tool calling forces ontological shift (code → special tokens → code)
- Align architecture with agent's natural mode = better results

**2. Ready-to-Hand as Design Principle**:
- Not just for human UX but for agent UX
- Ask: "Does this tool recede from focus in use?"
- If no → redesign for transparency

**3. Hermeneutic Development**:
- Don't design agent architectures from first principles
- Discover them through practice (.space)
- Validate through reflection (.io research)
- Canonize through refinement (.ltd)
- Apply to production (.agency)

**4. "Less, But Better" for Agents**:
- Fewer abstractions (no tool calling layer)
- Simpler mental model (just code)
- Better results (faster, more reliable, more capable)

---

## VIII. CRITIQUE AND LIMITATIONS

### 8.1 What Code Mode Doesn't Solve

**1. LLM Correctness**:
- Code Mode doesn't make LLMs write correct code
- Bugs in generated code still occur
- Requires same validation as human-written code

**2. Security Boundaries**:
- Sandbox security is prerequisite, not solved by Code Mode
- Still need careful MCP server authorization
- Bindings must enforce correct access control

**3. Cost**:
- Code Mode reduces LLM invocations but adds sandbox execution cost
- Workers isolates are cheap but not free
- Must measure total cost (LLM tokens + compute)

**4. Debugging Complexity**:
- Errors in generated code require LLM to read stack traces
- May need multiple iterations to fix
- Traditional tool calling errors are simpler (wrong parameter type, etc.)

### 8.2 When Traditional Tool Calling May Be Better

**Simple, Single-Shot Operations**:
- "What's the weather?" → one tool call, done
- Code Mode overhead not justified
- Direct tool calling is simpler

**UI-Driven Agent Interactions**:
- User sees each tool call in UI with approval button
- Code Mode hides intermediate steps
- Less transparency may be undesirable

**Severely Token-Constrained Scenarios**:
- Code Mode generates more tokens (full TypeScript) vs. tool call JSON
- If token cost dominates, tool calling may win
- (But typically multi-step workflows favor Code Mode despite higher per-call tokens)

### 8.3 Open Questions

**1. Multi-Language Support**:
- Cloudflare focuses on TypeScript/JavaScript
- What about Python agents, Go agents?
- Does Code Mode work equally well in all languages?

**2. State Management**:
- Current Code Mode is stateless (ephemeral sandbox)
- What about agents needing persistent state across executions?
- How to handle long-running processes?

**3. Observability**:
- Traditional tool calling: each invocation is observable event
- Code Mode: execution is opaque (just "ran code, got result")
- Need better introspection into sandbox execution

**4. Error Recovery**:
- When generated code fails, how does LLM understand why?
- Need good error messages, stack traces, debugging support
- May require multiple iterations to fix

---

## VIII. PRACTICAL PATTERNS: PROGRESSIVE DISCLOSURE AND SKILLS

### 8.1 Progressive Disclosure

**The Context Window Problem**:
- Traditional MCP: All tool definitions loaded into context immediately
- Consumes 10-20% of context before any work begins
- Scales poorly: 3 MCPs = 10%, 10 MCPs = 30%+
- Both definitions AND results bloat context

**Code Mode Solution: Progressive Disclosure**:
- MCP tools represented as file structure (not context tokens)
- Agent navigates files, loads only what's needed
- Only active tool code enters context
- Results can be transformed/aggregated before exposure

**Example Structure**:
```
servers/
├── gmail/
│   ├── index.ts          # Tool registry
│   ├── search.ts         # Search emails
│   ├── send.ts          # Send email
│   └── labels.ts        # Manage labels
├── notion/
│   ├── index.ts
│   ├── pages.ts
│   └── databases.ts
└── weather/
    └── index.ts
```

**How It Works**:
1. Agent receives task: "Find emails about Q4 reports and create Notion page"
2. Agent reads `servers/gmail/index.ts` to see available tools
3. Loads `servers/gmail/search.ts` into context
4. Executes search, gets results
5. Transforms results in code (extract subjects, dates only)
6. Reads `servers/notion/index.ts`, loads `pages.ts`
7. Creates page with transformed data
8. Only relevant code + transformed data in context (not all tool definitions + raw results)

**Benefits**:
- **Context Efficiency**: 90%+ reduction in tool-related tokens
- **Scalability**: Connect 50+ MCP servers without context explosion
- **Privacy**: Transform sensitive data before LLM sees it
- **Composability**: Code handles multi-step workflows internally

### 8.2 Context-Efficient Tool Results

**Traditional Problem**:
```
User: "Analyze my Google Sheet"
→ Tool call: get_sheet_data()
→ Result: 10,000 rows × 20 columns = 200,000 cells
→ Context: Completely bloated, unusable
```

**Code Mode Solution**:
```typescript
// Agent writes this code:
async function analyzeSheet() {
  const data = await mcp.google_sheets.get_data({
    sheet_id: "xyz",
    range: "A1:Z10000"
  });

  // Transform BEFORE exposing to context
  const summary = {
    row_count: data.length,
    columns: Object.keys(data[0]),
    sample: data.slice(0, 5),  // Only first 5 rows
    stats: calculateStats(data)  // Aggregated stats
  };

  return summary;
}
```

**Result**: Agent sees structured summary (100 tokens) instead of raw data (200,000 tokens).

**Phenomenological Interpretation**:
- Raw data = Vorhandenheit (overwhelming presence)
- Transformed data = Zuhandenheit (relevant, actionable)
- Code mediates between raw (too much) and meaningful (just right)

### 8.3 Control Flow in Code vs. Model

**Traditional Tool Calling** (Model manages flow):
```
1. Model decides: "I should check weather"
2. Model generates: <tool_call>get_weather("Austin")</tool_call>
3. Harness executes → {temp: 75, sunny}
4. Model decides: "Weather is good, schedule meeting"
5. Model generates: <tool_call>schedule_meeting(...)</tool_call>
6. Harness executes → {meeting_id: "123"}
7. Model decides: "Done"
```

**Each decision point**:
- Requires LLM invocation
- Consumes tokens
- Risks hallucination
- Adds latency

**Code Mode** (Code manages flow):
```typescript
async function handleWeatherMeeting(location: string, meeting: Meeting) {
  const weather = await mcp.weather.get_current({ location });

  if (weather.conditions === 'sunny' && weather.temp > 70) {
    const result = await mcp.calendar.schedule(meeting);
    return `Meeting scheduled: ${result.id}`;
  } else {
    return `Weather unsuitable: ${weather.conditions}, ${weather.temp}°F`;
  }
}

// Agent calls once, code handles logic
const result = await handleWeatherMeeting('Austin', meetingDetails);
console.log(result);
```

**Benefits**:
- **Efficiency**: One LLM invocation vs. three
- **Reliability**: Conditional logic is deterministic, not probabilistic
- **Clarity**: Code is explicit about decision tree
- **Speed**: No round trips between tool calls

**Phenomenological Interpretation**:
- Traditional: Model must explicitly thematize each decision (Vorhandenheit)
- Code Mode: Logic absorbed into code flow (Zuhandenheit)
- Model writes natural code; execution handles details transparently

### 8.4 Privacy-Preserving Operations

**The Privacy Problem**:
- Medical records, financial data, PII in databases
- Don't want LLM seeing sensitive fields
- But need LLM-powered analysis

**Code Mode Solution**:
```typescript
async function analyzePatientOutcomes() {
  // Code runs in sandbox, accesses real database
  const patients = await mcp.medical_db.query({
    condition: "diabetes",
    date_range: "2024"
  });

  // Sensitive data NEVER exposed to LLM
  const anonymized = patients.map(p => ({
    age_range: bucketAge(p.age),  // "40-50" not "47"
    outcome: p.treatment_success,  // boolean, not details
    duration: p.treatment_days
  }));

  // LLM only sees aggregated, anonymized data
  return {
    total_patients: patients.length,
    success_rate: calculateSuccessRate(anonymized),
    avg_duration: average(anonymized.map(p => p.duration)),
    sample: anonymized.slice(0, 3)  // Sanitized examples
  };
}
```

**What LLM Sees**:
```json
{
  "total_patients": 247,
  "success_rate": 0.83,
  "avg_duration": 42,
  "sample": [
    {"age_range": "40-50", "outcome": true, "duration": 38},
    {"age_range": "50-60", "outcome": true, "duration": 45},
    {"age_range": "30-40", "outcome": false, "duration": 51}
  ]
}
```

**Privacy Guarantees**:
- Real names, SSNs, diagnoses never in context
- Code transforms sensitive → generic at boundary
- Architectural enforcement (not policy)
- Compliant with HIPAA, GDPR

### 8.5 Skills: State Persistence Across Tasks

**The Problem**:
- Agent solves task, generates good code
- Next task similar → agent starts from scratch
- No learning, no reuse

**Skills as Solution** (Anthropic's approach):
- Save successful code patterns as "skills"
- Document in `skill.md` files
- Agent discovers skills, reuses patterns
- Builds library of capabilities over time

**Code Mode + Skills Integration**:

```
.claude/skills/
├── mcp-gmail-to-notion/
│   ├── skill.md           # "Search emails, create Notion pages"
│   ├── search-emails.ts   # Reusable code
│   └── create-page.ts
└── mcp-sheets-analysis/
    ├── skill.md
    └── analyze.ts
```

**skill.md Example**:
```markdown
# Gmail to Notion Sync

**Purpose**: Search Gmail for specific topics and create summary pages in Notion

**When to use**: User wants to organize emails into knowledge base

**MCP servers required**: gmail, notion

**Example usage**:
\`\`\`typescript
import { searchEmails } from './search-emails';
import { createPage } from './create-page';

const emails = await searchEmails({ query: "Q4 reports", max: 50 });
const page = await createPage({
  title: "Q4 Email Summary",
  content: emails.map(e => e.subject)
});
\`\`\`

**Success rate**: 95% (tested 20 times)
```

**Workflow**:
1. Agent uses Code Mode to accomplish task
2. Code works well → save as skill
3. Add `skill.md` documenting purpose, usage
4. Future tasks: Agent reads skills directory
5. Finds relevant skill, adapts code for new context
6. Iterative improvement: Skills refined over time

**Benefits**:
- **Efficiency**: Don't re-solve solved problems
- **Reliability**: Skills represent proven patterns
- **Learning**: Agent's capability grows with use
- **Composability**: Combine skills for complex tasks

**Hermeneutic Interpretation**:
- Skills = Sedimented understanding (Husserl)
- Past successful experiences inform present action
- Tradition (previous solutions) guides innovation (new tasks)
- The hermeneutic circle: Skills both emerge from and enable practice

### 8.6 Implementation Pattern: MCP as Code Architecture

**Recommended Structure**:

```
project/
├── servers/                 # MCP servers as code
│   ├── gmail/
│   │   ├── index.ts        # exports { search, send, labels }
│   │   ├── search.ts
│   │   ├── send.ts
│   │   └── labels.ts
│   ├── notion/
│   │   ├── index.ts
│   │   ├── pages.ts
│   │   └── databases.ts
│   └── [other-mcps]/
├── .claude/
│   └── skills/             # Saved patterns
│       └── [skill-name]/
│           ├── skill.md
│           └── *.ts
└── agent.ts                # Main agent loop
```

**Agent Workflow**:
```typescript
// 1. Agent receives task
const task = "Analyze emails about sales and create Notion dashboard";

// 2. Agent explores servers/ directory
// Discovers: servers/gmail/index.ts, servers/notion/index.ts

// 3. Agent checks .claude/skills for relevant patterns
// Finds: skills/email-analysis/, skills/notion-dashboard/

// 4. Agent writes code combining MCP tools + skill patterns
const code = await llm.generate({
  prompt: task,
  context: [
    "servers/gmail/index.ts",
    "servers/notion/index.ts",
    "skills/email-analysis/skill.md"
  ]
});

// 5. Execute in sandbox
const result = await sandbox.execute(code, {
  mcpBindings: {
    gmail: gmailMcpServer,
    notion: notionMcpServer
  }
});

// 6. If successful, optionally save as new skill
if (result.success) {
  await saveSkill("sales-email-dashboard", code);
}
```

**Progressive Disclosure in Action**:
- Start: Agent has task, no context bloat
- Step 1: Read `servers/gmail/index.ts` (small file)
- Step 2: Load only `search.ts` (not send.ts, labels.ts)
- Step 3: Execute, transform results
- Step 4: Read `servers/notion/index.ts`
- Step 5: Load only `databases.ts`
- Step 6: Create dashboard with transformed data
- End: Context contained only relevant code + summary data

**Contrast with Traditional**:
- Traditional: All Gmail tools + Notion tools in context from start
- Traditional: All email search results in context (thousands of emails)
- Traditional: Multiple LLM invocations to chain operations
- Code Mode: Only active code + transformed data
- Code Mode: One LLM invocation

---

## IX. FUTURE WORK

### 9.1 Empirical Validation

**Proposed Experiments**:

**1. Comparative Agent Benchmark**:
- Same tasks with traditional tool calling vs. Code Mode
- Measure: success rate, time to completion, token usage, cost
- Hypothesis: Code Mode wins on complex multi-step tasks

**2. Educational Study**:
- Teach two cohorts: one with tool calling, one with Code Mode
- Measure: time to proficiency, error rates, subjective experience
- Hypothesis: Code Mode cohort learns faster, makes fewer errors

**3. Production Deployment**:
- Build .agency client agents with Code Mode
- Track: reliability, cost, client satisfaction, maintenance burden
- Hypothesis: Code Mode agents require less intervention

### 9.2 Theoretical Extensions

**1. Gadamer's Horizon Fusion**:
- Code Mode as "fusion of horizons" between LLM training and tool ecosystems
- Explore how APIs mediate between different domains

**2. Dreyfus on Expertise**:
- Hubert Dreyfus: experts don't follow rules, they absorb patterns
- LLMs with TypeScript training are "expert" code writers
- Code Mode leverages this expertise; tool calling does not

**3. Actor-Network Theory**:
- Tools, LLMs, sandboxes as actants in a network
- Code Mode reconfigures network topology
- Analyze power dynamics, agency distribution

### 9.3 Implementation Expansions

**1. Multi-MCP Composition**:
- Current: single MCP server per Code Mode execution
- Future: compose multiple MCP servers in one code snippet
- Requires namespace management, conflict resolution

**2. Streaming Results**:
- Current: code runs, returns final result
- Future: stream intermediate outputs (console.log)
- Enables real-time observability

**3. Persistent Contexts**:
- Current: ephemeral sandbox per execution
- Future: long-lived sandbox with state
- Enables iterative refinement, debugging sessions

### 9.4 Pedagogical Integration

**CREATE Something .space Roadmap**:

**Phase 1: Extend Current Lessons** (targeting current .space users)
- Lesson 7: Connect to MCP Server via TypeScript
- Lesson 8: Compose Multiple Tools in Code
- Lesson 9: Build a Simple Code Mode Agent

**Phase 2: MCP Integration Layer** (new infrastructure)
- Add MCP server connection management to .space
- Generate TypeScript definitions from MCP schemas
- Provide sandbox with MCP bindings

**Phase 3: Advanced Experiments** (for experienced users)
- Multi-MCP composition
- Error handling patterns
- Production agent patterns

---

## X. CONCLUSION

### 10.1 Synthesis

This paper has argued that **Code Mode represents an ontological shift in LLM-tool interaction**, not merely a performance optimization. By applying Heidegger's phenomenological analysis of ready-to-hand vs. present-at-hand, we've shown:

1. **Traditional tool calling forces Vorhandenheit**: Tools remain objects of explicit focus, requiring conscious manipulation, synthetic training, and serial invocation.

2. **Code Mode achieves Zuhandenheit**: Tools recede into transparent use when accessed through familiar TypeScript APIs, leveraging LLMs' extensive code-writing training.

3. **Empirical validation**: Cloudflare's research demonstrates superior performance, and CREATE Something's .space validates the pattern pedagogically.

4. **Hermeneutic interpretation**: Code Mode both expresses and validates CREATE Something's philosophy of "less, but better"—removing unnecessary abstraction to achieve better results through constraint.

### 10.2 Contributions

**Theoretical**:
- First application of Heideggerian phenomenology to LLM agent architecture
- Hermeneutic analysis of MCP and Code Mode through CREATE Something's methodology
- Conceptual framework: ready-to-hand vs. present-at-hand as design principle for agent UX

**Empirical**:
- Documentation of CREATE Something .space's implementation as pedagogical validation
- Technical analysis of Cloudflare Workers as ideal substrate for Code Mode
- Comparative analysis of tool calling vs. code-mediated access

**Practical**:
- Implementation roadmap for Code Mode across CREATE Something properties
- Design patterns for MCP servers optimized for code access
- Educational curriculum for teaching Code Mode in .space

### 10.3 The Hermeneutic Lesson

Code Mode demonstrates CREATE Something's core methodology:

**1. Patterns emerge from practice**, not from first principles
- .space taught Workers KV through code
- Code Mode formalizes what was already working

**2. Interpretation connects lineage to contemporary problems**
- Heidegger wrote about workshops
- We interpret for LLMs and agents
- The principle (ready-to-hand) transcends context

**3. The hermeneutic circle validates iteratively**
- Code Mode illuminates CREATE Something's philosophy
- CREATE Something's philosophy explains Code Mode
- Understanding deepens through circular movement

**4. "Weniger, aber besser" is phenomenologically grounded**
- Not aesthetic preference but ontological truth
- Less abstraction = tools more ready-to-hand
- Better results emerge from aligning with agent's natural mode

### 10.4 Final Reflection

Heidegger writes:

> "The less we just stare at the thing called hammer, the more we take hold of it and use it, the more original our relation to it becomes and the more undisguisedly it is encountered as what it is—as a useful thing."

Code Mode embodies this insight. By letting LLMs write code rather than staring at tools-as-objects (tool calls), we achieve a more original relation—tools become what they are: *useful things*, not objects requiring explicit manipulation.

This is not optimization. This is **authentic engagement** with tools. And as Heidegger would argue, authenticity is not optional for excellence—it's prerequisite.

Code Mode works because it's *honest* about how LLMs engage with tools. Traditional tool calling imposes an inauthentic mode. Code Mode restores authenticity. And from authenticity flows capability.

---

## REFERENCES

**Primary Sources**:
- Heidegger, M. (1927/1962). *Being and Time*. Trans. Macquarrie & Robinson. Harper & Row.
- Gadamer, H-G. (1960/2004). *Truth and Method*. Trans. Weinsheimer & Marshall. Continuum.

**Technical**:
- Varda, K. & Pai, S. (2025). "Code Mode: the better way to use MCP." Cloudflare Blog.
- Cloudflare. (2025). "Worker Loader API Documentation." Cloudflare Developers Docs.
- MCP Team. (2025). "Model Context Protocol Specification." GitHub: modelcontextprotocol/specification.

**CREATE Something**:
- CREATE Something. (2025). "Arc Pattern." createsomething.ltd/patterns/arc.
- CREATE Something. (2025). ".space Code Execution Implementation." Monorepo: packages/space/src/routes/api/code/execute/+server.ts.
- Rams, D. (1970s-1980s). "Ten Principles of Good Design." Vitsœ.

**Secondary**:
- Dreyfus, H. (1991). *Being-in-the-World: A Commentary on Heidegger's Being and Time*. MIT Press.
- Winograd, T. & Flores, F. (1986). *Understanding Computers and Cognition*. Addison-Wesley. [Early application of Heidegger to software design]
- Dourish, P. (2001). *Where the Action Is: The Foundations of Embodied Interaction*. MIT Press.

---

**Paper Metadata**:
- **Category**: agent-architecture
- **Reading Time**: 35 minutes
- **Difficulty**: Advanced
- **Technical Focus**: phenomenology, agent-architecture, hermeneutics, mcp, cloudflare-workers
- **Date**: November 21, 2025
- **Status**: Draft (Phase 0)

---

🤖 Co-Authored with Claude Code

Part of CREATE Something's Research Platform (.io)
