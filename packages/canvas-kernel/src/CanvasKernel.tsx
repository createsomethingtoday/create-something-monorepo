import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from 'react';

export type CanvasKernelNode = {
  height: number;
  id: string;
  kind: string;
  label: string;
  status: string;
  width: number;
  x: number;
  y: number;
};

export type CanvasKernelEdge = {
  id: string;
  source: string;
  target: string;
};

export type CanvasKernelProjection = {
  edges: CanvasKernelEdge[];
  nodes: CanvasKernelNode[];
};

export type CanvasKernelViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type CanvasKernelFocusRequest = {
  nodeId: string;
  requestId: number;
} | null;

export type CanvasKernelPalette = {
  activeRing: [number, number, number, number];
  edge: [number, number, number, number];
  kindStripe: Record<string, [number, number, number, number]>;
  nodeBorder: [number, number, number, number];
  nodeFace: [number, number, number, number];
  nodeFaceSelected: [number, number, number, number];
  selectedRing: [number, number, number, number];
  statusRing: Record<string, [number, number, number, number]>;
};

export type CanvasKernelEmphasis = {
  dimUnfocused: boolean;
  edgeIds: ReadonlySet<string>;
  nodeIds: ReadonlySet<string>;
};

export type CanvasKernelEmphasisLevel = 'default' | 'dimmed' | 'focused';

export type CanvasKernelProps = {
  activeNodeIds: Set<string>;
  ariaLabel: string;
  emphasis?: CanvasKernelEmphasis;
  fitRequest: number;
  focusRequest: CanvasKernelFocusRequest;
  onNodeSelect: (nodeId: string) => void;
  onPaneClick: () => void;
  onViewportChange?: (viewport: CanvasKernelViewport) => void;
  palette: CanvasKernelPalette;
  projection: CanvasKernelProjection;
  selectedNodeId: string | null;
};

export type CanvasKernelRenderBackend = 'webgpu' | 'canvas-2d' | 'unavailable';

export const CANVAS_KERNEL_RENDER_BACKENDS = ['webgpu', 'canvas-2d', 'unavailable'] as const;

type FastWebgpuState = {
  context: unknown;
  device: unknown;
  format: string;
  pipeline: unknown;
};

type GraphVertexBuffers = {
  edgeVertices: number[];
  nodeFaces: number[];
  nodeRings: number[];
  nodeStripes: number[];
};

const FAST_MIN_ZOOM = 0.08;
const FAST_MAX_ZOOM = 1.5;
const FAST_LABEL_LIMIT = 180;
const FAST_OVERVIEW_LABEL_LIMIT = 48;
const FAST_OVERVIEW_NODE_THRESHOLD = 220;
const FAST_OVERVIEW_ZOOM = 0.2;
const FAST_VIEW_PADDING = 84;
const FAST_CANVAS_BACKGROUND: [number, number, number, number] = [0.976, 0.976, 0.949, 1];

