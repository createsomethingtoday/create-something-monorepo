"""
RLM Environment

Sandboxed Python REPL environment for RLM-style context management.
The context is a variable in the environment, not in the model's prompt.

Based on MIT CSAIL's "Recursive Language Models" paper (arxiv:2512.24601).
"""

from __future__ import annotations

import io
import re
import sys
import traceback
from contextlib import redirect_stdout, redirect_stderr
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class ExecutionResult:
    """Result of code execution in the RLM environment."""

    success: bool
    output: str
    error: str | None = None
    variables_changed: list[str] = field(default_factory=list)


class RLMEnvironment:
    """
    Sandboxed Python REPL environment for RLM execution.

    Key capabilities:
    1. 'context' variable holds the (potentially massive) input
    2. 'llm_query()' function for recursive sub-LM calls
    3. Standard Python for filtering, chunking, aggregation
    4. Isolated execution with output capture

    Philosophy: The model writes code to navigate context rather than
    having context injected into its prompt. This enables handling
    inputs far beyond the model's context window.
    """

    def __init__(
        self,
        context: str | list[str],
        llm_query_fn: Callable[[str], str] | None = None,
        max_output_chars: int = 50000,
    ):
        """
        Initialize RLM environment.

        Args:
            context: The input context (string or list of strings/documents)
            llm_query_fn: Function to call sub-LM (injected by RLMSession)
            max_output_chars: Maximum output to capture (prevents runaway)
        """
        self.max_output_chars = max_output_chars

        # Initialize namespace with context and utilities
        self._namespace: dict[str, Any] = {
            "context": context,
            "results": {},  # For storing intermediate results
            "__builtins__": __builtins__,
        }

        # Track which variables have been modified
        self._initial_vars = set(self._namespace.keys())

        # Inject llm_query if provided
        if llm_query_fn:
            self._namespace["llm_query"] = llm_query_fn

        # Add helper utilities
        self._add_utilities()

    def _add_utilities(self) -> None:
        """Add helper utilities to the namespace."""
        # Standard library imports available by default
        import json
        import re as regex_module

        self._namespace["json"] = json
        self._namespace["re"] = regex_module

        # Helper for chunking text
        def chunk_text(text: str, chunk_size: int = 10000) -> list[str]:
            """Split text into chunks of approximately chunk_size characters."""
            chunks = []
            while text:
                chunks.append(text[:chunk_size])
                text = text[chunk_size:]
            return chunks

        # Helper for chunking by lines
        def chunk_lines(text: str, lines_per_chunk: int = 100) -> list[str]:
            """Split text into chunks of N lines each."""
            lines = text.split("\n")
            chunks = []
            for i in range(0, len(lines), lines_per_chunk):
                chunk = "\n".join(lines[i : i + lines_per_chunk])
                chunks.append(chunk)
            return chunks

        self._namespace["chunk_text"] = chunk_text
        self._namespace["chunk_lines"] = chunk_lines

    @property
    def context_info(self) -> dict[str, Any]:
        """Get information about the context for the system prompt."""
        context = self._namespace["context"]

        if isinstance(context, str):
            return {
                "type": "string",
                "total_chars": len(context),
                "total_lines": context.count("\n") + 1,
                "preview": context[:500] + "..." if len(context) > 500 else context,
            }
        elif isinstance(context, list):
            total_chars = sum(len(str(item)) for item in context)
            return {
                "type": "list",
                "num_items": len(context),
                "total_chars": total_chars,
                "item_lengths": [len(str(item)) for item in context[:10]],  # First 10
            }
        else:
            return {
                "type": type(context).__name__,
                "repr": repr(context)[:500],
            }

    def execute(self, code: str) -> ExecutionResult:
        """
        Execute Python code in the sandboxed environment.

        Args:
            code: Python code to execute

        Returns:
            ExecutionResult with output and any errors
        """
        # Capture stdout and stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        # Track variables before execution
        vars_before = set(self._namespace.keys())

        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                # Execute the code
                exec(code, self._namespace)

            # Get output
            stdout_output = stdout_capture.getvalue()
            stderr_output = stderr_capture.getvalue()

            # Truncate if too long
            if len(stdout_output) > self.max_output_chars:
                stdout_output = (
                    stdout_output[: self.max_output_chars]
                    + f"\n... [truncated, {len(stdout_output)} total chars]"
                )

            output = stdout_output
            if stderr_output:
                output += f"\n[stderr]: {stderr_output}"

            # Track changed variables
            vars_after = set(self._namespace.keys())
            new_vars = list(vars_after - vars_before)

            return ExecutionResult(
                success=True,
                output=output,
                variables_changed=new_vars,
            )

        except Exception as e:
            # Get traceback but sanitize it
            tb = traceback.format_exc()
            # Remove file paths for cleaner output
            tb = re.sub(r'File "[^"]+", ', 'File "<repl>", ', tb)

            return ExecutionResult(
                success=False,
                output=stdout_capture.getvalue(),
                error=f"{type(e).__name__}: {e}\n{tb}",
            )

    def get_variable(self, name: str) -> Any:
        """Get a variable from the namespace."""
        return self._namespace.get(name)

    def set_variable(self, name: str, value: Any) -> None:
        """Set a variable in the namespace."""
        self._namespace[name] = value

    def list_variables(self) -> dict[str, str]:
        """List all user-defined variables with their types."""
        skip = {"__builtins__", "json", "re", "chunk_text", "chunk_lines", "llm_query"}
        return {
            name: type(value).__name__
            for name, value in self._namespace.items()
            if name not in skip and not name.startswith("_")
        }
