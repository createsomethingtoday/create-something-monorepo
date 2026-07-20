#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "numpy==2.4.3",
#   "onnxruntime==1.24.4",
#   "opencv-python-headless==4.13.0.92",
#   "scipy==1.17.1",
# ]
# ///
"""Create one private, derived basketball traffic revision from a linked video.

The source is decoded sequentially and is never copied to the output. Person
detection uses an operator-supplied YOLOX ONNX file; YOLOX is Apache-2.0 and the
model path/hash are recorded in the receipt. The decoder below implements the
public YOLOX ONNX output contract rather than importing the training project.

Court coordinates are explicitly marked `estimated`: longitudinal position is
stabilized against camera pan using background optical flow, while court width
uses a perspective approximation. Corrections and calibrated projections are a
separate, non-inference layer in the Lab.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from scipy.optimize import linear_sum_assignment

from team_classifier import TEAM_SCORE_THRESHOLD, classify_team, stabilize_team_roles


PROFILE = "guard-player-trace-v1"
COURT_LENGTH = 94.0
COURT_WIDTH = 50.0


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--source-sha256", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--sample-fps", type=float, default=2.0)
    parser.add_argument("--target-seed", action="append", default=[], help="timeMs:x:y at the detected player's feet")
    parser.add_argument("--analyzed-at")
    parser.add_argument("--start-ms", type=int, default=0, help=argparse.SUPPRESS)
    parser.add_argument("--end-ms", type=int, help=argparse.SUPPRESS)
    return parser.parse_args()


def sha256(path: str):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def preprocess(image: np.ndarray, size: int = 640):
    ratio = min(size / image.shape[0], size / image.shape[1])
    resized = cv2.resize(image, (int(image.shape[1] * ratio), int(image.shape[0] * ratio)))
    padded = np.full((size, size, 3), 114, dtype=np.uint8)
    padded[: resized.shape[0], : resized.shape[1]] = resized
    return np.ascontiguousarray(padded.transpose(2, 0, 1), dtype=np.float32), ratio


def decode(output: np.ndarray, size: int = 640):
    grids, strides = [], []
    for stride in (8, 16, 32):
        height = width = size // stride
        y, x = np.meshgrid(np.arange(height), np.arange(width), indexing="ij")
        grids.append(np.stack((x, y), 2).reshape(1, -1, 2))
        strides.append(np.full((1, height * width, 1), stride))
    grid, stride = np.concatenate(grids, axis=1), np.concatenate(strides, axis=1)
    output[..., :2] = (output[..., :2] + grid) * stride
    output[..., 2:4] = np.exp(output[..., 2:4]) * stride
    return output


def nms(boxes: np.ndarray, scores: np.ndarray, threshold: float = 0.45):
    if not len(boxes):
        return []
    x1, y1, x2, y2 = boxes.T
    areas, order, keep = (x2 - x1 + 1) * (y2 - y1 + 1), scores.argsort()[::-1], []
    while order.size:
        index = order[0]
        keep.append(int(index))
        xx1, yy1 = np.maximum(x1[index], x1[order[1:]]), np.maximum(y1[index], y1[order[1:]])
        xx2, yy2 = np.minimum(x2[index], x2[order[1:]]), np.minimum(y2[index], y2[order[1:]])
        intersection = np.maximum(0, xx2 - xx1 + 1) * np.maximum(0, yy2 - yy1 + 1)
        overlap = intersection / (areas[index] + areas[order[1:]] - intersection)
        order = order[np.where(overlap <= threshold)[0] + 1]
    return keep


class PersonDetector:
    def __init__(self, model_path: str):
        self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    def detect(self, image: np.ndarray):
        tensor, ratio = preprocess(image)
        prediction = decode(self.session.run(None, {self.input_name: tensor[None]})[0])[0]
        centers, scores = prediction[:, :4], prediction[:, 4] * prediction[:, 5]
        mask = scores >= 0.15
        centers, scores = centers[mask], scores[mask]
        boxes = np.empty_like(centers)
        boxes[:, 0], boxes[:, 1] = centers[:, 0] - centers[:, 2] / 2, centers[:, 1] - centers[:, 3] / 2
        boxes[:, 2], boxes[:, 3] = centers[:, 0] + centers[:, 2] / 2, centers[:, 1] + centers[:, 3] / 2
        boxes /= ratio
        return [(boxes[index], float(scores[index])) for index in nms(boxes, scores)]


def appearance(image: np.ndarray, box: np.ndarray):
    height, width = image.shape[:2]
    x1, y1, x2, y2 = [int(value) for value in box]
    x1, y1, x2, y2 = max(0, x1), max(0, y1), min(width, x2), min(height, y2)
    crop = image[y1 : max(y1 + 1, int(y1 + (y2 - y1) * 0.72)), x1:x2]
    if not crop.size:
        return np.zeros(128, dtype=np.float32), 0.0
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [16, 8], [0, 180, 0, 256]).flatten()
    hist /= max(float(np.linalg.norm(hist)), 1e-8)
    white = float(np.mean((hsv[:, :, 1] < 90) & (hsv[:, :, 2] > 135)))
    return hist.astype(np.float32), white


def camera_shift(previous: np.ndarray | None, current: np.ndarray):
    small = cv2.resize(cv2.cvtColor(current, cv2.COLOR_BGR2GRAY), (480, 270))
    if previous is None:
        return small, 0.0, 0.0
    mask = np.zeros_like(previous)
    mask[: int(mask.shape[0] * 0.62)] = 255
    points = cv2.goodFeaturesToTrack(previous, 350, 0.01, 8, mask=mask)
    if points is None or len(points) < 20:
        return small, 0.0, 0.0
    moved, status, _ = cv2.calcOpticalFlowPyrLK(previous, small, points, None, winSize=(31, 31), maxLevel=4)
    if moved is None:
        return small, 0.0, 0.0
    delta = (moved - points)[status.flatten() == 1].reshape(-1, 2)
    if len(delta) < 15:
        return small, 0.0, 0.0
    median = np.median(delta, axis=0)
    residual = np.linalg.norm(delta - median, axis=1)
    inliers = residual < 4
    confidence = float(np.mean(inliers))
    if confidence < 0.35:
        return small, 0.0, confidence
    return small, float(median[0] * (current.shape[1] / 480)), confidence


@dataclass
class Detection:
    box: np.ndarray
    score: float
    foot_x: float
    foot_y: float
    pano_x: float
    depth: float
    hist: np.ndarray
    white: float
    raw_role: str
    role: str
    team_score: float
    classification: dict
    track_id: str = ""


@dataclass
class Track:
    track_id: str
    pano_x: float
    depth: float
    hist: np.ndarray
    team_score: float
    role: str
    last_ms: int


@dataclass
class TargetState:
    trusted_track_ids: set[str]
    reference: np.ndarray | None = None
    last_hist: np.ndarray | None = None
    last_foot: tuple[float, float] | None = None
    last_ms: int | None = None


def seed_target(
    state: TargetState,
    detections: list[Detection],
    time_ms: int,
    seed_x: float,
    seed_y: float,
    max_distance: float = 96.0,
):
    """Lock a user-reviewed frame to the nearest detection, or fail closed."""
    if not detections:
        return None
    seeded = min(detections, key=lambda detection: math.hypot(detection.foot_x - seed_x, detection.foot_y - seed_y))
    if math.hypot(seeded.foot_x - seed_x, seeded.foot_y - seed_y) > max_distance:
        return None
    state.trusted_track_ids = {seeded.track_id}
    state.reference = seeded.hist.copy() if state.reference is None else state.reference * 0.5 + seeded.hist * 0.5
    state.reference /= max(float(np.linalg.norm(state.reference)), 1e-8)
    state.last_hist = seeded.hist.copy()
    state.last_foot = (seeded.foot_x, seeded.foot_y)
    state.last_ms = time_ms
    return seeded


def select_target(
    state: TargetState,
    detections: list[Detection],
    time_ms: int,
    frame_width: int,
    frame_height: int,
):
    """Continue #13 only while teammate, appearance, and motion evidence agree.

    A detector track ID is deliberately not identity evidence: IDs can hand off
    at crossings. Once a trusted ID is classified as an opponent, it is revoked
    instead of silently carrying the target label onto the other jersey.
    """
    if state.reference is None or state.last_ms is None or state.last_foot is None:
        return None
    gap_ms = time_ms - state.last_ms
    if gap_ms > 1500:
        return None

    candidates: list[tuple[float, float, Detection]] = []
    for detection in detections:
        if detection.track_id in state.trusted_track_ids and detection.raw_role != "teammate":
            state.trusted_track_ids.discard(detection.track_id)
            continue
        if detection.raw_role != "teammate":
            continue
        reference_similarity = similarity(state.reference, detection.hist)
        recent_similarity = similarity(state.last_hist, detection.hist) if state.last_hist is not None else reference_similarity
        dx = (detection.foot_x - state.last_foot[0]) / max(frame_width, 1)
        dy = (detection.foot_y - state.last_foot[1]) / max(frame_height, 1)
        normalized_motion = math.hypot(dx, dy) / max(gap_ms / 1000, 0.001)
        if normalized_motion > 0.52:
            continue
        trusted_bonus = 0.08 if detection.track_id in state.trusted_track_ids else 0.0
        identity_score = reference_similarity * 0.55 + recent_similarity * 0.45
        score = identity_score + trusted_bonus - normalized_motion * 0.18
        candidates.append((score, identity_score, detection))

    candidates.sort(key=lambda item: item[0], reverse=True)
    if not candidates:
        return None
    best_score, best_identity, target = candidates[0]
    runner_up_score = candidates[1][0] if len(candidates) > 1 else -1.0
    runner_up_identity = candidates[1][1] if len(candidates) > 1 else -1.0
    if best_score < 0.79 or best_score - runner_up_score < 0.035 or best_identity - runner_up_identity < 0.035:
        return None

    state.trusted_track_ids.add(target.track_id)
    state.last_hist = target.hist.copy()
    state.last_foot = (target.foot_x, target.foot_y)
    state.last_ms = time_ms
    return target


def similarity(a: np.ndarray, b: np.ndarray):
    return float(np.dot(a, b))


def assign_tracks(detections: list[Detection], tracks: dict[str, Track], time_ms: int, next_id: int):
    active = [track for track in tracks.values() if time_ms - track.last_ms <= 1500]
    if active and detections:
        costs = np.zeros((len(active), len(detections)), dtype=np.float32)
        for row, track in enumerate(active):
            for column, detection in enumerate(detections):
                motion = math.hypot((track.pano_x - detection.pano_x) / 180, (track.depth - detection.depth) / 0.22)
                costs[row, column] = motion + (1 - similarity(track.hist, detection.hist)) * 1.4
        rows, columns = linear_sum_assignment(costs)
        for row, column in zip(rows, columns):
            if costs[row, column] <= 2.8:
                detection = detections[column]
                detection.track_id = active[row].track_id
    for detection in detections:
        if not detection.track_id:
            detection.track_id = f"p-{next_id:04d}"
            next_id += 1
        prior = tracks.get(detection.track_id)
        blend = detection.hist if prior is None else prior.hist * 0.65 + detection.hist * 0.35
        blend /= max(float(np.linalg.norm(blend)), 1e-8)
        if detection.raw_role == "ignore":
            detection.role = "ignore"
            blended_team_score = prior.team_score if prior is not None else detection.team_score
        else:
            blended_team_score = detection.team_score if prior is None or prior.role == "ignore" else prior.team_score * 0.72 + detection.team_score * 0.28
            if prior is not None and prior.role == "teammate":
                detection.role = "teammate" if blended_team_score >= 0.26 else "opponent"
            elif prior is not None and prior.role == "opponent":
                detection.role = "opponent" if blended_team_score <= 0.36 else "teammate"
            else:
                detection.role = "teammate" if blended_team_score >= TEAM_SCORE_THRESHOLD else "opponent"
        tracks[detection.track_id] = Track(detection.track_id, detection.pano_x, detection.depth, blend, blended_team_score, detection.role, time_ms)
    return next_id


def relation_zone(x: float, y: float):
    side = "left" if x < COURT_LENGTH / 2 else "right"
    band = "near" if y < COURT_WIDTH / 3 else "far" if y > COURT_WIDTH * 2 / 3 else "middle"
    return f"{side}-{band}"


def main():
    args = parse_args()
    source_path, model_path = Path(args.source), Path(args.model)
    if not source_path.is_file() or not model_path.is_file():
        raise SystemExit("The linked source and operator-supplied model must both exist.")
    if len(args.source_sha256) != 64:
        raise SystemExit("--source-sha256 must be the previously verified 64-character receipt hash.")
    seeds = []
    for value in args.target_seed:
        time_ms, x, y = value.split(":")
        seeds.append((int(time_ms), float(x), float(y)))

    capture = cv2.VideoCapture(str(source_path))
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    width, height = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH)), int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_ms = round(frame_count / fps * 1000)
    interval = max(1, round(fps / args.sample_fps))
    detector = PersonDetector(str(model_path))
    tracks: dict[str, Track] = {}
    target_state = TargetState(set())
    next_id, index, sampled = 1, -1, 0
    previous_gray, cumulative_shift = None, 0.0
    provisional = []
    all_pano = []

    while True:
        ok, image = capture.read()
        if not ok:
            break
        index += 1
        time_ms = round(index / fps * 1000)
        if time_ms < args.start_ms or index % interval:
            continue
        if args.end_ms is not None and time_ms > args.end_ms:
            break
        previous_gray, shift, pan_confidence = camera_shift(previous_gray, image)
        cumulative_shift += shift
        detections = []
        for box, score in detector.detect(image):
            box_height, box_width = box[3] - box[1], box[2] - box[0]
            foot_x, foot_y = float((box[0] + box[2]) / 2), float(box[3])
            if box_height < height * 0.065 or box_width / max(box_height, 1) > 0.9 or foot_y < height * 0.47 or foot_y > height * 0.97:
                continue
            hist, white = appearance(image, box)
            classification = classify_team(image, box)
            depth = min(1.0, max(0.0, (foot_y / height - 0.44) / 0.46))
            detection = Detection(box, score, foot_x, foot_y, foot_x - cumulative_shift, depth, hist, white, classification.role, classification.role, classification.evidence.team_score, classification.audit_dict())
            detections.append(detection)
        next_id = assign_tracks(detections, tracks, time_ms, next_id)
        all_pano.extend(detection.pano_x for detection in detections if detection.role != "ignore")

        target = None
        for seed_ms, seed_x, seed_y in seeds:
            if abs(seed_ms - time_ms) <= 250 and detections:
                target = seed_target(target_state, detections, time_ms, seed_x, seed_y) or target
        if target is None:
            target = select_target(target_state, detections, time_ms, width, height)

        provisional.append({
            "timeMs": time_ms,
            "targetStatus": "resolved" if target else ("unresolved" if any(detection.role == "teammate" for detection in detections) else "out-of-frame"),
            "targetTrackId": target.track_id if target else None,
            "pan": {"offsetPixels": round(cumulative_shift, 3), "confidence": round(pan_confidence, 4)},
            "detections": detections,
        })
        sampled += 1
        if sampled % 100 == 0:
            print(f"analyzed {time_ms / 1000:.1f}s / {duration_ms / 1000:.1f}s ({sampled} samples)", file=sys.stderr, flush=True)
    capture.release()

    if not all_pano:
        raise SystemExit("No on-court person detections were captured.")
    low, high = np.percentile(np.array(all_pano), [1, 99])
    span = max(float(high - low), 1.0)
    frames = []
    for frame in provisional:
        players = []
        ignored = []
        detections = frame.pop("detections")
        active_detections = [detection for detection in detections if detection.role != "ignore"]
        active_detections.sort(key=lambda detection: (detection.track_id == frame["targetTrackId"], detection.score * detection.classification["confidence"]), reverse=True)
        retained_ids = {id(detection) for detection in active_detections[:10]}
        for detection in detections:
            if detection.role == "ignore" or id(detection) not in retained_ids:
                ignored.append({
                    "trackId": detection.track_id,
                    "role": "ignore",
                    "image": [round(detection.foot_x / width, 5), round(detection.foot_y / height, 5)],
                    "cropBounds": [
                        max(0, round(float(detection.box[0]))),
                        max(0, round(float(detection.box[1]))),
                        max(1, round(float(detection.box[2] - detection.box[0]))),
                        max(1, round(float(detection.box[3] - detection.box[1]))),
                    ],
                    "confidence": round(detection.score * detection.classification["confidence"], 4),
                    "courtMembership": detection.classification["courtMembership"],
                    "reason": detection.classification["reason"] if detection.role == "ignore" else "active-court-cap",
                    "classification": detection.classification,
                })
                continue
            court_x = min(COURT_LENGTH, max(0.0, (detection.pano_x - low) / span * COURT_LENGTH))
            court_y = min(COURT_WIDTH, max(0.0, detection.depth * COURT_WIDTH))
            is_target = detection.track_id == frame["targetTrackId"]
            team = "target" if is_target else detection.role
            players.append({
                "trackId": "13" if is_target else detection.track_id,
                "team": team,
                "court": [round(court_x, 3), round(court_y, 3)],
                "image": [round(detection.foot_x / width, 5), round(detection.foot_y / height, 5)],
                "cropBounds": [
                    max(0, round(float(detection.box[0]))),
                    max(0, round(float(detection.box[1]))),
                    max(1, round(float(detection.box[2] - detection.box[0]))),
                    max(1, round(float(detection.box[3] - detection.box[1]))),
                ],
                "confidence": round(detection.score * max(frame["pan"]["confidence"], 0.35), 4),
                "provenance": "model",
                "projection": "estimated",
                "zone": relation_zone(court_x, court_y),
                "courtMembership": "foreground-court",
                "classification": {**detection.classification, "trackRole": detection.role},
            })
        frame.pop("targetTrackId")
        frames.append({**frame, "players": players, "ignored": ignored})

    frames = stabilize_team_roles(frames)
    output = {
        "version": 1,
        "source": {
            "sha256": args.source_sha256,
            "durationMs": duration_ms,
            "width": width,
            "height": height,
            "fps": fps,
            "byteSize": source_path.stat().st_size,
            "linkedPath": str(source_path),
        },
        "profile": PROFILE,
        "analysis": {
            "revision": 2,
            "executionCount": 1,
            "analyzedAt": args.analyzed_at or datetime.now(timezone.utc).isoformat(),
            "detector": {"name": "YOLOX-s ONNX", "sha256": sha256(str(model_path)), "license": "Apache-2.0"},
            "sampleFps": args.sample_fps,
            "projection": "pan-stabilized-estimate",
            "classification": {
                "name": "foreground-court-central-torso-v2",
                "courtMembership": "half-court-perspective-calibration",
                "teamRule": "white-jersey-teammate-versus-other-opponent",
                "trackAggregation": "high-confidence-frame-uniform-with-track-vote-fallback-v1",
                "maxActivePlayers": 10,
            },
        },
        "coverage": {
            "frameCount": len(frames),
            "firstTimeMs": frames[0]["timeMs"],
            "lastTimeMs": frames[-1]["timeMs"],
            "resolvedTargetFrames": sum(frame["targetStatus"] == "resolved" for frame in frames),
            "unresolvedTargetFrames": sum(frame["targetStatus"] == "unresolved" for frame in frames),
            "outOfFrameTargetFrames": sum(frame["targetStatus"] == "out-of-frame" for frame in frames),
        },
        "frames": frames,
        "corrections": [],
    }
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    temporary.write_text(json.dumps(output, separators=(",", ":")))
    temporary.replace(destination)
    print(json.dumps({"ok": True, "output": str(destination), "coverage": output["coverage"], "analysis": output["analysis"]}, indent=2))


if __name__ == "__main__":
    main()
