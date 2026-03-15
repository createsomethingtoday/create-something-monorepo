import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { QBOClientGetter } from "./quickbooks.js";
import type { NotionClient } from "../services/notion.js";
import {
  notionTitle,
  notionRichText,
  notionNumber,
  notionDate,
  notionCheckbox,
  notionSelect,
  notionEmail,
  notionPhone,
} from "../services/notion.js";
import {
  NotionSyncEntitySchema,
  NotionListDatabasesSchema,
  NotionGetDatabaseSchema,
  NotionCreateDatabaseSchema,
  NotionUpsertPageSchema,
} from "../schemas/index.js";
import type {
  NotionSyncEntityInput,
  NotionListDatabasesInput,
  NotionGetDatabaseInput,
  NotionCreateDatabaseInput,
  NotionUpsertPageInput,
} from "../schemas/index.js";
import { toolResponse, truncateWithWarning } from "../services/formatting.js";
import type { QBOEntity } from "../constants.js";
import { getNotionSchemaForEntity, getPropertyNamesForEntity } from "../schemas/notion-presets.js";
import { logger } from "../services/logger.js";

// ── Property Mapping ────────────────────────────────────────────────

/**
 * Map a QuickBooks entity record to Notion properties.
 * Dynamically maps fields based on entity type.
 */
function mapQBOToNotionProperties(
  entity: QBOEntity,
  record: Record<string, unknown>
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Universal: name/title
  const nameValue =
    (record.DisplayName as string) ??
    (record.Name as string) ??
    (record.DocNumber as string) ??
    `${entity} #${record.Id}`;
  props["Name"] = notionTitle(nameValue);

  // Universal: QBO ID
  props["QBO ID"] = notionRichText(String(record.Id ?? ""));

  // Entity-specific mappings
  switch (entity) {
    case "Customer":
    case "Vendor":
    case "Employee": {
      if (record.CompanyName)
        props["Company"] = notionRichText(record.CompanyName as string);
      const email = (record.PrimaryEmailAddr as { Address?: string })?.Address;
      if (email) props["Email"] = notionEmail(email);
      const phone = (record.PrimaryPhone as { FreeFormNumber?: string })
        ?.FreeFormNumber;
      if (phone) props["Phone"] = notionPhone(phone);
      if (typeof record.Balance === "number")
        props["Balance"] = notionNumber(record.Balance as number);
      if (typeof record.Active === "boolean")
        props["Active"] = notionCheckbox(record.Active as boolean);
      break;
    }

    case "Invoice":
    case "Estimate":
    case "CreditMemo":
    case "SalesReceipt":
    case "RefundReceipt": {
      const custRef = record.CustomerRef as
        | { name?: string; value?: string }
        | undefined;
      if (custRef?.name) props["Customer"] = notionRichText(custRef.name);
      if (record.DocNumber)
        props["Doc Number"] = notionRichText(record.DocNumber as string);
      if (record.TxnDate)
        props["Date"] = notionDate(record.TxnDate as string);
      if (record.DueDate)
        props["Due Date"] = notionDate(record.DueDate as string);
      if (typeof record.TotalAmt === "number")
        props["Total"] = notionNumber(record.TotalAmt as number);
      if (typeof record.Balance === "number")
        props["Balance"] = notionNumber(record.Balance as number);
      break;
    }

    case "Bill":
    case "VendorCredit":
    case "PurchaseOrder": {
      const vendRef = record.VendorRef as
        | { name?: string; value?: string }
        | undefined;
      if (vendRef?.name) props["Vendor"] = notionRichText(vendRef.name);
      if (record.DocNumber)
        props["Doc Number"] = notionRichText(record.DocNumber as string);
      if (record.TxnDate)
        props["Date"] = notionDate(record.TxnDate as string);
      if (record.DueDate)
        props["Due Date"] = notionDate(record.DueDate as string);
      if (typeof record.TotalAmt === "number")
        props["Total"] = notionNumber(record.TotalAmt as number);
      if (typeof record.Balance === "number")
        props["Balance"] = notionNumber(record.Balance as number);
      break;
    }

    case "Payment":
    case "BillPayment": {
      const payRef = record.CustomerRef as
        | { name?: string; value?: string }
        | undefined;
      const vendorPayRef = record.VendorRef as
        | { name?: string; value?: string }
        | undefined;
      if (payRef?.name) props["Customer"] = notionRichText(payRef.name);
      if (vendorPayRef?.name)
        props["Vendor"] = notionRichText(vendorPayRef.name);
      if (record.TxnDate)
        props["Date"] = notionDate(record.TxnDate as string);
      if (typeof record.TotalAmt === "number")
        props["Total"] = notionNumber(record.TotalAmt as number);
      break;
    }

    case "Account": {
      if (record.AccountType)
        props["Account Type"] = notionSelect(record.AccountType as string);
      if (record.AccountSubType)
        props["Sub Type"] = notionRichText(record.AccountSubType as string);
      if (typeof record.CurrentBalance === "number")
        props["Balance"] = notionNumber(record.CurrentBalance as number);
      if (record.Classification)
        props["Classification"] = notionSelect(record.Classification as string);
      if (typeof record.Active === "boolean")
        props["Active"] = notionCheckbox(record.Active as boolean);
      break;
    }

    case "Item": {
      if (record.Description)
        props["Description"] = notionRichText(record.Description as string);
      if (record.Type) props["Type"] = notionSelect(record.Type as string);
      if (typeof record.UnitPrice === "number")
        props["Unit Price"] = notionNumber(record.UnitPrice as number);
      if (typeof record.Active === "boolean")
        props["Active"] = notionCheckbox(record.Active as boolean);
      break;
    }

    case "Purchase":
    case "Deposit":
    case "Transfer":
    case "JournalEntry": {
      if (record.TxnDate)
        props["Date"] = notionDate(record.TxnDate as string);
      if (typeof record.TotalAmt === "number")
        props["Total"] = notionNumber(record.TotalAmt as number);
      const acctRef = record.AccountRef as
        | { name?: string }
        | undefined;
      if (acctRef?.name) props["Account"] = notionRichText(acctRef.name);
      if (record.PaymentType)
        props["Payment Type"] = notionSelect(record.PaymentType as string);
      break;
    }

    default: {
      if (record.TxnDate)
        props["Date"] = notionDate(record.TxnDate as string);
      if (typeof record.TotalAmt === "number")
        props["Total"] = notionNumber(record.TotalAmt as number);
      if (typeof record.Active === "boolean")
        props["Active"] = notionCheckbox(record.Active as boolean);
      break;
    }
  }

  // Metadata
  const meta = record.MetaData as
    | { LastUpdatedTime?: string }
    | undefined;
  if (meta?.LastUpdatedTime)
    props["Last Updated"] = notionDate(meta.LastUpdatedTime);

  return props;
}

