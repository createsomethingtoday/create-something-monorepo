import { createPaperScene } from './omma-paper-hero-v2/paper/scene.js';

/**
 * Agency owns only the lifecycle boundary around the supplied Omma v2 scene.
 * The archived export remains byte-for-byte intact. Runtime corrections are
 * limited to the reviewed camera-basis, paper-face winding, and draw-group
 * defects. The host keeps pointer parallax event-driven instead of resuming
 * the export's continuous render loop.
 */

export interface ServicesDecisionGateRendererMetrics {
  drawCalls: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  profileId: string;
  withinBudget: boolean;
}

export interface ServicesDecisionGateRendererHandle {
  dispose(forceContextLoss?: boolean): void;
  getMetrics(): ServicesDecisionGateRendererMetrics;
  renderStatic(): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setVisible(visible: boolean): void;
}

interface ServicesDecisionGateRendererOptions {
  reducedMotion: boolean;
}

interface OmmaPaperSceneHandle {
  readonly rig: string;
  dispose(): void;
  pause(): void;
  render(): void;
  resize(): void;
  renderer: {
    domElement: HTMLCanvasElement;
    getContext(): WebGLRenderingContext | WebGL2RenderingContext;
    getPixelRatio(): number;
    info: {
      memory: { geometries: number; textures: number };
      render: { calls: number };
    };
  };
}

const maximumPixelRatio = 1.5;

function verifyWebGLCapability(): void {
  const probe = document.createElement('canvas');
  const attributes: WebGLContextAttributes = {
    failIfMajorPerformanceCaveat: true,
    powerPreference: 'high-performance'
  };
  const context =
    probe.getContext('webgl2', attributes) ?? probe.getContext('webgl', attributes);
  if (!context) throw new Error('A suitable WebGL context is unavailable.');
  context.getExtension('WEBGL_lose_context')?.loseContext();
}

export function createServicesDecisionGateRenderer(
  host: HTMLElement,
  options: ServicesDecisionGateRendererOptions
): ServicesDecisionGateRendererHandle {
  verifyWebGLCapability();

  const app = createPaperScene(host, {
    seed: 20514,
    spread: 1,
    parallax: !options.reducedMotion,
    reducedMotion: options.reducedMotion
  }) as OmmaPaperSceneHandle;
  app.renderer.domElement.setAttribute('aria-hidden', 'true');
  app.renderer.domElement.tabIndex = -1;

  let disposed = false;

  function getMetrics(): ServicesDecisionGateRendererMetrics {
    const info = app.renderer.info;
    const pixelRatio = app.renderer.getPixelRatio();
    return {
      drawCalls: info.render.calls,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      pixelRatio,
      profileId: `omma-paper-hero-v2-${app.rig}`,
      withinBudget:
        info.render.calls <= 96 &&
        info.memory.geometries <= 96 &&
        info.memory.textures <= 16 &&
        pixelRatio <= maximumPixelRatio
    };
  }

  function renderStatic(): void {
    app.render();
  }

  function resize(): void {
    app.resize();
  }

  function setVisible(visible: boolean): void {
    host.style.visibility = visible ? 'visible' : 'hidden';
    app.pause();
    if (visible) app.render();
  }

  function dispose(forceContextLoss = true): void {
    if (disposed) return;
    disposed = true;
    const context = app.renderer.getContext();
    app.dispose();
    if (forceContextLoss) context.getExtension('WEBGL_lose_context')?.loseContext();
  }

  return { dispose, getMetrics, renderStatic, resize, setVisible };
}
