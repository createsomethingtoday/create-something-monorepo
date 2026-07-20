#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "numpy==2.4.3",
#   "opencv-python-headless==4.13.0.92",
# ]
# ///
"""Derive stable traffic roles from one completed raw revision; no inference."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from team_classifier import stabilize_team_roles


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    source = Path(args.input)
    destination = Path(args.output)
    analysis = json.loads(source.read_text())
    if analysis.get("analysis", {}).get("revision") != 2 or analysis.get("analysis", {}).get("executionCount") != 1:
        raise SystemExit("Stable team derivation requires the completed one-run revision 2 receipt.")
    analysis["frames"] = stabilize_team_roles(analysis["frames"])
    analysis["analysis"]["classification"]["trackAggregation"] = "high-confidence-frame-uniform-with-track-vote-fallback-v1"
    analysis["analysis"]["classification"]["derivedFromRawArtifact"] = source.name
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    temporary.write_text(json.dumps(analysis, separators=(",", ":")))
    temporary.replace(destination)
    print(json.dumps({"ok": True, "input": str(source), "output": str(destination), "revision": 2, "executionCount": 1, "inferenceExecuted": False}, indent=2))


if __name__ == "__main__":
    main()
