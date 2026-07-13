# QuickBooks → Notion MCP Server

A read-only MCP (Model Context Protocol) server that connects QuickBooks Online data to Notion databases. Built by [CREATE SOMETHING Agency](https://createsomething.agency/).

## What It Does

This server gives AI agents (Claude, Cursor, Codex) secure, read-only access to your QuickBooks Online data and the ability to sync it into Notion databases. No SQL required — agents can query customers, invoices, payments, reports, and more through natural language.

**Read-only by design**: This server never modifies your QuickBooks data. It only reads from QBO and writes to Notion.

**Multi-connection**: Multiple QuickBooks companies can be connected simultaneously. Each user authenticates independently — no need to disconnect others.

**OAuth with auto-refresh**: Standard OAuth 2.0 with automatic token refresh. No more manually rotating access tokens every 60 minutes.

## Tools

### Connection Management

| Tool | Description |
|------|-------------|
| `qbo_connect` | Generate an OAuth URL to connect a new QuickBooks account |
| `qbo_complete_connection` | Bind the authorized Composio connection to a QuickBooks Company ID |
| `qbo_list_connections` | List all connected QBO companies with realmId, name, email |
| `qbo_disconnect` | Remove a QuickBooks connection by realmId |

### QuickBooks (Read-Only)

| Tool | Description |
|------|-------------|
| `qbo_query` | Execute raw SELECT queries against QBO data |
| `qbo_list` | List any entity type with filtering and pagination |
| `qbo_get` | Get a single entity by ID |
| `qbo_search` | Search entities by name |
| `qbo_company_info` | Get company name, address, fiscal year settings |
| `qbo_report` | Run financial reports (P&L, Balance Sheet, Cash Flow, etc.) |

All QuickBooks tools accept an optional `connection` parameter (realmId) to specify which company to query. Omit it to use the default connection.

### Notion (Sync)

| Tool | Description |
|------|-------------|
| `notion_sync_qbo` | Sync QBO entities into a Notion database |
| `notion_list_databases` | Find databases in your Notion workspace |
| `notion_get_database` | Inspect a database's property schema |

### Supported QBO Entities

Account, Bill, BillPayment, CompanyInfo, CreditMemo, Customer, Deposit, Employee, Estimate, Invoice, Item, JournalEntry, Payment, PaymentMethod, Purchase, PurchaseOrder, RefundReceipt, SalesReceipt, TaxCode, TaxRate, Term, TimeActivity, Transfer, Vendor, VendorCredit

### Supported Reports

ProfitAndLoss, BalanceSheet, CashFlow, CustomerIncome, AgedReceivableDetail, AgedPayableDetail, TrialBalance, GeneralLedger, VendorExpenses

## Setup

### Remote (Recommended) — Agent-Driven OAuth

The production deployment at `https://quickbooks.mcp.workway.co` supports multi-connection OAuth. Users connect their QuickBooks accounts through the agent:

1. Add the MCP server to your host config (see [Client Configuration](#client-configuration) below)
2. In your AI session, ask the agent to connect your QuickBooks
3. The agent calls `qbo_connect` and gives you an authorization link
4. Click the link, authorize with your QuickBooks account in the browser
5. Return to your AI session, provide your Company ID, and complete the bind with `qbo_complete_connection`
6. Verify with `qbo_company_info`

**Multiple users**: Each person connects their own QuickBooks account independently. All connections are stored and available via the `connection` parameter.

### Local Development

#### 1. Prerequisites

- Node.js 18+
- A QuickBooks Online app ([Intuit Developer Portal](https://developer.intuit.com))
- A Notion integration ([My Integrations](https://www.notion.so/my-integrations))

#### 2. Create a QuickBooks App

1. Go to [Intuit Developer Portal](https://developer.intuit.com)
2. Create an app with **QuickBooks Online and Payments** scope
3. Under **Keys and credentials**, copy your **Client ID** and **Client Secret**
4. Under **Settings > Redirect URIs**, add:
   - `http://localhost:3847/callback` (local dev)
   - `https://quickbooks.mcp.workway.co/auth/callback` (production)

#### 3. Create a Notion Integration

1. Go to [My Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the **Internal Integration Secret**
4. Share your target databases with the integration

#### 4. Environment Variables

Create a `.env` file (or set env vars):

```bash
# QuickBooks OAuth (required)
QBO_CLIENT_ID=your_client_id
QBO_CLIENT_SECRET=your_client_secret
QBO_ENVIRONMENT=sandbox   # or 'production'

# Composio QuickBooks connect-link flow (required for remote multi-connection)
COMPOSIO_QBO_AUTH_CONFIG_ID=your_composio_quickbooks_auth_config_id

# Notion (required)
NOTION_API_KEY=your_notion_integration_token

# Optional
QBO_REDIRECT_URI=http://localhost:3847/callback
TRANSPORT=stdio
PORT=3000
```

#### 5. Install & Build

```bash
pnpm install
pnpm --filter @create-something/quickbooks-notion-mcp build
```

#### 6. Authorize QuickBooks (One-Time, Local Only)

```bash
pnpm --filter @create-something/quickbooks-notion-mcp auth
```

This will:
1. Print an authorization URL
2. Open your browser to the Intuit consent screen
3. After you authorize, exchange the code for tokens
4. Persist tokens to `.qbo-tokens.json`

Tokens auto-refresh after this. You only need to re-run `pnpm auth` if the refresh token expires (100 days) or you want to connect a different company.

#### 7. Run

**stdio (for Claude Desktop, Cursor, etc.):**
```bash
pnpm --filter @create-something/quickbooks-notion-mcp start
```

**HTTP (for remote deployment):**
```bash
TRANSPORT=http pnpm --filter @create-something/quickbooks-notion-mcp start
```

## Client Configuration

### Remote (Production)

**URL**: `https://quickbooks.mcp.workway.co`

```json
{
  "mcpServers": {
    "quickbooks-notion": {
      "url": "https://quickbooks.mcp.workway.co/mcp"
    }
  }
}
```

### Local (stdio)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "quickbooks-notion": {
      "command": "node",
      "args": ["path/to/packages/quickbooks-notion-mcp/dist/index.js"],
      "env": {
        "QBO_CLIENT_ID": "your_client_id",
        "QBO_CLIENT_SECRET": "your_client_secret",
        "QBO_ENVIRONMENT": "production",
        "NOTION_API_KEY": "your_notion_key"
      }
    }
  }
}
```

> **Note**: Run `pnpm auth` before first use to complete the OAuth flow and persist tokens.

## Example Agent Prompts

- "Connect my QuickBooks account"
- "What QuickBooks accounts are connected?"
- "Show me all unpaid invoices over $1,000"
- "List my top 10 customers by balance"
- "Run a P&L report for Q1 2025"
- "Sync all active customers to my Notion CRM database"
- "Find the vendor named 'Office Depot' and show their bills"
- "What's my current balance sheet?"
- "Sync unpaid invoices into my Notion tracker"
- "Show company info for connection 1234567890" (specific company)

## Architecture

```
┌─────────────┐     ┌─────────────────────────────┐     ┌──────────────┐
│  AI Agent    │────▶│  MCP Server (Worker)        │────▶│  QuickBooks  │
│  (Claude,    │◀────│  Cloudflare Workers          │     │  Online API  │
│   Cursor,    │     │                             │     └──────────────┘
│   Codex)     │     │  ConnectionManager:         │
└─────────────┘     │  - Multi-tenant OAuth       │     ┌──────────────┐
                    │  - Auto token refresh       │────▶│  Notion API  │
      ┌────────┐   │                             │     └──────────────┘
      │  User  │──▶│  Routes:                    │
      │Browser │   │  /mcp        (MCP endpoint) │     ┌──────────────┐
      └────────┘   │  /auth/connect (OAuth start)│────▶│  KV Store    │
                    │  /auth/callback (OAuth end) │     │  (per-conn)  │
                    └─────────────────────────────┘     └──────────────┘
```

### Multi-Connection Flow

1. Agent calls `qbo_connect` → server returns OAuth URL
2. User clicks URL → authorizes in Intuit → redirected to `/auth/callback`
3. Server exchanges code for tokens → stores in KV as `qbo-conn:{realmId}`
4. Server fetches company info → stores metadata in connections index
5. Agent uses `qbo_company_info` to verify → all tools work with new connection
6. Multiple connections coexist — use `connection` param to select which company

## Three-Tier Framework Mapping

| Tier | Implementation |
|------|---------------|
| **Database** | QuickBooks Online API (read-only), Notion databases, encrypted token persistence |
| **Automation** | MCP tools (query, list, sync, report), OAuth token refresh via SDK |
| **Judgment** | Read-only constraint (SELECT-only), OAuth scopes, entity-to-property mapping |

## Pricing

This is a custom MCP integration built by [CREATE SOMETHING Agency](https://createsomething.agency/).

- **2 tools connected** (QuickBooks + Notion): $500
- **+ 1 AI platform configured**: $250
- **Managed hosting**: Starting at $99/mo

[Book a Mapping Session](https://createsomething.agency/book)

## License

MIT
