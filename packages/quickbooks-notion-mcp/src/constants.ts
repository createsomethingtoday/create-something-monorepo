// QuickBooks Online API
export const QBO_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
export const QBO_SANDBOX_API_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";

// Notion API
export const NOTION_API_BASE = "https://api.notion.com/v1";
export const NOTION_VERSION = "2022-06-28";

// Defaults
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const CHARACTER_LIMIT = 50_000;

// QuickBooks entity types we support (read-only)
export const QBO_ENTITIES = [
  "Account",
  "Bill",
  "BillPayment",
  "CompanyInfo",
  "CreditMemo",
  "Customer",
  "Deposit",
  "Employee",
  "Estimate",
  "Invoice",
  "Item",
  "JournalEntry",
  "Payment",
  "PaymentMethod",
  "Purchase",
  "PurchaseOrder",
  "RefundReceipt",
  "SalesReceipt",
  "TaxCode",
  "TaxRate",
  "Term",
  "TimeActivity",
  "Transfer",
  "Vendor",
  "VendorCredit",
] as const;

export type QBOEntity = (typeof QBO_ENTITIES)[number];
