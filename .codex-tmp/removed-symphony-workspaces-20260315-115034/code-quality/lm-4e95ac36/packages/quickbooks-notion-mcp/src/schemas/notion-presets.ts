import type { QBOEntity } from "../constants.js";

/**
 * Notion database property schema presets for each QBO entity type.
 * These match the property mapping in mapQBOToNotionProperties exactly.
 */
export function getNotionSchemaForEntity(
  entity: QBOEntity
): Record<string, Record<string, unknown>> {
  // Universal properties for all entities
  const base: Record<string, Record<string, unknown>> = {
    "Name": { title: {} },
    "QBO ID": { rich_text: {} },
    "Last Updated": { date: {} },
  };

  switch (entity) {
    case "Customer":
    case "Vendor":
    case "Employee":
      return {
        ...base,
        "Company": { rich_text: {} },
        "Email": { email: {} },
        "Phone": { phone_number: {} },
        "Balance": { number: { format: "dollar" } },
        "Active": { checkbox: {} },
      };

    case "Invoice":
    case "Estimate":
    case "CreditMemo":
    case "SalesReceipt":
    case "RefundReceipt":
      return {
        ...base,
        "Customer": { rich_text: {} },
        "Doc Number": { rich_text: {} },
        "Date": { date: {} },
        "Due Date": { date: {} },
        "Total": { number: { format: "dollar" } },
        "Balance": { number: { format: "dollar" } },
      };

    case "Bill":
    case "VendorCredit":
    case "PurchaseOrder":
      return {
        ...base,
        "Vendor": { rich_text: {} },
        "Doc Number": { rich_text: {} },
        "Date": { date: {} },
        "Due Date": { date: {} },
        "Total": { number: { format: "dollar" } },
        "Balance": { number: { format: "dollar" } },
      };

    case "Payment":
    case "BillPayment":
      return {
        ...base,
        "Customer": { rich_text: {} },
        "Vendor": { rich_text: {} },
        "Date": { date: {} },
        "Total": { number: { format: "dollar" } },
      };

    case "Account":
      return {
        ...base,
        "Account Type": { select: {} },
        "Sub Type": { rich_text: {} },
        "Balance": { number: { format: "dollar" } },
        "Classification": { select: {} },
        "Active": { checkbox: {} },
      };

    case "Item":
      return {
        ...base,
        "Description": { rich_text: {} },
        "Type": { select: {} },
        "Unit Price": { number: { format: "dollar" } },
        "Active": { checkbox: {} },
      };

    case "Purchase":
    case "Deposit":
    case "Transfer":
    case "JournalEntry":
      return {
        ...base,
        "Date": { date: {} },
        "Total": { number: { format: "dollar" } },
        "Account": { rich_text: {} },
        "Payment Type": { select: {} },
      };

    default:
      return {
        ...base,
        "Date": { date: {} },
        "Total": { number: { format: "dollar" } },
        "Active": { checkbox: {} },
      };
  }
}

/**
 * Get a human-readable list of property names for an entity type.
 */
export function getPropertyNamesForEntity(entity: QBOEntity): string[] {
  return Object.keys(getNotionSchemaForEntity(entity));
}
