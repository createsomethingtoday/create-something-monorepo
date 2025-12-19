/**
 * @create-something/harness
 *
 * Model Detector: Parses model information from Claude Code output.
 *
 * Philosophy: Model detection enables adaptive behavior.
 * Different models have different strengths—the harness should adjust.
 */

import type { DetectedModel, ClaudeModelFamily } from './types.js';

/**
 * Parse model information from Claude Code JSON output.
 */
export function parseModelFromOutput(output: string): DetectedModel | null {
  // Try to parse JSON output
  try {
    const parsed = JSON.parse(output);

    // Look for model field in various locations
    const modelId =
      parsed.model || parsed.metadata?.model || parsed.result?.model || null;

    if (modelId) {
      return parseModelId(modelId);
    }
  } catch {
    // Not JSON, fall through to text parsing
  }

  // Fall back to text parsing
  return extractModelFromText(output);
}

/**
 * Parse a model ID string into structured model info.
 */
export function parseModelId(modelId: string): DetectedModel {
  const raw = modelId;
  const normalized = modelId.toLowerCase();

  // Determine family
  let family: ClaudeModelFamily = 'unknown';
  if (normalized.includes('opus')) family = 'opus';
  else if (normalized.includes('sonnet')) family = 'sonnet';
  else if (normalized.includes('haiku')) family = 'haiku';

  // Extract version date (format: YYYYMMDD)
  const dateMatch = modelId.match(/(\d{8})/);
  const versionDate = dateMatch ? dateMatch[1] : null;

  // Check if it's a "latest" alias
  const isLatest =
    modelId === 'opus' || modelId === 'sonnet' || modelId === 'haiku';

  return {
    modelId: normalized,
    family,
    versionDate,
    isLatest,
    raw,
  };
}

/**
 * Extract model info from unstructured text output.
 */
function extractModelFromText(output: string): DetectedModel | null {
  // Look for patterns like "model": "claude-..." or Model: claude-...
  const patterns = [
    /"model":\s*"([^"]+)"/i,
    /model:\s*(\S+)/i,
    /claude-(?:opus|sonnet|haiku)-[\d]+-[\d]+/i,
    /claude-opus-[\d\-]+/i,
    /claude-sonnet-[\d\-]+/i,
    /claude-haiku-[\d\-]+/i,
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      // Use captured group if exists, otherwise full match
      return parseModelId(match[1] || match[0]);
    }
  }

  return null;
}

/**
 * Format model info for display.
 */
export function formatModelInfo(model: DetectedModel): string {
  const parts = [model.family.toUpperCase()];
  if (model.versionDate) {
    parts.push(`(${model.versionDate})`);
  }
  if (model.isLatest) {
    parts.push('[latest]');
  }
  return parts.join(' ');
}

/**
 * Get the confidence threshold for a detected model.
 * Falls back to default if model is unknown.
 */
export function getModelConfidenceThreshold(
  model: DetectedModel | null,
  config: Record<ClaudeModelFamily, number>
): number {
  const family = model?.family ?? 'unknown';
  return config[family] ?? config.unknown;
}

/**
 * Check if a model is likely to have context overflow issues.
 * Based on historical patterns and model capabilities.
 */
export function isModelContextSensitive(model: DetectedModel | null): boolean {
  if (!model) return true; // Unknown = conservative
  return model.family === 'haiku'; // Haiku has smaller effective context
}
