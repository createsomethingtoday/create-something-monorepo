import type {
  ControlRunExecutor,
  ControlRunExecutorOutcome,
  ControlRunRecord,
  FrozenControlActivation
} from './control.js';

export interface ControlWorkflowDefinition {
  buildReleaseId: string;
  contractSha256: string;
  execute(input: {
    run: ControlRunRecord;
    activation: FrozenControlActivation;
    allowedTools: readonly string[];
    allowedResources: readonly string[];
  }): Promise<ControlRunExecutorOutcome>;
}

/**
 * Provider-neutral dispatch over repo-owned Build releases. A missing exact
 * release/contract registration is a governed dependency failure, never an
 * invitation to improvise a workflow from a prompt.
 */
export class RegisteredControlWorkflowExecutor implements ControlRunExecutor {
  private readonly definitions: Map<string, ControlWorkflowDefinition>;

  constructor(definitions: ControlWorkflowDefinition[]) {
    this.definitions = new Map(
      definitions.map((definition) => [
        `${definition.buildReleaseId}:${definition.contractSha256}`,
        definition
      ])
    );
    if (this.definitions.size !== definitions.length) {
      throw new Error('Control workflow definitions must have unique release and contract identities');
    }
  }

  supports(activation: FrozenControlActivation): boolean {
    return this.definitions.has(`${activation.buildReleaseId}:${activation.contractSha256}`);
  }

  execute(input: Parameters<ControlRunExecutor['execute']>[0]) {
    const definition = this.definitions.get(
      `${input.activation.buildReleaseId}:${input.activation.contractSha256}`
    );
    if (!definition) {
      return Promise.resolve({
        type: 'dependency_failed' as const,
        reason: 'Exact Build release executor is not registered on the owned runtime',
        fallback: 'manual_fallback'
      });
    }
    return definition.execute(input);
  }
}
