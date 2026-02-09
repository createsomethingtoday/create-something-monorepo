import { z } from "zod";
import { QBO_ENTITIES } from "../constants.js";

// ── Shared schemas ──────────────────────────────────────────────────

export const ResponseFormatSchema = z
  .enum(["markdown", "json"])
  .default("markdown")
  .describe("Output format: 'markdown' for readability or 'json' for structured data");

export const PaginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return (1-100, default: 20)"),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
});

// ── QuickBooks tool schemas ─────────────────────────────────────────

export const QBOQuerySchema = z
  .object({
    query: z
      .string()
      .min(7)
      .describe(
        "QuickBooks SQL query (SELECT only). Example: SELECT * FROM Invoice WHERE Balance > 0"
      ),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const QBOListEntitySchema = z
  .object({
    entity: z
      .enum(QBO_ENTITIES)
      .describe("QuickBooks entity type to list"),
    where: z
      .string()
      .optional()
      .describe(
        "Optional WHERE clause filter. Example: Active = true AND Balance > 0"
      ),
    order_by: z
      .string()
      .optional()
      .describe("Optional ORDER BY clause. Example: MetaData.LastUpdatedTime DESC"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const QBOGetEntitySchema = z
  .object({
    entity: z
      .enum(QBO_ENTITIES)
      .describe("QuickBooks entity type"),
    id: z
      .string()
      .min(1)
      .describe("Entity ID in QuickBooks"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const QBOCompanyInfoSchema = z
  .object({
    response_format: ResponseFormatSchema,
  })
  .strict();

export const QBOReportSchema = z
  .object({
    report: z
      .enum([
        "ProfitAndLoss",
        "BalanceSheet",
        "CashFlow",
        "CustomerIncome",
        "AgedReceivableDetail",
        "AgedPayableDetail",
        "TrialBalance",
        "GeneralLedger",
        "VendorExpenses",
      ])
      .describe("Report type to run"),
    start_date: z
      .string()
      .optional()
      .describe("Start date in YYYY-MM-DD format"),
    end_date: z
      .string()
      .optional()
      .describe("End date in YYYY-MM-DD format"),
    accounting_method: z
      .enum(["Accrual", "Cash"])
      .optional()
      .describe("Accounting method for the report"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const QBOSearchSchema = z
  .object({
    entity: z
      .enum(QBO_ENTITIES)
      .describe("QuickBooks entity type to search"),
    search_term: z
      .string()
      .min(1)
      .describe("Search term to match against entity names/display names"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

// ── Notion tool schemas ─────────────────────────────────────────────

export const NotionSyncEntitySchema = z
  .object({
    entity: z
      .enum(QBO_ENTITIES)
      .describe("QuickBooks entity type to sync"),
    database_id: z
      .string()
      .min(1)
      .describe("Notion database ID to sync into"),
    where: z
      .string()
      .optional()
      .describe("Optional WHERE clause to filter which QBO records to sync"),
    limit: z
      .number()
      .int()
      .min(0)
      .max(50)
      .default(20)
      .describe("Max records per batch (0 = sync all, default: 20)"),
  })
  .strict();

export const NotionListDatabasesSchema = z
  .object({
    search_term: z
      .string()
      .optional()
      .describe("Optional search term to filter databases by name"),
  })
  .strict();

export const NotionGetDatabaseSchema = z
  .object({
    database_id: z
      .string()
      .min(1)
      .describe("Notion database ID to inspect"),
  })
  .strict();

export const NotionCreateDatabaseSchema = z
  .object({
    parent_page_id: z
      .string()
      .min(1)
      .describe("Notion page ID where the database will be created. The Notion integration must have access to this page."),
    entity: z
      .enum(QBO_ENTITIES)
      .describe("QBO entity type — determines the database columns (e.g., Customer gets Name, Email, Phone, Balance; Invoice gets Doc Number, Date, Total, Balance)"),
    title: z
      .string()
      .optional()
      .describe("Database title. Defaults to '{Entity} Tracker' (e.g., 'Invoice Tracker')"),
  })
  .strict();

export const NotionUpsertPageSchema = z
  .object({
    entity: z
      .enum(QBO_ENTITIES)
      .describe("QBO entity type — determines how record fields map to Notion properties"),
    database_id: z
      .string()
      .min(1)
      .describe("Target Notion database ID"),
    record: z
      .record(z.unknown())
      .describe("Raw QBO record object (as returned by qbo_list or qbo_get). Must include an 'Id' field."),
  })
  .strict();

// ── Type exports ────────────────────────────────────────────────────

export type QBOQueryInput = z.infer<typeof QBOQuerySchema>;
export type QBOListEntityInput = z.infer<typeof QBOListEntitySchema>;
export type QBOGetEntityInput = z.infer<typeof QBOGetEntitySchema>;
export type QBOCompanyInfoInput = z.infer<typeof QBOCompanyInfoSchema>;
export type QBOReportInput = z.infer<typeof QBOReportSchema>;
export type QBOSearchInput = z.infer<typeof QBOSearchSchema>;
export type NotionSyncEntityInput = z.infer<typeof NotionSyncEntitySchema>;
export type NotionListDatabasesInput = z.infer<typeof NotionListDatabasesSchema>;
export type NotionGetDatabaseInput = z.infer<typeof NotionGetDatabaseSchema>;
export type NotionCreateDatabaseInput = z.infer<typeof NotionCreateDatabaseSchema>;
export type NotionUpsertPageInput = z.infer<typeof NotionUpsertPageSchema>;
