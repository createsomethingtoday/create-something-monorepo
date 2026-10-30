export const CAMERA_MAGIC_COPY = {
  startLabel: "Try camera magic",
  requestingLabel: "Opening camera…",
  requestingPrompt: "Princess is opening the magic mirror…",
  collapsedPrompt: "Camera is still optional. Keep playing!",
  idlePrompt: "Camera stays optional. Royal moves still work!",
  activePrompt: "Wave to wake the sparkles.",
  movingPrompt: "Your movement makes sparkles!",
} as const;

export const CAMERA_MAGIC_PREFERENCE_KEY = "princess-pet-palace-camera-v2";
export const CAMERA_PENDING_COLLAPSE_MS = 6500;

export type CameraPreference = "unknown" | "enabled" | "disabled";

export function shouldAutoStartCamera(preference: CameraPreference): boolean {
  return preference !== "disabled";
}

export function shouldCollapseCameraRequest(elapsedMs: number, status: string): boolean {
  return status === "requesting" && elapsedMs >= CAMERA_PENDING_COLLAPSE_MS;
}

export function shouldCompactCamera(
  status: string,
  requestCollapsed: boolean,
  preference: CameraPreference,
): boolean {
  return status === "error" || (status === "requesting" && requestCollapsed) || (status === "idle" && preference === "disabled");
}

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
