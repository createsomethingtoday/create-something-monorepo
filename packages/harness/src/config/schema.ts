/**
 * @create-something/harness
 *
 * Config Schema: Validate harness configuration.
 * Philosophy: Fail fast with clear error messages.
 */

import type { HarnessConfig } from '../types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a partial harness configuration.
 * Returns errors for invalid config, warnings for suboptimal config.
 */
export function validateConfig(config: Partial<HarnessConfig>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Version check
  if (config.version && config.version !== '1.0') {
    warnings.push(`Unknown config version: ${config.version}. Expected '1.0'.`);
  }

  // Model routing validation
  if (config.modelRouting) {
    const { modelRouting } = config;

    // Validate default model
    if (modelRouting.default && !['opus', 'sonnet', 'haiku'].includes(modelRouting.default)) {
      errors.push(`Invalid modelRouting.default: ${modelRouting.default}. Must be opus, sonnet, or haiku.`);
    }

    // Validate complexity mappings
    if (modelRouting.complexity) {
      for (const [level, model] of Object.entries(modelRouting.complexity)) {
        if (!['opus', 'sonnet', 'haiku'].includes(model as string)) {
          errors.push(`Invalid modelRouting.complexity.${level}: ${model}. Must be opus, sonnet, or haiku.`);
        }
      }
    }

    // Validate patterns are arrays
    if (modelRouting.patterns) {
      for (const [tier, patterns] of Object.entries(modelRouting.patterns)) {
        if (!Array.isArray(patterns)) {
          errors.push(`modelRouting.patterns.${tier} must be an array of strings.`);
        } else {
          for (const pattern of patterns) {
            if (typeof pattern !== 'string') {
              errors.push(`modelRouting.patterns.${tier} contains non-string value: ${pattern}`);
            }
          }
        }
      }
    }

    // Validate escalation
    if (modelRouting.escalation) {
      if (modelRouting.escalation.escalateTo && !['opus', 'sonnet'].includes(modelRouting.escalation.escalateTo)) {
        errors.push(`Invalid modelRouting.escalation.escalateTo: ${modelRouting.escalation.escalateTo}. Must be opus or sonnet.`);
      }
      if (modelRouting.escalation.maxRetries !== undefined && modelRouting.escalation.maxRetries < 0) {
        errors.push(`modelRouting.escalation.maxRetries must be non-negative.`);
      }
    }
  }

  // Quality gates validation
  if (config.qualityGates) {
    const { qualityGates } = config;

    // Validate custom gates
    if (qualityGates.custom) {
      if (!Array.isArray(qualityGates.custom)) {
        errors.push('qualityGates.custom must be an array.');
      } else {
        for (let i = 0; i < qualityGates.custom.length; i++) {
          const gate = qualityGates.custom[i];
          if (!gate.name) {
            errors.push(`qualityGates.custom[${i}] must have a name.`);
          }
          if (!gate.command) {
            errors.push(`qualityGates.custom[${i}] must have a command.`);
          }
          if (gate.timeout !== undefined && gate.timeout <= 0) {
            errors.push(`qualityGates.custom[${i}].timeout must be positive.`);
          }
        }
      }
    }

    // Validate timeout
    if (qualityGates.gateTimeoutMs !== undefined && qualityGates.gateTimeoutMs <= 0) {
      errors.push('qualityGates.gateTimeoutMs must be positive.');
    }
  }

  // Reviewers validation
  if (config.reviewers) {
    const { reviewers } = config;

    // Validate confidence threshold
    if (reviewers.minConfidenceToAdvance !== undefined) {
      if (reviewers.minConfidenceToAdvance < 0 || reviewers.minConfidenceToAdvance > 1) {
        errors.push('reviewers.minConfidenceToAdvance must be between 0 and 1.');
      }
    }

    // Validate reviewer definitions
    if (reviewers.reviewers) {
      if (!Array.isArray(reviewers.reviewers)) {
        errors.push('reviewers.reviewers must be an array.');
      } else {
        for (let i = 0; i < reviewers.reviewers.length; i++) {
          const reviewer = reviewers.reviewers[i];
          if (!reviewer.id) {
            errors.push(`reviewers.reviewers[${i}] must have an id.`);
          }
          if (!reviewer.type) {
            errors.push(`reviewers.reviewers[${i}] must have a type.`);
          }
          if (!['security', 'architecture', 'quality', 'custom'].includes(reviewer.type)) {
            errors.push(`reviewers.reviewers[${i}].type must be security, architecture, quality, or custom.`);
          }
        }
      }
    }
  }

  // Labels validation
  if (config.labels) {
    const { labels } = config;

    if (labels.scope && !Array.isArray(labels.scope)) {
      errors.push('labels.scope must be an array of strings.');
    }
    if (labels.type && !Array.isArray(labels.type)) {
      errors.push('labels.type must be an array of strings.');
    }
    if (labels.discoveryPrefix && typeof labels.discoveryPrefix !== 'string') {
      errors.push('labels.discoveryPrefix must be a string.');
    }
  }

  // Warnings for suboptimal config
  if (config.modelRouting?.patterns) {
    const { haiku, sonnet, opus } = config.modelRouting.patterns;
    if (haiku?.length === 0 && sonnet?.length === 0 && opus?.length === 0) {
      warnings.push('No model routing patterns defined. All tasks will use the default model.');
    }
  }

  if (config.qualityGates?.enabled === false) {
    warnings.push('Quality gates are disabled. Baseline checking will not run.');
  }

  if (config.reviewers?.enabled === false) {
    warnings.push('Peer review is disabled. Code will not be reviewed before advancement.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * JSON Schema for harness config (for external validation tools).
 * Can be exported and published for IDE autocomplete.
 */
export const HARNESS_CONFIG_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'CREATE SOMETHING Harness Configuration',
  description: 'Configuration for the autonomous agent harness. Crystallize your judgment into configurable constraints.',
  type: 'object',
  properties: {
    version: {
      type: 'string',
      enum: ['1.0'],
      description: 'Config schema version',
    },
    modelRouting: {
      type: 'object',
      description: 'Model selection configuration',
      properties: {
        default: {
          type: 'string',
          enum: ['opus', 'sonnet', 'haiku'],
          description: 'Default model for unmatched tasks',
        },
        complexity: {
          type: 'object',
          description: 'Model selection by complexity level',
          properties: {
            trivial: { type: 'string', enum: ['opus', 'sonnet', 'haiku'] },
            simple: { type: 'string', enum: ['opus', 'sonnet', 'haiku'] },
            standard: { type: 'string', enum: ['opus', 'sonnet', 'haiku'] },
            complex: { type: 'string', enum: ['opus', 'sonnet', 'haiku'] },
          },
        },
        patterns: {
          type: 'object',
          description: 'Pattern-based model selection (first match wins)',
          properties: {
            haiku: { type: 'array', items: { type: 'string' } },
            sonnet: { type: 'array', items: { type: 'string' } },
            opus: { type: 'array', items: { type: 'string' } },
          },
        },
        escalation: {
          type: 'object',
          description: 'Model escalation on failure',
          properties: {
            enabled: { type: 'boolean' },
            maxRetries: { type: 'integer', minimum: 0 },
            escalateTo: { type: 'string', enum: ['opus', 'sonnet'] },
          },
        },
      },
    },
    qualityGates: {
      type: 'object',
      description: 'Quality gate configuration',
      properties: {
        enabled: { type: 'boolean' },
        builtIn: {
          type: 'object',
          properties: {
            tests: { type: 'boolean' },
            typecheck: { type: 'boolean' },
            lint: { type: 'boolean' },
            build: { type: 'boolean' },
          },
        },
        custom: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'command'],
            properties: {
              name: { type: 'string' },
              command: { type: 'string' },
              autoFixCommand: { type: 'string' },
              timeout: { type: 'integer', minimum: 1 },
              canBlock: { type: 'boolean' },
            },
          },
        },
        autoFix: { type: 'boolean' },
        createBlockers: { type: 'boolean' },
        gateTimeoutMs: { type: 'integer', minimum: 1 },
      },
    },
    reviewers: {
      type: 'object',
      description: 'Peer review configuration',
      properties: {
        enabled: { type: 'boolean' },
        minConfidenceToAdvance: { type: 'number', minimum: 0, maximum: 1 },
        blockOnCritical: { type: 'boolean' },
        blockOnHigh: { type: 'boolean' },
        reviewers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'type', 'enabled'],
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['security', 'architecture', 'quality', 'custom'] },
              enabled: { type: 'boolean' },
              canBlock: { type: 'boolean' },
              prompt: { type: 'string' },
              includePatterns: { type: 'array', items: { type: 'string' } },
              excludePatterns: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    labels: {
      type: 'object',
      description: 'Label taxonomy configuration',
      properties: {
        scope: { type: 'array', items: { type: 'string' } },
        type: { type: 'array', items: { type: 'string' } },
        discoveryPrefix: { type: 'string' },
      },
    },
  },
};
