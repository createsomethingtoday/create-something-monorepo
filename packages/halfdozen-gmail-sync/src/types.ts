/**
 * Half Dozen Gmail Sync - Type Definitions
 */

// ═══════════════════════════════════════════════════════════════
// GMAIL TYPES
// ═══════════════════════════════════════════════════════════════

export interface EmailData {
  id: string;
  threadId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: string;              // ISO 8601
  snippet: string;           // Preview text
  body: string;              // Full body (plain text preferred)
  bodyHtml?: string;         // HTML body if available
  labels: string[];
  hasAttachments: boolean;
  attachments?: AttachmentMeta[];
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface AttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

// ═══════════════════════════════════════════════════════════════
// NOTION TYPES
// ═══════════════════════════════════════════════════════════════

export interface InteractionData {
  /** Email subject */
  subject: string;
  /** Parsed sender */
  from: EmailAddress;
  /** Parsed recipients */
  to: EmailAddress[];
  /** Email date */
  date: string;
  /** Short preview */
  snippet: string;
  /** Full email body (stored in page content) */
  body: string;
  /** Original Gmail ID (for dedup) */
  gmailId: string;
  /** Gmail thread ID */
  threadId: string;
  /** Direction: Inbound or Outbound */
  direction: 'Inbound' | 'Outbound';
  /** Linked contact ID (if found) */
  contactId?: string;
}

export interface ContactData {
  id: string;
  name: string;
  email?: string;
  secondaryEmail?: string;
  company?: string;
  notionPageId: string;
}

export interface ContactMatch {
  contact: ContactData;
  confidence: 'exact_email' | 'secondary_email' | 'exact_name' | 'partial_name';
}

// ═══════════════════════════════════════════════════════════════
// PROPERTY MAPPING
// ═══════════════════════════════════════════════════════════════

export interface InteractionsPropertyMapping {
  title: string;           // "Subject" or "Item"
  from: string;            // "From" - email address
  to: string;              // "To" - email addresses
  date: string;            // "Date"
  direction: string;       // "Direction" - select (Inbound/Outbound)
  contact: string;         // "Contact" - relation to Contacts DB
  gmailId: string;         // "Gmail ID" - for dedup
  status?: string;         // "Status" - select
  type?: string;           // "Type" - select (Email)
}

export interface ContactsPropertyMapping {
  name: string;            // "Name" - title
  email: string;           // "Email" - email property
  secondaryEmail?: string; // "Secondary Email" - email property (alias)
  company?: string;        // "Company" - text
  interactions?: string;   // "Interactions" - relation (rollup from Interactions)
}

// ═══════════════════════════════════════════════════════════════
// SYNC RESULTS
// ═══════════════════════════════════════════════════════════════

export interface SyncResult {
  success: boolean;
  interactionId?: string;
  pageUrl?: string;
  contactId?: string;
  contactCreated?: boolean;
  error?: string;
}

export interface BatchSyncResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: SyncResult[];
}

// ═══════════════════════════════════════════════════════════════
// OAUTH TYPES
// ═══════════════════════════════════════════════════════════════

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}
