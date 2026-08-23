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
    parser.add_argument("--prompt", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    workspace = Path(args.workspace).resolve()
    if not workspace.is_dir():
        raise ValueError(f"Workspace does not exist: {workspace}")

    backend = FilesystemBackend(root_dir=workspace, virtual_mode=True)
    agent = create_deep_agent(
        model=args.model
        if args.model.startswith("openai:")
        else f"openai:{args.model}",
        system_prompt=(
            "You are evaluating a governed operation. Use the read-only filesystem tools to inspect "
            "the supplied evidence before answering. You have no authority to write, execute commands, "
            "or approve protected work. Produce the required structured result from observed facts only."
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
        payload = structured
    else:
        raise ValueError("Deep Agents returned no structured comparison response")

    print(json.dumps({"ok": True, "result": payload}, sort_keys=True))


if __name__ == "__main__":
    main()
