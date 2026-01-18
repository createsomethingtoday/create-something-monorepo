"""
RLM Research Agent

Research agent enhanced with RLM (Recursive Language Model) pattern for
processing large document corpora. Unlike the standard research agent,
this agent can synthesize findings across 10M+ tokens.

Based on MIT CSAIL's "Recursive Language Models" paper (arxiv:2512.24601).

Philosophy: Research tasks often require dense access to many documents.
Traditional summarization loses detail. RLM enables programmatic navigation
with semantic understanding via sub-LM calls.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class RLMResearchConfig:
    """Configuration for RLM research sessions."""

    # Model routing (aligns with CREATE SOMETHING patterns)
    root_model: str = "sonnet"  # Planning/synthesis
    sub_model: str = "haiku"  # Cheap sub-queries

    # Execution limits
    max_iterations: int = 25
    max_sub_calls: int = 150  # More sub-calls for research

    # Output
    output_path: str | None = None
    create_beads_issues: bool = True


# Research-specific system prompt extending base RLM prompt
RLM_RESEARCH_SYSTEM_PROMPT = '''You are a research agent for CREATE SOMETHING using the RLM (Recursive Language Model) pattern.

## Research Context

Your context is a {context_type} with {context_chars:,} total characters.
{context_details}

## Research Methodology

1. **Survey**: Probe context structure, identify document boundaries
2. **Categorize**: Use llm_query() to classify document types/topics
3. **Extract**: Pull specific facts, quotes, patterns per document
4. **Cross-Reference**: Find connections across documents
5. **Synthesize**: Build coherent findings from distributed evidence

## Available Tools

- `context` - The research corpus (may be very large)
- `llm_query(prompt)` - Semantic analysis (~500K char capacity)
- `results` - Store findings (use structured keys)
- `chunk_text(text, size)`, `chunk_lines(text, n)` - Chunking helpers
- `re`, `json`, `print()`

## Code Patterns for Research

### Pattern 1: Document Boundary Detection
```repl
# Find document separators
import re
separators = re.findall(r'(Document \\d+:|------|#+\\s+)', context)
print(f"Found {{len(separators)}} potential document boundaries")
```

### Pattern 2: Topic Extraction per Document
```repl
# Extract topics from each section
sections = re.split(r'Document \\d+:', context)[1:]
results['topics'] = []
for i, section in enumerate(sections[:5]):  # First 5
    topic = llm_query(f"What is the main topic of this section? One line.\\n{{section[:2000]}}")
    results['topics'].append({{'doc': i+1, 'topic': topic.strip()}})
    print(f"Doc {{i+1}}: {{topic.strip()}}")
```

### Pattern 3: Cross-Document Pattern Finding
```repl
# Find patterns mentioned in multiple docs
pattern_query = "authentication"
matches = []
for i, section in enumerate(sections):
    if pattern_query.lower() in section.lower():
        excerpt = llm_query(f"Extract the key point about '{{pattern_query}}' from:\\n{{section[:3000]}}")
        matches.append({{'doc': i+1, 'finding': excerpt.strip()}})
print(f"Found {{len(matches)}} docs mentioning '{{pattern_query}}'")
results['pattern_matches'] = matches
```

### Pattern 4: Synthesis
```repl
# Synthesize findings
findings_summary = json.dumps(results, indent=2)
synthesis = llm_query(f"""Based on these research findings, provide a synthesis:

{{findings_summary}}

