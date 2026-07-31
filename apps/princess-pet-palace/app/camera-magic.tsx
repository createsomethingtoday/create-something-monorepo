"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  CAMERA_MAGIC_COPY,
  CAMERA_MAGIC_PREFERENCE_KEY,
  CAMERA_PENDING_COLLAPSE_MS,
  cameraErrorMessage,
  measureMotion,
  shouldAutoStartCamera,
  shouldCompactCamera,
  type CameraPreference,
} from "./camera-magic-model";
import { createBrowserPoseLandmarker } from "./pose-landmarker";
import { createPoseMatchState, evaluatePoseFrame } from "./pose-match-model";

type CameraStatus = "idle" | "requesting" | "active" | "error";
type PoseStatus = "idle" | "loading" | "ready" | "matched" | "unavailable";

export function CameraMagic({
  challengeId,
  detectionEnabled,
  onPoseMatched,
}: {
  challengeId: string;
  detectionEnabled: boolean;
  onPoseMatched: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousFrame = useRef<Uint8ClampedArray | null>(null);
  const motionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const poseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const poseMatchStateRef = useRef(createPoseMatchState());
  const poseMatchedRef = useRef(false);
  const lastPoseVideoTime = useRef(-1);
  const challengeIdRef = useRef(challengeId);
  const detectionEnabledRef = useRef(detectionEnabled);
  const onPoseMatchedRef = useRef(onPoseMatched);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [message, setMessage] = useState("");
  const [motionLevel, setMotionLevel] = useState(0);
  const [requestCollapsed, setRequestCollapsed] = useState(false);
  const [preference, setPreference] = useState<CameraPreference>("unknown");
  const [poseStatus, setPoseStatus] = useState<PoseStatus>("idle");
  const [poseProgress, setPoseProgress] = useState(0);

  useEffect(() => {
    challengeIdRef.current = challengeId;
    detectionEnabledRef.current = detectionEnabled;
    onPoseMatchedRef.current = onPoseMatched;
  }, [challengeId, detectionEnabled, onPoseMatched]);

  const releaseCamera = useCallback(() => {
    if (motionTimer.current) clearInterval(motionTimer.current);
    if (poseTimer.current) clearInterval(poseTimer.current);
    if (pendingCollapseTimer.current) clearTimeout(pendingCollapseTimer.current);
    motionTimer.current = null;
    poseTimer.current = null;
    pendingCollapseTimer.current = null;
    poseLandmarkerRef.current?.close();
    poseLandmarkerRef.current = null;
    poseMatchStateRef.current = createPoseMatchState();
    poseMatchedRef.current = false;
    lastPoseVideoTime.current = -1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    previousFrame.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseCamera();
    };
  }, [releaseCamera]);

  const readMotion = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const measured = previousFrame.current ? measureMotion(previousFrame.current, frame) : 0;
    previousFrame.current = new Uint8ClampedArray(frame);
    setMotionLevel((current) => Math.round(current * 0.55 + Math.min(100, measured * 5) * 0.45));
  }, []);

  const readPose = useCallback(() => {
    const video = videoRef.current;
    const poseLandmarker = poseLandmarkerRef.current;
    if (!video || !poseLandmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.currentTime === lastPoseVideoTime.current) return;

    try {
      const result = poseLandmarker.detectForVideo(video, performance.now());
      lastPoseVideoTime.current = video.currentTime;
      const landmarks = result.landmarks[0];
      if (!landmarks) {
        setPoseProgress(0);
        return;
      }
      if (!detectionEnabledRef.current) {
        poseMatchStateRef.current = createPoseMatchState();
        setPoseProgress(0);
        return;
      }
      const frame = evaluatePoseFrame(challengeIdRef.current, landmarks, poseMatchStateRef.current);
      poseMatchStateRef.current = frame.state;
      setPoseProgress(frame.progress);
      if (frame.matched && !poseMatchedRef.current) {
        poseMatchedRef.current = true;
        setPoseStatus("matched");
        onPoseMatchedRef.current();
      }
    } catch {
      if (poseTimer.current) clearInterval(poseTimer.current);
      poseTimer.current = null;
      setPoseStatus("unavailable");
      setPoseProgress(0);
    }
  }, []);

  const startPoseTracking = useCallback(async () => {
    setPoseStatus("loading");
    setPoseProgress(0);
    try {
      const poseLandmarker = await createBrowserPoseLandmarker();
      if (!mountedRef.current || !streamRef.current) {
        poseLandmarker.close();
        return;
      }
      poseLandmarkerRef.current = poseLandmarker;
      poseMatchStateRef.current = createPoseMatchState();
      poseMatchedRef.current = false;
      setPoseStatus("ready");
      poseTimer.current = setInterval(readPose, 240);
    } catch {
      if (mountedRef.current) setPoseStatus("unavailable");
    }
  }, [readPose]);

  const rememberPreference = useCallback((preference: Exclude<CameraPreference, "unknown">) => {
    setPreference(preference);
    try {
      window.localStorage.setItem(CAMERA_MAGIC_PREFERENCE_KEY, preference);
    } catch {
      // Camera play still works when browser storage is unavailable.
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (startingRef.current || streamRef.current) return;
    startingRef.current = true;
    setMessage("");
    setRequestCollapsed(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      startingRef.current = false;
      rememberPreference("disabled");
      setStatus("error");
      setMessage(cameraErrorMessage("Unavailable"));
      return;
    }

    setStatus("requesting");
    pendingCollapseTimer.current = setTimeout(() => {
      if (mountedRef.current) setRequestCollapsed(true);
    }, CAMERA_PENDING_COLLAPSE_MS);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        startingRef.current = false;
        return;
      }
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        releaseCamera();
        setMotionLevel(0);
        setStatus("error");
        setMessage("Camera magic stopped. You can keep playing without it.");
      }, { once: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        startingRef.current = false;
        return;
      }
      startingRef.current = false;
      if (pendingCollapseTimer.current) clearTimeout(pendingCollapseTimer.current);
      pendingCollapseTimer.current = null;
      setRequestCollapsed(false);
      rememberPreference("enabled");
      setStatus("active");
      motionTimer.current = setInterval(readMotion, 220);
      void startPoseTracking();
    } catch (error) {
      releaseCamera();
      startingRef.current = false;
      if (!mountedRef.current) return;
      if (error instanceof DOMException && ["NotAllowedError", "SecurityError", "NotFoundError", "OverconstrainedError"].includes(error.name)) {
        rememberPreference("disabled");
      }
      setStatus("error");
      setRequestCollapsed(false);
      setMessage(cameraErrorMessage(error instanceof DOMException ? error.name : "UnknownError"));
    }
  }, [readMotion, releaseCamera, rememberPreference, startPoseTracking]);

  useEffect(() => {
    let preference: CameraPreference = "unknown";
    try {
      const stored = window.localStorage.getItem(CAMERA_MAGIC_PREFERENCE_KEY);
      if (stored === "enabled" || stored === "disabled") preference = stored;
    } catch {
      // Default to automatic camera magic when storage is unavailable.
    }

    const autoStartTimer = window.setTimeout(() => {
      setPreference(preference);
      if (shouldAutoStartCamera(preference)) void startCamera();
    }, 0);
    return () => window.clearTimeout(autoStartTimer);
  }, [startCamera]);

  const stopCamera = () => {
    releaseCamera();
    setMotionLevel(0);
    setMessage("");
    setRequestCollapsed(false);
    setPoseStatus("idle");
    setPoseProgress(0);
    rememberPreference("disabled");
    setStatus("idle");
  };

  const sparkleCount = motionLevel > 38 ? 6 : motionLevel > 15 ? 4 : 2;
  const cameraCompact = shouldCompactCamera(status, requestCollapsed, preference);
  const poseCopy =
    poseStatus === "loading"
      ? "Princess is finding your royal pose…"
      : poseStatus === "matched"
        ? "You did the royal move!"
        : poseStatus === "ready" && !detectionEnabled
          ? "Listen to the princess, then copy her."
          : poseStatus === "ready" && poseProgress > 0
            ? "Keep copying the princess!"
            : poseStatus === "ready"
              ? "Step back so the magic mirror can see you."
              : poseStatus === "unavailable"
                ? "Keep playing with the royal timer."
                : CAMERA_MAGIC_COPY.activePrompt;

  return (
    <section className={`camera-magic camera-${status} ${cameraCompact ? "camera-compact" : ""}`} aria-label="Optional camera magic">
      <div className="camera-stage">
        <video ref={videoRef} className="camera-video" playsInline muted aria-label="Live camera preview" />
        <canvas ref={canvasRef} className="camera-canvas" width="48" height="36" aria-hidden="true" />
        {status !== "active" && (
          <div className="camera-placeholder" aria-hidden="true">
            <span className="camera-princess">👸</span>
            <span className="camera-wand">✨</span>
          </div>
        )}
        {status === "active" && (
          <div className="camera-sparkles" aria-hidden="true">
            {Array.from({ length: sparkleCount }, (_, index) => <span key={index}>✦</span>)}
          </div>
        )}
        {status === "active" && (
          <span className={`pose-guide-badge pose-${poseStatus}`} aria-hidden="true">
            {poseStatus === "matched" ? "👑✨" : poseStatus === "loading" ? "👸✨" : detectionEnabled ? "👸 → 🤸‍♀️" : "👸 🔊"}
          </span>
        )}
        <span className="camera-status-pill">
          <i aria-hidden="true" /> {status === "active" ? "Camera on" : status === "requesting" ? "Opening…" : "Camera optional"}
        </span>
      </div>

      <div className="camera-details">
        <div>
          <p className="camera-title">Magic mirror <span>(optional)</span></p>
          <p className="camera-copy">
            {status === "active"
              ? poseCopy
              : status === "requesting" ? (requestCollapsed ? CAMERA_MAGIC_COPY.collapsedPrompt : CAMERA_MAGIC_COPY.requestingPrompt) : status === "error" || preference === "disabled" ? CAMERA_MAGIC_COPY.collapsedPrompt : CAMERA_MAGIC_COPY.idlePrompt}
          </p>
        </div>
        {status === "active" ? (
          <button className="camera-button camera-stop" type="button" onClick={stopCamera}>Turn camera off</button>
        ) : status === "idle" && preference !== "disabled" ? (
          <button className="camera-button" type="button" onClick={startCamera} disabled={status === "requesting"}>
            <span className="camera-button-icon" aria-hidden="true">📷✨</span>
            <span>{CAMERA_MAGIC_COPY.startLabel}</span>
          </button>
        ) : <span className="camera-opening" aria-hidden="true">{status === "requesting" ? "•••" : "✨"}</span>}
      </div>

      {status === "active" && (
        <div className="motion-meter" aria-label={`Royal move match ${poseProgress} percent`}>
          <span style={{ width: `${poseProgress}%` }} />
        </div>
      )}
      {message && <p className="camera-message" role="status" aria-live="polite">{message}</p>}
    </section>
  );
}
