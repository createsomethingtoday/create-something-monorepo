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
rule("admin_mint_block_without_consent", 10, "block", "Admin mint requires consent evidence.");
req_action_name("admin_mint_block_without_consent", true);
req_resource_kind("admin_mint_block_without_consent", true);
req_access_type("admin_mint_block_without_consent", false);
req_oauth_required("admin_mint_block_without_consent", false);
req_service_tier("admin_mint_block_without_consent", false);
req_actor_role("admin_mint_block_without_consent", false);
req_tool_mode("admin_mint_block_without_consent", false);
req_identity_source("admin_mint_block_without_consent", false);
req_resource_tag("admin_mint_block_without_consent", false);
req_tool("admin_mint_block_without_consent", false);
req_has_write_intent("admin_mint_block_without_consent", false);
req_has_human_review_step("admin_mint_block_without_consent", false);
req_introspection_ok("admin_mint_block_without_consent", true);
req_service_entitled("admin_mint_block_without_consent", false);
req_policy_accepted("admin_mint_block_without_consent", false);
req_contract_active("admin_mint_block_without_consent", false);
req_billing_active("admin_mint_block_without_consent", false);
req_approved_exception_present("admin_mint_block_without_consent", false);
req_account_id("admin_mint_block_without_consent", false);
cond_action_name("admin_mint_block_without_consent", "admin_mint_session");
cond_resource_kind("admin_mint_block_without_consent", "mcp_session");
cond_introspection_ok("admin_mint_block_without_consent", false);
rule("admin_mint_review_without_trace", 20, "require_human_review", "Admin mint requires human review trace.");
req_action_name("admin_mint_review_without_trace", true);
req_resource_kind("admin_mint_review_without_trace", true);
req_access_type("admin_mint_review_without_trace", false);
req_oauth_required("admin_mint_review_without_trace", false);
req_service_tier("admin_mint_review_without_trace", false);
req_actor_role("admin_mint_review_without_trace", false);
req_tool_mode("admin_mint_review_without_trace", false);
req_identity_source("admin_mint_review_without_trace", false);
req_resource_tag("admin_mint_review_without_trace", false);
req_tool("admin_mint_review_without_trace", false);
req_has_write_intent("admin_mint_review_without_trace", false);
req_has_human_review_step("admin_mint_review_without_trace", true);
req_introspection_ok("admin_mint_review_without_trace", false);
req_service_entitled("admin_mint_review_without_trace", false);
req_policy_accepted("admin_mint_review_without_trace", false);
req_contract_active("admin_mint_review_without_trace", false);
req_billing_active("admin_mint_review_without_trace", false);
req_approved_exception_present("admin_mint_review_without_trace", false);
req_account_id("admin_mint_review_without_trace", false);
cond_action_name("admin_mint_review_without_trace", "admin_mint_session");
cond_resource_kind("admin_mint_review_without_trace", "mcp_session");
cond_has_human_review_step("admin_mint_review_without_trace", false);
rule("admin_mint_allow", 30, "allow", "Consent and review evidence present.");
req_action_name("admin_mint_allow", true);
req_resource_kind("admin_mint_allow", true);
req_access_type("admin_mint_allow", false);
req_oauth_required("admin_mint_allow", false);
req_service_tier("admin_mint_allow", false);
req_actor_role("admin_mint_allow", false);
req_tool_mode("admin_mint_allow", false);
req_identity_source("admin_mint_allow", false);
req_resource_tag("admin_mint_allow", false);
req_tool("admin_mint_allow", false);
req_has_write_intent("admin_mint_allow", false);
req_has_human_review_step("admin_mint_allow", true);
req_introspection_ok("admin_mint_allow", true);
req_service_entitled("admin_mint_allow", false);
req_policy_accepted("admin_mint_allow", false);
req_contract_active("admin_mint_allow", false);
req_billing_active("admin_mint_allow", false);
req_approved_exception_present("admin_mint_allow", false);
req_account_id("admin_mint_allow", false);
cond_action_name("admin_mint_allow", "admin_mint_session");
cond_resource_kind("admin_mint_allow", "mcp_session");
cond_has_human_review_step("admin_mint_allow", true);
cond_introspection_ok("admin_mint_allow", true);
rule("partner_toolkit_block_without_consent", 40, "block", "Partner toolkit auth actions require an active consent record.");
req_action_name("partner_toolkit_block_without_consent", false);
req_resource_kind("partner_toolkit_block_without_consent", true);
req_access_type("partner_toolkit_block_without_consent", false);
req_oauth_required("partner_toolkit_block_without_consent", false);
req_service_tier("partner_toolkit_block_without_consent", false);
req_actor_role("partner_toolkit_block_without_consent", false);
req_tool_mode("partner_toolkit_block_without_consent", false);
req_identity_source("partner_toolkit_block_without_consent", false);
req_resource_tag("partner_toolkit_block_without_consent", false);
req_tool("partner_toolkit_block_without_consent", false);
req_has_write_intent("partner_toolkit_block_without_consent", false);
req_has_human_review_step("partner_toolkit_block_without_consent", false);
req_introspection_ok("partner_toolkit_block_without_consent", true);
req_service_entitled("partner_toolkit_block_without_consent", false);
req_policy_accepted("partner_toolkit_block_without_consent", false);
req_contract_active("partner_toolkit_block_without_consent", false);
req_billing_active("partner_toolkit_block_without_consent", false);
req_approved_exception_present("partner_toolkit_block_without_consent", false);
req_account_id("partner_toolkit_block_without_consent", false);
cond_resource_kind("partner_toolkit_block_without_consent", "partner_toolkit_account");
cond_introspection_ok("partner_toolkit_block_without_consent", false);
rule("partner_toolkit_pin_requires_review", 50, "require_human_review", "Pinning a partner toolkit account requires a human review trace.");
req_action_name("partner_toolkit_pin_requires_review", true);
req_resource_kind("partner_toolkit_pin_requires_review", true);
req_access_type("partner_toolkit_pin_requires_review", false);
req_oauth_required("partner_toolkit_pin_requires_review", false);
req_service_tier("partner_toolkit_pin_requires_review", false);
req_actor_role("partner_toolkit_pin_requires_review", false);
req_tool_mode("partner_toolkit_pin_requires_review", false);
req_identity_source("partner_toolkit_pin_requires_review", false);
req_resource_tag("partner_toolkit_pin_requires_review", false);
req_tool("partner_toolkit_pin_requires_review", false);
req_has_write_intent("partner_toolkit_pin_requires_review", false);
req_has_human_review_step("partner_toolkit_pin_requires_review", true);
req_introspection_ok("partner_toolkit_pin_requires_review", false);
req_service_entitled("partner_toolkit_pin_requires_review", false);
req_policy_accepted("partner_toolkit_pin_requires_review", false);
req_contract_active("partner_toolkit_pin_requires_review", false);
req_billing_active("partner_toolkit_pin_requires_review", false);
req_approved_exception_present("partner_toolkit_pin_requires_review", false);
req_account_id("partner_toolkit_pin_requires_review", false);
cond_action_name("partner_toolkit_pin_requires_review", "pin_toolkit_account");
cond_resource_kind("partner_toolkit_pin_requires_review", "partner_toolkit_account");
cond_has_human_review_step("partner_toolkit_pin_requires_review", false);
rule("partner_toolkit_disable_requires_review", 60, "require_human_review", "Disabling a partner toolkit account requires a human review trace.");
req_action_name("partner_toolkit_disable_requires_review", true);
req_resource_kind("partner_toolkit_disable_requires_review", true);
req_access_type("partner_toolkit_disable_requires_review", false);
req_oauth_required("partner_toolkit_disable_requires_review", false);
req_service_tier("partner_toolkit_disable_requires_review", false);
req_actor_role("partner_toolkit_disable_requires_review", false);
req_tool_mode("partner_toolkit_disable_requires_review", false);
req_identity_source("partner_toolkit_disable_requires_review", false);
req_resource_tag("partner_toolkit_disable_requires_review", false);
req_tool("partner_toolkit_disable_requires_review", false);
req_has_write_intent("partner_toolkit_disable_requires_review", false);
req_has_human_review_step("partner_toolkit_disable_requires_review", true);
req_introspection_ok("partner_toolkit_disable_requires_review", false);
req_service_entitled("partner_toolkit_disable_requires_review", false);
req_policy_accepted("partner_toolkit_disable_requires_review", false);
req_contract_active("partner_toolkit_disable_requires_review", false);
req_billing_active("partner_toolkit_disable_requires_review", false);
req_approved_exception_present("partner_toolkit_disable_requires_review", false);
req_account_id("partner_toolkit_disable_requires_review", false);
cond_action_name("partner_toolkit_disable_requires_review", "disable_toolkit_account");
cond_resource_kind("partner_toolkit_disable_requires_review", "partner_toolkit_account");
cond_has_human_review_step("partner_toolkit_disable_requires_review", false);
rule("partner_toolkit_view_allow", 70, "allow", "Partner admin may inspect toolkit auth state with active consent.");
req_action_name("partner_toolkit_view_allow", true);
req_resource_kind("partner_toolkit_view_allow", true);
req_access_type("partner_toolkit_view_allow", false);
req_oauth_required("partner_toolkit_view_allow", false);
req_service_tier("partner_toolkit_view_allow", false);
req_actor_role("partner_toolkit_view_allow", true);
req_tool_mode("partner_toolkit_view_allow", false);
req_identity_source("partner_toolkit_view_allow", false);
req_resource_tag("partner_toolkit_view_allow", false);
req_tool("partner_toolkit_view_allow", false);
req_has_write_intent("partner_toolkit_view_allow", false);
req_has_human_review_step("partner_toolkit_view_allow", false);
req_introspection_ok("partner_toolkit_view_allow", true);
req_service_entitled("partner_toolkit_view_allow", false);
req_policy_accepted("partner_toolkit_view_allow", false);
req_contract_active("partner_toolkit_view_allow", false);
req_billing_active("partner_toolkit_view_allow", false);
req_approved_exception_present("partner_toolkit_view_allow", false);
req_account_id("partner_toolkit_view_allow", false);
cond_action_name("partner_toolkit_view_allow", "view_toolkit_auth");
cond_resource_kind("partner_toolkit_view_allow", "partner_toolkit_account");
cond_actor_role("partner_toolkit_view_allow", "partner_admin");
cond_introspection_ok("partner_toolkit_view_allow", true);
rule("partner_toolkit_upsert_allow", 80, "allow", "Partner admin may create or update toolkit auth bindings with active consent.");
req_action_name("partner_toolkit_upsert_allow", true);
req_resource_kind("partner_toolkit_upsert_allow", true);
req_access_type("partner_toolkit_upsert_allow", false);
req_oauth_required("partner_toolkit_upsert_allow", false);
req_service_tier("partner_toolkit_upsert_allow", false);
req_actor_role("partner_toolkit_upsert_allow", true);
req_tool_mode("partner_toolkit_upsert_allow", false);
req_identity_source("partner_toolkit_upsert_allow", false);
req_resource_tag("partner_toolkit_upsert_allow", false);
req_tool("partner_toolkit_upsert_allow", false);
req_has_write_intent("partner_toolkit_upsert_allow", false);
req_has_human_review_step("partner_toolkit_upsert_allow", false);
req_introspection_ok("partner_toolkit_upsert_allow", true);
req_service_entitled("partner_toolkit_upsert_allow", false);
req_policy_accepted("partner_toolkit_upsert_allow", false);
req_contract_active("partner_toolkit_upsert_allow", false);
req_billing_active("partner_toolkit_upsert_allow", false);
req_approved_exception_present("partner_toolkit_upsert_allow", false);
req_account_id("partner_toolkit_upsert_allow", false);
cond_action_name("partner_toolkit_upsert_allow", "upsert_toolkit_account");
cond_resource_kind("partner_toolkit_upsert_allow", "partner_toolkit_account");
cond_actor_role("partner_toolkit_upsert_allow", "partner_admin");
cond_introspection_ok("partner_toolkit_upsert_allow", true);
rule("partner_toolkit_connect_allow", 90, "allow", "Partner admin may issue toolkit connect links with active consent.");
req_action_name("partner_toolkit_connect_allow", true);
req_resource_kind("partner_toolkit_connect_allow", true);
req_access_type("partner_toolkit_connect_allow", false);
req_oauth_required("partner_toolkit_connect_allow", false);
req_service_tier("partner_toolkit_connect_allow", false);
req_actor_role("partner_toolkit_connect_allow", true);
req_tool_mode("partner_toolkit_connect_allow", false);
req_identity_source("partner_toolkit_connect_allow", false);
req_resource_tag("partner_toolkit_connect_allow", false);
req_tool("partner_toolkit_connect_allow", false);
req_has_write_intent("partner_toolkit_connect_allow", false);
req_has_human_review_step("partner_toolkit_connect_allow", false);
req_introspection_ok("partner_toolkit_connect_allow", true);
req_service_entitled("partner_toolkit_connect_allow", false);
req_policy_accepted("partner_toolkit_connect_allow", false);
req_contract_active("partner_toolkit_connect_allow", false);
req_billing_active("partner_toolkit_connect_allow", false);
req_approved_exception_present("partner_toolkit_connect_allow", false);
req_account_id("partner_toolkit_connect_allow", false);
cond_action_name("partner_toolkit_connect_allow", "create_toolkit_connect_link");
cond_resource_kind("partner_toolkit_connect_allow", "partner_toolkit_account");
cond_actor_role("partner_toolkit_connect_allow", "partner_admin");
cond_introspection_ok("partner_toolkit_connect_allow", true);
rule("partner_toolkit_pin_allow", 100, "allow", "Partner admin may pin toolkit accounts after human review.");
req_action_name("partner_toolkit_pin_allow", true);
req_resource_kind("partner_toolkit_pin_allow", true);
req_access_type("partner_toolkit_pin_allow", false);
req_oauth_required("partner_toolkit_pin_allow", false);
req_service_tier("partner_toolkit_pin_allow", false);
req_actor_role("partner_toolkit_pin_allow", true);
req_tool_mode("partner_toolkit_pin_allow", false);
req_identity_source("partner_toolkit_pin_allow", false);
req_resource_tag("partner_toolkit_pin_allow", false);
req_tool("partner_toolkit_pin_allow", false);
req_has_write_intent("partner_toolkit_pin_allow", false);
req_has_human_review_step("partner_toolkit_pin_allow", true);
req_introspection_ok("partner_toolkit_pin_allow", true);
req_service_entitled("partner_toolkit_pin_allow", false);
req_policy_accepted("partner_toolkit_pin_allow", false);
req_contract_active("partner_toolkit_pin_allow", false);
req_billing_active("partner_toolkit_pin_allow", false);
req_approved_exception_present("partner_toolkit_pin_allow", false);
req_account_id("partner_toolkit_pin_allow", false);
cond_action_name("partner_toolkit_pin_allow", "pin_toolkit_account");
cond_resource_kind("partner_toolkit_pin_allow", "partner_toolkit_account");
cond_actor_role("partner_toolkit_pin_allow", "partner_admin");
cond_has_human_review_step("partner_toolkit_pin_allow", true);
cond_introspection_ok("partner_toolkit_pin_allow", true);
rule("partner_toolkit_disable_allow", 110, "allow", "Partner admin may disable toolkit accounts after human review.");
req_action_name("partner_toolkit_disable_allow", true);
req_resource_kind("partner_toolkit_disable_allow", true);
req_access_type("partner_toolkit_disable_allow", false);
req_oauth_required("partner_toolkit_disable_allow", false);
req_service_tier("partner_toolkit_disable_allow", false);
req_actor_role("partner_toolkit_disable_allow", true);
req_tool_mode("partner_toolkit_disable_allow", false);
req_identity_source("partner_toolkit_disable_allow", false);
req_resource_tag("partner_toolkit_disable_allow", false);
req_tool("partner_toolkit_disable_allow", false);
req_has_write_intent("partner_toolkit_disable_allow", false);
req_has_human_review_step("partner_toolkit_disable_allow", true);
req_introspection_ok("partner_toolkit_disable_allow", true);
req_service_entitled("partner_toolkit_disable_allow", false);
req_policy_accepted("partner_toolkit_disable_allow", false);
req_contract_active("partner_toolkit_disable_allow", false);
req_billing_active("partner_toolkit_disable_allow", false);
req_approved_exception_present("partner_toolkit_disable_allow", false);
req_account_id("partner_toolkit_disable_allow", false);
cond_action_name("partner_toolkit_disable_allow", "disable_toolkit_account");
cond_resource_kind("partner_toolkit_disable_allow", "partner_toolkit_account");
cond_actor_role("partner_toolkit_disable_allow", "partner_admin");
cond_has_human_review_step("partner_toolkit_disable_allow", true);
cond_introspection_ok("partner_toolkit_disable_allow", true);
