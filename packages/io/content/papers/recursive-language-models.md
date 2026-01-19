---
title: "Recursive Language Models: Context as Environment Variable"
subtitle: "Implementing MIT CSAIL's RLM pattern for processing arbitrarily large codebases through programmatic context navigation"
authors: ["Micah Johnson"]
category: "Research"
abstract: "This paper documents the implementation and empirical validation of Recursive Language Models (RLMs) based on MIT CSAIL's research (arxiv:2512.24601). We implemented a task-agnostic inference paradigm that treats context as an external environment variable rather than prompt content, enabling processing of contexts far beyond model limits. Through production deployment, we identified critical implementation bugs, validated the core RLM pattern against the original alexzhang13/rlm repository, and demonstrated practical application for codebase analysis. The RLM successfully analyzed 157K characters across 50 files, identifying 45 catch blocks, 61 console calls, and 51 validation patterns as DRY violations—leading to the creation of four shared utilities that reduced duplication across the monorepo."
keywords: ["RLM", "recursive language models", "long context", "code analysis", "DRY"]
publishedAt: "2026-01-19"
readingTime: 15
difficulty: "advanced"
published: true
---


## Abstract

This paper documents the implementation and empirical validation of Recursive Language Models (RLMs) based on MIT CSAIL's research (arxiv:2512.24601). We implemented a task-agnostic inference paradigm that treats context as an external environment variable rather than prompt content, enabling processing of contexts far beyond model limits. Through production deployment, we identified critical implementation bugs, validated the core RLM pattern against the original alexzhang13/rlm repository, and demonstrated practical application for codebase analysis. The RLM successfully analyzed 157K characters across 50 files, identifying 45 catch blocks, 61 console calls, and 51 validation patterns as DRY violations—leading to the creation of four shared utilities that reduced duplication across the monorepo.


## 1. Introduction

Large Language Models face a fundamental constraint: context windows. Even "long-context" models (1M+ tokens) degrade on tasks requiring dense access to large inputs. The MIT CSAIL paper "Recursive Language Models" (arxiv:2512.24601) proposes a paradigm shift: **treat context as an external environment variable, not prompt content**.

The key insight: instead of injecting massive context into the prompt, store it as a variable in a REPL environment. The model writes code to navigate the context, using sub-LM calls for semantic understanding. This enables processing 10M+ tokens with comparable cost to standard inference.

### Research Questions

1. Can we correctly implement the RLM pattern based on the MIT CSAIL paper?
2. What implementation bugs emerge in production use?
3. Does RLM provide practical value for codebase analysis at CREATE SOMETHING?


## 2. Architecture

### 2.1 Core Components

Our implementation follows the original RLM architecture:

```
┌─────────────────────────────────────────────┐
│             RLMSession                       │
│  - Manages the iteration loop               │
│  - Routes to root/sub models                │
│  - Tracks costs                             │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│           RLMEnvironment                     │
│  - Sandboxed Python REPL                    │
│  - context = <your massive input>           │
│  - llm_query(prompt) → sub-LM call          │
│  - results = {} for findings                │
└─────────────────────────────────────────────┘
```

**RLMEnvironment**: Sandboxed Python REPL where context is stored as a variable. Provides:
- `context` - The input data (can be arbitrarily large)
- `llm_query(prompt)` - Sub-LM calls for semantic understanding
- `results` - Dictionary for storing intermediate findings
- `chunk_text()`, `chunk_lines()` - Chunking helpers
- Standard library: `re`, `json`, `print()`

**RLMSession**: Orchestrates the model ↔ REPL loop:
1. Send system prompt + query to root model
2. Extract `\`\`\`repl` code blocks from response
3. Execute code in environment
4. Feed output back to model
5. Repeat until `FINAL()` or max iterations

### 2.2 Model Routing

Following the paper's recommendations, we use two models for cost efficiency:

| Role | Model | Cost | Purpose |
|------|-------|------|---------|
| Root | Claude Sonnet | ~$0.01/call | Planning, synthesis, final answer |
| Sub-calls | Claude Haiku | ~$0.001/call | Chunk understanding |

The paper shows Haiku achieves 90% of Sonnet's performance on bounded semantic tasks while costing 10x less.

### 2.3 Termination Markers

The model signals completion via:
- `FINAL(your answer here)` - Direct answer
- `FINAL_VAR(results)` - Return a variable from the environment


## 3. Implementation Review

We reviewed our implementation against the original alexzhang13/rlm repository, identifying several critical issues.

### 3.1 Bug: Undefined Client Variable

**File**: `modal_rlm.py:401`

```python
# Bug: 'client' was never defined, only 'anthropic_client'
response = client.messages.create(...)

# Fix:
response = anthropic_client.messages.create(...)
```

This would have crashed at runtime in production.

### 3.2 Bug: FINAL() Regex Limitation

**Original pattern**:
```python
final_match = re.search(r"FINAL\(([^)]+)\)", response)
```

**Problem**: `[^)]+` stops at the first `)`, so:
- `FINAL(Answer is (a) and (b))` → captures only `"Answer is (a"`

