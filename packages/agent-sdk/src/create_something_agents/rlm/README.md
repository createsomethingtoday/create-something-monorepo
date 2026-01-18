# RLM (Recursive Language Model) Module

Long-context processing for CREATE SOMETHING agents. Based on MIT CSAIL's paper ["Recursive Language Models"](https://arxiv.org/abs/2512.24601).

## The Problem

LLMs have context windows. Even "long-context" models degrade on tasks requiring dense access to large inputs:
- GPT-5 scores 0% on BrowseComp-Plus (1K documents)
- Performance drops 50%+ as context grows
- Summarization loses critical details

## The Solution

**Treat context as an external variable, not prompt content.**

The model writes Python code to navigate the context, using sub-LM calls for semantic understanding. This enables processing 10M+ tokens with comparable cost.

## Architecture

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

## Quick Start

```python
from create_something_agents.rlm import RLMSession, RLMConfig
from create_something_agents.providers.claude import ClaudeProvider

# Your large context (can be 10M+ characters)
corpus = open("massive_research_corpus.txt").read()

# Create session
provider = ClaudeProvider()
session = RLMSession(
    context=corpus,
    provider=provider,
    config=RLMConfig(
        root_model="sonnet",   # For reasoning
        sub_model="haiku",     # For sub-queries (cheap)
    )
)

# Run query
result = await session.run("What are the key themes across all documents?")

print(f"Answer: {result.answer}")
print(f"Iterations: {result.iterations}")
print(f"Sub-calls: {result.sub_calls}")
print(f"Cost: ${result.cost_usd:.4f}")
```

## Components

### RLMEnvironment

Sandboxed Python REPL with the context as a variable.

```python
from create_something_agents.rlm import RLMEnvironment

env = RLMEnvironment(context="...large text...")

# Execute code
result = env.execute("""
import re
matches = re.findall(r'error: (.*)', context)
print(f"Found {len(matches)} errors")
""")

print(result.output)  # "Found 42 errors"
```

**Built-in helpers:**
- `context` - Your input data
- `results` - Dict to store findings
- `llm_query(prompt)` - Sub-LM call
- `chunk_text(text, size)` - Split by characters
- `chunk_lines(text, n)` - Split by lines
- `re`, `json` - Standard library

### RLMSession

Orchestrates the model ↔ REPL loop.

```python
from create_something_agents.rlm import RLMSession, RLMConfig

config = RLMConfig(
    root_model="sonnet",      # Main reasoning model
    sub_model="haiku",        # Cheap sub-queries
    max_iterations=20,        # Loop limit
    max_sub_calls=100,        # Sub-LM call limit
    track_costs=True,         # Enable cost tracking
)

session = RLMSession(context=data, provider=provider, config=config)
result = await session.run("Your question here")
```

### RLMResult

```python
@dataclass
class RLMResult:
    success: bool              # Did we get a FINAL() answer?
    answer: str | None         # The answer
    iterations: int            # REPL loop iterations
    sub_calls: int             # Number of llm_query() calls
    cost_usd: float            # Estimated cost
    trajectory: list[dict]     # Execution history
    error: str | None          # Error if failed
```

## Model Routing

RLM uses two models for cost efficiency:

| Role | Default | Purpose |
|------|---------|---------|
| Root | Sonnet | Planning, synthesis, final answer |
| Sub-calls | Haiku | Semantic understanding of chunks |

**Why Haiku for sub-calls?** The paper shows Haiku achieves 90% of Sonnet's performance on bounded tasks while costing 10x less.

## Production: Modal Deployment

For production use, deploy to Modal for sandboxed execution:

```bash
cd packages/agent-sdk
modal deploy modal_rlm.py
```

Then call via Python:

```python
from modal_rlm import run_rlm_remote

result = run_rlm_remote.remote(
    context=massive_corpus,
    query="What patterns exist?",
    root_model="sonnet",
    sub_model="haiku",
)
```

Or via HTTP:

```bash
curl -X POST https://createsomethingtoday--rlm-session-run-rlm-session.modal.run \
  -H "Content-Type: application/json" \
  -d '{"context": "...", "query": "What patterns exist?"}'
```

## Cost Estimation

| Task Type | Context | Est. Cost |
|-----------|---------|-----------|
| Simple aggregation | 100K chars | ~$0.05 |
| Multi-doc synthesis | 1M chars | ~$0.30 |
| Deep codebase analysis | 5M chars | ~$1.00 |

**Compare to**: Direct Sonnet call on 1M chars costs ~$3 and likely fails.

## Paper Results

From the MIT CSAIL paper:

| Task | Base GPT-5 | RLM |
|------|------------|-----|
| BrowseComp-Plus (1K docs) | 0% | **91%** |
| OOLONG (aggregation) | 44% | **56%** |
| OOLONG-Pairs (pairwise) | 0.04% | **58%** |
| CodeQA (repo understanding) | 24% | **62%** |

## Files

- `environment.py` - RLMEnvironment class
- `session.py` - RLMSession orchestrator
- `__init__.py` - Public exports

## Testing

```bash
cd packages/agent-sdk

# Unit tests (no API key needed)
pytest tests/test_rlm.py -v

# Integration tests (requires ANTHROPIC_API_KEY)
pytest tests/test_rlm.py -v -m integration
```

## References

- [Recursive Language Models (arxiv:2512.24601)](https://arxiv.org/abs/2512.24601)
- [Modal Documentation](https://modal.com/docs)
- [CREATE SOMETHING Agent SDK](../README.md)
