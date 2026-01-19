"""
Modal Deployment for RLM (Recursive Language Model) Sessions

Sandboxed execution environment for RLM-style long-context processing.
Based on MIT CSAIL's "Recursive Language Models" paper (arxiv:2512.24601).

Deploy: modal deploy modal_rlm.py
Test locally: modal run modal_rlm.py

Philosophy: The context recedes into the environment. Modal provides
isolated, secure execution for the REPL operations.

Enhancements (v2):
- RestrictedPython sandbox for secure code execution
- Gemini Pro support for cost-effective sub-calls
- Parallel sub-call execution for independent chunks
- Based on patterns from ysz/recursive-llm and alexzhang13/rlm
"""

import modal
from pydantic import BaseModel
from typing import Literal

# Define the image with dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "anthropic>=0.40.0",
    "google-genai>=1.0.0",
    "pydantic>=2.0",
    "httpx>=0.27.0",
    "RestrictedPython>=7.0",  # Secure sandbox for code execution
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
    sub_model: str = "haiku"  # Can be "haiku", "gemini-flash", "gemini-pro"
    sub_provider: Literal["claude", "gemini"] = "claude"  # Provider for sub-calls
    max_iterations: int = 20
    max_sub_calls: int = 100
    parallel_sub_calls: bool = False  # Enable parallel execution for independent chunks
    use_restricted_python: bool = True  # Use RestrictedPython sandbox


class RLMResponse(BaseModel):
    """Response from RLM session."""

    success: bool
    answer: str | None
    iterations: int
    sub_calls: int
    cost_usd: float
    error: str | None = None
    parallel_calls_made: int = 0  # Number of parallel batches executed


