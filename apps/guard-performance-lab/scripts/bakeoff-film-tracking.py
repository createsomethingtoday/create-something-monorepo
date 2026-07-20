#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "opencv-python-headless==4.13.0.92",
#   "pillow==12.1.1",
#   "rfdetr==1.8.3",
# ]
# ///
"""Run and verify a private, source-bound player-detector bake-off.

The candidate can propose person boxes and team/court membership only. It never
becomes authority for player #13; the reviewed identity and participation gates
remain fixed while detector coverage is compared.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROFILE = "guard-film-tracking-bakeoff-v1"
PREDICTION_PROFILE = "guard-film-player-detections-v1"
PERSON_CLASS_ID = 1
ASSOCIATION_THRESHOLD = 0.35
REPRESENTATIVE_TIMES_MS = (240000, 1060000, 1700000, 1925000, 2342000, 3030000, 3100000)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_hash(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def atomic_json(path: Path, value: Any) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)
    return sha256_file(path)


@dataclass(frozen=True)
class Match:
    box: tuple[float, float, float, float]
    confidence: float
    score: float


def box_area(box: list[float] | tuple[float, ...]) -> float:
    return max(0.0, box[2] - box[0]) * max(0.0, box[3] - box[1])


def intersection_area(left: list[float] | tuple[float, ...], right: list[float] | tuple[float, ...]) -> float:
    return max(0.0, min(left[2], right[2]) - max(left[0], right[0])) * max(
        0.0, min(left[3], right[3]) - max(left[1], right[1])
    )


def association_score(annotation: list[float], detection: list[float]) -> float:
    intersection = intersection_area(annotation, detection)
    union = box_area(annotation) + box_area(detection) - intersection
    iou = intersection / union if union else 0.0
    annotation_coverage = intersection / box_area(annotation) if box_area(annotation) else 0.0
    # Direct-number review crops intentionally include jersey context and can be
    # much larger than a detector's tight person box. In that case, use spatial
    # proximity within the reviewed crop; vendor confidence never participates.
    annotation_center = ((annotation[0] + annotation[2]) / 2, (annotation[1] + annotation[3]) / 2)
    detection_center = ((detection[0] + detection[2]) / 2, (detection[1] + detection[3]) / 2)
    center_inside = (
        annotation[0] <= detection_center[0] <= annotation[2]
        and annotation[1] <= detection_center[1] <= annotation[3]
    )
    diagonal = math.hypot(annotation[2] - annotation[0], annotation[3] - annotation[1])
    proximity = (
        max(0.0, 1 - math.dist(annotation_center, detection_center) / diagonal)
        if center_inside and diagonal
        else 0.0
    )
    return max(iou, annotation_coverage, proximity)


def best_match(annotation: list[float], detections: list[dict[str, Any]]) -> Match | None:
    ranked = [
        Match(tuple(item["box"]), float(item["confidence"]), association_score(annotation, item["box"]))
        for item in detections
    ]
    if not ranked:
        return None
    match = max(ranked, key=lambda item: item.score)
    return match if match.score >= ASSOCIATION_THRESHOLD else None


def ratio(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 6) if denominator else 1.0


def parse_args() -> argparse.Namespace:
    package = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--source-sha256", required=True)
    parser.add_argument("--identity-fixture", default=str(package / "fixtures/film/player-13-identity-benchmark.json"))
    parser.add_argument("--team-fixture", default=str(package / "fixtures/film/player-team-benchmark.json"))
    parser.add_argument("--candidate-predictions")
    parser.add_argument("--output", required=True)
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--model", choices=("small",), default="small")
    parser.add_argument("--threshold", type=float, default=0.30)
    parser.add_argument("--court-report", help="Optional source-backed held-out calibration report.")
    parser.add_argument("--generated-at", help="Fixed ISO timestamp for a reproducible receipt.")
    return parser.parse_args()


def load_locked_inputs(args: argparse.Namespace) -> tuple[Path, dict[str, Any], Path, dict[str, Any], Path]:
    source = Path(args.source)
    identity_path = Path(args.identity_fixture)
    team_path = Path(args.team_fixture)
    if not source.is_file():
        raise SystemExit(f"Source video does not exist: {source}")
    actual_source_hash = sha256_file(source)
    identity = json.loads(identity_path.read_text())
    team = json.loads(team_path.read_text())
    if actual_source_hash != args.source_sha256:
        raise SystemExit("Source bytes do not match --source-sha256.")
    if identity.get("sourceSha256") != actual_source_hash or team.get("sourceSha256") != actual_source_hash:
        raise SystemExit("Locked fixture source fingerprints do not match the supplied video.")
    return source, identity, identity_path, team, team_path


def frame_times(identity: dict[str, Any], team: dict[str, Any]) -> list[int]:
    return sorted({int(item["timeMs"]) for fixture in (identity, team) for item in fixture["annotations"]})


def decode_frames(source: Path, times_ms: list[int]) -> dict[int, Any]:
    import cv2

    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        raise SystemExit("Could not open the supplied source video.")
    frames: dict[int, Any] = {}
    try:
        for time_ms in times_ms:
            capture.set(cv2.CAP_PROP_POS_MSEC, time_ms)
            ok, image = capture.read()
            if not ok:
                raise SystemExit(f"Could not decode locked benchmark frame {time_ms}ms.")
            frames[time_ms] = image
    finally:
        capture.release()
    return frames


def run_rfdetr(source_hash: str, frames: dict[int, Any], threshold: float) -> dict[str, Any]:
    import cv2
    from PIL import Image
    from rfdetr import RFDETRSmall

    started = time.perf_counter()
    model = RFDETRSmall()
    model_path = Path(model.model_config.pretrain_weights)
    outputs: list[dict[str, Any]] = []
    inference_seconds = 0.0
    for time_ms, image in frames.items():
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        frame_started = time.perf_counter()
        detections = model.predict(Image.fromarray(rgb), threshold=threshold)
        inference_seconds += time.perf_counter() - frame_started
        people = []
        for index, class_id in enumerate(detections.class_id.tolist()):
            if int(class_id) != PERSON_CLASS_ID:
                continue
            people.append(
                {
                    "box": [round(float(value), 3) for value in detections.xyxy[index].tolist()],
                    "confidence": round(float(detections.confidence[index]), 6),
                }
            )
        outputs.append({"timeMs": time_ms, "detections": people})
    elapsed = time.perf_counter() - started
    config = {
        "provider": "roboflow-open-source",
        "model": "RF-DETR Small COCO",
        "package": "rfdetr@1.8.3",
        "license": str(model.model_config.license),
        "personClassId": PERSON_CLASS_ID,
        "threshold": threshold,
        "associationThreshold": ASSOCIATION_THRESHOLD,
        "device": str(model.model_config.device),
        "resolution": int(model.model_config.resolution),
        "identityAuthority": "none",
    }
    return {
        "version": 1,
        "profile": PREDICTION_PROFILE,
        "sourceSha256": source_hash,
        "model": {**config, "weightsSha256": sha256_file(model_path)},
        "configurationSha256": stable_hash(config),
        "processing": {
            "frameCount": len(frames),
            "wallSeconds": round(elapsed, 3),
            "inferenceSeconds": round(inference_seconds, 3),
            "framesPerSecond": round(len(frames) / inference_seconds, 3) if inference_seconds else None,
        },
        "frames": outputs,
    }


def validate_predictions(predictions: dict[str, Any], source_hash: str, expected_times: list[int]) -> None:
    if predictions.get("profile") != PREDICTION_PROFILE:
        raise SystemExit(f"Unsupported candidate prediction profile: {predictions.get('profile')}")
    if predictions.get("sourceSha256") != source_hash:
        raise SystemExit("Candidate predictions are not bound to the supplied source.")
    actual_times = sorted(int(item["timeMs"]) for item in predictions.get("frames", []))
    if actual_times != expected_times:
        missing = sorted(set(expected_times) - set(actual_times))
        extra = sorted(set(actual_times) - set(expected_times))
        raise SystemExit(f"Candidate timestamp coverage mismatch; missing={missing}, extra={extra}.")
    if predictions.get("model", {}).get("identityAuthority") != "none":
        raise SystemExit("A detector candidate cannot claim player #13 identity authority.")
    declared_model = dict(predictions.get("model", {}))
    weights_hash = declared_model.pop("weightsSha256", None)
    if not isinstance(weights_hash, str) or len(weights_hash) != 64:
        raise SystemExit("Candidate predictions require an exact model weights SHA-256.")
    if predictions.get("configurationSha256") != stable_hash(declared_model):
        raise SystemExit("Candidate model/configuration fingerprint mismatch.")


def source_court_metrics(path: str | None, source_hash: str) -> dict[str, Any]:
    if not path:
        return {
            "medianErrorFeet": None,
            "p95ErrorFeet": None,
            "sourceBacked": False,
            "passed": False,
            "reason": "No independent source-backed court-line calibration fixture exists for this camera.",
        }
    report = json.loads(Path(path).read_text())
    validation = report.get("validation", report)
    median = validation.get("medianErrorFeet")
    p95 = validation.get("p95ErrorFeet")
    source_backed = report.get("sourceSha256") == source_hash
    passed = bool(source_backed and isinstance(median, (int, float)) and isinstance(p95, (int, float)) and median <= 2 and p95 <= 4)
    return {
        "medianErrorFeet": median,
        "p95ErrorFeet": p95,
        "ambiguousFrameCount": validation.get("ambiguousFrameCount"),
        "sourceBacked": source_backed,
        "passed": passed,
        "provider": report.get("model"),
        "reason": None if passed else validation.get("reason", "Held-out court evidence is missing, source-mismatched, or outside tolerance."),
    }


def annotation_box(annotation: dict[str, Any]) -> list[float]:
    return [float(value) for value in annotation.get("box", annotation.get("cropBounds"))]


def evaluate_candidate(
    identity: dict[str, Any],
    team: dict[str, Any],
    predictions: dict[str, Any],
    frames: dict[int, Any],
    court: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    from team_classifier import classify_team

    by_time = {int(item["timeMs"]): item["detections"] for item in predictions["frames"]}
    target_annotations = [
        item for item in identity["annotations"] if item["expectedIdentity"] == "13" and item["participation"] == "active"
    ]
    hard_negatives = [item for item in identity["annotations"] if item not in target_annotations]
    target_matches = [best_match(annotation_box(item), by_time[item["timeMs"]]) for item in target_annotations]
    foreground_players = [item for item in team["annotations"] if item["expectedRole"] in ("teammate", "opponent")]
    role_correct = 0
    foreground_detected = 0
    active_predictions = 0
    opposite_active = 0
    team_details: list[dict[str, Any]] = []
    for annotation in team["annotations"]:
        match = best_match(annotation_box(annotation), by_time[annotation["timeMs"]])
        predicted_role = "unresolved"
        membership = "unresolved"
        if match:
            classified = classify_team(frames[annotation["timeMs"]], list(match.box))
            predicted_role = classified.role
            membership = classified.court_membership
            if predicted_role in ("teammate", "opponent"):
                active_predictions += 1
            if annotation["courtMembership"] == "opposite-court" and predicted_role != "ignore":
                opposite_active += 1
            if annotation["expectedRole"] in ("teammate", "opponent"):
                foreground_detected += 1
                role_correct += int(predicted_role == annotation["expectedRole"] and membership == "foreground-court")
        team_details.append(
            {
                "id": annotation["id"],
                "timeMs": annotation["timeMs"],
                "matched": match is not None,
                "associationScore": round(match.score, 6) if match else None,
                "predictedRole": predicted_role,
                "courtMembership": membership,
            }
        )
    baseline_court = source_court_metrics(None, identity["sourceSha256"])
    baseline = {
        "provider": "current-locked-yolox-plus-reviewed-gates",
        "detection": {
            "targetCoverage": {"matched": len(target_annotations), "total": len(target_annotations), "recall": 1.0},
            "foregroundPlayerCoverage": {"matched": len(foreground_players), "total": len(foreground_players), "recall": 1.0},
        },
        "identity": {
            "recall": 1.0,
            "hardNegativePrecision": 1.0,
            "hardNegativeCount": len(hard_negatives),
            "falseAssignments": 0,
            "silentSwitchMaxSeconds": 0.0,
            "inactiveBridges": 0,
            "authority": "direct-number-reviewed-continuity-and-reviewed-sam2",
        },
        "foreground": {"precision": 1.0, "oppositeCourtActive": 0, "teamAccuracy": 1.0},
        "court": baseline_court,
        "processing": {"framesPerSecond": None, "reason": "Original detector runtime was not captured in the locked fixtures."},
    }
    matched_targets = sum(match is not None for match in target_matches)
    candidate = {
        "provider": predictions["model"]["model"],
        "model": predictions["model"],
        "configurationSha256": predictions["configurationSha256"],
        "detection": {
            "targetCoverage": {"matched": matched_targets, "total": len(target_annotations), "recall": ratio(matched_targets, len(target_annotations))},
            "foregroundPlayerCoverage": {
                "matched": foreground_detected,
                "total": len(foreground_players),
                "recall": ratio(foreground_detected, len(foreground_players)),
            },
        },
        "identity": {**baseline["identity"], "authority": "unchanged-reviewed-gates; detector-is-proposal-only"},
        "foreground": {
            "precision": ratio(role_correct, active_predictions),
            "oppositeCourtActive": opposite_active,
            "teamAccuracy": ratio(role_correct, len(foreground_players)),
        },
        "court": court,
        "processing": predictions["processing"],
    }
    details = {
        "target": [
            {
                "id": annotation["id"],
                "timeMs": annotation["timeMs"],
                "matched": match is not None,
                "associationScore": round(match.score, 6) if match else None,
            }
            for annotation, match in zip(target_annotations, target_matches, strict=True)
        ],
        "team": team_details,
    }
    return {"baseline": baseline, "candidate": candidate}, details


def adoption_decision(comparison: dict[str, Any]) -> dict[str, Any]:
    baseline = comparison["baseline"]
    candidate = comparison["candidate"]
    floors = {
        "zeroHardNegativeIdentityAssignments": candidate["identity"]["falseAssignments"] == 0,
        "zeroSilentSwitchesOverHalfSecond": candidate["identity"]["silentSwitchMaxSeconds"] <= 0.5,
        "zeroOppositeCourtActive": candidate["foreground"]["oppositeCourtActive"] == 0,
        "zeroInactiveBridges": candidate["identity"]["inactiveBridges"] == 0,
        "sourceBackedCourtCalibrationPassed": bool(candidate["court"]["passed"]),
        "targetRecallNoRegression": candidate["identity"]["recall"] >= baseline["identity"]["recall"],
        "teamAccuracyNoRegression": candidate["foreground"]["teamAccuracy"] >= baseline["foreground"]["teamAccuracy"],
    }
    improvements = {
        "targetDetectionCoverage": candidate["detection"]["targetCoverage"]["recall"] > baseline["detection"]["targetCoverage"]["recall"],
        "foregroundPlayerCoverage": candidate["detection"]["foregroundPlayerCoverage"]["recall"] > baseline["detection"]["foregroundPlayerCoverage"]["recall"],
        "courtMedianError": bool(
            candidate["court"]["medianErrorFeet"] is not None
            and baseline["court"]["medianErrorFeet"] is not None
            and candidate["court"]["medianErrorFeet"] < baseline["court"]["medianErrorFeet"]
        ),
    }
    adopt = all(floors.values()) and any(improvements.values())
    reasons = []
    if not all(floors.values()):
        reasons.append("Candidate failed one or more locked safety floors.")
    if not any(improvements.values()):
        reasons.append("Candidate did not materially improve target coverage, foreground player coverage, or held-out court error.")
    return {
        "adopt": adopt,
        "action": "adopt-candidate" if adopt else "retain-current-production-path",
        "safetyFloors": floors,
        "materialImprovements": improvements,
        "reasons": reasons,
        "nextExperiment": None
        if adopt
        else "Add a source-backed held-out court-line calibration fixture, then test an approved basketball-fine-tuned detector export against the same locked identity labels.",
    }


def render_evidence(
    evidence_dir: Path,
    frames: dict[int, Any],
    identity: dict[str, Any],
    team: dict[str, Any],
    predictions: dict[str, Any],
) -> list[dict[str, Any]]:
    import cv2

    evidence_dir.mkdir(parents=True, exist_ok=True)
    by_time = {int(item["timeMs"]): item["detections"] for item in predictions["frames"]}
    artifacts = []
    for time_ms in REPRESENTATIVE_TIMES_MS:
        if time_ms not in frames:
            continue
        image = frames[time_ms].copy()
        for detection in by_time[time_ms]:
            x1, y1, x2, y2 = [int(value) for value in detection["box"]]
            cv2.rectangle(image, (x1, y1), (x2, y2), (255, 110, 0), 2)
        annotations = [item for fixture in (identity, team) for item in fixture["annotations"] if item["timeMs"] == time_ms]
        for annotation in annotations:
            x1, y1, x2, y2 = [int(value) for value in annotation_box(annotation)]
            label = annotation.get("expectedIdentity", annotation.get("expectedRole", "reviewed"))
            color = (0, 180, 0) if label in ("13", "teammate", "opponent") else (0, 0, 220)
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 3)
            cv2.putText(image, str(label), (x1, max(18, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        path = evidence_dir / f"frame-{time_ms}.jpg"
        cv2.imwrite(str(path), image)
        artifacts.append({"timeMs": time_ms, "sha256": sha256_file(path), "file": path.name})
    return artifacts


def main() -> None:
    args = parse_args()
    source, identity, identity_path, team, team_path = load_locked_inputs(args)
    times = frame_times(identity, team)
    frames = decode_frames(source, times)
    if args.candidate_predictions:
        prediction_path = Path(args.candidate_predictions)
        predictions = json.loads(prediction_path.read_text())
    else:
        predictions = run_rfdetr(args.source_sha256, frames, args.threshold)
        prediction_path = Path(args.output).with_name("candidate-predictions.json")
        atomic_json(prediction_path, predictions)
    validate_predictions(predictions, args.source_sha256, times)
    court = source_court_metrics(args.court_report, args.source_sha256)
    comparison, details = evaluate_candidate(identity, team, predictions, frames, court)
    evidence = render_evidence(Path(args.evidence_dir), frames, identity, team, predictions)
    decision = adoption_decision(comparison)
    court_input = None
    if args.court_report:
        court_path = Path(args.court_report)
        court_value = json.loads(court_path.read_text())
        court_input = {
            "profile": court_value.get("profile"),
            "sha256": sha256_file(court_path),
            "model": court_value.get("model"),
        }
    receipt = {
        "version": 1,
        "profile": PROFILE,
        "generatedAt": args.generated_at or datetime.now(timezone.utc).isoformat(),
        "source": {"sha256": args.source_sha256, "byteSize": source.stat().st_size, "frameCount": len(times)},
        "inputs": {
            "identityFixture": {"profile": identity["profile"], "sha256": sha256_file(identity_path), "annotationCount": len(identity["annotations"])},
            "teamFixture": {"profile": team["profile"], "sha256": sha256_file(team_path), "annotationCount": len(team["annotations"])},
            "candidatePredictions": {"profile": predictions["profile"], "sha256": sha256_file(prediction_path)},
            "courtReport": court_input,
        },
        **comparison,
        "decision": decision,
        "evidence": {"annotatedFrames": evidence, "detailsSha256": stable_hash(details)},
    }
    receipt_hash = atomic_json(Path(args.output), receipt)
    print(
        json.dumps(
            {
                "ok": True,
                "output": args.output,
                "receiptSha256": receipt_hash,
                "decision": decision["action"],
                "candidateTargetDetectionRecall": comparison["candidate"]["detection"]["targetCoverage"]["recall"],
                "candidateForegroundPlayerRecall": comparison["candidate"]["detection"]["foregroundPlayerCoverage"]["recall"],
                "candidateTeamAccuracy": comparison["candidate"]["foreground"]["teamAccuracy"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
