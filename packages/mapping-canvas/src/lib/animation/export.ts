import { Renderer } from './render';
import type { Project } from './model';
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function png(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))), 'image/png')
  );
}
/** Record a separate canvas; editing/playback never changes the export snapshot. */
export async function exportVideo(
  project: Project,
  progress: (value: number) => void,
  signal: AbortSignal
): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined')
    throw new Error(
      'Video encoding is unavailable in this browser. Export the project for Remotion.'
    );
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/mp4'].find((t) =>
    MediaRecorder.isTypeSupported(t)
  );
  if (!type) throw new Error('No supported video encoder. Export the project for Remotion.');
  const renderer = new Renderer();
  await renderer.prepare(project.assets);
  const canvas = document.createElement('canvas');
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext('2d')!;
  renderer.paint(ctx, project, 0);
  const stream = canvas.captureStream(project.fps),
    recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  let raf = 0;
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      signal.removeEventListener('abort', abort);
      document.removeEventListener('visibilitychange', hidden);
    };
    let failed = false;
    const fail = (message: string) => {
      failed = true;
      if (recorder.state !== 'inactive') recorder.stop();
      cleanup();
      reject(new Error(message));
    };
    const abort = () => fail('Export canceled.');
    const hidden = () => {
      if (document.hidden)
        fail(
          'Export paused by backgrounding. Keep this tab visible and retry, or export the project for Remotion.'
        );
    };
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => fail('Video encoding failed.');
    recorder.onstop = () => {
      cleanup();
      if (!failed) resolve(new Blob(chunks, { type: recorder.mimeType }));
    };
    signal.addEventListener('abort', abort, { once: true });
    document.addEventListener('visibilitychange', hidden);
    if (signal.aborted) {
      abort();
      return;
    }
    recorder.start();
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      renderer.paint(
        ctx,
        project,
        Math.min(project.duration, Math.floor(elapsed * project.fps) / project.fps)
      );
      progress(Math.min(1, elapsed / project.duration));
      if (elapsed >= project.duration) {
        recorder.stop();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
