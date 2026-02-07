# QuickBooks → Notion MCP Server

A read-only MCP (Model Context Protocol) server that connects QuickBooks Online data to Notion databases. Built by [CREATE SOMETHING Agency](https://createsomething.agency/).

## What It Does

This server gives AI agents (Claude, Cursor, Codex) secure, read-only access to your QuickBooks Online data and the ability to sync it into Notion databases. No SQL required — agents can query customers, invoices, payments, reports, and more through natural language.

**Read-only by design**: This server never modifies your QuickBooks data. It only reads from QBO and writes to Notion.

**OAuth with auto-refresh**: Uses the `quickbooks-api` SDK for production-ready OAuth 2.0 with automatic token refresh. No more manually rotating access tokens every 60 minutes.

## Tools

### QuickBooks (Read-Only)

| Tool | Description |
|------|-------------|
| `qbo_query` | Execute raw SELECT queries against QBO data |
| `qbo_list` | List any entity type with filtering and pagination |
| `qbo_get` | Get a single entity by ID |
| `qbo_search` | Search entities by name |
| `qbo_company_info` | Get company name, address, fiscal year settings |
| `qbo_report` | Run financial reports (P&L, Balance Sheet, Cash Flow, etc.) |

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

### 1. Prerequisites

- Node.js 18+
- A QuickBooks Online app ([Intuit Developer Portal](https://developer.intuit.com))
- A Notion integration ([My Integrations](https://www.notion.so/my-integrations))

### 2. Create a QuickBooks App

1. Go to [Intuit Developer Portal](https://developer.intuit.com)
2. Create an app with **QuickBooks Online and Payments** scope
3. Under **Keys and credentials**, copy your **Client ID** and **Client Secret**
4. Under **Settings > Redirect URIs**, add: `http://localhost:3847/callback`

### 3. Create a Notion Integration

1. Go to [My Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the **Internal Integration Secret**
4. Share your target databases with the integration

### 4. Environment Variables

Create a `.env` file (or set env vars):

```bash
# QuickBooks OAuth (required)
QBO_CLIENT_ID=your_client_id
QBO_CLIENT_SECRET=your_client_secret
QBO_ENVIRONMENT=sandbox   # or 'production'

# Notion (required)
NOTION_API_KEY=your_notion_integration_token

# Optional
QBO_REDIRECT_URI=http://localhost:3847/callback
QBO_ENCRYPTION_KEY=your-secure-encryption-key-min-32-chars
TRANSPORT=stdio
PORT=3000
```

### 5. Install & Build

```bash
pnpm install
pnpm --filter @create-something/quickbooks-notion-mcp build
```

### 6. Authorize QuickBooks (One-Time)

```bash
pnpm --filter @create-something/quickbooks-notion-mcp auth
```

This will:
1. Print an authorization URL
2. Open your browser to the Intuit consent screen
3. After you authorize, exchange the code for tokens
4. Persist encrypted tokens to `.qbo-tokens.json`

Tokens auto-refresh after this. You only need to re-run `pnpm auth` if the refresh token expires (100 days) or you want to connect a different company.

### 7. Run

**stdio (for Claude Desktop, Cursor, etc.):**
```bash
pnpm --filter @create-something/quickbooks-notion-mcp start
```

**HTTP (for remote deployment):**
```bash
TRANSPORT=http pnpm --filter @create-something/quickbooks-notion-mcp start
```

## Claude Desktop Configuration

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

- "Show me all unpaid invoices over $1,000"
- "List my top 10 customers by balance"
- "Run a P&L report for Q1 2025"
- "Sync all active customers to my Notion CRM database"
- "Find the vendor named 'Office Depot' and show their bills"
- "What's my current balance sheet?"
- "Sync unpaid invoices into my Notion tracker"

## Architecture

```
┌─────────────┐     ┌─────────────────────────────┐     ┌──────────────┐
│  AI Agent    │────▶│  MCP Server                 │────▶│  QuickBooks  │
│  (Claude,    │◀────│  (stdio or HTTP)            │     │  Online API  │
│   Cursor)    │     │                             │     └──────────────┘
└─────────────┘     │  Auth: quickbooks-api SDK    │
                    │  (auto token refresh)        │     ┌──────────────┐
                    │                             │────▶│  Notion API  │
                    │  Tools:                     │     └──────────────┘
                    │  - qbo_query / list / get   │
                    │  - qbo_report / search      │     ┌──────────────┐
                    │  - notion_sync_qbo          │────▶│  Token Store  │
                    │  - notion_list_databases    │     │  (.json file) │
                    └─────────────────────────────┘     └──────────────┘
```

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

[Book a Discovery Call](https://savvycal.com/create-something/discovery)

## License

MIT
