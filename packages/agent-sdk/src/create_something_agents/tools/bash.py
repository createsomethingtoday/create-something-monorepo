"""
Bash tool - The most powerful agent tool.

"Bash is all you need" per Anthropic. Full subprocess access enables
composable operations that would require dozens of specialized tools.
"""

from __future__ import annotations

import os
import subprocess
from typing import Any

# Tool definition for Claude
bash_tool: dict[str, Any] = {
    "name": "bash",
    "description": """Execute bash commands with full subprocess access.

Use this for:
- Git operations (status, commit, push, branch)
- Package management (npm, pip, cargo)
- File operations (find, grep, ls, mkdir)
- Build tools (make, cargo, npm run)
- System inspection (env, which, cat)

Commands run in the specified working directory. Output is captured.
Commands that exceed timeout will be terminated.

Store results to files when output is large. Compose with pipes.""",
    "input_schema": {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The bash command to execute",
            },
            "cwd": {
                "type": "string",
                "description": "Working directory (optional, defaults to current)",
            },
            "timeout": {
                "type": "integer",
                "description": "Timeout in seconds (default 120, max 600)",
            },
        },
        "required": ["command"],
    },
}


def execute_bash(
    command: str,
    cwd: str | None = None,
    timeout: int = 120,
) -> str:
    """
    Execute a bash command with full subprocess access.

    Args:
        command: The bash command to execute
        cwd: Working directory (optional)
        timeout: Timeout in seconds (default 120, max 600)

    Returns:
        Command output (stdout + stderr)
    """
    # Enforce timeout limits
    timeout = min(max(timeout, 1), 600)

    # Default to current working directory
    working_dir = cwd or os.getcwd()

    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=working_dir,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        output = result.stdout
        if result.stderr:
            output += f"\n[stderr]: {result.stderr}"

        # Add return code if non-zero
        if result.returncode != 0:
            output += f"\n[exit code: {result.returncode}]"

        # Truncate large outputs
        max_output = 50000
        if len(output) > max_output:
            output = f"{output[:max_output]}\n...\n[Truncated at {max_output} characters]"

        return output.strip() or "(no output)"

    except subprocess.TimeoutExpired:
        return f"[Error: Command timed out after {timeout}s]"
    except FileNotFoundError:
        return f"[Error: Directory not found: {working_dir}]"
    except PermissionError:
        return f"[Error: Permission denied for directory: {working_dir}]"
    except Exception as e:
        return f"[Error: {type(e).__name__}: {e!s}]"
