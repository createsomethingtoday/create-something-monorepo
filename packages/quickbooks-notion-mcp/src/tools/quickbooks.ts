import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { QuickBooksClient } from "../services/quickbooks.js";
import {
  QBOQuerySchema,
  QBOListEntitySchema,
  QBOGetEntitySchema,
  QBOCompanyInfoSchema,
  QBOReportSchema,
  QBOSearchSchema,
} from "../schemas/index.js";
import type {
  QBOQueryInput,
  QBOListEntityInput,
  QBOGetEntityInput,
  QBOCompanyInfoInput,
  QBOReportInput,
  QBOSearchInput,
} from "../schemas/index.js";
import { ResponseFormat } from "../types.js";
import type { QBOCompanyInfo } from "../types.js";
import {
  toolResponse,
  formatPaginatedResponse,
  formatCurrency,
  formatDate,
  formatAddress,
  truncateWithWarning,
} from "../services/formatting.js";

/**
 * Client resolver: returns a QuickBooksClient for the given connection.
 * In single-user mode, ignores connectionId and returns the fixed client.
 * In multi-connection mode, resolves from ConnectionManager.
 */
export type QBOClientGetter = (connectionId?: string) => Promise<QuickBooksClient>;

/**
 * Sanitize search terms for QBO query LIKE clauses.
 * Escapes special characters and enforces length limit.
 */
