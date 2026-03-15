"""
Beads tool - Agent-native issue tracking.

Track work. Pick up where you left off.
Work survives session restarts, context limits, even crashes.
"""

from __future__ import annotations

import subprocess
from typing import Any, Literal

# Tool definition for Claude
beads_tool: dict[str, Any] = {
    "name": "beads",
    "description": """Track issues, dependencies, and work state with Beads.

Beads is issue tracking designed for AI agents. Work survives session restarts.

Actions:
- create: Create a new issue
- update: Update issue status
- close: Mark issue as done
- list: List all open issues
- show: Show issue details
- ready: Show unblocked work only

Labels:
- Scope: agency, io, space, ltd
- Type: feature, bug, research, refactor
- Priority: P0 (drop everything) to P4 (maybe never)

Example workflow:
1. At session start: action="ready" to see what to work on
2. When starting: action="update" with status="in-progress"
3. When done: action="close"
4. If you discover new work: action="create"
""",
    "input_schema": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["create", "update", "close", "list", "show", "ready"],
                "description": "The action to perform",
            },
            "issue_id": {
                "type": "string",
                "description": "Issue ID (required for update, close, show)",
            },
            "title": {
                "type": "string",
                "description": "Issue title (required for create)",
            },
            "priority": {
                "type": "integer",
                "enum": [0, 1, 2, 3, 4],
                "description": "Priority level: 0=drop everything, 4=maybe never",
            },
            "labels": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Labels to add (scope: agency/io/space/ltd, type: feature/bug/etc)",
            },
            "status": {
                "type": "string",
                "enum": ["open", "in-progress", "code-complete", "verified"],
                "description": "Issue status (for update action)",
            },
        },
        "required": ["action"],
    },
}


def execute_beads(
    action: Literal["create", "update", "close", "list", "show", "ready"],
    issue_id: str | None = None,
    title: str | None = None,
    priority: int | None = None,
    labels: list[str] | None = None,
    status: str | None = None,
) -> str:
    """
    Execute Beads CLI commands.

    Args:
        action: The action to perform
        issue_id: Issue ID (for update, close, show)
        title: Issue title (for create)
        priority: Priority level 0-4
        labels: Labels to add
        status: Issue status (for update)

    Returns:
        Command output
    """
    try:
        if action == "create":
            if not title:
                return "[Error: title is required for create action]"

            cmd = f'bd create "{title}"'
            if priority is not None:
                cmd += f" --priority P{priority}"
            if labels:
                for label in labels:
                    cmd += f" --label {label}"

        elif action == "update":
            if not issue_id:
                return "[Error: issue_id is required for update action]"

            cmd = f"bd update {issue_id}"
            if status:
                cmd += f" --status {status}"

        elif action == "close":
            if not issue_id:
                return "[Error: issue_id is required for close action]"
            cmd = f"bd close {issue_id}"

        elif action == "list":
            cmd = "bd list --json"

        elif action == "ready":
            cmd = "bd ready --json"

        elif action == "show":
            if not issue_id:
                return "[Error: issue_id is required for show action]"
            cmd = f"bd show {issue_id}"

        else:
            return f"[Error: Unknown action: {action}]"

        # Execute command
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
        )

        output = result.stdout
        if result.stderr:
            output += f"\n[stderr]: {result.stderr}"
        if result.returncode != 0:
            output += f"\n[exit code: {result.returncode}]"

        return output.strip() or "(no output)"

    except subprocess.TimeoutExpired:
        return "[Error: Beads command timed out]"
    except FileNotFoundError:
        return "[Error: Beads CLI (bd) not found. Is it installed?]"
    except Exception as e:
        return f"[Error: {type(e).__name__}: {e!s}]"
