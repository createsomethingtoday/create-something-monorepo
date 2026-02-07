// ── QuickBooks Online Types ──────────────────────────────────────────

export interface QBOConfig {
  accessToken: string;
  realmId: string;
  sandbox: boolean;
}

export interface QBOQueryResponse<T = Record<string, unknown>> {
  QueryResponse: {
    [key: string]: T[] | number | undefined;
    startPosition?: number;
    maxResults?: number;
    totalCount?: number;
  };
  time: string;
}

export interface QBOCustomer {
  Id: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: QBOAddress;
  Balance: number;
  Active: boolean;
  MetaData: QBOMetaData;
}

export interface QBOInvoice {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  CustomerRef: { value: string; name: string };
  TotalAmt: number;
  Balance: number;
  Line: QBOLine[];
  EmailStatus?: string;
  PrintStatus?: string;
  MetaData: QBOMetaData;
}

export interface QBOPayment {
  Id: string;
  TxnDate: string;
  CustomerRef: { value: string; name: string };
  TotalAmt: number;
  PaymentMethodRef?: { value: string; name: string };
  DepositToAccountRef?: { value: string; name: string };
  MetaData: QBOMetaData;
}

export interface QBOBill {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  VendorRef: { value: string; name: string };
  TotalAmt: number;
  Balance: number;
  Line: QBOLine[];
  MetaData: QBOMetaData;
}

export interface QBOVendor {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Balance: number;
  Active: boolean;
  MetaData: QBOMetaData;
}

export interface QBOAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  CurrentBalance: number;
  Active: boolean;
  Classification?: string;
  MetaData: QBOMetaData;
}

export interface QBOItem {
  Id: string;
  Name: string;
  Description?: string;
  Type: string;
  UnitPrice?: number;
  Active: boolean;
  MetaData: QBOMetaData;
}

export interface QBOEmployee {
  Id: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Active: boolean;
  MetaData: QBOMetaData;
}

export interface QBOEstimate {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  ExpirationDate?: string;
  CustomerRef: { value: string; name: string };
  TotalAmt: number;
  TxnStatus?: string;
  Line: QBOLine[];
  MetaData: QBOMetaData;
}

export interface QBOPurchase {
  Id: string;
  TxnDate: string;
  AccountRef: { value: string; name: string };
  PaymentType: string;
  TotalAmt: number;
  EntityRef?: { value: string; name: string; type: string };
  Line: QBOLine[];
  MetaData: QBOMetaData;
}

export interface QBOCompanyInfo {
  Id: string;
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: QBOAddress;
  CustomerCommunicationAddr?: QBOAddress;
  PrimaryPhone?: { FreeFormNumber: string };
  CompanyStartDate?: string;
  FiscalYearStartMonth?: string;
  Country?: string;
  Email?: { Address: string };
  WebAddr?: { URI: string };
  MetaData: QBOMetaData;
}

export interface QBOAddress {
  Line1?: string;
  Line2?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  Country?: string;
}

export interface QBOLine {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount: number;
  DetailType: string;
  SalesItemLineDetail?: {
    ItemRef?: { value: string; name: string };
    Qty?: number;
    UnitPrice?: number;
  };
  ItemBasedExpenseLineDetail?: {
    ItemRef?: { value: string; name: string };
    Qty?: number;
    UnitPrice?: number;
  };
}

export interface QBOMetaData {
  CreateTime: string;
  LastUpdatedTime: string;
}

// ── Notion Types ────────────────────────────────────────────────────

export interface NotionConfig {
  apiKey: string;
}

export interface NotionDatabaseMapping {
  databaseId: string;
  entity: string;
  propertyMap: Record<string, NotionPropertyMapping>;
}

export interface NotionPropertyMapping {
  notionProperty: string;
  type: "title" | "rich_text" | "number" | "date" | "checkbox" | "select" | "email" | "phone_number" | "url";
}

export interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, unknown>;
}

// ── Shared Types ────────────────────────────────────────────────────

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export interface PaginatedResponse<T> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset?: number;
}