Format:
1. Key Themes (3-5 bullet points)
2. Contradictions or Gaps
3. Implications for CREATE SOMETHING
""")
results['synthesis'] = synthesis
print(synthesis)
```

## Output Format

Structure your final answer as:

```markdown
# Research: [Topic]

## Summary
[2-3 sentence overview based on evidence found]

## Findings

### Theme 1: [Name]
- Evidence from Doc X: [quote/paraphrase]
- Evidence from Doc Y: [quote/paraphrase]
- Implication: [what this means]

### Theme 2: [Name]
...

## Cross-Document Patterns
[Patterns that appear across multiple sources]

## Gaps and Contradictions
[What the research doesn't answer or where sources disagree]

## Follow-Up Tasks
- [ ] Task 1 (create as Beads issue)
- [ ] Task 2 (create as Beads issue)

## Sources
[List documents referenced with key contributions]
```

## Final Answer

When research is complete:
FINAL_VAR(results)  # If results dict is comprehensive
or
FINAL(Your markdown-formatted research report)

## Important

- ALWAYS cite which document evidence comes from
- Use llm_query() for semantic understanding, code for navigation
- Store intermediate findings in results dict
- Be honest about gaps - what the corpus doesn't answer
'''


async def run_rlm_research(
    corpus: str | list[str],
    research_question: str,
    config: RLMResearchConfig | None = None,
) -> dict[str, Any]:
    """
    Run RLM-enhanced research on a document corpus.

    This is the high-level API for research tasks. For production use,
    deploy via Modal for sandboxed execution.

    Args:
        corpus: Document corpus (string or list of documents)
        research_question: The research question to answer
        config: Research configuration

    Returns:
        Research results including findings, synthesis, and metadata
    """
    config = config or RLMResearchConfig()

    # Try to use Modal if available (production)
    try:
        from modal_rlm import run_rlm_remote

        result = run_rlm_remote.remote(
            context=corpus,
            query=research_question,
            root_model=config.root_model,
            sub_model=config.sub_model,
            max_iterations=config.max_iterations,
            max_sub_calls=config.max_sub_calls,
        )
        return result

    except ImportError:
        # Fall back to local execution (development)
        from create_something_agents.providers.claude import ClaudeProvider
        from create_something_agents.rlm import RLMSession, RLMConfig

        provider = ClaudeProvider()

        rlm_config = RLMConfig(
            root_model=config.root_model,
            sub_model=config.sub_model,
            max_iterations=config.max_iterations,
            max_sub_calls=config.max_sub_calls,
        )

        # Build research-specific system prompt
        if isinstance(corpus, str):
            context_type = "string"
            context_chars = len(corpus)
            context_details = f"Lines: {corpus.count(chr(10)) + 1}"
        else:
            context_type = "list"
            context_chars = sum(len(str(item)) for item in corpus)
            context_details = f"Documents: {len(corpus)}"

        session = RLMSession(
            context=corpus,
            provider=provider,
            config=rlm_config,
        )

        # Override system prompt with research-specific version
        session.system_prompt = RLM_RESEARCH_SYSTEM_PROMPT.format(
            context_type=context_type,
            context_chars=context_chars,
            context_details=context_details,
        )

        result = await session.run(research_question)

        return {
            "success": result.success,
            "answer": result.answer,
            "iterations": result.iterations,
            "sub_calls": result.sub_calls,
            "cost_usd": result.cost_usd,
            "trajectory": result.trajectory,
            "error": result.error,
        }


def create_research_corpus_from_files(file_paths: list[str]) -> str:
    """
    Helper to create a research corpus from multiple files.

    Args:
        file_paths: List of file paths to read

    Returns:
        Combined corpus with document markers
    """
    import os

    documents = []
    for i, path in enumerate(file_paths, 1):
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            doc_name = os.path.basename(path)
            documents.append(f"Document {i}: {doc_name}\n{'=' * 50}\n{content}")
        else:
            documents.append(f"Document {i}: {path}\n[FILE NOT FOUND]")

    return "\n\n".join(documents)


# Convenience function for CLI/script usage
if __name__ == "__main__":
    import asyncio
    import sys

    async def main():
        if len(sys.argv) < 3:
            print("Usage: python rlm_research_agent.py <corpus_file> <question>")
            print("Example: python rlm_research_agent.py docs.txt 'What patterns exist?'")
            sys.exit(1)

        corpus_file = sys.argv[1]
        question = sys.argv[2]

        with open(corpus_file, "r") as f:
            corpus = f.read()

        print(f"Corpus: {len(corpus):,} characters")
        print(f"Question: {question}")
        print("-" * 50)

        result = await run_rlm_research(corpus, question)

        print(f"Success: {result.get('success')}")
        print(f"Iterations: {result.get('iterations')}")
        print(f"Sub-calls: {result.get('sub_calls')}")
        print(f"Cost: ${result.get('cost_usd', 0):.4f}")
        print("-" * 50)
        print(result.get("answer"))

    asyncio.run(main())
