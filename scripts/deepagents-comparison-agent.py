#!/usr/bin/env python3
"""Run one read-only Deep Agents comparison case and print a JSON result."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from deepagents import FilesystemPermission, create_deep_agent
from deepagents.backends import FilesystemBackend
from deepagents.middleware.filesystem import FilesystemMiddleware


class ComparisonResult(BaseModel):
    status: Literal["ready", "blocked", "unknown"]
    evidence: list[str] = Field(min_length=1)
    decision: str = Field(min_length=1)
    recovery: str = Field(min_length=1)
    noWriteConfirmation: Literal[True]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--provider", required=True, choices=["openai", "ollama"])
    parser.add_argument("--prompt", required=True)
    return parser.parse_args()


def parse_final_json(result: dict) -> dict | None:
    """Read a JSON-only final answer when a provider does not support structured output."""

    for message in reversed(result.get("messages", [])):
        content = getattr(message, "content", None)
        if not isinstance(content, str):
            continue
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end <= start:
            continue
        try:
            parsed = json.loads(content[start : end + 1])
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


def main() -> None:
    args = parse_args()
    workspace = Path(args.workspace).resolve()
    if not workspace.is_dir():
        raise ValueError(f"Workspace does not exist: {workspace}")

    model = (
        args.model
        if args.model.startswith(f"{args.provider}:")
        else f"{args.provider}:{args.model}"
    )

    backend = FilesystemBackend(root_dir=workspace, virtual_mode=True)
    agent = create_deep_agent(
        model=model,
        system_prompt=(
            "You are evaluating a governed operation. Use the read-only filesystem tools to inspect "
            "the supplied evidence before answering. You have no authority to write, execute commands, "
            "or approve protected work. Produce observed facts only. Your final answer must be JSON only, "
            "with exactly these fields: status (ready, blocked, or unknown), evidence (a non-empty array of "
            "strings containing source ids), decision (a string), recovery (a string), and "
            "noWriteConfirmation (the boolean true). Do not rename these fields; do not use snake_case "
            "aliases, wrap the JSON in Markdown, or add other fields."
        ),
        backend=backend,
        middleware=[
            FilesystemMiddleware(
                backend=backend,
                tools=["ls", "read_file", "glob", "grep"],
            )
        ],
        permissions=[
            FilesystemPermission(operations=["read"], paths=["/**"], mode="allow"),
            FilesystemPermission(operations=["write"], paths=["/**"], mode="deny"),
        ],
        response_format=ComparisonResult,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": args.prompt}]})
    structured = result.get("structured_response")
    if isinstance(structured, ComparisonResult):
        payload = structured.model_dump()
    elif isinstance(structured, dict):
        payload = ComparisonResult.model_validate(structured).model_dump()
    else:
        raw_response = parse_final_json(result)
        if raw_response is None:
            raise ValueError("Deep Agents returned no structured comparison response")
        payload = ComparisonResult.model_validate(raw_response).model_dump()

    print(json.dumps({"ok": True, "result": payload}, sort_keys=True))


if __name__ == "__main__":
    main()
