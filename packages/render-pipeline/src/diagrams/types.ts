/**
 * Diagram Types
 * Type definitions for Canon-compliant programmatic diagrams
 */

// ============================================
// Core Types
// ============================================

export interface DiagramConfig {
  width: number;
  height: number;
  padding?: number;
  title?: string;
  subtitle?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
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
  position?: Point; // Auto-calculated if not provided
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  arrow?: 'forward' | 'backward' | 'both' | 'none';
}

export interface FlowDiagram {
  type: 'flow';
  config: DiagramConfig;
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction?: 'horizontal' | 'vertical';
}

// ============================================
// Comparison Matrix
// ============================================

export interface MatrixCell {
  value: string | number | boolean;
  highlight?: boolean;
}

export interface MatrixDiagram {
  type: 'matrix';
  config: DiagramConfig;
  rowHeaders: string[];
  columnHeaders: string[];
  cells: MatrixCell[][];
  caption?: string;
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

export interface TimelineDiagram {
  type: 'timeline';
  config: DiagramConfig;
  events: TimelineEvent[];
  orientation?: 'horizontal' | 'vertical';
}

// ============================================
// Charts
// ============================================

export interface DataPoint {
  label: string;
  value: number;
  color?: string; // Override Canon default
}

export interface BarChartDiagram {
  type: 'bar';
  config: DiagramConfig;
  data: DataPoint[];
  orientation?: 'horizontal' | 'vertical';
  showValues?: boolean;
  showGrid?: boolean;
}

export interface LineChartDiagram {
  type: 'line';
  config: DiagramConfig;
  series: {
    name: string;
    data: { x: number | string; y: number }[];
    color?: string;
  }[];
  showPoints?: boolean;
  showGrid?: boolean;
  xLabel?: string;
  yLabel?: string;
}

export interface PieChartDiagram {
  type: 'pie';
  config: DiagramConfig;
  data: DataPoint[];
  donut?: boolean;
  showLabels?: boolean;
  showPercentages?: boolean;
}

// ============================================
// Org Chart
// ============================================

export interface OrgNode {
  id: string;
  label: string;
  sublabel?: string;
  children?: OrgNode[];
}

export interface OrgChartDiagram {
  type: 'org';
  config: DiagramConfig;
  root: OrgNode;
}

// ============================================
// Union Type
// ============================================

export type Diagram =
  | FlowDiagram
  | MatrixDiagram
  | TimelineDiagram
  | BarChartDiagram
  | LineChartDiagram
  | PieChartDiagram
  | OrgChartDiagram;

// ============================================
// Output Types
// ============================================

export interface RenderResult {
  svg: string;
  width: number;
  height: number;
}

export interface ExportOptions {
  format: 'svg' | 'png';
  scale?: number; // For PNG, default 2x for retina
  outputPath?: string;
}
