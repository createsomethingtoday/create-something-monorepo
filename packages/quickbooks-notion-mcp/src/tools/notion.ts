import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { QuickBooksClient } from "../services/quickbooks.js";
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
} from "../schemas/index.js";
import type {
  NotionSyncEntityInput,
  NotionListDatabasesInput,
  NotionGetDatabaseInput,
} from "../schemas/index.js";
import { toolResponse, truncateWithWarning } from "../services/formatting.js";
import type { QBOEntity } from "../constants.js";

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
      // Generic: sync any common fields
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

export function registerNotionTools(
  server: McpServer,
  qbo: QuickBooksClient,
  notion: NotionClient
): void {
  // ── notion_sync_qbo ─────────────────────────────────────────────
  server.registerTool(
    "notion_sync_qbo",
    {
      title: "Sync QuickBooks to Notion",
      description: `Sync QuickBooks Online entities into a Notion database. Creates a new Notion page for each QuickBooks record.

This tool reads data from QuickBooks (read-only) and writes it to Notion. It automatically maps QBO fields to Notion properties based on entity type.

Required Notion database properties (created automatically if missing — ensure your database has at minimum a "Name" title property):
  - Name (title): Entity name/display name
  - QBO ID (rich_text): QuickBooks record ID
  - Additional properties vary by entity type (Total, Balance, Date, Customer, Vendor, etc.)

Args:
  - entity (string): QBO entity type to sync
  - database_id (string): Target Notion database ID
  - where (string, optional): WHERE clause to filter QBO records
  - limit (number): Max records per batch (1-50, default: 10)

Returns: Summary of synced records with links to created Notion pages.

Examples:
  - Sync customers: entity="Customer", database_id="abc123"
  - Sync unpaid invoices: entity="Invoice", where="Balance > 0", database_id="abc123"
  - Sync active vendors: entity="Vendor", where="Active = true", database_id="abc123"`,
      inputSchema: NotionSyncEntitySchema,
      annotations: {
        readOnlyHint: false, // Writes to Notion
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: NotionSyncEntityInput) => {
      try {
        // 1. Fetch from QuickBooks
        const { items, totalCount } = await qbo.list(params.entity, {
          where: params.where,
          limit: params.limit,
        });

        if (items.length === 0) {
          return toolResponse(
            `No ${params.entity} records found in QuickBooks${params.where ? ` matching: ${params.where}` : ""}.`
          );
        }

        // 2. Sync each record to Notion
        const results: Array<{ qboId: string; name: string; notionUrl: string; status: string }> = [];
        const errors: string[] = [];

        for (const record of items) {
          const rec = record as Record<string, unknown>;
          try {
            const properties = mapQBOToNotionProperties(params.entity, rec);
            const page = await notion.createPage(params.database_id, properties);

            results.push({
              qboId: String(rec.Id ?? "?"),
              name: String(
                rec.DisplayName ?? rec.Name ?? rec.DocNumber ?? `#${rec.Id}`
              ),
              notionUrl: page.url,
              status: "created",
            });
          } catch (err: unknown) {
            errors.push(
              `Failed to sync ${params.entity} #${rec.Id}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }

        // 3. Build response
        const lines: string[] = [
          `## Sync Complete: ${params.entity}`,
          "",
          `**Synced**: ${results.length} of ${items.length} records (${totalCount} total in QuickBooks)`,
        ];

        if (results.length > 0) {
          lines.push("");
          for (const r of results) {
            lines.push(
              `- ✅ **${r.name}** (QBO #${r.qboId}) → [Notion page](${r.notionUrl})`
            );
          }
        }

        if (errors.length > 0) {
          lines.push("");
          lines.push(`**Errors** (${errors.length}):`);
          for (const e of errors) {
            lines.push(`- ❌ ${e}`);
          }
        }

        if (totalCount > params.limit) {
          lines.push("");
          lines.push(
            `_${totalCount - params.limit} more records available. Increase limit or run again with a WHERE filter._`
          );
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
      title: "List Notion Databases",
      description: `Search for Notion databases in your workspace. Useful for finding the right database_id to sync QuickBooks data into.

Args:
  - search_term (string, optional): Filter databases by name

Returns: List of databases with IDs, names, and property schemas.`,
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
              ? `No databases found matching "${params.search_term}".`
              : "No databases found. Ensure your Notion integration has access to at least one database."
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
      title: "Get Notion Database Schema",
      description: `Inspect a Notion database's schema (properties, types, options). Useful for understanding what properties exist before syncing data.

Args:
  - database_id (string): Notion database ID

Returns: Database name and complete property schema.`,
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
