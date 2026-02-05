# Half Dozen Gmail Sync

Gmail to Notion sync for Half Dozen client. Syncs emails to an **Interactions** database and links to existing **Contacts** by email/name matching.

## Features

- **OAuth Authentication** - Secure Gmail access via Google OAuth
- **Email Search** - Use Gmail search syntax to find specific emails
- **Notion Sync** - Create Interactions entries with full email body
- **Contact Linking** - Automatically find and link to existing Contacts
- **Deduplication** - Skip emails that have already been synced

## Setup

### 1. Install Dependencies

```bash
cd packages/halfdozen-gmail-sync
pnpm install
```

### 2. Configure Environment

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Required values:

```env
# Gmail OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Notion (from notion.so/my-integrations)
NOTION_API_KEY=ntn_xxx
NOTION_INTERACTIONS_DB_ID=xxx
NOTION_CONTACTS_DB_ID=xxx
```

### 3. Authorize Gmail

Run the OAuth flow (one-time):

```bash
pnpm auth
```

This opens a browser for you to authorize access. Tokens are saved locally.

### 4. Test Connection

```bash
pnpm test:connection
```

## Usage

### Sync Emails

```bash
# Sync emails from a specific sender
pnpm sync "from:client@example.com"

# Sync emails with a label
pnpm sync "label:Important"

# Sync with query and options
pnpm sync "subject:invoice after:2024/01/01" --limit=20 --create-contacts
```

### Search (without syncing)

```bash
pnpm search "from:client@example.com"
pnpm search "subject:proposal"
```

### List Labels

```bash
pnpm start labels
```

## Gmail Search Syntax

Use [Gmail search operators](https://support.google.com/mail/answer/7190):

| Operator | Example |
|----------|---------|
| `from:` | `from:john@example.com` |
| `to:` | `to:me@company.com` |
| `subject:` | `subject:"Q4 proposal"` |
| `label:` | `label:Important` |
| `after:` | `after:2024/01/01` |
| `before:` | `before:2024/12/31` |
| `has:attachment` | Find emails with attachments |
| `is:unread` | Find unread emails |

Combine operators: `from:client@co.com subject:invoice after:2024/06/01`

## Notion Database Schema

### Interactions Database

| Property | Type | Description |
|----------|------|-------------|
| Subject | Title | Email subject line |
| From | Email | Sender's email address |
| To | Rich Text | Recipients (comma-separated) |
| Date | Date | Email date |
| Direction | Select | Inbound / Outbound |
| Contact | Relation | Link to Contacts DB |
| Gmail ID | Rich Text | For deduplication |
| Status | Select | Active (default) |
| Type | Select | Email (default) |

Email body is stored in the page content as a collapsible toggle.

### Contacts Database

| Property | Type | Description |
|----------|------|-------------|
| Name | Title | Contact name |
| Email | Email | Contact email (for matching) |
| Company | Rich Text | Company name |

## Options

| Flag | Description |
|------|-------------|
| `--limit=N` | Maximum emails to process (default: 10) |
| `--create-contacts` | Create new Contacts for unknown senders |

## MCP Server

This package includes an MCP server for AI agent integration.

### Available Tools

| Tool | Description |
|------|-------------|
| `search_emails` | Search Gmail with query syntax |
| `sync_email` | Sync a single email by ID to Notion |
| `sync_emails_by_query` | Bulk sync emails matching a query |
| `find_contact` | Find a contact by email or name |
| `create_contact` | Create a new contact |
| `get_email_labels` | List Gmail labels |

### Setup for Cursor

Add to your Cursor MCP settings (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "halfdozen-gmail-sync": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/packages/halfdozen-gmail-sync"
    }
  }
}
```

### Example Agent Usage

```
"Search for emails from john@example.com"
→ Uses search_emails tool

"Sync that email to Notion and create a contact for the sender"
→ Uses sync_email with create_contact: true

"Find the contact for sarah@company.com"
→ Uses find_contact tool
```

## Remote MCP Server (Cloudflare Worker)

For remote access without local setup, deploy the Streamable HTTP version:

```bash
cd worker
pnpm install
pnpm deploy
```

### Set Secrets

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REFRESH_TOKEN
wrangler secret put NOTION_API_KEY
wrangler secret put NOTION_INTERACTIONS_DB_ID
wrangler secret put NOTION_CONTACTS_DB_ID
wrangler secret put TEAM_EMAILS
```

### Connect via mcp-remote

For clients that don't support remote MCP natively:

```json
{
  "mcpServers": {
    "halfdozen-gmail-sync": {
      "command": "npx",
      "args": ["mcp-remote", "https://halfdozen-gmail-sync-mcp.<your-subdomain>.workers.dev/mcp"]
    }
  }
}
```

## Troubleshooting

### "No Gmail tokens found"

Run `pnpm auth` to authorize with Gmail.

### "Token refresh failed"

Your refresh token may have expired. Run `pnpm auth` again.

### "NOTION_INTERACTIONS_DB_ID not set"

Add your Notion database IDs to the `.env` file.

### Contact not found

The linker searches by:
1. Exact email match (highest confidence)
2. Exact name match
3. First name match (lowest confidence)

Use `--create-contacts` to auto-create missing contacts.
