"""
Modal Deployment for RLM (Recursive Language Model) Sessions

Sandboxed execution environment for RLM-style long-context processing.
Based on MIT CSAIL's "Recursive Language Models" paper (arxiv:2512.24601).

Deploy: modal deploy modal_rlm.py
Test locally: modal run modal_rlm.py

Philosophy: The context recedes into the environment. Modal provides
isolated, secure execution for the REPL operations.
"""

import modal
from pydantic import BaseModel

# Define the image with dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "anthropic>=0.40.0",
    "google-genai>=1.0.0",
    "pydantic>=2.0",
    "httpx>=0.27.0",
)

app = modal.App(
    "rlm-session",
    image=image,
    secrets=[
        modal.Secret.from_name("anthropic-api-key"),  # ANTHROPIC_API_KEY
        modal.Secret.from_name("google-api-key"),  # GOOGLE_API_KEY (for Gemini sub-calls)
    ],
)


class RLMRequest(BaseModel):
    """Request body for RLM session endpoint."""

    context: str | list[str]
    query: str
    root_model: str = "sonnet"
    sub_model: str = "haiku"
    max_iterations: int = 20
    max_sub_calls: int = 100


class RLMResponse(BaseModel):
    """Response from RLM session."""

    success: bool
    answer: str | None
    iterations: int
    sub_calls: int
    cost_usd: float
    error: str | None = None


