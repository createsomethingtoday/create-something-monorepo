import type {
  WorkflowEvidenceSource,
  WorkflowEvidenceSourceDescriptor,
} from './types.js';

export async function loadWorkflowEvidenceSource(
  descriptor: WorkflowEvidenceSourceDescriptor,
): Promise<WorkflowEvidenceSource> {
  const content = await readFile(descriptor.path, 'utf8');
  const document = descriptor.kind === 'rule_catalog' ? JSON.parse(content) : parse(content);
  return { ...descriptor, document };
}
import { readFile } from 'node:fs/promises';

import { parse } from 'yaml';
