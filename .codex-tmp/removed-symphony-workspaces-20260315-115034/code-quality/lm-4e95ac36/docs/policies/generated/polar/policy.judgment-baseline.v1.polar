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

service_tier_ok(rule_id) if req_service_tier(rule_id, false);
service_tier_ok(rule_id) if
  req_service_tier(rule_id, true) and input_service_tier(service_tier) and cond_service_tier(rule_id, service_tier);

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

service_entitled_ok(rule_id) if req_service_entitled(rule_id, false);
service_entitled_ok(rule_id) if
  req_service_entitled(rule_id, true) and
  input_service_entitled(service_entitled) and
  cond_service_entitled(rule_id, service_entitled);

policy_accepted_ok(rule_id) if req_policy_accepted(rule_id, false);
policy_accepted_ok(rule_id) if
  req_policy_accepted(rule_id, true) and
  input_policy_accepted(policy_accepted) and
  cond_policy_accepted(rule_id, policy_accepted);

contract_active_ok(rule_id) if req_contract_active(rule_id, false);
contract_active_ok(rule_id) if
  req_contract_active(rule_id, true) and
  input_contract_active(contract_active) and
  cond_contract_active(rule_id, contract_active);

billing_active_ok(rule_id) if req_billing_active(rule_id, false);
billing_active_ok(rule_id) if
  req_billing_active(rule_id, true) and
  input_billing_active(billing_active) and
  cond_billing_active(rule_id, billing_active);

approved_exception_ok(rule_id) if req_approved_exception_present(rule_id, false);
approved_exception_ok(rule_id) if
  req_approved_exception_present(rule_id, true) and
  input_approved_exception_present(approved_exception_present) and
  cond_approved_exception_present(rule_id, approved_exception_present);

account_ok(rule_id) if req_account_id(rule_id, false);
account_ok(rule_id) if req_account_id(rule_id, true) and input_account_id(account_id) and cond_account_id(rule_id, account_id);

rule_matches(rule_id, priority, decision, reason) if
  rule(rule_id, priority, decision, reason) and
  action_ok(rule_id) and
  resource_kind_ok(rule_id) and
  access_type_ok(rule_id) and
  oauth_required_ok(rule_id) and
  service_tier_ok(rule_id) and
  actor_role_ok(rule_id) and
  tool_mode_ok(rule_id) and
  identity_source_ok(rule_id) and
  resource_tag_ok(rule_id) and
  tool_ok(rule_id) and
  write_ok(rule_id) and
  human_review_ok(rule_id) and
  introspection_ok_cond(rule_id) and
  service_entitled_ok(rule_id) and
  policy_accepted_ok(rule_id) and
  contract_active_ok(rule_id) and
  billing_active_ok(rule_id) and
  approved_exception_ok(rule_id) and
  account_ok(rule_id);

