export function measureMotion(
  previous: Uint8ClampedArray,
  current: Uint8ClampedArray,
): number {
  if (previous.length === 0 || previous.length !== current.length || current.length % 4 !== 0) return 0;

  let difference = 0;
  let samples = 0;

  for (let index = 0; index < current.length; index += 4) {
    difference += Math.abs(current[index] - previous[index]);
    difference += Math.abs(current[index + 1] - previous[index + 1]);
    difference += Math.abs(current[index + 2] - previous[index + 2]);
    samples += 3;
  }

  return Math.min(100, Math.round((difference / (samples * 255)) * 100));
}

export function cameraErrorMessage(errorName: string): string {
  if (errorName === "NotAllowedError" || errorName === "SecurityError") {
    return "Camera permission wasn’t allowed. You can keep playing without it.";
  }

  if (errorName === "NotFoundError" || errorName === "OverconstrainedError") {
    return "No camera was found. You can keep playing without it.";
  }

  return "Camera magic isn’t available right now. You can keep playing without it.";
}
