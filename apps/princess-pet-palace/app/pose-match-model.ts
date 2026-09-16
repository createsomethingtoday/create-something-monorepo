export type PoseLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type PoseMatchState = {
  phase: "up" | "down" | "left" | "right" | null;
  transitions: number;
  holdFrames: number;
};

export type PoseFrameResult = {
  state: PoseMatchState;
  progress: number;
  matched: boolean;
};

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

export function createPoseMatchState(): PoseMatchState {
  return { phase: null, transitions: 0, holdFrames: 0 };
}

function visibleLandmarks(landmarks: readonly PoseLandmark[], indexes: readonly number[]): boolean {
  return indexes.every((index) => {
    const landmark = landmarks[index];
    return Boolean(landmark) && (landmark.visibility ?? 1) >= 0.45;
  });
}

function holdResult(state: PoseMatchState, poseFits: boolean, framesRequired: number): PoseFrameResult {
  const holdFrames = poseFits ? state.holdFrames + 1 : Math.max(0, state.holdFrames - 1);
  return {
    state: { ...state, holdFrames },
    progress: Math.min(100, Math.round((holdFrames / framesRequired) * 100)),
    matched: holdFrames >= framesRequired,
  };
}

function movementResult(
  state: PoseMatchState,
  phase: PoseMatchState["phase"],
  transitionsRequired: number,
): PoseFrameResult {
  const transitions = phase && state.phase && phase !== state.phase ? state.transitions + 1 : state.transitions;
  const nextState = phase ? { ...state, phase, transitions } : state;
  return {
    state: nextState,
    progress: Math.min(100, Math.round((transitions / transitionsRequired) * 100)),
    matched: transitions >= transitionsRequired,
  };
}

export function evaluatePoseFrame(
  challengeId: string,
  landmarks: readonly PoseLandmark[],
  state: PoseMatchState,
): PoseFrameResult {
  if (challengeId === "move-star" || challengeId === "move-butterfly") {
    const armIndexes = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_WRIST, RIGHT_WRIST];
    if (!visibleLandmarks(landmarks, armIndexes)) return { state, progress: 0, matched: false };

    const leftShoulder = landmarks[LEFT_SHOULDER];
    const rightShoulder = landmarks[RIGHT_SHOULDER];
    const leftElbow = landmarks[LEFT_ELBOW];
    const rightElbow = landmarks[RIGHT_ELBOW];
    const leftWrist = landmarks[LEFT_WRIST];
    const rightWrist = landmarks[RIGHT_WRIST];
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const wristSpread = Math.abs(rightWrist.x - leftWrist.x);
    const starPose =
      leftWrist.y < leftShoulder.y - 0.05 &&
      rightWrist.y < rightShoulder.y - 0.05 &&
      leftElbow.y < leftShoulder.y &&
      rightElbow.y < rightShoulder.y &&
      wristSpread > shoulderWidth * 2;

    if (challengeId === "move-star") return holdResult(state, starPose, 4);

    const wingsUp =
      leftWrist.y < leftShoulder.y + 0.02 &&
      rightWrist.y < rightShoulder.y + 0.02 &&
      leftElbow.y < leftShoulder.y + 0.08 &&
      rightElbow.y < rightShoulder.y + 0.08 &&
      wristSpread > shoulderWidth * 2;
    const armsDown =
      leftWrist.y > leftShoulder.y + 0.18 &&
      rightWrist.y > rightShoulder.y + 0.18 &&
      wristSpread > shoulderWidth * 1.8;
    const phase = wingsUp ? "up" : armsDown ? "down" : null;
    return movementResult(state, phase, 3);
  }

  if (challengeId === "move-flamingo" || challengeId === "move-crown") {
    const legIndexes = [LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE];
    if (!visibleLandmarks(landmarks, legIndexes)) return { state, progress: 0, matched: false };

    const leftKnee = landmarks[LEFT_KNEE];
    const rightKnee = landmarks[RIGHT_KNEE];
    const leftAnkle = landmarks[LEFT_ANKLE];
    const rightAnkle = landmarks[RIGHT_ANKLE];
    const ankleDifference = leftAnkle.y - rightAnkle.y;

    if (challengeId === "move-flamingo") {
      const leftLifted = ankleDifference < -0.13 && leftAnkle.y < leftKnee.y + 0.08;
      const rightLifted = ankleDifference > 0.13 && rightAnkle.y < rightKnee.y + 0.08;
      return holdResult(state, leftLifted || rightLifted, 5);
    }

    const phase = ankleDifference < -0.07 ? "left" : ankleDifference > 0.07 ? "right" : null;
    return movementResult(state, phase, 3);
  }

  return { state, progress: 0, matched: false };
}
