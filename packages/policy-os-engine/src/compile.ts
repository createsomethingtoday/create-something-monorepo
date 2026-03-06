import { createHash } from 'node:crypto';
import type { CompiledConstraintPolicy, ConstraintPolicy, ContextFact } from './types.js';

export const COMPILER_VERSION = 'policy-os-polar-compiler-v1';

const RUNTIME_POLICY_SOURCE = `
# POLICY OS runtime interpreter policy.

action_ok(rule_id) if req_action_name(rule_id, false);
action_ok(rule_id) if req_action_name(rule_id, true) and input_action_name(action_name) and cond_action_name(rule_id, action_name);

resource_kind_ok(rule_id) if req_resource_kind(rule_id, false);
resource_kind_ok(rule_id) if
  req_resource_kind(rule_id, true) and input_resource_kind(resource_kind) and cond_resource_kind(rule_id, resource_kind);

access_type_ok(rule_id) if req_access_type(rule_id, false);
access_type_ok(rule_id) if req_access_type(rule_id, true) and input_access_type(access_type) and cond_access_type(rule_id, access_type);

oauth_required_ok(rule_id) if req_oauth_required(rule_id, false);
oauth_required_ok(rule_id) if
  req_oauth_required(rule_id, true) and input_oauth_required(oauth_required) and cond_oauth_required(rule_id, oauth_required);

actor_role_ok(rule_id) if req_actor_role(rule_id, false);
actor_role_ok(rule_id) if req_actor_role(rule_id, true) and input_actor_role(actor_role) and cond_actor_role(rule_id, actor_role);

tool_mode_ok(rule_id) if req_tool_mode(rule_id, false);
tool_mode_ok(rule_id) if req_tool_mode(rule_id, true) and input_tool_mode(tool_mode) and cond_tool_mode(rule_id, tool_mode);

identity_source_ok(rule_id) if req_identity_source(rule_id, false);
identity_source_ok(rule_id) if
  req_identity_source(rule_id, true) and input_identity_source(identity_source) and cond_identity_source(rule_id, identity_source);

resource_tag_ok(rule_id) if req_resource_tag(rule_id, false);
resource_tag_ok(rule_id) if req_resource_tag(rule_id, true) and input_resource_tag(resource_tag) and cond_resource_tag(rule_id, resource_tag);

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
  action_ok(rule_id) and
  resource_kind_ok(rule_id) and
  access_type_ok(rule_id) and
  oauth_required_ok(rule_id) and
  actor_role_ok(rule_id) and
  tool_mode_ok(rule_id) and
  identity_source_ok(rule_id) and
  resource_tag_ok(rule_id) and
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
    const hasActionCond = Boolean(rule.when.actionNames && rule.when.actionNames.length > 0);
    const hasResourceKindCond = Boolean(rule.when.resourceKinds && rule.when.resourceKinds.length > 0);
    const hasAccessTypeCond = Boolean(rule.when.accessTypes && rule.when.accessTypes.length > 0);
    const hasOauthRequiredCond = typeof rule.when.oauthRequired === 'boolean';
    const hasActorRoleCond = Boolean(rule.when.actorRoles && rule.when.actorRoles.length > 0);
    const hasToolModeCond = Boolean(rule.when.toolModes && rule.when.toolModes.length > 0);
    const hasIdentitySourceCond = Boolean(rule.when.identitySources && rule.when.identitySources.length > 0);
    const hasResourceTagCond = Boolean(rule.when.resourceTags && rule.when.resourceTags.length > 0);
    const hasToolCond = Boolean(rule.when.toolNames && rule.when.toolNames.length > 0);
    const hasWriteCond = typeof rule.when.hasWriteIntent === 'boolean';
    const hasHumanReviewCond = typeof rule.when.hasHumanReviewStep === 'boolean';
    const hasIntrospectionCond = typeof rule.when.introspectionOk === 'boolean';
    const hasAccountCond = Boolean(rule.when.accountIds && rule.when.accountIds.length > 0);

    lines.push(
      `rule(${quotePolar(rule.id)}, ${Math.floor(rule.priority)}, ${quotePolar(rule.then.decision)}, ${quotePolar(rule.then.reason)});`,
    );
    contextFacts.push(['rule', rule.id, Math.floor(rule.priority), rule.then.decision, rule.then.reason]);
    lines.push(`req_action_name(${quotePolar(rule.id)}, ${String(hasActionCond)});`);
    contextFacts.push(['req_action_name', rule.id, hasActionCond]);
    lines.push(`req_resource_kind(${quotePolar(rule.id)}, ${String(hasResourceKindCond)});`);
    contextFacts.push(['req_resource_kind', rule.id, hasResourceKindCond]);
    lines.push(`req_access_type(${quotePolar(rule.id)}, ${String(hasAccessTypeCond)});`);
    contextFacts.push(['req_access_type', rule.id, hasAccessTypeCond]);
    lines.push(`req_oauth_required(${quotePolar(rule.id)}, ${String(hasOauthRequiredCond)});`);
    contextFacts.push(['req_oauth_required', rule.id, hasOauthRequiredCond]);
    lines.push(`req_actor_role(${quotePolar(rule.id)}, ${String(hasActorRoleCond)});`);
    contextFacts.push(['req_actor_role', rule.id, hasActorRoleCond]);
    lines.push(`req_tool_mode(${quotePolar(rule.id)}, ${String(hasToolModeCond)});`);
    contextFacts.push(['req_tool_mode', rule.id, hasToolModeCond]);
    lines.push(`req_identity_source(${quotePolar(rule.id)}, ${String(hasIdentitySourceCond)});`);
    contextFacts.push(['req_identity_source', rule.id, hasIdentitySourceCond]);
    lines.push(`req_resource_tag(${quotePolar(rule.id)}, ${String(hasResourceTagCond)});`);
    contextFacts.push(['req_resource_tag', rule.id, hasResourceTagCond]);
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

    if (rule.when.actionNames && rule.when.actionNames.length > 0) {
      const actionNames = [...rule.when.actionNames].sort();
      for (const actionName of actionNames) {
        lines.push(`cond_action_name(${quotePolar(rule.id)}, ${quotePolar(actionName)});`);
        contextFacts.push(['cond_action_name', rule.id, actionName]);
      }
    }

    if (rule.when.resourceKinds && rule.when.resourceKinds.length > 0) {
      const resourceKinds = [...rule.when.resourceKinds].sort();
      for (const resourceKind of resourceKinds) {
        lines.push(`cond_resource_kind(${quotePolar(rule.id)}, ${quotePolar(resourceKind)});`);
        contextFacts.push(['cond_resource_kind', rule.id, resourceKind]);
      }
    }

    if (rule.when.accessTypes && rule.when.accessTypes.length > 0) {
      const accessTypes = [...rule.when.accessTypes].sort();
      for (const accessType of accessTypes) {
        lines.push(`cond_access_type(${quotePolar(rule.id)}, ${quotePolar(accessType)});`);
        contextFacts.push(['cond_access_type', rule.id, accessType]);
      }
    }

    if (typeof rule.when.oauthRequired === 'boolean') {
      lines.push(`cond_oauth_required(${quotePolar(rule.id)}, ${String(rule.when.oauthRequired)});`);
      contextFacts.push(['cond_oauth_required', rule.id, rule.when.oauthRequired]);
    }

    if (rule.when.actorRoles && rule.when.actorRoles.length > 0) {
      const actorRoles = [...rule.when.actorRoles].sort();
      for (const actorRole of actorRoles) {
        lines.push(`cond_actor_role(${quotePolar(rule.id)}, ${quotePolar(actorRole)});`);
        contextFacts.push(['cond_actor_role', rule.id, actorRole]);
      }
    }

    if (rule.when.toolModes && rule.when.toolModes.length > 0) {
      const toolModes = [...rule.when.toolModes].sort();
      for (const toolMode of toolModes) {
        lines.push(`cond_tool_mode(${quotePolar(rule.id)}, ${quotePolar(toolMode)});`);
        contextFacts.push(['cond_tool_mode', rule.id, toolMode]);
      }
    }

    if (rule.when.identitySources && rule.when.identitySources.length > 0) {
      const identitySources = [...rule.when.identitySources].sort();
      for (const identitySource of identitySources) {
        lines.push(`cond_identity_source(${quotePolar(rule.id)}, ${quotePolar(identitySource)});`);
        contextFacts.push(['cond_identity_source', rule.id, identitySource]);
      }
    }

    if (rule.when.resourceTags && rule.when.resourceTags.length > 0) {
      const resourceTags = [...rule.when.resourceTags].sort();
      for (const resourceTag of resourceTags) {
        lines.push(`cond_resource_tag(${quotePolar(rule.id)}, ${quotePolar(resourceTag)});`);
        contextFacts.push(['cond_resource_tag', rule.id, resourceTag]);
      }
    }

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
