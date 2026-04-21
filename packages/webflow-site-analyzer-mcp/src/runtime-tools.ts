export type AnalyzerToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const WORKER_UNSUPPORTED_TOOL_NAMES = new Set([
  'analyze_touchpoints',
  'extract_seo',
  'get_page_structure',
  'analyze_images',
  'get_performance',
  'capture_screenshot',
  'extract_designer_metadata',
  'run_template_review',
  'enqueue_template_review',
  'get_template_review_job',
  'list_template_review_jobs',
]);

export function filterToolDefinitionsForRuntime(
  tools: AnalyzerToolDefinition[],
  runtime: string | undefined = process.env.WEBFLOW_SITE_ANALYZER_RUNTIME,
): AnalyzerToolDefinition[] {
  if (runtime !== 'worker') return tools;
  return tools.filter((tool) => !WORKER_UNSUPPORTED_TOOL_NAMES.has(tool.name));
}
