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

export function registerQuickBooksTools(
  server: McpServer,
  qbo: QuickBooksClient
): void {
  // ── qbo_query ───────────────────────────────────────────────────
  server.registerTool(
    "qbo_query",
    {
      title: "Query QuickBooks",
      description: `Execute a read-only SQL query against QuickBooks Online data.

Only SELECT queries are allowed. Supports standard QBO query syntax including WHERE, ORDERBY, STARTPOSITION, and MAXRESULTS clauses.

Args:
  - query (string): QuickBooks SQL query. Example: "SELECT * FROM Invoice WHERE Balance > 0 ORDERBY TxnDate DESC MAXRESULTS 10"
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Query results formatted as markdown table or raw JSON.

Examples:
  - "SELECT * FROM Customer WHERE Active = true"
  - "SELECT * FROM Invoice WHERE DueDate < '2025-01-01' AND Balance > 0"
  - "SELECT * FROM Bill WHERE VendorRef = '123'"
  - "SELECT TotalAmt, CustomerRef FROM Payment WHERE TxnDate > '2025-01-01'"

Error Handling:
  - Non-SELECT queries will be rejected
  - Returns QBO API errors with actionable suggestions`,
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
      description: `List entities from QuickBooks Online with optional filtering and pagination.

Supported entities: Account, Bill, BillPayment, CompanyInfo, CreditMemo, Customer, Deposit, Employee, Estimate, Invoice, Item, JournalEntry, Payment, PaymentMethod, Purchase, PurchaseOrder, RefundReceipt, SalesReceipt, TaxCode, TaxRate, Term, TimeActivity, Transfer, Vendor, VendorCredit.

Args:
  - entity (string): Entity type to list
  - where (string, optional): WHERE clause filter
  - order_by (string, optional): ORDER BY clause
  - limit (number): Max results (1-100, default: 20)
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format

Returns: Paginated list with total count and has_more indicator.

Examples:
  - List active customers: entity="Customer", where="Active = true"
  - Unpaid invoices: entity="Invoice", where="Balance > 0"
  - Recent bills: entity="Bill", order_by="MetaData.LastUpdatedTime DESC"`,
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
      description: `Get a single QuickBooks entity by its ID. Returns the complete entity record.

Args:
  - entity (string): Entity type (e.g., "Invoice", "Customer")
  - id (string): Entity ID
  - response_format ('markdown' | 'json'): Output format

Returns: Full entity details.`,
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
      description: `Get QuickBooks company information including name, address, contact details, and fiscal year settings.

Args:
  - response_format ('markdown' | 'json'): Output format

Returns: Company name, legal name, address, phone, email, fiscal year start, etc.`,
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
      description: `Run a financial report from QuickBooks Online.

Available reports: ProfitAndLoss, BalanceSheet, CashFlow, CustomerIncome, AgedReceivableDetail, AgedPayableDetail, TrialBalance, GeneralLedger, VendorExpenses.

Args:
  - report (string): Report type
  - start_date (string, optional): Start date (YYYY-MM-DD)
  - end_date (string, optional): End date (YYYY-MM-DD)
  - accounting_method ('Accrual' | 'Cash', optional): Accounting method
  - response_format ('markdown' | 'json'): Output format

Returns: Report data. JSON format returns raw QBO report structure.

Examples:
  - Monthly P&L: report="ProfitAndLoss", start_date="2025-01-01", end_date="2025-01-31"
  - Current balance sheet: report="BalanceSheet"
  - Aged receivables: report="AgedReceivableDetail"`,
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
      description: `Search QuickBooks entities by name or display name. Useful for finding specific customers, vendors, items, etc. by partial name match.

Args:
  - entity (string): Entity type to search
  - search_term (string): Text to search for (matches against DisplayName or Name)
  - limit (number): Max results (1-100, default: 20)
  - offset (number): Pagination offset
  - response_format ('markdown' | 'json'): Output format

Returns: Matching entities with pagination metadata.

Examples:
  - Find customer "Acme": entity="Customer", search_term="Acme"
  - Search vendors: entity="Vendor", search_term="Office"`,
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
        // Build LIKE clause based on entity type
        const nameField = ["Account", "Item", "TaxCode", "TaxRate", "Term", "PaymentMethod"].includes(
          params.entity
        )
          ? "Name"
          : "DisplayName";

        const where = `${nameField} LIKE '%${params.search_term.replace(/'/g, "\\'")}%'`;

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