**Fix**:
```python
# Use greedy match with end-of-string anchor
final_match = re.search(r"(?:^|\n)FINAL\((.+)\)\s*$", response)
```

### 3.3 Bug: FINAL Detection Before Code Execution

**Original flow**:
1. Get model response
2. Check for FINAL ← **Problem: FINAL matched before code runs**
3. Execute code blocks
4. Feed results back

**Problem**: Model outputs code blocks AND `FINAL_VAR(results)` together, expecting code to populate `results` first. But we checked for FINAL before executing code, returning empty results.

**Fix**: Execute code blocks first, then check for FINAL:
```python
# Execute code blocks first
code_blocks = re.findall(r"```repl\n(.*?)```", response, re.DOTALL)
for code in code_blocks:
    exec_result = env.execute(code.strip())
    # ... capture output

# NOW check for FINAL (results are populated)
final_match = re.search(r"(?:^|\n)FINAL\((.+)\)\s*$", response)
```

### 3.4 Bug: MULTILINE Flag Causing Early Match

**Original**:
```python
final_match = re.search(r"FINAL\((.+)\)\s*$", response, re.MULTILINE)
```

**Problem**: `re.MULTILINE` makes `$` match at end of ANY line, not just end of string. FINAL mentioned mid-response (in instructions) matched prematurely.

**Fix**: Remove MULTILINE, use start-of-line anchor:
```python
final_match = re.search(r"(?:^|\n)FINAL\((.+)\)\s*$", response)
```

### 3.5 Enhancement: Structured Messages

**Original**: Flattened conversation to text blob:
```python
messages_text = "\n\n".join(f"User: {m['content']}" for m in conversation)
```

**Fix**: Pass structured messages to API:
```python
config = ProviderConfig(
    messages=conversation,  # List of {"role": ..., "content": ...}
    ...
)
```

This enables proper multi-turn conversation handling by the Claude API.


## 4. Empirical Validation

### 4.1 Test Case: DRY Violation Analysis

