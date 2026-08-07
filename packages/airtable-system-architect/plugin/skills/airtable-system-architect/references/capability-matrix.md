# Airtable MCP capability matrix

Authority: Airtable's official MCP documentation at <https://support.airtable.com/using-the-airtable-mcp-server>. Reviewed 2026-08-06. Airtable states that tool names and capabilities may change; re-check the official list before relying on a high-impact operation.

## Supported through the official MCP

| Domain               | Read/discover                                                                                                                       | Create/update                                                  | Delete/publish                               | Notes                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| Workspaces and bases | `list_workspaces`, `list_bases`, `search_bases`                                                                                     | `create_base`                                                  | Not listed                                   | Base creation requires sufficient workspace permission.                     |
| Tables and fields    | `list_tables_for_base`, `get_table_schema`, `list_views_for_table`                                                                  | `create_table`, `update_table`, `create_field`, `update_field` | Not listed                                   | `update_field` covers name/description, not arbitrary type/options changes. |
| Records              | `list_records_for_table`, `search_records`                                                                                          | `create_records_for_table`, `update_records_for_table`         | Record deletion is not listed                | Record batches are limited by Airtable. Read back after writes.             |
| Interfaces and pages | `list_pages_for_base`, `list_records_for_page`, `get_record_for_page`, `describe_page_type`, `describe_page_element`                | `create_interface`, `create_page`                              | `delete_page`, `publish_interface`           | Arbitrary edits to an existing interface/page layout are not listed.        |
| Automations          | `list_automations`, `get_automation`, `get_create_automation_instructions`, `fetch_automation_input_data`, `list_external_accounts` | `create_automation`, `update_automation`                       | `delete_automation` for inactive automations | Creation/update affects drafts. Activation is an Airtable UI operation.     |
| Comments             | Supported by the documented MCP scopes                                                                                              | Supported by the documented MCP scopes                         | Verify current tool list                     | Do not infer a comment tool name without discovery.                         |

## UI-only or unsupported gaps

Treat these as unavailable through the documented MCP unless current tool discovery proves otherwise:

- delete a field or table;
- change a field's type or remove/rename configured select choices;
- delete an entire interface;
- arbitrarily edit an existing interface/page layout or element tree;
- unpublish an interface;
- enable, disable, or publish an automation;
- mutate development bases for managed apps/components;
- change collaborators, permissions, or organization policies;
- delete records, unless current MCP discovery exposes a documented tool.

Do not call undocumented Airtable endpoints to close these gaps. An approved authenticated browser action is a separate automation lane with separate evidence.

## Tool-selection rules

1. Discover the base ID.
2. Discover table/interface/automation IDs.
3. Read the exact schema or configuration.
4. Call `describe_page_type`/`describe_page_element` before creating page structures.
5. Call `get_create_automation_instructions` before creating or updating an automation draft.
6. Use a write tool only after the approval policy allows the operation.
7. Read back using the corresponding discovery tool.

## Limitations

- Standard Airtable API limits apply.
- Record creation is limited to 10 records per request.
- The server respects the Airtable user's existing permissions.
- Active automations are not deployed by MCP draft tools.
- Development bases for managed apps/components return a permissions error.
- Interface-only access exposes only the fields and records made available by the interface.
