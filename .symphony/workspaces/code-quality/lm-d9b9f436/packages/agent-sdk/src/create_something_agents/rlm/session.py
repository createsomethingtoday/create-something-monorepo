"""
RLM Session

Orchestrates the RLM loop: model generates code, environment executes,
model observes output, repeats until final answer.

Based on MIT CSAIL's "Recursive Language Models" paper (arxiv:2512.24601).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from create_something_agents.rlm.environment import RLMEnvironment, ExecutionResult


@dataclass
class RLMConfig:
    """Configuration for RLM session."""

    # Model configuration
    root_model: str = "sonnet"  # Model for root reasoning
    sub_model: str = "haiku"  # Model for sub-LM calls (cheaper)

    # Execution limits
    max_iterations: int = 20  # Maximum REPL iterations
    max_sub_calls: int = 100  # Maximum sub-LM calls
    max_output_chars: int = 50000  # Max output per execution

    # Cost tracking
    track_costs: bool = True


@dataclass
class RLMResult:
    """Result of an RLM session."""

    success: bool
    answer: str | None
    iterations: int
    sub_calls: int
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    cost_usd: float = 0.0
    trajectory: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None


# System prompt based on the paper's approach
RLM_SYSTEM_PROMPT = '''You are tasked with answering a query using a large context. You have access to a Python REPL environment where the context is stored as a variable.

## Environment

Your context is a {context_type} with {context_chars:,} total characters.
{context_details}

The REPL environment provides:
1. `context` - The input data (may be very large)
2. `llm_query(prompt)` - Call a sub-LM for semantic understanding (~500K char capacity)
3. `results` - Dictionary to store intermediate findings
4. `chunk_text(text, size)` - Split text into character chunks
5. `chunk_lines(text, n)` - Split text into N-line chunks
6. Standard Python: `re`, `json`, `print()`

## Strategy

1. **Probe**: Examine context structure (first/last lines, length, format)
2. **Filter**: Use regex/code to narrow relevant sections
3. **Sub-query**: Use `llm_query()` for semantic understanding of chunks
4. **Aggregate**: Combine findings programmatically

## Code Execution

Write Python code in ```repl blocks:

```repl
# Example: Find sections mentioning "authentication"
import re
matches = re.findall(r'.*authentication.*', context, re.IGNORECASE)
print(f"Found {{len(matches)}} matches")
for m in matches[:5]:
    print(f"  - {{m[:100]}}")
```

## Sub-LM Calls

Use `llm_query()` for semantic tasks:

```repl
# Classify a chunk semantically
chunk = context[:5000]
classification = llm_query(f"What category does this text belong to? {{chunk}}")
results['category'] = classification
print(classification)
```

## Final Answer

When ready, provide your answer using FINAL():

FINAL(Your answer here)

Or return a variable:

FINAL_VAR(results)

## Important

- The context may be too large to process at once - chunk it
- Use code for filtering, llm_query() for understanding
- Print outputs to see results between iterations
- Store important findings in `results` dictionary
'''


class RLMSession:
    """
    Manages an RLM session with iterative REPL execution.

    The session:
    1. Creates an environment with the context
    2. Sends system prompt + query to the model
    3. Extracts and executes code blocks
    4. Feeds output back to model
    5. Repeats until FINAL() or max iterations
    """

    def __init__(
        self,
        context: str | list[str],
        provider: Any,  # AgentProvider instance
        config: RLMConfig | None = None,
    ):
        """
        Initialize RLM session.

        Args:
            context: The input context (can be very large)
            provider: Provider for LLM calls (ClaudeProvider, GeminiProvider, etc.)
            config: Session configuration
        """
        self.config = config or RLMConfig()
        self.provider = provider

        # Track sub-call count for cost control
        self._sub_call_count = 0
        self._total_input_tokens = 0
        self._total_output_tokens = 0

        # Create environment with sub-LM function
        self.env = RLMEnvironment(
            context=context,
            llm_query_fn=self._create_llm_query_fn(),
            max_output_chars=self.config.max_output_chars,
        )

        # Build system prompt with context info
        self.system_prompt = self._build_system_prompt()

    def _create_llm_query_fn(self):
        """Create the llm_query function for sub-LM calls."""

        async def llm_query(prompt: str) -> str:
            """Query sub-LM with the given prompt."""
            if self._sub_call_count >= self.config.max_sub_calls:
                return "[ERROR: Max sub-LM calls reached. Aggregate existing findings.]"

            self._sub_call_count += 1

            # Import here to avoid circular dependency
            from create_something_agents.providers.base import ProviderConfig

            config = ProviderConfig(
                task=prompt,
                model=self.config.sub_model,
                max_tokens=4096,
                temperature=0.1,
            )

            result = await self.provider.execute(config)

            if self.config.track_costs:
                self._total_input_tokens += result.input_tokens or 0
                self._total_output_tokens += result.output_tokens or 0

            if result.success:
                return result.output
            else:
                return f"[ERROR: {result.error}]"

        # Return sync wrapper since exec() doesn't handle async well
        import asyncio

        def sync_llm_query(prompt: str) -> str:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # We're in an async context - use run_coroutine_threadsafe
                    import concurrent.futures

                    future = asyncio.run_coroutine_threadsafe(llm_query(prompt), loop)
                    return future.result(timeout=60)
                else:
                    return loop.run_until_complete(llm_query(prompt))
            except RuntimeError:
                # No event loop - create one
                return asyncio.run(llm_query(prompt))

        return sync_llm_query

    def _build_system_prompt(self) -> str:
        """Build system prompt with context information."""
        info = self.env.context_info

        context_type = info["type"]
        context_chars = info.get("total_chars", 0)

        if context_type == "string":
            details = f"Lines: {info.get('total_lines', 'unknown')}"
        elif context_type == "list":
            details = f"Items: {info.get('num_items', 'unknown')}"
        else:
            details = ""

        return RLM_SYSTEM_PROMPT.format(
            context_type=context_type,
            context_chars=context_chars,
            context_details=details,
        )

    async def run(self, query: str) -> RLMResult:
        """
        Run the RLM session to answer a query.

        Args:
            query: The question to answer about the context

        Returns:
            RLMResult with answer and metadata
        """
        from create_something_agents.providers.base import ProviderConfig

        trajectory: list[dict[str, Any]] = []
        conversation: list[dict[str, str]] = []

        # Initial user message
        conversation.append({"role": "user", "content": query})

        for iteration in range(self.config.max_iterations):
            # Use structured messages for proper multi-turn conversation
            config = ProviderConfig(
                task="",  # Not used when messages is provided
                model=self.config.root_model,
                system_prompt=self.system_prompt,
                max_tokens=8192,
                temperature=0.1,
                messages=conversation,  # Pass structured messages directly
            )

            result = await self.provider.execute(config)

            if self.config.track_costs:
                self._total_input_tokens += result.input_tokens or 0
                self._total_output_tokens += result.output_tokens or 0

            if not result.success:
                return RLMResult(
                    success=False,
                    answer=None,
                    iterations=iteration + 1,
                    sub_calls=self._sub_call_count,
                    total_input_tokens=self._total_input_tokens,
                    total_output_tokens=self._total_output_tokens,
                    cost_usd=result.cost_usd or 0,
                    trajectory=trajectory,
                    error=result.error,
                )

            assistant_response = result.output

            # IMPORTANT: Execute code blocks FIRST, before checking for FINAL
            # The model may output code blocks + FINAL_VAR together, expecting
            # us to run the code which populates results, then return results.
            code_blocks = re.findall(r"```repl\n(.*?)```", assistant_response, re.DOTALL)

            execution_outputs: list[str] = []

            for code in code_blocks:
                exec_result = self.env.execute(code.strip())
                execution_outputs.append(
                    f"[Execution {'succeeded' if exec_result.success else 'failed'}]\n"
                    f"{exec_result.output}"
                    + (f"\n[Error]: {exec_result.error}" if exec_result.error else "")
                )

                trajectory.append(
                    {
                        "iteration": iteration + 1,
                        "type": "execution",
                        "code": code.strip(),
                        "success": exec_result.success,
                        "output": exec_result.output[:1000],  # Truncate for trajectory
                        "error": exec_result.error,
                    }
                )

            # NOW check for final answer (after code execution has populated results)
            # Match FINAL() only when it appears as a standalone statement at end of response
            final_match = re.search(r"(?:^|\n)FINAL\((.+)\)\s*$", assistant_response)
            final_var_match = re.search(r"(?:^|\n)FINAL_VAR\((\w+)\)\s*$", assistant_response)

            if final_match:
                answer = final_match.group(1).strip()
                trajectory.append(
                    {
                        "iteration": iteration + 1,
                        "type": "final",
                        "answer": answer,
                    }
                )
                return RLMResult(
                    success=True,
                    answer=answer,
                    iterations=iteration + 1,
                    sub_calls=self._sub_call_count,
                    total_input_tokens=self._total_input_tokens,
                    total_output_tokens=self._total_output_tokens,
                    cost_usd=self._estimate_total_cost(),
                    trajectory=trajectory,
                )

            if final_var_match:
                var_name = final_var_match.group(1)
                answer = self.env.get_variable(var_name)
                trajectory.append(
                    {
                        "iteration": iteration + 1,
                        "type": "final_var",
                        "variable": var_name,
                        "answer": str(answer),
                    }
                )
                return RLMResult(
                    success=True,
                    answer=str(answer) if answer is not None else None,
                    iterations=iteration + 1,
                    sub_calls=self._sub_call_count,
                    total_input_tokens=self._total_input_tokens,
                    total_output_tokens=self._total_output_tokens,
                    cost_usd=self._estimate_total_cost(),
                    trajectory=trajectory,
                )

            # Add assistant response and execution results to conversation
            conversation.append({"role": "assistant", "content": assistant_response})

            if execution_outputs:
                execution_feedback = "\n\n".join(execution_outputs)
                conversation.append(
                    {
                        "role": "user",
                        "content": f"Execution results:\n\n{execution_feedback}\n\nContinue your analysis or provide FINAL() answer.",
                    }
                )
            else:
                # No code executed - prompt for action
                conversation.append(
                    {
                        "role": "user",
                        "content": "No code was executed. Write ```repl code blocks to explore the context, or provide FINAL() answer.",
                    }
                )

        # Max iterations reached
        return RLMResult(
            success=False,
            answer=None,
            iterations=self.config.max_iterations,
            sub_calls=self._sub_call_count,
            total_input_tokens=self._total_input_tokens,
            total_output_tokens=self._total_output_tokens,
            cost_usd=self._estimate_total_cost(),
            trajectory=trajectory,
            error="Max iterations reached without final answer",
        )

    def _estimate_total_cost(self) -> float:
        """Estimate total cost based on token usage."""
        # Use provider's cost estimation if available
        if hasattr(self.provider, "estimate_cost"):
            return self.provider.estimate_cost(
                self._total_input_tokens,
                self._total_output_tokens,
                self.config.root_model,  # Approximate with root model
            )
        return 0.0
