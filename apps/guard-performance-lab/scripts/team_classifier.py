"""Video-specific foreground-court and uniform evidence for Guard Player Trace.

This module intentionally separates court membership from jersey role. The
foreground boundary is calibrated to the supplied half-court camera view; it is
not a general multi-court model. Team evidence is measured only inside the
central torso crop so skin, shoes, floor glare, and nearby players have less
influence than they did in revision 1's whole-box white ratio.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from collections import defaultdict

import cv2
import numpy as np


FOREGROUND_CENTER_X = 0.55
FOREGROUND_BASE_Y = 0.51
FOREGROUND_EDGE_SLOPE = 0.10
TEAM_SCORE_THRESHOLD = 0.31
FRAME_ROLE_OVERRIDE_CONFIDENCE = 0.78


@dataclass(frozen=True)
class TeamEvidence:
    white_ratio: float
    dark_ratio: float
    red_ratio: float
    blue_ratio: float
    vertical_transition_ratio: float
    team_score: float
    foot_x: float
    foot_y: float
    foreground_boundary_y: float


@dataclass(frozen=True)
class TeamClassification:
    role: str
    court_membership: str
    confidence: float
    reason: str
    evidence: TeamEvidence

    def audit_dict(self):
        value = asdict(self)
        value["courtMembership"] = value.pop("court_membership")
        value["evidence"] = {
            "whiteRatio": value["evidence"].pop("white_ratio"),
            "darkRatio": value["evidence"].pop("dark_ratio"),
            "redRatio": value["evidence"].pop("red_ratio"),
            "blueRatio": value["evidence"].pop("blue_ratio"),
            "verticalTransitionRatio": value["evidence"].pop("vertical_transition_ratio"),
            "teamScore": value["evidence"].pop("team_score"),
            "footX": value["evidence"].pop("foot_x"),
            "footY": value["evidence"].pop("foot_y"),
            "foregroundBoundaryY": value["evidence"].pop("foreground_boundary_y"),
        }
        return value


def foreground_boundary(normalized_x: float):
    return FOREGROUND_BASE_Y + FOREGROUND_EDGE_SLOPE * abs(normalized_x - FOREGROUND_CENTER_X)


def extract_team_evidence(image: np.ndarray, box: np.ndarray | list[float]):
    image_height, image_width = image.shape[:2]
    x1, y1, x2, y2 = [int(value) for value in box]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(image_width, x2), min(image_height, y2)
    box_width, box_height = max(1, x2 - x1), max(1, y2 - y1)
    torso = image[
        y1 + int(box_height * 0.12) : max(y1 + 1, y1 + int(box_height * 0.58)),
        x1 + int(box_width * 0.18) : max(x1 + 1, x1 + int(box_width * 0.82)),
    ]
    if not torso.size:
        torso = image[y1 : max(y1 + 1, y2), x1 : max(x1 + 1, x2)]
    hsv = cv2.cvtColor(torso, cv2.COLOR_BGR2HSV)
    hue, saturation, value = cv2.split(hsv)
    gray = cv2.cvtColor(torso, cv2.COLOR_BGR2GRAY).astype(np.float32)
    white = float(np.mean((saturation < 90) & (value > 135)))
    dark = float(np.mean(value < 105))
    red = float(np.mean(((hue < 18) | (hue > 162)) & (saturation > 90) & (value > 70)))
    blue = float(np.mean((hue >= 70) & (hue <= 130) & (saturation > 70) & (value > 60)))
    transitions = float(np.mean(np.abs(np.diff(gray, axis=1)) > 7)) if torso.shape[1] > 1 else 0.0
    foot_x = ((x1 + x2) / 2) / image_width
    foot_y = y2 / image_height
    team_score = white + blue * 5 - red * 0.5 - dark * 0.25
    return TeamEvidence(white, dark, red, blue, transitions, team_score, foot_x, foot_y, foreground_boundary(foot_x))


def classify_team(image: np.ndarray, box: np.ndarray | list[float]):
    evidence = extract_team_evidence(image, box)
    image_height = image.shape[0]
    box_height = (float(box[3]) - float(box[1])) / image_height
    outside_foreground = evidence.foot_y < evidence.foreground_boundary_y
    official = evidence.vertical_transition_ratio > 0.52 and evidence.blue_ratio > 0.13
    gray_sideline = evidence.white_ratio > 0.55 and evidence.blue_ratio > 0.20 and evidence.foot_y < 0.57
    red_sideline = evidence.red_ratio > 0.70 and evidence.foot_y < 0.57
    edge_sideline = evidence.foot_x > 0.80 and evidence.foot_y < 0.58 and box_height < 0.17
    if outside_foreground:
        margin = evidence.foreground_boundary_y - evidence.foot_y
        return TeamClassification("ignore", "opposite-court", min(0.99, 0.75 + margin * 4), "outside-foreground-court-calibration", evidence)
    if official:
        return TeamClassification("ignore", "foreground-court", 0.94, "official-stripe-evidence", evidence)
    if gray_sideline or red_sideline or edge_sideline:
        return TeamClassification("ignore", "foreground-court", 0.88, "sideline-or-non-player-traffic", evidence)
    role = "teammate" if evidence.team_score >= TEAM_SCORE_THRESHOLD else "opponent"
    confidence = min(0.99, 0.72 + abs(evidence.team_score - TEAM_SCORE_THRESHOLD) * 0.45)
    return TeamClassification(role, "foreground-court", confidence, "central-torso-uniform-evidence", evidence)


def stabilize_team_roles(frames: list[dict]):
    """Resolve traffic roles without letting a reused tracker id override clear uniforms.

    The raw frame role and torso evidence remain embedded in `classification`;
    high-confidence white-versus-other evidence controls the current frame while
    the full-track vote is retained as a fallback for ambiguous crops. Target
    samples are excluded because #13 identity is a separate contract.
    """
    votes: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])
    for frame in frames:
        for player in frame["players"]:
            if player["team"] == "target":
                continue
            raw_role = player.get("classification", {}).get("role", player["team"])
            index = 0 if raw_role == "teammate" else 1
            votes[player["trackId"]][index] += float(player["confidence"])
    stable_roles = {track_id: "teammate" if weights[0] >= weights[1] else "opponent" for track_id, weights in votes.items()}
    for frame in frames:
        for player in frame["players"]:
            if player["team"] == "target":
                continue
            classification = player.setdefault("classification", {})
            raw_role = classification.get("role", player["team"])
            stable_role = stable_roles[player["trackId"]]
            frame_confidence = float(classification.get("confidence", 0))
            use_frame_role = raw_role in {"teammate", "opponent"} and frame_confidence >= FRAME_ROLE_OVERRIDE_CONFIDENCE
            player["team"] = raw_role if use_frame_role else stable_role
            classification["frameRole"] = raw_role
            classification["trackRole"] = stable_role
            classification["resolvedRole"] = player["team"]
            classification["roleSource"] = "high-confidence-frame-uniform" if use_frame_role else "track-vote-fallback"
            classification["trackVote"] = {
                "teammate": round(votes[player["trackId"]][0], 4),
                "opponent": round(votes[player["trackId"]][1], 4),
            }
    return frames