def _run_rlm_impl(
    context: str | list[str],
    query: str,
    root_model: str = "sonnet",
    sub_model: str = "haiku",
    max_iterations: int = 20,
    max_sub_calls: int = 100,
) -> dict:
    """
    Core RLM implementation running in Modal's sandboxed environment.

    This is the production version - code executes in isolated Modal container.
    """
    import asyncio
    import io
    import json
    import os
    import re
    import sys
    import traceback
    from contextlib import redirect_stderr, redirect_stdout

    from anthropic import Anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"success": False, "error": "ANTHROPIC_API_KEY not configured"}

    client = Anthropic(api_key=api_key)

    # Model aliases
    model_map = {
        "haiku": "claude-3-5-haiku-20241022",
        "sonnet": "claude-sonnet-4-20250514",
        "opus": "claude-opus-4-20250514",
    }

    root_model_full = model_map.get(root_model, root_model)
    sub_model_full = model_map.get(sub_model, sub_model)

    # Cost tracking
    total_input_tokens = 0
    total_output_tokens = 0
    sub_call_count = 0

    # Initialize REPL environment
    env_namespace = {
        "context": context,
        "results": {},
        "__builtins__": __builtins__,
        "json": json,
        "re": re,
    }

    # Helper functions
    def chunk_text(text: str, chunk_size: int = 10000) -> list[str]:
        chunks = []
        while text:
            chunks.append(text[:chunk_size])
            text = text[chunk_size:]
        return chunks

    def chunk_lines(text: str, lines_per_chunk: int = 100) -> list[str]:
        lines = text.split("\n")
        chunks = []
        for i in range(0, len(lines), lines_per_chunk):
            chunks.append("\n".join(lines[i : i + lines_per_chunk]))
        return chunks

    env_namespace["chunk_text"] = chunk_text
    env_namespace["chunk_lines"] = chunk_lines

    # Sub-LM query function
    def llm_query(prompt: str) -> str:
        nonlocal sub_call_count, total_input_tokens, total_output_tokens

        if sub_call_count >= max_sub_calls:
            return "[ERROR: Max sub-LM calls reached]"

        sub_call_count += 1

        try:
            response = client.messages.create(
                model=sub_model_full,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )

            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            return response.content[0].text
        except Exception as e:
            return f"[ERROR: {e}]"

    env_namespace["llm_query"] = llm_query

    # Build context info for system prompt
    if isinstance(context, str):
        context_type = "string"
        context_chars = len(context)
        context_details = f"Lines: {context.count(chr(10)) + 1}"
    else:
        context_type = "list"
        context_chars = sum(len(str(item)) for item in context)
        context_details = f"Items: {len(context)}"

    system_prompt = f'''You are tasked with answering a query using a large context stored in a Python REPL environment.

## Environment

Context type: {context_type}
Total characters: {context_chars:,}
{context_details}

Available:
- `context` - The input data
- `llm_query(prompt)` - Call sub-LM for semantic understanding
- `results` - Dictionary to store findings
- `chunk_text(text, size)`, `chunk_lines(text, n)` - Chunking helpers
- `re`, `json`, `print()`

## Strategy

1. Probe context structure
2. Filter with regex/code
3. Use llm_query() for semantic understanding
4. Aggregate findings

## Code Execution

Write code in ```repl blocks:

```repl
print(f"Context length: {{len(context)}}")
print(context[:500])
```

## Final Answer

FINAL(your answer) or FINAL_VAR(variable_name)
'''

    # Execute code in sandbox
    def execute_code(code: str) -> tuple[bool, str, str | None]:
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, env_namespace)

            output = stdout_capture.getvalue()
            if len(output) > 50000:
                output = output[:50000] + "\n[truncated]"

            stderr = stderr_capture.getvalue()
            if stderr:
                output += f"\n[stderr]: {stderr}"

            return True, output, None

        except Exception as e:
            tb = traceback.format_exc()
            return False, stdout_capture.getvalue(), f"{type(e).__name__}: {e}\n{tb}"

    # Main loop
    conversation = [{"role": "user", "content": query}]
    trajectory = []

    for iteration in range(max_iterations):
        # Build messages text
        messages_for_api = []
        for msg in conversation:
            messages_for_api.append(msg)

        try:
            response = client.messages.create(
                model=root_model_full,
                max_tokens=8192,
                system=system_prompt,
                messages=messages_for_api,
            )

            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            assistant_response = response.content[0].text

        except Exception as e:
            return {
                "success": False,
                "answer": None,
                "iterations": iteration + 1,
                "sub_calls": sub_call_count,
                "cost_usd": 0,
                "error": str(e),
            }

        # Check for final answer
        final_match = re.search(r"FINAL\(([^)]+)\)", assistant_response)
        final_var_match = re.search(r"FINAL_VAR\((\w+)\)", assistant_response)

        if final_match:
            answer = final_match.group(1).strip()
            cost = _calculate_cost(
                total_input_tokens, total_output_tokens, root_model, sub_model
            )
            return {
                "success": True,
                "answer": answer,
                "iterations": iteration + 1,
                "sub_calls": sub_call_count,
                "cost_usd": cost,
                "trajectory": trajectory,
            }

        if final_var_match:
            var_name = final_var_match.group(1)
            answer = env_namespace.get(var_name)
            cost = _calculate_cost(
                total_input_tokens, total_output_tokens, root_model, sub_model
            )
            return {
                "success": True,
                "answer": str(answer) if answer is not None else None,
                "iterations": iteration + 1,
                "sub_calls": sub_call_count,
                "cost_usd": cost,
                "trajectory": trajectory,
            }

        # Extract and execute code blocks
        code_blocks = re.findall(r"```repl\n(.*?)```", assistant_response, re.DOTALL)

        execution_outputs = []
        for code in code_blocks:
            success, output, error = execute_code(code.strip())
            exec_result = (
                f"[Execution {'succeeded' if success else 'failed'}]\n{output}"
            )
            if error:
                exec_result += f"\n[Error]: {error}"
            execution_outputs.append(exec_result)

            trajectory.append(
                {
                    "iteration": iteration + 1,
                    "code": code.strip()[:500],
                    "success": success,
                    "output": output[:500],
                }
            )

        # Update conversation
        conversation.append({"role": "assistant", "content": assistant_response})

        if execution_outputs:
            feedback = "\n\n".join(execution_outputs)
            conversation.append(
                {
                    "role": "user",
                    "content": f"Execution results:\n\n{feedback}\n\nContinue or provide FINAL() answer.",
                }
            )
        else:
            conversation.append(
                {
                    "role": "user",
                    "content": "No code executed. Write ```repl blocks or provide FINAL() answer.",
                }
            )

    # Max iterations
    cost = _calculate_cost(total_input_tokens, total_output_tokens, root_model, sub_model)
    return {
        "success": False,
        "answer": None,
        "iterations": max_iterations,
        "sub_calls": sub_call_count,
        "cost_usd": cost,
        "error": "Max iterations reached",
        "trajectory": trajectory,
    }