# Compiled policy facts
rule("jr_block_readonly_write_01", 10, "block", "Public read-only account cannot run write-intent path.");
req_action_name("jr_block_readonly_write_01", false);
req_resource_kind("jr_block_readonly_write_01", false);
req_access_type("jr_block_readonly_write_01", false);
req_oauth_required("jr_block_readonly_write_01", false);
req_service_tier("jr_block_readonly_write_01", false);
req_actor_role("jr_block_readonly_write_01", false);
req_tool_mode("jr_block_readonly_write_01", false);
req_identity_source("jr_block_readonly_write_01", false);
req_resource_tag("jr_block_readonly_write_01", false);
req_tool("jr_block_readonly_write_01", false);
req_has_write_intent("jr_block_readonly_write_01", true);
req_has_human_review_step("jr_block_readonly_write_01", false);
req_introspection_ok("jr_block_readonly_write_01", false);
req_service_entitled("jr_block_readonly_write_01", false);
req_policy_accepted("jr_block_readonly_write_01", false);
req_contract_active("jr_block_readonly_write_01", false);
req_billing_active("jr_block_readonly_write_01", false);
req_approved_exception_present("jr_block_readonly_write_01", false);
req_account_id("jr_block_readonly_write_01", true);
cond_has_write_intent("jr_block_readonly_write_01", true);
cond_account_id("jr_block_readonly_write_01", "public");
rule("jr_review_introspection_failure_02", 20, "require_human_review", "Introspection failed; operator review required.");
req_action_name("jr_review_introspection_failure_02", false);
req_resource_kind("jr_review_introspection_failure_02", false);
req_access_type("jr_review_introspection_failure_02", false);
req_oauth_required("jr_review_introspection_failure_02", false);
req_service_tier("jr_review_introspection_failure_02", false);
req_actor_role("jr_review_introspection_failure_02", false);
req_tool_mode("jr_review_introspection_failure_02", false);
req_identity_source("jr_review_introspection_failure_02", false);
req_resource_tag("jr_review_introspection_failure_02", false);
req_tool("jr_review_introspection_failure_02", true);
req_has_write_intent("jr_review_introspection_failure_02", false);
req_has_human_review_step("jr_review_introspection_failure_02", false);
req_introspection_ok("jr_review_introspection_failure_02", true);
req_service_entitled("jr_review_introspection_failure_02", false);
req_policy_accepted("jr_review_introspection_failure_02", false);
req_contract_active("jr_review_introspection_failure_02", false);
req_billing_active("jr_review_introspection_failure_02", false);
req_approved_exception_present("jr_review_introspection_failure_02", false);
req_account_id("jr_review_introspection_failure_02", false);
cond_tool("jr_review_introspection_failure_02", "mcp_map_to_workflow");
cond_introspection_ok("jr_review_introspection_failure_02", false);
rule("jr_review_missing_human_step_03", 30, "require_human_review", "Write-intent path without explicit human review.");
req_action_name("jr_review_missing_human_step_03", false);
req_resource_kind("jr_review_missing_human_step_03", false);
req_access_type("jr_review_missing_human_step_03", false);
req_oauth_required("jr_review_missing_human_step_03", false);
req_service_tier("jr_review_missing_human_step_03", false);
req_actor_role("jr_review_missing_human_step_03", false);
req_tool_mode("jr_review_missing_human_step_03", false);
req_identity_source("jr_review_missing_human_step_03", false);
req_resource_tag("jr_review_missing_human_step_03", false);
req_tool("jr_review_missing_human_step_03", false);
req_has_write_intent("jr_review_missing_human_step_03", true);
req_has_human_review_step("jr_review_missing_human_step_03", true);
req_introspection_ok("jr_review_missing_human_step_03", false);
req_service_entitled("jr_review_missing_human_step_03", false);
req_policy_accepted("jr_review_missing_human_step_03", false);
req_contract_active("jr_review_missing_human_step_03", false);
req_billing_active("jr_review_missing_human_step_03", false);
req_approved_exception_present("jr_review_missing_human_step_03", false);
req_account_id("jr_review_missing_human_step_03", false);
cond_has_write_intent("jr_review_missing_human_step_03", true);
cond_has_human_review_step("jr_review_missing_human_step_03", false);
rule("jr_allow_default_99", 999, "allow", "No restrictive rules matched.");
req_action_name("jr_allow_default_99", false);
req_resource_kind("jr_allow_default_99", false);
req_access_type("jr_allow_default_99", false);
req_oauth_required("jr_allow_default_99", false);
req_service_tier("jr_allow_default_99", false);
req_actor_role("jr_allow_default_99", false);
req_tool_mode("jr_allow_default_99", false);
req_identity_source("jr_allow_default_99", false);
req_resource_tag("jr_allow_default_99", false);
req_tool("jr_allow_default_99", false);
req_has_write_intent("jr_allow_default_99", false);
req_has_human_review_step("jr_allow_default_99", false);
req_introspection_ok("jr_allow_default_99", false);
req_service_entitled("jr_allow_default_99", false);
req_policy_accepted("jr_allow_default_99", false);
req_contract_active("jr_allow_default_99", false);
req_billing_active("jr_allow_default_99", false);
req_approved_exception_present("jr_allow_default_99", false);
req_account_id("jr_allow_default_99", false);