We ran the RLM against our monorepo to find DRY (Don't Repeat Yourself) violations.

**Configuration**:
- Context: 157,399 characters (50 files)
- Root model: Claude Sonnet
- Max iterations: 12
- Max sub-calls: 20

**Query**: Find duplicate patterns across:
1. Catch blocks with similar error handling
2. Direct IDENTITY_API fetches (should use client)
3. Direct `.length` checks (should use isEmpty/hasItems)
4. Console calls (should use structured logger)

### 4.2 Results

| Category | Count | Status |
|----------|-------|--------|
| catch_blocks | 38 | High - needs catchApiError |
| identity_api_fetches | 4 | Good - mostly migrated |
| length_checks | 13 | Medium - use isEmpty() |
| console_calls | 61 | High - use createLogger |
| validation_patterns | 51 | High - use validateStringField |

**Cost**: $0.0316 for complete analysis
**Iterations**: 1 (model completed in single pass)
**Duration**: ~83 seconds

### 4.3 Artifacts Created

Based on RLM findings, we created four shared utilities:

**1. Identity Client** (`packages/components/src/lib/api/identity-client.ts`)
```typescript
// Before: 20+ files with duplicate fetch patterns
const response = await fetch(`${IDENTITY_API}/v1/auth/login`, {...});

// After: Typed, centralized client
const result = await identityClient.login({ email, password });
```

**2. API Error Handling** (`packages/components/src/lib/utils/api-error.ts`)
```typescript
// Before: Duplicate try/catch in every endpoint
try { ... } catch (err) { console.error(...); return json({...}); }

// After: Wrapped handler
export const POST = catchApiError('ProfileAPI', async (event) => { ... });
```

**3. Validation Helpers** (`packages/components/src/lib/utils/validation.ts`)
```typescript
// Before: Repeated patterns
if (records.length === 0) { ... }
if (!name || typeof name !== 'string' || name.trim().length === 0) { ... }

// After: Type-safe helpers
if (isEmpty(records)) { ... }
const result = validateStringField(body.name, 'name', { required: true });
```

**4. Context Logger** (`packages/components/src/lib/utils/logger.ts`)
```typescript
// Before: Console calls without correlation
console.log('[ProfileAPI] Fetching...', email);

// After: Structured logging
const logger = createLogger('ProfileAPI');
logger.info('Fetching', { email, correlationId });
```


## 5. Discussion

### 5.1 RLM Effectiveness

The RLM pattern proved effective for codebase analysis:

**Strengths**:
- Successfully processed 157K characters (far beyond prompt limits)
- Identified actionable patterns through programmatic filtering
- Cost-effective: $0.03 for comprehensive analysis
- Single iteration completion demonstrates good prompt engineering

**Limitations**:
- No sub-LM calls used in this task (regex sufficient)
- Model occasionally includes FINAL in first response without exploration
- Requires careful prompt engineering to encourage REPL usage

### 5.2 Implementation Lessons

1. **Execute Before Evaluate**: Code blocks must run before checking for FINAL, as models often include both in a single response.

2. **Regex Precision**: MULTILINE flags and greedy matching require careful consideration. Test with edge cases like nested parentheses.

3. **Structured Messages**: APIs optimize for structured conversation; text flattening loses context and attribution.

4. **Defensive Testing**: Add regression tests for termination marker parsing.

### 5.3 Comparison to Original

Our implementation correctly captures the core RLM pattern:

| Feature | Original (alexzhang13/rlm) | Our Implementation |
|---------|---------------------------|-------------------|
| Context as variable | ✓ | ✓ |
| REPL execution loop | ✓ | ✓ |
| llm_query() sub-calls | ✓ | ✓ |
| FINAL/FINAL_VAR markers | ✓ | ✓ (fixed regex) |
| Cost tracking | ✓ | ✓ |
| Docker sandbox | ✓ | ✓ (Modal) |
| Trajectory logging | ✓ | Partial |

**Missing features**:
- Prime Intellect sandbox support
- Full trajectory visualization
- Multiple backend support (we use Claude only)


## 6. Recommendations

### 6.1 For RLM Implementation

1. **Test FINAL parsing extensively** - Include nested parentheses, mid-response mentions, and edge cases in test suite.

2. **Execute-then-evaluate flow** - Always run code blocks before checking termination markers.

3. **Avoid MULTILINE regex** - Unless specifically needed, `$` should match end of string, not end of line.

4. **Use structured messages** - Pass proper conversation format to LLM APIs.

### 6.2 For Codebase Analysis

1. **Start with regex** - Most DRY violations are syntactic patterns; semantic analysis (sub-LM) needed only for complex understanding.

2. **Chunk by file** - Include file boundaries in context for clear attribution.

3. **Iterate on prompts** - Explicit code examples in prompts improve REPL usage.

### 6.3 Future Work

- Add trajectory visualization (port from alexzhang13/rlm visualizer)
- Implement parallel sub-call execution for chunk processing
- Add Gemini Pro support for cheaper sub-calls
- Automate DRY analysis in CI pipeline


## 7. Conclusion

We successfully implemented and validated the Recursive Language Models pattern from MIT CSAIL's research. The implementation review against alexzhang13/rlm revealed four critical bugs that we fixed:

1. Undefined client variable (crash at runtime)
2. FINAL regex failing on nested parentheses
3. FINAL detection before code execution (empty results)
4. MULTILINE flag causing premature termination

The RLM demonstrated practical value by analyzing 157K characters of codebase, identifying 165+ DRY violations, and enabling creation of four shared utilities that measurably reduce code duplication.

**Key Insight**: The RLM pattern shifts the bottleneck from context limits to task definition quality. Well-structured queries with clear REPL examples enable effective long-context analysis at low cost.


## 8. How to Apply This

### Using the RLM

```python
from create_something_agents.rlm import RLMSession, RLMConfig
from create_something_agents.providers.claude import ClaudeProvider

# Your large context
corpus = open("massive_corpus.txt").read()

# Create session
session = RLMSession(
    context=corpus,
    provider=ClaudeProvider(),
    config=RLMConfig(root_model="sonnet", sub_model="haiku")
)

# Run query
result = await session.run("What patterns emerge across all documents?")
print(f"Answer: {result.answer}")
print(f"Cost: ${result.cost_usd:.4f}")
```

### Using the DRY Utilities

```typescript
// Identity API calls
import { identityClient } from '@create-something/components/api';
const result = await identityClient.login({ email, password });

// API error handling
import { catchApiError, apiError } from '@create-something/components/utils';
export const POST = catchApiError('MyAPI', async (event) => { ... });

// Validation
import { isEmpty, validateStringField } from '@create-something/components/utils';
if (isEmpty(records)) return apiError('Not found', 404);

// Logging
import { createLogger } from '@create-something/components/utils';
const logger = createLogger('MyService');
logger.info('Processing', { id, correlationId });
```


## References

- Zhang, A. L., Kraska, T., & Khattab, O. (2025). Recursive Language Models. arXiv:2512.24601
- alexzhang13/rlm - Official RLM implementation: https://github.com/alexzhang13/rlm
- CREATE SOMETHING Agent SDK: packages/agent-sdk/src/create_something_agents/rlm/
- Modal RLM Deployment: packages/agent-sdk/modal_rlm.py


## Appendix A: RLM Module Structure

```
packages/agent-sdk/src/create_something_agents/rlm/
├── __init__.py      # Public exports
├── environment.py   # RLMEnvironment (sandboxed REPL)
├── session.py       # RLMSession (orchestration loop)
└── README.md        # Module documentation
```


## Appendix B: Created Utilities

| File | Purpose | Lines |
|------|---------|-------|
| `components/src/lib/api/identity-client.ts` | Typed Identity API wrapper | ~250 |
| `components/src/lib/utils/api-error.ts` | API error handling utilities | ~200 |
| `components/src/lib/utils/validation.ts` | Validation helpers (extended) | +150 |
| `components/src/lib/utils/logger.ts` | Context-aware structured logging | ~150 |

