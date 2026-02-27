import { createHash } from 'node:crypto';
import type { CompiledConstraintPolicy, ConstraintPolicy, ContextFact } from './types.js';

export const COMPILER_VERSION = 'constraint-os-polar-compiler-v1';

const RUNTIME_POLICY_SOURCE = `
# Constraint OS runtime interpreter policy.

has_tool_cond(rule_id) if cond_tool(rule_id, _);
has_write_cond(rule_id) if cond_has_write_intent(rule_id, _);
has_human_review_cond(rule_id) if cond_has_human_review_step(rule_id, _);
has_introspection_cond(rule_id) if cond_introspection_ok(rule_id, _);
has_account_cond(rule_id) if cond_account_id(rule_id, _);

tool_ok(rule_id, tool_name) if not has_tool_cond(rule_id);
tool_ok(rule_id, tool_name) if cond_tool(rule_id, tool_name);

write_ok(rule_id, has_write_intent) if not has_write_cond(rule_id);
write_ok(rule_id, has_write_intent) if cond_has_write_intent(rule_id, has_write_intent);

human_review_ok(rule_id, has_human_review_step) if not has_human_review_cond(rule_id);
human_review_ok(rule_id, has_human_review_step) if cond_has_human_review_step(rule_id, has_human_review_step);

introspection_ok_cond(rule_id, introspection_ok) if not has_introspection_cond(rule_id);
introspection_ok_cond(rule_id, introspection_ok) if cond_introspection_ok(rule_id, introspection_ok);

account_ok(rule_id, account_id) if not has_account_cond(rule_id);
account_ok(rule_id, account_id) if cond_account_id(rule_id, account_id);

rule_matches(rule_id, priority, decision, reason, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok) if
  rule(rule_id, priority, decision, reason) and
  tool_ok(rule_id, tool_name) and
  write_ok(rule_id, has_write_intent) and
  human_review_ok(rule_id, has_human_review_step) and
  introspection_ok_cond(rule_id, introspection_ok) and
  account_ok(rule_id, account_id);

has_better_match(priority, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok) if
  rule_matches(_, p2, _, _, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok) and
  p2 < priority;

best_rule(rule_id, priority, decision, reason, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok) if
  rule_matches(rule_id, priority, decision, reason, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok) and
  not has_better_match(priority, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok);

hard_guard(read_only, has_write_intent) if read_only = true and has_write_intent = true;

decision("block", "hard_guard_readonly_write", 0, "Read-only account cannot execute write-intent workflow path.", account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok, read_only) if
  hard_guard(read_only, has_write_intent);

decision(outcome, rule_id, priority, reason, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok, read_only) if
  not hard_guard(read_only, has_write_intent) and
  best_rule(rule_id, priority, outcome, reason, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok);

decision("allow", "policy_default_allow", 999999, "No policy rule matched; default allow.", account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok, read_only) if
  not hard_guard(read_only, has_write_intent) and
  not best_rule(_, _, _, _, account_id, tool_name, has_write_intent, has_human_review_step, introspection_ok);
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
    lines.push(
      `rule(${quotePolar(rule.id)}, ${Math.floor(rule.priority)}, ${quotePolar(rule.then.decision)}, ${quotePolar(rule.then.reason)});`,
    );
    contextFacts.push(['rule', rule.id, Math.floor(rule.priority), rule.then.decision, rule.then.reason]);

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
