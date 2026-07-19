#!/usr/bin/env python3
"""Generate and download one Sora scene without a continuation boundary."""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any


SUPPORTED_SECONDS = (4, 8, 12, 16, 20)
TERMINAL_STATUSES = {"completed", "failed", "cancelled"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt-file", type=Path, required=True)
    parser.add_argument("--input-reference", type=Path)
    parser.add_argument("--model", choices=("sora-2", "sora-2-pro"), default="sora-2")
    parser.add_argument("--size", default="1280x720")
    parser.add_argument("--seconds", type=int, choices=SUPPORTED_SECONDS, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--poll-interval", type=float, default=10.0)
    parser.add_argument("--timeout", type=float, default=3600.0)
    return parser.parse_args()


def as_dict(value: Any) -> dict[str, Any]:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, dict):
        return value
    raise TypeError(f"Cannot serialize {type(value).__name__}")


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is required")

    from openai import OpenAI

    prompt = args.prompt_file.read_text(encoding="utf-8").strip()
    request: dict[str, Any] = {
        "model": args.model,
        "prompt": prompt,
        "size": args.size,
        "seconds": str(args.seconds),
    }
    preview = {
        **request,
        "input_reference": str(args.input_reference) if args.input_reference else None,
    }

    client = OpenAI()
    if args.input_reference:
        with args.input_reference.open("rb") as reference:
            created = client.videos.create(**request, input_reference=reference)
    else:
        created = client.videos.create(**request)

    print(f"Created {created.id}", flush=True)
    started_at = time.monotonic()
    last_status = None
    final = created

    while True:
        final = client.videos.retrieve(created.id)
        if final.status != last_status:
            print(f"Status: {final.status} ({final.progress or 0}%)", flush=True)
            last_status = final.status
        if final.status in TERMINAL_STATUSES:
            break
        if time.monotonic() - started_at > args.timeout:
            raise TimeoutError(f"Timed out waiting for {created.id}")
        time.sleep(args.poll_interval)

    write_json(
        args.receipt,
        {"request": preview, "create": as_dict(created), "final": as_dict(final)},
    )
    if final.status != "completed":
        raise RuntimeError(f"Video {created.id} ended with status {final.status}: {final.error}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    client.videos.download_content(created.id, variant="video").write_to_file(args.out)
    print(f"Wrote {args.out}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
