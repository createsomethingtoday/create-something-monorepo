/**
 * Diagram Types
 * Type definitions for Canon-compliant Svelte diagram components
 */

// ============================================
// Core Types
// ============================================

export interface DiagramConfig {
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  /** Property for theming: io, space, agency, ltd */
  property?: 'io' | 'space' | 'agency' | 'ltd';
  /** Show CREATE SOMETHING branding */
  branded?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

// ============================================
// Flow Diagrams
// ============================================

export type FlowNodeShape = 'rect' | 'circle' | 'diamond' | 'cloud' | 'cylinder';

export interface FlowNode {
  id: string;
  label: string;
  sublabel?: string;
  shape?: FlowNodeShape;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface FlowDiagramData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction?: 'horizontal' | 'vertical';
}

// ============================================
// Charts
// ============================================

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartData {
  data: DataPoint[];
  showValues?: boolean;
  showGrid?: boolean;
}

export interface LineSeriesData {
  name: string;
  data: { x: number | string; y: number }[];
  color?: string;
}

export interface LineChartData {
  series: LineSeriesData[];
  showPoints?: boolean;
  showGrid?: boolean;
  xLabel?: string;
  yLabel?: string;
}

export interface PieChartData {
  data: DataPoint[];
  donut?: boolean;
  showLabels?: boolean;
  showPercentages?: boolean;
}

// ============================================
// Timeline
// ============================================

export interface TimelineEvent {
  date: string;
  label: string;
  description?: string;
  highlight?: boolean;
}

export interface TimelineData {
  events: TimelineEvent[];
  orientation?: 'horizontal' | 'vertical';
}

// ============================================
// Matrix
// ============================================

export interface MatrixCell {
  value: string | number | boolean;
  highlight?: boolean;
}

export interface MatrixData {
  rowHeaders: string[];
  columnHeaders: string[];
  cells: MatrixCell[][];
  caption?: string;
}

// ============================================
// Export
// ============================================

export type ExportFormat = 'svg' | 'png';

export interface ExportOptions {
  format: ExportFormat;
  scale?: number;
  filename?: string;
}

// ============================================
// Knowledge Graph (Canvas-based)
// ============================================

export interface GraphNode {
  id: string;
  label: string;
  type?: 'concept' | 'entity' | 'relation' | 'document';
  weight?: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
  type?: 'dependency' | 'reference' | 'contains' | 'related';
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================
// Canvas Diagram (Interactive)
// ============================================

export type ShapeType = 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'path' | 'image';

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  selectable?: boolean;
  draggable?: boolean;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  x2: number;
  y2: number;
  dash?: number[];
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  x2: number;
  y2: number;
  headSize?: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: CanvasTextAlign;
}

export interface PathShape extends BaseShape {
  type: 'path';
  path: string;
}

export interface ImageShape extends BaseShape {
  type: 'image';
  src: string;
  width: number;
  height: number;
}

export type DiagramShape =
  | RectShape
  | CircleShape
  | LineShape
  | ArrowShape
  | TextShape
  | PathShape
  | ImageShape;

// ============================================
// Timeline Editor (Animation)
// ============================================

export interface Keyframe {
  id: string;
  frame: number;
  value: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
}

export interface AnimationTrack {
  id: string;
  name: string;
  type: 'position' | 'opacity' | 'scale' | 'rotation' | 'custom';
  keyframes: Keyframe[];
  color?: string;
  collapsed?: boolean;
}
