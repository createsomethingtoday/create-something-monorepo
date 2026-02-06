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

For remote access without local setup, deploy the Streamable HTTP version. The worker supports **multi-user OAuth** — each team member authorizes their own Gmail account.

```bash
cd worker
pnpm install
pnpm deploy
```

### Set Secrets

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put NOTION_API_KEY
wrangler secret put NOTION_INTERACTIONS_DB_ID
wrangler secret put NOTION_CONTACTS_DB_ID
wrangler secret put TEAM_EMAILS
wrangler secret put ADMIN_SECRET        # Optional: protects /users endpoint and list_authorized_users tool
```

> **Note**: The worker uses per-user OAuth tokens stored in KV, not a single `GOOGLE_REFRESH_TOKEN`. Each team member authorizes individually via the `/auth` endpoint.

### Authorize Team Members

Each team member must authorize their Gmail account:

```
https://halfdozen-gmail-sync-mcp.<your-subdomain>.workers.dev/auth?email=user@example.com
```

This opens a Google OAuth consent screen. After authorization, the refresh token is stored in KV and the user's Gmail is accessible via the MCP tools.

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

## Gmail Add-on (Sidebar)

Sync emails to Notion directly from Gmail without leaving your inbox.

### How It Works

1. Open any email in Gmail
2. The Half Dozen Sync sidebar appears with sender info and direction
3. Click **Sync to Notion** -- the email is synced with contact auto-creation
4. If the contact was auto-created but is actually an existing client, click **Link to Existing Contact Instead** to search by name, re-link, and save the alias

### Setup

#### 1. Set the add-on secret on the worker

```bash
cd worker
wrangler secret put ADDON_SECRET
# Enter a strong random string (this authenticates the add-on)
```

#### 2. Create the Apps Script project

1. Go to [script.google.com](https://script.google.com) (logged into your Half Dozen Google Workspace account)
2. Click **New project**
3. Replace the default `Code.gs` with the contents of `addon/Code.gs`
4. Create a new file `Config.gs` and paste the contents of `addon/Config.gs`
5. Open **Project Settings** (gear icon):
   - Under **General settings**, check **Show "appsscript.json" manifest file in editor**
   - Go back to the editor and replace `appsscript.json` with the contents of `addon/appsscript.json`
6. In **Project Settings > Script Properties**, add:
   - `ADDON_SECRET` -- the same value you set in the worker
   - `TEAM_EMAILS` -- comma-separated team emails (e.g., `alice@halfdozen.com,bob@halfdozen.com`)

#### 3. Install the add-on

1. Click **Deploy > Test deployments**
2. Click **Install**
3. Open Gmail, open any email -- the sidebar should appear

#### 4. Share with the team

- Share the Apps Script project with team members (editor access)
- Each person: **Deploy > Test deployments > Install**

Or private publish to the Half Dozen Marketplace for self-service install (no Google review required).

### Contact Matching

When syncing, contacts are matched in this order:

1. **Primary Email** -- exact match (highest confidence)
2. **Secondary Email** -- exact match (catches clients using alternate addresses)
3. **Name** -- exact match
4. **First Name** -- partial match (lowest confidence)
5. **Auto-create** -- new contact created from sender info

If a contact was auto-created but should have been linked to an existing one, use the **Link to Existing Contact** flow to re-link, save the alias to Secondary Email (if available), and archive the duplicate.

## Troubleshooting

### "No Gmail tokens found"

Run `pnpm auth` to authorize with Gmail.

### "Token refresh failed"

Your refresh token may have expired. Run `pnpm auth` again.

### "NOTION_INTERACTIONS_DB_ID not set"

Add your Notion database IDs to the `.env` file.

### "ADDON_SECRET not set"

In the Apps Script editor, go to Project Settings > Script Properties and add `ADDON_SECRET`.
