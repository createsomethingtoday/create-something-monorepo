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
rule("service_tier_block_paid_write_for_mcp_only", 10, "block", "MCP-only access does not include paid governed write or control-plane execution.");
req_action_name("service_tier_block_paid_write_for_mcp_only", true);
req_resource_kind("service_tier_block_paid_write_for_mcp_only", true);
req_access_type("service_tier_block_paid_write_for_mcp_only", true);
req_oauth_required("service_tier_block_paid_write_for_mcp_only", false);
req_service_tier("service_tier_block_paid_write_for_mcp_only", true);
req_actor_role("service_tier_block_paid_write_for_mcp_only", false);
req_tool_mode("service_tier_block_paid_write_for_mcp_only", false);
req_identity_source("service_tier_block_paid_write_for_mcp_only", false);
req_resource_tag("service_tier_block_paid_write_for_mcp_only", false);
req_tool("service_tier_block_paid_write_for_mcp_only", false);
req_has_write_intent("service_tier_block_paid_write_for_mcp_only", false);
req_has_human_review_step("service_tier_block_paid_write_for_mcp_only", false);
req_introspection_ok("service_tier_block_paid_write_for_mcp_only", false);
req_service_entitled("service_tier_block_paid_write_for_mcp_only", false);
req_policy_accepted("service_tier_block_paid_write_for_mcp_only", false);
req_contract_active("service_tier_block_paid_write_for_mcp_only", false);
req_billing_active("service_tier_block_paid_write_for_mcp_only", false);
req_approved_exception_present("service_tier_block_paid_write_for_mcp_only", true);
req_account_id("service_tier_block_paid_write_for_mcp_only", false);
cond_action_name("service_tier_block_paid_write_for_mcp_only", "execute");
cond_resource_kind("service_tier_block_paid_write_for_mcp_only", "hub_route");
cond_access_type("service_tier_block_paid_write_for_mcp_only", "control_plane");
cond_access_type("service_tier_block_paid_write_for_mcp_only", "destructive");
cond_access_type("service_tier_block_paid_write_for_mcp_only", "write");
cond_service_tier("service_tier_block_paid_write_for_mcp_only", "mcp_only");
cond_approved_exception_present("service_tier_block_paid_write_for_mcp_only", false);
rule("service_tier_block_policy_os_only_discovery_for_mcp_only", 20, "block", "MCP-only access does not include Policy OS-only product surfaces.");
req_action_name("service_tier_block_policy_os_only_discovery_for_mcp_only", true);
req_resource_kind("service_tier_block_policy_os_only_discovery_for_mcp_only", true);
req_access_type("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_oauth_required("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_service_tier("service_tier_block_policy_os_only_discovery_for_mcp_only", true);
req_actor_role("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_tool_mode("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_identity_source("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_resource_tag("service_tier_block_policy_os_only_discovery_for_mcp_only", true);
req_tool("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_has_write_intent("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_has_human_review_step("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_introspection_ok("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_service_entitled("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_policy_accepted("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_contract_active("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_billing_active("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
req_approved_exception_present("service_tier_block_policy_os_only_discovery_for_mcp_only", true);
req_account_id("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
cond_action_name("service_tier_block_policy_os_only_discovery_for_mcp_only", "discover");
cond_action_name("service_tier_block_policy_os_only_discovery_for_mcp_only", "execute");
cond_resource_kind("service_tier_block_policy_os_only_discovery_for_mcp_only", "hub_route");
cond_service_tier("service_tier_block_policy_os_only_discovery_for_mcp_only", "mcp_only");
cond_resource_tag("service_tier_block_policy_os_only_discovery_for_mcp_only", "policy_os_only");
cond_approved_exception_present("service_tier_block_policy_os_only_discovery_for_mcp_only", false);
rule("service_tier_block_paid_access_without_service_entitlement", 30, "block", "Paid Policy OS access requires explicit service entitlement.");
req_action_name("service_tier_block_paid_access_without_service_entitlement", false);
req_resource_kind("service_tier_block_paid_access_without_service_entitlement", true);
req_access_type("service_tier_block_paid_access_without_service_entitlement", false);
req_oauth_required("service_tier_block_paid_access_without_service_entitlement", false);
req_service_tier("service_tier_block_paid_access_without_service_entitlement", true);
req_actor_role("service_tier_block_paid_access_without_service_entitlement", false);
req_tool_mode("service_tier_block_paid_access_without_service_entitlement", false);
req_identity_source("service_tier_block_paid_access_without_service_entitlement", false);
req_resource_tag("service_tier_block_paid_access_without_service_entitlement", false);
req_tool("service_tier_block_paid_access_without_service_entitlement", false);
req_has_write_intent("service_tier_block_paid_access_without_service_entitlement", false);
req_has_human_review_step("service_tier_block_paid_access_without_service_entitlement", false);
req_introspection_ok("service_tier_block_paid_access_without_service_entitlement", false);
req_service_entitled("service_tier_block_paid_access_without_service_entitlement", true);
req_policy_accepted("service_tier_block_paid_access_without_service_entitlement", false);
req_contract_active("service_tier_block_paid_access_without_service_entitlement", false);
req_billing_active("service_tier_block_paid_access_without_service_entitlement", false);
req_approved_exception_present("service_tier_block_paid_access_without_service_entitlement", false);
req_account_id("service_tier_block_paid_access_without_service_entitlement", false);
cond_resource_kind("service_tier_block_paid_access_without_service_entitlement", "hub_route");
cond_service_tier("service_tier_block_paid_access_without_service_entitlement", "policy_os_core");
cond_service_tier("service_tier_block_paid_access_without_service_entitlement", "policy_os_trial");
cond_service_entitled("service_tier_block_paid_access_without_service_entitlement", false);
rule("service_tier_block_paid_access_without_policy_acceptance", 40, "block", "Paid Policy OS access requires required policy acceptance.");
req_action_name("service_tier_block_paid_access_without_policy_acceptance", false);
req_resource_kind("service_tier_block_paid_access_without_policy_acceptance", true);
req_access_type("service_tier_block_paid_access_without_policy_acceptance", false);
req_oauth_required("service_tier_block_paid_access_without_policy_acceptance", false);
req_service_tier("service_tier_block_paid_access_without_policy_acceptance", true);
req_actor_role("service_tier_block_paid_access_without_policy_acceptance", false);
req_tool_mode("service_tier_block_paid_access_without_policy_acceptance", false);
req_identity_source("service_tier_block_paid_access_without_policy_acceptance", false);
req_resource_tag("service_tier_block_paid_access_without_policy_acceptance", false);
req_tool("service_tier_block_paid_access_without_policy_acceptance", false);
req_has_write_intent("service_tier_block_paid_access_without_policy_acceptance", false);
req_has_human_review_step("service_tier_block_paid_access_without_policy_acceptance", false);
req_introspection_ok("service_tier_block_paid_access_without_policy_acceptance", false);
req_service_entitled("service_tier_block_paid_access_without_policy_acceptance", false);
req_policy_accepted("service_tier_block_paid_access_without_policy_acceptance", true);
req_contract_active("service_tier_block_paid_access_without_policy_acceptance", false);
req_billing_active("service_tier_block_paid_access_without_policy_acceptance", false);
req_approved_exception_present("service_tier_block_paid_access_without_policy_acceptance", false);
req_account_id("service_tier_block_paid_access_without_policy_acceptance", false);
cond_resource_kind("service_tier_block_paid_access_without_policy_acceptance", "hub_route");
cond_service_tier("service_tier_block_paid_access_without_policy_acceptance", "policy_os_core");
cond_service_tier("service_tier_block_paid_access_without_policy_acceptance", "policy_os_trial");
cond_policy_accepted("service_tier_block_paid_access_without_policy_acceptance", false);
rule("service_tier_block_paid_access_without_contract", 50, "block", "Paid Policy OS access requires an active contract.");
req_action_name("service_tier_block_paid_access_without_contract", false);
req_resource_kind("service_tier_block_paid_access_without_contract", true);
req_access_type("service_tier_block_paid_access_without_contract", false);
req_oauth_required("service_tier_block_paid_access_without_contract", false);
req_service_tier("service_tier_block_paid_access_without_contract", true);
req_actor_role("service_tier_block_paid_access_without_contract", false);
req_tool_mode("service_tier_block_paid_access_without_contract", false);
req_identity_source("service_tier_block_paid_access_without_contract", false);
req_resource_tag("service_tier_block_paid_access_without_contract", false);
req_tool("service_tier_block_paid_access_without_contract", false);
req_has_write_intent("service_tier_block_paid_access_without_contract", false);
req_has_human_review_step("service_tier_block_paid_access_without_contract", false);
req_introspection_ok("service_tier_block_paid_access_without_contract", false);
req_service_entitled("service_tier_block_paid_access_without_contract", false);
req_policy_accepted("service_tier_block_paid_access_without_contract", false);
req_contract_active("service_tier_block_paid_access_without_contract", true);
req_billing_active("service_tier_block_paid_access_without_contract", false);
req_approved_exception_present("service_tier_block_paid_access_without_contract", false);
req_account_id("service_tier_block_paid_access_without_contract", false);
cond_resource_kind("service_tier_block_paid_access_without_contract", "hub_route");
cond_service_tier("service_tier_block_paid_access_without_contract", "policy_os_core");
cond_service_tier("service_tier_block_paid_access_without_contract", "policy_os_trial");
cond_contract_active("service_tier_block_paid_access_without_contract", false);
rule("service_tier_block_paid_access_without_billing", 60, "block", "Paid Policy OS access requires active billing.");
req_action_name("service_tier_block_paid_access_without_billing", false);
req_resource_kind("service_tier_block_paid_access_without_billing", true);
req_access_type("service_tier_block_paid_access_without_billing", false);
req_oauth_required("service_tier_block_paid_access_without_billing", false);
req_service_tier("service_tier_block_paid_access_without_billing", true);
req_actor_role("service_tier_block_paid_access_without_billing", false);
req_tool_mode("service_tier_block_paid_access_without_billing", false);
req_identity_source("service_tier_block_paid_access_without_billing", false);
req_resource_tag("service_tier_block_paid_access_without_billing", false);
req_tool("service_tier_block_paid_access_without_billing", false);
req_has_write_intent("service_tier_block_paid_access_without_billing", false);
req_has_human_review_step("service_tier_block_paid_access_without_billing", false);
req_introspection_ok("service_tier_block_paid_access_without_billing", false);
req_service_entitled("service_tier_block_paid_access_without_billing", false);
req_policy_accepted("service_tier_block_paid_access_without_billing", false);
req_contract_active("service_tier_block_paid_access_without_billing", false);
req_billing_active("service_tier_block_paid_access_without_billing", true);
req_approved_exception_present("service_tier_block_paid_access_without_billing", false);
req_account_id("service_tier_block_paid_access_without_billing", false);
cond_resource_kind("service_tier_block_paid_access_without_billing", "hub_route");
cond_service_tier("service_tier_block_paid_access_without_billing", "policy_os_core");
cond_service_tier("service_tier_block_paid_access_without_billing", "policy_os_trial");
cond_billing_active("service_tier_block_paid_access_without_billing", false);
rule("service_tier_allow_default", 900, "allow", "Service-tier entitlement requirements are satisfied for this route.");
req_action_name("service_tier_allow_default", false);
req_resource_kind("service_tier_allow_default", true);
req_access_type("service_tier_allow_default", false);
req_oauth_required("service_tier_allow_default", false);
req_service_tier("service_tier_allow_default", false);
req_actor_role("service_tier_allow_default", false);
req_tool_mode("service_tier_allow_default", false);
req_identity_source("service_tier_allow_default", false);
req_resource_tag("service_tier_allow_default", false);
req_tool("service_tier_allow_default", false);
req_has_write_intent("service_tier_allow_default", false);
req_has_human_review_step("service_tier_allow_default", false);
req_introspection_ok("service_tier_allow_default", false);
req_service_entitled("service_tier_allow_default", false);
req_policy_accepted("service_tier_allow_default", false);
req_contract_active("service_tier_allow_default", false);
req_billing_active("service_tier_allow_default", false);
req_approved_exception_present("service_tier_allow_default", false);
req_account_id("service_tier_allow_default", false);
cond_resource_kind("service_tier_allow_default", "hub_route");