def _calculate_cost(
    input_tokens: int, output_tokens: int, root_model: str, sub_model: str
) -> float:
    """Calculate approximate cost based on token usage."""
    # Costs per 1M tokens (approximate, mixed models)
    costs = {
        "haiku": {"input": 1.00, "output": 5.00},
        "sonnet": {"input": 3.00, "output": 15.00},
        "opus": {"input": 15.00, "output": 75.00},
    }

    # Use average of root and sub model costs as approximation
    root_costs = costs.get(root_model, costs["sonnet"])
    sub_costs = costs.get(sub_model, costs["haiku"])

    # Rough 70/30 split assumption (root does more tokens)
    avg_input = root_costs["input"] * 0.7 + sub_costs["input"] * 0.3
    avg_output = root_costs["output"] * 0.7 + sub_costs["output"] * 0.3

    input_cost = (input_tokens / 1_000_000) * avg_input
    output_cost = (output_tokens / 1_000_000) * avg_output

    return round(input_cost + output_cost, 6)


@app.function(timeout=600)  # 10 minute timeout for long sessions
@modal.fastapi_endpoint(method="POST")
def run_rlm_session(request: RLMRequest) -> RLMResponse:
    """
    Run an RLM session (web endpoint).

    POST https://createsomethingtoday--rlm-session-run-rlm-session.modal.run
    Body: {"context": "...", "query": "What patterns exist?", ...}
    """
    result = _run_rlm_impl(
        context=request.context,
        query=request.query,
        root_model=request.root_model,
        sub_model=request.sub_model,
        max_iterations=request.max_iterations,
        max_sub_calls=request.max_sub_calls,
    )

    return RLMResponse(
        success=result.get("success", False),
        answer=result.get("answer"),
        iterations=result.get("iterations", 0),
        sub_calls=result.get("sub_calls", 0),
        cost_usd=result.get("cost_usd", 0),
        error=result.get("error"),
    )


@app.function(timeout=600)
def run_rlm_remote(
    context: str | list[str],
    query: str,
    root_model: str = "sonnet",
    sub_model: str = "haiku",
    max_iterations: int = 20,
    max_sub_calls: int = 100,
) -> dict:
    """
    Run RLM session (callable via .remote() for programmatic use).
    """
    return _run_rlm_impl(
        context=context,
        query=query,
        root_model=root_model,
        sub_model=sub_model,
        max_iterations=max_iterations,
        max_sub_calls=max_sub_calls,
    )


@app.function()
@modal.fastapi_endpoint(method="GET")
def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "rlm-session"}


# Local testing entrypoint
@app.local_entrypoint()
def main():
    """Test locally with: modal run modal_rlm.py"""

    # Create a test context (simulating a large document corpus)
    test_context = """
Document 1: Authentication System Design
The authentication system uses JWT tokens with RS256 signing.
Users can authenticate via email/password or OAuth providers.
Session tokens expire after 24 hours.

Document 2: API Rate Limiting
Rate limits are enforced at 100 requests per minute per user.
Enterprise accounts have elevated limits of 1000 rpm.
Rate limit headers are included in all responses.

Document 3: Database Schema
Users table contains id, email, password_hash, created_at.
Sessions table contains id, user_id, token, expires_at.
Foreign key constraints ensure referential integrity.

Document 4: Security Audit Findings
Finding 1: Password hashing uses bcrypt with cost factor 12.
Finding 2: All API endpoints require authentication.
Finding 3: SQL injection prevented via parameterized queries.
""".strip()

    query = "What security measures are implemented across these documents? List them."

    print("Running RLM session...")
    print(f"Context length: {len(test_context)} chars")
    print(f"Query: {query}")
    print("-" * 50)

    result = run_rlm_remote.remote(
        context=test_context,
        query=query,
        root_model="sonnet",
        sub_model="haiku",
        max_iterations=10,
    )

    print(f"Success: {result.get('success')}")
    print(f"Iterations: {result.get('iterations')}")
    print(f"Sub-calls: {result.get('sub_calls')}")
    print(f"Cost: ${result.get('cost_usd', 0):.6f}")
    print("-" * 50)
    print(f"Answer: {result.get('answer')}")

    if result.get("error"):
        print(f"Error: {result.get('error')}")
