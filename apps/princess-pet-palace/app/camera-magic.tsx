"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMERA_MAGIC_COPY,
  CAMERA_MAGIC_PREFERENCE_KEY,
  cameraErrorMessage,
  measureMotion,
  shouldAutoStartCamera,
  type CameraPreference,
} from "./camera-magic-model";

type CameraStatus = "idle" | "requesting" | "active" | "error";

export function CameraMagic() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousFrame = useRef<Uint8ClampedArray | null>(null);
  const motionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [message, setMessage] = useState("");
  const [motionLevel, setMotionLevel] = useState(0);

  const releaseCamera = useCallback(() => {
    if (motionTimer.current) clearInterval(motionTimer.current);
    motionTimer.current = null;
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

  const rememberPreference = useCallback((preference: Exclude<CameraPreference, "unknown">) => {
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
    if (!navigator.mediaDevices?.getUserMedia) {
      startingRef.current = false;
      setStatus("error");
      setMessage(cameraErrorMessage("Unavailable"));
      return;
    }

    setStatus("requesting");
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
      rememberPreference("enabled");
      setStatus("active");
      motionTimer.current = setInterval(readMotion, 220);
    } catch (error) {
      releaseCamera();
      startingRef.current = false;
      if (!mountedRef.current) return;
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
        rememberPreference("disabled");
      }
      setStatus("error");
      setMessage(cameraErrorMessage(error instanceof DOMException ? error.name : "UnknownError"));
    }
  }, [readMotion, releaseCamera, rememberPreference]);

  useEffect(() => {
    let preference: CameraPreference = "unknown";
    try {
      const stored = window.localStorage.getItem(CAMERA_MAGIC_PREFERENCE_KEY);
      if (stored === "enabled" || stored === "disabled") preference = stored;
    } catch {
      // Default to automatic camera magic when storage is unavailable.
    }

    if (!shouldAutoStartCamera(preference)) return;
    const autoStartTimer = window.setTimeout(() => void startCamera(), 0);
    return () => window.clearTimeout(autoStartTimer);
  }, [startCamera]);

  const stopCamera = () => {
    releaseCamera();
    setMotionLevel(0);
    setMessage("");
    rememberPreference("disabled");
    setStatus("idle");
  };

  const sparkleCount = motionLevel > 38 ? 6 : motionLevel > 15 ? 4 : 2;

  return (
    <section className={`camera-magic camera-${status}`} aria-label="Optional camera magic">
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
        <span className="camera-status-pill">
          <i aria-hidden="true" /> {status === "active" ? "Camera on" : status === "requesting" ? "Opening…" : "Camera optional"}
        </span>
      </div>

      <div className="camera-details">
        <div>
          <p className="camera-title">Magic mirror <span>(optional)</span></p>
          <p className="camera-copy">
            {status === "active"
              ? (motionLevel > 14 ? CAMERA_MAGIC_COPY.movingPrompt : CAMERA_MAGIC_COPY.activePrompt)
              : status === "requesting" ? CAMERA_MAGIC_COPY.requestingPrompt : CAMERA_MAGIC_COPY.idlePrompt}
          </p>
        </div>
        {status === "active" ? (
          <button className="camera-button camera-stop" type="button" onClick={stopCamera}>Turn camera off</button>
        ) : status === "idle" || status === "error" ? (
          <button className="camera-button" type="button" onClick={startCamera} disabled={status === "requesting"}>
            <span className="camera-button-icon" aria-hidden="true">📷✨</span>
            <span>{CAMERA_MAGIC_COPY.startLabel}</span>
          </button>
        ) : <span className="camera-opening" aria-hidden="true">•••</span>}
      </div>

      {status === "active" && (
        <div className="motion-meter" aria-label={`Camera sparkle level ${motionLevel} percent`}>
          <span style={{ width: `${motionLevel}%` }} />
        </div>
      )}
      {message && <p className="camera-message" role="status" aria-live="polite">{message}</p>}
    </section>
  );
}
