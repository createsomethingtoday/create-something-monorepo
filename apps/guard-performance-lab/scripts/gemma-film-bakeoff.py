#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Evaluate Gemma as a local, non-authoritative jersey evidence reviewer.

This script deliberately does not produce detections, track IDs, court points, or
movement claims. It can only propose an evidence review for a source-bound crop.
That keeps a multimodal language model on the judgment side of the film contract;
the existing detector, direct-number review, calibrated projection, and SAM2
tracking gates remain the only candidates for an authoritative player trace.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROFILE = "guard-film-gemma4-bakeoff-v1"
REVIEW_PROFILE = "guard-film-gemma4-jersey-review-v1"
REVIEW_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["identity", "visibleNumber", "participation", "directNumberEvidence", "notProven"],
    "properties": {
        "identity": {"type": "string", "enum": ["13", "not-13", "unreadable"]},
        "visibleNumber": {"type": "string", "enum": ["13", "other", "unreadable"]},
        "participation": {"type": "string", "enum": ["active", "inactive", "unknown"]},
        "directNumberEvidence": {"type": "boolean"},
        "notProven": {"type": "string", "minLength": 1},
    },
}
REVIEW_GBNF = r'''root ::= "{" space identity-kv "," space visibleNumber-kv "," space participation-kv "," space directNumberEvidence-kv "," space notProven-kv space "}"
space ::= [ \t\n]*
identity ::= "\"13\"" | "\"not-13\"" | "\"unreadable\""
visibleNumber ::= "\"13\"" | "\"other\"" | "\"unreadable\""
participation ::= "\"active\"" | "\"inactive\"" | "\"unknown\""
boolean ::= "true" | "false"
identity-kv ::= "\"identity\"" space ":" space identity
visibleNumber-kv ::= "\"visibleNumber\"" space ":" space visibleNumber
participation-kv ::= "\"participation\"" space ":" space participation
directNumberEvidence-kv ::= "\"directNumberEvidence\"" space ":" space boolean
notProven-kv ::= "\"notProven\"" space ":" space notProven
notProven ::= "\"" char{1,96} "\""
char ::= [^"\\\\\x7F\x00-\x1F] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F]{4})
'''
TRACKING_REPLACEMENT_BLOCKERS = [
    "no-person-boxes-or-track-ids",
    "no-source-backed-court-calibration",
    "no-calibrated-continuous-player-track",
    "no-5fps-movement-observation",
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def atomic_json(path: Path, value: Any) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)
    return sha256_file(path)


def parse_review_response(raw: str) -> dict[str, Any]:
    """Extract exactly one JSON object, failing rather than repairing an answer."""
    text = raw.strip()
    if not text:
        raise ValueError("Runner produced no review output.")
    start = text.find("{")
    if start < 0:
        raise ValueError("Runner response does not contain a JSON object.")
    try:
        value, end = json.JSONDecoder().raw_decode(text[start:])
    except json.JSONDecodeError as error:
        raise ValueError("Runner response does not contain valid JSON.") from error
    trailing = text[start + end :].strip()
    if trailing and not re.fullmatch(r"(?:\s*(?:<[^>\r\n]+>|\[/?[A-Za-z_]+\]|\[ Prompt: [^\]\r\n]+\]|Exiting\.\.\.))*", trailing):
        raise ValueError("Runner response contains material after its JSON object.")
    if not isinstance(value, dict):
        raise ValueError("Runner response JSON must be an object.")
    return normalize_review(value)


def normalize_review(value: dict[str, Any]) -> dict[str, Any]:
    expected = set(REVIEW_SCHEMA["required"])
    if set(value) != expected:
        raise ValueError("Review response must contain exactly the declared evidence fields.")
    identity = value.get("identity")
    visible_number = value.get("visibleNumber")
    participation = value.get("participation")
    direct_number = value.get("directNumberEvidence")
    not_proven = value.get("notProven")
    if identity not in {"13", "not-13", "unreadable"}:
        raise ValueError("Review identity is unsupported.")
    if visible_number not in {"13", "other", "unreadable"}:
        raise ValueError("Review visibleNumber is unsupported.")
    if participation not in {"active", "inactive", "unknown"}:
        raise ValueError("Review participation is unsupported.")
    if not isinstance(direct_number, bool) or not isinstance(not_proven, str) or not not_proven.strip():
        raise ValueError("Review evidence fields are invalid.")
    if identity == "13" and (visible_number != "13" or not direct_number):
        raise ValueError("A target claim requires a directly visible number 13.")
    if identity != "13" and direct_number and visible_number != "other":
        raise ValueError("Direct number evidence on a non-target must use visibleNumber 'other'.")
    return {
        "identity": identity,
        "visibleNumber": visible_number,
        "participation": participation,
        "directNumberEvidence": direct_number,
        "notProven": not_proven.strip(),
    }


