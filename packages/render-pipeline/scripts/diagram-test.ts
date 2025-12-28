#!/usr/bin/env tsx
/**
 * Diagram Test Script
 * Generates sample diagrams to verify the renderer
 *
 * Usage:
 *   pnpm diagram-test
 */

import * as path from 'path';
import { render, saveToFile, exportBoth } from '../src/diagrams/index.js';
import type {
  FlowDiagram,
  BarChartDiagram,
  LineChartDiagram,
  PieChartDiagram,
  TimelineDiagram,
  MatrixDiagram,
} from '../src/diagrams/types.js';

const OUTPUT_DIR = './diagram-examples';

async function main() {
  console.log('Generating Canon-compliant diagram examples...\n');

  // 1. Flow Diagram - System Architecture
  const flowDiagram: FlowDiagram = {
    type: 'flow',
    config: {
      width: 800,
      height: 400,
      title: 'System Architecture',
      subtitle: 'Data flow between services',
    },
    nodes: [
      { id: 'client', label: 'Client', sublabel: 'Browser', shape: 'rect' },
      { id: 'api', label: 'API Gateway', sublabel: 'REST/GraphQL', shape: 'rect' },
      { id: 'auth', label: 'Auth', sublabel: 'JWT', shape: 'diamond' },
      { id: 'db', label: 'Database', sublabel: 'D1', shape: 'cylinder' },
      { id: 'cache', label: 'Cache', sublabel: 'KV', shape: 'cloud' },
    ],
    edges: [
      { from: 'client', to: 'api', label: 'HTTPS' },
      { from: 'api', to: 'auth' },
      { from: 'auth', to: 'db' },
      { from: 'api', to: 'cache', style: 'dashed' },
    ],
    direction: 'horizontal',
  };

  console.log('1. Flow Diagram (System Architecture)');
  const flowResult = render(flowDiagram);
  await exportBoth(flowResult, path.join(OUTPUT_DIR, 'flow-architecture'));
  console.log('   ✓ Saved to diagram-examples/flow-architecture.{svg,png}');

  // 2. Bar Chart - Performance Metrics
  const barChart: BarChartDiagram = {
    type: 'bar',
    config: {
      width: 600,
      height: 400,
      title: 'Response Time by Endpoint',
    },
    data: [
      { label: '/api/users', value: 45 },
      { label: '/api/posts', value: 82 },
      { label: '/api/auth', value: 23 },
      { label: '/api/search', value: 156 },
      { label: '/api/upload', value: 312 },
    ],
    showValues: true,
    showGrid: true,
  };

  console.log('2. Bar Chart (Response Times)');
  const barResult = render(barChart);
  await exportBoth(barResult, path.join(OUTPUT_DIR, 'chart-bar'));
  console.log('   ✓ Saved to diagram-examples/chart-bar.{svg,png}');

  // 3. Line Chart - Growth Over Time
  const lineChart: LineChartDiagram = {
    type: 'line',
    config: {
      width: 700,
      height: 400,
      title: 'User Growth',
    },
    series: [
      {
        name: 'Active Users',
        data: [
          { x: 0, y: 100 },
          { x: 1, y: 150 },
          { x: 2, y: 280 },
          { x: 3, y: 320 },
          { x: 4, y: 450 },
          { x: 5, y: 620 },
        ],
      },
      {
        name: 'New Signups',
        data: [
          { x: 0, y: 50 },
          { x: 1, y: 80 },
          { x: 2, y: 120 },
          { x: 3, y: 90 },
          { x: 4, y: 140 },
          { x: 5, y: 180 },
        ],
      },
    ],
    showPoints: true,
    showGrid: true,
  };

  console.log('3. Line Chart (User Growth)');
  const lineResult = render(lineChart);
  await exportBoth(lineResult, path.join(OUTPUT_DIR, 'chart-line'));
  console.log('   ✓ Saved to diagram-examples/chart-line.{svg,png}');

  // 4. Pie Chart - Traffic Distribution
  const pieChart: PieChartDiagram = {
    type: 'pie',
    config: {
      width: 500,
      height: 400,
      title: 'Traffic Sources',
    },
    data: [
      { label: 'Organic', value: 45 },
      { label: 'Direct', value: 25 },
      { label: 'Social', value: 18 },
      { label: 'Referral', value: 12 },
    ],
    donut: true,
    showLabels: true,
    showPercentages: true,
  };

  console.log('4. Pie Chart (Traffic Sources)');
  const pieResult = render(pieChart);
  await exportBoth(pieResult, path.join(OUTPUT_DIR, 'chart-pie'));
  console.log('   ✓ Saved to diagram-examples/chart-pie.{svg,png}');

  // 5. Timeline - Project Milestones
  const timeline: TimelineDiagram = {
    type: 'timeline',
    config: {
      width: 900,
      height: 300,
      title: 'Project Milestones',
      subtitle: '2024 Development Roadmap',
    },
    events: [
      { date: 'Q1', label: 'MVP Launch', highlight: true },
      { date: 'Q2', label: 'Beta Testing', description: '500 users' },
      { date: 'Q3', label: 'Public Release', highlight: true },
      { date: 'Q4', label: 'Enterprise', description: 'B2B features' },
    ],
    orientation: 'horizontal',
  };

  console.log('5. Timeline (Project Milestones)');
  const timelineResult = render(timeline);
  await exportBoth(timelineResult, path.join(OUTPUT_DIR, 'timeline'));
  console.log('   ✓ Saved to diagram-examples/timeline.{svg,png}');

  // 6. Matrix - Feature Comparison
  const matrix: MatrixDiagram = {
    type: 'matrix',
    config: {
      width: 700,
      height: 400,
      title: 'Feature Comparison',
    },
    rowHeaders: ['Auth', 'API', 'Storage', 'Analytics', 'Support'],
    columnHeaders: ['Free', 'Pro', 'Enterprise'],
    cells: [
      [{ value: true }, { value: true }, { value: true }],
      [{ value: '100/day' }, { value: '10K/day' }, { value: 'Unlimited', highlight: true }],
      [{ value: '1GB' }, { value: '100GB' }, { value: 'Unlimited', highlight: true }],
      [{ value: false }, { value: true }, { value: true }],
      [{ value: 'Community' }, { value: 'Email' }, { value: '24/7', highlight: true }],
    ],
    caption: 'All plans include core features',
  };

  console.log('6. Matrix (Feature Comparison)');
  const matrixResult = render(matrix);
  await exportBoth(matrixResult, path.join(OUTPUT_DIR, 'matrix'));
  console.log('   ✓ Saved to diagram-examples/matrix.{svg,png}');

  console.log(`
=== All diagrams generated ===
  Output directory: ${OUTPUT_DIR}
  Files: 6 diagrams x 2 formats = 12 files

Open the SVG files in a browser or the PNG files in any image viewer.
`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
