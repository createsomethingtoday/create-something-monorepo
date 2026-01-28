<script lang="ts">
  import {
    FlowDiagram,
    BarChart,
    LineChart,
    PieChart,
    Timeline,
    Matrix,
    downloadDiagram,
    SEO,
    type FlowDiagramData,
    type BarChartData,
    type LineChartData,
    type PieChartData,
    type TimelineData,
    type MatrixData,
  } from '@create-something/canon';

  // Flow diagram data
  const flowData: FlowDiagramData = {
    nodes: [
      { id: 'input', label: 'Input', sublabel: 'Raw data' },
      { id: 'process', label: 'Process', shape: 'diamond' },
      { id: 'output', label: 'Output', sublabel: 'Result' },
    ],
    edges: [
      { from: 'input', to: 'process', label: 'validate' },
      { from: 'process', to: 'output', label: 'transform' },
    ],
    direction: 'horizontal',
  };

  // Bar chart data
  const barData: BarChartData = {
    data: [
      { label: 'Q1', value: 120 },
      { label: 'Q2', value: 180 },
      { label: 'Q3', value: 150 },
      { label: 'Q4', value: 220 },
    ],
    showValues: true,
    showGrid: true,
  };

  // Line chart data
  const lineData: LineChartData = {
    series: [
      {
        name: 'Revenue',
        data: [
          { x: 0, y: 100 },
          { x: 1, y: 150 },
          { x: 2, y: 130 },
          { x: 3, y: 200 },
          { x: 4, y: 180 },
        ],
      },
      {
        name: 'Costs',
        data: [
          { x: 0, y: 80 },
          { x: 1, y: 90 },
          { x: 2, y: 85 },
          { x: 3, y: 110 },
          { x: 4, y: 100 },
        ],
      },
    ],
    showPoints: true,
    showGrid: true,
  };

  // Pie chart data
  const pieData: PieChartData = {
    data: [
      { label: 'Research', value: 35 },
      { label: 'Development', value: 40 },
      { label: 'Design', value: 15 },
      { label: 'Marketing', value: 10 },
    ],
    donut: false,
    showLabels: true,
    showPercentages: true,
  };

  // Timeline data
  const timelineData: TimelineData = {
    events: [
      { date: '2024 Q1', label: 'Research', description: 'Initial exploration' },
      { date: '2024 Q2', label: 'Prototype', highlight: true },
      { date: '2024 Q3', label: 'Beta', description: 'User testing' },
      { date: '2024 Q4', label: 'Launch', highlight: true },
    ],
    orientation: 'horizontal',
  };

  // Matrix data
  const matrixData: MatrixData = {
    rows: ['Feature A', 'Feature B', 'Feature C'],
    columns: ['Basic', 'Pro', 'Enterprise'],
    cells: [
      { row: 0, col: 0, value: '✓', highlight: true },
      { row: 0, col: 1, value: '✓', highlight: true },
      { row: 0, col: 2, value: '✓', highlight: true },
      { row: 1, col: 0, value: '—' },
      { row: 1, col: 1, value: '✓', highlight: true },
      { row: 1, col: 2, value: '✓', highlight: true },
      { row: 2, col: 0, value: '—' },
      { row: 2, col: 1, value: '—' },
      { row: 2, col: 2, value: '✓', highlight: true },
    ],
    showLabels: true,
  };

  let currentDiagram: SVGElement | null = null;

  function handleExport(el: SVGElement, name: string) {
    downloadDiagram(el, { filename: name, scale: 2 });
  }
</script>

<SEO
  title="Diagram Components"
  description="Canon-compliant data visualization with property-aware theming. Flow diagrams, charts, timelines, and matrices."
  keywords="diagram components, data visualization, flow diagram, bar chart, line chart, pie chart, timeline, matrix"
  propertyName="io"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.io' },
    { name: 'Experiments', url: 'https://createsomething.io/experiments' },
    { name: 'Diagrams', url: 'https://createsomething.io/experiments/diagrams' }
  ]}
/>