def distinct_annotations(identity: dict[str, Any]) -> list[dict[str, Any]]:
    """Use one crop per independent decision, never correlated 100ms duplicates."""
    selected: list[dict[str, Any]] = []
    seen: set[tuple[int, str]] = set()
    for item in identity["annotations"]:
        kind = item["negativeClass"] or "positive"
        key = (int(item["associationTimeMs"]), kind)
        if key in seen:
            continue
        seen.add(key)
        selected.append(item)
    return selected


def score_case(annotation: dict[str, Any], review_input: dict[str, Any]) -> dict[str, Any]:
    review = normalize_review(review_input)
    expected_identity = annotation["expectedIdentity"]
    expected_participation = annotation["participation"]
    negative_class = annotation["negativeClass"]
    failure = None
    if expected_identity == "13" and expected_participation == "active":
        if not (
            review["identity"] == "13"
            and review["visibleNumber"] == "13"
            and review["directNumberEvidence"]
            and review["participation"] == "active"
        ):
            failure = "readable-target-missed-or-unsupported"
    elif expected_identity == "13" and expected_participation == "inactive" and negative_class == "substitution":
        if not (
            review["identity"] == "13"
            and review["visibleNumber"] == "13"
            and review["directNumberEvidence"]
            and review["participation"] == "inactive"
        ):
            failure = "substitution-state-mismatch"
    elif review["identity"] == "13":
        failure = "hard-negative-assigned-target"
    return {
        "id": annotation["id"],
        "timeMs": annotation["timeMs"],
        "associationTimeMs": annotation["associationTimeMs"],
        "expected": {
            "identity": expected_identity,
            "visibleNumber": annotation["visibleNumber"],
            "participation": expected_participation,
            "negativeClass": negative_class,
        },
        "review": review,
        "passed": failure is None,
        "failure": failure,
    }


def invalid_case(annotation: dict[str, Any], error: str) -> dict[str, Any]:
    """Preserve a runner failure as benchmark evidence instead of dropping the case."""
    return {
        "id": annotation["id"],
        "timeMs": annotation["timeMs"],
        "associationTimeMs": annotation["associationTimeMs"],
        "expected": {
            "identity": annotation["expectedIdentity"],
            "visibleNumber": annotation["visibleNumber"],
            "participation": annotation["participation"],
            "negativeClass": annotation["negativeClass"],
        },
        "review": None,
        "passed": False,
        "failure": "runner-output-invalid",
        "runnerError": error[-2_000:],
    }


def decide(cases: list[dict[str, Any]]) -> dict[str, Any]:
    positive = [case for case in cases if case["expected"]["identity"] == "13" and case["expected"]["participation"] == "active"]
    negatives = [case for case in cases if case["expected"]["identity"] != "13"]
    substitutions = [case for case in cases if case["expected"]["negativeClass"] == "substitution"]
    positive_recall = sum(case["passed"] for case in positive) / len(positive) if positive else 0
    hard_negative_precision = sum(case["passed"] for case in negatives) / len(negatives) if negatives else 0
    substitution_accuracy = sum(case["passed"] for case in substitutions) / len(substitutions) if substitutions else 0
    semantic_gate = positive_recall >= 0.95 and hard_negative_precision == 1 and substitution_accuracy == 1
    return {
        "semanticEvidenceGatePassed": semantic_gate,
        "positiveRecall": round(positive_recall, 6),
        "hardNegativePrecision": round(hard_negative_precision, 6),
        "substitutionAccuracy": round(substitution_accuracy, 6),
        "trackingReplacementEligible": False,
        "replacementBlockers": TRACKING_REPLACEMENT_BLOCKERS,
        "recommendation": "assist-only" if semantic_gate else "retain-current-tracker",
        "reason": (
            "Gemma cleared this bounded semantic evidence set but does not output the calibrated, continuous 5fps player trajectory required by the tracker contract."
            if semantic_gate
            else "Gemma did not clear the bounded direct-number identity safety gate."
        ),
    }


