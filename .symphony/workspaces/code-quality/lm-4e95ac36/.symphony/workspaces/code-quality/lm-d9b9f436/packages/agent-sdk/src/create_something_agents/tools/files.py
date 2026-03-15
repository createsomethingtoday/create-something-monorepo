"""
File tools - Read and write files.

These could be done via bash, but dedicated tools provide:
- Better error messages
- Consistent encoding handling
- Size limits to prevent context overflow
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

# Tool definitions for Claude
file_read_tool: dict[str, Any] = {
    "name": "file_read",
    "description": """Read content from a file.

Use this to:
- Read source code files
- Check configuration files
- Inspect logs or output files

Returns the file content as text. Large files are truncated.
For binary files, use bash with appropriate tools (hexdump, file).""",
    "input_schema": {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file (absolute or relative to cwd)",
            },
            "offset": {
                "type": "integer",
                "description": "Line number to start from (0-indexed, optional)",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of lines to read (optional)",
            },
        },
        "required": ["path"],
    },
}

file_write_tool: dict[str, Any] = {
    "name": "file_write",
    "description": """Write content to a file.

Use this to:
- Create new files
- Overwrite existing files
- Save generated code or configuration

Creates parent directories if they don't exist.
Always writes the complete file content (not patches).""",
    "input_schema": {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file (absolute or relative to cwd)",
            },
            "content": {
                "type": "string",
                "description": "Content to write to the file",
            },
        },
        "required": ["path", "content"],
    },
}


def execute_file_read(
    path: str,
    offset: int | None = None,
    limit: int | None = None,
) -> str:
    """
    Read content from a file.

    Args:
        path: Path to the file
        offset: Line number to start from (0-indexed)
        limit: Maximum number of lines to read

    Returns:
        File content as text
    """
    try:
        file_path = Path(path).expanduser().resolve()

        if not file_path.exists():
            return f"[Error: File not found: {path}]"

        if not file_path.is_file():
            return f"[Error: Not a file: {path}]"

        # Check file size
        size = file_path.stat().st_size
        max_size = 1_000_000  # 1MB limit
        if size > max_size:
            return f"[Error: File too large ({size} bytes). Use bash with head/tail.]"

        # Read content
        try:
            content = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return f"[Error: Cannot read file as text. May be binary: {path}]"

        # Apply offset and limit
        if offset is not None or limit is not None:
            lines = content.splitlines(keepends=True)
            start = offset or 0
            end = start + limit if limit else None
            lines = lines[start:end]
            content = "".join(lines)

        # Truncate if still too large
        max_output = 50000
        if len(content) > max_output:
            content = f"{content[:max_output]}\n...\n[Truncated at {max_output} characters]"

        return content or "(empty file)"

    except PermissionError:
        return f"[Error: Permission denied: {path}]"
    except Exception as e:
        return f"[Error: {type(e).__name__}: {e!s}]"


def execute_file_write(
    path: str,
    content: str,
) -> str:
    """
    Write content to a file.

    Args:
        path: Path to the file
        content: Content to write

    Returns:
        Success message or error
    """
    try:
        file_path = Path(path).expanduser().resolve()

        # Create parent directories
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write content
        file_path.write_text(content, encoding="utf-8")

        # Return confirmation
        size = len(content)
        lines = content.count("\n") + (1 if content and not content.endswith("\n") else 0)
        return f"Wrote {size} bytes ({lines} lines) to {path}"

    except PermissionError:
        return f"[Error: Permission denied: {path}]"
    except OSError as e:
        return f"[Error: Cannot write file: {e!s}]"
    except Exception as e:
        return f"[Error: {type(e).__name__}: {e!s}]"
