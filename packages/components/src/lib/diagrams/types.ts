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
