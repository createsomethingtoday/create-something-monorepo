---
name: rlm-patterns
description: When and how to use RLM (Recursive Language Model) for long-context tasks
---

# RLM (Recursive Language Model) Patterns

RLM enables processing of contexts far beyond the model's context window (10M+ tokens).
Based on MIT CSAIL paper (arxiv:2512.24601).

## When to Use RLM

**Use RLM when:**
- Research task requires synthesizing 10+ documents
- Codebase analysis spans 50+ files
- Need to count/aggregate across ALL items (not just sample)
- Context overflow has occurred on similar tasks

**Don't use RLM when:**
- Task is simple grep/search (use Grep tool)
- Only need to summarize (standard model is fine)
- Working with <50K tokens of context
- Speed is critical (RLM has iteration overhead)

## Quick Start

### Local Development

```python
from create_something_agents.rlm import RLMSession, RLMConfig
from create_something_agents.providers.claude import ClaudeProvider

# Load your large corpus
with open("research_corpus.txt") as f:
    corpus = f.read()  # Can be 10M+ characters

# Create session
provider = ClaudeProvider()
config = RLMConfig(
    root_model="sonnet",   # Reasoning/synthesis
    sub_model="haiku",     # Cheap sub-queries
    max_iterations=20,
    max_sub_calls=100,
)

session = RLMSession(context=corpus, provider=provider, config=config)
result = await session.run("What patterns emerge across all documents?")

print(f"Answer: {result.answer}")
print(f"Cost: ${result.cost_usd:.4f}")
```

### Production (Modal)

```bash
# Deploy once
modal deploy packages/agent-sdk/modal_rlm.py

# Use via Python
from modal_rlm import run_rlm_remote
result = run_rlm_remote.remote(context=corpus, query="What patterns exist?")
```

## How RLM Works

The key insight: **context is a variable, not prompt content**.

```
ROOT MODEL: "Your context is stored in variable 'context'. Write code to explore it."
    |
    v
REPL ENVIRONMENT:
  context = "...10M characters..."  # NOT in prompt
  results = {}
  llm_query(prompt) -> sub-model call
    |
    v
EXECUTION LOOP:
  1. Model generates ```repl code
  2. Code executes (regex, filtering, chunking)
  3. llm_query() for semantic understanding
  4. Results fed back to model
  5. Repeat until FINAL() answer
```

## Code Patterns

### Pattern 1: Document Discovery
```python
import re
docs = re.split(r'\n---\n', context)
print(f"Found {len(docs)} documents")
```

### Pattern 2: Keyword Filtering
```python
keyword = "authentication"
relevant = [d for d in docs if keyword.lower() in d.lower()]
print(f"{len(relevant)} docs mention '{keyword}'")
```

### Pattern 3: Semantic Classification
```python
for i, doc in enumerate(relevant[:10]):
    category = llm_query(f"Classify in one word: {doc[:2000]}")
    results[f'doc_{i}'] = category.strip()
    print(f"Doc {i}: {category.strip()}")
```

### Pattern 4: Final Answer
```python
FINAL_VAR(results)  # Return variable
# or
FINAL(The main patterns are X, Y, Z)  # Direct answer
```

## Model Routing

| Role | Model | Cost | Use |
|------|-------|------|-----|
| Root | Sonnet | ~$0.01 | Planning, synthesis |
| Sub-calls | Haiku | ~$0.001 | Chunk understanding |

## References

- Paper: arxiv:2512.24601 (MIT CSAIL)
- Code: `packages/agent-sdk/src/create_something_agents/rlm/`
- Modal: `packages/agent-sdk/modal_rlm.py`