function sanitizeSearchTerm(term: string): string {
  const MAX_LENGTH = 256;
  const truncated = term.slice(0, MAX_LENGTH);
  // Escape QBO query special characters
  return truncated
    .replace(/\\/g, "\\\\")  // backslash first
    .replace(/'/g, "\\'")    // single quote
    .replace(/%/g, "\\%")    // percent (LIKE wildcard)
    .replace(/_/g, "\\_");   // underscore (LIKE wildcard)
}

export function registerQuickBooksTools(
  server: McpServer,
  getClient: QBOClientGetter
): void {
  // ── qbo_query ───────────────────────────────────────────────────
  server.registerTool(
    "qbo_query",
    {
      title: "Query QuickBooks",
      description: `Use when you need precise control over QuickBooks data retrieval. This is the power-user tool — it accepts raw QBO SQL queries.

Prefer qbo_list or qbo_search for common operations. Use this when you need custom SELECT fields, complex WHERE clauses, or specific ordering that other tools don't support.

Only SELECT queries are allowed (read-only). Use response_format="json" when you need to process the results programmatically.

Examples: "SELECT * FROM Invoice WHERE Balance > 0 ORDERBY TxnDate DESC MAXRESULTS 10"`,
      inputSchema: QBOQuerySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: QBOQueryInput) => {
      try {
        const qbo = await getClient(params.connection);
        const result = await qbo.query(params.query);
        if (params.response_format === "json") {
          return toolResponse(JSON.stringify(result, null, 2));
        }
        return toolResponse(
          truncateWithWarning(JSON.stringify(result.QueryResponse, null, 2))
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── qbo_list ────────────────────────────────────────────────────
  server.registerTool(
    "qbo_list",
    {
      title: "List QuickBooks Entities",
      description: `Use when the user wants to see a list of QuickBooks records. This is the most common data retrieval tool.

Supports all 25 entity types. Use 'where' for filtering and 'order_by' for sorting. Results include pagination — use offset to get more pages.

Use response_format="json" when you need structured data for processing (e.g., before syncing to Notion with notion_upsert_page).

Common patterns:
- "Show me customers": entity="Customer"
- "Unpaid invoices": entity="Invoice", where="Balance > 0"
- "Recent bills": entity="Bill", order_by="MetaData.LastUpdatedTime DESC"
- "Active vendors": entity="Vendor", where="Active = true"`,
      inputSchema: QBOListEntitySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: QBOListEntityInput) => {
      try {
        const qbo = await getClient(params.connection);
        const { items, totalCount } = await qbo.list(params.entity, {
          where: params.where,
          orderBy: params.order_by,
          limit: params.limit,
          offset: params.offset,
        });

        const paginatedData = {
          total: totalCount,
          count: items.length,
          offset: params.offset,
          items,
          has_more: totalCount > params.offset + items.length,
          ...(totalCount > params.offset + items.length
            ? { next_offset: params.offset + items.length }
            : {}),
        };

        if (params.response_format === "json") {
          return toolResponse(
            truncateWithWarning(JSON.stringify(paginatedData, null, 2))
          );
        }

        return toolResponse(
          formatPaginatedResponse(
            paginatedData,
            ResponseFormat.MARKDOWN,
            (item: Record<string, unknown>, i: number) => {
              const id = item.Id ?? "?";
              const name =
                item.DisplayName ??
                item.DocNumber ??
                item.Name ??
                `${params.entity} #${id}`;
              const amt = item.TotalAmt ?? item.Balance ?? item.CurrentBalance;
              let line = `${i + 1}. **${name}** (ID: ${id})`;
              if (typeof amt === "number") {
                line += ` — ${formatCurrency(amt)}`;
              }
              if (item.TxnDate) line += ` | Date: ${formatDate(item.TxnDate as string)}`;
              if (item.Active === false) line += " _(inactive)_";
              return line;
            }
          )
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── qbo_get ─────────────────────────────────────────────────────
  server.registerTool(
    "qbo_get",
    {
      title: "Get QuickBooks Entity",
      description: `Use when the user asks about a specific record by ID, or when you need the full details of a record found via qbo_list or qbo_search.

Returns the complete record with all fields. Use response_format="json" when you need to pass the record to notion_upsert_page.`,
      inputSchema: QBOGetEntitySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: QBOGetEntityInput) => {
      try {
        const qbo = await getClient(params.connection);
        const entity = await qbo.getById(params.entity, params.id);

        if (params.response_format === "json") {
          return toolResponse(JSON.stringify(entity, null, 2));
        }

        return toolResponse(
          truncateWithWarning(
            `## ${params.entity} #${params.id}\n\n` +
              JSON.stringify(entity, null, 2)
          )
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── qbo_company_info ────────────────────────────────────────────
  server.registerTool(
    "qbo_company_info",
    {
      title: "Get Company Info",
      description: `Use first to verify which QuickBooks company is connected. Shows company name, address, contact details, and fiscal year settings.

Good starting point when the user asks "what's connected?" or "show me my company info."`,
      inputSchema: QBOCompanyInfoSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: QBOCompanyInfoInput) => {
      try {
        const qbo = await getClient(params.connection);
        const info = await qbo.getCompanyInfo<QBOCompanyInfo>();

        if (params.response_format === "json") {
          return toolResponse(JSON.stringify(info, null, 2));
        }

        const lines = [
          `## ${info.CompanyName}`,
          "",
          info.LegalName ? `**Legal Name**: ${info.LegalName}` : null,
          `**Address**: ${formatAddress(info.CompanyAddr)}`,
          info.PrimaryPhone
            ? `**Phone**: ${info.PrimaryPhone.FreeFormNumber}`
            : null,
          info.Email ? `**Email**: ${info.Email.Address}` : null,
          info.WebAddr ? `**Website**: ${info.WebAddr.URI}` : null,
          info.CompanyStartDate
            ? `**Started**: ${formatDate(info.CompanyStartDate)}`
            : null,
          info.FiscalYearStartMonth
            ? `**Fiscal Year Starts**: Month ${info.FiscalYearStartMonth}`
            : null,
          info.Country ? `**Country**: ${info.Country}` : null,
        ];

        return toolResponse(lines.filter(Boolean).join("\n"));
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── qbo_report ──────────────────────────────────────────────────
  server.registerTool(
    "qbo_report",
    {
      title: "Run QuickBooks Report",
      description: `Use when the user asks for financial reports or summaries. Runs standard accounting reports directly from QuickBooks.

Available: ProfitAndLoss, BalanceSheet, CashFlow, CustomerIncome, AgedReceivableDetail, AgedPayableDetail, TrialBalance, GeneralLedger, VendorExpenses.

Common requests:
- "How's the business doing?" → ProfitAndLoss
- "What do we own and owe?" → BalanceSheet
- "Who owes us money?" → AgedReceivableDetail
- "Cash position?" → CashFlow

Dates are optional — omit for current period. Use accounting_method for Accrual vs Cash basis.`,
      inputSchema: QBOReportSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: QBOReportInput) => {
      try {
        const qbo = await getClient(params.connection);
        const reportParams: Record<string, string> = {};
        if (params.start_date) reportParams.start_date = params.start_date;
        if (params.end_date) reportParams.end_date = params.end_date;
        if (params.accounting_method)
          reportParams.accounting_method = params.accounting_method;

        const report = await qbo.getReport(params.report, reportParams);

        if (params.response_format === "json") {
          return toolResponse(
            truncateWithWarning(JSON.stringify(report, null, 2))
          );
        }

        // Format report header
        const header = report.Header as Record<string, unknown> | undefined;
        const reportName = header?.ReportName ?? params.report;
        const dateRange = header?.DateMacro ?? `${params.start_date ?? ""} to ${params.end_date ?? "present"}`;

        return toolResponse(
          truncateWithWarning(
            `## ${reportName}\n**Period**: ${dateRange}\n\n` +
              JSON.stringify(report, null, 2)
          )
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── qbo_search ──────────────────────────────────────────────────
  server.registerTool(
    "qbo_search",
    {
      title: "Search QuickBooks",
      description: `Use when the user mentions a specific customer, vendor, or item by name. Searches by partial name match.

Prefer this over qbo_list when the user says things like "find the customer named Acme" or "look up vendor Office Depot."

Returns matching records with pagination. Use response_format="json" for structured results.`,
      inputSchema: QBOSearchSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: QBOSearchInput) => {
      try {
        const qbo = await getClient(params.connection);
        // Build LIKE clause based on entity type
        const nameField = ["Account", "Item", "TaxCode", "TaxRate", "Term", "PaymentMethod"].includes(
          params.entity
        )
          ? "Name"
          : "DisplayName";

        const where = `${nameField} LIKE '%${sanitizeSearchTerm(params.search_term)}%'`;

        const { items, totalCount } = await qbo.list(params.entity, {
          where,
          limit: params.limit,
          offset: params.offset,
        });

        if (items.length === 0) {
          return toolResponse(
            `No ${params.entity} records found matching "${params.search_term}".`
          );
        }

        const paginatedData = {
          total: totalCount,
          count: items.length,
          offset: params.offset,
          items,
          has_more: totalCount > params.offset + items.length,
          ...(totalCount > params.offset + items.length
            ? { next_offset: params.offset + items.length }
            : {}),
        };

        if (params.response_format === "json") {
          return toolResponse(
            truncateWithWarning(JSON.stringify(paginatedData, null, 2))
          );
        }

        return toolResponse(
          formatPaginatedResponse(
            paginatedData,
            ResponseFormat.MARKDOWN,
            (item: Record<string, unknown>, i: number) => {
              const id = item.Id ?? "?";
              const name = item.DisplayName ?? item.Name ?? `#${id}`;
              return `${i + 1}. **${name}** (ID: ${id})`;
            }
          )
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
