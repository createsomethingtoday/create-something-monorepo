#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
	CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES as CANON_SOURCE_PUBLIC_EXPORT_CLASSIFICATION_RULES
} from '../../canon/src/lib/registry/index.js';
import {
	CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES as MCP_GENERATED_PUBLIC_EXPORT_CLASSIFICATION_RULES
} from '../src/content/generated/canon-public-export-classification.js';

assert.deepEqual(
	MCP_GENERATED_PUBLIC_EXPORT_CLASSIFICATION_RULES,
	CANON_SOURCE_PUBLIC_EXPORT_CLASSIFICATION_RULES,
	'MCP generated Canon public export classification rules must match Canon source'
);

assert.ok(
	MCP_GENERATED_PUBLIC_EXPORT_CLASSIFICATION_RULES.length > 0,
	'MCP generated Canon public export classification rules must not be empty'
);

assert.ok(
	MCP_GENERATED_PUBLIC_EXPORT_CLASSIFICATION_RULES.some(
		(rule) => rule.registryPolicy === 'candidate-review'
	),
	'MCP generated Canon public export classification rules must expose candidate-review policy'
);

assert.ok(
	MCP_GENERATED_PUBLIC_EXPORT_CLASSIFICATION_RULES.some(
		(rule) => rule.registryPolicy === 'classified-out'
	),
	'MCP generated Canon public export classification rules must expose classified-out policy'
);

console.log('Canon public export classification MCP parity passed.');