def crop_frame(source: Path, time_ms: int, bounds: list[int], destination: Path) -> None:
    left, top, right, bottom = [int(value) for value in bounds]
    width, height = right - left, bottom - top
    if width <= 0 or height <= 0:
        raise ValueError("Crop bounds must have positive dimensions.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{time_ms / 1000:.3f}", "-i", str(source),
        "-frames:v", "1", "-vf", f"crop={width}:{height}:{left}:{top}", "-q:v", "2", str(destination),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode or not destination.is_file():
        raise RuntimeError(f"ffmpeg could not extract source-bound crop at {time_ms}ms: {completed.stderr.strip()}")


def runner_version(runner: str) -> str:
    completed = subprocess.run([runner, "--version"], capture_output=True, text=True, check=False)
    if completed.returncode:
        raise RuntimeError(f"Could not inspect runner {runner}: {completed.stderr.strip()}")
    return (completed.stdout or completed.stderr).strip()


def review_prompt() -> str:
    return """You are a private basketball-film evidence reviewer. Inspect only the supplied single jersey crop. Return one JSON object matching the required schema. `identity` may be `13` only when the blue jersey numeral 13 is visibly readable. Otherwise return `not-13` if a different numeral is readable, or `unreadable`. `directNumberEvidence` is true only when a numeral is visually readable in this crop. Do not infer identity from appearance, position, teammates, or prior frames. Do not return boxes, coordinates, movement, tracking, or coaching claims. `notProven` must be a concise uncertainty phrase under 12 words (maximum 96 characters)."""


def build_runner_command(runner: str, model: Path, projector: Path, crop: Path, *, cpu_only: bool) -> list[str]:
    command = [runner]
    if cpu_only:
        command.extend(["--device", "none", "-ngl", "0", "--no-kv-offload", "--no-mmproj-offload", "--no-op-offload"])
    command.extend([
        "-m", str(model), "--mmproj", str(projector), "--image", str(crop), "-p", review_prompt(),
        "--grammar", REVIEW_GBNF, "--temp", "0", "--seed", "42", "-n", "160", "-c", "4096", "--single-turn",
    ])
    return command


def run_review(runner: str, model: Path, projector: Path, crop: Path, *, cpu_only: bool = False) -> tuple[dict[str, Any], dict[str, Any]]:
    command = build_runner_command(runner, model, projector, crop, cpu_only=cpu_only)
    started = time.perf_counter()
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    elapsed = time.perf_counter() - started
    if completed.returncode:
        raise RuntimeError(f"Runner failed for {crop.name}: {completed.stderr[-1000:]}")
    try:
        review = parse_review_response(completed.stdout)
    except ValueError as error:
        raise RuntimeError(
            f"Runner response is unusable for {crop.name}: {error}; "
            f"stdout tail={completed.stdout[-1000:]!r}; stderr tail={completed.stderr[-1000:]!r}"
        ) from error
    return review, {"wallSeconds": round(elapsed, 3), "commandSha256": stable_hash(command[:-1] + ["<context>"])}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    package = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--source-sha256", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--projector", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--runner", default="llama-cli")
    parser.add_argument("--cpu-only", action="store_true", help="Disable all llama.cpp device offload paths.")
    parser.add_argument("--identity-fixture", default=str(package / "fixtures/film/player-13-identity-benchmark.json"))
    parser.add_argument("--generated-at", help="Fixed ISO timestamp for a reproducible receipt.")
    values = list(sys.argv[1:] if argv is None else argv)
    if values[:1] == ["--"]:
        values = values[1:]
    return parser.parse_args(values)


def main() -> None:
    args = parse_args()
    source = Path(args.source)
    model = Path(args.model)
    projector = Path(args.projector)
    fixture_path = Path(args.identity_fixture)
    if not source.is_file() or not model.is_file() or not projector.is_file():
        raise SystemExit("Source, model, and multimodal projector must exist locally.")
    source_hash = sha256_file(source)
    if source_hash != args.source_sha256:
        raise SystemExit("Source bytes do not match --source-sha256.")
    identity = json.loads(fixture_path.read_text())
    if identity.get("sourceSha256") != source_hash:
        raise SystemExit("Identity fixture does not match the supplied source bytes.")
    cases = []
    evidence_dir = Path(args.evidence_dir)
    annotations = distinct_annotations(identity)
    for index, annotation in enumerate(annotations, start=1):
        print(
            json.dumps({"event": "case-start", "index": index, "caseCount": len(annotations), "id": annotation["id"]}),
            flush=True,
        )
        crop = evidence_dir / f"{annotation['id']}.jpg"
        crop_frame(source, int(annotation["timeMs"]), annotation["cropBounds"], crop)
        try:
            review, runtime = run_review(args.runner, model, projector, crop, cpu_only=args.cpu_only)
            case = score_case(annotation, review)
        except RuntimeError as error:
            case = invalid_case(annotation, str(error))
            runtime = {"runnerError": str(error)[-2_000:]}
        case["sourceCrop"] = {"sha256": sha256_file(crop), "file": crop.name, "bounds": annotation["cropBounds"]}
        case["runtime"] = runtime
        cases.append(case)
    decision = decide(cases)
    receipt = {
        "version": 1,
        "profile": PROFILE,
        "generatedAt": args.generated_at or datetime.now(timezone.utc).isoformat(),
        "source": {"sha256": source_hash, "byteSize": source.stat().st_size},
        "inputs": {
            "identityFixture": {"profile": identity["profile"], "sha256": sha256_file(fixture_path)},
            "model": {"file": model.name, "sha256": sha256_file(model), "quantization": "Q4_0"},
            "multimodalProjector": {"file": projector.name, "sha256": sha256_file(projector)},
            "runner": {"name": args.runner, "version": runner_version(args.runner)},
            "promptSha256": stable_hash(review_prompt()),
            "responseProfile": REVIEW_PROFILE,
        },
        "caseCount": len(cases),
        "cases": cases,
        "decision": decision,
    }
    receipt_hash = atomic_json(Path(args.output), receipt)
    print(json.dumps({"ok": True, "receiptSha256": receipt_hash, "caseCount": len(cases), "decision": decision}, indent=2))


if __name__ == "__main__":
    main()
