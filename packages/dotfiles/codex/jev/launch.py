#!/usr/bin/env python3
"""Retrieve the existing TypeSafe credential and exec the pinned upstream MCP."""

import json
import os
from pathlib import Path
import subprocess
import sys


def main():
    config = json.loads(Path(__file__).with_name("runtime.json").read_text())
    env = os.environ.copy()
    env["PATH"] = str(Path(config["infisical"]).parent) + os.pathsep + env.get("PATH", "")
    # Use only the configured TypeSafe account and public endpoint. Never inherit
    # another client's OpenRouter key or an ambient endpoint override.
    env.pop("OPENROUTER_API_KEY", None)
    env.pop("TYPESAFE_BASE_URL", None)
    if not env.get("TYPESAFE_API_KEY"):
        try:
            result = subprocess.run(
                [config["infisical"], "secrets", "get", "TYPESAFE_API_KEY",
                 "--projectId=e1532079-2f2b-46b5-8972-cf7a025eb803",
                 "--env=dev", "--path=/", "--plain", "--silent"],
                capture_output=True, text=True, timeout=12, check=True, env=env,
            )
            key = result.stdout.strip()
            if not key or "\n" in key:
                raise ValueError("invalid secret response")
            env["TYPESAFE_API_KEY"] = key
        except (OSError, ValueError, subprocess.SubprocessError):
            print("Jev unavailable: TypeSafe credential lookup failed; continue without Jev.", file=sys.stderr)
            return 1
    os.execve(config["binary"], [config["binary"], "mcp"], env)


if __name__ == "__main__":
    sys.exit(main())