def _run_rlm_impl(
    context: str | list[str],
    query: str,
    root_model: str = "sonnet",
    sub_model: str = "haiku",
    sub_provider: str = "claude",
    max_iterations: int = 20,
    max_sub_calls: int = 100,
    parallel_sub_calls: bool = False,
    use_restricted_python: bool = True,
) -> dict:
    """
    Core RLM implementation running in Modal's sandboxed environment.

    This is the production version - code executes in isolated Modal container.

    Based on patterns from:
    - MIT CSAIL RLM paper (arxiv:2512.24601)
    - ysz/recursive-llm (RestrictedPython sandbox)
    - alexzhang13/rlm (official implementation)

    Sub-model options:
    - claude: haiku, sonnet, opus
    - gemini: gemini-flash, gemini-pro (Gemini 2.5 with thinking)
    """
    import asyncio
    import concurrent.futures
    import io
    import json
    import os
    import re
    import traceback
    from contextlib import redirect_stderr, redirect_stdout

    from anthropic import Anthropic

    # Initialize clients
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")

    if not anthropic_key:
        return {"success": False, "error": "ANTHROPIC_API_KEY not configured"}

    anthropic_client = Anthropic(api_key=anthropic_key)

    # Initialize Gemini client if needed
    gemini_client = None
    if sub_provider == "gemini" and google_key:
        try:
            from google import genai
            from google.genai import types as genai_types
            gemini_client = genai.Client(api_key=google_key)
        except ImportError:
            return {"success": False, "error": "google-genai not installed"}

    # Model aliases
    claude_models = {
        "haiku": "claude-3-5-haiku-20241022",
        "sonnet": "claude-sonnet-4-20250514",
        "opus": "claude-opus-4-20250514",
    }

    gemini_models = {
        "gemini-flash": "gemini-2.5-flash",
        "gemini-pro": "gemini-2.5-pro",
        "flash": "gemini-2.5-flash",
        "pro": "gemini-2.5-pro",
    }

    root_model_full = claude_models.get(root_model, root_model)
    sub_model_full = (
        gemini_models.get(sub_model, sub_model)
        if sub_provider == "gemini"
        else claude_models.get(sub_model, sub_model)
    )

    # Cost tracking
    total_input_tokens = 0
    total_output_tokens = 0
    sub_call_count = 0
    parallel_batches = 0

    # Build safe namespace for RestrictedPython
    def _build_safe_namespace() -> dict:
        """Build a restricted namespace for safe code execution."""
        safe_builtins = {
            # Safe built-ins
            "len": len, "str": str, "int": int, "float": float, "bool": bool,
            "list": list, "dict": dict, "set": set, "tuple": tuple,
            "range": range, "enumerate": enumerate, "zip": zip,
            "sorted": sorted, "reversed": reversed,
            "min": min, "max": max, "sum": sum, "abs": abs, "round": round,
            "any": any, "all": all,
            "isinstance": isinstance, "type": type,
            "print": print,
            # Disallow dangerous operations
            "open": None, "exec": None, "eval": None, "compile": None,
            "__import__": None, "getattr": None, "setattr": None,
            "delattr": None, "globals": None, "locals": None,
        }
        return {"__builtins__": safe_builtins}

    # Initialize REPL environment
    if use_restricted_python:
        env_namespace = _build_safe_namespace()
    else:
        env_namespace = {"__builtins__": __builtins__}

    env_namespace.update({
        "context": context,
        "results": {},
        "json": json,
        "re": re,
    })

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

    # Sub-LM query function (single call)
    def llm_query(prompt: str) -> str:
        nonlocal sub_call_count, total_input_tokens, total_output_tokens

        if sub_call_count >= max_sub_calls:
            return "[ERROR: Max sub-LM calls reached]"

        sub_call_count += 1

        try:
            if sub_provider == "gemini" and gemini_client:
                # Use Gemini for sub-calls (cost-effective with thinking)
                gen_config = genai_types.GenerateContentConfig(
                    max_output_tokens=4096,
                    temperature=0.1,
                )
                # Enable thinking for 2.5 models
                if "2.5" in sub_model_full:
                    gen_config = genai_types.GenerateContentConfig(
                        max_output_tokens=4096,
                        temperature=0.1,
                        thinking_config=genai_types.ThinkingConfig(thinking_budget=4096),
                    )

                response = gemini_client.models.generate_content(
                    model=sub_model_full,
                    contents=prompt,
                    config=gen_config,
                )

                # Extract tokens
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    total_input_tokens += getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                    total_output_tokens += getattr(response.usage_metadata, "candidates_token_count", 0) or 0

                return response.text or ""
            else:
                # Use Claude for sub-calls
                response = anthropic_client.messages.create(
                    model=sub_model_full,
                    max_tokens=4096,
                    messages=[{"role": "user", "content": prompt}],
                )

                total_input_tokens += response.usage.input_tokens
                total_output_tokens += response.usage.output_tokens

                return response.content[0].text
        except Exception as e:
            return f"[ERROR: {e}]"

    # Parallel sub-LM query function (batch multiple prompts)
    def llm_query_parallel(prompts: list[str]) -> list[str]:
        """Execute multiple sub-LM queries in parallel for independent chunks."""
        nonlocal sub_call_count, parallel_batches

        if sub_call_count + len(prompts) > max_sub_calls:
            remaining = max_sub_calls - sub_call_count
            if remaining <= 0:
                return ["[ERROR: Max sub-LM calls reached]"] * len(prompts)
            prompts = prompts[:remaining]

        parallel_batches += 1

        # Use ThreadPoolExecutor for parallel execution
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(10, len(prompts))) as executor:
            results = list(executor.map(llm_query, prompts))

        return results

    env_namespace["llm_query"] = llm_query
    if parallel_sub_calls:
        env_namespace["llm_query_parallel"] = llm_query_parallel

    # Build context info for system prompt
    if isinstance(context, str):
        context_type = "string"
        context_chars = len(context)
        context_details = f"Lines: {context.count(chr(10)) + 1}"
    else:
        context_type = "list"
        context_chars = sum(len(str(item)) for item in context)
        context_details = f"Items: {len(context)}"

    parallel_docs = ""
    if parallel_sub_calls:
        parallel_docs = """
- `llm_query_parallel(prompts)` - Batch multiple queries in parallel (faster for independent chunks)
  Example: results = llm_query_parallel([f"Summarize: {chunk}" for chunk in chunks])"""

    system_prompt = f'''You are tasked with answering a query using a large context stored in a Python REPL environment.

## Environment

Context type: {context_type}
Total characters: {context_chars:,}
{context_details}

Available:
- `context` - The input data
- `llm_query(prompt)` - Call sub-LM for semantic understanding ({sub_provider}/{sub_model}){parallel_docs}
- `results` - Dictionary to store findings
- `chunk_text(text, size)`, `chunk_lines(text, n)` - Chunking helpers
- `re`, `json`, `print()`

## Strategy

1. Probe context structure (first/last lines, format)
2. Filter with regex/code to narrow scope
3. Use llm_query() for semantic understanding of filtered chunks
4. Aggregate findings programmatically

## Code Execution

Write code in ```repl blocks:

```repl
# Probe structure
print(f"Context length: {{len(context)}} chars")
print("First 500 chars:", context[:500])
```

```repl
# Filter relevant sections
import re
matches = re.findall(r'relevant_pattern.*', context, re.IGNORECASE)
print(f"Found {{len(matches)}} matches")
results['matches'] = matches
```

```repl
# Semantic understanding via sub-LM
for i, chunk in enumerate(chunk_text(context, 5000)[:3]):
    finding = llm_query(f"Extract key insights: {{chunk}}")
    results[f'chunk_{{i}}'] = finding
    print(f"Chunk {{i}}: {{finding[:200]}}")
```

## Final Answer

When confident, provide answer:
FINAL(your answer here)

Or return a variable:
FINAL_VAR(results)
'''

    # Execute code in sandbox (RestrictedPython or standard)
    def execute_code(code: str) -> tuple[bool, str, str | None]:
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        try:
            if use_restricted_python:
                # Use RestrictedPython for safer execution
                from RestrictedPython import compile_restricted, safe_globals
                from RestrictedPython.Eval import default_guarded_getiter
                from RestrictedPython.Guards import guarded_iter_unpack_sequence

                # Compile with restrictions
                byte_code = compile_restricted(code, "<repl>", "exec")

                # Add guards for iteration
                env_namespace["_getiter_"] = default_guarded_getiter
                env_namespace["_iter_unpack_sequence_"] = guarded_iter_unpack_sequence

                with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                    exec(byte_code, env_namespace)
            else:
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
            # Sanitize traceback
            tb = re.sub(r'File "[^"]+", ', 'File "<repl>", ', tb)
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
            response = anthropic_client.messages.create(
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

        # IMPORTANT: Execute code blocks FIRST, before checking for FINAL
        # The model may output code blocks + FINAL_VAR together, expecting
        # us to run the code which populates results, then return results.
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

        # NOW check for final answer (after code execution has populated results)
        # Match FINAL() only when it appears as a standalone statement at end of response
        final_match = re.search(r"(?:^|\n)FINAL\((.+)\)\s*$", assistant_response)
        final_var_match = re.search(r"(?:^|\n)FINAL_VAR\((\w+)\)\s*$", assistant_response)

        if final_match:
            answer = final_match.group(1).strip()
            cost = _calculate_cost(
                total_input_tokens, total_output_tokens, root_model, sub_model, sub_provider
            )
            return {
                "success": True,
                "answer": answer,
                "iterations": iteration + 1,
                "sub_calls": sub_call_count,
                "cost_usd": cost,
                "trajectory": trajectory,
                "parallel_calls_made": parallel_batches,
            }

        if final_var_match:
            var_name = final_var_match.group(1)
            answer = env_namespace.get(var_name)
            cost = _calculate_cost(
                total_input_tokens, total_output_tokens, root_model, sub_model, sub_provider
            )
            return {
                "success": True,
                "answer": str(answer) if answer is not None else None,
                "iterations": iteration + 1,
                "sub_calls": sub_call_count,
                "cost_usd": cost,
                "trajectory": trajectory,
                "parallel_calls_made": parallel_batches,
            }

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
    cost = _calculate_cost(total_input_tokens, total_output_tokens, root_model, sub_model, sub_provider)
    return {
        "success": False,
        "answer": None,
        "iterations": max_iterations,
        "sub_calls": sub_call_count,
        "cost_usd": cost,
        "error": "Max iterations reached",
        "trajectory": trajectory,
        "parallel_calls_made": parallel_batches,
    }


def _calculate_cost(
    input_tokens: int,
    output_tokens: int,
    root_model: str,
    sub_model: str,
    sub_provider: str = "claude",
) -> float:
    """Calculate approximate cost based on token usage."""
    # Costs per 1M tokens (approximate, Jan 2026)
    claude_costs = {
        "haiku": {"input": 1.00, "output": 5.00},
        "sonnet": {"input": 3.00, "output": 15.00},
        "opus": {"input": 15.00, "output": 75.00},
    }

    # Gemini costs (significantly cheaper for sub-calls)
    gemini_costs = {
        "gemini-flash": {"input": 0.15, "output": 0.60},
        "gemini-pro": {"input": 1.25, "output": 5.00},
        "flash": {"input": 0.15, "output": 0.60},
        "pro": {"input": 1.25, "output": 5.00},
        "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
        "gemini-2.5-pro": {"input": 1.25, "output": 5.00},
    }

    # Root is always Claude
    root_costs = claude_costs.get(root_model, claude_costs["sonnet"])

    # Sub model can be Claude or Gemini
    if sub_provider == "gemini":
        sub_costs = gemini_costs.get(sub_model, gemini_costs["gemini-flash"])
    else:
        sub_costs = claude_costs.get(sub_model, claude_costs["haiku"])

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
    Body: {
        "context": "...",
        "query": "What patterns exist?",
        "sub_provider": "gemini",  # Use Gemini Pro for cheaper sub-calls
        "sub_model": "gemini-pro",
        "parallel_sub_calls": true  # Enable parallel execution
    }
    """
    result = _run_rlm_impl(
        context=request.context,
        query=request.query,
        root_model=request.root_model,
        sub_model=request.sub_model,
        sub_provider=request.sub_provider,
        max_iterations=request.max_iterations,
        max_sub_calls=request.max_sub_calls,
        parallel_sub_calls=request.parallel_sub_calls,
        use_restricted_python=request.use_restricted_python,
    )

    return RLMResponse(
        success=result.get("success", False),
        answer=result.get("answer"),
        iterations=result.get("iterations", 0),
        sub_calls=result.get("sub_calls", 0),
        cost_usd=result.get("cost_usd", 0),
        error=result.get("error"),
        parallel_calls_made=result.get("parallel_calls_made", 0),
    )


@app.function(timeout=600)
def run_rlm_remote(
    context: str | list[str],
    query: str,
    root_model: str = "sonnet",
    sub_model: str = "haiku",
    sub_provider: str = "claude",
    max_iterations: int = 20,
    max_sub_calls: int = 100,
    parallel_sub_calls: bool = False,
    use_restricted_python: bool = True,
) -> dict:
    """
    Run RLM session (callable via .remote() for programmatic use).

    Args:
        context: Large input context (string or list of documents)
        query: Question to answer about the context
        root_model: Claude model for root reasoning (haiku/sonnet/opus)
        sub_model: Model for sub-calls (haiku/sonnet or gemini-flash/gemini-pro)
        sub_provider: Provider for sub-calls ("claude" or "gemini")
        max_iterations: Max REPL iterations
        max_sub_calls: Max sub-LM calls
        parallel_sub_calls: Enable parallel execution for independent chunks
        use_restricted_python: Use RestrictedPython sandbox (recommended)

    Returns:
        dict with success, answer, iterations, sub_calls, cost_usd, etc.
    """
    return _run_rlm_impl(
        context=context,
        query=query,
        root_model=root_model,
        sub_model=sub_model,
        sub_provider=sub_provider,
        max_iterations=max_iterations,
        max_sub_calls=max_sub_calls,
        parallel_sub_calls=parallel_sub_calls,
        use_restricted_python=use_restricted_python,
    )


# Health endpoint removed to stay within Modal free tier limits
# Uncomment if you have a paid plan:
# @app.function()
# @modal.fastapi_endpoint(method="GET")
# def health() -> dict:
#     """Health check endpoint."""
#     return {"status": "ok", "service": "rlm-session"}


# Local testing entrypoint
@app.local_entrypoint()
def main():
    """Test locally with: modal run modal_rlm.py

    Test options:
    - modal run modal_rlm.py  # Default: Claude Haiku sub-calls
    - modal run modal_rlm.py --gemini  # Use Gemini Pro for sub-calls (cheaper)
    """
    import argparse

    parser = argparse.ArgumentParser(description="Test RLM session")
    parser.add_argument("--gemini", action="store_true", help="Use Gemini Pro for sub-calls")
    parser.add_argument("--parallel", action="store_true", help="Enable parallel sub-calls")
    args = parser.parse_args()

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

    # Configure sub-model based on flag
    sub_provider = "gemini" if args.gemini else "claude"
    sub_model = "gemini-pro" if args.gemini else "haiku"

    print("Running RLM session (v2)...")
    print(f"Context length: {len(test_context)} chars")
    print(f"Query: {query}")
    print(f"Root model: sonnet (Claude)")
    print(f"Sub model: {sub_model} ({sub_provider})")
    print(f"Parallel: {args.parallel}")
    print(f"Sandbox: RestrictedPython")
    print("-" * 50)

    result = run_rlm_remote.remote(
        context=test_context,
        query=query,
        root_model="sonnet",
        sub_model=sub_model,
        sub_provider=sub_provider,
        max_iterations=10,
        parallel_sub_calls=args.parallel,
        use_restricted_python=True,
    )

    print(f"Success: {result.get('success')}")
    print(f"Iterations: {result.get('iterations')}")
    print(f"Sub-calls: {result.get('sub_calls')}")
    print(f"Parallel batches: {result.get('parallel_calls_made', 0)}")
    print(f"Cost: ${result.get('cost_usd', 0):.6f}")
    print("-" * 50)
    print(f"Answer: {result.get('answer')}")

    if result.get("error"):
        print(f"Error: {result.get('error')}")