export type CanvasKernelDrawPlan = {
  labelLimit: number;
  renderEdges: boolean;
  mode: 'overview' | 'map';
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function viewportForNodes(
  nodes: CanvasKernelNode[],
  width: number,
  height: number,
  focusNodeId?: string
): CanvasKernelViewport {
  const focusNode = focusNodeId ? nodes.find((node) => node.id === focusNodeId) : undefined;
  const framedNodes = focusNode ? [focusNode] : nodes;
  if (!framedNodes.length || width <= 0 || height <= 0) return { x: 0, y: 0, zoom: 1 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of framedNodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const boundsWidth = Math.max(1, maxX - minX);
  const boundsHeight = Math.max(1, maxY - minY);
  const padding = focusNode ? 320 : FAST_VIEW_PADDING;
  const zoom = clamp(
    Math.min((width - padding) / boundsWidth, (height - padding) / boundsHeight),
    FAST_MIN_ZOOM,
    focusNode ? 1.05 : 0.86
  );
  const centerX = minX + boundsWidth / 2;
  const centerY = minY + boundsHeight / 2;
  return {
    x: width / 2 - centerX * zoom,
    y: height / 2 - centerY * zoom,
    zoom
  };
}

export function canvasKernelDrawPlan(
  nodeCount: number,
  edgeCount: number,
  zoom: number
): CanvasKernelDrawPlan {
  const overview = nodeCount >= FAST_OVERVIEW_NODE_THRESHOLD && zoom < FAST_OVERVIEW_ZOOM;
  return {
    labelLimit: overview ? FAST_OVERVIEW_LABEL_LIMIT : FAST_LABEL_LIMIT,
    mode: overview ? 'overview' : 'map',
    renderEdges: !overview || edgeCount <= nodeCount
  };
}

export function canvasKernelEmphasisLevel(
  id: string,
  focusedIds: ReadonlySet<string> | undefined,
  dimUnfocused: boolean
): CanvasKernelEmphasisLevel {
  if (!focusedIds) return 'default';
  if (focusedIds.has(id)) return 'focused';
  return dimUnfocused ? 'dimmed' : 'default';
}

function mixColor(
  color: [number, number, number, number],
  target: [number, number, number, number],
  amount: number
): [number, number, number, number] {
  return [
    color[0] + (target[0] - color[0]) * amount,
    color[1] + (target[1] - color[1]) * amount,
    color[2] + (target[2] - color[2]) * amount,
    color[3] + (target[3] - color[3]) * amount
  ];
}

function emphasisColor(
  color: [number, number, number, number],
  level: CanvasKernelEmphasisLevel
): [number, number, number, number] {
  if (level === 'focused') return [color[0], color[1], color[2], Math.max(color[3], 0.82)];
  if (level === 'dimmed') return mixColor(color, FAST_CANVAS_BACKGROUND, 0.76);
  return color;
}

function clipPoint(
  worldX: number,
  worldY: number,
  viewport: CanvasKernelViewport,
  width: number,
  height: number
): [number, number] {
  const screenX = worldX * viewport.zoom + viewport.x;
  const screenY = worldY * viewport.zoom + viewport.y;
  return [(screenX / width) * 2 - 1, 1 - (screenY / height) * 2];
}

function pushVertex(buffer: number[], point: [number, number], color: [number, number, number, number]): void {
  buffer.push(point[0], point[1], color[0], color[1], color[2], color[3]);
}

function pushRect(
  buffer: number[],
  node: CanvasKernelNode,
  inset: number,
  color: [number, number, number, number],
  viewport: CanvasKernelViewport,
  width: number,
  height: number
): void {
  pushRectBounds(
    buffer,
    node.x - inset,
    node.y - inset,
    node.x + node.width + inset,
    node.y + node.height + inset,
    color,
    viewport,
    width,
    height
  );
}

function pushRectBounds(
  buffer: number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: [number, number, number, number],
  viewport: CanvasKernelViewport,
  width: number,
  height: number
): void {
  const topLeft = clipPoint(x1, y1, viewport, width, height);
  const topRight = clipPoint(x2, y1, viewport, width, height);
  const bottomRight = clipPoint(x2, y2, viewport, width, height);
  const bottomLeft = clipPoint(x1, y2, viewport, width, height);
  pushVertex(buffer, topLeft, color);
  pushVertex(buffer, topRight, color);
  pushVertex(buffer, bottomRight, color);
  pushVertex(buffer, topLeft, color);
  pushVertex(buffer, bottomRight, color);
  pushVertex(buffer, bottomLeft, color);
}

function graphVertexBuffers(
  projection: CanvasKernelProjection,
  viewport: CanvasKernelViewport,
  selectedNodeId: string | null,
  activeNodeIds: Set<string>,
  emphasis: CanvasKernelEmphasis | undefined,
  palette: CanvasKernelPalette,
  width: number,
  height: number,
  drawPlan: CanvasKernelDrawPlan
): GraphVertexBuffers {
  const nodeById = new Map(projection.nodes.map((node) => [node.id, node]));
  const edgeVertices: number[] = [];
  if (drawPlan.renderEdges) {
    for (const edge of projection.edges) {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) continue;
      const edgeColor = emphasisColor(
        palette.edge,
        canvasKernelEmphasisLevel(edge.id, emphasis?.edgeIds, emphasis?.dimUnfocused ?? false)
      );
      pushVertex(
        edgeVertices,
        clipPoint(
          source.x + source.width / 2,
          source.y + source.height / 2,
          viewport,
          width,
          height
        ),
        edgeColor
      );
      pushVertex(
        edgeVertices,
        clipPoint(
          target.x + target.width / 2,
          target.y + target.height / 2,
          viewport,
          width,
          height
        ),
        edgeColor
      );
    }
  }

  const nodeRings: number[] = [];
  const nodeFaces: number[] = [];
  const nodeStripes: number[] = [];
  for (const node of projection.nodes) {
    const isSelected = node.id === selectedNodeId;
    const isActive = activeNodeIds.has(node.id);
    const emphasisLevel = canvasKernelEmphasisLevel(
      node.id,
      emphasis?.nodeIds,
      emphasis?.dimUnfocused ?? false
    );
    const isFocused = emphasisLevel === 'focused';
    pushRect(
      nodeRings,
      node,
      isSelected ? 6 : isFocused ? 5 : isActive ? 4 : 2,
      emphasisColor(
        isSelected
          ? palette.selectedRing
          : isFocused || isActive
            ? palette.activeRing
            : (palette.statusRing[node.status] ?? palette.nodeBorder),
        emphasisLevel
      ),
      viewport,
      width,
      height
    );
    pushRect(
      nodeFaces,
      node,
      0,
      emphasisColor(isSelected ? palette.nodeFaceSelected : palette.nodeFace, emphasisLevel),
      viewport,
      width,
      height
    );
    const stripeWidth = Math.max(5, Math.min(8, node.width * 0.05));
    pushRectBounds(
      nodeStripes,
      node.x,
      node.y,
      node.x + stripeWidth,
      node.y + node.height,
      emphasisColor(palette.kindStripe[node.kind] ?? palette.nodeBorder, emphasisLevel),
      viewport,
      width,
      height
    );
  }

  return { edgeVertices, nodeFaces, nodeRings, nodeStripes };
}

function webGpuApi(): {
  GPUBufferUsage: { COPY_DST: number; VERTEX: number };
  navigatorGpu?: {
    getPreferredCanvasFormat: () => string;
    requestAdapter: () => Promise<unknown>;
  };
} {
  return {
    GPUBufferUsage: (globalThis as unknown as { GPUBufferUsage?: { COPY_DST: number; VERTEX: number } })
      .GPUBufferUsage ?? { COPY_DST: 8, VERTEX: 32 },
    navigatorGpu: (navigator as Navigator & {
      gpu?: { getPreferredCanvasFormat: () => string; requestAdapter: () => Promise<unknown> };
    }).gpu
  };
}

async function createWebgpuState(canvas: HTMLCanvasElement): Promise<FastWebgpuState | null> {
  const { GPUBufferUsage, navigatorGpu } = webGpuApi();
  if (!navigatorGpu) return null;
  const adapter = (await navigatorGpu.requestAdapter()) as
    | { requestDevice: () => Promise<unknown> }
    | null;
  if (!adapter) return null;
  const device = (await adapter.requestDevice()) as {
    createBuffer: (descriptor: unknown) => unknown;
    createCommandEncoder: () => {
      beginRenderPass: (descriptor: unknown) => {
        draw: (vertexCount: number) => void;
        end: () => void;
        setPipeline: (pipeline: unknown) => void;
        setVertexBuffer: (slot: number, buffer: unknown) => void;
      };
      finish: () => unknown;
    };
    createRenderPipeline: (descriptor: unknown) => unknown;
    createShaderModule: (descriptor: { code: string }) => unknown;
    queue: {
      submit: (commands: unknown[]) => void;
      writeBuffer: (buffer: unknown, offset: number, data: ArrayBufferView) => void;
    };
  };
  const context = canvas.getContext('webgpu') as
    | {
        configure: (configuration: unknown) => void;
        getCurrentTexture: () => { createView: () => unknown };
      }
    | null;
  if (!context) return null;
  const format = navigatorGpu.getPreferredCanvasFormat();
  context.configure({ alphaMode: 'opaque', device, format });
  const shaderModule = device.createShaderModule({
    code: `
      struct VertexOut {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f
      };

      @vertex
      fn vertex_main(@location(0) position: vec2f, @location(1) color: vec4f) -> VertexOut {
        var output: VertexOut;
        output.position = vec4f(position, 0.0, 1.0);
        output.color = color;
        return output;
      }

      @fragment
      fn fragment_main(@location(0) color: vec4f) -> @location(0) vec4f {
        return color;
      }
    `
  });
  const vertexLayout = {
    arrayStride: 24,
    attributes: [
      { format: 'float32x2', offset: 0, shaderLocation: 0 },
      { format: 'float32x4', offset: 8, shaderLocation: 1 }
    ]
  };
  const pipeline = (topology: 'line-list' | 'triangle-list') =>
    device.createRenderPipeline({
      fragment: {
        entryPoint: 'fragment_main',
        module: shaderModule,
        targets: [{ format }]
      },
      layout: 'auto',
      primitive: { topology },
      vertex: {
        buffers: [vertexLayout],
        entryPoint: 'vertex_main',
        module: shaderModule
      }
    });

  return {
    context,
    device,
    format,
    pipeline: {
      lines: pipeline('line-list'),
      triangles: pipeline('triangle-list'),
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    }
  };
}

function drawWebgpuVertices(
  renderPass: {
    draw: (vertexCount: number) => void;
    setPipeline: (pipeline: unknown) => void;
    setVertexBuffer: (slot: number, buffer: unknown) => void;
  },
  state: FastWebgpuState,
  topology: 'lines' | 'triangles',
  vertices: number[]
): void {
  if (!vertices.length) return;
  const device = state.device as {
    createBuffer: (descriptor: unknown) => unknown;
    queue: { writeBuffer: (buffer: unknown, offset: number, data: ArrayBufferView) => void };
  };
  const pipeline = state.pipeline as {
    lines: unknown;
    triangles: unknown;
    usage: number;
  };
  const data = new Float32Array(vertices);
  const buffer = device.createBuffer({
    mappedAtCreation: false,
    size: Math.max(4, data.byteLength),
    usage: pipeline.usage
  });
  device.queue.writeBuffer(buffer, 0, data);
  renderPass.setPipeline(topology === 'lines' ? pipeline.lines : pipeline.triangles);
  renderPass.setVertexBuffer(0, buffer);
  renderPass.draw(vertices.length / 6);
}

function renderGraphWebgpu(
  state: FastWebgpuState,
  projection: CanvasKernelProjection,
  viewport: CanvasKernelViewport,
  selectedNodeId: string | null,
  activeNodeIds: Set<string>,
  emphasis: CanvasKernelEmphasis | undefined,
  palette: CanvasKernelPalette,
  width: number,
  height: number,
  drawPlan: CanvasKernelDrawPlan
): void {
  const { edgeVertices, nodeFaces, nodeRings, nodeStripes } = graphVertexBuffers(
    projection,
    viewport,
    selectedNodeId,
    activeNodeIds,
    emphasis,
    palette,
    width,
    height,
    drawPlan
  );
  const context = state.context as { getCurrentTexture: () => { createView: () => unknown } };
  const device = state.device as {
    createCommandEncoder: () => {
      beginRenderPass: (descriptor: unknown) => {
        draw: (vertexCount: number) => void;
        end: () => void;
        setPipeline: (pipeline: unknown) => void;
        setVertexBuffer: (slot: number, buffer: unknown) => void;
      };
      finish: () => unknown;
    };
    queue: { submit: (commands: unknown[]) => void };
  };
  const encoder = device.createCommandEncoder();
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        clearValue: { a: 1, b: 0.949, g: 0.976, r: 0.976 },
        loadOp: 'clear',
        storeOp: 'store',
        view: context.getCurrentTexture().createView()
      }
    ]
  });
  drawWebgpuVertices(renderPass, state, 'lines', edgeVertices);
  drawWebgpuVertices(renderPass, state, 'triangles', nodeRings);
  drawWebgpuVertices(renderPass, state, 'triangles', nodeFaces);
  drawWebgpuVertices(renderPass, state, 'triangles', nodeStripes);
  renderPass.end();
  device.queue.submit([encoder.finish()]);
}