<div class="container">
  <header>
    <h1>Diagram Components</h1>
    <p class="subtitle">Canon-compliant data visualization with property-aware theming</p>
  </header>

  <section class="diagram-section">
    <h2>Flow Diagram</h2>
    <div class="diagram-wrapper">
      <FlowDiagram
        data={flowData}
        config={{ title: 'Data Pipeline', property: 'io', branded: true }}
      />
    </div>
  </section>

  <section class="diagram-section">
    <h2>Bar Chart</h2>
    <div class="diagram-wrapper">
      <BarChart
        data={barData}
        config={{ title: 'Quarterly Performance', property: 'io', branded: true }}
      />
    </div>
  </section>

  <section class="diagram-section">
    <h2>Line Chart</h2>
    <div class="diagram-wrapper">
      <LineChart
        data={lineData}
        config={{ title: 'Revenue vs Costs', property: 'io', branded: true }}
      />
    </div>
  </section>

  <section class="diagram-section">
    <h2>Pie Chart</h2>
    <div class="diagram-row">
      <div class="diagram-wrapper">
        <PieChart
          data={pieData}
          config={{ title: 'Budget Allocation', property: 'io', branded: true }}
        />
      </div>
      <div class="diagram-wrapper">
        <PieChart
          data={{ ...pieData, donut: true }}
          config={{ title: 'Donut Variant', property: 'space', branded: true }}
        />
      </div>
    </div>
  </section>

  <section class="diagram-section">
    <h2>Timeline</h2>
    <div class="diagram-wrapper">
      <Timeline
        data={timelineData}
        config={{ title: 'Project Roadmap', property: 'io', branded: true }}
      />
    </div>
  </section>

  <section class="diagram-section">
    <h2>Matrix</h2>
    <div class="diagram-wrapper">
      <Matrix
        data={matrixData}
        config={{ title: 'Feature Comparison', property: 'io', branded: true }}
      />
    </div>
  </section>

  <section class="diagram-section">
    <h2>Property Theming</h2>
    <p class="description">Each property has a distinct accent color</p>
    <div class="diagram-row">
      <div class="diagram-wrapper small">
        <BarChart
          data={{ data: [{ label: 'A', value: 80 }, { label: 'B', value: 120 }], showValues: true }}
          config={{ width: 300, height: 200, property: 'io', branded: true }}
        />
        <span class="label">.io (blue)</span>
      </div>
      <div class="diagram-wrapper small">
        <BarChart
          data={{ data: [{ label: 'A', value: 80 }, { label: 'B', value: 120 }], showValues: true }}
          config={{ width: 300, height: 200, property: 'space', branded: true }}
        />
        <span class="label">.space (green)</span>
      </div>
      <div class="diagram-wrapper small">
        <BarChart
          data={{ data: [{ label: 'A', value: 80 }, { label: 'B', value: 120 }], showValues: true }}
          config={{ width: 300, height: 200, property: 'agency', branded: true }}
        />
        <span class="label">.agency (purple)</span>
      </div>
      <div class="diagram-wrapper small">
        <BarChart
          data={{ data: [{ label: 'A', value: 80 }, { label: 'B', value: 120 }], showValues: true }}
          config={{ width: 300, height: 200, property: 'ltd', branded: true }}
        />
        <span class="label">.ltd (white)</span>
      </div>
    </div>
  </section>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-lg, 2.618rem);
  }

  header {
    margin-bottom: var(--space-xl, 4.236rem);
  }

  h1 {
    font-size: var(--text-h1, 2.5rem);
    color: var(--color-fg-primary, #ffffff);
    margin-bottom: var(--space-sm, 1rem);
  }

  h2 {
    font-size: var(--text-h3, 1.5rem);
    color: var(--color-fg-primary, #ffffff);
    margin-bottom: var(--space-md, 1.618rem);
  }

  .subtitle {
    font-size: var(--text-body, 1rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
  }

  .description {
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
    margin-bottom: var(--space-md, 1.618rem);
  }

  .diagram-section {
    margin-bottom: var(--space-xl, 4.236rem);
  }

  .diagram-wrapper {
    display: inline-block;
    border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    border-radius: var(--radius-lg, 12px);
    overflow: hidden;
  }

  .diagram-wrapper.small {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .diagram-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md, 1.618rem);
  }

  .label {
    display: block;
    text-align: center;
    padding: var(--space-xs, 0.5rem);
    font-size: var(--text-caption, 0.75rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
  }
</style>