// ── Upsert Helper (shared by notion_upsert_page and notion_sync_qbo) ──

async function upsertQBORecord(
  notion: NotionClient,
  databaseId: string,
  entity: QBOEntity,
  record: Record<string, unknown>
): Promise<{ qboId: string; name: string; notionUrl: string; status: "created" | "updated" }> {
  const qboId = String(record.Id ?? "?");
  const name = String(
    record.DisplayName ?? record.Name ?? record.DocNumber ?? `#${record.Id}`
  );

  const properties = mapQBOToNotionProperties(entity, record);
  const existing = await notion.findPageByQBOId(databaseId, qboId);

  let page;
  let status: "created" | "updated";

  if (existing) {
    page = await notion.updatePage(existing.id, properties);
    status = "updated";
  } else {
    page = await notion.createPage(databaseId, properties);
    status = "created";
  }

  return { qboId, name, notionUrl: page.url, status };
}

// ── Tool Registration ───────────────────────────────────────────────

export function registerNotionTools(
  server: McpServer,
  getClient: QBOClientGetter,
  notion: NotionClient
): void {

  // ── notion_create_database ──────────────────────────────────────
  server.registerTool(
    "notion_create_database",
    {
      title: "Create Notion Database for QBO Data",
      description: `Use when the user wants to set up a new Notion database to track QuickBooks data. Creates a database with the right columns for the specified entity type.

For example: "Set up a database to track my invoices" or "Create a customer CRM in Notion."

Automatically configures columns based on entity type:
- Customer/Vendor/Employee: Name, Email, Phone, Balance, Active
- Invoice/Estimate: Customer, Doc Number, Date, Due Date, Total, Balance
- Bill/PurchaseOrder: Vendor, Doc Number, Date, Due Date, Total, Balance
- Account: Account Type, Classification, Balance, Active
- Item: Description, Type, Unit Price, Active

After creating the database, use notion_sync_qbo to populate it with QuickBooks data.

Requires a Notion page ID as the parent — use notion_list_databases to find existing pages, or ask the user for the page URL.`,
      inputSchema: NotionCreateDatabaseSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: NotionCreateDatabaseInput) => {
      try {
        const title = params.title ?? `${params.entity} Tracker`;
        const schema = getNotionSchemaForEntity(params.entity);

        const db = await notion.createDatabase(
          params.parent_page_id,
          title,
          schema
        );

        const dbId = db.id as string;
        const dbUrl = db.url as string;
        const propNames = getPropertyNamesForEntity(params.entity);

        return toolResponse(
          `## Database Created: ${title}\n\n` +
          `**ID**: \`${dbId}\`\n` +
          `**URL**: ${dbUrl}\n` +
          `**Properties**: ${propNames.join(", ")}\n\n` +
          `Ready to sync. Use notion_sync_qbo with database_id="${dbId}" and entity="${params.entity}" to populate it.`
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── notion_upsert_page ──────────────────────────────────────────
  server.registerTool(
    "notion_upsert_page",
    {
      title: "Create or Update a Notion Page from QBO Record",
      description: `Use when you need to sync a single QuickBooks record into Notion. Creates the page if it doesn't exist, or updates it if a page with the same QBO ID already exists (deduplication).

This is a composable primitive — use it in loops when you need custom filtering or transformation that notion_sync_qbo doesn't support.

Typical workflow:
1. Use qbo_get or qbo_list to fetch the record(s)
2. Use this tool to upsert each record into the Notion database

The 'record' parameter should be the raw QBO record object as returned by qbo_list or qbo_get (JSON format). It must include an 'Id' field.`,
      inputSchema: NotionUpsertPageSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: NotionUpsertPageInput) => {
      try {
        const result = await upsertQBORecord(
          notion,
          params.database_id,
          params.entity,
          params.record
        );

        const verb = result.status === "created" ? "Created" : "Updated";
        return toolResponse(
          `${verb}: **${result.name}** (QBO #${result.qboId}) → [Notion page](${result.notionUrl})`
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── notion_sync_qbo ─────────────────────────────────────────────
  server.registerTool(
    "notion_sync_qbo",
    {
      title: "Sync QuickBooks Data to Notion",
      description: `Use when the user wants to bulk sync QuickBooks records into a Notion database. This is the high-level convenience tool — it fetches from QuickBooks and syncs to Notion in one step.

Handles deduplication automatically: records already in Notion (matched by QBO ID) are updated, new records are created.

Set limit=0 to sync ALL records (auto-paginates). Otherwise, syncs up to the specified limit.

Typical workflow:
1. First, ensure a Notion database exists (use notion_create_database or notion_list_databases to find one)
2. Then call this tool with the entity type and database ID

Examples:
- "Sync all customers to Notion": entity="Customer", limit=0
- "Sync unpaid invoices": entity="Invoice", where="Balance > 0"
- "Sync active vendors": entity="Vendor", where="Active = true"`,
      inputSchema: NotionSyncEntitySchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: NotionSyncEntityInput) => {
      try {
        const qbo = await getClient(params.connection);
        const syncAll = params.limit === 0;
        const batchSize = syncAll ? 50 : params.limit;
        let offset = 0;
        let totalSynced = 0;
        const results: Array<{ qboId: string; name: string; notionUrl: string; status: string }> = [];
        const errors: string[] = [];
        let qboTotalCount = 0;

        // Paginated fetch + sync loop
        do {
          const { items, totalCount } = await qbo.list(params.entity, {
            where: params.where,
            limit: batchSize,
            offset,
          });

          qboTotalCount = totalCount;

          if (items.length === 0) break;

          for (const record of items) {
            const rec = record as Record<string, unknown>;
            try {
              const result = await upsertQBORecord(
                notion,
                params.database_id,
                params.entity,
                rec
              );
              results.push(result);
            } catch (err: unknown) {
              const qboId = String(rec.Id ?? "?");
              errors.push(
                `Failed to sync ${params.entity} #${qboId}: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          }

          offset += items.length;
          totalSynced += items.length;

          // If not syncing all, stop after one batch
          if (!syncAll) break;

          logger.info("Sync progress", {
            entity: params.entity,
            synced: totalSynced,
            total: totalCount,
          });
        } while (offset < qboTotalCount);

        if (results.length === 0 && errors.length === 0) {
          return toolResponse(
            `No ${params.entity} records found in QuickBooks${params.where ? ` matching: ${params.where}` : ""}.`
          );
        }

        // Build response
        const created = results.filter(r => r.status === "created");
        const updated = results.filter(r => r.status === "updated");

        const lines: string[] = [
          `## Sync Complete: ${params.entity}`,
          "",
          `**Synced**: ${results.length} of ${qboTotalCount} total records`,
        ];

        if (created.length > 0) {
          lines.push("");
          lines.push(`**Created** (${created.length}):`);
          for (const r of created) {
            lines.push(`- + **${r.name}** (QBO #${r.qboId}) → [Notion page](${r.notionUrl})`);
          }
        }
        if (updated.length > 0) {
          lines.push("");
          lines.push(`**Updated** (${updated.length}):`);
          for (const r of updated) {
            lines.push(`- ~ **${r.name}** (QBO #${r.qboId}) → [Notion page](${r.notionUrl})`);
          }
        }

        if (errors.length > 0) {
          lines.push("");
          lines.push(`**Errors** (${errors.length}):`);
          for (const e of errors) {
            lines.push(`- ${e}`);
          }
        }

        return toolResponse(lines.join("\n"));
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── notion_list_databases ───────────────────────────────────────
  server.registerTool(
    "notion_list_databases",
    {
      title: "Find Notion Databases",
      description: `Use when you need to find a Notion database to sync QuickBooks data into. Searches the user's Notion workspace by name.

Call this first when the user says "sync to Notion" but hasn't specified which database. Shows database names, IDs, and existing properties so you can pick the right one.

If no databases exist yet, suggest using notion_create_database to create one.`,
      inputSchema: NotionListDatabasesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: NotionListDatabasesInput) => {
      try {
        const result = await notion.search(params.search_term ?? "", {
          property: "object",
          value: "database",
        });

        const databases = result.results;
        if (databases.length === 0) {
          return toolResponse(
            params.search_term
              ? `No databases found matching "${params.search_term}". Use notion_create_database to create one.`
              : "No databases found. Ensure the Notion integration has access to at least one database, or use notion_create_database to create one."
          );
        }

        const lines: string[] = [`## Notion Databases (${databases.length})`, ""];

        for (const db of databases) {
          const title = (
            db.title as Array<{ plain_text?: string }> | undefined
          )
            ?.map((t) => t.plain_text)
            .join("") ?? "Untitled";
          const id = db.id as string;
          const url = db.url as string;
          const props = db.properties as Record<string, { type: string }> | undefined;
          const propNames = props ? Object.keys(props).join(", ") : "none";

          lines.push(`### ${title}`);
          lines.push(`- **ID**: \`${id}\``);
          lines.push(`- **URL**: ${url}`);
          lines.push(`- **Properties**: ${propNames}`);
          lines.push("");
        }

        return toolResponse(lines.join("\n"));
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── notion_get_database ─────────────────────────────────────────
  server.registerTool(
    "notion_get_database",
    {
      title: "Inspect Notion Database Schema",
      description: `Use when you need to check what properties a Notion database has before syncing. Shows the full property schema including types and options.

Useful for verifying that a database has the right columns for the entity type you want to sync. If properties are missing or wrong types, suggest using notion_create_database to create a properly configured database instead.`,
      inputSchema: NotionGetDatabaseSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: NotionGetDatabaseInput) => {
      try {
        const db = await notion.getDatabase(params.database_id);

        return toolResponse(
          truncateWithWarning(JSON.stringify(db, null, 2))
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );
}
