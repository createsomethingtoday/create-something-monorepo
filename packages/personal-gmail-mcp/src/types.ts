export type OAuthTokens = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
};

export type EmailAddress = {
  name: string;
  email: string;
};

export type AttachmentMeta = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type EmailData = {
  id: string;
  threadId: string;
  /** RFC822 Message-ID header value (not the Gmail message ID). */
  messageIdHeader?: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: string; // ISO
  snippet: string;
  body: string;
  bodyHtml: string;
  labels: string[];
  hasAttachments: boolean;
  attachments?: AttachmentMeta[];
};

export type ThreadData = {
  id: string;
  messages: EmailData[];
};

