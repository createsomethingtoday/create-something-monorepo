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
rule("hub_route_block_unresolved_context", 5, "block", "Protected remote hub routes require resolved actor and tenant context before discovery or execution.");
req_action_name("hub_route_block_unresolved_context", false);
req_resource_kind("hub_route_block_unresolved_context", true);
req_access_type("hub_route_block_unresolved_context", false);
req_oauth_required("hub_route_block_unresolved_context", false);
req_service_tier("hub_route_block_unresolved_context", false);
req_actor_role("hub_route_block_unresolved_context", false);
req_tool_mode("hub_route_block_unresolved_context", false);
req_identity_source("hub_route_block_unresolved_context", false);
req_resource_tag("hub_route_block_unresolved_context", false);
req_tool("hub_route_block_unresolved_context", false);
req_has_write_intent("hub_route_block_unresolved_context", false);
req_has_human_review_step("hub_route_block_unresolved_context", false);
req_introspection_ok("hub_route_block_unresolved_context", true);
req_service_entitled("hub_route_block_unresolved_context", false);
req_policy_accepted("hub_route_block_unresolved_context", false);
req_contract_active("hub_route_block_unresolved_context", false);
req_billing_active("hub_route_block_unresolved_context", false);
req_approved_exception_present("hub_route_block_unresolved_context", false);
req_account_id("hub_route_block_unresolved_context", false);
cond_resource_kind("hub_route_block_unresolved_context", "hub_route");
cond_introspection_ok("hub_route_block_unresolved_context", false);
rule("hub_discover_readonly_blocks_mutations", 10, "block", "Read-only sessions cannot discover mutable or administrative routes.");
req_action_name("hub_discover_readonly_blocks_mutations", true);
req_resource_kind("hub_discover_readonly_blocks_mutations", false);
req_access_type("hub_discover_readonly_blocks_mutations", true);
req_oauth_required("hub_discover_readonly_blocks_mutations", false);
req_service_tier("hub_discover_readonly_blocks_mutations", false);
req_actor_role("hub_discover_readonly_blocks_mutations", false);
req_tool_mode("hub_discover_readonly_blocks_mutations", true);
req_identity_source("hub_discover_readonly_blocks_mutations", false);
req_resource_tag("hub_discover_readonly_blocks_mutations", false);
req_tool("hub_discover_readonly_blocks_mutations", false);
req_has_write_intent("hub_discover_readonly_blocks_mutations", false);
req_has_human_review_step("hub_discover_readonly_blocks_mutations", false);
req_introspection_ok("hub_discover_readonly_blocks_mutations", false);
req_service_entitled("hub_discover_readonly_blocks_mutations", false);
req_policy_accepted("hub_discover_readonly_blocks_mutations", false);
req_contract_active("hub_discover_readonly_blocks_mutations", false);
req_billing_active("hub_discover_readonly_blocks_mutations", false);
req_approved_exception_present("hub_discover_readonly_blocks_mutations", false);
req_account_id("hub_discover_readonly_blocks_mutations", false);
cond_action_name("hub_discover_readonly_blocks_mutations", "discover");
cond_access_type("hub_discover_readonly_blocks_mutations", "auth_admin");
cond_access_type("hub_discover_readonly_blocks_mutations", "control_plane");
cond_access_type("hub_discover_readonly_blocks_mutations", "destructive");
cond_access_type("hub_discover_readonly_blocks_mutations", "write");
cond_tool_mode("hub_discover_readonly_blocks_mutations", "read_only");
rule("hub_execute_readonly_blocks_mutations", 20, "block", "Read-only sessions cannot execute mutable or administrative routes.");
req_action_name("hub_execute_readonly_blocks_mutations", true);
req_resource_kind("hub_execute_readonly_blocks_mutations", false);
req_access_type("hub_execute_readonly_blocks_mutations", true);
req_oauth_required("hub_execute_readonly_blocks_mutations", false);
req_service_tier("hub_execute_readonly_blocks_mutations", false);
req_actor_role("hub_execute_readonly_blocks_mutations", false);
req_tool_mode("hub_execute_readonly_blocks_mutations", true);
req_identity_source("hub_execute_readonly_blocks_mutations", false);
req_resource_tag("hub_execute_readonly_blocks_mutations", false);
req_tool("hub_execute_readonly_blocks_mutations", false);
req_has_write_intent("hub_execute_readonly_blocks_mutations", false);
req_has_human_review_step("hub_execute_readonly_blocks_mutations", false);
req_introspection_ok("hub_execute_readonly_blocks_mutations", false);
req_service_entitled("hub_execute_readonly_blocks_mutations", false);
req_policy_accepted("hub_execute_readonly_blocks_mutations", false);
req_contract_active("hub_execute_readonly_blocks_mutations", false);
req_billing_active("hub_execute_readonly_blocks_mutations", false);
req_approved_exception_present("hub_execute_readonly_blocks_mutations", false);
req_account_id("hub_execute_readonly_blocks_mutations", false);
cond_action_name("hub_execute_readonly_blocks_mutations", "execute");
cond_access_type("hub_execute_readonly_blocks_mutations", "auth_admin");
cond_access_type("hub_execute_readonly_blocks_mutations", "control_plane");
cond_access_type("hub_execute_readonly_blocks_mutations", "destructive");
cond_access_type("hub_execute_readonly_blocks_mutations", "write");
cond_tool_mode("hub_execute_readonly_blocks_mutations", "read_only");
rule("hub_execute_destructive_requires_review", 30, "require_human_review", "Destructive or control-plane proxy routes require human review.");
req_action_name("hub_execute_destructive_requires_review", true);
req_resource_kind("hub_execute_destructive_requires_review", false);
req_access_type("hub_execute_destructive_requires_review", true);
req_oauth_required("hub_execute_destructive_requires_review", false);
req_service_tier("hub_execute_destructive_requires_review", false);
req_actor_role("hub_execute_destructive_requires_review", false);
req_tool_mode("hub_execute_destructive_requires_review", false);
req_identity_source("hub_execute_destructive_requires_review", false);
req_resource_tag("hub_execute_destructive_requires_review", false);
req_tool("hub_execute_destructive_requires_review", false);
req_has_write_intent("hub_execute_destructive_requires_review", false);
req_has_human_review_step("hub_execute_destructive_requires_review", false);
req_introspection_ok("hub_execute_destructive_requires_review", false);
req_service_entitled("hub_execute_destructive_requires_review", false);
req_policy_accepted("hub_execute_destructive_requires_review", false);
req_contract_active("hub_execute_destructive_requires_review", false);
req_billing_active("hub_execute_destructive_requires_review", false);
req_approved_exception_present("hub_execute_destructive_requires_review", false);
req_account_id("hub_execute_destructive_requires_review", false);
cond_action_name("hub_execute_destructive_requires_review", "execute");
cond_access_type("hub_execute_destructive_requires_review", "control_plane");
cond_access_type("hub_execute_destructive_requires_review", "destructive");
rule("hub_discover_allow", 900, "allow", "Route is visible for discovery.");
req_action_name("hub_discover_allow", true);
req_resource_kind("hub_discover_allow", true);
req_access_type("hub_discover_allow", false);
req_oauth_required("hub_discover_allow", false);
req_service_tier("hub_discover_allow", false);
req_actor_role("hub_discover_allow", false);
req_tool_mode("hub_discover_allow", false);
req_identity_source("hub_discover_allow", false);
req_resource_tag("hub_discover_allow", false);
req_tool("hub_discover_allow", false);
req_has_write_intent("hub_discover_allow", false);
req_has_human_review_step("hub_discover_allow", false);
req_introspection_ok("hub_discover_allow", true);
req_service_entitled("hub_discover_allow", false);
req_policy_accepted("hub_discover_allow", false);
req_contract_active("hub_discover_allow", false);
req_billing_active("hub_discover_allow", false);
req_approved_exception_present("hub_discover_allow", false);
req_account_id("hub_discover_allow", false);
cond_action_name("hub_discover_allow", "discover");
cond_resource_kind("hub_discover_allow", "hub_route");
cond_introspection_ok("hub_discover_allow", true);
rule("hub_execute_allow", 910, "allow", "Proxy route execution is allowed.");
req_action_name("hub_execute_allow", true);
req_resource_kind("hub_execute_allow", true);
req_access_type("hub_execute_allow", false);
req_oauth_required("hub_execute_allow", false);
req_service_tier("hub_execute_allow", false);
req_actor_role("hub_execute_allow", false);
req_tool_mode("hub_execute_allow", false);
req_identity_source("hub_execute_allow", false);
req_resource_tag("hub_execute_allow", false);
req_tool("hub_execute_allow", false);
req_has_write_intent("hub_execute_allow", false);
req_has_human_review_step("hub_execute_allow", false);
req_introspection_ok("hub_execute_allow", true);
req_service_entitled("hub_execute_allow", false);
req_policy_accepted("hub_execute_allow", false);
req_contract_active("hub_execute_allow", false);
req_billing_active("hub_execute_allow", false);
req_approved_exception_present("hub_execute_allow", false);
req_account_id("hub_execute_allow", false);
cond_action_name("hub_execute_allow", "execute");
cond_resource_kind("hub_execute_allow", "hub_route");
cond_introspection_ok("hub_execute_allow", true);