function colorToCss(color: [number, number, number, number]): string {
  return `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${color[3]})`;
}

function renderGraphCanvas2d(
  context: CanvasRenderingContext2D,
  projection: CanvasKernelProjection,
  viewport: CanvasKernelViewport,
  selectedNodeId: string | null,
  activeNodeIds: Set<string>,
  emphasis: CanvasKernelEmphasis | undefined,
  palette: CanvasKernelPalette,
  width: number,
  height: number,
  drawPlan: CanvasKernelDrawPlan
): void {
  const canvas = context.canvas;
  const pixelRatio = Math.max(1, canvas.width / Math.max(1, width));
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = 'rgb(249, 249, 242)';
  context.fillRect(0, 0, width, height);

  const nodeById = new Map(projection.nodes.map((node) => [node.id, node]));
  if (drawPlan.renderEdges) {
    const edgeGroups: Record<CanvasKernelEmphasisLevel, CanvasKernelEdge[]> = {
      default: [],
      dimmed: [],
      focused: []
    };
    for (const edge of projection.edges) {
      edgeGroups[
        canvasKernelEmphasisLevel(edge.id, emphasis?.edgeIds, emphasis?.dimUnfocused ?? false)
      ].push(edge);
    }
    for (const level of ['dimmed', 'default', 'focused'] as const) {
      if (!edgeGroups[level].length) continue;
      context.strokeStyle = colorToCss(emphasisColor(palette.edge, level));
      context.lineWidth = level === 'focused' ? 2 : 1;
      context.beginPath();
      for (const edge of edgeGroups[level]) {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) continue;
        context.moveTo(
          (source.x + source.width / 2) * viewport.zoom + viewport.x,
          (source.y + source.height / 2) * viewport.zoom + viewport.y
        );
        context.lineTo(
          (target.x + target.width / 2) * viewport.zoom + viewport.x,
          (target.y + target.height / 2) * viewport.zoom + viewport.y
        );
      }
      context.stroke();
    }
  }

  for (const node of projection.nodes) {
    const left = node.x * viewport.zoom + viewport.x;
    const top = node.y * viewport.zoom + viewport.y;
    const nodeWidth = node.width * viewport.zoom;
    const nodeHeight = node.height * viewport.zoom;
    const isSelected = node.id === selectedNodeId;
    const isActive = activeNodeIds.has(node.id);
    const emphasisLevel = canvasKernelEmphasisLevel(
      node.id,
      emphasis?.nodeIds,
      emphasis?.dimUnfocused ?? false
    );
    const isFocused = emphasisLevel === 'focused';
    const ringColor = emphasisColor(
      isSelected
        ? palette.selectedRing
        : isFocused || isActive
          ? palette.activeRing
          : (palette.statusRing[node.status] ?? palette.nodeBorder),
      emphasisLevel
    );
    context.fillStyle = colorToCss(ringColor);
    const ringWidth = isSelected ? 3 : isFocused ? 2.5 : 2;
    context.fillRect(left - ringWidth, top - ringWidth, nodeWidth + ringWidth * 2, nodeHeight + ringWidth * 2);
    context.fillStyle = colorToCss(
      emphasisColor(isSelected ? palette.nodeFaceSelected : palette.nodeFace, emphasisLevel)
    );
    context.fillRect(left, top, nodeWidth, nodeHeight);
    context.fillStyle = colorToCss(
      emphasisColor(palette.kindStripe[node.kind] ?? palette.nodeBorder, emphasisLevel)
    );
    context.fillRect(left, top, Math.max(3, Math.min(8, nodeWidth * 0.05)), nodeHeight);
  }
}

function screenToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: CanvasKernelViewport
): { x: number; y: number } {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.zoom,
    y: (clientY - rect.top - viewport.y) / viewport.zoom
  };
}

function hitTestNode(nodes: CanvasKernelNode[], worldX: number, worldY: number): string | null {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (
      worldX >= node.x &&
      worldX <= node.x + node.width &&
      worldY >= node.y &&
      worldY <= node.y + node.height
    ) {
      return node.id;
    }
  }
  return null;
}

export function CanvasKernel({
  activeNodeIds,
  ariaLabel,
  emphasis,
  fitRequest,
  focusRequest,
  onNodeSelect,
  onPaneClick,
  onViewportChange,
  palette,
  projection,
  selectedNodeId
}: CanvasKernelProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webgpuRef = useRef<FastWebgpuState | null>(null);
  const canvas2dRef = useRef<CanvasRenderingContext2D | null>(null);
  const dragRef = useRef<{
    moved: boolean;
    pointerId: number;
    pointerX: number;
    pointerY: number;
    viewport: CanvasKernelViewport;
  } | null>(null);
  const [size, setSize] = useState({ height: 1, width: 1 });
  const [viewport, setViewport] = useState<CanvasKernelViewport>({ x: 0, y: 0, zoom: 1 });
  const [renderBackend, setRenderBackend] = useState<CanvasKernelRenderBackend>('unavailable');
  const drawPlan = useMemo(
    () => canvasKernelDrawPlan(projection.nodes.length, projection.edges.length, viewport.zoom),
    [projection.edges.length, projection.nodes.length, viewport.zoom]
  );
  const projectionKey = useMemo(
    () => `${projection.nodes.map((node) => node.id).join('|')}::${projection.edges.length}`,
    [projection]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const syncSize = () => {
      setSize({
        height: Math.max(1, container.clientHeight),
        width: Math.max(1, container.clientWidth)
      });
    };
    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(size.width * pixelRatio));
    const height = Math.max(1, Math.round(size.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  }, [size]);

  useEffect(() => {
    setViewport(viewportForNodes(projection.nodes, size.width, size.height, focusRequest?.nodeId));
  }, [fitRequest, focusRequest?.nodeId, focusRequest?.requestId, projectionKey, size.height, size.width]);

  useEffect(() => {
    onViewportChange?.(viewport);
  }, [onViewportChange, viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const renderWithFallback = () => {
      const context = canvas2dRef.current ?? canvas.getContext('2d', { alpha: false });
      if (!context) {
        setRenderBackend('unavailable');
        return;
      }
      canvas2dRef.current = context;
      renderGraphCanvas2d(
        context,
        projection,
        viewport,
        selectedNodeId,
        activeNodeIds,
        emphasis,
        palette,
        size.width,
        size.height,
        drawPlan
      );
      setRenderBackend('canvas-2d');
    };

    const render = async () => {
      const webgpu = webgpuRef.current ?? (await createWebgpuState(canvas).catch(() => null));
      if (cancelled) return;
      if (webgpu) {
        webgpuRef.current = webgpu;
        try {
          renderGraphWebgpu(
            webgpu,
            projection,
            viewport,
            selectedNodeId,
            activeNodeIds,
            emphasis,
            palette,
            size.width,
            size.height,
            drawPlan
          );
          setRenderBackend('webgpu');
          return;
        } catch {
          webgpuRef.current = null;
        }
      }
      renderWithFallback();
    };

    void render();
    return () => {
      cancelled = true;
    };
  }, [activeNodeIds, drawPlan, emphasis, palette, projection, selectedNodeId, size.height, size.width, viewport]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        moved: false,
        pointerId: event.pointerId,
        pointerX: event.clientX,
        pointerY: event.clientY,
        viewport
      };
    },
    [viewport]
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
    setViewport({
      ...drag.viewport,
      x: drag.viewport.x + dx,
      y: drag.viewport.y + dy
    });
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.moved) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const world = screenToWorld(event.clientX, event.clientY, rect, viewport);
      const nodeId = hitTestNode(projection.nodes, world.x, world.y);
      if (nodeId) onNodeSelect(nodeId);
      else onPaneClick();
    },
    [onNodeSelect, onPaneClick, projection.nodes, viewport]
  );

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const zoomDelta = Math.exp(-event.deltaY * 0.0012);
    setViewport((current) => {
      const nextZoom = clamp(current.zoom * zoomDelta, FAST_MIN_ZOOM, FAST_MAX_ZOOM);
      const before = screenToWorld(event.clientX, event.clientY, rect, current);
      return {
        x: event.clientX - rect.left - before.x * nextZoom,
        y: event.clientY - rect.top - before.y * nextZoom,
        zoom: nextZoom
      };
    });
  }, []);

  const labels = useMemo(() => {
    if (viewport.zoom < 0.14) {
      const selected = selectedNodeId
        ? projection.nodes.find((node) => node.id === selectedNodeId)
        : undefined;
      return selected ? [selected] : [];
    }
    return projection.nodes
      .filter(
        (node) =>
          viewport.zoom > 0.22 ||
          node.id === selectedNodeId ||
          activeNodeIds.has(node.id) ||
          emphasis?.nodeIds.has(node.id)
      )
      .slice(0, drawPlan.labelLimit);
  }, [activeNodeIds, drawPlan.labelLimit, emphasis, projection.nodes, selectedNodeId, viewport.zoom]);

  return (
    <div
      aria-label={ariaLabel}
      className="fast-topology-canvas"
      data-atlas-renderer="canvas-kernel"
      data-edge-count={projection.edges.length}
      data-emphasis={emphasis ? 'active' : 'none'}
      data-focused-edge-count={emphasis?.edgeIds.size ?? 0}
      data-focused-node-count={emphasis?.nodeIds.size ?? 0}
      data-render-mode={drawPlan.mode}
      data-node-count={projection.nodes.length}
      data-render-backend={renderBackend}
      data-viewport={`${Math.round(viewport.x)},${Math.round(viewport.y)},${viewport.zoom.toFixed(4)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      ref={containerRef}
      role="application"
    >
      <canvas aria-hidden="true" ref={canvasRef} />
      <div className="fast-topology-labels" aria-hidden="true">
        {labels.map((node) => {
          const left = node.x * viewport.zoom + viewport.x;
          const top = node.y * viewport.zoom + viewport.y;
          const emphasisLevel = canvasKernelEmphasisLevel(
            node.id,
            emphasis?.nodeIds,
            emphasis?.dimUnfocused ?? false
          );
          return (
            <span
              className={`fast-node-label kind-${node.kind} ${
                node.id === selectedNodeId ? 'selected' : ''
              } ${activeNodeIds.has(node.id) ? 'active' : ''} ${emphasisLevel}`}
              key={node.id}
              style={{
                left,
                maxWidth: Math.max(78, node.width * viewport.zoom),
                top
              }}
            >
              {node.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
