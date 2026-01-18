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


def extract_follow_up_tasks(answer: str) -> list[dict[str, str]]:
    """
    Extract follow-up tasks from research answer.

    Looks for patterns like:
    - [ ] Task description
    - Follow-up: Task description
    - TODO: Task description

    Args:
        answer: The research answer text

    Returns:
        List of task dicts with 'title' and 'priority' keys
    """
    import re

    tasks = []

    # Pattern 1: Markdown checkboxes
    checkbox_pattern = r"- \[ \] (.+?)(?:\n|$)"
    for match in re.finditer(checkbox_pattern, answer):
        task = match.group(1).strip()
        if task and len(task) > 5:
            tasks.append({"title": task, "priority": 2})

    # Pattern 2: Follow-up: lines
    followup_pattern = r"(?:Follow-up|TODO|Action):\s*(.+?)(?:\n|$)"
    for match in re.finditer(followup_pattern, answer, re.IGNORECASE):
        task = match.group(1).strip()
        if task and len(task) > 5 and task not in [t["title"] for t in tasks]:
            tasks.append({"title": task, "priority": 2})

    return tasks


def create_beads_issues_from_research(
    tasks: list[dict[str, str]],
    research_topic: str,
    labels: list[str] | None = None,
) -> list[str]:
    """
    Create Beads issues from extracted research tasks.

    Args:
        tasks: List of task dicts from extract_follow_up_tasks()
        research_topic: The research topic (for context in issue title)
        labels: Additional labels to add

    Returns:
        List of created issue IDs
    """
    from create_something_agents.tools.beads import execute_beads

    created_ids = []
    base_labels = ["research", "rlm-discovered"]
    if labels:
        base_labels.extend(labels)

    for task in tasks:
        # Prefix with research context if not already present
        title = task["title"]
        if not title.lower().startswith(("research", "investigate", "explore")):
            title = f"[Research: {research_topic[:30]}] {title}"

        result = execute_beads(
            action="create",
            title=title,
            priority=task.get("priority", 2),
            labels=base_labels,
        )

        # Try to extract issue ID from result
        if "csm-" in result.lower() or "cs-" in result.lower():
            # Extract the issue ID
            import re

            match = re.search(r"(csm?-[a-zA-Z0-9]+)", result, re.IGNORECASE)
            if match:
                created_ids.append(match.group(1))

    return created_ids


def save_research_output(
    result: dict[str, Any],
    output_path: str,
    research_question: str,
) -> None:
    """
    Save research results to a file.

    Args:
        result: Research result dict
        output_path: Path to save output
        research_question: The original question
    """
    import json
    from datetime import datetime

    output = {
        "research_question": research_question,
        "timestamp": datetime.now().isoformat(),
        "success": result.get("success"),
        "answer": result.get("answer"),
        "metadata": {
            "iterations": result.get("iterations"),
            "sub_calls": result.get("sub_calls"),
            "cost_usd": result.get("cost_usd"),
        },
    }

    # Determine format from extension
    if output_path.endswith(".json"):
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
    else:
        # Markdown format
        with open(output_path, "w") as f:
            f.write(f"# Research: {research_question}\n\n")
            f.write(f"*Generated: {output['timestamp']}*\n\n")
            f.write(f"**Cost**: ${output['metadata']['cost_usd']:.4f} | ")
            f.write(f"**Iterations**: {output['metadata']['iterations']} | ")
            f.write(f"**Sub-calls**: {output['metadata']['sub_calls']}\n\n")
            f.write("---\n\n")
            f.write(result.get("answer") or "(No answer)")


# CLI interface
def cli():
    """Command-line interface for RLM research."""
    import argparse
    import asyncio

    parser = argparse.ArgumentParser(
        description="RLM Research Agent - Long-context document synthesis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic research
  python rlm_research_agent.py corpus.txt "What patterns exist?"

  # From multiple files
  python rlm_research_agent.py --files doc1.md doc2.md doc3.md -q "Compare approaches"

  # Save output and create Beads issues
  python rlm_research_agent.py corpus.txt "Security review" -o research.md --beads

  # Use specific models
  python rlm_research_agent.py corpus.txt "Analysis" --root opus --sub sonnet
""",
    )

    parser.add_argument(
        "corpus",
        nargs="?",
        help="Path to corpus file (or use --files)",
    )
    parser.add_argument(
        "question",
        nargs="?",
        help="Research question (or use -q)",
    )
    parser.add_argument(
        "-q", "--question",
        dest="question_flag",
        help="Research question",
    )
    parser.add_argument(
        "--files",
        nargs="+",
        help="Multiple files to combine into corpus",
    )
    parser.add_argument(
        "-o", "--output",
        help="Output file path (.md or .json)",
    )
    parser.add_argument(
        "--beads",
        action="store_true",
        help="Create Beads issues from follow-up tasks",
    )
    parser.add_argument(
        "--root",
        default="sonnet",
        choices=["haiku", "sonnet", "opus"],
        help="Root model (default: sonnet)",
    )
    parser.add_argument(
        "--sub",
        default="haiku",
        choices=["haiku", "sonnet", "opus"],
        help="Sub-call model (default: haiku)",
    )
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=25,
        help="Maximum iterations (default: 25)",
    )
    parser.add_argument(
        "--max-sub-calls",
        type=int,
        default=150,
        help="Maximum sub-LM calls (default: 150)",
    )

    args = parser.parse_args()

    # Resolve question
    question = args.question_flag or args.question
    if not question:
        parser.error("Research question required (positional or -q)")

    # Build corpus
    if args.files:
        corpus = create_research_corpus_from_files(args.files)
        print(f"Combined {len(args.files)} files into corpus")
    elif args.corpus:
        with open(args.corpus, "r") as f:
            corpus = f.read()
    else:
        parser.error("Corpus required (file path or --files)")

    print(f"Corpus: {len(corpus):,} characters")
    print(f"Question: {question}")
    print(f"Models: root={args.root}, sub={args.sub}")
    print("-" * 50)

    # Run research
    async def run():
        config = RLMResearchConfig(
            root_model=args.root,
            sub_model=args.sub,
            max_iterations=args.max_iterations,
            max_sub_calls=args.max_sub_calls,
            output_path=args.output,
            create_beads_issues=args.beads,
        )

        result = await run_rlm_research(corpus, question, config)

        print(f"\nSuccess: {result.get('success')}")
        print(f"Iterations: {result.get('iterations')}")
        print(f"Sub-calls: {result.get('sub_calls')}")
        print(f"Cost: ${result.get('cost_usd', 0):.4f}")
        print("-" * 50)

        answer = result.get("answer", "")
        print(answer)

        # Save output if requested
        if args.output:
            save_research_output(result, args.output, question)
            print(f"\nSaved to: {args.output}")

        # Create Beads issues if requested
        if args.beads and answer:
            tasks = extract_follow_up_tasks(answer)
            if tasks:
                print(f"\nCreating {len(tasks)} Beads issues...")
                created = create_beads_issues_from_research(
                    tasks,
                    question[:50],
                    labels=["research"],
                )
                if created:
                    print(f"Created issues: {', '.join(created)}")
            else:
                print("\nNo follow-up tasks found in answer")

        return result

    asyncio.run(run())


# Entry points
if __name__ == "__main__":
    cli()
