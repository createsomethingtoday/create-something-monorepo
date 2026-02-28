import { createHash } from 'node:crypto';
import type { CompiledConstraintPolicy, ConstraintPolicy, ContextFact } from './types.js';

export const COMPILER_VERSION = 'policy-os-polar-compiler-v1';

const RUNTIME_POLICY_SOURCE = `
# POLICY OS runtime interpreter policy.

tool_ok(rule_id) if req_tool(rule_id, false);
tool_ok(rule_id) if req_tool(rule_id, true) and input_tool_name(tool_name) and cond_tool(rule_id, tool_name);

write_ok(rule_id) if req_has_write_intent(rule_id, false);
write_ok(rule_id) if
  req_has_write_intent(rule_id, true) and input_has_write_intent(has_write_intent) and cond_has_write_intent(rule_id, has_write_intent);

human_review_ok(rule_id) if req_has_human_review_step(rule_id, false);
human_review_ok(rule_id) if
  req_has_human_review_step(rule_id, true) and
  input_has_human_review_step(has_human_review_step) and
  cond_has_human_review_step(rule_id, has_human_review_step);

introspection_ok_cond(rule_id) if req_introspection_ok(rule_id, false);
introspection_ok_cond(rule_id) if
  req_introspection_ok(rule_id, true) and
  input_introspection_ok(introspection_ok) and
  cond_introspection_ok(rule_id, introspection_ok);

account_ok(rule_id) if req_account_id(rule_id, false);
account_ok(rule_id) if req_account_id(rule_id, true) and input_account_id(account_id) and cond_account_id(rule_id, account_id);

rule_matches(rule_id, priority, decision, reason) if
  rule(rule_id, priority, decision, reason) and
  tool_ok(rule_id) and
  write_ok(rule_id) and
  human_review_ok(rule_id) and
  introspection_ok_cond(rule_id) and
  account_ok(rule_id);
`;

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function quotePolar(input: string): string {
  return `"${input.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function normalizePolicy(policy: ConstraintPolicy): ConstraintPolicy {
  const rules = [...policy.rules].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });
  return { ...policy, rules };
}

function ruleFacts(policy: ConstraintPolicy): { lines: string[]; contextFacts: ContextFact[] } {
  const lines: string[] = [];
  const contextFacts: ContextFact[] = [];

  for (const rule of policy.rules) {
    const hasToolCond = Boolean(rule.when.toolNames && rule.when.toolNames.length > 0);
    const hasWriteCond = typeof rule.when.hasWriteIntent === 'boolean';
    const hasHumanReviewCond = typeof rule.when.hasHumanReviewStep === 'boolean';
    const hasIntrospectionCond = typeof rule.when.introspectionOk === 'boolean';
    const hasAccountCond = Boolean(rule.when.accountIds && rule.when.accountIds.length > 0);

    lines.push(
      `rule(${quotePolar(rule.id)}, ${Math.floor(rule.priority)}, ${quotePolar(rule.then.decision)}, ${quotePolar(rule.then.reason)});`,
    );
    contextFacts.push(['rule', rule.id, Math.floor(rule.priority), rule.then.decision, rule.then.reason]);
    lines.push(`req_tool(${quotePolar(rule.id)}, ${String(hasToolCond)});`);
    contextFacts.push(['req_tool', rule.id, hasToolCond]);
    lines.push(`req_has_write_intent(${quotePolar(rule.id)}, ${String(hasWriteCond)});`);
    contextFacts.push(['req_has_write_intent', rule.id, hasWriteCond]);
    lines.push(`req_has_human_review_step(${quotePolar(rule.id)}, ${String(hasHumanReviewCond)});`);
    contextFacts.push(['req_has_human_review_step', rule.id, hasHumanReviewCond]);
    lines.push(`req_introspection_ok(${quotePolar(rule.id)}, ${String(hasIntrospectionCond)});`);
    contextFacts.push(['req_introspection_ok', rule.id, hasIntrospectionCond]);
    lines.push(`req_account_id(${quotePolar(rule.id)}, ${String(hasAccountCond)});`);
    contextFacts.push(['req_account_id', rule.id, hasAccountCond]);

    if (rule.when.toolNames && rule.when.toolNames.length > 0) {
      const tools = [...rule.when.toolNames].sort();
      for (const toolName of tools) {
        lines.push(`cond_tool(${quotePolar(rule.id)}, ${quotePolar(toolName)});`);
        contextFacts.push(['cond_tool', rule.id, toolName]);
      }
    }

    if (typeof rule.when.hasWriteIntent === 'boolean') {
      lines.push(`cond_has_write_intent(${quotePolar(rule.id)}, ${String(rule.when.hasWriteIntent)});`);
      contextFacts.push(['cond_has_write_intent', rule.id, rule.when.hasWriteIntent]);
    }

    if (typeof rule.when.hasHumanReviewStep === 'boolean') {
      lines.push(`cond_has_human_review_step(${quotePolar(rule.id)}, ${String(rule.when.hasHumanReviewStep)});`);
      contextFacts.push(['cond_has_human_review_step', rule.id, rule.when.hasHumanReviewStep]);
    }

    if (typeof rule.when.introspectionOk === 'boolean') {
      lines.push(`cond_introspection_ok(${quotePolar(rule.id)}, ${String(rule.when.introspectionOk)});`);
      contextFacts.push(['cond_introspection_ok', rule.id, rule.when.introspectionOk]);
    }

    if (rule.when.accountIds && rule.when.accountIds.length > 0) {
      const accounts = [...rule.when.accountIds].sort();
      for (const accountId of accounts) {
        lines.push(`cond_account_id(${quotePolar(rule.id)}, ${quotePolar(accountId)});`);
        contextFacts.push(['cond_account_id', rule.id, accountId]);
      }
    }
  }

  return { lines, contextFacts };
}

export function compileConstraintPolicy(policy: ConstraintPolicy): CompiledConstraintPolicy {
  const normalized = normalizePolicy(policy);
  const facts = ruleFacts(normalized);
  const policyPolar = `${RUNTIME_POLICY_SOURCE.trim()}\n\n# Compiled policy facts\n${facts.lines.join('\n')}\n`;

  return {
    engine: 'polar_v1',
    compilerVersion: COMPILER_VERSION,
    policyPolar,
    policyHash: sha256(policyPolar),
    runtimePolicyHash: sha256(RUNTIME_POLICY_SOURCE),
    fallbackIrJson: JSON.stringify(normalized),
    contextFacts: facts.contextFacts,
  };
}

export function getRuntimePolicySource(): string {
  return RUNTIME_POLICY_SOURCE;
}

export function hashPolicySource(source: string): string {
  return sha256(source);
}
