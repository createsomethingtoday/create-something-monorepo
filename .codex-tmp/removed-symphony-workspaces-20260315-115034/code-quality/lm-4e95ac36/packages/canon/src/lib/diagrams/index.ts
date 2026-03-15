// Diagram Components
export { default as FlowDiagram } from './FlowDiagram.svelte';
export { default as BarChart } from './BarChart.svelte';
export { default as LineChart } from './LineChart.svelte';
export { default as PieChart } from './PieChart.svelte';
export { default as Timeline } from './Timeline.svelte';
export { default as Matrix } from './Matrix.svelte';

// Canvas-based Components
export { default as KnowledgeGraphCanvas } from './KnowledgeGraphCanvas.svelte';
export { default as CanvasDiagram } from './CanvasDiagram.svelte';

// Types
export type {
  DiagramConfig,
  FlowNode,
  FlowEdge,
  FlowDiagramData,
  BarChartData,
  DataPoint,
  LineChartData,
  LineSeriesData,
  PieChartData,
  TimelineData,
  TimelineEvent,
  MatrixData,
  MatrixCell,
  // Canvas types
  GraphNode,
  GraphEdge,
  KnowledgeGraphData,
  ShapeType,
  BaseShape,
  RectShape,
  CircleShape,
  LineShape,
  ArrowShape,
  TextShape,
  PathShape,
  ImageShape,
  DiagramShape,
  Keyframe,
  AnimationTrack,
} from './types.js';

// Theme utilities (Property type is exported from brand module)
export { theme, propertyAccents, getAccentColor, getDataColor } from './theme.js';

// Export utilities
export {
  exportToPng,
  exportToSvg,
  downloadBlob,
  downloadDiagram,
  copyDiagramToClipboard,
  type ExportOptions,
} from './export.js';